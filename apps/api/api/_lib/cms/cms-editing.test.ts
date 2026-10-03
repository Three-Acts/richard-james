import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { getPool } from "../db.js";
import { generateCmsEditingMigrationSql, generateSchemaSql } from "../../../scripts/schema-sql.js";
import { createRecord, deleteRecord, getRecord, importRecords, listCollections, listRecords, publishQueued, saveRecord, setPublishStatus } from "./service.js";
import { listProjectsContent } from "../content.js";
import type { CmsRecord } from "../schema.js";

// Explicit opt-in, isolated database only. Never use the application's DATABASE_URL.
const testUrl = process.env.CMS_TEST_DATABASE_URL;
if (!testUrl || !["localhost", "127.0.0.1"].includes(new URL(testUrl).hostname)) {
  throw new Error("Set CMS_TEST_DATABASE_URL to a disposable local Postgres database.");
}
process.env.DATABASE_URL = testUrl;

before(async () => { await getPool().query(generateSchemaSql()); });
beforeEach(async () => { await getPool().query("truncate projects, pages, site_settings"); });
after(async () => { await getPool().end(); });

async function project(title: string, sortOrder?: number) {
  return createRecord("projects", { title, year: "2026", medium: "Painting", hero: "https://example.com/image.jpg", ...(sortOrder === undefined ? {} : { sortOrder }) });
}
async function order() {
  return (await listRecords("projects", { sort: { key: "sortOrder", direction: "asc" } })).records;
}
async function move(record: CmsRecord, position: number, status = record.publishStatus) {
  return saveRecord("projects", record.id, { ...record, publishStatus: status, values: { ...record.values, sortOrder: position } }, record.modifiedAt);
}
async function publishedProjects() {
  const records = [await project("A"), await project("B"), await project("C")];
  await setPublishStatus("projects", records.map((record) => record.id), "queued_to_publish");
  await publishQueued("projects");
  return Promise.all(records.map((record) => getRecord("projects", record.id)));
}

test("server generates a title slug, formats custom slugs and disambiguates generated collisions", async () => {
  assert.equal((await project("New Work")).values.slug, "new-work");
  assert.equal((await project("New Work")).values.slug, "new-work-2");
  assert.equal((await createRecord("projects", { title: "Custom", slug: " My Custom URL " })).values.slug, "my-custom-url");
});
test("concurrent title-based creates reserve different slugs", async () => {
  const items = await Promise.all([project("Same Title"), project("Same Title"), project("Same Title")]);
  assert.deepEqual(items.map((item) => item.values.slug).sort(), ["same-title", "same-title-2", "same-title-3"]);
});
test("multiple blank drafts are allowed and title edits preserve existing URLs", async () => {
  await createRecord("projects");
  await createRecord("projects");
  const item = await project("Old Title");
  assert.equal((await saveRecord("projects", item.id, { ...item, values: { ...item.values, title: "New Title" } })).values.slug, "old-title");
});
test("new items append by default and insertion at one shifts every existing item", async () => {
  await project("A"); await project("B"); await project("New", 1);
  assert.deepEqual((await order()).map((item) => [item.values.title, item.values.sortOrder]), [["New", 1], ["A", 2], ["B", 3]]);
});
test("moving up queues only the edited item and leaves shifted timestamps unchanged", async () => {
  const [a, b, c] = await publishedProjects();
  await move(c, 1);
  const items = await order();
  assert.deepEqual(items.map((item) => item.values.title), ["C", "A", "B"]);
  assert.deepEqual(items.map((item) => item.publishStatus), ["queued_to_publish", "published", "published"]);
  assert.equal((await getRecord("projects", a.id)).modifiedAt, a.modifiedAt);
  assert.equal((await getRecord("projects", b.id)).modifiedAt, b.modifiedAt);
  assert.equal((await listCollections()).find((item) => item.id === "projects")!.queuedCount, 1);
});
test("moving down, clamping past the end and deletion keep positions consecutive", async () => {
  const a = await project("A"); await project("B"); await project("C");
  await move(a, 99);
  assert.deepEqual((await order()).map((item) => [item.values.title, item.values.sortOrder]), [["B", 1], ["C", 2], ["A", 3]]);
  await deleteRecord("projects", (await order())[0].id);
  assert.deepEqual((await order()).map((item) => item.values.sortOrder), [1, 2]);
});
test("a draft move reaches public ordering only when that item is queued and published", async () => {
  const [a, , c] = await publishedProjects();
  await move(c, 1, "not_published");
  assert.deepEqual((await listProjectsContent()).map((item) => item.title), ["A", "B"]);
  await setPublishStatus("projects", [a.id], "queued_to_publish");
  await publishQueued("projects");
  assert.deepEqual((await listProjectsContent()).map((item) => item.title), ["A", "B"]);
  await setPublishStatus("projects", [c.id], "queued_to_publish");
  const result = await publishQueued("projects");
  assert.equal(result.published, 1);
  assert.deepEqual(result.recordsByCollection[0].recordIds, [c.id]);
  assert.deepEqual((await listProjectsContent()).map((item) => [item.title, item.sortOrder]), [["C", 1], ["A", 2], ["B", 3]]);
});
test("an unpublished insertion does not affect public positions", async () => {
  await publishedProjects();
  await project("Draft", 1);
  assert.deepEqual((await listProjectsContent()).map((item) => [item.title, item.sortOrder]), [["A", 1], ["B", 2], ["C", 3]]);
});
test("stale saves roll back without shifting siblings", async () => {
  const [a, , c] = await publishedProjects();
  await getPool().query("update projects set title = 'Changed', updated_at = now() + interval '1 second' where id = $1", [c.id]);
  await assert.rejects(move(c, 1), { code: "conflict" });
  assert.deepEqual((await order()).map((item) => item.values.sortOrder), [1, 2, 3]);
  assert.equal((await getRecord("projects", a.id)).modifiedAt, a.modifiedAt);
});
test("invalid positions are rejected without moving anything", async () => {
  const a = await project("A");
  for (const position of [0, -1, 1.5, Infinity, NaN]) {
    await assert.rejects(move(a, position), { code: "validation" });
  }
});
test("batch imports resolve duplicate positions and generated slug collisions", async () => {
  await project("A");
  await importRecords("projects", [{ title: "Same", sortOrder: 1 }, { title: "Same", sortOrder: 1 }]);
  assert.deepEqual((await order()).map((item) => item.values.sortOrder), [1, 2, 3]);
  assert.deepEqual((await order()).map((item) => item.values.slug).sort(), ["a", "same", "same-2"]);
});
test("simultaneous moves retain one unique consecutive position per item", async () => {
  const [a, , c] = await publishedProjects();
  await Promise.all([move(c, 1), move(a, 3)]);
  assert.deepEqual((await order()).map((item) => item.values.sortOrder), [1, 2, 3]);
});
test("rerunning migration preserves ordering and shifted items remain editable", async () => {
  const [a, , c] = await publishedProjects();
  await move(c, 1);
  await getPool().query(generateSchemaSql());
  const latest = await getRecord("projects", a.id);
  const values: CmsRecord["values"] = { ...latest.values, description: "Changed description" };
  delete values.sortOrder;
  const saved = await saveRecord("projects", a.id, { ...a, values }, a.modifiedAt);
  assert.equal(saved.values.sortOrder, 2);
  assert.deepEqual((await order()).map((item) => item.values.sortOrder), [1, 2, 3]);
});

test("seed/store inserts marked published receive a public position immediately", async () => {
  const { getDataStore } = await import("./resolve-store.js");
  const { collectionRegistry } = await import("../schema.js");
  const collection = collectionRegistry.find((item) => item.id === "projects")!;
  await getDataStore().insertRecords(collection, [{ publishStatus: "published", values: { title: "Seed", slug: "seed", sortOrder: 1 } }]);
  assert.deepEqual((await listProjectsContent()).map((item) => item.sortOrder), [1]);
});

test("focused migration upgrades legacy ordering without changing statuses or timestamps", async () => {
  const [a, b, c] = await publishedProjects();
  await getPool().query("alter table projects drop column cms_published_order, drop column cms_order_pending");
  await getPool().query("update projects set sort_order = 0 where id = any($1::uuid[])", [[b.id, c.id]]);
  await getPool().query("create table project_images (id int)");
  await getPool().query(generateCmsEditingMigrationSql());
  assert.deepEqual((await order()).map((item) => item.values.sortOrder), [1, 2, 3]);
  const items = await order();
  for (const original of [a, b, c]) {
    const item = items.find((record) => record.id === original.id)!;
    assert.equal(item.publishStatus, "published");
    assert.equal(item.modifiedAt, original.modifiedAt);
  }
  assert.equal((await getPool().query("select to_regclass('project_images') as name")).rows[0].name, "project_images");
  await getPool().query("drop table project_images");
});
