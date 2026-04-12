import { randomBytes } from "node:crypto";

import { subscriptionRowToApi } from "../../../db/subscription-mapper.ts";
import {
  GithubRepoNotFoundError,
  InvalidEmailError,
  InvalidRepoFormatError,
  SubscriptionAlreadyConfirmedError,
  SubscriptionConflictError,
  SubscriptionNotFoundError,
  type IGitHubRepos,
  type ISubscriptionRepository,
} from "../domain/index.ts";
import type {
  SubscribeBody,
  SubscriptionsListResponse,
  SubscriptionsQuery,
  TokenParams,
  UnsubscribeTokenParams,
} from "../types.ts";
import { isValidEmailFormat, parseOwnerRepo } from "../validation.ts";
import type { ResendService } from "../adapters/resend.ts";
import {
  ResendApiError,
  SubscriptionNotConfirmedError,
} from "../domain/errors.ts";

export interface SubscriptionsService {
  subscribe(input: SubscribeBody): Promise<void>;
  confirm(input: TokenParams): Promise<void>;
  unsubscribe(input: UnsubscribeTokenParams): Promise<void>;
  list(input: SubscriptionsQuery): Promise<SubscriptionsListResponse>;
}

function randomToken(): string {
  return randomBytes(24).toString("hex");
}

export function createSubscriptionsService(deps: {
  github: IGitHubRepos;
  subscriptions: ISubscriptionRepository;
  resend: ResendService;
}): SubscriptionsService {
  return {
    async subscribe(input) {
      const email = input.email.trim();
      const repo = input.repo.trim();

      const parsedSlug = parseOwnerRepo(repo);
      if (!parsedSlug) throw new InvalidRepoFormatError();

      const exists = await deps.github.repoExists(
        parsedSlug.owner,
        parsedSlug.repo
      );
      if (!exists) throw new GithubRepoNotFoundError();

      const existing = await deps.subscriptions.findByEmailAndRepo(email, repo);
      if (existing) throw new SubscriptionConflictError();

      const confirmToken = randomToken();
      const unsubscribeToken = randomToken();
      const currentReleaseTag = await deps.github.getLatestReleaseTag(
        parsedSlug.owner,
        parsedSlug.repo
      );

      await deps.subscriptions.insertPending({
        email,
        repo,
        confirmToken,
        unsubscribeToken,
      });

      const emailResult = await deps.resend.sendConfirmationEmail(
        email,
        confirmToken,
        repo,
        currentReleaseTag
      );
      if (emailResult.error) {
        await deps.subscriptions.deletePendingByConfirmToken(confirmToken);
        throw new ResendApiError(emailResult.error.message);
      }
    },

    async confirm(input) {
      const ctx = await deps.subscriptions.findPendingWithRepoByConfirmToken(
        input.token
      );
      if (!ctx) throw new SubscriptionNotFoundError();
      if (ctx.subscription.confirmed) {
        throw new SubscriptionAlreadyConfirmedError();
      }

      const parsedSlug = parseOwnerRepo(ctx.repoFullName);
      if (!parsedSlug) throw new InvalidRepoFormatError();

      const tagAtConfirm = await deps.github.getLatestReleaseTag(
        parsedSlug.owner,
        parsedSlug.repo
      );

      await deps.subscriptions.confirmAndSetLastNotifiedTag(
        ctx.subscription.confirmToken,
        tagAtConfirm
      );
    },

    async unsubscribe(_input) {
      const subscription = await deps.subscriptions.findByUnsubscribeToken(
        _input.token
      );
      if (!subscription) throw new SubscriptionNotFoundError();
      if (!subscription.confirmed) throw new SubscriptionNotConfirmedError();

      await deps.subscriptions.unsubscribe(subscription.unsubscribeToken);
    },

    async list(input) {
      const email = input.email.trim();
      if (!isValidEmailFormat(email)) throw new InvalidEmailError();

      const rows = await deps.subscriptions.findActiveByEmail(email);
      return rows.map((row) => subscriptionRowToApi(row));
    },
  };
}
