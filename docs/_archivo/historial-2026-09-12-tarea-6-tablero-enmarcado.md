# Historial — Tarea 6 del pulido: el tablero enmarcado y el registro como cajón (2026-09-12, C1 bis)

**Una entrada de `07-historial.md` movida entera el 2026-09-13**, al escribir la línea de la
tarea 11 del pulido («el hilo habla de personajes»): el fichero seguía por encima de sus 1000
líneas tras archivar la tarea 5, y esta era la entrada completa más antigua. No se reescribe.

---

## Tarea 6 del pulido: el tablero enmarcado y el registro como cajón (2026-09-12, C1 bis)

Qué — `sessions/tablero/` (nuevo): `MarcoDelTablero` enmarca la partida de PlanarAlly (`<iframe>`
con `referrerPolicy="no-referrer"` y `allow="clipboard-read; clipboard-write"`, la única línea fija
de que cada jugador inicia sesión dentro del marco, una vez por navegador — sin fichero de aviso,
porque PlanarAlly guarda mapas y usuarios en su servidor y la trampa del particionado de Owlbear
Legacy no existe) y `CajonDelRegistro` pliega el registro en vivo con un contador de líneas
nuevas (compara el id que había arriba al plegar contra la lista actual). `MesaDeSesion.tsx`
monta los dos en el centro de la rama `main` cuando `campana.boardRoomUrl` existe (Tarea 5); sin
ella, el hilo sigue a pelo, sin cambios.

Por qué — D-CF-63: cierra el hueco entre guardar la URL de la sala (Tarea 5) y verla puesta en la
mesa. El cajón, y no una segunda columna, porque el registro sigue haciendo falta durante la
partida y la mesa a 390 px sigue aplazada (D-CF-26): apilar verticalmente (marco arriba, cajón
abajo) es lo único que no necesita esa decisión para funcionar.

Evidencia — unitarias (RTL): `MarcoDelTablero` pone `src`, `referrerpolicy`, `allow` y la línea de
inicio de sesión; `CajonDelRegistro` cuenta las líneas nuevas plegado y las pone a cero al
desplegar; `mesa-de-sesion.test.tsx` monta el marco y el cajón con `boardRoomUrl` y el hilo a pelo
sin ella (32 pruebas en total, en verde). Mutación: `cp` de respaldo, `findIndex` fijado a `0`,
la prueba del contador falla («2» esperado, «Registro» recibido); restaurado con `cp`. e2e nuevos
(`tablero-en-la-mesa.spec.ts`, dos pruebas, corridos por el orquestador): con sala guardada —la
propia `/acerca-de`, mismo origen— el marco ocupa el centro sin scroll de página y el registro se
pliega con su contador; a 390 px el marco va arriba y el registro debajo, con la cifra de
D-CF-26 repetida en el nombre de la prueba. `tokens-contrast.spec.ts` mide el botón del cajón
plegado y desplegado en los tres temas. `mesa-mide.spec.ts` se corrió después, sin cambios, para
confirmar que la rama sin sala sigue igual.

**Revertir:** un commit. Borrar `sessions/tablero/`, las tres líneas que lo montan en
`MesaDeSesion.tsx`, el spec e2e nuevo y las adiciones de `tokens-contrast.spec.ts`.
