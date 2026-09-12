# Historial — Botín y reparto: una tabla entrega, y decir quién dio (2026-09-06)

**Una entrada de `07-historial.md` movida entera el 2026-09-12**, al escribir la línea de HP-9a
Task 2 («sintonizar cuenta», la pantalla): el fichero quedaba en 1007 de sus 1000 líneas y esta era
la entrada completa más antigua. No se reescribe.

---

## Botín y reparto — una tabla entrega, y decir quién dio (2026-09-06)

**Qué.** Cinco tareas del plan [`2026-09-06-botin-y-reparto-plan.md`](./superpowers/plans/2026-09-06-botin-y-reparto-plan.md),
en tres commits: una fila de `DmTable` puede llevar `entrega` (objetos por `ContentRef` y las cinco
monedas), y tirarla devuelve esos objetos ya resueltos por nombre; dar un objeto o dinero dice
**quién** lo dio, con un campo opcional `de` sobre los sucesos que ya existían; y «Dar…» se hace
desde la mesa y desde el resultado de una tirada, sin abrir la ficha de quien recibe.

**Por qué.** La premisa del plan —«hoy un objeto aparece en una bolsa y nadie sabe de dónde
salió»— era falsa: el rastro (`ITEM_ADDED`, `MONEY_CHANGED`) ya existía, y no hacía falta un tipo
de suceso nuevo (D-P2-7). Y lo que la mesa decide, la mesa decide: no hay «dar a todos», ni
repartir oro a partes iguales, ni comercio — las dos primeras las cubre una prueba de ausencia;
el comercio no se construyó, así que no hay pantalla de la que medir su ausencia.

**Cómo se comprobó.** Un `catch` que tragaba cualquier fallo de Postgres y lo presentaba como «ese
objeto ya no existe» dentro de la transacción del disparo automático, borrando la pista del error
real. Nueve mutaciones de aflojamiento sobre el campo `entrega`, las nueve en verde antes del
arreglo. Y una clave de catálogo inventada (`shortsword`, que no existe — es `short-sword`) citada
tres veces por un encargo del orquestador y corregida las tres contra el catálogo real.

**Cómo revertir.** Tres commits (`eaa333e`, `cbbfebf`, `c36a099`), independientes entre sí y del
paso 2. `eaa333e` lleva la migración `dm_table_entry_loot` (columna `entrega Json?`); revertir el
código deja la columna sin escritores, sin fila sembrada fuera de las pruebas que la use. Dos
fichas quedaron abiertas: el formulario de crear tablas no tiene campo para redactar `entrega`, y
un jugador con un PNJ cedido ve la lista de destinatarios vacía al abrir «Dar…».
