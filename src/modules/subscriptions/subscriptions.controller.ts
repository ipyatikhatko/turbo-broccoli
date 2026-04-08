import type { FastifyReply, FastifyRequest } from "fastify";

import type { SubscriptionsService } from "./subscriptions.service.ts";
import type {
  SubscribeBody,
  SubscriptionsQuery,
  TokenParams,
  UnsubscribeTokenParams,
} from "./subscriptions.types.ts";

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

export function createSubscriptionsController(
  service: SubscriptionsService
): SubscriptionsController {
  return {
    async subscribe(request, reply) {
      await service.subscribe(request.body as SubscribeBody);
      reply.code(501).send({ message: "Not implemented yet" });
    },
    async confirm(request, reply) {
      await service.confirm(request.params as TokenParams);
      reply.code(501).send({ message: "Not implemented yet" });
    },
    async unsubscribe(request, reply) {
      await service.unsubscribe(request.params as UnsubscribeTokenParams);
      reply.code(501).send({ message: "Not implemented yet" });
    },
    async list(request, reply) {
      const subscriptions = await service.list(
        request.query as SubscriptionsQuery
      );
      reply.code(501).send(subscriptions);
    },
  };
}
