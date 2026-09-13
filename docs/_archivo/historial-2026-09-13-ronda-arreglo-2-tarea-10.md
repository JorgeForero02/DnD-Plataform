# Historial archivado — Ronda de arreglo 2 de la tarea 10: el radio de ventaja se queda montado, apagado con su motivo (2026-09-13)

**Movida entera** el 2026-09-13, al escribir la entrada de hito «Pulido antes del paso 3» (Tarea
15, cierre de la tanda). Su resumen se queda en `07-historial.md`.

---

## Ronda de arreglo 2 de la tarea 10: el radio de ventaja se queda montado, apagado con su motivo (2026-09-13)

Qué — round 1 arregló que la ventaja mintiera, pero **la escondió**: `ofreceVentaja &&` montaba
y desmontaba el `radiogroup` letra a letra al escribir en el modo avanzado, y el controlador lo
cazó con `espacios.spec.ts` (los dos tearing de anexo #8, rojos: 840→812, −28px) — exactamente
el defecto que esa suite existe para cazar y que `jsdom` no puede ver. Arreglo por la regla del
proyecto («se deshabilita, nunca se esconde, con su motivo», `04-convenciones.md`): el
`radiogroup` de `BandejaDeDados.tsx` se queda **siempre montado**; cuando no admite ventaja se
apaga (`disabled`) y una línea con `min-h-[1.125rem]` —reservada también cuando está vacía— dice
«Solo con un d20 al principio de la tirada.». El botón «Tirar» de los dos paneles cambia su
motivo de `title` (invisible para lectores de pantalla) a un `span` `sr-only` siempre montado con
`aria-describedby`, mismo patrón que ya usa `TirarAtaqueBoton.tsx`.

Por qué — el elemento que se movía era el `radiogroup` «Ventaja»: al escribir una expresión que
no empieza por `d20` (`admiteVentajaEnTexto` en falso), `ofreceVentaja` pasaba a `false` y el
`{ofreceVentaja && (...)}` de round 1 desmontaba el bloque entero, encogiendo la tarjeta lo que
medía ese bloque. El botón «Tirar» no cambiaba de alto —su motivo ya vivía en un `title`, que no
ocupa espacio—, pero se corrigió igual porque un `title` no lo anuncia ningún lector de pantalla
de forma fiable.

Pruebas — reproducido primero: RTL que abre el modo avanzado, escribe una expresión que no
admite ventaja y comprueba que el mismo conjunto de roles sigue presente antes y después
(`PanelDeDados.test.tsx`, nueva); confirma que el culpable era el `radiogroup`. Dos pruebas de
`BandejaDeDados.test.tsx` que antes esperaban `queryByRole(...).toBeNull()` pasan a esperar
`toBeInTheDocument()` + `toBeDisabled()`. `PanelDeDadosDeLaMesa.test.tsx` (nuevo fichero, no
existía prueba unitaria de este componente): mismo reproductor para el cajón compacto.
`pnpm --filter @dnd/web test -- src/features/rolls`: 91/91 (12 ficheros). `pnpm verify`: verde
(shared/api/web). E2E (no corridos por el agente; el controlador ya los tiene en su tanda):
`espacios.spec.ts` queda intacto — no hizo falta tocarlo, porque medía bien: el defecto estaba en
el componente, no en la medida.

Revertir — `git revert` del commit; ningún dato ni migración de por medio.

