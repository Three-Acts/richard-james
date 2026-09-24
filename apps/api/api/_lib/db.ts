import { CmsError } from "@three-acts/cms-schema";
import { Pool, type PoolClient } from "pg";
import { attachDatabasePool } from "@vercel/functions";

/**
 * Lazily created `pg` pool on `DATABASE_URL` (pooled, PgBouncer transaction
 * mode). `max: 5` keeps each function instance's connection footprint small;
 * `attachDatabasePool` tells the Vercel runtime to drain the pool before a
 * function instance is frozen/recycled instead of leaking connections.
 *
 * Migrations and other session-level work (SET, LISTEN/NOTIFY, long-running
 * DDL) must use `DATABASE_URL_UNPOOLED` directly (see scripts/migrate.ts) —
 * never this pool.
 */
let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new CmsError("unavailable", "DATABASE_URL is not set.");
    }

    pool = new Pool({ connectionString, max: 5 });
    attachDatabasePool(pool);
    // Once per process, not per request/query — confirms the module-level
    // `pool` singleton above is actually being reused across requests (the
    // dev server, and a warm Vercel function instance, serve many requests
    // from one process) rather than a fresh Pool being created each time.
    console.info("[db] Postgres pool created");
  }

  return pool;
}

/** Runs `fn` inside a single checked-out client wrapped in BEGIN/COMMIT (ROLLBACK on throw). */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (caughtError) {
    await client.query("rollback").catch(() => undefined);
    throw caughtError;
  } finally {
    client.release();
  }
}
