import "fastify";

import type { Db } from "../db/client.ts";

declare module "fastify" {
  interface FastifyInstance {
    db: Db;
  }
}
