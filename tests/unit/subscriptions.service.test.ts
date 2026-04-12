import { describe, expect, it, vi } from "vitest";

import { createSubscriptionsService } from "../../src/modules/subscriptions/application/service.ts";

describe("createSubscriptionsService", () => {
  function createResendMock() {
    return {
      sendConfirmationEmail: vi
        .fn()
        .mockResolvedValue({ data: { id: "msg_1" }, error: null }),
      sendUnsubscribeEmail: vi
        .fn()
        .mockResolvedValue({ data: { id: "msg_2" }, error: null }),
      sendReleasesBatchEmail: vi
        .fn()
        .mockResolvedValue({ data: [], error: null }),
    };
  }

  function createRepositoryMock() {
    return {
      findByEmailAndRepo: vi.fn().mockResolvedValue(null),
      findActiveByEmail: vi.fn().mockResolvedValue([]),
      insertPending: vi.fn().mockResolvedValue(undefined),
      findPendingWithRepoByConfirmToken: vi.fn().mockResolvedValue(null),
      findByUnsubscribeToken: vi.fn().mockResolvedValue(null),
      findActiveForScan: vi.fn().mockResolvedValue([]),
      confirmAndSetLastNotifiedTag: vi.fn().mockResolvedValue(undefined),
      deletePendingByConfirmToken: vi.fn().mockResolvedValue(undefined),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
      updateLastNotifiedTagForSubscriptionIds: vi.fn().mockResolvedValue(undefined),
    };
  }

  it("subscribe inserts when github ok and no duplicate", async () => {
    const subscriptions = createRepositoryMock();
    const resend = createResendMock();
    const service = createSubscriptionsService({
      github: {
        repoExists: vi.fn().mockResolvedValue(true),
        getLatestReleaseTag: vi.fn().mockResolvedValue("v1.2.3"),
      },
      subscriptions,
      resend,
    });

    await service.subscribe({
      email: "a@example.com",
      repo: "golang/go",
    });

    expect(subscriptions.insertPending).toHaveBeenCalledTimes(1);
    expect(subscriptions.insertPending.mock.calls[0]?.[0]).toMatchObject({
      email: "a@example.com",
      repo: "golang/go",
    });
    expect(subscriptions.insertPending.mock.calls[0]?.[0]?.confirmToken).toHaveLength(48);
    expect(subscriptions.insertPending.mock.calls[0]?.[0]?.unsubscribeToken).toHaveLength(48);
    expect(resend.sendConfirmationEmail).toHaveBeenCalledTimes(1);
    expect(resend.sendConfirmationEmail).toHaveBeenCalledWith(
      "a@example.com",
      subscriptions.insertPending.mock.calls[0]?.[0]?.confirmToken,
      "golang/go",
      "v1.2.3"
    );
    expect(subscriptions.deletePendingByConfirmToken).not.toHaveBeenCalled();
  });

  it("subscribe throws InvalidRepoFormatError for bad slug", async () => {
    const service = createSubscriptionsService({
      github: { repoExists: vi.fn(), getLatestReleaseTag: vi.fn() },
      subscriptions: createRepositoryMock(),
      resend: createResendMock(),
    });

    await expect(
      service.subscribe({ email: "a@example.com", repo: "nope" })
    ).rejects.toMatchObject({ code: "INVALID_REPO_FORMAT" });
  });

  it("subscribe throws GithubRepoNotFoundError for non-existent repo", async () => {
    const service = createSubscriptionsService({
      github: {
        repoExists: vi.fn().mockResolvedValue(false),
        getLatestReleaseTag: vi.fn(),
      },
      subscriptions: createRepositoryMock(),
      resend: createResendMock(),
    });

    await expect(
      service.subscribe({ email: "a@example.com", repo: "golang/go" })
    ).rejects.toMatchObject({ code: "GITHUB_REPO_NOT_FOUND" });
  });

  it("subscribe throws SubscriptionConflictError for duplicate subscription", async () => {
    const subscriptions = createRepositoryMock();
    subscriptions.findByEmailAndRepo.mockResolvedValue({
      id: "existing-id",
      email: "a@example.com",
      repoId: "repo-id",
      lastNotifiedTag: null,
      confirmed: false,
      confirmToken: "confirm-token",
      unsubscribeToken: "unsubscribe-token",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const service = createSubscriptionsService({
      github: {
        repoExists: vi.fn().mockResolvedValue(true),
        getLatestReleaseTag: vi.fn(),
      },
      subscriptions,
      resend: createResendMock(),
    });

    await expect(
      service.subscribe({ email: "a@example.com", repo: "golang/go" })
    ).rejects.toMatchObject({ code: "SUBSCRIPTION_CONFLICT" });
  });

  it("subscribe throws ResendApiError and rolls back pending row when email send fails", async () => {
    const subscriptions = createRepositoryMock();
    const resend = createResendMock();
    resend.sendConfirmationEmail.mockResolvedValue({
      data: null,
      error: { message: "missing from" },
    });

    const service = createSubscriptionsService({
      github: {
        repoExists: vi.fn().mockResolvedValue(true),
        getLatestReleaseTag: vi.fn().mockResolvedValue("v1.2.3"),
      },
      subscriptions,
      resend,
    });

    await expect(
      service.subscribe({ email: "a@example.com", repo: "golang/go" })
    ).rejects.toMatchObject({ code: "RESEND_API_ERROR" });
    expect(subscriptions.insertPending).toHaveBeenCalledTimes(1);
    expect(subscriptions.deletePendingByConfirmToken).toHaveBeenCalledTimes(1);
    expect(subscriptions.deletePendingByConfirmToken).toHaveBeenCalledWith(
      subscriptions.insertPending.mock.calls[0]?.[0]?.confirmToken
    );
  });

  it("subscribe passes fallback release context when repo has no releases", async () => {
    const subscriptions = createRepositoryMock();
    const resend = createResendMock();

    const service = createSubscriptionsService({
      github: {
        repoExists: vi.fn().mockResolvedValue(true),
        getLatestReleaseTag: vi.fn().mockResolvedValue(null),
      },
      subscriptions,
      resend,
    });

    await service.subscribe({
      email: "a@example.com",
      repo: "golang/go",
    });

    expect(resend.sendConfirmationEmail).toHaveBeenCalledWith(
      "a@example.com",
      expect.any(String),
      "golang/go",
      null
    );
  });

  it("confirm marks pending subscription as confirmed and stores release baseline", async () => {
    const subscriptions = createRepositoryMock();
    subscriptions.findPendingWithRepoByConfirmToken.mockResolvedValue({
      subscription: {
        id: "sub-id",
        email: "a@example.com",
        repoId: "repo-id",
        lastNotifiedTag: null,
        confirmed: false,
        confirmToken: "confirm-token",
        unsubscribeToken: "unsubscribe-token",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      repoFullName: "golang/go",
    });

    const service = createSubscriptionsService({
      github: {
        repoExists: vi.fn().mockResolvedValue(true),
        getLatestReleaseTag: vi.fn().mockResolvedValue("v1.0.0"),
      },
      subscriptions,
      resend: createResendMock(),
    });

    await service.confirm({ token: "confirm-token" });
    expect(subscriptions.confirmAndSetLastNotifiedTag).toHaveBeenCalledWith(
      "confirm-token",
      "v1.0.0"
    );
  });

  it("confirm stores null baseline when repo has no releases yet", async () => {
    const subscriptions = createRepositoryMock();
    subscriptions.findPendingWithRepoByConfirmToken.mockResolvedValue({
      subscription: {
        id: "sub-id",
        email: "a@example.com",
        repoId: "repo-id",
        lastNotifiedTag: null,
        confirmed: false,
        confirmToken: "confirm-token",
        unsubscribeToken: "unsubscribe-token",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      repoFullName: "golang/go",
    });

    const service = createSubscriptionsService({
      github: {
        repoExists: vi.fn().mockResolvedValue(true),
        getLatestReleaseTag: vi.fn().mockResolvedValue(null),
      },
      subscriptions,
      resend: createResendMock(),
    });

    await service.confirm({ token: "confirm-token" });
    expect(subscriptions.confirmAndSetLastNotifiedTag).toHaveBeenCalledWith(
      "confirm-token",
      null
    );
  });

  it("confirm throws SubscriptionNotFoundError for unknown token", async () => {
    const subscriptions = createRepositoryMock();
    subscriptions.findPendingWithRepoByConfirmToken.mockResolvedValue(null);

    const service = createSubscriptionsService({
      github: {
        repoExists: vi.fn().mockResolvedValue(true),
        getLatestReleaseTag: vi.fn(),
      },
      subscriptions,
      resend: createResendMock(),
    });

    await expect(service.confirm({ token: "missing" })).rejects.toMatchObject({
      code: "SUBSCRIPTION_NOT_FOUND",
    });
  });

  it("confirm throws SubscriptionAlreadyConfirmedError for confirmed subscription", async () => {
    const subscriptions = createRepositoryMock();
    subscriptions.findPendingWithRepoByConfirmToken.mockResolvedValue({
      subscription: {
        id: "sub-id",
        email: "a@example.com",
        repoId: "repo-id",
        lastNotifiedTag: "v1.0.0",
        confirmed: true,
        confirmToken: "confirm-token",
        unsubscribeToken: "unsubscribe-token",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      repoFullName: "golang/go",
    });

    const service = createSubscriptionsService({
      github: {
        repoExists: vi.fn().mockResolvedValue(true),
        getLatestReleaseTag: vi.fn(),
      },
      subscriptions,
      resend: createResendMock(),
    });

    await expect(
      service.confirm({ token: "confirm-token" })
    ).rejects.toMatchObject({
      code: "SUBSCRIPTION_ALREADY_CONFIRMED",
    });
    expect(subscriptions.confirmAndSetLastNotifiedTag).not.toHaveBeenCalled();
  });

  it("unsubscribe removes confirmed subscription by unsubscribe token", async () => {
    const subscriptions = createRepositoryMock();
    subscriptions.findByUnsubscribeToken.mockResolvedValue({
      id: "sub-id",
      email: "a@example.com",
      repoId: "repo-id",
      lastNotifiedTag: null,
      confirmed: true,
      confirmToken: "confirm-token",
      unsubscribeToken: "unsubscribe-token",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const service = createSubscriptionsService({
      github: {
        repoExists: vi.fn().mockResolvedValue(true),
        getLatestReleaseTag: vi.fn(),
      },
      subscriptions,
      resend: createResendMock(),
    });

    await service.unsubscribe({ token: "unsubscribe-token" });
    expect(subscriptions.unsubscribe).toHaveBeenCalledWith("unsubscribe-token");
  });

  it("unsubscribe throws SubscriptionNotFoundError for unknown token", async () => {
    const subscriptions = createRepositoryMock();
    subscriptions.findByUnsubscribeToken.mockResolvedValue(null);

    const service = createSubscriptionsService({
      github: {
        repoExists: vi.fn().mockResolvedValue(true),
        getLatestReleaseTag: vi.fn(),
      },
      subscriptions,
      resend: createResendMock(),
    });

    await expect(service.unsubscribe({ token: "missing" })).rejects.toMatchObject(
      {
        code: "SUBSCRIPTION_NOT_FOUND",
      }
    );
    expect(subscriptions.unsubscribe).not.toHaveBeenCalled();
  });

  it("unsubscribe throws SubscriptionNotConfirmedError for pending subscription", async () => {
    const subscriptions = createRepositoryMock();
    subscriptions.findByUnsubscribeToken.mockResolvedValue({
      id: "sub-id",
      email: "a@example.com",
      repoId: "repo-id",
      lastNotifiedTag: null,
      confirmed: false,
      confirmToken: "confirm-token",
      unsubscribeToken: "unsubscribe-token",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const service = createSubscriptionsService({
      github: {
        repoExists: vi.fn().mockResolvedValue(true),
        getLatestReleaseTag: vi.fn(),
      },
      subscriptions,
      resend: createResendMock(),
    });

    await expect(
      service.unsubscribe({ token: "unsubscribe-token" })
    ).rejects.toMatchObject({
      code: "SUBSCRIPTION_NOT_CONFIRMED",
    });
    expect(subscriptions.unsubscribe).not.toHaveBeenCalled();
  });

  it("list throws InvalidEmailError for invalid email", async () => {
    const subscriptions = createRepositoryMock();
    const service = createSubscriptionsService({
      github: {
        repoExists: vi.fn().mockResolvedValue(true),
        getLatestReleaseTag: vi.fn(),
      },
      subscriptions,
      resend: createResendMock(),
    });

    await expect(service.list({ email: "not-an-email" })).rejects.toMatchObject({
      code: "INVALID_EMAIL",
    });
    expect(subscriptions.findActiveByEmail).not.toHaveBeenCalled();
  });

  it("list returns mapped subscriptions for valid email", async () => {
    const subscriptions = createRepositoryMock();
    subscriptions.findActiveByEmail.mockResolvedValue([
      {
        email: "a@example.com",
        repo: "golang/go",
        confirmed: true,
        lastSeenTag: "v1.2.3",
      },
    ]);

    const service = createSubscriptionsService({
      github: {
        repoExists: vi.fn().mockResolvedValue(true),
        getLatestReleaseTag: vi.fn(),
      },
      subscriptions,
      resend: createResendMock(),
    });

    const result = await service.list({ email: "a@example.com" });
    expect(subscriptions.findActiveByEmail).toHaveBeenCalledWith("a@example.com");
    expect(result).toEqual([
      {
        email: "a@example.com",
        repo: "golang/go",
        confirmed: true,
        last_seen_tag: "v1.2.3",
      },
    ]);
  });
});
