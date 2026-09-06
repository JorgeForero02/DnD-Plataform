# Historial archivado — detalle por tarea del plan «iniciativa y bando» (2026-09-05/06)

Movidas enteras desde `docs/07-historial.md` el 2026-09-06, al escribir la entrada de hito de la
tanda entera («Cada jugador pide su propia iniciativa...»), que las resume. **Nada se ha
resumido ni reescrito aquí**: el texto es idéntico al que tenían en el fichero vivo.

## Tarea 5: corregir el bando en marcha, y el asalto que `setInitiative` podía saltarse (2026-09-05, plan «iniciativa y bando»)

**Qué.** `EncountersService.setSide` (`PATCH .../combatants/:cid/side`, DM-only, no toca el orden
—no llama a `recolocar`—) y un arreglo en `setInitiative`: con el combate `ACTIVE`, corregir la
iniciativa de un combatiente que compartía `activePosition` con sus idénticos podía dejar ese
número apuntando a un combatiente distinto del que de verdad tenía el turno («robo de identidad»),
y en el caso de un combatiente solo en su posición, **también** el último asalto podía subir de
ronda y mover el reloj de campaña sin que nadie pasara turno de verdad. Ahora se sigue el turno
**por identidad**: se mira quién ocupaba `activePosition` antes de recolocar y se relee su
posición nueva; si ya no está, cae a la posición inmediatamente anterior de las que queden, nunca
a -1.

**El mecanismo real, verificado y no el hipotetizado.** El primer análisis (mío, y el que encargó
la tarea) hablaba de `posiciones.indexOf(activePosition)` → -1. Es imposible por esta vía:
`recolocar` renumera denso y el número de posiciones nunca DECRECE al corregir un combatiente —
`activePosition` sigue siendo siempre un índice válido. Lo que de verdad se pierde es a quién
señala ese número, y solo cuando el corregido estaba solo en su posición (no compartida) ese mismo
número puede convertirse en el último índice del asalto sin serlo de verdad, que es donde el
reloj se mueve sin permiso. Verificado con matemática y con simulación en la ronda de arreglo 1.

**Ronda de arreglo 1 — un crítico real, y una regresión propia que solo el e2e completo destapó:**

- **C-1:** `setSide` comprobaba `requireDM(campaignId, userId)` pero el `where` del `updateMany`
  no colgaba de `sessionId` — un DM podía dar el par `encounterId`/`combatantId` de OTRA campaña y
  la escritura se confirmaba antes de que `get()` devolviera el 404 (y como el método no corre en
  transacción, ese 404 no deshacía nada). Arreglado con los mismos dos escalones que ya usa
  `setInitiative`: `sesion(campaignId, sessionId)` y `encounter: { sessionId }` en el `where`.
  Cazado por un e2e nuevo que relee la fila ajena tras el 404 — sin esa relectura la prueba pasaba
  igual con el fallo, porque el 404 ya salía antes también.
- **La propia suite e2e (`encounters.e2e-spec.ts`) se rompió al ejecutarla entera**, no por C-1:
  el arreglo del asalto perdido hace que `activePosition` deje de estar siempre en 0 tras una
  corrección con el combate `ACTIVE` —ahora sigue a quien de verdad tiene el turno—, y una prueba
  vieja asumía «tres pases, siempre desde la posición 0» para completar una ronda. Con una tirada
  real que dejara a otro combatiente en la posición 0 antes de la corrección, el asalto se
  completaba en menos de tres pases y la prueba salía roja de forma intermitente (dependiente del
  dado). Se corrigió calculando cuántos pases hacen falta desde el estado real en vez de
  suponerlo — verificado con **ocho ejecuciones seguidas** en verde tras el cambio.
- Dos pruebas unitarias nuevas que el primer envío no tenía: corregir a quien NO tiene el turno
  (el caso más frecuente) y la rama de caída cuando a quien tenía el turno no se le encuentra tras
  recolocar (código muerto hoy — ninguna ruta borra combatientes desde `setInitiative` — pero
  cubierto con el mock en vez de dejarlo sin ejercitar).

**Lo que se dejó fuera a propósito.** Ni `setSide` ni el reajuste de `activePosition` emiten
suceso: no viajan por el canal en vivo hasta que las tareas 8 y 10 (la pantalla) decidan su
vocabulario. Ficha abierta en `docs/06-pendientes.md` (P2-eventos).

**Cómo se comprobó.** Mutación obligatoria, dos veces: quitar `requireDM` de `setSide` pone su
403 en rojo por `TypeError` (no por otro 403 coincidente — se revisó el motivo exacto, como pedía
la tarea 4); quitar el ajuste de `activePosition` pone en rojo las cuatro unitarias del asalto
perdido. Las dos deshechas después. `pnpm verify` en verde; el e2e completo de `encounters` en
verde ocho veces seguidas.

**Cómo revertir.** Tres commits independientes: el de `setSide`, el del asalto perdido, y el de
esta ronda de arreglo (C-1 + la prueba e2e cross-campaña + el cálculo dinámico de pases). Ninguno
lleva migración.

## Tarea 14: el brief pedía una puerta nueva de curar; la puerta ya existía (2026-09-06, plan «iniciativa y bando»)

**El brief (`task-14-brief.md`) partía de dos afirmaciones falsas**, verificadas antes de tocar
código: «hoy no se puede subir un punto de golpe a nadie» y «no hay otra puerta». `PuntosDeGolpe.tsx`
en la hoja de personaje ya mandaba deltas positivos por los botones «Recibo daño»/«Me curo», y el
servidor (`changeHp`) ya los procesaba enteros — tope por arriba, borrado de salvaciones de muerte
al levantar a alguien desde 0, rechazo a revivir en silencio a quien tiene tres fracasos —, probado
desde antes de esta fecha en `character-sheet.service.spec.ts`.

**Lo único que faltaba era el gesto rápido de la mesa.** `PonerDano.tsx`
(`apps/web/src/features/sessions/elenco/`), el cajón que un DM usa en combate sin abrir la hoja
entera, solo mandaba `delta: -n`. Se refactorizó a un componente interno (`Gesto`) parametrizado
por `modo: "dano" | "curar"`, y se exportan dos gestos con nombre — `PonerDano` y `Curar` —, no una
segunda puerta: mismo hook `useChangeHp`, mismo cajón, el signo del delta y el rótulo cambiados.
`Curar` no ofrece tipo de daño ni «Crítico» porque el servidor los descarta o los ignora en la rama
de curar. Montado en `MandosDeCombatiente.tsx` como tercer botón junto a «Daño» y «Condición», para
personajes de jugador y PNJ instanciados por igual (ambos pasan por el mismo componente).

**Regla citada, SRD 5.1, "Damage and Healing" → "Healing" (inglés):** *"Hit points regained are
added to current hit points... A creature's hit points can't exceed its hit point maximum, so any
hit points regained in excess of this number are lost."* El tope es del servidor
(`clamp(before + input.delta, 0, maxHp)`); la pantalla nueva no recorta nada, solo enseña lo que
vuelve.

**`docs/06-pendientes.md`** — la ficha «Nadie puede curar a nadie» se reescribió (no se borró):
baja de P1 a P3-cerrada, con el error de medición documentado (se buscó el nombre `curar`/`heal` en
vez del comportamiento — un delta positivo). Se abrió una P1 nueva y distinta: la resistencia,
vulnerabilidad e inmunidad al daño no se aplican nunca a un personaje de jugador porque
`changeHp` solo las consulta si `character.statblockRef` existe, y un PJ nunca lo tiene
(`characters.service.ts:68`) — los rasgos de raza que darían resistencia (enano/veneno,
tiefling/fuego) son hoy prosa decorativa en el catálogo, sin dato estructurado. Se deja explícitamente
sin cerrar: conectar ese origen es una feature de varios ficheros (un `kind` nuevo en el catálogo,
datos reales en `races.ts`, agregación en `resolve.ts`, lectura nueva en `changeHp`), no un cambio
de una línea, y forzarla dentro de esta tarea habría sido media tarea vestida de entera.

**Cómo se comprobó.** `apps/web/src/features/sessions/elenco/__tests__/Curar.test.tsx`, prueba
nueva. **Mutación**: cambiar el signo del delta en la rama `curar` de `Gesto` puso roja la primera
prueba por el motivo correcto (`delta: -7` en vez de `delta: 7`); revertido. `pnpm verify` en
verde completo (build, lint, formato, check:docs, check:estado, check:historial, unitarias).

**Cómo revertir.** Un commit: `PonerDano.tsx`, `MandosDeCombatiente.tsx`, el test nuevo y los dos
documentos. Sin migración, sin cambio de servidor.
