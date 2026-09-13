# Decisiones

Una línea por decisión tomada, con el enlace a dónde está razonada. **Esto no sustituye a los
specs**: sustituye a leerlos. `docs/superpowers/` son 13.662 líneas —el 61% de toda la
documentación— y `scripts/check-docs.mjs` las exime de todas sus comprobaciones a propósito,
porque un spec es el encargo del día que se escribió y no se reescribe después. Eso las hace
seguras de conservar y **caras de releer**: quien las abre buscando «¿por qué el peso está en
onzas?» carga cuarenta documentos para encontrar una frase.

**Cómo se usa.** Se busca aquí y se abre **solo** el documento que la fila enlaza. Si una fila
contradice al código, manda el código y la fila es un fallo que se corrige aquí. Si contradice
a su spec, manda el spec: es el registro fechado.

## Fase 2B — objetos, inventario y equipo · [plan](./superpowers/plans/2026-09-03-fase-2B-objetos-inventario-y-equipo.md)

Once decisiones de mecánica **tomadas sin el autor**, que pidió resolver y no preguntar.

| | Decisión |
|---|---|
| D-2B-1 | El sitio de un objeto es un enum de tres (`EQUIPPED`, `CARRIED`, `STORED`); **la sintonización es un booleano aparte**, no un cuarto sitio |
| D-2B-2 | Ranura de equipo desde la primera migración, con **índice único parcial** `(characterId, slot)` y validación de manos en el servidor |
| D-2B-3 | Tope de **tres sintonizaciones**, comprobado en el servidor (SRD 5.1) |
| D-2B-4 | Peso en **onzas** y valor en **cobres**, enteros en la base; kg y la moneda que toque en pantalla. Mismo principio que los pies |
| D-2B-5 | Dinero: **cinco columnas enteras** (`cp`, `sp`, `ep`, `gp`, `pp`), no un total normalizado |
| D-2B-6 | La carga **se calcula y se enseña, y no penaliza**: la sobrecarga es variante opcional del SRD |
| D-2B-7 | Un objeto de campaña nace `PLAYERS`, y **dárselo a quien no puede verlo se rechaza con un 400 que explica cómo arreglarlo** |
| D-2B-8 | **No** se modela «lo tengo pero no sé qué hace»: sería visibilidad por campo, que el modelo no hace en ninguna parte |
| D-2B-9 | La lista de efectos de un objeto es **cerrada** y vive en `packages/shared`. Todo lo demás es prosa |
| D-2B-10 | Las velocidades **pasan a derivarse en el motor, con traza**, en vez de salir planas del resolutor |
| D-2B-11 | El ataque lo compone **el servidor**, expresión incluida: un cliente que la monta puede decir `1d8` y mandar `1d12` |

## Fase 2C — dados, reloj y condiciones · [alcance](./superpowers/specs/2026-09-03-fase-2C-alcance-design.md) · [plan](./superpowers/plans/2026-09-03-fase-2C-plan.md)

Seis decisiones **del autor**, contestadas todas el 2026-09-03.

| | Decisión |
|---|---|
| D-2C-1 | El reloj de campaña se guarda **en segundos**, no en minutos ni en fechas: un asalto son seis segundos, así que 2C y Encuentros son el mismo contador |
| D-2C-2 | Una condición con duración **caduca sola y no se borra**: queda marcada como vencida y el DM la retira o la renueva |
| D-2C-3 | La tabla de dificultades **se siembra del SRD** — resultó estar en la fuente, así que no había nada que inventar |
| D-2C-4 | La **petición de tirada entra en 2C** (el DM pide un valor de la hoja y le llega solo a quien es) |
| D-2C-5 | **Cuatro modos de tirada**, y con ellos se cierra el agujero de la tirada a ciegas |
| D-2C-6 | Las **tablas de críticos y pifias del DM entran como opcional**, con interruptor por campaña y **apagadas por defecto** |

## Fase 2D — PNJ con números · [alcance](./superpowers/specs/2026-09-03-fase-2D-alcance-design.md)

| | Decisión |
|---|---|
| D-2D-1 | El autor eligió el **alcance grande**: no la ficha del PNJ, sino el **PNJ jugable en la mesa**, que recibe daño y coge condiciones |
| D-2D-2 | **Un PNJ en la mesa es una fila de `Character`**, no un modelo nuevo. Lo que le separa de un jugador es de dónde derivan sus números, no qué se le puede hacer |
| D-2D-3 | Dos orígenes de statblock y una sola forma resuelta, como los objetos de 2B: catálogo SRD **en código** y statblocks propios del DM **en la base**. `statblockRef` es una cadena (`SRD:goblin`), no una clave foránea |
| D-2D-4 | **No se transcriben los trescientos monstruos**: una tanda declarada en la banda de desafío que usa una mesa real (0 a 5), cada uno verificado contra la fuente |

## Fase 2.5 — Encuentros · [alcance](./superpowers/specs/2026-09-03-fase-2.5-alcance-design.md)

Decidida el 2026-09-03 y **anterior a la parte gráfica**: termina de conectar el motor.

| | Decisión |
|---|---|
| D-2.5-0 | **Encuentros va antes que la fase 3.** En palabras del autor, «completa el motor con lo que falta» antes de dibujar nada. Es la que renumeró la fase |
| D-2.5-1 | **Entra con pantalla**, no solo servidor: lo que solo tiene API tarda en tener pantalla, y un combate que no se puede jugar no cambia ninguna mesa |
| D-2.5-2 | **El daño lo aplican el DM y el dueño** del personaje, reutilizando el permiso que ya gobierna los PG desde 2A. Lo que compensa el riesgo es la traza: quién, a quién, de qué tipo y de qué tirada |
| D-2.5-3 | El **ataque de oportunidad entra, automático hasta donde se puede sin mapa**. El sistema ofrece y el DM descarta |
| D-2.5-4 | **Un personaje se archiva, no se borra**: es lo único abierto que destruye datos irreversiblemente mientras espera |
| D-2.5-5 | **Atacar no exige `canView` sobre el objetivo** (2.5.3): la garantía es «nunca sabrás su CA», no «no puedes apuntar a lo que no ves» — eso lo gobierna la mesa fuera del endpoint. La CA se calcula con un espectador del servidor (`role: "DM"`), nunca con el de quien pregunta, porque `hojaDeStatblock` se niega entera a cualquiera que no sea el DM y el atacante casi nunca lo es |
| D-2.5-6 | **La ventaja se sugiere, nunca se impone** (2.5.5): el SRD condiciona media tabla a circunstancias que el servidor no ve —la fuente del miedo a la vista, el atacante que te ve—, así que `createRollSchema.mode` sigue siendo de quien tira. Ver `packages/shared/src/roll-suggestion.schema.ts` |
| D-2.5-7 | **El fallo automático no es «desventaja»** (2.5.5): paralizado, petrificado, aturdido e inconsciente fallan solas las salvaciones de Fuerza y Destreza, y eso viaja en su propio campo `autoFail`. Con desventaja aún se saca la CD; con fallo automático no hay tirada |
| D-2.5-8 | **El fallo automático de «cegado» en las pruebas se deja fuera** (2.5.5): la regla dice *"any ability check that requires sight"* y el servidor no sabe si esta prueba lo requiere. Callar es más honesto que acertar la mitad de las veces |
| D-2.5-9 | **La muerte por agotamiento 6 se deriva, no se guarda** (2.5.5): sale en `deathSaves.status` leyendo el nivel puesto, así que quitar el agotamiento devuelve al personaje y no queda una segunda verdad. Y **no anota fracasos de salvación de muerte**: morir de agotamiento no es caer a 0 PG |

## Reseño de la mesa — se sustituyen las pantallas · [reseño](./superpowers/specs/2026-09-03-reseno-de-la-mesa-design.md)

**El carril gráfico**, en paralelo al motor. No es un cambio de aspecto: el reseño encontró
defectos de arquitectura de navegación, y son los que gobiernan estas decisiones.

| # | Decisión |
|---|---|
| D-R-1 | **Sustituir, no adaptar.** La maqueta de `prototipo/` es presentación sin datos; el trabajo es enchufarla a la columna que se conserva, no retocar la pantalla vieja hasta que se parezca |
| D-R-2 | Los colores son **tripletes de canal** (`--copper-ch: 201 125 70`) y no cadenas `rgb()`, para que los modificadores de opacidad de Tailwind (`/45`) compilen. Con ellos, la escala de opacidad se declara entera de 0 a 100: la de serie tiene huecos y la maqueta escribe `/15`, `/45` y `/62` |
| D-R-3 | **Tres temas**, no dos: `Oscuro`, `Claro` y `Lectura`. Decisión del autor; entró en B0 para no repintar tokens dos veces |
| D-R-4 | **La mesa está en la navegación**, y el reposo es uno de sus tres estados, no la ausencia de la mesa. Antes, fuera de sesión, el sitio donde se juega no era alcanzable |
| D-R-5 | **Tres estratos**: permanente (nunca se quita, sin botón de cerrar), superpuesto (encima, Escape cierra, uno a la vez) y contextual (aparece porque ha pasado algo). Un panel nuevo elige estrato antes que sitio |
| D-R-6 | **El elenco tiene dos disposiciones**, y la del jugador no lleva controles sobre los personajes ajenos: el DM ve la rejilla entera, el jugador ve el suyo destacado |
| D-R-7 | **El tipo de ficha es un filtro dentro de «El mundo», no siete destinos.** Las siete pestañas eran, literalmente, los valores del enum de la tabla `Entity`: la navegación era el esquema de la base de datos. De diecinueve destinos por campaña a seis |
| D-R-8 | Las colecciones que quedaban huérfanas —Personajes, Bestiario, Catálogo— van a **cajones sobre el taller**, en el mismo estrato superpuesto que los paneles de la mesa. Decisión del autor |
| D-R-10 | **El combate es una CAPA de la mesa, no una pantalla** (2.5.6): una tira de orden de turnos encima del elenco, que aparece al entrar en combate y se va al salir. La URL no cambia. Los PG y las condiciones de cada combatiente los sigue pintando el elenco: repetirlos en la tira sería una segunda ficha de personaje con su segunda regla de visibilidad |
| D-R-11 | **La unión de tipos de suceso se cierra** (ficha L1): `linea-de-log.ts` pierde su `default`, así que un tipo nuevo del motor rompe el build del gráfico en vez de aparecer como `Sin traducir` delante de los jugadores |
| D-R-9 | **Sesiones NO es un cajón**, y es la corrección del autor a lo anterior: lo bastante externo para ser una sección normal del taller. Y **la sesión se empieza desde la mesa**, no desde el taller — el gesto vive donde se juega |

## Fase 3 — ficheros, mapa y tablero · [alcance](./superpowers/specs/2026-09-03-fase-3-alcance-design.md)

**Sin empezar, y con cuatro decisiones del autor todavía abiertas.** Se listan porque bloquean:
si las tres piezas se hacen o solo el tablero; si el tablero es una pestaña o **es** la pantalla
de la sesión en curso; si la pantalla la dibuja el autor o se acepta una primera versión
funcional; y si el almacén de ficheros entra en producción con coste. Esta última no se puede
contestar mientras la copia de seguridad siga rota
([06-pendientes.md](./06-pendientes.md)): meter ficheros sin respaldo multiplica lo que se pierde.

## Las decisiones del 2026-09-04 · [registro](../.superpowers/sdd/progress.md)

**Veinticuatro tomadas con el autor en una sesión de seguimiento.** El razonamiento largo de cada
una está fuera del repositorio, en el documento de trabajo que las recogió; aquí va lo que decide.

| | Decisión |
|---|---|
| D-OP-1 | La copia de la base **se arregla y se prueba antes de que entre el almacén de ficheros** (3.A), no «cuando la mesa juegue de verdad» |
| D-OP-2 | **Despliegue aprobado** — hecho el 2026-09-04 (`924058d`) |
| D-OP-3 | La partida que cierra la fase 2 es **con agentes** llevando dos cuentas de jugador, y el autor de DM |
| D-OP-4 | El almacén de ficheros será **MinIO en el propio servidor**, no S3 de pago |
| D-OP-5 | **2.5.7** (ataques de oportunidad) entra **después de la partida de agentes**, escrito con lo que cuenten al jugarla |
| D-OP-6 | Contraseñas: **mitigación de coste cero**. Cada jugador comprueba que entra antes del día |
| D-OP-7 | `--warning` y `--success` se resuelven antes de B5 — **resuelto**: ver la sección de convenciones |
| D-OP-8 | Archivar (M9), revelar (P1) y concentración (M17) entran **antes de la partida de prueba**. **Los tres hechos** el 2026-09-05: archivar con su pantalla y su archivo (plan 06), revelar ya lo había cerrado la Ola 2 |
| D-OP-9 | `race`/`class`: **primero el diálogo de creación pasa al catálogo**, después la migración borra las columnas. Al revés, cada personaje nuevo nacería sin ninguna |
| D-OP-10 | Los temas **Claro y Lectura se ajustan al prototipo** (papel cálido, pliego de vitela) |
| D-OP-11 | **El oráculo de la CA se cierra**: el objetivo pasa `canView` o es combatiente del encuentro activo; si no, **404 idéntico al de un id inventado** |
| D-OP-12 | Los sucesos tendrán **concesiones nominales propias**, como columna `grantedUserIds String[]` y no tabla de unión |
| D-OP-13 | De `blinded` falta **la ventaja del atacante**, no la condición. El fallo automático de pruebas se queda fuera |
| D-OP-14 | Vocabulario del daño: **un módulo con dos formas**, larga y corta. `relámpago` / `rayo` |
| D-OP-15 | `attackRollEventId` **se promueve a columna con índice único**: la base garantiza «una sola vez» sin mutar un registro de solo añadir |
| D-OP-16 | **TipTap a `dependencies`** · **CI ejecuta `pnpm build`** · **`lychee` se retira** |
| D-OP-17 | **«Dónde se quedó»** entra en el listado de campañas, con la crónica de la última sesión cerrada filtrada por visibilidad |
| D-OP-18 | **Node 22, linting con tipos, cobertura y mutación: después de la partida de prueba** |
| D-OP-19 | **R1 se vuelve a medir** cuando el carril gráfico reemplace el diálogo del editor de reglas |
| D-OP-20 | **B6, el creador de personaje.** Se conserva el formulario y se viste con el lenguaje nuevo; **raza y clase pasan a catálogo** |
| D-OP-21 | **Fases 4 y 5 sin plan** hasta después de la partida de prueba |
| D-OP-22 | **El nervio en vivo se adelanta**: canal SSE por campaña que manda **avisos, no datos**. El sondeo se alarga a 60 s y queda de red de seguridad |
| D-OP-23 | **El momento de «tiren iniciativa»**: cartel a pantalla completa, sin cuenta atrás; el DM tira por quien falte y cierra él |
| D-OP-24 | **Una sola capa de ambiente**, vocabulario cerrado y **estética pixelada**. `prefers-reduced-motion` la apaga; nada sobre el texto; el clima es decorado, no regla |

**Aplicadas el 2026-09-05, con su plan y su commit** (lo demás de esta tabla sigue abierto):
**D-OP-11**, **D-OP-12**, **D-OP-13**, **D-OP-15** y **D-OP-17** por el
[plan 03](./superpowers/plans/2026-09-05-planes/03-carril-del-motor.md) (`52a461f` · `11c607c` ·
`5481225` · `0776569` · `288b3ea`); **D-OP-16** por el
[plan 01](./superpowers/plans/2026-09-05-planes/01-tres-baratas.md) (`6240f58`), midiendo que la
integración de `lychee` **nunca existió**; **D-OP-19** por el
[plan 14](./superpowers/plans/2026-09-05-planes/14-pulido-y-mediciones.md) (`912ff52`), que
remidió R1 y la encontró **funcionando**; y **D-OP-22** por el
[plan 12](./superpowers/plans/2026-09-05-planes/12-el-aviso.md) (`06a8875`), medido además contra
producción detrás de nginx y Traefik.

## Las decisiones del 2026-09-05 · [investigación](./superpowers/specs/2026-09-05-investigacion-decisiones.md)

**Cuatro del autor, y diecisiete cerradas contra las reglas o por recomendación.** Las que salen del
SRD llevan su fundamento: son las que **no se vuelven a preguntar**.

| | Decisión |
|---|---|
| D1 ✅ | **APLICADA el 2026-09-05** ([plan 04](./superpowers/plans/2026-09-05-planes/04-hilo-conversacion.md), `apps/web/src/features/sessions/hilo/HiloDeSesion.tsx:162`). **El hilo se lee como una conversación: lo último abajo.** La franja de «te perdiste» pasa a marcar el punto por debajo del cual está lo no leído, con el scroll anclado abajo y sin saltar si se está leyendo arriba |
| D2 | **Manda `04-convenciones.md` sobre el cobre**: un cobre nunca es un botón, el chip activo se queda en `--accent` y **la maqueta se corrige** |
| D3 ✅ | **APLICADA el 2026-09-05** ([plan 05](./superpowers/plans/2026-09-05-planes/05-color-por-personaje.md), `apps/web/src/dominio/voces.ts`). **El color de un personaje lo elige su jugador**, con un por defecto determinista salido de su `id`. Es `Character.color` —clave de una lista cerrada de **ocho**, nulable— y sirve para **la voz en el hilo y el retrato en el elenco**, que ahora salen de la misma función |
| D4 | **El tablero telaraña se retira y lo sustituye la línea de tiempo de la campaña**, ya encargada en [el prompt de Figma Make §18](./superpowers/specs/2026-09-02-prompt-figma-make.md). Muere con él el solape medido de chinchetas |
| I5 | **Curar entra en el elenco como gesto propio**, no como daño con signo: la curación topa en el máximo y **no restaura los temporales** |
| I6 | **Los ±5 del jugador sobre su propio personaje se quedan**: cada jugador lleva sus PG |
| I7 | **«Mirar en detalle» entra**, y se escribe la excepción: la regla prohíbe **mandos** sobre el personaje de otro, no **mirar** |
| I8 | **Inspiración se construye** (SRD: binaria, la concede el DM, se gasta para ventaja). **Ayudar se construye como acción** que da **ventaja** y caduca. **Flanqueo no entra**: es opcional del DMG, da ventaja y necesita adyacencia |
| I9 | **El campo de daño no admite signo**, y hay dos gestos con nombre |
| I10 | **El bando vive en el combatiente del encuentro**, no en `Character`: «enemigo» es una relación en un momento |
| I11 | **La sesión puede decir dónde abre la escena** (`openingEntityId`), filtrado por `canView` |
| I12 | **Condiciones de la casa como catálogo de campaña**, mismo patrón que las tablas de la casa. **No entran en el motor** salvo como sugerencia |
| I13 | **B6: teclear las características, tirar 4d6 descartando el menor, o un reparto que escriba el DM.** El SRD 5.1 **no trae método de generación**: array y compra por puntos son del Manual del Jugador |
| I14 | **`recapVisibility` se aplica**, y la crónica **sube a columna** en la misma migración: D-OP-17 necesita filtrar por ella |
| I15 | **`--success` no existe y no se añade** (ver convenciones) |
| I16 | **Cambiar el tipo de una ficha dice la consecuencia y deja rastro** |
| I17 | **Revelar lo manda `features/entities/BotonRevelar.tsx`** (ya consolidado); **archivar va en la ficha del personaje, junto a borrar, siendo el gesto fácil** |
| I18 | **Las doce desviaciones menores de la maqueta se aceptan en bloque**, escritas para que nadie las «arregle» de vuelta |
| I19 | **`DM_EXECUTED` se construye**: un botón «Ejecutar» en la ficha del mundo. Es lo que hace útil el motor para **preparar** sesiones |
| I20 | **`ENTITY_ATTACKED` se retira**: apunta a una ficha del mundo y aquí se ataca a un personaje. Su suceso útil ya existe (`ATTACK_RESOLVED`, 2.5.3) |
| I21 | **La barra de acciones, en tres piezas**: lo que ya existe · **la economía de turno del SRD y sus diez acciones** · los conjuros, fase propia. **Sin economía de turno la barra no impide nada** |

**Aplicadas el 2026-09-05:** **I10**, **I11** y **I14** por el
[plan 02](./superpowers/plans/2026-09-05-planes/02-tres-columnas.md); **I8** por el
[plan 08](./superpowers/plans/2026-09-05-planes/08-inspiracion-y-ayudar.md) —y con él el
flanqueo, que **no se construye**—; **I16** por el
[plan 07](./superpowers/plans/2026-09-05-planes/07-consolidacion.md); **I19** e **I20** por el
[plan 09](./superpowers/plans/2026-09-05-planes/09-la-batuta.md). **I21** sigue abierta: es de las
dos que piden diseño antes que código.

## Las decisiones de la EJECUCIÓN de esa noche (2026-09-05) · [índice de planes](./superpowers/plans/2026-09-05-planes/00-INDICE.md)

**Las de arriba son lo que se decidió ANTES de escribir código; estas son las que el código obligó a
tomar.** Salen del bloque «Avance» de cada plan, que es donde quien lo ejecutó las razonó de primera
mano con `fichero:línea` y commit. **Se recogen aquí porque varias contradicen a su propio plan**, y
una decisión que solo vive en el plan que desmiente se revierte por buena fe: el plan sigue diciendo
lo que decía —es un encargo fechado y no se reescribe—, así que lo que manda es esta página.

### Plan 15 · el crítico y lo pequeño · [Avance](./superpowers/plans/2026-09-05-planes/15-el-critico-y-lo-pequeno.md)

| | Decisión |
|---|---|
| E-15-1 | El crítico **deja de declararse**: el daño cita la tirada de ataque y el servidor lee su `natural`. Van **dos commits** en orden —la web manda el campo, después se quita `critical` del esquema— para poder revertir el segundo sin dejar el crítico roto |
| E-15-2 | La casilla «Crítico» **no se sustituye por otra casilla, sino por una frase**: un control que enseña lo que ya pasó no es un control, es información |
| E-15-3 | `GET /health` **no dice por qué está enfermo** —el error de Prisma cuenta motor, versión y a veces el nombre de la base a cualquiera que sondee—, y el `healthcheck` del compose pasa a **mirar el código de estado**: antes cualquier respuesta valía y un 404 pasaba por sano |
| E-15-4 | Las etiquetas **se normalizan y no se rechazan** —un duplicado no expresa ninguna intención—, y la normalización vive **en el esquema compartido y no en `parseTags`**: la pantalla no es la única puerta |

### Plan 07 · consolidación · [Avance](./superpowers/plans/2026-09-05-planes/07-consolidacion.md)

| | Decisión |
|---|---|
| E-07-1 | El barrido de iconos duplicados **es la tarea, no la limpieza**: encontró tres copias que la lectura a ojo se había dejado, y sin él la cuarta llega sola |
| E-07-2 | `IconoObjeto` y `IconoLugar` **no se fusionan**: son tres dibujos para tres significados, y un icono que solo usa su módulo **se queda en su módulo** |
| E-07-3 | Las dos tablas del daño —larga y corta— **son completas**, sin valor por defecto: con dos `Record<DamageType, string>` el compilador exige las dos, y un tipo nuevo no puede colarse largo en la forma corta |
| E-07-4 | Carpeta nueva `apps/web/src/dominio/` para el **vocabulario del juego usado por más de una pantalla**, declarada en [01-arquitectura.md](./01-arquitectura.md). `shared` dice **qué forma tienen los datos**; el español de pantalla no vive ahí |
| E-07-5 | Reclasificar una ficha se confirma **en los chips del taller y no en el editor** —la ficha señalaba el sitio equivocado—, y **solo al editar una que ya existe**: una confirmación que salta cuando no hace falta se aprende a ignorar en dos días |
| E-07-6 | El suceso `ENTITY_RETYPED` lleva **los dos tipos y como clave** (`NPC`/`DOCUMENT`): «ahora es un Documento» no dice qué se perdió, y la forma legible se compone al pintar |

### Plan 05 · el color de cada personaje · [Avance](./superpowers/plans/2026-09-05-planes/05-color-por-personaje.md)

| | Decisión |
|---|---|
| E-05-1 | **La lista cerrada va en `shared`; los rótulos, en `apps/web/src/dominio/`** — contra la letra del plan, que pedía las dos cosas en `shared`, y a favor de E-07-4 |
| E-05-2 | Las ocho claves son **palabras españolas** (`tinta`, `brasa`, `salvia`…) y **no nombres de token**: atar el dato guardado al nombre de un token haría que renombrarlo corrompiera datos ya escritos |
| E-05-3 | `!== undefined`, **no _truthy_**: `null` es «vuelvo al color por defecto», un valor legítimo y distinto de ausente |
| E-05-4 | **Sin endpoint nuevo**: `requireEditable` ya es «dueño o DM», y una segunda puerta sería otra copia de la misma matriz |
| E-05-5 | Quién habla en el hilo **se resuelve en tres reglas** —el sujeto del suceso, el único personaje vivo del actor, o ninguno—, porque el registro guarda el **usuario** y no el personaje. Con dos personajes vivos **no se elige**: pintar al hermano es peor que un color sin dueño |
| E-05-6 | `colorDeVoz` **se borra, no se deja como envoltorio**: una función que siga aceptando un `id` suelto permite volver a colorear por el usuario sin que nadie lo note |

### Plan 08 · inspiración y Ayudar · [Avance](./superpowers/plans/2026-09-05-planes/08-inspiracion-y-ayudar.md)

| | Decisión |
|---|---|
| E-08-1 | **La inspiración NO es `Character.inspired Boolean`**, que es lo que pedía el plan: es `CharacterResource` con `max: 1`, la tabla que ya la nombraba como su primer ejemplo desde 2A.8. Una columna habría sido **una segunda verdad sobre el mismo hecho** |
| E-08-2 | Se siembra **al crear el personaje** y no en `seedResourcesFor`, que siembra lo que implica la clase: la inspiración no viene de la clase |
| E-08-3 | **Dos agujeros que solo se vieron al sembrarla, arreglados para TODOS los recursos**: gastar más de lo que hay pasa de 200 a **409**, y reponer pasa por el candado de `grantedBy` —sin él, un jugador se concedía inspiración a sí mismo con el «+1» de su hoja— |
| E-08-4 | `spendInspiration` **viaja en la petición de la tirada**, en las cuatro puertas donde el SRD la permite, y **en el daño no**: gastar y tirar por separado deja dos formas de romperlo |
| E-08-5 | Con desventaja declarada, gastarla es **400 y no un gasto silencioso** (SRD: «you are considered to have neither of them»): quemarla habría sido «correcto» y hostil |
| E-08-6 | «Al principio de tu siguiente turno» se guarda como `expiresAtClock` **sobre el reloj de campaña**, no como un contador de turnos propio que pueda discrepar del primero |
| E-08-7 | El suceso de ayudar lleva **la visibilidad del ayudado**, no la del ayudante: con la del ayudante, ayudar a un PNJ `DM_ONLY` lo anunciaba a la mesa |
| E-08-8 | El control de Ayudar va **en tu tarjeta del elenco**: sobre el personaje de otro no van mandos, y a quién ayudas es un parámetro de una acción tuya |
| E-08-9 | **El flanqueo no se construye, y el commit lo dice**: es opcional del DMG, da ventaja —no el `+3` de la maqueta— y necesita adyacencia, o sea el tablero de la fase 3 |

### Plan 09 · la batuta · [Avance](./superpowers/plans/2026-09-05-planes/09-la-batuta.md)

| | Decisión |
|---|---|
| E-09-1 | **`ENTITY_ATTACKED` se retira del vocabulario y SE CONSERVA en el esquema.** Medido antes de decidir: **244 reglas guardadas y ninguna lo usa**, pero quitarlo del Zod haría que una regla vieja **dejara de poder leerse**. Cero filas hoy no es cero filas nunca. Se queda en `DISPARADORES_SIN_MOTOR` para siempre, con su motivo |
| E-09-2 | `matchesTrigger` **pierde su `default: return false` y gana un `never`**: un disparador nuevo sin su `case` no coincidía nunca **y en silencio**. Lo destapó el e2e contra Postgres, no la lectura |
| E-09-3 | `DM_EXECUTED` lleva `entityId` **en el payload** y la campaña como sujeto —ejecutar es algo que hace el DM, no algo que le pasa a la ficha— y es **siempre `DM_ONLY`**: heredar la visibilidad de la ficha habría filtrado su nombre |
| E-09-4 | El contador de reglas armadas **sale de la pantalla**, no de un endpoint nuevo, y cuenta **solo las armadas, de esta ficha y de este disparador**: contar de más promete algo que no va a pasar |
| E-09-5 | `CHARACTER_ATTACKED` sale del **sujeto** de `ATTACK_RESOLVED` y no de su payload, que lleva al atacante: leerlo al revés habría dado la regla del revés |

### Plan 11 · la administración de la mesa · [Avance](./superpowers/plans/2026-09-05-planes/11-administracion-de-la-mesa.md)

| | Decisión |
|---|---|
| E-11-1 | El cambio de papel vive en un **módulo propio** (`apps/api/src/members/`): `game-events` importa `campaigns`, así que el suceso no cabía en `CampaignsService` sin un `forwardRef`, que este proyecto ya declaró que es **esconder el ciclo** |
| E-11-2 | El 409 del «último DM» **cuenta cuántos quedarían, no quién eres**: mirar «¿es el creador?» habría impedido que el creador se bajara después de ascender a otro |
| E-11-3 | `usedById` es **columna nueva que el plan no pedía**, porque el plan sí pedía decir **quién** usó la invitación y `usedAt` solo guarda cuándo. Sin clave foránea: borrar una cuenta no borra la invitación que usó |
| E-11-4 | `revokedAt` propio, **sin reutilizar `usedAt`**: marcar como «usado» un enlace revocado habría mentido sobre quién entró en la mesa |
| E-11-5 | El estado de una invitación **se deriva, no se guarda** —misma regla que el vencimiento de una condición (2C.4)— |
| E-11-6 | Inventado, gastado, revocado y caducado responden **byte a byte lo mismo**: cuatro mensajes habrían hecho del endpoint un oráculo de tokens |
| E-11-7 | El listado enseña **solo la cola del token**: es una pantalla que se abre con gente al lado |
| E-11-8 | **«Sin caducidad» sigue existiendo y no se esconde**; el selector solo propone siete días. Cambiar el defecto en silencio pondría fecha de muerte a la costumbre de la mesa |

### Plan 13 · modificadores temporales · [Avance](./superpowers/plans/2026-09-05-planes/13-modificadores-temporales.md)

| | Decisión |
|---|---|
| E-13-1 | **No hay motor nuevo, y ese es el plan entero**: un modificador temporal es **una fila más convertida en un `Modifier` más**, por la puerta `extraModifiers` que ya usan las anulaciones manuales |
| E-13-2 | Entra como **`add`**, y por eso llega antes de los topes sin que nadie ordene nada: no hacía falta una posición, hacía falta la operación correcta |
| E-13-3 | El motivo —prosa libre del jugador— viaja **dentro del `labelKey`, detrás de `temporary:`**, para no cambiar la forma de la traza que fijó 2A.3 por un caso |
| E-13-4 | `sourceKey` es **el id de la fila y no el `target`**: dos pociones de fuerza son dos pasos de la traza, no uno repetido |
| E-13-5 | **`POST` y no `PUT` con clave**, a diferencia de las condiciones: no se está envenenado dos veces, pero sí se beben dos pociones. Esa diferencia de forma confirma que no debían compartir tabla |
| E-13-6 | Quitarlo a mano **no emite `TEMP_MODIFIER_EXPIRED`**: el registro contaría un vencimiento que no ocurrió |
| E-13-7 | **El reloj hacia atrás revive un vencido, y se declara**: la caducidad es una resta contra el reloj y no un estado guardado, igual que en una condición |
| E-13-8 | Lo pone **el DM o el dueño** (`requireOwnerOrDM`): obligar al DM a teclear una poción convertiría una acción de un turno en una petición |

### Plan 14 · pulido y mediciones · [Avance](./superpowers/plans/2026-09-05-planes/14-pulido-y-mediciones.md)

| | Decisión |
|---|---|
| E-14-1 | **R1 se cierra remidiendo**: el arrastre funciona dentro del cajón. La primera pasada dio un control falso **por geometría** —la sonda caía fuera de la vista— y habría «confirmado» el diagnóstico viejo por el motivo equivocado |
| E-14-2 | **C3-4 no se cierra con R1**, y es una decisión: lo que desaparece es la **premisa** del comentario. Montar el editor de reglas en la mesa es una decisión de pantalla con su propia tanda, no una línea aquí |
| E-14-3 | **`aria-disabled` en botones sí; en campos de formulario no.** Un `<input>` apagado no tiene motivo que leer al tabular, y `aria-disabled` no impediría escribir en él: la ficha habla de **controles con motivo**, y un campo no lo es |
| E-14-4 | Como `aria-disabled` **no impide pulsar**, el `onClick` sale antes en el `Button` compartido —y `preventDefault` corta además el `submit`—; sin eso el botón haría justo lo que dice que no puede hacer |
| E-14-5 | «Hay cambios sin guardar» se decide **comparando valores**, no con una bandera de «he tecleado», y **las tres salidas del cajón pasan por la misma puerta**; el aviso vive **dentro** del cajón para que dos capas no se peleen por el atrapa-foco |
| E-14-6 | **El orden de los dos filtros de la búsqueda ES la seguridad: primero `canView`, después el texto.** Al revés, buscar sería un **oráculo** —una palabra que solo está en una ficha `DM_ONLY` la delataría—, y por eso el e2e comprueba **que NO encuentra** |
| E-14-7 | El texto **se compara en el servicio y no en la consulta**: `body` es `Json`, filtrarlo en Prisma pediría SQL crudo y perdería el `include` que `canView` necesita — y esa consulta ya traía todas las filas |
| E-14-8 | `filterEntities` **deja de filtrar por texto en el navegador**: dos filtros para lo mismo, y el día que discrepen gana el que menos sabe |
| E-14-9 | **U2 se cierra midiendo y no arreglando**: siete destinos alcanzables a 375 px. La ficha describía una columna que ya no existe |
| E-14-10 | El ornamento **no usa `prefers-reduced-motion`** —habla de movimiento y esto no se mueve— y **deja de pintarse en vez de esconderse con CSS**; `OrnamentRule` no se apaga porque es estructura del texto |
| E-14-11 | Los temporales **preguntan cuál se queda** (`tempHpEleccion`): el servidor se quedaba con el mayor por su cuenta y eso **quita la elección que da el SRD** («you decide whether to keep the ones you have») |
| E-14-12 | La página de lectura de una sesión **no reimplementa el filtro de la crónica**: el servidor borra **las dos** columnas, y borrar solo el texto diría «hay una crónica que no puedes leer», que ya es información |

### Plan 12 · el aviso · [Avance](./superpowers/plans/2026-09-05-planes/12-el-aviso.md)

| | Decisión |
|---|---|
| E-12-1 | **El aviso de un comentario pasa por `canView`, y ahí está media tarea**: «han comentado esta ficha» confirma que la ficha existe, que es justo lo que esconde `DM_ONLY`. Ser DM no da acceso a una ficha que no ves |
| E-12-2 | **El cuerpo del comentario no viaja en el aviso**, igual que no viaja en su suceso: una segunda copia del texto sería una segunda puerta con otras reglas |
| E-12-3 | Una sesión **se anuncia cuando gana fecha**, no en cada `update`; y el aviso sale **fuera de la transacción**, porque dentro se escribiría aunque el comentario acabase deshecho |
| E-12-4 | **Un POST sin cuerpo no es un cuerpo inválido**: `undefined` vale como `{}` **solo** en el cuerpo y **solo** si el esquema no exige nada. Es lo que tenía roja en `main` la suite de avisos |
| E-12-5 | La bandeja **se monta en dos sitios y es el mismo componente** —la mesa vive fuera de `AppShell`—, y **sin sesión no pregunta**, porque la cabecera se pinta también en el 404 |
| E-12-6 | El vocabulario de avisos es un **`Record` exhaustivo** —un tipo nuevo sin frase no compila, en vez de asomar su enumeración— y **sin destino no se finge uno** |
| E-12-7 | **El canal manda avisos y NO datos**, que deja `canView` en un solo sitio: un canal tonto no puede filtrar mal. Su mensaje es **agnóstico del transporte** porque la fase 3.C traerá WebSocket |
| E-12-8 | **El billete se comprueba dos veces**, al emitirlo y al canjearlo: entre las dos cosas caben treinta segundos, y en treinta segundos se puede haber echado a alguien de la mesa |
| E-12-9 | **`assertCanJoin` va fuera del controlador de SSE**, para que el WebSocket de la 3.C reutilice «quién puede» en vez de escribir la segunda copia |
| E-12-10 | **Latido cada 15 s** —sin él el navegador reconecta cada minuto sin ningún error visible— y **el sondeo unificado a 60 s** en una constante, con **una excepción declarada**: la petición de tirada, a 15 s, porque es una pregunta hecha en voz alta |

### Después de los planes · el seed, el paseo y el tope del historial

| | Decisión |
|---|---|
| E-N-1 | **El tope de `docs/07-historial.md` sube de 400 a 1000**, como decisión declarada en [04-convenciones.md](./04-convenciones.md) y no como un número subido en silencio. Lo que **no** cambia: una entrada se archiva **moviéndola entera**, nunca resumiéndola |
| E-N-2 | La campaña de demostración **se siembra por HTTP y no por Prisma** (`scripts/seed-demo.mjs`): así encontró seis contratos mal entendidos que unas filas perfectas escritas por Prisma no habrían destapado |
| E-N-3 | **Una cuenta que no sea de `@demo.invalid` no se crea nunca desde el seed**: registrar el correo real de alguien con una contraseña inventada es crear su cuenta |
| E-N-4 | **El bando de un combatiente no recibe un valor por defecto inventado**: todos entran `NEUTRAL` y faltaba la pantalla que lo eligiera — **ya no falta**, la trae el plan de la iniciativa (ver más abajo). Marcar a los PNJ como enemigos «porque suele ser así» sigue sin hacerse: sería el servidor decidiendo por el DM |
| E-N-5 | **La sala de espera no le enseña a un jugador la cuenta ni los nombres de quién falta** (solo su propio estado): `RollRequestsService.list` recorta lo que ve a sus propios personajes, y ensanchar esa regla para pintar un contador bonito sería `canView` dejando de ser el dueño único de quién ve qué. Confirmado por el autor en la ronda de arreglo 1 (2026-09-06): no se toca |
| E-N-6 | **El encuentro en curso se invalida con `encountersKey(campaignId)` (`["encounters", campaignId]`), sin `sessionId`**: `invalidateQueries({ queryKey })` de TanStack v5 coincide **por prefijo** salvo `exact: true` —la misma regla que ya usa la invalidación de `["campaigns", campaignId]`—, así que ese array basta para alcanzar `currentEncounterKey` de cualquier sesión. La ronda de arreglo 1 (2026-09-06) había escrito un predicado a mano justificándolo con «no hay un array exacto que invalidar»; era falso, y la revisión de la ronda 2 lo corrigió junto con esta línea |

## Plan «la iniciativa la piden los jugadores, el DM elige el bando» (2026-09-05/06) · [spec](./superpowers/specs/2026-09-05-iniciativa-y-bando-design.md) · [plan](./superpowers/plans/2026-09-05-iniciativa-y-bando.md) · [ledger](../.superpowers/sdd/2026-09-05-iniciativa-y-bando/progress.md)

**Quince tareas (T1–T15), tomadas todas sin el autor** — dormía, con orden de terminar el plan
entero vía otra sesión. Varias **contradicen al propio plan**, que se corrige encima y no se
reescribe: es lo justo para lo que existe esta página. Los números `R*` remiten al ledger, que
tiene el razonamiento completo; aquí solo la línea.

| | Decisión |
|---|---|
| E-IB-1 | **`INITIATIVE_ROLLED_BY_SYSTEM` se declara también en el `enum GameEventType` de `schema.prisma`** y no solo en el SQL de la migración, como traía el plan: dejarlo fuera habría desincronizado Prisma y `migrate` marcaría deriva (R1) |
| E-IB-2 | **El guardián de `start()` pasa a `status IN ('ACTIVE', 'PREPARING')`**, igual que el índice único recontado: con solo `ACTIVE`, el 409 legible se quedaba corto (R4) |
| E-IB-3 | **Las pruebas que leen `RollRequest`/`Combatant` reales van a un e2e nuevo** (`iniciativa-repartida.e2e-spec.ts`), no a `encounters.service.spec.ts`: ese fichero usa Prisma simulado, que no valida SQL (R2) |
| E-IB-4 | **Manda la firma real de `GameEventsService.record` y de `requireDM`**, no el pseudocódigo del plan: el plan es el argumento, el código es el hecho (R3) |
| E-IB-5 | **`EncountersModule` exporta `EncountersService`**, sin ciclo (`encounters` no importa `roll-requests`), para que la tarea 4 pueda llamarlo (R5) |
| E-IB-6 | **La documentación (T12) se ejecuta la última**, después de T13–T15, para no dejar el historial mintiendo sobre tres tareas que venían detrás (R6) |
| E-IB-7 | **El vocabulario de bandos y estados de combate va a `apps/web/src/dominio/combate.ts`**, no a un `vocabulario.ts` propio de la feature de encuentros como pedía el plan: lo importan dos features distintas, y `dominio/` es donde ya viven `dano.ts` y `voces.ts` por la misma razón (D-OP-7, R7) |
| E-IB-8 | **El payload de `INITIATIVE_ROLLED_BY_SYSTEM` es `{ characterId, characterName?, total }`, sin `roll`**: `characterId` es lo único que un consumidor puede resolver, `total` es lo que pinta la línea, y `roll` no lo pinta nadie —el suceso de la tirada ya guarda los dados aparte— (R8, corrigiendo la revisión Q-3) |
| E-IB-9 | **Entra «tarea 9b»**, no prevista en el plan: los PNJ pasan a enseñarse en la columna del elenco, cruzando `pnjs` contra `encuentro.combatants` desde el compositor (sin duplicar consulta ni tocar el servidor). Sin ella, el bando (T10) no alcanzaba a un enemigo, el objetivo de ataque (T13) no tenía a quién apuntar desde la mesa, y curar (T14) no llegaba a un PNJ aliado (R11) |
| E-IB-10 | **`encounterId` sale de `createRollRequestSchema`**, contra el paso 3 del plan: nadie lo consume desde el `POST` público —`EncountersService` escribe con `tx.rollRequest.create`—, y dejarlo prometía una garantía que ese esquema no da (R14) |
| E-IB-11 | **Un encuentro que nace `PREPARING` no escribe `ENCOUNTER_STARTED`**; solo al pasar a `ACTIVE`. Nace `ACTIVE` → se escribe como siempre. Con la escritura al nacer, el suceso saldría dos veces cuando la tarea 3 lo hiciera pasar a activo (R15) |
| E-IB-12 | **`end()` no se toca y sigue exigiendo `ACTIVE`**: la puerta declarada para un combate que nunca empezó es el `DELETE` de cancelar —«no es historia, es un clic deshecho»—, y aceptar `PREPARING` en `end()` sería una segunda salida que contradice esa decisión (R16) |
| E-IB-13 | **Cerrar la petición de iniciativa y escribir el número de iniciativa se fusionan en UNA transacción** (`aplicarIniciativaDePeticion`), contra el diseño en dos pasos: conserva la propiedad de que la iniciativa solo se escribe si se gana la carrera (R17) |
| E-IB-14 | **El `SELECT … FOR UPDATE` del encuentro vive dentro de `recolocar`**, no en cada llamador: es la puerta única de «iniciativa + grupo → orden», y serializa también `setInitiative` y `start`, que es lo que se quiere (R18) |
| E-IB-15 | **`setInitiative` conserva de quién es el turno por identidad del combatiente, no por número**, con el combate `ACTIVE`: renumerar tras una corrección no debe saltar un asalto ni mover el reloj solo porque la posición activa desapareció (R19) |
| E-IB-16 | **La ficha «un `PREPARING` no se puede terminar» se cierra desapareciendo**, no recolocando su cita: la tarea 4 la tacha con `force-start` y `DELETE` (R20) |
| E-IB-17 | **La tirada huérfana de una carrera perdida no se evita cerrando antes de tirar**: cerrar primero y fallar la tirada dejaría la petición anulada y al combatiente a iniciativa 0, peor que una línea de más en el registro (R21) |
| E-IB-18 | ~~**`cancel()` no escribe suceso**~~: decía que un combate que nunca empezó «no es historia, es un clic deshecho» y que escribir sobre un `Encounter` recién borrado sería la historia que se decidió no guardar (R22). **El autor la revisó el 2026-09-06 y la corrigió — ver D-A-3**: *«pese a que no queda trazabilidad, puede descolocar a un jugador»*. El argumento del `Encounter` borrado seguía siendo cierto, y por eso el suceso nuevo tiene por sujeto la **sesión** y no lleva `encounterId`. **No se borra esta línea**: el motivo del cambio es el jugador, no el historial, y saber que se pensó lo contrario es lo que evita volver a pensarlo |
| E-IB-19 | ~~**`setSide` y el reajuste de `activePosition` no emiten suceso todavía**~~: se decidía con la pantalla, en las tareas 8 y 10, no a ciegas (R23). **Decidido el 2026-09-06 con esas pantallas ya montadas** (paso 1, tarea 16): dos tipos nuevos, `COMBATANT_SIDE_CHANGED` y `ACTIVE_TURN_SHIFTED`, sin nombres ni posiciones |
| E-IB-20 | **Corrección de rumbo (del autor, mediada): no se abren fichas por lo que se sabe arreglar.** Cuatro pasos: cambio rápido y duradero → ¿cumple las reglas? → ¿lo contesta internet con la cita en el commit? → y solo entonces ficha (R24) |
| E-IB-21 | **El «500 intermitente» de `updateSheet` se cierra arreglando la causa, no anotándola** — con el diagnóstico ya hecho, intentarlo era el paso 1, no el 4 (R25). **Resultado: no había nada que arreglar.** 900 peticiones HTTP reales concurrentes sin un fallo; la carrera solo aparecía bajo `supertest` disparando `app.listen(0)` por petición — un artefacto del arnés de pruebas, no un defecto del producto (R26) |
| E-IB-22 | **El bando se distingue por PALABRA, no por color**: `--success` no existe y no se añade (D-OP-7); como mucho `--warning` en el nombre del enemigo, nada en el aliado, y sin icono nuevo en el diálogo de empezar combate (R27, R34) |
| E-IB-23 | **El panel del jugador que espera su iniciativa se pinta desde la lista de peticiones vivas y se va solo** cuando la suya deja de estar — sin botón de cerrar, que rompería la misma regla (R30) |
| E-IB-24 | **Los objetivos de un ataque salen de los combatientes del encuentro, no de `useCharacters`**: esa consulta filtra `statblockRef: null` y nunca trae un PNJ (R31) |
| E-IB-25 | **T14 se corrige encima del plan: curar YA funcionaba desde la hoja.** Lo que faltaba era solo el gesto rápido de la mesa (`PonerDano.tsx` solo mandaba daño); T14 añade la dirección de curar reutilizando `useChangeHp`, no una puerta nueva (R32) — y el tope de curación manda del servidor, no del navegador, resolviendo la contradicción del propio paso 3 del plan con su segunda prueba (R33) |
| E-IB-26 | **En rondas de pantalla pequeñas y mecánicas, la verificación es mía leyendo el fichero**, no una re-revisión con agente: quedaban nueve tareas y la noche es finita, con la mutación ya comprobada como condición (R36) |
| E-IB-27 | **`useCurrentEncounter` sin refresco por el canal en vivo NO es deuda, es la propia tarea 8**: sin él la sala de espera nace muerta (R37) |
| E-IB-28 | **Ninguna ronda de arreglo se lanza mientras otra tarea escribe en el mismo árbol**: el gancho corre `pnpm verify` entero y vería el trabajo a medias del otro — rojo falso, la trampa que ya costó 82 fallos (R38) |
| E-IB-29 | **El modificador de iniciativa se añade al listado de peticiones, no se anota como pendiente**: el spec lo exige explícitamente y el jugador tiene derecho a saber con qué tira antes de pulsar; una sola fuente (`getInitiativeModifier`), nunca recalculado en el navegador (R39) |
| E-IB-30 | **Se acaba el paralelismo de implementadores en el mismo worktree**: dos agentes escribiendo el mismo directorio comparten índice de git, y un `git stash` de uno se llevó el trabajo del otro dos veces esa noche (R40) |
| E-IB-31 | **Al jugador no se le enseñan los PG máximos ni la CA exacta de un PNJ**: el servidor los omite a propósito de la lista, y la CA exacta es el oráculo que D-OP-11 ya cerró — que `useCharacterSheet` lo permitiera no era decisión tomada (R41) |
| E-IB-32 | **La duplicación entre `FichaDePnj` y `FichaDeElenco` (~95 de 184 líneas) se extrae ya**, empezando por la fila de mandos: así nacieron las tres copias del vocabulario del daño que este proyecto ya cita como escarmiento (R42) |
| E-IB-33 | **El orden de objetivos de un ataque es relativo al bando de quien ataca** (contrario primero, neutral, propio), no una tabla fija: con la tabla fija, un PNJ del DM —que es `ENEMY`— vería primero a sus propios aliados (R44) |
| E-IB-34 | **La fuga de CA por ataques repetidos no se cierra en T13**: no estaba fuera de alcance técnico, estaba fuera del alcance del encargo (tres ficheros de `apps/web`), y con esta tarea hecha es más barata de cerrar de lo que su ficha suponía (R45) |

## Las cinco del autor (2026-09-06) · destraban los pasos 1 y 3

Preguntadas con su recomendación, contestadas todas. **Las dos primeras destraban tareas que estaban
escritas y paradas**; las tres últimas fijan el criterio del catálogo antes de escribir el conversor.

| | Decisión |
|---|---|
| D-A-1 | **Un descanso avanza el reloj de campaña**: largo 8 h, corto 1 h. *«Ya lo hace en combate; el descanso también. El DM programa el descanso y decide, así se cierra entre sesión y sesión.»* Cambia el comportamiento de todo lo que caduca, y por eso se declara en [04-convenciones](./04-convenciones.md) y no se cuela en un arreglo. Destraba la **tarea 9** del [paso 1](./superpowers/plans/2026-09-06-paso-1-goteras.md) |
| D-A-2 | **Un PNJ revelado esconde sus números, MENOS sus puntos de golpe**: los PG actuales son lo único que ven sus jugadores. Cierra la fuga de las seis características de un statblock `DM_ONLY`, y elige la salida (a) —ocultar— frente a (b) —cambiar la frase—. Motivo: saber que un enemigo está malherido es información de mesa legítima; su hoja no. Destraba la **tarea 18** del paso 1 |
| D-A-3 | **Cancelar un combate SÍ avisa al jugador** que tenía una petición de iniciativa pendiente. *«Pese a que no queda trazabilidad, puede descolocar a un jugador.»* Corrige la decisión anterior de dejarlo en silencio (E-IB-4): el sujeto del aviso no puede ser el encuentro —ya no existe— sino la **sesión** |
| D-A-4 | **Armas, armaduras y monstruos SE REEMPLAZAN por los de Foundry.** *«Lo ideal sí sería reemplazar.»* Cierra en sentido contrario a la recomendación de la spec del [paso 3](./superpowers/specs/2026-09-05-paso-3-catalogo-design.md), que proponía decidirlo con el conversor escrito: se sabe ya, y el conversor se escribe sabiéndolo. **Las invariantes probadas de lo transcrito a mano se conservan y se aplican a lo importado** |
| D-A-5 | **Sin traducción oficial, el nombre se queda en inglés; las descripciones se intentan en español y, si el YAML no lo permite, se quedan en inglés.** Lo que **no** cambia: un nombre no se traduce por criterio propio —falló en 2 de 15 monstruos: *goblin* no es «trasgo», *wight* es «Tumulario»— y una **frase de reglas** en español sale del SRD oficial, nunca de una paráfrasis |
| D-A-6 | **Antes de fijar el esquema de la actividad se mapean DIEZ conjuros a mano** —uno de cada actividad, uno con concentración, uno que escala, uno de los que caen fuera, uno con usos y uno con materiales con coste—. No importa nada ni toca el catálogo: es papel. **Si dos no entran, se corrige el esquema antes de escribir código.** Media jornada aquí evita una migración del catálogo entero en el paso 3. Propuesta de la sesión de acompañamiento, aprobada por el autor el 2026-09-06 |

## Paso 2 y botín (2026-09-06/07) · [plan A](./superpowers/plans/2026-09-06-paso-2-actividad.md) · [plan B](./superpowers/plans/2026-09-06-botin-y-reparto-plan.md)

Diecinueve tareas, dos planes ejecutados por superficie. El detalle de cada corrección está en
`.superpowers/sdd/2026-09-06-tanda-paso2-y-botin/progress.md` (local, no viaja con el clon) y en el
informe para el autor, `informe-paso-2-y-botin.md` (fuera de este repositorio); aquí solo las
decisiones que no se pueden deducir del código.

| | Decisión |
|---|---|
| D-P2-1 | **El esquema corregido de la actividad manda sobre el texto del plan** donde discrepen. La tarea 0 mapeó diez conjuros contra el borrador del plan y ocho no cabían — el esquema corregido está en `.superpowers/sdd/2026-09-06-tanda-paso2-y-botin/briefs/esquema-corregido.md` |
| D-P2-2 | **`ataque` y `salvacion` llevan su propio `dados` opcional**, no uno separado de la actividad: en Foundry una actividad `attack` lleva su `damage` dentro y una `save` también — partirlas dejaba 81 actividades del SRD sin una forma de una pieza |
| D-P2-3 | **`prueba.ability` admite `"lanzamiento"` y su `cd` es opcional.** Una prueba de característica, a diferencia de una salvación, no siempre nombra una característica concreta (`counterspell` es del ejemplo) ni siempre trae una CD derivable (4 de 14 actividades `check` del SRD no traen ninguna) |
| D-P2-4 | **«Sin tope» se dice con `null`, nunca con un número grande.** `CharacterResource.max` ya era nulable; escribir un `999` como hace Foundry sería el mismo `simplifyBonus` con otra cara — ver [04-convenciones.md](./04-convenciones.md) |
| D-P2-5 | **Un tramo de una tabla de escala se extiende hacia arriba**, y por eso no hay guarda por encima del último: la Furia es +4 de daño a nivel 20 porque el tramo del 16 sigue vigente, y una guarda ahí haría reventar la hoja de todo bárbaro de nivel 17 a 20 |
| D-P2-6 | **`nivelDeEspacio` se deriva del recurso que se gastó de verdad, nunca se confía del cliente.** Lo que el cliente manda elige qué espacio gastar, no a qué nivel se lanzó: sin esto, declarar nivel 9 y pagar un espacio de nivel 1 es trampa gratis |
| D-P2-7 | **B3 NO añade un tipo de suceso `ITEM_GIVEN`.** Su premisa —«hoy un objeto aparece en una bolsa y nadie sabe de dónde salió»— es falsa: `ITEM_ADDED` y `MONEY_CHANGED` ya llevan actor, objeto y cantidad. Lo que faltaba era decir **quién** lo dio, y eso es un campo opcional `de` sobre los dos tipos que ya existían, nunca un tercero — un valor de enum de PostgreSQL se añade y no se borra jamás |
| D-P2-8 | **`ContentRef` es la unión de objetos que ya existía** (`{source, key}` / `{source, id}` de `character-build.schema.ts`), no la cadena `"SRD:short-sword"` que escribía la prosa de ambos planes. El código manda sobre el texto caducado |
| D-P2-9 | **El dueño de una condición reservada puede retirarla él mismo si fue él quien la puso** (`appliedById`), para cumplir el SRD sobre la Furia («puedes terminar tu furia como acción adicional»). La condición que un DM aplicó a mano sigue necesitando al DM para quitarla |
| D-P2-10 | **`raging` y las claves de condición que no son del SRD se reservan en cuanto el servidor las interpreta.** Reincidencia exacta del agujero que el paso 1 cerró para `helped`: sin reservarla, un jugador podía darse a sí mismo +2 de daño permanente sin gastar nada |
| D-P2-11 | **Un jugador puede curar a otro y pedirle una salvación, pero SOLO por una segunda puerta**: una entrada cuyo permiso no es «puedes editar esta ficha» sino «vienes de una actividad ya autorizada sobre un objetivo que `canView` te deja ver». El `PATCH` directo de `changeHp` sigue exigiendo dueño-o-DM. Decisión del autor, 2026-09-07, sobre la ficha P2-4 — copia el desdoblamiento que `recordFromEngine` (`game-events.service.ts:224`) ya usa desde el motor. Aflojar `requireEditable` a secas quedó descartado: abriría el `PATCH` de cualquier personaje ajeno |
| D-N-1 | **Conceder un modificador temporal es del DM** (`TemporaryModifiersService.grant`, `requireDM`), y **quitarlo sigue siendo del DM o del dueño**: son dos repartos distintos. Decisión del autor, 2026-09-07, ficha P1 puerta B. El argumento que la mantenía abierta —«beberse una poción no debería ser una petición al DM»— **se cumplió por otro lado** el 2026-09-06: consumir un objeto aplica sus efectos solo, sin pasar por `grant`. Lo que quedaba era un `+10` al ataque, sin caducidad y con el motivo que uno quisiera. La pantalla dejó de ofrecer el formulario en el mismo commit |
| D-N-2 | **Ayudar cuesta la acción del ayudante, y fuera de combate no cuesta nada.** Cierra la puerta por la que un jugador con dos personajes se daba `helped` de uno a otro **sin inventar una regla**: el SRD permite que dos criaturas se ayuden, y lo que sí cobra es que Ayudar es una acción. Hereda la doctrina del paso 2 —**gastar cuenta y avisa, no impide**— en vez de rechazar, comprobado en `encounters.service.ts` antes de escribir la aserción. El supuesto de fuera de combate es del autor: la economía vive en `Combatant`, así que sin turnos no hay nada que cobrar |
| D-N-3 | **El combate PROPONE su final; no se cierra solo.** Y `finalPropuesto` se calcula sobre **todos** los combatientes pero se entrega **solo al DM**: sobre los visibles le diría a un jugador que no quedan enemigos cuando queda uno `DM_ONLY` que no ve. `NEUTRAL` no cuenta como bando en pie —significa «no se ha dicho»—. Lo respalda el SRD 5.1: en «Monsters and Death» la muerte de un monstruo a 0 PG es costumbre del DM con excepciones nombradas, no automatismo |
| D-N-4 | **Un personaje jugador a 0 PG se queda en la mesa**, en gris y con «Cayó», con sus salvaciones contra muerte a la vista. La asimetría con un monstruo es del manual, no una preferencia. Y se midió al hacerlo que **nadie lo retiraba nunca**: ningún punto de `apps/api/src/encounters/` lee `currentHp`. Lo que faltaba era decir en qué estado está |
| D-N-5 | **Todos los endpoints de encuentro devuelven por `get()`**, y `roundAdvanced` viaja **al lado**, no dentro del `Encounter`. `start()`, `advanceTurn()` y `setInitiative()` devolvían filas crudas que el cliente tipaba como `Encounter` sin validar contra su esquema. Descartado derivar `roundAdvanced` (obligaría a quien llama a recordar el asalto anterior) y borrarlo (es información real, aunque hoy no la pinte nadie). Las pruebas que afirmaban sobre el retorno se reapuntaron a **lo que se escribe**: miraban ahí por comodidad, no porque el retorno fuera lo que probaban |

## Fichas sueltas de la cola larga (2026-09-07)

| | Decisión |
|---|---|
| D-P4-1 | **Un `[[nombre]]` casa sin acentos**: `normalizar` de `wikilinks.ts` pliega las marcas combinantes antes de comparar, así que `[[bahia]]` encuentra «Bahía». Se pliegan también **ñ y diéresis**, igual que ya hacía `claveDeConcentracion`; en español la ñ es letra propia, así que es una concesión deliberada a quien teclea sin ella. Precio declarado: dos fichas que solo difieran en la tilde colisionan y gana la primera de la lista, el mismo desempate que ya existía. Se pliega el **rango de marcas combinantes** y no `\p{Diacritic}`, que arrastraría `^` y `` ` `` sueltos. Normaliza **para comparar, nunca para mostrar** |

## La poda del 2026-09-10 · [archivo](./_archivo/pendientes-cerrados-2026-09-10-poda.md)

**Doce decisiones que vivían en `06-pendientes.md` disfrazadas de deuda**, sacadas de ahí con los
cuatro pasos de [04-convenciones.md](./04-convenciones.md). Ninguna es nueva: cada una ya estaba
tomada en la propia ficha, en el código o en otro documento; lo que faltaba era la fila.

| | Decisión |
|---|---|
| D-POD-1 | **`@testing-library/user-event` no se instala hasta que una prueba lo necesite.** Una dependencia sin consumidor es peso muerto, y `fireEvent` comprueba lo que hoy hace falta |
| D-POD-2 | **El catálogo del SRD se queda en `apps/api/src/rules/catalog/`**; su único consumidor es la API y la web lo pide por `GET /catalog`. Si algún día hace falta el paquete, es un `git mv` |
| D-POD-3 | **La red y la cerbatana quedan fuera del catálogo de armas** mientras `damageDice` exija un dado; lo declara la cabecera de `weapons.ts`. Cambiar la forma es del paso 3, si el conversor lo pide |
| D-POD-4 | **El conteo de unitarias del bloque generado es una cota inferior, y se declara así** en el propio bloque. Leer el informe del corredor haría caro a `check:estado`, que está donde está por ser barato |
| D-POD-5 | **El `PATCH` absoluto de PG del DM no se recorta contra el máximo**; el `POST` de delta sí. Un DM que escribe un número quiere ese número (2A.7) |
| D-POD-6 | **El token vive en `localStorage`**, compromiso conocido desde la auditoría de seguridad del 2026-09-01. Cambiarlo es una tarea con su ficha, no una deuda abierta sin plazo |
| D-POD-7 | **`JwtStrategy.validate` consulta la base en cada petición**: es el precio de invalidar los tokens al cambiar la contraseña. Si pesa, `select` estrecho; si aún pesa, caché corta |
| D-POD-8 | **`main.ts` no tiene prueba de que llame a `loadBootEnv()`**: la garantía vive dentro de `buildAdapter()`, donde sí la fija una prueba; la llamada de `main.ts` es cinturón y tirantes |
| D-POD-9 | **La densidad base de la interfaz es 14 px, con suelo de 16 px en pantallas táctiles** (`pointer: coarse`), porque por debajo iOS Safari hace zoom al enfocar y lo que dispara el zoom es el tamaño **calculado**. Va a [04-convenciones.md](./04-convenciones.md) |
| D-POD-10 | **Una etiqueta seleccionada en el filtro sobrevive a su propio botón** (1.17c): reconciliarla en silencio haría mentir al contador «N de M». Si molesta jugando, la tarea es mostrarla huérfana, no borrarla |
| D-POD-11 | **MADR se adopta solo hacia adelante**, sin migrar los specs existentes: un documento fechado no se reescribe |
| D-POD-12 | **El modificador de una tirada no lleva tope**: el SRD no da ninguno, `1d20+9999` es trampa a ojos vista y la vigila el DM. No es fallo de seguridad |

**Y tres que salen de «decide el autor» por los mismos cuatro pasos, sin cerrarse**: `start()` con
dos DM (la premisa «no hay pantalla para un segundo DM» caducó con el plan 11), `U10` (las frases de
visibilidad pueden salir de una matriz que una prueba compara con `canView`) y `M2B-14` (el SRD 5.1
trae *Weapon/Armor/Shield +1, +2, +3*: transcripción, no producto). Se arreglan como fichas B.

## Cerrar fichas (2026-09-10) · [archivo](./_archivo/pendientes-cerrados-2026-09-10.md)

Decisiones pequeñas tomadas al cerrar fichas del cubo B, una por commit.

| | Decisión |
|---|---|
| D-CF-2 | **El taller y «El mundo» conviven, con papeles**: el taller es donde el DM **prepara** (captura rápida, sesión, revelar); «El mundo» es el **archivo** (buscar, filtrar, editor completo, enlaces, comentarios). Solo se solapaban en escribir una ficha, y no se cae nada. Cierra «el taller convive con las listas CRUD» |
| D-CF-3 | **La mesa a 390 px se resuelve en la fase 3**, con la pantalla del tablero, que rehace la maqueta de la mesa: los cajones del rail se tirarían. El `test.fail` de `mesa-en-estrecho.spec.ts` queda de marcador |
| D-CF-4 | **El motor sigue evaluando dentro de la petición, medido**: ~6,5 ms por regla y apertura, lineal (50 reglas sobre un disparador = 380 ms). Una cola solo si un disparador pasa de ~50 reglas. Cierra H8 |
| D-CF-5 | **Las propuestas no caducan solas** (H9): el DM las rechaza; caducarlas sería el servidor arbitrando |
| D-CF-6 | **`Campaign.ownerId` es quién la creó**, dato histórico; la autoridad es el rol (D7) |
| D-CF-7 | **`isAdmin` se concede a mano** en Postgres y no tiene pantalla (D6); su primer oficio es D-CF-18 |
| D-CF-8 | **Una invitación es de un uso** y no se añaden usos máximos (A3-invitaciones): su motivo lo cerraron caducidad y revocación |
| D-CF-9 | **Retención: nada se borra solo**; cuenta y campaña a petición de su dueño; se revisa con usuarios externos. Escrita en [05-datos.md](./05-datos.md) |
| D-CF-10 | **Compartir lo revelado es un gesto social fuera del sistema** (M11): `canView` sigue dueño único |
| D-CF-11 | **Editar una ficha revelada no escribe suceso, y es a propósito** (M10b, la hidra falsa): no existe `ENTITY_UPDATED`; los apuntes del jugador son `Comment` y no se tocan |
| D-CF-12 | **TipTap sale del repositorio**: seis paquetes en `dependencies` con cero imports; el editor rico no está en ningún plan y la vitela lee Markdown. Revierte la letra de D-OP-16, que daba por hecho un consumidor que nunca llegó |
| D-CF-13 | **Node 22 LTS, ya**: Node 20 está sin parches desde 2026-04-30 y corre en producción; 22 es la LTS que Prisma 5.18 soporta. Adelanta la mitad de D-OP-18 por seguridad |
| D-CF-14 | **Una tanda de migraciones al final de la fase 2**, un commit por migración: `DROP TYPE "RestKind"` (X1) · índice único parcial de enlaces sin rótulo · `CHARACTER_DIED` en `GameEventType` (J5) · interruptor de sobrecarga por campaña (I4/M2B-5) · `overrides` como `{value, reason?}` (J7) · `identified`/`unidentifiedName` en `InventoryItem` (I3/M2B-15) · `DROP COLUMN race, class` cuando el diálogo de creación use el catálogo · **y un suceso de cambio de cantidad** (`ITEM_QUANTITY_CHANGED`, valor nuevo de `GameEventType`): hoy un `PATCH` de cantidad —absoluto o por delta— no deja rastro en la línea de tiempo, mientras `consume` sí; lo encontró la revisión de M2B-8 el 2026-09-11. **Ajustado el 2026-09-11:** J7 sale de la tanda (D-CF-24, unión sin migración) y `race`/`class` se borran sin medir (D-CF-27) |
| D-CF-15 | **«Lo tengo pero no sé qué hace» SE CONSTRUYE**, con la forma de Foundry: `identified` y un nombre alternativo, interruptor del DM. Revierte D-2B-8 por decisión del autor del 2026-09-10 («no quiero cosas molestas en una partida») |
| D-CF-16 | **La sobrecarga entra como variante con interruptor por campaña, apagada por defecto**, y el motor deriva −10/−20 ft y el aviso de desventaja con traza. SRD 5.1, *Variant: Encumbrance* |
| D-CF-17 | **El límite global de peticiones se cuenta por usuario cuando hay sesión iniciada**, por IP solo en las rutas sin token (R1): cinco jugadores por una VPN son una IP |
| D-CF-18 | **La contraseña olvidada la reinicia un administrador** (`isAdmin`) con una temporal, sin servicio de correo (D8): cinco amigos y el autor de administrador |
| D-CF-19 | **El hilo de una sesión mezcla los sucesos de campaña sin sesión posteriores a su inicio** (archivar, entrar, cambiar de bando): son cosas que pasan mientras se juega. **Y anteriores a su cierre**, añadido al ejecutarla el 2026-09-11: sin tope, una sesión cerrada absorbía lo que pasara meses después. Un suceso de campaña entre dos sesiones no sale en ninguna, y se asume. Cierra «el suceso de archivar no se lee desde la mesa» |
| D-CF-20 | **Los rasgos raciales sin efecto (S4) entran por el conversor del paso 3**, tarea 2b, igual que los de clase: Foundry los trae como ítems con actividades |
| D-CF-21 | **Las cargas de un objeto (M2B-4) entran en el paso 3** como `uses` con recuperación, el mismo vocabulario que un conjuro con usos |
| D-CF-22 | **Los objetos mágicos genéricos del SRD (+1/+2/+3) no se siembran como objetos**: son una plantilla sobre un arma base, o sea «encantar» (paso 3, bloque D). Hoy el DM ya crea «Espada larga +1» como objeto de campaña con `weaponAttack`/`weaponDamage`. Revierte la recomendación del 2026-09-10 (M2B-14 como B-S), que se equivocó en la forma |
| D-CF-23 | **La vitela de «Lectura» es un pliego claro, como el prototipo** (`#efe3c8`, tinta `#3a3220`, apagado `#6f6244`, de `prototipo/src/index.css`); acento, cobre y peligro sobre el pliego se toman del tema Claro del prototipo y se activan solo dentro de `Panel tone="vellum"`. Sin librería: son seis tokens y el contraste ya lo mide `tokens-contrast.spec.ts`. Cierra P1 «no es un pliego claro» (decisión del autor, 2026-09-11) |
| D-CF-24 | **El motivo de una anulación se guarda sin migración** (J7): `overridesSchema` acepta `number \| { value, reason? }`, la lectura se normaliza en un solo sitio de `@dnd/shared`, las filas viejas no se tocan, y `Anulaciones.tsx` y la traza pintan «fijada a 18 — motivo». J7 sale de la tanda de migraciones de D-CF-14 (decisión del autor, 2026-09-11) |
| D-CF-25 | **`changeHp` no exige que el `rollEventId` sea del personaje ni reciente, y se queda así**: lo que hay (existe en la campaña y es `ABILITY_ROLL`/`DEATH_SAVE`) es ya más estricto que Foundry (`applyChatCardDamage` aplica cualquier tarjeta a los tokens seleccionados, sin caducidad) y que Roll20 (las barras se editan a mano). Cerrada sin código (decisión del autor, 2026-09-11) |
| D-CF-26 | **La mesa a 390 px queda aplazada por el autor**, que quiere un diseño responsive nuevo y busca referencias él; ninguna de las tres salidas ni el `minmax(0,1fr)` del elenco se tocan hasta entonces. Sustituye la letra de D-CF-3 en cuanto al «cuándo» (2026-09-11) |
| D-CF-27 | **Las columnas `race`/`class` de texto libre se borran en la tanda de D-CF-14 sin medir** (no hay datos que valgan; el diálogo de creación ya usa el catálogo). Simplificar ese diálogo a solo nombre, o ir directo a la hoja, se hablará después y no es ficha (2026-09-11) |
| D-CF-28 | **`git push origin main` lo hace el agente al cerrar la tanda con `pnpm verify` en verde**, autorizado por el autor el 2026-09-11; solo `main`. Cierra P1 «`origin/main` lleva desde julio sin actualizarse» |
| D-CF-29 | **La hoja a página completa es la misma `HojaCalculada` con `disposicion: "mesa" \| "pagina"`**, no dos componentes: un solo reparto de pestañas, una sola forma de datos, un solo `puedeEditar`. [Spec](./superpowers/specs/2026-09-11-la-hoja-a-pagina-completa-design.md) · [plan](./superpowers/plans/2026-09-11-la-hoja-a-pagina-completa.md) |
| D-CF-30 | **A página, pestañas laterales y cada pestaña a 2-3 columnas**; descartados el tablero con todo visible (denso, sigue con scroll) y el híbrido núcleo + pestañas (dos patrones) |
| D-CF-31 | **La cabecera fija lleva retrato, cinco números, condiciones como chips y avisos; no lleva controles de daño** (botones en la banda de lectura). El nombre solo en la mesa: en la página ya lo pinta `PageHeader` |
| D-CF-32 | **Números abre por defecto** (contesta la pregunta 1 del §10 de la spec del 09-06); Ataques es detalle porque la mesa ya los enseña junto al personaje. La pestaña activa va en la URL (`?pestana=`), nunca en `localStorage` |
| D-CF-33 | **Objetos a página = lista + panel de detalle a la derecha con las mismas acciones que la fila**, desde una lista única (`accionesDeObjeto.ts`). La fila no pasa a menú «…»: ya enseña sus acciones. «Dar a…» queda fuera hasta que el botín entregue fuera de la mesa. **Ejecutada así el 2026-09-12** —el plan lo fijó en sus restricciones globales y no se re-litigó—: `DarObjeto.tsx` es un componente de la sesión (necesita `miPersonajeId` y mesa) y la hoja a página no tiene sesión; y un menú escondería lo que hoy se ve |
| D-CF-34 | **Conjuros existe solo para quien lanza** (espacios o rasgo racial de conjuro) y hoy enseña espacios + hueco declarado; el paso 3 la llena sin mover nada |
| D-CF-35 | **La hoja va antes del paso 3**, que asume la pestaña Conjuros hecha; y después de la tanda de fichas. Fase 3 y lo que dependa de ella (mapa, L1/L2/L4) se aplaza hasta cerrar el resto de fichas |
| D-CF-36 | **El cubo por usuario no se clava a un token revocado**: el guard compara `iat` con `passwordChangedAt`, cacheado 60 s por usuario (una consulta por usuario y minuto, no por petición). OWASP: el límite se clava a la identidad autenticada válida |
| D-CF-37 | **La «tanda L» (S11 tipos en shared, E1 buscar cruzado, L5 «este personaje no ve», S6 ASI como elección) entra dentro del paso 3**, no como tanda aparte: comparten `@dnd/shared` y el catálogo. **A2 (invitar por correo) queda aplazada** por el autor el 2026-09-11: «no viene al caso ahora». Orden tras la hoja: paso 3 → higiene (partir `character-sheet.service.ts`, CVEs + Renovate, cobertura medida) → jugar → fase 3 |
| D-CF-38 | **La banda fija de la hoja lleva solo lo que cambia por turno** —retrato, identidad en la mesa, cinco números y chips de condiciones—; los avisos (elecciones pendientes, aviso del DM, subir de nivel) van justo debajo, dentro de `Cabecera` y fuera del `sticky`. Medido en Playwright: 412 px con los avisos dentro, ≤ 96 px sin ellos (`e2e/hoja.spec.ts`, punto 5b); el umbral no se toca sin medición. Coste asumido: un aviso deja de verse al hacer scroll, sigue arriba de la hoja. Y a 390 px **los chips de condición se envuelven en varias líneas en vez de scrollear de lado** (la spec §4 pedía scroll horizontal propio): una banda que crece es una banda que se lee; la excepción a «el cuerpo no scrollea de lado» no hizo falta. Matiza la letra de D-CF-31 (ruling A de la Task 10, 2026-09-12; [historial](./07-historial.md)) |
| D-CF-39 | **Las tarjetas de identidad (Ficha/Características) se remontan cuando la hoja se vuelve derivable**, porque ahora viven en la pestaña Rasgos; el invariante «el campo que se teclea sobrevive» no sobrevive al diseño en pestañas. Se acepta: lo guardado en blur ya está guardado y solo se pierde el indicador transitorio «guardando», nunca el valor. Los comentarios del código dicen esto y no lo anterior (Task 4, 2026-09-11) |
| D-CF-40 | **Los chips de zona del filtro de Objetos reutilizan el vocabulario de zona** (`NOMBRE_ZONA`: Equipado / Encima / Guardado), no un segundo diccionario: una forma legible por dominio. Los dos localizadores que chocaban con los títulos de zona se apretaron a `heading`/`region` —apretar no es aflojar— (Task 9, 2026-09-11) |
| D-CF-41 | **El filtro «qué es» de Objetos usa el `ItemKind` real de `@dnd/shared`** —seis chips: Arma, Armadura, Escudo, Consumible, Impedimenta, Objeto, rotulados por `NOMBRE_TIPO_OBJETO`— y no el tipo ad hoc de cuatro del brief, que no decía dónde caían `SHIELD` ni `GEAR` (Task 9, 2026-09-11) |
| D-CF-42 | **Una pestaña que la hoja no ofrece cae a Números**, aunque la URL la nombre: `?pestana=conjuros` en quien no lanza abría un panel vacío. «Desconocida → Números» y «no ofrecida → Números» son la misma regla (Task 7, 2026-09-11) |
| D-CF-43 | **Una condición vencida no es chip de la cabecera**: arriba se enseña lo activo; lo vencido se ve tachado en la pestaña Estado, que es donde se retira o se renueva (D-2C-2). Lo fijó la revisión de la Task 2 (2026-09-11) |
| D-CF-44 | **Una tarea mide el navegador fichero a fichero, nunca la suite entera** (decisión del autor para este plan; la costumbre de 08 de correr la suite al cerrar una tanda no se toca aquí, y esta rama no la corrió a propósito: la única pasada entera fue el incidente), y con el comando que de verdad filtra: `pnpm --filter @dnd/web exec playwright test e2e/<fichero>.spec.ts`. La forma `pnpm --filter @dnd/web e2e -- <fichero>` **no filtra** —pnpm no pasa el argumento— y corrió la suite entera una vez en la Task 10 (18,7 min). Escrito en [08-pruebas.md](./08-pruebas.md) (2026-09-12) |
| D-CF-45 | **La sintonización se enseña como estado junto al nombre del objeto, y la acción principal sigue primero.** La pantalla 20 del prototipo ponía «sintonizar» antes de la acción principal; lo que quería era el estado a la vista, y eso lo da un distintivo «Sintonizado» junto al nombre (fila y detalle). El orden principal · sintonizar · gastar · soltar no cambia, y el botón del objeto sintonizado dice «Desintonizar» para no repetir el estado. **Y ese botón no lleva `aria-pressed`** (revisión de la ronda 2, `fac5062`, 2026-09-12): el conmutador de la APG es rótulo fijo + estado en `pressed`, y el nuestro es el patrón contrario —rótulo que cambia, estado en el distintivo—; mezclarlos anunciaba «Desintonizar, pulsado». El `aria-pressed` de «Ver detalle de X» (HP-4) sí se queda. Opción C del autor, cierra HP-8 (SRD 5.1 «Attunement», 2026-09-12) |
| D-CF-46 | **El cajón de la hoja que abre el DM desde el elenco se llama «Su hoja»**, simétrico con el «Tu hoja» del jugador; el nombre y el descriptor los pinta una sola vez la `Cabecera` en disposición «mesa», no el título del diálogo. Opción A del autor, cierra HP-1 (2026-09-12) |
| D-CF-47 | **HP-9 —objetos mágicos con efecto— se hace DESPUÉS del paso 3, no antes; la sintonización de hoy es un marcador** (equipado + tope de tres + se pierde al quitar; el motor no la lee, no hay descanso corto y el SRD trae 0 objetos que la pidan). Razón: la mitad del catálogo mágico del SRD 5.1 concede conjuros, y sin el paso 3 se modelaría a medias; lo estructurable sin él son solo los +N. **Enmendada el mismo día:** el autor partió HP-9 en dos porque «la sintonización de hoy es un marcador» escondía un defecto, no solo un hueco de funcionalidad — un objeto del DM con `effects` y `requiresAttunement: true` da su bono sin estar sintonizado. **HP-9a** («sintonizar cuenta») es ese defecto y **no espera al paso 3**: sesión corta de 2–3 h, antes o justo después de fusionar la rama (decide el autor el orden). **HP-9b** (catálogo SRD +N estructurado y descanso corto) conserva el orden original, después del paso 3, con la misma razón y las mismas dos preguntas de spec. Estimación y alcance de cada mitad en sus fichas de [06-pendientes.md](./06-pendientes.md). Decisión del autor, 2026-09-12 |
| D-CF-48 | **La sintonización cuenta: un objeto que la requiere da sus efectos mágicos solo sintonizado; lo mundano sigue; la pantalla tacha el bono y lo dice.** Una sola puerta en el motor (`efectosActivos`, `rules/items.ts`) filtra `effects` cuando `requiresAttunement && !attuned`; `armor.baseAc` y el dado del arma no pasan por ella. La hoja emite el aviso `item_not_attuned` en vez de un paso de traza con `amount: 0`; la fila y el detalle tachan el bono (`<s data-efecto="inactivo">`, con `aria-describedby` a su marca «Efecto inactivo: requiere sintonización») y la cabecera lo dice con el nombre del objeto. Fuente: SRD 5.1 §Attunement. Cierra HP-9a en tres commits ([07-historial.md](./07-historial.md), «Sintonizar cuenta (HP-9a, 2026-09-12)»); HP-9b sigue después del paso 3 (D-CF-47). 2026-09-12 |
| D-CF-49 | **El paso 3 es el cierre de la «primera parte»**: todas las mecánicas del SRD 5.1 que no necesitan tablero, conectadas y usables desde la mesa. Contrastado contra el índice del SRD el 2026-09-12: se añaden innatos raciales, reacciones, espacio superior, ataque de conjuro contra CA, la lista única de acciones y el menú «Acciones» en la mesa, las acciones de combate que no son atacar (Esquivar, Esconderse, Preparar, Correr, Destrabarse, Buscar, Usar objeto, desarmado, dos armas, sorpresa, no letal, caída), pruebas enfrentadas y de grupo (agarrar, empujar, Grappler), y legendarias/guarida. **Fuera, por decisión del autor: todo lo que necesita tablero** (oportunidad, alcance, distancia, cobertura, terreno, salto, áreas resueltas), multiclase, entorno/tiempo muerto, montura, bajo el agua, malditos, componentes. [Plan](./superpowers/plans/2026-09-08-paso-3-el-catalogo-y-los-conjuros-del-personaje.md), bloques E y F |
| D-CF-50 | **«Acciones» en la mesa son menús derivados de las reglas, no una barra que el jugador ordena** (Divinity descartado; BG3 y el SRD como referencia): cuatro botones —Ataques · Conjuros por nivel con «Siempre» arriba · Aptitudes · Objetos— que despliegan hacia arriba lo que el **servidor** dice que se puede usar ahora; lo no disponible viaja marcado con su motivo. El tope de la magia es «preparados» (SRD), la barra no añade otro |
| D-CF-51 | **Las tareas 5 y 6 del paso 3 (P2-4, P2-5) se hacen antes, en la tanda «puerta de efectos»** junto a la bandeja de daño y «hasta el próximo descanso» ([spec](./superpowers/specs/2026-09-12-la-puerta-de-efectos-design.md)); el plan del paso 3 las conserva por si esa tanda no cerrara antes |
| D-CF-52 | **Cuatro tandas antes del paso 3, en este orden, y todas modulares** (2026-09-12, revisión de producción por el autor): **pulido** ([spec](./superpowers/specs/2026-09-12-pulido-antes-del-paso-3-design.md), 24 puntos por causa con tarea 0 de investigación) → **reglas de la mesa** ([spec](./superpowers/specs/2026-09-12-reglas-de-la-mesa-design.md)) → **puerta de efectos** → **mapa de historia del DM** ([spec](./superpowers/specs/2026-09-12-mapa-de-historia-del-dm-design.md)) → paso 3. El mapa va antes porque es herramienta de preparación del DM y no comparte ficheros con el paso 3. **Enmendada por D-CF-64 (2026-09-12): el mapa de historia sale del orden, aplazado por el autor; quedan pulido → reglas de la mesa → puerta de efectos → paso 3** |
| D-CF-53 | **Las características, el oro y los PG iniciales los decide el DM por campaña** (`Campaign.tableRules`, default «libre» = como hoy): a mano, matriz, compra por puntos, o **dados que el DM elige con N intentos**; el servidor tira, escribe cada intento y **fija** el resultado elegido; ~~el DM arbitra después con `overrides`~~ **enmendada por E-RM-13 (2026-09-13): `OVERRIDABLE_KEYS` no tiene características, así que esa puerta no existía; el DM corrige las seis por `PATCH` directo**. SRD 5.1, *Determine Ability Scores* y *Starting Wealth by Class*. Ejecutada el 2026-09-13 (rama `reglas-de-la-mesa/antes-del-paso-3`, sin fusionar) |
| D-CF-54 | **El mapa de historia lo dibuja el DM y no se genera del log** (enmienda a lo que el plan del 2026-09-02 T2 proponía; D4 sigue: sustituye al tablero telaraña). Cuadrado = principal, círculo = secundaria; continuo = recorrido, discontinuo = no; solo lo ve el DM; enlaces a fichas y sesiones opcionales; `@xyflow/react` + `dagre` |
| D-CF-55 | **Los dados 3D quedan aplazados por el autor** («de momento no»); la bandeja de dados 2D enseña cada dado con su forma y su cara, y deja el hueco para una librería (dice-box) después |
| D-CF-56 | **Owlbear Rodeo es el tablero mientras no haya fase 3, y nuestra mesa vive DENTRO de su sala como extensión oficial** (Owlbear no se deja enmarcar: `X-Frame-Options: SAMEORIGIN`, medido). Un solo enlace —la sala—, panel nuestro de 390 px, menú contextual en las fichas, enlace ficha↔personaje como metadato de la escena, PG pintados solo si `canView` lo permite. **Primero un spike del autor** con un manifest de prueba; la tanda ([spec](./superpowers/specs/2026-09-12-owlbear-como-tablero-design.md)) se escribe si pasa. No toca el motor ni comparte ficheros con las otras tandas |
| D-CF-57 | **El tablero provisional es PlanarAlly autoalojado** (`tablero.supportive.pro`, MIT, mantenido; mapas y usuarios en el servidor), embebido en el centro de nuestra mesa con el registro como cajón plegable (pulido, C1 bis). Owlbear Legacy probado y dado de baja el mismo 2026-09-12 (sin mantenimiento; mapas en el navegador, particionados en `iframe`). El camino C (nuestra mesa dentro de Owlbear 2.0) queda como alternativa escrita, no planificada |
| D-CF-58 | **Reparto interno de tarjeta: cabecera · cuerpo · pie, relleno único, la rejilla coloca (no la tarjeta crece).** `e2e/espacios.spec.ts` mide `HUECO_MAX_PX` = 48 px y `DESNIVEL_MAX_PX` = 24 px; las cinco casillas de la cabecera pasan a `ANCHO_CASILLA_REM` = 6rem por `ALTO_CASILLA_REM` = 3.75rem, fijos y simétricos (anexo #3, #4, #6, #7, #9, #16, #17). **`ANCHO_CASILLA_REM` corregido de 4.75rem a 6rem el 2026-09-12** (tarea 1, ronda de arreglo): medido en el navegador, 4.75rem partía «VEL. (PIES)», «13 / 13» y «+5 temporales» en dos líneas. Referencias: D&D Beyond (tarjetas con cabecera, números centrados). Tarea 0 del pulido, [nota de diseño](./superpowers/notes/2026-09-12-nota-de-diseno-ui-de-juegos.md) <!-- docs-lint-ignore --> |
| D-CF-59 | **Acciones de una fila: hasta `ACCIONES_VISIBLES` = 2 visibles, el resto en un menú «…» dibujado** (`ui/MenuDeAcciones.tsx`), nunca una fila de cinco botones (anexo #1, #14). Referencias: Baldur's Gate 3 (categorías fijas en la barra, lo raro en un menú) y Divinity: Original Sin 2 (menú contextual en vez de fila de botones). Tarea 0 del pulido, [nota de diseño](./superpowers/notes/2026-09-12-nota-de-diseno-ui-de-juegos.md) <!-- docs-lint-ignore --> |
| D-CF-60 | **Espacio reservado: lo que cambia de tamaño al escribir reserva su alto (`min-height`) para que la tarjeta no salte** (`Field` con `reservaEspacio`, anexo #8, el *tearing*). Tarea 0 del pulido, [nota de diseño](./superpowers/notes/2026-09-12-nota-de-diseno-ui-de-juegos.md) |
| D-CF-61 | **Sticky con escalón: todo lo pegado respeta `--tira-fija-top`, y dentro de un cajón las variables `--tira-fija-*` valen lo que el cajón declara**, medido con `boundingBox` (anexo #6). Tarea 0 del pulido, [nota de diseño](./superpowers/notes/2026-09-12-nota-de-diseno-ui-de-juegos.md) |
| D-CF-62 | **Un dado, una forma: seis dibujos (`IconoDado`) —d4 tetraedro, d6 cubo, d8 octaedro, d10/d100 trapezoedro, d12 dodecaedro, d20 icosaedro—, y un resultado enseña cada dado con su forma y su cara, los descartados tachados** (anexo #11, #12). Referencias: Foundry VTT Dice So Nice (un dado por dado, formas estándar) y Owlbear Rodeo (bandeja: pulsar añade, se ve la pila, un botón tira; anexo #10). dddice/dice-box quedan solo apuntados para #13, aplazado (D-CF-55). Tarea 0 del pulido, [nota de diseño](./superpowers/notes/2026-09-12-nota-de-diseno-ui-de-juegos.md) |
| D-CF-63 | **El tablero PlanarAlly se enmarca en el centro de la mesa cuando la campaña tiene `boardRoomUrl`; el registro en vivo pasa a un cajón inferior plegable con contador; la mesa a 390 px sigue aplazada (D-CF-26).** Tarea 6 del pulido (C1 bis), sobre D-CF-57 |
| D-CF-64 | **El mundo se muestra como árbol + detalle; la telaraña se retira (D4); el mapa de historia queda aplazado por el autor** (2026-09-12, tras ver cuatro maquetas; cierra el #23 del anexo). Un árbol enseña UN padre —los rótulos de `ROTULOS_DE_JERARQUIA`, `apps/web/src/features/links/relaciones.ts`— y los demás hilos van en la ficha; dos padres se enseñan en los dos con «también en …»; un ciclo se corta y se marca. Task 14 bis del pulido; la spec del mapa (`superpowers/specs/2026-09-12-mapa-de-historia-del-dm-design.md`) se queda tal cual, sin fecha |
| D-CF-65 | **Proceso ligero por tarea y riguroso al cierre, SOLO para las tandas de arreglos antes del paso 3 (reglas de la mesa y puerta de efectos)**; confirmado por el autor el 2026-09-13 tras el coste de la tanda del pulido (una revisión Opus y una pasada de Playwright por tarea). **Por tarea:** unitarias + mutación + `pnpm verify` limpio, un commit, una línea en el ledger; **sin Playwright y sin revisión Opus por tarea**; implementadores Sonnet. **Al cerrar la tanda:** revisión Opus de la rama entera + Playwright en todos los spec tocados + la suite Playwright **entera** una vez → olas de arreglo con Opus fresco hasta quedar limpio, tope cinco rondas, re-revisión acotada tras cada ola — ahí se cazan todos los bugs. **Guardas baratas en cada brief:** si se renombra un rótulo visible, `grep` en `apps/web/e2e` y ajustar; todo Bash largo lleva `timeout: 600000` como parámetro de la herramienta. **El paso 3 tendrá sus propias reglas y se hablan entonces**: esta decisión no las anticipa. Escrito en [04-convenciones.md](./04-convenciones.md), § *Nivel de verificación* y § *Trabajo con varios agentes a la vez* |
| D-CF-66 | **Solo el DM controla cuándo se sube de nivel** (autor, 2026-09-13, al cerrar «reglas de la mesa»; cierra RM-1/E-RM-6). El nivel a mano (`PATCH …/sheet { level }`, `PATCH …/characters/:id { level }`) y «Subir de nivel» (`level-up` previo y aplicar) son del DM; el dueño recibe 403 y en pantalla ve su casilla de nivel y el botón **apagados con el motivo**, nunca escondidos. Descartadas: dejarlo como estaba (la regla del nivel inicial era decorativa) y bloquear solo cuando la mesa tiene reglas (dos comportamientos según un ajuste que la hoja no enseña). Cambia campañas existentes a sabiendas: un jugador que se corregía el nivel a mano se lo pide al DM |
| D-CF-1 | **La lista de sesiones va por cuándo se juega**: con fecha primero, de la más lejana a la más cercana —la próxima arriba, como el resto de listas de la casa ponen lo más reciente primero—, y las sin fecha detrás, por creación. Cierra D4 |

## Ejecución de «reglas de la mesa» (2026-09-13) · [spec](./superpowers/specs/2026-09-12-reglas-de-la-mesa-design.md) · [plan](./superpowers/plans/2026-09-13-reglas-de-la-mesa.md) · [ledger](../.superpowers/sdd/2026-09-13-reglas-de-la-mesa/progress.md)

Lo que el código medido (`main` `27304e1`) y la ejecución obligaron a decidir contra el texto de la
spec. E-RM-1..12 se tomaron al escribir el plan; 13..16, al ejecutar y al cerrar. Primera tanda bajo
D-CF-65.

| | Decisión |
|---|---|
| E-RM-1 | **La regla de características, razas y clases se aplica en `PATCH …/sheet`, no en `POST …/characters`**: el `POST` solo lleva nombre, nivel, bio y visibilidad; las seis y el catálogo llegan por el `PATCH` (así lo hace el propio diálogo de crear). Bajo `MATRIZ`/`PUNTOS`/`DADOS` el `PATCH` exige **las seis a la vez**; `LIBRE` sigue admitiendo una a una. Consecuencia: **`POST` ignora `level`** y veinte e2e de API que creaban a nivel > 1 por el `POST` pasaron a fijar el nivel con el `PATCH` que ya usaban (`35672ba`) |
| E-RM-2 | **PG de los niveles 2..N y oro inicial se resuelven cuando la clase se fija por primera vez** (`classKey` de `null` a valor), en esa transacción, **una sola vez**; un cambio de clase posterior no los recalcula. Al crear no hay clase, y sin clase no hay dado de golpe ni fila de la tabla de oro |
| E-RM-3 | **`Character.hitPointsPerLevel Json?`** guarda lo decidido (tirada o máximo por nivel, sin Constitución); el motor lo lee como paso de traza `maxHp.perLevelAtCreation` en vez de `(N−1)·media`, y sigue con la media para los niveles que se suban después. `MEDIA` no escribe nada. `maxHp` sigue sin guardarse; la spec decía «siembra `maxHp` como `level-up`», y `level-up` siembra recursos, no PG |
| E-RM-4 | **La expresión de dados la valida el servidor en `PATCH /campaigns/:id`** con `rollExpression` (tirador fijo) → 400 con el mensaje del evaluador; la web pinta el error en línea. «Al vuelo» es al guardar: la gramática vive solo en `dice.ts` |
| E-RM-5 | **No se crea `tiradaOFijoSchema`** (spec §3): `tableRulesSchema` no lo usa |
| E-RM-6 | **`PATCH …/sheet` y `PATCH …/characters/:id` con `level` siguen como hoy** (dueño o DM): el nivel inicial manda al nacer; subir va por `level-up`. Cambiarlo altera campañas existentes. **Cerrada por D-CF-66 el mismo día**: el autor decidió que el nivel es del DM |
| E-RM-7 | **El campo «Nivel» desaparece del diálogo «Nuevo personaje»**; en su lugar «Nivel N — lo fija la mesa». Un campo que el servidor ignora es texto que miente |
| E-RM-8 | **`permitidos` se comprueba sobre lo que cambia en ESTA petición**; un valor guardado que deja de permitirse no revienta la hoja y se ve marcado y no seleccionable (mecanismo huérfano) |
| E-RM-9 | **`ORO_TABLA` y `ORO_FIJO` escriben solo `gp`** (+ `MONEY_CHANGED`): la tabla del SRD está en po; el monje va sin ×10 |
| E-RM-10 | **Con `asignacionLibre: false` los seis valores van en el orden en que salieron**: FUE, DES, CON, INT, SAB, CAR |
| E-RM-11 | **`RollsService.roll` no se reutiliza para las seis tiradas**: abre su propia transacción. Se hace como `level-up`: `rollExpression` + `events.record(…, tx)` + la fila del intento, en una sola transacción |
| E-RM-12 | **La pantalla de características bajo regla vive en `apps/web/src/features/character-sheet/AsignarCaracteristicas.tsx`**, montada por `Caracteristicas`, no en el diálogo de crear: las seis casillas están en la hoja |
| E-RM-13 | **Tras elegir un intento, el DM corrige las seis por `PATCH` directo** (las seis juntas, sin `attemptId`); el dueño recibe 400 «solo el DM puede cambiarlas». La spec decía «el DM arbitra con `overrides`» y **`OVERRIDABLE_KEYS` no tiene características**: la puerta no existía. Enmienda D-CF-53 |
| E-RM-14 | **Los sucesos de PG y oro al nacer llevan `character.visibility`**, no `OWNER_DM` como las seis tiradas de característica: nacer con 8 PG u 80 po no es secreto de la hoja, es historia de la mesa |
| E-RM-15 | **El DM que manda `attemptId` habiendo ya un intento elegido recibe 400 «mándalas sin attemptId»**: arbitrar no es volver a elegir |
| E-RM-16 | **Las reglas de la mesa gobiernan a los personajes de jugador; un PNJ instanciado (`statblockRef`) queda fuera** de la validación de características y de permitidos: es del DM y no «nace» en la mesa |

## Ejecución del pulido antes del paso 3 (2026-09-12/13) · [spec](./superpowers/specs/2026-09-12-pulido-antes-del-paso-3-design.md) · [plan](./superpowers/plans/2026-09-12-pulido-antes-del-paso-3.md) · [ledger](../.superpowers/sdd/2026-09-12-pulido-antes-del-paso-3/progress.md)

Lo que la ejecución obligó a decidir contra el texto del plan o de la spec, leído de las líneas
«Ruling:» del ledger. Se omiten las de proceso puro (orden de agentes, cuándo relanzar una
revisión), que quedan solo en el ledger.

| | Decisión |
|---|---|
| E-PL-1 | **`ANCHO_CASILLA_REM` sube de 4.75rem (nota de la Tarea 0) a 6rem, con `nowrap`**: medido en el navegador, 4.75rem partía «Vel. (pies)», «13 / 13» y «+5 temporales» en dos líneas; la velocidad usa la tercera línea de la casilla para «pies» |
| E-PL-2 | **En Números, la fila usa `items-stretch` para nivelar por fila** (permitido por la regla de casa) y **Salvaciones se queda con el sobrante de la columna central** (`flex-1`); Ataques entra en el mismo bucle de medida que el resto de pestañas |
| E-PL-3 | **La medida de huecos recorre toda `section[aria-label]` de la pestaña, no solo los hijos directos de la rejilla**: una tarjeta que tiene otra debajo en su misma columna queda exenta del desnivel porque es la columna la que llena la fila, no la tarjeta suelta — la medida original (solo hijos directos) era ciega a ese caso, y lo confirmó una mutación del orquestador |
| E-PL-4 | **El cajón del registro, abierto, se acota a `max-h-[32vh]`**: el tablero manda sobre el registro, y la medida pasa a comprobar que el marco del tablero ocupa al menos el cajón y al menos un cuarto de la ventana, en vez de un umbral fijo del 40 % que no sobrevivía a la banda de escena |
| E-PL-5 | **Audiencia y CD del anexo #14 se resuelven con un `<details>` plegable, no un `<select>`**: la spec decía «desplegable», y la regla vinculante de radios con explicación de `04-convenciones.md` no deja un `<select>` para una opción con significado — «desplegable» se lee como «plegable» |
| E-PL-6 | **El d20 único va siempre al principio de la expresión compuesta**: es el único punto donde el servidor aplica ventaja/desventaja, así que ofrecer el radio de Ventaja sin el d20 en cabeza mentiría |
| E-PL-7 | **`SelectorDeVentaja` se queda siempre montado y se apaga con su motivo cuando no aplica**, en vez de desmontarse: la regla de casa es «se deshabilita, nunca se esconde», y desmontarlo encogía la tarjeta al escribir (el *tearing* que `espacios.spec.ts` existe para cazar) |
| E-PL-8 | **«Tirar» (y «Dárselos» / «Quedarse con los N nuevos») no se deshabilitan nunca con la entrada vacía**, contra el texto original de las Tareas 5 y 13: manda `04-convenciones.md:466` («el botón de guardar nunca se deshabilita: no recibe foco de teclado») y el precedente ya sentado por la Tarea 5 sobre «Guardar la sala». Pulsar sin nada que tirar escribe el error en línea y no manda ninguna petición |
| E-PL-9 | **`ATTACK_RESOLVED` nombra al objetivo desde `subjectId`, contra el comentario que decía «sin nombre del objetivo a propósito»**: el suceso ya se escribe a la visibilidad del objetivo, así que quien lo lee ya lo ve por definición — nombrarlo en la frase no abre nada que `canView` no hubiera abierto ya |
| E-PL-10 | **Cada tarjeta del hilo se lee como una sola oración**: la cabecera lleva el sujeto y la frase empieza por el verbo cuando `ctx.sujetoEnCabecera` es cierto (el mismo personaje que ya nombra la cabecera), en vez de repetir el nombre en cabecera y en la frase |
| E-PL-11 | **El mapa de nombres del hilo (`nombres-del-hilo.ts`) incluye a los PNJ, no solo a los personajes de jugador**: sin ellos, un ataque o un daño con sujeto PNJ se quedaba sin nombre en la cabecera |
| E-PL-12 | **«Custodia» sale de `ROTULOS_DE_JERARQUIA`**: el árbol del mundo enseña contención (vive en / se encuentra en / forma parte de / pertenece a / ocurrió en), y custodiar es una relación lateral, no de contención — el autor la reañade con una línea y un test si la quiere de vuelta |
| E-PL-13 | **Task 14 bis (el mundo como árbol) ocupa la columna izquierda del taller, donde iba el tablero telaraña**, con sus dos mitades (desglose + detalle) dentro de esa columna, y la selección sigue alimentando «Escribir ficha» sin cambios |
| E-PL-14 | **`HP_CHANGED.sourceCharacterId` sigue el precedente de `ATTACK_RESOLVED.attackerId`**: un campo opcional que dice «de quién viene» cuando el DM pone daño a mano sin que cuelgue de una tirada, validado con el mismo `requireVisibleCharacter` que ya usan seis servicios |
| E-PL-15 | **«Alguien» solo aparece cuando el DM citó un `sourceCharacterId` explícito que este espectador no ve**: la versión anterior trataba «hay `rollEventId`» como «se citó un origen» e inventaba un atacante (una caída de 2d6 se atribuía a «Alguien»); con `rollEventId` solo, se nombra al atacante deducido o no se dice nada |
| E-PL-16 | **La lista de traza abierta de una `Casilla` gana su propio `slot desplegable`, debajo de la cifra y nunca al lado**: el slot `nowrap` que reserva la tercera línea no tenía sitio para una lista que crece, y se colaba a la derecha del número |
| E-PL-17 | **`CorregirBando` (fila de mandos) se borra en vez de arreglarse**: su prueba se reescribió al menú de acciones con motivo declarado — no es aflojar un control, es sustituir un camino muerto por el que ya existe |

## Los planes de implementación (2026-09-05) · [índice](./superpowers/plans/2026-09-05-planes/00-INDICE.md)

**Quince planes, uno por fichero**, escritos para atacarse de uno en uno. Cada uno trae pasos con
`fichero:línea`, pruebas con **su mutación obligatoria**, guía de revisión en casillas y las trampas
conocidas. El índice lleva **la trazabilidad ficha → plan** contra la auditoría de la cola larga.

## Lo demás que hay en `superpowers/`

Specs de estudio (mesas virtuales, formularios, identidad visual, cajas), planes por fase,
auditorías fechadas y los prompts de arranque. **No hace falta leerlos para trabajar**: se abren
cuando esta página manda a uno concreto, o cuando hay que saber qué se creía en una fecha.
