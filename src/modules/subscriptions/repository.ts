import { and, eq } from "drizzle-orm";

import type { Db } from "../../db/client.ts";
import { subscriptions } from "../../db/schema.ts";
import type {
  ISubscriptionRepository,
  PendingSubscriptionInput,
} from "./domain.ts";

export function createSubscriptionRepository(db: Db): ISubscriptionRepository {
  return {
    async findByEmailAndRepo(email, repo) {
      const rows = await db
        .select()
        .from(subscriptions)
        .where(
          and(eq(subscriptions.email, email), eq(subscriptions.repo, repo)),
        )
        .limit(1);
      return rows[0] ?? null;
    },

    async findActiveByEmail(email) {
      return db
        .select()
        .from(subscriptions)
        .where(
          and(eq(subscriptions.email, email), eq(subscriptions.confirmed, true)),
        );
    },

    async insertPending(input: PendingSubscriptionInput) {
      await db.insert(subscriptions).values({
        email: input.email,
        repo: input.repo,
        confirmed: false,
        confirmToken: input.confirmToken,
        unsubscribeToken: input.unsubscribeToken,
      });
    },
  };
}
