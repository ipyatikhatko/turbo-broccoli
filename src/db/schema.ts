import {
  boolean,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Persists subscription data. Public API fields align with OpenAPI
 * `definitions.Subscription` in `src/types/openapi.d.ts` (email, repo,
 * confirmed, last_seen_tag). Additional columns are persistence-only.
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    repo: text("repo").notNull(),
    confirmed: boolean("confirmed").notNull().default(false),
    lastSeenTag: text("last_seen_tag"),
    confirmToken: text("confirm_token").notNull(),
    unsubscribeToken: text("unsubscribe_token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("subscriptions_email_repo_idx").on(table.email, table.repo),
    uniqueIndex("subscriptions_confirm_token_idx").on(table.confirmToken),
    uniqueIndex("subscriptions_unsubscribe_token_idx").on(
      table.unsubscribeToken,
    ),
  ],
);

export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type NewSubscriptionRow = typeof subscriptions.$inferInsert;
