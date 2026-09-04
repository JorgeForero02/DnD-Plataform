# El reseño de la mesa — la interfaz deja de ser un almacén y pasa a ser un juego

> Escrito el 2026-09-03 (noche), tras la sesión en la que el autor dijo que **su propia aplicación
> le costaba de usar**. **Manda sobre el plan de interfaz anterior.**
>
> **Qué es esto.** La decisión de rehacer las pantallas, lo que la sustenta —dos investigaciones con
> fuentes— y el orden de trabajo acordado. No es un plan de tareas: el plan se escribe cuando
> vuelva el prototipo.

## 1 · El hecho que lo desencadena

El autor entró en la aplicación, **habiendo explorado varias veces y conociendo cada decisión**, y
la encontró confusa. Sus palabras:

> *«Esto es un juego, una plataforma web, no una página web que hay que navegar para saber cosas.
> Aquí hay que construir dentro, pensar dentro, jugar dentro, y muchas veces todo eso se hace en la
> misma pantalla con todos reunidos haciendo cosas, no en veinte donde nadie entiende nada. Ahora
> mismo pareciera que estuviera en una fábrica de recursos más que en un juego.»*

**Eso no es una queja de estilo: es el resultado de una prueba de usuario.** El único usuario real
que ha tenido el producto, con el máximo contexto posible, no supo qué hacer. Hasta hoy la
documentación decía «cero validación» como si fuera un hueco; era un resultado, y peor.

## 2 · El diagnóstico, medido

Una investigación de solo lectura sobre `apps/web/src` confirmó y agravó la sospecha:

- **La navegación es el esquema de la base de datos.** Dieciséis pestañas, **siete de ellas
  literalmente un valor del enum de la tabla `Entity`** (PNJ, Lugares, Misiones, Facciones, Objetos,
  Sucesos, Documentos). Más tres rutas propias: **diecinueve destinos en una campaña.**
- **La mesa no está en la navegación.** `MesaDeSesion` no figura en la lista de pestañas: solo se
  llega por dos enlaces que **existen únicamente mientras hay una sesión en curso**. Fuera de
  sesión, el sitio donde se juega **no es alcanzable**, y por URL directa recibe un cartel de vacío.
- **Un turno de combate cuesta de tres a seis destinos.** Y poner una condición cuesta **una
  pantalla por objetivo**; a un monstruo, ninguna.
- **La mesa no tiene**: dados, peticiones de tirada, reloj, hoja, ataques, inventario, condiciones,
  criaturas. Todo eso existe construido, **en otra pestaña**.

**Cuatro defectos concretos**, verificados uno a uno contra el código y arreglados el mismo día:

1. **Las barras de vida del elenco no se refrescaban nunca** — el DM pulsaba «−5», el registro decía
   a los quince segundos «Pierde 5 PG (23 → 18)» y la barra seguía pintando 23. **La misma pantalla
   se contradecía consigo misma.**
2. **Las peticiones de tirada solo se veían dentro de la pestaña «Dados».** El sondeo funcionaba
   perfectamente y no lo miraba nadie.
3. **Una clave de enumeración cruda en el registro**: *«Recibe la condición «poisoned»»*, teniendo la
   traducción importada en el fichero de al lado.
4. **Un enlace crudo recargaba el navegador entero** en mitad de la partida.

## 3 · La decisión

**Se rehacen las pantallas, y no un poco.** Decisión del autor, con la objeción por delante y
mantenida.

**Lo que se tira es la disposición, no las piezas.** La investigación fue listando componente a
componente «se reutiliza tal cual»: el elenco, los retratos, las barras de vida, el registro, el
panel de dados, el selector de ventaja, el de audiencia, la hoja calculada, las condiciones, los
puntos de golpe, el reloj, el bestiario, las tiradas pendientes. **Lo que se rehace es el nivel de
página**: la navegación, el reparto de la campaña y la composición de la mesa. Es donde está el
problema y es la capa más delgada.

**El servidor no se toca.** 108 endpoints bien repartidos con la autorización donde debe estar.

## 4 · La arquitectura acordada

### Tres estratos

Sacado de la anatomía de Baldur's Gate 3, y **el argumento está en su mapa de teclas**: diez paneles
tienen tecla de alternar; la barra de acciones y los retratos **no tienen ninguna**. Un panel tiene
tecla **porque se quita**; los otros no la tienen **porque nunca se quitan**.

1. **Permanente** — nunca se sustituye, **sin botón de cerrar**. Cabecera de escena, hilo, retratos,
   barra de acciones.
2. **Superpuesto** — se abre encima, Escape cierra, **vuelves donde estabas**. Hoja, inventario,
   consulta del mundo, bestiario, ficha de entidad. **Uno a la vez.**
3. **Contextual** — **no se abre: aparece** porque ha pasado algo. El momento de la tirada, «te
   piden una tirada», «es tu turno», «esto te perdiste».

**El error que esto corrige**: hoy todo es del mismo nivel y cada pantalla sustituye a la anterior,
así que no hay un sitio donde estés.

### Tres estados de una misma pantalla

**En reposo** (sin sesión) · **en sesión** · **en combate**. No son tres pantallas: es una que
cambia. Y el paso entre estados **tiene que verse**: empezar una sesión y entrar en combate son
momentos, no cambios de configuración.

### Dos disposiciones, y aquí está la diferencia con BG3

Palabras del autor, que invierten el modelo del juego:

> *«En BG3 es un jugador manejando varios; acá somos varios manejando uno propio.»*

- En BG3 **los retratos del grupo son mandos**: pulsas uno y pasas a controlarlo.
- **Aquí no pueden serlo.** El personaje de otro no es tuyo. Sus retratos son **información**, no
  controles: sobre el retrato de otro **no van botones**.

De ahí sale la resolución de una duda que llevaba abierta desde el reseño anterior:

- **Jugador**: su personaje delante y con detalle; los demás en segundo plano con su estado y qué
  están haciendo; se abren si quieres, pero no por defecto.
- **DM**: **él sí está en la situación de BG3**, porque maneja a muchos. Su disposición es la
  parrilla de todos con mandos, más sus herramientas de narración.

**Es una pantalla con dos disposiciones, no dos pantallas.** Y ya está bien resuelto por debajo: el
servidor decide qué ve cada uno, y existe el precedente del «ver el registro como», donde el DM ve
**menos**.

## 5 · El escenario cuando no hay mapa

**El autor corrigió un error de razonamiento mío**, y tenía razón. Yo dije «no hay mapa, luego la
mesa espera a la fase 3». El tablero **sí** es fase 3; el fallo fue tratar **«no hay tablero» como
«no hay escenario»**.

Su propuesta —dejar el hueco marcado y montar la interfaz alrededor ocupando toda la ventana— es
correcta **y es mejor que esperar**: lo caro del rediseño es la carcasa, no el mapa. Montada la
carcasa, el tablero **cae luego en un hueco que ya tiene la forma correcta**. Al revés no se puede.

**Con una corrección que el autor aceptó y mejoró:** el hueco no está vacío. Lo ocupa una **cabecera
de escena viva** —dónde está la escena, qué hora es en la campaña, quién está— que **cambia sola con
los sucesos que ya emitimos**. El DM revela «El Puerto Viejo» y la cabecera pasa a decirlo.

> **Y una corrección de la investigación a mi hipótesis, que importa:** *un hilo a secas es un
> tablón, no un escenario.* Lo que convierte una columna de texto en un lugar es precisamente esa
> cabecera. Los tres datos ya existen en el código — y el reloj lleva semanas sondeando cada treinta
> segundos **para nadie**, escondido en la pestaña «Dados».

## 6 · El ritmo de la mesa

**Directo como principal, mensajes como opción visible.** Sesiones largas y del tirón, **pero alguien
puede irse a la mitad y volver**.

Ese matiz añade un requisito que una partida solo en directo no tendría: **reincorporarse tiene que
ser gratis**. Marca de por dónde ibas, «desde aquí te lo perdiste», y **el estado además de la
historia** — que es, otra vez, la cabecera de escena.

**Consecuencia sobre el tiempo real**, que baja el miedo que lo bloqueaba todo: la partida por
mensajes es **asíncrona por definición** y el sondeo actual le sobra. En directo, los 15–30 segundos
**se quedan justos pero valen**. Lo que entra en la ruta es que el hilo y el estado del grupo se
enteren rápido; **presencia, «está escribiendo» y edición simultánea siguen fuera.**

## 7 · Las referencias, y qué se verificó

**Verificado por descarga directa** (la búsqueda web estaba agotada, así que todo lo demás va
marcado):

- **Baldur's Gate 3** — el mapa de teclas, el botón «añadir bonificador» **antes** de la tirada, la
  segunda oportunidad ofrecida **después del fracaso** con el recurso contado en el rótulo
  («Usar inspiración (2)»), y el mecanismo antiagobio: **el bocadillo sobre el icono de una reacción
  configurada como «pregúntame»**, y el coste escrito **bajo el nombre del verbo**.
- **Foundry VTT** — un solo campo lleva narración, tiradas y susurros; **revelar es un empujón, no
  un permiso** («Show Players» aparece en la pantalla del jugador); **la acción solo aparece para
  quien puede hacerla** («End Turn» solo al jugador activo); y daño y condiciones **desde el
  retrato**, no abriendo una hoja.
- **Avrae** — un combate entero de 5.ª edición, con iniciativa, ataques, PG y condiciones, **en una
  columna de texto sin un solo píxel de mapa**. Es la prueba de que el tablero no está en la ruta
  crítica.
- **Play-by-post** — asíncrono por definición; *«la escena es un post»*.

**Descrito pero NO verificado**, y no debe escribirse como hecho: el aspecto del d20 de BG3, cuántos
paneles caben abiertos a la vez, sus tooltips, **Divinity: Original Sin 2 por completo** (las dos
fuentes dieron error), Roll20, D&D Beyond, Alchemy y Owlbear Rodeo.

**Anti-referencias**, que es lo que más peso tiene en el encargo a Figma: nada de panel de
administración, ni Notion/Linear, ni rejilla de tarjetas, ni formulario con etiquetas encima, ni
**una pestaña por tipo de dato** — el error concreto que este reseño existe para corregir.

## 8 · El orden de trabajo acordado

```
1 · Ahora, en paralelo   →  fase 2.5 en el servidor: tipos de daño y resistencias,
    (frontera: apps/api      iniciativa y turnos, ataque comparado en el servidor,
     packages/shared)        daño con traza, condiciones → tiradas, archivar personajes
2 · Vuelve el prototipo  →  adaptar la mesa con sus tres estados
3 · El «después»         →  enganchar la capa de combate a lo ya construido
4 · PARTIDA DE PRUEBA
5 · Después de jugar     →  ataques de oportunidad (2.5.7)
```

**La regla de la frontera, y es la única que no se puede cruzar:** el carril del motor **solo AÑADE
a `packages/shared`, nunca cambia lo que ya exporta**. Añadir da más a la web; cambiar la rompe.

**Dos bloques de 2.5 quedan fuera de la primera tanda, con motivo:**

- **La pantalla del encuentro (2.5.6)**, porque **si se construye ahora se construye dos veces**: el
  orden de turnos no es una pantalla, es **una capa sobre la mesa nueva**. Su **diseño** sí entra ya,
  como estado C del prototipo.
- **Los ataques de oportunidad (2.5.7)**, porque abren el concepto de «reacción» en el modelo de
  datos y es el peor momento para abrir esa puerta. **El autor los quería y aceptó posponerlos** al
  ver el conflicto.

**Y la regla que sostiene todo el plan:** si hay que elegir entre los dos carriles, **gana el
gráfico**. El motor no decide si los amigos del autor vuelven a una segunda partida; la pantalla sí.

## 9 · La decisión de sustituir, y su frontera exacta

**Decisión del autor, 2026-09-03 (madrugada), tras recibir la segunda ronda: la maqueta es la
interfaz nueva. No se adapta lo que hay — se sustituye.**

Estoy de acuerdo, y por un motivo concreto: el problema diagnosticado **es la arquitectura de la
información** —diecinueve destinos, la navegación con forma de base de datos, la mesa fuera del
menú—, y adaptar significa arrastrarla. Migrar por trozos una estructura que es distinta de raíz
suele costar **más** que sustituirla, y acaba en un producto mitad y mitad.

**Pero «sustituir la interfaz» no es «tirar `apps/web`», y la diferencia hay que dejarla escrita
antes de empezar, porque es fácil destruir la parte buena por inercia:**

| Se sustituye | Se conserva |
|---|---|
| Las **páginas** y la navegación (`pages/`, la lista de pestañas) | Los **hooks de datos** (`features/*/hooks.ts`): sondeos, invalidaciones, claves de caché |
| Los **componentes de presentación** de cada pantalla | Las **puertas de API** (`features/*/api.ts`) |
| La **composición** de la mesa | El **vocabulario del dominio** (`vocabulario.ts`): quince condiciones, dieciocho habilidades, trece tipos de daño, razas, clases, armaduras |
| | La **tienda de sesión** y el interceptor de errores |

**El motivo de conservar esa columna:** no es donde está el problema, y **ahí vive corrección
acumulada que costó semanas** — la concurrencia optimista de los puntos de golpe con su conflicto de
versión, el filtrado por `canView`, los mensajes de error del servidor pintados tal cual, y el
sondeo de quince segundos que se arregló el mismo día que se tomó esta decisión. Reescribir eso
sería reintroducir fallos ya cazados.

**La maqueta es presentación sin datos** —así se encargó a propósito—, así que el trabajo real de la
sustitución **es enchufarla a esa columna que se conserva**, no reconstruirla.

### La red de seguridad de la migración

**Los recorridos de navegador se conservan y se actualizan, no se borran.** Describen
**comportamiento**, no maquetación: *«el DM pide una tirada, a la jugadora le aparece sin recargar,
tira, y el DM ve el resultado»* sigue siendo verdad con cualquier interfaz. Son la única forma de
saber que la sustitución no perdió nada por el camino, y por eso **se actualizan sus selectores en
vez de tirarlos**.

**Las pruebas de componente de las pantallas que desaparezcan mueren con ellas**, y eso se acepta:
son de la disposición vieja.

### Lo que la maqueta todavía no cubre

Señalado por el autor al recibirla, y **no se cubrirá con Figma** —se quedó sin presupuesto—, así
que lo construimos nosotros con el lenguaje que la maqueta ya fija:

- **La invitación.** Y ojo, que **no es una pantalla, es un flujo**: el DM genera un enlace, alguien
  que no tiene cuenta lo abre, se registra desde ahí y **vuelve solo** a la campaña. Ya está
  construido y **ya tiene un recorrido de navegador con dos contextos** — lo que falta es su sitio
  en la interfaz nueva.
- **Que preparar sea más cómodo para el DM.** El taller existe ya en la maqueta; lo que falta es
  rodaje, y eso solo lo dice usarlo.

## 10 · El encargo a Figma

El prompt está en
[`2026-09-03-prompt-figma-mesa.md`](./2026-09-03-prompt-figma-mesa.md), con trece secciones, los
valores exactos de los tokens y los nombres de las clases de Tailwind del proyecto — **eso último es
lo que decide si el código que vuelva se adapta o se reescribe**.

Se le pidieron **doce pantallas navegables, no cuarenta**: la vez anterior cuarenta superficiales
dieron poco. Y se le pidió componentes **presentacionales, sin datos**, para que las consultas se
conecten por encima sin tocar el marcado.
