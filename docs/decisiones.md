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
| E-N-4 | **El bando de un combatiente no recibe un valor por defecto inventado**: todos entran `NEUTRAL` y falta la pantalla que lo elija. Marcar a los PNJ como enemigos «porque suele ser así» sería el servidor decidiendo por el DM |

## Los planes de implementación (2026-09-05) · [índice](./superpowers/plans/2026-09-05-planes/00-INDICE.md)

**Quince planes, uno por fichero**, escritos para atacarse de uno en uno. Cada uno trae pasos con
`fichero:línea`, pruebas con **su mutación obligatoria**, guía de revisión en casillas y las trampas
conocidas. El índice lleva **la trazabilidad ficha → plan** contra la auditoría de la cola larga.

## Lo demás que hay en `superpowers/`

Specs de estudio (mesas virtuales, formularios, identidad visual, cajas), planes por fase,
auditorías fechadas y los prompts de arranque. **No hace falta leerlos para trabajar**: se abren
cuando esta página manda a uno concreto, o cuando hay que saber qué se creía en una fecha.
