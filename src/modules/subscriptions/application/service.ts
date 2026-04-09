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
import { ResendApiError } from "../domain/errors.ts";

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
      const parsedSlug = parseOwnerRepo(input.repo);
      if (!parsedSlug) throw new InvalidRepoFormatError();

      const exists = await deps.github.repoExists(
        parsedSlug.owner,
        parsedSlug.repo
      );
      if (!exists) throw new GithubRepoNotFoundError();

      const existing = await deps.subscriptions.findByEmailAndRepo(
        input.email,
        input.repo.trim()
      );
      if (existing) throw new SubscriptionConflictError();

      const confirmToken = randomToken();
      const unsubscribeToken = randomToken();

      const email = await deps.resend.sendConfirmationEmail(
        input.email,
        confirmToken
      );
      if (email.error) throw new ResendApiError(email.error.message);

      await deps.subscriptions.insertPending({
        email: input.email.trim(),
        repo: input.repo.trim(),
        confirmToken,
        unsubscribeToken,
      });
    },

    async confirm(input) {
      const subscription = await deps.subscriptions.findByConfirmToken(
        input.token
      );
      if (!subscription) throw new SubscriptionNotFoundError();
      if (subscription.confirmed) throw new SubscriptionAlreadyConfirmedError();

      await deps.subscriptions.confirm(subscription.confirmToken);
    },

    async unsubscribe(_input) {},

    async list(input) {
      const email = input.email.trim();
      if (!isValidEmailFormat(email)) throw new InvalidEmailError();

      const rows = await deps.subscriptions.findActiveByEmail(email);
      return rows.map((row) => subscriptionRowToApi(row));
    },
  };
}
