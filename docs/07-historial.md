# Historial

> **Beta 0.1.0 (2026-09-18, decisión del autor):** con 3A.2 (`5cc14a2`) y 3A.3 (`c94fb90`) en `main`, el sistema queda declarado beta 0.1.0 — etiqueta `v0.1.0-beta` sobre `c94fb90` (D-CF-160). Paso 4 y despliegue, del autor.

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
> | [`_archivo/historial-2026-09-13-desbordes.md`](./_archivo/historial-2026-09-13-desbordes.md) | **Desbordes**, movida entera el 2026-09-15 al escribir la entrada de los efectos de mesa (el fichero estaba en 992 de 1000). Su hito se queda arriba |
> | [`_archivo/historial-2026-09-14-puerta-de-efectos.md`](./_archivo/historial-2026-09-14-puerta-de-efectos.md) | **La puerta de efectos**, movida entera el 2026-09-15 al escribir la línea del despliegue de `334912b` (1004 de 1000). Su hito se queda arriba |
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
> | [`_archivo/historial-2026-09-14-paso-3-en-a-y-b.md`](./_archivo/historial-2026-09-14-paso-3-en-a-y-b.md) | **«El paso 3 se parte en A y B; puerta de efectos fusionada»**, movida entera el 2026-09-18 al insertar la entrada de la Task 3 de 3A.2 (`SpellbookService`): el fichero quedó en 1012 de 1000. Su resumen se queda arriba |
> | [`_archivo/historial-2026-09-14-y-15-3a1-y-efectos-de-mesa.md`](./_archivo/historial-2026-09-14-y-15-3a1-y-efectos-de-mesa.md) | **3A.1 «El libro entra»** y **«Efectos de mesa»**, movidas enteras el 2026-09-18 al escribir la entrada de cierre de 3A.3: el fichero estaba en 996 de 1000 y eran las dos entradas completas más antiguas. Sus resúmenes se quedan arriba |
> | [`_archivo/historial-2026-09-18-3a3-la-barra-de-acciones.md`](./_archivo/historial-2026-09-18-3a3-la-barra-de-acciones.md) | **3A.3 · La barra de acciones y la mesa converge al prototipo**, movida entera el 2026-09-19 al escribir la entrada de las correcciones de interfaz (1007 de 1000). Su resumen se queda arriba |
> | [`_archivo/historial-2026-09-17-cierre-antes-de-3a2.md`](./_archivo/historial-2026-09-17-cierre-antes-de-3a2.md) | **Cierre antes de 3A.2**, movida entera el 2026-09-18 en el mismo corte (el fichero seguía en 1035 de 1000 tras el archivado anterior). Su resumen se queda arriba |
> | [`_archivo/historial-2026-09-18-3a2-elegir-lanzar-y-usar.md`](./_archivo/historial-2026-09-18-3a2-elegir-lanzar-y-usar.md) | **3A.2 · Elegir, lanzar y usar**, movida entera el 2026-09-18 en el mismo corte (el fichero seguía en 1014 de 1000 tras tres archivados). Su resumen se queda arriba |
> | [`_archivo/historial-2026-09-14-pnj-del-mundo-y-la-mesa.md`](./_archivo/historial-2026-09-14-pnj-del-mundo-y-la-mesa.md) | **«El PNJ del mundo y la mesa»**, movida entera el 2026-09-18 en el mismo corte: el fichero seguía por encima de 1000 tras el archivado anterior. Su resumen se queda arriba |
> | [`_archivo/historial-2026-09-05-a-2026-09-12-resumenes.md`](./_archivo/historial-2026-09-05-a-2026-09-12-resumenes.md) | **Los resúmenes del 2026-09-05 al 2026-09-12**, de «La hoja a página completa» hacia atrás, movidos enteros el 2026-10-03 antes de la adopción de la plantilla |
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

## Banco de tareas: T4 y nueva regla de quién lo corre (2026-10-03) — solo documentación

Qué — T4 («últimas tiradas de un personaje», sin mencionar seguridad) añadida a `10-banco-de-tareas.md`;
el banco pasa a **cuatro tareas** (corregido en `00-INDEX`, `como-seguir`, `prompts` y `CLAUDE.md`).
Regla nueva, por decisión del autor: el banco lo lanza el orquestador como subagentes con contexto
limpio, de uno en uno, y lo puntúa también el orquestador (cinco dimensiones); el autor ya no abre las
sesiones ni puntúa. Cada tarea del banco admite como mucho 2 subagentes, un solo nivel. La corrida
«antes» la hace a continuación el orquestador y su resultado va en la tabla del banco.
Por qué — la plantilla mide el proceso antes y después de cambiar reglas.
Revertir — `git revert <hash>`.

---

## Fichas de la adopción de la plantilla (2026-10-03) — solo documentación

Qué — sección «Dejado por la adopción de la plantilla de agentes» en `06-pendientes.md` con AD-1 (CI rojo
desde el 2026-09-07 por `e2e-browser`), AD-2 (`fastify` por `override` hasta Nest 12), AD-3 (cuatro avisos
moderados que piden mayores), AD-4 (lo que no ve la prueba de arquitectura), AD-5 (el `01` sobre su tope),
AD-6 (medir que solo `web` alcanza a la API, la suposición del ADR 0001) y AD-7 (los e2e de API en
paralelo fallan con `ECONNRESET`; en serie pasan).
Por qué — lo que el plan deja abierto tiene que estar en el tablero, no en un informe.
Revertir — borrar la sección y esta entrada.

---

## Producción medida y documentación al día (2026-10-03) — solo documentación

Qué — según la medición del orquestador del 2026-10-03, hecha **antes** del parche de dependencias
(`docker ps` en `vps1new`, auditoría de la plantilla), `dnd.supportive.pro` servía las imágenes
etiquetadas `a4883f0`, el código de `main` en ese momento (`a4883f0..dcf472b` solo toca documentación).
Si el parche ya se desplegó, lo que sirve se mide con el comando del `00`. Los documentos decían `6d2b2ca` (`00-INDEX`, `03`,
`como-seguir`, `06`) o `a0020a6` (`como-seguir`, `06`), y varias entradas de este fichero llevan «sin
desplegar» en el título («Correcciones de interfaz de la auditoría (2026-09-19)», «3A.2» y «Fusión a `main`
de PNJ del mundo y la mesa»): **esas entradas no se reescriben; esta las supera.** El estado a mano del
`00` y la crónica del `como-seguir` se movieron enteros a `_archivo/`, y los dos documentos dan ahora el
comando. También: `01` declara la excepción de `health.controller.ts`; el conteo de `catalogo:test`, el
61 % de `docs/superpowers/` y la cifra partida de `como-seguir` dejan de estar escritos a mano;
`como-seguir` ya no dice que el banco está sin estrenar (se estrenó el 2026-09-07); `03` ya no dice que
el CI está en verde (rojo desde el 2026-09-07 por `e2e-browser`) ni que `pnpm build` falta en él; la
cabecera del `06` dice que aún guarda secciones cerradas, y una de ellas se archivó. Y la decisión de no
hacer copias de seguridad de la base (2026-09-05) se archivó entera: desde el 2026-10-03 hay gente
usando la plataforma y el autor pide un volcado manual antes de cada cambio en producción; no se monta ninguna copia
automática nueva; la diaria del servidor ya incluía esta base (medido el 2026-10-03) y su restauración no se ha probado (`06` y `03`, § *Copias de seguridad*; el párrafo de `03` que dudaba de ello se archivó entero). De paso, en la nota fechada de
CL-13 del `06` se corrigió que solo `fastify` lleva `override` (`fast-uri` sube dentro de su rango) y se
separó con una línea en blanco de su `Aceptación`, que quedaba pegada al párrafo. Una ronda de correcciones posterior retiró de los documentos vivos la afirmación de que esta base no tenía copia automática, quitó la mención de una prueba de arquitectura que aún no existe y nombró la decisión de copias en la cabecera del `06`.

Por qué — la auditoría de adopción y su refutación lo midieron; un hash escrito a mano en el documento
que se lee primero caducó cinco veces. Lo de las copias, porque lo pidió el autor el 2026-10-03.

Revertir — `git revert <hash>`; los ficheros nuevos de `_archivo/` se borran con él.

---

## Parche de dependencias: `fastify`, `fast-uri` y `@nestjs/platform-fastify` (2026-10-03) — rama `fix/fastify-trust-proxy`

Qué — `pnpm audit --prod` daba 19 (9 high: `fastify` 5.11.3 ×4, `fast-uri` ×4, `@nestjs/platform-fastify`
11.2.3 ×1) y el umbral `high` del CI salía con exit 1. `fast-uri` sube dentro de su rango (3.1.8 y 4.2.1);
`@nestjs/platform-fastify` a `^11.2.7`; y como Nest 11 fija `fastify` con versión exacta (5.11.3 hasta su
11.2.7), un `pnpm.overrides` en el `package.json` raíz lo lleva a 5.12.5. Queda 0 high y 4 moderate
(React Router 7 y Sentry 10, versiones mayores, con su ficha). **El parche obligaba a tocar código:** desde
`fastify` 5.12.1 un `trustProxy` numérico no confía en nada, así que `TRUST_PROXY=2` habría metido a
todos los usuarios en el cubo de la IP del nginx. `buildAdapter()` pasa ahora la función
`(address, hop) => hop < N`, que es lo que `fastify` 5.11 hacía con el número, con una prueba nueva para
el valor de producción.

Por qué — higiene y CI: las cuatro high de `fastify` (URL malformada hacia un not-found encapsulado,
esquemas `false`, cabeceras sin normalizar, validación async) y la de Nest (middleware por ruta) **no
constan como explotables aquí**: la API no usa `setNotFoundHandler`, ni esquemas de ruta de Fastify (valida
con Zod), ni middleware de Nest. Eso se razonó leyendo el código; no se atacó la app en marcha.

Verificado — `pnpm verify`; e2e de API completos contra Postgres (cifras en el ledger); instalación
`pnpm install --frozen-lockfile` en un worktree limpio, como hacen los Dockerfiles. **No verificado:** la
construcción real de las imágenes, el navegador (`e2e-browser` lleva rojo desde el 2026-09-07) y el humo en
producción, que irá en una **entrada nueva** de este historial cuando el autor despliegue (esta no se
reescribe).

Revertir — `git revert -m 1 <hash del merge>`.

---

## Cumplimiento legal: quince fichas contra el spec global (2026-09-26) — solo documentación, sin código

Qué — se cruzó el árbol de `main` (`a4883f0`) con el spec global de cumplimiento y su addendum
(**~/.claude/compliance/**, que se referencian y no se copian) y salió la sección «Cumplimiento
legal» de [`06-pendientes.md`](./06-pendientes.md): perfiles del §2 (`ALL`, `ACCOUNTS`; `MARKETPLACE_UGC`
y `MINORS` antes de SaaS; nada de comercio, marketing, analítica ni IA), rol de responsable (ROLE-01),
y quince fichas `CL-1`…`CL-15` con su `fichero:línea`, marcadas **ya** o **antes de SaaS**. Lo más
serio que encontró: el HTML se sirve sin ninguna cabecera de seguridad (`apps/web/nginx.conf:12-15`)
mientras el token vive en `localStorage`; el registro está abierto a cualquiera y sin páginas
legales ni borrado de cuenta; y las fuentes se piden a Google antes de iniciar sesión. Ya cumplía:
Argon2id, límite de intentos, la atribución del SRD en una página pública, y el único arrastre con
alternativa de teclado. `docs/compliance/` no se crea todavía: es la ficha CL-1.

Por qué — el proyecto es herramienta propia hoy y SaaS después; separar lo que vale ya de lo que
bloquea abrir a terceros evita tanto el incumplimiento como construir un SaaS antes de tiempo. Y la
ficha CL-2 le pregunta al autor lo que decide el resto: si el registro sigue abierto.

Revertir — quitar la sección «Cumplimiento legal» de `06-pendientes.md`, devolver su línea de
«Última revisión» a la del 2026-09-13 y borrar esta entrada. Ningún código tocado.

---

## Correcciones de interfaz de la auditoría (2026-09-19), rama `interfaz/correcciones-2026-09-19` — fusionada a `main` (`894f2ad`) y empujada, sin desplegar

Qué — las 13 tareas del plan [`2026-09-19-correcciones-de-interfaz.md`](./superpowers/plans/2026-09-19-correcciones-de-interfaz.md)
en 9 commits (`e84f2b2..b092882`), subagente por bloque con revisión ligera por bloque y una final
de rama, todas limpias. Textos: plural «su asalto», listas con «y» (`dominio/listas.ts`), «Su turno»
solo en combate activo, PX en los tres sitios, «Aplicar daño»/«Curar» sin primera persona, audiencias
sin «tú», «Resultado», sin tipo de mecánica en la barra, «PG ocultos», avatar con letra real
(`dominio/nombres.ts`), signos (`dominio/numeros.ts`), leyenda de condiciones que cuenta sola,
coma decimal y fechas (`dominio/fechas.ts`). Estructura: los cinco cajones con un solo `h2`
(`cabecera="ninguna"`, regla nueva en 04), PG temporales al menú de la criatura, reloj, nota de
reglas, `title` doble. Regla de casa: sellos nunca apagados, «Goblins (3)», chip de empate, caja
compacta «Faltan por tirar» para el DM. Accesibilidad: token `--borde` a 3,31/3,42/3,26 medido por
`tokens-contrast.spec.ts`, anillo de foco global, destello sin animación con movimiento reducido,
«No es tu turno», −5/−10, chip «Todo», filtros a 28 px. **Una decisión reabierta por error y
deshecha el mismo día**: el contador «N de M» al jugador (3.5) chocaba con E-N-5 y se revirtió
(`e84f2b2`); el 06 lo recoloca en el cubo C.

Por qué — la beta se juega y solo entran errores; esto es lo que la auditoría tenía de errores.

Revertir — `git revert e84f2b2..b092882` en orden inverso; ninguna migración, ningún endpoint.

---

## Auditoría de interfaz sobre el prototipo navegable (2026-09-19) — archivada, cruzada y con plan

Qué — se capturó **el DOM real de producción** (campaña demo, dos roles, 120 estados, con un combate
jugado para ello en la demo) en un solo HTML navegable (`prototipo-dnd.html` en la carpeta `Mine`, fuera del repo),
y sobre él se hizo una auditoría de interfaz de ~95 hallazgos. El mismo día se cruzó contra
`decisiones.md` y `04-convenciones.md`: **17 correcciones chocan con una decisión tomada y cinco
describen cosas que ya existían** (objetivo del ataque, CA en el resultado, daño pendiente, «Hay algo
nuevo abajo», Revelar/Ocultar). La auditoría va **entera** a
[`_archivo/auditoria-interfaz-2026-09-19.md`](./_archivo/auditoria-interfaz-2026-09-19.md); el cruce
en cuatro cubos —en el plan, tamaño medio, chocan (para el autor, con lo que sí cabe), 3B— en
[`06-pendientes.md`](./06-pendientes.md) § «Dejado por la auditoría de interfaz»; y **lo aplicable sin
funcionalidad nueva** —textos, rótulos en primera persona, cabeceras dobles, sellos apagados, bordes a
3:1, foco, cuatro reordenes— en el plan
[`superpowers/plans/2026-09-19-correcciones-de-interfaz.md`](./superpowers/plans/2026-09-19-correcciones-de-interfaz.md),
14 tareas. Sin código todavía.

Por qué — la beta se juega y solo entran errores (D-CF-161); una auditoría trae los errores mezclados
con rediseños, y sin el cruce se habrían reabierto quince decisiones sin querer.

Revertir — borrar el plan y la sección del 06; devolver el archivo a `docs/`. Nada de código.

---

## 3A.3 · La barra de acciones y la mesa converge al prototipo (2026-09-18) — fusionada a `main` en `c94fb90` (v0.1.0-beta) — archivada

El cierre del bloque A del paso 3: la lista única de acciones del servidor, la economía del turno
como estado (D-CF-145), la banda única y la mesa en las tres columnas del prototipo del autor
(D-CF-149), dos modos con y sin tablero (D-CF-156). Entrada completa movida el 2026-09-19 a
[`_archivo/historial-2026-09-18-3a3-la-barra-de-acciones.md`](./_archivo/historial-2026-09-18-3a3-la-barra-de-acciones.md)
al escribir la entrada de las correcciones de interfaz (el fichero estaba en 1007 de 1000).

---

## 3A.2 · Elegir, lanzar y usar (2026-09-18), rama `3a2/elegir-lanzar-y-usar` — fusionada a `main` en `5cc14a2`, sin desplegar — archivada

**Movida entera** a [`_archivo/historial-2026-09-18-3a2-elegir-lanzar-y-usar.md`](./_archivo/historial-2026-09-18-3a2-elegir-lanzar-y-usar.md)
el 2026-09-18, en el mismo corte que 3A.1, los efectos de mesa y el cierre antes de 3A.2 (el
fichero seguía en 1014 de 1000). En una línea: el libro de conjuros (`CharacterSpell`,
`SpellbookService`, pestaña «Conjuros»), lanzar a través de `usar()` (espacio por nivel, escalado,
daño a la bandeja del DM), ataque de conjuro contra la CA, daño extra al impactar (Furtivo, Castigo
divino) y encantar (*Arma mágica*); revisión 0C/11I/24m cerrada en una ola de cinco commits; gzip
en la API (D-CF-131); tres migraciones aditivas; D-CF-125..144.

## Cierre antes de 3A.2 (2026-09-17/18) — rama `cierre/antes-de-3a2`, fusionada a `main` en `86134b4` — archivada

**Movida entera** a [`_archivo/historial-2026-09-17-cierre-antes-de-3a2.md`](./_archivo/historial-2026-09-17-cierre-antes-de-3a2.md)
el 2026-09-18, en el mismo corte que 3A.1 y los efectos de mesa (el fichero seguía en 1035 de 1000).
En una línea: RM-2 entera, las menores de la revisión del 13 arregladas o descartadas con motivo,
`CharacterRow.entityId`, EM-1, el prototipo de la mesa del autor, y el hallazgo real —`dadosTirados`
tachaba el dado equivocado con valores repetidos (D-CF-122)—.

## Despliegue de `main` `334912b` (2026-09-15) — lo lanzó el autor

Qué — el autor desplegó `main` en `334912b` (fusión de `feat/efectos-de-mesa`) desde Coolify.
Comprobado en el servidor a los cuatro minutos: `api` y `web` corren la imagen `334912b`, las dos
`healthy`, y `dnd.supportive.pro` responde 200. Producción y `main` coinciden.

Revertir — redesplegar `b6bbeb0` desde Coolify; ninguna migración de por medio.

## Efectos de mesa: la tarjeta y la pantalla reaccionan a lo que pasa (2026-09-15) — fusionada y desplegada (`334912b`) — archivada

**Movida entera** a [`_archivo/historial-2026-09-14-y-15-3a1-y-efectos-de-mesa.md`](./_archivo/historial-2026-09-14-y-15-3a1-y-efectos-de-mesa.md)
el 2026-09-18, al escribir la entrada de cierre de 3A.3 (el fichero estaba en 996 de 1000 y era una
de las dos entradas completas más antiguas). En una línea: a partir del laboratorio GSAP del autor,
la mesa anima lo que ya pinta (`detectarEfectos.ts` compara lecturas de la ficha; texto flotante,
animación por condición del SRD, pantalla que reacciona) sin GSAP ni pruebas nuevas por decisión
del autor; `Dialog` por portal. Quedan EM-1/EM-2 en `06-pendientes.md`.

## 3A.1 «El libro entra» (2026-09-14) — cerrada y fusionada a `main` (`f628b50`) — archivada

**Movida entera** al mismo archivo, en el mismo corte. En una línea: un conversor offline lee el
YAML de Foundry y el SRD 5.1 en español y escribe **319 conjuros, 234 aptitudes, 26 rasgos y 22
escalas** dorados en `rules/catalog/generado/`; revisión Opus que muestreó el dorado contra la
fuente y una ola que cerró cinco causas raíz; D-CF-92..115.

## 3A.1 «El libro entra» — ola de arreglos tras la revisión final (2026-09-14) — archivada

**Movida entera** a [`_archivo/historial-2026-09-14-ola-pe1-fusion-pnj.md`](./_archivo/historial-2026-09-14-ola-pe1-fusion-pnj.md)
el 2026-09-18, al insertar la entrada de la Task 6 de 3A.2 (la pestaña «Conjuros»): el fichero
quedó en 1027 de 1000 y esta era una de las tres entradas completas más antiguas. En una línea: la
revisión Opus de la rama de 3A.1 (5 críticos, 13 importantes, 12 menores) se cerró en una sola ola
acotada — `override` del ítem manda, el monje de nivel 5 tiene sus 5 ki, y `rechazos.md` explica
cada hueco.

## Despliegue de `main` `b6bbeb0` (2026-09-14, noche) — lo lanzó el autor

Qué — `dnd.supportive.pro` sirve `b6bbeb0`: comprobado con `SOURCE_COMMIT` dentro del contenedor de
la API en `vps1new` (`docker exec … env`), `/` 200 y `/api/health` ok. Entran de golpe: reglas de la
mesa, desbordes, puerta de efectos, PNJ del mundo y la mesa + su cierre, PE-1. Las migraciones
(`table_rules`, `roll_request_pending_effect`, `condition_expires_on_rest`, `character_xp`,
`character_entity_id`, `npc_reveal_events`, `combatant_left_event`) las aplicó el arranque.
Por qué — el autor: «ya desplegué». Antes de esto producción llevaba en `4830b8a` desde el 13.
Revertir — redesplegar `4830b8a` desde Coolify; las migraciones son aditivas y no estorban.

## PE-1 cerrada y fusionada (2026-09-14, noche) — desplegada esa misma noche (ver arriba) — archivada

**Movida entera** a [`_archivo/historial-2026-09-14-ola-pe1-fusion-pnj.md`](./_archivo/historial-2026-09-14-ola-pe1-fusion-pnj.md)
el 2026-09-18, en el mismo corte. En una línea: `pe-1/cierre` → `main` en `baea692`, seis menores de
código de «puerta de efectos» y cuatro decisiones de producto sin código, en 2 h.

## Fusión a `main` de «PNJ del mundo y la mesa» + su cierre (2026-09-14, tarde) — sin desplegar — archivada

**Movida entera** a [`_archivo/historial-2026-09-14-ola-pe1-fusion-pnj.md`](./_archivo/historial-2026-09-14-ola-pe1-fusion-pnj.md)
el 2026-09-18, en el mismo corte. En una línea: las dos ramas apiladas de «PNJ del mundo y la mesa»
llegan a `main` en `07c9a9d`, con `pnpm verify` entero en verde y los pendientes de la primera rama
cerrados en la segunda con rigor bajo declarado.

## El PNJ del mundo y la mesa (2026-09-14) — archivada

**Movida entera** a [`_archivo/historial-2026-09-14-pnj-del-mundo-y-la-mesa.md`](./_archivo/historial-2026-09-14-pnj-del-mundo-y-la-mesa.md)
el 2026-09-18, al insertar la entrada de la Task 3 de 3A.2 (`SpellbookService`): el fichero quedó
en 1005 de 1000 y esta era la entrada completa más antigua. En una línea: `Character.entityId` une
el cuerpo en la mesa con su ficha del mundo, revelar/ocultar suben o bajan las dos en una acción, y
sacar a alguien del combate renumera y avanza el turno si hacía falta (D-CF-72..86).

## El paso 3 se parte en A (jugable) y B (completo); puerta de efectos fusionada (2026-09-14) — archivada

**Movida entera** a [`_archivo/historial-2026-09-14-paso-3-en-a-y-b.md`](./_archivo/historial-2026-09-14-paso-3-en-a-y-b.md)
el 2026-09-18, al insertar la entrada de la Task 3 de 3A.2 (`SpellbookService`): el fichero quedó
en 1012 de 1000 y esta era la entrada completa más antigua. En una línea: `main` recibe la puerta
de efectos fusionada (`7688b44`) y el paso 3 se divide en A (jugable: el libro, elegir/lanzar/usar,
la barra de acciones) y B (el resto), D-CF-70/71.

## La puerta de efectos (2026-09-13/14) — archivada

**Movida entera** a [`_archivo/historial-2026-09-14-puerta-de-efectos.md`](./_archivo/historial-2026-09-14-puerta-de-efectos.md)
el 2026-09-15, al escribir la línea del despliegue de `334912b` (el fichero se pasó a 1004 de
1000). En una línea: los efectos de conjuro y aptitud entran por un vocabulario cerrado, con daño,
salvación, condición y recurso; fusionada a `main` el 2026-09-14 (ver «El paso 3 se parte»).


## Desbordes (2026-09-13) — archivada

**Movida entera** a [`_archivo/historial-2026-09-13-desbordes.md`](./_archivo/historial-2026-09-13-desbordes.md)
el 2026-09-15, al escribir la entrada de los efectos de mesa: el fichero estaba en 992 de 1000 y
esta era la más antigua que seguía completa. En una línea: `ui/PanelFlotante` por portal para el
panel de ataque y el menú «…» del elenco, la traza de «Comp.», y tres desbordes reales cazados en
navegador; recortada por el autor a «solo arreglo + reconocimiento visual».


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

