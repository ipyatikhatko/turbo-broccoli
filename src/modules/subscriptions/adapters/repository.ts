import { and, eq, inArray } from "drizzle-orm";

import type { Db } from "../../../db/client.ts";
import { repos, subscriptions } from "../../../db/schema.ts";
import type {
  ISubscriptionRepository,
  PendingSubscriptionInput,
} from "../domain/index.ts";

export function createSubscriptionRepository(db: Db): ISubscriptionRepository {
  async function getOrCreateRepoId(fullName: string): Promise<string> {
    const existing = await db
      .select({ id: repos.id })
      .from(repos)
      .where(eq(repos.fullName, fullName))
      .limit(1);
    const existingId = existing[0]?.id;
    if (existingId) return existingId;

    const inserted = await db
      .insert(repos)
      .values({ fullName })
      .onConflictDoNothing({ target: repos.fullName })
      .returning({ id: repos.id });
    const insertedId = inserted[0]?.id;
    if (insertedId) return insertedId;

    const afterConflict = await db
      .select({ id: repos.id })
      .from(repos)
      .where(eq(repos.fullName, fullName))
      .limit(1);
    const repoId = afterConflict[0]?.id;
    if (!repoId) throw new Error("Failed to resolve repo id");
    return repoId;
  }

  return {
    async findByEmailAndRepo(email, repo) {
      const normalizedRepo = repo.trim();
      const rows = await db
        .select()
        .from(subscriptions)
        .innerJoin(repos, eq(subscriptions.repoId, repos.id))
        .where(
          and(
            eq(subscriptions.email, email),
            eq(repos.fullName, normalizedRepo)
          )
        )
        .limit(1);
      return rows[0]?.subscriptions ?? null;
    },

    async findActiveByEmail(email) {
      return db
        .select({
          email: subscriptions.email,
          repo: repos.fullName,
          confirmed: subscriptions.confirmed,
          lastSeenTag: subscriptions.lastNotifiedTag,
        })
        .from(subscriptions)
        .innerJoin(repos, eq(subscriptions.repoId, repos.id))
        .where(
          and(eq(subscriptions.email, email), eq(subscriptions.confirmed, true))
        );
    },

    async insertPending(input: PendingSubscriptionInput) {
      const repoId = await getOrCreateRepoId(input.repo);
      await db.insert(subscriptions).values({
        email: input.email,
        repoId,
        confirmed: false,
        confirmToken: input.confirmToken,
        unsubscribeToken: input.unsubscribeToken,
      });
    },

    async findPendingWithRepoByConfirmToken(token) {
      const rows = await db
        .select()
        .from(subscriptions)
        .innerJoin(repos, eq(subscriptions.repoId, repos.id))
        .where(eq(subscriptions.confirmToken, token))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        subscription: row.subscriptions,
        repoFullName: row.repos.fullName,
      };
    },

    async confirmAndSetLastNotifiedTag(confirmToken, lastNotifiedTag) {
      await db
        .update(subscriptions)
        .set({
          confirmed: true,
          lastNotifiedTag,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(subscriptions.confirmToken, confirmToken),
            eq(subscriptions.confirmed, false)
          )
        );
    },
    async findByUnsubscribeToken(token) {
      const rows = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.unsubscribeToken, token))
        .limit(1);
      return rows[0] ?? null;
    },
    async findActiveForScan() {
      return db
        .select({
          subscriptionId: subscriptions.id,
          email: subscriptions.email,
          repo: repos.fullName,
          unsubscribeToken: subscriptions.unsubscribeToken,
          lastNotifiedTag: subscriptions.lastNotifiedTag,
        })
        .from(subscriptions)
        .innerJoin(repos, eq(subscriptions.repoId, repos.id))
        .where(eq(subscriptions.confirmed, true));
    },
    async deletePendingByConfirmToken(confirmToken) {
      await db
        .delete(subscriptions)
        .where(
          and(
            eq(subscriptions.confirmToken, confirmToken),
            eq(subscriptions.confirmed, false)
          )
        );
    },

    async unsubscribe(token) {
      await db
        .delete(subscriptions)
        .where(eq(subscriptions.unsubscribeToken, token));
    },
    async updateLastNotifiedTagForSubscriptionIds(ids, tag) {
      if (ids.length === 0) return;
      await db
        .update(subscriptions)
        .set({ lastNotifiedTag: tag, updatedAt: new Date() })
        .where(inArray(subscriptions.id, ids));
    },
  };
}
