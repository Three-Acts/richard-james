# CMS slugs and ordering implementation plan

**Goal:** Generate editable, normalised slugs and support consecutive collection positions without queueing indirectly shifted items.

**Architecture:** Share slug formatting between the editor and API. Configure an ordering field in the collection registry; transact inserts, moves and deletes in Postgres. Maintain a separate published position and track deliberate moves so publishing an unrelated item does not publish a saved draft move.

**Tech stack:** React, TypeScript, node:test, PostgreSQL.

**Scope:** The user's request in this conversation. Implement in the current workspace; do not deploy or modify content on the remote database.

## Review focus

- Blank drafts and colliding generated slugs must remain editable.
- Custom slugs and existing URLs must survive title edits.
- Inserting, moving down/up and deleting must leave consecutive positions.
- Indirect shifts must preserve statuses and modification timestamps.
- Failed/stale saves must not shift any positions; public order changes only at publish.

## Tasks

1. Add failing slug/editor tests, implement shared normalisation and title-based generation, and run the tests. Keep a trailing dash while typing a space; trim it on save. Generate collision-free server slugs and permit multiple empty draft slugs.
2. Add integration tests against disposable local Postgres for ordering, queue counts, publish isolation and optimistic conflicts. Implement registry ordering metadata, internal published positions, transactional moves and schema migration. Run tests.
3. Wire editor draft updates, refresh shifted rows after saves, and omit unchanged order from saves to preserve concurrent incidental shifts. Add position constraints and explanatory help text.
4. Run existing tests, type checks, lint and CMS/API builds; review the final diff. Provide the migration required for deployed databases without running the repository's unrelated legacy cleanup against remote content.

## Progress

- Investigation: slugs currently pass through unchanged; ordering is an ordinary numeric field; saves refresh only the edited row. The Postgres update trigger stamps every shifted row, so it must exempt incidental ordering changes.
- Slug tests failed against the missing formatter, then passed with title following, custom URL preservation and trailing dash support. Server tests caught blank draft uniqueness and concurrent generated collisions; reservations now occur under the collection write lock.
- Database tests verify insertion, moves in both directions, deletion, invalid positions, optimistic conflicts, queue counts, publish isolation, seeding and legacy migration. Incidental moves preserve sibling timestamps.
- Browser check against disposable local Postgres confirmed title-generated slugs, uppercase/space formatting, preservation after title edits and save, refreshed order and only the edited item queued. No browser errors or error overlay appeared.
- CMS/API builds, all app type checks and source lint passed. Repository-wide lint is blocked by 37 existing errors in generated `apps/api/.vercel/output` JavaScript; the web app has two existing hook warnings.
- Focused migration command and operational notes are documented in `docs/cms-editing.md`. Remote content and deployments were not modified.
