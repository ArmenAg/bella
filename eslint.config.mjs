import { FlatCompat } from "@eslint/eslintrc";
import prettier from "eslint-config-prettier";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  prettier,
  {
    ignores: [
      ".next/**",
      "next-env.d.ts",
      "node_modules/**",
      "coverage/**",
      "supabase/.branches/**",
      "supabase/.temp/**",
      "playwright-report/**",
      "test-results/**",
      "tests/e2e/**",
    ],
  },
];

export default eslintConfig;
