import { baseLayout, GITHUB_ICON } from "./base.ts";

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
        id="subscribe-form"
        hx-post="/subscribe"
        hx-target="#subscribe-result"
        class="space-y-4"
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
            oninput="this.setCustomValidity('')"
            hx-on:htmx:validation:validate="this.setCustomValidity(/^[a-zA-Z0-9](?:[a-zA-Z0-9]|[._-](?=[a-zA-Z0-9]))*\\/[a-zA-Z0-9](?:[a-zA-Z0-9]|[._-](?=[a-zA-Z0-9]))*$/.test(this.value) ? '' : 'Use the owner/repo format (for example golang/go).')"
            title="Use the owner/repo format (for example golang/go)."
            class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 font-mono transition focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
          <p class="mt-1.5 text-xs text-slate-400">e.g. <span class="font-mono">vercel/next.js</span></p>
        </div>
        <button
          type="submit"
          class="mt-1 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-60"
        >
          Subscribe
        </button>
      </form>
      <div id="subscribe-result" hx-swap="innerHTML" class="mt-4 empty:hidden"></div>
    </div>

    <p class="mt-5 text-center text-xs text-slate-400">
      Free. No spam. Unsubscribe any time.
    </p>

  </div>

</body>`,
    true
  );
}
