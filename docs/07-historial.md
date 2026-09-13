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
> | [`_archivo/historial-2026-09-07-tanda-b.md`](./_archivo/historial-2026-09-07-tanda-b.md) | **Tanda B — tres arreglos de API** (2026-09-07), movida entera el 2026-09-12 al escribir la línea de la Tarea 3 del pulido: el fichero quedaba en 1009 de 1000 y era la entrada completa más antigua. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-10-decisiones-cubo-d.md`](./_archivo/historial-2026-09-10-decisiones-cubo-d.md) | **Las decisiones del autor sobre el cubo D**, movida entera el 2026-09-12 al escribir la línea de la Tarea 4 del pulido (`e2e/espacios.spec.ts`): el fichero quedaba en 1012 de 1000 y era la entrada completa más antigua. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-10-tanda-1-api-pura.md`](./_archivo/historial-2026-09-10-tanda-1-api-pura.md) | **Cerrar fichas, tanda 1 — las de API puras**, movida entera el 2026-09-12 al añadir la línea de la ronda de arreglo de la Tarea 4 (los dos defectos que la medición encontró): el fichero quedaba en 1004 de 1000 y era la entrada completa más antigua. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-11-tanda-migraciones-d-cf-14.md`](./_archivo/historial-2026-09-11-tanda-migraciones-d-cf-14.md) | **La tanda de migraciones de D-CF-14, un commit por migración**, movida entera el 2026-09-12 al escribir la línea de la Tarea 5 del pulido (`Campaign.boardRoomUrl`): el fichero quedaba en 995 de 1000 y era la entrada completa más antigua. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-11-tanda-playwright-migraciones.md`](./_archivo/historial-2026-09-11-tanda-playwright-migraciones.md) | **La tanda de Playwright que cierra las migraciones**, movida entera el 2026-09-12 en la ronda de revisión de la Tarea 5 del pulido: el fichero quedaba en 1011 de 1000 y era la entrada completa más antigua. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-07-dm-escribe-el-botin.md`](./_archivo/historial-2026-09-07-dm-escribe-el-botin.md) | **El DM escribe el botín, y de paso deja de borrarlo** (ficha P2-2), movida entera el 2026-09-12 al corregir el arreglo 2 de la Tarea 8: el fichero estaba en 1000 de 1000 y era la entrada completa más antigua. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-11-origin-alcanza-main.md`](./_archivo/historial-2026-09-11-origin-alcanza-main.md) | **`origin/main` alcanza a `main`**, movida entera el 2026-09-12 en la ronda de revisión de la Tarea 5 del pulido: el fichero quedaba en 1013 de 1000 y era la entrada completa más antigua. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-11-relectura-diez-frases-falsas.md`](./_archivo/historial-2026-09-11-relectura-diez-frases-falsas.md) | **Relectura de 01–05 y 09 al cerrar la rama: diez frases falsas**, movida entera el 2026-09-12 en la ronda de revisión de la Tarea 5 del pulido: el fichero quedaba en 1015 de 1000 y era la entrada completa más antigua. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-11-y-12-hoja-a-pagina-completa.md`](./_archivo/historial-2026-09-11-y-12-hoja-a-pagina-completa.md) | **La hoja a página completa** —fusión, despliegue y las once tareas del plan, HP-1 a HP-10—, movida entera el 2026-09-12 en la ronda de revisión de la Tarea 5 del pulido: el fichero quedaba en 1013 de 1000 y era la entrada completa más antigua. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-07-bahia-normaliza-diacriticos.md`](./_archivo/historial-2026-09-07-bahia-normaliza-diacriticos.md) | **`[[bahia]]` encuentra «Bahía»** (ficha P4), movida entera el 2026-09-13 al escribir la línea de la Tarea 9 del pulido (`dice[]` por dado): el fichero quedaba en 1007 de 1000 y era la entrada completa más antigua. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-07-mesa-390px.md`](./_archivo/historial-2026-09-07-mesa-390px.md) | **La mesa a 390 px, demostrada y no arreglada** (ficha P2 de estrecho), movida entera el 2026-09-13 en el mismo corte: el fichero seguía por encima de 1000 tras el primer archivado. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-07-poda-desbloquea-tres-fichas.md`](./_archivo/historial-2026-09-07-poda-desbloquea-tres-fichas.md) | **Tres fichas que la poda ya había cerrado sin que nadie lo notara**, movida entera el 2026-09-13 en el mismo corte: el fichero seguía por encima de 1000 tras los dos primeros archivados. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-08-start-devuelve-por-get.md`](./_archivo/historial-2026-09-08-start-devuelve-por-get.md) | **`start()` devuelve por `get()`, como sus tres hermanos** (ficha P3), movida entera el 2026-09-13 al escribir la línea de la Task 10 del pulido: el fichero estaba en 999 de 1000 y era la entrada completa más antigua. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-08-advanceturn-setinitiative.md`](./_archivo/historial-2026-09-08-advanceturn-setinitiative.md) | **`advanceTurn()` y `setInitiative()` devuelven por `get()` también**, movida entera el 2026-09-13 en el mismo corte: el fichero seguía por encima de 1000 tras el primer archivado. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-08-el-reconocimiento.md`](./_archivo/historial-2026-09-08-el-reconocimiento.md) | **El reconocimiento: dieciocho fichas que el código desmentía**, movida entera el 2026-09-13 en el mismo corte: el fichero seguía por encima de 1000 tras los dos primeros archivados. Su hito se queda arriba |
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

## Tarea 10 del pulido: la bandeja de dados — pulsar, no escribir (2026-09-13, C5 web: #10, #11, #14, anexo #16)

Qué — `bandeja.ts` (nuevo, `apps/web/src/features/rolls/`): `Bandeja { dados: Caras[];
modificador: number }` y sus cuatro operaciones puras (`conDado`, `sinDado`, `conModificador`,
`expresionDeBandeja`, `admiteVentaja`), probadas solas. `BandejaDeDados.tsx` (nuevo): pinta los
siete dados como botones, la pila con un botón por dado (`aria-label="Quitar el d6 (posición
N)"`), el modificador con `−`/`+`, `SelectorDeVentaja` solo si `admiteVentaja`, y un `<details>`
«Modo avanzado» —controlado a mano, no nativo: jsdom no implementa el clic-para-abrir de
`<summary>`— con el campo «Qué se tira» de siempre; la expresión escrita manda mientras el modo
avanzado está abierto y alguien ha tecleado, y pulsar un dado siempre devuelve el control a la
bandeja. Un rechazo del servidor abre el modo avanzado solo (derivado, no con un efecto: el
`react-hooks/set-state-in-effect` del linter lo prohíbe). `desglose.ts`: `dadosDeLaTirada` acepta
`dice[]` (Tarea 9) y devuelve `caras` por dado (`null` sin él); `ResultadoDeTirada.tsx` dibuja
cada dado con `IconoDado caras={dado.caras ?? 20}` en vez de siempre el d20. `PanelDeDados.tsx` y
`PanelDeDadosDeLaMesa.tsx` sustituyen su bloque «Qué se tira» + «Atajos» + `SelectorDeVentaja` por
`<BandejaDeDados>`; en el cajón compacto de la mesa, audiencia y CD (con su guía del SRD) se
pliegan en un `<details>` «Audiencia y CD» cuyo `summary` dice lo elegido, y el botón pasa a decir
«Tirar» a secas.

Por qué — el autor quiere ver muchos dados a la vez (4, 6, 9, 10 mezclados) y pulsarlos, no
escribir `4d6+1d8+1d20-2` a mano; el anexo #16 dejaba pendiente justo esta pieza de la rejilla de
dos columnas de la Tarea 3. `conDadoAnadido`/`expresion.ts` dejan de usarse en los paneles y se
conservan con su prueba, declarados como tal.

Pruebas — `bandeja.test.ts` (6), `BandejaDeDados.test.tsx` (8, con `fireEvent` y no `userEvent`:
el proyecto no tiene esa dependencia), `desglose.test.ts` (+3 con `dice[]`),
`ResultadoDeTirada.test.tsx` (+1, dos formas distintas en el mismo resultado),
`PanelDeDados.test.tsx` (los tres que escribían en «Qué se tira» abren «Modo avanzado» primero —
camino ajustado, aserción intacta). `pnpm --filter @dnd/web test -- src/features/rolls`: 77/77.
Mutación: `expresionDeBandeja` sin agrupar por caras (`1d6+1d6` en vez de `2d6`) enrojece
`bandeja.test.ts` **y** `PanelDeDados.test.tsx` — restaurada con `cp`. E2E actualizados (no
corridos por el agente): `dados.spec.ts` (nueva prueba de la bandeja contra la API real, y los
seis recorridos que escribían en «Qué se tira» abren «Modo avanzado» antes), `tirada.spec.ts`
(nueva: el cajón compacto cabe en 17rem sin desbordar), `espacios.spec.ts` (las dos medidas de
altura abren «Modo avanzado» y, en el cajón, «Audiencia y CD», antes de medir), `tokens-contrast.spec.ts`
(nuevo bloque: el botón de un dado, la pila, el rótulo «Modo avanzado» y el borde del campo
abierto, en los tres temas).

Revertir — `git revert` del commit; ningún dato ni migración de por medio.

---

## Tarea 9 del pulido: el servidor dice qué dado cayó — `dice[]` por dado (2026-09-13, C5)

Qué — `dadosTirados(terms: DiceTermResult[]): DieRolled[]`, nueva en `apps/api/src/dice/dice.ts`
junto al evaluador (es su conocimiento, no del servicio): empareja cada dado de `rolled` con sus
caras y dice si cuenta, consumiendo `dropped` como multiconjunto para que `[4, 4]` con un
descartado tache uno y no los dos — el mismo truco que ya usaba `dadosDeLaTirada` en la web.
`dieRolledSchema` (`{ sides, value, kept }`, `packages/shared/src/roll.schema.ts`) se añade,
**opcional**, a `desglose` (rama `revealed: true` de `rollResultSchema`) y al payload
`ABILITY_ROLL` de `game-event.schema.ts`; `rolls.service.ts` calcula `const dice =
dadosTirados(resultado.terms)` junto a `rolls`/`kept`/`dropped` y lo pone en los dos sitios.

Por qué — la pantalla (Task 10, web) necesita pintar cada dado con sus caras para poder tachar
el descartado dado a dado; hasta ahora solo tenía tres listas paralelas (`rolls`, `kept`,
`dropped`) y tenía que reconstruir el emparejamiento a mano, que es exactamente el fallo que ya
había en la web con `dadosDeLaTirada`. Con `dice[]` el emparejamiento se hace una sola vez, en el
servidor, con la misma lógica que ya lo resolvía.

Pruebas — tres unitarias nuevas en `dice.spec.ts` (empareja caras y marca kh/kl y relanzados;
con dos iguales y un descartado tacha uno y no los dos; una constante no es un dado) y una en
`rolls.service.spec.ts` (con ventaja, `dice` trae los dos d20 con su `kept`); un e2e nuevo en
`rolls.e2e-spec.ts` (`2d6+1d20` devuelve `dice` con tres entradas, caras `[6, 6, 20]` en orden, y
el suceso del log lo trae igual). `pnpm --filter @dnd/api test -- dice rolls`: 90/90. E2E de
`rolls`: 14/14. Mutación: quitar el `splice` que consume `pendientes` como multiconjunto hace
fallar «tacha uno y no los dos» (recibía dos dados con `kept: false` en vez de uno) — restaurado
con `cp`.

Revertir — `git revert` del commit; `dice` es opcional en ambos schemas y su ausencia no rompe
nada que ya exista, así que revertir no tiene trampa de datos que limpiar.

---

## Tarea 8 del pulido: `MenuDeAcciones` y la fila del elenco (2026-09-12, C2 #1)

Qué — `ui/MenuDeAcciones.tsx`, nuevo: el menú «…» genérico que la regla de
`docs/04-convenciones.md` ya nombraba (`ACCIONES_VISIBLES` = 2, D-CF-59). Consume `IconoMenu`
(Tarea 7); `<AccionDeMenu>` trae `id`, `rotulo`, `icono?`, `onSelect`, `disabled?`, `motivo?`
(leído por `aria-describedby`) y `tono?`. Teclado completo: flechas mueven el foco entre ítems
con vuelta al principio/final, Home/End al primero/último, Enter/Espacio seleccionan, Escape
cierra y devuelve el foco al botón, Tab lo cierra sin devolverlo, y un clic fuera también lo
cierra. Se abre hacia donde mide que hay sitio (`medirSitio`, costura de prueba documentada en
la firma — no una prop de producto).

`MandosDeCombatiente.tsx` (siete controles antes, hasta salirse de la tarjeta — anexo #1): solo
«Daño» y «Curar» quedan como botones; «Condición», «Dar…» y «Su hoja» pasan al menú, y
`accionesDeBando` (prop nueva, `AccionDeMenu[]`, `[]` por defecto) se añade al final. `DarObjeto`
gana `controlado?: { abierto; onCerrar }`: con él no pinta su propio botón «Dar» —el ítem del
menú ya lo abre y lo cierra—; sin él (`ResultadoDeTabla.tsx`, botín de una tabla del DM) se
comporta exactamente como antes. `CorregirBando.tsx` gana `useAccionesDeBando(p)`, que devuelve
los mismos tres ítems que su variante de fila usando el mismo `useSetSide`/`BANDOS` — no una
segunda implementación. La fila quedó sustituida por el menú: sus aserciones se movieron a los
`menuitem` con su razón escrita en cada prueba, y el componente de fila, sin consumidor ni
prueba propia, se borró en la ronda de arreglo 3 (abajo). *(Esta frase decía «se queda
intacta, para no borrar su prueba» hasta esa ronda; era falsa: la prueba ya se había movido.)*
`FichaDeElenco`/`FichaDePnj` dejan de montar `<CorregirBando />` aparte y llaman al hook siempre
(valores de repuesto cuando falta encuentro/bando/sesión, por la regla de los hooks), pasando la
lista real al menú solo cuando la misma puerta que antes decidía montar la fila —`conMandos`/
`esDm` + `enCombate` + `bando` + `sessionId` + `encounterId` + `combatanteId`— sigue abierta.

Pruebas — TDD: `MenuDeAcciones.test.tsx` (5), `fireEvent` en vez de `userEvent` porque
`@testing-library/user-event` no es dependencia del paquete (comprobado antes de escribir, no
se añadió). `FichaDeElenco.test.tsx`, `ColumnaElenco.test.tsx` y `DarObjeto.test.tsx`: las
aserciones que buscaban el `group`/botón de fila **cambiaron de camino** (abrir el menú, mirar
sus `menuitem`) y **no se borró ninguna** — dos de ellas necesitaron `findByRole` en vez de
`getByRole` porque los ítems de bando llegan por una consulta más (`useCurrentEncounter`) que
puede resolver después de que el menú ya esté abierto. `DarObjeto.test.tsx` suma tres casos del
modo `controlado`. Mutación: quitar la rama `Escape` de `MenuDeAcciones.tsx` (`cp` de por medio)
puso roja la unitaria del foco; restaurado con `cp`. Unitarias en verde, ninguna desactivada
(el conteo lo escribe el bloque generado de [00-INDEX.md](./00-INDEX.md), no esta línea).

e2e (editados, no corridos por el implementador — los corre el orquestador):
`teclado.spec.ts` gana un recorrido nuevo, el menú por teclado entero (Tab hasta «Más acciones
sobre …», Enter abre y mueve el foco al primer ítem, ArrowDown al segundo, Escape cierra y
devuelve el foco, Enter+Enter selecciona y abre «Condición»). `combate.spec.ts` no citaba
«Condición»/«Dar»/el ojo — no necesitó cambios. `dar-a-un-pnj.spec.ts`: el clic en «Dar» de la
fila pasó a abrir «Más acciones sobre Borin Barbaférrea» y elegir el `menuitem` «Dar…».
`espacios.spec.ts` gana la medida del anexo #1: la fila de mandos de una tarjeta no se sale de
su rectángulo, a 1280×800. `tokens-contrast.spec.ts` gana una superficie: el menú abierto sobre
un combatiente real, en los tres temas.

Documentación — 04 ya nombraba el componente (Tarea 0); se le añadió la línea de qué se plegó
y cuándo. 08: fila nueva `teclado` (no tenía fila propia pese a existir desde antes) y se
corrigió una frase que decía que Playwright no cubría teclado, cuando `teclado.spec.ts` ya
existía; `espacios`, `dar-a-un-pnj` y `tokens-contrast` ganan una frase cada una sobre su
medida/camino nuevos.

Ronda de arreglo 3 (revisión de `1c30fe8..6b54aa4`) — cuatro hallazgos. (1) La medida de
`espacios.spec.ts` era **vacía**: medía el `<div>` de la fila, caja de bloque que nunca sobresale
de su tarjeta; lo que se salía en el anexo #1 eran sus hijos. Ahora mide cada hijo directo contra
el borde de la tarjeta (±1px) y `scrollWidth ≤ clientWidth` en la fila. (2) `useAccionesDeBando`
**tragaba el error** que la fila pintaba con `role="alert"`: devuelve `{ acciones, error }` y
`MandosDeCombatiente` (prop `errorDeBando`) lo pinta bajo la fila; RTL con `setSide` rechazando.
(3) El componente de fila `CorregirBando` **se borró** (sin consumidor ni prueba). (4) «Neutral»
**perdió su frase**: `AccionDeMenu` gana `descripcion?`, leída por `aria-describedby` aparte de
`motivo` (con los dos, se enlazan los dos ids) y pintada FUERA del botón para no entrar en su
nombre; el hook la pone en NEUTRAL. Menores: `activo` se acota si la lista encoge; Escape hace
`stopPropagation` para no cerrar un `Dialog` que lo contenga (D-CF-50). Mutación: sin `error` ni
`descripcion` en el hook, dos unitarias en rojo; restaurado.

Ronda de arreglo 4 (controlador): el arreglo 2 de `espacios.spec.ts` («…La mesa tira», anexo #8)
decía que la carrera era una tipografía tardía de Google Fonts; era falso — la guía de CD
(`useGuiaDeCd`, solo en `PanelDeDadosDeLaMesa.tsx`) llega del servidor después del primer pintado y
suma 33.5 px si la medida se toma antes, así que esa prueba espera ahora a que su primer botón
(«Muy fácil…») esté visible; la de la pantalla «Dados» no monta esa guía y se queda igual.

---

## Tarea 7 del pulido: seis dados dibujados y el barrido de iconos (2026-09-12, C3 #12 y #22)

Qué — `ui/Iconos.tsx` gana `IconoDado({ caras })` —seis siluetas, «un dado, una forma»
(D-CF-62): tetraedro, cubo, octaedro, trapezoedro (compartido por d10 y d100), dodecaedro,
icosaedro— e `IconoMenu` (los tres puntos de una fila, para la Tarea 8). `features/rolls/
DadoDibujado.tsx` deja de dibujar su propio icosaedro y pasa a delegar en `IconoDado caras={20}`;
**su `data-icono` cambia de `"dado"` a `"d20"`**, y las dos aserciones que lo buscaban
(`ResultadoDeTirada.test.tsx`, `e2e/tirada.spec.ts`) se actualizaron con ese motivo. Los atajos de
`PanelDeDados.tsx` y `features/rolls/panel/PanelDeDadosDeLaMesa.tsx` pintan `IconoDado caras={caras}` —antes
siempre dibujaban el icosaedro aunque el atajo fuera «d4»—.

Y el barrido nuevo, `ui/__tests__/botones-con-icono.test.tsx`: todo `<Button>` primario de página
cuyo texto **contiene** «Crear», «Escribir», «Nueva», «Nuevo» o «Añadir» (el regex es
`\b(...)\b` sin anclar al principio, así que un botón cuyo texto lleve la palabra en medio
también cuenta) lleva un icono dibujado dentro, y ningún botón empieza por un «+» de fuente —eso
sí está anclado, y correctamente. El primer barrido encontró **15 culpables**
(`features/world-state/PanelDeEstadoDelMundo.tsx`, `features/rules/PanelDeReglas.tsx`,
`features/links/LinksPanel.tsx`, `features/dm-tables/PanelDeTablas.tsx` «Crear tabla»,
`features/character-sheet/RecursosYDescansos.tsx` «Crear»,
`features/campaigns/CreateCampaignModal.tsx`, `features/campaigns/Cronicas.tsx`,
`features/campaign-items/CampaignItemsCatalogPage.tsx` «+ Crear objeto»,
`features/campaign-items/EffectsEditor.tsx` «Añadir»,
`features/bestiario/PanelDeBestiario.tsx` «Escribir una criatura», dos botones de
`pages/CampaignDetailPage.tsx` («Nueva sesión», «Nuevo personaje»), `pages/DesignTokensPage.tsx`,
`pages/EntityDetailPage.tsx` «Escribir» y `pages/RegisterPage.tsx` «Crear cuenta»): todos
llevan ahora `IconoMas`, salvo los dos de «escribir» (bestiario y `EntityDetailPage`), que llevan
`IconoPluma` — el mismo dibujo para el mismo concepto, sin inventar uno nuevo. «+ Crear objeto»
pasó a «Crear objeto» con `IconoMas` delante: el `+` era un glifo de fuente haciendo de icono, la
misma infracción que la regla de iconos ya prohibía para los sueltos.

Por qué — anexo #12 (C3): «un dado, una forma» estaba declarado en `04-convenciones.md` sin que
`IconoDado` existiera; anexo #22: «Escribir una criatura» iba sin icono y «+ Crear objeto» llevaba
un `+` de fuente, y ninguna prueba lo impedía porque `iconos-sin-duplicados.test.ts` sólo barre
ficheros de iconos, no botones.

Evidencia — unitarias: `Iconos.test.tsx` (el nuevo caso de `IconoDado`, siete dados, seis dibujos
distintos y el d100 igual al d10; el conteo de exports sube de 29 a 30 porque `IconoDado` queda
fuera del bucle genérico —exige `caras`— e `IconoMenu` entra en él) y
`botones-con-icono.test.tsx` (dos pruebas, ambas en verde tras arreglar los 15 culpables) — suite
completa: 160 ficheros, 1493 pruebas, verde. Mutación: `cp` de respaldo de `Iconos.tsx`, el trazo
del d8 sustituido por el del d6, la prueba «seis dibujos distintos» pasa a detectar solo 5;
restaurado con `cp`. `pnpm verify` en verde. Orquestador: `e2e/dados.spec.ts` y
`e2e/bestiario.spec.ts`.

**Revertir:** un commit. Quitar `IconoDado`/`IconoMenu` de `ui/Iconos.tsx`, devolver
`DadoDibujado.tsx` a su dibujo propio, los atajos a `<DadoDibujado />`, deshacer los 15 icono/
texto de botón y borrar `botones-con-icono.test.tsx`.

## Ronda de arreglo de la tarea 7: un solo d20, la navegación entra en el barrido (2026-09-12)

Qué — la revisión (ronda 1) encontró que `IconoD20` (el de arriba, ya existente antes de la
Tarea 7) dibujaba **su propio** icosaedro con el mismo `data-icono="d20"` que `IconoDado
caras={20}`: dos siluetas para un dado, la misma infracción que «un dado, una forma» existe para
impedir. `IconoD20` pasa a delegar (`return <IconoDado caras={20} className={className} />`);
sus tres consumidores (`features/sessions/RailDePaneles.tsx`,
`features/sessions/hilo/TiradaIncrustada.tsx`, `features/sessions/taller/PrepararSesion.tsx`) no
cambian una línea. Ninguna prueba comprobaba el trazo
propio de `IconoD20` (grep confirmado: solo `data-icono="d20"`, que sigue igual), así que no hizo
falta actualizar ninguna aserción.

`docs/04-convenciones.md` afirmaba que la prueba también cubría «toda entrada de navegación», y
no era cierto: `botones-con-icono.test.tsx` solo miraba `<Button>`. Gana una tercera prueba que
barre las entradas de `CampaignDetailPage.tsx` — no son un array literal (`TABS.map` arma cada
`TabItem` en su propio `if`), así que la prueba extrae el cuerpo de la función contando llaves
(balanceo real, no regex) y comprueba, por cada `id: "…"`, que el tramo hasta el siguiente `id:`
lleva su `icon:`.

Pulido a los dados que la revisión pidió: el d4 dibujaba dos segmentos que **retrazaban su
propia base** (ya cerrada) en vez del tetraedro — ahora es el contorno más un rayo del centroide
a cada vértice. El d8 retrazaba dos aristas del contorno (vértice superior a los laterales) — ahora
es el contorno, el ecuador y el eje vertical, ninguna línea repite una arista. Y los tres
comentarios que citaban «un dado, una forma» como si viviera en `04-convenciones.md` pasan a citar
`docs/decisiones.md` D-CF-62 (con la regla de texto en 04, de la Tarea 0) — el docstring de
`IconoDado`/`IconoD20` en `Iconos.tsx` y los dos comentarios de atajo en `PanelDeDados.tsx` y
`PanelDeDadosDeLaMesa.tsx`.

Y de paso, la deuda de redacción de este mismo fichero: la frase de más arriba decía que el
barrido de botones actúa sobre texto que «empieza por» Crear/Escribir/Nueva/Nuevo/Añadir; el
regex real (`\b(...)\b`) no ancla al principio, así que la palabra puede ir en medio del texto —
la frase pasa a decir «contiene», y el comentario del propio `botones-con-icono.test.tsx` se
corrigió igual.

Por qué — revisión de ronda 1 sobre `ea28fff..c1677f3`, dos hallazgos «Important» (dos siluetas
para un dado; una frase de 04 sin prueba que la sostenga) y pulido acompañante.

Evidencia — `Iconos.test.tsx` y `botones-con-icono.test.tsx` (ahora tres pruebas) en verde;
`pnpm --filter @dnd/web test -- src/ui src/features/rolls src/features/sessions` y `pnpm verify`
en verde (detalle en el commit de esta ronda). Sin Playwright — el orquestador corre
`tirada`, `inventario`, `objeto-sin-identificar` y `nervio-en-vivo`.

**Revertir:** un commit. Devolver `IconoD20` a su dibujo propio, quitar la tercera prueba de
`botones-con-icono.test.tsx`, revertir los dos dados y las tres citas de D-CF-62.

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

---

## Tarea 5 del pulido: `Campaign.boardRoomUrl` (2026-09-12, C1 bis)

Qué — la partida de PlanarAlly (`tablero.supportive.pro/game/<nombre>`) que la mesa enmarcará
(spec del tablero § 2 ter). Migración escrita a mano
(`20260912120000_campaign_board_room_url`, `ADD COLUMN "boardRoomUrl" TEXT`), aplicada con
`migrate deploy` contra el Postgres de Docker y el cliente regenerado; el contrato
(`packages/shared/src/campaign.schema.ts`) solo acepta `http(s)` hasta 500 caracteres —el valor va
a un `src` de `<iframe>`, y `javascript:` no es una sala—, `null` la quita y ausente no la toca
(mismo patrón que `encumbranceVariant`, D-CF-16). El servicio (`campaigns.service.ts#update`) la
escribe solo si viaja; se acepta al crear y desde ajustes —el mismo defecto de MEDIA-2 con
`encumbranceVariant` reapareció con este campo en la revisión y se cerró igual—. La web
añade un bloque «Sala del tablero» bajo el interruptor de sobrecarga en `CampaignSettings.tsx`,
con Guardar/Quitar explícitos sobre el mismo `PATCH /campaigns/:id`; solo el DM puede escribir, y
el servidor lo exige (`requireDM`), no el botón deshabilitado.

Ronda de revisión (mismo día) — dos Important, los dos contra el propio boceto del brief: el
botón «Guardar la sala» se deshabilitaba con el campo vacío, contra
`docs/04-convenciones.md:460` («el botón de guardar nunca se deshabilita»); ahora un campo vacío
se explica con el error del `Field` y no llama al PATCH, y «Quitar la sala» ya no vacía el input
antes de la respuesta —si el PATCH falla, lo tecleado se queda—. Y `campaigns.service.ts#create`
tiraba `boardRoomUrl` en silencio pese a que el contrato la acepta desde el alta —el mismo defecto
de MEDIA-2 que ya se había cerrado una vez con `encumbranceVariant`—; ahora se persiste también
al crear.

Por qué — el tablero es autohospedado y cada mesa tiene su propia partida; la URL vive en la
campaña, no en código ni en variable de entorno, porque cada DM la pega una vez desde su PlanarAlly
y la mesa la usa desde ahí en adelante (fuera de esta tarea: la propia pantalla de la mesa que la
consume).

Evidencia — e2e de API (`campaigns.e2e-spec.ts`): el DM guarda y lee la URL, un jugador miembro
recibe 403, `javascript:alert(1)` da 400 y `null` la borra, y un `POST` con `boardRoomUrl` la
persiste desde el alta — 22/22 en verde. Mutación: quitar el `refine` del `http(s)` hace fallar
el caso de `javascript:` (200 en vez de 400) — confirma que la prueba depende de esa línea, no
de la forma del contrato. Unitarias web (RTL, 7 en total): el DM ve «Sala del tablero», pulsa
Guardar y el PATCH lleva `boardRoomUrl`; con sala guardada aparece «Quitar la sala» y manda
`null`; Guardar con el campo vacío no llama al PATCH y muestra el error; si «Quitar la sala»
falla, el input conserva su valor. `pnpm verify` en verde.

**Revertir:** migración inversa `DROP COLUMN "boardRoomUrl"` (descrita en la cabecera del SQL) y
quitar el bloque `SalaDelTablero` de `CampaignSettings.tsx`, la línea del servicio y el campo del
contrato y del esquema de Prisma.

## Tarea 4 del pulido: `e2e/espacios.spec.ts`, la pasada de medición (2026-09-12, tres rondas)

Qué — anexo #17, y cierra la medida de #6 y #8. Estado final de `medirHermanas(raiz)`, tras dos
rondas de arreglo sobre el commit original: mide **toda tarjeta** de la pestaña —
`section[aria-label]` (`TarjetaDeHoja`) y `[data-tarjeta]` (la caja pequeña que se apila junto a
una `TarjetaDeHoja` en vez de ir dentro: Percepción pasiva, Dados de golpe, Salvaciones de
muerte) — no solo los hijos directos de `[data-pestana]`. Ronda 1 medía `:scope > *`, y la
mutación de prueba del controlador (`gap-[10rem]` bajo «Ficha», en `Rasgos.tsx`) seguía en
verde: el hueco de 160px vivía DENTRO de un hijo directo (una sub-rejilla que apila Ficha +
Personalidad), invisible desde fuera. Cinco pruebas corren a 1280px sobre `[data-pestana]` de
Números, Rasgos, Recursos, Estado y **Ataques** (ronda 3: mismo `lg:grid-cols-2 items-start` de
dos tarjetas que las demás) contra `HUECO_MAX_PX=48` / `DESNIVEL_MAX_PX=24` (nota de diseño de la
Tarea 0, § 7); Objetos y Conjuros se quedan fuera — Objetos tiene su propia rejilla de
inventario con panel de detalle sticky, medida por la prueba del anexo #6 de más abajo, y
Conjuros solo se monta para quien lanza conjuros, que el guerrero de esta suite no. **Desnivel:
una tarjeta con otra tarjeta debajo en su misma columna queda exenta** (la columna, no la
tarjeta, llena la fila) — en Números eso exime a Salvaciones (que desde la ronda 3 crece con
`flex-1` para repartirse el alto sobrante con Percepción pasiva, dejándola pegada al final de la
columna en vez de flotando con un hueco debajo) y a las tarjetas que abren un apilado en
Rasgos/Recursos/Estado. Lo que sí se compara: la última tarjeta de cada columna (o la única),
agrupadas por techo compartido (`|y diff| < 4`); ninguna fila se descarta (la ronda 2 traía un
descarte de «la fila más baja, salvo que sea la única» que nunca llegaba a ejecutarse con el
contenido real de hoy, y se quitó en la ronda 3 en vez de dejarlo como lógica muerta). Una sexta
prueba abre la pestaña Objetos con doce objetos dados por la API (mismo atajo que
`inventario.spec.ts`) y comprueba que el panel `aside "detalle del objeto"` (sticky de la Tarea
2) se pega justo bajo la banda fija tras desplazar — **con cota de arriba y de abajo** desde la
ronda 3 (antes solo comprobaba que no se solapara; sin la cota de arriba, un `--banda-fija-alto`
roto que reportara siempre 0 habría dejado pasar el detalle a 16px de la banda sin que nada lo
notara), leyendo `--space-4` resuelto a píxeles por el propio navegador y no por el texto del
token (`1rem`, no `16px`, es lo que devuelve `getPropertyValue` de una variable CSS). Las dos
últimas pruebas escriben una expresión inválida y comprueban que el alto de la tarjeta de tirar
no cambia — en la pantalla «Dados» y en el cajón «La mesa tira» (extra al brief, del
controlador). Los helpers de registro/campaña/personaje son copias literales de `hoja.spec.ts` —
los e2e no comparten módulo hoy, anotado así en el propio fichero.

**Los tres defectos reales que la medida encontró y se arreglaron en la misma tanda**:
1. (ronda 1) el detalle de Objetos se metía 60px bajo la banda fija — la banda ahora reporta su
   alto real por `ResizeObserver` (`Cabecera.tsx` → `onAlto` → `HojaCalculada.tsx` → variable
   `--banda-fija-alto` → `DetalleDeObjeto.tsx`), en vez de que el sticky sumara solo el escalón
   de `AppShell`;
2. (ronda 1) 42px de desnivel en Números — `items-stretch` a página, igualando el alto de las
   tres columnas (a mesa sigue en `items-start`);
3. (ronda 3) ese `items-stretch` estiraba el envoltorio invisible de la columna del medio, no
   sus dos tarjetas: Percepción pasiva seguía con su alto natural y dejaba un hueco vacío bajo
   ella. La tarjeta Salvaciones (`className="flex-1"`) es la que ahora crece para llenar ese
   sobrante — la corrección visible, no solo el envoltorio.

Por qué — Tarea 4 del
[plan de pulido](./superpowers/specs/2026-09-12-pulido-antes-del-paso-3-design.md), cierra el
anexo #17 y las medidas de #6 y #8; revertir — `git revert` de los cuatro commits de esta tarea,
en orden inverso (`695d200`, luego el de esta tercera ronda, que quita `ataques` de la lista,
`flex-1` de Salvaciones e `items-stretch` de `Ataques.tsx`, y las dos cotas nuevas de la prueba
de Objetos; después `8cca54d`; por último el commit original de la Tarea 4).

## Tarea 3 del pulido: Ajustes del personaje en una tarjeta con pie, y Dados en rejilla (2026-09-12)

Qué — anexo #9: `AjustesDePersonaje.tsx` pasa de una pila de `div` a una `TarjetaDeHoja` (Task 1)
con `etiqueta="ajustes del personaje"`; color y visibilidad se quedan en el cuerpo, y archivar +
borrar (con sus errores en línea) se mueven al `pie`, separados por su propio filete. Anexo #16:
`PanelDeDados.tsx` mete el reloj en la misma rejilla que pedir una tirada y tirar
(`grid items-stretch gap-s5 xl:grid-cols-2`, reloj con `xl:col-span-2`) en vez de apilarlo aparte
en `mb-s5`; `RelojDeCampana` gana `className?` que **sustituye** su `max-w-[40rem]` por defecto
(no lo añade), y sus dos bloques «Pasa el tiempo» / «O viajáis» pasan de apilados a
`md:grid md:grid-cols-2 md:gap-s4`, con el «Qué pasa (opcional)» debajo a todo lo ancho. **La
bandeja compacta de #16 no está aquí** — sigue en el formulario largo de siempre; llega en la
Task 10 (nota en `docs/06-pendientes.md`). Unitarias: una de orden en `archivar.test.tsx`
(`compareDocumentPosition` entre color, visibilidad y archivar, y `archivar.closest("footer")`
no nulo) y una en `PanelDeDados.test.tsx` («con rol DM, el reloj, pedir y tirar están los tres»).
Verificado por mutación: `cp AjustesDePersonaje.tsx …bak`, se sacó `BotonArchivar` del `pie` al
cuerpo → la unitaria de orden FAIL (el botón deja de estar bajo un `footer`), restaurado con
`cp`. (Sacar solo `DeleteButton`, como decía el brief al pie de la letra, no rompe esa unitaria
— la aserción mira `archivar`, no `borrar` — así que la mutación real se hizo sobre
`BotonArchivar`, que sí prueba el pie.) Por qué — Tarea 3 del
[plan de pulido](./superpowers/specs/2026-09-12-pulido-antes-del-paso-3-design.md), anexos #9 y
#16 de la lista del autor; revertir — `git revert` del commit de esta tarea.

## Tarea 2 del pulido: espacio reservado en `Field`, sticky con escalón y rejilla de Rasgos (2026-09-12)

Qué — `Field` gana `reservaEspacio?: boolean` (anexo #8): con él, la línea de pista/error
(`data-testid="field-linea"`) se pinta siempre con `min-h-[1.125rem]`, vacía si no hay nada que
decir, para que el control no salte de alto cuando el evaluador de la expresión de dados hace
aparecer y desaparecer el error mientras se escribe; los dos `Field label="Qué se tira"`
(`apps/web/src/features/rolls/PanelDeDados.tsx` y
`apps/web/src/features/rolls/panel/PanelDeDadosDeLaMesa.tsx`) lo activan. `DetalleDeObjeto.tsx` (panel
sticky de la pestaña Objetos) pasa de `lg:top-s4` a
`lg:top-[calc(var(--tira-fija-top,0px)+var(--space-4))]` para respetar el escalón de la banda
fija (`--tira-fija-top`, 4rem en `AppShell`, 0px en `Dialog`) en vez de clavarse siempre a 1rem.
`Rasgos.tsx` (anexo #7) mete Ficha y Personalidad en una sub-rejilla de una columna a la
izquierda y `RasgosYAptitudes` sola a la derecha — antes las tres eran hermanas de una rejilla a
dos columnas y el motor de rejilla repartía dos-y-una, dejando un hueco vacío bajo la tarjeta más
corta; el DOM accesible no cambia, solo el envoltorio, y la unitaria de las tres regiones
(`Rasgos.test.tsx`) sigue en verde sin tocarla. Dos casos nuevos en `Field.test.tsx`: con
`reservaEspacio` la línea existe vacía con `min-h-`, sin él no se pinta. Verificado por mutación:
`cp Field.tsx Field.tsx.bak`, se quitó `min-h-[1.125rem]` de las tres clases condicionales →
`con reservaEspacio, la línea de pista existe...` FAIL (`expected 'font-chrome text-chrome-xs'
to match /min-h-/`), restaurado con `cp` y borrado el `.bak`; por qué — tarea 2 del
[plan de pulido](./superpowers/specs/2026-09-12-pulido-antes-del-paso-3-design.md), anexos #6, #7
y #8 de la nota de diseño de la tarea 0; la medida en navegador de #6 (escalón del sticky) y #8
(salto de alto del Field) la escribe la Tarea 4 en `espacios.spec.ts`, no esta; revertir —
`git revert` del commit de esta tarea.

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

## La hoja a página completa (2026-09-11 y 12) — archivada

**Movida entera** a
[`_archivo/historial-2026-09-11-y-12-hoja-a-pagina-completa.md`](./_archivo/historial-2026-09-11-y-12-hoja-a-pagina-completa.md)
el 2026-09-12, en la ronda de revisión de la Tarea 5 del pulido: el fichero quedaba en 1013 de
1000 y era la entrada completa más antigua. En una línea: fusión (`e43038f`) y despliegue
(`6d2b2ca`) de `hoja/pagina-completa` a producción, veintiséis commits de las once tareas del
plan, la ola de revisión final de la rama, y las tandas HP-1 a HP-10 (sintonización cuenta,
la fila resume todos los tipos de efecto) cerradas hasta HP-9b.

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

## Relectura de 01–05 y 09 al cerrar la rama: diez frases falsas (2026-09-11) — archivada

**Movida entera** a
[`_archivo/historial-2026-09-11-relectura-diez-frases-falsas.md`](./_archivo/historial-2026-09-11-relectura-diez-frases-falsas.md)
el 2026-09-12, en la ronda de revisión de la Tarea 5 del pulido: el fichero quedaba en 1015 de
1000 y era la entrada completa más antigua. En una línea: auditoría de deriva tras fusionar
`ficha/tanda-2-a-5`, diez frases caducadas en 01, 02, 04, 05 y 09, corregidas con la fecha.

## `origin/main` alcanza a `main` (2026-09-11, noche) — archivada

**Movida entera** a
[`_archivo/historial-2026-09-11-origin-alcanza-main.md`](./_archivo/historial-2026-09-11-origin-alcanza-main.md)
el 2026-09-12, en la ronda de revisión de la Tarea 5 del pulido: el fichero quedaba en 1013 de
1000 y era la entrada completa más antigua. En una línea: `origin/main` alcanzó a `main`,
43 commits, `pnpm verify` en verde, autorizado por el autor (D-CF-28).

## La tanda de Playwright que cierra las migraciones (2026-09-11, noche) — archivada

**Movida entera** a
[`_archivo/historial-2026-09-11-tanda-playwright-migraciones.md`](./_archivo/historial-2026-09-11-tanda-playwright-migraciones.md)
el 2026-09-12, en la ronda de revisión de la Tarea 5 del pulido: el fichero quedaba en 1011 de
1000 y era la entrada completa más antigua. En una línea: 153 recorridos de Playwright en 44
ficheros, 150 verdes tras cerrar los 2 rojos que quedaban.

## La tanda de migraciones de D-CF-14, un commit por migración (2026-09-11) — archivada

**Movida entera** a
[`_archivo/historial-2026-09-11-tanda-migraciones-d-cf-14.md`](./_archivo/historial-2026-09-11-tanda-migraciones-d-cf-14.md)
el 2026-09-12, al escribir la línea de la Tarea 5 del pulido (`Campaign.boardRoomUrl`): el fichero
quedaba en 995 de 1000 y era la entrada completa más antigua. En una línea: ocho migraciones
escritas a mano sobre `main` —un tipo muerto, un índice único parcial, dos columnas borradas, dos
valores de enum nuevos en un commit, la sobrecarga como variante y «lo tengo pero no sé qué hace»—,
cada una con su commit y su reversa en la cabecera del SQL.

## Cerrar fichas, tanda de las decididas — con código (2026-09-11) — archivada

Las tandas 2–6 tarea a tarea (R1, archivar en la mesa, tandas 5c/5b/5a, 4e/4d/4c/4b/4a, 3, 2, E0,
P6, H7, M2B-14, D8), movidas enteras a
[`_archivo/historial-2026-09-11-tanda-de-las-decididas.md`](./_archivo/historial-2026-09-11-tanda-de-las-decididas.md)
el 2026-09-12 por el tope de 1000 líneas. Su hito se queda: **~35 fichas con código, 9 por decisión,
3 falsas, en `main` el 2026-09-11**.

## Las decisiones del autor sobre el cubo D, y nueve fichas que cierran solas (2026-09-10) — archivada

**Movida entera** a
[`_archivo/historial-2026-09-10-decisiones-cubo-d.md`](./_archivo/historial-2026-09-10-decisiones-cubo-d.md)
el 2026-09-12, al escribir la línea de la Tarea 4 del pulido: el fichero quedaba en 1012 de 1000 y
era la entrada completa más antigua. En una línea: al autor se le llevaron ~28 fichas «decide el
autor», las aprobó todas, salieron veinte decisiones (`D-CF-2`–`D-CF-21`) y nueve se archivaron
sin código.

## Cerrar fichas, tanda 1 — las de API puras (2026-09-10) — archivada

**Movida entera** a
[`_archivo/historial-2026-09-10-tanda-1-api-pura.md`](./_archivo/historial-2026-09-10-tanda-1-api-pura.md)
el 2026-09-12, al añadir la línea de la ronda de arreglo de la Tarea 4: el fichero quedaba en
1004 de 1000 y era la entrada completa más antigua. En una línea: once fichas de API pura, una
por commit con su prueba roja antes; nueve cierran, dos vuelven a «decide el autor» (`changeHp ·
rollEventId`, `J7`).

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

## El reconocimiento: dieciocho fichas que el código desmentía (2026-09-08) — archivada

**Movida entera** a
[`_archivo/historial-2026-09-08-el-reconocimiento.md`](./_archivo/historial-2026-09-08-el-reconocimiento.md)
el 2026-09-13, en el mismo corte que sus dos hermanas de encuentros: el fichero seguía por encima
de 1000 y era la entrada completa más antigua. En una línea: una lectura de ~55 fichas con cita o
barrido contra el árbol encontró **dieciocho falsas** (cuatro P1), ocho citas de línea
desplazadas, dos enunciados al revés, y tres documentos de estado (`01-arquitectura.md`,
`05-datos.md`, `como-seguir.md`) que mentían por su cuenta — corregidos todos sin tocar código.

---

## Los dos que quedaban: `advanceTurn()` y `setInitiative()` (2026-09-08) — archivada

**Movida entera** a
[`_archivo/historial-2026-09-08-advanceturn-setinitiative.md`](./_archivo/historial-2026-09-08-advanceturn-setinitiative.md)
el 2026-09-13, en el mismo corte que archivó a su hermana «`start()` devuelve por `get()`»: el
fichero seguía por encima de 1000 y era la entrada completa más antigua. En una línea:
`advanceTurn()` y `setInitiative()` pasan a devolver por `get()` también, cerrando del todo la
deuda que la ficha P3 había dejado a medias; `roundAdvanced` viaja al lado del encuentro porque
nadie en la web lo consume del propio objeto.

---

## `start()` devuelve por `get()`, como sus tres hermanos (2026-09-08, ficha P3) — archivada

**Movida entera** a
[`_archivo/historial-2026-09-08-start-devuelve-por-get.md`](./_archivo/historial-2026-09-08-start-devuelve-por-get.md)
el 2026-09-13, al escribir la línea de la Task 10 del pulido (la bandeja de dados): el fichero
estaba en 999 de 1000 y era la entrada completa más antigua. En una línea: `start()` pasa a
devolver por `get()`, como sus tres hermanos (`current()`, `setSide()`, `forceStart()`); el
defecto de verdad estaba en cuatro pruebas que afirmaban sobre el valor de retorno por comodidad,
no sobre lo que `start()` escribe, y la deuda real —`advanceTurn()` y `setInitiative()` siguen sin
devolver por `get()`— quedó con ficha propia en [06-pendientes.md](./06-pendientes.md).

---

## Lo que la poda desbloqueó: tres fichas que ya se podían cerrar (2026-09-07) — archivada

**Movida entera** a
[`_archivo/historial-2026-09-07-poda-desbloquea-tres-fichas.md`](./_archivo/historial-2026-09-07-poda-desbloquea-tres-fichas.md)
el 2026-09-13, al escribir la línea de la Tarea 9 del pulido (`dice[]` por dado): el fichero
seguía por encima de 1000 tras los dos primeros cortes de la noche y era la entrada completa más
antigua. En una línea: tres fichas con cláusula «Cierra cuando…» que el paso 2 ya había cumplido
sin que nadie lo notara — el modificador temporal pasó a ser del DM, Ayudar cuesta la acción de
quien ayuda, y el combate propone terminarse solo al DM cuando un jugador cae a 0 PG.

---

## La mesa a 390 px: demostrada, no arreglada (2026-09-07, ficha P2 de estrecho) — archivada

**Movida entera** a
[`_archivo/historial-2026-09-07-mesa-390px.md`](./_archivo/historial-2026-09-07-mesa-390px.md)
el 2026-09-13, al escribir la línea de la Tarea 9 del pulido (`dice[]` por dado): el fichero
volvía a pasarse tras el primer corte de la noche y era la entrada completa más antigua. En una
línea: el borde de «Herramientas del DM» se salía 160 px de una ventana de 390 sin que la página
lo delatara, y queda **demostrado, no arreglado** — falta una decisión del autor entre tres
salidas.

---

## `[[bahia]]` encuentra «Bahía» (2026-09-07, ficha P4) — archivada

**Movida entera** a
[`_archivo/historial-2026-09-07-bahia-normaliza-diacriticos.md`](./_archivo/historial-2026-09-07-bahia-normaliza-diacriticos.md)
el 2026-09-13, al escribir la línea de la Tarea 9 del pulido (`dice[]` por dado): el fichero
quedaba en 1007 de 1000 y era la entrada completa más antigua. En una línea: `normalizar` de
`wikilinks.ts` pliega los diacríticos antes de comparar, así que `[[bahia]]` ya encuentra
«Bahía» sin tilde.

---

## El DM escribe el botín, y de paso deja de borrarlo (2026-09-07, ficha P2-2) — archivada

**Movida entera** a
[`_archivo/historial-2026-09-07-dm-escribe-el-botin.md`](./_archivo/historial-2026-09-07-dm-escribe-el-botin.md)
el 2026-09-12, al corregir el arreglo 2 de la Tarea 8: el fichero estaba en 1000 de 1000 y era la
entrada completa más antigua. En una línea: la tabla de la casa gana un panel para redactar la
entrega (objetos + monedas) y, en el mismo plan, se descubrió y arregló un borrado silencioso —
editar la tabla reemplazaba sus filas y se llevaba el botín que la web no sabía declarar.

---

## Tanda B — tres arreglos de API, y una ficha que se equivocaba de tamaño (2026-09-07) — archivada

**Movida entera** a [`_archivo/historial-2026-09-07-tanda-b.md`](./_archivo/historial-2026-09-07-tanda-b.md)
el 2026-09-12, al escribir la línea de la Tarea 3 del pulido: el fichero quedaba en 1009 de 1000 y
esta era la entrada completa más antigua. En una línea: tres commits de API —`changeHp` acepta
`tx?` y lo reenvía a sus cuatro llamadores en transacción, la red de claves reservadas cazada por
sus tres formas, y P2-10 medida en 23 suites y 204 pruebas antes de arreglarla, no en las «dos»
que decía la ficha—.

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
