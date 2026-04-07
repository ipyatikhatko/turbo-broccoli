import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

const fastify = Fastify({
  logger: true,
});

await fastify.register(swagger, {
  mode: "static",
  specification: {
    baseDir: process.cwd(),
    path: "./src/docs/openapi.yaml",
  },
});
await fastify.register(swaggerUi, {
  routePrefix: "/docs",
});

fastify.get("/", async (request, reply) => {
  return { hello: "world" };
});

/**
 * Run the server!
 */
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
