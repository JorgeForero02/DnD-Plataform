# Historial

Qué se entregó, por qué, y cómo revertirlo. Fechas absolutas. El detalle por tarea —commit,
número de pruebas, resultado de la revisión— vive en el ledger
`.superpowers/sdd/progress.md`; aquí van los hitos.

> ## Este fichero tiene un tope de 1000 líneas, y lo comprueba una máquina
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
> | [`_archivo/historial-2026-09-04-reseno-de-la-mesa.md`](./_archivo/historial-2026-09-04-reseno-de-la-mesa.md) | **El reseño de la mesa del 2026-09-04** —la cabina y las mecánicas que no tenían pantalla—, movido entero el 2026-09-05 (tercer corte de la noche) |
> | [`_archivo/historial-2026-09-03-y-04-sueltas.md`](./_archivo/historial-2026-09-03-y-04-sueltas.md) | **La comprobación en producción de 2D** y **la auditoría de la documentación del 2026-09-04**, movidas enteras el 2026-09-05 (segundo corte de la noche: las cinco entradas del plan 03 dejaron el fichero en 413 de 400) |
> | [`_archivo/historial-2026-09-05-por-tarea.md`](./_archivo/historial-2026-09-05-por-tarea.md) | **El detalle por tarea de los planes 03 y 15**, nueve entradas movidas enteras el 2026-09-05 cuando el fichero llegó a 997 de 1000, **y una segunda remesa** con el detalle por tarea de los planes 05, 07 y 08, movida cuando volvió a llenarse. Sus hitos se quedan arriba
> | [`_archivo/historial-2026-09-06-planes-09-11-13-14-por-tarea.md`](./_archivo/historial-2026-09-06-planes-09-11-13-14-por-tarea.md) | **El detalle por tarea de los planes 09, 11, 13 y 14**, seis entradas movidas enteras el 2026-09-06 al llegar el fichero a 968 de 1000 ejecutando el paso 1. Sus hitos se quedan arriba
> | [`_archivo/historial-2026-09-05-y-06-iniciativa-y-bando-por-tarea.md`](./_archivo/historial-2026-09-05-y-06-iniciativa-y-bando-por-tarea.md) | **El detalle por tarea de las tareas 5 y 14 del plan `iniciativa-y-bando`**, movidas enteras el 2026-09-06 al escribir el hito de la tanda completa. Su hito se queda arriba
> | [`_archivo/historial-2026-09-05-ola-3.md`](./_archivo/historial-2026-09-05-ola-3.md) | **La Ola 3, las 21 decisiones y la auditoría de la cola larga**, movida entera el 2026-09-07: insertar las dos entradas del paso 2 y el botín dejó el fichero por encima de su tope de 1000 líneas, y esta fue la más antigua. Su hito se queda arriba
> | [`_archivo/historial-2026-09-05-bandeja-de-avisos.md`](./_archivo/historial-2026-09-05-bandeja-de-avisos.md) | **La bandeja de avisos**, movida entera el 2026-09-08 al llegar el fichero a 988 de 1000 y no caber la entrada del reconocimiento. Era la entrada completa más antigua. Su cabecera de archivo cuenta la ironía que salió ese día: `01-arquitectura.md` seguía negando esta bandeja tres días después de entregarla. Su hito se queda arriba
> | [`_archivo/historial-2026-09-06-iniciativa-y-bando-hito.md`](./_archivo/historial-2026-09-06-iniciativa-y-bando-hito.md) | **El hito de iniciativa y bando**, movido entero el 2026-09-11 (quinto corte). Su resumen se queda arriba |
> | [`_archivo/historial-2026-09-05-la-documentacion-alcanza.md`](./_archivo/historial-2026-09-05-la-documentacion-alcanza.md) | **La documentación alcanza a la noche del 2026-09-05**, movida entera el 2026-09-11 (cuarto corte). Su hito se queda arriba |
> | [`_archivo/historial-2026-09-05-paseo-de-uso.md`](./_archivo/historial-2026-09-05-paseo-de-uso.md) | **El paseo de uso contra producción**, movida entera el 2026-09-11 (tercer corte). Su hito se queda arriba |
> | [`_archivo/historial-2026-09-05-nervio-en-produccion-y-pnj.md`](./_archivo/historial-2026-09-05-nervio-en-produccion-y-pnj.md) | **El nervio medido en producción** y **el PNJ sin nombre en la pantalla**, movidas enteras el 2026-09-10 en el segundo corte de la sesión de cerrar fichas. Sus hitos se quedan arriba |
> | [`_archivo/historial-2026-09-05-seed-demo.md`](./_archivo/historial-2026-09-05-seed-demo.md) | **La campaña de demostración que se siembra sola**, movida entera el 2026-09-10 al pasarse el fichero con la entrada de la tanda 1 de cerrar fichas. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-06-cero-comodin-y-proceso-medido.md`](./_archivo/historial-2026-09-06-cero-comodin-y-proceso-medido.md) | **El cero de tipos comodín** y **el proceso pasa a medirse**, movidas enteras el 2026-09-12 al pasarse el fichero (1002 de 1000) con los retoques de la revisión de la hoja. Sus hitos se quedan arriba |
> | [`_archivo/historial-2026-09-06-claude-md-sin-estado.md`](./_archivo/historial-2026-09-06-claude-md-sin-estado.md) | **`CLAUDE.md` deja de narrar el estado**, movida entera el 2026-09-12 al escribir la línea de la ronda de documentación de cierre de la hoja (el fichero iba a pasar de 1000). Su hito se queda arriba |
> | [`_archivo/historial-2026-09-06-poda-del-tablero.md`](./_archivo/historial-2026-09-06-poda-del-tablero.md) | **La poda del tablero y el nacimiento de `como-seguir.md`**, movida entera el 2026-09-12 al escribir la línea de HP-9a (el fichero estaba en 997 de 1000). Su hito se queda arriba |
> | [`_archivo/historial-2026-09-06-botin-y-reparto.md`](./_archivo/historial-2026-09-06-botin-y-reparto.md) | **Botín y reparto** —una tabla entrega, y decir quién dio—, movida entera el 2026-09-12 al escribir la línea de HP-9a Task 2 (el fichero quedaba en 1007 de 1000). Su hito se queda arriba |
> | [`_archivo/historial-2026-09-06-paso-2-actividad.md`](./_archivo/historial-2026-09-06-paso-2-actividad.md) | **Paso 2 — la actividad, sus cinco formas y la economía de la mesa** (2026-09-06/07), movida entera el 2026-09-12 al escribir la línea de cierre de HP-9a: el fichero quedaba en 1005 de 1000 y era la entrada completa más antigua |
> | [`_archivo/historial-2026-09-07-tanda-corta.md`](./_archivo/historial-2026-09-07-tanda-corta.md) | **Tanda corta — los seis arreglos que dejó abiertos el paso 2** (2026-09-07), movida entera el 2026-09-12 al escribir la línea de la revisión de HP-10: el fichero quedaba en 1002 de 1000 y era la entrada completa más antigua. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-05-nervio-en-vivo.md`](./_archivo/historial-2026-09-05-nervio-en-vivo.md) | **La entrega del canal en vivo** (plan 12 · 12.3), movida entera el mismo 2026-09-08: la entrada del reconocimiento creció al recoger los tres documentos de estado que también mentían, y el fichero volvió a pasarse. Era la siguiente entrada completa más antigua. **No confundirla con su hermana**, que sigue arriba: aquella es la comprobación en producción detrás de nginx y Traefik. Su hito se queda arriba
> | [`_archivo/historial-2026-09-11-tanda-de-las-decididas.md`](./_archivo/historial-2026-09-11-tanda-de-las-decididas.md) | **Las tandas 2–6 de cerrar fichas, tarea a tarea**, movidas enteras el 2026-09-12 cuando la entrada de la revisión de producción dejó el fichero en 1014. Su hito se queda arriba |
>
> **El corte del 2026-09-05 se hizo por lo segundo**: el fichero estaba en 399 de 400 y no cabía
> la entrada del día. Se archivaron las seis tandas por tarea y se quedaron los tres hitos.
>
> **Y esa misma noche el tope pasó de 400 a 1000** —decisión del autor, declarada en
> [04-convenciones.md](./04-convenciones.md)—, porque con 400 el control saltó **siete veces** en
> una madrugada y el archivo estaba haciendo de válvula de presión. **Las cuatro entradas del
> 2026-09-05 que habían salido solo por el tope volvieron aquí**, enteras: las tres columnas, el
> hilo como conversación, las tres baratas y la Ola 3. Las dos de días anteriores se quedan
> archivadas, que es para lo que está el archivo.

---

## Ronda de arreglo de la tarea 1: `Casilla` a 6rem, medida en el navegador (2026-09-12)

Qué — Playwright contra `e2e/hoja.spec.ts` (corrido por el controlador, no por el agente) tumbó
la primera versión de la tarea 1: a `4.75rem` («VEL. (PIES)», «13 / 13» y «+5 temporales» partían
línea), midió tres casillas de 60/75/95px en vez de una sola altura. Corrección —
`ANCHO_CASILLA` pasa a `w-[6rem]` con `whitespace-nowrap` en rótulo, cifra y nota (`Casilla.tsx`);
la etiqueta de velocidad se acorta de «Vel. (pies)» a «Vel.», con «pies» en la tercera línea vía
un `nota?: ReactNode` nuevo en `ValorDerivadoProps` que solo reenvía la variante `compacta`
(`Traza.tsx`, `Cabecera.tsx`); los dos selectores de `e2e/hoja.spec.ts` que contaban las cinco
cajas por clase pasan de `w-[4.75rem]` a `w-[6rem]`, y las dos listas de rótulos de esa misma
suite y de `Cabecera.test.tsx` cambian «Vel. (pies)» por «Vel.». Números corregidos en
`docs/superpowers/notes/2026-09-12-nota-de-diseno-ui-de-juegos.md` § 7, `04-convenciones.md`
(regla «Reparto interno de tarjeta») y `decisiones.md` (D-CF-58); por qué — el número que trajo
la nota de diseño de la tarea 0 era un mínimo (`min-w-[4.75rem]`) nunca puesto a prueba como
ancho fijo con contenido real, y solo el navegador lo pudo ver. **Segunda pasada de Playwright**:
`e2e/hoja.spec.ts` pasó a 11/12 (el timeout de L151 era flaky, verde al repetirlo) pero
`e2e/hoja-pestanas.spec.ts` cayó 7 de 7 en su propia lista de rótulos — se había quedado con el
literal viejo, «Vel. (pies)» — y se actualizó **en esta misma ronda** a «Vel.»; revertir —
`git revert` de los commits de esta ronda de arreglo.

## Tarea 1 del pulido: `Casilla` y la banda anclada (2026-09-12)

Qué — `Casilla` (nuevo componente, `apps/web/src/features/character-sheet/Casilla.tsx`), con las
constantes de la tarea 0 (`ANCHO_CASILLA` `w-[4.75rem]`, `ALTO_CASILLA` `min-h-[3.75rem]`) y su
tercera línea (`data-testid="casilla-nota"`) SIEMPRE reservada, con o sin nota: la casilla de PG
era la única de las cinco de la tira con «+N temporales» y por eso era la única más ancha y más
alta (anexo #4). La usan la variante `compacta` de `ValorDerivado` (`Traza.tsx`) y la caja de PG
de `Cabecera.tsx`, que deja de llevar su propio marcado. `TarjetaDeHoja` gana un `pie?: ReactNode`
opcional, separado del cuerpo por su propio filete (`Tarjeta.tsx`, sin consumidor todavía). Y la
banda fija se ancla al hueco que la contiene con dos variables CSS nuevas que declara quien la
tiene, no la propia banda (mismo patrón que `--tira-fija-top`/`--tira-fija-pull`):
`--tira-fija-mx` y `--tira-fija-bg` (`AppShell.tsx`: medio paso hacia fuera y `--chrome-veil`
translúcido; `Dialog.tsx`: cero y `--surface` opaco — anexo #3, el velo del 95 % dentro de un
cajón «flotaba sin estar anclada»). Dos `test` de navegador nuevos en `e2e/hoja.spec.ts` (las
cinco casillas miden lo mismo con y sin temporales; la banda va a ras y sobre fondo opaco dentro
de «Su hoja») y la aserción existente de esa suite que contaba las cinco cajas por su clase pasa
de `min-w-[4.75rem]` a `w-[4.75rem]` porque la clase real cambió de mínimo a fijo. Unitarias
nuevas: `Casilla.test.tsx` (tres casos) y `Tarjeta.test.tsx` (dos, para `pie`). Verificado por
mutación: quitar `min-h-[1rem]` de la nota tumba la primera unitaria de `Casilla`, restaurado con
`cp`; por qué — tarea 1 del [plan de pulido](./superpowers/specs/2026-09-12-pulido-antes-del-paso-3-design.md),
anexos #3 y #4 de la nota de diseño de la tarea 0; revertir — quitar `Casilla.tsx` y restaurar la
caja de PG en `Cabecera.tsx` a su marcado anterior (`git revert` del commit de esta tarea).

## Tarea 0 del pulido: nota de diseño y cinco reglas (2026-09-12)

Qué — nota de diseño de UI de juegos ([docs/superpowers/notes/2026-09-12-nota-de-diseno-ui-de-juegos.md](./superpowers/notes/2026-09-12-nota-de-diseno-ui-de-juegos.md), con cita o URL por referencia: BG3, Divinity: Original Sin 2, Foundry VTT/Dice So Nice, D&D Beyond, Owlbear Rodeo, dddice/dice-box) y cinco reglas nuevas en [04-convenciones.md](./04-convenciones.md) § *Reglas de interfaz* (reparto interno de tarjeta, acciones de fila con menú, espacio reservado, sticky con escalón, un dado una forma), con sus cinco constantes fijadas (`HUECO_MAX_PX` 48 px, `DESNIVEL_MAX_PX` 24 px, `ANCHO_CASILLA_REM` 4.75rem, `ALTO_CASILLA_REM` 3.75rem, `ACCIONES_VISIBLES` 2) y sus decisiones D-CF-58 a D-CF-62; por qué — tarea 0 del [plan de pulido](./superpowers/specs/2026-09-12-pulido-antes-del-paso-3-design.md) (investigar antes de tocar, pedido tres veces por el autor), para que las tareas 1, 4 y 8 lean los números de un solo sitio; revertir — `git revert` del commit de esta tarea, sin código tocado.

## La hoja a página completa (2026-09-11 y 12)

**Fusión a `main` (2026-09-12):** qué — merge `--no-ff` de `hoja/pagina-completa` en `main`,
`e43038f`, 38 commits; por qué — el autor ordenó pasar a `main` y empujar antes de desplegar;
revertir — `git revert -m 1 e43038f`.

**Despliegue (2026-09-12):** el autor desplegó `6d2b2ca` a mano; comprobado con `docker ps` en
`vps1new` (api y web `healthy`) y `curl` 200; revertir = redesplegar la imagen anterior
(`f9579b2`) desde Coolify.

Rama `hoja/pagina-completa` sobre `main` `80a9243`, **veintiséis commits** hasta `0d304ea`
—veinticuatro de código, pruebas y la fusión de la Task 1, dos de documentación; medido con
`git log --oneline 80a9243..HEAD | wc -l` el 2026-09-12; el de esta ronda de documentación de
cierre hace veintisiete—: las once tareas
del plan, la ola de arreglos de la revisión final de la rama, las dos rondas de cierre de las
fichas HP y los dos residuales. Cerrada en local el 2026-09-12, **fusionada a `main` el mismo
día** y **desplegada a producción también el 2026-09-12** (`6d2b2ca`, a mano por el autor). La
[spec](./superpowers/specs/2026-09-11-la-hoja-a-pagina-completa-design.md) y el
[plan](./superpowers/plans/2026-09-11-la-hoja-a-pagina-completa.md) mandan; las decisiones que la
ejecución obligó a tomar son D-CF-38..46 en [decisiones.md](./decisiones.md), y la que el autor
tomó al cerrar, D-CF-47 (HP-9 después del paso 3). **Revertir cualquier
tanda = `git revert` de sus commits; las tarjetas no cambiaron**: cada pestaña monta las mismas
tarjetas que antes vivían en `HojaCalculada.tsx`, movidas y no reescritas.

- **Task 2 — Las condiciones saben pintarse como chips de solo lectura** (`4c965ed`, `8aff6e6`).
  `Condiciones.tsx` gana una variante para la cabecera. La revisión cazó un chip vacío para la
  concentración (`NOMBRE_CONDICION` en vez de `tituloDe`) y dejó dicho que **una condición vencida
  no es chip**: arriba se enseña lo activo, lo vencido sigue tachado en Estado (D-CF-43).
- **Task 3 — La cabecera vive en `Cabecera.tsx`** (`ae98951`, `e9ed5a5`): retrato, identidad
  solo en la mesa (en la página ya la pinta `PageHeader`), cinco números, chips y avisos, con
  `PropsDePestana` en `features/character-sheet/pestanas/tipos.ts`. La revisión devolvió fuerza a la `it` movida de los PG
  (`puedeEditar` verdadero, el control de daño ausente para quien edita) y probó el gating de
  `BotonSubirNivel`.
- **Tasks 4 a 6 — Números, Ataques, Rasgos, Recursos, Estado y Conjuros son pestañas**
  (`742f7e1`..`212eb76`). Fixture compartido en
  `features/character-sheet/__tests__/fixtures/hoja.fixture.tsx`; `habilidades.ts` saca las
  veinticuatro líneas de la tarjeta. Conjuros existe solo para quien lanza (`lanzaConjuros.ts`)
  y la revisión de la 6 devolvió el guard `spellSlots > 0`: un alto elfo sin espacios veía una
  tarjeta vacía. **Ruling de la 4:** las tarjetas de identidad (Ficha/Características) **se
  remontan** cuando la hoja se vuelve derivable porque ahora viven en una pestaña; lo guardado en
  blur ya está guardado y solo se pierde el indicador transitorio «guardando» (D-CF-39).
- **Task 7 — `HojaCalculada` es cabecera + pestañas** (`b7a0987`, `a9f9bfd`): 149 líneas,
  `disposicion` decide lateral a página o tira en la mesa, la pestaña activa en `?pestana=`, y
  **una pestaña que la hoja no ofrece cae a Números** —`?pestana=conjuros` en un no lanzador
  dejaba el panel vacío— (D-CF-42). Diez `it` de `HojaCalculada.test.tsx` abren la pestaña antes
  de afirmar: solo aperturas de pestaña y un localizador reescrito con comentario; ninguna
  aserción cambió.
- **Task 8 — Las acciones de un objeto son una lista** (`0a3a31a`): `features/inventory/accionesDeObjeto.ts`
  alimenta la fila, que pinta desde ella.
- **Task 9 — Objetos a página filtra y enseña el detalle** (`f7e8b24`, `e11db5e`):
  `FiltrosDeObjetos`, `filtrarObjetos`, `DetalleDeObjeto`. El filtro «qué es» usa el `ItemKind`
  real —seis chips— y no el tipo ad hoc del brief (D-CF-41); los chips de zona hablan el
  vocabulario de zona (D-CF-40); y `inventory` declara su propia unión `disposicion` porque **no
  importa de `character-sheet`** (`features/inventory/hooks.ts:32`), frontera que la revisión vio romperse.
- **Task 10 — Medido en el navegador, fichero a fichero** (`65bb5c1`, `5158ad1`):
  `hoja-pestanas.spec.ts` nuevo y dieciséis e2e adaptados abriendo la pestaña que toque —solo
  aperturas y localizadores más específicos—. **Incidente:** `pnpm --filter @dnd/web e2e --
  <fichero>` **no filtra** —pnpm no pasa el argumento— y corrió la suite entera una vez, 18,7 min;
  el comando que sí filtra es `pnpm --filter @dnd/web exec playwright test e2e/<fichero>.spec.ts`
  (D-CF-44). Esa pasada midió la **banda fija en 412 px** con los avisos dentro, y de ahí el
  **ruling A**: el `sticky` lleva solo lo que cambia por turno —retrato, identidad en mesa, cinco
  números, chips—; los avisos van justo debajo, fuera del `sticky`; ≤ 96 px después
  (`hoja.spec.ts`, punto 5b) (D-CF-38).
- **Task 11 — La documentación alcanza a la rama** (`a58ae03`, `7591a9e`): 07, D-CF-38..44,
  HP-1..7 en 06, 08, 01, `00-INDEX` (producción `f9579b2`, no `6eb2590`), `como-seguir` §0 y las
  notas al pie de la spec del 09-06 y del plan del 09-11. La revisión devolvió D-CF-44 a lo que el
  autor decidió (la costumbre de 08 no era parte del ruling) y nombró los diecinueve ficheros de
  navegador. **Revertir:** `git revert`; nada de código dentro.
- **Revisión final de la rama — una sola ola de arreglos** (`75bab98`, sobre `7591a9e`, 2026-09-12).
  Cuatro Important: **`puedeEditar` llega al inventario** (spec §7: en un personaje ajeno ni las
  filas ni el detalle pintan botones; mirar no es editar); **las acciones del detalle contestan en
  el detalle** —`ElegirMano` se monta una sola vez, bajo la fila en la mesa y dentro de
  `DetalleDeObjeto` a página, y el error del servidor sale bajo sus botones— (cierra HP-2); la RTL
  «cada tarjeta en su pestaña» **recorre las siete** con la misma tabla que el e2e, 23 rótulos; y
  la spec lleva su nota al pie con las cuatro desviaciones (§4, §6, §4 chips, §10). Más nueve
  minors: el coste de 60 s del guard escrito junto al `Map`, títulos de prueba que prometían lo que
  no comprobaban, `data.rollSuggestions?.` sin el `?` de más, el rango de combinantes escapado en
  `filtrarObjetos.ts`. **Revertir:** `git revert` del commit; HP-2 volvería a 06.

- **Task 1 — El cubo por usuario no se clava a un token revocado (API).**
  `common/user-or-ip-throttler.guard.ts` compara `iat` con `passwordChangedAt` (misma regla de
  empate que `jwt.strategy.ts`), cacheado 60 s por usuario. Cierra la ficha P3 del
  2026-09-11 (D-CF-36), archivada en
  [`_archivo/pendientes-cerrados-2026-09-10.md`](./_archivo/pendientes-cerrados-2026-09-10.md).
  Pruebas: `user-or-ip-throttler.guard.spec.ts` (nueva) y el e2e existente
  `login-bucket-por-ip.e2e-spec.ts`. **Revertir:** `git revert` del commit; el guard vuelve a
  clavar el cubo solo por firma.
- **Ronda de cierre — HP-3 a HP-7 (2026-09-12).** Un commit que cierra las cinco fichas que
  las revisiones dejaron abiertas a propósito y no eran del autor: el e2e de Objetos deja el cuero
  sin equipar por la API al entrar y en un `finally` (HP-3); la fila seleccionada la anuncia el
  botón «Ver detalle de X» con `aria-pressed` y el `<li>` guarda solo la marca visual
  (`data-seleccionada`, HP-4); `renderHoja` sale del fixture y vuelve a `HojaCalculada.test.tsx`
  para que las pruebas de pestaña no carguen la hoja entera (HP-5); el guard de cuota separa el
  fallo de base del de firma y acota el caché de sellos a `TOPE_SELLOS` con barrido de vencidos
  (HP-6); y `Cabecera` calcula `hayAvisos` antes de montar la fila, con la condición del DM en
  `useEsVistaDeDm` compartido con el aviso, sin `empty:hidden` (HP-7). Las cinco, con su medición
  y su texto original, en
  [`_archivo/pendientes-cerrados-2026-09-10.md`](./_archivo/pendientes-cerrados-2026-09-10.md);
  HP-1 y HP-8 siguen en 06 porque las decide el autor. **Revertir:** `git revert` del commit.
- **Ronda de cierre 2 — HP-1 y HP-8, con la decisión del autor (2026-09-12).** El cajón de la
  hoja que abre el DM desde el elenco se llama **«Su hoja»** («Sin salir de la mesa.»), simétrico
  con el «Tu hoja» del jugador; el nombre y el descriptor los pinta una sola vez la `Cabecera`
  en disposición «mesa» (HP-1, D-CF-46). Y la sintonización se enseña como **estado junto al
  nombre** —distintivo «Sintonizado» en `FilaObjeto` y `DetalleDeObjeto`, mismo patrón que «Sin
  identificar»—, que es lo que la pantalla 20 del prototipo quería decir; la lista de acciones
  conserva su orden, principal primero, y el botón del objeto sintonizado dice lo que hace,
  «Desintonizar», para no repetir el estado (HP-8, D-CF-45; SRD 5.1 «Attunement»). Al medirlo se
  vio que la sintonización es hoy solo un marcador —el motor no lee `attuned`, no hay descanso
  corto, 0 objetos del SRD la piden— y quedó escrito como **HP-9** en 06, decisión del autor.
  Localizador e2e cambiado: `sesion.spec.ts`, el cajón por «Su hoja». Las dos fichas, con su texto
  original, en
  [`_archivo/pendientes-cerrados-2026-09-10.md`](./_archivo/pendientes-cerrados-2026-09-10.md).
  **Revertir:** `git revert` del commit.
- **Tres retoques de la revisión de la ronda 1 (2026-09-12).** `useEsVistaDeDm` se muda de
  `AvisoDeDm.tsx` a `features/character-sheet/hooks.ts` (un fichero de componente no exporta más que
  componentes; el aviso de `react-refresh` vuelve a su cifra anterior); los ayudantes del spec del
  guard de cuota viven una vez a nivel de fichero; y el recorrido de Objetos del e2e de pestañas
  deja de restaurar el cuero en un `finally` —captura, restaura y relanza el primer error— para
  que una vuelta por la API que falle no tape el fallo del recorrido. Sin cambio de aserciones.
  **Revertir:** `git revert` del commit.
- **El botón de sintonizar es una acción llana (2026-09-12, revisión de la ronda 2).** Pierde
  `aria-pressed`: el conmutador de la APG lleva rótulo fijo y el estado en `pressed`; el nuestro
  es el patrón contrario (rótulo «Sintonizar»/«Desintonizar», estado en el distintivo), y mezclar
  los dos anunciaba «Desintonizar, pulsado». `variant` y `aria-label` no cambian; el
  `aria-pressed` de «Ver detalle de X» (HP-4) tampoco. Y el índice de `_archivo/README.md` gana
  la fila del archivo del 2026-09-06 que le faltaba. **Revertir:** `git revert` del commit.
- **Dos residuales de la revisión final (2026-09-12).** A página, un rechazo del servidor sobre
  la fila SELECCIONADA ya no se anuncia dos veces: `PaginaDeInventario` deja de pasarle `error` a
  esa fila (`FilaObjeto`) porque el detalle (`DetalleDeObjeto`) ya lo enseña — un lector de
  pantalla oía el mismo mensaje por partida doble. Y seleccionar otra fila mientras `ElegirMano`
  está abierto para la anterior cancela esa pregunta pendiente (`setManoPara(null)` en
  `onSeleccionar`, solo cuando el id cambia): antes reaparecía sola al volver a la fila que la
  había abierto. **Revertir:** `git revert` del commit.
- **Ronda de documentación de cierre (2026-09-12, ciclo FIN del protocolo).** Lo que la rama dejó
  fuera de la documentación, puesto en su sitio: `02-entorno.md` decía que `check:historial` fallaba a
  las 400 líneas cuando el tope es 1000 desde el 2026-09-05, y enseña las formas que de verdad
  filtran un fichero (`exec playwright test`, `exec vitest run`; las dos medidas); `04-convenciones.md`
  gana la regla de `verify` en primer plano para los implementadores; `decisiones.md` D-CF-47 (HP-9
  después del paso 3) y la cláusula «sin `aria-pressed`» en D-CF-45; HP-9 reescrita en 06 con lo que
  se midió al estimarla —`CampaignItem.effects` e `itemEffectSchema` ya guardan el +N y el motor lo
  aplica sin mirar `attuned`, así que no hace falta migración—; 01, 08, `como-seguir` y `00-INDEX`
  al día. **Revertir:** `git revert` del commit; no toca código.
- **HP-9 se parte en dos, decisión del autor (2026-09-12).** Al releer HP-9 con «espera al paso 3»
  quedó claro que la mitad de lo que describía no es una funcionalidad futura sino un defecto ya
  vivo: un objeto del DM con `effects` y `requiresAttunement: true` aplica su bono sin estar
  sintonizado, porque el motor nunca lee `attuned`. **HP-9a** («sintonizar cuenta») se separa como
  ese defecto y no espera al paso 3 —sesión corta de 2–3 h, antes o justo después de fusionar la
  rama—; **HP-9b** (catálogo SRD +N estructurado y descanso corto) conserva el texto y el orden
  originales, después del paso 3. D-CF-47 enmendada, `06-pendientes.md` y `como-seguir.md`
  actualizados. **Revertir:** `git revert` del commit; HP-9 vuelve a su ficha única.
- **HP-9a · Task 1 — el servidor deja de contar lo mágico de un objeto sin sintonizar
  (2026-09-12)**, commit `fix(rules): an item that requires attunement gives its magical effects
  only when attuned`. `ResolvedItem` gana `attuned` (`z.boolean().default(false)`, estado de la
  fila como `identified`); `equipoEquipado` lo copia de la fila; `rules/items.ts` estrena
  `efectosActivos(item)` —`[]` si `requiresAttunement && !attuned`, la lista si no— y es la ÚNICA
  puerta por la que la CA (`equipmentToEngineInput`) y el +N al ataque y al daño (`attacks.ts`,
  `sumaDeEfecto`) leen `effects`; lo mundano (`armor.baseAc`, el dado del arma) no pasa por el
  filtro. La hoja emite `item_not_attuned` (`key: ref`, `data: { ref, name }`, con el nombre ya
  redactado) solo si el objeto tenía `effects`. Fuente: SRD 5.1 §Attunement — sin sintonizar, el
  objeto no da sus propiedades mágicas. Once pruebas nuevas (motor, ataques y costura del
  servicio); mutación «devolver `item.effects` siempre» tumbó cinco. **La pantalla es la Task 2**:
  `describirAviso` aún dice «Sin traducir: item_not_attuned». **Revertir:** `git revert` del commit.
- **HP-9a · Task 2 — la pantalla deja de mentir sobre el número (2026-09-12)**, commit `feat(web):
  an unattuned item shows its magical effect as inactive, and the sheet says why`. La hoja traduce
  `item_not_attuned` («"{nombre}" requiere sintonización: sus efectos no cuentan hasta
  sintonizarlo», con el `name` ya redactado por el servidor) y el código entra en
  `CODIGOS_QUE_EMITE_LA_API`. `datoDeObjeto` pasa de una cadena a `{ mundano, magico }` —antes la
  armadura +1 se quedaba en «CA base 16» y el anillo +1 decía «+1 CA» sin saber si contaba—; la
  fila y el detalle pintan la mitad mágica **tachada** (`<s data-efecto="inactivo">`) con la marca
  «Efecto inactivo: requiere sintonización» al lado (el detalle añade la frase entera) cuando
  `efectoInactivoPorSintonizacion(row)` (`features/inventory/sintonizacion.ts`, el único sitio del
  predicado en la web, sobre `row.attuned` y nunca `item.attuned`). En el servidor el aviso se
  decide con `sintonizacionPendiente(item)` junto a `efectosActivos` en vez de con una copia a mano
  del predicado. Diez pruebas nuevas (2 de vocabulario, 4 + 4 RTL); dos mutaciones —el predicado
  siempre falso tumbó dos, quitar el `case` tumbó dos—. Queda la Task 3 (Playwright).
  **Revertir:** `git revert` del commit; la pantalla vuelve a pintar el +1 como si contara.
- **Sintonizar cuenta (HP-9a, 2026-09-12) — cerrada en tres commits:** `11ea5d9` (Task 1, el
  servidor), `6d2fc9c` (Task 2, la pantalla) y `1373c56` (Task 3, `feat: attunement counts in the
  browser too, and HP-9a closes`). **Qué** cerró la Task 3: el `<s>` del bono tachado apunta con
  `aria-describedby` a su marca (`idDeEfectoInactivo(row.id)`, un `id` por fila; en el detalle con
  prefijo `detalle-` porque las dos cajas conviven en la página), porque un lector de pantalla no
  anuncia el tachado —dos aserciones RTL (`toHaveAccessibleDescription`), rojas antes—; y el
  recorrido de navegador que ninguna unitaria puede hacer, `apps/web/e2e/inventario.spec.ts` «un
  objeto que requiere sintonización no cuenta hasta sintonizarlo»: un anillo de protección de la
  campaña (`requiresAttunement`, `effects: [{ kind: "ac", amount: 1 }]`) se equipa por la pantalla
  y la CA de la tira fija **no se mueve**, la fila enseña `s[data-efecto="inactivo"]` con «+1 CA»
  y la marca, la cabecera avisa; a 390×844 la fila con la marca cabe (borde derecho ≤ 390, crece
  hacia abajo por `flex-wrap`); «Sintonizar» sube la CA en uno y se van el tachado, la marca y el
  aviso. **Por qué:** SRD 5.1 §Attunement — un objeto que requiere sintonización da sus propiedades
  mágicas solo a la criatura sintonizada; sin sintonizar es su versión mundana. La ficha entera va a
  [`_archivo/pendientes-cerrados-2026-09-10.md`](./_archivo/pendientes-cerrados-2026-09-10.md) y
  deja **HP-10** en 06 (la fila pone cifra solo al efecto `ac`; para los otros ocho tipos de
  `itemEffectSchema` la marca sale sin nada tachado). D-CF-48. **Revertir:** `git revert` de los tres commits, del
  más nuevo al más viejo; el motor vuelve a sumar el +1 sin mirar `attuned`.
- **HP-10 — la fila resume todos los tipos de efecto, y la espada +1 inactiva tacha su +1
  (2026-09-12)**, commit `feat(web): the item row summarises every effect kind, so an inactive
  sword strikes its +1 too`. **Qué:** `resumirEfecto(efecto)` junto a `describirEfecto` en
  `features/campaign-items/vocabulario.ts` (única casa del vocabulario de efectos: `inventory` ya
  importaba de ahí), `switch` exhaustivo con `never` sobre los nueve tipos de `itemEffectSchema`
  —«+1 CA», «+1 atq», «+1 dñ», «FUE 19», «+1 salv. SAB», «+5 PG máx.», «+10 pies», «pericia en
  Sigilo», «competencia en salv. CON»—; `datoDeObjeto.magico` compone la lista entera unida por
  « · » y `DatoEnCifras` la tacha igual que tachaba el «+N CA», así que el detalle hereda.
  **Por qué:** desde HP-9a una espada +1 o un cinturón de fuerza sin sintonizar enseñaban la marca
  «Efecto inactivo» sin ninguna cifra que tachar. 24 pruebas nuevas (18 de vocabulario, 3 + 3 RTL),
  rojas antes; mutación (`weaponDamage` sin su «dñ») tumbó 5. «+1 CA» del anillo no cambia, así
  que `inventario.spec.ts` sigue igual. La ficha entera va a
  [`_archivo/pendientes-cerrados-2026-09-10.md`](./_archivo/pendientes-cerrados-2026-09-10.md).
  **Revertir:** `git revert` del commit; la fila vuelve a poner cifra solo al `ac`.
- **Revisión de HP-10 — la mitad mágica envuelve, lista cada efecto y salta los ceros
  (2026-09-12)**, commit `fix(web): the magic half of an item's figures wraps, lists each effect and
  skips zeros`. **Qué:** el `whitespace-nowrap` sale del contenedor del dato (fila y detalle,
  ahora `flex-wrap min-w-0`) y `DatoEnCifras` lo pone solo en lo mundano; la mitad mágica, que
  desde HP-10 es una lista sin tope, envuelve (RTL: la clase no está en el `<s>`/`<span>` mágico ni
  en su padre). **Cambio semántico declarado:** el `datoDeObjeto` de antes SUMABA los `ac` («+2 CA»,
  `null` si 0); el de HP-10 los LISTA («+1 CA · +1 CA») porque cada efecto es una línea que
  escribió el DM, y esta revisión añade que una cantidad 0 no se resume (antes «+0 CA» se pintaba;
  el `set` de `abilityScore` no es una suma y su 0 sí cuenta). Dos `it` nuevos para las dos cosas y
  uno para el envoltorio; los fixtures `kind: "WONDROUS"` (inexistente, escondido por el `as`)
  pasan a `"OTHER"`; `describirEfecto` usa el mismo `conSigno`. **Revertir:** `git revert` del
  commit; la lista vuelve a poder pintar «+0 CA» y a no partir.

## La revisión de producción del autor: 24 puntos y tres specs (2026-09-12, tarde)

El autor recorrió producción (`6d2b2ca`) y reportó 24 puntos con captura; su diagnóstico —«espacios
desaprovechados, centrados no hechos, cards mal distribuidas, un largo etc.»— convirtió la lista en
**causas** en vez de arreglos: [pulido](./superpowers/specs/2026-09-12-pulido-antes-del-paso-3-design.md)
(tarjeta y rejilla, acciones de fila con menú, iconos, hilo que nombra personajes, bandeja de dados;
con tarea 0 de investigación de UI de juegos y [anexo](./superpowers/specs/2026-09-12-pulido-anexo-lista-del-autor.md)).
Dos puntos eran mecánica pedida y no hecha —el DM decide cómo se determinan características, nivel,
PG, permitidos y oro, con dados o fijo— y son la spec de
[reglas de la mesa](./superpowers/specs/2026-09-12-reglas-de-la-mesa-design.md); uno era la línea
de tiempo ramificada de D4, que el autor quiere **dibujada por el DM** y no generada del log:
[mapa de historia](./superpowers/specs/2026-09-12-mapa-de-historia-del-dm-design.md). Dados 3D
aplazados. Orden nuevo antes del paso 3: D-CF-52..55. **Y el tablero provisional:** Owlbear no se
deja enmarcar (medido), así que nuestra mesa irá **dentro** de su sala como extensión oficial
([spec](./superpowers/specs/2026-09-12-owlbear-como-tablero-design.md), D-CF-56), tras un spike
del autor. Auditoría de los docs del cierre de la hoja:
alineados (tres checks en verde, producción verificada en `vps1new`). **Revertir:** borrar las specs;
las decisiones se quedan.

## El paso 3 se convierte en el cierre de la primera parte (2026-09-12)

Con el autor, contrastando el índice del SRD 5.1 contra el código y los planes: **P2-4, P2-5 y
«hasta el próximo descanso» no estaban hechos** (el paso 2 los planificó, no los construyó) y salen
a una tanda propia, la [puerta de efectos](./superpowers/specs/2026-09-12-la-puerta-de-efectos-design.md),
que además trae la **bandeja de daño** (preview con resistencias + un clic; investigado en Foundry
3.1/6.0). El plan del paso 3 gana los bloques **E** (innatos, reacciones, espacio superior, ataque
de conjuro contra CA, tanda L) y **F** (lista única de acciones, menú «Acciones» en la mesa,
acciones de combate que no son atacar, enfrentadas y de grupo, legendarias): ~26 tareas en cinco
cortes. **Fuera por decisión del autor:** lo que necesita tablero, multiclase, entorno, montura,
malditos, componentes. D-CF-49..51. **Revertir:** quitar los bloques E y F del plan; las decisiones
se quedan como registro.

## La hoja a página completa: spec aprobada y plan escrito, sin código (2026-09-11, noche)

Con el autor, en otra sesión y mientras la tanda de fichas cerraba: la hoja fuera de la mesa se
rehace como **una sola `HojaCalculada` con `disposicion`** —cabecera fija con retrato, cinco
números, condiciones y avisos; siete pestañas laterales a columnas; Objetos con lista + detalle
desde una lista única de acciones; Conjuros solo para quien lanza—. Cinco preguntas contestadas y
un enfoque elegido (D-CF-29..35), [spec](./superpowers/specs/2026-09-11-la-hoja-a-pagina-completa-design.md)
y [plan de 11 tareas](./superpowers/plans/2026-09-11-la-hoja-a-pagina-completa.md); la Task 1
cierra de paso la ficha del token revocado (D-CF-36). **Y dos huecos de la auditoría de docs de
esa noche, tapados aquí:** 05-datos no contaba qué quitaron las migraciones (`RestKind`,
`race`/`class`) y el ledger global decía «push pendiente» con el push hecho. **Revertir:** borrar
la spec y el plan; las decisiones se quedan como registro.

## Relectura de 01–05 y 09 al cerrar la rama: diez frases falsas (2026-09-11)

Auditoría de deriva contra el código tras fusionar `ficha/tanda-2-a-5`, por un agente de solo
lectura con la lista de lo que la rama tocó. Diez frases caducadas, ninguna sobre lo que la rama
cambió —todas anteriores—: Node ≥ 20 en 02; siete eventos y tres `@OnEvent` en 01 (son nueve y
cinco); la búsqueda por texto como hipótesis en 04 cuando ya vive en el servidor; `Session` «sin
tablas colgando» en 05 cuando arrastra `Encounter` desde 2.5.2; dos citas de línea podridas y
«diecisiete tablas» (dieciocho) en 05; los niveles de visibilidad como cadena de superconjuntos en
05 (el código dice que no lo son); y en 09, que una fecha no se puede quitar y que el agotamiento
no automatiza nada. Corregidas con la fecha. **Revertir:** no procede; son correcciones de hechos.

## `origin/main` alcanza a `main` (2026-09-11, noche)

`git push origin main`, `8467fed..89e2575`, 43 commits: las tandas 2 a 6 de cerrar fichas, la ola
de la revisión final, la relectura de los docs y las ocho migraciones. Lo hizo el agente con
`pnpm verify` en verde, autorizado por el autor (D-CF-28); cierra la ficha P1 del worktree que
salía de una base de julio. **Revertir:** no procede.

## La tanda de Playwright que cierra las migraciones (2026-09-11, noche)

153 recorridos en 44 ficheros en `WORKTREE_SLOT=1`: 150 verdes, 1 saltado, 2 rojos cerrados en la
pasada siguiente (un localizador ambiguo en `sobrecarga` y un rojo por carga en `hoja`). Antes,
135 rojos falsos porque el puerto 3000 lo tenía otro proyecto de esta máquina y Playwright lo
reutilizó como API; declarado en `08-pruebas.md`. **Revertir:** no procede.

## La tanda de migraciones de D-CF-14, un commit por migración (2026-09-11)

Sobre `main`, después de fusionar `ficha/tanda-2-a-5`. Cada migración es SQL escrito a mano con su
cabecera, aplicada en local con `migrate deploy`; nada se despliega. **Revertir:** cada una es su
commit y su migración inversa está descrita en la cabecera del SQL.

- **1 · `DROP TYPE "RestKind"`** (X1): nadie lo usaba. Queda `no-dead-enum.spec.ts`, que hace
  fallar el próximo enum sin campo.
- **2 · Índice único parcial en `EntityLink` (`fromId`, `toId`) `WHERE label IS NULL`**: dos
  enlaces sin rótulo entre las mismas fichas entraban porque Postgres no iguala dos `NULL`. La
  migración borra duplicados quedándose con el más antiguo (en local había cero) y crea el índice;
  Prisma no lo sabe expresar, así que vive solo en el SQL y el esquema lo dice en un comentario.
  El segundo enlace igual ya es 409 (e2e en `links`).
- **3 · `DROP COLUMN race, class`** (D-CF-27): sin medir filas, por decisión del autor. El contrato
  de creación y edición descarta el texto libre y `tsc` barrió los lectores en API y web. Quien
  solo tuviera texto libre y ninguna clave del catálogo se queda sin raza ni clase en pantalla.
- **4 y 5 · `ITEM_QUANTITY_CHANGED` y `CHARACTER_DIED`**, dos migraciones en **un** commit —se
  declara la desviación de la letra de D-CF-14: los dos valores comparten el enum, la lista de
  `@dnd/shared`, el renderizador del hilo y sus pruebas, y partir esos hunks a mano arriesgaba el
  árbol; cada uno tiene su SQL—. El `PATCH` de cantidad deja «Ajusta Antorcha: 3 → 5»; la muerte se
  escribe una sola vez, en la transición, por sus tres puertas, con causa cerrada y la tirada que
  la decidió (J5).
- **6 · La sobrecarga como variante por campaña** (D-CF-16, I4/M2B-5): apagada por defecto, del
  DM; −10/−20 pies con traza, desventaja solo en Fuerza/Destreza/Constitución por característica,
  y la columna de Fuerza de la armadura ignorada cuando la variante manda —la primera versión la
  seguía restando y la desventaja salía en Persuasión: dos altos de la revisión, con SRD en mano—.
  El estado de carga lo calcula el servidor y el panel lo pinta.
- **7 · «Lo tengo pero no sé qué hace»** (D-CF-15, I3/M2B-15): `identified` y alias por fila, del
  DM, capa ortogonal a `canView` con el principio de `redactado()` —identidad fuera, números
  dentro—. La revisión encontró que la primera versión filtraba el nombre real por los sucesos
  del hilo, por `temporary:<nombre>`, por los mensajes de error y por las tiradas que lanza el
  DM; la ronda los cerró en cada camino con una sola función de nombre visible. Decisión de
  cierre: el catálogo puede bajar a `DM_ONLY` mientras las filas en manos de jugadores sigan sin
  identificar, y el DM puede entregar un objeto `DM_ONLY` si nace sin identificar. Cuatro rondas de
  revisión (dos Opus con caza de fugas camino por camino); de paso, `GameEvent.attackRef` (columna,
  migración 8) casa el crítico con su ataque por la referencia real y no por el nombre.

## Cerrar fichas, tanda de las decididas — con código (2026-09-11) — archivada

Las tandas 2–6 tarea a tarea (R1, archivar en la mesa, tandas 5c/5b/5a, 4e/4d/4c/4b/4a, 3, 2, E0,
P6, H7, M2B-14, D8), movidas enteras a
[`_archivo/historial-2026-09-11-tanda-de-las-decididas.md`](./_archivo/historial-2026-09-11-tanda-de-las-decididas.md)
el 2026-09-12 por el tope de 1000 líneas. Su hito se queda: **~35 fichas con código, 9 por decisión,
3 falsas, en `main` el 2026-09-11**.

## Las decisiones del autor sobre el cubo D, y nueve fichas que cierran solas (2026-09-10)

**Qué.** Se le llevaron al autor las ~28 fichas que la clasificación dejó en «decide el autor»,
cada una con opciones y una recomendación medida contra el código y el SRD; **aprobó todas**, con
una corrección: *«las que digan hasta jugar me gustaría cerrar antes; no quiero cosas molestas en
una partida»*. Salen veinte filas nuevas en [decisiones.md](./decisiones.md) (`D-CF-2`–`D-CF-21`),
**nueve fichas se archivan sin código** porque el código ya las decidía —M10b (no hay
`ENTITY_UPDATED`), H8 (medido: ~6,5 ms por regla y apertura), H9, D6, D7, A3-invitaciones, M11,
retención y «el taller convive»—, y el resto queda con su decisión escrita esperando manos: una
tanda de migraciones al cerrar la fase 2, dos cosas al paso 3, seis con código en esta sesión y la
mesa a 390 px a la fase 3. Con ello `05-datos.md` gana retención, `ownerId`, `isAdmin` y la hidra
falsa, **y pierde una frase falsa desde el 2026-09-03**: decía que el dueño no ve su personaje
`DM_ONLY`, y `character-viewer.ts` se lo enseña desde entonces.

**Por qué.** Una ficha «decide el autor» que no lleva opciones ni medición se queda abierta para
siempre; las nueve que cierran solas llevaban meses esperando una decisión que ya estaba tomada en
otro fichero.

**Cómo revertir.** `git revert`: las nueve vuelven al 06 y las filas `D-CF-*` desaparecen. Las
decisiones seguirían siendo del autor; solo perderían su registro.

## Cerrar fichas, tanda 1 — las de API puras (2026-09-10)

Una por commit, cada una con su prueba roja antes y su mutación. El texto entero de cada ficha y
su medición están en
[`_archivo/pendientes-cerrados-2026-09-10.md`](./_archivo/pendientes-cerrados-2026-09-10.md).

- **J6** — el `ENTITY_REVEALED` del motor lleva `entityName`, como el de la pantalla
  (`rules-engine.service.ts`, `applyRealEffects`). **Por qué:** era el camino de la revelación
  automática y el hilo no podía decir qué apareció. **Revertir:** quitar el `findFirst` y el campo
  del payload; el esquema lo tiene opcional, nada más se rompe.
- **J11** — armar una regla comprueba que la ficha de cada efecto es de esta campaña, y devuelve
  400 sin distinguir «no existe» de «ajena» (`rules-engine.service.ts`,
  `requireEffectEntitiesInCampaign`). **Por qué:** la regla quedaba `BROKEN` e inerte al disparar,
  o sea un botón que el servidor iba a rechazar. **Revertir:** quitar el método y sus dos
  llamadas; las tres pruebas J11 del e2e se ponen rojas.
- **N4** — cada propuesta llega con `ruleName` (`listProposals`, `include` de la regla) y la
  pantalla deja de cruzar el id contra la lista de reglas. **Por qué:** el aviso ya lo llevaba y
  el listado no; el «regla borrada» de respaldo era un caso imposible. **Revertir:** quitar el
  `include` y devolver a `Propuestas` la prop `reglas`.
- **P3 · enlace duplicado** — el `P2002` del índice único sale como 409 legible en vez de 500
  (`links.service.ts`, `create`). **Revertir:** quitar el `try/catch`. **De paso, medido y no
  arreglado:** dos enlaces **sin rótulo** entre las mismas fichas siguen entrando, porque Postgres
  no iguala dos `NULL` en el índice; cerrarlo es un índice parcial, o sea una migración del autor.
- **P3 · aceptar una invitación** — gastar el enlace y sentar al miembro van en una transacción,
  y el gasto es un `updateMany` condicional que decide la carrera (`invites.service.ts`).
  **Por qué:** tres peticiones a la vez entraban las tres por un enlace de un solo uso.
  **Revertir:** volver a los tres viajes sueltos; la prueba de carrera del e2e enrojece.
- **P3 · concesiones a no miembros** — `requireGrantsToMembers` en `create` y `update` de
  entidades: un id que no sea miembro tumba la petición entera con 400. **Por qué:** se guardaba
  una concesión inerte que se activaría sola el día que esa cuenta entrara. **Revertir:** quitar el
  método y sus dos llamadas.
- **P3 · grants inertes** — conceder a jugadores concretos con otra visibilidad es 400, no un
  descarte en silencio ni una fila inerte (`requireGrantsToMembers`, con la visibilidad
  resultante). **Revertir:** quitar la comprobación de visibilidad del método.
- **1.18a · `/auth/me`** — la rama muerta se va con la consulta repetida: `JwtStrategy.validate`
  devuelve `displayName` y el controlador contesta con `req.user`. **Revertir:** volver a
  `findById` en `me()`.
- **D4** — la lista de sesiones va por `scheduledAt` (desc, sin fecha al final) y no por
  `createdAt` (`sessions.service.ts`, `list`; D-CF-1). **Revertir:** volver al `orderBy` viejo.
- **P2 · `start()` con dos DM** — «suyos» es «su dueño es DM de la campaña», no «quien pulsó»
  (`encounters.service.ts`). Salió de «decide el autor» porque su premisa —no hay segundo DM—
  caducó con el plan 11. **Revertir:** volver a comparar con `userId`.
- **changeHp · rollEventId** — **no se cierra, vuelve a «decide el autor»**: «de ese personaje»
  rechazaría la tirada del atacante, y «reciente» pide un umbral que ninguna regla da.
- **J7** — **no se cierra, vuelve a «decide el autor»**: el motivo de una anulación no se guarda
  en ningún sitio (`overrides` es `{clave: número}`) y enseñarlo en la traza es un cambio de forma
  de un `Json` con datos escritos. Medición en el 06.

## La poda: treinta y nueve bloques fuera del tablero, y doce decisiones con fila (2026-09-10)

**Qué.** Se clasificaron **todas** las secciones abiertas de [06-pendientes.md](./06-pendientes.md)
contra el árbol en `4ced2bc` —falsa, cerrable, absorbida por el paso 3, o del autor— y se aplicó la
poda que [como-seguir.md](./como-seguir.md) tenía pendiente: **dieciséis fichas o mitades que el
código desmentía**, **doce tachadas** que seguían en el documento contra su propia regla, y
**once que los cuatro pasos de [04-convenciones.md](./04-convenciones.md) convirtieron en decisión
declarada o en «no es ficha»**, todas enteras en
[`_archivo/pendientes-cerrados-2026-09-10-poda.md`](./_archivo/pendientes-cerrados-2026-09-10-poda.md)
con su medición. Las decisiones tienen fila en [decisiones.md](./decisiones.md) (`D-POD-1` a
`D-POD-12`), la densidad de 14 px pasa a regla en `04`, y **tres fichas salen de «decide el autor»
sin salir del 06** porque los cuatro pasos las contestan: `start()` con dos DM, `U10` y `M2B-14`.
El 06 baja de 1496 a ~1100 líneas. Sin tocar código.

**Por qué.** Dos hallazgos de paso justifican por sí solos la pasada: la «corrección» del
2026-09-08 a la ficha de concesiones afirmaba que `specificPlayerIds` «ya no existe en ninguna
capa», y existe en `packages/shared/src/entity.schema.ts` y en `entities.service.ts` — **una
corrección que miente es peor que la ficha que corregía**; y `D5` (restaurar una copia) llevaba
días contradiciendo la decisión de la cabecera del mismo documento. Lo demás es la regla mecánica
de la cabecera del 06, que nadie había vuelto a aplicar desde el 2026-09-05.

**Cómo revertir.** `git revert` del commit: el archivo desaparece y el 06 vuelve a `4ced2bc`.
Ningún bloque se reescribió, así que la vuelta es exacta.

## El reconocimiento: dieciocho fichas que el código desmentía (2026-09-08)

**Qué.** Se leyeron unas cincuenta y cinco fichas de [06-pendientes.md](./06-pendientes.md) contra
el árbol —las que llevaban dentro una cita, un símbolo o un barrido, porque esas se verifican o se
caen solas—. **Dieciocho eran falsas**, cuatro de ellas P1, y se archivaron enteras en
[`_archivo/pendientes-cerrados-2026-09-08-reconocimiento.md`](./_archivo/pendientes-cerrados-2026-09-08-reconocimiento.md)
con la medición de cada una. El resto de las tocadas se corrigió en sitio: **ocho citas de línea
desplazadas**, dos enunciados al revés (`J6` y `N4`), la lista de `viewerFor` que había crecido de
cinco servicios a trece, y varias mitades falsas retiradas de fichas que siguen abiertas por la
otra mitad. **Y el veredicto del DM de la mesa de agentes del 2026-09-02 se anotó en vez de
archivarse** —un veredicto fechado no se reescribe—: sus tres motivos para «el combate no aguanta
el sábado» son hoy dos cerrados y uno a medias, y **los tres identificadores que cita (`M13`, `M14`
y `J4`) no existen en el documento**, así que su «ya están fichadas arriba» llevaba tiempo sin
llevar a ninguna parte. **Y tres documentos de estado mentían por su cuenta**, corregidos también:
[01-arquitectura.md](./01-arquitectura.md) negaba la bandeja de avisos y remitía a una ficha que ya
no existía; [05-datos.md](./05-datos.md) decía —con un «esto sí es cierto hoy» delante— que no hay
`features/notifications` ni pantalla de estado del mundo, y las dos existen; y
[como-seguir.md](./como-seguir.md) enlazaba a un índice de superpowers que nunca se escribió. Sin
tocar código.

**Por qué.** `E2` —«los enlaces del mundo no se pueden recorrer»— era P1 y su propia tabla la
llamaba «el hallazgo más importante de la pasada»: llevaba cerrada, con página de detalle, enlaces
entrantes y todo. Una ficha falsa de prioridad alta es trabajo que se hace dos veces, o un arreglo
que deshace el que ya existe. **Y el patrón que las explica casi todas:** una ficha que describe
con precisión el arreglo que le falta **no se vuelve a leer el día que ese arreglo se entrega**.
`U8-glifos` pedía la prueba que hoy existe, `D9` la pantalla que hoy existe, `J9` el filtro que hoy
cita la ficha desde dentro del código.

**Lo que ningún control iba a cazar, y por qué.** `pnpm check:docs` comprueba que una cita
`fichero.ts:NN` no se pase del final del fichero. Las ocho desplazadas apuntaban **dentro**, a
código de otra cosa: bien formadas y falsas. Y `05-datos.md` llevaba tres días declarando `D2` y
`D9` cerradas **mientras `06-pendientes.md` las listaba abiertas** — una contradicción entre dos
documentos del mismo directorio que ningún barrido de rutas puede ver. Es la mitad semántica que
[04-convenciones.md](./04-convenciones.md) ya declara que solo caza una lectura deliberada.

**Y la pasada estuvo a punto de mentir dos veces**, las dos por creer un acierto de `grep` sin leer
qué lo rodea: se rebajó la lista de `viewerFor` a cuatro servicios con un barrido truncado por un
`head` cuando son trece, y se dio `N4` por cerrada al encontrar `ruleName` en el **aviso** de una
propuesta, que no es su **listado**. Las dos se deshicieron midiendo otra vez; queda escrito en la
ficha de los barridos que envejecen, porque el modo de fallo lo cometió quien venía a arreglarlo.

**Cómo revertirlo.** Solo documentación: `git revert` del commit devuelve las dieciocho fichas a
`06-pendientes.md`, restaura las correcciones en sitio y en los tres documentos de estado, y borra
los dos ficheros nuevos de `_archivo/` — el del reconocimiento y el de la bandeja de avisos, que
salió de `07` para hacer sitio a esta entrada.

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

## `start()` devuelve por `get()`, como sus tres hermanos (2026-09-08, ficha P3)

La ficha se abrió anoche **al revertir este mismo arreglo**, y el revert era correcto con lo que se
sabía: devolver por `get()` tumbaba cuatro pruebas del servicio. Lo que faltaba era un dato —
`current()`, `setSide()` y `forceStart()` **ya devolvían por `get()`**—, y con él `start()` no era
un diseño alternativo sino un endpoint fuera del patrón mayoritario de su fichero.

> **Ese dato se escribió mal y la revisión lo cazó**: decía `advanceTurn()`, que **no** devuelve
> por `get()`. El nombre se puso de memoria sobre tres números de línea. La línea sigue siendo
> correcta, pero **la deuda no estaba cerrada del todo**: sobrevive en `advanceTurn()` y
> `setInitiative()`, con ficha propia en [06-pendientes.md](./06-pendientes.md).

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

## Lo que la poda desbloqueó: tres fichas que ya se podían cerrar (2026-09-07)

Ninguna era nueva. Las tres llevaban semanas con una cláusula «Cierra cuando…» **que el paso 2
había cumplido la noche anterior y nadie había notado**, porque una condición de cierre no se
revisa sola.

- **Conceder un modificador temporal pasa a ser del DM.** Un jugador podía darse `+10` al ataque,
  sin caducidad, y entraba en su hoja. La puerta existía por un caso real —beberse una poción— que
  dejó de necesitarla el 2026-09-06: `consume` escribe el modificador **directo con el `tx`**, sin
  pasar por `grant`. Comprobado antes de cerrar, y con prueba que lo sostiene.
- **Ayudar cuesta la acción de quien ayuda.** Un jugador con dos personajes se daba ventaja de uno
  al otro sin límite. Prohibirlo estaba descartado —el SRD deja que dos criaturas se ayuden—; lo
  que el SRD cobra es que Ayudar es **una acción**. Hereda la doctrina del paso 2: **cuenta y
  avisa, no impide**. Fuera de combate no gasta nada, y es supuesto declarado del autor.
- **El combate propone terminarse, y un jugador a 0 PG sigue en la mesa** con sus salvaciones a la
  vista. **Dos frases de esa ficha eran falsas** —el bando ya existía, y nadie retiraba a nadie— y
  se corrigieron en vez de copiarse. No cierra nada solo: el SRD 5.1 dice que ni la muerte del
  monstruo es automática, *«most DMs have a monster die the instant it drops to 0»* — costumbre
  del DM. La propuesta **solo llega al DM**, o el jugador deduciría que no queda ningún enemigo
  incluido el que no ve.

**Revertir:** tres commits independientes. Solo el tercero toca el contrato de `@dnd/shared`
(`derrotado` y `finalPropuesto`), así que es el único que arrastra fixtures.

---

## La mesa a 390 px: demostrada, no arreglada (2026-09-07, ficha P2 de estrecho)

`e2e/mesa-en-estrecho.spec.ts` mide lo que era sospecha desde el paseo del 2026-09-05: el borde
derecho de las «Herramientas del DM» cae en **550 px dentro de una ventana de 390**, y **la página
no lo delata** —ni barra horizontal ni vertical—, que es por lo que nada lo cazaba. **No se arregla
aquí, y esa es la entrega**: el apilado evidente mete el panel dentro y **gira el corte 90°** —el
elenco queda en 16 px de alto con cabecera de 36—, así que se revirtió y la medida 6 impide que ese
arreglo falso vuelva a colar. Falta una **decisión del autor** entre tres salidas, en
[06-pendientes.md](./06-pendientes.md). **Revertir**: borrar la prueba; no hay código que deshacer.

## `[[bahia]]` encuentra «Bahía» (2026-09-07, ficha P4)

`normalizar` de `wikilinks.ts` pliega los diacríticos antes de comparar: hasta hoy el DM que
tecleaba el enlace sin tilde veía su ficha dada por **inexistente**. La prueba que fijaba lo
contrario **avisaba en su comentario de que cambiarla sería a propósito** — es esto, y se
reescribió con la razón dentro: 4 en rojo antes, 1251 en verde después. Decisión y precio en
[decisiones.md](./decisiones.md) (D-P4-1). **Revertir**: deshacer el commit, es una función pura.

---

## El DM escribe el botín, y de paso deja de borrarlo (2026-09-07, ficha P2-2)

**Qué.** El formulario de una tabla de la casa gana el campo que le faltaba, en tres commits.
`entregaSchema` valida objetos y monedas al escribir y el servidor los resuelve al tirar desde que
existe la columna, pero **no había forma de redactarlos desde la pantalla**: la única era un `curl`,
y sobre una tabla sembrada así se declaró terminado el plan del botín.

- **La entrega se edita en un panel propio por fila**, no en línea: la fila ya lleva tres campos y
  una entrega es una lista de objetos con cantidad más cinco monedas, que a 390 px no cabe. El
  botón dice **sin abrirse** si esa fila entrega algo, que es lo que impide que un editor
  secundario esconda nada. Objetos y monedas conviven, porque el `.refine` del esquema solo prohíbe
  que la entrega esté vacía.
- **Y antes que eso, un borrado que nadie había visto.** `DmTableEntry` no declaraba `entrega` en
  la web; el servidor sí la manda, y editar **reemplaza las filas enteras** (`deleteMany` y las
  vuelve a crear). Abrir el formulario de la tabla sembrada y pulsar «Guardar cambios» se llevaba
  el botín por delante. Fue el primer commit, con su prueba en rojo antes.

**Lo que esto enseña, y es la razón de la entrada.** Construir una funcionalidad por los dos
extremos esconde lo que falta en medio: las dos mitades estaban probadas por separado y el único
gesto que las tocaba a la vez las rompía. **Sembrar por `curl` es justo lo que impide descubrirlo.**

**Cómo se verificó.** `pnpm verify` en verde en cada commit y **una sola tanda de navegador**, con
el filtro de fichero comprobado con `--list` antes de lanzarla. Mutado por los dos lados: quitar la
línea que transporta la entrega tumba las dos pruebas de componente **y** el recorrido de
navegador; quitar el campo del tipo no tumba ninguna de las dos y solo rompe `pnpm build` — el tipo
lo defiende el type-check, el comportamiento lo defienden las líneas que lo llevan.

**Dos cosas dichas aquí en vez de en una ficha nueva.** (1) El trozo de «elegir un objeto del
catálogo» existe ahora **en dos sitios**: `apps/web/src/features/inventory/SelectorDeObjeto.tsx` y el panel nuevo.
`SelectorDeObjeto` no se pudo reutilizar porque no es un selector —es un formulario de «añadir al
inventario»: exige `characterId`, muta al confirmar y no devuelve nada—, así que se reutilizó su
capa de datos y se escribió solo el elegir-y-devolver. Extraer un selector de verdad reutilizable
es mejor ingeniería y toca dos pantallas más; si algún día alguien abre los tres, que lo encuentre
escrito. (2) `pnpm db:slot` **está roto en esta máquina** (`Command "prisma" not found`); la base
del slot se creó y migró a mano con `prisma migrate deploy`.

**Cómo revertir.** Los tres commits son independientes. Revertir el primero devuelve el borrado;
revertir el segundo deja el formulario sin el campo pero **sin volver a borrar nada**, que es
mejor estado que el de partida.

---

## Tanda B — tres arreglos de API, y una ficha que se equivocaba de tamaño (2026-09-07)

**Qué.** Las tres fichas que la tanda corta dejó abiertas, en tres commits, cada una con su
mutación pieza a pieza:

- **P2-8** — `buildResponse` cierra el camino feliz de `changeHp` y hablaba con `this.prisma`
  aunque `equipoEquipado` y `viewerFor` ya sabían aceptar un cliente. Acepta el `tx?` y se lo
  reenvía; se lo pasan los **cuatro** llamadores que corren dentro de una transacción —uno más de
  los tres contados, y el que faltaba era el de `changeHpEnTransaccion`, que es el que la ficha
  nombra—. Su prueba se mide sobre un `changeHp` que **termina**: la de P2-0b no podía.
- **P2-1** — la red que exige que toda clave de condición que el motor lee esté en
  `esClaveReservada`, con la opción (c) de la ficha. Mira **las tres formas** —comparación
  literal, pertenencia a un conjunto y consulta a la base—, y cazarla solo por literales habría
  perdido los siete `Set` y con ellos la única lectura de `helped`.
- **P2-10** — la ficha se quedaba corta **en el tamaño**, y es la razón de escribir esta entrada
  aparte. Decía «dos pruebas lentas»; medido, son **veintitrés suites y 204 pruebas**, casi todas
  cayendo en el `beforeAll` que monta la aplicación y registra cuentas con `argon2`. **Arreglar
  las dos que nombraba habría dejado veintiuna suites igual de frágiles y la ficha tachada.** Se
  mide antes de arreglar, aunque la ficha diga que ya midió.

**Cómo se verificó.** `pnpm verify` en verde en cada commit. P2-10 no lleva paso 1 —no hay
comportamiento incorrecto que ver fallar— y se demuestra al revés: la misma contención que dejó 23
suites rojas las deja **todas verdes** después, sin bajar el paralelismo ni abaratar `argon2`, que
es una defensa. P2-1 se cazó por mutación cinco veces, incluida la más importante: la propia red
estrechada contra sí misma.

**Cómo revertir.** Los tres commits son independientes. Revertir el de P2-1 solo quita una red;
revertir el de P2-10 devuelve la fragilidad de diagnóstico, no un defecto de producto.

---

## Tanda corta — los seis arreglos que dejó abiertos el paso 2 (2026-09-07) — archivada

Entera en
[`_archivo/historial-2026-09-07-tanda-corta.md`](./_archivo/historial-2026-09-07-tanda-corta.md),
movida el 2026-09-12 al pasarse este fichero de sus 1000 líneas con la línea de la revisión de
HP-10. **El hito:** seis fichas (P2-0, P2-0b, P2-6, A11-usos-sin-tope, P2-7, P2-3) cerradas en seis
commits con prueba en rojo antes y mutación después —transacciones que no viajaban, la Furia que
se gastaba dos veces, el `max: null` que no era ilimitado, el `record()` que tragaba claves— y
cuatro fichas nuevas anotadas en vez de arregladas (P2-8, P2-9, P2-10 y la medición de P2-0).

## Paso 2 — la actividad, sus cinco formas y la economía de la mesa (2026-09-06/07) — archivada

**Movida entera** a [`_archivo/historial-2026-09-06-paso-2-actividad.md`](./_archivo/historial-2026-09-06-paso-2-actividad.md)
el 2026-09-12, al escribir la línea de cierre de HP-9a: el fichero quedaba en 1005 de 1000. En una
línea: once tareas en nueve commits (`2bd7769`…`2228341`/`8d4de37`) —la economía de acciones, `Origen`,
las cinco actividades del SRD, una subclase por personaje y la Furia de punta a punta—.

## Botín y reparto — una tabla entrega, y decir quién dio (2026-09-06) — archivada

**Movida entera** a [`_archivo/historial-2026-09-06-botin-y-reparto.md`](./_archivo/historial-2026-09-06-botin-y-reparto.md)
el 2026-09-12, al escribir la línea de HP-9a Task 2: el fichero quedaba en 1007 de 1000. En una línea:
una fila de `DmTable` puede llevar `entrega`, dar dice **quién** dio, y «Dar…» se hace desde la mesa;
tres commits (`eaa333e`, `cbbfebf`, `c36a099`).

## Poda del tablero, y una página que dice por dónde entrar (2026-09-06) — archivada

**Movida entera** a [`_archivo/historial-2026-09-06-poda-del-tablero.md`](./_archivo/historial-2026-09-06-poda-del-tablero.md)
el 2026-09-12, al escribir la línea de HP-9a: el fichero estaba en 997 de 1000. En una línea: las
tres fichas con «Cerrado» en el título salen de 06 a su archivo, y nace `como-seguir.md`.

## `CLAUDE.md` deja de narrar el estado (2026-09-06) — archivada

**Movida entera** a [`_archivo/historial-2026-09-06-claude-md-sin-estado.md`](./_archivo/historial-2026-09-06-claude-md-sin-estado.md)
el 2026-09-12. En una línea: el fichero que se manda leer primero pierde su prosa de estado —había
caducado tres veces en cinco días— y apunta a donde cada dato se genera o se mide; los tres avisos
se conservan enteros al final como justificación. **Revertir:** `git show` del commit anterior sobre `CLAUDE.md`.

## El cero de tipos comodín deja de depender de la costumbre (2026-09-06) — archivada

**Movida entera** a [`_archivo/historial-2026-09-06-cero-comodin-y-proceso-medido.md`](./_archivo/historial-2026-09-06-cero-comodin-y-proceso-medido.md)
el 2026-09-12. En una línea: `no-explicit-any` pasa de aviso a **error** en el código de
aplicación de los tres paquetes, porque ya daba cero y nada sostenía ese cero; verificado por mutación.

## El proceso pasa a medirse, y la frontera del encargo deja de ser solo de ficheros (2026-09-06) — archivada

**Movida entera** al mismo archivo el 2026-09-12. En una línea: los cuatro pasos antes de abrir
una ficha y la frontera del encargo por herramientas entran en `04-convenciones.md`, la tabla de
observabilidad en el ledger, y nacen `10-banco-de-tareas.md` y `prompts.md`.

## Paso 1 · Las goteras — los números dejan de mentir (2026-09-06) — archivada

**Movida entera** a [`_archivo/historial-2026-09-06-paso-1-goteras.md`](./_archivo/historial-2026-09-06-paso-1-goteras.md)
el 2026-09-11, cuando la ola de arreglos de la revisión final dejó el fichero a una línea del tope.
En una línea: las tareas del plan del paso 1 —crear un recurso desde la aplicación, las dos dagas
del pícaro, el PNJ cedido manejable por su jugador, el panel de dados sujeto, y los recorridos de
navegador que parpadeaban y no se commitearon—, con el commit de cada una en el bloque «Avance» del plan.

## Cada jugador pide su propia iniciativa, y el DM puede decir de qué bando está cada uno (2026-09-05/06, plan `iniciativa-y-bando`) — archivada

Entera en
[`_archivo/historial-2026-09-06-iniciativa-y-bando-hito.md`](./_archivo/historial-2026-09-06-iniciativa-y-bando-hito.md),
movida el 2026-09-11 (quinto corte de la sesión de cerrar fichas). **El hito:** las quince tareas
del plan —el DM ya no tira por los jugadores: cada uno recibe su petición, el encuentro nace
`PREPARING` y pasa a `ACTIVE` cuando la última llega; el bando vive en el combatiente y lo elige
el DM; los PNJ entran en el elenco—, con sus 34 decisiones `E-IB-*` en [decisiones.md](./decisiones.md).

## La documentación alcanza a la noche del 2026-09-05 — archivada

Entera en
[`_archivo/historial-2026-09-05-la-documentacion-alcanza.md`](./_archivo/historial-2026-09-05-la-documentacion-alcanza.md),
movida el 2026-09-11 (cuarto corte de la sesión de cerrar fichas). **El hito:** los documentos de
estado 01–05 y 09 se pusieron al día con los quince planes de esa noche, en un commit propio y
después de las tareas, no antes.

## El paseo de uso contra producción: un panel que se salía de la pantalla (2026-09-05) — archivada

Entera en
[`_archivo/historial-2026-09-05-paseo-de-uso.md`](./_archivo/historial-2026-09-05-paseo-de-uso.md),
movida el 2026-09-11 (tercer corte de la sesión de cerrar fichas). **El hito:** un paseo de uso a
dos anchos contra producción, el seed corregido en tres contratos, y la mesa a 390 px medida y
dejada como ficha en vez de arreglada a ciegas.

## El nervio en vivo, medido en producción detrás de nginx y Traefik (2026-09-05) — archivada

Entera en
[`_archivo/historial-2026-09-05-nervio-en-produccion-y-pnj.md`](./_archivo/historial-2026-09-05-nervio-en-produccion-y-pnj.md),
movida el 2026-09-10 (segundo corte de la sesión de cerrar fichas). **El hito:** el canal SSE se
comprobó **contra producción**, detrás de nginx y Traefik, y los sucesos llegaron; lo que viaja es
un aviso sin dato, y `canView` sigue mandando en la recarga. **No confundirla con su hermana**, la
entrega del canal (plan 12 · 12.3), archivada aparte.

## Un PNJ podía pelear, pero la pantalla no sabía su nombre ni sabía meterlo (2026-09-05) — archivada

Entera en el mismo archivo de arriba, movida el 2026-09-10. **El hito:** los PNJ instanciados
entran en la mesa con nombre y con su gesto de meterlos en el combate.

## Una campaña de demostración que se siembra sola (2026-09-05) — archivada

Entera en
[`_archivo/historial-2026-09-05-seed-demo.md`](./_archivo/historial-2026-09-05-seed-demo.md),
movida el 2026-09-10 al pasarse este fichero de sus 1000 líneas con la entrada de la tanda 1 de
cerrar fichas. **El hito:** `scripts/seed-demo.mjs` siembra una mesa entera **por HTTP y no por
Prisma** (E-N-2), idempotente, esperando el 429 en vez de sortearlo, y encontró seis contratos mal
entendidos que unas filas perfectas no habrían destapado.

## El nervio en vivo: avisos que llegan solos, y un sondeo que deja de ser el camino (2026-09-05, plan 12 · 12.3, D-OP-22) — archivada

Entera en
[`_archivo/historial-2026-09-05-nervio-en-vivo.md`](./_archivo/historial-2026-09-05-nervio-en-vivo.md),
movida el 2026-09-08 al pasarse este fichero de sus 1000 líneas. **El hito:** un canal SSE por
campaña que manda **avisos, no datos** —el navegador recarga por el endpoint autorizado, donde
`canView` sigue mandando—, con billete de un solo uso de 30 s, latido de 15 s, y el sondeo bajado a
60 s desde una sola constante. **Un canal tonto no filtra, y por lo tanto no puede filtrar mal.**

## La bandeja de avisos: el servidor llevaba desde 2A.14 hablando solo (2026-09-05, plan 12 · 12.2) — archivada

Entera en
[`_archivo/historial-2026-09-05-bandeja-de-avisos.md`](./_archivo/historial-2026-09-05-bandeja-de-avisos.md),
movida el 2026-09-08 al llegar este fichero a 988 de 1000. **El hito:** `notifications` existía
entero en el servidor desde 2A.14 y ningún fichero de `apps/web/src` lo mencionaba; ahora tiene
pantalla (`features/notifications/`, montada en el chrome), con cuántas sin leer, la lista enlazada
y marcar leído — y sin borrar. Su cabecera de archivo cuenta además la ironía que salió el día que
se archivó: [01-arquitectura.md](./01-arquitectura.md) seguía negando esta bandeja tres días
después de entregarla.

## Los dos avisos que nadie emitía, y un POST sin cuerpo que no debía ser un 400 (2026-09-05, plan 12 · 12.1) — archivada

**Movida entera** a [`_archivo/historial-2026-09-05-ola-3.md`](./_archivo/historial-2026-09-05-ola-3.md)
el 2026-09-08: la entrada de `advanceTurn()` y `setInitiative()` dejó este fichero en 1019 de sus
1000 líneas, y esta era la más antigua sin archivar. En una línea: dos sucesos que el servidor
declaraba y no emitía, y un `POST` sin cuerpo que devolvía 400 sin motivo.

## Los planes 03 y 15, ficha a ficha (2026-09-05) — archivadas

**Nueve entradas por tarea**, movidas enteras a
[`_archivo/historial-2026-09-05-por-tarea.md`](./_archivo/historial-2026-09-05-por-tarea.md) el
2026-09-05, cuando este fichero llegó a 997 de sus 1000 líneas. Lo que cerraron, en una línea cada
uno:

- **Plan 03 · el carril del motor** — el oráculo de la CA se cerró **por la puerta que importaba**
  (D-OP-11); el daño de una tirada se cobra **una vez, y lo impide la base** (D-OP-15); atacar a un
  ciego da ventaja (D-OP-13); «dónde se quedó» dejó de ser una promesa (D-OP-17); y los sucesos
  aprendieron a nombrar a quién ven (D-OP-12).
- **Plan 15 · el crítico y lo pequeño** — el crítico **dejó de declararse** desde el cuerpo de la
  petición (C2.5-2); quién ve una criatura **viaja con ella** (C6-2); la API dice si está sana
  mirando la base (D3); y las etiquetas se normalizan **al guardar** (E4).

## Los planes 05, 07 y 08, ficha a ficha (2026-09-05) — archivadas

**Seis entradas por tarea**, movidas enteras a
[`_archivo/historial-2026-09-05-por-tarea.md`](./_archivo/historial-2026-09-05-por-tarea.md) cuando
este fichero llegó a 1018 de sus 1000 líneas. Lo que cerraron:

- **Plan 07 · consolidación** — un concepto, un icono, con su prueba de barrido; el vocabulario del
  daño **una sola vez y con dos formas** deliberadas; y reclasificar una ficha **dice lo que cuesta**
  y deja rastro.
- **Plan 05 · el color de cada personaje** (D3) — el mismo color en el hilo y en el elenco, decidido
  por **una sola función**.
- **Plan 08 · inspiración y Ayudar** (I8) — la inspiración **no** es un booleano nuevo: es un
  `CharacterResource` con `max: 1`; y Ayudar es una condición que **caduca cuando el SRD dice**.

## La suite e2e de API entera vuelve a poder correrse (2026-09-05) — archivada

**Movida entera** a [`_archivo/historial-2026-09-05-ola-3.md`](./_archivo/historial-2026-09-05-ola-3.md)
el 2026-09-08: escribir la entrada de `start()` dejó este fichero en 1010 de sus 1000 líneas, y
esta era la más antigua sin archivar. En una línea: la suite de e2e de API había dejado de poder
correrse entera y volvió a hacerlo.

---

## Un personaje se archiva, y vuelve (2026-09-05, plan 06) — archivada

**Movida entera** a [`_archivo/historial-2026-09-05-ola-3.md`](./_archivo/historial-2026-09-05-ola-3.md)
el 2026-09-07, en el mismo corte que se llevó a la Ola 3 y a las otras tres: **ese día el fichero rebasó su tope dos veces** —al cerrar la ficha P4 quedó en 1001 líneas y al escribir la entrada de la mesa a 390 px en 1003—, y esta era la más antigua que quedaba sin
archivar. En una línea: la ficha M9 —servidor hecho desde 2.5.8 y **ninguna** de sus tres llamadas
en la web—, el archivo y su puerta de salida en un commit, y las cinco cosas que encontró su
revisión, entre ellas que la hoja de un personaje archivado ofrecía borrarlo.

---

## Las tres columnas: el bando, dónde abre la escena y la crónica fuera del Json (2026-09-05) — archivada

**Movida entera** a [`_archivo/historial-2026-09-05-ola-3.md`](./_archivo/historial-2026-09-05-ola-3.md)
el 2026-09-07, en el mismo corte que se llevó la del hilo. En una línea: los tres carriles del
plan 03 —el bando de cada combatiente, dónde abre la escena una sesión, y la crónica sacada del
`Json` a su propia columna—, y la lección de que **los defectos aparecen al juntar carriles que
estaban verdes por separado**.

---

## El hilo se lee como una conversación: lo último abajo (2026-09-05) — archivada

**Movida entera** a [`_archivo/historial-2026-09-05-ola-3.md`](./_archivo/historial-2026-09-05-ola-3.md)
el 2026-09-07, al insertar la entrada de la tanda B: el fichero quedó en 1032 de 1000 y esta era la
más antigua que seguía completa. En una línea: el registro de la sesión pasó a pintarse del más
antiguo al más reciente sobre una copia invertida, anclado al fondo **solo si el lector ya estaba
ahí**; y su revisión encontró que voltear el orden del DOM rompía un recorrido que daba por visto
el último nodo — **el orden del DOM es una interfaz compartida**.

---

## Las tres baratas: TipTap empaquetado, `build` en CI y la ficha de `lychee` (2026-09-05) — archivada

**Movida entera** a [`_archivo/historial-2026-09-05-ola-3.md`](./_archivo/historial-2026-09-05-ola-3.md)
el 2026-09-07, al insertar la entrada de la tanda corta de las seis fichas: el fichero quedó en
1011 de 1000 y esta era la más antigua que seguía completa. En una línea: los seis paquetes de
TipTap pasaron a `dependencies`, CI ejecuta `pnpm build` antes de `lint` —comprobado por mutación,
un `TS2322` lo tumba— y `lychee` se cerró por medición: no había ninguna mención viva.

---

## La Ola 3, las 21 decisiones y la auditoría de la cola larga (2026-09-05) — archivada

**Movida entera** a [`_archivo/historial-2026-09-05-ola-3.md`](./_archivo/historial-2026-09-05-ola-3.md)
el 2026-09-07: insertar las dos entradas del paso 2 y el botín dejó este fichero por encima de su
tope de 1000 líneas, y esta era la entrada más antigua. En una línea: tres commits de código (`ENTITY_LINKED` empezó a emitirse,
`concentrationSave` ganó pantalla y dos disparadores muertos se retiraron con su motivo escrito),
veintiuna decisiones cerradas y una auditoría de las 55 fichas de `06-pendientes.md` que encontró
siete caducadas por describir un hueco que ya estaba cerrado.
