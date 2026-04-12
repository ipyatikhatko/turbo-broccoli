import {
  Resend,
  type CreateEmailOptions,
  type CreateEmailResponse,
  type CreateBatchResponse,
} from "resend";
import {
  renderConfirmTemplate,
  renderReleaseTemplate,
} from "../../../mail/renderer.ts";

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

/** Human-facing links (confirm / unsubscribe) should hit the **web** host when split. */
function getEmailActionOrigin(): string {
  const web = process.env.WEB_URL?.trim();
  if (web) return web.replace(/\/+$/, "");
  return getBaseUrl();
}

export interface ReleaseRecipient {
  email: string;
  unsubscribeToken: string;
}

export interface ResendService {
  sendConfirmationEmail(
    email: string,
    token: string,
    repo: string,
    currentReleaseTag: string | null
  ): Promise<CreateEmailResponse>;
  sendReleasesBatchEmail(
    release: { repo: string; tag: string },
    recipients: ReleaseRecipient[]
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
        confirmUrl: `${getEmailActionOrigin()}/confirm/${encodeURIComponent(token)}`,
        repo,
        currentReleaseTag,
      });
      return resend.emails.send(createEmail(email, "Confirm your email", html));
    },

    async sendReleasesBatchEmail(release, recipients) {
      return resend.batch.send(
        await Promise.all(
          recipients.map(async (recipient) =>
            createEmail(
              recipient.email,
              "GitHub Releases",
              await renderReleaseTemplate({
                repo: release.repo,
                tag: release.tag,
                unsubscribeUrl: `${getEmailActionOrigin()}/unsubscribe/${encodeURIComponent(
                  recipient.unsubscribeToken
                )}`,
              })
            )
          )
        )
      );
    },
  };
}
