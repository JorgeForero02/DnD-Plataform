# Historial archivado — Revisión final de la rama: ningún atacante inventado, caras desconocidas en texto, iconos dibujados en el modificador, «Tirar» nunca se apaga (2026-09-13)

**Movida entera** el 2026-09-13, al escribir la entrada de hito «Pulido antes del paso 3» (Tarea
15, cierre de la tanda): el fichero iba a superar 1000 con la entrada nueva y esta era la entrada
completa más reciente que ya estaba resumida en el hito. Su resumen se queda en `07-historial.md`.

---

## Revisión final de la rama: ningún atacante inventado, caras desconocidas en texto, iconos dibujados en el modificador, «Tirar» nunca se apaga (2026-09-13)

Qué — cuatro hallazgos de la revisión de toda la rama `pulido/antes-del-paso-3`, en un commit.
**(1)** `origenDeGolpe` (`linea-de-log.ts`) trataba «hay `rollEventId`» como «se citó un origen» y
ponía «← Alguien» a un daño cuya tirada no tenía ningún `ATTACK_RESOLVED` detrás —la hoja cita
«2d6 de caída» desde `PuntosDeGolpe`—: un atacante inventado para una caída. Ahora «Alguien» sale
**solo** cuando el DM citó un `sourceCharacterId` que este espectador no ve; con `rollEventId`
solo, se nombra al atacante deducido o no se dice nada. **(2)** `ResultadoDeTirada` colaba con un
`as Caras` cualquier número de caras a `IconoDado`, que solo dibuja siete, y `2d7` o `1d1000`
(escritos en «Modo avanzado»; el servidor admite hasta 1000) pintaban un `<svg data-icono="d7">`
vacío. `esCaraConocida(n): n is Caras` vive en `bandeja.ts` junto al tipo; conocida → icono,
desconocida → la etiqueta `d7` en `font-data` —nunca un d20 disfrazado, «un dado, una forma»
(D-CF-62)—. Se van los casts: `DADOS_DE_ATAJO` es `readonly Caras[]` e `IconoDado` recibe `Caras`.
**(3)** Los botones del modificador de `BandejaDeDados` eran un «−» y un «+» de fuente —lo que el
barrido de la Tarea 7 prohíbe— y el barrido no los vio porque su regex `<Button[^>]*>` se paraba
en el `>` del `=>` del `onClick`. `IconoMenos` nuevo (trazo 1.6, `data-icono="menos"`), `IconoMas`
en el otro, `aria-label` intactos; y el regex del barrido tolera `=>` en los atributos
(`(?:[^>]|=>)*`) y el glifo seguido de `<`, con una prueba que lo demuestra contra el fixture
`<Button onClick={() => x()}>+</Button>`. **(4)** «Tirar» se deshabilitaba con la bandeja vacía
(`PanelDeDados`, `PanelDeDadosDeLaMesa`), y «Dárselos»/«Quedarse con los N nuevos»
(`DarTemporales`) con un 0 o un campo vacío — contra `04-convenciones.md` («el botón de guardar
nunca se deshabilita: no recibe foco de teclado») y contra cómo T5 resolvió «Guardar la sala».
Ahora siguen habilitados; pulsar con nada que tirar escribe en línea, junto a «Qué se tira»,
«Añade un dado a la bandeja, o escribe una expresión en Modo avanzado.» y no manda nada; los del
bestiario escriben «Escribe cuántos PG temporales nuevos son.» con `aria-invalid` en el campo. Se
retira el `sr-only` con `aria-describedby` que solo existía para el estado apagado. La única
razón de apagar que queda es la petición en curso (y, en el bestiario, la hoja sin `version`).

Por qué — (1) y (2) son mentiras en pantalla: un origen que no hubo y un dado sin forma ni nombre.
(3) es la regla de iconos con un agujero en su propio control. (4) es una convención vinculante
que tres pantallas nuevas contradecían mientras una cuarta, de la misma rama, la cumplía.

Pruebas — TDD, rojo primero en las cuatro: `linea-de-log-con-nombres.test.ts` +1 («tirada citada
sin ataque → sin origen»); `ResultadoDeTirada.test.tsx` +1 (caras 7: texto `d7`, ningún
`data-icono="d7"` ni `d20`); `bandeja.test.ts` +2 (`esCaraConocida`); `botones-con-icono.test.tsx`
+1 (el fixture con `=>`) y el barrido amplía a «−»; `Iconos.test.tsx` cuenta 31; `PanelDeDados.test.tsx`
+1, `PanelDeDadosDeLaMesa.test.tsx` +1 y `DarTemporales.test.tsx` +2 −1 (la del candado pasa a
«habilitado + error + sin petición»). Mutación con `cp`: devolver el guard viejo a `origenDeGolpe`
enrojece la nueva de (1); hacer que `esCaraConocida` devuelva siempre `true` enrojece dos de (2).
`pnpm --filter @dnd/web test -- src/features/rolls src/features/sessions src/features/bestiario
src/ui`: 56 ficheros, 532/532. Playwright (dados, tirada, espacios, bestiario, sesion, combate,
tokens-contrast) a cargo del orquestador.

Revertir — `git revert` del commit; ningún dato ni migración de por medio.

