import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Notice } from "postgres";
import * as schema from "./schema";

/** Drizzle migrator replays DDL; Postgres then emits harmless duplicate-object NOTICEs. */
function onPostgresNotice(notice: Notice) {
  const code = notice.code;
  if (code === "42P06" || code === "42P07") return;
  console.warn("[postgres]", notice.message ?? notice);
}

declare global {
  var __auraSql: postgres.Sql | undefined;
}

/** Handles common .env mistakes, e.g. `DATABASE_URL=DATABASE_URL=postgresql://...`. */
function normalizeDatabaseUrl(raw: string): { url: string; hadStrayPrefix: boolean } {
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    s = s.slice(1, -1).trim();
  }

  let hadStrayPrefix = false;
  const stray = /^DATABASE_URL=/i;
  while (stray.test(s)) {
    s = s.replace(stray, "").trim();
    hadStrayPrefix = true;
  }

  return { url: s, hadStrayPrefix };
}

const rawDatabaseUrl = process.env.DATABASE_URL;
const { url: connectionString, hadStrayPrefix } = rawDatabaseUrl
  ? normalizeDatabaseUrl(rawDatabaseUrl)
  : { url: undefined as string | undefined, hadStrayPrefix: false };

if (
  hadStrayPrefix &&
  connectionString &&
  process.env.NODE_ENV !== "production"
) {
  console.warn(
    "[db] DATABASE_URL looked like a duplicated assignment (value started with DATABASE_URL=). Using the URL after stripping that prefix."
  );
}

function createSql() {
  if (!connectionString) return null;

  if (process.env.NODE_ENV === "production") {
    return postgres(connectionString, {
      max: 5,
      prepare: false,
      onnotice: onPostgresNotice,
    });
  }

  globalThis.__auraSql ??= postgres(connectionString, {
    max: 2,
    prepare: false,
    onnotice: onPostgresNotice,
  });

  return globalThis.__auraSql;
}

export const sql = createSql();
export const db = sql ? drizzle(sql, { schema }) : null;

export function hasDatabase() {
  return Boolean(db);
}

export function getDb() {
  if (!db) {
    throw new Error("DATABASE_URL is required for this server operation.");
  }

  return db;
}

export type AuraDb = ReturnType<typeof getDb>;
