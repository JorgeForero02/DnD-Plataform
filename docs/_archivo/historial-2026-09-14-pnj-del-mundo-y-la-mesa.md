# Historial — El PNJ del mundo y la mesa (2026-09-14)

**Una entrada de `07-historial.md` movida entera el 2026-09-18**, al insertar la entrada de la
Task 3 de 3A.2 (`SpellbookService`): el fichero quedó en 1005 de sus 1000 líneas y esta era la
entrada completa más antigua. No se reescribe.

---

## El PNJ del mundo y la mesa (2026-09-14) — cerrada en rama, fusionada por la tarde (ver arriba)

Qué — rama `pnj-del-mundo/antes-del-paso-3` (9 commits sobre `ce0cc36`;
[plan](../superpowers/plans/2026-09-14-pnj-del-mundo-y-la-mesa.md) de la
[spec](../superpowers/specs/2026-09-13-pnj-del-mundo-y-la-mesa-design.md)). **`Character.entityId`**
une el cuerpo en la mesa con su ficha del mundo (solo `NPC` de la campaña, `SetNull`; se redacta a
`null` para quien no ve la ficha, en las seis lecturas). **Revelar es una sola acción**
(`POST …/characters/:id/reveal`): instancia, ficha del mundo y plantilla creada suben a `PLAYERS`
en una transacción, con `NPC_REVEALED`; `hide` baja solo la instancia (`NPC_HIDDEN`, `DM_ONLY`, para
que el canal en vivo despierte a la mesa); revelar la ficha desde el wiki —a mano o por el motor de
reglas— sube sus cuerpos vivos. **Sacar del combate** (`DELETE …/combatants/:id`) renumera y, si
tenía el turno, avanza por el mismo `empezarTurno` que «Pasar turno» (extraído de `advanceTurn`),
con `COMBATANT_LEFT` sin nombre si la mesa no lo veía. En la mesa: «Revelar a la mesa» / «Ocultar» /
«Sacar del combate» en el menú «…» del elenco, «oculto · Revelar» en el orden de turnos, criaturas en
«Revelar algo», el nombre enlaza a la ficha del mundo; se enlaza al bajar una criatura, desde la hoja
(«Ficha del mundo») y desde la ficha del mundo («A la mesa»); «Plantilla» / «En la mesa» dicen a qué
afecta cada visibilidad. Proceso: D-CF-65 con el cierre acotado de la spec §5 — sin revisión por
tarea; **una** revisión Opus de la rama (0 críticos, 4 importantes, 9 menores) y **una** ola que los
cerró todos; e2e de API `pnj-del-mundo` 17/17; Playwright solo en lo tocado, 26/26, con la prueba
nueva a dos navegadores en verde a la primera. Decisiones D-CF-72..86 en
[decisiones.md](../decisiones.md) (D-CF-73 enmendada por la revisión: `SPECIFIC_PLAYERS` también sube).
Por qué — la primera partida de prueba en producción: el jugador no veía al enemigo en el orden,
«Revelar algo» revelaba la ficha y no al bicho, y no había forma de sacar a nadie del combate.
Revertir — no fusionar la rama; las tres migraciones (`20260914100000`, `…100100`, `…100200`) son
aditivas y llevan su `-- Revertir:`. **Sin fusionar ni desplegar**: los dos gestos son del autor.
