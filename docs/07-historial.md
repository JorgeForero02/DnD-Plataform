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
> | [`_archivo/historial-2026-09-13-tarea-11-hilo-nombra-personajes.md`](./_archivo/historial-2026-09-13-tarea-11-hilo-nombra-personajes.md) | **Tarea 11 del pulido: el hilo habla de personajes**, movida entera el 2026-09-13 al escribir el hito «Pulido antes del paso 3» (Tarea 15). Su resumen se queda arriba |
> | [`_archivo/historial-2026-09-13-tarea-12-salir-de-la-mesa.md`](./_archivo/historial-2026-09-13-tarea-12-salir-de-la-mesa.md) | **Tarea 12 del pulido: salir de la mesa vuelve a la campaña**, movida entera el 2026-09-13 en el mismo corte. Su resumen se queda arriba |
> | [`_archivo/historial-2026-09-13-tarea-13-pg-temporales-bestiario.md`](./_archivo/historial-2026-09-13-tarea-13-pg-temporales-bestiario.md) | **Tarea 13 del pulido: PG temporales del bestiario, y su ronda de arreglo**, movida entera el 2026-09-13 en el mismo corte. Su resumen se queda arriba |
> | [`_archivo/historial-2026-09-13-tarea-14-filtros-catalogo.md`](./_archivo/historial-2026-09-13-tarea-14-filtros-catalogo.md) | **Tarea 14 del pulido: filtros del catálogo de objetos**, movida entera el 2026-09-13 en el mismo corte. Su resumen se queda arriba |
> | [`_archivo/historial-2026-09-13-tarea-14bis-mundo-arbol.md`](./_archivo/historial-2026-09-13-tarea-14bis-mundo-arbol.md) | **Task 14 bis del pulido: el mundo como árbol con detalle**, movida entera el 2026-09-13 en el mismo corte. Su resumen se queda arriba |
> | [`_archivo/historial-2026-09-13-ronda-arreglo-2-tarea-10.md`](./_archivo/historial-2026-09-13-ronda-arreglo-2-tarea-10.md) | **La ronda de arreglo 2 de la tarea 10 del pulido** —el radio de ventaja se queda montado, apagado con su motivo—, movida entera el 2026-09-13 en el mismo corte. Su resumen se queda arriba |
> | [`_archivo/historial-2026-09-13-revision-final-de-la-rama.md`](./_archivo/historial-2026-09-13-revision-final-de-la-rama.md) | **Revisión final de la rama pulido/antes-del-paso-3**, movida entera el 2026-09-13 al escribir el hito «Pulido antes del paso 3» (Tarea 15): las siete de este corte se movieron para dejar sitio al hito de la tanda entera. Su resumen se queda arriba |
> | [`_archivo/historial-2026-09-13-pulido-antes-del-paso-3.md`](./_archivo/historial-2026-09-13-pulido-antes-del-paso-3.md) | **El hito «Pulido antes del paso 3»**, movido entero el 2026-09-14 al escribir el hito «La puerta de efectos», con el fichero en 1013 líneas |
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

## 3A.1 «El libro entra» — ola de arreglos tras la revisión final (2026-09-14) — en rama, sin fusionar ni desplegar

Qué — la rama `paso-3a/3a1-el-libro-entra` (319 conjuros, 234 aptitudes, 26 rasgos de raza del SRD 5.1
convertidos a `Actividad` con nombre y prosa del SRD español) pasó por una revisión Opus de la rama
entera (`.superpowers/sdd/2026-09-14-3a1-el-libro-entra/review-final.md`: 5 críticos, 13 importantes,
12 menores; muestreo 14 ok / 24 desajustes de 38, todos estructurales) y una única ola acotada (D-CF-65)
los cierra: `override: false` manda al ítem (Escudo vuelve a ser reacción; 0 actividades «instantánea +
concentración»), `classKey` en los dos contextos (un monje de nivel 5 tiene 5 ki, no 0), los `grant`
solo con recursos que la clase siembra y uno por aptitud, pie de página del PDF fuera de 115 textos y
Zona de la verdad sin el capítulo de trampas, `rechazos.md` con el motivo de todo (49 huecos de esquema
y 48 fuera de A por autor, con causa), claves de 2014, `shared`/`feat` en vez de «fighter 1», nada
recortado (topes a 8000), CD/daño/onSave que no caben rechazados enteros. Decisiones D-CF-108 a D-CF-115;
06-pendientes se copia ahora del informe. Pruebas: 58 unitarias del conversor (+11), `generado.spec.ts`
con los invariantes nuevos (por actividad, recursos de los grants, sin pie, claves 2014, LABEL_KEYS),
`resolve.spec.ts` con Ki/Acción Súbita/Tomar Aliento sembrados.
Por qué — la mitad mecánica del dorado estaba mal en el 40–75 % de las actividades y el informe callaba.
Revertir — `git revert` del commit de la ola; el catálogo generado vuelve solo con `pnpm catalogo:convertir`.

## Despliegue de `main` `b6bbeb0` (2026-09-14, noche) — lo lanzó el autor

Qué — `dnd.supportive.pro` sirve `b6bbeb0`: comprobado con `SOURCE_COMMIT` dentro del contenedor de
la API en `vps1new` (`docker exec … env`), `/` 200 y `/api/health` ok. Entran de golpe: reglas de la
mesa, desbordes, puerta de efectos, PNJ del mundo y la mesa + su cierre, PE-1. Las migraciones
(`table_rules`, `roll_request_pending_effect`, `condition_expires_on_rest`, `character_xp`,
`character_entity_id`, `npc_reveal_events`, `combatant_left_event`) las aplicó el arranque.
Por qué — el autor: «ya desplegué». Antes de esto producción llevaba en `4830b8a` desde el 13.
Revertir — redesplegar `4830b8a` desde Coolify; las migraciones son aditivas y no estorban.

## PE-1 cerrada y fusionada (2026-09-14, noche) — desplegada esa misma noche (ver arriba)

Qué — `pe-1/cierre` → `main` en `baea692`: los seis menores de código de «puerta de efectos» (a ciegas
el veredicto no viaja, D-CF-88; el daño solo cobra la tirada de SU ataque, por `GameEvent.attackRef`;
`XpService` bloquea por `id`; `GrupoDeRadios` una sola vez en `ui/`; `DarXp` con `key` por propuesta;
el bucle «hasta impactar» del e2e lee `data-veredicto`), y las cuatro de producto decididas por el
autor sin código (D-CF-89..91). Rigor bajo a propósito: un brief, un implementador, pruebas solo donde
cambió comportamiento; e2e de API 33/33 en los tres ficheros tocados, Playwright 7/7 en tres spec.
Por qué — el autor: «es pequeño, debería salir rápido» — y salió en 2 h.
Revertir — `git revert -m 1 baea692`.

## Fusión a `main` de «PNJ del mundo y la mesa» + su cierre (2026-09-14, tarde) — sin desplegar

Qué — `main` recibe las dos ramas apiladas en `07c9a9d` (merge `--no-ff`; `pnpm verify` entero en
verde sobre `main`: 219 + 2102 + 1715 unitarias). La segunda, `pnj-del-mundo/cierre` (`94a4755`),
cerró en una sola pasada de rigor bajo —decisión del autor: «pruebas no tan rigurosas si es solo mover
cosas de lugar»— los pendientes que dejó la primera: PM-1 (`entityId` no viaja en respuestas de
mutación), T3 (la tira revela el grupo entero, `POST …/characters/reveal-many`, D-CF-87), PE-2 (e2e
de concurrencia de `apply-damage` y `POST /xp`), el caso de la tarea 11 (origen oculto → 404) y la
cabecera huérfana del 13-09 en 06. e2e de API 32/32 en los tres ficheros; Playwright
`pnj-del-mundo-en-vivo` + `combate` 2/2.
Por qué — el autor dio permiso de fusionar al cerrar; el despliegue sigue siendo suyo.
Revertir — `git revert -m 1 07c9a9d`. **Producción sigue en `4830b8a`.**

## El PNJ del mundo y la mesa (2026-09-14) — cerrada en rama, fusionada por la tarde (ver arriba)

Qué — rama `pnj-del-mundo/antes-del-paso-3` (9 commits sobre `ce0cc36`;
[plan](./superpowers/plans/2026-09-14-pnj-del-mundo-y-la-mesa.md) de la
[spec](./superpowers/specs/2026-09-13-pnj-del-mundo-y-la-mesa-design.md)). **`Character.entityId`**
une el cuerpo en la mesa con su ficha del mundo (solo `NPC` de la campaña, `SetNull`; se redacta a
`null` para quien no ve la ficha, en las seis lecturas). **Revelar es una sola acción**
(`POST …/characters/:id/reveal`): instancia, ficha del mundo y plantilla creada suben a `PLAYERS`
en una transacción, con `NPC_REVEALED`; `hide` baja solo la instancia (`NPC_HIDDEN`, `DM_ONLY`, para
que el canal en vivo despierte a la mesa); revelar la ficha desde el wiki —a mano o por el motor de
reglas— sube sus cuerpos vivos. **Sacar del combate** (`DELETE …/combatants/:id`) renumera y, si
tenía el turno, avanza por el mismo `empezarTurno` que «Pasar turno» (extraído de `advanceTurn`),
con `COMBATANT_LEFT` sin nombre si la mesa no lo veía. En la mesa: «Revelar a la mesa» / «Ocultar» /
«Sacar del combate» en el menú «…» del elenco, «oculto · Revelar» en el orden de turnos, criaturas en
«Revelar algo», el nombre enlaza a la ficha del mundo; se enlaza al bajar una criatura, desde la hoja
(«Ficha del mundo») y desde la ficha del mundo («A la mesa»); «Plantilla» / «En la mesa» dicen a qué
afecta cada visibilidad. Proceso: D-CF-65 con el cierre acotado de la spec §5 — sin revisión por
tarea; **una** revisión Opus de la rama (0 críticos, 4 importantes, 9 menores) y **una** ola que los
cerró todos; e2e de API `pnj-del-mundo` 17/17; Playwright solo en lo tocado, 26/26, con la prueba
nueva a dos navegadores en verde a la primera. Decisiones D-CF-72..86 en
[decisiones.md](./decisiones.md) (D-CF-73 enmendada por la revisión: `SPECIFIC_PLAYERS` también sube).
Por qué — la primera partida de prueba en producción: el jugador no veía al enemigo en el orden,
«Revelar algo» revelaba la ficha y no al bicho, y no había forma de sacar a nadie del combate.
Revertir — no fusionar la rama; las tres migraciones (`20260914100000`, `…100100`, `…100200`) son
aditivas y llevan su `-- Revertir:`. **Sin fusionar ni desplegar**: los dos gestos son del autor.

## El paso 3 se parte en A (jugable) y B (completo); puerta de efectos fusionada (2026-09-14)

Qué — `main` recibe la puerta de efectos en `7688b44` (merge `--no-ff` de `4e17a69`; `pnpm verify`
entero en verde). Y el paso 3 deja de ser un plan de 26 tareas por orden de aparición:
[Paso 3 en cinco tandas](./superpowers/plans/2026-09-14-paso-3-en-cinco-tandas.md) manda el orden
—el libro → el mago → la mesa en combate → lo temporal → deuda— y el
[plan del 8](./superpowers/plans/2026-09-08-paso-3-el-catalogo-y-los-conjuros-del-personaje.md)
conserva el contenido de cada tarea (D-CF-70). T5/T6/T9 salen por hechas. **Por la tarde, el autor
lo partió en A y B (D-CF-71)**: A = conjuros y aptitudes por el conversor con texto, usos y solo
daño/curación, elegir/lanzar/usar (espacio superior, encantar, daño extra al impactar) y la barra
de acciones — «jugable aunque sea de voz», como Foundry sin módulos; B = el resto tras jugar.
Por qué — el autor: «hay muchas cosas dispersas; lo único bien cuadrado es el catálogo». El mago
estaba en cuatro bloques y la mesa en dos, por haber crecido por acumulación.
Revertir — borrar el índice del 14, la nota de cabecera del plan del 8 y la fila D-CF-70; la fusión
se deshace con `git revert -m 1 7688b44`.

## La puerta de efectos (2026-09-13/14) — cerrada en rama, sin fusionar ni desplegar

Qué — rama `puerta-de-efectos/antes-del-paso-3` sobre `0ca530c` (`main` con reglas de la mesa y
desbordes), **14 commits**: spec con §5 bis XP y plan (`498a0b4`), nueve tareas (`3206331` la segunda
puerta · `fc8b369` el daño de la salvación · `b6fd7ef` la bandeja de daño en la API · `64a51c2` «hasta
el próximo descanso» · `ba2ca48` XP en el servidor · `6216d97`, `c803023`, `283b468` la web ·
`53e735e` el recorrido de navegador y los docs de datos), dos olas de arreglo (`5b71c07` API,
`54379a0` web, `49d6e46` Playwright) y esta documentación. Spec:
`superpowers/specs/2026-09-12-la-puerta-de-efectos-design.md`; plan:
`superpowers/plans/2026-09-13-puerta-de-efectos.md`; ledger:
`.superpowers/sdd/2026-09-13-puerta-de-efectos/progress.md`. Segunda tanda bajo D-CF-65.

Por qué — tres huecos que el paso 3 necesita cerrados (P2-4, P2-5 y la duración «hasta el descanso»
que el esquema declaraba pendiente), más la bandeja de daño pedida por el autor y la experiencia
(ficha «XP: no existe»), cuyas dos preguntas se contestaron con el SRD y Foundry sin preguntar al
autor: **D-CF-68** (el combate **propone** el reparto por VD y el DM confirma en «Dar XP»; SRD
*Monsters · Experience Points*, «typically…»; Foundry no lo automatiza) y **D-CF-69** (sin XP a un
PNJ de statblock: sus números salen del VD, no de un nivel; Foundry solo premia a `character`).

Lo que entra:

- **La segunda puerta** (§3): `changeHpFromEffect` y `createFromEffect`, con `tx` obligatorio y sin
  ruta (una prueba lo afirma sobre todos los controladores); `usar` las usa. Un clérigo cura a otro
  jugador y le pide una salvación.
- **El daño de la salvación** (§4): se tira una vez en `usar` (SRD *Damage Rolls*), viaja en
  `RollRequest.pendingEffect` y `answer` aplica entero / mitad (`floor`) / nada con `total >= dc`
  (SRD *Saving Throws*), en la misma transacción que cierra la petición; el `HP_CHANGED` lo firma
  quien lanzó. El aviso literal «A7 NO aplica solo» desapareció.
- **La bandeja de daño** (§4 bis): el daño de un ataque resuelto lleva `pendingDamage`; `GET
  …/rolls/:id/damage-preview` (404 a quien no puede aplicar) y `POST …/apply-damage` (dueño del
  objetivo o DM; el atacante nunca; idempotente con `jsonb_set … WHERE appliedEventId IS NULL`); en el
  hilo, la línea «Espectro: 11 cortante → 5 · resistencia» y el botón «Aplicar».
- **«Hasta el próximo descanso»** (§5): `CharacterCondition.expiresOnRest`, excluyente con
  `durationSeconds`; el descanso borra con `CONDITION_REMOVED` y su motivo; tres radios con frase en
  `Condiciones.tsx` (E-PE-7).
- **XP** (§5 bis): `Character.xp`, `XP_AWARDED`, `POST /campaigns/:id/xp` (DM; 400 a un statblock;
  nunca bajo 0; bajo cerrojo), la regla de la mesa `progresion: HITO | XP` (defecto `HITO`: ninguna
  campaña cambia), `end()` propone el reparto (`sinTabla` para VD fuera de la tabla), la hoja dice
  «1 250 / 2 700 PX» y avisa sin subir (D-CF-66), «Dar XP» como séptima herramienta del DM.
- Tres migraciones aditivas: `20260913200000_roll_request_pending_effect`,
  `20260913200100_condition_expires_on_rest`, `20260913200200_character_xp` (+ `XP_AWARDED` en el
  enum). Aplicadas en local con `migrate deploy`.

Cómo se verificó — por tarea, unitarias + mutación + `pnpm verify`. Al cierre: e2e de API
`puerta-de-efectos.e2e-spec.ts` **25/25** (empezó 18/22: el `DICE_ROLLER` no tenía proveedor y el
`overrideProvider` no ataba — ahora `DiceModule`; y `end()` sobre un `PREPARING`), suite e2e de API
entera 57/58 ficheros antes de la ola y sin regresiones; revisión Opus de la rama en dos mitades (API
3C/3I/14m, web 1C/10I/15m) → **ola 1 cerró los 17** (re-revisión 17/17, 0 nuevos); Playwright sobre
los spec tocados 21/21 tras la ola 2; **suite Playwright entera 203 pass / 1 skipped / 3 fail**, de
los que uno es el `test.fail` declarado de `mesa-en-estrecho`, uno es `sesion.spec.ts:827` **que pasa
solo** (flaky) y dos eran `iniciativa-en-vivo.spec.ts`, **rojo en `main` desde D-CF-66** (la jugadora
fijaba `level: 8` por el `PATCH`, ahora 403): se quitó el `level` del helper y pasa 3/3.

Lo que cazó la revisión que ninguna tarea vio — la segunda puerta derivaba la hoja del objetivo con
el actor como visor, así que un statblock de campaña (`DM_ONLY`) daba 400 al aplicar; el visor pasa a
ser del servidor y el actor solo firma. El `DICE_ROLLER` sin proveedor: todos los «dados fijos» del
e2e eran azar y pasaban por suerte. La propuesta de XP vivía en la tira de iniciativa, que se
desmonta al terminar el combate: `CapaDeCombate` es ahora componente propio y la conserva.

Revertir — `git revert` de la rama (o no fusionarla). Las tres migraciones tienen su `-- Revertir:`;
el valor `XP_AWARDED` del enum se queda (no se puede quitar sin reescribir el tipo).

Lo que deja abierto está en `06-pendientes.md`, «Dejado por puerta de efectos» (PE-1, PE-2).
**Sin fusionar ni desplegar: la fusión la decide el autor; el paso 3 no se arranca.**

---

## Desbordes (2026-09-13) — cerrada en rama, sin fusionar ni desplegar

Qué — rama `desbordes/antes-del-paso-3` sobre `807f752` (reglas de la mesa), **11 commits**: D-CF-67
(`c34fa62`), plan (`826b2ff`), la prueba gráfica (`197eb65`), `ui/PanelFlotante` con la migración
del panel de ataque y del menú «…» del elenco (`c87080d`), la traza de «Comp.» (`0d73882`), cuatro
olas de arreglo y la documentación. Spec: `docs/superpowers/specs/2026-09-13-desbordes-design.md`.
**Recortada por el autor a mitad** (vía `d-d-plataform-93`): de «auditoría + prueba genérica de todas
las pantallas + cierre con suite entera y revisión» a «solo arreglo + reconocimiento visual de lo
arreglado». Lo que quedó:

- **Auditoría en navegador** (Tarea 0, Playwright con la semilla demo, sin arreglar nada): **tres
  desbordes reales** — la lista de objetivos al atacar (§2.1 de la spec, 71 px recortados por el
  `overflow-x-auto` de la tabla de ataques), **uno nuevo**: el menú «…» de una fila del elenco en la
  mesa (79 px, recortado por el carril scrollable), y la traza de la casilla «Comp.» 8 px fuera de la
  ventana. El §2.2 (traza fuera del borde de la casilla) **ya estaba arreglado** el 2026-09-12.
- **`apps/web/e2e/desbordes.spec.ts`**: la medida genérica «nada se sale» (dos reglas, exclusiones y
  la excusa del scroll legítimo; ver `08-pruebas.md`), acotada a los tres casos con `test.fail()`
  hasta su arreglo y una captura por caso en `apps/web/e2e-resultados/desborde-*.png`.
- **`ui/PanelFlotante`**: portal al `body`, posición fija desde el disparador (encima si no cabe
  debajo, nunca fuera de la ventana), `Escape` (anidado en el ataque), clic fuera, foco y su
  devolución. Migrados `TirarAtaqueBoton` y `MenuDeAcciones`; `PanelDeTirada` no (la auditoría no
  lo midió fuera). Regla nueva en `04-convenciones.md`: un `absolute` dentro de un `overflow-*` no
  es una opción.
- **La traza de «Comp.»**: `min-w-0` en la fila y el `li` de traza (el mínimo por contenido de
  flex/grid era la causa), el importe arriba a la derecha sin pisar el texto, y **la casilla crece
  mientras su traza está abierta** (`min-w-[6rem] w-auto max-w-[14rem]`), con las palabras enteras.

Lo que cazó el reconocimiento visual y no la prueba — la prueba mide «no se sale», no «se lee»:
el portal nacía con `visibility: hidden` hasta posicionarse y **se tragaba el foco del primer ítem
del menú** (`teclado.spec.ts` lo cazó; dos olas: no robar el foco, y `opacity: 0` en vez de
`hidden`); el importe de la traza **pisaba** el texto envuelto; y luego el texto **partía palabras**.
Cuatro olas sobre el mismo implementador, cada una mirando la captura.

Lateral: **la semilla demo estaba rota desde D-CF-66** (el jugador fijaba su nivel → 403); la
arregla `197eb65` (el nivel lo pone el token de la DM). La rama `reglas-de-la-mesa` sola sigue con
la semilla rota: se cura al fusionar esta detrás.

Verificado: `desbordes.spec.ts` 3/3 con sus capturas; `inventario`, `furia`, `teclado`, `combate`,
`tirada`, `hoja`, `hoja-pestanas`, `espacios`, `tokens-contrast` en verde tras el portal; `pnpm
verify` en cada commit. **Sin suite entera ni revisión de rama, por el recorte.** Ledger en
`.superpowers/sdd/2026-09-13-desbordes/`.

Revertir — `git revert` de los commits de la rama; ninguna migración. **No se ha fusionado ni
desplegado**: la fusión la decide el autor.

## Reglas de la mesa (2026-09-13) — archivada

Entera en
[`_archivo/historial-2026-09-13-reglas-de-la-mesa.md`](./_archivo/historial-2026-09-13-reglas-de-la-mesa.md),
movida el 2026-09-14 al llegar este fichero a sus 1000 líneas con la entrada de PE-1. **El hito:**
características, nivel, PG, permitidos y oro iniciales como reglas de la mesa por campaña, a mano o
con los dados que el DM diga (D-CF-53..); fusionada a `main` el mismo día, sin desplegar.

## Pulido antes del paso 3 (2026-09-12/13) — archivada

**Movida entera** a [`_archivo/historial-2026-09-13-pulido-antes-del-paso-3.md`](./_archivo/historial-2026-09-13-pulido-antes-del-paso-3.md)
el 2026-09-14, al escribir el hito «La puerta de efectos»: el fichero pasaba de 1000 líneas. En una
línea: los 24 puntos de la revisión de producción del autor, quince tareas con revisión y Playwright
por tarea, fusionada a `main` en `d7ec2b3` el 2026-09-13 sin desplegar; su detalle por tarea ya
estaba archivado debajo y las cinco reglas de UI que dejó viven en `04-convenciones.md`.

---

## Revisión final de la rama: ningún atacante inventado, caras desconocidas en texto, iconos dibujados en el modificador, «Tirar» nunca se apaga (2026-09-13) — archivada

**Movida entera** a [`_archivo/historial-2026-09-13-revision-final-de-la-rama.md`](./_archivo/historial-2026-09-13-revision-final-de-la-rama.md)
el 2026-09-13, al escribir el hito «Pulido antes del paso 3» (Tarea 15): su resumen ya vive en ese
hito, arriba. En una línea: cuatro hallazgos de integración de toda la rama corregidos en un
commit — ningún atacante inventado, ninguna cara de dado sin forma, ningún glifo de fuente que el
barrido no viera, y «Tirar» nunca deshabilitado.

---

## Task 14 bis del pulido: el mundo como árbol con detalle — sustituye al tablero telaraña (2026-09-13, #23, D-CF-64) — archivada

**Movida entera** a [`_archivo/historial-2026-09-13-tarea-14bis-mundo-arbol.md`](./_archivo/historial-2026-09-13-tarea-14bis-mundo-arbol.md)
el 2026-09-13, al escribir el hito «Pulido antes del paso 3» (Tarea 15): su resumen ya vive en ese
hito, arriba. En una línea: `taller/mundo/` cuelga cada ficha de un padre por
`ROTULOS_DE_JERARQUIA` y sustituye al tablero telaraña (D4), con detalle, anillo de vecinos y
editor de hilos; «custodia» sale de la jerarquía por ser relación lateral.

---

## Tarea 12 del pulido: salir de la mesa vuelve a la campaña (2026-09-13, anexo #18) — archivada

**Movida entera** a [`_archivo/historial-2026-09-13-tarea-12-salir-de-la-mesa.md`](./_archivo/historial-2026-09-13-tarea-12-salir-de-la-mesa.md)
el 2026-09-13, al escribir el hito «Pulido antes del paso 3» (Tarea 15): su resumen ya vive en ese
hito, arriba. En una línea: la primera miga de `BandaDeMesa.tsx` deja de llevar a todas las
campañas y pasa a la pestaña Sesiones de la campaña que se estaba jugando.

---

## Tarea 13 del pulido: PG temporales del bestiario — la pregunta solo tras pulsar, y su ronda de arreglo (2026-09-13, anexo #20) — archivada

**Movida entera** a [`_archivo/historial-2026-09-13-tarea-13-pg-temporales-bestiario.md`](./_archivo/historial-2026-09-13-tarea-13-pg-temporales-bestiario.md)
el 2026-09-13, al escribir el hito «Pulido antes del paso 3» (Tarea 15): su resumen ya vive en ese
hito, arriba. En una línea: `preguntando` pasa a ser estado explícito en `DarTemporales.tsx` —el
`alertdialog` ya no aparecía siempre con un PNJ con temporales previos—, y la ronda de arreglo
corrigió una aserción que no esperaba el flush de la mutación.

---

## Tarea 14 del pulido: filtros del catálogo de objetos (2026-09-13, anexo #21) — archivada

**Movida entera** a [`_archivo/historial-2026-09-13-tarea-14-filtros-catalogo.md`](./_archivo/historial-2026-09-13-tarea-14-filtros-catalogo.md)
el 2026-09-13, al escribir el hito «Pulido antes del paso 3» (Tarea 15): su resumen ya vive en ese
hito, arriba. En una línea: `CampaignItemsCatalogPage.tsx` gana `FilterChip` por tipo de objeto y
por origen, con el mismo patrón que ya resolvió el bestiario.

---

## Tarea 11 del pulido: el hilo habla de personajes (2026-09-13, C4: #15) — archivada

**Movida entera** a [`_archivo/historial-2026-09-13-tarea-11-hilo-nombra-personajes.md`](./_archivo/historial-2026-09-13-tarea-11-hilo-nombra-personajes.md)
el 2026-09-13, al escribir el hito «Pulido antes del paso 3» (Tarea 15): su resumen ya vive en ese
hito, arriba. En una línea: `HP_CHANGED.sourceCharacterId` y `nombres-del-hilo.ts` hacen que el
registro diga «Sylas pierde 7 PG ← ataque de Klarg» en vez de «Pierde 7 PG», con el objetivo
nombrado a propósito porque el suceso ya se escribe a su visibilidad.

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


## Ronda de arreglo 2 de la tarea 10: el radio de ventaja se queda montado, apagado con su motivo (2026-09-13) — archivada

**Movida entera** a [`_archivo/historial-2026-09-13-ronda-arreglo-2-tarea-10.md`](./_archivo/historial-2026-09-13-ronda-arreglo-2-tarea-10.md)
el 2026-09-13, al escribir el hito «Pulido antes del paso 3» (Tarea 15): su resumen ya vive en ese
hito, arriba. En una línea: `SelectorDeVentaja` deja de desmontarse cuando la expresión no admite
ventaja —se apaga con su motivo, siempre montado—, que es la regla de casa contra el *tearing* que
`espacios.spec.ts` había cazado.

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
