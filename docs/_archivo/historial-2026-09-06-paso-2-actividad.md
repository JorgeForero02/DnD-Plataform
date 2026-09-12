# Historial — Paso 2: la actividad, sus cinco formas y la economía de la mesa (2026-09-06/07)

**Una entrada de `07-historial.md` movida entera el 2026-09-12**, al escribir la línea de cierre de
HP-9a («sintonizar cuenta», Task 3): el fichero quedaba en 1005 de sus 1000 líneas y esta era la
entrada completa más antigua. No se reescribe.

---

## Paso 2 — la actividad, sus cinco formas y la economía de la mesa (2026-09-06/07)

**Qué.** Las once tareas del plan [`2026-09-06-paso-2-actividad.md`](./superpowers/plans/2026-09-06-paso-2-actividad.md),
en nueve commits de tarea —dos de ellos juntan dos tareas cada uno (9+10 y 3+11)— más dos commits
de corrección de sus e2e: la economía de acciones del combate (`Combatant.actionUsed/bonusUsed/reactionUsed/movementUsed`,
repuesta al empezar el turno de quien entra); `Origen`, un número que nunca miente sobre su
procedencia; las cinco actividades del SRD (`ataque`, `salvacion`, `dados`, `utilidad`, `prueba`)
con su propio `dados`; usarla gastando por las puertas que ya existían (`changeHp`,
`RollRequestsService.create`, `ConditionsService.apply`, con el patrón `tx?` extendido a los
tres — con un hueco real que quedó abierto en uno de ellos, ver
[06-pendientes.md](./06-pendientes.md)); una subclase por personaje y no todas a la vez; conceder
una actividad desde el catálogo con sus usos y sus escalas; y la Furia de punta a punta, con la
economía visible en la mesa.

**Por qué.** Un mago sigue sin hechizos hasta el paso 3, y este paso existía para que quepan: la
tarea 0 mapeó diez conjuros a mano contra el borrador del plan y ocho no cabían, así que el esquema
se corrigió antes de escribir código (D-P2-1 a D-P2-6 en [decisiones.md](./decisiones.md)).

**Cómo se comprobó.** Trece de trece tareas de la tanda con implementador —contando también el
plan botín, más abajo, y sin contar la tarea 0, que fue papel sin implementador— mordieron algo
real en su primera revisión con contexto limpio; ninguno de los hallazgos lo vio quien implementó. Los tres más graves de este plan: una fuga por 403 en `gastar` sobre un PNJ
escondido; `raging` interpretada por el servidor sin estar en la lista de claves reservadas —un
jugador se llevaba +2 de daño permanente gratis—, reincidencia exacta del agujero que se cerró para
`helped`; y un interbloqueo real en el orden de los candados de `changeHp`. Detalle completo, tarea
a tarea, en el bloque «Avance» del plan y en `.superpowers/sdd/2026-09-06-tanda-paso2-y-botin/progress.md`
(local, no viaja con el clon).

**Cómo revertir.** Once commits independientes de `2bd7769` a `2228341`/`8d4de37`
(`git log --oneline 7e7f92b..HEAD`); revertir uno deshace su tarea. Dos llevan migración:
`combatant_action_economy` (las cuatro columnas de `Combatant`) y `character_subclass`
(`Character.subclassKey`) — revertir el código deja las columnas sin escritor, sin dato que
perder. **`character_subclass` tiene efecto sobre datos ya en producción**: un personaje de nivel
≥ `chosenAtLevel` pierde los rasgos de su camino hasta que alguien elija uno, que es el arreglo y no
una regresión — ver [05-datos.md](./05-datos.md). Nueve fichas de deuda quedaron abiertas en
[06-pendientes.md](./06-pendientes.md), la más urgente antes del paso 3 siendo la autorización de
`changeHp` y de `RollRequestsService.create` sobre actividades de otro personaje.
