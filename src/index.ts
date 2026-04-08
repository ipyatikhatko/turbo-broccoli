import "dotenv/config";
import Fastify from "fastify";
import formbody from "@fastify/formbody";

import { connectAndMigrate } from "@/db/index.ts";
import { subscriptionsRoutes } from "@/modules/subscriptions/index.ts";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const { db, pool } = await connectAndMigrate(databaseUrl);

const fastify = Fastify({
  logger: true,
});

fastify.decorate("db", db);
fastify.addHook("onClose", async () => {
  await pool.end();
});

await fastify.register(formbody);
await fastify.register(subscriptionsRoutes);

const start = async () => {
  try {
    await fastify.listen({
      port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
