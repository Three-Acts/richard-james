/**
 * Generates `CREATE TABLE IF NOT EXISTS` (+ indexes) SQL for every collection
 * in the shared CMS registry (`@three-acts/cms-schema`), using the exact same
 * column mapping the API's `NeonDataStore` reads and writes. Shared by
 * `scripts/print-schema.ts` (prints it) and `scripts/migrate.ts` (runs it).
 * Idempotent: safe to run repeatedly against the same database.
 */
import { collectionRegistry, columnForField, systemColumnsFor, type CmsCollection, type CmsField } from "@three-acts/cms-schema";

function sqlColumnType(field: CmsField): string {
  switch (field.type) {
    case "number":
      return "numeric";
    case "boolean":
      return "boolean";
    case "datetime":
      return "timestamptz";
    // text/textarea/slug/select/asset/reference/gallery/richtext/readonly all
    // store plain text — a `reference` field is the referenced record's id, a
    // `gallery` field is a JSON `GalleryItem[]` string (see gallery.ts), and a
    // `richtext` field is markdown.
    case "reference":
    case "gallery":
    case "richtext":
    default:
      return "text";
  }
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

// pg's timestamptz has microsecond resolution, but the API only ever stamps
// (and reads back) millisecond precision: it writes `new Date().toISOString()`
// (always exactly 3 fractional digits) and reads rows back through node-pg's
// `Date`, which can't hold sub-millisecond precision either. Truncating to
// milliseconds everywhere a timestamp is produced server-side (column
// defaults, the modified-at trigger) keeps what's actually stored in sync
// with what a round trip through the API can ever see or send back as
// `expectedModifiedAt` — otherwise a trigger-stamped `now()` acquires
// microseconds no client can ever reproduce, and every optimistic-concurrency
// check on that row fails forever (see neon-store.ts's `updateRecord`, which
// additionally truncates on read for rows already stuck with microseconds
// from before this fix).
const MILLISECOND_NOW = "date_trunc('milliseconds', now())";

function tableSql(collection: CmsCollection): string {
  const sys = systemColumnsFor(collection);

  const columnLines = [
    `${quoteIdent(sys.id)} uuid primary key default gen_random_uuid()`,
    `${quoteIdent(sys.publishStatus)} text not null default 'not_published'`,
    `${quoteIdent(sys.createdAt)} timestamptz not null default ${MILLISECOND_NOW}`,
    `${quoteIdent(sys.modifiedAt)} timestamptz not null default ${MILLISECOND_NOW}`,
    ...collection.fields.map((field) => `${quoteIdent(columnForField(collection, field))} ${sqlColumnType(field)}`)
  ];

  const table = quoteIdent(collection.tableName);
  const triggerFn = quoteIdent(`set_${collection.tableName}_${sys.modifiedAt}`);
  const trigger = quoteIdent(`trg_${collection.tableName}_${sys.modifiedAt}`);

  // `create table if not exists` is a no-op on a table that already exists,
  // so a field added to the registry after a table's first migration (e.g.
  // `projects.gallery`) would otherwise never get its column. `add column if
  // not exists` is always safe (nullable, no default) and applies to both a
  // brand-new table (redundant with the CREATE TABLE above, harmlessly) and
  // an existing one missing the column.
  const addColumnLines = collection.fields.map(
    (field) => `alter table ${table} add column if not exists ${quoteIdent(columnForField(collection, field))} ${sqlColumnType(field)};`
  );

  return [
    `-- ${collection.label} (${collection.id})`,
    `create table if not exists ${table} (`,
    columnLines.map((line) => `  ${line}`).join(",\n"),
    `);`,
    ``,
    addColumnLines.join("\n"),
    ``,
    // Also a no-op on a table that already exists; these apply the
    // millisecond-truncated default to a pre-existing table (ALTER ... SET
    // DEFAULT never rewrites existing rows).
    `alter table ${table} alter column ${quoteIdent(sys.createdAt)} set default ${MILLISECOND_NOW};`,
    `alter table ${table} alter column ${quoteIdent(sys.modifiedAt)} set default ${MILLISECOND_NOW};`,
    ``,
    `create or replace function ${triggerFn}()`,
    `returns trigger as $$`,
    `begin`,
    `  new.${quoteIdent(sys.modifiedAt)} = ${MILLISECOND_NOW};`,
    `  return new;`,
    `end;`,
    `$$ language plpgsql;`,
    ``,
    `drop trigger if exists ${trigger} on ${table};`,
    `create trigger ${trigger}`,
    `before update on ${table}`,
    `for each row`,
    `execute function ${triggerFn}();`
  ].join("\n");
}

/**
 * Indexes every table gets: one on `publish_status` (every list/content query
 * filters on it), a unique index on a `slug`-typed `slug`/`key` field (the
 * route lookup key for `projects.slug` and `pages.key`), and a plain index on
 * every `reference` column (looked up by the referenced id) — no collection
 * currently has one after the `project-images` -> `projects.gallery` change,
 * but the generator stays generic for any future `reference` field.
 */
function indexSql(collection: CmsCollection): string {
  const sys = systemColumnsFor(collection);
  const table = quoteIdent(collection.tableName);
  const lines: string[] = [];

  lines.push(
    `create index if not exists ${quoteIdent(`idx_${collection.tableName}_${sys.publishStatus}`)} on ${table} (${quoteIdent(sys.publishStatus)});`
  );

  for (const field of collection.fields) {
    const column = columnForField(collection, field);

    if (field.type === "slug" && (field.key === "slug" || field.key === "key")) {
      lines.push(
        `create unique index if not exists ${quoteIdent(`uq_${collection.tableName}_${column}`)} on ${table} (${quoteIdent(column)});`
      );
    }

    if (field.type === "reference") {
      lines.push(
        `create index if not exists ${quoteIdent(`idx_${collection.tableName}_${column}`)} on ${table} (${quoteIdent(column)});`
      );
    }
  }

  return lines.join("\n");
}

/**
 * One-time cleanups for collections/columns the registry no longer defines.
 * The per-collection generator above only ever adds; it never drops a table
 * or column that fell out of the registry, so those need an explicit,
 * idempotent (`if exists`) statement here — safe to leave in permanently.
 *
 * - `project-images` was briefly its own collection (a `reference` field on
 *   it pointing at `projects`); the registry now holds project images as a
 *   `gallery` field on `projects` instead. `drop table` also drops its own
 *   indexes/triggers, but the trigger *function* is a separate object that
 *   survives a dropped table, so it needs its own explicit drop.
 * - `contact-submissions` (and the public contact form) was removed
 *   entirely — same cleanup shape.
 * - `pages` renamed its route-lookup field from `key` to `slug`. The new
 *   `slug` column (and the SEO/image columns alongside it) is created by the
 *   generic `add column if not exists` pass above, which runs *before* this
 *   block, so by the time the backfill below runs `slug` already exists on
 *   every row (NULL). The `do $$ ... $$` guards the backfill so it's a no-op
 *   once `key` itself has already been dropped on a later run. The old
 *   unique index on `key` has to be dropped explicitly before the column
 *   (an index depending on a column blocks a plain `drop column`); the new
 *   one on `slug` is created by the generic `indexSql` pass, same as any
 *   other `slug`-typed field.
 */
const LEGACY_CLEANUP_SQL = [
  "-- Cleanup: project-images -> projects.gallery (see registry.ts history).",
  "drop table if exists project_images cascade;",
  "drop function if exists set_project_images_updated_at();",
  "",
  "-- Cleanup: contact-submissions removed (no public contact form any more).",
  "drop table if exists contact_submissions cascade;",
  "drop function if exists set_contact_submissions_updated_at();",
  "",
  "-- Cleanup: pages.key -> pages.slug (see registry.ts history).",
  "do $$",
  "begin",
  "  if exists (select 1 from information_schema.columns where table_name = 'pages' and column_name = 'key') then",
  "    update pages set slug = key where slug is null;",
  "  end if;",
  "end $$;",
  "drop index if exists uq_pages_key;",
  "alter table pages drop column if exists key;"
].join("\n");

export function generateSchemaSql(): string {
  const header = [
    "-- Generated by `npm run schema:sql -w @three-acts/api` from packages/cms-schema/src/registry.ts.",
    "-- Applied by `npm run db:migrate -w @three-acts/api` (scripts/migrate.ts) over DATABASE_URL_UNPOOLED.",
    "-- Idempotent: every statement is IF NOT EXISTS / CREATE OR REPLACE / DROP ... IF EXISTS.",
    "-- gen_random_uuid() needs pgcrypto on Postgres < 13 (Neon runs Postgres 18, so this is moot):",
    "--   create extension if not exists pgcrypto;",
    ""
  ].join("\n");

  const tables = collectionRegistry.map((collection) => `${tableSql(collection)}\n\n${indexSql(collection)}`).join("\n\n");

  return `${header}\n${tables}\n\n${LEGACY_CLEANUP_SQL}\n`;
}
