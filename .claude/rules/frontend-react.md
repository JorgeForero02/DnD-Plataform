---
paths:
  - "apps/web/**/*.{ts,tsx}"
---
# Frontend React + TypeScript (`apps/web`)

Versiones del repo (2026-10-03): React 18.3, Vite 5, TanStack Query 5, Zustand 4, React Router 6,
react-hook-form 7 + Zod 3, Vitest 2 + Testing Library, Playwright. La regla de la plantilla está escrita
para React 19 + React Compiler: **lo de la v19 no aplica hasta actualizar**. Las marcadas *(comunidad)*
son práctica extendida; las *(decisión del repo)* mandan aquí. Si algo choca con
`docs/04-convenciones.md`, manda el `04`.

- **Respeta las Rules of React** (componentes y hooks puros). React Compiler **no** está activado (React
  18): no se quitan `useMemo`/`useCallback` existentes sin medir. [1]
- **El estado derivado se calcula durante el render**, no en un `useEffect`. [2]
- **Datos del servidor con TanStack Query**, no con `useEffect` + `fetch`; **no se copian a Zustand**:
  servidor y cliente se llevan por separado. [3] [4]
- Formularios con react-hook-form + `zodResolver` y **el esquema de `@dnd/shared`**: la forma de los
  datos vive una sola vez (`CLAUDE.md`). [5] *(decisión del repo)*
- Estructura `src/features/<feature>/` (`docs/01-arquitectura.md`, «Estructura de la web»). *(decisión del repo)*
- Estados de carga, **error** y vacío en cada vista: un error no se pinta como «no hay datos». *(comunidad)*
- **La lógica de dominio no se recalcula en la vista**: la hoja se deriva en la API (`apps/api/src/rules/`)
  y la pantalla pinta la traza. *(decisión del repo)*
- **Un botón se muestra según el permiso de la ruta que llama**; ocultarlo es experiencia de usuario, **el
  servidor autoriza**. [6]
- Las variables `VITE_*` van en el bundle: **nunca secretos**. [7]
- Accesibilidad con objetivo WCAG 2.2 AA, HTML semántico antes que ARIA, foco visible. Y **las reglas de
  interfaz vinculantes del `04`** (iconos dibujados, radios con explicación, lo maquetado se mide en el
  navegador). [8]
- Pruebas: Testing Library por rol (`getByRole` primero); los espías sobre el módulo de api siguen la
  trampa documentada en el `04` («un espía sobre un espacio de nombres…»); **lo que solo existe maquetado
  se prueba con Playwright** y medidas numéricas, porque `jsdom` no maqueta. [9]
- **La regla de dependencias del `01`** (la web no importa de `apps/api`) se comprueba en `verify` con
  `no-restricted-imports` de ESLint (`eslint.config.mjs`). [10]

Fuentes ([1]–[9] consultadas el 2026-10-01 para la plantilla `a78a535`; [10] el 2026-10-03):
[1] https://react.dev/reference/rules
[2] https://react.dev/learn/you-might-not-need-an-effect
[3] https://react.dev/reference/react/useEffect
[4] https://tanstack.com/query/latest/docs/framework/react/overview
[5] https://github.com/react-hook-form/resolvers
[6] https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
[7] https://vite.dev/guide/env-and-mode
[8] https://www.w3.org/WAI/standards-guidelines/wcag/ · https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/
[9] https://testing-library.com/docs/queries/about/ · https://playwright.dev/docs/best-practices
[10] https://eslint.org/docs/latest/rules/no-restricted-imports
