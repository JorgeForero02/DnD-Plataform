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
> | [`_archivo/historial-2026-09-03-y-04-sueltas.md`](./_archivo/historial-2026-09-03-y-04-sueltas.md) | **La comprobación en producción de 2D** y **la auditoría de la documentación del 2026-09-04**, movidas enteras el 2026-09-05 (segundo corte de la noche: las cinco entradas del plan 03 dejaron el fichero en 413 de 400) |
>
> **El corte del 2026-09-05 se hizo por lo segundo**: el fichero estaba en 399 de 400 y no cabía
> la entrada del día. Se archivaron las seis tandas por tarea y se quedaron los tres hitos.

---

## Los sucesos aprenden a nombrar (2026-09-05, plan 03 · D-OP-12)

**Qué.** `GameEvent` tiene concesiones nominales, y con eso caen **dos fichas y un parche**.

**El defecto.** `GameEventsService.canSee` evaluaba `canView` con `grantedUserIds: []` **fijo**,
así que un suceso `SPECIFIC_PLAYERS` **no lo veía nadie** salvo el DM — ni siquiera el jugador al
que se le acababa de conceder la ficha. `EntitiesService` lo sabía y guardaba `DM_ONLY` en su lugar,
con un comentario que lo llamaba parche honesto a la espera de esto. **El parche está retirado y su
comentario reescrito**, no dejado mintiendo.

**Columna `String[]`, no tabla de unión**, con tres motivos medidos: el filtrado ya ocurre **en
memoria** tras el `findMany`, así que una tabla obligaría a un `include` para nada; el esquema ya usa
`String[]`; y lo que se pierde —integridad referencial— es inofensivo, porque `canView` solo
pregunta si el espectador está en la lista.

**Y P3 no se arregló como la ficha suponía.** Decía que hacía falta que «el modelo de sucesos sepa
de dueños ajenos». Lo que hacía falta era traducir: **un suceso no tiene dueño propio** —el servicio
evalúa `canView` con el **actor** como creador—, así que copiar `OWNER_DM` tal cual escribía un
suceso cuyo «dueño» era el DM que archivó, y al jugador al que se llevaban el personaje **no le
llegaba nada**. `audienciaDeSuceso` (`apps/api/src/common/visibility.ts`) traduce el nivel de la
cosa al par (visibilidad, nombrados) que produce **su misma audiencia**: `OWNER_DM` significa «su
dueño y el DM», y nombrar al dueño en `SPECIFIC_PLAYERS` da ese conjunto exacto. Vive junto a
`canView` porque es la misma matriz, y la usan el archivar y el revelar.

**Cómo se comprobó.** Dos mutaciones, las dos rojas: volver `canSee` al array vacío tumba el e2e del
jugador nombrado; copiar la visibilidad tal cual en el archivar tumba el del dueño.

**Cómo revertirlo.** `git revert` del commit y una migración con
`ALTER TABLE "GameEvent" DROP COLUMN "grantedUserIds"`. Vuelve el parche de `DM_ONLY`, que era la
etiqueta honesta de lo que pasaba.

---

## Atacar a un ciego da ventaja, y esa mitad faltaba (2026-09-05, plan 03 · D-OP-13)

**Qué.** El SRD dice de `blinded` una frase con **dos mitades**: *"Attack rolls against the creature
have advantage, and the creature's attack rolls have disadvantage."* 2.5.5 implementó la segunda y
declaró que la primera quedaba fuera **con su motivo**: `suggested-roll-mode.ts` responde «¿cómo
tiro **yo**?», y quien ataca no tiene por qué estar mirando la hoja del atacado. Esa mitad vive
ahora donde sí se conoce al objetivo: **el camino del ataque**.

**La tabla, verificada en inglés contra `dnd5eapi.co` el 2026-09-05.** Dan ventaja a quien ataca
`blinded`, `paralyzed`, `petrified`, `restrained`, `stunned` y `unconscious`; da **desventaja**
`invisible`.

**Y dos reglas se dejan fuera, dichas:** `prone` da ventaja *"if the attacker is within 5 feet…
Otherwise, disadvantage"*, y el crítico automático de `paralyzed`/`unconscious` tiene la misma
condición. **Dependen de la distancia y hasta la fase 3 no hay tablero**: elegir una de las dos
mitades sería inventarse la mitad de las veces. Es el mismo criterio con el que 2.5.5 dejó fuera el
fallo automático de pruebas que requieren vista.

**Se combina con la regla del SRD, no sumando.** *"If circumstances cause a roll to have both
advantage and disadvantage, you are considered to have neither of them."* Dos causas del mismo signo
siguen siendo una; una de cada signo da **normal**. Contar causas inventaría una regla de mayorías
que la 5.ª edición no tiene.

**Cierra L3**, que decía que `blinded` no calculaba nada.

**Cómo se comprobó.** Doce pruebas de la función pura y cinco del camino del ataque —incluida una
condición **ya vencida**, que no cambia nada—. Mutación: al anular la rama de ventaja, **siete**
pruebas se ponen rojas.

**Cómo revertirlo.** `git revert` del commit: el modo vuelve a ser el que pide quien tira. No hay
migración ni dato nuevo.

---

## El daño de una tirada se cobra una vez, y lo impide la base (2026-09-05, plan 03 · D-OP-15)

**Qué.** `attackRollEventId` existía como **entrada y nada más**: `rollAttack` lo leía para saber si
el golpe fue crítico y **no lo guardaba**, así que nada impedía pedir el daño de la misma tirada dos
veces, tres, las que hicieran falta. Ahora es una columna de `GameEvent` **con índice único**.

**Índice único y no una comprobación en el servicio**, por lo mismo que «como mucho una sesión en
curso por campaña»: comprobarlo en código es una carrera esperando a ocurrir con dos pestañas
abiertas. Y el registro es de **solo añadir**, así que la alternativa —mutar la fila de la tirada
para marcarla cobrada— es algo que aquí no se hace. El servicio solo traduce el `P2002` a un 409
legible.

**PostgreSQL trata dos nulos como distintos**, así que los miles de sucesos que no cobran ninguna
tirada no chocan entre sí: basta un índice único normal, sin parcial.

**El campo viaja por un parámetro interno de `RollsService.roll`, no por `createRollSchema`.** Si el
cliente pudiera mandarlo, podría **quemar el identificador de la tirada de otro** y dejarla
incobrable — que es la puerta de al lado del problema que esto cierra.

**Cierra la mitad de C2.5-2.** La otra —que la web mande el campo y que `critical` suelto se pueda
borrar del esquema— es del plan 15, y el orden importa: primero la web manda, después se quita.

**Cómo se comprobó.** Mutación: al borrar el índice único, el e2e recibe **201** donde esperaba 409.

**Cómo revertirlo.** `git revert` del commit y una migración con
`DROP INDEX "GameEvent_attackRollEventId_key"` + `ALTER TABLE "GameEvent" DROP COLUMN
"attackRollEventId"`.

---

## El oráculo de la CA se cierra por la puerta que importaba (2026-09-05, plan 03 · D-OP-11)

**Qué.** `resolveAttack` buscaba el objetivo **sin consultar `canView`**, y cada ataque es una
comparación exacta `total >= CA` con el total conocido: veinte o treinta peticiones contra un
identificador cualquiera daban la CA de **cualquier** personaje de la campaña, sin necesidad de
suerte porque el atacante conoce su propio bono.

**La regla:** el objetivo pasa `canView` para quien ataca **o** es combatiente de un encuentro
**activo** de esta campaña. Las dos mitades hacen falta: `canView` sola dejaría fuera al PNJ
`DM_ONLY` que el DM acaba de bajar a la mesa —que es justo lo que el spec de 2.5.3 pide poder
atacar—, y el encuentro solo dejaría fuera al objetivo visible al que se ataca fuera de combate,
que es legal.

**404 y no 403, comparado byte a byte.** Un «prohibido» ya confirma que el personaje existe, así que
la respuesta es indistinguible de la de un id inventado, y hay un e2e que compara los dos cuerpos
serializados. La prueba usa el **caso difícil** —un id válido de un personaje real que no se puede
ver—, no un id con formato inválido, que daría 404 aunque no hubiera ninguna comprobación.

**Lo que se acepta y se declara:** contra un objetivo visible, la CA **sigue siendo deducible**
atacándolo, igual que en una mesa. El SRD lo respalda —*«the GM typically just says the attack
missed»*— y no prohíbe atacar a ciegas.

**Y el comentario del servicio se reescribió.** Decía, con todas las letras, «por qué no exige
`canView` sobre el objetivo». Dejarlo habría sido una mentira semántica con la sintaxis en regla,
que es justo la clase que ningún script caza.

**Cómo se comprobó.** Mutación: al quitar la comprobación, el e2e del 404 idéntico devuelve **201**
y se pone rojo.

**Cómo revertirlo.** `git revert` del commit. Vuelve el oráculo.
 Vuelve el parche de `DM_ONLY`, que era la
etiqueta honesta de lo que pasaba.

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

**`Session.openingEntityId`, dónde abre la escena (migración
`20260905020000_session_opening_entity`).** `ON DELETE SET NULL` y no `CASCADE` —borrar un lugar no
borra la sesión que pasó allí, comprobado borrando la entidad de verdad—, y **lo que se devuelve
pasa por `canView`**: si el espectador no puede ver la ficha, el campo llega **ausente**, ni con
nombre ni con id. Dejar el id sería confirmar que la sesión abre en algo escondido. Apuntar a una
ficha de otra campaña es **404**, no 400.

**Y aquí salió el fallo contrario a una fuga.** `SessionsService.canSee` pasa `createdById: ""` y
`grantedUserIds: []`, que para una `Session` vale porque no tiene ni creador ni concesiones — para
una `Entity` **no**. Con ese atajo, una ficha de apertura `OWNER_DM` o `SPECIFIC_PLAYERS` se habría
escondido de quien **sí** tenía derecho a verla, y ninguna prueba de fuga caza eso. La ficha se lee
con sus `grants` y su `createdById` de verdad, y hay una prueba por cada lado.

**Mutación del bando y de la apertura.** Al devolver `openingEntityId` cuando la ficha no es
visible, el e2e se pone rojo con el id filtrado en la salida.

**`Session.recap` y `Session.recapVisibility`, la crónica fuera del Json (migración
`20260905030000_session_recap_column`).** La pantalla ya ofrecía elegir quién ve la crónica, el
esquema ya la aceptaba, y el servicio **publicaba el suceso con la visibilidad de la sesión**: elegir
no hacía absolutamente nada. Ahora son columnas —porque se filtran— y el suceso sale con la
visibilidad de **la crónica**.

**Y salió un segundo fallo que nadie buscaba: `notes` tenía otro dueño.** El motor de reglas escribe
ahí un array de cadenas (`ADD_SESSION_NOTE`), así que una nota puesta por una regla **borraba la
crónica** en silencio — el `Array.isArray` fallaba sobre `{ recap: ... }` y empezaba un array nuevo.
Sacar la crónica del Json no es orden: es dejar de perder datos.

**La pantalla también, porque si no la ficha no cierra.** El diálogo de cierre estrena el selector de
visibilidad que ya existía (`VisibilityChooser`), con los tres niveles que una sesión admite —
`OWNER_DM` y `SPECIFIC_PLAYERS` sobre una crónica no seleccionan a nadie, porque una `Session` no
tiene ni creador ni concesiones—. Servidor arreglado y nadie que lo use es una ficha abierta.

**Cómo revertirlo.** `git revert` de los commits del plan y una migración que haga
`ALTER TABLE "Combatant" DROP COLUMN "side"` + `DROP TYPE "CombatantSide"` y
`ALTER TABLE "Session" DROP COLUMN "openingEntityId"`, `"recap"` y `"recapVisibility"`. **Las
crónicas viejas siguen dentro de `notes`**, que esta migración no tocó, así que revertir no pierde
ninguna.

---

## El hilo se lee como una conversación: lo último abajo (2026-09-05)

**Qué.** Plan 04 de [los planes del 2026-09-05](./superpowers/plans/2026-09-05-planes/04-hilo-conversacion.md),
decisión **D1**, en un commit y solo en la web. El registro de la sesión se pinta del más antiguo
al más reciente (`apps/web/src/features/sessions/hilo/HiloDeSesion.tsx:162`), sobre **una copia**
invertida: el servidor sigue mandando el más reciente primero porque de ese orden depende la
paginación por cursor, y `reverse` muta. El scroll se ancla al fondo, pero **solo si el lector ya
estaba ahí** (`:185`); si estaba leyendo más arriba no se mueve nada y sale un aviso pulsable
(`:300`). `loQueTePerdiste` **no se tocó**: su `desde` ya era el más antiguo de los no leídos, y con
el orden nuevo la franja queda con lo no leído por debajo, que es lo que su comentario decía querer.

**Cómo se comprobó.** Tres unitarias nuevas por orden de nodos, no por texto
(`apps/web/src/features/sessions/__tests__/mesa-de-sesion.test.tsx:310`) y tres medidas de
navegador (`apps/web/e2e/mesa-mide.spec.ts:255`), porque en `jsdom` `scrollHeight` vale cero y
**cualquier aserción de anclaje pasa siempre**. Mutación obligatoria: quitar la condición
`alFondoRef.current` deja el `expect(...scrollTop).toBe(arriba)` en rojo; devolver `enOrden` a
`eventos` tumba dos unitarias; sacar la marca de leído del array invertido tumba la tercera. Las
tres deshechas después.

**Lo que encontró su revisión, y por qué importa más que el defecto.** El carril entregó verde y una
revisión con contexto limpio encontró un **bloqueante real**: `apps/web/e2e/sesion.spec.ts` daba por
visto **el último nodo del DOM** —que hasta ese commit era el más antiguo— para comprobar la franja
de «te perdiste». Con el hilo invertido, el último nodo es el **más reciente**: no quedaba nada
perdido y la franja no se pintaba. Se arregló al fusionar (`ids[0]`) y se comprobó **volviendo a
romperlo**: con la línea vieja, ese recorrido cae. La lección no es el diff: **el orden del DOM es
una interfaz compartida**, y voltearlo obligaba a mirar los cuatro recorridos que lo consumen, no
solo el que se estaba editando.

**Cómo revertirlo.** `git revert` del commit: el hilo vuelve a pintarse del más reciente primero,
sin anclaje ni aviso. No hay migración, ni cambio de API, ni dato guardado nuevo.

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
