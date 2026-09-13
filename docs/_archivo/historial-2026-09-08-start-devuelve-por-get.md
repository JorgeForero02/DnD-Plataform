# Historial archivado — `start()` devuelve por `get()` (2026-09-08, ficha P3)

**Movida entera** el 2026-09-13, al escribir la línea de la Task 10 del pulido (la bandeja de
dados): el fichero estaba en 999 de 1000 y esta era la entrada completa más antigua. Su hito se
queda en `07-historial.md`.

---

## `start()` devuelve por `get()`, como sus tres hermanos (2026-09-08, ficha P3)

La ficha se abrió anoche **al revertir este mismo arreglo**, y el revert era correcto con lo que se
sabía: devolver por `get()` tumbaba cuatro pruebas del servicio. Lo que faltaba era un dato —
`current()`, `setSide()` y `forceStart()` **ya devolvían por `get()`**—, y con él `start()` no era
un diseño alternativo sino un endpoint fuera del patrón mayoritario de su fichero.

> **Ese dato se escribió mal y la revisión lo cazó**: decía `advanceTurn()`, que **no** devuelve
> por `get()`. El nombre se puso de memoria sobre tres números de línea. La línea sigue siendo
> correcta, pero **la deuda no estaba cerrada del todo**: sobrevive en `advanceTurn()` y
> `setInitiative()`, con ficha propia en [06-pendientes.md](../06-pendientes.md).

**El defecto estaba en las cuatro pruebas**, no en la línea: afirmaban sobre el valor devuelto por
comodidad, no porque fuera lo que probaban. Reapuntadas a lo que `start()` **escribe** siguen
siendo pruebas de comportamiento. La mutación lo separa en los dos sentidos: volver a las filas
crudas enrojece solo la del esquema; romper el agrupado por `statblockRef`, solo las suyas.

**Comprobado y no supuesto**, que era la duda que quedaba: `get()` filtra por `canView`, pero
`start()` empieza por `requireDM` y `visibility.ts:24` devuelve `true` para el DM, así que no se
recorta ningún combatiente. Y las posiciones no cambian de valor: `recolocar` ya las escribe
densas, de modo que para el DM el renumerado es la identidad — lo confirmaron los e2e que afirman
`[0, 1, 2]` sin tocarlos.

**Revertir:** un commit. Solo toca `encounters.service.ts` y su spec.
