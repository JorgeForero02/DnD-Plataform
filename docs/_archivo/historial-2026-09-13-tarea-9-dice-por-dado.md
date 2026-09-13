# Archivo — Tarea 9 del pulido: el servidor dice qué dado cayó, `dice[]` por dado (2026-09-13)

Movida entera desde `docs/07-historial.md` el 2026-09-13, al escribir la entrada de la Task 14
bis del pulido (el mundo como árbol con detalle): el fichero estaba en 977 de 1000 y la entrada
nueva no cabía. Era la entrada completa más antigua.

---

## Tarea 9 del pulido: el servidor dice qué dado cayó — `dice[]` por dado (2026-09-13, C5)

Qué — `dadosTirados(terms: DiceTermResult[]): DieRolled[]`, nueva en `apps/api/src/dice/dice.ts`
junto al evaluador (es su conocimiento, no del servicio): empareja cada dado de `rolled` con sus
caras y dice si cuenta, consumiendo `dropped` como multiconjunto para que `[4, 4]` con un
descartado tache uno y no los dos — el mismo truco que ya usaba `dadosDeLaTirada` en la web.
`dieRolledSchema` (`{ sides, value, kept }`, `packages/shared/src/roll.schema.ts`) se añade,
**opcional**, a `desglose` (rama `revealed: true` de `rollResultSchema`) y al payload
`ABILITY_ROLL` de `game-event.schema.ts`; `rolls.service.ts` calcula `const dice =
dadosTirados(resultado.terms)` junto a `rolls`/`kept`/`dropped` y lo pone en los dos sitios.

Por qué — la pantalla (Task 10, web) necesita pintar cada dado con sus caras para poder tachar
el descartado dado a dado; hasta ahora solo tenía tres listas paralelas (`rolls`, `kept`,
`dropped`) y tenía que reconstruir el emparejamiento a mano, que es exactamente el fallo que ya
había en la web con `dadosDeLaTirada`. Con `dice[]` el emparejamiento se hace una sola vez, en el
servidor, con la misma lógica que ya lo resolvía.

Pruebas — tres unitarias nuevas en `dice.spec.ts` (empareja caras y marca kh/kl y relanzados;
con dos iguales y un descartado tacha uno y no los dos; una constante no es un dado) y una en
`rolls.service.spec.ts` (con ventaja, `dice` trae los dos d20 con su `kept`); un e2e nuevo en
`rolls.e2e-spec.ts` (`2d6+1d20` devuelve `dice` con tres entradas, caras `[6, 6, 20]` en orden, y
el suceso del log lo trae igual). `pnpm --filter @dnd/api test -- dice rolls`: 90/90. E2E de
`rolls`: 14/14. Mutación: quitar el `splice` que consume `pendientes` como multiconjunto hace
fallar «tacha uno y no los dos» (recibía dos dados con `kept: false` en vez de uno) — restaurado
con `cp`.

Revertir — `git revert` del commit; `dice` es opcional en ambos schemas y su ausencia no rompe
nada que ya exista, así que revertir no tiene trampa de datos que limpiar.
