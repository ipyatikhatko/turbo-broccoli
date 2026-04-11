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
        updateRepoLastSeenTag: vi.fn(),
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
        email: "a@example.com",
        repo: "golang/go",
        unsubscribeToken: "unsub-1",
        lastSeenTag: "v1.0.0",
      },
      {
        email: "b@example.com",
        repo: "golang/go",
        unsubscribeToken: "unsub-2",
        lastSeenTag: "v1.0.0",
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
      {
        email: "a@example.com",
        repo: "golang/go",
        confirmed: true,
        last_seen_tag: "v1.1.0",
      },
      [
        { email: "a@example.com", unsubscribeToken: "unsub-1" },
        { email: "b@example.com", unsubscribeToken: "unsub-2" },
      ]
    );
    expect(deps.subscriptions.updateRepoLastSeenTag).toHaveBeenCalledWith(
      "golang/go",
      "v1.1.0"
    );
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
        email: "a@example.com",
        repo: "golang/go",
        unsubscribeToken: "unsub-1",
        lastSeenTag: "v1.0.0",
      },
    ]);
    deps.github.getLatestReleaseTag.mockResolvedValue("v1.0.0");

    const scanner = createSubscriptionsScanner(deps);
    const result = await scanner.runOnce();

    expect(deps.resend.sendReleasesBatchEmail).not.toHaveBeenCalled();
    expect(deps.subscriptions.updateRepoLastSeenTag).not.toHaveBeenCalled();
    expect(result).toEqual({
      reposChecked: 1,
      notificationsSent: 0,
      reposUpdated: 0,
    });
  });

  it("does not update tag if any email send fails", async () => {
    const deps = createDeps();
    deps.subscriptions.findActiveForScan.mockResolvedValue([
      {
        email: "a@example.com",
        repo: "golang/go",
        unsubscribeToken: "unsub-1",
        lastSeenTag: "v1.0.0",
      },
    ]);
    deps.github.getLatestReleaseTag.mockResolvedValue("v1.1.0");
    deps.resend.sendReleasesBatchEmail.mockResolvedValue({
      data: null,
      error: { message: "resend failed" },
    });

    const scanner = createSubscriptionsScanner(deps);
    const result = await scanner.runOnce();

    expect(deps.subscriptions.updateRepoLastSeenTag).not.toHaveBeenCalled();
    expect(result).toEqual({
      reposChecked: 1,
      notificationsSent: 0,
      reposUpdated: 0,
    });
  });

  it("initializes baseline tag on first scan and does not send notifications", async () => {
    const deps = createDeps();
    deps.subscriptions.findActiveForScan.mockResolvedValue([
      {
        email: "a@example.com",
        repo: "golang/go",
        unsubscribeToken: "unsub-1",
        lastSeenTag: null,
      },
    ]);
    deps.github.getLatestReleaseTag.mockResolvedValue("v1.1.0");

    const scanner = createSubscriptionsScanner(deps);
    const result = await scanner.runOnce();

    expect(deps.resend.sendReleasesBatchEmail).not.toHaveBeenCalled();
    expect(deps.subscriptions.updateRepoLastSeenTag).toHaveBeenCalledWith(
      "golang/go",
      "v1.1.0"
    );
    expect(result).toEqual({
      reposChecked: 1,
      notificationsSent: 0,
      reposUpdated: 1,
    });
  });

  it("sends emails in chunks of 100 recipients", async () => {
    const deps = createDeps();
    deps.subscriptions.findActiveForScan.mockResolvedValue(
      Array.from({ length: 201 }, (_, i) => ({
        email: `u${i}@example.com`,
        repo: "golang/go",
        unsubscribeToken: `unsub-${i}`,
        lastSeenTag: "v1.0.0",
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
  });
});
