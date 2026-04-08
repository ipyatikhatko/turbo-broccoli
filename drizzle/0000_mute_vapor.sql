CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"repo" text NOT NULL,
	"confirmed" boolean DEFAULT false NOT NULL,
	"last_seen_tag" text,
	"confirm_token" text NOT NULL,
	"unsubscribe_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_email_repo_idx" ON "subscriptions" USING btree ("email","repo");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_confirm_token_idx" ON "subscriptions" USING btree ("confirm_token");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_unsubscribe_token_idx" ON "subscriptions" USING btree ("unsubscribe_token");