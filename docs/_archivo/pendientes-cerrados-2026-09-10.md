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
