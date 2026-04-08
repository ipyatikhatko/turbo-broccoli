import { migrate } from "drizzle-orm/node-postgres/migrator";
import { join } from "node:path";

import type { Db } from "./client.ts";
import { createDb } from "./client.ts";

/**
 * SQL migrations in repo root `drizzle/` (from `pnpm run db:generate`).
 * Uses cwd so it stays correct when the app is bundled to a single `dist/index.js`.
 */
export const migrationsFolder = join(process.cwd(), "drizzle");

export async function runMigrations(db: Db): Promise<void> {
  await migrate(db, { migrationsFolder });
}

export async function connectAndMigrate(databaseUrl: string) {
  const { db, pool } = createDb(databaseUrl);
  await migrate(db, { migrationsFolder });
  return { db, pool };
}
