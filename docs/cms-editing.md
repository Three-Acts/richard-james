# Slugs and collection positions

New slugs follow the title while the saved slug is blank. Editing a slug formats it to lowercase with dashes; saving removes leading/trailing dashes. Existing saved slugs stay stable when a title changes. Generated collisions receive numeric suffixes (`new-work-2`); custom slugs retain the database's uniqueness rule. Multiple empty drafts are supported.

Projects have consecutive positions, starting at 1. New records append unless a position is specified. Saving a different position inserts the item there and shifts its neighbours; positions past the end are clamped to the end. Deleting an item closes the gap. Moves and batch imports run in a database transaction.

Saving changes to a published item queues that item. Indirect shifts leave neighbours' publish statuses and modification timestamps alone. The table refreshes after saving to show the new positions. Saving an item with an untouched position omits that field, so a concurrent incidental shift is preserved.

Draft positions and published positions are stored separately. Publishing applies deliberate moves on queued items and adjusts their published neighbours; shifted neighbours are not counted as published changes. An unrelated publish does not apply a saved draft move. The existing content workflow still exposes only records whose status is `published`; this change does not introduce content version snapshots.

## Existing database upgrade

Apply the focused, idempotent upgrade **before deploying the updated API**:

```sh
npm run db:migrate:cms-editing -w @three-acts/api
```

It uses `DATABASE_URL_UNPOOLED` from `apps/api/.env.local`. It adds internal ordering columns, backfills consecutive positions, adjusts the timestamp trigger and permits blank draft slugs in unique indexes. It excludes the general migration's unrelated legacy table/column cleanup. No remote database or deployment was changed while implementing this feature.

Fresh databases can use the regular `db:migrate` command.

## Verification

The API integration tests require a disposable local PostgreSQL database; they clear the CMS tables in that database. They reject remote hosts and never read the application's database credentials.

```sh
CMS_TEST_DATABASE_URL=postgresql://localhost/cms_test npx tsx --test apps/api/api/_lib/cms/cms-editing.test.ts
npx tsx --test apps/cms/src/lib/*.test.ts
npx tsx apps/web/scripts/test-markdown.ts
npx tsx apps/web/scripts/test-carousel.ts
npm run typecheck
npm run build:cms
npm run build:api
```
