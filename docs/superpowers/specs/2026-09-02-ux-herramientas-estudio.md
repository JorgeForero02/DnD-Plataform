# Cómo lo resuelven las herramientas reales — informe · 2026-09-02

> **Qué es esto.** El estudio de World Anvil, LegendKeeper, Kanka, Obsidian, Notion, Foundry,
> Roll20, Linear y Archives of Nethys que sostiene las decisiones del
> [reseño de interfaz](../plans/2026-09-02-reseno-interfaz.md). Se conserva en el repositorio
> porque sus conclusiones se citan en decisiones tomadas, y un razonamiento cuya fuente vive
> en el borrador de una sesión es un razonamiento que nadie puede volver a comprobar.

---

> Informe de investigación para el rediseño de la wiki de campaña propia (NPC, Lugar, Misión, Facción,
> Objeto, Evento, Documento + sesiones + personajes, con cinco niveles de visibilidad por objeto).
> Fuentes: documentación oficial, blogs, foros de usuarios y reseñas de World Anvil, Kanka,
> LegendKeeper, Obsidian, Notion, Fantasy Grounds, Foundry VTT, Roll20, Linear y Archives of Nethys.

---

## 0. Resumen del estado actual de la plataforma propia

Para que las recomendaciones finales tengan un punto de partida claro, el diagnóstico medido con
capturas reales es:

- Nueve pestañas planas al mismo nivel, sin agrupar.
- Listas que solo muestran nombre + etiquetas, sin resumen ni imagen.
- Los nombres no parecen enlaces: no hay affordance de que se puede navegar a ellos.
- No hay cabecera global, ni buscador, ni migas de pan.
- Media pantalla vacía en la mayoría de vistas.
- La primera pestaña de una campaña es un formulario de ajustes con "Borrar" junto a "Guardar".

Cada sección de este informe termina apuntando a uno o más de estos puntos.

---

## 1. Navegación: barra lateral, cabecera, cambio de campaña, buscador, y qué hacen con 9+ tipos de entidad

### World Anvil

World Anvil tiene **dos barras laterales** (izquierda y derecha) más una cabecera superior. La barra
izquierda aloja iconos de herramientas de alto nivel: Articles & World Manager, Maps, Timelines,
Images, Manuscripts, etc. — es decir, la navegación de primer nivel no es "tipos de entidad" sino
"módulos de la aplicación" (artículos, mapas, líneas de tiempo...). Dentro del módulo de artículos,
la organización real de las 9+ categorías se hace con **Categorías** (Category), que son carpetas
jerárquicas y anidables que el propio usuario define — no hay una lista fija de tipos en la barra
lateral, sino un árbol de categorías que actúa como tabla de contenidos de la página de inicio del
mundo. World Anvil sugiere categorías de ejemplo como "People", "Monsters", "Atlas", "Armory",
"Magic", "Technology", "Religion", "Organizations & Factions" — es decir, el propio producto empuja
al usuario a agrupar por dominio temático, no a listar 9 tipos sueltos.

El cambio de "mundo" activo se hace desde un selector de mundos (cada mundo es un espacio
independiente con su propio dashboard); dentro de un mundo, el cambio de "campaña" (RPG campaign)
vinculada es otro nivel de navegación aparte, con su propio dashboard de GM.

El buscador vive en el dashboard del mundo y también en la vista de sesión ("world Dashboard" para
buscar artículos mientras se juega, con la página de Stat Blocks en otra pestaña en paralelo).

Queja recurrente en foros: la navegación *se siente* dispersa porque hay demasiadas capas (mundo →
categoría → artículo → secciones del artículo) y funciones importantes (como fijar
artículo-anterior/siguiente) están escondidas tras "Show additional options" en la barra derecha —
la crítica de usuarios es justamente "demasiados clics para encontrar algo".

### Kanka

Kanka organiza por **tipos de entidad fijos** (Characters, Locations, Organisations, Families,
Items, Notes, Quests, Journals, Timelines, Maps, etc.) listados en la barra lateral izquierda de la
campaña — sí lista explícitamente los tipos, uno por fila, con icono. Es el patrón más parecido al
"listamos los 9 tipos en la barra lateral", y con más de 9 tipos empieza a notarse largo, aunque cada
fila es compacta (icono + texto, una línea).

El cambio de campaña activa se hace desde un selector de campaña en la cabecera superior (cada
campaña es un espacio independiente, con su propio dashboard, sus propios roles/admins).

Kanka añade un **Dashboard** por campaña (desde la versión 1.7, "It's all about dashboards") con
widgets configurables: "recently modified" (con filtro por tipo de entidad, p. ej. "todos los
personajes muertos" o "localizaciones de tipo X"), lo que sirve como panel de preparación de sesión
reconfigurable. El buscador es una **quick search global** dentro de la campaña, accesible en
cualquier punto, con resultados en segundos sobre cualquier elemento.

Queja de usuarios: Kanka "se siente clunky saltando entre páginas" — cada navegación es una carga de
página completa, sin transiciones fluidas ni panel lateral persistente.

### LegendKeeper

Estructura de **carpeta/árbol tipo explorador de archivos**: barra de navegación superior +
sidebar izquierdo llamado "project browser", que muestra un árbol jerárquico y libre (no hay tipos
de entidad predefinidos: el usuario crea carpetas y subcarpetas a su gusto, "un sistema de notas
como quieran y lo cambian sobre la marcha"). Esto es notablemente distinto de Kanka/World Anvil:
LegendKeeper no impone una taxonomía de "NPC/Lugar/Misión", es una wiki de páginas libres organizadas
en árbol, con mapas interactivos anidados (zoom de continente a habitación, "Google Maps de tu
mundo") enlazados a las páginas.

El sidebar derecho (contextual, para metadatos/edición) se abre y cierra a demanda, y se cierra solo
si está vacío. Reseñas la describen como "la app web más limpia de su categoría", con foco en
velocidad y ausencia de fricción.

### Obsidian (+ Dataview)

No tiene un concepto de "tipo de entidad" nativo: todo es una nota en una jerarquía de carpetas
(sidebar de explorador de archivos) más un **grafo de enlaces** (backlinks automáticos). Las
plantillas de comunidad para D&D (p. ej. "Campaign Vault", "dnd-campaign-hub") simulan tipos de
entidad con **carpetas por tipo** (NPCs/, Locations/, Sessions/...) y usan **Dataview** para generar
tablas/dashboards dinámicos: consultas como "todos los NPC en Waterdeep" o "menciones de esta nota en
#Session-notes" agregan contenido disperso en un panel único (el "DM Screen" dashboard). Es decir: en
Obsidian la agrupación por tipo se resuelve a nivel de convención de carpetas + consulta, no de UI
nativa.

### Notion

Bases de datos enlazadas (linked databases): NPCs, Localizaciones, Misiones, etc. son bases de datos
independientes con **vistas de galería filtradas** por tipo, mostradas como pestañas o páginas en la
barra lateral. La plantilla "Lazy DM Notion Notebook" de Sly Flourish usa una única base de datos
maestra de "tarjetas" con un campo de tipo, y expone una vista de galería filtrada por tipo para cada
categoría (NPCs, ítems, lugares, villanos) — el usuario ve "una pestaña por tipo" pero por debajo es
una sola tabla con filtro. La navegación depende enteramente de la barra lateral de Notion (árbol de
páginas anidadas, sin tope de profundidad), y el buscador es el buscador global de Notion (Ctrl+K/⌘K).

### Foundry VTT

No es una wiki pública sino la herramienta de mesa: la navegación son **pestañas de sidebar** fijas
(Actors, Items, Journal, Tables, Cards, Playlists, Compendium...), cada una con su propio árbol de
carpetas. El "Journal" es lo más parecido a la wiki de campaña, con **Journal Entries** que contienen
**páginas** (texto, imagen, vídeo, PDF), cada página con un nivel de indentación configurable que
genera automáticamente una **tabla de contenidos** en el sidebar de la entrada — patrón directamente
aprovechable para una ficha larga con secciones.

### Roll20

El **Journal** es el repositorio central: pestañas para Characters, Handouts, Maps & Notes,
Playlists, dentro de una única barra lateral. Solo el GM puede crear Handouts. No hay concepto de
"campaña múltiple" en la misma vista — cada partida es un espacio de trabajo (Game) aparte, elegido
desde el listado de partidas del usuario, fuera del propio Journal.

### Linear (referencia de densidad, fuera del sector)

Linear resuelve la densidad con una sidebar **personalizable y colapsable**: los usuarios reordenan y
ocultan ítems que no usan; la vista principal usa filas de **36px**, casi sin "chrome" (adornos), y
la sidebar se atenúa visualmente (menor contraste) para que el área de contenido domine. Los filtros
son compuestos (assignee, status, label, project, cycle) y también aceptan lenguaje natural ("issues
asignados a mí", "vencen la semana que viene"). Referencia directa de cómo una barra lateral con
muchas categorías (equipos, proyectos, ciclos, vistas guardadas) se mantiene manejable: colapsable +
reordenable + oculta lo no usado, en vez de mostrar siempre todo.

### Archives of Nethys (referencia de densidad de listas)

Es un compendio de reglas con **filtros avanzados combinables** (edición, rasgos/traits, rareza,
fuente) sobre listas muy largas. Su evolución de UI (paso a tablas "RadGrid") generó quejas de
usuarios porque los filtros nuevos quedan **ocultos por defecto** y son menos descubribles que el
filtrado plano anterior; en la versión más reciente, un panel de filtros "flotante" sigue el scroll
para no obligar a volver arriba. Lección: cuantos más filtros combinables, más hace falta que estén
siempre visibles/anclados, no escondidos en un menú.

### Patrón consolidado

- Cuando el número de tipos de entidad es fijo y pequeño (Kanka, ~9-12 tipos), listarlos todos en la
  barra lateral funciona pero empieza a notarse largo — conviene agrupar visualmente (separadores o
  secciones colapsables) antes de que la lista supere ~10 filas.
- Cuando la taxonomía es libre (LegendKeeper, Obsidian), se usa un árbol de carpetas + búsqueda, sin
  tipos fijos.
- El buscador global es **casi universal** y vive anclado en la cabecera o en la barra lateral
  superior — nunca enterrado en una sub-pantalla. World Anvil lo pone también en el dashboard de
  sesión, para uso "en vivo".
- El cambio de campaña/mundo activo es siempre un selector explícito en la cabecera, separado de la
  navegación de contenido.

---

## 2. La página de una entidad: cabecera, relaciones, backlinks, edición

### World Anvil

La ficha de artículo tiene una cabecera con **imagen destacada** (cover image) grande, título,
categoría y, en el sidebar derecho, un panel de **metadatos y opciones adicionales** (que incluye
navegación artículo anterior/siguiente, oculta tras "Show additional options" — la crítica de
usuarios citada arriba). El cuerpo se estructura en **bloques con plantillas por tipo** (NPC, lugar,
organización...) que ya traen campos sugeridos (rasgos físicos, historia, relaciones...). Los
**Secrets** (ver sección 4) se insertan inline dentro del cuerpo del artículo mediante el editor
(`/secret` en el editor visual), de modo que el DM edita en un único documento con fragmentos
ocultables, no en dos documentos separados.

La edición es en una **página de edición dedicada** (no inline ni panel lateral): hay dos editores de
texto disponibles por artículo — un "Visual Editor" WYSIWYG más simple y "Euclid", el editor avanzado
con más control de formato — y se puede alternar cuál se usa por artículo. El editor antiguo
("Guide to the Old Version Edit Interface") sigue documentado, señal de que la migración de editor ha
sido progresiva y no siempre limpia (quejas de "editor de texto anticuado").

### Kanka

La ficha de entidad muestra: imagen (avatar/portrait), nombre, tipo, y un cuerpo de texto enriquecido
+ una zona de **atributos personalizados** (pares clave-valor) que también llevan su propio nivel de
visibilidad individual (ver sección 4). Las **relaciones** ("connections", antes "relations") se
listan en una sección aparte de la ficha, y desde la versión 1.12 pueden visualizarse como un
**grafo** que muestra entidades relacionadas y entidades que la mencionan. Las **menciones**
(mentions, `@entidad` en el texto) son la forma de generar enlaces entre entidades: al escribir `@` +
nombre se autocompleta el enlace, y un script/plugin de comunidad ("Kanka Mention Previewer") añade un
icono junto a cada mención que abre un **modal de vista previa** (entrada completa, posts, atributos
fijados e imágenes) sin salir de la página — el patrón de "backlink con preview" que conviene copiar.
Kanka además muestra explícitamente qué entidades mencionan a la actual (algo parecido a backlinks),
aunque no bajo ese nombre.

La edición es en **página de edición dedicada** (formulario largo con pestañas: General, Atributos,
Relaciones, Permisos, Publicación...), no inline.

### LegendKeeper

Edición **directamente en la página** (documento tipo editor de bloques, similar a Notion/Obsidian):
no hay modo "ver" vs "editar" separado para quien tiene permiso de edición, se escribe en línea sobre
el propio documento. Los enlaces entre páginas se insertan como referencias de página (autocompletado
al escribir `@` o `[[`), y el árbol de navegación de la izquierda hace de "backlink implícito" al
mostrar la jerarquía; el sidebar derecho contextual muestra metadatos de la página (mapa asociado,
pines, etc.) y se cierra si no aplica. Los "Secrets" se insertan con el menú `/` como cualquier otro
bloque (ver sección 4) — igual que en World Anvil, edición unificada con ocultación inline, no
documentos paralelos.

### Foundry VTT

La "ficha" de un Journal Entry es una colección de **páginas** con tabla de contenidos generada por
niveles de indentación (configurable por página, no solo por posición). La edición es con
**ProseMirror**, un editor de texto enriquecido colaborativo con auto-guardado; hay un botón de
"source" para HTML crudo cuando hace falta. Las relaciones con otros documentos (Actor, Item, Escena)
se insertan como enlaces `@UUID` que abren esa ficha directamente. No hay backlinks automáticos
nativos — hay módulos de comunidad para ello, señal de un hueco no cubierto de serie.

### Roll20

Un **Handout** se abre en un diálogo modal con: imagen, campo "Description & Notes" (visible según
permisos) y, si el que mira es GM, un campo adicional "GM Notes" que solo el GM ve/edita — dos campos
de texto en el mismo objeto con visibilidad distinta, sin necesidad de un objeto "secreto" aparte (ver
sección 4). No hay relaciones estructuradas entre handouts/personajes más allá de menciones manuales
en el texto.

### Patrón consolidado para la ficha propia

- Cabecera con imagen + metadatos + tipo es prácticamente universal (World Anvil, Kanka, Roll20).
- El patrón más maduro para relaciones es el de Kanka: sección de relaciones explícita + backlinks +
  preview en modal al pasar/clicar una mención — evita que el usuario tenga que navegar y volver.
- El patrón más maduro para "edición unificada con secreto inline" es World Anvil / LegendKeeper:
  el DM escribe un solo documento con fragmentos ocultables, en vez de mantener dos copias (pública y
  privada) sincronizadas a mano.
- Edición en página dedicada (Kanka, World Anvil) es más robusta para formularios largos con muchos
  campos tipados; edición inline (LegendKeeper, Notion, Obsidian) es más fluida para prosa larga y
  wikis. Dado que la plataforma propia ya tiene "un formulario de ajustes" como primera pestaña
  (síntoma de sobre-uso de formularios), migrar la ficha de entidad hacia edición inline con campos
  tipados incrustados (más parecido a LegendKeeper) probablemente resuelva mejor el "media pantalla
  vacía" que un formulario clásico.

---

## 3. Listas de entidades: qué lleva cada fila/tarjeta, grid vs tabla, filtros, cuándo hace falta buscador

### Kanka

Las vistas de listado de un tipo de entidad son configurables entre **grid de tarjetas** (imagen +
nombre + tipo + tags) y **tabla** (columnas ordenables); los filtros y el orden elegidos **se
recuerdan en la sesión** mientras el usuario esté conectado, para no tener que re-configurarlos en
cada visita — detalle pequeño pero con impacto real en la fricción de DMs que entran y salen del
sitio constantemente en sesión.

### World Anvil

La página de inicio del mundo (basada en categorías) actúa como índice/tabla de contenidos jerárquica,
con las categorías como carpetas expandibles — no es una lista plana de "todos los NPC", sino un árbol
navegable por categoría, con búsqueda superpuesta para saltar directo.

### Archives of Nethys (referencia de densidad alta)

Con volúmenes de contenido muy grandes (todo el compendio de reglas), la solución es filtros
avanzados combinables (edición, rasgos, rareza, fuente) sobre una tabla densa — la lección aplicable
es: **el punto en que una lista deja de servir un vistazo simple y necesita buscador+filtros es
cuando el usuario ya no puede escanear visualmente en una pantalla** (aprox. más de una veintena de
filas): a partir de ahí hace falta filtrar por tipo/etiqueta/estado, no solo hacer scroll. Con nueve
tipos de entidad y una campaña activa de tamaño medio (decenas de NPCs, lugares...), ese umbral se
cruza rápido dentro de un solo tipo.

### Notion

La vista de galería (Gallery view) es el patrón recomendado explícitamente por las guías de DM para
NPCs: subir un retrato y usarlo como imagen de la tarjeta hace la lista "mucho más visual y fácil de
referenciar" — confirma que imagen+nombre en tarjeta > fila de texto puro para entidades con retrato
(NPCs, lugares).

### Roll20 / Foundry

Ambos son listas de una sola columna dentro de la sidebar (nombre + icono pequeño), sin resumen ni
imagen grande — apropiado para su contexto de uso (herramienta de mesa en vivo con panel estrecho),
pero **no** es el patrón a copiar para una wiki de campaña navegada a pantalla completa, que es el
caso de la plataforma propia.

### Patrón consolidado

- Fila/tarjeta mínima útil = imagen o icono de tipo + nombre (como enlace visualmente distinguible) +
  tipo + 1-2 etiquetas + un resumen corto (1-2 líneas de extracto del cuerpo). Ninguna herramienta
  seria muestra solo nombre + etiquetas sin nada más — eso es justo el déficit medido en la
  plataforma propia.
- Grid de tarjetas para entidades con imagen relevante (NPC, Lugar, Objeto); tabla para entidades más
  "de datos" (Documento, Evento con fecha) — Kanka deja elegir por tipo, que es razonable.
- Filtro y orden deben persistir en la sesión del usuario (Kanka) para no repetir trabajo en cada
  visita durante una sesión de juego.
- El buscador dentro de una lista de un solo tipo hace falta ya con volúmenes moderados (no hace
  falta esperar a cientos de filas); con nueve tipos de entidad cada uno con su propia lista, la
  necesidad de un buscador global (no solo por lista) es inmediata — ninguna herramienta madura
  obliga a entrar en cada tipo por separado para buscar algo.

---

## 4. Visibilidad y secretos — la sección más importante

Este es el rasgo diferencial de la plataforma propia (cinco niveles: público / jugadores / jugadores
concretos / dueño+DM / solo DM), así que vale la pena entender con precisión cómo resuelven esto las
herramientas reales, porque **ninguna de las estudiadas iguala exactamente cinco niveles por
objeto** — cada una resuelve una versión más simple, con sus propios trade-offs.

### World Anvil — el sistema más elaborado, basado en "Secrets" + roles de suscriptor

- El artículo en sí tiene un nivel de privacidad general (público / solo tú / grupos de "subscribers"
  específicos), pero el mecanismo fino y diferencial es el de **Secrets**: fragmentos de contenido
  insertados *dentro* del cuerpo del artículo (inline, vía `/secret` en el editor visual) que quedan
  ocultos por defecto y se revelan solo a quien tenga permiso.
- Cada Secret tiene su propio control de visibilidad, independiente del artículo que lo contiene:
  se puede compartir con "toda la party" o con "uno o varios jugadores concretos" — esto es
  exactamente el nivel "jugadores concretos" que pide la plataforma propia, resuelto a nivel de
  fragmento, no de artículo completo.
- Dentro de un Secret hay además un campo "**Gamemaster Notes**" en "Advanced Options" que
  **permanece siempre privado, incluso si el Secret está revelado** — es decir, hay un cuarto nivel
  anidado dentro del propio mecanismo de secreto: "visible a jugadores elegidos" y "solo yo (DM)" son
  dos casillas independientes dentro del mismo bloque, no dos bloques distintos.
- Los Secrets se pueden compartir también con "co-owners and editors" (colaboradores del DM) vía la
  opción "Open Secrets" — un nivel adicional parecido a "dueño+DM".
- Limitación real: el sistema de Secrets requiere el nivel de suscripción "Guild" (de pago) — no está
  en el plan gratuito, lo cual es una barrera de adopción citada en foros ("features limitadas para
  empujar a compra premium").
- No hay, según la documentación consultada, un indicador visual estandarizado (icono/color) para
  distinguir de un vistazo "esto es un Secret abierto/revelado" vs "cerrado" en modo edición —
  la comunidad ha pedido explícitamente iconografía/markup más clara para campos DM-only en texto
  libre (sugerencia de producto abierta, no resuelta).

### Kanka — visibilidad por elemento con cinco opciones y "permission chaining"

- Kanka expone, en la práctica, **cinco niveles de visibilidad configurables por elemento**: `All`
  (todos), `Admins` (solo administradores de campaña — el equivalente a "DM"), `Only me` (solo quien
  lo creó), `Only me & Admins`, y `Members of the campaign` (solo miembros invitados, excluye
  visitantes públicos si la campaña es pública). Esto es notablemente parecido en espíritu al modelo
  de cinco niveles que pide la plataforma propia, aunque Kanka no tiene un nivel nativo de "un
  jugador concreto elegido a mano" tan explícito como el Secret de World Anvil — se aproxima con
  grupos/roles, no con selección individual libre.
- El campo de visibilidad aparece como **el último campo del formulario** al crear o editar cualquier
  entrada — un checkbox/desplegable de "privacidad" que, si se marca, oculta la entrada entera a
  todos menos administradores.
- Lo más relevante para el diseño propio es el **"permission chaining"**: la visibilidad no es solo
  del objeto en sí, sino que se propaga a través de relaciones. Ejemplo textual de la documentación:
  "si una relación es visible para todos, pero el objetivo de la relación solo es visible para
  admins, entonces solo los admins verán la relación". Esto aplica a relaciones, inventario, pines de
  mapa, elementos de misión ("quest elements"), recordatorios y elementos de línea de tiempo — es
  decir, **todo objeto que enlaza a otro respeta el nivel más restrictivo del objeto enlazado**. Esta
  es la pieza de arquitectura de datos más importante a robar: sin esto, un jugador puede ver "hay una
  relación con [Entidad Secreta]" en la ficha de un NPC público aunque no pueda abrir esa entidad —
  una fuga de información por metadata, no por contenido.
- Nivel de campo individual: además del nivel "entrada completa", **cada atributo personalizado**
  (par clave-valor dentro de una ficha) tiene su propio control de visibilidad — permite, por
  ejemplo, que la ficha de un NPC sea pública pero el atributo "verdadera identidad" dentro de esa
  misma ficha sea solo-DM. Este es el patrón de "campos secretos ('admin only') de Kanka" que
  menciona el contexto del encargo, confirmado.
- Documentación limitada sobre indicadores visuales exactos (iconos/color) para "esto es
  admin-only" — la documentación no especifica un icono estándar, lo cual en sí es una señal: es un
  hueco de UX incluso en la herramienta más completa en este terreno.

### Foundry VTT — visibilidad basada en roles/documentos, no en fragmentos de texto

- El modelo es de **cuatro niveles de "ownership"** por documento completo (no por fragmento de
  texto dentro del documento): `None` (invisible), `Limited` (aparece en listados, contenido básico),
  `Observer` (ve todo, no edita), `Owner` (ve y edita). Se configuran por usuario individual o por
  rol, vía el diálogo "Configure Ownership" (clic derecho → Configure Ownership).
- El GM tiene ownership `Owner` universal e implícito sobre todo documento nuevo, salvo que se
  reconfigure — es decir, el valor por defecto de cualquier objeto nuevo es "invisible a jugadores,
  visible al GM", exactamente el equivalente al nivel "solo DM" de la plataforma propia, y es el
  **default seguro** (fail-closed): nada se hace público por accidente.
- No hay, de serie, ocultación de **fragmentos dentro de un mismo documento** (a diferencia de World
  Anvil/LegendKeeper): la unidad mínima de visibilidad es el documento/página completo. Existen
  módulos de comunidad (Ownership Viewer, Note Permissions, Permission Viewer) que añaden
  **indicadores visuales explícitos**: diamantes/cuadrados/círculos de color junto al nombre del
  documento en la sidebar, o iconos SVG sobre los pines de nota en el mapa, para que el GM vea de un
  vistazo qué nivel de permiso tiene cada jugador sobre cada objeto sin abrir el diálogo de
  configuración — la ausencia de esto en el núcleo del producto (hace falta un plugin de terceros)
  es una carencia documentada de la herramienta base.
- Carencia clave (relevante para el punto de "que el DM no se confunda"): el propio Foundry no
  resalta con un badge/color permanente en la lista qué documentos son totalmente privados vs
  parcialmente visibles vs públicos — de ahí que la comunidad haya tenido que construir esos módulos.

### Roll20 — visibilidad binaria a nivel de objeto + un campo GM-only fijo

- Modelo mucho más simple: cada Handout es, por defecto, visible **solo al GM**; se comparte
  explícitamente con jugadores concretos o con "All Players" desde un selector de permisos del propio
  handout — no hay niveles intermedios de grupo (no hay "jugadores concretos elegidos" más allá de
  check individual por jugador, lo cual de hecho cubre ese caso, pero de forma manual, jugador a
  jugador).
- El campo "**GM Notes**" es una segunda caja de texto **dentro del mismo objeto** (Handout o
  Character), visible únicamente si quien abre la ficha es GM — la interfaz simplemente no renderiza
  ese campo para un jugador, sin necesidad de configuración por campo. Es el patrón más simple posible
  de "campo con dos audiencias fijas" (todos los que tienen acceso al objeto / solo el GM), sin
  granularidad de "jugador concreto" en ese campo específico.
- No hay indicador visual de "este handout está compartido con fulano" en la lista del Journal más
  allá de abrir el diálogo — de nuevo, falta de affordance en el listado, mismo problema que Foundry.

### Obsidian y Notion — NO resuelven esto de forma nativa; hacks de comunidad

- **Obsidian**: no tiene ningún concepto de visibilidad multiusuario — es una base de notas local de
  un único usuario/dispositivo (con sync opcional, pero sin control de acceso por usuario). Los DMs
  que quieren compartir con jugadores recurren a exportar/publicar notas sueltas (Obsidian Publish, o
  copiar manualmente contenido a otra herramienta), o a **convenciones de nomenclatura/carpetas**
  (carpeta "Secretos DM" fuera de cualquier vault compartido) que dependen enteramente de la
  disciplina del usuario — no hay ninguna barrera técnica real, es "seguridad por no compartir la
  carpeta". Community templates para Lazy DM usan listas de tareas markdown (GFM checkboxes) para
  llevar secretos no revelados como texto plano en el propio vault del DM, nunca compartido.
- **Notion**: sí tiene control de acceso real a nivel de página/base de datos (se puede compartir una
  página con permisos de lectura a invitados concretos), pero **no permite ocultar propiedades
  columna a columna dentro de una base de datos compartida** — quien tiene acceso a la base ve todas
  las propiedades/columnas, no hay "campo secreto dentro de una fila visible". El hack estándar de la
  comunidad es **mantener bases de datos o vistas separadas**: una base "pública" compartida con los
  jugadores (sin los campos sensibles) y una base separada, privada, solo del DM, sin sincronización
  automática entre ambas — lo que implica trabajo duplicado y riesgo real de desincronización
  (`el DM actualiza un dato en su copia privada y se le olvida reflejarlo en la copia pública`, un
  fallo estructural del enfoque, no un detalle menor).

### Síntesis para el diseño de visibilidad de la plataforma propia

| Herramienta | Granularidad | Nivel objeto vs campo | Indicador visual nativo | Propagación por relación |
|---|---|---|---|---|
| World Anvil | Fragmento (Secret) dentro de artículo | Campo (Secret embebido) | No estandarizado (pedido por la comunidad) | No documentado |
| Kanka | Elemento completo + atributo individual | Ambos | No documentado | **Sí, explícita ("permission chaining")** |
| Foundry VTT | Documento completo | Solo objeto | Solo vía plugins de terceros | No aplica (documentos independientes) |
| Roll20 | Objeto completo + un campo fijo GM-only | Objeto + 1 campo especial | No | No aplica |
| Obsidian | Ninguna (mono-usuario) | — | — | — |
| Notion | Página/base completa | Solo objeto (no columna) | No | No — riesgo de desincronización manual |

**La plataforma propia, si de verdad tiene cinco niveles por objeto de forma nativa en el modelo de
datos** (no un hack de convención), ya está por delante de todas las herramientas estudiadas en
granularidad de permisos — ninguna llega a cinco niveles nativos con selección de jugadores
concretos. El problema documentado en el diagnóstico no es el modelo de datos, es que **la interfaz
no comunica ese modelo**: ninguna de las capturas mencionadas describe indicadores visuales de
visibilidad. Aquí es donde Kanka (propagación por relación) y Foundry (default fail-closed +
necesidad de indicadores de color por fila, aunque haya que construirlos) dan las dos lecciones más
accionables.

---

## 5. La sesión de juego en curso

### World Anvil

Al iniciar una sesión, los jugadores se unen y obtienen una **pantalla de jugador** con: hoja de
personaje, tirador de dados, un "scrapbook" para tomar notas, y acceso directo al lore del setting.
El DM, en paralelo, tiene un **"online dungeon masters screen"**: notas, reproductor de música,
creación rápida de NPCs, tirador de dados, referencia de stat blocks, y capacidad de espiar las hojas
de personaje de los jugadores — todo desde una sola pestaña. Para prep, el dashboard del mundo permite
buscar artículos mientras se corre la partida, con la página de Stat Blocks abierta en paralelo.

### Kanka

El flujo de "prep de sesión en 30 minutos" documentado por Kanka se apoya en el **Dashboard
configurable**: se configuran de antemano ~4 widgets (recientemente modificado filtrado por tipo,
listas guardadas...) y se reutilizan sesión tras sesión sin reconfigurar nada — el patrón es
"invierte una vez en el dashboard, reutilízalo cada semana", en vez de reconstruir la vista de prep
cada vez.

### Fantasy Grounds

Separa conceptualmente "Story" (las notas del DM, organizadas en pestañas/categorías con colores e
iconos propios en la parte inferior de la ventana) de "Notes" (que se entienden como el espacio de
anotación de los jugadores durante la partida, con extensiones que dan a cada jugador su propio
diario). El DM enlaza desde sus entradas de Story a mapas, NPCs, encuentros e ítems directamente —
mesa de trabajo centrada en referencias cruzadas rápidas durante el combate/la narración.

### Foundry / Roll20

Ambos priorizan **acceso desde la sidebar sin salir de la pantalla de juego** (canvas del mapa):
Journal, Actors y Handouts están siempre a un clic, con pines de nota directamente sobre el mapa que
abren la entrada correspondiente — el patrón de "todo lo relevante de la sesión debe estar anclado
al propio mapa/lienzo de juego", que no aplica igual a una wiki de campaña sin mapa táctico, pero sí
inspira la idea de "accesos directos anclados al contexto activo" (p. ej., NPCs presentes en la
sesión actual, fijados en un panel lateral persistente durante esa sesión).

### Patrón consolidado

- Lo que un DM necesita a mano en mesa, según lo documentado: (1) resumen de la última sesión / notas
  de sesión activa, (2) lista de NPCs relevantes a mano (filtrable, no la lista completa de la
  campaña), (3) buscador rápido siempre accesible, (4) un dashboard **configurable una vez y
  reutilizado cada semana**, no reconstruido cada sesión.
- Ninguna herramienta estudiada tiene un modo "sesión en vivo" con foco exclusivo de UI en la
  información de esa sesión concreta salvo World Anvil (screen del DM) y Kanka (dashboard); es un
  área relativamente poco resuelta en el sector — margen real de diferenciación para la plataforma
  propia.

---

## 6. Móvil: qué conservan y qué simplifican

- **World Anvil**: la queja dominante en foros es que el sitio "está roto" en navegador móvil —
  scroll excesivo, la apertura de categorías y la creación de artículos generan "glitches" de UI. No
  hay app nativa (petición de la comunidad, sin resolver); la recomendación de la propia comunidad es
  que haría falta CSS responsive dedicado, no una adaptación superficial del sitio de escritorio.
  Conclusión: **World Anvil es el ejemplo negativo de referencia** — no resolvió el responsive y lo
  paga en reputación.
- **Kanka**: no se encontró documentación oficial ni hilos específicos sobre su comportamiento móvil
  más allá de mención genérica; en la práctica funciona como sitio web responsive de densidad media,
  sin app nativa dedicada — no hay evidencia fuerte para citar aquí más allá de la ausencia de quejas
  específicas (lo cual, en un sector donde World Anvil sí las recibe, es en sí mismo una señal
  positiva relativa).
- **LegendKeeper**: sin datos móvil específicos encontrados; su propuesta de valor está centrada en
  escritorio/tablet para trabajo de mapas.
- **Foundry / Roll20 / Fantasy Grounds**: estas son herramientas de mesa pensadas para pantalla grande
  compartida (el propio DM en portátil, jugadores con hoja de personaje); no se orientan a un uso
  móvil real como cliente principal — el móvil, cuando se usa, es solo para consultar la hoja de
  personaje propia (Roll20/D&D Beyond), nunca para gestionar contenido de campaña.
- **Notion / Obsidian**: ambos tienen apps móviles nativas maduras (son productos de notas
  generalistas), y en ambos casos el patrón de simplificación móvil es el estándar del sector:
  colapsar la barra lateral en un menú hamburguesa/deslizable, priorizar lectura sobre edición densa,
  y mantener el buscador como acción principal siempre visible.

### Lección para la plataforma propia

El patrón claro es: **no intentar llevar toda la densidad de la vista de escritorio (formularios
largos, tablas anchas) al móvil**; priorizar en móvil (a) buscador, (b) lectura de fichas (no edición
de formularios largos), y (c) consulta rápida durante sesión (lo que un jugador consulta en su móvil
en mesa es su ficha de personaje y quizá un NPC o lugar puntual, no gestión de campaña). No replicar
el error de World Anvil de dejar el sitio de escritorio sin adaptar.

---

## 7. Errores frecuentes que NO conviene copiar (quejas reales de usuarios)

1. **Funciones básicas escondidas tras menús secundarios.** World Anvil: fijar navegación
   anterior/siguiente de un artículo exige entrar al sidebar derecho y pulsar "Show additional
   options" — una función de uso frecuente enterrada en un submenú de "opciones avanzadas". Lección:
   lo que se usa cada visita no puede vivir a más de un clic detrás de "más opciones".
2. **Muros de suscripción sobre funciones estructurales, no solo estéticas.** El sistema de Secrets
   de World Anvil (justo la pieza más relevante para el caso de uso de la plataforma propia) requiere
   el nivel de pago "Guild" — los usuarios lo citan como razón de frustración porque la función que
   más necesitan (ocultar contenido a jugadores) está detrás de un muro de pago, no como mejora
   opcional sino como requisito para el flujo de trabajo central de un DM.
3. **Interfaz "clunky" por recarga completa de página en cada navegación.** Queja repetida sobre
   Kanka: moverse entre entidades se siente con fricción porque cada clic recarga la página entera, en
   vez de navegación con estado persistente (sin salto visual, sin perder scroll/contexto).
4. **Editor de texto percibido como anticuado**, y funciones core igualmente disputadas: reseñas de
   World Anvil citan el editor de texto como "outdated" y la usabilidad general como "no intuitiva" —
   pese a la enorme superficie de funciones, la curva de aprendizaje inicial se describe repetidamente
   como abrumadora ("puede tardar tiempo en aprender a navegar y usar todas las opciones
   disponibles").
5. **Responsive no resuelto, sino "también funciona en el navegador del móvil".** Ya cubierto en la
   sección 6 — World Anvil como ejemplo negativo explícito, con scroll excesivo y errores de UI al
   crear contenido desde el móvil.
6. **Modelo de visibilidad que exige mantener dos copias sincronizadas a mano** (Notion, y en menor
   medida Obsidian): cuando "ocultar del jugador" significa "duplica la base de datos y mantenla
   sincronizada tú mismo", el sistema falla en el peor momento posible — cuando el DM está ocupado
   preparando la sesión y se le olvida propagar un cambio a la copia "segura". Esto no es una queja de
   UI menor, es un fallo de integridad de datos con consecuencia narrativa real (un jugador ve un
   spoiler porque la copia pública no se actualizó).
7. **Sin propagación de visibilidad por relación** (Foundry, Roll20, Notion): un objeto público que
   enlaza/menciona a un objeto secreto puede filtrar la existencia de ese secreto (aunque no su
   contenido) si el sistema no oculta también la referencia. Kanka es la única herramienta estudiada
   que documenta explícitamente resolver esto.
8. **Filtros potentes pero escondidos** (Archives of Nethys, en su rediseño de tablas): mover de un
   filtrado simple y visible a un filtrado más potente pero oculto por defecto generó quejas de
   usuarios que antes encontraban las cosas más rápido con menos funciones. Lección: potencia no debe
   costar descubribilidad.
9. **Falta de indicador visual permanente de nivel de acceso** (Foundry, Roll20): en ambos casos hace
   falta abrir un diálogo de configuración o instalar un plugin de terceros para saber, de un vistazo
   en una lista, qué está compartido con quién. Es exactamente el fallo que el encargo pide evitar
   explícitamente ("sin que el DM se confunda sobre qué es público y qué es secreto").

---

## 8. Recomendaciones priorizadas para la plataforma propia

Ordenadas por relación coste/impacto, de mayor a menor prioridad. Cada una indica **qué hacer**, **por
qué** (con referencia a la herramienta que la inspira) y **coste estimado**.

### Prioridad alta

1. **Indicador visual permanente de nivel de visibilidad en toda fila/tarjeta y en la cabecera de
   cada ficha** (un badge/icono con color por uno de los cinco niveles, siempre visible, no detrás de
   un diálogo).
   *Por qué*: es precisamente el hueco que ni Foundry ni Roll20 resuelven de serie (hace falta un
   plugin de terceros en Foundry para lograr esto) y es el requisito explícito del encargo — evitar
   que el DM se confunda sobre qué es público. Es además la ventaja diferencial real de la plataforma
   (cinco niveles nativos) que hoy no se comunica visualmente.
   *Coste*: bajo-medio — cambio de componente de UI (badge reutilizable) + acceso al campo de
   visibilidad que probablemente ya existe en el modelo de datos. Sin cambio de esquema.

2. **Propagación de visibilidad por relación ("permission chaining" de Kanka)**: si una entidad
   pública enlaza/menciona a una entidad de nivel "solo DM", el enlace no debe mostrarse (ni su
   nombre) a quien no tenga permiso sobre el objetivo.
   *Por qué*: es el fallo de integridad más serio identificado en el sector (Foundry, Roll20, Notion
   lo sufren); Kanka es la única herramienta que lo documenta resuelto explícitamente, y es
   exactamente el tipo de fuga que un DM no puede permitirse en una campaña con secretos.
   *Coste*: medio-alto — cambio de lógica en el backend de `canView`/listados de relaciones, no solo de
   CSS: cada endpoint que devuelve relaciones/menciones de una entidad debe filtrar el objetivo, no
   solo el origen. Dado que el proyecto ya declara `canView` como dueño único de la matriz de
   visibilidad (`apps/api/src/common/visibility.ts`), este es el punto exacto donde aplicar el
   filtrado adicional.

3. **Agrupar las nueve pestañas planas en categorías** (p. ej. "Contenido del mundo": NPC, Lugar,
   Facción, Objeto, Evento, Documento — y "Juego": Misión, Sesiones, Personajes), con la barra lateral
   colapsable/reordenable al estilo Linear, en vez de nueve ítems sueltos al mismo nivel.
   *Por qué*: es el punto de partida de casi todas las herramientas estudiadas (World Anvil agrupa por
   categoría libre; Kanka lista tipos fijos pero ya empieza a sentirse largo con más de 9; Linear
   demuestra que colapsar/reordenar resuelve la densidad sin ocultar función). Corrige directamente el
   síntoma "nueve pestañas planas" del diagnóstico.
   *Coste*: medio — cambio de componente de navegación (agrupación + estado colapsado persistente),
   sin tocar el modelo de datos.

4. **Enlaces con affordance visual real** (subrayado o color de enlace estándar, cursor pointer,
   posible icono de "abrir") en cualquier nombre de entidad referenciado desde una lista o desde texto
   libre.
   *Por qué*: es el patrón universal en las siete herramientas estudiadas (menciones `@` en Kanka,
   `[[wikilinks]]` en Obsidian/LegendKeeper, enlaces de artículo en World Anvil) — corrige
   directamente el síntoma "los nombres no parecen enlaces" del diagnóstico, y es la base sin la cual
   ninguna otra mejora de navegación (breadcrumbs, backlinks) tiene sentido.
   *Coste*: bajo — cambio de CSS/componente de enlace, ninguna lógica nueva.

### Prioridad media

5. **Filas/tarjetas de lista con imagen (o icono de tipo por defecto) + resumen corto (1-2 líneas) +
   tipo + etiquetas**, sustituyendo el patrón actual de "solo nombre + etiquetas".
   *Por qué*: es el mínimo común de toda herramienta estudiada seria (Kanka, World Anvil, la vista
   Gallery de Notion recomendada explícitamente para NPCs) — corrige el segundo síntoma del
   diagnóstico ("las listas muestran solo el nombre y unas etiquetas").
   *Coste*: medio — requiere campo de "resumen/extracto" si no existe ya en el modelo (posible cambio
   de esquema menor: columna `summary` o extracción automática de las primeras N palabras del cuerpo,
   que es la opción de coste más bajo) + cambio de componente de tarjeta/fila.

6. **Buscador global anclado en la cabecera**, con resultados agregados de todos los tipos de
   entidad, no un buscador por sección.
   *Por qué*: patrón universal (World Anvil, Kanka "quick search", Notion Ctrl+K) — corrige "no hay
   buscador" del diagnóstico y es más urgente cuanto antes se agrupen los tipos en categorías (la
   recomendación 3), porque agrupar sin buscador global empeora el acceso a un tipo concreto.
   *Coste*: medio — requiere un endpoint de búsqueda cruzada respetando `canView` por resultado (es
   decir, no puede ser una búsqueda de texto libre ingenua: cada resultado devuelto debe pasar el
   mismo filtro de visibilidad que un listado normal). Backend + UI.

7. **Migas de pan (breadcrumbs) y cabecera global persistente** con el nombre de la campaña activa y
   un selector para cambiarla.
   *Por qué*: todas las herramientas con más de un espacio de trabajo (World Anvil "mundo", Kanka
   "campaña", Notion espacio) resuelven el cambio de contexto con un selector siempre visible en
   cabecera, nunca enterrado — corrige "no hay cabecera global" del diagnóstico.
   *Coste*: bajo-medio — cambio de layout/componente compartido (shell de la aplicación), sin tocar
   datos.

8. **Backlinks visibles en la ficha ("qué otras entidades apuntan a esta")**, con preview al pasar el
   ratón o clic (modal ligero), al estilo del "Mention Previewer" de Kanka.
   *Por qué*: reduce la navegación de ida y vuelta y hace tangible el valor real del modelo de wiki
   enlazada, que hoy el diagnóstico no menciona explotado visualmente.
   *Coste*: medio — requiere una consulta de "quién referencia a X" (probablemente ya resoluble si las
   relaciones están modeladas como tabla de enlaces) + componente de preview modal. Sin cambio de
   esquema si las relaciones ya existen como entidad de datos.

9. **Separar el botón "Borrar" de "Guardar" en los formularios de ajustes** (doble confirmación,
   distinto color, distinta zona de la pantalla — zona de peligro al final, como es convención
   establecida).
   *Por qué*: ninguna herramienta estudiada coloca una acción destructiva junto a la de guardado
   habitual — es una convención de seguridad tan estándar en el sector (y fuera de él) que no hizo
   falta ni buscar ejemplos específicos; es el propio diagnóstico el que la señala como riesgo.
   *Coste*: bajo — cambio de CSS/layout de un formulario, mover un botón y añadir confirmación.

10. **Aprovechar el ancho de pantalla vacío con un panel lateral contextual** (metadatos, relaciones,
    o el propio backlinks del punto 8) al estilo LegendKeeper (sidebar derecho que se abre/cierra
    según haga falta), en vez de dejar mitad de pantalla en blanco.
    *Por qué*: LegendKeeper resuelve exactamente este problema con un sidebar contextual que se cierra
    solo si no aplica — mismo síntoma medido en el diagnóstico ("media pantalla es espacio vacío").
    *Coste*: medio — cambio de arquitectura de componentes de la página de ficha (layout de dos
    columnas con panel colapsable), sin cambio de modelo de datos.

### Prioridad baja / a más largo plazo

11. **Panel de "sesión activa" configurable una vez y reutilizado cada semana** (al estilo dashboard
    de Kanka / DM screen de World Anvil): resumen de la última sesión, NPCs presentes fijados,
    recordatorios.
    *Por qué*: es el área menos resuelta del sector entero (solo World Anvil y Kanka la abordan en
    serio) — margen real de diferenciación, pero no es aún exigido por el diagnóstico actual (que se
    centra en navegación y listas), así que puede esperar a que la base de navegación esté resuelta.
    *Coste*: alto — nueva superficie de producto (dashboard configurable con widgets), probablemente
    requiere modelo de datos nuevo (qué widgets existen, qué configuración persiste por usuario/
    campaña) y arquitectura de componentes nueva.

12. **Modo lectura simplificado en móvil** (colapsar navegación a menú deslizable, priorizar
    buscador + lectura de ficha sobre edición de formularios largos), evitando el error de World
    Anvil de no adaptar el sitio de escritorio.
    *Por qué*: no es urgente si el uso principal hoy es de escritorio (mesa del autor), pero conviene
    dejarlo planificado antes de la fase SaaS, cuando el móvil sí importará para consulta de jugadores
    en mesa.
    *Coste*: medio-alto — depende de cuánto se aparte del layout de escritorio; como mínimo requiere
    breakpoints responsive en todos los componentes nuevos de las recomendaciones 3, 5 y 10.

13. **Filtros combinables persistentes en sesión** (tipo, etiqueta, estado) en cada lista de entidad,
    con los filtros recordados mientras el usuario esté conectado, al estilo Kanka.
    *Por qué*: reduce fricción repetida en cada visita durante la preparación/ejecución de sesiones;
    solo se vuelve necesario cuando el volumen de entidades por tipo crece (umbral de Archives of
    Nethys: cuando ya no se puede escanear de un vistazo).
    *Coste*: medio — estado de filtro en frontend (localStorage o sesión de usuario) + query params en
    backend, sin cambio de esquema.

---

### Nota metodológica

Este informe se basa en documentación oficial (World Anvil Codex/Knowledge Base, docs.kanka.io,
foundryvtt.com, Roll20 Wiki/Help Center, legendkeeper.com, linear.app), blogs de producto (blog.kanka.io,
blog.worldanvil.com, linear.app/now), reseñas de terceros (dungeongoblin.com, char-gen.com,
loreteller.com) y foros/comunidad (sugerencias de producto de World Anvil, Fantasy Grounds forums,
hilos de Reddit y foros indexados por búsqueda web). Algunas búsquedas específicas sobre Reddit
(p. ej. quejas de Kanka en r/DnD) no devolvieron resultados directos de Reddit pese a múltiples
intentos con distintas formulaciones — en esos casos se ha citado la fuente alternativa más próxima
encontrada (reseñas de terceros, foros de producto) y se señala explícitamente la ausencia de
resultado de Reddit en vez de inventar una cita.
