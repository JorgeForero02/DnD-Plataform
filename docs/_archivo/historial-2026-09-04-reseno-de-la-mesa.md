# Historial archivado — el reseño de la mesa (2026-09-04)

> **Movido entero el 2026-09-05, sin reescribir ni resumir una línea**, cuando
> [`07-historial.md`](../07-historial.md) volvió a pasar de sus 400 con la quinta entrada del plan
> 03. Es el segundo corte de esa noche; el primero está en
> [`historial-2026-09-03-y-04-sueltas.md`](./historial-2026-09-03-y-04-sueltas.md).
>
> Lo de aquí era cierto el día que se escribió y lo sigue siendo **como registro**: no describe el
> sistema de hoy.

## El reseño de la mesa: la cabina y las mecánicas que no tenían pantalla (2026-09-04)

**Qué.** Dos entregas del mismo día contra la auditoría de la mesa: **el armazón** y **el §8**.

**El armazón.** `SesionPage` deja `AppShell` y `PageHeader`: la mesa ocupa la ventana
(`flex h-screen flex-col overflow-hidden`), con **scroll por panel** y `min-h-0` en todos los
ancestros —sin él un hijo de flex/grid no encoge por debajo de su contenido y el `overflow-y-auto`
**no se activa jamás**, que era el defecto—. `ui/Dialog` pasa de cuadro centrado a **cajón lateral**
(26/40/58 rem, variante `pergamino`, ranuras de subtítulo y acciones), que heredan sus 24 usos.
`tokens.css` gana `.scroll-quiet` —que se usaba **sin existir**—, `.capitular` y los tres
`@keyframes`. `MesaDeSesion.tsx` baja de **992 líneas a un compositor de ~150**, con las piezas
repartidas en `elenco/`, `hilo/`, `dm/` y `taller/` para que seis carriles no compartieran fichero.

**Las mecánicas sin pantalla (§8): diez conectadas, nueve jugadas enteras en el navegador.**
Reglas construidas, probadas y desplegadas que **ninguna pantalla podía disparar**:

- **Tipo de daño y su traza** (2.5.1): `changeHp` aceptaba `damageType` y las dos pantallas que
  cambian PG mandaban `{ delta }`, así que las resistencias **no reducían nada jamás**. **Arreglada
  UNA de las dos: la hoja.** El ±5 del elenco sigue sin tipo, así que **el dragón resistente al
  fuego todavía no se cobra desde la mesa** (ficha **C6-5**).
- **El daño atado a su tirada** (2.5.4), **«Revelar» como botón**, **marcas, conjuntos y señales**
  (cinco rutas huérfanas desde 2A), **sintonización**, **descanso interrumpido**, **statblocks
  propios** (crear, editar y borrar), **`useSetHp`** en la corrección exacta de la hoja, y
  **`lastFiredAt`**. `tempHp` de un PNJ queda pintado y **sin verificar**: nada los concede (**C6-4**).
- **Se retiran cuatro disparadores de la paleta**: `ENTITY_COMMENTED`, `DM_EXECUTED`,
  `ENTITY_ATTACKED` y `MEMBER_JOINED` se ofrecían y `game-event-triggers.ts` no tiene `case` para
  ninguno. El esquema compartido los conserva —quitarlos rompería reglas guardadas— y una regla
  vieja que los use se pinta marcada y no seleccionable.
- **Un defecto que apareció al probarlo:** la ficha de un PNJ era **inalcanzable** —el enlace del
  bestiario aterrizaba en una pantalla que busca en `useCharacters`, que excluye a los PNJ desde
  2D.6—, o sea que el único sitio donde las resistencias se aplican no tenía pantalla.

**Por qué así.** La auditoría midió que se había **adaptado** la maqueta en vez de **sustituirla**,
y que las desviaciones estaban escritas en comentarios como si fueran acuerdos.

**Lo que esto NO cierra, y hay que decirlo.** El **panel de dados está construido y no lo monta
nadie**, así que «no hay dados en la mesa» sigue abierto. **Playwright no se ejecutó ni una vez en
todo el día**: queda escrito `apps/web/e2e/mesa-mide.spec.ts`, el recorrido que mide lo que `jsdom`
no ve —la página no scrollea, el hilo sí, la rejilla llega al pie, ningún panel se corta, y abrir
un cajón no desmonta el hilo—, **sin ejecutar**. No se escribió ninguna prueba nueva: se suspendió
a propósito para hacerlas en una sola tanda. Las que afirmaban la maquetación vieja se
**actualizaron**, nunca se desactivaron.

**Ola 3 (medida, no recordada).** Repetido el barrido del §8 sobre el árbol ensamblado: **diez de
las quince mecánicas sin pantalla están resueltas** —`damageType` viaja desde la mesa, así que
2.5.1 por fin se ejecuta— y **no se cayó ninguna**: los dos únicos hooks huérfanos ya lo eran antes
de `a1d4a1d`. De las cinco restantes se cierra aquí **`ENTITY_LINKED`**: `LinksService.create`
escribía la fila y **no emitía el suceso**, así que una regla sobre «cuando se enlacen dos fichas»
no se disparaba jamás. Ahora enlace y suceso van **en la misma transacción**, y la visibilidad del
suceso **no se hereda de un extremo** —un enlace revela que dos cosas tienen que ver aunque no se
pueda abrir ninguna—: sale para jugadores solo si las dos fichas ya las ve la mesa.

**Cómo revertir.** `git revert` de los merges de carril y del armazón (`a1d4a1d`). Nada de esto
toca `packages/shared` y no hay migración; el suceso del enlace es `apps/api` y se revierte solo.
