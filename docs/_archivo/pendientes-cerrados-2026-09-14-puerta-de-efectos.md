# Pendientes cerrados el 2026-09-14 — tanda «puerta de efectos»

Movidas enteras desde `06-pendientes.md` al cerrar la tanda (rama `puerta-de-efectos/antes-del-paso-3`,
sin fusionar ni desplegar). Ver `07-historial.md`, «La puerta de efectos», y la spec
`superpowers/specs/2026-09-12-la-puerta-de-efectos-design.md`.

> **Cierre.** P2-4 se cerró con la segunda puerta (`changeHpFromEffect`, `createFromEffect`, tx
> obligatorio y sin ruta; `3206331`); P2-5 con `RollRequest.pendingEffect` aplicado en `answer`
> dentro de la transacción que cierra la petición (`fc8b369`); la ficha XP con `Character.xp`,
> `XP_AWARDED`, `POST /campaigns/:id/xp`, la regla `progresion` y la propuesta de `end()` (`ba2ca48`,
> `283b468`), tras pasar sus dos preguntas por los cuatro pasos: D-CF-68 (reparto **propuesto**, no
> aplicado) y D-CF-69 (sin XP a PNJ de statblock).

## XP: no existe; se sube por hito (2026-09-13)

**Abierta, decidida para la tanda «puerta de efectos».** No hay columna de experiencia, tabla de
umbrales (*Character Advancement*: 300, 900, 2 700 … 355 000) ni XP por VD (*Experience Points by
Challenge Rating*; el VD ya está en cada statblock). Hoy subir de nivel es por hito: lo pulsa el DM
(D-CF-66). Alcance: `Character.xp`, «dar XP» a uno o varios desde la mesa, la hoja enseña
«1 250 / 2 700» y **avisa** que toca subir sin subir sola (avisar y dejar), y una regla de la mesa
`HITO` / `XP`. Dos preguntas para los cuatro pasos antes de planificar: (1) ¿reparto automático de la
suma de VD al terminar un combate, o siempre a mano? (2) ¿XP también para PNJ jugables? Cabe en
puerta de efectos porque comparte `character-sheet.service`, la mesa, el hilo y el fin de combate
(`encounters.service`), y no toca el catálogo del paso 3. Se añade a la spec de puerta de efectos
antes de escribir su plan.

### P2-4 · La autorización de `changeHp` y el `requireDM` de `RollRequestsService.create` dejan inusables media docena de conjuros de clérigo (2026-09-07)

**DECIDIDO por el autor el 2026-09-07: se construye la segunda puerta** (opción A de las tres que
se le plantearon; ver `D-P2-11` en [decisiones.md](./decisiones.md)). Sigue **abierto** porque falta
implementarlo: es su propia tarea, no entra en la tanda corta de arreglos. Las otras dos opciones
quedaron descartadas y no se re-litigan — «solo el DM, y el clérigo le pide la curación» esquiva hoy
una puerta que el paso 3 necesita igualmente para el daño con salvación, las condiciones sobre un
enemigo y los PG temporales sobre un compañero; y aflojar `requireEditable` a secas abriría el
`PATCH` de cualquier personaje ajeno.

**Medido el 2026-09-07 al decidirlo, y la ficha original se quedaba corta: la puerta está cerrada
por los dos lados.** En `roll-requests.service.ts:114` —remedido el 2026-09-08; la cita anterior
decía `:104`—, incluso la ruta interna que recibe un `tx`
—la que usa el motor— vuelve a comprobar `miembro.role !== "DM"`. No hay rendija por la que entre
una actividad de jugador hoy.

**El estado original de la ficha, que sigue siendo la descripción del problema.** `changeHp` exige dueño-o-DM
(`character-sheet.service.ts`, `autorizarEdicionConCliente` / `requireEditable`): un clérigo no
puede curar al personaje de otro jugador con una actividad, porque el objetivo de la curación no es
quien la usa. Y `RollRequestsService.create` empieza por `requireDM`
(`roll-requests.service.ts:78`): toda actividad de salvación —`salvacion`— es hoy exclusiva del DM,
así que un jugador no puede lanzar un conjuro que pida tirada de salvación a otro personaje.

Sin arreglarlo, media docena de conjuros de clérigo nacen inusables el día que el paso 3 los
importe. **El arreglo propuesto es una segunda entrada** en los dos servicios, cuyo permiso no sea
«puedes editar esta ficha» sino «vienes de un efecto ya autorizado sobre un objetivo que `canView`
te deja ver» — el mismo desdoblamiento que ya existe entre `record` y `recordFromEngine`
(`docs/01-arquitectura.md`). Aflojar `requireEditable` a secas abriría el `PATCH` de cualquier
personaje ajeno; llamar con el id del DM sería un diputado confundido de manual.

### P2-5 · El daño de una actividad de salvación no se aplica al responderla (2026-09-07)

**Abierto, decisión de una funcionalidad y no de pegamento.** `ActivitiesService.usar` crea la
petición de tirada de una `salvacion` con su `dc` y sus `dados`, pero `RollRequestsService.answer`
no aplica el daño ni la mitad al recibir la respuesta: hoy `usar` devuelve un aviso de que el daño
no se aplica solo, y la mesa lo arbitra a mano leyendo el resultado de la tirada. Cablear
`salvacion.siSalva` (`z.enum(["ninguno", "mitad"])`, `packages/shared/src/activity.schema.ts`)
dentro de `answer()` es la tarea que falta, no un arreglo de esta tanda.
