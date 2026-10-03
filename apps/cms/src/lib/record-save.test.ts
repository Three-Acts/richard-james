import { test } from "node:test";
import assert from "node:assert/strict";
import { collectionRegistry } from "@three-acts/cms-schema";
import { valuesForSave } from "./records";

const projects = collectionRegistry.find((collection) => collection.id === "projects")!;

test("saving content omits an untouched position so incidental server shifts survive", () => {
  const values = { title: "Changed", sortOrder: 2 };
  assert.deepEqual(valuesForSave(projects, values, { title: "Original", sortOrder: 2 }), { title: "Changed" });
  assert.equal(values.sortOrder, 2);
});

test("deliberately changed positions are sent to the server", () => {
  assert.deepEqual(valuesForSave(projects, { title: "Item", sortOrder: 1 }, { sortOrder: 2 }), { title: "Item", sortOrder: 1 });
});
