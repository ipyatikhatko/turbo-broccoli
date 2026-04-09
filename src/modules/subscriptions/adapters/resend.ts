import {
  Resend,
  type CreateEmailOptions,
  type CreateEmailResponse,
  type CreateBatchResponse,
} from "resend";
import {
  renderConfirmTemplate,
  renderReleaseTemplate,
  renderUnsubscribeTemplate,
} from "../../../mail/renderer.ts";
import type { SubscriptionRelease } from "../types.ts";

const RESEND_FROM = process.env.RESEND_FROM;
const BASE_URL = process.env.BASE_URL;

export function createResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export function createEmail(
  email: string,
  subject: string,
  html: string
): CreateEmailOptions {
  if (!RESEND_FROM) {
    throw new Error("RESEND_FROM is not set");
  }

  return {
    from: RESEND_FROM,
    to: email,
    subject,
    html,
  };
}

function getBaseUrl(): string {
  if (!BASE_URL) throw new Error("BASE_URL is not set");
  return BASE_URL.replace(/\/+$/, "");
}

export interface ResendService {
  sendConfirmationEmail(
    email: string,
    token: string,
    repo: string,
    currentReleaseTag: string
  ): Promise<CreateEmailResponse>;
  sendUnsubscribeEmail(
    email: string,
    token: string,
    repo: string
  ): Promise<CreateEmailResponse>;
  sendReleasesBatchEmail(
    emails: string[],
    release: SubscriptionRelease
  ): Promise<CreateBatchResponse<CreateEmailResponse>>;
}

export function createResendService(resend: Resend): ResendService {
  return {
    /**
     * Sends a confirmation email to a given email address with a confirmation token.
     * @param email - The email address to send the confirmation email to.
     * @param token - The confirmation token.
     * @returns The email send response.
     */
    async sendConfirmationEmail(email, token, repo, currentReleaseTag) {
      const html = await renderConfirmTemplate({
        confirmUrl: `${getBaseUrl()}/api/confirm/${encodeURIComponent(token)}`,
        repo,
        tag: currentReleaseTag,
      });
      return resend.emails.send(
        createEmail(
          email,
          "Confirm your email",
          html
        )
      );
    },
    /**
     * Sends a unsubscription email to a given email address with a unsubscription token.
     * @param email - The email address to send the unsubscription email to.
     * @param token - The unsubscribe token.
     * @returns The email unsubscribe response.
     */
    async sendUnsubscribeEmail(email, token, repo) {
      const html = await renderUnsubscribeTemplate({
        unsubscribeUrl: `${getBaseUrl()}/api/unsubscribe/${encodeURIComponent(
          token
        )}`,
        repo,
      });
      return resend.emails.send(
        createEmail(
          email,
          "Unsubscribe from GitHub Releases",
          html
        )
      );
    },
    /**
     * Sends a batch email to a list of emails with the latest release for a given repository.
     * @param emails - The list of emails to send the email to.
     * @param release - The latest release for the repository.
     * @returns The batch send response.
     */
    async sendReleasesBatchEmail(
      emails: string[],
      release: SubscriptionRelease
    ) {
      return resend.batch.send(
        await Promise.all(
          emails.map(async (email) =>
          createEmail(
            email,
            "GitHub Releases",
            await renderReleaseTemplate({
              repo: release.repo,
              tag: release.last_seen_tag ?? "new release detected",
            })
          )
        ))
      );
    },
  };
}
