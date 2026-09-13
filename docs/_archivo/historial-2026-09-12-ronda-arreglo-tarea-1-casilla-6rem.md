# Historial archivado — ronda de arreglo de la tarea 1: `Casilla` a 6rem, medida en el navegador (2026-09-12)

**Movida entera** el 2026-09-13, al escribir la ronda de arreglo de la Task 10 del pulido (round
1 de revisión): el fichero seguía por encima de 1000 y era la entrada completa más antigua. Su
hito se queda en `07-historial.md`.

---

## Ronda de arreglo de la tarea 1: `Casilla` a 6rem, medida en el navegador (2026-09-12)

Qué — Playwright contra `e2e/hoja.spec.ts` (corrido por el controlador, no por el agente) tumbó
la primera versión de la tarea 1: a `4.75rem` («VEL. (PIES)», «13 / 13» y «+5 temporales» partían
línea), midió tres casillas de 60/75/95px en vez de una sola altura. Corrección —
`ANCHO_CASILLA` pasa a `w-[6rem]` con `whitespace-nowrap` en rótulo, cifra y nota (`Casilla.tsx`);
la etiqueta de velocidad se acorta de «Vel. (pies)» a «Vel.», con «pies» en la tercera línea vía
un `nota?: ReactNode` nuevo en `ValorDerivadoProps` que solo reenvía la variante `compacta`
(`Traza.tsx`, `Cabecera.tsx`); los dos selectores de `e2e/hoja.spec.ts` que contaban las cinco
cajas por clase pasan de `w-[4.75rem]` a `w-[6rem]`, y las dos listas de rótulos de esa misma
suite y de `Cabecera.test.tsx` cambian «Vel. (pies)» por «Vel.». Números corregidos en
`docs/superpowers/notes/2026-09-12-nota-de-diseno-ui-de-juegos.md` § 7, `04-convenciones.md`
(regla «Reparto interno de tarjeta») y `decisiones.md` (D-CF-58); por qué — el número que trajo
la nota de diseño de la tarea 0 era un mínimo (`min-w-[4.75rem]`) nunca puesto a prueba como
ancho fijo con contenido real, y solo el navegador lo pudo ver. **Segunda pasada de Playwright**:
`e2e/hoja.spec.ts` pasó a 11/12 (el timeout de L151 era flaky, verde al repetirlo) pero
`e2e/hoja-pestanas.spec.ts` cayó 7 de 7 en su propia lista de rótulos — se había quedado con el
literal viejo, «Vel. (pies)» — y se actualizó **en esta misma ronda** a «Vel.»; revertir —
`git revert` de los commits de esta ronda de arreglo.
