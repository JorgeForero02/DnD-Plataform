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

## B1.1 — la mesa entra en la navegación y estrena cabecera de escena (2026-09-04)

**Por qué.** Los dos defectos que el reseño clasifica como de arquitectura: la mesa **no estaba en
la navegación** —solo se llegaba por enlaces que existían mientras había sesión, y por URL directa
contestaba un cartel de vacío—, y el hilo sin cabecera es *«un tablón, no un escenario»*.

**Qué entra.** Un enlace permanente a la mesa desde la campaña, con su estado escrito (en juego /
en reposo). El **reposo pasa a ser uno de los tres estados de la mesa** y no su ausencia: cabecera,
registro y consulta siguen ahí. Y la **cabecera de escena**, estrato permanente sin botón de
cerrar, que ocupa el hueco del futuro tablero con el reloj de campaña —que llevaba semanas
sondeando para nadie desde la pestaña «Dados»—, quién está en la escena y el lugar cuando lo hay.

**Lo que se encontró por el camino, y está en `06-pendientes.md`:** **nadie escribe
`ENTITY_REVEALED`** salvo el motor de reglas, así que la mitad «el DM revela un lugar y la cabecera
lo dice» del reseño no era cierta. La derivación se escribió igual, con sus pruebas, y se enciende
sola el día que el servidor emita el suceso.

**Evidencia.** 809 unitarias de web; 98 recorridos de navegador. Dos mutaciones: quitar el enlace
deja el recorrido de alcance en rojo; quitar los minutos del reloj deja la derivación en rojo. Y el
recorrido cazó dos defectos antes del commit: un `<header>` anidado tiene rol `generic` y **no
admite nombre accesible**, y el enlace nuevo chocaba en nombre con el de la barra de sesión — el
fallo de english-log que `08-pruebas.md` cuenta.

**Cómo revertir.** Un commit. Quitar `<EnlaceALaMesa>` y `<CabeceraDeEscena>` devuelve la pantalla
a su rama de vacío; `escena.ts` y su prueba se pueden dejar, no los usa nadie más.

## B4 — el mundo es un solo destino: de diecinueve a doce (2026-09-04)

**Por qué.** Es el defecto que el reseño llama de arquitectura y no de acabado: *«la navegación es
el esquema de la base de datos»*. Había **siete pestañas** —PNJ, Lugares, Misiones, Facciones,
Objetos, Sucesos, Documentos— y las siete son **literalmente valores del enum de la tabla
`Entity`**. Con las tres rutas propias, diecinueve destinos en una campaña.

**Qué entra.** Un destino, «El mundo», y el tipo pasa a ser lo que siempre fue: **un filtro**.
Dentro sigue el mismo listado, el mismo creador y el mismo filtro de etiquetas — no se pierde
nada; lo que se gana es que elegir «Lugares» ya no es viajar a otro sitio.

**Los filtros llevan `aria-pressed`, no `role="tab"`**, y es deliberado: un `tab` promete paneles
hermanos entre los que se navega, y aquí solo se acota una lista. Prometer con el rol lo que no se
hace es el mismo vicio que enseñar un botón que va a dar 403.

**Y la dirección no cambia.** `?seccion=LOCATION` era un destino propio y ahora es el mundo con
«Lugares» elegido: los enlaces guardados y media docena de recorridos siguen valiendo. El
recorrido lo comprueba en los dos sentidos — el filtro escribe la URL, y la URL abre el filtro.

**«El mundo» se quedó sin rótulo de grupo**, por lo mismo que «Ajustes» nunca lo tuvo: era un
grupo de una entrada con el nombre del grupo, o sea una versalita repitiendo la palabra de debajo.
Cuando eran siete, el rótulo agrupaba.

**Evidencia.** 819 unitarias de web; 104 recorridos. **Diecinueve llamadas de prueba se
actualizaron, no se borraron**: describen comportamiento —«abre los PNJ y crea uno»— que sigue
siendo verdad y solo cambió cómo se llega.

**Revertir:** un commit. Devolver las siete entradas a `TABS` y quitar `SeccionDelMundo`;
`EntityTab` no se ha tocado.

## B3 — la puerta de entrada deja de ser una lista de proyectos (2026-09-04)

**Por qué.** *«Esto es un juego, una plataforma web, no una página web que hay que navegar para
saber cosas»* — el diagnóstico del autor, y la pantalla de entrada era el ejemplo: una rejilla de
tarjetas bien hecha que decía nombre, miembros y fecha, y no decía lo único que importa al abrir la
aplicación un martes por la noche, que es **dónde retomas**.

**Qué entra.** «Tus crónicas»: la lista a la izquierda, la crónica elegida abierta a la derecha, y
**la acción principal es «Entrar a la mesa»**, no abrir los ajustes de la campaña. La mesa era el
único destino que no estaba en la navegación, y ahora está a un clic de la puerta.

**Elegir y entrar son dos gestos distintos**, y eso es lo que se mide: elegir una crónica **no
navega** —se puede mirar sin entrar, que es lo que se hace con tres campañas y mala memoria—, y
entrar sí, y va a la mesa.

**El rótulo cambió en veinte recorridos y cinco migajas.** «Mis campañas» era la señal de «has
entrado» de casi toda la suite. Se renombró en todos: un nombre a medias es peor que cualquiera de
los dos enteros.

**Lo que todavía no puede decir, declarado en vez de inventado:** «dónde se quedó» de verdad —la
crónica de la última sesión cerrada— no viaja en el listado de campañas, y pedirla por campaña
serían N peticiones en la pantalla de entrada. Se enseña la descripción, y queda ficha. **No se
inventa un resumen**: una tarjeta sin dato detrás es lo que las convenciones prohíben al adoptar la
maqueta.

**Evidencia.** 819 unitarias de web; 103 recorridos. Mutación: apuntar «Entrar a la mesa» al taller
deja el recorrido rojo.

**Revertir:** un commit. `DashboardPage` vuelve a montar `CampaignList`, que se conserva intacto.

## B1.3 — el estrato superpuesto: la mesa deja de tener tres columnas fijas (2026-09-04)

**Por qué.** El §4 del reseño reparte la pantalla en tres estratos, y el argumento sale del mapa de
teclas de Baldur's Gate 3: diez paneles tienen tecla de alternar y los retratos y la barra de
acciones **no tienen ninguna**. Un panel tiene tecla **porque se quita**; los otros no la tienen
**porque nunca se quitan**. La mesa tenía los tres mezclados en el mismo nivel.

**Qué entra.** Un **rail de paneles** permanente —Hoja, Bolsa, Mundo— que abre el estrato
superpuesto: encima, **uno a la vez**, Escape cierra y el foco vuelve al control que lo abrió.
«Consulta del mundo» **deja de ser una tercera columna fija**: se llevaba un cuarto del ancho las
cuatro horas para una búsqueda que se usa a ráfagas, y ese ancho vuelve al hilo, que es donde pasa
la partida.

**Y lo que va dentro de los paneles es lo que ya existía**, montado tal cual: `HojaCalculada` y
`PaginaDeInventario` son los mismos componentes que sirven sus pantallas propias. Eso es
exactamente lo que el reseño llama el trabajo de la sustitución —«la maqueta es presentación sin
datos, así que el trabajo real es enchufarla a la columna que se conserva»— y no reescribir dos
pantallas que funcionan.

**Evidencia.** `pnpm verify` limpio; 102 recorridos de navegador. Mutación: dejar que dos paneles
se abran a la vez deja el recorrido rojo con **dos diálogos** contados.

**Revertir:** un commit. Quitar `<RailDePaneles>` y `<PanelesSuperpuestos>` y devolver `<Consulta>`
a la rejilla de tres columnas.
