# 11 — Invariantes y glosario

> **Léelo antes de tocar una regla de dominio** o un servicio que la aplica: **una prueba que te
> contradice suele estar fijando un invariante, no señalando un bug.** Enlaza a `01`–`05` y a
> `decisiones.md`; no copia su texto.

Última revisión: **2026-10-03**

## Parte 1 — Invariantes

Las pruebas se citan por el texto del caso, no por línea. «Sin prueba» significa que ninguna prueba
fija el invariante tal cual; se indica qué ejercita algo cercano.

| Invariante | Dueño en el código | Prueba que lo fija | Decisión / dónde consta |
|---|---|---|---|
| Quién ve qué lo decide una sola función; nadie reimplementa la matriz | `canView` en `apps/api/src/common/visibility.ts` | `apps/api/src/common/visibility.spec.ts` (p. ej. «non-member (role null, not admin) sees nothing») y la matriz entera en `apps/api/src/common/visibilidad-matriz.spec.ts` | `CLAUDE.md`; `05-datos.md`, § *El modelo de visibilidad* |
| Hay exactamente cinco niveles de visibilidad (`PUBLIC`, `PLAYERS`, `SPECIFIC_PLAYERS`, `OWNER_DM`, `DM_ONLY`) | `enum Visibility` en `apps/api/prisma/schema.prisma` | la matriz de `visibilidad-matriz.spec.ts` recorre los cinco niveles contra `QUIEN_VE` de `@dnd/shared`. No impide *añadir* un sexto nivel si se añade también a la lista de la prueba: **Sin prueba** de que sean exactamente cinco | `05-datos.md`, § *El modelo de visibilidad* |
| Si un usuario pertenece a una campaña, y con qué rol, lo responde un solo servicio | `MembershipService.requireMember` / `requireDM` en `apps/api/src/campaigns/membership.service.ts` | `apps/api/src/campaigns/membership.service.spec.ts` — «requireMember throws when not a member», «requireDM throws when member is only a PLAYER» | `01-arquitectura.md`, § *Dirección de dependencias* |
| La hoja de 5.ª se **deriva**, no se guarda, y cada número trae su traza | `deriveCharacter` en `apps/api/src/rules/catalog/index.ts` (sobre `derive` de `apps/api/src/rules/engine.ts`) | `apps/api/src/characters/character-sheet.service.spec.ts` — «getSheet() deriva maxHp y CA con deriveCharacter, nunca de una columna»; la traza, en `apps/api/src/rules/engine.spec.ts` — «la pericia DUPLICA el bonificador, y la traza lo enseña en dos pasos» | `01-arquitectura.md`, § *Las tres capas de la fase 2A, y por qué no se tocan entre sí* |
| Un PNJ en la mesa es una fila de `Character` (lo distingue `statblockRef`), no un modelo nuevo | `NpcsService.instanciar` en `apps/api/src/statblocks/npcs.service.ts` | `apps/api/src/statblocks/npcs.service.spec.ts` — «el dueño es el DM, que es lo que hace valer las comprobaciones que ya existen» (comprueba que se crea un `Character` con `statblockRef`). **Sin prueba** de que no exista otro modelo de PNJ | `01-arquitectura.md`, fila `npcs` |
| El reloj de campaña son segundos de juego que solo avanzan, y solo el DM lo mueve | `GameClockService` en `apps/api/src/game-clock/game-clock.service.ts` | `apps/api/src/game-clock/game-clock.service.spec.ts` — «se avanza con `increment`, no con un valor calculado aquí» y «avanzarlo es solo del DM» | `01-arquitectura.md`, fila `game-clock` |
| Como mucho un encuentro activo por sesión, y lo garantiza la base | índice único parcial sobre `Encounter(sessionId)` (migraciones `20260904040055_encounters_and_initiative` y `20260905120001_encounter_preparing_data`, esta última lo extiende a `PREPARING`) | `apps/api/test/encounters.e2e-spec.ts` — «la base, no el servicio, impide un segundo encuentro activo en la misma sesión» | `01-arquitectura.md`, fila `encounters` |
| Una ranura, un objeto | índice único parcial (migración `20260903063419_inventory_one_item_per_slot`) | `apps/api/test/inventory.e2e-spec.ts` — «… dos peticiones simultáneas de equipar en la misma ranura vacía — una gana, la otra choca con 409» | `01-arquitectura.md`, fila `inventory` |
| Como mucho tres sintonizaciones | `InventoryService` en `apps/api/src/inventory/` | `apps/api/src/inventory/inventory.service.spec.ts` — «MUTACIÓN CLAVE: la cuarta sintonización se rechaza con 400 y nombra a las tres» | `01-arquitectura.md`, fila `inventory` |
| El azar vive en el servidor: el servidor tira y escribe la tirada antes de devolverla | `rolls/` (`RollsService`) con el tirador `defaultRoller` de `apps/api/src/dice/dice.ts`, que usa `crypto.randomInt`; ningún otro código de producción de la API llama a `Math.random` | `apps/api/test/rolls.e2e-spec.ts` — «treinta tiradas de d20 caen todas dentro de 1..20 — el azar es del servidor» y «un jugador tira, y el DM lo ve en el log». **Sin prueba** de que el servidor no acepte un resultado enviado por el cliente (la barrera es que `createRollSchema` no lo admite) | `01-arquitectura.md`, fila `rolls` |

## Parte 2 — Glosario

| Término | Definición | Entidad / tabla |
|---|---|---|
| **Ficha** (del mundo) | Una entidad del wiki de la campaña: PNJ, lugar, misión, facción, objeto, evento o documento | `Entity` |
| **PNJ de la mesa** | La instancia jugable de un statblock: una fila de `Character` con `statblockRef` | `Character` |
| **Statblock** | La plantilla de números de una criatura, del SRD (en código) o del DM (en la base) | catálogo SRD / `CampaignStatblock` |
| **DM** | Quien dirige la campaña; en el código, el rol de la membresía | `CampaignMember.role` |
