import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores([
    "dist/**",
    "node_modules/**",
    "src/mail/compiled/**",
    "drizzle/**",
    "src/types/openapi.d.ts",
    "*.config.cjs",
    "maizzle.config.cjs",
  ]),
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
);
