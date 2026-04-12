/**
 * Public app origin for redirects (e.g. https://app.example.com).
 * Falls back to BASE_URL when WEB_URL is unset (single-host / local MVC).
 */
export function resolveWebAppOrigin(): string {
  const web = process.env.WEB_URL?.trim();
  const base = process.env.BASE_URL?.trim();
  const chosen = web || base;
  if (!chosen) {
    throw new Error("BASE_URL or WEB_URL must be set for browser redirects");
  }
  return chosen.replace(/\/+$/, "");
}
