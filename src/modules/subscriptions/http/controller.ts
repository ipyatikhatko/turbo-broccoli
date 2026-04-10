import type { FastifyReply, FastifyRequest } from "fastify";

import { isSubscriptionDomainError } from "../domain/index.ts";
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

function handleDomainError(reply: FastifyReply, err: unknown): boolean {
  if (!isSubscriptionDomainError(err)) return false;
  const errorResponse = err.toResponse();

  switch (err.code) {
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

  reply.send(errorResponse);
  return true;
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
