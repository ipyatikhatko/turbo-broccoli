import type { SubscriptionRow } from "../../db/schema.ts";

/** Domain errors mapped to HTTP status in the controller. */

export class InvalidRepoFormatError extends Error {
  readonly code = "INVALID_REPO_FORMAT" as const;
  constructor() {
    super("Invalid repository format (expected owner/repo)");
    this.name = "InvalidRepoFormatError";
  }
}

export class GithubRepoNotFoundError extends Error {
  readonly code = "GITHUB_REPO_NOT_FOUND" as const;
  constructor() {
    super("Repository not found on GitHub");
    this.name = "GithubRepoNotFoundError";
  }
}

export class SubscriptionConflictError extends Error {
  readonly code = "SUBSCRIPTION_CONFLICT" as const;
  constructor() {
    super("Email already subscribed to this repository");
    this.name = "SubscriptionConflictError";
  }
}

export class GithubRateLimitedError extends Error {
  readonly code = "GITHUB_RATE_LIMITED" as const;
  constructor() {
    super("GitHub API rate limit exceeded");
    this.name = "GithubRateLimitedError";
  }
}

export class InvalidEmailError extends Error {
  readonly code = "INVALID_EMAIL" as const;
  constructor() {
    super("Invalid email");
    this.name = "InvalidEmailError";
  }
}

export function isSubscriptionDomainError(
  err: unknown,
): err is
  | InvalidRepoFormatError
  | GithubRepoNotFoundError
  | SubscriptionConflictError
  | GithubRateLimitedError
  | InvalidEmailError {
  return (
    err instanceof InvalidRepoFormatError ||
    err instanceof GithubRepoNotFoundError ||
    err instanceof SubscriptionConflictError ||
    err instanceof GithubRateLimitedError ||
    err instanceof InvalidEmailError
  );
}

/** Ports (implementations in `github-octokit.ts`, `repository.ts`). */

export interface IGitHubRepos {
  repoExists(owner: string, repo: string): Promise<boolean>;
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
    repo: string,
  ): Promise<SubscriptionRow | null>;
  findActiveByEmail(email: string): Promise<SubscriptionRow[]>;
  insertPending(input: PendingSubscriptionInput): Promise<void>;
}
