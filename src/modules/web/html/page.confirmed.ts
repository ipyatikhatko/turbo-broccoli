import { baseLayout, CARD } from "./base.ts";

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
