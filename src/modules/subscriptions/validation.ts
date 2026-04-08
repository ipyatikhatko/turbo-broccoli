export interface OwnerRepoSlug {
  owner: string;
  repo: string;
}

const segment = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|[._-](?=[a-zA-Z0-9]))*$/;

/** Parse `owner/repo` (GitHub-style slug). Pure — no I/O. */
export function parseOwnerRepo(slug: string): OwnerRepoSlug | null {
  const trimmed = slug.trim();
  const i = trimmed.indexOf("/");
  if (i <= 0 || i === trimmed.length - 1) return null;

  const owner = trimmed.slice(0, i);
  const repo = trimmed.slice(i + 1);
  if (owner.includes("/") || repo.includes("/")) return null;
  if (!segment.test(owner) || !segment.test(repo)) return null;

  return { owner, repo };
}

/** Minimal email shape check for list endpoint. Pure — no I/O. */
export function isValidEmailFormat(email: string): boolean {
  const s = email.trim();
  if (s.length === 0) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
