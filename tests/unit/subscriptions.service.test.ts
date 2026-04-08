import { describe, expect, it } from "vitest";

import { createSubscriptionsService } from "../../src/modules/subscriptions/subscriptions.service.ts";

describe("createSubscriptionsService", () => {
  it("creates a service instance", () => {
    const service = createSubscriptionsService();

    expect(service).toBeDefined();
  });
});
