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

/** Maps subscription domain error codes to HTTP status (API + web HTMX subscribe). */
export function setSubscriptionDomainErrorHttpStatus(
  reply: FastifyReply,
  code: string
): void {
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
  setSubscriptionDomainErrorHttpStatus(reply, err.code);
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
      try {
        await service.subscribe(request.body as SubscribeBody);
        reply.code(200).send();
      } catch (err) {
        if (handleDomainError(reply, err)) return;
        throw err;
      }
    },
    async confirm(request, reply) {
      try {
        await service.confirm(request.params as TokenParams);
        reply.code(200).send();
      } catch (err) {
        if (handleDomainError(reply, err)) return;
        throw err;
      }
    },
    async unsubscribe(request, reply) {
      try {
        await service.unsubscribe(request.params as UnsubscribeTokenParams);
        reply.code(200).send();
      } catch (err) {
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
