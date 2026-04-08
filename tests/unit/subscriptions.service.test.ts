import { describe, expect, it, vi } from "vitest";

import { createSubscriptionsService } from "../../src/modules/subscriptions/service.ts";

describe("createSubscriptionsService", () => {
  it("subscribe inserts when github ok and no duplicate", async () => {
    const insertPending = vi.fn().mockResolvedValue(undefined);
    const service = createSubscriptionsService({
      github: {
        repoExists: vi.fn().mockResolvedValue(true),
      },
      subscriptions: {
        findByEmailAndRepo: vi.fn().mockResolvedValue(null),
        findActiveByEmail: vi.fn().mockResolvedValue([]),
        insertPending,
      },
    });

    await service.subscribe({
      email: "a@example.com",
      repo: "golang/go",
    });

    expect(insertPending).toHaveBeenCalledTimes(1);
    expect(insertPending.mock.calls[0]?.[0]).toMatchObject({
      email: "a@example.com",
      repo: "golang/go",
    });
  });

  it("subscribe throws InvalidRepoFormatError for bad slug", async () => {
    const service = createSubscriptionsService({
      github: { repoExists: vi.fn() },
      subscriptions: {
        findByEmailAndRepo: vi.fn(),
        findActiveByEmail: vi.fn(),
        insertPending: vi.fn(),
      },
    });

    await expect(
      service.subscribe({ email: "a@example.com", repo: "nope" }),
    ).rejects.toMatchObject({ code: "INVALID_REPO_FORMAT" });
  });
});
