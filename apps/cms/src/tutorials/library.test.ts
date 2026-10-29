import { test } from "node:test";
import assert from "node:assert/strict";
import { workspaceViewFromHash } from "../hooks/use-workspace-view";
import { findTutorials, tutorialMediaPaths, tutorials } from "./library";

test("every tutorial deep link resolves to the corresponding procedure", () => {
  assert.equal(new Set(tutorials.map((tutorial) => tutorial.id)).size, tutorials.length);
  for (const tutorial of tutorials) {
    assert.deepEqual(workspaceViewFromHash(`#tutorials/${tutorial.id}`), { page: "tutorials", tutorialId: tutorial.id });
  }
  assert.deepEqual(workspaceViewFromHash("#tutorials"), { page: "tutorials", tutorialId: "01" });
  assert.deepEqual(workspaceViewFromHash("#tutorials/99"), { page: "tutorials", tutorialId: "01" });
  assert.deepEqual(workspaceViewFromHash("#projects"), { page: "content" });
});

test("search finds procedures using multiple words regardless of case or word order", () => {
  assert.ok(findTutorials("  CAPTION gallery ").some((tutorial) => tutorial.id === "06"));
  assert.ok(findTutorials("CSV import").some((tutorial) => tutorial.id === "19"));
  assert.deepEqual(findTutorials("no-such-procedure-zz"), []);
  assert.equal(findTutorials("  ").length, tutorials.length);
});

test("tutorial media paths are allowlisted and never resolve to public CMS assets", () => {
  for (const tutorial of tutorials) {
    const files = tutorialMediaPaths(tutorial.id);
    assert.ok(files, tutorial.id);
    assert.ok(files.video.startsWith(`videos/${tutorial.id}-${tutorial.slug}.mp4`), tutorial.id);
    assert.ok(files.screenshot.startsWith(`screenshots/${tutorial.id}-${tutorial.slug}.png`), tutorial.id);
    assert.ok(files.captions.startsWith(`captions/${tutorial.id}-${tutorial.slug}.vtt`), tutorial.id);
    assert.ok(files.transcript.startsWith(`transcripts/${tutorial.id}-${tutorial.slug}.txt`), tutorial.id);
    assert.ok(tutorial.chapters.length > 0, tutorial.id);
    assert.ok(tutorial.chapters.every((chapter, index) => chapter.start < tutorial.duration && (index === 0 || chapter.start > tutorial.chapters[index - 1].start)), tutorial.id);
  }
  for (const id of ["../01", "1", "22", "toString", "constructor", "__proto__"]) assert.equal(tutorialMediaPaths(id), undefined, id);
});
