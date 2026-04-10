import type { IGitHubRepos, ISubscriptionRepository } from "../domain/ports.ts";
import type { ResendService } from "../adapters/resend.ts";
import { parseOwnerRepo } from "../validation.ts";

export interface ScannerLogger {
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

export interface ScannerRunResult {
  reposChecked: number;
  notificationsSent: number;
  reposUpdated: number;
}

export interface SubscriptionsScanner {
  runOnce(): Promise<ScannerRunResult>;
}

interface ScanCandidate {
  email: string;
  repo: string;
  unsubscribeToken: string;
  lastSeenTag: string | null;
}

const RELEASE_EMAIL_BATCH_SIZE = 100;

function groupByRepo(rows: ScanCandidate[]): Map<string, ScanCandidate[]> {
  const grouped = new Map<string, ScanCandidate[]>();
  for (const row of rows) {
    const current = grouped.get(row.repo);
    if (current) {
      current.push(row);
      continue;
    }
    grouped.set(row.repo, [row]);
  }
  return grouped;
}

function chunk<T>(rows: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    chunks.push(rows.slice(i, i + size));
  }
  return chunks;
}

export function createSubscriptionsScanner(deps: {
  github: Pick<IGitHubRepos, "getLatestReleaseTag">;
  subscriptions: Pick<
    ISubscriptionRepository,
    "findActiveForScan" | "updateRepoLastSeenTag"
  >;
  resend: Pick<ResendService, "sendReleasesBatchEmail">;
  logger: ScannerLogger;
}): SubscriptionsScanner {
  return {
    async runOnce() {
      const active = await deps.subscriptions.findActiveForScan();
      const grouped = groupByRepo(active);

      let reposChecked = 0;
      let notificationsSent = 0;
      let reposUpdated = 0;

      for (const [repo, subscribers] of grouped) {
        reposChecked += 1;
        const parsed = parseOwnerRepo(repo);
        if (!parsed) {
          deps.logger.warn("Skipping invalid repo slug during scan", { repo });
          continue;
        }

        const latestTag = await deps.github.getLatestReleaseTag(
          parsed.owner,
          parsed.repo
        );
        if (!latestTag) continue;

        const previousTag = subscribers[0]?.lastSeenTag ?? null;
        if (previousTag === latestTag) continue;

        let sentAllForRepo = true;
        for (const recipientsChunk of chunk(
          subscribers,
          RELEASE_EMAIL_BATCH_SIZE
        )) {
          const response = await deps.resend.sendReleasesBatchEmail(
            {
              email: recipientsChunk[0]?.email ?? "",
              repo,
              confirmed: true,
              last_seen_tag: latestTag,
            },
            recipientsChunk.map((subscriber) => ({
              email: subscriber.email,
              unsubscribeToken: subscriber.unsubscribeToken,
            }))
          );

          if (response.error) {
            sentAllForRepo = false;
            deps.logger.error("Failed to send release email", {
              repo,
              recipientCount: recipientsChunk.length,
              error: response.error,
            });
            continue;
          }

          notificationsSent += recipientsChunk.length;
        }

        if (!sentAllForRepo) continue;

        await deps.subscriptions.updateRepoLastSeenTag(repo, latestTag);
        reposUpdated += 1;
      }

      const result: ScannerRunResult = {
        reposChecked,
        notificationsSent,
        reposUpdated,
      };
      deps.logger.info("Scanner run completed", result);
      return result;
    },
  };
}
