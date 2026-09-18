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

### Sin ficha propia · `CharacterRow` no declara `entityId` (2026-09-14)

**Abierto, menor, encontrado en la Task 4.** `CharacterRow` (`apps/web/src/features/character-sheet/api.ts`)
no declara `entityId` en su tipo, aunque el servidor ya lo manda desde `GET
.../characters/:id/sheet` (redactado por `entityIdsVisibleFor`, como el resto de lecturas). No
rompe nada hoy —nada de la hoja lee ese campo—, pero una pantalla de la hoja que quisiera enlazar
«Ficha del mundo» desde ahí tendría que ensanchar el tipo primero.
