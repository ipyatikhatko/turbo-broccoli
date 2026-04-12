import type { FastifyRequest } from "fastify";

function queryParam(
  query: FastifyRequest["query"],
  key: string
): string | undefined {
  const record = query as Record<string, string | string[] | undefined>;
  const v = record[key];
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

/** Hostname only (lowercase), no port — from reverse proxy or direct client. */
export function getRequestHostname(request: FastifyRequest): string {
  const forwarded = request.headers["x-forwarded-host"];
  const raw = forwarded ?? request.headers.host ?? "";
  const first = Array.isArray(raw) ? raw[0] : raw;
  const host = (first ?? "").split(",")[0]?.trim() ?? "";
  const withoutPort = host.split(":")[0] ?? "";
  return withoutPort.toLowerCase();
}

function hostnameFromEnvUrl(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    return new URL(raw.trim()).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * True when the HTTP host is the public web app: same hostname as `WEB_URL`, or the
 * `app.*` subdomain convention (e.g. `app.localhost`, `app.example.com`).
 * Any other host (including `api.*` and plain `localhost`) uses the JSON API contract.
 */
export function isWebHost(request: FastifyRequest): boolean {
  const host = getRequestHostname(request);
  if (!host) return false;

  const webHost = hostnameFromEnvUrl(process.env.WEB_URL);
  if (webHost && host === webHost) return true;

  const firstLabel = host.split(".")[0] ?? "";
  if (firstLabel === "app") return true;

  return false;
}

/**
 * True when the response should follow the OpenAPI JSON contract (no HTML redirects
 * or HTMX fragments). Determined by **Host**, not User-Agent.
 *
 * Override: `?format=json` on any host forces JSON (e.g. debugging on the app host).
 */
export function prefersJsonApiContract(request: FastifyRequest): boolean {
  const format = queryParam(request.query, "format")?.toLowerCase();
  if (format === "json") return true;
  return !isWebHost(request);
}

/** Web UX (redirects / HTML): app host without `?format=json`. */
export function isWebDocumentClient(request: FastifyRequest): boolean {
  return !prefersJsonApiContract(request);
}

export function isHtmxWebSubscribe(request: FastifyRequest): boolean {
  const hx = request.headers["hx-request"];
  const raw = Array.isArray(hx) ? hx[0] : hx;
  if (!raw || raw.toLowerCase() !== "true") return false;
  return isWebDocumentClient(request);
}
