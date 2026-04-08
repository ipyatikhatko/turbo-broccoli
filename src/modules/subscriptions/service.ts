import { randomBytes } from "node:crypto";

import { subscriptionRowToApi } from "../../db/subscription-mapper.ts";
import {
  GithubRepoNotFoundError,
  InvalidEmailError,
  InvalidRepoFormatError,
  SubscriptionConflictError,
  type IGitHubRepos,
  type ISubscriptionRepository,
} from "./domain.ts";
import type {
  SubscribeBody,
  SubscriptionsListResponse,
  SubscriptionsQuery,
  TokenParams,
  UnsubscribeTokenParams,
} from "./types.ts";
import { isValidEmailFormat, parseOwnerRepo } from "./validation.ts";

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

      await deps.subscriptions.insertPending({
        email: input.email.trim(),
        repo: input.repo.trim(),
        confirmToken: randomToken(),
        unsubscribeToken: randomToken(),
      });
    },

    async confirm(_input) {},

    async unsubscribe(_input) {},

    async list(input) {
      const email = input.email.trim();
      if (!isValidEmailFormat(email)) throw new InvalidEmailError();

      const rows = await deps.subscriptions.findActiveByEmail(email);
      return rows.map((row) => subscriptionRowToApi(row));
    },
  };
}
