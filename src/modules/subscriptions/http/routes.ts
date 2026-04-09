import type { FastifyPluginAsync } from "fastify";
import { Octokit } from "octokit";

import { createGitHubRepos } from "../adapters/github-octokit.ts";
import { createSubscriptionRepository } from "../adapters/repository.ts";
import { createSubscriptionsService } from "../application/service.ts";
import { createSubscriptionsController } from "./controller.ts";
import type {
  SubscribeBody,
  SubscriptionsQuery,
  TokenParams,
  UnsubscribeTokenParams,
} from "../types.ts";
import { createResend } from "../adapters/resend.ts";
import { createResendService } from "../adapters/resend.ts";

export const subscriptionsRoutes: FastifyPluginAsync = async (fastify) => {
  const token = process.env.GITHUB_TOKEN;
  const octokit = new Octokit(token ? { auth: token } : {});
  const github = createGitHubRepos(octokit);
  const subscriptions = createSubscriptionRepository(fastify.db);
  const resend = createResendService(createResend());
  const service = createSubscriptionsService({ github, subscriptions, resend });
  const controller = createSubscriptionsController(service);

  fastify.post<{ Body: SubscribeBody }>("/api/subscribe", controller.subscribe);
  fastify.get<{ Params: TokenParams }>(
    "/api/confirm/:token",
    controller.confirm
  );
  fastify.get<{ Params: UnsubscribeTokenParams }>(
    "/api/unsubscribe/:token",
    controller.unsubscribe
  );
  fastify.get<{ Querystring: SubscriptionsQuery }>(
    "/api/subscriptions",
    controller.list
  );
};
