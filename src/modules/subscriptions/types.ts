import type { operations } from "@/types/openapi.d.ts";

export type SubscribeBody = operations["subscribe"]["parameters"]["formData"];

export type TokenParams =
  operations["confirmSubscription"]["parameters"]["path"];

export type UnsubscribeTokenParams =
  operations["unsubscribe"]["parameters"]["path"];

export type SubscriptionsQuery =
  operations["getSubscriptions"]["parameters"]["query"];

export type SubscriptionRelease =
  operations["getSubscriptions"]["responses"][200]["schema"][number];

export type SubscriptionsListResponse =
  operations["getSubscriptions"]["responses"][200]["schema"];
