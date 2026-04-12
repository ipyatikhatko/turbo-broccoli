import { baseLayout, CARD } from "./base.ts";

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
