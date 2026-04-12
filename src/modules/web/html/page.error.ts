import { baseLayout, CARD, escapeHtml } from "./base.ts";

const ERROR_COPY: Record<string, string> = {
  INVALID_TOKEN: "This link is invalid or has already been used.",
  SUBSCRIPTION_NOT_FOUND: "We could not find that subscription.",
  SUBSCRIPTION_ALREADY_CONFIRMED:
    "This subscription has already been confirmed.",
  SUBSCRIPTION_NOT_CONFIRMED: "This subscription has not been confirmed yet.",
  GITHUB_REPO_NOT_FOUND: "That repository could not be found on GitHub.",
  GITHUB_RATE_LIMITED:
    "GitHub rate limit reached. Please try again in a little while.",
  INVALID_REPO_FORMAT: "Invalid repository format — expected owner/repo.",
  INVALID_EMAIL: "That email address does not look valid.",
  SUBSCRIPTION_CONFLICT: "This email is already subscribed to that repository.",
  RESEND_API_ERROR: "Could not send email right now. Please try again later.",
};

export function errorPageHtml(code: string): string {
  const desc =
    ERROR_COPY[code] ??
    "Something went wrong. You can try again from the subscribe page.";
  return baseLayout(
    "Error",
    `<body class="min-h-screen bg-white antialiased flex items-center justify-center px-4">
  <div class="w-full max-w-sm text-center">
    <div class="${CARD}">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
        <svg class="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd"/></svg>
      </div>
      <h1 class="text-xl font-bold text-slate-900">Something went wrong</h1>
      <p class="mt-2 text-sm text-slate-500">${escapeHtml(desc)}</p>
      <p class="mt-3 inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs font-mono text-slate-400 ring-1 ring-slate-200">${escapeHtml(
        code
      )}</p>
      <div class="mt-7">
        <a href="/subscribe" class="inline-block rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition">
          Back to subscribe
        </a>
      </div>
    </div>
  </div>
</body>`
  );
}
