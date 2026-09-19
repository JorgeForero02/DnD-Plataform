# Historial — Cierre antes de 3A.2 (2026-09-17/18)

**Una entrada de `07-historial.md` movida entera el 2026-09-18**, al escribir la entrada de cierre
de 3A.3: el fichero quedaba en 1035 de sus 1000 líneas tras archivar 3A.1 y los efectos de mesa, y
esta era la siguiente entrada completa más antigua. No se reescribe.

---

## Cierre antes de 3A.2 (2026-09-17/18) — rama `cierre/antes-de-3a2`, fusionada a `main` en `86134b4`, sin desplegar

Qué — RM-2 entera; de las menores de la revisión del 13, las arregladas y las marcadas F (ya
cerradas o falsas) y D (descartadas con motivo) en el §0 del plan — apuntar al §0 del plan
[`2026-09-17-cierre-antes-de-3a2.md`](./superpowers/plans/2026-09-17-cierre-antes-de-3a2.md);
`CharacterRow.entityId`; EM-1; y **el hallazgo real**: `dadosTirados` tachaba el dado equivocado
con valores repetidos (D-CF-122). Commits (`git log --oneline main..HEAD`):

```
c80609d test(web): table effects — unit tests for the pure detector, e2e proves the floating text leaves the DOM
d3ea708 test(web): sheet e2e selects boxes by data-casilla, asserts exactly five, cites the «Vel.» label
4aeb712 fix(web): log drawer keeps its Plegar/Desplegar label
c458da2 fix(web): one IconoPunta for every chevron; log drawer counts lines that arrive after folding
0e40447 fix(web): space activates a menu item once, advantage radios stay reachable, temp-HP prompt resets
6dfaf8b fix(web): table rules validate ranges in Spanish and reseed when idle; deleting a link refreshes both ends
b0005d7 refactor(web): fold duplicates — IconoD20, normalizarTexto, audience summary, accionesDeBando
3929214 fix(api): dice keep/drop flags come from the evaluator, not from value matching
02dc6ad fix(shared): dice cap matches the evaluator (2000), stable tie-break documented
d08029e fix(api): ability rolls — optional `of`, parsed list, reject attemptId outside DADOS, concurrency e2e
21a0ca2 docs(plan): pre-3A.2 cleanup — triage of open tickets and task plan
```

Por qué — deuda barata fuera antes de abrir 3A.2.
Revertir — la rama entera; ningún cambio de datos ni migración.

El autor entregó el prototipo de la mesa (D-CF-123).

Ola final tras la revisión Opus (`review-final.md`): I-1..I-3 y cuatro menores; el resto, en 06.
