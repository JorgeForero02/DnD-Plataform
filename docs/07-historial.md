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
> | [`_archivo/historial-2026-09-11-origin-alcanza-main.md`](./_archivo/historial-2026-09-11-origin-alcanza-main.md) | **`origin/main` alcanza a `main`**, movida entera el 2026-09-12 en la ronda de revisión de la Tarea 5 del pulido: el fichero quedaba en 1013 de 1000 y era la entrada completa más antigua. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-11-relectura-diez-frases-falsas.md`](./_archivo/historial-2026-09-11-relectura-diez-frases-falsas.md) | **Relectura de 01–05 y 09 al cerrar la rama: diez frases falsas**, movida entera el 2026-09-12 en la ronda de revisión de la Tarea 5 del pulido: el fichero quedaba en 1015 de 1000 y era la entrada completa más antigua. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-11-y-12-hoja-a-pagina-completa.md`](./_archivo/historial-2026-09-11-y-12-hoja-a-pagina-completa.md) | **La hoja a página completa** —fusión, despliegue y las once tareas del plan, HP-1 a HP-10—, movida entera el 2026-09-12 en la ronda de revisión de la Tarea 5 del pulido: el fichero quedaba en 1013 de 1000 y era la entrada completa más antigua. Su hito se queda arriba |
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
