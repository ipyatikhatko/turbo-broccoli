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
      findByConfirmToken: vi.fn().mockResolvedValue(null),
      confirm: vi.fn().mockResolvedValue(undefined),
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

    expect(resend.sendConfirmationEmail).toHaveBeenCalledTimes(1);
    expect(resend.sendConfirmationEmail).toHaveBeenCalledWith(
      "a@example.com",
      expect.any(String),
      "golang/go",
      "v1.2.3"
    );
    expect(subscriptions.insertPending).toHaveBeenCalledTimes(1);
    expect(subscriptions.insertPending.mock.calls[0]?.[0]).toMatchObject({
      email: "a@example.com",
      repo: "golang/go",
    });
    expect(subscriptions.insertPending.mock.calls[0]?.[0]?.confirmToken).toHaveLength(
      48
    );
    expect(
      subscriptions.insertPending.mock.calls[0]?.[0]?.unsubscribeToken
    ).toHaveLength(48);
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

  it("subscribe throws ResendApiError and does not persist when email send fails", async () => {
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
    expect(subscriptions.insertPending).not.toHaveBeenCalled();
  });

  it("confirm marks pending subscription as confirmed", async () => {
    const subscriptions = createRepositoryMock();
    subscriptions.findByConfirmToken.mockResolvedValue({
      id: "sub-id",
      email: "a@example.com",
      repoId: "repo-id",
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

    await service.confirm({ token: "confirm-token" });
    expect(subscriptions.confirm).toHaveBeenCalledWith("confirm-token");
  });

  it("confirm throws SubscriptionNotFoundError for unknown token", async () => {
    const subscriptions = createRepositoryMock();
    subscriptions.findByConfirmToken.mockResolvedValue(null);

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
    subscriptions.findByConfirmToken.mockResolvedValue({
      id: "sub-id",
      email: "a@example.com",
      repoId: "repo-id",
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

    await expect(
      service.confirm({ token: "confirm-token" })
    ).rejects.toMatchObject({
      code: "SUBSCRIPTION_ALREADY_CONFIRMED",
    });
    expect(subscriptions.confirm).not.toHaveBeenCalled();
  });
});
