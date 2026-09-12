# Archivo — Cerrar fichas, tanda 1: las de API pura (2026-09-10)

Movida entera desde `docs/07-historial.md` el 2026-09-12, al añadir la línea de la ronda de
arreglo de la Tarea 4 del pulido (los dos defectos reales que la medición encontró): el fichero
quedaba en 1004 de 1000 y esta era la entrada completa más antigua. Sin reescribir.

---

## Cerrar fichas, tanda 1 — las de API puras (2026-09-10)

Una por commit, cada una con su prueba roja antes y su mutación. El texto entero de cada ficha y
su medición están en
[`pendientes-cerrados-2026-09-10.md`](./pendientes-cerrados-2026-09-10.md).

- **J6** — el `ENTITY_REVEALED` del motor lleva `entityName`, como el de la pantalla
  (`rules-engine.service.ts`, `applyRealEffects`). **Por qué:** era el camino de la revelación
  automática y el hilo no podía decir qué apareció. **Revertir:** quitar el `findFirst` y el campo
  del payload; el esquema lo tiene opcional, nada más se rompe.
- **J11** — armar una regla comprueba que la ficha de cada efecto es de esta campaña, y devuelve
  400 sin distinguir «no existe» de «ajena» (`rules-engine.service.ts`,
  `requireEffectEntitiesInCampaign`). **Por qué:** la regla quedaba `BROKEN` e inerte al disparar,
  o sea un botón que el servidor iba a rechazar. **Revertir:** quitar el método y sus dos
  llamadas; las tres pruebas J11 del e2e se ponen rojas.
- **N4** — cada propuesta llega con `ruleName` (`listProposals`, `include` de la regla) y la
  pantalla deja de cruzar el id contra la lista de reglas. **Por qué:** el aviso ya lo llevaba y
  el listado no; el «regla borrada» de respaldo era un caso imposible. **Revertir:** quitar el
  `include` y devolver a `Propuestas` la prop `reglas`.
- **P3 · enlace duplicado** — el `P2002` del índice único sale como 409 legible en vez de 500
  (`links.service.ts`, `create`). **Revertir:** quitar el `try/catch`. **De paso, medido y no
  arreglado:** dos enlaces **sin rótulo** entre las mismas fichas siguen entrando, porque Postgres
  no iguala dos `NULL` en el índice; cerrarlo es un índice parcial, o sea una migración del autor.
- **P3 · aceptar una invitación** — gastar el enlace y sentar al miembro van en una transacción,
  y el gasto es un `updateMany` condicional que decide la carrera (`invites.service.ts`).
  **Por qué:** tres peticiones a la vez entraban las tres por un enlace de un solo uso.
  **Revertir:** volver a los tres viajes sueltos; la prueba de carrera del e2e enrojece.
- **P3 · concesiones a no miembros** — `requireGrantsToMembers` en `create` y `update` de
  entidades: un id que no sea miembro tumba la petición entera con 400. **Por qué:** se guardaba
  una concesión inerte que se activaría sola el día que esa cuenta entrara. **Revertir:** quitar el
  método y sus dos llamadas.
- **P3 · grants inertes** — conceder a jugadores concretos con otra visibilidad es 400, no un
  descarte en silencio ni una fila inerte (`requireGrantsToMembers`, con la visibilidad
  resultante). **Revertir:** quitar la comprobación de visibilidad del método.
- **1.18a · `/auth/me`** — la rama muerta se va con la consulta repetida: `JwtStrategy.validate`
  devuelve `displayName` y el controlador contesta con `req.user`. **Revertir:** volver a
  `findById` en `me()`.
- **D4** — la lista de sesiones va por `scheduledAt` (desc, sin fecha al final) y no por
  `createdAt` (`sessions.service.ts`, `list`; D-CF-1). **Revertir:** volver al `orderBy` viejo.
- **P2 · `start()` con dos DM** — «suyos» es «su dueño es DM de la campaña», no «quien pulsó»
  (`encounters.service.ts`). Salió de «decide el autor» porque su premisa —no hay segundo DM—
  caducó con el plan 11. **Revertir:** volver a comparar con `userId`.
- **changeHp · rollEventId** — **no se cierra, vuelve a «decide el autor»**: «de ese personaje»
  rechazaría la tirada del atacante, y «reciente» pide un umbral que ninguna regla da.
- **J7** — **no se cierra, vuelve a «decide el autor»**: el motivo de una anulación no se guarda
  en ningún sitio (`overrides` es `{clave: número}`) y enseñarlo en la traza es un cambio de forma
  de un `Json` con datos escritos. Medición en el 06.
