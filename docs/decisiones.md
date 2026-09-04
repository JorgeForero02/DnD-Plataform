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

## Lo demás que hay en `superpowers/`

Specs de estudio (mesas virtuales, formularios, identidad visual, cajas), planes por fase,
auditorías fechadas y los prompts de arranque. **No hace falta leerlos para trabajar**: se abren
cuando esta página manda a uno concreto, o cuando hay que saber qué se creía en una fecha.
