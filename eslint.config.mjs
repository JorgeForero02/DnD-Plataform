import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "apps/web/dist/**",
      "apps/api/prisma/migrations/**",
      // Salidas de Playwright: informe generado, no codigo del repositorio.
      "apps/web/test-results/**",
      "apps/web/playwright-report/**",
      "apps/web/blob-report/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Node: API and shared package.
  {
    files: [
      "apps/api/**/*.ts",
      "packages/shared/**/*.ts",
      "**/*.mjs",
      "scripts/**/*.js",
      "**/*.config.ts",
    ],
    languageOptions: { globals: globals.node },
  },

  // CommonJS config files (jest, postcss, tailwind).
  {
    files: ["**/*.config.js", "**/jest.config.js"],
    languageOptions: { globals: globals.node, sourceType: "commonjs" },
  },

  // Browser: web app.
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },

  // Tests: jest and vitest globals, and assertions on mocks need loose typing.
  {
    files: [
      "**/*.spec.ts",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.e2e-spec.ts",
      "**/setupTests.ts",
      "apps/web/e2e/**/*.ts",
      "apps/web/playwright.config.ts",
    ],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
    },
  },

  // Formatting belongs to Prettier; this must stay last.
  prettier,
);
