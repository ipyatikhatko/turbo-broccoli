import type { FastifyPluginAsync } from "fastify";

import { createSubscriptionsController } from "./subscriptions.controller.js";
import { createSubscriptionsService } from "./subscriptions.service.js";
import type {
  SubscribeBody,
  SubscriptionsQuery,
  TokenParams,
  UnsubscribeTokenParams,
} from "./subscriptions.types.js";

export const subscriptionsRoutes: FastifyPluginAsync = async (fastify) => {
  const service = createSubscriptionsService();
  const controller = createSubscriptionsController(service);

  fastify.post<{ Body: SubscribeBody }>("/api/subscribe", controller.subscribe);
  fastify.get<{ Params: TokenParams }>("/api/confirm/:token", controller.confirm);
  fastify.get<{ Params: UnsubscribeTokenParams }>(
    "/api/unsubscribe/:token",
    controller.unsubscribe,
  );
  fastify.get<{ Querystring: SubscriptionsQuery }>(
    "/api/subscriptions",
    controller.list,
  );
};
