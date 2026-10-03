import type { PoolClient } from "pg";
import { columnForField, systemColumnsFor, type CmsCollection } from "../schema.js";

export const PUBLISHED_ORDER_COLUMN = "cms_published_order";
export const PENDING_ORDER_COLUMN = "cms_order_pending";
export const quoteIdent = (value: string) => `"${value.replace(/"/g, '""')}"`;

export function orderingColumn(collection: CmsCollection): string | undefined {
  const field = collection.fields.find((item) => item.key === collection.orderingField && item.type === "number");
  return field ? columnForField(collection, field) : undefined;
}

export type OrderingRow = Record<string, unknown>;

/** Serialize collection writes, including insertions into an empty collection. */
export async function lockOrdering(client: PoolClient, collection: CmsCollection): Promise<OrderingRow[]> {
  const table = quoteIdent(collection.tableName);
  const sys = systemColumnsFor(collection);
  await client.query(`lock table ${table} in share row exclusive mode`);
  const result = await client.query(`select * from ${table} order by ${quoteIdent(orderingColumn(collection) ?? sys.createdAt)} asc nulls last, ${quoteIdent(sys.createdAt)}, ${quoteIdent(sys.id)}`);
  return result.rows;
}

export function placeItem(ids: string[], id: string, position: number): string[] {
  const next = ids.filter((item) => item !== id);
  next.splice(Math.min(Math.max(position - 1, 0), next.length), 0, id);
  return next;
}

/** Updates positions only. The timestamp trigger deliberately exempts these incidental shifts. */
export async function writePositions(client: PoolClient, collection: CmsCollection, ids: string[], column: string): Promise<void> {
  const sys = systemColumnsFor(collection);
  await client.query(
    `update ${quoteIdent(collection.tableName)} as item set ${quoteIdent(column)} = positions.position
     from unnest($1::uuid[]) with ordinality as positions(id, position)
     where item.${quoteIdent(sys.id)} = positions.id and item.${quoteIdent(column)} is distinct from positions.position`, [ids]
  );
}

/** Publish the saved list order, projecting out items that are still drafts. */
export async function publishOrdering(client: PoolClient, collection: CmsCollection, rows: OrderingRow[]): Promise<void> {
  const sys = systemColumnsFor(collection);
  const eligible = rows.filter(row => row[sys.publishStatus] === "published" || row[sys.publishStatus] === "queued_to_publish");
  await writePositions(client, collection, eligible.map(row => String(row[sys.id])), PUBLISHED_ORDER_COLUMN);
  await client.query(`update ${quoteIdent(collection.tableName)} set ${quoteIdent(PENDING_ORDER_COLUMN)} = false where ${quoteIdent(PENDING_ORDER_COLUMN)} = true`);
}
