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
> | [`_archivo/historial-2026-09-05-nervio-en-vivo.md`](./_archivo/historial-2026-09-05-nervio-en-vivo.md) | **La entrega del canal en vivo** (plan 12 · 12.3), movida entera el mismo 2026-09-08: la entrada del reconocimiento creció al recoger los tres documentos de estado que también mentían, y el fichero volvió a pasarse. Era la siguiente entrada completa más antigua. **No confundirla con su hermana**, que sigue arriba: aquella es la comprobación en producción detrás de nginx y Traefik. Su hito se queda arriba
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

## Cerrar fichas, tanda de las decididas — con código (2026-09-11)

Las fichas que el autor decidió el 2026-09-10 y llevan código; una por commit, prueba roja antes y
mutación. Texto y medición en
[`_archivo/pendientes-cerrados-2026-09-10.md`](./_archivo/pendientes-cerrados-2026-09-10.md).

- **R1** — el límite global cuenta por usuario con sesión iniciada y por IP sin ella
  (`common/user-or-ip-throttler.guard.ts`, `AuthModule` exporta `JwtModule`). **Por qué:** cinco
  jugadores por una VPN eran una IP. **Revertir:** volver a `ThrottlerGuard` en `APP_GUARD`.
  **Lección:** la primera prueba de «token falso» no cazaba la mutación `verify → decode` porque
  todos los tokens llevaban el mismo `sub`; una prueba que no se ve fallar con el mutante no
  prueba nada.
- **P3 · archivar en la mesa** — el hilo de una sesión incluye los sucesos de campaña sin sesión
  entre su inicio y su cierre (`game-events.service.ts`, `list`; D-CF-19 con el tope que puso la
  revisión). `/rolls?sessionId=` se ensancha igual. **Revertir:** volver al filtro estricto por
  `sessionId`. Primera tarea ejecutada por subagente en esta sesión: implementador Sonnet, revisor
  Opus, una ronda de arreglo.
- **Tanda 4 (d)** (un lote, tres fichas): `viewerFor` vive una sola vez en `common/` y una prueba
  barre las copias (P4); y las frases de visibilidad salen de una matriz declarada en
  `@dnd/shared` (`QUIEN_VE`) que una prueba de la API compara con `canView` caso a caso (U10 y
  H11). **Revertir:** las copias no vuelven solas — es un `git revert`; la matriz se puede quitar
  dejando las frases.
- **Tanda 4 (c)** (un lote, dos fichas): `NOTIFY` del motor llega a la bandeja como `RULE_NOTIFY`
  (N3-notify), y cambiar la contraseña devuelve un token fresco con `iat` = segundo del cambio + 1,
  que vale al instante sin aflojar la regla del empate (1.18a). **Revertir:** quitar el caso
  `NOTIFY`; volver a `{ success }` y al cierre de sesión en la pantalla.
- **Tanda 4 (b), inventario** (un lote, dos fichas): la cantidad se ajusta por delta con
  `increment` (M2B-8, la carrera de las flechas), y equipar devuelve la CA nueva en la misma
  respuesta (M2B-11, adiós a `fetchAc` antes y después). **Revertir:** quitar `quantityDelta`
  del esquema; volver a las tres peticiones en el hook.
- **Tanda 4 (a), motor** (un lote, dos fichas): aviso `armor_not_proficient` con su frase (I6,
  SRD 5.1 *Armor Proficiency*), y «estable» sobrevive a la petición como condición reservada
  `stable` que el daño o la curación retiran (H1b, SRD 5.1 *Stabilizing a Creature*).
  **Revertir:** quitar la emisión del aviso; quitar la condición y volver al `status` derivado.
- **Tanda 3, herramientas** (un lote, dos fichas): `ts-jest` deja de avisar por los `.js` de
  `shared/dist` y `postcss.config` pasa a `.mjs`; `pnpm db:slot` funciona en una ruta con `&`
  (sin `shell`, `execFileSync` sobre el CLI de Prisma). **Revertir:** una pieza cada uno.
- **Tanda 3, web sueltas** (un lote, seis fichas): el comentario de `posiciones.ts` señala el
  anillo; `resolverCitas` ordena por `createdAt` ella misma; la prueba de `SessionEditor` afirma
  la pérdida de segundos en vez de pasar por coincidencia; `CreateCampaignModal` pinta
  `mutation.error`; el flash de «se cerró tu sesión» se limpia al salir de la pantalla; un 500 en
  el detalle de campaña dice «no se pudo cargar» con «Reintentar»; y las etiquetas de nivel viven
  una vez en `visibilidad.ts` (U6-visibilidad). **Revertir:** cada una es un cambio de una pieza.
- **Tanda 2, contrato compartido** (un lote, cuatro fichas): el sello vacío se rechaza
  (`stampSessionNoteSchema`); la fecha de una sesión se puede quitar (`scheduledAt: null` en el
  `PATCH`, `SessionEditor` lo manda al vaciar); los dos esquemas de consulta viven en
  `@dnd/shared` (S12, sin excepción declarada); y **«Almádena» era «Mazo de guerra»** en el SRD
  5.1 en español (I1, Nosolorol/Ana Navalón; los otros tres nombres eran correctos). **De paso,
  la revisión encontró y se cerró en la misma ronda:** un `POST` de sesión con `scheduledAt:
  null` se guardaba como 1970 (`coerce` sobre `null`); ahora crear también admite `null` como
  «sin fecha». **Revertir:**
  cada uno es un cambio de una pieza; el de S12 es una mudanza inversa.
- **E0 · TipTap** — los seis paquetes `@tiptap/*`, el lock y el script E0 de ida y vuelta (`scripts/e0-tiptap-roundtrip.mjs`, borrado) <!-- docs-lint-ignore -->
  salen (D-CF-12); una prueba impide que vuelvan sin decisión. **Revertir:** `git revert`.
- **P6 · Node 22** — los cuatro pines a 22 y una prueba que los mantiene iguales (D-CF-13).
  **Revertir:** los cuatro pines a 20 (y la prueba). Las imágenes se reconstruyen en el siguiente
  despliegue, que lanza el autor.
- **H7** — rearmar una regla sin tocar sus efectos revalida los guardados: contra una ficha
  borrada es 400 (`rules-engine.service.ts`, `update`). **Revertir:** quitar la rama de
  `status === "ARMED"` sin `effects`.
- **M2B-14** — **no se cierra con código: se cierra como decisión** (D-CF-22). Un *Weapon +1* del
  SRD no es un objeto sino una plantilla sobre un arma base —encantar, paso 3—, y el DM ya crea
  «Espada larga +1» como objeto de campaña con `weaponAttack`/`weaponDamage`. La recomendación
  del día anterior («cinco filas») estaba mal medida.
- **D8** — la contraseña olvidada la reinicia un administrador con una temporal
  (`POST /admin/password-resets`, `AdminGuard`, bloque en «Cuenta» solo para `isAdmin`, que ahora
  viaja en `/auth/me`). Sin correo. Recorrido real con dos navegadores en `admin-reinicio.spec.ts`.
  **De paso, `09-jugar.md` mentía en tres sitios** —«no hay segundo DM», «no se puede revocar una
  invitación», «perder la cuenta del DM deja la campaña sin nadie»— desde el plan 11; corregidos.
  **Revertir:** quitar `AdminController` del módulo y el bloque de `AccountPage`; `isAdmin` en
  `AuthUser` puede quedarse.

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

## Tanda corta — los seis arreglos que dejó abiertos el paso 2 (2026-09-07)

**Qué.** Seis fichas de [06-pendientes.md](./06-pendientes.md) cerradas en seis commits, cada una
con su prueba escrita **antes** del arreglo, corrida en rojo, y **verificada por mutación**:
revirtiendo el arreglo pieza a pieza y comprobando que la prueba enrojece **por la aserción que
tenía que enrojecer**, no solo que enrojece. Nueve mutaciones en total sobre las seis tareas.

| Ficha | Qué se arregló |
|---|---|
| **P2-0** | `ConditionsService.apply` recibía un `tx` y lo usaba solo para escribir: `requireVisibleCharacter` e `inmunidadesDe` iban por el pool. `viewerFor` / `requireVisibleCharacter(WithViewer)` (`common/character-viewer.ts`) y `StatblocksService.resolver` aceptan ahora el mismo cliente opcional |
| **P2-0b** | Lo mismo un piso más abajo: `construirODenegar` reenviaba el `tx` solo a `hojaOMotivo`. `equipoEquipado` y `viewerFor` no declaraban siquiera el parámetro; ahora lo declaran, y los tres llamadores que ya corrían dentro de una transacción le pasan el suyo |
| **P2-6** | `ActivitiesService.consumir` leía con `findUnique` y escribía con `update`: tres usos simultáneos de la Furia leían los mismos 3 y escribían los mismos 2. Ahora toma `SELECT … FOR UPDATE`, el mismo candado que `changeHp` ya usaba a un metro |
| **A11-usos-sin-tope** | `max: null` («Unlimited» en el SRD) no significaba nada: `RestService` no reponía esas filas y `consumir` las gastaba de un contador finito. Las dos miran ahora `max === null` **antes** que `current`. El marcador se queda —`ResourcesService.adjust` sigue moviendo `current` a mano— y su nota lo dice en vez de afirmar que nadie lee el `null` |
| **P2-7** | Los dos guardianes que no sujetaba nadie: que un `entrega` malformado no rompa la tirada (era `entregaSchema.safeParse`, verificado solo por ejecución), y que `record()` **rechace** una clave que su esquema no conoce en vez de descartarla en silencio, que es lo que hace `.parse()` de Zod |
| **P2-3** | «Dar…» abría el cajón sin destinatarios para quien maneja un PNJ: el selector se construía solo con `fetchCharacters`, que filtra `statblockRef: null` a propósito. Ahora suma la lista de PNJ (`GET /npcs`, filtrada por `canView` en el servidor), con **el mismo filtro para las dos** |

**Cómo se verificó.** `pnpm verify` en verde en cada commit (lo exige el gancho). Además: **toda la suite de e2e de API** entera para el guardián estricto de `record()` —era el cambio que podía
romper a cualquier llamador, y no rompió a ninguno— y **una sola tanda de Playwright**, la de
P2-3, con la API precompilada antes de lanzarla.

**Lo que NO entró, y está anotado en vez de arreglado.** Cuatro fichas nuevas en
[06-pendientes.md](./06-pendientes.md): **P2-8** (`buildResponse` sigue leyendo por el pool dentro
de la transacción de `changeHp` — el mismo defecto que P2-0b, un tramo más abajo), **P2-9** (**no
existe ninguna puerta para ceder un PNJ a un jugador**, así que el caso que P2-3 nombra no se puede
montar usando el producto y su recorrido de navegador mide la otra mitad del mismo carril) y
**P2-10** (dos pruebas que se pasan del tiempo por defecto solo cuando la suite entera corre junta,
y cuyo rojo parece un defecto del cambio recién hecho). La cuarta es la medición que faltaba en el
cuerpo de **P2-0**: tres de las seis consultas de `apply` siguen yendo por el pool porque
`MembershipService` no acepta un cliente.

**Cómo revertir.** Los seis commits son independientes entre sí salvo P2-0b, que se apoya en el
`tx?` que P2-0 añadió a `character-viewer.ts`. Revertir uno solo no deja el árbol roto; revertir
P2-0 sin revertir P2-0b, sí.

---

## Paso 2 — la actividad, sus cinco formas y la economía de la mesa (2026-09-06/07)

**Qué.** Las once tareas del plan [`2026-09-06-paso-2-actividad.md`](./superpowers/plans/2026-09-06-paso-2-actividad.md),
en nueve commits de tarea —dos de ellos juntan dos tareas cada uno (9+10 y 3+11)— más dos commits
de corrección de sus e2e: la economía de acciones del combate (`Combatant.actionUsed/bonusUsed/reactionUsed/movementUsed`,
repuesta al empezar el turno de quien entra); `Origen`, un número que nunca miente sobre su
procedencia; las cinco actividades del SRD (`ataque`, `salvacion`, `dados`, `utilidad`, `prueba`)
con su propio `dados`; usarla gastando por las puertas que ya existían (`changeHp`,
`RollRequestsService.create`, `ConditionsService.apply`, con el patrón `tx?` extendido a los
tres — con un hueco real que quedó abierto en uno de ellos, ver
[06-pendientes.md](./06-pendientes.md)); una subclase por personaje y no todas a la vez; conceder
una actividad desde el catálogo con sus usos y sus escalas; y la Furia de punta a punta, con la
economía visible en la mesa.

**Por qué.** Un mago sigue sin hechizos hasta el paso 3, y este paso existía para que quepan: la
tarea 0 mapeó diez conjuros a mano contra el borrador del plan y ocho no cabían, así que el esquema
se corrigió antes de escribir código (D-P2-1 a D-P2-6 en [decisiones.md](./decisiones.md)).

**Cómo se comprobó.** Trece de trece tareas de la tanda con implementador —contando también el
plan botín, más abajo, y sin contar la tarea 0, que fue papel sin implementador— mordieron algo
real en su primera revisión con contexto limpio; ninguno de los hallazgos lo vio quien implementó. Los tres más graves de este plan: una fuga por 403 en `gastar` sobre un PNJ
escondido; `raging` interpretada por el servidor sin estar en la lista de claves reservadas —un
jugador se llevaba +2 de daño permanente gratis—, reincidencia exacta del agujero que se cerró para
`helped`; y un interbloqueo real en el orden de los candados de `changeHp`. Detalle completo, tarea
a tarea, en el bloque «Avance» del plan y en `.superpowers/sdd/2026-09-06-tanda-paso2-y-botin/progress.md`
(local, no viaja con el clon).

**Cómo revertir.** Once commits independientes de `2bd7769` a `2228341`/`8d4de37`
(`git log --oneline 7e7f92b..HEAD`); revertir uno deshace su tarea. Dos llevan migración:
`combatant_action_economy` (las cuatro columnas de `Combatant`) y `character_subclass`
(`Character.subclassKey`) — revertir el código deja las columnas sin escritor, sin dato que
perder. **`character_subclass` tiene efecto sobre datos ya en producción**: un personaje de nivel
≥ `chosenAtLevel` pierde los rasgos de su camino hasta que alguien elija uno, que es el arreglo y no
una regresión — ver [05-datos.md](./05-datos.md). Nueve fichas de deuda quedaron abiertas en
[06-pendientes.md](./06-pendientes.md), la más urgente antes del paso 3 siendo la autorización de
`changeHp` y de `RollRequestsService.create` sobre actividades de otro personaje.

## Botín y reparto — una tabla entrega, y decir quién dio (2026-09-06)

**Qué.** Cinco tareas del plan [`2026-09-06-botin-y-reparto-plan.md`](./superpowers/plans/2026-09-06-botin-y-reparto-plan.md),
en tres commits: una fila de `DmTable` puede llevar `entrega` (objetos por `ContentRef` y las cinco
monedas), y tirarla devuelve esos objetos ya resueltos por nombre; dar un objeto o dinero dice
**quién** lo dio, con un campo opcional `de` sobre los sucesos que ya existían; y «Dar…» se hace
desde la mesa y desde el resultado de una tirada, sin abrir la ficha de quien recibe.

**Por qué.** La premisa del plan —«hoy un objeto aparece en una bolsa y nadie sabe de dónde
salió»— era falsa: el rastro (`ITEM_ADDED`, `MONEY_CHANGED`) ya existía, y no hacía falta un tipo
de suceso nuevo (D-P2-7). Y lo que la mesa decide, la mesa decide: no hay «dar a todos», ni
repartir oro a partes iguales, ni comercio — las dos primeras las cubre una prueba de ausencia;
el comercio no se construyó, así que no hay pantalla de la que medir su ausencia.

**Cómo se comprobó.** Un `catch` que tragaba cualquier fallo de Postgres y lo presentaba como «ese
objeto ya no existe» dentro de la transacción del disparo automático, borrando la pista del error
real. Nueve mutaciones de aflojamiento sobre el campo `entrega`, las nueve en verde antes del
arreglo. Y una clave de catálogo inventada (`shortsword`, que no existe — es `short-sword`) citada
tres veces por un encargo del orquestador y corregida las tres contra el catálogo real.

**Cómo revertir.** Tres commits (`eaa333e`, `cbbfebf`, `c36a099`), independientes entre sí y del
paso 2. `eaa333e` lleva la migración `dm_table_entry_loot` (columna `entrega Json?`); revertir el
código deja la columna sin escritores, sin fila sembrada fuera de las pruebas que la use. Dos
fichas quedaron abiertas: el formulario de crear tablas no tiene campo para redactar `entrega`, y
un jugador con un PNJ cedido ve la lista de destinatarios vacía al abrir «Dar…».

---

## Poda del tablero, y una página que dice por dónde entrar (2026-09-06)

**Qué:** las **tres fichas que llevaban «Cerrado» en su propio título** salen de
[06-pendientes.md](./06-pendientes.md) a
[`_archivo/pendientes-cerrados-2026-09-06-poda.md`](./_archivo/pendientes-cerrados-2026-09-06-poda.md),
**enteras y sin tocar una coma**. Y se añade [como-seguir.md](./como-seguir.md), que dice qué
andamiaje ya está puesto —para que nadie lo vuelva a montar—, qué sigue y en qué orden, y qué no
decide un agente.

**Por qué solo tres:** la regla del tablero es mecánica —lo cerrado sale, lo abierto se queda— y
solo tres cumplían el criterio de forma comprobable. Quedan dos docenas de secciones fechadas
antes del 2026-09-04 y varias **sin fecha en el título**, pero saber cuál sigue viva **no se
deduce del código**: es del autor, y forzarlo habría sido enterrar deuda en vez de podarla. El
criterio y las candidatas están en el punto 1 de `como-seguir.md`.

**Dos de las tres archivadas explican un error de medición** —una ficha afirmaba que nadie podía
curar a nadie, y el grep que lo hizo creer— y por eso se archivan en vez de borrarse: ese registro
es lo que evita volver a creérsela.

**Cómo revertir:** devolver las tres secciones del fichero de archivo a `06-pendientes.md` y
borrar `docs/como-seguir.md` con sus dos punteros.


## `CLAUDE.md` deja de narrar el estado (2026-09-06)

**Qué:** el fichero que se manda leer primero pierde sus ~40 líneas de prosa de estado —qué trae
cada fase, qué imagen sirve producción, qué separa `main` del despliegue— y las sustituye por una
tabla que dice **dónde vive cada dato de verdad**: el bloque generado de
[00-INDEX.md](./00-INDEX.md) para estado y conteos, este fichero para lo entregado,
[06-pendientes.md](./06-pendientes.md) para lo abierto, y **una medición** —`git diff` contra la
imagen desplegada— para saber qué falta por desplegar. Se queda lo que sigue siendo cierto
mañana: qué es el producto, qué no es, y las reglas.

**Por qué:** ese fichero **caducó tres veces en cinco días**, y las tres se anotaron dentro de él.
Una de ellas lo dice con todas las letras: *«es el mismo fallo de siempre: prosa de estado escrita
a mano en el fichero que se manda leer primero»*. El repositorio ya tenía la solución a medias
—`update-estado.mjs` genera el bloque de `00-INDEX` y `check:estado` falla si alguien lo edita—
pero `CLAUDE.md` estaba fuera de su alcance, así que ahí el estado se seguía tecleando.

**Los tres avisos no se borran.** Se mueven **enteros y sin reescribir** a una sección al final,
como justificación de la regla: un registro fechado no se resume. Y `D-OP-3` —la partida de
prueba que cierra la fase 2— no se pierde: vive en [00-INDEX.md](./00-INDEX.md) y en
[decisiones.md](./decisiones.md), que son sus sitios.

**Cómo revertir:** `git show` del commit anterior a este sobre `CLAUDE.md`. No toca código.


## El cero de tipos comodín deja de depender de la costumbre (2026-09-06)

**Qué:** `no-explicit-any` pasa de **aviso heredado** a **error** en `apps/api/src`,
`apps/web/src` y `packages/shared/src`. Las pruebas siguen exentas, con el motivo que ya estaba
escrito.

**Por qué:** la medición del día contradijo a la sospecha. Se auditó el repositorio esperando
encontrar la regla apagada y deuda escondida, y lo que hay es **cero** comodines en código de
aplicación: la excepción de `eslint.config.mjs` estaba acotada a las pruebas desde el principio.
Lo que no había era nada que **sostuviera** ese cero — un aviso no frena un commit, y
`pnpm verify` pasa con avisos. Poner en error una regla que hoy da cero cuesta cero y convierte
una costumbre en una propiedad comprobada.

**Verificado por mutación:** se añadió `(x: any) => x` en un fichero de la web, `eslint` lo
rechazó **como error** —no como aviso— y se restauró.

**Cómo revertir:** quitar el bloque de reglas nuevo de `eslint.config.mjs`. No toca ni una línea
de código de aplicación.


## El proceso pasa a medirse, y la frontera del encargo deja de ser solo de ficheros (2026-09-06)

**Qué:** cuatro cosas, todas documentación y ninguna toca comportamiento.

1. **Los cuatro pasos antes de abrir una ficha son regla del repositorio**, en
   [04-convenciones.md](./04-convenciones.md), con **la frontera** de cuatro casos en los que el
   paso 1 no aplica. Hasta hoy vivían solo en los prompts de arranque, fuera del repositorio.
2. **La frontera del encargo pasa a ser también de herramientas**: bloque de prohibiciones
   obligatorio, superficie mínima por rol, y la comprobación de que lo prohibido no ocurrió.
3. **Tabla de observabilidad de la tanda** en el ledger: vueltas por tarea, qué encontró la
   revisión, tiempo perdido y en qué.
4. **[10-banco-de-tareas.md](./10-banco-de-tareas.md)** y **[prompts.md](./prompts.md)**: tres
   tareas fijas que miden si un cambio del proceso mejora o empeora, y los prompts que hasta hoy
   vivían en la carpeta de al lado.

**Por qué:** este repositorio tiene la puerta más completa de los tres del PC —siete pasos en
`verify`, conteos generados, seis reglas de lint de documentación—, pero **el proceso que escribe
ese código se seguía ajustando por intuición**: cada regla nacía de un golpe real y ninguna se
contrastó nunca contra una tarea repetible. Y la frontera del encargo declaraba rutas pero no
herramientas, así que un implementador acotado a `apps/api` seguía pudiendo desplegar, empujar o
lanzar una segunda tanda de Playwright encima de la primera — que es justo lo que ya costó 82
fallos falsos.

**Las tres tareas del banco salen de fallos ya pagados aquí:** la prosa de estado caducada del
fichero que se lee primero, la prueba que hay que ver fallar antes de tocar `normalizar`, y
`jsdom` dando 871 pruebas verdes con la mesa rota.

**Cómo revertir:** quitar las tres secciones nuevas de `04-convenciones.md`, borrar
`docs/10-banco-de-tareas.md` y `docs/prompts.md`, y sus filas en `00-INDEX.md` y `CLAUDE.md`.


## Paso 1 · Las goteras — los números dejan de mentir (2026-09-06, en curso)

**Qué se entrega.** El plan [`2026-09-06-paso-1-goteras.md`](./superpowers/plans/2026-09-06-paso-1-goteras.md),
tarea a tarea. El avance vivo, con el commit de cada una, está en el bloque «Avance» de ese
plan; aquí solo el hito. **Cómo se revierte:** cada tarea es un commit independiente y ninguna
depende de la anterior salvo las que el plan declara (2, 3 y 4 sobre el fichero de la 1).

- **La tanda de navegador cierra con dos recorridos nuevos y una ficha.** De los cuatro escritos,
  crear un recurso y la medición del botón de la bolsa pasan y se quedan; los de las tareas 11 y 12
  **parpadean** —verde y rojo en pasadas seguidas sobre el mismo código— y no se commitean, con lo
  medido escrito en `docs/06-pendientes.md`. La 12 sí queda probada por el lado del servidor.
  **Y la suite existente no está rota:** en cinco pasadas fallaron ficheros distintos cada vez y
  todos pasaron solos después — el falso rojo por carga que `08-pruebas.md` ya documenta.

- **Tarea 11 · un pícaro con dos dagas no existía.** La pantalla del inventario **no mandaba
  `slot` al equipar** —grep de `slot` en ese fichero: cero—, aunque el servidor lo acepta desde 2B
  y el motor lo usa para la mano ocupada y para el arma ligera de la izquierda. Equipar un arma
  pregunta ahora la mano con **radios**, y cuando una no está disponible —un arma a dos manos— **se
  escribe el motivo** en vez de dejarlo adivinar. Lo que no es un arma se equipa sin preguntar:
  sería un paso que no decide nada. **Cómo se revierte:** el commit.

- **Tarea 10 · no se podía crear un recurso desde la aplicación.** La ruta existía desde 2A y la
  web llamaba a `/spend`, `/give` y `/restore` y **nunca al `PUT`**: se podía gastar, regalar y
  reponer un recurso y no crearlo, y como la siembra solo pone dados de golpe y espacios de
  conjuro, **una fila «Furia» no podía existir** — ni con ella ninguna aptitud con usos, que es la
  única puerta por la que entrarían hoy sin tocar el motor. El formulario pone `resetOn` en
  **radios con su frase** —tres opciones con significado no se esconden en un desplegable— y las
  frases viven una sola vez, en el vocabulario del dominio. **Cómo se revierte:** el commit.

- **Tarea 15 · un PNJ cedido a un jugador no se podía manejar desde su pantalla.** El servidor ya
  lo trataba por dueño —`requireEditable` le deja cambiarle los PG y ponerle condiciones—, y la
  interfaz era más restrictiva **solo porque `ownerId` no viajaba**: no había de dónde leer «es
  tuyo», así que un jugador no podía anotarle el golpe que acababa de recibir sin pedírselo al DM.
  **Esconder el botón no es control de acceso**: la puerta sigue siendo el servidor y esto es
  cortesía en las dos direcciones. **Cómo se revierte:** `9423e80`.

- **Tarea 14 · el panel de dados ya estaba montado, y nada lo sujetaba.** La ficha decía que
  `grep` devolvía solo su declaración; el 2026-09-06 devuelve cuatro apariciones y `MesaDeSesion`
  lo monta **fuera del `<main>`**, con estado propio para que abrir la hoja no lo cierre. Lo que
  faltaba era la prueba que impide que se desmonte otra vez — que es justo como llegó a estar
  escrito y sin usar. **Cómo se revierte:** el commit.

- **Tarea 12 · el editor de criaturas mentía al editar.** El selector de visibilidad ya existía y
  ya se pintaba al **crear**; al editar, la otra rama del ternario decía *«el servidor no manda ese
  dato al leer la criatura»* y **sí lo manda**. Además de incumplir la regla vinculante —si el
  texto explica una regla del servidor y discrepan, miente el texto—, dejaba sin **ninguna** forma
  de cambiar quién ve una criatura propia ya creada. **Cómo se revierte:** el commit.

- **Tarea 19 · cancelar un combate no avisaba a quien estaba esperando** (D-A-3). `cancel` borraba
  el encuentro y sus peticiones **sin escribir nada**, a propósito —«no es historia, es un clic
  deshecho»—, y el coste era que a quien tenía una petición pendiente **le desaparecía la entrada
  de la bandeja sin explicación**. El autor revisó esa decisión. El sujeto del suceso es la
  **sesión** y no el encuentro, que ya no existe para serlo, y no lleva `encounterId`: sería una
  referencia a una fila borrada. **E-IB-18 se tacha en `decisiones.md` y se dice quién la revisó**,
  no se borra. **Cómo se revierte:** el commit.

- **Tarea 16 · corregir el bando no viajaba por el canal en vivo.** `setSide` cambiaba el lado
  **sin escribir ningún suceso**, y el reajuste de `activePosition` que hace `setInitiative`
  cambiaba de combatiente el turno activo sin decir nada: una segunda pestaña seguía señalando a
  quien ya no le toca hasta refrescar. Dos tipos nuevos en el vocabulario cerrado, su `record`
  dentro de la misma transacción que la escritura, y su línea en español con el nombre del bando
  saliendo del vocabulario del dominio. **Cómo se revierte:** el commit; el enum de PostgreSQL solo
  crece, así que revertirlo no rompe filas escritas.

- **Tarea 9 · un descanso avanza el reloj de campaña** (D-A-1: largo 8 h, corto 1 h). Hasta hoy
  `rest.service` **leía** el reloj y no lo movía nunca, y su propio 409 mandaba «avanza el reloj de
  la campaña» a mano: ocho horas de descanso no caducaban nada y la regla de un descanso largo por
  24 h bloqueaba de más. Ahora se cumple sola y todo lo que caduca por reloj caduca al descansar.
  El avance va **dentro de la misma transacción** que el descanso. **Cómo se revierte:** el commit.

- **Tarea 8b · y `changeHp` las aplica.** La condición exigía `statblockRef`, y un PJ nunca lo
  tiene. Ahora hay **dos fuentes con una sola forma**: la del statblock para un PNJ y la de los
  rasgos para un jugador. Un enano recibe 5 de 10 de veneno **con la traza diciendo «Resistencia
  enana»**, y 10 de 10 de cortante. **Cómo se revierte:** el commit.

- **Tarea 8a · de dónde salen las resistencias al daño de un personaje jugador.** La maquinaria
  existía y estaba probada, pero los rasgos de raza eran **puro texto**, así que un enano recibía
  el veneno entero y un tiefling ardía con el fuego entero, con la traza convincente al lado. Hay
  un `kind` de concesión nuevo con **la misma forma** que `statblock.damageModifiers` —no un
  segundo esquema, o `changeHp` tendría que saber de los dos—, el enano y el tiefling lo declaran
  con su cita del SRD, y `resolve.ts` lo agrega. **El dracónido se queda como texto a propósito**:
  su resistencia depende de un linaje que es una elección que el catálogo no modela. Se prueba
  **sin tocar un punto de golpe**; aplicarlo es 8b. **Cómo se revierte:** el commit.

> **`36ab260` contiene además dos arreglos de maquetación que no son suyos**, escritos por otra
> sesión en el mismo árbol y recogidos por un `git add -A`: la tira fija de `HojaCalculada` dentro
> de un cajón (se solapaba 72 px con su cuerpo) y el botón «Aplicar» de `PanelMonedas` (se salía
> 24,5 px de su tarjeta). Cuatro clases, dos `import type` y dos objetos `style`, sin lógica. Se
> dice aquí en vez de reescribir la historia a mitad de plan. **La regla que lo evita ya estaba
> escrita**: un implementador por árbol.

- **Tarea 18 · un PNJ revelado entregaba las seis características de un statblock `DM_ONLY`.** La
  misma respuesta decía que sus números no eran públicos y traía seis de ellos, con los que se
  reconstruyen los seis modificadores de salvación, los dieciocho de habilidad y la iniciativa. No
  era un descuido: `npcs.service.ts` copia las características a la fila de `Character` al
  instanciar (D-2D-2) y `getSheet` devolvía esa fila — **las dos piezas eran correctas por
  separado**. Se aplica la decisión del autor (**D-A-2**): se ocultan, **menos los puntos de golpe
  actuales**, porque saber que un enemigo está malherido se ve en la ficción. La frase que
  acompaña la respuesta se corrige con ella. **Cómo se revierte:** el commit.

- **Tarea 17 · la sala de espera podía leer «todos han tirado» sin que nadie tirara.** La lista de
  peticiones pendientes salía con `take: 50` por fecha descendente y **sin filtro por encuentro**,
  así que una campaña con más de cincuenta pendientes de otro tipo empujaba fuera de la página las
  de iniciativa del combate recién abierto — y el `[]` de la página cincuenta es indistinguible de
  «cero pendientes de verdad». Se cierra por las **dos** mitades: el servidor acepta `encounterId`
  —**sin subir el tope**, que solo movería el problema— y la pantalla lo **manda** en vez de
  filtrar en el cliente, que no puede recuperar lo que el servidor ya recortó. **Cómo se
  revierte:** el commit.

- **Tarea 7 · beberse una poción solo la borraba del inventario.** `consume` resolvía la
  definición del objeto y **nunca miraba sus efectos** —grep de `effects` en `inventory.service.ts`:
  cero—, que solo se leían al derivar la hoja y **desde lo equipado**. Ahora aplica los que el
  objeto ya declara, con la maquinaria de los modificadores temporales (M8) y sin duración, y el
  suceso dice **cuáles se aplicaron y cuáles no**: de los nueve efectos de objeto solo tres caben
  en ese vocabulario, y los otros seis se nombran en vez de descartarse en silencio. **No inventa
  un efecto de curación**: eso es el paso 2. **Cómo se revierte:** el commit.

- **Tarea 6 · un goblin no era competente ni con su propia cimitarra.** `deriveNpc` dejaba
  `weaponProficiencies` vacía, así que atacaba a **+2 donde el SRD da +4**, con el aviso
  `attack_not_proficient` al lado —el motor sabiéndolo y sin poder hacer nada—. Un PNJ es
  competente con lo que maneja: las dos categorías enteras, no una lista transcrita arma por arma.
  **Un PJ sin competencia sigue recibiendo su aviso y sin sumar el bono**, y hay prueba de eso.
  **Cómo se revierte:** una línea.

- **Tarea 4 · la acción Ayudar caducaba antes de tiempo para media mesa.** El reloj solo sube al
  **cerrar** un asalto, así que la marca a `reloj + 6s` vencía al **empezar** el siguiente, antes
  del turno de nadie: quien actuaba antes que su ayudante llegaba a su turno sin ventaja, y eso es
  determinista en la mitad de los órdenes de iniciativa. Una condición puede ahora cortarse en un
  **borde de turno** (`expiryEdge`, vocabulario cerrado de cuatro tomado de Foundry) en vez de en
  el reloj, y quien lo cruza es `advanceTurn`. Fuera de combate no hay borde y manda el reloj de
  siempre. **Las dos pantallas que ya prometían esto no se tocan: hoy dicen la verdad.** **Cómo se
  revierte:** el commit; las dos columnas nacen `NULL` y sin ellas todo caduca como antes.

- **Tarea 3 · dos concentraciones a la vez, y una sola salvación.** El `upsert` de condiciones es
  por clave exacta y cada conjuro genera la suya, así que dos convivían; y como `estaConcentrado`
  devuelve un booleano, `changeHp` pedía **una** salvación para las dos. Empezar una concentración
  retira las demás **con su suceso** —perder la Bendición es algo de lo que la mesa se entera—, y
  con eso el segundo defecto desaparece solo. **Cómo se revierte:** quitar el bloque de `apply`.

- **Tarea 2 · se podía envenenar a un esqueleto.** `conditionImmunities` era texto libre entre dos
  vecinas tipadas, así que **nadie podía consumirlo**. Pasa a las quince del SRD, con migración de
  datos que mapea lo conocido y **deja fuera lo que no reconoce sin borrar la fila**, y `apply`
  rechaza con un 400 que dice por qué. Un personaje jugador no tiene statblock: para él la lista
  está vacía y no cambia nada. **Cómo se revierte:** el commit — pero **las etiquetas que la
  migración no supo mapear no vuelven**: revertir no las devuelve.

- **Tarea 5 · una fórmula de CA ya puede sumar más de una característica.** `AcFormula.addAbility`
  admitía **una**, y las dos Defensas sin armadura del SRD 5.1 suman dos —bárbaro DES+CON, monje
  DES+SAB—, así que un bárbaro salía con la CA baja **y la traza convincente al lado**. Pasa a
  `addAbilities`, con el **tope por característica** y no de la fórmula: la armadura media sigue
  topando la Destreza en +2 sin hablar por las demás. `addAbility`/`abilityCap` se retiran **sin
  alias**. No mecaniza la aptitud —eso es el paso 2—: hace que el modelo pueda decirla. **Cómo se
  revierte:** el commit entero; su superficie son tres ficheros y sus dos specs.

- **Tarea 1 · un jugador podía concederse ventaja permanente, y ya no.** `PUT
  …/conditions/helped` sin duración daba **ventaja renovable en todos sus ataques**: la
  autorización era correcta —el personaje es suyo— y el agujero estaba en que **la clave es texto
  libre** y `ayudaViva` la busca **solo por clave**. Ahora `esClaveReservada` (`@dnd/shared`)
  separa lo que el servidor **interpreta** de lo que solo guarda: `helped` no entra por esa puerta
  **para nadie**, una condición del SRD solo la escribe el DM, y una nota propia sigue siendo del
  dueño. **Cómo se revierte:** quitar las dos comprobaciones de `ConditionsService.apply`.

- **Tarea 0 · dos fichas describían como pendiente algo ya entregado.** `P1` (el ataque comparado
  contra la CA sin pantalla que lo llame) y la segunda `P3` (un cuadro de ataques vacío sin
  motivo) las cerraron las tareas 13 y 15 de la tanda de la iniciativa y nadie las tachó. Se
  comprobaron las dos citas abriendo los ficheros antes de tachar
  —`apps/web/src/features/character-sheet/api.ts:563` y
  `apps/web/src/features/character-sheet/hooks.ts:397` para la primera,
  `apps/web/src/features/character-sheet/AtaquesYLanzamiento.tsx:157` para la segunda— y se
  movieron **enteras** a
  [`_archivo/pendientes-cerrados-2026-09-06-paso-1.md`](./_archivo/pendientes-cerrados-2026-09-06-paso-1.md),
  que es lo que exige `check:docs`: lo tachado sale del documento vivo, no se queda tachado en él.
  La segunda además **se renombra a `P3b`**, porque había dos fichas distintas llamadas `P3`.

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
