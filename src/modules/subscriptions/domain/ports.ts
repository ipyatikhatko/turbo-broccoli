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

export interface ISubscriptionRepository {
  findByEmailAndRepo(
    email: string,
    repo: string
  ): Promise<SubscriptionRow | null>;
  findActiveByEmail(email: string): Promise<SubscriptionListRow[]>;
  insertPending(input: PendingSubscriptionInput): Promise<void>;
  findByConfirmToken(token: string): Promise<SubscriptionRow | null>;
  findByUnsubscribeToken(token: string): Promise<SubscriptionRow | null>;
  confirm(token: string): Promise<void>;
  unsubscribe(token: string): Promise<void>;
}
