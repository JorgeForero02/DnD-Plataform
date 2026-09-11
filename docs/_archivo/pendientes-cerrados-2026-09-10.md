# Pendientes cerrados — la tanda del 2026-09-10 (cerrar fichas, cubo B)

**Las fichas que la sesión del 2026-09-10 cerró con código**, una por commit, después de la poda
del mismo día ([`pendientes-cerrados-2026-09-10-poda.md`](./pendientes-cerrados-2026-09-10-poda.md)).
Cada una entró por los cuatro pasos de `04-convenciones.md` y por el ciclo de la sesión: **prueba
que falla antes, arreglo, mutación que la vuelve a poner roja, `pnpm verify` en verde**. La
medición de cada una va debajo de su título; el texto original de la ficha, entero, después.

**No se editan.** Si algo de aquí se reabre, se abre ficha nueva en `06-pendientes.md` citando
esta.

## J6 · `ENTITY_REVEALED` viaja con la carga vacía cuando lo emite el motor

**Cerrada el 2026-09-10.** `rules-engine/rules-engine.service.ts`, `applyRealEffects`, caso `REVEAL_ENTITY`: lee el nombre de la ficha antes del `updateMany` y lo manda en el payload (`entityName`), igual que el camino de la pantalla. Prueba: `apps/api/test/rules-engine.e2e-spec.ts`, «la revelación automática cuenta QUÉ se reveló (ficha J6)». **Roja antes del arreglo** —`entityName` ausente— y verde después; esa misma ausencia es la mutación.

**Texto original:**

| **J6** | **`ENTITY_REVEALED` viaja con la carga vacía cuando lo emite EL MOTOR** (`{type}` a secas): no dice qué ficha ni a qué visibilidad | Abierto **por la mitad que importa**. Remedido el 2026-09-08: el camino de la pantalla ya manda el nombre —`entities/entities.service.ts:306` escribe `entityName`—, pero `rules-engine/rules-engine.service.ts:515` sigue emitiendo el payload pelado, y **ese es justo el camino de la revelación automática**, o sea el momento dramático que la ficha nombra. La fila decía «viaja con la carga vacía» sin distinguir los dos caminos |

## J11 · `POST /rules` no valida al armar que la entidad del efecto sea de tu campaña

**Cerrada el 2026-09-10.** `rules-engine.service.ts`, `requireEffectEntitiesInCampaign`, llamada desde `create` y desde `update` cuando llegan `effects`: los `entityId` de `REVEAL_ENTITY`/`HIDE_ENTITY` y el `originEntityId` de `RAISE_SIGNAL` tienen que existir **en esta campaña**, o 400 con la misma frase para «no existe» y «es de otra» (sin oráculo). Pruebas: tres en `apps/api/test/rules-engine.e2e-spec.ts` (ficha J11) — rojas antes (201/200), verdes después. **Mutación por piezas:** quitando solo la llamada de `update()` enrojece únicamente la prueba del `PATCH` (1 failed, 2 passed).

**Texto original:**

| **J11** | **`POST /rules` no valida al armar que la entidad del efecto sea de tu campaña** | Abierto e inerte: `applyRealEffects` y la auditoría acotan por `campaignId`, así que la regla queda `BROKEN`. Sería más limpio rechazar al armar |

## N4 · El listado de propuestas no trae el nombre de la regla

**Cerrada el 2026-09-10.** `rules-engine.service.ts`, `listProposals`: `include: { rule: { select: { name } } }` y cada fila sale con `ruleName`. La pantalla (`features/rules/Propuestas.tsx`) lo pinta del servidor y **deja de recibir la lista de reglas** —`PanelDeReglas.tsx` ya no se la pasa— y desaparece el respaldo «regla borrada», que no podía darse (`RuleTrace.rule` es `onDelete: Cascade`). Tipo `PropuestaRow = RuleTraceRow & { ruleName }` en `features/rules/api.ts`. Pruebas: e2e de API «el listado de propuestas trae el nombre de la regla (ficha N4)», roja antes (`undefined`); RTL «la fila dice el nombre de la regla que trae el servidor», roja antes (la pantalla reventaba sin `reglas`). Solo texto: sin cambio de maquetación, no pide navegador.

**Texto original:**

| **N4** | **El listado de propuestas no trae el nombre de la regla**, solo su identificador | Abierto, **confirmado midiendo el 2026-09-08**: `RulesEngineService.listProposals` devuelve las filas de `ruleTrace` sin `include` de la regla, así que el nombre no viaja, y `features/rules/Propuestas.tsx:38` lo cruza contra la lista de reglas con «regla borrada» de respaldo. **El dato precisa, que la fila no daba:** el aviso de una propuesta **sí** lo lleva —`rules-engine/rules-engine.service.ts:406` manda `ruleName` en el `RULE_PROPOSAL`—, así que el arreglo es un `include` en el listado, no inventar el dato |

## P3 · Un enlace duplicado devuelve 500 en vez de 409

**Cerrada el 2026-09-10.** `links/links.service.ts`, `create`: el `P2002` del índice único `(fromId, toId, label)` se traduce a `ConflictException` («Ese enlace ya existe entre estas dos fichas»). Prueba: `apps/api/test/links.e2e-spec.ts`, «the same link twice is a 409, not a 500» — roja antes (500), verde después. **Lo que se midió de paso y NO se arregla aquí:** con `label` nulo, Postgres no considera iguales dos `NULL`, así que dos enlaces sin rótulo entre las mismas fichas siguen entrando. Cerrarlo es un índice único parcial (`WHERE label IS NULL`) = migración → del autor. Dicho en el comentario del código y en el 07; no se abre ficha.

**Texto original:**

- **Un enlace duplicado devuelve 500 en vez de 409** (choca contra el índice único de
  `EntityLink`). Tarea 1.6.

## P3 · Aceptar una invitación no es transaccional

**Cerrada el 2026-09-10.** `invites/invites.service.ts`, `accept`: gastar el enlace y sentar al miembro van en una sola `PrismaService.transaction`, y **gastar es un `updateMany` condicional** (`usedAt: null, revokedAt: null`) — la base decide quién gana; quien pierde recibe el mismo 400 que un enlace inventado. Prueba: `apps/api/test/invites.e2e-spec.ts`, «three people accepting the same one-use invite at once: exactly one gets in» — roja tres veces de tres antes (`[201,201,201]`), verde después; unitaria nueva «loses the race … seats nobody». **Mutación:** quitar solo la condición del `updateMany` vuelve a sentar a tres (1 failed).

**Texto original:**

- **Aceptar una invitación no es transaccional.** Tarea 1.4. *(La segunda mitad de esta línea —«el
  token no caduca ni es revocable»— la cerró el plan 11 y está archivada.)*

## P3 · Las concesiones de visibilidad no se validan contra los miembros de la campaña

**Cerrada el 2026-09-10.** `entities/entities.service.ts`, `requireGrantsToMembers`, llamada desde `create` y `update`: cada id de `specificPlayerIds` tiene que ser miembro de la campaña o la petición entera es 400 (misma frase para «no existe» y «no es miembro»). Prueba: `apps/api/test/entities.e2e-spec.ts`, «una concesión a alguien que NO es miembro … se rechaza con 400 y no se guarda» — roja antes (200 y la fila guardada), verde después; unitaria «create() rejects a grant to someone who is not a member». **Nota sobre la propia ficha:** su «corrección» del 2026-09-08 decía que `specificPlayerIds` ya no existía en ninguna capa; existe en `entity.schema.ts` y aquí. Lo que se llama `grantedUserIds` es el suceso, no la entidad.

**Texto original:**

- **Las concesiones de visibilidad no se validan contra los miembros de la campaña**: se puede
  conceder acceso a alguien de fuera. Queda inerte, pero se guarda. Tarea 1.5. **El símbolo que
  esta línea citaba —`specificPlayerIds`— ya no existe en ninguna capa**, y se corrigió el
  2026-09-08: hoy son `grants` en la base y `grantedUserIds` en el borde. El hueco sigue igual —
  `entities/entities.service.ts:200` borra y vuelve a crear las concesiones, y el `requireMember`
  de ese método comprueba **a quien llama, no a los concedidos**.

## P3 · Los `grants` son inertes si la visibilidad no es `SPECIFIC_PLAYERS`, y aun así se aceptan sin aviso

**Cerrada el 2026-09-10.** `entities.service.ts`, `requireGrantsToMembers` recibe además la visibilidad que va a quedar (la del cuerpo, o la guardada en `update`) y rechaza con 400 cualquier `specificPlayerIds` no vacío fuera de `SPECIFIC_PLAYERS`. Desaparece el descarte silencioso que `create` hacía. Los tres emisores (`EntityEditor`, `EscribirFicha`, `seed-demo.mjs`) ya solo mandan la lista con esa visibilidad, medido antes de cambiar el servidor. Prueba: e2e «concesiones con una visibilidad que no es SPECIFIC_PLAYERS se rechazan, no se ignoran» — roja antes (201), verde después.

**Texto original:**

- **Los `grants` son inertes si la visibilidad no es `SPECIFIC_PLAYERS`**, y aun así se
  aceptan sin aviso. Tarea 1.5.

## 1.18a · El `NotFoundException` de `GET /auth/me` quedó inalcanzable

**Cerrada el 2026-09-10, y por el lado que la ficha no nombraba:** no se borró la rama muerta, se borró **la consulta repetida** que la sostenía. `JwtStrategy.validate` ya carga la fila del usuario en cada petición (es el precio de invalidar tokens al cambiar la contraseña, D-POD-7); ahora devuelve también `displayName`, y `GET /auth/me` contesta con `req.user` sin volver a `findById`. Pruebas: `auth.controller.spec.ts` «me() returns the user the strategy already loaded — no second lookup, no dead 404» y `jwt.strategy.spec.ts` (el nombre viaja, el hash no) — la suite del controlador no compilaba antes del arreglo y la del strategy estaba roja. e2e de auth 7/7.

**Texto original:**

- **El `NotFoundException` de `GET /auth/me` quedó inalcanzable**: `JwtStrategy` ya rechaza con
  401 al usuario borrado antes de llegar al controlador. Mejor comportamiento, rama muerta.
