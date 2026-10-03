import { test } from "node:test";
import assert from "node:assert/strict";
import { collectionRegistry, normalizeSlug, updateSlugValues } from "@three-acts/cms-schema";

const projects = collectionRegistry.find((collection) => collection.id === "projects")!;

test("slug formatting lowercases, transliterates accents and collapses separators", () => {
  assert.equal(normalizeSlug("  Café & New__Work -- 2026!  "), "cafe-new-work-2026");
});

test("typing a space leaves a dash ready for the next word", () => {
  assert.equal(normalizeSlug("New Work ", true), "new-work-");
  assert.equal(normalizeSlug("new-work-"), "new-work");
});

test("an empty saved slug follows title edits before the first save", () => {
  const first = updateSlugValues(projects, { title: "", slug: "" }, { slug: "" }, "title", "New Work");
  assert.equal(first.slug, "new-work");
  assert.equal(updateSlugValues(projects, first, { slug: "" }, "title", "Other Work").slug, "other-work");
});

test("custom and saved slugs survive title edits", () => {
  assert.equal(updateSlugValues(projects, { title: "New", slug: "custom" }, { slug: "" }, "title", "Other").slug, "custom");
  assert.equal(updateSlugValues(projects, { title: "New", slug: "new" }, { slug: "new" }, "title", "Other").slug, "new");
});

test("direct slug editing formats text immediately", () => {
  assert.equal(updateSlugValues(projects, { slug: "" }, {}, "slug", "My Custom URL ").slug, "my-custom-url-");
});
