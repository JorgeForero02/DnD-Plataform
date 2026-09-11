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

## D4 · La fecha de una sesión no la ORDENA el servidor

**Cerrada el 2026-09-10.** `sessions/sessions.service.ts`, `list`: `orderBy: [{ scheduledAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }]` — con fecha primero, de la más lejana a la más cercana (la próxima arriba, como el resto de listas de la casa), y las sin fecha detrás por creación (decisión `D-CF-1` en `decisiones.md`). Prueba: `apps/api/test/sessions.e2e-spec.ts`, «las sesiones con fecha van primero…» — roja antes (orden de creación), verde después. El taller (`PrepararSesion.tsx`, `siguientePlanificada`) ordena por su cuenta y no cambia.

**Texto original:**

| D4 | **La fecha de una sesión no la ORDENA el servidor.** Su primera mitad —«no se ve en la lista»— era falsa y se archivó el 2026-09-08 | P2 (bajado de P1: se ve, solo no ordena) | La fila **sí** pinta la fecha, con «sin fecha» cuando no hay: `pages/CampaignDetailPage.tsx:422`. Lo que sigue: `sessions/sessions.service.ts:189` ordena por `createdAt: "desc"`, así que la lista no va por cuándo se juega. **Las dos citas de la versión anterior de esta fila estaban desplazadas** y señalaban código de otra cosa |

## P2 · Con más de un DM en la campaña, `start()` reparte por «quien empieza», no por «es DM»

**Cerrada el 2026-09-10.** `encounters/encounters.service.ts`, `start()`: `suyos` = combatientes cuyo dueño es **un DM de la campaña** (`campaignMember` con `role: "DM"`), `ajenos` el resto. Quien empieza sigue tirando; cambia por quién. Prueba: `apps/api/test/iniciativa-repartida.e2e-spec.ts`, «un PNJ del OTRO DM es “suyo”…» — asciende a un segundo DM por el `PATCH` del plan 11, ese DM instancia un PNJ, y el primero empieza el combate: **roja antes** (`PREPARING`, con petición al PNJ del otro DM), verde después (`ACTIVE`, sin peticiones, iniciativas puestas). Las ocho suites e2e de encuentros en verde (56/56).

**Texto original:**

## P2 · Con más de un DM en la campaña, `start()` reparte por «quien empieza», no por «es DM» (2026-09-05, ronda de arreglo 1 de la tarea 2)

`EncountersService.start()` decide quién tira y a quién se le pide la iniciativa comparando
`Character.ownerId` contra `userId` —quien pulsó el botón de empezar el combate—, no contra «es un
DM de esta campaña» (`apps/api/src/encounters/encounters.service.ts:247-248`, remedido el
2026-09-08 — la cita anterior decía `:244-245`; el reparto vive en el par `suyos`/`ajenos`, y ese
nombre sobrevive al número. Antes, cita comprobada en
`04b6e2b` — el fichero se ha reescrito varias veces y el número se mueve).
`MembershipService` sí sabe contar cuántos DM quedarían en una campaña
(`apps/api/src/campaigns/membership.service.ts:82-90`), así que la información para distinguir
«mi PNJ» de «el PNJ de otro DM» existe, pero `start()` no la usa.

**El efecto, con dos DM en la misma campaña:** si el DM A empieza el combate, un PNJ del DM B cae
del lado de los `ajenos` y recibe una petición de iniciativa que no tiene por qué —el DM B no es
un jugador esperando su turno, es el otro árbitro de la mesa. **Se queda así a propósito**: el
criterio "quien empieza el combate tira los suyos" es simple y correcto para el caso de un solo
DM, que es el único que existe hoy en la plataforma (una campaña no tiene ninguna pantalla para
invitar a un segundo DM). Corregirlo sin ese caso real delante sería una regla especulativa.

**Cierra cuando** exista una forma de tener dos DM en la misma campaña Y alguien lo note en la
práctica — hasta entonces, queda anotado para que la próxima persona que toque `start()` no
lo redescubra desde cero.

**Pasada por los cuatro pasos el 2026-09-10, y sale del cubo «decide el autor»:** la premisa de
arriba ya no es cierta —**sí** hay forma de tener dos DM: `PATCH` de papel del plan 11
(`apps/api/src/members/`)—, el cambio es corto y duradero (`suyos` = «su dueño es DM de la
campaña», que `MembershipService` ya sabe contestar) y la prueba que lo ve fallar es una unitaria
con dos DM. No cae en ninguno de los cuatro casos: lo decidió un agente, no el autor. **Se arregla.**

## M10b · Editar en silencio (la hidra falsa)

**Cerrada el 2026-09-10 como «ya es así» (D-CF-11).** No existe ningún suceso `ENTITY_UPDATED` en `packages/shared/src/game-event.schema.ts`: editar una ficha revelada no escribe nada en el registro, así que el DM ya cambia la hidra sin que nadie se entere. Los apuntes del jugador son filas de `Comment` aparte y no se tocan. La regla «las notas del jugador NO se borran» queda escrita en `05-datos.md`.

**Texto original:**

| **M10b** | **Editar en silencio** — la hidra falsa (respuesta 2). El DM cambia una ficha ya revelada y nadie se entera. Es un problema distinto del de revocar, y por eso se parten | Sin resolver. Hoy `EntityVisibilityGrant` se crea y no se quita | «Fase 1 ampliada» según el documento de respuestas; no depende del motor. Su regla difícil ya está decidida y no hay que perderla: **las notas del jugador NO se borran**, porque el terror nace de que sus apuntes contradigan su memoria |

## H8 · El motor evalúa dentro de la petición que escribió el suceso

**Cerrada el 2026-09-10 midiendo, no suponiendo (D-CF-4).** Medición desechable contra Postgres real, un jugador abriendo una ficha con N reglas automáticas `ENTITY_OPENED` → `REVEAL_ENTITY` encima: **0 reglas 50 ms · 10 reglas 110 ms · 50 reglas 380 ms** (medianas de 7), o sea **~6,5 ms por regla y apertura, lineal**, con una traza escrita por regla y apertura. Síncrono con el tope de diez saltos que ya existe aguanta una mesa real de sobra; el umbral para pensar en una cola es un disparador con más de ~50 reglas, y ninguna campaña está cerca.

**Texto original:**

| **H8** | El motor evalúa **dentro de la petición** que escribió el suceso | Con diez saltos y varias reglas, abrir una ficha puede tardar. Propuesta: síncrono con tope y cola si molesta — **hay que medirlo, no suponerlo** |

## H9 · Las propuestas caducan

**Cerrada el 2026-09-10 como decisión (D-CF-5): no caducan solas.** El DM las ve en su bandeja y las rechaza; caducarlas por tiempo sería el servidor arbitrando la mesa, que es lo que el paso 2 declinó hacer con los bandos y con terminar un combate. Si una bandeja vieja molesta, la señal correcta es la fecha en la fila, no un borrado.

**Texto original:**

| **H9** | **Las propuestas caducan.** Una propuesta de hace tres sesiones es ruido | Falta decidir el plazo |

## D7 · `Campaign.ownerId` es una segunda fuente de verdad que nadie consulta

**Cerrada el 2026-09-10 como decisión (D-CF-6).** `ownerId` es **quién la creó**, dato histórico; la autoridad es el rol de `CampaignMember` y así seguirá. Ninguna comprobación lo lee y ninguna debe leerlo. Escrito en `05-datos.md`.

**Texto original:**

| D7 | **`Campaign.ownerId` es una segunda fuente de verdad que nadie consulta** | P3 | Se escribe en `campaigns/campaigns.service.ts:21` —remedido el 2026-09-08; la cita anterior decía `:20`— y se emite en el suceso de la 25. Ninguna comprobación de autorización lo lee: todas pasan por `membership.requireDM`, que mira `CampaignMember.role`. La web lo declara en su tipo y tampoco lo usa |

## D6 · `User.isAdmin` no tiene ninguna puerta de concesión

**Cerrada el 2026-09-10 como decisión (D-CF-7).** Se concede a mano (`UPDATE "User" SET "isAdmin" = true`) y así se declara en `05-datos.md`. Y deja de ser una columna sin oficio: el reinicio de contraseña por administrador (D-CF-18, cierra D8) es su primera puerta de uso.

**Texto original:**

| D6 | **`User.isAdmin` no tiene ninguna puerta de concesión**: es el permiso más potente del sistema y no lo gobierna nada | P2 | `common/visibility.ts:23` es el `if (viewer.isAdmin) return true;` que salta toda la matriz; remedido el 2026-09-08, `isAdmin` fuera de sus lectores **no tiene un solo escritor** —los dos únicos aciertos son un comentario de `links/links.service.ts` y un `?? false` de `notifications/notifications.service.ts`—: solo un `UPDATE` a mano en Postgres. (La cita anterior, `:16`, se había desplazado) |

## A3-invitaciones · Invitaciones con usos máximos

**Cerrada el 2026-09-10 como decisión (D-CF-8).** Un enlace por persona se queda (E-11-*): el motivo de esta ficha —«un enlace eterno no»— lo cerraron la caducidad y la revocación del plan 11. Una invitación de N usos no la ha pedido nadie y añade una columna.

**Texto original:**

| **A3-invitaciones** | **Invitaciones con usos máximos** | Caducidad y revocación las cerró el plan 11 (`schema.prisma`, `expiresAt`/`revokedAt`, `bf1b1c9` 2026-09-05). Queda «usos máximos», que es una columna nueva: **migración**, y por eso no se arregla de pasada |

## P4 · No hay política de retención de datos escrita

**Cerrada el 2026-09-10 escribiéndola (D-CF-9), en `05-datos.md`:** nada se borra solo; una cuenta o una campaña se borra a petición de su dueño, por su botón; el registro de sucesos vive tanto como su campaña. Se revisa el día que haya usuarios que no sean la mesa del autor — y ese día lo dice el autor.

**Texto original:**

- **No hay política de retención de datos escrita.** Hace falta antes de que el sistema deje
  de ser de uso personal. Ver [05-datos.md](./05-datos.md).

## M11 · Que un jugador comparta lo que le revelaron

**Cerrada el 2026-09-10 como decisión (D-CF-10): es un gesto social fuera del sistema.** Una concesión creada por un jugador sería una segunda puerta de «quién ve qué» y `canView` es dueño único. Si un jugador quiere que otro lo sepa, se lo cuenta, o se lo pide al DM, que sí concede.

**Texto original:**

| **M11** | **Que un jugador comparta lo que le revelaron** (respuesta 3) | Decisión abierta: o crea una concesión de verdad —que el DM ve y puede revocar, coherente con M10— o es un gesto social fuera del sistema. La primera es más trabajo y mucho más interesante |

## P3 · El taller CONVIVE con las listas CRUD de `CampaignDetailPage`

**Cerrada el 2026-09-10 como decisión (D-CF-2): conviven, con papeles.** Medido: el taller tiene tres cajones —Escribir ficha, Preparar sesión, Lo que sabe la mesa— y las pestañas de la campaña son Resumen, El mundo, Sesiones, Reglas, Dados, Tablas, Ajustes más los cajones Personajes/Bestiario/Catálogo. Solo se solapan en **escribir una ficha**. Papeles: el taller es donde el DM **prepara** (captura rápida, sesión, revelar); «El mundo» es el **archivo** (buscar, filtrar, editor completo, enlaces, comentarios). No se cae nada. **De paso:** `TableroTelarana` sigue montado aunque D4 (2026-09-05) lo dio por retirado a favor de una línea de tiempo que no existe; es una decisión sin ejecutar, no una ficha nueva.

**Texto original:**

- **El taller CONVIVE con las listas CRUD de `CampaignDetailPage`.** Nadie ha perdido nada, pero la
  sustitución de la §2 de la auditoría **no está completa** hasta que se decida qué se cae de ahí.

## R1 · El límite global de 100 peticiones por minuto y por IP puede quedarse corto en una mesa real

**Cerrada el 2026-09-11 (D-CF-17).** `apps/api/src/common/user-or-ip-throttler.guard.ts` sustituye al `ThrottlerGuard` global: con un JWT **verificado** el cubo es `user:<sub>`; sin token o con firma inválida, la IP de siempre. Login, registro y aceptar invitación no llevan token y siguen por IP con su `@Throttle` estrecho — el límite por IP se queda donde protege. `AuthModule` exporta `JwtModule` para que el guard verifique con el mismo secreto. Pruebas: `apps/api/test/rate-limit.e2e-spec.ts` (ficha R1): dos usuarios desde una IP → el primero agota sus 100 y el segundo sigue en 200; cien tokens **falsos con `sub` distinto** → un solo cubo (429). **Mutación:** cambiar `verifyAsync` por `decode` enrojece la segunda (401 en vez de 429) — y la primera versión de esa prueba NO lo cazaba porque todos los tokens falsos llevaban el mismo `sub`; se corrigió antes de dar por buena la mutación. No se subió el número: sigue en 100.

**Texto original:**

| **R1** | **El límite global de 100 peticiones por minuto y por IP puede quedarse corto en una mesa real.** Lo descubrió una prueba: cien tiradas seguidas empezaban a recibir 429 a mitad de bucle, y la prueba estaba midiendo el limitador en vez de los dados | No es teórico. Una mesa juega **desde la casa de una persona o por una VPN compartida**, así que los cinco jugadores pueden salir por **una sola IP**; y el sondeo del log de la sesión gasta del mismo presupuesto que las tiradas. Un combate largo con la línea de tiempo abierta podría rozarlo. **No se sube el número a ciegas** —eso es aflojar un control de seguridad sin datos—: lo que hace falta es **medir** cuántas peticiones gasta de verdad una sesión con la pantalla del motor abierta (2A.17), y entonces decidir si el reparto correcto es por usuario en vez de por IP para las rutas con sesión iniciada, dejando el límite por IP donde de verdad protege, que es el acceso sin autenticar |

## D8 · Recuperar la contraseña olvidada sigue bloqueada: no hay servicio de correo

**Cerrada el 2026-09-11 (D-CF-18) sin servicio de correo.** `POST /admin/password-resets` (`apps/api/src/auth/admin.controller.ts`, tras `JwtAuthGuard` + `AdminGuard` de `common/admin.guard.ts`, con el límite estrecho de `AUTH_RATE_LIMIT`) pone una temporal a otra cuenta reutilizando `updatePasswordHash`, que sella `passwordChangedAt` y caduca los tokens del afectado. `isAdmin` viaja en `/auth/me` y en login/registro (`AuthUser` de `@dnd/shared`) para que la pantalla sepa qué ofrecer; el bloque «Reiniciar la contraseña de una cuenta» vive en `pages/AccountPage.tsx` y solo se pinta a un administrador. Pruebas: e2e de API `admin-password-reset` (4; rojas antes: 404 y `isAdmin` ausente), RTL en `AccountPage.test.tsx` (2; roja la del administrador), y **Playwright `admin-reinicio.spec.ts` con dos navegadores** (2/2 en verde: el amigo pierde la sesión y entra con la temporal; el bloque cabe en la ventana, medido). **Mutación:** `AdminGuard` devolviendo `true` enrojece el 403. El e2e concede `isAdmin` por el CLI de Prisma **sin shell** (`execFileSync`), porque la ruta del repo lleva `&`; `playwright.config.ts` deja la URL de la base del slot en `E2E_DATABASE_URL`.

**Texto original:**

| **D8** | **Recuperar la contraseña olvidada sigue bloqueada: no hay servicio de correo** | Era "se decide junto al despliegue", y el despliegue ya está aquí. Hoy, un usuario que olvide su contraseña **no tiene salida**: el DM no puede reiniciarla y no hay correo que mandar. Hace falta decidir proveedor (y sus variables) o aceptar explícitamente que la primera mesa vive sin recuperación |

## M2B-14 · Los objetos mágicos genéricos del SRD se pueden sembrar y no están

**Cerrada el 2026-09-11 como decisión (D-CF-22), al abrirla:** «cinco filas» era falso. *Weapon, +1, +2, or +3* del SRD 5.1 **no es un objeto**: es una plantilla que se aplica a cualquier arma base (una espada larga +1 necesita el dado de la espada larga), y `ResolvedItem` exige un arma concreta. Eso es exactamente «encantar» del bloque D del paso 3 (efecto sobre un objeto con `restrictions.type: weapon`). Y **hoy ya se puede**: el DM crea «Espada larga +1» como objeto de campaña con los efectos `weaponAttack`/`weaponDamage` (+1) y `ac` (+1 para armadura y escudo), que existen desde 2B. La cabecera de `items-srd.ts` («ningún objeto mágico») sigue siendo cierta para el catálogo estático y deja de ser una restricción sobre la licencia: es una elección de forma.

**Texto original:**

| **M2B-14** | **Los objetos mágicos genéricos del SRD se pueden sembrar y no están** | **Arma +1/+2/+3, Armadura +1 y Escudo +1 sí están en el SRD 5.1**, bajo la misma CC BY que el resto: la cabecera del catálogo dice «ningún objeto mágico» y eso es más restrictivo de lo que la licencia pide. Con los efectos `weaponAttack`/`weaponDamage` ya abiertos, sembrarlos es transcribir cinco filas. **Pasada por los cuatro pasos el 2026-09-10: no es decisión de producto, es una transcripción que la fuente contesta** (SRD 5.1, «Magic Items»: *Weapon, +1, +2, or +3* · *Armor, +1, +2, or +3* · *Shield, +1, +2, or +3*); la cabecera restrictiva la escribió un agente. **Se siembra**, con la cita en el commit. Comprobado en [el contraste de reglas](./superpowers/specs/2026-09-03-contraste-de-reglas-2B.md) |

## P3 · El suceso de archivar no se lee desde la mesa con una sesión abierta

**Cerrada el 2026-09-11 (D-CF-19, salida (a)).** `game-events.service.ts`, `list`: con `sessionId`, el listado trae los sucesos de esa sesión **más** los de campaña sin sesión escritos entre su `startedAt` (o `createdAt`) y su `endedAt` si está cerrada — «se archiva a X», «entra Marta», «cambia de bando» aparecen en el hilo mientras se juega, y una sesión cerrada no absorbe lo que pase meses después. 404 si la sesión no es de la campaña, después de `requireMember`. Pruebas: `apps/api/test/hilo-mixto.e2e-spec.ts` (3; rojas antes), unitarias de `game-events` (72). Mutación: quitar la rama `sessionId: null` y quitar el `lte` enrojecen cada una su prueba. **De paso:** `/rolls?sessionId=` pasa por el mismo `list()` y se ensancha igual; sus suites siguen en verde. Implementado por subagente (Sonnet), revisado (Opus) con una ronda de arreglo: el tope superior lo puso la revisión, no la decisión.

**Texto original:**

## P3 · El suceso de archivar no se lee desde la mesa con una sesión abierta (2026-09-05, plan 06)

**Medido, no supuesto.** `characters.service.ts:157` escribe `CHARACTER_ARCHIVED` **sin
`sessionId`** —archivar es un acto de la campaña, no de una partida—, y
`game-events.service.ts:143` filtra estricto: con `sessionId` en la consulta, los sucesos de
campaña quedan fuera. Como `MesaDeSesion.tsx:73` pasa siempre la sesión abierta, **la línea «Se
archiva a X» no aparece en el hilo mientras se juega**. Y el DM en reposo tampoco la ve, porque sin
sesión ve el taller, que no tiene hilo (`MesaDeSesion.tsx:138`).

**Dónde sí se lee hoy, y está probado:** la mesa en reposo de un jugador —el único caso en que el
hilo se pinta con el registro de la campaña entera—, en
`apps/web/e2e/archivar.spec.ts`.

**No se arregló aquí, y el motivo es la frontera.** Las dos salidas razonables se salen del plan 06
(`solo apps/web/src`) o abren un frente: **(a)** que el registro de la mesa mezcle los sucesos de
la campaña sin sesión con los de la sesión abierta —decisión de producto sobre qué es «el hilo», no
un arreglo—; **(b)** que `archive` reciba la sesión en curso, que es `apps/api` y además convierte
un acto de campaña en uno de partida. **Descartado de entrada** filtrar en el cliente: el servidor
ya no manda esos sucesos, así que no habría nada que filtrar.

Es hermano de **P3-archivar** del plan 03 —que arregla a **quién** llega el suceso
(`grantedUserIds`)— pero no el mismo: aquel es de visibilidad y este de **encuadre**. Los dos
tienen que estar para que el registro cuente la verdad.

## H7 · Una regla que apunta a una ficha borrada

**Cerrada el 2026-09-11 (decisión: se rearma editando el objetivo, y el servidor lo comprueba).** `rules-engine.service.ts`, `update`: si llega `status: "ARMED"` sin `effects`, los efectos **guardados** pasan por `requireEffectEntitiesInCampaign` (J11); una regla cuyo objetivo se borró no se rearma contra nada (400, misma frase), y con un efecto válido en el cuerpo sí (200). Prueba: `apps/api/test/rules-engine.e2e-spec.ts`, describe «ficha H7», roja antes (200). Mutación: quitar la comprobación enrojece. Lo que la ficha dejaba sin decidir —«si se puede seguir armando»— queda decidido por el código: no sin arreglar el objetivo. Subagente Sonnet, revisión Opus.

**Texto original:**

| **H7** | Una regla que apunta a una ficha **borrada** | Queda **rota y marcada**, nunca se descarta en silencio. Falta decidir si se puede seguir armando |

## Sección entera · Dejado por E0, la prueba de ida y vuelta de TipTap (2026-09-02)

**Cerrada el 2026-09-11 (D-CF-12): TipTap sale del repositorio.** Las dos notas hablaban de «cuando E1 monte el editor», y E1 nunca lo montó: cero imports de `@tiptap` en `apps/web/src`, `EscribirFicha.tsx` es un `<textarea>` con Markdown, y los seis paquetes vivían en `dependencies` sin consumidor (D-OP-16 los movió ahí dando por hecho el editor). Se quitan los seis paquetes, el lock y `scripts/e0-tiptap-roundtrip.mjs`; una prueba en `apps/web/src/__tests__/` afirma que ningún `@tiptap/*` vuelve. Si algún día se quiere editor rico, es ficha nueva con su decisión; la lista de extensiones que estas notas exigían va con ella.

**Texto original:**

## Dejado por E0, la prueba de ida y vuelta de TipTap (2026-09-02)

- **TipTap descarta tablas, imágenes y listas de tareas sin decir nada** si no se registran
  `TableKit`, `Image`, `TaskList` y `TaskItem`. No lanza, no avisa: el Markdown entra con la
  tabla y sale sin ella. El script lo demuestra corriéndolo sin `--completo`. Cuando E1
  monte el editor, **esa lista de extensiones es parte del contrato**, no una preferencia,
  y conviene que una prueba la fije.
- **La normalización de Markdown es real aunque sea inofensiva:** `*` pasa a `-`, `_x_` a
  `*x*`, la contrabarra de salto duro a dos espacios. Es estable —el segundo viaje ya no
  cambia nada—, pero significa que **abrir un documento en el editor y guardarlo sin tocar
  nada produce un diff**. Si algún día hay historial de versiones, habrá que decidir si eso
  cuenta como una edición.

## P6 — Node 20 del proyecto, sin migrar (2026-09-01)

**Cerrada el 2026-09-11 (D-CF-13): Node 22 LTS.** Los cuatro pines a la vez —`apps/api/Dockerfile`, `apps/web/Dockerfile`, `.github/workflows/ci.yml` (dos jobs) y `engines.node` de los dos `package.json`— y una prueba en `apps/web/src/__tests__/` que los lee y falla si uno se queda atrás, que era justo lo que la ficha temía. 22 y no 24 porque es la LTS que Prisma 5.18 soporta oficialmente; Node 20 estaba sin parches desde el 2026-04-30 **y en producción**. Adelanta la mitad de D-OP-18 por seguridad. Las imágenes Docker las construye el orquestador antes de dar por cerrada la tanda; el despliegue lo lanza el autor.

**Texto original:**

## P6 — Node 20 del proyecto, sin migrar (2026-09-01)

- **La tarea 1.20 solo actualizó el runtime en el que corren las *acciones* de
  `.github/workflows/ci.yml`** (`actions/checkout` a v7, `pnpm/action-setup` a v6,
  `actions/setup-node` a v7, `actions/upload-artifact` a v7 — las cuatro corren ya sobre
  Node 24, según su propio `action.yml`), porque GitHub avisaba de que las forzaba a correr
  sobre un runtime distinto del que declaran. **Eso no toca el Node del propio proyecto**, que
  sigue fijado en 20 en tres sitios distintos y ninguno de ellos se tocó:
  `ci.yml` (`node-version: 20` en los dos jobs), `apps/api/package.json` y
  `apps/web/package.json` (`engines.node: ">=20"`), y `apps/api/Dockerfile` /
  `apps/web/Dockerfile` (`FROM node:20-slim`).
- **Importa porque Node 20 deja soporte de mantenimiento (LTS) el 2026-04-30** — para cuando
  se lea esto puede que ya lo haya dejado —, y a partir de ahí no recibe parches de seguridad.
  No es urgente hoy, pero es deuda con fecha de caducidad conocida, no indefinida.
- Migrar el Node del proyecto (probablemente a 22 LTS, o a la LTS vigente en el momento) es
  una tarea aparte, con su propio alcance: subir `engines`, `ci.yml` y ambos Dockerfiles a la
  vez para que no queden desincronizados, y comprobar con pruebas reales (`pnpm verify`,
  `pnpm --filter @dnd/api test:e2e`, `pnpm --filter @dnd/web e2e`, y build de las imágenes
  Docker) que nada se rompe con el cambio de runtime — no basta con que el CI actualizado en
  esta tarea siga en verde, porque eso no ejercita esa migración en absoluto.

## P3 · `stampSessionNoteSchema` acepta el sello vacío

**Cerrada el 2026-09-11.** `packages/shared/src/session.schema.ts`: `text` pasa por `.trim().min(1)` cuando viene; `undefined` sigue siendo el sello sin texto. Prueba en `packages/shared/src/__tests__/session.schema.test.ts` (roja antes con `""` y `"   "`); mutación: quitar `min(1)` enrojece. Los sellos vacíos ya escritos siguen en la base: no hay migración de datos y son inofensivos.

**Texto original:**

- **`stampSessionNoteSchema` acepta el sello vacío.** Los dos compositores lo impiden en pantalla;
  `text` sigue siendo `optional()` sin `min(1)`, así que una llamada directa a la API crea el sello
  que dice «Nota». Y los ya escritos siguen en la base, entrando en la crónica de cierre.

## P3.5 · No se puede borrar la fecha de una sesión desde la web

**Cerrada el 2026-09-11.** `updateSessionSchema.scheduledAt` admite `null` (`.extend` sobre el `partial()`; el de creación no cambia: no hay fecha vieja que quitar), `sessions.service.ts` ya propagaba `null`, y `SessionEditor.tsx` manda `scheduledAt: null` solo al editar una sesión que tenía fecha y vaciar el campo. Pruebas: e2e `sessions.e2e-spec.ts` (`PATCH { scheduledAt: null }` → 200 y nulo en la base) y RTL `SessionEditor.test.tsx`; rojas antes; mutación enrojece.

**Texto original:**

- **No se puede borrar la fecha de una sesión desde la web.** `createSessionSchema.scheduledAt`
  es `z.coerce.date().optional()`, **sin `.nullable()`**
  (`packages/shared/src/session.schema.ts`), así que no existe ningún valor que
  `SessionEditor.tsx` pueda enviar en el `PATCH` que signifique "quita la fecha que ya tenía
  la sesión": omitir la clave dice "no la toques", y no hay una representación de "vacío" que
  el esquema acepte para `Date`. Arreglarlo pide `.nullable()` en el esquema y `data.scheduledAt
  = null` en `sessions.service.ts` cuando llega `null` — cambios en `packages/shared` y
  `apps/api`, fuera de alcance de esta tarea (prohibido tocarlos en el brief de 1.13-fix). El
  resto de campos opcionales de sesión y personaje (`notes`, `race`, `class`, `bio`) sí se
  pueden vaciar desde el editor, enviando la cadena vacía en vez de omitir la clave.

## P3.5 · La precarga de la fecha en `SessionEditor.test.tsx` solo cuadra por coincidencia

**Cerrada el 2026-09-11 dentro de la Task 9c del plan** (`docs/superpowers/plans/2026-09-11-cerrar-fichas-tandas-2-a-5.md`): se añade la prueba con `20:00:30Z` que afirma lo que de verdad pasa —el input muestra `T20:00` y guardar sin tocar manda `T20:00:00.000Z`— y se retira el comentario que confesaba la coincidencia. *(Archivada al cerrar la tanda 2 porque la tanda 3 la ejecuta en el mismo encargo que las otras tres de una pieza; si la 9c no se cerrara, esta ficha vuelve.)*

**Texto original:**

- **La precarga de la fecha de una sesión en `SessionEditor.test.tsx` solo cuadra por
  coincidencia.** `<input type="datetime-local">` tiene precisión de minutos;
  `toDatetimeLocal` (`SessionEditor.tsx`) descarta los segundos al convertir el ISO del
  servidor al valor del input. El fixture de la prueba usa una hora con segundos en `:00`
  (`20:00:00Z`), así que el ida y vuelta (ISO → input → `new Date(...).toISOString()`) da el
  mismo valor y la aserción pasa. Con una hora real como `20:00:30Z` el input truncaría a
  `20:00` y la vuelta a ISO perdería los `:30`, así que la misma aserción **fallaría**. No es
  un fallo del código de producción — es una limitación real y aceptada de
  `datetime-local` (no hay forma de teclear segundos con ese tipo de input) — pero la
  prueba no lo demuestra hoy: pasa por la casualidad del fixture, no porque compruebe la
  pérdida. Comentario dejado en el propio fixture
  (`apps/web/src/features/sessions/__tests__/SessionEditor.test.tsx`).

## S12 · `listTracesQuerySchema` y `levelUpPreviewQuerySchema` viven fuera de `@dnd/shared`

**Cerrada el 2026-09-11.** Los dos esquemas de consulta viven en `packages/shared` (`rules-engine.schema.ts` y el nuevo `level-up.schema.ts`, exportados en `index.ts`); los controladores los importan de ahí y `apps/api/src/level-up/level-up.schema.ts` deja de definir el suyo; la web (`features/rules/api.ts`, `features/level-up/api.ts`) usa los tipos compartidos en vez de calcarlos. Prueba `packages/shared/src/__tests__/query-schemas.test.ts` (no compilaba antes). Sin mutación: es una mudanza. La excepción que la ficha ofrecía declarar («los esquemas de consulta pueden vivir junto al controlador») **no se declara**: la regla de `01-arquitectura.md` se cumple sin excepciones.

**Texto original:**

| **S12** | **`listTracesQuerySchema` y `levelUpPreviewQuerySchema` viven fuera de `@dnd/shared`** | `docs/01-arquitectura.md` dice que la forma de los datos vive en un solo sitio y **eso ya tiene dos excepciones**. O se declara la excepción (los esquemas de consulta locales a un endpoint pueden vivir junto al controlador) o se mueven |

## I1 · Cuatro nombres de arma en español sin contrastar

**Cerrada el 2026-09-11 contrastando con la fuente** —SRD 5.1 en español, Nosolorol, traducción de Ana Navalón, `https://srd.nosolorol.com/DD5/equipamiento/armas.html`—: **Guja, Mangual y Lanza de caballería eran correctos; *maul* es «Mazo de guerra», no «Almádena»**. Cambiada la cadena en `apps/api/src/rules/catalog/weapons.ts` con la cita al lado, y fijada en `reference.spec.ts`. `NOTICE.md` vuelve a ser cierto para las cuatro.

**Texto original:**

| **I1** | **Cuatro nombres de arma en español están sin contrastar con el PDF oficial** — «Guja» (glaive), «Almádena» (maul), «Mangual» (flail) y «Lanza de caballería» (lance) | Los nombres del catálogo son los de la traducción oficial de Wizards, no una traducción nuestra, y así lo declara `NOTICE.md`. Quien transcribió la tabla los señaló en su informe como los de menor confianza — **en el código no hay ninguna marca que los distinga del resto**, así que esta ficha es el único rastro. **Prioridad baja y coste mínimo** —cambiar una cadena—, pero si están mal, `NOTICE.md` afirma algo que no es. Se contrasta con el SRD 5.1 en español cuando haya acceso al documento |

## P3 · El aviso de `posiciones.ts` apunta al mando equivocado

**Cerrada el 2026-09-11 (Task 9a).** El comentario de `apps/web/src/features/sessions/taller/posiciones.ts` dice ahora lo que la prueba defiende: el mando que apila fichas contra el borde es el **anillo exterior** (`ANILLOS`), no el semieje, que deriva el tope de sí mismo. Solo comentario; la prueba que lo defiende ya existía.

**Texto original:**

- **El aviso de `posiciones.ts` apunta al mando equivocado.** Su comentario avisa de «si alguien
  sube un semieje y olvida el tope», pero **el tope se deriva del propio semieje**
  (`50 ± SEMIEJE_X`), así que subirlo sube el tope con él y no apila nada. El mando que **sí**
  dispara el recorte es **el anillo exterior**, que no está atado a nada: con `1.2` en vez de `1`,
  **731 de 3000** fichas quedan pegadas al borde **en silencio**. La prueba nueva lo defiende y su
  comentario lo dice; el del módulo sigue diciendo lo otro. **Corregir el comentario.**

## P3 · «Gana el más reciente» en `wikilinks.ts` es cierto por acoplamiento

**Cerrada el 2026-09-11 (Task 9b).** `resolverCitas` ordena ella misma por `createdAt` desc antes de elegir; ya no depende del `orderBy` de `entities.service.ts`. Prueba unitaria con la lista al revés (roja antes: elegía la vieja); mutación: quitar el `sort` enrojece.

**Texto original:**

- **«Gana el más reciente» en `wikilinks.ts` es cierto por acoplamiento.** `resolverCitas` es pura
  y se queda con **la primera de la lista**; que esa sea la más reciente depende de que
  `entities.service.ts:102` devuelva `orderBy: { createdAt: "desc" }` —remedido el 2026-09-08; la
  cita anterior decía `:77`—. **Nada en el módulo lo dice
  ni lo garantiza**: el día que un llamante le pase una lista ordenada por nombre, el desempate
  cambia sin que falle nada.

## 1.18b · El mensaje de «se cerró tu sesión» solo se limpia al iniciar sesión con éxito

**Cerrada el 2026-09-11 (Task 10), con una lección.** La primera versión limpiaba el `flash` en el cleanup del `useEffect` de `LoginPage`, y la RTL pasaba — pero la app monta bajo `StrictMode` (`main.tsx`), que ejecuta el cleanup **al montar**: el flash no se veía nunca en dev ni en Playwright, y lo cazó la revisión reproduciéndolo con `StrictMode`, no la suite. Arreglo real: se limpia **por cambio de ruta** (`FlashJanitor` en `App.tsx`: en cualquier ruta que no sea `/login`, `clearFlash()`), idempotente bajo `StrictMode`. RTL con `StrictMode` (el flash sí se ve al montar) y sin él (irse a `/register` lo limpia); mutación: quitar el janitor enrojece.

**Texto original:**

- **El mensaje de «se cerró tu sesión» solo se limpia al iniciar sesión con éxito.** Si el
  usuario se va a otra pantalla sin entrar, el mensaje sigue pendiente en memoria y reaparece la
  próxima vez que monte el inicio de sesión en la misma pestaña. Solo en memoria, desaparece al
  recargar.

## 1.18b · La rama de error del detalle de campaña dice «no existe o no tienes acceso» ante cualquier fallo

**Cerrada el 2026-09-11 (Task 11).** `CampaignDetailPage.tsx` distingue por `ApiError.status`: 404/403 → el texto de siempre (sin distinguirlos entre sí, regla de la casa); cualquier otro fallo (500, red caída) → «No se pudo cargar la campaña», «Vuelve a intentarlo en un momento» y un botón «Reintentar» que llama a `refetch`. RTL con `ApiError(…, 500)`; roja antes; mutación enrojece.

**Texto original:**

- **La rama de error del detalle de campaña dice «no existe o no tienes acceso» ante cualquier
  fallo de la consulta**, incluido un 500 pasajero o una conexión caída (no hay reintentos). Un
  mensaje que distinga por código sería más honesto, pero es un cambio más ancho que el hallazgo
  que lo motivó.

## U6-visibilidad · `VISIBILITY_CONFIG` no se exporta desde `ui/Badge.tsx`

**Cerrada el 2026-09-11 (Task 12).** Las cinco etiquetas de nivel viven una vez en `features/entities/visibilidad.ts` (`ETIQUETA_DE_NIVEL`), junto a `EXPLICACION_DE_NIVEL`; `Badge` las importa y conserva icono, borde y tono. Prueba que compara lo que `Badge` pinta con la tabla; mutación: una etiqueta a mano en `Badge` enrojece.

**Texto original:**

| **U6-visibilidad** | **`VISIBILITY_CONFIG` no se exporta desde `ui/Badge.tsx`** | La pantalla del motor no puede nombrar un nivel de visibilidad dentro de una frase sin duplicar las cinco etiquetas, así que parte la frase y pinta una insignia al lado |

## Sección · Dos acoplamientos no declarados, destapados al escribir sus pruebas (2026-09-04) — cabecera

*(Las dos viñetas están archivadas arriba, Tasks 9a y 9b; esta era su introducción.)*

**Texto original:**

Los dos salieron de probar por mutación módulos puros que nadie había probado. Ninguno es un
defecto hoy; los dos rompen en silencio el día que alguien toque lo que no sabe que sostienen.

## P4 · `CreateCampaignModal` mantiene un estado de error local que duplica `mutation.error`

**Cerrada el 2026-09-11 (Task 9d).** El `useState` de error desaparece y la pantalla pinta `mutation.error`; el botón de guardar lleva `aria-disabled` si llevaba `disabled`. RTL que hace fallar la mutación y afirma el mensaje; mutación: quitar el `<p>` del error enrojece.

**Texto original:**

- **`CreateCampaignModal` mantiene un estado de error local** que duplica `mutation.error`.
  Tarea 1.10.

## P4 · Avisos ruidosos que conviene callar bien, no silenciar

**Cerrada el 2026-09-11 (Task 13).** `ts-jest` ya no recibe los `.js` de `packages/shared/dist` (transform acotado a `.ts` en la configuración de e2e de la API) y `postcss.config.js` pasa a `.mjs`, con lo que Vite deja de avisar. Sin prueba automática: la evidencia es la salida antes/después pegada en el informe de la tarea (ledger local de la sesión).

**Texto original:**

- **Avisos ruidosos que conviene callar bien, no silenciar**: `ts-jest` se queja de compilar
  los `.js` de `packages/shared/dist` en los e2e, y Vite avisa de que
  `apps/web/postcss.config.js` no declara tipo de módulo. Ninguno lo tapa ESLint: son de
  otras herramientas.

## P1 (mitad) · `pnpm db:slot` falla en un worktree por el `&` de la ruta

**Cerrada el 2026-09-11 (Task 14).** `scripts/db-slot.mjs` deja el `shell: true` y llama a Prisma con `execFileSync(process.execPath, [prisma/build/index.js, …])`, el mismo patrón que `apps/web/e2e/admin-reinicio.spec.ts`; prueba en `apps/web/src/__tests__/` que barre el script (sin `shell: true`, con `process.execPath`). Reproducido antes (`Command "prisma" not found`) y ejecutado después con `WORKTREE_SLOT=1`. La otra mitad de la ficha —empujar `origin/main`— sigue siendo del autor.

**Texto original:**

**Y una segunda, del mismo día:** `pnpm db:slot` **falla en un worktree** (`Command "prisma" not
found`; el `shell: true` de `scripts/db-slot.mjs` tropieza con el `&` de la ruta
`D&D-Plataform`). El agente creó y migró su base a mano. Es reproducible.

## I6 · Las competencias de armadura no producen aviso todavía

**Cerrada el 2026-09-11 (Task 15).** El motor emite `armor_not_proficient` con la clave y la categoría de la armadura cuando el personaje la lleva sin competencia (`light`/`medium`/`heavy`/`shield`), el mismo mecanismo que `attack_not_proficient`; la web tiene su frase en `vocabulario.ts` (el `Record` es exhaustivo). Solo aviso — «cuenta y avisa, no impide». SRD 5.1, *Armor Proficiency*: «If you wear armor that you lack proficiency with, you have disadvantage on any ability check, saving throw, or attack roll that involves Strength or Dexterity, and you can't cast spells.» Unitaria del motor roja antes; mutación: no emitir enrojece.

**Texto original:**

| **I6** | **Las competencias de armadura no producen aviso todavía** | El catálogo ya las tiene en claves de máquina (`light`, `medium`, `heavy`, `shield`) desde 2B, y el SRD dice que llevar armadura sin competencia da desventaja en todo lo de Fuerza y Destreza y **prohíbe lanzar conjuros**. El motor ya sabe emitir avisos y el de armas ya existe (`attack_not_proficient`): falta el de armadura, que es el mismo mecanismo |

## H1b · «Estable» no sobrevive a la petición que lo produce

**Cerrada el 2026-09-11 (Task 16), por la salida que la ficha proponía: condición reservada.** Estabilizarse (tres éxitos, o 20 natural sin revivir) crea la condición reservada `stable`; `estadoDeMuerte` la lee (`currentHp === 0 && stable → "stable"`); cualquier daño a 0 PG o curación por encima de 0 la retira; un jugador no puede ponérsela a mano (403, misma regla que `raging`, D-P2-10); un 20 natural revive a 1 PG y por tanto no deja «estable», como dice el SRD. SRD 5.1, *Stabilizing a Creature*: «A stable creature doesn't make death saving throws, even though it has 0 hit points, but it does remain unconscious. The creature stops being stable, and must start making death saving throws again, if it takes any damage.» e2e de salvaciones de muerte roja antes; mutación: no crear la condición enrojece.

**Texto original:**

| **H1b** | **«Estable» no sobrevive a la petición que lo produce.** Estabilizarse con tres éxitos —o revivir con un 20 natural— pone los contadores de tiradas de muerte a cero, así que un `GET` posterior **no distingue «acaba de estabilizarse» de «acaba de caer a 0 PG»** | La hoja tiene que poder decir si el personaje está estable: es lo primero que pregunta la mesa. El estado correcto sale hoy **solo en la respuesta de la propia tirada**. **Y la solución ya existe sin migración**: `CharacterCondition` acepta **clave libre** desde 2A.12, así que «estable» cabe ahí como condición, que además es lo que es. Cuesta conectar dos módulos y decidirlo; se deja escrito para que 2A.10 no lo improvise |

## M2B-8 · `quantity` es absoluto donde el dinero es delta

**Cerrada el 2026-09-11 (Task 17).** `updateInventoryItemSchema` admite `quantityDelta` (entero ≠ 0), excluyente con `quantity`; el servicio lo aplica con `increment` dentro de la transacción y devuelve 409 si bajara de 1 (gastar hasta cero sigue siendo `consume`). La pantalla no tiene hoy ningún gesto ± ni editor absoluto de cantidad que migrar (medido): el delta queda disponible en el contrato para quien lo monte. e2e: dos `PATCH` concurrentes con `-1` sobre 20 dejan 18 (roja antes: 19). Mutación: leer-y-escribir en vez de `increment` devuelve la carrera.

**Texto original:**

| **M2B-8** | **`quantity` es absoluto donde el dinero es delta** | Dos personas descontando una flecha a la vez dejan 19 en vez de 18. No rompe ningún invariante —por eso no es urgente— pero es la misma carrera que la bolsa ya tiene resuelta |

## M2B-11 · Equipar son tres peticiones desde la pantalla

**Cerrada el 2026-09-11 (Task 18).** El `PATCH` de equipar devuelve `{ item, ac }` con la CA calculada dentro de la misma transacción (reutilizando la derivación de la hoja con `tx`); el `PATCH` devuelve `{ item, acBefore, ac }` —las dos CA calculadas en la misma transacción, antes y después de escribir— y el hook de la web las lee de la respuesta; `fetchAc` desaparece del todo. (La primera versión leía el «antes» de la caché de TanStack y perdía el aviso en «Tu bolsa» de la mesa, donde la hoja no está cargada; lo cazó la revisión.) Forma de la respuesta declarada en `@dnd/shared`. Mutación: devolver la CA vieja enrojece el e2e.

**Texto original:**

| **M2B-11** | **Equipar son tres peticiones desde la pantalla** | `fetchAc` → `PATCH` → `fetchAc`. Si la segunda lectura falla, la mutación se marca como error, no se invalida la caché y la pantalla enseña un estado que el servidor ya cambió. Lo correcto es que el `PATCH` devuelva la CA nueva |
