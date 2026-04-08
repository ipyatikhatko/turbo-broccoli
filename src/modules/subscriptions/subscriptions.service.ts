import type {
  SubscribeBody,
  SubscriptionsListResponse,
  SubscriptionsQuery,
  TokenParams,
  UnsubscribeTokenParams,
} from "./subscriptions.types.ts";

export interface SubscriptionsService {
  subscribe(input: SubscribeBody): Promise<void>;
  confirm(input: TokenParams): Promise<void>;
  unsubscribe(input: UnsubscribeTokenParams): Promise<void>;
  list(input: SubscriptionsQuery): Promise<SubscriptionsListResponse>;
}

export function createSubscriptionsService(): SubscriptionsService {
  return {
    async subscribe(_input) {},
    async confirm(_input) {},
    async unsubscribe(_input) {},
    async list(_input) {
      return [];
    },
  };
}
