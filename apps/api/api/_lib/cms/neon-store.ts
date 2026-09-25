import {
  columnForField,
  systemColumnsFor,
  type CmsCollection,
  type CmsField,
  type CmsRecord,
  type CmsRecordValue,
  type ListRecordsResult,
  type PublishStatus
} from "../schema.js";
import { getPool } from "../db.js";
import { timeDb } from "../server-timing.js";
import type { CmsDataStore, ListRecordsStoreOptions } from "./store.js";

/** Field types whose backing column is free text and safe to `ILIKE` search over. */
const SEARCHABLE_FIELD_TYPES = new Set<CmsField["type"]>(["text", "textarea", "slug", "richtext"]);

/**
 * Quotes a Postgres identifier. Safe to use with plain string interpolation
 * into SQL because every caller in this file only ever passes identifiers
 * sourced from the collection registry (`collection.tableName`,
 * `columnForField`, `systemColumnsFor`) — never request input.
 */
function quoteIdent(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function searchableColumns(collection: CmsCollection): string[] {
  return collection.fields
    .filter((field) => SEARCHABLE_FIELD_TYPES.has(field.type))
    .map((field) => columnForField(collection, field));
}

/**
 * The fields a list view actually renders: the title field, every
 * `listColumns` key, every `slug` field (the CMS's row link target) and
 * every `reference` field (the CMS resolves those to a label). Everything
 * else — gallery/richtext/textarea/asset columns in particular, which can be
 * large — is left out unless it's also a list column. Used for `fields=list`
 * on `GET .../records` to shrink both the SQL SELECT and the response body.
 */
function listFieldsOf(collection: CmsCollection): CmsField[] {
  const listColumnKeys = new Set(collection.listColumns.map((column) => column.key));
  return collection.fields.filter(
    (field) =>
      field.key === collection.titleField || listColumnKeys.has(field.key) || field.type === "slug" || field.type === "reference"
  );
}

function selectColumnsSql(collection: CmsCollection, fields: CmsField[]): string {
  const sys = systemColumnsFor(collection);
  const systemColumns = [sys.id, sys.publishStatus, sys.createdAt, sys.modifiedAt];
  const fieldColumns = fields.map((field) => columnForField(collection, field));
  return [...systemColumns, ...fieldColumns].map(quoteIdent).join(", ");
}

function resolveSortColumn(collection: CmsCollection, key: string): string {
  const sys = systemColumnsFor(collection);

  switch (key) {
    case "id":
      return sys.id;
    case "publishStatus":
      return sys.publishStatus;
    case "createdAt":
      return sys.createdAt;
    case "modifiedAt":
      return sys.modifiedAt;
    default: {
      const field = collection.fields.find((item) => item.key === key);
      return field ? columnForField(collection, field) : sys.modifiedAt;
    }
  }
}

/** Escapes ILIKE's own wildcards so user input is matched literally under `ESCAPE '\'`. */
function escapeLikeTerm(term: string): string {
  return term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function toRecordValue(field: CmsField, raw: unknown): CmsRecordValue {
  if (raw === null || raw === undefined) {
    if (field.type === "boolean") return false;
    if (field.type === "number") return 0;
    return "";
  }

  if (field.type === "number") {
    // node-postgres returns `numeric` columns as strings to avoid silent
    // precision loss; coerce to a JS number here since every "number" field
    // in the registry is a plain UI number, not an arbitrary-precision value.
    return typeof raw === "number" ? raw : Number(raw);
  }

  if (field.type === "boolean") {
    return Boolean(raw);
  }

  if (field.type === "datetime") {
    return raw instanceof Date ? raw.toISOString() : String(raw);
  }

  // text/textarea/slug/select/asset/reference/readonly are all plain text.
  return String(raw);
}

function toIsoString(raw: unknown): string {
  if (raw instanceof Date) {
    return raw.toISOString();
  }
  if (typeof raw === "string") {
    return raw;
  }
  return new Date().toISOString();
}

/**
 * `fields` restricts which of `collection.fields` end up in `values` (used
 * for `fields=list`, where the SELECT itself only fetched those columns —
 * see `selectColumnsSql`); defaults to every field for the normal, full-record
 * shape every other caller in this file wants.
 */
function mapRowToRecord(collection: CmsCollection, row: Record<string, unknown>, fields: CmsField[] = collection.fields): CmsRecord {
  const sys = systemColumnsFor(collection);
  const values: Record<string, CmsRecordValue> = {};

  for (const field of fields) {
    const column = columnForField(collection, field);
    values[field.key] = toRecordValue(field, row[column]);
  }

  return {
    id: String(row[sys.id]),
    publishStatus: (row[sys.publishStatus] as PublishStatus | undefined) ?? "not_published",
    createdAt: toIsoString(row[sys.createdAt]),
    modifiedAt: toIsoString(row[sys.modifiedAt]),
    values
  };
}

/** Value to bind for a field column: `undefined` (not provided) is stored as SQL NULL. */
function bindValue(value: CmsRecordValue): unknown {
  return value === undefined ? null : value;
}

/** `CmsDataStore` backed by plain parameterised SQL over a `pg` pool (see scripts/schema-sql.ts). */
export class NeonDataStore implements CmsDataStore {
  readonly name = "neon";

  async listRecords(collection: CmsCollection, options: ListRecordsStoreOptions): Promise<ListRecordsResult> {
    const sys = systemColumnsFor(collection);
    const table = quoteIdent(collection.tableName);

    const whereParams: unknown[] = [];
    const whereClauses: string[] = [];

    if (options.filter?.publishStatus) {
      whereClauses.push(`${quoteIdent(sys.publishStatus)} = $${whereParams.push(options.filter.publishStatus)}`);
    }

    if (options.search) {
      const columns = searchableColumns(collection);
      if (columns.length > 0) {
        const term = `%${escapeLikeTerm(options.search)}%`;
        const orClauses = columns.map((column) => `${quoteIdent(column)} ILIKE $${whereParams.push(term)} ESCAPE '\\'`);
        whereClauses.push(`(${orClauses.join(" or ")})`);
      }
    }

    const whereSql = whereClauses.length > 0 ? `where ${whereClauses.join(" and ")}` : "";

    const sortColumn = quoteIdent(options.sort ? resolveSortColumn(collection, options.sort.key) : sys.modifiedAt);
    const direction = options.sort?.direction === "asc" ? "asc" : "desc";

    const dataParams = [...whereParams];
    let limitOffsetSql = "";
    if (options.limit !== undefined) {
      limitOffsetSql += ` limit $${dataParams.push(options.limit)}`;
      limitOffsetSql += ` offset $${dataParams.push(options.offset ?? 0)}`;
    }

    const fields = options.fields === "list" ? listFieldsOf(collection) : collection.fields;
    const selectColumns = options.fields === "list" ? selectColumnsSql(collection, fields) : "*";

    const countSql = `select count(*)::text as count from ${table} ${whereSql}`;
    const dataSql = `select ${selectColumns} from ${table} ${whereSql} order by ${sortColumn} ${direction}${limitOffsetSql}`;

    // Independent queries (count doesn't depend on the page, or vice versa) — run concurrently rather than round-tripping twice in series.
    const [countResult, dataResult] = await Promise.all([
      timeDb(() => getPool().query(countSql, whereParams)),
      timeDb(() => getPool().query(dataSql, dataParams))
    ]);
    const total = Number(countResult.rows[0]?.count ?? 0);

    return {
      records: dataResult.rows.map((row) => mapRowToRecord(collection, row as Record<string, unknown>, fields)),
      total
    };
  }

  async countRecords(collection: CmsCollection, filter?: { publishStatus?: PublishStatus }): Promise<number> {
    const sys = systemColumnsFor(collection);
    const table = quoteIdent(collection.tableName);
    const params: unknown[] = [];
    const whereSql = filter?.publishStatus ? `where ${quoteIdent(sys.publishStatus)} = $${params.push(filter.publishStatus)}` : "";
    const result = await timeDb(() => getPool().query(`select count(*)::text as count from ${table} ${whereSql}`, params));
    return Number(result.rows[0]?.count ?? 0);
  }

  /** Every status's count in one query — see service.ts's `listCollections`, which used to run two `countRecords` calls per collection. */
  async countByStatus(collection: CmsCollection): Promise<Record<PublishStatus, number>> {
    const sys = systemColumnsFor(collection);
    const table = quoteIdent(collection.tableName);
    const statusColumn = quoteIdent(sys.publishStatus);

    const result = await timeDb(() =>
      getPool().query(`select ${statusColumn} as status, count(*)::text as count from ${table} group by ${statusColumn}`)
    );

    const counts: Record<PublishStatus, number> = { published: 0, not_published: 0, queued_to_publish: 0 };
    for (const row of result.rows as Array<{ status: string; count: string }>) {
      if (row.status === "published" || row.status === "not_published" || row.status === "queued_to_publish") {
        counts[row.status] = Number(row.count);
      }
    }
    return counts;
  }

  async getRecord(collection: CmsCollection, recordId: string): Promise<CmsRecord | null> {
    const sys = systemColumnsFor(collection);
    const table = quoteIdent(collection.tableName);
    const result = await timeDb(() => getPool().query(`select * from ${table} where ${quoteIdent(sys.id)} = $1`, [recordId]));
    const row = result.rows[0] as Record<string, unknown> | undefined;
    return row ? mapRowToRecord(collection, row) : null;
  }

  async insertRecords(
    collection: CmsCollection,
    rows: Array<{ publishStatus: PublishStatus; values: Record<string, CmsRecordValue> }>
  ): Promise<CmsRecord[]> {
    if (rows.length === 0) {
      return [];
    }

    const sys = systemColumnsFor(collection);
    const table = quoteIdent(collection.tableName);
    const now = new Date().toISOString();

    const fieldColumns = collection.fields.map((field) => columnForField(collection, field));
    const quotedColumns = [sys.publishStatus, sys.createdAt, sys.modifiedAt, ...fieldColumns].map(quoteIdent).join(", ");

    const params: unknown[] = [];
    const valueRows = rows.map((row) => {
      const rowValues: unknown[] = [
        row.publishStatus,
        now,
        now,
        ...collection.fields.map((field) => bindValue(row.values[field.key]))
      ];
      const placeholders = rowValues.map((value) => `$${params.push(value)}`);
      return `(${placeholders.join(", ")})`;
    });

    const sql = `insert into ${table} (${quotedColumns}) values ${valueRows.join(", ")} returning *`;
    const result = await timeDb(() => getPool().query(sql, params));
    return result.rows.map((row) => mapRowToRecord(collection, row as Record<string, unknown>));
  }

  async updateRecord(collection: CmsCollection, record: CmsRecord, expectedModifiedAt?: string): Promise<CmsRecord | "conflict" | null> {
    const sys = systemColumnsFor(collection);
    const table = quoteIdent(collection.tableName);
    const now = new Date().toISOString();

    const params: unknown[] = [];
    const setClauses = [`${quoteIdent(sys.publishStatus)} = $${params.push(record.publishStatus)}`];

    for (const field of collection.fields) {
      const column = columnForField(collection, field);
      setClauses.push(`${quoteIdent(column)} = $${params.push(bindValue(record.values[field.key]))}`);
    }
    setClauses.push(`${quoteIdent(sys.modifiedAt)} = $${params.push(now)}`);

    let sql = `update ${table} set ${setClauses.join(", ")} where ${quoteIdent(sys.id)} = $${params.push(record.id)}`;
    if (expectedModifiedAt !== undefined) {
      // Compare truncated to millisecond precision on both sides: the
      // before-update trigger stamps this column with a millisecond-
      // truncated `now()` (see schema-sql.ts), but a handful of rows
      // written before that fix still carry raw microsecond-precision
      // timestamps, which would otherwise never equal the millisecond-
      // precision value the API can read back and send as `expectedModifiedAt`
      // (node-postgres reads timestamptz into a JS `Date`, which itself
      // can't hold sub-millisecond precision).
      sql += ` and date_trunc('milliseconds', ${quoteIdent(sys.modifiedAt)}) = date_trunc('milliseconds', $${params.push(expectedModifiedAt)}::timestamptz)`;
    }
    sql += " returning *";

    const result = await timeDb(() => getPool().query(sql, params));
    if (result.rows.length > 0) {
      return mapRowToRecord(collection, result.rows[0] as Record<string, unknown>);
    }

    // Zero rows updated: either the record doesn't exist, or (when checking
    // expectedModifiedAt) it exists but was modified since the caller last read it.
    const stillExists = await this.getRecord(collection, record.id);
    return stillExists ? "conflict" : null;
  }

  async deleteRecord(collection: CmsCollection, recordId: string): Promise<boolean> {
    const sys = systemColumnsFor(collection);
    const table = quoteIdent(collection.tableName);
    const result = await timeDb(() => getPool().query(`delete from ${table} where ${quoteIdent(sys.id)} = $1`, [recordId]));
    return (result.rowCount ?? 0) > 0;
  }

  async publishQueued(collection: CmsCollection): Promise<string[]> {
    const sys = systemColumnsFor(collection);
    const table = quoteIdent(collection.tableName);
    const publishedStatus: PublishStatus = "published";
    const queuedStatus: PublishStatus = "queued_to_publish";

    const result = await timeDb(() =>
      getPool().query(
        `update ${table} set ${quoteIdent(sys.publishStatus)} = $1 where ${quoteIdent(sys.publishStatus)} = $2 returning ${quoteIdent(sys.id)} as id`,
        [publishedStatus, queuedStatus]
      )
    );
    return result.rows.map((row) => String((row as { id: unknown }).id));
  }

  async setPublishStatus(collection: CmsCollection, recordIds: string[], status: PublishStatus): Promise<CmsRecord[]> {
    const sys = systemColumnsFor(collection);
    const table = quoteIdent(collection.tableName);
    const now = new Date().toISOString();

    const sql = `update ${table} set ${quoteIdent(sys.publishStatus)} = $1, ${quoteIdent(sys.modifiedAt)} = $2 where ${quoteIdent(sys.id)} = any($3::uuid[]) returning *`;
    const result = await timeDb(() => getPool().query(sql, [status, now, recordIds]));

    const records = result.rows.map((row) => mapRowToRecord(collection, row as Record<string, unknown>));
    const byId = new Map(records.map((record) => [record.id, record]));
    return recordIds.map((id) => byId.get(id)).filter((record): record is CmsRecord => Boolean(record));
  }
}
