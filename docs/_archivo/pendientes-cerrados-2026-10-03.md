# Pendientes cerrados en el triaje del `06` (2026-10-03)

Las fichas que el triaje por áreas (regla A.4 del `04`) encontró **resueltas** o **descartadas**. Cada evidencia la
comprobó quien orquestó el triaje con sus propios comandos (`git show --stat`, `grep` en el árbol de `65183f2`,
o la decisión en `decisiones.md`) antes de cerrarla. El texto viejo entero de cada una está en la copia literal,
[`pendientes-tablero-viejo-2026-10-03.md`](./pendientes-tablero-viejo-2026-10-03.md), bajo la sección que se cita.

## Resueltas (53)

| ID viejo | Sección vieja | Primeras palabras | Evidencia |
|---|---|---|---|
| 3.1, 3.4, 3.6, 5.1, 5.3/16.3, 6.2, 10.1/10.2, 2.5, 10.5, 2.3, 4.1 (texto), 17.4 | A · Fichas abiertas — en el plan (correcciones menores y gráficas) — h | «Textos que mienten o se repiten (plan, Tasks 1–4)» | Commits 6a07ccb, fd77100, 697b43a y c390acc (fusionados en 894f2ad). Hoy: «sus 1 asalto», «Recibo daño» y «Me curo» dan 0 resultados; `hilo/tirada.ts` → `origen: "Resultado"`; `ColumnaElenco.tsx` lleva el comentario «3.6 — Su turno solo con el combate ya ACTIVE». |
| 8.1, 8.2, 8.6 | A · Fichas abiertas — en el plan (correcciones menores y gráficas) — h | «Hoja (Task 5)» | Commit c390acc: toca `FichaDeElenco.tsx`, `Cabecera.tsx`, `AvisoDeDm.tsx` y añade `__tests__/AvisoDeDm.test.tsx` y `dominio/__tests__/nombres.test.ts`. |
| 12.1, 12.2 | A · Fichas abiertas — en el plan (correcciones menores y gráficas) — h | «Condiciones (Task 6)» | Commit c390acc: `PonerCondicion.tsx` y `__tests__/PonerCondicion.test.tsx`; «Las quince del manual» ya solo aparece en un comentario histórico de `PonerCondicion.tsx`. |
| 17.2/9.4/8.7, 17.3 | A · Fichas abiertas — en el plan (correcciones menores y gráficas) — h | «Números y fechas (Task 7)» | Commit c390acc: crea `dominio/numeros.ts`, `dominio/fechas.ts` con sus pruebas y toca `PanelCarga.tsx`. |
| 21.10=10.3, 13.1, 15.1, 15.2, 15.3 | A · Fichas abiertas — en el plan (correcciones menores y gráficas) — h | «Cajones con dos cabeceras (Task 8)» | Commit aa49d43: `PedirTirada`, `ConsultaDelMundo`, `PanelDeBestiario`, `PanelDeTablas`, `PaginaDeInventario` y la prueba nueva `features/__tests__/CabeceraNinguna.test.tsx`. |
| 15.4, 16.1 (primera mitad), 13.4, 13.3 | A · Fichas abiertas — en el plan (correcciones menores y gráficas) — h | «Reordenes (Task 9)» | Commit aa49d43: `PgTemporales.tsx` nuevo en el menú de la criatura (`MandosDeCombatiente`), `RelojDeCampana.tsx`, `ReglasEnLaMesa.tsx` y `BotonEjecutar.tsx`. |
| 1.5, 4.4, 4.3, 3.2 | A · Fichas abiertas — en el plan (correcciones menores y gráficas) — h | «Lo que la regla de casa ya exigía (Tasks 10–11)» | Commit 4f558b6 («stamps never disabled; grouped turn label, tie badge, compact missing-rolls box»): `TiraDeIniciativa`, `TiradasPendientes`, `HiloDeSesion` y sus pruebas; «Goblins (» y «Empezar igualmente» existen hoy. |
| 18.2, 18.3, 10.6, 19.1, 4.5, 4.9, 9.3, 11.3 | A · Fichas abiertas — en el plan (correcciones menores y gráficas) — h | «Accesibilidad y comodidad (Tasks 12–13)» | Commit b092882: `tokens-contrast.spec.ts`, `index.css` (anillo de foco), `efectos.css` (destello), `BarraDeAcciones`, `EconomiaDeAccion`, `FiltrosDeObjetos` y sus pruebas. |
| 1.5 | C · Chocan con una decisión tomada — para el autor, con lo que sí se p | «Un "Anotar" + chips» | Lo que cabía (no apagar los seis sellos) se hizo en 4f558b6; el «Anotar» con chips lo bloquea D-CF-149. |
| 5.2/16.2 | C · Chocan con una decisión tomada — para el autor, con lo que sí se p | «No listar PNJ en Dar PX» | La parte que cabía (una nota, no cuatro) se hizo en 6a07ccb: `DarXp.tsx`, comentario «Nota única para todo el elenco bloqueado». Esconder los PNJ lo bloquea E-PE-12. |
| PE-1 | Dejado por «puerta de efectos» (2026-09-14) — … | «PE-1 · Menores aplazados de las dos revisiones…» — cerrada el 2026-09-14 | Merge baea692 («PE-1 minors closed (D-CF-88..91)»); 6dbe4b7 toca character-sheet.service, xp.service, roll-requests.service, GrupoDeRadios, DarXp, TirarAtaqueBoton, puerta-de-efectos.spec |
| PE-1 (API) | Dejado por «puerta de efectos» (2026-09-14) — … | «`rollAttack` (DAMAGE) acepta un `attackRollEventId` de otro ataque…» | 6dbe4b7 («damage roll must cite its own attack»), cambios en `character-sheet.service.ts` y su spec |
| PE-1 (API) | Dejado por «puerta de efectos» (2026-09-14) — … | «`XpService.award` bloquea las filas en el orden de entrada…» | 6dbe4b7 («XP locks by id»), `apps/api/src/characters/xp.service.ts` y su spec |
| PE-1 (Web) | Dejado por «puerta de efectos» (2026-09-14) — … | «El espacio fino de miles (U+202F) en `frasesDeXp` rompería los `getByText`…» | La premisa cambió: c390acc introdujo `ESPACIO_FINO` (bytes E2 80 AF = U+202F) en `apps/web/src/dominio/numeros.ts`; `frasesDeXp` (`character-sheet/vocabulario.ts`) usa `conEspacioFino`; lo fijan `numeros.test.ts` y `frasesDeXp.test.ts`; los e2e de PX solo usan cifras menores de mil («0 / 300 PX») |
| PE-1 (Web) | Dejado por «puerta de efectos» (2026-09-14) — … | «Con la tirada a ciegas, «salvó/falló» de `effectApplied` revela el resultado…» | D-CF-88 + 6dbe4b7 (`roll-requests.service.ts`, `TiradasPendientes.tsx` y su prueba) |
| PE-1 (Web) | Dejado por «puerta de efectos» (2026-09-14) — … | «`GrupoDeRadios` existe tres veces…» | 6dbe4b7 crea `apps/web/src/ui/GrupoDeRadios.tsx`; hoy lo importan ReglasDeLaMesa, Condiciones, DarXp y otros |
| PE-1 (Web) | Dejado por «puerta de efectos» (2026-09-14) — … | «`DarXp` dentro de `CapaDeCombate` no va con `key` por propuesta…» | 6dbe4b7 toca `CapaDeCombate.tsx` y `DarXp.tsx` («DarXp keyed by proposal») |
| PE-1 (e2e) | Dejado por «puerta de efectos» (2026-09-14) — … | «El bucle «hasta impactar» de `puerta-de-efectos.spec.ts` es probabilístico…» | 6dbe4b7 («deterministic hit loop in e2e»): `TirarAtaqueBoton.tsx` + `puerta-de-efectos.spec.ts` |
| PE-1 (e2e) | Dejado por «puerta de efectos» (2026-09-14) — … | «`iniciativa-en-vivo.spec.ts` estaba rojo en `main` desde D-CF-66…» | 4e17a69; el helper de `apps/web/e2e/iniciativa-en-vivo.spec.ts` ya no manda `level` (comentario «Sin `level`: desde D-CF-66») |
| PE-2 | Dejado por «puerta de efectos» (2026-09-14) — … | «PE-2 · Un e2e de concurrencia real para `apply-damage` y `POST /xp`» — cerrada | 94a4755 añade `apps/api/test/concurrencia-puerta.e2e-spec.ts` (dos `apply-damage` en `Promise.all`: un 2xx y un 409; dos `POST /xp`: suma) |
| #1 | Los 24 puntos del anexo (…), uno a uno | «Acciones de la fila del elenco se salen de la tarjeta» | e61b865…6b54aa4 en main; `apps/web/src/ui/MenuDeAcciones.tsx` existe |
| #3 | Los 24 puntos del anexo (…), uno a uno | «Casillas de los cinco números no simétricas» | cae172f…2bce0e0 en main; `character-sheet/Casilla.tsx` |
| #4 | Los 24 puntos del anexo (…), uno a uno | «PG con «+5 temporales» más ancho que las demás» | Misma `Casilla` (cae172f) |
| #5 | Los 24 puntos del anexo (…), uno a uno | «Falta reparto/tirada de características al crear personaje» | Hecho por «reglas de la mesa»: 06c3aff (`tableRules`, SRD *Determine Ability Scores*), `ability-rolls.service.ts` y modelo `AbilityRollAttempt`; D-CF-53 |
| #6 | Los 24 puntos del anexo (…), uno a uno | «Sticky del detalle de Objetos se corta bajo la banda fija» | a3ec1bf…ee4eaa6; `--banda-fija-alto` en `HojaCalculada.tsx` con su prueba |
| #7 | Los 24 puntos del anexo (…), uno a uno | «Huecos en Ficha/Rasgos y aptitudes/Personalidad» | 6253b2f + `apps/web/e2e/espacios.spec.ts` |
| #8 | Los 24 puntos del anexo (…), uno a uno | «*Tearing* al escribir…» | 6253b2f (`Field.reservaEspacio`, hoy en uso en BandejaDeDados y CampaignSettings) + fb72ed0 (`SelectorDeVentaja`) |
| #9 | Los 24 puntos del anexo (…), uno a uno | «Su color/visibilidad/Archivar-Borrar desordenados» | 9933b5e, 2bf1a85; `characters/AjustesDePersonaje.tsx` |
| #10 | Los 24 puntos del anexo (…), uno a uno | «Formulario de dados poco intuitivo» | 430e703…fb72ed0; `rolls/BandejaDeDados.tsx` |
| #11 | Los 24 puntos del anexo (…), uno a uno | «El resultado de varios dados da un solo valor» | 12af590 (`dice[]`) + `rolls/ResultadoDeTirada.tsx` |
| #12 | Los 24 puntos del anexo (…), uno a uno | «Los atajos de dado comparten el mismo glifo» | c1677f3; `IconoDado` en `apps/web/src/ui/Iconos.tsx`; D-CF-62 |
| #14 | Los 24 puntos del anexo (…), uno a uno | «Cajón «La mesa tira» mal distribuido» | 9933b5e + bandeja (430e703) |
| #15 | Los 24 puntos del anexo (…), uno a uno | «El hilo no nombra sujeto ni objetivo» | 64330ac, cdf8d00; `sessions/nombres-del-hilo.ts` |
| #16 | Los 24 puntos del anexo (…), uno a uno | «Dados de campaña: reloj y formularios mal repartidos» | Misma rejilla de #14 (9933b5e, 430e703) |
| #17 | Los 24 puntos del anexo (…), uno a uno | «Espacios perdidos en varias pantallas» | a3ec1bf…ee4eaa6, `medirHermanas` en `espacios.spec.ts` |
| #18 | Los 24 puntos del anexo (…), uno a uno | «Salir de la mesa lleva a todas las campañas» | aabd016; `BandaDeMesa.tsx` se fundió en `sessions/BandaUnica.tsx` (1b9d9a0), que conserva el comportamiento del anexo #18 |
| #19 | Los 24 puntos del anexo (…), uno a uno | «Faltan ajustes del DM antes de la hoja de cada jugador» | 06c3aff + 1e828ae (bloque «Reglas de la mesa» en ajustes de campaña, `ReglasDeLaMesa.tsx`); D-CF-53 |
| #20 | Los 24 puntos del anexo (…), uno a uno | «Botones de PG temporales del bestiario parecen no hacer nada» | 28e4afb, 3dd2786; `bestiario/DarTemporales.tsx` |
| #21 | Los 24 puntos del anexo (…), uno a uno | «Catálogo de objetos sin filtros» | df15c30; `ui/FilterChip.tsx` |
| #22 | Los 24 puntos del anexo (…), uno a uno | «Botones primarios sin icono» | c1677f3…1c30fe8 en main |
| #23 | Los 24 puntos del anexo (…), uno a uno | «El grafo del mundo poco intuitivo» | f38823b…a69d069; D-CF-64; `sessions/taller/mundo/` |
| X1, enlaces, J5, I4/M2B-5, I3/M2B-15, `race`/`class`, cambio de cantidad | Decidido el 2026-09-10 y todavía abierto — el trabajo que queda, con s | «~~X1 `RestKind`~~ · ~~enlaces sin rótulo~~ … (hechas)» | 0663332 («drop the dead RestKind enum»); `race`/`class` ya no están en `schema.prisma`; fichas en `_archivo/pendientes-cerrados-2026-09-10.md` |
| R1, D8, P3, H7, E0, P6 | Decidido el 2026-09-10 y todavía abierto — el trabajo que queda, con s | «R1 límite por IP · D8 correo · P3 archivar en la mesa · H7 rearmar · E0 TipTap  | a52870b (R1), 845a0ab (D8), 2a9323a (P3), 4e5e80d (E0 y P6); H7 en `_archivo/historial-2026-09-11-tanda-de-las-decididas.md` |
| — | Dejado por la tarea 11 del pulido (C4, #15), ronda de revisión (2026-0 | «e2e: un dueño citando un PNJ `DM_ONLY` como `sourceCharacterId` es 404» | 94a4755 añade a `apps/api/test/dano-con-su-traza.e2e-spec.ts` el caso «un origen que SÍ existe pero este actor no ve es 404, y no se escribe nada (tarea 11)» |
| P1 | P1 · Un mago no tiene conjuros — cerrada el 2026-09-18 por 3A.2 | «Movida entera a `_archivo/pendientes-cerrados-2026-09-18-3a2.md`…» | Merge 5cc14a2 (3A.2); existen `apps/web/e2e/conjuros.spec.ts`, `apps/web/e2e/lanzar.spec.ts` y el archivo citado |
| S2 | Deuda de las tareas 2A.3 y 2A.4 (catálogo SRD y elecciones) — 2026-09- | «De cada aptitud de clase se transcribió el nombre y el nivel, no su texto de re | af3f0b0 y ec7fbfb (3A.1): `class-features-srd.json` trae `textEs` en 228 de 234 aptitudes; `RasgosYAptitudes` lo pinta en un `<details>` |
| D8 (despliegue) | Segunda pasada del contraste modelo/API ↔ pantalla (2026-09-01) | «La recuperación de contraseña no es un hueco simple… su ficha viva es D8 del bl | `845a0ab` («feat: an administrator resets a forgotten password with a temporary one», «Closes ticket D8»): `apps/api/src/auth/admin.controller.ts`, `POST /admin/password-resets`, con e2e de API, RTL y Playwright. Archivada en `_archivo/pendientes-cerrados-2026-09-10.md` § D8. Decisión D-CF-18. |
| N4 | Cierre de la fase 2A — lo que las auditorías del 2026-09-02 encontraro | «La precisada es `N4`, que sigue abierta: el nombre de la regla viaja en el avis | `f43bb76` («feat(api): proposals carry their rule's name»): `RulesEngineService.listProposals` hace `include` de la regla y devuelve `ruleName`. Hay un e2e «el listado de propuestas trae el nombre de la regla (ficha N4)». Archivada en `_archivo/pendientes-cerrados-2026-09-10.md` § N4. |
| J5 | Mesa de agentes del 2026-09-02 — un DM y un tramposo contra la API rea | «Del registro sigue faltando el suceso de muerte, que es la ficha `J5`… y sigue  | `e321c55` («feat: quantity changes and deaths leave a trace in the log»): `CHARACTER_DIED` en `GameEventType` (migración `20260911141500_character_died_event`), escrito en `character-sheet.service.ts` y `conditions.service.ts`. Archivada en `_archivo/pendientes-cerrados-2026-09-10.md` § J5. Decisión D-CF-14. |
| PM-1 | PM-1 · `entityId` en respuestas de mutación no pasa por la redacción ( | «Cerrada. Decisión del autor: no redactar las quince respuestas de mutación — qu | `94a4755` («fix: close the batch's pending items — mutation responses drop entityId…»): `sinEntityId`/`sinEntityIdEnRespuesta` en `common/entity-link.ts`, usados en `characters.service.ts`, `character-sheet.service.ts`, `rest.service.ts` y `level-up.service.ts`. Pruebas en `entity-link.spec.ts` y `pnj-del-mundo.e2e-spec.ts`. |
| PM-1 | PM-1 · `entityId` en respuestas de mutación no pasa por la redacción ( | «Abierto, declarado al escribir el plan (E-PM-10)… Las respuestas de MUTACIÓN de | El commit `94a4755` cubre el párrafo entero. Hoy no queda ninguna mutación que devuelva la fila cruda de `Character` a un no-DM: `inventory` devuelve solo monedas; las condiciones y los recursos solo leen `id`/`name`/`visibility` del objetivo; las de `npcs.service.ts` son de DM (`requireDM`). |
| T3 | T3 · Revelar un grupo entero desde el orden de turnos, de un solo clic | «Cerrada. Decisión del autor: «Revelar» junto a «oculto» en `TiraDeIniciativa` r | `94a4755`: `NpcBulkVisibilityController` (`POST reveal-many`) en `statblocks/npc-visibility.controller.ts`, registrado antes en `statblocks.module.ts`, más `NpcsService.revealMany`. En la web, `useRevealNpcs` se usa en `TiraDeIniciativa.tsx`. Decisión D-CF-87. |
| T3 | T3 · Revelar un grupo entero desde el orden de turnos, de un solo clic | «Abierto, sin decisión de producto (histórico, ya resuelto arriba)» | El mismo commit, `94a4755`, cubre el párrafo entero: el grupo se revela con un solo clic y el elenco sigue revelando uno. |

## Descartadas (13)

Una descartada no se hará; la evidencia dice quién lo decidió.

| ID viejo | Sección vieja | Primeras palabras | Decisión |
|---|---|---|---|
| 3.5 | C · Chocan con una decisión tomada — para el autor, con lo que sí se p | «Contador "N de M" al jugador» | E-N-5 (autor, 2026-09-06); se aplicó y se revirtió en e84f2b2. |
| 2.4 | C · Chocan con una decisión tomada — para el autor, con lo que sí se p | «Celda fija para la barra» | D-CF-156: ya está en la fila `auto` del centro en los dos modos; falso positivo. |
| 4.6/8.5 | C · Chocan con una decisión tomada — para el autor, con lo que sí se p | «Unificar a disabled» | D-CF-121 y E-14-4. |
| 7.4 | C · Chocan con una decisión tomada — para el autor, con lo que sí se p | «"No permite tirar el daño"» | Ya existe la bandeja (E-PE-3, D-CF-129). |
| 7.6 | C · Chocan con una decisión tomada — para el autor, con lo que sí se p | «"Nada conecta con la CA"» | Ya existe (E-PL-9, D-2.5-5). |
| 11.4 | C · Chocan con una decisión tomada — para el autor, con lo que sí se p | «"Ir a lo último"» | Ya existe: `HiloDeSesion.tsx` pinta «Hay algo nuevo abajo». |
| 13.2 | C · Chocan con una decisión tomada — para el autor, con lo que sí se p | «Tres niveles de visibilidad» | Modelo de datos, `canView`, D-2B-8 y D-CF-10. La comprobación que pedía está hecha: `ui/Badge.tsx` pinta siempre `ETIQUETA_DE_NIVEL[visibility]` junto al glifo. |
| 18.4 | C · Chocan con una decisión tomada — para el autor, con lo que sí se p | «15 px en la mesa» | D-POD-9; «Nada sin el autor». |
| 18.5 | C · Chocan con una decisión tomada — para el autor, con lo que sí se p | «Cuadrados a 32 px» | D-CF-149 (1,6 rem es el prototipo). |
| — | API | «Perder la concentración no borra el encantamiento» | D-CF-130: «perder la concentración no borra el encantamiento (el DM lo quita)». |
| PE-1 (API) | Dejado por «puerta de efectos» (2026-09-14) — … | «`pendingDamage.targetCharacterId` viaja en el `ABILITY_ROLL`…» | D-CF-89 en `docs/decisiones.md` (aceptado, sin código) |
| PE-1 (API) | Dejado por «puerta de efectos» (2026-09-14) — … | «El dueño de un PNJ jugable con plantilla `DM_ONLY` puede cambiarle los PG» | D-CF-90 (aceptado, sin código) |
| PE-1 (API) | Dejado por «puerta de efectos» (2026-09-14) — … | «`answer()` no reintenta al fallar la aplicación del efecto» | D-CF-91 («se deja», aviso `effectWarning`) |
