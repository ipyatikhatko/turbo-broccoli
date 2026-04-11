import type { FastifyPluginAsync } from "fastify";
import { Octokit } from "octokit";

import { createGitHubRepos } from "../adapters/github-octokit.ts";
import { createSubscriptionRepository } from "../adapters/repository.ts";
import { createSubscriptionsService } from "../application/service.ts";
import { createSubscriptionsScanner } from "../application/scanner.ts";
import {
  createScannerController,
  createSubscriptionsController,
} from "./controller.ts";
import { registerScannerCron } from "./scanner.ts";
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
  const scanner = createSubscriptionsScanner({
    github,
    subscriptions,
    resend,
    logger: fastify.log,
  });
  const controller = createSubscriptionsController(service);

  const scannerSecretKey = process.env.SCANNER_SECRET_KEY?.trim();
  const scannerCronEnabled =
    process.env.SCANNER_CRON_ENABLED?.toLowerCase() === "true";
  const scannerCronExpression =
    process.env.SCANNER_CRON_EXPRESSION?.trim() ?? "0 */5 * * * *";
  const scannerController = createScannerController(
    scanner,
    scannerSecretKey
  );

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
  fastify.post("/external/scan", scannerController.scan);

  registerScannerCron(fastify, scanner, {
    cronEnabled: scannerCronEnabled,
    cronExpression: scannerCronExpression,
  });
};
