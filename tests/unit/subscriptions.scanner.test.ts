import { describe, expect, it, vi } from "vitest";

import { createSubscriptionsScanner } from "../../src/modules/subscriptions/application/scanner.ts";

describe("createSubscriptionsScanner", () => {
  function createDeps() {
    return {
      github: {
        getLatestReleaseTag: vi.fn(),
      },
      subscriptions: {
        findActiveForScan: vi.fn(),
        updateLastNotifiedTagForSubscriptionIds: vi.fn(),
      },
      resend: {
        sendReleasesBatchEmail: vi.fn(),
      },
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
    };
  }

  it("does nothing when there are no active subscriptions", async () => {
    const deps = createDeps();
    deps.subscriptions.findActiveForScan.mockResolvedValue([]);

    const scanner = createSubscriptionsScanner(deps);
    const result = await scanner.runOnce();

    expect(result).toEqual({
      reposChecked: 0,
      notificationsSent: 0,
      reposUpdated: 0,
    });
    expect(deps.github.getLatestReleaseTag).not.toHaveBeenCalled();
    expect(deps.resend.sendReleasesBatchEmail).not.toHaveBeenCalled();
  });

  it("sends notifications and updates tag when new release is detected", async () => {
    const deps = createDeps();
    deps.subscriptions.findActiveForScan.mockResolvedValue([
      {
        subscriptionId: "sub-1",
        email: "a@example.com",
        repo: "golang/go",
        unsubscribeToken: "unsub-1",
        lastNotifiedTag: "v1.0.0",
      },
      {
        subscriptionId: "sub-2",
        email: "b@example.com",
        repo: "golang/go",
        unsubscribeToken: "unsub-2",
        lastNotifiedTag: "v1.0.0",
      },
    ]);
    deps.github.getLatestReleaseTag.mockResolvedValue("v1.1.0");
    deps.resend.sendReleasesBatchEmail.mockResolvedValue({
      data: [{ id: "ok" }],
      error: null,
    });

    const scanner = createSubscriptionsScanner(deps);
    const result = await scanner.runOnce();

    expect(deps.github.getLatestReleaseTag).toHaveBeenCalledWith("golang", "go");
    expect(deps.resend.sendReleasesBatchEmail).toHaveBeenCalledTimes(1);
    expect(deps.resend.sendReleasesBatchEmail).toHaveBeenCalledWith(
      { repo: "golang/go", tag: "v1.1.0" },
      [
        { email: "a@example.com", unsubscribeToken: "unsub-1" },
        { email: "b@example.com", unsubscribeToken: "unsub-2" },
      ]
    );
    expect(
      deps.subscriptions.updateLastNotifiedTagForSubscriptionIds
    ).toHaveBeenCalledWith(["sub-1", "sub-2"], "v1.1.0");
    expect(result).toEqual({
      reposChecked: 1,
      notificationsSent: 2,
      reposUpdated: 1,
    });
  });

  it("skips notifications when latest tag did not change", async () => {
    const deps = createDeps();
    deps.subscriptions.findActiveForScan.mockResolvedValue([
      {
        subscriptionId: "sub-1",
        email: "a@example.com",
        repo: "golang/go",
        unsubscribeToken: "unsub-1",
        lastNotifiedTag: "v1.0.0",
      },
    ]);
    deps.github.getLatestReleaseTag.mockResolvedValue("v1.0.0");

    const scanner = createSubscriptionsScanner(deps);
    const result = await scanner.runOnce();

    expect(deps.resend.sendReleasesBatchEmail).not.toHaveBeenCalled();
    expect(
      deps.subscriptions.updateLastNotifiedTagForSubscriptionIds
    ).not.toHaveBeenCalled();
    expect(result).toEqual({
      reposChecked: 1,
      notificationsSent: 0,
      reposUpdated: 0,
    });
  });

  it("does not update tag if all email sends fail", async () => {
    const deps = createDeps();
    deps.subscriptions.findActiveForScan.mockResolvedValue([
      {
        subscriptionId: "sub-1",
        email: "a@example.com",
        repo: "golang/go",
        unsubscribeToken: "unsub-1",
        lastNotifiedTag: "v1.0.0",
      },
    ]);
    deps.github.getLatestReleaseTag.mockResolvedValue("v1.1.0");
    deps.resend.sendReleasesBatchEmail.mockResolvedValue({
      data: null,
      error: { message: "resend failed" },
    });

    const scanner = createSubscriptionsScanner(deps);
    const result = await scanner.runOnce();

    expect(
      deps.subscriptions.updateLastNotifiedTagForSubscriptionIds
    ).not.toHaveBeenCalled();
    expect(result).toEqual({
      reposChecked: 1,
      notificationsSent: 0,
      reposUpdated: 0,
    });
  });

  it("notifies when lastNotifiedTag is null and a release exists (first release after subscribe with no releases)", async () => {
    const deps = createDeps();
    deps.subscriptions.findActiveForScan.mockResolvedValue([
      {
        subscriptionId: "sub-1",
        email: "a@example.com",
        repo: "golang/go",
        unsubscribeToken: "unsub-1",
        lastNotifiedTag: null,
      },
    ]);
    deps.github.getLatestReleaseTag.mockResolvedValue("v1.0.0");
    deps.resend.sendReleasesBatchEmail.mockResolvedValue({
      data: [{ id: "ok" }],
      error: null,
    });

    const scanner = createSubscriptionsScanner(deps);
    const result = await scanner.runOnce();

    expect(deps.resend.sendReleasesBatchEmail).toHaveBeenCalledTimes(1);
    expect(
      deps.subscriptions.updateLastNotifiedTagForSubscriptionIds
    ).toHaveBeenCalledWith(["sub-1"], "v1.0.0");
    expect(result).toEqual({
      reposChecked: 1,
      notificationsSent: 1,
      reposUpdated: 1,
    });
  });

  it("only notifies subscribers whose baseline differs from latest", async () => {
    const deps = createDeps();
    deps.subscriptions.findActiveForScan.mockResolvedValue([
      {
        subscriptionId: "sub-a",
        email: "a@example.com",
        repo: "golang/go",
        unsubscribeToken: "unsub-a",
        lastNotifiedTag: null,
      },
      {
        subscriptionId: "sub-b",
        email: "b@example.com",
        repo: "golang/go",
        unsubscribeToken: "unsub-b",
        lastNotifiedTag: "v1.0.0",
      },
    ]);
    deps.github.getLatestReleaseTag.mockResolvedValue("v1.0.0");
    deps.resend.sendReleasesBatchEmail.mockResolvedValue({
      data: [{ id: "ok" }],
      error: null,
    });

    const scanner = createSubscriptionsScanner(deps);
    const result = await scanner.runOnce();

    expect(deps.resend.sendReleasesBatchEmail).toHaveBeenCalledWith(
      { repo: "golang/go", tag: "v1.0.0" },
      [{ email: "a@example.com", unsubscribeToken: "unsub-a" }]
    );
    expect(
      deps.subscriptions.updateLastNotifiedTagForSubscriptionIds
    ).toHaveBeenCalledWith(["sub-a"], "v1.0.0");
    expect(result.notificationsSent).toBe(1);
    expect(result.reposUpdated).toBe(1);
  });

  it("updates only successfully-notified IDs when a chunk partially fails", async () => {
    const deps = createDeps();
    deps.subscriptions.findActiveForScan.mockResolvedValue(
      Array.from({ length: 150 }, (_, i) => ({
        subscriptionId: `sub-${i}`,
        email: `u${i}@example.com`,
        repo: "golang/go",
        unsubscribeToken: `unsub-${i}`,
        lastNotifiedTag: "v1.0.0",
      }))
    );
    deps.github.getLatestReleaseTag.mockResolvedValue("v1.1.0");
    deps.resend.sendReleasesBatchEmail
      .mockResolvedValueOnce({ data: [{ id: "ok" }], error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "chunk 2 failed" } });

    const scanner = createSubscriptionsScanner(deps);
    const result = await scanner.runOnce();

    // Only chunk 1 (IDs 0-99) should be updated
    expect(
      deps.subscriptions.updateLastNotifiedTagForSubscriptionIds
    ).toHaveBeenCalledWith(
      Array.from({ length: 100 }, (_, i) => `sub-${i}`),
      "v1.1.0"
    );
    expect(result.notificationsSent).toBe(100);
    expect(result.reposUpdated).toBe(1);
  });

  it("logs error and continues to next repo when GitHub throws", async () => {
    const deps = createDeps();
    deps.subscriptions.findActiveForScan.mockResolvedValue([
      {
        subscriptionId: "sub-1",
        email: "a@example.com",
        repo: "golang/go",
        unsubscribeToken: "unsub-1",
        lastNotifiedTag: "v1.0.0",
      },
      {
        subscriptionId: "sub-2",
        email: "b@example.com",
        repo: "facebook/react",
        unsubscribeToken: "unsub-2",
        lastNotifiedTag: "v18.0.0",
      },
    ]);
    deps.github.getLatestReleaseTag
      .mockRejectedValueOnce(new Error("rate limited"))
      .mockResolvedValueOnce("v18.1.0");
    deps.resend.sendReleasesBatchEmail.mockResolvedValue({
      data: [{ id: "ok" }],
      error: null,
    });

    const scanner = createSubscriptionsScanner(deps);
    const result = await scanner.runOnce();

    expect(deps.logger.error).toHaveBeenCalledTimes(1);
    expect(deps.resend.sendReleasesBatchEmail).toHaveBeenCalledTimes(1);
    expect(deps.resend.sendReleasesBatchEmail).toHaveBeenCalledWith(
      { repo: "facebook/react", tag: "v18.1.0" },
      [{ email: "b@example.com", unsubscribeToken: "unsub-2" }]
    );
    expect(result).toEqual({
      reposChecked: 2,
      notificationsSent: 1,
      reposUpdated: 1,
    });
  });

  it("sends emails in chunks of 100 recipients", async () => {
    const deps = createDeps();
    deps.subscriptions.findActiveForScan.mockResolvedValue(
      Array.from({ length: 201 }, (_, i) => ({
        subscriptionId: `sub-${i}`,
        email: `u${i}@example.com`,
        repo: "golang/go",
        unsubscribeToken: `unsub-${i}`,
        lastNotifiedTag: "v1.0.0",
      }))
    );
    deps.github.getLatestReleaseTag.mockResolvedValue("v1.1.0");
    deps.resend.sendReleasesBatchEmail.mockResolvedValue({
      data: [{ id: "ok" }],
      error: null,
    });

    const scanner = createSubscriptionsScanner(deps);
    const result = await scanner.runOnce();

    expect(deps.resend.sendReleasesBatchEmail).toHaveBeenCalledTimes(3);
    expect(
      deps.resend.sendReleasesBatchEmail.mock.calls[0]?.[1]
    ).toHaveLength(100);
    expect(
      deps.resend.sendReleasesBatchEmail.mock.calls[1]?.[1]
    ).toHaveLength(100);
    expect(
      deps.resend.sendReleasesBatchEmail.mock.calls[2]?.[1]
    ).toHaveLength(1);
    expect(result.notificationsSent).toBe(201);
    expect(result.reposUpdated).toBe(1);
    expect(
      deps.subscriptions.updateLastNotifiedTagForSubscriptionIds
    ).toHaveBeenCalledWith(
      Array.from({ length: 201 }, (_, i) => `sub-${i}`),
      "v1.1.0"
    );
  });
});
