export function escapeHtml(s: string): string {
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
 * HTMX 2 reads its config exclusively from <meta name="htmx-config">.
 * The window.htmx pre-init pattern does NOT work in HTMX 2.x — the library
 * overwrites window.htmx on load without merging any pre-set config.
 *
 * Key overrides from defaults:
 *   - selfRequestsOnly: false — allows the form to POST to /api/subscribe
 *     even when WEB_URL and BASE_URL are on different subdomains.
 *   - responseHandling — swap: true for 4xx/5xx so error fragments are
 *     rendered (default is swap: false for error codes).
 */
const HTMX_BLOCK = `<meta name="htmx-config" content='{"selfRequestsOnly":false,"responseHandling":[{"code":"204","swap":false},{"code":"[23]..","swap":true},{"code":"[45]..","swap":true,"error":true},{"code":"...","swap":false,"error":true}]}' />
<script src="https://cdn.jsdelivr.net/npm/htmx.org@2.0.8/dist/htmx.min.js" integrity="sha384-/TgkGk7p307TH7EXJDuUlgG3Ce1UVolAOFopFekQkkXihi5u/6OCvVKyz1W+idaz" crossorigin="anonymous"></script>`;

export function baseLayout(
  title: string,
  body: string,
  includeHtmx = false
): string {
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

export const GITHUB_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.185 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.031 1.531 1.031.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.026 2.747-1.026.546 1.378.202 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.203 22 16.447 22 12.021 22 6.484 17.523 2 12 2z"/></svg>`;
export const CARD =
  "rounded-2xl bg-white ring-1 ring-slate-200 shadow-lg shadow-slate-100 px-8 py-10";
