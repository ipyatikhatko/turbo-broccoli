import type { FastifyPluginAsync } from "fastify";

import {
  errorPageHtml,
  notFoundPageHtml,
  subscribePageHtml,
  subscriptionConfirmedPageHtml,
  unsubscribedPageHtml,
} from "../html/public-pages.ts";

export const publicWebRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/", async (_request, reply) => {
    reply.redirect("/subscribe");
  });

  fastify.get("/subscribe", async (_request, reply) => {
    reply.type("text/html; charset=utf-8").send(subscribePageHtml());
  });

  fastify.get("/subscription-confirmed", async (_request, reply) => {
    reply.type("text/html; charset=utf-8").send(subscriptionConfirmedPageHtml());
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
    reply
      .code(404)
      .type("text/html; charset=utf-8")
      .send(notFoundPageHtml());
  });
};
