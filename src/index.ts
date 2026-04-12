import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Fastify from "fastify";
import cors from "@fastify/cors";
import formbody from "@fastify/formbody";
import fastifyStatic from "@fastify/static";
import { fastifySchedule } from "@fastify/schedule";

import { connectAndMigrate } from "@/db/index.ts";
import { subscriptionsRoutes } from "@/modules/subscriptions/index.ts";
import { publicWebRoutes } from "@/modules/web/index.ts";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const baseUrl = process.env.BASE_URL?.trim();
if (!baseUrl) {
  throw new Error("BASE_URL is required");
}

const { db, pool } = await connectAndMigrate(databaseUrl);

const fastify = Fastify({
  logger: true,
});

fastify.decorate("db", db);
fastify.addHook("onClose", async () => {
  await pool.end();
});

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function splitHostCorsOrigins(): string[] | null {
  const web = process.env.WEB_URL?.trim();
  const base = process.env.BASE_URL?.trim();
  if (!web || !base) return null;
  try {
    const a = new URL(web).origin;
    const b = new URL(base).origin;
    if (a === b) return null;
    return [a, b];
  } catch {
    return null;
  }
}

await fastify.register(formbody);
const corsOrigins = splitHostCorsOrigins();
if (corsOrigins) {
  await fastify.register(cors, {
    origin: corsOrigins,
    methods: ["GET", "POST", "HEAD", "OPTIONS"],
    allowedHeaders: [
      "content-type",
      "hx-request",
      "hx-target",
      "hx-current-url",
      "hx-trigger",
    ],
  });
}
await fastify.register(fastifySchedule);
await fastify.register(fastifyStatic, {
  root: path.join(projectRoot, "dist/public"),
  prefix: "/assets/",
});
await fastify.register(publicWebRoutes);
await fastify.register(subscriptionsRoutes);

const start = async () => {
  try {
    await fastify.listen({
      host: "0.0.0.0",
      port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
