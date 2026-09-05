# Historial archivado — las tres baratas (2026-09-05)

> **Movida entera el 2026-09-05, sin reescribir ni resumir una línea.** Quinto corte de esa noche:
> los planes 01–06 y el 15 escribieron **diez** entradas y
> [`07-historial.md`](../07-historial.md) no da para tantas. Los otros cortes están en
> [`historial-2026-09-05-ola-3.md`](./historial-2026-09-05-ola-3.md),
> [`historial-2026-09-04-reseno-de-la-mesa.md`](./historial-2026-09-04-reseno-de-la-mesa.md) y
> [`historial-2026-09-03-y-04-sueltas.md`](./historial-2026-09-03-y-04-sueltas.md).
>
> Es la entrada **más antigua de esa misma noche**: se archiva por orden, no por vieja.

## Las tres baratas: TipTap empaquetado, `build` en CI y la ficha de `lychee` (2026-09-05)

**Qué.** Plan 01 de [los planes del 2026-09-05](./superpowers/plans/2026-09-05-planes/01-tres-baratas.md),
en un commit y sin comportamiento nuevo.

- **Los seis paquetes de TipTap pasan de `devDependencies` a `dependencies`**
  (`apps/web/package.json:19-24`), con las versiones intactas. Su único consumidor sigue siendo un
  script, así que nada se rompía hoy: se rompería **solo en producción** el día que el editor los
  importara desde `src/` y `pnpm install --prod` los dejara fuera de la imagen.
- **CI ejecuta `pnpm build`** (`.github/workflows/ci.yml:47`), **antes de `lint`**. Hasta hoy un
  error de compilación que ninguna prueba tocara llegaba a `main` en verde.
- **`lychee` se cierra por medición, no por retirada:** el barrido no encuentra **ninguna**
  mención viva fuera de `.superpowers/`, o sea que la integración nunca existió.

**Cómo se comprobó.** Mutación obligatoria: un `const x: number = "cadena"` en
`apps/web/src/main.tsx` hace caer `pnpm build` con `error TS2322` y salida 2 — el paso de CI sirve
de algo. Deshecha después. `pnpm verify` en verde con el gancho.

**Cómo revertirlo.** `git revert` del commit: devuelve los seis paquetes a `devDependencies`,
regenera el lockfile con `pnpm install` y quita el paso de CI. Nada depende de ello en tiempo de
ejecución.
