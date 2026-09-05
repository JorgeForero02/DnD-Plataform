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

## Las decisiones del 2026-09-05 · [investigación](./superpowers/specs/2026-09-05-investigacion-decisiones.md)

**Cuatro del autor, y diecisiete cerradas contra las reglas o por recomendación.** Las que salen del
SRD llevan su fundamento: son las que **no se vuelven a preguntar**.

| | Decisión |
|---|---|
| D1 ✅ | **APLICADA el 2026-09-05** ([plan 04](./superpowers/plans/2026-09-05-planes/04-hilo-conversacion.md), `apps/web/src/features/sessions/hilo/HiloDeSesion.tsx:162`). **El hilo se lee como una conversación: lo último abajo.** La franja de «te perdiste» pasa a marcar el punto por debajo del cual está lo no leído, con el scroll anclado abajo y sin saltar si se está leyendo arriba |
| D2 | **Manda `04-convenciones.md` sobre el cobre**: un cobre nunca es un botón, el chip activo se queda en `--accent` y **la maqueta se corrige** |
| D3 | **El color de un personaje lo elige su jugador**, con un por defecto determinista salido de su `id`. Es `Character.color` y sirve para **la voz en el hilo y el retrato en el elenco** |
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

## Los planes de implementación (2026-09-05) · [índice](./superpowers/plans/2026-09-05-planes/00-INDICE.md)

**Quince planes, uno por fichero**, escritos para atacarse de uno en uno. Cada uno trae pasos con
`fichero:línea`, pruebas con **su mutación obligatoria**, guía de revisión en casillas y las trampas
conocidas. El índice lleva **la trazabilidad ficha → plan** contra la auditoría de la cola larga.

## Lo demás que hay en `superpowers/`

Specs de estudio (mesas virtuales, formularios, identidad visual, cajas), planes por fase,
auditorías fechadas y los prompts de arranque. **No hace falta leerlos para trabajar**: se abren
cuando esta página manda a uno concreto, o cuando hay que saber qué se creía en una fecha.
