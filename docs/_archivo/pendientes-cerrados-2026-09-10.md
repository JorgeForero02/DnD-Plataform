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
