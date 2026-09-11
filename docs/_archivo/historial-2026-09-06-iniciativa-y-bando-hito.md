# Historial — el hito del plan «la iniciativa la piden los jugadores, el DM elige el bando» (2026-09-05/06)

**Entrada de `07-historial.md` movida entera el 2026-09-11**, quinto corte de la sesión de cerrar
fichas: el fichero llegó a 1001 de sus 1000 líneas y esta era la entrada completa más antigua. Es la
entrada del hito de la tanda; el detalle por tarea de T5 y T14 ya vivía en
`historial-2026-09-05-y-06-iniciativa-y-bando-por-tarea.md`. No se reescribe.

---

## Cada jugador pide su propia iniciativa, y el DM puede decir de qué bando está cada uno (2026-09-05/06, plan `iniciativa-y-bando`)

**Qué se entregó.** Las quince tareas del plan
[`2026-09-05-iniciativa-y-bando.md`](./superpowers/plans/2026-09-05-iniciativa-y-bando.md),
más una tarea fuera de plan (la X) y una añadida en marcha (la 9b). Detalle por tarea, commit y
revisión en el ledger
(`.superpowers/sdd/2026-09-05-iniciativa-y-bando/progress.md`); aquí el resumen:

- **La iniciativa deja de tirarla el servidor por todo el mundo.** Al empezar un combate, cada
  jugador recibe una petición de tirada (la misma tubería de `roll-requests` que ya sabe pedir,
  resolver contra la hoja, aplicar ventaja y gastar inspiración) y el DM solo tira la de los
  suyos. El encuentro nace `PREPARING` mientras faltan respuestas, y pasa a `ACTIVE` solo cuando
  la última llega — o si el DM fuerza el arranque sin esperar a los rezagados (`force-start`), o
  cancela y el encuentro **se borra entero**, sin dejar suceso: «no es historia, es un clic
  deshecho».
- **El bando ya se elige y se corrige desde pantalla.** El diálogo de empezar combate manda un
  bando por combatiente con una sugerencia rellenada (el grupo propio `ALLY`, los PNJ de la mesa
  `ENEMY`), y se corrige después desde la ficha del elenco y desde la del PNJ por igual, con un
  componente compartido. El vocabulario en español se escribe una sola vez, en
  `apps/web/src/dominio/combate.ts`.
- **Un ataque elige a quién apunta, y el servidor dice si acierta.** El cuadro de ataques (2B)
  llevaba semanas resolviendo contra la CA sin que ninguna pantalla lo llamara; ahora el jugador
  elige objetivo entre los combatientes del encuentro (nunca `useCharacters`, que nunca trae un
  PNJ) y ve el veredicto traducido, con el orden relativo al bando de quien ataca.
  Los PNJ se enseñan en la columna del elenco (tarea 9b), cruzando la lista contra los
  combatientes del encuentro sin duplicar consulta ni tocar el servidor.
- **Curar entra por la misma puerta que el daño.** El gesto rápido de la mesa (`PonerDano`)
  solo mandaba daño; ahora un mismo componente (`Gesto`) expone «Daño» y «Curo», los dos sobre
  `useChangeHp`, que ya trataba el delta positivo desde antes de esta tanda.
- **Un interbloqueo real de Postgres** (40P01), encontrado por la carrera de la tarea 3: tres
  transacciones cruzaban el orden de bloqueo al recolocar el orden de turnos. Se cierra con
  `orderBy: { id: "asc" }` y un `SELECT … FOR UPDATE` sobre la fila del encuentro, dentro de
  `recolocar` — la puerta única de «iniciativa + grupo → orden» — para que serialice también
  `setInitiative` y `start`.
- **`setInitiative` conserva de quién es el turno por identidad**, no por número, cuando se
  corrige el orden con el combate en marcha: sin esto, renumerar podía saltar un asalto y mover
  el reloj seis segundos sin que nadie hubiera pasado de turno.
- **Tres fichas cerradas o reescritas por medición, no por suposición**: el «500 intermitente»
  de `updateSheet` resultó ser una carrera de `supertest` (`app.listen(0)` por petición), no del
  servicio — 900 peticiones HTTP reales concurrentes, cero fallos; «nadie puede curar» era una
  búsqueda del nombre equivocado (`heal` en vez del delta positivo); y el bando sin pantalla,
  cerrado de verdad (ver `docs/06-pendientes.md`).
- **Un crítico de revisión real**: renombrar el botón de atacar rompió un e2e de otra pantalla
  (`inventario.spec.ts`) que nadie corrió porque a ese agente se le había prohibido Playwright.
  Se arregló y se barrió `apps/web/e2e/` entero antes de cerrar la tarea.

**Por qué.** Es el hueco que impedía jugar la partida de prueba con dos cuentas: hasta ayer, un
combate con jugadores de verdad los dejaba sin decir nada y sin saber de qué lado estaban.

**Decisiones tomadas sin el autor**, treinta y cuatro, en
[`docs/decisiones.md`](./decisiones.md) (`E-IB-1` a `E-IB-34`) — varias contra el propio plan:
la transacción que fusiona cerrar la petición y escribir la iniciativa, `end()` sin tocar porque
la salida es el `DELETE`, el vocabulario en `dominio/` y no en `features/encounters/`, y que T14
no construía una puerta nueva porque la mitad ya existía.

**Cómo revertirlo.** No hay un solo commit: son ~40 commits entre `2e3563a` y `8466c82` (ver
`git log --oneline 2e3563a~1..8466c82` contra `main`). Revertir de verdad exige deshacer también
la migración que añade `PREPARING`, `encounterId` y `cancelledAt` a `RollRequest` y el índice
recontado — no es un `git revert` limpio. Lo razonable, si hiciera falta deshacerlo, es un
`git revert` en bloque de todo el rango, de más reciente a más antiguo, y `prisma migrate` para
la reversión del esquema.

---
