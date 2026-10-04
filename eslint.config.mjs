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
      // Los worktrees de los agentes viven dentro del repositorio y traen una copia
      // ENTERA de el, `prototipo/` incluido. La entrada `prototipo/**` de mas abajo es
      // relativa a la raiz y no casa con la copia anidada, asi que un agente trabajando
      // en paralelo hacia fallar `pnpm verify` — y con el, el gancho de pre-commit de
      // TODO el repositorio — con errores de lint de una maqueta de terceros. Medido el
      // 2026-09-04: cinco errores en `prototipo/` de un worktree ajeno.
      ".claude/worktrees/**",
      // **Salida de `capturas-comparacion.spec.ts`, no código nuestro.** Está en `.gitignore`
      // desde la ficha M2B-13, pero eslint no lee `.gitignore`, así que cada corrida que dejara
      // un `.mjs` ahí ponía `pnpm verify` en rojo con `'document' is not defined` sobre un
      // fichero que nadie escribió a mano. Mismo tropiezo que con los worktrees, de arriba.
      "apps/web/capturas-salida/**",
      "apps/web/dist/**",
      "apps/api/prisma/migrations/**",
      // Salidas de Playwright: informe generado, no codigo del repositorio.
      "apps/web/test-results/**",
      "apps/web/playwright-report/**",
      "apps/web/blob-report/**",
      // `prototipo/` es la maqueta que devolvio Figma Make el 2026-09-03: codigo de
      // TERCEROS, pendiente de adaptar, con su propio `package.json` y fuera del
      // workspace de pnpm. Se ignora **a proposito y temporalmente**.
      //
      // Por que se ignora en vez de arreglarlo: sus avisos son de la herramienta que lo
      // genero, no decisiones de este proyecto, y arreglarlos seria adoptar codigo que
      // todavia no se ha revisado. Mientras estuvo dentro del alcance, `pnpm verify`
      // fallaba y **el repositorio entero quedaba sin poder commitear**.
      //
      // Esta entrada SE BORRA cuando la maqueta se adopte: lo que se adopte vive en
      // `apps/web` y cumple las reglas como todo lo demas, y lo que no, se borra con la
      // carpeta. Si esta linea sigue aqui y `prototipo/` ya no existe, sobra.
      "prototipo/**",
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

  // Wildcard types are an error in source, and the ceiling is zero.
  //
  // Measured 2026-09-06 over the whole repository: `no-explicit-any` reported ZERO findings in
  // application code. It was already inherited as a warning from the recommended set, and a
  // warning that nobody has ever had to act on says nothing about whether the next one gets in
  // — `pnpm verify` passes with warnings. Promoting it to an error costs nothing today and
  // makes the machine hold a property that until now was held by habit.
  //
  // Why it matters more here than the count suggests: a type is a constraint an agent reads
  // without spending a line of documentation or a turn of context, and the compiler answers in
  // seconds instead of in review. Every escape hatch is that guardrail switched off, exactly
  // where guessing is most expensive.
  //
  // If a boundary genuinely cannot be typed — a third-party payload, a driver's shape — the way
  // through is `unknown` plus a narrowing check, or a documented `eslint-disable-next-line` with
  // the reason. Not a silent `any`.
  {
    files: ["apps/api/src/**/*.ts", "apps/web/src/**/*.{ts,tsx}", "packages/shared/src/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
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

  // Regla de dependencias de docs/01-arquitectura.md, comprobada por la máquina: es la prueba de
  // arquitectura de la plantilla (04 §B.5, regla 12) y corre dentro de `pnpm verify` con el
  // resto de `pnpm lint`. Tres reglas que hoy se cumplen. Lo que NO ve: `import()` dinámico, ni que
  // un fichero permitido importe a su vez uno prohibido (lo transitivo). `require()` ya lo prohíbe
  // @typescript-eslint/no-require-imports. Hoy nada cruza capas por esas vías; ficha AD-4.
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "(^|/)apps/api(/|$)|(^|/)api/src(/|$)|^@dnd/api(/|$)",
              message:
                "La web nunca importa de apps/api: lo compartido vive en @dnd/shared (docs/01-arquitectura.md, «Dirección de dependencias»).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/api/src/**/*.controller.ts"],
    // Excepción declarada en docs/01-arquitectura.md: el sondeo de salud hace `SELECT 1` y es
    // el único controlador que habla con la base, a propósito (ficha D3, 2026-09-05).
    ignores: ["apps/api/src/health/health.controller.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "(^|/)prisma/prisma\\.service$|^@prisma/client$",
              message:
                "Controlador → Servicio → Prisma: ningún controlador toca la base (docs/01-arquitectura.md).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/api/src/rules/engine.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "(^|/)catalog(/|$)",
              message:
                "El motor no importa nada de catalog/: el catálogo conoce al motor, no al revés (docs/01-arquitectura.md, «Las tres capas de la fase 2A»).",
            },
          ],
        },
      ],
    },
  },

  // Formatting belongs to Prettier; this must stay last.
  prettier,
);
