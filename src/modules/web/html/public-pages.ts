function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const HEAD_COMMON = `
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="/assets/web.css" />`;

/**
 * HTMX 2 config must be set BEFORE the script loads so it is read during
 * initialization. Key changes from defaults:
 *   - selfRequestsOnly: false — the subscribe form posts to a relative path
 *     (/api/subscribe) which is always same-origin in a monolith, but when
 *     WEB_URL / BASE_URL diverge the host differs; keeping this false lets
 *     both cases work without having to inject absolute URLs into the form.
 *   - responseHandling — swap 4xx/5xx bodies so error fragments are shown.
 */
const HTMX_BLOCK = `<script>
  window.htmx = { config: {
    selfRequestsOnly: false,
    responseHandling: [
      { code: "204", swap: false },
      { code: "[23]..", swap: true },
      { code: "[45]..", swap: true, error: true },
      { code: "...",   swap: false, error: true }
    ]
  }};
</script>
<script src="https://cdn.jsdelivr.net/npm/htmx.org@2.0.4/dist/htmx.min.js" crossorigin="anonymous"></script>`;

function baseLayout(title: string, body: string, includeHtmx = false): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  ${HEAD_COMMON}
  ${includeHtmx ? HTMX_BLOCK : ""}
  <title>${escapeHtml(title)}</title>
</head>
${body}
</html>`;
}

const GITHUB_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.185 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.031 1.531 1.031.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.026 2.747-1.026.546 1.378.202 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.203 22 16.447 22 12.021 22 6.484 17.523 2 12 2z"/></svg>`;

export function subscribePageHtml(): string {
  return baseLayout(
    "Subscribe — GitHub Release Notifications",
    `<body class="min-h-screen bg-white text-slate-900 antialiased flex flex-col items-center justify-center px-4 py-16">

  <div class="w-full max-w-sm">

    <div class="mb-8 flex flex-col items-center text-center">
      <span class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
        ${GITHUB_ICON}
        Release notifications
      </span>
      <h1 class="mt-5 text-3xl font-bold tracking-tight text-slate-900 leading-tight">
        Never miss<br />a release.
      </h1>
      <p class="mt-3 text-sm text-slate-500 leading-relaxed">
        Get a plain email the moment any GitHub repository you care about ships a new release.
      </p>
    </div>

    <div class="rounded-2xl bg-white ring-1 ring-slate-200 shadow-lg shadow-slate-100 px-6 py-7">
      <form
        hx-post="/api/subscribe"
        hx-target="#subscribe-result"
        hx-swap="innerHTML"
        hx-disabled-elt="find button[type=submit]"
        class="space-y-4"
        novalidate
      >
        <div>
          <label for="email" class="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Email</label>
          <input
            id="email" name="email" type="email" required autocomplete="email"
            placeholder="you@example.com"
            class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>
        <div>
          <label for="repo" class="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Repository</label>
          <input
            id="repo" name="repo" type="text" required
            placeholder="owner/repo"
            class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 font-mono transition focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
          <p class="mt-1.5 text-xs text-slate-400">e.g. <span class="font-mono">vercel/next.js</span></p>
        </div>
        <button
          type="submit"
          class="mt-1 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-60"
        >
          Subscribe
        </button>
      </form>
      <div id="subscribe-result" class="mt-4 empty:hidden"></div>
    </div>

    <p class="mt-5 text-center text-xs text-slate-400">
      Free. No spam. Unsubscribe any time.
    </p>

  </div>

</body>`,
    true
  );
}

const CARD = "rounded-2xl bg-white ring-1 ring-slate-200 shadow-lg shadow-slate-100 px-8 py-10";

export function subscriptionConfirmedPageHtml(): string {
  return baseLayout(
    "Subscription confirmed",
    `<body class="min-h-screen bg-white antialiased flex items-center justify-center px-4">
  <div class="w-full max-w-sm text-center">
    <div class="${CARD}">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <svg class="h-5 w-5 text-slate-700" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd"/></svg>
      </div>
      <h1 class="text-xl font-bold text-slate-900">You're subscribed</h1>
      <p class="mt-2 text-sm text-slate-500">
        Check your email to confirm the subscription. We'll send you a notification every time a new release ships.
      </p>
      <a href="/subscribe" class="mt-7 inline-block rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition">
        Subscribe to another repo
      </a>
    </div>
  </div>
</body>`
  );
}

export function unsubscribedPageHtml(): string {
  return baseLayout(
    "Unsubscribed",
    `<body class="min-h-screen bg-white antialiased flex items-center justify-center px-4">
  <div class="w-full max-w-sm text-center">
    <div class="${CARD}">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <svg class="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"/></svg>
      </div>
      <h1 class="text-xl font-bold text-slate-900">Unsubscribed</h1>
      <p class="mt-2 text-sm text-slate-500">
        You have been removed from that subscription and won't receive any more release emails for that repository.
      </p>
      <a href="/subscribe" class="mt-7 inline-block rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition">
        Subscribe again
      </a>
    </div>
  </div>
</body>`
  );
}

const ERROR_COPY: Record<string, string> = {
  INVALID_TOKEN: "This link is invalid or has already been used.",
  SUBSCRIPTION_NOT_FOUND: "We could not find that subscription.",
  SUBSCRIPTION_ALREADY_CONFIRMED: "This subscription has already been confirmed.",
  SUBSCRIPTION_NOT_CONFIRMED: "This subscription has not been confirmed yet.",
  GITHUB_REPO_NOT_FOUND: "That repository could not be found on GitHub.",
  GITHUB_RATE_LIMITED: "GitHub rate limit reached. Please try again in a little while.",
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
      <p class="mt-3 inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs font-mono text-slate-400 ring-1 ring-slate-200">${escapeHtml(code)}</p>
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

export function notFoundPageHtml(): string {
  return baseLayout(
    "404 — Page not found",
    `<body class="min-h-screen bg-white antialiased flex items-center justify-center px-4">
  <div class="w-full max-w-sm text-center">
    <p class="text-8xl font-black text-slate-100 select-none leading-none tracking-tighter">404</p>
    <div class="${CARD} -mt-4 relative">
      <h1 class="text-xl font-bold text-slate-900">Page not found</h1>
      <p class="mt-2 text-sm text-slate-500">
        This page does not exist. If you were expecting a subscription link, it may have expired or already been used.
      </p>
      <a href="/subscribe" class="mt-7 inline-block rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition">
        Go to subscribe
      </a>
    </div>
  </div>
</body>`
  );
}

