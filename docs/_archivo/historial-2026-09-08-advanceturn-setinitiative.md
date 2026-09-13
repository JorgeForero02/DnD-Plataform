# Historial archivado — `advanceTurn()` y `setInitiative()` devuelven por `get()` (2026-09-08)

**Movida entera** el 2026-09-13, en el mismo corte que archivó a su hermana «`start()` devuelve
por `get()`»: el fichero seguía por encima de 1000 tras ese primer archivado, y esta era la
entrada completa más antigua. Su hito se queda en `07-historial.md`.

---

## Los dos que quedaban: `advanceTurn()` y `setInitiative()` (2026-09-08)

El resto de la deuda que la entrada de abajo dio por cerrada nombrando mal a un hermano. Los dos
devuelven ya por `get()`, y con eso **ningún endpoint de encuentros devuelve filas crudas**.

**La pregunta que quedaba para el autor la contestó una medición:** `roundAdvanced` **no lo consume
nadie** —cero usos en `apps/web`—, así que derivarlo sería inventar trabajo para nadie y borrarlo
tiraría un dato real que cuatro pruebas fijan. Viaja **al lado**, fuera del encuentro, y el tipo
del cliente lo dice: `Encounter & { roundAdvanced: boolean }`.

**Dos cosas que aparecieron al hacerlo**, ninguna prevista: `get()` usa el pool, así que la
composición de la respuesta tuvo que salir **fuera** de la transacción —el mismo defecto que este
proyecto arregló tres veces en septiembre— y en los dos métodos el `return this.prisma.transaction`
hacía **inalcanzable** la línea nueva. Y el arnés del spec arrastraba `mockResolvedValueOnce` sin
consumir entre pruebas, porque `clearAllMocks` no vacía esa cola: una prueba fallaba por lo que
encolaba otra.

**Revertir:** un commit. Toca `encounters.service.ts`, su spec, un e2e y el tipo del cliente.
