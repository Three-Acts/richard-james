/**
 * Prints the generated schema SQL (see ./schema-sql.ts) to stdout.
 *
 * Usage: `npm run schema:sql -w @three-acts/api` (prints to stdout; pipe to a
 * file or `psql` as needed). `npm run db:migrate -w @three-acts/api` applies
 * the same SQL directly.
 */
import { generateSchemaSql } from "./schema-sql";

console.log(generateSchemaSql());
