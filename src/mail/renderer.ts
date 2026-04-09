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
  tag: string;
}): Promise<string> {
  const html = await readTemplate("emails/confirm.html");
  return replaceAll(html, {
    "{{ confirmUrl }}": input.confirmUrl,
    "{{ repo }}": input.repo,
    "{{ tag }}": input.tag,
    "{{ page.confirmUrl }}": input.confirmUrl,
    "{{ page.repo }}": input.repo,
    "{{ page.tag }}": input.tag,
  });
}

export async function renderUnsubscribeTemplate(input: {
  unsubscribeUrl: string;
  repo: string;
}): Promise<string> {
  const html = await readTemplate("emails/unsubscribe.html");
  return replaceAll(html, {
    "{{ unsubscribeUrl }}": input.unsubscribeUrl,
    "{{ repo }}": input.repo,
    "{{ page.unsubscribeUrl }}": input.unsubscribeUrl,
    "{{ page.repo }}": input.repo,
  });
}

export async function renderReleaseTemplate(input: {
  repo: string;
  tag: string;
}): Promise<string> {
  const html = await readTemplate("emails/release.html");
  return replaceAll(html, {
    "{{ repo }}": input.repo,
    "{{ tag }}": input.tag,
    "{{ page.repo }}": input.repo,
    "{{ page.tag }}": input.tag,
  });
}
