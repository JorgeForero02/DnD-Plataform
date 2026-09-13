# Pendientes cerrados — la bandeja de dados (2026-09-12, Task 10)

**La ficha que Task 10 cerró con código.** Entró por los cuatro pasos de `04-convenciones.md`:
unitarias que fallan primero (`bandeja.test.ts`, `BandejaDeDados.test.tsx`), la composición
(`bandeja.ts`) y el componente (`BandejaDeDados.tsx`), mutación en `bandeja.ts` (agrupar por
caras desactivado → roja, restaurado → verde), y `pnpm verify` en verde.

**No se edita.** Si algo de aquí se reabre, se abre ficha nueva en `06-pendientes.md` citando
esta.

## Pulido antes del paso 3 — anexo #16, la bandeja compacta

**Cerrada el 2026-09-12 (Task 10).** `BandejaDeDados.tsx` pinta los siete dados como botones,
la pila (`aria-label="Quitar el d6 (posición N)"`), el modificador y un `<details>` «Modo
avanzado» con el campo de expresión libre; se usa en `PanelDeDados.tsx` (pantalla «Dados») y en
`PanelDeDadosDeLaMesa.tsx` (`compacta`, anclado en la mesa), reemplazando en los dos el bloque
de «Qué se tira» + «Atajos» + `SelectorDeVentaja` de antes. En `PanelDeDadosDeLaMesa.tsx`,
audiencia y CD (con su guía del SRD) se plegaron dentro de un `<details>` «Audiencia y CD» cuyo
`summary` dice lo elegido.

**Texto original:**

> La Tarea 3 del plan de pulido reordenó «Ajustes» del personaje (anexo #9, cerrado) y puso el
> reloj, pedir una tirada y tirar en una sola rejilla de dos columnas con alturas iguales (anexo
> #16, parte de rejilla). **Lo que #16 pide y esta tarea NO entrega es la bandeja de dados
> compacta** —pulsar un dado para añadirlo, verlo con su forma, quitarlo con un clic—: esa parte
> llega en la Task 10, junto con la misma bandeja para #10, #11 y #14. Hasta entonces, «tirar»
> sigue siendo el formulario largo de expresión + atajos + radios + motivo + CD, solo que ahora
> comparte rejilla y altura con «pedir» en vez de ir apilado debajo del reloj.
