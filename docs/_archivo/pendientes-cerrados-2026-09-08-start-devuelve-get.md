# Pendientes cerrados — `start()` devuelve por `get()` (2026-09-08)

**Nada de aquí se edita.** Es la ficha tal y como estaba al cerrarla.

Se abrió el 2026-09-07 durante la revisión de las tres tareas de la poda, **al revertir un arreglo
a medio hacer**, y se cerró al día siguiente con la decisión del autor.

> ## Lo que la ficha no sabía, y es lo que la decidió
>
> La ficha planteaba dos diseños posibles —vista filtrada del espectador o resultado crudo de la
> creación— y por eso pedía una decisión. **Faltaba un dato**: los tres endpoints hermanos
> (`current()`, `advanceTurn()`, `forceStart()`) ya devolvían por `this.get(...)`. Con eso delante
> no eran dos diseños con sus ventajas: `start()` era **el único que se había quedado fuera del
> patrón de su propio fichero**, y dejarlo así habría sido declarar que ese endpoint da menos que
> sus hermanos porque cuatro pruebas estaban escritas de una forma incómoda.
>
> **La objeción del revert seguía siendo válida y se resolvió en el otro lado.** Aquellas cuatro
> pruebas afirmaban sobre el valor devuelto **por comodidad**, no porque el valor devuelto fuera lo
> que probaban: lo que comprueban es lo que `start()` **escribe** —el agrupado por `statblockRef`,
> el reparto del bando, el desempate de dos grupos—. Reapuntadas a la escritura siguen siendo
> pruebas de comportamiento y dejaron de depender de por dónde vuelve la respuesta. Cambiarlas por
> pruebas del mock habría sido empeorarlas; eso no ocurrió.

---

## P3 · `start()` devuelve un encuentro que ya no cumple su propio esquema (2026-09-07, revisión)

`EncountersService.start()` devuelve `{ ...creado.encounter, combatants: creado.combatants }`:
filas de `Combatant` crudas. Desde que `derrotado` y `finalPropuesto` son **obligatorios** en
`packages/shared/src/encounter.schema.ts`, esa respuesta **no valida**, y el cliente la tipa como
`Encounter` (`apps/web/src/features/encounters/api.ts:45`). Las posiciones tampoco van renumeradas,
que es anterior a esto.

**Hoy es inocuo** y por eso es P3: `useStartEncounter` tira la respuesta e invalida la consulta.
Muerde el día que alguien la parsee con `encounterSchema` —error de validación— o lea `derrotado`
de ahí —`undefined` silencioso—.

**Se intentó y se revirtió, a propósito.** Devolver por `get()` lo arregla en una línea y **empeora
cuatro pruebas**: `agrupa a los combatientes con el mismo statblockRef`, las dos del bando y la de
los dos grupos con la misma tirada afirman sobre lo que `start()` **escribió**, y con `get()`
pasarían a afirmar sobre el mock de lectura. Cambiar pruebas de comportamiento por pruebas de mock
no es un arreglo.

**Por qué no se cierra sin el autor:** falta decidir **qué debe devolver `start()`** —la vista
filtrada del espectador, como `get()`, o el resultado crudo de la creación— y esa decisión cambia
qué miden esas cuatro pruebas. Es contrato, no limpieza.
