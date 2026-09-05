# Historial

Qué se entregó, por qué, y cómo revertirlo. Fechas absolutas. El detalle por tarea —commit,
número de pruebas, resultado de la revisión— vive en el ledger
`.superpowers/sdd/progress.md`; aquí van los hitos.

> ## Este fichero tiene un tope de 400 líneas, y lo comprueba una máquina
>
> `pnpm check:historial` falla si se pasa (ver `scripts/check-historial.mjs`, enganchado en
> `pnpm verify` junto a `check:estado`). No es pulcritud: el consumidor principal de esta
> documentación es un agente sin memoria que la relee entera en cada sesión, y **lo que no le
> cabe en contexto lo rellena inventando**. Un historial de 2192 líneas —lo que llegó a medir
> este— no se lee: se hojea, y hojear un registro es peor que no tenerlo.
>
> **Qué se queda y qué se archiva.** Se queda **un hito por entrega**: el cierre de una fase,
> su despliegue, la revisión que lo cerró. Se archiva **el detalle por tarea**, que es lo que
> el ledger ya cuenta a más resolución. Ninguna entrada se reescribe ni se resume al
> archivarla — se mueve entera, y el archivo es tan cierto como era el día que se escribió.
>
> | Dónde | Qué hay |
> |---|---|
> | [`_archivo/historial-hasta-2026-09-01.md`](./_archivo/historial-hasta-2026-09-01.md) | Desde el arranque del proyecto (2026-07-02) hasta el cierre de la fase 1 y el reseño visual |
> | [`_archivo/historial-hasta-2026-09-02.md`](./_archivo/historial-hasta-2026-09-02.md) | Todo el 2026-09-02 —la fase 2A entera, la ronda de interfaz, la primera puesta en producción— y **las entradas por tarea del 2026-09-03** (2B, 2C y 2D, tarea a tarea) |
> | [`_archivo/historial-2026-09-04-por-tarea.md`](./_archivo/historial-2026-09-04-por-tarea.md) | **El 2026-09-04 se cerraron ocho tandas con sus ocho revisiones**, y sus entradas por tarea no caben aquí. Tres de ellas viven ahí: 2.5.2, B1.2 y la de `ENTITY_REVEALED` + archivar |
> | [`_archivo/historial-2026-09-04-tandas.md`](./_archivo/historial-2026-09-04-tandas.md) | Las tandas por tarea del 2026-09-03 y 04 —2.5.3, 2.5.4, 2.5.5, 2.5.6, B4 y B5—, movidas enteras el 2026-09-05 |
>
> **El corte del 2026-09-05 se hizo por lo segundo**: el fichero estaba en 399 de 400 y no cabía
> la entrada del día. Se archivaron las seis tandas por tarea y se quedaron los tres hitos.

---

## Las tres columnas: el bando, dónde abre la escena y la crónica fuera del Json (2026-09-05)

**Qué.** Plan 02 de [los planes del 2026-09-05](./superpowers/plans/2026-09-05-planes/02-tres-columnas.md).
Tres campos pequeños que arreglan una mentira y desbloquean «dónde se quedó» y la línea de tiempo.
El principio que gobierna las tres: **lo que se filtra es columna; lo que solo se pinta puede ser
Json**.

**`Combatant.side`, el bando (migración `20260905010000_combatant_side`).** `CombatantSide` con
`ALLY`, `ENEMY` y `NEUTRAL`, en el **encuentro** y no en `Character`: «enemigo» es una relación en
un momento, no una propiedad de una criatura. Por defecto `NEUTRAL` —«no se ha dicho»—, lo dice el
DM al empezar (`startEncounterSchema.sides`) y el servidor no lo adivina.

**Un hallazgo real de la prueba, y cambió dónde vive el código.** La comprobación de «me has dado el
bando de alguien que no combate» estaba en `EncountersService.start`, **después** del 409 de «ya hay
un encuentro activo»: contra una sesión que ya combatía, la misma petición mal construida devolvía
409 en vez de 400. Se movió al esquema de `@dnd/shared` (`superRefine`), donde el `ZodValidationPipe`
la aplica antes de que el servicio mire ningún estado — que además es lo que la convención del
proyecto manda.

**Cómo se comprobó.** Dos mutaciones. Con el valor por defecto en `ENEMY`, el e2e contra Postgres
que afirma que el personaje sin clasificar llega `NEUTRAL` se pone rojo (`Expected: "NEUTRAL" ·
Received: "ENEMY"`). Con el `superRefine` anulado, la prueba del esquema que rechaza un bando
sobrante se pone roja. Las dos deshechas.

**Cómo revertirlo.** `git revert` de los commits del plan y una migración que haga
`ALTER TABLE "Combatant" DROP COLUMN "side"` + `DROP TYPE "CombatantSide"`. Nada lee la columna
fuera de los encuentros.

## Las tres baratas: TipTap empaquetado, `build` en CI y la ficha de `lychee` (2026-09-05)

**Qué.** Plan 01 de [los planes del 2026-09-05](./superpowers/plans/2026-09-05-planes/01-tres-baratas.md),
en un commit y sin comportamiento nuevo.

- **Los seis paquetes de TipTap pasan de `devDependencies` a `dependencies`**
  (`apps/web/package.json:19-24`), con las versiones intactas. Su único consumidor sigue siendo un
  script, así que nada se rompía hoy: se rompería **solo en producción** el día que el editor los
  importara desde `src/` y `pnpm install --prod` los dejara fuera de la imagen.
- **CI ejecuta `pnpm build`** (`.github/workflows/ci.yml:47`), **antes de `lint`**. Hasta hoy un
  error de compilación que ninguna prueba tocara llegaba a `main` en verde.
- **`lychee` se cierra por medición, no por retirada:** el barrido no encuentra **ninguna**
  mención viva fuera de `.superpowers/`, o sea que la integración nunca existió.

**Cómo se comprobó.** Mutación obligatoria: un `const x: number = "cadena"` en
`apps/web/src/main.tsx` hace caer `pnpm build` con `error TS2322` y salida 2 — el paso de CI sirve
de algo. Deshecha después. `pnpm verify` en verde con el gancho.

**Cómo revertirlo.** `git revert` del commit: devuelve los seis paquetes a `devDependencies`,
regenera el lockfile con `pnpm install` y quita el paso de CI. Nada depende de ello en tiempo de
ejecución.

## La Ola 3, las 21 decisiones y la auditoría de la cola larga (2026-09-05)

**Qué.** Tres commits de código y el cierre de la deuda de decisión que arrastraba el proyecto.

**Las mecánicas que quedaban sin pantalla.** Se repitió el barrido del §8 de la auditoría de la
mesa sobre el árbol ya ensamblado: **de quince, diez estaban resueltas y ninguna se había caído**
—los dos únicos hooks huérfanos ya lo eran antes de `a1d4a1d`, comprobado con `git grep`—. De las
cinco restantes se cerraron tres:

- **`ENTITY_LINKED`** (`6f3d141`): `LinksService.create` escribía la fila y **no emitía el suceso**,
  así que una regla sobre «cuando se enlacen dos fichas» no se disparaba jamás. Enlace y suceso van
  ahora en la misma transacción, y **la visibilidad del suceso no se hereda de un extremo**: un
  enlace revela que dos cosas tienen que ver aunque no se pueda abrir ninguna, así que sale para
  jugadores **solo si las dos fichas ya las ve la mesa**.
- **`concentrationSave`** (`e3c0d4f`): el servidor lo devolvía desde 2C y **ninguna pantalla lo
  leía**, así que la tirada aparecía en la bandeja del jugador y quien aplicó el golpe no sabía que
  la había provocado. Y `PonerDano` cerraba su cajón sin traza: el aviso se habría pintado y
  destruido en el mismo fotograma.
- **Dos de los cuatro disparadores muertos** (`4c7c3a2`): no les faltaba un `case`, **no existían
  como suceso**. `ENTITY_COMMENTED` y `MEMBER_JOINED` ya los escribe su gesto. Los otros dos siguen
  retirados **con su motivo escrito**: `DM_EXECUTED` no tiene gesto en ninguna pantalla, y
  `ENTITY_ATTACKED` apunta a una ficha del mundo cuando aquí se ataca a un personaje. Cierra de paso
  **C6-1**: la lista de disparadores sin motor vivía dos veces y ahora vive en `@dnd/shared`.

**Las decisiones.** Veintiuna cerradas: cuatro del autor —el hilo se lee como una conversación con
lo último abajo; manda `04-convenciones.md` sobre el cobre; el color lo elige el jugador; **el
tablero telaraña se sustituye por la línea de tiempo**—, nueve por investigación contra el SRD y
siete por recomendación. Con una regla nueva y vinculante: **las reglas de D&D son verdad absoluta,
y la maqueta no es fuente de reglas**.

**La auditoría de la cola larga.** Las 55 secciones de `06-pendientes.md` leídas y contrastadas
contra el código. **Siete fichas afirmaban que faltaba algo que ya estaba hecho** —entre ellas que
el elenco no mandaba el tipo de daño, que `recordEntityOpened` no estaba conectado y que equipar no
dejaba rastro—, y una, `M10`, es falsa en su primera mitad y cierta en la segunda.

**Por qué así.** Las siete fichas caducas tenían **su evidencia escrita, y era cierta el día que se
escribió**. Una ficha con un barrido citado dentro envejece igual que el código: por eso lo que se
tache lleva desde ahora **la prueba de cuándo**, no solo la de qué.

**Cómo revertir.** Los tres commits son independientes y se revierten por separado. `6f3d141` y
`4c7c3a2` llevan migración —una columna de enum cada uno—; los valores de un enum de PostgreSQL **se
añaden y no se quitan**, así que revertir el código deja el valor huérfano en la base, que es
inofensivo.

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

## Lo comprobado EN PRODUCCIÓN al desplegar la fase 2D (2026-09-03)

---

## La documentación, auditada contra lo que hay (2026-09-04)

**Pedido por el autor al cerrar la jornada, y encontró cinco desajustes y un hallazgo de producto.**
Los controles automáticos (`check:docs`, `check:estado`, `check:historial`) estaban los tres en
verde: lo que se les escapa es exactamente lo que se buscó a mano.

- **`08-pruebas.md` decía 268 e2e de API y 106 de navegador**; las cifras reales, vueltas a medir,
  son **269 y 108**. El documento avisa de que ese par se escribe a mano porque solo lo sabe el
  corredor, y es justo el que se queda atrás.
- **`00-INDEX.md` contaba «las cinco decisiones de la fase 2.5»**: son **diez**, y las **once del
  reseño de la mesa** no se contaban en ninguna parte.
- **`00-INDEX.md` abría con «toda la fase 2 está en producción»** sin decir que la 2.5 y el reseño
  entero están en `main` y **sin desplegar**. Lo mismo en `03-despliegue.md`, que decía «EN
  PRODUCCIÓN desde el 2026-09-02» y no que producción va por detrás.
- **`01-arquitectura.md` no tenía el módulo `encounters`** — el único de la API que faltaba, con
  dos endpoints añadidos este mismo día—, ni nombraba `concentration/`, ni la capa de combate de
  `apps/web/src/features/encounters/`.

**Y debajo de un fallo de prueba había algo real.** Al remedir los e2e, `pnj-en-la-mesa` salió
rojo: comprobaba que la CA de un statblock `DM_ONLY` no llega al jugador con
`JSON.stringify(...).not.toContain("17")`, y el cuerpo lleva `createdAt` en ISO — **entre las 17:00
y las 18:00 la hora contenía «17»**. Once horas de cada doce pasaba. Ahora recorre **cada valor**
del árbol con su tipo, y lleva su control.

Al mirar ese cuerpo se vio lo que la prueba **no** comprobaba: **las seis características del
statblock `DM_ONLY` y los PG exactos sí llegan al jugador**, en la misma respuesta que dice «los
números de este PNJ no son públicos». Ficha **P1** abierta con la evidencia y las dos salidas
posibles; **no se cambia el comportamiento sin el autor**, porque las dos son decisiones suyas.

**Revertir:** un commit; solo documentación y una prueba.

---
