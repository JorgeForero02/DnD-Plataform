# Pendientes cerrados — los dos endpoints que quedaban fuera del patrón (2026-09-08)

**Nada de aquí se edita.** Es la ficha tal y como estaba al cerrarla, el mismo día que se abrió.

Se abrió al revisar el commit que cerró la ficha anterior —aquella se archivó **nombrando mal a un
hermano** y dando por saldada una deuda que seguía viva— y se cerró unas horas después.

> ## La pregunta que dejaba abierta la contestó una medición, no el autor
>
> La ficha decía que la única duda real era qué hacer con `roundAdvanced`, porque no está en
> `encounterSchema`. **Se midió: no lo consume nadie.** Cero usos en `apps/web`; solo existe donde
> se crea, en tres unitarias y en un e2e. Con eso, las tres salidas dejaron de estar empatadas:
>
> - **Derivarlo** obligaría a quien llama a recordar el asalto anterior para compararlo — inventar
>   trabajo para nadie, porque nadie lo lee.
> - **Borrarlo** tiraría un dato real que el servidor ya sabe, «este avance cambió de asalto», y
>   que cuatro pruebas fijan. Que hoy no se pinte no es motivo para perderlo.
> - **Al lado**, que es lo que se hizo: la respuesta es el encuentro **más** ese campo hermano, y
>   el tipo del cliente lo dice —`Encounter & { roundAdvanced: boolean }`— en vez de mentir.
>
> `setInitiative()` no lleva campo hermano ninguno: corregir una iniciativa no cambia de asalto, y
> añadírselo por simetría habría afirmado algo que ahí no ocurre.

---

## P3 · `advanceTurn()` y `setInitiative()` devuelven algo que no es un `Encounter` (2026-09-08)

**Es el resto de la ficha P3 que se cerró creyendo que no quedaba nada.** Aquella iba de
`start()`, y su argumento —«los hermanos ya devuelven por `get()`»— nombraba a `advanceTurn()`
entre ellos. **Era falso**, y con el nombre mal puesto la ficha se archivó dando por cerrada una
deuda que sigue viva en otros dos sitios. Lo cazó la revisión del propio commit que la cerró.

| Método | Qué devuelve hoy | Cómo lo tipa el cliente |
|---|---|---|
| `advanceTurn()` (`encounters.service.ts:924`) | `{ ...actualizado, roundAdvanced }` — la fila cruda de `Encounter`, **sin `combatants` y sin `finalPropuesto`** | `Promise<Encounter>` (`apps/web/src/features/encounters/api.ts:87`) |
| `setInitiative()` (`encounters.service.ts:730`) | **una sola fila de `Combatant`** | `Promise<Encounter>` (`apps/web/src/features/encounters/api.ts:57`) |

Los que sí devuelven por `get()`, comprobado con `grep -n "return this.get("`: `start()`,
`current()`, `setSide()` y `forceStart()`.

**Es inocuo hoy y por eso es P3**, exactamente por lo mismo que lo era el de `start()`: los hooks
tiran la respuesta e invalidan la consulta. Muerde el día que alguien la parsee con
`encounterSchema` o lea `combatants` de ahí.

**Cómo se cierra, y ya está probado en `start()`:** devolver por `this.get(...)` y **reapuntar a la
escritura** las pruebas que afirmen sobre el valor devuelto por comodidad. Ojo con `advanceTurn()`,
que además lleva `roundAdvanced` — ese dato no está en `encounterSchema` y hay que decidir si viaja
aparte o se deriva, que es la única pregunta de verdad de esta ficha.
