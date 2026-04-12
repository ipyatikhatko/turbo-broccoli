import type { FastifyPluginAsync } from "fastify";
import { Octokit } from "octokit";

import { createGitHubRepos } from "@/modules/subscriptions/adapters/github-octokit.ts";
import { createSubscriptionRepository } from "@/modules/subscriptions/adapters/repository.ts";
import { createResend, createResendService } from "@/modules/subscriptions/adapters/resend.ts";
import { createSubscriptionsService } from "@/modules/subscriptions/application/service.ts";
import { isSubscriptionDomainError } from "@/modules/subscriptions/domain/index.ts";
import { setSubscriptionDomainErrorHttpStatus } from "@/modules/subscriptions/http/controller.ts";
import type {
  SubscribeBody,
  TokenParams,
  UnsubscribeTokenParams,
} from "@/modules/subscriptions/types.ts";
import {
  errorPageHtml,
  notFoundPageHtml,
  subscribePageHtml,
  subscriptionConfirmedPageHtml,
  unsubscribedPageHtml,
} from "../html/index.ts";
import {
  subscribeErrorFragment,
  subscribeSuccessFragment,
  subscribeUnexpectedErrorFragment,
} from "./subscribe-fragments.ts";

export const publicWebRoutes: FastifyPluginAsync = async (fastify) => {
  const token = process.env.GITHUB_TOKEN;
  const octokit = new Octokit(token ? { auth: token } : {});
  const github = createGitHubRepos(octokit);
  const subscriptions = createSubscriptionRepository(fastify.db);
  const resend = createResendService(createResend());
  const service = createSubscriptionsService({ github, subscriptions, resend });

  fastify.get("/", async (_request, reply) => {
    reply.redirect("/subscribe");
  });

  fastify.get("/subscribe", async (_request, reply) => {
    reply.type("text/html; charset=utf-8").send(subscribePageHtml());
  });

  fastify.post<{ Body: SubscribeBody }>("/subscribe", async (request, reply) => {
    try {
      await service.subscribe(request.body as SubscribeBody);
      reply
        .code(200)
        .type("text/html; charset=utf-8")
        .send(subscribeSuccessFragment());
    } catch (err) {
      const fragment = subscribeErrorFragment(err);
      if (fragment && isSubscriptionDomainError(err)) {
        setSubscriptionDomainErrorHttpStatus(reply, err.code);
        reply.type("text/html; charset=utf-8").send(fragment);
        return;
      }
      reply
        .code(500)
        .type("text/html; charset=utf-8")
        .send(subscribeUnexpectedErrorFragment());
    }
  });

  fastify.get<{ Params: TokenParams }>("/confirm/:token", async (request, reply) => {
    try {
      await service.confirm(request.params as TokenParams);
      reply.redirect("/subscription-confirmed");
    } catch (err) {
      if (isSubscriptionDomainError(err)) {
        reply.redirect(`/error?code=${encodeURIComponent(err.code)}`);
        return;
      }
      throw err;
    }
  });

  fastify.get<{ Params: UnsubscribeTokenParams }>(
    "/unsubscribe/:token",
    async (request, reply) => {
      try {
        await service.unsubscribe(request.params as UnsubscribeTokenParams);
        reply.redirect("/unsubscribed");
      } catch (err) {
        if (isSubscriptionDomainError(err)) {
          reply.redirect(`/error?code=${encodeURIComponent(err.code)}`);
          return;
        }
        throw err;
      }
    }
  );

  fastify.get("/subscription-confirmed", async (_request, reply) => {
    reply
      .type("text/html; charset=utf-8")
      .send(subscriptionConfirmedPageHtml());
  });

  fastify.get("/unsubscribed", async (_request, reply) => {
    reply.type("text/html; charset=utf-8").send(unsubscribedPageHtml());
  });

  fastify.get<{
    Querystring: { code?: string };
  }>("/error", async (request, reply) => {
    const code = request.query.code ?? "UNKNOWN";
    reply.type("text/html; charset=utf-8").send(errorPageHtml(code));
  });

  fastify.setNotFoundHandler(async (_request, reply) => {
    reply.code(404).type("text/html; charset=utf-8").send(notFoundPageHtml());
  });
};
