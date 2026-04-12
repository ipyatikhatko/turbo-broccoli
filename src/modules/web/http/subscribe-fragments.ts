import { isSubscriptionDomainError } from "@/modules/subscriptions/domain/index.ts";

const CARD =
  "rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm text-slate-800";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function subscribeSuccessFragment(): string {
  return `<div class="${CARD}" role="status"><p class="font-medium text-slate-900">Almost there</p><p class="mt-2 text-sm text-slate-600">We sent a confirmation link to your email. Open it to finish subscribing.</p></div>`;
}

function domainErrorMessage(code: string, message: string): string {
  switch (code) {
    case "INVALID_REPO_FORMAT":
      return "Use the owner/repo format (for example golang/go).";
    case "INVALID_EMAIL":
      return "That email address does not look valid.";
    case "GITHUB_REPO_NOT_FOUND":
      return "We could not find that repository on GitHub.";
    case "SUBSCRIPTION_CONFLICT":
      return "This email is already subscribed to that repository.";
    case "GITHUB_RATE_LIMITED":
      return "GitHub rate limit reached. Try again in a little while.";
    case "RESEND_API_ERROR":
      return "We could not send the confirmation email. Try again later.";
    default:
      return message;
  }
}

export function subscribeErrorFragment(err: unknown): string | null {
  if (!isSubscriptionDomainError(err)) return null;
  const { code, message } = err.toResponse();
  const body = domainErrorMessage(code, message);
  return `<div class="${CARD} border-red-200 bg-red-50" role="alert"><p class="font-medium text-red-900">Could not subscribe</p><p class="mt-2 text-sm text-red-800">${escapeHtml(body)}</p></div>`;
}

export function subscribeUnexpectedErrorFragment(): string {
  return `<div class="${CARD} border-red-200 bg-red-50" role="alert"><p class="font-medium text-red-900">Something went wrong</p><p class="mt-2 text-sm text-red-800">Please try again later.</p></div>`;
}
