import type {
  SubscriptionListRow,
  SubscriptionRow,
} from "../../../db/schema.ts";

/** Ports (implementations in `adapters/github-octokit.ts`, `adapters/repository.ts`). */

export interface IGitHubRepos {
  repoExists(owner: string, repo: string): Promise<boolean>;
  getLatestReleaseTag(owner: string, repo: string): Promise<string | null>;
}

export interface PendingSubscriptionInput {
  email: string;
  repo: string;
  confirmToken: string;
  unsubscribeToken: string;
}

export interface ActiveSubscriptionScanRow {
  subscriptionId: string;
  email: string;
  repo: string;
  unsubscribeToken: string;
  lastNotifiedTag: string | null;
}

export interface ISubscriptionRepository {
  findByEmailAndRepo(
    email: string,
    repo: string
  ): Promise<SubscriptionRow | null>;
  findActiveByEmail(email: string): Promise<SubscriptionListRow[]>;
  insertPending(input: PendingSubscriptionInput): Promise<void>;
  findPendingWithRepoByConfirmToken(token: string): Promise<{
    subscription: SubscriptionRow;
    repoFullName: string;
  } | null>;
  findByUnsubscribeToken(token: string): Promise<SubscriptionRow | null>;
  findActiveForScan(): Promise<ActiveSubscriptionScanRow[]>;
  confirmAndSetLastNotifiedTag(
    confirmToken: string,
    lastNotifiedTag: string | null
  ): Promise<void>;
  /** Removes a pending (unconfirmed) row by its confirm token. Used to roll back after email send failure. */
  deletePendingByConfirmToken(confirmToken: string): Promise<void>;
  unsubscribe(token: string): Promise<void>;
  updateLastNotifiedTagForSubscriptionIds(
    ids: string[],
    tag: string
  ): Promise<void>;
}
