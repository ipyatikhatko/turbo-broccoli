import type { FastifyInstance } from "fastify";
import { AsyncTask, CronJob } from "toad-scheduler";

import type { SubscriptionsScanner } from "../application/scanner.ts";

interface ScannerCronConfig {
  cronEnabled: boolean;
  cronExpression: string;
}

interface SchedulerLike {
  addCronJob: (job: CronJob) => void;
}

export function registerScannerCron(
  fastify: FastifyInstance,
  scanner: SubscriptionsScanner,
  config: ScannerCronConfig
): void {
  if (!config.cronEnabled) return;

  const task = new AsyncTask("subscriptions-scan", async () => {
    await scanner.runOnce();
  });
  const job = new CronJob({ cronExpression: config.cronExpression }, task);
  const scheduler = (fastify as FastifyInstance & { scheduler: SchedulerLike })
    .scheduler;
  scheduler.addCronJob(job);

  fastify.log.info(
    { cronExpression: config.cronExpression },
    "Scanner cron job registered"
  );
}
