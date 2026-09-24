/**
 * Applies the generated schema (see ./schema-sql.ts) to the live database
 * over a DIRECT (unpooled) connection — required for DDL/session-level work;
 * the pooled `DATABASE_URL` used by the running API is PgBouncer transaction
 * mode and doesn't support it. Runs the whole script in one transaction so a
 * failure never leaves the schema half-applied. Idempotent: every statement
 * is `IF NOT EXISTS` / `CREATE OR REPLACE` / `DROP ... IF EXISTS`.
 *
 * Usage: `npm run db:migrate -w @three-acts/api`
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { loadEnvFiles } from "./load-env";
import { generateSchemaSql } from "./schema-sql";

const __dirname = dirname(fileURLToPath(import.meta.url));

loadEnvFiles([
  resolve(__dirname, "../.env.local"), // apps/api/.env.local — live Neon branch vars (neon env pull)
  resolve(__dirname, "../.env") // apps/api/.env — fallback for anything .env.local doesn't set, if present
]);

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED;
  if (!connectionString) {
    console.error("DATABASE_URL_UNPOOLED is not set. Run `neon env pull --file apps/api/.env.local` first.");
    process.exit(1);
  }

  const sql = generateSchemaSql();
  const client = new Client({ connectionString });

  await client.connect();
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("commit");
    console.log("Schema applied.");
  } catch (caughtError) {
    await client.query("rollback").catch(() => undefined);
    throw caughtError;
  } finally {
    await client.end();
  }
}

main().catch((caughtError) => {
  console.error(caughtError);
  process.exit(1);
});
