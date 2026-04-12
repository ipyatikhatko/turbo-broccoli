ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "last_notified_tag" text;
--> statement-breakpoint
UPDATE "subscriptions" AS s
SET "last_notified_tag" = r.last_seen_tag
FROM "repos" AS r
WHERE s.repo_id = r.id AND r.last_seen_tag IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "repos" DROP COLUMN IF EXISTS "last_seen_tag";
