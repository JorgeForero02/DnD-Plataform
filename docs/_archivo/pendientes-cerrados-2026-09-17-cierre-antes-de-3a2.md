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
