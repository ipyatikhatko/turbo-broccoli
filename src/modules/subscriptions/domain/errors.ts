/** Domain errors mapped to HTTP status in the controller. */

/** Base domain error and response shape. */
export class SubscriptionDomainError extends Error {
  readonly code: string;
  readonly message: string;
  constructor(code: string, message: string = "Subscription domain error") {
    super(message);
    this.name = "SubscriptionDomainError";
    this.code = code;
    this.message = message;
  }
  toResponse() {
    return {
      code: this.code,
      message: this.message,
    };
  }
}

/** GitHub-related domain errors. */
export class GithubRepoNotFoundError extends SubscriptionDomainError {
  constructor() {
    super("GITHUB_REPO_NOT_FOUND", "Repository not found on GitHub");
  }
}

export class GithubRateLimitedError extends SubscriptionDomainError {
  constructor() {
    super("GITHUB_RATE_LIMITED", "GitHub API rate limit exceeded");
  }
}

/** Subscription state and lifecycle errors. */
export class SubscriptionConflictError extends SubscriptionDomainError {
  constructor() {
    super(
      "SUBSCRIPTION_CONFLICT",
      "Email already subscribed to this repository"
    );
  }
}

export class SubscriptionNotFoundError extends SubscriptionDomainError {
  constructor() {
    super("SUBSCRIPTION_NOT_FOUND", "Subscription not found");
  }
}

export class SubscriptionAlreadyConfirmedError extends SubscriptionDomainError {
  constructor() {
    super("SUBSCRIPTION_ALREADY_CONFIRMED", "Subscription already confirmed");
  }
}

export class SubscriptionNotConfirmedError extends SubscriptionDomainError {
  constructor() {
    super("SUBSCRIPTION_NOT_CONFIRMED", "Subscription not confirmed");
  }
}

/** Input and token validation errors. */
export class InvalidRepoFormatError extends SubscriptionDomainError {
  constructor() {
    super(
      "INVALID_REPO_FORMAT",
      "Invalid repository format (expected owner/repo)"
    );
  }
}

export class InvalidEmailError extends SubscriptionDomainError {
  constructor() {
    super("INVALID_EMAIL", "Invalid email");
  }
}

export class InvalidTokenError extends SubscriptionDomainError {
  constructor() {
    super("INVALID_TOKEN", "Invalid token");
  }
}

/** External integration errors. */
export class ResendApiError extends SubscriptionDomainError {
  constructor(message = "Resend API error") {
    super("RESEND_API_ERROR", message);
  }
}

/** Type guard for controller-level error mapping. */
export function isSubscriptionDomainError(
  err: unknown
): err is
  | InvalidRepoFormatError
  | GithubRepoNotFoundError
  | SubscriptionConflictError
  | GithubRateLimitedError
  | InvalidEmailError
  | SubscriptionNotFoundError
  | SubscriptionAlreadyConfirmedError
  | InvalidTokenError
  | ResendApiError
  | SubscriptionNotConfirmedError
  {
  return (
    err instanceof InvalidRepoFormatError ||
    err instanceof GithubRepoNotFoundError ||
    err instanceof SubscriptionConflictError ||
    err instanceof GithubRateLimitedError ||
    err instanceof InvalidEmailError ||
    err instanceof SubscriptionNotFoundError ||
    err instanceof SubscriptionAlreadyConfirmedError ||
    err instanceof InvalidTokenError ||
    err instanceof ResendApiError ||
    err instanceof SubscriptionNotConfirmedError
  );
}
