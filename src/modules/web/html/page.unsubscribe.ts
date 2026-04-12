import { baseLayout, CARD } from "./base.ts";

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
