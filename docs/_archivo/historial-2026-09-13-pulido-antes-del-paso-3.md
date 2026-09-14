# Historial archivado — Pulido antes del paso 3 (2026-09-12/13)

Movido entero desde `07-historial.md` el 2026-09-14, al escribir el hito «La puerta de efectos»: el fichero pasaba de 1000 líneas. Es el hito de la tanda del pulido tal cual se escribió el 2026-09-13.

## Pulido antes del paso 3 (2026-09-12/13)

Qué — rama `pulido/antes-del-paso-3`, base `0ebdd9f`, 43 commits hasta `0a8689e`, todavía sin
fusionar. Catorce tareas y media (14 + 14 bis) más la revisión final de toda la rama, agrupadas en
cinco causas que el autor reportó tras revisar producción el 2026-09-12
(`docs/superpowers/specs/2026-09-12-pulido-anexo-lista-del-autor.md`, 24 puntos), más una sexta que
nació a mitad de la tanda:

- **C1 — la hoja** (Tareas 1–4, anexo #3, #4, #6, #7, #8, #9, #16, #17, parte de #2): `Casilla`
  fija a 6rem para los cinco números de cabecera, `Field.reservaEspacio` contra el *tearing*,
  `AjustesDePersonaje` a tarjeta con pie, y `espacios.spec.ts` auditando huecos y desniveles en
  toda pestaña.
- **C1 bis — el tablero provisional** (Tareas 5–6, sobre D-CF-57): `Campaign.boardRoomUrl` guarda
  la sala de PlanarAlly, que se enmarca en el centro de la mesa con el registro en vivo plegado a
  un cajón.
- **C3 — los iconos** (Tarea 7, anexo #12, #22): seis siluetas de dado (`IconoDado`) y un barrido
  que encontró quince botones sin dibujo o con un glifo de fuente.
- **C2 — el menú de la fila del elenco** (Tarea 8, anexo #1, parte de #14): `MenuDeAcciones` pliega
  cinco controles a dos, con teclado completo.
- **C5 — la bandeja de dados** (Tareas 9–10, anexo #10, #11, #14): `dice[]` por dado desde el
  servidor y una bandeja que se pulsa en vez de escribirse.
- **C4 — el hilo nombra personajes** (Tarea 11, anexo #15): sujeto y objetivo por su nombre, no
  solo el verbo.
- **Sueltos** (Tareas 12–14, anexo #18, #20, #21): salir de la mesa vuelve a la campaña, el bug de
  PG temporales del bestiario, filtros del catálogo de objetos.
- **T14 bis** (anexo #23, D-CF-64, nacida a mitad de tanda por mensaje del autor): el mundo como
  árbol + detalle sustituye al tablero telaraña; el mapa de historia queda aplazado por el autor.
- **Revisión final de toda la rama** (`0a8689e`): cuatro hallazgos de integración que ninguna
  revisión por tarea podía ver — un atacante inventado, un dado sin forma, un glifo de fuente que
  el barrido no veía, y un botón deshabilitado contra la propia regla que otra tarea de la misma
  rama ya aplicaba.

Por qué — el autor recorrió producción el 2026-09-12 y reportó 24 puntos concretos; D-CF-52 puso
esta tanda primera de cuatro antes del paso 3.

Los 43 commits, por tarea — rango completo `0ebdd9f..0a8689e`:

- **Tarea 0** (nota de diseño, D-CF-58..62): `70bb3d6`, `565a19b`
- **Tarea 1** (`Casilla`, banda anclada): `cae172f`, `bf6d718`, `25814cb`, `0537bfd`, `2bce0e0`
- **Tarea 2** (`Field.reservaEspacio`, Rasgos): `6253b2f`
- **Tarea 3** (Ajustes del personaje, Dados en rejilla): `9933b5e`, `2bf1a85`
- **Tarea 4** (`espacios.spec.ts`): `a3ec1bf`, `8cca54d`, `695d200`, `ee4eaa6`
- **Tarea 5** (`Campaign.boardRoomUrl`): `b27a13e`, `ad580bd`
- **Tarea 6** (tablero enmarcado, cajón del registro): `ad68f3c`, `ec734e2`, `72d3827`, `ea28fff`
- **Tarea 7** (seis dados, barrido de iconos): `c1677f3`, `1c30fe8`
- **Tarea 8** (`MenuDeAcciones`): `e61b865`, `59c216a`, `6b54aa4`, `43db619`, `da1e527`, `4af7dad`
  (más `fa2e963`, inserción de la Tarea 14 bis en el texto del plan)
- **Tarea 9** (`dice[]` por dado): `12af590`
- **Tarea 10** (bandeja de dados): `430e703`, `847ec27`, `fb72ed0`
- **Tarea 11** (el hilo nombra personajes): `64330ac`, `cdf8d00`
- **Tareas 12–14** (lote): `aabd016` (T12), `28e4afb` + `3dd2786` (T13), `df15c30` (T14)
- **Tarea 14 bis** (el mundo como árbol): `f38823b`, `ae23304`, `a69d069`
- **Revisión final de la rama**: `0a8689e`

Evidencia — Playwright, corrido por el orquestador tarea a tarea (nunca por el agente
implementador, regla de `04-convenciones.md`): `hoja.spec.ts` y `hoja-pestanas.spec.ts` (Tarea 1),
`espacios.spec.ts` (Tarea 4, nuevo), `mesa-mide.spec.ts` y `tokens-contrast.spec.ts` (Tareas 5, 6,
8, 14 bis), `tablero-en-la-mesa.spec.ts` (Tarea 6, nuevo), `dados.spec.ts` y `tirada.spec.ts`
(Tareas 7, 10), `combate.spec.ts`, `sesion.spec.ts` y `teclado.spec.ts` (Tarea 8),
`bestiario.spec.ts` (Tareas 7, 13), `mundo-arbol.spec.ts` (Tarea 14 bis, nuevo) e
`inventario.spec.ts` (Tarea 14) — todos en verde tras sus rondas de arreglo; el detalle rojo→verde
de cada uno vive en el ledger de la tanda, no aquí. Unitarias: 1588 de web (1471 al empezar la
rama), shared 192 y api sin tocar; `pnpm verify` limpio en el commit final; `check:docs` sin
hallazgos.

**Tres frases de entradas ya archivadas quedaron falsas, y `docs/_archivo/` no se edita —se
corrigen aquí, no allí**: la ronda 4 de la Tarea 8 (`historial-2026-09-12-tarea-8-menu-de-acciones.md`)
decía que «la de la pantalla «Dados» no monta esa guía y se queda igual» — **también la espera**,
porque `PedirTirada` la monta bajo el mismo `items-stretch` que `PanelDeDados`; la Tarea 2
(`historial-2026-09-12-tarea-2-field-reserva-espacio.md`) decía que «el DOM accesible no cambia,
solo el envoltorio» — **el orden sí cambia**: Personalidad pasa a vivir dentro de la sub-rejilla
de Ficha, antes de RasgosYAptitudes, y antes era hermana suelta de las dos; la Tarea 3
(`historial-2026-09-12-tarea-3-ajustes-y-dados-en-rejilla.md`) decía «revertir — `git revert` del
commit de esta tarea» sin más — **revertir también implica regenerar el bloque de `00-INDEX.md`
con `pnpm update:estado`** y, si el anexo que esa tarea cerraba ya se archivó como cerrado en
`docs/_archivo/`, deshacer esa nota a mano.

Revertir — la rama entera se revierte con `git revert 0ebdd9f..0a8689e` sobre `main`, **una vez
fusionada** (hoy no lo está: revertir antes de fusionar es simplemente no fusionar). Por causa, si
solo una debe deshacerse: C1 son las Tareas 1–4 (`cae172f..ee4eaa6`); C1 bis las Tareas 5–6
(`b27a13e..ea28fff`); C3 la Tarea 7 (`c1677f3..1c30fe8`); C2 la Tarea 8 (`e61b865..4af7dad` +
`fa2e963`); C5 las Tareas 9–10 (`12af590..fb72ed0`); C4 la Tarea 11 (`64330ac..cdf8d00`); los
sueltos las Tareas 12–14 (`aabd016..df15c30`); T14 bis (`f38823b..a69d069`) devuelve
`TableroTelarana.tsx` y `posiciones.ts`. **Una migración de por medio**: `Campaign.boardRoomUrl`
(Tarea 5) — revertir esa tarea sin revertir la migración deja una columna sin escritor; la
migración lleva su propia reversa en la cabecera del SQL. **Producción no se toca**: sigue
sirviendo `6d2b2ca`, y esta rama no se despliega hasta que el autor lo pida.
