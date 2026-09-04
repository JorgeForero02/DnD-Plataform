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
>
> **El siguiente corte toca cuando el 2026-09-03 deje de ser el presente**, o antes si
> `check:historial` se pone rojo.

---

## 2.5.5 · Las condiciones llegan a las tiradas (2026-09-04)

**Qué.** Las condiciones tenían un solo consumidor de verdad —la velocidad—. Ahora tienen el
segundo, que es el que se nota en la mesa:

- **`apps/api/src/character-state/roll-mode/suggested-roll-mode.ts`**, módulo **puro** hermano de
  `effective-speed.ts`: dadas las condiciones vivas y qué se tira, devuelve el modo sugerido **con
  todas sus causas**. `GET /campaigns/:c/characters/:p/sheet` lo publica en `rollSuggestions`
  (ataque, prueba y **una salvación por característica**, porque `restrained` solo penaliza
  Destreza). Las quince condiciones del SRD 5.1, verificadas **en inglés** contra `dnd5eapi.co`,
  con la cita literal de cada una en la cabecera del módulo.
- **Los cuatro efectos de agotamiento que faltaban** (ficha C2C-9): desventaja en pruebas (nivel
  1), en ataques y salvaciones (nivel 3) y **la muerte del nivel 6**, que se deriva en
  `deathSaves.status` sin tocar las casillas de salvación de muerte.
- **La caducidad por asaltos no necesitó mecanismo nuevo**, y se comprobó leyendo el código antes
  de escribir nada: **no existe ningún `advanceTurn`** —no hay módulo de encuentros, eso es 2.5.6—,
  así que lo que faltaba era la prueba. Un asalto son seis segundos del reloj que ya existe, y el
  e2e nuevo lo demuestra: una condición de dos asaltos sigue puesta tras el primer avance de seis
  segundos y se apaga en el segundo.

**Por qué así.** *Sugiere, no impone*: media tabla del SRD depende de circunstancias que el
servidor no conoce —si la fuente del miedo está a la vista, si el atacante te ve—, así que el modo
lo sigue eligiendo quien tira. Y el fallo automático de las salvaciones de Fuerza y Destreza sale
en su propio campo (`autoFail`), no como «desventaja»: con desventaja aún se saca la CD.

**Pruebas.** 34 unitarias nuevas del módulo puro + 2 del nivel 6, y
`apps/api/test/condiciones-en-las-tiradas.e2e-spec.ts` (7 casos) contra Postgres real. Siete
mutaciones probadas, todas rojas: el `>=` del agotamiento a `===`, `cancelled` a `false`,
`AUTO_FAIL` a `DISADVANTAGE`, `restrained` sin filtrar característica, el nivel que mata a 7, la
muerte condicionada a 0 PG, y el `>=` del vencimiento a `>`.

**Cómo revertir.** Es aditivo: borrar `apps/api/src/character-state/roll-mode/`,
`packages/shared/src/roll-suggestion.schema.ts` y su línea del `index.ts`, quitar
`muertoPorAgotamiento` de `agotamiento.ts` y deshacer los tres puntos que toca
`character-sheet.service.ts` (el `exhaustion` de `hojaOMotivo`, el tercer parámetro de
`estadoDeMuerte` y `loQueDerivanLasCondiciones`, que era `velocidadesEfectivas`). Ninguna
migración, ningún cambio de contrato existente: `rollSuggestions` es un campo nuevo de la
respuesta y nadie lo lee todavía.

## Lo comprobado EN PRODUCCIÓN al desplegar la fase 2D (2026-09-03)

---

## El combate llega a la mesa, como capa (2.5.6) (2026-09-04)

**El servidor sabía llevar un encuentro desde 2.5.2 y ninguna pantalla lo consumía** — su propio
controlador lo decía: «sin pantalla a propósito … esto lo consumirá la mesa de combate cuando
exista». Ya existe, y **no es una pantalla**: es una tira de orden de turnos que aparece encima del
elenco mientras dura el combate y se va cuando termina. La URL no cambia; el elenco y el registro
siguen donde estaban. Es lo que el reseño llamaba «una capa sobre la mesa nueva», y el motivo por
el que estaba aplazado —«si se construye ahora se construye dos veces»— desapareció con la mesa
nueva.

**Dos puertas que faltaban en el servidor**, sin las cuales la pantalla no podía existir:
`GET .../encounters/current` (porque `get` exigía un id que solo conocía quien acababa de llamar a
`start`: recargar la mesa dejaba el combate invisible) y `POST .../encounters/:id/end` (sin él la
tira no se iba nunca). `current` **reutiliza `get` entero** para que el filtrado por `canView` y la
renumeración densa de posiciones vivan en un solo sitio. Terminar no borra nada: el encuentro pasa
a `ENDED` con sus asaltos, y el índice único parcial deja empezar el siguiente.

**La unión de tipos de suceso queda CERRADA (ficha L1).** `linea-de-log.ts` tenía un `default` que
imprimía `Sin traducir: <TIPO>` y un comentario que lo llamaba «inalcanzable»: le faltaban
**catorce** de los treinta y tres tipos —no doce, como decía la ficha; 2.5.3 había añadido
`ATTACK_RESOLVED` después del recuento—. Se escriben las catorce frases y **se quita el `default`**,
que es lo que la propia ficha pedía: ahora, si el carril del motor añade un tipo, el build del
gráfico se pone rojo en ese fichero. La deuda dejó de crecer sola.

**Y se arregla en `apiFetch` una causa que llevaba desde la tarea 1.14 pagándose a mano.** Fastify
rechaza con 400 —*«Body cannot be empty when content-type is set to 'application/json'»*— cualquier
POST que anuncie JSON sin cuerpo, y **dieciocho llamadas de `apps/web` arrastraban el rodeo
`body: JSON.stringify({})`** con su comentario explicándolo una por una. Los dos endpoints nuevos de
2.5.6 fueron los primeros que no lo copiaron y volvieron a caer en el mismo 400, así que la
cabecera pasa a ponerse **solo cuando hay cuerpo**. Los dieciocho rodeos quedan innecesarios y su
limpieza está anotada. Solo lo caza el navegador: supertest no pone esa cabecera sin `.send()`.

> **Aquí ponía «todos los endpoints sin cuerpo estaban rotos desde la web», y era falso**: los
> dieciocho que llevaban el rodeo funcionaban. Lo corrigió la revisión de cierre, que lo refutó
> sin salir del repositorio.

**La revisión de cierre devolvió dos bloqueantes, dos graves y cinco menores. Todos arreglados
aquí, y dos de ellos no eran de esta tanda sino que llevaban puestos desde 2.5.2.**

1. **El registro le cantaba al jugador las posiciones CRUDAS.** `get` renumera denso justo para que
   nadie pueda contar los huecos de lo que no ve, y `TURN_ADVANCED` —visibilidad `PLAYERS`— viajaba
   con `fromPosition` y `toPosition` sin renumerar dentro del `payload`, que `GameEventsService`
   devuelve entero. Medido contra Postgres real: con **un** combatiente visible y cuatro grupos
   ocultos, el registro entregaba **cinco** posiciones distintas. Es la misma fuga que la revisión
   de 2.5.2 cerró quitando los conteos de `ENCOUNTER_STARTED`, reabierta por la otra puerta. Un
   `payload` no se puede filtrar por espectador, así que las posiciones salen del suceso — nadie
   las leía: `linea-de-log.ts` ya las descartaba a propósito.
2. **`?seccion=characters` dejaba la pantalla en blanco**, y no era una dirección hipotética: **la
   migaja de toda hoja de personaje apuntaba ahí**, y también el destino tras borrar un personaje.
   Dos clics desde una pantalla central. Ahora **una sección que no existe abre el resumen**, y los
   dos emisores apuntan a la campaña a secas. Se probó además reabrir el cajón que la dirección
   nombraba y se descartó: contradice que el superpuesto no sobreviva a navegar —que es a
   propósito— y deja el taller tapado por un modal cada vez que vuelves de una hoja.
3. **La renumeración densa no tenía ninguna prueba que la distinguiera.** Con el PJ arriba por su
   Destreza, su posición cruda era 0 y `toBe(0)` se cumplía con y sin renumerar: cinco vueltas con
   la renumeración rota, seis pruebas verdes cada vez. Ahora se le baja la iniciativa a −20 y su
   cruda es 1 — tres mutaciones seguidas, tres rojas.
4. **`encounters.service.ts` llevaba tres bytes NUL literales** y git lo trataba como binario:
   `Bin 19708 -> 22896 bytes`, sin diff. **Todo lo escrito ahí desde 2.5.2 llegó a `main` sin que
   nadie pudiera leer el cambio**, en el fichero con más superficie de fuga del módulo. Pasan a
   ser un escape, y una prueba nueva barre el fuente buscando bytes de control.
5. **El predicado de audiencia se olvidaba de `PUBLIC` por TERCERA vez.** `=== "PLAYERS"` dejaba
   fuera el nivel más abierto de los cinco, así que un personaje `PUBLIC` escribía su tirada de
   iniciativa como `DM_PRIVATE` y **ni su dueño la veía**. Falla del lado seguro, pero rompe la
   regla que no se negocia. El predicado se muda a `common/visibility.ts`, con `canView`.

Y tres menores: `activePosition` no era `.nullable()` aunque el servidor devuelve `null` —la
prueba tenía que mentirle al compilador—; el diálogo de terminar decía «queda con sus asalto» sin
la cifra; y el botón de entrar en combate se deshabilitaba con el motivo en un `title`, que un
teclado no alcanza.

**Evidencia.** 7 e2e de API (`la-capa-de-combate.e2e-spec.ts`), 11 unitarias de la capa, 12 del
registro, y `combate.spec.ts` de punta a punta: entrar, pasar turno, recargar, salir. Mutaciones:
agrupar por fila en vez de por posición, corregir siempre el primer combatiente, quitar la puerta
del DM y romper la renumeración densa — las cuatro dejan pruebas rojas.

**Revertir:** un commit. La migración solo **añade** un valor al enum `GameEventType`; bajarla es
`prisma migrate resolve --rolled-back` (un valor de enum no se puede quitar en Postgres sin
recrear el tipo, así que en la práctica se queda sin usar y no molesta).

---

## El daño, con su traza, y la revisión que lo corrigió (2.5.4) (2026-09-04)

`changeHp` acepta `rollEventId` opcional (`@dnd/shared`, solo-añadido), comprobado contra la base
—inventado, de otra campaña, **o que no sea una tirada**: 400— y guardado en `HP_CHANGED`: «¿de
qué murió Elara?» (M15) responde tipo **y** tirada. Y pide **la salvación de concentración**: la
petición de siempre (2C.5, `RollRequest`) cuando un concentrado (clave libre `concentrating-*`)
toma daño, CD `max(10, floor(daño/2))`, **una por golpe sin deduplicar** — *«a separate saving
throw for each source of damage»*.

**La revisión de cierre devolvió tres bloqueantes, y la regla se verificó en la fuente antes de
tocar nada** (SRD 5.1, "Casting a Spell" / "Concentration", edición inglesa).

1. **El e2e de la tarea estaba ROJO y no se había ejecutado nunca**, mientras el historial y
   `08-pruebas.md` lo presentaban como evidencia. Elara era nivel 1 con 12 PG máximos, así que los
   25 de daño del ejemplo de cierre **del propio spec** la mataban de golpe —muerte masiva— y no
   se pedía ninguna salvación: el ejemplo era irrealizable a nivel 1. Elara pasa a nivel 8 y la
   prueba se ejecutó, 5/5.
2. **Los PG temporales eximían de la salvación, y no deben.** Se pedía —y se calculaba la CD— con
   el daño *posterior* a los temporales, así que un mago con 5 temporales que encajaba 5 no tiraba
   nada. *«Whenever you take damage»* y *«half the damage you take»*, y el SRD describe los
   temporales como algo que se gasta **al tomar** daño: absorben el golpe, no lo impiden. Había una
   prueba que afirmaba lo contrario, y pasaba.
3. **A 0 PG, en cambio, NO se pide**: *«You lose concentration on a spell if you are incapacitated
   or if you die»*, e inconsciente es incapacitado. Se pedía tirar por algo que la regla ya quita.

**Y tres más.** El crítico aceptaba cualquier `ABILITY_ROLL` del personaje con un 20 natural, así
que **un 20 en una prueba de Sigilo cobraba el daño duplicado de la espada** (ahora se compara el
rótulo del ataque); `payload.type` se leía de dentro del `Json` teniendo `type` como columna real e
indexada; y el `rollEventId` del daño no se comprobaba que **fuera** una tirada.

**M17 queda REABIERTA.** El servidor está hecho, pero `grep -rn "concentrat" apps/web` no devuelve
nada: el selector de condiciones solo ofrece las quince claves del SRD, así que ninguna pantalla
puede marcar a nadie como concentrado y la regla no se dispara en una mesa real. Mismo patrón que
`ENTITY_REVEALED` (ficha P1). **C2.5-2** anota además que el `eventId` de un ataque **se puede
reutilizar**: nada marca una tirada como ya cobrada.

**Evidencia.** 104 unitarias del servicio en verde; e2e `dano-con-su-traza.e2e-spec.ts`
**ejecutado**, 5/5. **Revertir:** `git revert -m 1` de la fusión; solo-añadido en `@dnd/shared`.

---

## El mundo es un destino, y la sesión se empieza en la mesa (B4) (2026-09-04)

**La navegación de una campaña baja de diecinueve destinos a seis.** Las siete pestañas de tipo
—PNJ, Lugares, Misiones, Facciones, Objetos, Sucesos, Documentos— eran los siete valores del enum
de la tabla `Entity`: la navegación era el esquema de la base de datos. Ahora son **un destino,
«El mundo»**, con el tipo como fila de fichas dentro (`role="group"`, `aria-pressed`). El tipo
sigue viajando en `?seccion=<TYPE>` y `seccionActiva` lo mapea a `"world"`, así que **los enlaces
antiguos siguen abriendo lo que abrían**.

**Personajes, Bestiario y Catálogo pasan a cajones sobre el taller**, en el mismo estrato
superpuesto que los paneles de la mesa (D-R-8): se abren encima, Escape cierra, uno a la vez.

**Sesiones no es un cajón, por corrección del autor** (D-R-9): *«para cosas que sean un poco más
externas se puede acomodar afuera como una interfaz normal»*. Se quedó como sección del taller. Y
la segunda mitad de esa misma respuesta —*«si es una sesión empezada y no inicia aún ponle como
ventana de vista que el dm vea todo similar a como sale en el prot»*— es lo que cierra el defecto
que quedaba: **la mesa en reposo ya deja empezar la sesión**. Antes el cartel mandaba al taller, o
sea que para empezar a jugar había que salir del sitio donde se juega. Se ofrece **la planificada
más antigua**, y el diálogo es `DialogoDeInicio`, el mismo del taller —un segundo formulario
querría decir dos reglas de asistencia y una de las dos acabaría mintiendo—. Sin ninguna
planificada no se inventa una: se enlaza al taller, porque crearla lleva título y fecha.

**Un cajón no es un formulario**, y el navegador lo dijo: `Dialog` gana `size="xl"` (`max-w-6xl`)
porque en `max-w-2xl` los cuatro números de una criatura —CA, PG, Vel, VD— dejaban de caber en una
línea y se partían en dos. Lo cazó `bestiario.spec.ts` midiendo las cajas; `jsdom` no maqueta.

**Revertir:** `git revert` del commit. Nada de esto toca servidor, esquema ni `packages/shared`.

## El ataque, comparado en el servidor (2.5.3) (2026-09-04)

**El motor calculaba el bono de ataque y quien tiraba comparaba a ojo contra la CA.** Nuevo
`CharacterSheetService.resolveAttack` (`POST .../sheet/attacks/:attackKey/resolve`): deriva el
bono ya conocido, tira con `RollsService`, compara con la CA del objetivo —**que nunca sale del
método**— y propone `HIT` / `MISS` / `CRITICAL`. Un 20 o un 1 natural mandan sobre la CA (SRD
5.1, *"Resolving Attacks"*, dnd5eapi.co/api/2014/rule-sections/making-an-attack: *"If the d20
roll for an attack is a 20, the attack hits regardless of any modifiers or the target's AC"* /
*"a 1, the attack misses regardless..."*). Ni el impacto ni el daño se aplican solos.

**La CA se calcula con un espectador del servidor** (`role: "DM"`), no con el de quien ataca:
`hojaDeStatblock` se niega entera —sin hoja, sin CA— a cualquiera que no sea el DM, y el atacante
casi nunca lo es. **Atacar no exige `canView` sobre el objetivo** a propósito (D-2.5-5): la
garantía de esta tarea es «nunca sabrás su CA», no «no puedes apuntar a lo que no ves».

> **Aquí ponía que sin el espectador omnisciente «atacar a un PNJ `DM_ONLY` habría sido un 400», y
> es falso para los PNJ del SRD** —que son justo los del criterio de cierre y los del e2e—:
> `statblocks.service.ts` devuelve un statblock `SRD:` a cualquiera sin mirar el espectador. El
> espectador omnisciente solo hace falta para un statblock **propio del DM** oculto, y ese caso
> **no lo ejercitaba ninguna prueba**. Lo encontró la revisión de cierre.

**La revisión de cierre encontró cinco cosas más, y dos eran bloqueantes.**

1. **El DM nunca recibía la propuesta.** El veredicto solo existía en la respuesta HTTP del
   atacante: ni suceso, ni objetivo, ni veredicto en ninguna parte, así que **no había nada que
   confirmar ni que corregir** — el paso 5 del §2.5.3 y el «el sistema propone, el DM dispone» de
   §4 no estaban hechos. Ahora se escribe `ATTACK_RESOLVED` con el objetivo, el veredicto y el
   `eventId` de la tirada de la que sale, **a la visibilidad del objetivo**: anunciar «alguien
   atacó a X» cuando X está escondido revelaría que X existe.
2. **El 400 de un objetivo irresoluble filtraba el motivo interno**: *«Este PNJ apunta a un
   statblock que ya no existe (CAMPAIGN:<cuid>)»* le confirmaba al atacante que el objetivo es un
   PNJ y le daba el id del statblock del DM. Fuera va una frase que no dice nada del objetivo.
3. `caDelObjetivo` se llamaba «la CA» y devolvía **la hoja entera** derivada con ojos de DM —PG,
   salvaciones, habilidades y la traza—. Devuelve el número; el tipo es lo que impide el mal uso
   dentro de tres semanas, no un comentario.
4. **La audiencia se olvidaba de `PUBLIC`**, el nivel más abierto de los cinco: caía en el `else`
   y la tirada se escondía, y entonces el propio jugador no veía su total y **no recibía
   veredicto**. Estaba copiado de `rollAttack`, así que se arregló en los dos sitios.
5. **La CA se puede deducir** con veinte o treinta ataques, y el comentario que lo justificaba era
   falso justo en el caso que la decisión habilita. Se acepta escrito, con su ficha (**P2**) y con
   el rastro que ahora deja `ATTACK_RESOLVED`.

**Lo que queda fuera, a propósito.** La ficha R2C-2 (el `critical` suelto en la DAMAGE de
`rollAttack`) no se toca aquí — es de 2.5.4, que es donde el daño se aplica de verdad. Ver
ficha **C2.5-2** en [06-pendientes.md](./06-pendientes.md).

**Probado.** Nueve unitarias del servicio (Prisma simulado): HIT por encima de la CA, HIT en el
empate exacto —el SRD dice «iguala o supera»—, MISS por debajo, `CRITICAL` con un 20 natural
aunque el total no llegue a la CA, `MISS` con un 1 natural aunque el total la supere, sin
veredicto en una tirada a ciegas, sin ningún campo de CA en la respuesta, 404 contra un
objetivo que no existe y un PNJ con la plantilla oculta al atacante que aun así compara bien.
Y un e2e contra Postgres real (`ataque-comparado-en-el-servidor.e2e-spec.ts`) que ataca a un
plebeyo del SRD `DM_ONLY` hasta ver «impacta» y comprueba, **sobre el cuerpo HTTP
serializado**, que su CA no aparece en ninguna respuesta ni en el registro de la partida.

**Cómo revertir.** `git revert` del commit; no toca el esquema de Prisma. El único cambio en
`@dnd/shared` es aditivo (`attack.schema.ts`, nuevo).

## ENTITY_REVEALED también al subir la visibilidad a mano (ficha P1) (2026-09-04)

El único sitio que emitía este suceso era el motor de reglas (`REVEAL_ENTITY`); un DM que sube a
mano la visibilidad de una ficha —que es como se revela un lugar casi siempre— no dejaba rastro,
y la cabecera de escena de la mesa (que ya sabe leerlo) nunca se encendía sola.
`EntitiesService.update` compara el índice del nivel nuevo contra el viejo en `DM_ONLY <
OWNER_DM < SPECIFIC_PLAYERS < PLAYERS < PUBLIC` —el mismo orden de `canView`— y solo emite
cuando sube; **bajar la visibilidad no es revelar** y no emite nada. El suceso hereda la
visibilidad NUEVA de la entidad, y se escribe con `PrismaService.transaction` + el buzón de
`after-commit.ts`, nunca con `$transaction`.

**Probado.** Unitarias del servicio (con `transaction` mockeado) y `entities.e2e-spec.ts`: sube
y no emite al bajar; un jugador que no puede ver la ficha tampoco ve el suceso.

**Cómo revertir.** `git revert` del commit; no toca esquema.

## Archivar un personaje en vez de borrarlo (2.5.8, ficha M9) (2026-09-04)

**Es lo único abierto que destruía datos mientras esperaba.** Columna `Character.archivedAt`
(`null` = activo). `list()` suma `archivedAt: null` a la misma consulta que ya excluye a los PNJ
instanciados (`statblockRef: null`, 2D.6) — el mismo patrón, un filtro más. `archive()`/
`unarchive()` usan `requireEditable` (dueño o DM, sin regla nueva), no tocan hoja/inventario/
dinero, y dejan `CHARACTER_ARCHIVED`/`CHARACTER_RESTORED` en la línea de tiempo con la
visibilidad del personaje. Ambos son idempotentes: repetir el gesto no vuelve a emitir el
suceso. Borrar de verdad (`DELETE`) sigue existiendo tal cual — lo que cambia es cuál de los dos
gestos es el fácil.

**Probado.** Unitarias del servicio (con Prisma simulado y `transaction` mockeado) y
`characters.e2e-spec.ts`: archivar saca del listado sin borrar filas —contadas, no fiadas del
200—, recupera hoja/inventario/dinero enteros, deja su rastro en la línea de tiempo, y solo
dueño o DM pueden archivar.

**Cómo revertir.** `git revert` del commit. La migración `character_archived` añade una columna
nula y dos valores de enum — revertirla no pierde datos de personajes ya archivados si se hace
antes de que alguien dependa de la columna.

## B0 — los tokens por canales y el tercer tema (2026-09-04)

**Por qué.** El reseño de la mesa decidió sustituir la interfaz por la maqueta de `prototipo/`,
y al leerla por dentro resultó estar escrita con **174 clases de opacidad sobre tokens** — las
que en este proyecto se descartaban en silencio. Copiada tal cual se habría pintado sin un solo
borde. Se arregló la causa (ficha P2, ahora cerrada) en vez de traducir 174 clases a mano.

**Qué entra.** Los trece tokens de color se declaran por canales (`--copper-ch: 201 125 70`) y
Tailwind compone `rgb(var(--copper-ch) / <alpha-value>)`; el nombre sin sufijo sobrevive como
color pintable, así que los ~35 `var(--accent)` de `style` y SVG no se tocaron. Escala de
opacidad de 0 a 100 (la de Tailwind tiene huecos). Tercer tema **Lectura**, con el conmutador
convertido en grupo de tres opciones visibles y el rótulo «Lectura (vitela)» del tema claro
corregido, que llevaba mintiendo desde 1.19.

**Evidencia.** 797 unitarias verdes; las **19** mediciones de contraste de
`tokens-contrast.spec.ts` pasan en los **tres** temas. Mutación medida dos veces: devolver
`copper` a `var(--copper)` pone la medición en `rgb(229, 231, 235)` —el gris del preflight— y la
prueba en rojo; quitar `"reading"` de `esTema` sobrevivía a las tres pruebas del conmutador, así
que se escribió la cuarta (un tema guardado se recupera al volver) y entonces sí muere.

**Cómo revertir.** Un solo commit. `tailwind.config.js` vuelve a `var(--x)` y `ui/tokens.css` a
los colores literales por tema; el tercer tema se cae solo al quitar `"reading"` de
`ui/theme.ts`, `index.html` y `tokens.css`.

## Tarea 2.5.1 — tipos de daño y resistencias que de verdad reducen (2026-09-04)

**El tipo de daño es una columna** (`GameEvent.damageType`, opcional): «¿de qué murió Elara?» ya
se contesta por columna, no leyendo el `payload`. **La resistencia se parte en dos**: las tres
listas de prosa de un statblock se conservan, y al lado nace `damageModifiers` —lo estructurado
que el servidor sabe aplicar—, rellenado solo para las tres criaturas del catálogo con resistencia
limpia o citable (esqueleto, zombi, tumulario). **Y una función pura nueva**
(`apply-damage-modifiers.ts`, misma familia que `effective-speed.ts`) reduce el daño con su
traza, enganchada a `POST .../hp`: con `damageType`, reduce antes de aplicar; sin él, nada cambia.

**La revisión de cierre encontró cuatro cosas, y una era una regla mal leída.** Se anotan porque
las cuatro son del tipo que vuelve si no queda escrito por qué pasaron:

1. **Resistencia y vulnerabilidad al mismo tipo NO se cancelan: se encadenan.** El código las
   cancelaba apoyándose en un comentario que afirmaba haber buscado la cláusula «en la edición
   inglesa y en la española» y no encontrarla. La inglesa **sí** la tiene, en dos palabras que la
   traducción oficial pierde: *«Resistance **and then** vulnerability are applied after all other
   modifiers to damage»*. Con 25: mitad 12, doble 24 — no 25. Con daño par las dos lecturas
   coinciden, que es por qué la prueba vieja pasaba. **Cuando las dos ediciones discrepan, manda
   la inglesa.**
2. **El registro publicaba el daño BRUTO** junto a unos `from`/`to` ya reducidos. Filtraba —de
   25 anunciados y 12 perdidos se deduce una resistencia, y la plantilla puede ser `DM_ONLY`— y
   además la línea de la mesa se contradecía consigo misma. Se registra el daño aplicado.
3. **Una curación se podía etiquetar con tipo de daño**, y entonces «¿de qué murió?» devolvía
   curaciones. Ahora solo un delta negativo lleva tipo.
4. **`schema.prisma` no declaraba `damageModifiers`**, aunque su migración creaba la columna: un
   checkout limpio no compilaba y el siguiente `prisma migrate dev` habría propuesto borrarla.
   Sobrevivió a un `pnpm verify` en verde porque el cliente generado de aquella máquina sí la
   tenía. **Lo cazó `pnpm build`, no una prueba.**

Y una decisión de traza: los pasos de resistencia dicen `sourceType: "statblock"` y no `"manual"`.
`"manual"` es la anulación del DM; una regla del libro no es un ajuste a mano.

Dos reglas más verificadas contra la fuente y citadas en el código: la resistencia se aplica
después del resto de modificadores, y varias resistencias del mismo tipo cuentan como una.

**Cómo revertir:** `git revert` de los commits `feat(api)`/`feat(shared)` de la tarea. Las dos
migraciones solo añaden columnas nullable — revertir el código no revierte el esquema, y no hace
falta: una columna de más sin escribir no rompe nada.
