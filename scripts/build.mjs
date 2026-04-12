import * as esbuild from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "src");
const outDir = path.join(root, "dist");
const publicDir = path.join(outDir, "public");
const entry = path.join(srcDir, "index.ts");
const outfile = path.join(outDir, "index.js");

/** Resolve `@/…` like tsconfig `paths` (`@/*` -> `./src/*`). */
const aliasAtPlugin = {
  name: "alias-at",
  setup(build) {
    build.onResolve({ filter: /^@\// }, (args) => ({
      path: path.join(srcDir, args.path.slice(2)),
    }));
  },
};

await mkdir(publicDir, { recursive: true });

const tw = spawnSync(
  "pnpm exec tailwindcss -i ./src/web/input.css -o ./dist/public/web.css --minify",
  { cwd: root, stdio: "inherit", shell: true }
);
if (tw.status !== 0) {
  process.exit(tw.status ?? 1);
}

await esbuild.build({
  absWorkingDir: root,
  entryPoints: [entry],
  outfile,
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  packages: "external",
  sourcemap: true,
  logLevel: "info",
  plugins: [aliasAtPlugin],
});
