import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { getDb, sql } from "../lib/db/client";

function postgresErrorCode(e: unknown): string | undefined {
  if (
    e &&
    typeof e === "object" &&
    "code" in e &&
    typeof (e as { code: unknown }).code === "string"
  ) {
    return (e as { code: string }).code;
  }
  const cause =
    e && typeof e === "object" && "cause" in e
      ? (e as { cause: unknown }).cause
      : undefined;
  if (
    cause &&
    typeof cause === "object" &&
    "code" in cause &&
    typeof (cause as { code: unknown }).code === "string"
  ) {
    return (cause as { code: string }).code;
  }
  return undefined;
}

function isFatalConnectionConfigError(e: unknown): boolean {
  if (postgresErrorCode(e) === "28000") return true;
  const msg = e instanceof Error ? e.message : String(e);
  if (/role .* does not exist/i.test(msg)) return true;
  if (/database .* does not exist/i.test(msg)) return true;
  return false;
}

function wrongPortHint(): string {
  return (
    "\nIf the volume is fresh but the role still looks wrong, DATABASE_URL is probably " +
    "pointing at a different Postgres (e.g. Homebrew on 5432). Set POSTGRES_PUBLISH_PORT " +
    "in `.env` to a free host port (compose default is 15432), use the same port in " +
    "DATABASE_URL (…@localhost:<port>/…), then `docker compose up -d`."
  );
}

async function waitForPostgresReady() {
  if (!sql) return;

  const deadline = Date.now() + 60_000;
  let attempt = 0;
  while (Date.now() < deadline) {
    try {
      await sql`select 1 as ok`;
      return;
    } catch (e) {
      if (isFatalConnectionConfigError(e)) {
        console.error(wrongPortHint());
        throw e;
      }
      attempt += 1;
      const msg = e instanceof Error ? e.message : String(e);
      if (attempt === 1 || attempt % 5 === 0) {
        console.warn(
          `[migrate] waiting for Postgres (${attempt})… ${msg.slice(0, 120)}`
        );
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  throw new Error(
    "Postgres did not become ready within 60s. Is the container up and DATABASE_URL correct?"
  );
}

async function main() {
  if (!sql) {
    throw new Error("DATABASE_URL is required to run migrations.");
  }

  await waitForPostgresReady();
  await migrate(getDb(), { migrationsFolder: "drizzle" });
  console.log("[migrate] Done. Pending migrations from drizzle/ have been applied.");
  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
