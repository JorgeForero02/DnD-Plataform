# Archivo — Ronda de arreglo de la tarea 10 (2026-09-13)

Movida entera desde `docs/07-historial.md` el 2026-09-13, al escribir la entrada de la revisión
final de la rama `pulido/antes-del-paso-3` (el fichero estaba en 983 de 1000 y la entrada no cabía).
Era la entrada completa más antigua.

---

## Ronda de arreglo de la tarea 10: el d20 al principio, plegar devuelve el control, la pila se distingue (2026-09-13)

Qué — tres defectos de la revisión (round 1) sobre la bandeja de dados. **El grave**: `admiteVentaja`
ofrecía el radio con «exactamente un d20 en cualquier posición», pero el servidor
(`conVentaja`, `apps/api/src/rolls/rolls.service.ts:436`) solo reescribe un `d20` **al
principio** de la expresión; pulsar d6 y luego d20 componía `1d6+1d20`, ofrecía «Ventaja» y el
servidor la tiraba normal, sin avisar a nadie. `expresionDeBandeja` antepone el grupo del d20
cuando hay exactamente uno, sin importar cuándo se pulsó; y cuando el campo escrito a mano es la
fuente, el radio deja de mirar la bandeja y mira el propio texto (`admiteVentajaEnTexto`, mismo
criterio que el servidor: `/^\s*1?d20(\b|[^0-9])/`). Extra: `modo` vuelve a `NORMAL` solo cuando
el radio deja de ofrecerse, para que no se quede pegado en Ventaja sin ningún control que lo
explique. **Plegar «Modo avanzado» también devuelve el control a la bandeja**: antes, escribir
`4d6kh3` y plegar el `<details>` dejaba esa expresión mandando escondida; ahora plegar hace lo
mismo que pulsar un dado. **La pila ya no se confunde con los atajos** (anexo #10): rótulo
propio «En la bandeja · N dados», superficie de cobre (`border-copper`,
`bg-[color:var(--copper-tint)]`) en vez del contorno de los atajos, y una «×» dibujada
(`IconoQuitar`) en cada dado de la pila. De regalo: `expresionDeBandeja` da `""` con la bandeja
vacía aunque haya modificador puesto (un modificador solo no es una tirada); los dados del
resultado (`ResultadoDeTirada.tsx`) pasan de números pegados al icono a fichas con borde,
icono a `h-5 w-5` y valor en `text-chrome-md`, envueltas con `flex-wrap`.

Por qué — el defecto del d20 lo encontró la revisión leyendo el regex de `conVentaja` contra lo
que la bandeja componía; sin el arreglo, la mitad de la promesa de esta tarea —pulsar dados en
vez de escribir, y que la ventaja siga siendo real— quedaba rota en el caso más obvio (un ataque:
el dado de daño primero, el d20 después). La pila sin distinguir de los atajos era el propio
anexo #10 sin cerrar del todo: «pulsado» y «disponible» tenían la misma silueta.

Pruebas — `bandeja.test.ts`: +7 (el reordenado del d20, dos d20 no se reordenan,
`admiteVentajaEnTexto` con sus tres casos, la bandeja vacía con modificador). `BandejaDeDados.test.tsx`:
+5 (el caso d6-luego-d20 ofrece ventaja de verdad; el texto manda sobre la bandeja para el
radio; plegar devuelve el control; `modo` vuelve a Normal; el rótulo de la pila). Dos pruebas
existentes con su expectativa corregida al nuevo orden (`"1d6+1d20"` → `"1d20+1d6"`). `pnpm
--filter @dnd/web test -- src/features/rolls`: 89/89. Mutación (ya hecha en la tarea, sigue
válida: agrupar sin `Map` enrojece `bandeja.test.ts` y `PanelDeDados.test.tsx`). E2E actualizados
(no corridos por el agente, mismo alcance que la tarea): `exact: true` en los botones de la
bandeja que ya escribían pruebas de la tarea, y `tokens-contrast.spec.ts` mide también el borde
de la pila y el rótulo «En la bandeja».

Revertir — `git revert` del commit; ningún dato ni migración de por medio.
