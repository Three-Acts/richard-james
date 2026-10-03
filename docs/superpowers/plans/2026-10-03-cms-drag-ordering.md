# CMS drag ordering implementation plan

> **For agentic workers:** Implement these tasks in the current session. Use the existing integration suite and verify the CMS in a disposable local database.

**Goal:** Remove grid stride and replace manual sort positions with list reordering that preserves record statuses and publishes order separately.

**Architecture:** Keep internal numeric positions and the separate published positions. Add an authenticated move operation which shifts positions transactionally without saving record content or changing timestamps/statuses. Collection summaries expose pending ordering; Publish promotes it and supports retry after a failed deploy.

**Tech Stack:** React, TypeScript, Astro, PostgreSQL, existing REST bridge.

**Spec:** User request in this chat, 2026-10-03.

## Constraints
- Keep existing content edits and publishing workflow.
- Preserve unsaved editor fields during list reordering.
- Remove grid stride from registry, seed data, API contract, and gallery rendering; retain stored legacy column data.
- Do not publish/deploy or modify live project ordering during verification.

## Review focus
- Draft/queued/published items retain statuses and timestamps after drag.
- Public ordering stays unchanged until Publish.
- Retry preserves the Publish action without queuing content from reordered published items.
- Search and selection mode disable reordering; keyboard movement and adjacent editor list work.
- Concurrent moves and content saves preserve positions; failed moves restore the visible order.

### Task 1: Backend ordering and publishing
- [x] Add failing integration tests for dedicated moves, pending summary, order-only publish, malformed positions, concurrent moves and retry.
- [x] Add store/service/REST operations: `reorderRecord(collectionId, recordId, position)` and `queueOrdering(collectionId)`.
- [x] Extend collection summaries and publish results with independent order state.
- [x] Run the disposable local Postgres integration suite.

### Task 2: CMS list controls
- [x] Add drag handles with ArrowUp/ArrowDown fallback in the table and narrow list.
- [x] Persist each move, refresh list/summary, preserve open drafts, and show failures.
- [x] Hide the internal ordering field and remove the numeric list column.
- [x] Include pending ordering in Publish visibility and deploy retry handling.
- [x] Run CMS typecheck and lint; inspect real UI against local fixtures.

### Task 3: Remove grid stride
- [x] Remove registry, content contract, API and seed references.
- [x] Render every saved gallery image; preserve lightbox indexes and captions.
- [x] Update current README guidance.
- [x] Run web tests/typecheck and verify gallery rendering.

## Verification record

- 21 PostgreSQL integration tests pass, including an added RED→GREEN regression proving unchanged content saves cannot publish a pending reorder.
- 19 existing CMS utility tests and web gesture, Markdown and masonry tests pass.
- CMS/API/web typechecks and CMS/web production builds pass. All 35 built galleries contain every saved image.
- CMS lint and API lint excluding existing `.vercel` generated output pass. The default API lint also traverses generated JavaScript and reports 37 existing `no-undef` errors there.
- Browser fixture verified real pointer drag, keyboard focus, disabled search controls, adjacent list movement with unsaved edits, move rollback, and order-only Publish retry even when the restore request itself fails. No real project order or deployment was changed.
- Existing Base UI toast lifecycle emits a React `flushSync` development warning when showing publishing notifications; CDP stack traced it to the installed toast dependency. Notification behavior still works.
- Independent review found the unchanged-save regression and keyboard-focus loss; both fixed and verified. Retry failures now keep a local Publish action until server pending state can be restored.
