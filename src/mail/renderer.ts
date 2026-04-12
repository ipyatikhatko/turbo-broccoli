import { readFile } from "node:fs/promises";
import { join } from "node:path";

const compiledDir = join(process.cwd(), "src", "mail", "compiled");
const templateCache = new Map<string, string>();

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function readTemplate(templateName: string): Promise<string> {
  const cached = templateCache.get(templateName);
  if (cached) return cached;

  const path = join(compiledDir, templateName);
  try {
    const html = await readFile(path, "utf8");
    templateCache.set(templateName, html);
    return html;
  } catch {
    throw new Error(
      `Email template "${templateName}" not found in "${compiledDir}". Run "pnpm email:build" first.`
    );
  }
}

function replaceAll(html: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replaceAll(key, escapeHtml(value)),
    html
  );
}

export async function renderConfirmTemplate(input: {
  confirmUrl: string;
  repo: string;
  currentReleaseTag: string | null;
}): Promise<string> {
  const html = await readTemplate("emails/confirm.html");
  const currentReleaseTagHref = input.currentReleaseTag
    ? `https://github.com/${input.repo}/releases/${input.currentReleaseTag}`
    : `https://github.com/${input.repo}/releases`;
  const currentReleaseTagText = input.currentReleaseTag ?? "No releases yet";
  return replaceAll(html, {
    "{{ confirmUrl }}": input.confirmUrl,
    "{{ repo }}": input.repo,
    "{{ currentReleaseTagHref }}": currentReleaseTagHref,
    "{{ currentReleaseTagText }}": currentReleaseTagText,
    "{{ page.confirmUrl }}": input.confirmUrl,
    "{{ page.repo }}": input.repo,
    "{{ page.currentReleaseTagHref }}": currentReleaseTagHref,
    "{{ page.currentReleaseTagText }}": currentReleaseTagText,
  });
}

export async function renderReleaseTemplate(input: {
  repo: string;
  tag: string;
  unsubscribeUrl: string;
}): Promise<string> {
  const html = await readTemplate("emails/release.html");
  return replaceAll(html, {
    "{{ repo }}": input.repo,
    "{{ tag }}": input.tag,
    "{{ unsubscribeUrl }}": input.unsubscribeUrl,
  });
}
