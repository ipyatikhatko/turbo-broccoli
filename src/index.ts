import "dotenv/config";
import Fastify from "fastify";
import formbody from "@fastify/formbody";
// import swagger from "@fastify/swagger";
// import swaggerUi from "@fastify/swagger-ui";
// import type { OpenAPIV2 } from "openapi-types";

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

// function applySwaggerHostFromEnv(spec: OpenAPIV2.Document): OpenAPIV2.Document {
//   const host = process.env.SWAGGER_HOST?.trim();
//   if (host) spec.host = host;
//   const scheme = process.env.SWAGGER_SCHEME?.trim().toLowerCase();
//   if (scheme === "http" || scheme === "https") spec.schemes = [scheme];
//   return spec;
// }

// await fastify.register(swagger, {
//   mode: "static",
//   specification: {
//     baseDir: process.cwd(),
//     path: "./src/docs/openapi.yaml",
//     postProcessor: (spec) => applySwaggerHostFromEnv(spec as OpenAPIV2.Document),
//   },
// });
// await fastify.register(swaggerUi, {
//   routePrefix: "/docs",
// });
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
