# Pendientes cerrados — poda del 2026-09-06

**Congelado. Nada de aquí se edita.** Tres fichas que `06-pendientes.md` seguía arrastrando con
la palabra «Cerrado» en su propio título: la regla del repositorio es que una ficha cerrada sale
del tablero, y estas llevaban dos días sin salir.

**Se mueven enteras y sin tocar una coma.** Dos de ellas explican **un error de medición** —una
ficha que afirmaba que no se podía curar a nadie, y la medición que lo hizo creer— y esa es
justamente la parte que había que conservar: se archiva el registro, no el resultado.

Salieron del tablero el 2026-09-06, con la poda que lo bajó de 1471 líneas.

---

## P3 · Cerrado: no faltaba curar, faltaba el gesto rápido del elenco (medido mal el 2026-09-05, cerrado el 2026-09-06)

**Esta ficha decía «nadie puede curar a nadie, ni a sí mismo» y afirmaba que `PonerDano` era «lo
único que mueve puntos de golpe en toda la web, y siempre hacia abajo». Las dos frases eran
falsas**, y se dejan aquí explicadas en vez de borradas porque el error de medición es el que
importa recordar.

**Cómo se midió mal:** se buscó `heal` y `curar` en
`apps/web/src/features/character-sheet/api.ts` y dio cero, y de ahí se concluyó que curar no
existía. **Pero la curación no se llama `curar` en el código: es un delta con signo positivo por
la misma función `changeHp`.** Buscar el nombre en vez del comportamiento es lo que dejó fuera
`apps/web/src/features/character-sheet/PuntosDeGolpe.tsx`, donde `aplicarDelta(1)` ya mandaba
`delta: signo * Math.abs(n)` con signo positivo, detrás de un botón que se llama literalmente **«Me
curo»** (con su hermano «Recibo daño» — la decisión I9 de dos gestos con nombre, sin signo en el
campo, ya estaba aplicada ahí). Y el servidor (`changeHp`,
`apps/api/src/characters/character-sheet.service.ts`) ya trataba el delta positivo entero: topa
por arriba, borra las salvaciones de muerte al levantar a alguien desde 0 y rechaza revivir en
silencio a quien tiene tres fracasos — probado en
`apps/api/src/characters/character-sheet.service.spec.ts` (buscar «curar» en ese fichero) desde
antes de esta fecha.

**Lo que sí faltaba era mucho más pequeño**: el gesto rápido de la mesa,
`apps/web/src/features/sessions/elenco/PonerDano.tsx`, solo mandaba `delta: -n`, y su propia
cabecera decía que es «la ruta que un DM usa de verdad en combate — no abrir la hoja entera». Ahí,
y solo ahí, no se podía curar. **Cerrado en la tarea 14 (2026-09-06):** `PonerDano.tsx` ahora
expone también `Curar`, el mismo componente (`Gesto`) con el signo del delta cambiado, montado en
`MandosDeCombatiente.tsx` como un tercer botón junto a «Daño» y «Condición» — para personajes de
jugador y para PNJ instanciados por igual, porque los dos usan el mismo `MandosDeCombatiente`.
Prueba: `apps/web/src/features/sessions/elenco/__tests__/Curar.test.tsx`.

## P2 · Cerrado: el bando de un combatiente ya se elige y se corrige desde pantalla (2026-09-05, paseo de uso — cerrado el 2026-09-06)

**Cerrada por el plan `2026-09-05-iniciativa-y-bando.md`, tareas 7 y 9b/10.** Las dos pantallas que
faltaban ya existen:

- **Se elige al meter a alguien en combate**: `EmpezarCombate.tsx` manda `sides` con un radio por
  combatiente (`apps/web/src/features/encounters/EmpezarCombate.tsx:133`, `radiogroup`; el envío
  en `:245`), con una sugerencia rellenada (grupo propio `ALLY`, PNJ de la mesa `ENEMY`) que el DM
  ve y cambia de un clic — commit `c8395ec`.
- **Se corrige después**, desde la ficha del elenco y desde la del PNJ por igual: el componente
  compartido `CorregirBando` (`apps/web/src/features/sessions/elenco/CorregirBando.tsx:41`) llama a
  `PATCH .../combatants/:cid/side` — commits `149bd93` (radios, ficha del PJ) y `6259e1a` (extraído
  y cableado también en la ficha del PNJ, que era el caso principal: el enemigo).
- **El vocabulario vive una sola vez**, en `apps/web/src/dominio/combate.ts` (Ruling R7 del ledger
  de esa noche, no en `features/encounters/` como proponía el plan, porque lo importan dos
  features distintas) — commit `d5f5fc7`.
- **El bando se distingue por palabra, no por color** (D-OP-7): ninguna de las dos pantallas usa
  `--success`, que no existe.

**Lo que queda, y no es esta ficha:** `setSide` y el reajuste de `activePosition` todavía no
emiten suceso por el canal en vivo — ficha propia, ver «P2-eventos» más abajo.

## Decisiones del autor sobre 2C y 2D (2026-09-03) — cerradas

Se le presentaron con recomendación y fuente, y las contestó todas. Están en el
[alcance de 2C](./superpowers/specs/2026-09-03-fase-2C-alcance-design.md) §4 y en el
[plan de 2C](./superpowers/plans/2026-09-03-fase-2C-plan.md). Resumen: reloj en segundos ·
condición que caduca sola sin borrarse · tabla de CD sembrada del SRD · petición de tirada dentro
de 2C · los cuatro modos de tirada, cerrando el agujero de la tirada ciega · **tablas de críticos y
pifias opcionales y apagadas por defecto**, porque el DM de esta mesa las usa · statblocks
importados del JSON del SRD publicando lo revisado · y **el despliegue, al cerrar la fase 2, con
una partida de prueba real de dos jugadores**.

**Lo único que quedó anotado para más adelante:** *«opciones de personalización»* de las criaturas
del SRD —poder clonar o editar una dentro de una campaña, como ya se puede con un objeto—. No entra
en 2D; lo que 2D tiene que hacer es **no impedirlo** con la forma de su tabla.
