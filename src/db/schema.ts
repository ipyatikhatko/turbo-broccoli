import {
  boolean,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Repositories are tracked separately so release state (`last_seen_tag`)
 * is stored once per repo, not once per subscriber row.
 */
export const repos = pgTable(
  "repos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fullName: text("full_name").notNull(),
    lastSeenTag: text("last_seen_tag"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("repos_full_name_idx").on(table.fullName)]
);

/**
 * Public API fields still align with OpenAPI `definitions.Subscription`.
 * The mapper joins subscriptions with repos to provide `repo` and `last_seen_tag`.
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    repoId: uuid("repo_id")
      .notNull()
      .references(() => repos.id, { onDelete: "cascade" }),
    confirmed: boolean("confirmed").notNull().default(false),
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
    uniqueIndex("subscriptions_email_repo_idx").on(table.email, table.repoId),
    uniqueIndex("subscriptions_confirm_token_idx").on(table.confirmToken),
    uniqueIndex("subscriptions_unsubscribe_token_idx").on(
      table.unsubscribeToken
    ),
  ]
);

export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type NewSubscriptionRow = typeof subscriptions.$inferInsert;
export type RepoRow = typeof repos.$inferSelect;

export interface SubscriptionListRow {
  email: string;
  repo: string;
  confirmed: boolean;
  lastSeenTag: string | null;
}
