import assert from "node:assert/strict";
import { test } from "node:test";
import { TUTORIAL_MEDIA_REFRESH_MARGIN_MS, tutorialMediaNeedsRefresh, watchTutorialMediaResume } from "./media-lifecycle";

test("tutorial URLs are considered stale inside the refresh margin", () => {
  const now = 50_000;
  assert.equal(tutorialMediaNeedsRefresh(now + TUTORIAL_MEDIA_REFRESH_MARGIN_MS + 1, now), false);
  assert.equal(tutorialMediaNeedsRefresh(now + TUTORIAL_MEDIA_REFRESH_MARGIN_MS, now), true);
  assert.equal(tutorialMediaNeedsRefresh(now - 1, now), true);
});

test("pageshow, focus, and visible-tab events refresh only stale URLs and cleanup listeners", () => {
  const windowTarget = new EventTarget();
  const documentEvents = new EventTarget();
  const documentTarget = Object.assign(documentEvents, { visibilityState: "hidden" as string });
  let expiresAt = 500_000;
  const now = 100_000;
  let refreshCount = 0;
  const stop = watchTutorialMediaResume({
    getExpiresAt: () => expiresAt,
    refresh: () => { refreshCount += 1; },
    now: () => now,
    windowTarget,
    documentTarget
  });

  windowTarget.dispatchEvent(new Event("focus"));
  windowTarget.dispatchEvent(new Event("pageshow"));
  documentEvents.dispatchEvent(new Event("visibilitychange"));
  assert.equal(refreshCount, 0);

  expiresAt = now + TUTORIAL_MEDIA_REFRESH_MARGIN_MS;
  windowTarget.dispatchEvent(new Event("focus"));
  windowTarget.dispatchEvent(new Event("pageshow"));
  documentEvents.dispatchEvent(new Event("visibilitychange")); // still hidden
  assert.equal(refreshCount, 2);

  documentTarget.visibilityState = "visible";
  documentEvents.dispatchEvent(new Event("visibilitychange"));
  assert.equal(refreshCount, 3);

  stop();
  windowTarget.dispatchEvent(new Event("focus"));
  documentEvents.dispatchEvent(new Event("visibilitychange"));
  assert.equal(refreshCount, 3);
});
