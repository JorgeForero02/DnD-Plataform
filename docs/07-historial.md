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
> | [`_archivo/historial-2026-09-12-tarea-5-boardroomurl.md`](./_archivo/historial-2026-09-12-tarea-5-boardroomurl.md) | **La tarea 5 del pulido, `Campaign.boardRoomUrl`**, movida entera el 2026-09-13 al escribir la entrada de la tarea 11 (el fichero estaba en 979 de 1000). Su hito se queda arriba |
> | [`_archivo/historial-2026-09-12-tarea-6-tablero-enmarcado.md`](./_archivo/historial-2026-09-12-tarea-6-tablero-enmarcado.md) | **La tarea 6 del pulido, el tablero enmarcado y el registro como cajón**, movida entera el 2026-09-13, mismo corte que la tarea 5. Su hito se queda arriba |
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
> | [`_archivo/historial-2026-09-12-ronda-arreglo-tarea-7.md`](./_archivo/historial-2026-09-12-ronda-arreglo-tarea-7.md) | **La ronda de arreglo de la tarea 7 del pulido** —un solo d20, la navegación entra en el barrido—, movida entera el 2026-09-13 al insertar las tareas 12–14 del pulido: el fichero quedaba en 1074 de 1000 y era la entrada completa más antigua. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-12-tarea-7-seis-dados.md`](./_archivo/historial-2026-09-12-tarea-7-seis-dados.md) | **La tarea 7 del pulido, seis dados dibujados y el barrido de iconos**, movida entera el 2026-09-13 en el mismo corte: el fichero seguía en 1038 de 1000 tras el primer archivado. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-12-tarea-8-menu-de-acciones.md`](./_archivo/historial-2026-09-12-tarea-8-menu-de-acciones.md) | **La tarea 8 del pulido, `MenuDeAcciones` y la fila del elenco**, movida entera el 2026-09-13 en el mismo corte: el fichero seguía en 1002 de 1000 tras los dos primeros archivados. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-10-la-poda-treinta-y-nueve-bloques.md`](./_archivo/historial-2026-09-10-la-poda-treinta-y-nueve-bloques.md) | **La poda: treinta y nueve bloques fuera del tablero**, movida entera el 2026-09-13 al escribir la ronda de arreglo de la Task 10 del pulido (round 1): el fichero volvía a pasarse de 1000. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-11-hoja-a-pagina-spec-y-plan.md`](./_archivo/historial-2026-09-11-hoja-a-pagina-spec-y-plan.md) | **La hoja a página completa: spec aprobada y plan escrito, sin código**, movida entera el 2026-09-13 en el mismo corte: el fichero seguía por encima de 1000 tras el archivado anterior. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-12-paso-3-cierre-primera-parte.md`](./_archivo/historial-2026-09-12-paso-3-cierre-primera-parte.md) | **El paso 3 se convierte en el cierre de la primera parte**, movida entera el 2026-09-13 en el mismo corte: el fichero seguía por encima de 1000 tras los archivados anteriores. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-12-revision-de-produccion-24-puntos.md`](./_archivo/historial-2026-09-12-revision-de-produccion-24-puntos.md) | **La revisión de producción del autor: 24 puntos y tres specs**, movida entera el 2026-09-13 en el mismo corte: el fichero seguía por encima de 1000 tras los archivados anteriores. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-12-tarea-0-nota-de-diseno.md`](./_archivo/historial-2026-09-12-tarea-0-nota-de-diseno.md) | **Tarea 0 del pulido: nota de diseño y cinco reglas**, movida entera el 2026-09-13 en el mismo corte: el fichero seguía por encima de 1000 tras los archivados anteriores. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-12-tarea-1-casilla-banda-anclada.md`](./_archivo/historial-2026-09-12-tarea-1-casilla-banda-anclada.md) | **Tarea 1 del pulido: `Casilla` y la banda anclada**, movida entera el 2026-09-13 en el mismo corte: el fichero seguía por encima de 1000 tras los archivados anteriores. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-12-ronda-arreglo-tarea-1-casilla-6rem.md`](./_archivo/historial-2026-09-12-ronda-arreglo-tarea-1-casilla-6rem.md) | **Ronda de arreglo de la tarea 1: `Casilla` a 6rem**, movida entera el 2026-09-13 en el mismo corte: el fichero seguía por encima de 1000 tras los archivados anteriores. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-12-tarea-2-field-reserva-espacio.md`](./_archivo/historial-2026-09-12-tarea-2-field-reserva-espacio.md) | **Tarea 2 del pulido: espacio reservado en `Field`, sticky con escalón y rejilla de Rasgos**, movida entera el 2026-09-13 en el mismo corte: el fichero seguía por encima de 1000 tras los archivados anteriores. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-12-tarea-3-ajustes-y-dados-en-rejilla.md`](./_archivo/historial-2026-09-12-tarea-3-ajustes-y-dados-en-rejilla.md) | **Tarea 3 del pulido: Ajustes del personaje en una tarjeta con pie, y Dados en rejilla**, movida entera el 2026-09-13 al escribir la ronda de arreglo 2 de la Task 10: el fichero volvía a pasarse de 1000. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-12-tarea-4-espacios-medicion.md`](./_archivo/historial-2026-09-12-tarea-4-espacios-medicion.md) | **Tarea 4 del pulido: `e2e/espacios.spec.ts`, la pasada de medición**, movida entera el 2026-09-13 en el mismo corte: el fichero seguía por encima de 1000 tras el archivado anterior. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-13-tarea-9-dice-por-dado.md`](./_archivo/historial-2026-09-13-tarea-9-dice-por-dado.md) | **Tarea 9 del pulido: el servidor dice qué dado cayó, `dice[]` por dado**, movida entera el 2026-09-13 al escribir la entrada de la Task 14 bis (el mundo como árbol con detalle): el fichero estaba en 977 de 1000 y era la entrada completa más antigua. Su hito se queda arriba |
> | [`_archivo/historial-2026-09-13-tarea-10-bandeja-de-dados.md`](./_archivo/historial-2026-09-13-tarea-10-bandeja-de-dados.md) | **Tarea 10 del pulido: la bandeja de dados, pulsar y no escribir**, movida entera el 2026-09-13 al escribir la ronda 1 de la Task 14 bis: el fichero quedaba en 1002 de 1000 y era la entrada completa más antigua. Sus rondas de arreglo y su hito se quedan arriba |
> | [`_archivo/historial-2026-09-13-ronda-arreglo-tarea-10.md`](./_archivo/historial-2026-09-13-ronda-arreglo-tarea-10.md) | **La ronda de arreglo 1 de la tarea 10 del pulido** —el d20 al principio, plegar devuelve el control, la pila se distingue—, movida entera el 2026-09-13 al escribir la entrada de la revisión final de la rama: el fichero estaba en 983 de 1000 y era la entrada completa más antigua. Su hito se queda arriba |
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

## Revisión final de la rama: ningún atacante inventado, caras desconocidas en texto, iconos dibujados en el modificador, «Tirar» nunca se apaga (2026-09-13)

Qué — cuatro hallazgos de la revisión de toda la rama `pulido/antes-del-paso-3`, en un commit.
**(1)** `origenDeGolpe` (`linea-de-log.ts`) trataba «hay `rollEventId`» como «se citó un origen» y
ponía «← Alguien» a un daño cuya tirada no tenía ningún `ATTACK_RESOLVED` detrás —la hoja cita
«2d6 de caída» desde `PuntosDeGolpe`—: un atacante inventado para una caída. Ahora «Alguien» sale
**solo** cuando el DM citó un `sourceCharacterId` que este espectador no ve; con `rollEventId`
solo, se nombra al atacante deducido o no se dice nada. **(2)** `ResultadoDeTirada` colaba con un
`as Caras` cualquier número de caras a `IconoDado`, que solo dibuja siete, y `2d7` o `1d1000`
(escritos en «Modo avanzado»; el servidor admite hasta 1000) pintaban un `<svg data-icono="d7">`
vacío. `esCaraConocida(n): n is Caras` vive en `bandeja.ts` junto al tipo; conocida → icono,
desconocida → la etiqueta `d7` en `font-data` —nunca un d20 disfrazado, «un dado, una forma»
(D-CF-62)—. Se van los casts: `DADOS_DE_ATAJO` es `readonly Caras[]` e `IconoDado` recibe `Caras`.
**(3)** Los botones del modificador de `BandejaDeDados` eran un «−» y un «+» de fuente —lo que el
barrido de la Tarea 7 prohíbe— y el barrido no los vio porque su regex `<Button[^>]*>` se paraba
en el `>` del `=>` del `onClick`. `IconoMenos` nuevo (trazo 1.6, `data-icono="menos"`), `IconoMas`
en el otro, `aria-label` intactos; y el regex del barrido tolera `=>` en los atributos
(`(?:[^>]|=>)*`) y el glifo seguido de `<`, con una prueba que lo demuestra contra el fixture
`<Button onClick={() => x()}>+</Button>`. **(4)** «Tirar» se deshabilitaba con la bandeja vacía
(`PanelDeDados`, `PanelDeDadosDeLaMesa`), y «Dárselos»/«Quedarse con los N nuevos»
(`DarTemporales`) con un 0 o un campo vacío — contra `04-convenciones.md` («el botón de guardar
nunca se deshabilita: no recibe foco de teclado») y contra cómo T5 resolvió «Guardar la sala».
Ahora siguen habilitados; pulsar con nada que tirar escribe en línea, junto a «Qué se tira»,
«Añade un dado a la bandeja, o escribe una expresión en Modo avanzado.» y no manda nada; los del
bestiario escriben «Escribe cuántos PG temporales nuevos son.» con `aria-invalid` en el campo. Se
retira el `sr-only` con `aria-describedby` que solo existía para el estado apagado. La única
razón de apagar que queda es la petición en curso (y, en el bestiario, la hoja sin `version`).

Por qué — (1) y (2) son mentiras en pantalla: un origen que no hubo y un dado sin forma ni nombre.
(3) es la regla de iconos con un agujero en su propio control. (4) es una convención vinculante
que tres pantallas nuevas contradecían mientras una cuarta, de la misma rama, la cumplía.

Pruebas — TDD, rojo primero en las cuatro: `linea-de-log-con-nombres.test.ts` +1 («tirada citada
sin ataque → sin origen»); `ResultadoDeTirada.test.tsx` +1 (caras 7: texto `d7`, ningún
`data-icono="d7"` ni `d20`); `bandeja.test.ts` +2 (`esCaraConocida`); `botones-con-icono.test.tsx`
+1 (el fixture con `=>`) y el barrido amplía a «−»; `Iconos.test.tsx` cuenta 31; `PanelDeDados.test.tsx`
+1, `PanelDeDadosDeLaMesa.test.tsx` +1 y `DarTemporales.test.tsx` +2 −1 (la del candado pasa a
«habilitado + error + sin petición»). Mutación con `cp`: devolver el guard viejo a `origenDeGolpe`
enrojece la nueva de (1); hacer que `esCaraConocida` devuelva siempre `true` enrojece dos de (2).
`pnpm --filter @dnd/web test -- src/features/rolls src/features/sessions src/features/bestiario
src/ui`: 56 ficheros, 532/532. Playwright (dados, tirada, espacios, bestiario, sesion, combate,
tokens-contrast) a cargo del orquestador.

Revertir — `git revert` del commit; ningún dato ni migración de por medio.

---

## Task 14 bis del pulido: el mundo como árbol con detalle — sustituye al tablero telaraña (2026-09-13, #23, D-CF-64)

Qué — `features/sessions/taller/mundo/`: `arbolDelMundo.ts` (puro: cuelga cada ficha de su padre
por un rótulo de `ROTULOS_DE_JERARQUIA`, dos padres → «también en …», ciclos cortados y marcados,
`sinHilos`, y `vecinosDe` leído desde la ficha abierta), `DesgloseDelMundo.tsx` (`tree` WAI-ARIA
con tabindex rotatorio: flechas, → despliega, ← pliega, Enter elige; buscador sin tildes; chip
«Sin hilos»), `DetalleDeFicha.tsx` (cabecera · vitela recortada con «Leer más» · anillo · hilos),
`AnilloDeVecinos.tsx` (SVG propio, posiciones fijas `2π·i/n`, cada vecino un `<button>`),
`EditorDeHilos.tsx` (fila ficha · rótulo · cambiar · quitar; dos desplegables con buscador,
rótulo sugerido por `relacionesSugeridas` o libre; **cambiar = crear y luego quitar**, porque no
hay `PATCH` de enlaces) y `ElMundo.tsx` (las dos mitades, `lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]`).
`ROTULOS_DE_JERARQUIA` y `esRotuloDeJerarquia` en `apps/web/src/features/links/relaciones.ts`: los seis son `desde` de
`RELACIONES`, ninguno se descartó. `TallerDelDM.tsx` monta `ElMundo` donde iba el tablero, con la
cabecera «El mundo»; la selección sigue alimentando «Escribir ficha». **Se borran** `TableroTelarana.tsx`,
`posiciones.ts` y sus dos pruebas (**D4**, 2026-09-02: «el tablero telaraña se retira»); es la única
baja de pruebas de la tanda y va en el mismo commit. Desviación del brief: el componente del árbol
se llama `DesgloseDelMundo.tsx` y no `ArbolDelMundo.tsx` porque en Windows `./ArbolDelMundo` resolvía
al módulo puro `arbolDelMundo.ts` (`.ts` antes que `.tsx`, sin distinguir mayúsculas).

Por qué — el autor, tras cuatro maquetas (2026-09-12), aplazó el mapa de historia y cerró el #23
con desglose + detalle. La regla nueva de `04-convenciones.md`: *un árbol enseña un padre; los
demás hilos van en la ficha*.

Evidencia — unitarias nuevas: `arbolDelMundo.test.ts` (11), `DetalleDeFicha.test.tsx` (11),
`ElMundo.test.tsx` (7), y dos en `relaciones.test.ts`; `pnpm --filter @dnd/web test -- taller links`
en verde. Mutación: quitar la comprobación de `ROTULOS_DE_JERARQUIA` (todo rótulo cuelga) hace
fallar exactamente «un hilo lateral no mueve nada»; restaurado con `cp`. e2e nuevo
`mundo-arbol.spec.ts` (tender «vive en» desde los desplegables cuelga a Corvin de la Torre Gris,
persiste tras recargar; a 390 px el detalle va debajo y `scrollWidth <= 390`) y el mundo en
`tokens-contrast.spec.ts` en los tres temas — **no corridos en esta sesión, a cargo del orquestador**
junto a `mesa-mide.spec.ts`.

**Revertir:** `git revert` del commit devuelve el tablero, `posiciones.ts` y sus dos pruebas; no
hay migración ni dato que limpiar (los hilos ya existían tal cual).

**Ronda 1 (2026-09-13).** El orquestador corrió `mesa-mide` 3/3, `tokens-contrast` 37/37 y
`mundo-arbol` 1/2: a 390 px el detalle empezaba 64 px antes del final del árbol. Causa: la
rejilla de `ElMundo` llevaba `min-h-0` dentro de la columna de scroll del taller y el árbol tenía
scroll propio siempre, así que por debajo de `lg` las mitades no se apilaban como bloques. Ahora
`min-h-0` y `overflow-y-auto` solo en `lg:`; la aserción `detalle.y >= árbol.y + árbol.height - 1`
se queda tal cual y su comentario dice qué prueba y qué no (la rejilla exterior del taller a 390
sigue en D-CF-26). Revertir: quitar el prefijo `lg:` de esas clases.

**Ronda 1 de revisión (2026-09-13).** Cinco importantes: (1) un par con dos rótulos de jerarquía
daba dos nodos con el mismo id bajo el mismo padre —ahora cuelga una vez, por el primero de
`ROTULOS_DE_JERARQUIA`—; (2) una raíz cuyas fichas cuelgan todas de otra decía «Ninguna todavía»:
ahora «Todas cuelgan de otra ficha.», y la nota es `role="none"`; (3) de Aldea → Bosque ↔ Ciudad se
levantaba Aldea como raíz fantasma —se levanta una ficha DEL ciclo (la primera por nombre de las
que están en él), nunca una que cuelgue de él—; (4) **«custodia» sale de la jerarquía** (decisión
del orquestador: el árbol enseña contención; custodiar es lateral) — la frase «los seis, ninguno
se descartó» de arriba fue cierta hasta esta ronda; (5) `como-seguir.md` seguía poniendo el mapa
de historia como sustituto del tablero. Menores: `aria-selected` en las raíces, «Guardar el rótulo»
sin cambio no manda nada, una línea gris explica por qué los hilos que entran no tienen lápiz, el
comentario de `wikilinks.test.ts` ya no cita `posiciones.ts`, y si el `DELETE` falla tras el
`POST` el aviso dice que el nuevo existe y el viejo se quita a mano. Aplazado al ledger: solape
del anillo con 9+ vecinos, «Leer más» cuando el cuerpo cabe, el chip por encima del buscador,
rótulo libre >80 en cliente, invalidación de la otra ficha al quitar, raíces vacías plegadas, el
editor bajo el pliegue a 1280×800.

---

## Tarea 12 del pulido: salir de la mesa vuelve a la campaña (2026-09-13, anexo #18)

Qué — la primera miga de `BandaDeMesa.tsx` era «Tus crónicas» y llevaba a `/`, la lista entera de
campañas: salir de una mesa en juego mandaba a cero en vez de a la campaña que se estaba jugando.
Ahora la flecha va con el nombre de la campaña a `/campaigns/:id?seccion=sessions` —el mismo
enlace que `MesaDeSesion.tsx` ya usaba para «Entrar a la mesa», que `CampaignDetailPage.tsx`
resuelve a la pestaña Sesiones— y «Tus crónicas» pasa a miga secundaria, detrás de un filete, sin
perder su enlace a `/`.

Por qué — el anexo #18 lo pedía tal cual: el gesto de «salir» de una pantalla anidada debe volver
al contenedor inmediato, no saltar todos los niveles.

Evidencia — unitaria nueva en `sesion-en-juego.test.tsx` (describe «la banda de la mesa (anexo
#18)»): la primera miga tiene `href="/campaigns/c1?seccion=sessions"` y texto «La mesa», y «Tus
crónicas» sigue apuntando a `/` (15/15 del fichero). e2e nuevo en `sesion.spec.ts`: desde una mesa
en reposo, pulsar el primer enlace de la banda deja la pestaña Sesiones seleccionada (no corrido
en esta sesión, a cargo del orquestador junto a `mesa-mide.spec.ts`). Mutación: devolver `to="/"`
al primer enlace hace fallar la unitaria nueva (restaurado con `cp`). Los recorridos que ya
pulsaban «Tus crónicas» desde la mesa (`campana.spec.ts:590`) siguen valiendo: el enlace existe,
solo cambió su orden.

**Revertir:** en `BandaDeMesa.tsx`, devolver el primer `Link` a `to="/"` con el texto «Tus
crónicas» y el segundo a `to={`/campaigns/${campaignId}`}` con el nombre de la campaña; quitar la
unitaria y el e2e nuevos.

---

## Tarea 13 del pulido: PG temporales del bestiario — la pregunta solo tras pulsar (2026-09-13, anexo #20)

Qué — en `DarTemporales.tsx`, `hayConflicto = actuales > 0 && nuevos > 0` se evaluaba con
`cuantos` ya en su valor por defecto ("5"), así que en cuanto un PNJ tenía algún PG temporal el
`alertdialog` estaba **siempre** puesto y el botón «Dárselos» desaparecía — parecía que la
pantalla no hacía nada. Y «Dejar los N que tenía» mandaba `tempHpEleccion: "mayor"`, que el
servidor resuelve con `Math.max`: si los nuevos eran más que los que tenía, «dejar los que tenía»
cambiaba igualmente el PG temporal. Ahora `preguntando` es estado explícito que solo se pone a
`true` al pulsar «Dárselos» con temporales previos; «Quedarse con los N nuevos» manda
`tempHpEleccion: "los-nuevos"`; y «Dejar los N que tenía» **no manda ninguna petición** — solo
cierra la pregunta. `hayConflicto` se quita.

Por qué — SRD 5.1, *Temporary Hit Points*: *"you decide whether to keep the ones you have or to
gain the new ones"*. Conservar es no cambiar nada; mandar `"mayor"` (que el servidor traduce a
`Math.max`) era la elección equivocada cuando los nuevos eran mayores que los que ya tenía el PNJ.

Evidencia — unitarias nuevas en `DarTemporales.test.tsx`: con temporales previos el `alertdialog`
no está hasta pulsar «Dárselos»; «Dejar los que tenía» no llama a `fijar.mutate` y cierra la
pregunta; «Quedarse con los nuevos» manda `tempHpEleccion: "los-nuevos"` y cierra al resolver.
e2e nuevo en `bestiario.spec.ts` (no corrido en esta sesión, a cargo del orquestador). Mutación:
hacer que «Dejar los que tenía» llame a `mandar("mayor")` hace fallar la unitaria «no manda nada»
(restaurado con `cp`).

**Revertir:** en `DarTemporales.tsx`, devolver `hayConflicto` y pintar el `alertdialog` con esa
condición en vez de `preguntando`; hacer que «Dejar los que tenía» llame a `mandar("mayor")`;
quitar las unitarias y el e2e nuevos.

---

## Ronda de arreglo de la tarea 13: la aserción de «no manda nada» esperaba en el momento equivocado, y «Quedarse con los nuevos» gana el candado de «Dárselos» (2026-09-13)

Qué — revisión de ronda 1 (`cdf8d00..df15c30`) encontró que `expect(fijar).not.toHaveBeenCalled()`
en «Dejar los que tenía no manda nada» corría **justo tras el `fireEvent.click`**, de forma
síncrona: TanStack Query espera a que `onMutate` resuelva antes de invocar `mutationFn`, así que
la aserción pasaba **aunque `mandar()` estuviera siendo llamada** — un mutante que hace
`mandar("mayor")` y luego `setPreguntando(false)` sobrevivía sin que ninguna prueba lo notara. El
espía de `setHp` tampoco tenía `mockResolvedValue`, lo que agravaba la carrera. Arreglo: el espía
gana `mockResolvedValue(hoja(8))`, y la aserción se mueve DESPUÉS de un `waitFor` que observa el
`alertdialog` cerrado, más un `await new Promise(r => setTimeout(r, 0))` de margen para cualquier
microtask de React Query pendiente. Repetida la mutación del `cp` (`mandar("mayor")` +
`setPreguntando(false)`) contra el arreglo: **esta vez la aserción cae** (`setHp` llamada 1 vez,
con `tempHpEleccion: "mayor"`), confirmando que ahora sí la cazaba.

Hallazgo menor de la misma revisión: «Quedarse con los N nuevos» no llevaba el candado numérico
que sí tiene «Dárselos» (`!Number.isFinite(nuevos) || nuevos <= 0`), así que vaciar el campo o
ponerlo en 0 mientras la pregunta estaba abierta permitía mandar `tempHp: 0` o `NaN` — ninguno de
los dos montones que el SRD pide elegir. Mismo candado añadido a ese botón, con su `title`;
unitaria nueva: con el campo en «0», el botón queda `aria-disabled` y el clic no llama a `setHp`.

Por qué — revisión de ronda 1 sobre las tareas 12–14 del pulido; hallazgo «Important» (aserción
que no prueba lo que dice) y un menor barato de corregir en el mismo fichero.

Evidencia — `DarTemporales.test.tsx`: 5/5 en verde (era 4/4; +1 del candado nuevo). Mutación
repetida con el `cp` de la tarea 13 (`mandar("mayor")` en «Dejar los que tenía»): la unitaria
arreglada cae, confirmando que la aserción ahora sí depende de la llamada real. `pnpm verify` en
verde (168 ficheros, 1558 pruebas). Sin Playwright — el orquestador vuelve a correr
`bestiario.spec.ts`.

**Revertir:** en `DarTemporales.test.tsx`, quitar el `mockResolvedValue` del espía de `setHp` en
esa prueba y devolver la aserción a justo después del `fireEvent.click`; quitar la unitaria del
candado nuevo. En `DarTemporales.tsx`, quitar `disabled`/`title` del botón «Quedarse con los N
nuevos».

---

## Tarea 14 del pulido: filtros del catálogo de objetos (2026-09-13, anexo #21)

Qué — `CampaignItemsCatalogPage.tsx` solo filtraba por el texto del buscador; con un catálogo
mixto (objetos propios de la campaña + SRD) no había forma de acotar por tipo de objeto ni por
origen, a diferencia del bestiario, que ya tiene sus chips. Dos filas nuevas de `FilterChip`
dentro de `Toolbar` (`ui/Collection.tsx`, igual que `PanelDeBestiario.tsx`): una por `ItemKind`
—«Todos» + `TIPOS_DE_OBJETO.map(...)` con `NOMBRE_TIPO`— y otra por origen —«De todas partes» /
«Del catálogo» / «De la campaña», con `esDelSrd(id)` decidiendo el segundo grupo. El filtrado es
de cliente, nunca control de acceso: la lista que llega ya viene filtrada por `canView` en el
servidor. El `EmptyState` de «ningún objeto se llama así» pasa a nombrar también los filtros
cuando hay alguno activo.

Por qué — el anexo #21 lo pedía por paridad con el bestiario, que ya resolvió el mismo problema
con el mismo patrón de chips.

Evidencia — unitarias nuevas (anexo #21): con 1 objeto propio + 2 del SRD, pulsar «Arma» deja 2
filas y pulsar además «De la campaña» deja 1 («Daga de la casa»); y el `EmptyState` nombra los
filtros cuando no hay coincidencia. e2e (`inventario.spec.ts`, el recorrido que ya crea un objeto
propio y lo distingue del SRD — no hay fichero dedicado al catálogo): tras crear «Farol de
marea», pulsar «Armadura» deja «Cota de malla» (SRD) y quita «Daga» (SRD, arma) — no corrido en
esta sesión, a cargo del orquestador. Mutación: quitar la condición de `tipo` del filtro hace
fallar las dos unitarias nuevas (restaurado con `cp`).

**Revertir:** en `CampaignItemsCatalogPage.tsx`, quitar los dos `useState` de `tipo`/`origen`, sus
condiciones en el filtro y los dos `<Toolbar>` de `FilterChip`; devolver el `EmptyState` a su
texto sin mencionar filtros; quitar la unitaria y el e2e nuevos.

---

## Tarea 11 del pulido: el hilo habla de personajes (2026-09-13, C4: #15)

Qué — hasta esta tarea el hilo de sesión decía QUÉ pasó y nunca A QUIÉN ni DE QUIÉN: «Pierde 7 PG
(24 → 17)» y «Espadazo: impacta» no nombran a nadie, y el hueco #15 pedía justo esa mitad.
`changeHpSchema.sourceCharacterId` (`packages/shared/src/character-sheet.schema.ts`) y
`HP_CHANGED.sourceCharacterId` (`game-event.schema.ts`) son el nuevo campo opcional —«de quién
viene», cuando el DM pone daño a mano sin que cuelgue de ninguna tirada—; `changeHp`
(`character-sheet.service.ts`) lo valida con `requireVisibleCharacter`
(`apps/api/src/common/character-viewer.ts`, el mismo helper que ya usan `activities`,
`conditions`, `resources`, `rest`, `temporary-modifiers` e `inventory`) antes de escribirlo en el
suceso — 404 uniforme si el id no existe o no se ve, nunca una causa inventada.

En la web, `nombres-del-hilo.ts` (nuevo) resuelve un id a nombre contra `useCharacters` +
`useNpcs` —las mismas listas ya filtradas por `canView`—, con `null` como «este espectador no lo
ve»; `atacanteDeLaTirada` recorre la ventana de sucesos buscando el `ATTACK_RESOLVED` que citó esa
tirada. `lineaDeLog(p, ctx?)` (`linea-de-log.ts`) sigue con un solo argumento para las 33 frases
de siempre —`linea-de-log-sin-claves.test.ts` no se ha tocado—; con `ctx: { sujeto, nombres }`,
`HP_CHANGED` dice «Sylas pierde 7 PG (cortante) ← Klarg» (o «← ataque de Klarg» si el origen sale
de `rollEventId`) y `ATTACK_RESOLVED` dice «Klarg ataca a Sylas con Cimitarra: impacta» — **el
objetivo se nombra a propósito**: el suceso se escribe a la visibilidad del objetivo, así que
quien lo lee ya lo ve por definición, y el comentario que decía lo contrario en `linea-de-log.ts`
estaba caducado desde 2.5.3. `ACTIVITY_USED` no existe en el esquema — se buscó y se anotó, no se
inventó.

`HiloDeSesion.tsx` construye `nombres` con `personajes` + la nueva prop `pnjs` (que `MesaDeSesion`
ya tenía de `useNpcs`, pasada en vez de pedida dos veces) y compone `linea` para cada mensaje, que
`MensajeDelHilo.tsx` recibe ya hecha en vez de llamar a `lineaDeLog` por su cuenta. Su cabecera de
tipo «personaje» pinta el NOMBRE DEL PERSONAJE cuando `vozDe` resolvió uno real, y la persona baja
a una firma con su hora — sin personaje, la persona sigue en la cabecera, como siempre.
`PonerDano.tsx` gana un `<select>` «¿De quién viene?» con `<option value="">Sin decir</option>`:
es una lista de personajes y PNJ —datos, no una opción con significado—, así que un `<select>`
nativo es correcto y no una desviación de la regla de los radios con explicación; manda
`sourceCharacterId` solo si se elige.

Por qué — «¿de qué murió Elara?» (hueco M15, cerrado en 2.5.4) respondía el tipo de daño y la
tirada, pero el registro seguía sin decir QUIÉN. Con el objetivo ya protegido por `canView` desde
que el suceso nace, ocultar su nombre en la frase no protegía nada — protegía menos que decir
«Alguien pierde 7 PG» delante de quien ya lo está viendo.

Evidencia — e2e de API (`dano-con-su-traza.e2e-spec.ts`, 9/9): el DM cita el origen y
`HP_CHANGED.sourceCharacterId` lo lleva; un origen que no existe en la campaña es 404 y no escribe
nada (comprobado con el PG sin cambiar). Unitarias de servicio (`character-sheet.service.spec.ts`,
157/157) sin tocar. Unitarias web: `linea-de-log-con-nombres.test.ts` (nuevo, 6/6) —el daño con
origen directo, con origen de tirada, el ataque con y sin atacante visible, y que sin `ctx` las
frases de siempre no cambian—; el resto de `sessions` en verde (1542/1542 de la suite completa).
Mutación: quitar el `← ${origen}` de `HP_CHANGED` y el `${atacante} ataca a...` de `ATTACK_RESOLVED`
hace fallar las pruebas nuevas correspondientes (restaurado con `cp`); comentar la llamada a
`requireVisibleCharacter` en `changeHp` hace fallar el 404 del origen inexistente (restaurado con
`cp`). `combate.spec.ts` gana una comprobación de extremo a extremo: Thora ataca a Brann por API
(equipar, resolver el ataque, aplicar daño citando la tirada) y el hilo real muestra «Thora ataca
a Brann con … : impacta/falla» y «Brann pierde 3 PG ← ataque de Thora» — no ejecutado en esta
sesión (frontera: solo se corrió el e2e de API una vez), a correr por el orquestador.
`sesion.spec.ts` actualizado: el golpe real a Borin ahora se lee «Borin Barbaférrea pierde 5 PG»
en vez de «Pierde 5 PG (13 → 8)», porque su sujeto SÍ se resuelve en ese recorrido.

**Revertir:** quitar `sourceCharacterId` de los dos esquemas y de `changeHp`; borrar
`nombres-del-hilo.ts` y su prueba; devolver `lineaDeLog`, `HiloDeSesion.tsx` y `MensajeDelHilo.tsx`
a su forma de un argumento; quitar el `<select>` de `PonerDano.tsx`; deshacer las aserciones nuevas
de `combate.spec.ts` y la frase cambiada de `sesion.spec.ts`.

---

## Tarea 10 del pulido: la bandeja de dados — pulsar, no escribir (2026-09-13, C5 web: #10, #11, #14, anexo #16) — archivada

**Movida entera** a [`_archivo/historial-2026-09-13-tarea-10-bandeja-de-dados.md`](./_archivo/historial-2026-09-13-tarea-10-bandeja-de-dados.md)
el 2026-09-13, al escribir la ronda 1 de la Task 14 bis: el fichero quedaba en 1002 de 1000 y era
la entrada completa más antigua. En una línea: `BandejaDeDados` compone la tirada pulsando dados
dibujados en vez de escribiendo notación, con la pila a la vista y el modo avanzado plegado.

---

## Ronda de arreglo de la tarea 10: el d20 al principio, plegar devuelve el control, la pila se distingue (2026-09-13) — archivada

**Movida entera** a [`_archivo/historial-2026-09-13-ronda-arreglo-tarea-10.md`](./_archivo/historial-2026-09-13-ronda-arreglo-tarea-10.md)
el 2026-09-13, al escribir la entrada de la revisión final de la rama: el fichero estaba en 983 de
1000 y era la entrada completa más antigua. En una línea: el d20 va al principio de la expresión
compuesta (el servidor solo da ventaja ahí), plegar «Modo avanzado» devuelve el control a la
bandeja, y la pila se distingue de los atajos.

---

## Ronda de arreglo 2 de la tarea 10: el radio de ventaja se queda montado, apagado con su motivo (2026-09-13)

Qué — round 1 arregló que la ventaja mintiera, pero **la escondió**: `ofreceVentaja &&` montaba
y desmontaba el `radiogroup` letra a letra al escribir en el modo avanzado, y el controlador lo
cazó con `espacios.spec.ts` (los dos tearing de anexo #8, rojos: 840→812, −28px) — exactamente
el defecto que esa suite existe para cazar y que `jsdom` no puede ver. Arreglo por la regla del
proyecto («se deshabilita, nunca se esconde, con su motivo», `04-convenciones.md`): el
`radiogroup` de `BandejaDeDados.tsx` se queda **siempre montado**; cuando no admite ventaja se
apaga (`disabled`) y una línea con `min-h-[1.125rem]` —reservada también cuando está vacía— dice
«Solo con un d20 al principio de la tirada.». El botón «Tirar» de los dos paneles cambia su
motivo de `title` (invisible para lectores de pantalla) a un `span` `sr-only` siempre montado con
`aria-describedby`, mismo patrón que ya usa `TirarAtaqueBoton.tsx`.

Por qué — el elemento que se movía era el `radiogroup` «Ventaja»: al escribir una expresión que
no empieza por `d20` (`admiteVentajaEnTexto` en falso), `ofreceVentaja` pasaba a `false` y el
`{ofreceVentaja && (...)}` de round 1 desmontaba el bloque entero, encogiendo la tarjeta lo que
medía ese bloque. El botón «Tirar» no cambiaba de alto —su motivo ya vivía en un `title`, que no
ocupa espacio—, pero se corrigió igual porque un `title` no lo anuncia ningún lector de pantalla
de forma fiable.

Pruebas — reproducido primero: RTL que abre el modo avanzado, escribe una expresión que no
admite ventaja y comprueba que el mismo conjunto de roles sigue presente antes y después
(`PanelDeDados.test.tsx`, nueva); confirma que el culpable era el `radiogroup`. Dos pruebas de
`BandejaDeDados.test.tsx` que antes esperaban `queryByRole(...).toBeNull()` pasan a esperar
`toBeInTheDocument()` + `toBeDisabled()`. `PanelDeDadosDeLaMesa.test.tsx` (nuevo fichero, no
existía prueba unitaria de este componente): mismo reproductor para el cajón compacto.
`pnpm --filter @dnd/web test -- src/features/rolls`: 91/91 (12 ficheros). `pnpm verify`: verde
(shared/api/web). E2E (no corridos por el agente; el controlador ya los tiene en su tanda):
`espacios.spec.ts` queda intacto — no hizo falta tocarlo, porque medía bien: el defecto estaba en
el componente, no en la medida.

Revertir — `git revert` del commit; ningún dato ni migración de por medio.

---

## Tarea 9 del pulido: el servidor dice qué dado cayó — `dice[]` por dado (2026-09-13, C5) — archivada

**Movida entera** a [`_archivo/historial-2026-09-13-tarea-9-dice-por-dado.md`](./_archivo/historial-2026-09-13-tarea-9-dice-por-dado.md)
el 2026-09-13, al escribir la entrada de la Task 14 bis: el fichero estaba en 977 de 1000 y era la
entrada completa más antigua. En una línea: `dadosTirados()` empareja cada dado con sus caras y
dice si cuenta, y `dice[]` viaja opcional en el desglose y en `ABILITY_ROLL` para que la pantalla
tache dado a dado sin reconstruir el emparejamiento.

---

## Tarea 8 del pulido: `MenuDeAcciones` y la fila del elenco (2026-09-12, C2 #1) — archivada

**Movida entera** a [`_archivo/historial-2026-09-12-tarea-8-menu-de-acciones.md`](./_archivo/historial-2026-09-12-tarea-8-menu-de-acciones.md)
el 2026-09-13, al insertar las entradas de las tareas 12–14 del pulido: el fichero seguía en 1002
de 1000 tras los dos primeros archivados del mismo corte, y esta era la entrada completa más
antigua. En una línea: `ui/MenuDeAcciones.tsx` plegó cinco controles de la fila del elenco a un
menú de dos, con teclado completo, y sus cuatro rondas de arreglo destaparon una medida vacía en
`espacios.spec.ts` y un error que la fila tragaba en silencio.

---

## Tarea 7 del pulido: seis dados dibujados y el barrido de iconos (2026-09-12, C3 #12 y #22) — archivada

**Movida entera** a [`_archivo/historial-2026-09-12-tarea-7-seis-dados.md`](./_archivo/historial-2026-09-12-tarea-7-seis-dados.md)
el 2026-09-13, al insertar las entradas de las tareas 12–14 del pulido: el fichero quedaba en 1038
de 1000 tras el primer archivado del mismo corte, y esta era la entrada completa más antigua. En
una línea: `IconoDado({ caras })` puso «un dado, una forma» de verdad (seis siluetas, D-CF-62), y
un barrido nuevo de botones encontró 15 culpables sin icono dibujado o con un «+» de fuente.

---

## Ronda de arreglo de la tarea 7: un solo d20, la navegación entra en el barrido (2026-09-12) — archivada

**Movida entera** a [`_archivo/historial-2026-09-12-ronda-arreglo-tarea-7.md`](./_archivo/historial-2026-09-12-ronda-arreglo-tarea-7.md)
el 2026-09-13, al insertar las entradas de las tareas 12–14 del pulido: el fichero quedaba en 1074
de 1000 y esta era la entrada completa más antigua. En una línea: `IconoD20` pasó a delegar en
`IconoDado caras={20}` (dos siluetas para un dado eran una), una tercera prueba cubrió por fin
«toda entrada de navegación» tal y como decía `04-convenciones.md`, y los dados d4/d8 dejaron de
retrazar aristas ya dibujadas.

---

## Tarea 6 del pulido: el tablero enmarcado y el registro como cajón (2026-09-12, C1 bis) — archivada

**Movida entera** a
[`_archivo/historial-2026-09-12-tarea-6-tablero-enmarcado.md`](./_archivo/historial-2026-09-12-tarea-6-tablero-enmarcado.md)
el 2026-09-13, al escribir la entrada de la tarea 11: el fichero seguía por encima de su tope tras
archivar la tarea 5, y esta era la siguiente entrada completa más antigua. En una línea:
`MarcoDelTablero` enmarca la partida de PlanarAlly en un `<iframe>` y `CajonDelRegistro` pliega el
registro en vivo con un contador de líneas nuevas, montados en el centro de la mesa cuando la
campaña tiene `boardRoomUrl`.

---

## Tarea 5 del pulido: `Campaign.boardRoomUrl` (2026-09-12, C1 bis) — archivada

**Movida entera** a
[`_archivo/historial-2026-09-12-tarea-5-boardroomurl.md`](./_archivo/historial-2026-09-12-tarea-5-boardroomurl.md)
el 2026-09-13, al escribir la entrada de la tarea 11 del pulido: el fichero estaba en 979 de 1000
y esta era la entrada completa más antigua. En una línea: `Campaign.boardRoomUrl` guarda la URL
de la partida de PlanarAlly que la mesa enmarcará, con su migración, su `refine` de `http(s)` y su
bloque «Sala del tablero» en `CampaignSettings.tsx`.

---

## Tarea 4 del pulido: `e2e/espacios.spec.ts`, la pasada de medición (2026-09-12, tres rondas) — archivada

**Movida entera** a
[`_archivo/historial-2026-09-12-tarea-4-espacios-medicion.md`](./_archivo/historial-2026-09-12-tarea-4-espacios-medicion.md)
el 2026-09-13, al escribir la ronda de arreglo 2 de la Task 10 del pulido: el fichero seguía por
encima de 1000 y era la entrada completa más antigua. En una línea: `medirHermanas` mide toda
tarjeta de la pestaña, no solo los hijos directos, sobre Números/Rasgos/Recursos/Estado/Ataques;
cierra los anexos #6, #8 y #17, y de paso arregla el detalle de Objetos bajo la banda fija y el
desnivel de Números.

---

## Tarea 3 del pulido: Ajustes del personaje en una tarjeta con pie, y Dados en rejilla (2026-09-12) — archivada

**Movida entera** a
[`_archivo/historial-2026-09-12-tarea-3-ajustes-y-dados-en-rejilla.md`](./_archivo/historial-2026-09-12-tarea-3-ajustes-y-dados-en-rejilla.md)
el 2026-09-13, al escribir la ronda de arreglo 2 de la Task 10 del pulido: el fichero seguía por
encima de 1000 y era la entrada completa más antigua. En una línea: `AjustesDePersonaje.tsx` pasa
a `TarjetaDeHoja` con archivar y borrar en el `pie`; `PanelDeDados.tsx` mete el reloj en la misma
rejilla que pedir y tirar (anexo #16), sin la bandeja compacta todavía — esa llega en la Task 10.

---

## Tarea 2 del pulido: espacio reservado en `Field`, sticky con escalón y rejilla de Rasgos (2026-09-12) — archivada

**Movida entera** a
[`_archivo/historial-2026-09-12-tarea-2-field-reserva-espacio.md`](./_archivo/historial-2026-09-12-tarea-2-field-reserva-espacio.md)
el 2026-09-13, al escribir la ronda de arreglo de la Task 10 del pulido: el fichero seguía por
encima de 1000 y era la entrada completa más antigua. En una línea: `Field` gana
`reservaEspacio?` (la línea de pista/error nunca cambia de alto), el panel sticky de Objetos
respeta el escalón de la banda fija, y `Rasgos.tsx` corrige el hueco de su rejilla con una
sub-rejilla para Ficha y Personalidad.

---

## Ronda de arreglo de la tarea 1: `Casilla` a 6rem, medida en el navegador (2026-09-12) — archivada

**Movida entera** a
[`_archivo/historial-2026-09-12-ronda-arreglo-tarea-1-casilla-6rem.md`](./_archivo/historial-2026-09-12-ronda-arreglo-tarea-1-casilla-6rem.md)
el 2026-09-13, al escribir la ronda de arreglo de la Task 10 del pulido: el fichero seguía por
encima de 1000 y era la entrada completa más antigua. En una línea: Playwright tumbó la primera
`Casilla` a `4.75rem` (líneas partidas); corregida a `w-[6rem]` con `whitespace-nowrap` y «Vel.»
en vez de «Vel. (pies)», con los selectores de `hoja.spec.ts` y `hoja-pestanas.spec.ts` al día.

---

## Tarea 1 del pulido: `Casilla` y la banda anclada (2026-09-12) — archivada

**Movida entera** a
[`_archivo/historial-2026-09-12-tarea-1-casilla-banda-anclada.md`](./_archivo/historial-2026-09-12-tarea-1-casilla-banda-anclada.md)
el 2026-09-13, al escribir la ronda de arreglo de la Task 10 del pulido: el fichero seguía por
encima de 1000 y era la entrada completa más antigua. En una línea: `Casilla` (nuevo componente)
reserva siempre su tercera línea de nota; `TarjetaDeHoja` gana un `pie?`; la banda fija se ancla
con dos variables CSS que declara quien la contiene (`--tira-fija-mx`/`--tira-fija-bg`).

---

## Tarea 0 del pulido: nota de diseño y cinco reglas (2026-09-12) — archivada

**Movida entera** a
[`_archivo/historial-2026-09-12-tarea-0-nota-de-diseno.md`](./_archivo/historial-2026-09-12-tarea-0-nota-de-diseno.md)
el 2026-09-13, al escribir la ronda de arreglo de la Task 10 del pulido: el fichero seguía por
encima de 1000 y era la entrada completa más antigua. En una línea: nota de diseño de UI de
juegos (BG3, Divinity OS2, Foundry, D&D Beyond, Owlbear Rodeo, dddice/dice-box) y cinco reglas de
interfaz nuevas con sus constantes fijadas (D-CF-58..62).

---

## La hoja a página completa (2026-09-11 y 12) — archivada

**Movida entera** a
[`_archivo/historial-2026-09-11-y-12-hoja-a-pagina-completa.md`](./_archivo/historial-2026-09-11-y-12-hoja-a-pagina-completa.md)
el 2026-09-12, en la ronda de revisión de la Tarea 5 del pulido: el fichero quedaba en 1013 de
1000 y era la entrada completa más antigua. En una línea: fusión (`e43038f`) y despliegue
(`6d2b2ca`) de `hoja/pagina-completa` a producción, veintiséis commits de las once tareas del
plan, la ola de revisión final de la rama, y las tandas HP-1 a HP-10 (sintonización cuenta,
la fila resume todos los tipos de efecto) cerradas hasta HP-9b.

## La revisión de producción del autor: 24 puntos y tres specs (2026-09-12, tarde) — archivada

**Movida entera** a
[`_archivo/historial-2026-09-12-revision-de-produccion-24-puntos.md`](./_archivo/historial-2026-09-12-revision-de-produccion-24-puntos.md)
el 2026-09-13, al escribir la ronda de arreglo de la Task 10 del pulido: el fichero seguía por
encima de 1000 y era la entrada completa más antigua. En una línea: el autor recorrió producción
y reportó 24 puntos, convertidos en tres specs (el pulido de esta rama, reglas de la mesa, el
mapa de historia del DM) más el tablero provisional dentro de Owlbear (D-CF-52..56).

---

## El paso 3 se convierte en el cierre de la primera parte (2026-09-12) — archivada

**Movida entera** a
[`_archivo/historial-2026-09-12-paso-3-cierre-primera-parte.md`](./_archivo/historial-2026-09-12-paso-3-cierre-primera-parte.md)
el 2026-09-13, al escribir la ronda de arreglo de la Task 10 del pulido: el fichero seguía por
encima de 1000 y era la entrada completa más antigua. En una línea: P2-4, P2-5 y «hasta el
próximo descanso» salen a una tanda propia (la puerta de efectos, con la bandeja de daño); el
plan del paso 3 gana los bloques E y F, ~26 tareas en cinco cortes, con lo que necesita tablero
fuera por decisión del autor (D-CF-49..51).

---

## La hoja a página completa: spec aprobada y plan escrito, sin código (2026-09-11, noche) — archivada

**Movida entera** a
[`_archivo/historial-2026-09-11-hoja-a-pagina-spec-y-plan.md`](./_archivo/historial-2026-09-11-hoja-a-pagina-spec-y-plan.md)
el 2026-09-13, al escribir la ronda de arreglo de la Task 10 del pulido: el fichero seguía por
encima de 1000 y era la entrada completa más antigua. En una línea: la hoja fuera de la mesa se
rediseña como una sola `HojaCalculada` con `disposicion` —cabecera fija, siete pestañas
laterales, Objetos con lista + detalle, Conjuros solo para quien lanza—; spec y plan de 11 tareas
aprobados con el autor, sin código todavía.

---

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

## La poda: treinta y nueve bloques fuera del tablero, y doce decisiones con fila (2026-09-10) — archivada

**Movida entera** a
[`_archivo/historial-2026-09-10-la-poda-treinta-y-nueve-bloques.md`](./_archivo/historial-2026-09-10-la-poda-treinta-y-nueve-bloques.md)
el 2026-09-13, al escribir la ronda de arreglo de la Task 10 del pulido: el fichero seguía por
encima de 1000 y era la entrada completa más antigua. En una línea: se clasificaron todas las
secciones abiertas de `06-pendientes.md` contra el árbol —dieciséis fichas falsas, doce tachadas
que seguían listadas, once resueltas por los cuatro pasos— y el documento bajó de 1496 a ~1100
líneas, sin tocar código.

---

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
