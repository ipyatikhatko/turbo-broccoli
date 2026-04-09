import {
  Resend,
  type CreateEmailOptions,
  type CreateEmailResponse,
  type CreateBatchResponse,
} from "resend";
import type { SubscriptionRelease } from "@/modules/subscriptions/types.ts";

const RESEND_FROM = process.env.RESEND_FROM;

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

export interface ResendService {
  sendConfirmationEmail(
    email: string,
    token: string
  ): Promise<CreateEmailResponse>;
  sendUnsubscribeEmail(
    email: string,
    token: string
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
    async sendConfirmationEmail(email, token) {
      return resend.emails.send(
        createEmail(
          email,
          "Confirm your email",
          `<p>Click <a href="${process.env.BASE_URL}/api/confirm/${token}">here</a> to confirm your email.</p>`
        )
      );
    },
    /**
     * Sends a unsubscription email to a given email address with a unsubscription token.
     * @param email - The email address to send the unsubscription email to.
     * @param token - The unsubscribe token.
     * @returns The email unsubscribe response.
     */
    async sendUnsubscribeEmail(email, token) {
      return resend.emails.send(
        createEmail(
          email,
          "Unsubscribe from GitHub Releases",
          `<p>Click <a href="${process.env.BASE_URL}/api/unsubscribe/${token}">here</a> to unsubscribe from GitHub Releases.</p>`
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
        emails.map((email) =>
          createEmail(
            email,
            "GitHub Releases",
            `<p>Here is the latest release for <strong>${
              release.repo
            }</strong>:</p><p>${
              release.last_seen_tag ?? "new release detected"
            }</p>`
          )
        )
      );
    },
  };
}
