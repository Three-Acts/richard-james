/**
 * Creates the first (or an additional) CMS editor account via Neon Auth's
 * `sign-up/email`. Not called by the CMS itself — sign-up is meant to be
 * disabled at the Neon Auth level once the first editor exists
 * (`neon neon-auth config email-password update --disable-sign-up`).
 *
 * Usage: `npm run auth:create-editor -w @three-acts/api -- --email <email> --password <password> [--name <name>]`
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { signUpWithEmail } from "../api/_lib/neon-auth";
import { loadEnvFiles } from "./load-env";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnvFiles([
  resolve(__dirname, "../.env.local"), // apps/api/.env.local — live Neon branch vars
  resolve(__dirname, "../.env") // apps/api/.env — fallback for anything .env.local doesn't set, if present
]);

type Args = { email?: string; password?: string; name?: string };

function parseArgs(argv: string[]): Args {
  const args: Args = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const eq = arg.indexOf("=");
    const [flag, inlineValue] = eq >= 0 ? [arg.slice(0, eq), arg.slice(eq + 1)] : [arg, undefined];
    const value = inlineValue ?? (flag.startsWith("--") ? argv[++i] : undefined);

    if (flag === "--email") args.email = value;
    else if (flag === "--password") args.password = value;
    else if (flag === "--name") args.name = value;
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.email || !args.password) {
    console.error("Usage: npm run auth:create-editor -w @three-acts/api -- --email <email> --password <password> [--name <name>]");
    process.exit(1);
  }

  const name = args.name?.trim() || args.email.split("@")[0] || args.email;
  const user = await signUpWithEmail(args.email, args.password, name);

  // Deliberately never logs the password.
  console.log(`Editor created: ${user.email} (id: ${user.id})`);
}

main().catch((caughtError) => {
  console.error(caughtError instanceof Error ? caughtError.message : caughtError);
  process.exit(1);
});
