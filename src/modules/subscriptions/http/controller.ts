import type { FastifyReply, FastifyRequest } from "fastify";

import { isSubscriptionDomainError } from "../domain/index.ts";
import type { SubscriptionsScanner } from "../application/scanner.ts";
import type { SubscriptionsService } from "../application/service.ts";
import type {
  SubscribeBody,
  SubscriptionsQuery,
  TokenParams,
  UnsubscribeTokenParams,
} from "../types.ts";
import { isHtmxWebSubscribe, isWebDocumentClient } from "./client-kind.ts";
import {
  subscribeErrorFragment,
  subscribeSuccessFragment,
  subscribeUnexpectedErrorFragment,
} from "@/modules/web/http/subscribe-fragments.ts";
import { resolveWebAppOrigin } from "@/modules/web/env.ts";

export interface SubscriptionsController {
  subscribe(
    request: FastifyRequest<{ Body: SubscribeBody }>,
    reply: FastifyReply
  ): Promise<void>;
  confirm(
    request: FastifyRequest<{ Params: TokenParams }>,
    reply: FastifyReply
  ): Promise<void>;
  unsubscribe(
    request: FastifyRequest<{ Params: UnsubscribeTokenParams }>,
    reply: FastifyReply
  ): Promise<void>;
  list(
    request: FastifyRequest<{ Querystring: SubscriptionsQuery }>,
    reply: FastifyReply
  ): Promise<void>;
}

export interface ScannerController {
  scan(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}

function setDomainErrorHttpStatus(reply: FastifyReply, code: string): void {
  switch (code) {
    case "INVALID_REPO_FORMAT":
      reply.code(400);
      break;
    case "INVALID_EMAIL":
      reply.code(400);
      break;
    case "GITHUB_REPO_NOT_FOUND":
      reply.code(404);
      break;
    case "SUBSCRIPTION_CONFLICT":
      reply.code(409);
      break;
    case "GITHUB_RATE_LIMITED":
      reply.code(429);
      break;
    case "SUBSCRIPTION_NOT_FOUND":
      reply.code(404);
      break;
    case "SUBSCRIPTION_ALREADY_CONFIRMED":
      reply.code(400);
      break;
    case "SUBSCRIPTION_NOT_CONFIRMED":
      reply.code(400);
      break;
    case "INVALID_TOKEN":
      reply.code(400);
      break;
    default:
      reply.code(500);
      break;
  }
}

function handleDomainError(reply: FastifyReply, err: unknown): boolean {
  if (!isSubscriptionDomainError(err)) return false;
  const errorResponse = err.toResponse();
  setDomainErrorHttpStatus(reply, err.code);
  reply.send(errorResponse);
  return true;
}

function readScannerKeyHeader(
  headers: FastifyRequest["headers"]
): string {
  const raw = headers["x-scanner-key"];
  if (raw === undefined) return "";
  return Array.isArray(raw) ? raw[0]?.trim() ?? "" : raw.trim();
}

export function createScannerController(
  scanner: SubscriptionsScanner,
  externalToken: string | undefined
): ScannerController {
  return {
    async scan(request, reply) {
      if (!externalToken) {
        reply.code(503).send({
          code: "SCANNER_TOKEN_NOT_CONFIGURED",
          message: "Scanner external token is not configured",
        });
        return;
      }

      const provided = readScannerKeyHeader(request.headers);
      if (!provided || provided !== externalToken) {
        reply.code(401).send({ code: "UNAUTHORIZED", message: "Unauthorized" });
        return;
      }

      const result = await scanner.runOnce();
      reply.code(200).send(result);
    },
  };
}

export function createSubscriptionsController(
  service: SubscriptionsService
): SubscriptionsController {
  return {
    async subscribe(request, reply) {
      const htmx = isHtmxWebSubscribe(request);
      try {
        await service.subscribe(request.body as SubscribeBody);
        if (htmx) {
          reply
            .code(200)
            .type("text/html; charset=utf-8")
            .send(subscribeSuccessFragment());
          return;
        }
        reply.code(200).send();
      } catch (err) {
        if (htmx) {
          const fragment = subscribeErrorFragment(err);
          if (fragment && isSubscriptionDomainError(err)) {
            setDomainErrorHttpStatus(reply, err.code);
            reply.type("text/html; charset=utf-8").send(fragment);
            return;
          }
          reply
            .code(500)
            .type("text/html; charset=utf-8")
            .send(subscribeUnexpectedErrorFragment());
          return;
        }
        if (handleDomainError(reply, err)) return;
        throw err;
      }
    },
    async confirm(request, reply) {
      const web = isWebDocumentClient(request);
      try {
        await service.confirm(request.params as TokenParams);
        if (web) {
          const origin = resolveWebAppOrigin();
          reply.redirect(`${origin}/subscription-confirmed`);
          return;
        }
        reply.code(200).send();
      } catch (err) {
        if (web && isSubscriptionDomainError(err)) {
          const origin = resolveWebAppOrigin();
          const u = new URL(`${origin}/error`);
          u.searchParams.set("code", err.code);
          reply.redirect(u.toString());
          return;
        }
        if (handleDomainError(reply, err)) return;
        throw err;
      }
    },
    async unsubscribe(request, reply) {
      const web = isWebDocumentClient(request);
      try {
        await service.unsubscribe(request.params as UnsubscribeTokenParams);
        if (web) {
          const origin = resolveWebAppOrigin();
          reply.redirect(`${origin}/unsubscribed`);
          return;
        }
        reply.code(200).send();
      } catch (err) {
        if (web && isSubscriptionDomainError(err)) {
          const origin = resolveWebAppOrigin();
          const u = new URL(`${origin}/error`);
          u.searchParams.set("code", err.code);
          reply.redirect(u.toString());
          return;
        }
        if (handleDomainError(reply, err)) return;
        throw err;
      }
    },
    async list(request, reply) {
      try {
        const subscriptions = await service.list(
          request.query as SubscriptionsQuery
        );
        reply.code(200).send(subscriptions);
      } catch (err) {
        if (handleDomainError(reply, err)) return;
        throw err;
      }
    },
  };
}
