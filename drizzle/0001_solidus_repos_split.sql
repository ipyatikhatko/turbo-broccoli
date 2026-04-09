CREATE TABLE IF NOT EXISTS "repos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"last_seen_tag" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "repos_full_name_idx" ON "repos" USING btree ("full_name");
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_name = 'subscriptions' AND column_name = 'repo'
	) THEN
		INSERT INTO "repos" ("full_name", "last_seen_tag")
		SELECT "repo", max("last_seen_tag")
		FROM "subscriptions"
		GROUP BY "repo"
		ON CONFLICT ("full_name") DO UPDATE
		SET "last_seen_tag" = COALESCE(EXCLUDED."last_seen_tag", "repos"."last_seen_tag");
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "repo_id" uuid;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_name = 'subscriptions' AND column_name = 'repo'
	) THEN
		UPDATE "subscriptions" AS "s"
		SET "repo_id" = "r"."id"
		FROM "repos" AS "r"
		WHERE "s"."repo" = "r"."full_name";
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "repo_id" SET NOT NULL;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'subscriptions_repo_id_repos_id_fk'
	) THEN
		ALTER TABLE "subscriptions"
		ADD CONSTRAINT "subscriptions_repo_id_repos_id_fk"
		FOREIGN KEY ("repo_id") REFERENCES "repos"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DROP INDEX IF EXISTS "subscriptions_email_repo_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_email_repo_idx" ON "subscriptions" USING btree ("email","repo_id");
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "repo";
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "last_seen_tag";
