# Historial archivado — Tarea 1 del pulido: `Casilla` y la banda anclada (2026-09-12)

**Movida entera** el 2026-09-13, al escribir la ronda de arreglo de la Task 10 del pulido (round
1 de revisión): el fichero seguía por encima de 1000 y era la entrada completa más antigua. Su
hito se queda en `07-historial.md`.

---

## Tarea 1 del pulido: `Casilla` y la banda anclada (2026-09-12)

Qué — `Casilla` (nuevo componente, `apps/web/src/features/character-sheet/Casilla.tsx`), con las
constantes de la tarea 0 (`ANCHO_CASILLA` `w-[4.75rem]`, `ALTO_CASILLA` `min-h-[3.75rem]`) y su
tercera línea (`data-testid="casilla-nota"`) SIEMPRE reservada, con o sin nota: la casilla de PG
era la única de las cinco de la tira con «+N temporales» y por eso era la única más ancha y más
alta (anexo #4). La usan la variante `compacta` de `ValorDerivado` (`Traza.tsx`) y la caja de PG
de `Cabecera.tsx`, que deja de llevar su propio marcado. `TarjetaDeHoja` gana un `pie?: ReactNode`
opcional, separado del cuerpo por su propio filete (`Tarjeta.tsx`, sin consumidor todavía). Y la
banda fija se ancla al hueco que la contiene con dos variables CSS nuevas que declara quien la
tiene, no la propia banda (mismo patrón que `--tira-fija-top`/`--tira-fija-pull`):
`--tira-fija-mx` y `--tira-fija-bg` (`AppShell.tsx`: medio paso hacia fuera y `--chrome-veil`
translúcido; `Dialog.tsx`: cero y `--surface` opaco — anexo #3, el velo del 95 % dentro de un
cajón «flotaba sin estar anclada»). Dos `test` de navegador nuevos en `e2e/hoja.spec.ts` (las
cinco casillas miden lo mismo con y sin temporales; la banda va a ras y sobre fondo opaco dentro
de «Su hoja») y la aserción existente de esa suite que contaba las cinco cajas por su clase pasa
de `min-w-[4.75rem]` a `w-[4.75rem]` porque la clase real cambió de mínimo a fijo. Unitarias
nuevas: `Casilla.test.tsx` (tres casos) y `Tarjeta.test.tsx` (dos, para `pie`). Verificado por
mutación: quitar `min-h-[1rem]` de la nota tumba la primera unitaria de `Casilla`, restaurado con
`cp`; por qué — tarea 1 del [plan de pulido](../superpowers/specs/2026-09-12-pulido-antes-del-paso-3-design.md),
anexos #3 y #4 de la nota de diseño de la tarea 0; revertir — quitar `Casilla.tsx` y restaurar la
caja de PG en `Cabecera.tsx` a su marcado anterior (`git revert` del commit de esta tarea).
