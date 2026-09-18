# Pendientes cerrados el 2026-09-17 — tanda «cierre antes de 3A.2»

Movidas enteras desde `06-pendientes.md` al cerrarlas en la rama `cierre/antes-de-3a2`. Plan y
triaje en `superpowers/plans/2026-09-17-cierre-antes-de-3a2.md` (§0 dice qué se midió en cada una
y por qué las marcadas **F**/**D** se cierran sin código). Ver `07-historial.md`, «Cierre antes de 3A.2».

### Dados — empate y tope de dice (cerradas en T2)

Cerradas con código en la Tarea 2: `MAX_DADOS_POR_TIRADA` (`packages/shared/src/dice-limits.ts`)
sustituye el `.max(100)` suelto en `roll.schema.ts` y `game-event.schema.ts` por el producto real
del evaluador (10 términos × 100 dados × 2 por relanzar = 2000); y el empate en `kh`/`kl` queda
declarado — `evaluar` ya lo resolvía con un sort estable a favor del primero en caer, pero
`dadosTirados` reconstruía el marcado «kept» por posición emparejando valores de principio a fin,
lo que con dos dados iguales tachaba el físicamente equivocado. Se corrigió emparejando desde el
final (`apps/api/src/dice/dice.ts`, `dadosTirados`) para que la reconstrucción visual concuerde
con la regla ya vigente. Prueba: `apps/api/src/dice/dice.spec.ts`, describe `contrato de "dice"
(2026-09-17)`.

| Área | Qué | Dónde |
|---|---|---|
| Dados | Con dos dados de igual valor, el evaluador puede resolver «cuál se descarta» por posición en vez de por una regla explícita — ambigüedad, no bug observado | `apps/api/src/rules-engine/` (leer antes de tocar el evaluador) |
| Dados | `100d6r1` supera `rolls.max(100)` — preexistente a esta rama, no la introdujo, pero sigue sin fila propia | `apps/api/src/rules-engine/` (leer antes de tocar el evaluador) |
