# 06 — Pendientes

Tareas abiertas, **agrupadas por área**. **Se lee al empezar cada sesión**, junto con
[00-INDEX.md](./00-INDEX.md). Al cerrar una ficha, sale de aquí y el detalle va a
[07-historial.md](./07-historial.md). Cómo se lleva este tablero: [04-convenciones.md](./04-convenciones.md), § *A.4*.
Lo cerrado antes de hoy está en [`_archivo/README.md`](./_archivo/README.md); el tablero de antes del triaje y su
tabla de equivalencias, en [`_archivo/pendientes-tablero-viejo-2026-10-03.md`](./_archivo/pendientes-tablero-viejo-2026-10-03.md)
y [`_archivo/pendientes-equivalencias-2026-10-03.md`](./_archivo/pendientes-equivalencias-2026-10-03.md).

Última revisión: **2026-10-03** (triaje completo por áreas: el tablero por origen pasa a nueve áreas; lo
resuelto y lo descartado en el triaje, con su evidencia, en [`_archivo/pendientes-cerrados-2026-10-03.md`](./_archivo/pendientes-cerrados-2026-10-03.md)).

**Columnas:**

- **P** (urgencia): **P0** rompe producción o datos · **P1** duele a diario · **P2** deuda con impacto
  real · **P3** cosmético. **Se marca, no ordena.** La prioridad que cada ficha tenía en el tablero viejo
  (P1–P4) está en la tabla de equivalencias; esta se asignó de nuevo, ficha a ficha.
- **T** (tamaño): **S** cabe en los cuatro pasos de abajo · **M** plan corto · **L** spec + plan.
- **Detalle**: tres líneas como máximo; lo que no quepa está entero en la copia literal del tablero viejo,
  bajo la sección que cita **Antes:**. Termina con **Depende de:** y **Relacionada:**.
- Marcas: **Decide el autor** (solo falta una decisión del autor; ningún agente la resuelve por su cuenta).
- **Antes:** el ID o la sección que la ficha tenía en el tablero viejo.

**Dentro de cada área, el orden es el de las dependencias**, no el de la urgencia.

> **Lo trivial no llega aquí**: un typo, un texto, un formato, un renombrado o un cambio ya especificado
> se hace directo; si cambia comportamiento, su prueba que falla va primero.
>
> **Antes de abrir una ficha aquí, los cuatro pasos** ([04-convenciones.md](./04-convenciones.md),
> § *Antes de abrir una ficha: cuatro pasos*): ¿hay un cambio rápido y duradero? → ¿cumple las reglas? →
> ¿lo contesta la fuente, con la cita en el commit? → **y solo entonces** ficha, **con lo que mediste y lo
> que descartaste**.
>
> **¿Ya existe una ficha que se arregla con el mismo cambio?** Se suma a ella como una parte más
> (**(a)**, **(b)**…). No se abre otra. **Un ID nuevo toma el siguiente número de su área**; los números no
> se reutilizan.

**Modo de trabajo desde el 2026-09-18: solo errores** ([D-CF-161](./decisiones.md)). La beta 0.1.0 se juega;
3B está aplazada sin fecha. Las fichas que dependen de 3B o de la fase 3 llevan **Decide el autor**: no se
retoman hasta que él las reabra.

## Resumen por área

| Área | Fichas | P0/P1 | Pequeñas (S) | Esperan decisión |
|---|---|---|---|---|
| [Cumplimiento legal](#legal--cumplimiento-legal) (`LEGAL`) | 15 | 0 | 7 | 2 |
| [Seguridad](#seg--seguridad) (`SEG`) | 5 | 0 | 4 | 3 |
| [Mesa](#mesa--mesa) (`MESA`) | 32 | 0 | 11 | 19 |
| [Hoja](#hoja--hoja) (`HOJA`) | 26 | 1 | 14 | 6 |
| [Mundo](#mundo--mundo) (`MUNDO`) | 7 | 0 | 2 | 5 |
| [Interfaz](#ui--interfaz) (`UI`) | 30 | 0 | 21 | 8 |
| [Despliegue y CI](#dep--despliegue-y-ci) (`DEP`) | 4 | 2 | 2 | 2 |
| [Pruebas](#test--pruebas) (`TEST`) | 12 | 1 | 10 | 3 |
| [Documentación](#doc--documentación) (`DOC`) | 2 | 0 | 1 | 1 |
| **Total** | **133** | **4** | **72** | **49** |

## Dependencias entre áreas

- **Reabrir 3B** (D-CF-161) desbloquea a la vez `MESA-01`, `MESA-02`, `MESA-23`…`MESA-27`, `HOJA-10`,
  `HOJA-11`, `HOJA-25`, `MUNDO-02`, `UI-27` y `UI-28`.
- **`MESA-29`** (qué es la mesa virtual frente a la fase 3) va antes de `MESA-30`, `MESA-31` y `MESA-32`, y
  condiciona `MESA-28` (Just Another VTT) y `SEG-03` (el `sandbox` del marco).
- **`SEG-03`** y **`LEGAL-03`** deciden juntas qué orígenes acepta el marco del tablero (`sandbox` y
  `frame-src`); **`LEGAL-14`** cita a `SEG-03` como su parte técnica.
- **`LEGAL-02`** (registro abierto o por invitación) decide cuándo tocan `LEGAL-06`, `LEGAL-07` y `LEGAL-10`.
- **`TEST-01`** (el CI rojo) y **`TEST-02`** (los e2e de API en paralelo) condicionan lo que exige
  `03-despliegue.md` para desplegar con CI verde; la excepción vigente está en el `04`, § *Precedencia*.

---

## LEGAL — Cumplimiento legal

Spec global: `~/.claude/compliance/cumplimiento-legal-spec.md` y su `addendum-2026-09-26.md` (se
referencian, no se copian); los IDs entre corchetes de **Spec:** son los de esa spec, no los de este tablero.
**Perfiles:** `ALL` y `ACCOUNTS` hoy; `MARKETPLACE_UGC` y `MINORS` antes de SaaS; los de cobro, marketing,
analítica, IA, móvil y datos sensibles no aplican hoy. **Rol:** responsable (ROLE-01, B2C), persona natural;
jurisdicción hoy Colombia. **Cuándo:** «ya» vale con la mesa del autor; «antes de SaaS», antes de abrir el
registro a desconocidos o de cobrar, y `LEGAL-02` decide qué fichas pasan de un grupo al otro. **No se ficha:**
SEC-11 (ver «No re-abrir»), COOK-01…07 (no hay cookies ni analítica) y lo común del servidor (INFRA-01…06,
en `vps1new:/root/docs/06`). El texto entero del bloque legal está en la copia literal, § *Cumplimiento legal*.

| ID | P | T | Tarea | Detalle |
|---|---|---|---|---|
| `LEGAL-01` | P2 | M | Crear el inventario y el reporte de cumplimiento (inventario.md y REPORTE.md en una carpeta nueva, docs/compliance) con la tabla del §9 | **Cuándo:** ya. **Spec:** [§1, §9, ROLE-01, CO-04]. Inventario por dato (finalidad, base, dónde vive, retención, acceso) y reporte por ID con estado. Lo ya medido: `User` con correo, nombre, hash, `isAdmin`; doce columnas de usuario sin `@relation`; token y preferencias en `localStorage`; terceros (proveedor, Google Fonts, Sentry, sala del tablero). Aceptación: los dos ficheros existen y cubren todos los IDs CL. **Antes:** CL-1. **Depende de:** — · **Relacionada:** LEGAL-02…LEGAL-15 |
| `LEGAL-02` | P2 | S | Decidir si el registro se cierra a invitación o sigue abierto, y escribirlo en `decisiones.md` | **Decide el autor.** **Cuándo:** ya. **Spec:** [MIN-01, LEGAL-01, PRIV-01]. (a) cerrar: LEGAL-06, LEGAL-07 y LEGAL-10 esperan a SaaS; (b) abierto: esas tres pasan a «ya». La mesa real son cinco amigos (D-CF-18). **Antes:** CL-2. **Depende de:** — · **Relacionada:** LEGAL-06, LEGAL-07, LEGAL-10 |
| `LEGAL-03` | P2 | M | Añadir CSP, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy` y `Permissions-Policy` al HTML servido por nginx | **Cuándo:** ya. **Spec:** [SEC-01, SEC-02, INFRA-02]. La CSP lleva el hash del script de tema en línea de `index.html` y decide `frame-src` (la sala del tablero admite cualquier URL http(s), `campaign.schema.ts`). Importa porque el token vive en `localStorage` (LEGAL-09). Aceptación: `curl -sI` desde el servidor enseña las cabeceras y un e2e confirma que el tablero sigue cargando. **Antes:** CL-3. **Depende de:** — · **Relacionada:** LEGAL-09, LEGAL-12, LEGAL-14 |
| `LEGAL-04` | P2 | S | Escribir `sendDefaultPii: false` y un `beforeSend` que borre cuerpo, `authorization`, cookies y correo | **Cuándo:** ya. **Spec:** [MSG-03, LEGAL-06, CO-06]. Si `SENTRY_DSN` está puesto en producción se mide en el servidor. Región UE y declararlo como subprocesador. Aceptación: unitaria de `beforeSend` con un evento que lleva contraseña y Bearer. **Antes:** CL-4. **Depende de:** — · **Relacionada:** LEGAL-01 |
| `LEGAL-05` | P2 | S | Añadir a «Acerca de» el aviso MIT de Foundry y las fuentes OFL, y poner `lang="es"` | **Cuándo:** ya. **Spec:** [LIC-04, LIC-05]. Huecos que quedan: (1) el aviso MIT de Foundry solo está en `NOTICE.md`; (3) «Acerca de» lleva `lang="en"` sobre texto en español; (4) faltan las familias tipográficas y los iconos. El hueco (2), rechazar el material del SRD 5.2, ya lo fija `foundry.test.mjs` (commit f54e6d9). **Antes:** CL-5. **Depende de:** — · **Relacionada:** NOTICE.md |
| `LEGAL-06` | P2 | M | Páginas BORRADOR de privacidad, términos y aviso legal, aviso y casilla en el registro, y tabla de consentimientos | **Cuándo:** antes de SaaS (ya, si LEGAL-02 lo deja abierto). **Spec:** [LEGAL-01, LEGAL-02, LEGAL-03, LEGAL-05, LEGAL-06, CO-01, CO-02, CO-06, PRIV-01, PRIV-02, PRIV-03, AUTH-12]. Pie legal hoy solo con sesión (`AppShell`), así que login y registro no enlazan ninguna política. La tabla de consentimiento es migración y va sola. Aceptación: e2e con 200 sin sesión, 400 sin casilla y fila de consentimiento. **Antes:** CL-6. **Depende de:** LEGAL-02 · **Relacionada:** LEGAL-10, LEGAL-14 |
| `LEGAL-07` | P2 | L | Borrado y exportación de la cuenta, con regla para huérfanos y campañas propias | **Cuándo:** antes de SaaS (ya, si LEGAL-02 lo deja abierto). **Spec:** [AUTH-11, PRIV-04, PRIV-05, §7.3]. Sin `@relation` a `User`, borrar deja huérfanos en doce columnas; `GameEvent.actorUserId` se anonimiza (D-OP-15); la campaña cuyo `ownerId` es la persona necesita regla. Mientras tanto, procedimiento manual en `docs/compliance`. **Antes:** CL-7. **Depende de:** LEGAL-02, LEGAL-01 · **Relacionada:** — |
| `LEGAL-08` | P2 | S | Subir el mínimo a 15 (u 8 con MFA), consultar HIBP por k-anonimato y aceptar por escrito el riesgo de enumeración | **Cuándo:** antes de SaaS. **Spec:** [AUTH-02, AUTH-04, AUTH-08, SEC-10]. Ya cumple: Argon2id, pegar permitido, mensaje único en login, 5 intentos por minuto e IP. La enumeración no tiene arreglo limpio sin correo (D-CF-18). Aceptación: unitarias de la política y del rechazo de una filtrada. **Antes:** CL-8. **Depende de:** — · **Relacionada:** LEGAL-09 |
| `LEGAL-09` | P2 | M | Cookie `HttpOnly` (con defensa CSRF) o token corto con renovación, y revocación en el servidor al salir | **Cuándo:** antes de SaaS. **Spec:** [AUTH-10, COOK-08]. Hoy la única revocación es cambiar la contraseña (`jwt.strategy.ts`). La columna de versión de token es migración y va sola. Aceptación: e2e, tras «Salir» el token viejo da 401. **Antes:** CL-9. **Depende de:** — · **Relacionada:** LEGAL-03 |
| `LEGAL-10` | P2 | S | Decidir la edad mínima con abogado, escribirla en los términos y preguntar la edad en el registro | **Decide el autor.** **Cuándo:** antes de SaaS (ya, si LEGAL-02 lo deja abierto). **Spec:** [MIN-01, MIN-03, MIN-04, MIN-05]. 18, o 14 con autorización del representante (Decreto 1377). Aceptación: decisión en `decisiones.md` y, si hay edad mínima, un e2e que rechaza a quien no la cumple. **Antes:** CL-10. **Depende de:** LEGAL-02 · **Relacionada:** LEGAL-06 |
| `LEGAL-11` | P2 | M | Escribir el plan de respuesta a incidentes (respuesta-incidentes.md en docs/compliance) y registrar accesos de admin, logins fallidos y exportaciones | **Cuándo:** antes de SaaS. **Spec:** [SEC-12, SEC-08, INFRA-04]. El admin lo ve todo en todas las campañas: decirlo en la política y dejar rastro. Enlaza al plan común del servidor (INFRA-04). Aceptación: el documento existe y una acción de admin deja fila de auditoría con prueba. **Antes:** CL-11. **Depende de:** — · **Relacionada:** LEGAL-01, LEGAL-06 |
| `LEGAL-12` | P2 | S | Servir las cuatro familias desde `apps/web/public` y quitar los `preconnect` | **Cuándo:** ya. **Spec:** [PRIV-08, CO-06, LEGAL-06]. La IP de cada visitante va a Google antes de iniciar sesión. Ajustar la CSP de LEGAL-03. Aceptación: e2e, cargar `/login` no pide nada a terceros. **Antes:** CL-12. **Depende de:** — · **Relacionada:** LEGAL-03 |
| `LEGAL-13` | P2 | S | Añadir escaneo de secretos, Dependabot o Renovate e inventario de licencias en CI | **Cuándo:** ya. **Spec:** [SEC-05, SEC-07, LIC-01]. El audit pasó de 9 high a 0 con el parche del 2026-10-03 (override de `fastify`); quedan 4 moderate (DEP-04). Aceptación: el CI falla con un secreto o una licencia no permitida. **Antes:** CL-13. **Depende de:** — · **Relacionada:** DEP-03, DEP-04 |
| `LEGAL-14` | P2 | M | Normas de contenido, correo de denuncia con acuse, aviso de retirada con motivo y procedimiento de derechos de autor | **Cuándo:** antes de SaaS. **Spec:** [UGC-01, UGC-02, UGC-06, UGC-07]. El DM puede enmarcar cualquier URL http(s) sin `sandbox` (puerta a suplantar un login con desconocidos). La línea de `NOTICE.md` sobre «uso privado del DM» deja de bastar al alojar texto ajeno. **Antes:** CL-14. **Depende de:** LEGAL-06 · **Relacionada:** SEG-03, LEGAL-03 |
| `LEGAL-15` | P2 | M | Añadir `@axe-core/playwright` a los recorridos de login, registro, cuenta y mesa | **Cuándo:** antes de SaaS. **Spec:** [A11Y-01…17, §8]. Ya cumple A11Y-08 (`CajasDeRegla` con alternativa de botón) y el contraste lo mide `tokens-contrast.spec.ts`. Los huecos conocidos de teclado ya tienen ficha: UI-14 y UI-15. Aceptación: el e2e falla con una violación `serious` o `critical`. **Antes:** CL-15. **Depende de:** — · **Relacionada:** UI-14, UI-15 |

## SEG — Seguridad

| ID | P | T | Tarea | Detalle |
|---|---|---|---|---|
| `SEG-01` | P2 | M | Recortar lo que `/events` y `/rolls` devuelven a quien no es el DM | **Decide el autor.** Filtran por `canView` del suceso pero devuelven `subjectId`, `actorUserId` y `payload` (con `pendingDamage.targetCharacterId`); solo se quita `attackRef` en `GameEventsService.list`. Una tirada pública puede revelar el id de un personaje que solo ve el DM; gravedad media. Lleva e2e del panel de dados, la sesión y el hilo. **Antes:** AD-9. **Depende de:** — · **Relacionada:** `canView` (`common/visibility.ts`); D-CF-89 ya aceptó que `pendingDamage.targetCharacterId` viaje en el `ABILITY_ROLL` del daño |
| `SEG-02` | P3 | S | Decidir si se aísla la API en una red interna solo con `web` y `db` | **Decide el autor.** Medido el 2026-10-03: en la red de la API están `web`, `api`, `db` y `coolify-proxy` (Traefik), contra la suposición del ADR 0001. Riesgo bajo: Traefik solo enruta a `web` y descarta el `X-Forwarded-For` del cliente. **Antes:** AD-6. **Depende de:** — · **Relacionada:** ADR 0001, D-AD-1 |
| `SEG-03` | P2 | S | Medir qué necesita Just Another VTT dentro del marco y poner `sandbox` | `MarcoDelTablero.tsx` monta el `<iframe>` de la sala sin `sandbox` (solo `referrerPolicy` y `allow`), y la sala admite cualquier URL http(s) (`boardRoomUrl` en `campaign.schema.ts`). La ficha vieja nombraba PlanarAlly; desde D-CF-150 el tablero es Just Another VTT. **Antes:** «Tablero: sandbox del iframe (2026-09-12, ronda de revisión d…», «`MarcoDelTablero.tsx` monta el `<iframe>…». **Depende de:** medir qué necesita Just Another VTT dentro del marco · **Relacionada:** LEGAL-03 (`frame-src`), LEGAL-14, MESA-28 |
| `SEG-04` | P3 | S | Mudar las tres copias restantes a `common/character-viewer.ts` | Tras ef502b8 («viewerFor lives once») quedan tres copias privadas de `viewerFor`, en `dm-tables.service.ts`, `statblocks/npcs.service.ts` y `statblocks/statblocks.service.ts`; llaman a `requireMember` y no al común. **Antes:** «Deuda de la fase 2B», la remisión a la línea de `viewerFor` de «P4 — Limpieza». **Depende de:** — · **Relacionada:** — |
| `SEG-05` | P3 | S | Unificar el código al lector ajeno de una tirada: `addDamageExtra` responde 403 y `damagePreview` 404 | **Decide el autor.** `damagePreview` lanza `NotFoundException` al lector ajeno; `addDamageExtra` pasa por `requireOwnerOrDM`, que da 403. Cambia `dano-extra.e2e-spec.ts` y `08-pruebas.md`. **Antes:** m-10. **Depende de:** — · **Relacionada:** — |

## MESA — Mesa

La mesa de juego: combate, iniciativa, turnos, economía de acciones, la barra, el hilo y el registro, más el
tablero y la fase 3.

| ID | P | T | Tarea | Detalle |
|---|---|---|---|---|
| `MESA-01` | P2 | M | Modelar «ataques por acción» para que Ataque Adicional no dispare `excedido` | **Decide el autor.** Hoy el aviso es honesto pero ruidoso (D-CF-146). Es trabajo de 3B/T23, aplazada (D-CF-161). **Antes:** M11. **Depende de:** 3B · **Relacionada:** MESA-02 |
| `MESA-02` | P2 | M | Que un ataque de oportunidad fuera de turno gaste la reacción y no la acción | **Decide el autor.** Ya está declarado como ruido en D-CF-146. **Antes:** M11. **Depende de:** 3B · **Relacionada:** MESA-01 |
| `MESA-03` | P2 | S | Hacer que `usar()` devuelva `excedido`, como ya hace `resolveAttack` | Hoy el resultado de `gastarSiEnCombate` se descarta. **Antes:** «Del servidor», «`usar()` no expone `excedido`…». **Depende de:** — · **Relacionada:** MESA-01 |
| `MESA-04` | P3 | S | Medir el coste de `GET …/actions` y derivar la hoja una sola vez | Además repite `requireVisibleCharacter`. La ficha calcula unas 30–40 consultas por jugador y suceso. Es aceptable para cinco jugadores: medir antes de tocar. **Antes:** M6. **Depende de:** — · **Relacionada:** — |
| `MESA-05` | P3 | M | Llevar los dados a `mecanica` de conjuros y aptitudes en la barra | Exige derivar la actividad con contexto al listar (D-CF-152). **Antes:** «Del servidor», «`mecanica` de conjuros y aptitudes solo …». **Depende de:** — · **Relacionada:** — |
| `MESA-06` | P2 | S | Selector de nivel de espacio para Castigo divino en `DanoExtra` | Un paladín que solo tiene espacios de nivel 2 o más no puede usarlo desde la pantalla. **Antes:** «API», «Castigo divino sin selector de nivel en …». **Depende de:** — · **Relacionada:** — |
| `MESA-07` | P2 | S | Que el preview de la bandeja incluya los extras marcados antes de aplicar | El total que se aplica es correcto. Lo que puede no cuadrar es el número que se ve antes de pulsar. **Antes:** «API», «El preview de la bandeja reduce solo el …». **Depende de:** — · **Relacionada:** MESA-10 |
| `MESA-08` | P3 | S | Pasar `damagePreviewSchema` a la unión `vista: "completa" / "atacante"` | D-CF-143 lo deja como limpieza pendiente con ficha en el 06. **Antes:** 3A.2, API, m-11. **Depende de:** — · **Relacionada:** D-CF-143 |
| `MESA-09` | P3 | S | Decidir si se acepta formalmente (D-…) o se deja de pedir el preview en las aplicadas | **Decide el autor.** El 06 lo deja a propósito (perdería la línea del daño reducido para el DM); no tiene D- que lo descarte. **Antes:** PE-1 (Web). **Depende de:** — · **Relacionada:** — |
| `MESA-10` | P3 | M | Rehacer la bandeja de daño pendiente del DM como panel lateral | Hoy hace de bandeja la tarjeta o línea del hilo con «Aplicar». Es una tanda propia. **Antes:** «Del prototipo, sin entrar», «Bandeja lateral del DM para el daño pend…». **Depende de:** — · **Relacionada:** MESA-07 |
| `MESA-11` | P3 | S | Pintar la franja «te perdiste» aunque el primer suceso no visto caiga fuera del filtro | La otra mitad, el id estático, ya está cerrada con `useId`. **Antes:** M4b. **Depende de:** — · **Relacionada:** D-CF-147 |
| `MESA-12` | P3 | M | Un solo suceso por iniciativa del sistema, con sujeto y autor separados | Toca el `payload`; E-IB-17 solo aceptaba la línea de más en la carrera perdida. **Antes:** auditoría de interfaz 3.7/11.1. **Depende de:** — · **Relacionada:** MESA-13 |
| `MESA-13` | P3 | M | Plegar las tiradas de iniciativa en un bloque y separar encuentros en el registro | Medido: `grep "Iniciativa del asalto"` en `apps/web/src` vacío. **Antes:** auditoría de interfaz 3.8/11.2. **Depende de:** — · **Relacionada:** MESA-12 |
| `MESA-14` | P2 | M | Distintivo de concentración en la tira de turnos | La salvación de concentración al recibir daño ya existe (hueco M17, en `characters/character-sheet.service.ts`); lo que falta es el distintivo: `grep -rli concentra` en `features/encounters` sale vacío. Apenas se verá mientras la concentración solo se registre al encantar. **Antes:** auditoría de interfaz 4.11. **Depende de:** HOJA-05 · **Relacionada:** — |
| `MESA-15` | P3 | M | Caja «Lo que el motor está siguiendo»: concentración, condiciones con duración y temporales | Hoy las condiciones solo se ven en cada tarjeta del elenco. **Antes:** «Del prototipo, sin entrar», «"Lo que el motor está siguiendo"…». **Depende de:** — · **Relacionada:** — |
| `MESA-16` | P3 | S | Re-decidir dónde vive Ayudar: hoy está en la tarjeta del elenco (`FichaDeElenco`) y en la barra (`BarraDeAcciones`) | **Decide el autor.** D-CF-50 (las acciones son menús) apunta a dejar el de la barra. **Antes:** auditoría de interfaz 2.2. **Depende de:** — · **Relacionada:** — |
| `MESA-17` | P3 | S | Opcional: añadir, además de la suya, la línea de economía del turno activo | **Decide el autor.** El coste es una fila más en la franja. **Antes:** auditoría de interfaz 4.2/21.5. **Depende de:** — · **Relacionada:** — |
| `MESA-18` | P3 | S | Opcional: precargar el chip de objetivo en un `<select>` visible del popover de ataque | **Decide el autor.** Medido: D-CF-155 («deliberadamente más simple»); la lista ya aparece al pulsar Atacar sin chip. **Antes:** auditoría de interfaz 7.2/21.8. **Depende de:** — · **Relacionada:** MESA-19 |
| `MESA-19` | P3 | S | Opcional: reusar `SelectorDeVentaja` en `ControlDeAtaque` | **Decide el autor.** Cuesta poco según la ficha. **Antes:** auditoría de interfaz 7.5. **Depende de:** — · **Relacionada:** MESA-18 |
| `MESA-20` | P3 | M | Opcional: ajuste por campaña «PG de los enemigos: ocultos / como estado / visibles» | **Decide el autor.** Medido: Revela información que `canView` niega (D-2B-8). **Antes:** auditoría de interfaz 4.1/21.4. **Depende de:** — · **Relacionada:** — |
| `MESA-21` | P3 | M | Que el nombre de un PNJ en las tarjetas del hilo enlace a su ficha del mundo cuando llega `entityId` | Hay que tocar el renderizado de mensajes del hilo; es una tanda con su propio diseño (D-CF-83). **Antes:** PM-2. **Depende de:** — · **Relacionada:** D-CF-83 |
| `MESA-22` | P3 | M | Efectos de pantalla para crítico, bloqueo y esquiva leyendo el hilo de sucesos | **Decide el autor.** Solo si se quieren. Hoy el detector solo compara hojas. **Antes:** EM-2. **Depende de:** — · **Relacionada:** — |
| `MESA-23` | P3 | L | Deshacer como suceso inverso anotado, no como borrado | **Decide el autor.** Choca además con el registro de solo añadir (D-OP-15): el inverso se anota. **(b)** Repetir y Deshacer en la barra de acciones. **Antes:** auditoría de interfaz 4.10/21.7; «Del prototipo, sin entrar», «"Repetir" y "Deshacer" en la barra…». **Depende de:** 3B (D-CF-161) · **Relacionada:** — |
| `MESA-24` | P3 | M | Pintar «En escena» con los PNJ bajados aunque no haya combate, respetando `canView` | **Decide el autor.** Sin el interruptor nuevo que proponía la auditoría. Espera a que el autor reabra 3B. **Antes:** auditoría de interfaz 1.1/1.2/7.3/21.1. **Depende de:** 3B (D-CF-161) · **Relacionada:** MESA-25, MESA-26, MESA-27, HOJA-25 |
| `MESA-25` | P3 | L | Daño en área con salvación a mitad | **Decide el autor.** Medido: Aplazada sin fecha por D-CF-161 (no descartada). **Antes:** auditoría de interfaz 4.7/21.6. **Depende de:** 3B (D-CF-161) · **Relacionada:** MESA-24 |
| `MESA-26` | P3 | M | Mostrar resistencias y vulnerabilidades del objetivo al elegir el tipo de daño | **Decide el autor.** Aplazada por D-CF-161. **Antes:** auditoría de interfaz 4.8. **Depende de:** 3B (D-CF-161) · **Relacionada:** UI-07 |
| `MESA-27` | P3 | M | Aviso de fin de combate al jugador con resumen y PX | **Decide el autor.** Medido: Aplazada por D-CF-161. **Antes:** auditoría de interfaz 5.4. **Depende de:** 3B (D-CF-161) · **Relacionada:** — |
| `MESA-28` | P2 | L | Integrar la mesa con Just Another VTT: ficha↔token, PG del token por `canView` y sesión compartida | **Decide el autor.** Hoy `MarcoDelTablero` solo enmarca la sala (D-CF-150). **Antes:** «Del tablero», «Integración fina con Just Another VTT…»; «El tablero: Just Another VTT», «Decisión del autor de la madrugada del 2…». **Depende de:** — · **Relacionada:** SEG-03, LEGAL-14, MESA-29 |
| `MESA-29` | P3 | L | Decidir si la mesa virtual sustituye a la fase 3, rejilla o libre, y la niebla como `canView` por coordenadas | **Decide el autor.** No se dibuja a ciegas; arrastra tiempo real, almacén de ficheros y posiciones (hoy no existen) **Antes:** «La pantalla de juego con mapa — alcance nuevo, sin decidir (…», «Lo que el autor quiere, en sus palabras:…». **Depende de:** Decisiones de fase 3 · **Relacionada:** D-CF-150, MESA-28 |
| `MESA-30` | P3 | M | Formas de área en `@dnd/shared` cuando haya tablero | **Decide el autor.** 3A.1 ya decidió no modelarlas sin mapa. **Antes:** H10. **Depende de:** MESA-29 · **Relacionada:** MESA-29 |
| `MESA-31` | P2 | L | Modelar los niveles de luz y las fuentes de luz cuando haya posiciones (fase 3) | **Decide el autor.** Sin posiciones no se puede resolver qué está iluminado; la regla se puede escribir, pero no resolver. Está aplazada con la fase 3 (D-CF-35) y la beta solo admite arreglos (D-CF-161). **Antes:** L1. **Depende de:** MESA-29 · **Relacionada:** MESA-32; la invariante «la visión no es `canView`» de la spec de distancias y movimiento |
| `MESA-32` | P2 | L | Arco y radio de visión por personaje, con origen y dirección, en el tablero | **Decide el autor.** Un arco necesita origen y dirección, así que pide el tablero. La mitad barata, declarar que un personaje no ve, es HOJA-26. **Antes:** L2. **Depende de:** MESA-29 · **Relacionada:** MESA-31, HOJA-26 |

## HOJA — Hoja

La hoja y lo que la deriva: conjuros, aptitudes, inventario, objetos mágicos, recursos y el conversor del
catálogo.

| ID | P | T | Tarea | Detalle |
|---|---|---|---|---|
| `HOJA-01` | P1 | M | Modelar la mejora de característica como elección de dos modos al subir de nivel | Guerrero y pícaro tienen niveles extra en `asiLevels`; D-CF-37 la metía en el paso 3 y no entró. **Antes:** S6. **Depende de:** — · **Relacionada:** — |
| `HOJA-02` | P2 | S | Re-sembrar libro, espacios y dados de golpe cuando el DM cambia el nivel por `PATCH` | Que el explorador nazca vacío a nivel 1 es del SRD. El defecto real es que un `PATCH` de `level` deja el libro, los espacios y los dados de golpe del nivel viejo (`sembrarLibro` y `sembrarRecursos` solo corren en `updateSheet`). Sin comprobar si la web ofrece hoy otro camino. **Antes:** m-13. **Depende de:** — · **Relacionada:** HOJA-06 |
| `HOJA-03` | P2 | S | Que `pendingDamage.damageType` sea opcional y tenga un valor neutro en `applyDamageModifiers` | Afecta a `hunters-mark@0`, `acid-arrow@1` y `wall-of-ice@1`: las resistencias se evalúan contra un FORCE que el conjuro no dice. **Antes:** m-4. **Depende de:** — · **Relacionada:** — |
| `HOJA-04` | P2 | S | Guardas de *Arma mágica*: arma no mágica y sin apilar, o al menos `fueraDeRegla` | Relanzarlo sobre la misma arma apila +1 +1. **Antes:** m-6. **Depende de:** — · **Relacionada:** D-CF-130 |
| `HOJA-05` | P2 | S | Registrar la concentración en todo `usar(spell:…)` con `duration.concentracion` | Ahora mismo, *Bless* o *Hold Person* no dejan la condición. Solo queda ponerla a mano desde `Condiciones.tsx`. **Antes:** 3A.2, API, m-7. **Depende de:** — · **Relacionada:** D-CF-130 (perder la concentración no borra el encantamiento) |
| `HOJA-06` | P3 | S | Que `contarTope` y `list()` cuenten la misma población | Divergen si el DM cambia `classKey`. **Antes:** m-9. **Depende de:** — · **Relacionada:** HOJA-02 |
| `HOJA-07` | P3 | S | Cerrojo `FOR UPDATE` sobre `Character` en `setEstado` (409 en vez de 500) | Riesgo bajo: dos `PUT` concurrentes sobre una clave nueva. **Antes:** m-12. **Depende de:** — · **Relacionada:** — |
| `HOJA-08` | P3 | S | Añadir la expiración a `ResolvedItem.temporales` y mostrar «hasta las…» | Hay que decidir en qué reloj se enseña. **Antes:** «API», «El chip de encantamiento no dice "hasta …». **Depende de:** — · **Relacionada:** — |
| `HOJA-09` | P3 | S | Ofrecer en la pantalla de encantar las armas de los aliados visibles | El servidor ya acepta encantar el arma de otro (lo prueba un e2e). **Antes:** «API», «Encantar solo ofrece las armas del propi…». **Depende de:** — · **Relacionada:** — |
| `HOJA-10` | P3 | M | Decidir qué significa `spell:<key>@N`, con un test que alcance `hunters-mark` `[0]` | **Decide el autor.** D-CF-141. 3B está aplazada (D-CF-161). **Antes:** I-5. **Depende de:** 3B · **Relacionada:** HOJA-11 |
| `HOJA-11` | P3 | L | Encantamientos de 3B: Marca del cazador, *Shillelagh*, Arma elemental | **Decide el autor.** Fuera de alcance a propósito (D-CF-130). 3B está aplazada sin fecha (D-CF-161). **Antes:** «API», «Marca del cazador, *Shillelagh* y Arma e…». **Depende de:** 3B · **Relacionada:** HOJA-10 |
| `HOJA-12` | P2 | M | Que `rules/attacks.ts` distinga empuñar de lanzar y que la Furia solo sume en cuerpo a cuerpo | El SRD 5.1 da el bono solo en «melee weapon attack using Strength»; lanzar un hacha de mano en furia se lleva el +2. Es un cambio de forma del ataque, no un `if`. **Antes:** A11-lanzado-cuenta-como-cuerpo-a-cuerpo. **Depende de:** — · **Relacionada:** D-P2-9 |
| `HOJA-13` | P2 | M | Automatizar los rasgos raciales con efecto (Suertudo, Valiente, Astucia gnoma…) | D-CF-20 los mandaba por el conversor; el conversor pasó (af3f0b0) pero Foundry trae casi todos sin actividad. **Antes:** S4; S4 · M2B-4. **Depende de:** — · **Relacionada:** HOJA-14 |
| `HOJA-14` | P2 | M | Cargas de objeto como `uses` con recuperación en el descanso | D-CF-21: mismo vocabulario que un conjuro con usos; es una migración. **Antes:** M2B-4. **Depende de:** — · **Relacionada:** HOJA-13, HOJA-15 |
| `HOJA-15` | P2 | L | Catálogo SRD de objetos +N y sintonizar con descanso corto | **Decide el autor.** Spec previa con dos preguntas (¿solo +N o también resistencias? ¿descanso real o clic?); 3–4 días, plan de 6–8 tareas; la abre el autor. **Antes:** HP-9b. **Depende de:** — · **Relacionada:** HOJA-14 |
| `HOJA-16` | P3 | L | Lo que el conversor dejó como texto: ver `rechazos.md` (generado) | Es una sola ficha que apunta al informe, y los conteos no se copian. Cada línea del informe lleva su motivo (D-CF-92…D-CF-115). **Antes:** «Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados…», «"El libro entra" convirtió 319 conjuros……». **Depende de:** — · **Relacionada:** HOJA-17, HOJA-18 |
| `HOJA-17` | P3 | M | Índice `_id → key` en el conversor y recurso compartido para ki y metamagia | Devolvería a A los cinco rasgos de ki y las ocho metamagias. **Antes:** «Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados…», «(1) resolver los UUID de compendio a la …». **Depende de:** — · **Relacionada:** HOJA-16 |
| `HOJA-18` | P3 | M | Forma `cdDeCaracteristica(ability)` en `Origen` | Daría CD a Golpe Aturdidor, Presencia Intimidante y los Ataques de Aliento. **Antes:** «Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados…», «(2) una forma `cdDeCaracteristica(abilit…». **Depende de:** — · **Relacionada:** HOJA-16 |
| `HOJA-19` | P3 | S | Distinguir en `Coste` «parte de otra acción» de «sin activación» | Menor 10 de la revisión. **Antes:** menor 10. **Depende de:** — · **Relacionada:** HOJA-16 |
| `HOJA-20` | P3 | S | Alinear los rótulos de `classes.ts`/`races.ts` con los nombres del SRD del JSON generado | Cambiar los rótulos barre e2e. **Antes:** «Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados…», «(4) los cuatro nombres corregidos al SRD…». **Depende de:** — · **Relacionada:** HOJA-16 |
| `HOJA-21` | P3 | S | Separar en `mezclarScales` las escalas de «número de dados» de las que se suman | Hoy es latente: solo duele si una actividad lee Ataque Furtivo como bono. **Antes:** «Lo que 3A.1 dejó como texto (2026-09-14; conteos regenerados…», «(5) `mezclarScales` expone tablas de esc…». **Depende de:** — · **Relacionada:** HOJA-16 |
| `HOJA-22` | P3 | S | Llevar el «no metálicos» al texto visible del druida | No es una competencia menos: es un aviso, no un bloqueo. **Antes:** I7. **Depende de:** — · **Relacionada:** — |
| `HOJA-23` | P2 | M | Llevar a `@dnd/shared` los tipos de respuesta del motor, del previo de nivel y de la hoja | Los tipos de respuesta del motor (`features/rules/api.ts`), del previo de nivel (`features/level-up/api.ts`) y de la hoja (`CalculatedSheet` y vecinos en `features/character-sheet/api.ts`) son calcos a mano: si el servidor cambia la forma, nada lo detecta. D-CF-37 la metió en el paso 3, que se cerró sin ella. **Antes:** S11. **Depende de:** — · **Relacionada:** D-CF-37, MUNDO-01 |
| `HOJA-24` | P2 | M | Pintar la hoja ajena como texto en vez de veinte campos apagados y el mismo aviso cinco veces | **Decide el autor.** No esconde nada, pero cambia el patrón: la ficha pide «que lo vea el autor». **Antes:** auditoría de interfaz 8.4/21.9. **Depende de:** — · **Relacionada:** — |
| `HOJA-25` | P3 | S | Conversión de monedas y total en la bolsa | **Decide el autor.** Medido: Aplazada por D-CF-161. **Antes:** auditoría de interfaz 9.2. **Depende de:** 3B (D-CF-161) · **Relacionada:** UI-11 |
| `HOJA-26` | P3 | S | Decidir si «Cegado» ya cubre la ficha o falta el aviso explícito de que es ficción y no permiso | **Decide el autor.** La ficha pide vocabulario, un chip en la hoja y un aviso de que es ficción y no permiso. Las dos primeras partes parecen existir con `blinded`; falta el aviso. D-CF-37 la metió en el paso 3. **Antes:** L5. **Depende de:** — · **Relacionada:** MESA-32, D-CF-37; la invariante «la visión no es `canView`» |

## MUNDO — Mundo

| ID | P | T | Tarea | Detalle |
|---|---|---|---|---|
| `MUNDO-01` | P2 | M | Buscador o filtro para sesiones y personajes, y búsqueda que cruce pestañas | **Decide el autor.** La búsqueda por texto del servidor ya pasa por `canView`, pero solo en el mundo (`listEntitiesQuerySchema`). Para cruzar pestañas hay que decidir qué devuelve el servidor con tipos distintos. D-CF-37 la metió en el paso 3, que se cerró (3A) sin ella. **Antes:** E1. **Depende de:** Diseño de la respuesta cruzada · **Relacionada:** D-CF-37, D-CF-161, HOJA-23 |
| `MUNDO-02` | P2 | L | Un tercer modo de permiso: el jugador decide la acción del PNJ y el DM tiene los números y los resuelve | **Decide el autor.** Ceder el `ownerId` daría las dos mitades a la vez (SRD: Polimorfar verdadero, Animar muertos). Es la misma pieza que necesita `invocar` en el paso 3, que con 3B está aplazado (D-CF-161). **Antes:** P2-9; «P2-9 · No hay ninguna puerta para ceder un PNJ a un jugador …», «Abierto, encontrado al escribir el e2e d…». **Depende de:** reabrir 3B (`invocar`, D-CF-161) · **Relacionada:** D-P2-11; el caso «PNJ cedido» de la prueba de P2-3 solo se ejerce con la API simulada |
| `MUNDO-03` | P2 | S | Decidir si el PNJ jugable de un jugador enseña sus PG a su dueño | **Decide el autor.** Hoy un jugador no ve los PG de su propio PNJ jugable (`Character` con `statblockRef`), por la regla I-2 de `FichaDePnj`. **Antes:** «Del prototipo, sin entrar», «El PNJ del jugador dice "Sin puntos de g…». **Depende de:** — · **Relacionada:** D-OP-11 |
| `MUNDO-04` | P3 | M | Agrupar los avisos de entrada y nombrar a quien entra | El nombre tiene que viajar en el aviso: toca API. **Antes:** auditoría de interfaz 1.6. **Depende de:** — · **Relacionada:** — |
| `MUNDO-05` | P3 | S | Desplegar la raíz que recibe su primera ficha después de montar | Hoy se queda plegada con el contador en 1. **Antes:** «Menores dejados por la revisión final de `cierre/antes-de-3a…», «Mundo (árbol): Las raíces plegadas/despl…». **Depende de:** — · **Relacionada:** — |
| `MUNDO-06` | P3 | M | Invitar por correo a una cuenta existente, con una respuesta idéntica exista o no la cuenta | **Decide el autor.** Aplazada por el autor el 2026-09-11 (D-CF-37). Requisito: la respuesta no debe revelar si la cuenta existe, para no servir de comprobador de padrón. No hay servicio de correo (D-CF-18). **Antes:** A2. **Depende de:** Servicio de correo (no existe) · **Relacionada:** D-CF-18, D-CF-37 |
| `MUNDO-07` | P3 | L | Mapa de historia dibujado por el DM, si el autor lo retoma | **Decide el autor.** Spec sin fecha, no se reescribe; convive con el árbol (D-CF-54) **Antes:** anexo del pulido #24. **Depende de:** — · **Relacionada:** — |

## UI — Interfaz

Lo que solo es pantalla: textos, accesibilidad de un componente, maquetación y el prototipo.

| ID | P | T | Tarea | Detalle |
|---|---|---|---|---|
| `UI-01` | P2 | L | La mesa a 390 px reparte tres columnas y corta las herramientas del DM; aplazada hasta un diseño responsive del autor | **Decide el autor.** Texto entero en la copia literal, § «P2 · La mesa a 390 px reparte sus tres columnas a lo ancho (2026-09-05, paseo de uso)» **(b)** El `minmax(0,1fr)` de la fila del elenco (`grid-rows-[1fr_auto]`), congelado con esta ficha **(c)** La barra a 390 px como hoja inferior. **Antes:** P2; «Del prototipo, sin entrar», «La barra a 390 px como hoja inferior…». **Depende de:** Diseño del autor · **Relacionada:** `mesa-en-estrecho.spec.ts` |
| `UI-02` | P3 | S | Formatear la capacidad de `PanelCarga` con `decimales` de `dominio/numeros.ts` | `numeros.ts` ya exporta `conSigno`, `conEspacioFino` y `decimales` (commit c390acc). **(b)** Pintar la cifra de la traza con `conSigno` de `dominio/numeros.ts`. **Antes:** «A · Fichas abiertas — en el plan (correcciones menores y grá…», «PanelCarga.tsx:55,70,71 toFixed(0)…»; «A · Fichas abiertas — en el plan (correcciones menores y grá…», «Traza.tsx:314,317 menos ASCII…». **Depende de:** — · **Relacionada:** — |
| `UI-03` | P3 | S | Usar `fechaCorta` donde se pintan fechas cortas, o quitarla | Nació en c390acc (fechas con y sin año); hoy solo la usan `dominio/fechas.ts` y su prueba. **Antes:** «A · Fichas abiertas — en el plan (correcciones menores y grá…», «fechaCorta sin consumidor…». **Depende de:** — · **Relacionada:** — |
| `UI-04` | P3 | S | Cambiar «statblock» por «criatura del bestiario» en el JSDoc de `EscribirFicha` | Solo comentario; la regla de vocabulario es la de 5.3/16.3 (commits 6a07ccb y fd77100). **Antes:** «A · Fichas abiertas — en el plan (correcciones menores y grá…», «EscribirFicha.tsx:83 JSDoc statblock…». **Depende de:** — · **Relacionada:** — |
| `UI-05` | P3 | S | Que el resultado de iniciativa no diga «Tu» cuando el DM ha tirado por otro desde la caja compacta | La caja compacta del DM nació en 4f558b6 (3.2). **Antes:** «A · Fichas abiertas — en el plan (correcciones menores y grá…», «"Tu iniciativa" cuando el DM tira por ot…». **Depende de:** — · **Relacionada:** — |
| `UI-06` | P2 | M | Un componente de condición y una lista de duraciones (la del reloj) compartidos por mesa y hoja | Siguen dos componentes: `features/sessions/elenco/PonerCondicion.tsx` y `features/character-sheet/Condiciones.tsx`. **Antes:** auditoría de interfaz 12.3/12.4. **Depende de:** — · **Relacionada:** — |
| `UI-07` | P2 | M | Un componente de cambio de PG con lo básico visible y lo avanzado plegado | No choca con nada (D-POD-5: el absoluto no se recorta, el delta sí). **Antes:** auditoría de interfaz 6.1/2.1/21.2. **Depende de:** — · **Relacionada:** UI-08, UI-10 |
| `UI-08` | P2 | S | Que «De qué tirada sale» (en `PuntosDeGolpe`) liste solo los últimos 5 minutos, con hora, autor y tirada, y se oculte si no hay ninguna | Formato propuesto: «11:14 · Sylas · Daño de la daga · 1d4+1 = 5». **Antes:** auditoría de interfaz 6.3. **Depende de:** — · **Relacionada:** UI-07 |
| `UI-09` | P3 | S | Dejar un solo sitio para gastar dados de golpe en Recursos | Medido: Los dados de golpe aparecen en `RecursosYDescansos.tsx` («Dados de golpe a gastar») y en `TarjetasDeEstado.tsx`. **Antes:** auditoría de interfaz 6.4. **Depende de:** — · **Relacionada:** — |
| `UI-10` | P3 | S | Convertir los PG de la banda de la hoja en el botón que abre su control | Medido: Sin evidencia de cambio: ningún commit de `apps/web/src` desde el 2026-09-19 salvo `d5efc41` y `3383f08`, que no tocan la hoja. **Antes:** auditoría de interfaz 6.5. **Depende de:** — · **Relacionada:** UI-07 |
| `UI-11` | P3 | S | Lectura de las cinco monedas y un solo control (cantidad, moneda, signo) | Medido: `PanelMonedas.tsx` → un botón «Aplicar» por moneda (con `aria-label` distinto por moneda). **Antes:** auditoría de interfaz 9.1. **Depende de:** — · **Relacionada:** HOJA-25 |
| `UI-12` | P3 | S | Separar «Pasa el tiempo» y «Viajáis» en dos solapas del cajón del reloj | Medido: `grep 'role="tab'` en `features/game-clock/` vacío. **Antes:** auditoría de interfaz 16.1 (segunda mitad). **Depende de:** — · **Relacionada:** — |
| `UI-13` | P3 | M | Guardar tema y ornamento en la cuenta y usar `localStorage` solo como caché | Es migración: va sola (04, § cuatro pasos). **Antes:** auditoría de interfaz 18.6. **Depende de:** — · **Relacionada:** LEGAL-01 |
| `UI-14` | P3 | S | Gestionar el foco con flechas, o quitar `listbox/option`, en los tres ficheros a la vez | `role="listbox"` con botones dentro, sin flechas ni `onKeyDown`, en `LanzarConjuro.tsx` (dos veces), `TirarAtaqueBoton.tsx` y, sin que la ficha vieja lo nombrara, `BarraDeAcciones.tsx`. **Antes:** m-3. **Depende de:** — · **Relacionada:** LEGAL-15 |
| `UI-15` | P3 | S | En `ui/Collection.tsx`, cambiar `role="toolbar"` por `role="group"` o implementar el patrón *Toolbar* (flechas y un solo tabstop) | LEGAL-15 la cita como «hueco ya fichado». **Antes:** «Menores dejados por la revisión final de `cierre/antes-de-3a…», «Catálogo: `Collection.tsx` pasa `role="t…». **Depende de:** — · **Relacionada:** LEGAL-15 |
| `UI-16` | P3 | S | Chevron dibujado (`IconoPunta` de `ui/Iconos.tsx`) en los `<summary>` de `FilaDeConjuro` y `BloquesDelPie` | `FilaDeConjuro.tsx` y `BloquesDelPie.tsx` esconden el marcador del `<summary>` (`list-none` y `[&::-webkit-details-marker]:hidden`) y no ponen `IconoPunta`; `c458da2` unificó los chevrones de otras pantallas, pero no estas dos. **Antes:** 3A.2, Web, m-7. **Depende de:** — · **Relacionada:** — |
| `UI-17` | P3 | S | Usar `useId` para el `id="ventaja-motivo"` de `BandejaDeDados` | Hoy no hay colisión, pero sí riesgo si se monta dos veces. **Antes:** «Menores dejados por la revisión final de `cierre/antes-de-3a…», «Dados: `id="ventaja-motivo"` está escrit…». **Depende de:** — · **Relacionada:** — |
| `UI-18` | P3 | S | Quitar el clic de superficie para apuntar y dejar solo `BotonDeApuntar` | **Decide el autor.** D-CF-155 lo conserva como comodidad de ratón. Se toca solo si molesta. **Antes:** «Menores de la revisión final que la ola no cerró (con ficher…», «`FichaDeElenco`/`FichaDePnj` conservan e…». **Depende de:** — · **Relacionada:** D-CF-155 |
| `UI-19` | P3 | M | Añadir tiradores redimensionables entre las columnas de la mesa | El HTML del prototipo los tiene. Hoy la rejilla de `MesaDeSesion.tsx` es fija. **Antes:** «Del prototipo, sin entrar», «Tiradores redimensionables entre las tre…». **Depende de:** — · **Relacionada:** D-CF-149 |
| `UI-20` | P3 | S | Implementar los atajos 1–5, R, Z y Espacio de la barra, o declararlos fuera | Los `<kbd>` no se pintan para no prometer teclas que no existen (D-CF-149). **Antes:** «Del prototipo, sin entrar», «Atajos 1–5 … R, Z y Espacio…». **Depende de:** — · **Relacionada:** MESA-23 |
| `UI-21` | P3 | S | Volver a medir la tarjeta del DM contra el prototipo y bajarla a una fila si sigue en 148 px | La medida era de `mesa-prototipo`. Los mandos y las condiciones ocupaban una fila de más. **Antes:** «Del prototipo, sin entrar», «La tarjeta del DM mide 148 px frente a l…». **Depende de:** — · **Relacionada:** — |
| `UI-22` | P3 | S | Medir en navegador la banda con asistencia declarada a 1024 | El título puede quedarse sin ancho en la fila del DM. **Antes:** I2. **Depende de:** — · **Relacionada:** — |
| `UI-23` | P3 | S | Pasada de medida en navegador del árbol del mundo: (a) el anillo de vecinos se solapa con 9 o más | Cuatro menores que se juzgan usando el árbol (P-2, 2026-09-17); ninguno se ha medido en navegador desde entonces. **(b)** Enseñar «Leer más» solo cuando el cuerpo desborda **(c)** Medir a ancho estrecho y repartir buscador y chip **(d)** Medir a 1280×800. **Antes:** P-2 (2026-09-17). **Depende de:** — · **Relacionada:** — |
| `UI-24` | P3 | S | El autor mira la hoja desplegada y dice si sigue leyéndose como tablas | **Decide el autor.** Sin más maquetación a ciegas hasta su lectura. **Antes:** anexo del pulido #2. **Depende de:** — · **Relacionada:** — |
| `UI-25` | P3 | S | Opcional: que la lista de Atajos diga «(sin personaje)» junto a N e I para el DM | **Decide el autor.** Esconder los botones no se hace (decisión tomada). **Antes:** auditoría de interfaz 1.4. **Depende de:** — · **Relacionada:** — |
| `UI-26` | P3 | M | Opcional: interruptor imperial/métrico en Ajustes que formatee al vuelo | **Decide el autor.** Medido: D-2B-4 (kg, pies para distancia) y D-CF-92/115 (alcances en metros por el SRD español) bloquean la unificación. **Antes:** auditoría de interfaz 17.1/21.12. **Depende de:** — · **Relacionada:** — |
| `UI-27` | P3 | M | URL para los tres cajones y reagrupar los diez destinos en tres grupos | **Decide el autor.** Compatible con D-R-8/9. **Antes:** auditoría de interfaz 14.1/14.4/21.11. **Depende de:** 3B (D-CF-161) · **Relacionada:** — |
| `UI-28` | P3 | M | Pantalla de prueba de las animaciones y preferencia global Completos / Discretos / Ninguno | **Decide el autor.** Medido: Aplazada por D-CF-161; `grep "Discretos"` en `apps/web/src` vacío. **Antes:** auditoría de interfaz 19.2/19.3. **Depende de:** 3B (D-CF-161) · **Relacionada:** — |
| `UI-29` | P3 | M | Dados 3D con `dice-box` si el autor lo retoma | **Decide el autor.** Opción autoalojable `dice-box` (BabylonJS/AmmoJS); coste: peso y reescribir `DadoTridimensional.tsx`. **Antes:** anexo del pulido #13. **Depende de:** — · **Relacionada:** — |
| `UI-30` | P3 | S | Añadir al prototipo navegable el estado 20.1, el ataque resuelto | Fuera del repositorio: es el prototipo navegable prototipo-dnd.html de la carpeta Mine. Quedaba «para la próxima pasada, tras desplegar», y ya se desplegó. **Antes:** auditoría de interfaz §20, 20.1. **Depende de:** — · **Relacionada:** — |

## DEP — Despliegue y CI

| ID | P | T | Tarea | Detalle |
|---|---|---|---|---|
| `DEP-01` | P1 | S | Falta solo la prueba del límite de intentos desde una segunda red, que hace el autor | **Decide el autor.** Hecho el 2026-10-03 con aprobación: push de `11749e1`, copia leída con `pg_restore`, despliegue y humo. Con el límite agotado desde una red, un intento desde datos móviles tiene que dar 401, no 429. **Antes:** AD-10. **Depende de:** — · **Relacionada:** TEST-01, ADR 0001, D-AD-9 |
| `DEP-02` | P1 | S | Restaurar un volcado en un contenedor desechable y comparar filas con producción | **Decide el autor.** Ni la copia diaria de las 04:00 ni el volcado manual previo se han restaurado nunca. Lo pide `03-despliegue.md`, § «Copias de seguridad», punto 5. El autor decide cuándo. **Antes:** AD-11; «La copia de seguridad de esta base: copia manual antes de ca…», «Una restauración de esta base sigue sin …». **Depende de:** — · **Relacionada:** D-AD-6 |
| `DEP-03` | P3 | L | Subir a Nest 12 y quitar el `override` de `fastify` | Nest 11 fija `fastify` exacto; Nest 12 es solo ESM y pide Node ≥ 20.19, de ahí el tamaño. **Antes:** AD-2. **Depende de:** — · **Relacionada:** LEGAL-13, DEP-04 |
| `DEP-04` | P3 | M | Subir `react-router` a v7 y `@sentry/node` a 10 para quitar los cuatro moderados | `react-router` ×3 y `@opentelemetry/core` ×1 vía Sentry 8; fuera del umbral `high` del CI. **Antes:** AD-3. **Depende de:** — · **Relacionada:** LEGAL-13, DEP-03, LEGAL-04 |

## TEST — Pruebas

| ID | P | T | Tarea | Detalle |
|---|---|---|---|---|
| `TEST-01` | P1 | M | Que el CI vuelva a verde: hoy cae `e2e-browser` con cinco fallos fijos | **Decide el autor.** Medido el 2026-10-03: `test` pasa entero; `e2e-browser` da 5 fijos (barra-de-acciones, color-de-personaje, desbordes, elegir-camino, tablero-en-la-mesa), 1 inestable y 209 verdes. En local, la cabecera del registro mide 51 px contra 48 en `tablero-en-la-mesa`. El autor decide si se arregla antes de seguir desplegando o se sigue con la excepción. **Antes:** AD-1. **Depende de:** — · **Relacionada:** `03-despliegue.md` (pide CI verde), TEST-02 |
| `TEST-02` | P2 | S | Que `lanzar-conjuros` y `libro-de-conjuros` pasen en paralelo, o declarar `--runInBand` como decisión | En paralelo dan `read ECONNRESET` al sembrar el catálogo y luego 404 en cascada; solas y en serie pasan. Averiguar si es carga o límite de tiempo del cliente. **(b)** Averiguar el `ECONNRESET` de las respuestas grandes en los e2e de API. **Antes:** AD-7; «API», «El corte de respuestas > 64 KB en este P…». **Depende de:** — · **Relacionada:** TEST-01 |
| `TEST-03` | P3 | S | Decidir si se declara N2 (cobertura con umbral) | **Decide el autor.** El repo está en N1; el `04` dice «N2 no declarado, pendiente de decisión del autor». **(b)** N3 (mutación), que no tenía ficha propia. **Antes:** AD-13; «P2 — Ruta de mejora del nivel», «Sin umbral de cobertura (N2) ni mutación…». **Depende de:** — · **Relacionada:** 04 § «Nivel de verificación» |
| `TEST-04` | P3 | S | Decidir si los criterios del banco salen del repositorio o se acepta y declara | **Decide el autor.** `docs/10-banco-de-tareas.md` está en el repo; en la corrida del 2026-10-03 la T2 lo leyó antes de empezar y la medida quedó contaminada. **Antes:** AD-8. **Depende de:** — · **Relacionada:** `10-banco-de-tareas.md` |
| `TEST-05` | P3 | S | Si aparece un `import()` que cruce capas, añadir `no-restricted-syntax`; lo transitivo, con una herramienta de grafo si llega a darse | Hoy ningún cruce de capas usa esas formas; `require()` ya lo prohíbe `@typescript-eslint/no-require-imports`. **Antes:** AD-4. **Depende de:** — · **Relacionada:** `01-arquitectura.md` (regla de dependencias) |
| `TEST-06` | P2 | M | Activar `typescript-eslint` en modo type-checked, con cada paquete apuntando a su `tsconfig` | Cazaría promesas sin `await`, comparaciones imposibles y `any` implícitos. Cuesta tiempo de CI; es una tarea propia, no de rebote (D-OP-18). **Antes:** «P2 — Ruta de mejora del nivel», «Linting sin información de tipos…». **Depende de:** Partida de prueba (D-OP-18) · **Relacionada:** TEST-01 (CI) |
| `TEST-07` | P3 | S | Unitarias de `fraseDeMotivos`, `fraseDeRecurso` y `actions.schema.ts` | Hoy solo las cubren de rebote las RTL de `BarraDeAcciones`. **Antes:** M7. **Depende de:** — · **Relacionada:** — |
| `TEST-08` | P3 | S | Tres RTL de `LanzarConjuro`: «uno» manda `[id]`, «Quitar» manda `estado: null` y `puedeEditar: false` no pinta acciones | Hoy el caso «uno» solo lo cubre Playwright. **Antes:** m-8. **Depende de:** — · **Relacionada:** — |
| `TEST-09` | P3 | S | Quitar la cabecera pegajosa de la captura `conjuros-1280.png`, o capturar solo la pestaña | `conjuros.spec.ts` hace `page.screenshot({ fullPage: true })` sin quitar el `sticky`, y la cabecera sale superpuesta. **Antes:** 3A.2, Web, m-11. **Depende de:** — · **Relacionada:** — |
| `TEST-10` | P3 | S | Medir el desnivel cuando haya contenido con dos tarjetas comparables (conjuros, nivel alto) | La prueba lo declara como hueco honesto; con 3A ya hay conjuros y podría ejercitarse. **Antes:** «Fichas menores dejadas por la revisión final de la rama (202…», «Hoja: El desnivel de Rasgos, Recursos y …». **Depende de:** — · **Relacionada:** — |
| `TEST-11` | P3 | S | Cruzar en una prueba el nivel de cada aptitud de `classes.ts` con el de `class-features-srd.json` | El argumento «dos copias derivan» ya no vale: hay una segunda fuente independiente (Foundry) **Antes:** S10. **Depende de:** — · **Relacionada:** — |
| `TEST-12` | P3 | S | Dejar escrito, en `08-pruebas.md` o en el propio caso, que el e2e de concurrencia de `ability-rolls` comprueba el resultado y no el cerrojo | El caso «DADOS con intentos: 1 — dos POST a la vez: exactamente un 201 y un 409 (cerrojo FOR UPDATE)» de `reglas-de-la-mesa.e2e-spec.ts` lanza las dos peticiones con `Promise.all` y acepta `[201, 409]`: si las dos llegaran en serie también pasaría, así que no prueba el cerrojo. Hoy ningún documento lo advierte. **Antes:** «Menores dejados por la revisión final de `cierre/antes-de-3a2`», fila «API / reglas de la mesa». **Depende de:** — · **Relacionada:** TEST-02 |

## DOC — Documentación

| ID | P | T | Tarea | Detalle |
|---|---|---|---|---|
| `DOC-01` | P2 | S | Revisar el triaje del 2026-10-03 y autorizar el push | **Decide el autor.** El plan `superpowers/plans/2026-10-03-triaje-06.md` se ejecutó el 2026-10-03 y este tablero es su resultado; las dos preguntas de su Task 0 las contestó el autor (sin área de preguntas, escala P0–P3). Falta que el autor lo revise y autorice el push. **Antes:** AD-12. **Depende de:** — · **Relacionada:** DOC-02, `04-convenciones.md` § A.4 |
| `DOC-02` | P2 | M | Plan propio para bajar `01-arquitectura.md` hacia 150 líneas, moviendo lo histórico a `_archivo/` | Techo declarado en el `04`: solo baja. La ficha vieja medía 457 líneas el 2026-10-03; hoy `wc -l` da 465, contra un tope de 150 de la plantilla. **Antes:** AD-5. **Depende de:** DOC-01 · **Relacionada:** DOC-01 |


---

## No re-abrir

Lo que se descartó o se cerró y **tiende a volver a proponerse**. Una línea por cosa, con el motivo y dónde
está la decisión.

- **El contador «N de M» al jugador** — el jugador solo ve sus propias peticiones y el número saldría falso;
  se aplicó y se revirtió el mismo día · E-N-5 y el commit `e84f2b2`.
- **Quitar el espacio fino de los miles** — es la convención de números de la interfaz · `04-convenciones.md`
  y `dominio/numeros.ts`.
- **Que la mesa a 390 px haga scroll como una página, o apilar las columnas hasta `lg`** — contradice el
  reseño de la mesa; lo segundo se probó y se revirtió el 2026-09-07 · `UI-01` y D-CF-26.
- **SEC-11 y montar copias automáticas nuevas** — la copia diaria de las 04:00 ya incluye esta base y antes de
  cada cambio en producción se hace un volcado manual · D-AD-6 y `03-despliegue.md`, § *Copias de seguridad*;
  lo que falta es probar a restaurar, `DEP-02`.
- **Los falsos positivos de la auditoría de interfaz** (2.4 celda fija para la barra, 7.4 «no permite tirar
  el daño», 7.6 «nada conecta con la CA», 11.4 «ir a lo último») — ya existían cuando se auditó · D-CF-156,
  D-CF-129, D-2.5-5 y `HiloDeSesion.tsx`.
- **Que perder la concentración borre el encantamiento** — lo quita el DM · D-CF-130.
- **Unificar los botones apagados a `disabled`**, **15 px de letra en la mesa** y **cuadrados de 32 px** —
  decididos · D-CF-121 y E-14-4, D-POD-9, D-CF-149.
