import type { definitions } from "@/types/openapi.d.ts";

import type { SubscriptionRow } from "./schema.ts";

/**
 * Map a DB row to the OpenAPI `Subscription` definition (response shape).
 */
export function subscriptionRowToApi(
  row: SubscriptionRow
): definitions["Subscription"] {
  const out: definitions["Subscription"] = {
    email: row.email,
    repo: row.repo,
    confirmed: row.confirmed,
  };
  if (row.lastSeenTag !== null && row.lastSeenTag !== undefined) {
    out.last_seen_tag = row.lastSeenTag;
  }
  return out;
}
