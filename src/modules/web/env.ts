/**
 * Public origin for **absolute URLs in emails** (confirm / unsubscribe links).
 * Uses `WEB_URL` when set, otherwise `BASE_URL`. Does not affect HTTP routing.
 */
export function resolveWebAppOrigin(): string {
  const web = process.env.WEB_URL?.trim();
  const base = process.env.BASE_URL?.trim();
  const chosen = web || base;
  if (!chosen) {
    throw new Error("BASE_URL or WEB_URL must be set for email links");
  }
  return chosen.replace(/\/+$/, "");
}
