import { migrate } from "drizzle-orm/node-postgres/migrator";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Db } from "./client.ts";
import { createDb } from "./client.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * SQL migrations in repo root `drizzle/`, produced by `pnpm run db:generate`.
 * Path works for both `tsx src/index.ts` and `node dist/index.ts`.
 */
export const migrationsFolder = join(__dirname, "../../drizzle");

export async function runMigrations(db: Db): Promise<void> {
  await migrate(db, { migrationsFolder });
}

export async function connectAndMigrate(databaseUrl: string) {
  const { db, pool } = createDb(databaseUrl);
  await migrate(db, { migrationsFolder });
  return { db, pool };
}
