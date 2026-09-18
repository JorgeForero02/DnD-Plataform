# Pendientes cerrados el 2026-09-17 — tanda «cierre antes de 3A.2»

Movidas enteras desde `06-pendientes.md` al cerrarlas en la rama `cierre/antes-de-3a2`. Plan y
triaje en `superpowers/plans/2026-09-17-cierre-antes-de-3a2.md` (§0 dice qué se midió en cada una
y por qué las marcadas **F**/**D** se cierran sin código). Ver `07-historial.md`, «Cierre antes de 3A.2».

### Dados — empate y tope de dice (cerradas en T2)

Cerradas con código en la Tarea 2: `MAX_DADOS_POR_TIRADA` (`packages/shared/src/dice-limits.ts`)
sustituye el `.max(100)` suelto en `roll.schema.ts` y `game-event.schema.ts` por el producto real
del evaluador (10 términos × 100 dados × 2 por relanzar = 2000).

El empate en `kh`/`kl` queda resuelto, no solo declarado, y en dos rondas: la primera
(`02dc6ad`) hizo que `dadosTirados` emparejara `dropped` contra `rolled` **desde el final** en
vez de desde el principio, lo que arreglaba el empate pero rompía `1d20r1` — con relanzar, el
físico descartado es el *primero* en caer, justo el orden contrario al que pide el empate, y un
emparejado por *valor* no puede acertar los dos a la vez porque `dropped` no lleva posición. La
segunda ronda quita la reconstrucción por completo: `evaluarTermino` (`apps/api/src/dice/dice.ts`)
ya sabe, dado por dado, cuál físico cuenta —tanto el que pierde por relanzar como el que pierde
por `kh`/`kl`— y lo deja en el nuevo campo `DiceTermResult.dice`, por posición; `dadosTirados` pasa
a ser una simple concatenación (`terms.flatMap((t) => t.dice)`). Pruebas:
`apps/api/src/dice/dice.spec.ts`, describe `contrato de "dice" (2026-09-17)` (empate, relanzar
solo, y relanzar+kh combinados en la misma tirada).

| Área | Qué | Dónde |
|---|---|---|
| Dados | Con dos dados de igual valor, el evaluador puede resolver «cuál se descarta» por posición en vez de por una regla explícita — ambigüedad, no bug observado | `apps/api/src/rules-engine/` (leer antes de tocar el evaluador) |
| Dados | `100d6r1` supera `rolls.max(100)` — preexistente a esta rama, no la introdujo, pero sigue sin fila propia | `apps/api/src/rules-engine/` (leer antes de tocar el evaluador) |

### Mover código (cerradas en T3)

Cerradas sin cambiar comportamiento en la Tarea 3, moviendo código: #6 (el resumen de audiencia
pasa a `vocabulario.ts`), #8 (`DadoDibujado` se funde en `IconoD20`), #9 (`normalizarTexto` sale a
`apps/web/src/lib/texto.ts`, una sola copia para inventario y árbol del mundo), #10
(`conDadoAnadido` se retira, sin consumidores) y #11 (`CorregirBando.tsx` se renombra a
`accionesDeBando.ts`); y se declara `CharacterRow.entityId`, que el servidor ya mandaba.

| Área | Qué | Dónde |
|---|---|---|
| Dados | **Revisión final, #6**: `resumenAudienciaYCd` es una tercera traducción de `RollAudience` fuera de `apps/web/src/features/rolls/vocabulario.ts` — mover como campo `resumen` del vocabulario en vez de reescribirla en el componente | `apps/web/src/features/rolls/panel/PanelDeDadosDeLaMesa.tsx:85-98` |
| Dados | **Revisión final, #8**: `DadoDibujado.tsx` e `IconoD20` son dos envoltorios idénticos de `IconoDado caras={20}` — unificar en uno | `apps/web/src/features/rolls/DadoDibujado.tsx`; `apps/web/src/ui/Iconos.tsx` (líneas de `IconoD20`) |
| Dados | **Revisión final, #10**: `conDadoAnadido` (`apps/web/src/features/rolls/expresion.ts`) no tiene ningún consumidor en `src/` — retirarla cuando se confirme que el modo avanzado no la echa de menos | `apps/web/src/features/rolls/expresion.ts` |
| Elenco / menú | **Revisión final, #11**: `apps/web/src/features/sessions/elenco/CorregirBando.tsx` ya no tiene componente de fila (se borró en la Tarea 8) y solo exporta `useAccionesDeBando` — renombrar el fichero a `accionesDeBando.ts` la próxima vez que se toque | `apps/web/src/features/sessions/elenco/CorregirBando.tsx` |
| Mundo (árbol) | **Revisión final, #9**: `normalizar()` (pliega tildes para comparar) está copiada una sexta vez entre `DesgloseDelMundo.tsx` y `EditorDeHilos.tsx` — extraer a una lib compartida | `apps/web/src/features/sessions/taller/mundo/DesgloseDelMundo.tsx:42`; `apps/web/src/features/sessions/taller/mundo/EditorDeHilos.tsx:50` |

### RM-2 · Menores aplazados de la revisión final (con su línea en `final-review.md`) — cerrada el 2026-09-17

M-4, M-5, `attemptId` y concurrencia: cerradas en T1 de la tanda «cierre antes de 3A.2» (rama
`cierre/antes-de-3a2`). M-6, M-7, M-8, M-12: cerradas en T3. M-9, M-14: cerradas en T4 (esta
tarea) — `Number("")` en `ReglasDeLaMesa` ya no se manda (rango explicado en español antes del
`PATCH`) y el borrador se re-siembra desde fuera solo cuando el DM no está editando.

| | Qué | Coste |
|---|---|---|
| M-4 | `AbilityRollsService.list` moldea el `payload` releído a mano; pasar la respuesta por `abilityRollAttemptSchema.parse` | 20 min |
| M-5 | `of = 0` cuando la regla no es `DADOS` viola `abilityRollAttemptSchema.of.min(1)`; hacer `of` opcional o `Math.max(1, …)` | 10 min |
| M-6 | La invalidación de `abilityRollsKey` en `useUpdateSheet` es redundante (prefijo ya invalidado) — quitar o corregir el comentario | 5 min |
| M-7 | `as CreateCharacterInput` en `CharacterEditor`: exportar `z.input<typeof createCharacterSchema>` en shared y usarlo | 10 min |
| M-8 | `r as DesgloseDeTirada` en `AsignarCaracteristicas`: probar sin moldear; si no compila, `dc?` en el DTO | 10 min |
| M-9 | `Number("")` = 0 en los campos numéricos de `ReglasDeLaMesa` se manda y vuelve un 400 técnico de Zod; comprobar rango en `onGuardar` y escribir la frase en español | 20 min |
| M-12 | `CARACTERISTICAS` en `IdentidadEditable.tsx` duplica `ORDEN_DE_CARACTERISTICAS` de shared | 5 min |
| M-14 | `borrador` de `ReglasDeLaMesa` se siembra una vez por campaña; re-sembrar cuando cambie la campaña y no haya edición en curso | 15 min |
| — | Sin e2e de concurrencia real para los cerrojos `FOR UPDATE` (M-1/M-2): las unitarias prueban el orden de las sentencias, no el bloqueo de Postgres. Un e2e con dos `POST …/ability-rolls` en `Promise.all` y `intentos: 1` → exactamente un 201 y un 409 | 30 min |
| — | `attemptId` bajo `MATRIZ`/`PUNTOS` se acepta y marca un intento caduco; rechazarlo con 400 cuando la regla no es `DADOS` | 10 min |

Y dos menores de «Mundo (árbol)» de la tabla de fichas menores de la revisión final (2026-09-13),
cerradas también en esta tarea:

| Área | Qué | Dónde |
|---|---|---|
| Mundo (árbol) | Borrar un hilo no invalida la consulta del otro extremo del enlace, así que su ficha puede quedar con el hilo fantasma hasta recargar | `apps/web/src/features/sessions/taller/mundo/EditorDeHilos.tsx` |
| Mundo (árbol) | Las raíces sin hijos se abren desplegadas por defecto en vez de plegadas | `apps/web/src/features/sessions/taller/mundo/DesgloseDelMundo.tsx` |

### Sin ficha propia · `CharacterRow` no declara `entityId` (2026-09-14)

**Abierto, menor, encontrado en la Task 4.** `CharacterRow` (`apps/web/src/features/character-sheet/api.ts`)
no declara `entityId` en su tipo, aunque el servidor ya lo manda desde `GET
.../characters/:id/sheet` (redactado por `entityIdsVisibleFor`, como el resto de lecturas). No
rompe nada hoy —nada de la hoja lee ese campo—, pero una pantalla de la hoja que quisiera enlazar
«Ficha del mundo» desde ahí tendría que ensanchar el tipo primero.
