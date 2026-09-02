# Programación por cajas para quien no programa — informe · 2026-09-02

> **Qué es esto.** El estudio de Scratch, Blockly, Twine, Ink, Inform 7, Unreal Blueprints,
> Godot VisualScript, IFTTT, Zapier, Atajos de Apple, Foundry VTT, Notion, Airtable, Coda y los
> motores ECA/Drools, del que salió
> [el diseño del sistema de eventos](./2026-09-02-sistema-de-eventos-design.md).
>
> Se conserva en el repositorio porque tres de sus conclusiones cambiaron el diseño —conjuntos
> con nombre en vez de solo banderas, orden por especificidad, y el fracaso documentado de las
> primitivas genéricas con piel bonita— y un razonamiento cuya fuente vive en el borrador de una
> sesión es un razonamiento que nadie puede volver a comprobar.

---

## Investigación aplicada a un sistema de eventos ECA para una plataforma de campañas de D&D

---

## Resumen ejecutivo

La pregunta central — *¿cómo consigue que piezas sencillas compongan comportamientos complejos sin
convertirse en un lenguaje que hay que depurar?* — tiene una respuesta que se repite en todos los
sistemas reales investigados, desde Scratch hasta Inform 7, pasando por Foundry VTT y los motores de
reglas de negocio tipo Drools: **no se evita que el sistema sea, técnicamente, un lenguaje de
programación. Se evita que el usuario tenga que pensar en él como tal.** Esto se consigue con un
puñado de decisiones de diseño concretas, no con una única idea mágica:

1. Un **vocabulario cerrado y con nombre** (no un lenguaje con gramática abierta): sucesos, condiciones
   y efectos son una lista finita, no combinaciones libres de símbolos.
2. **Composición por encadenamiento de eventos**, no por control de flujo explícito: las reglas no se
   llaman unas a otras, reaccionan a lo que otras reglas producen. Es el patrón que hace escalar tanto
   a Scratch (`broadcast`/`when I receive`) como a los rule engines de negocio (ECA con re-disparo).
3. **Estado mínimo y con nombre** (banderas, no variables): el sistema no pierde legibilidad porque no
   hay aritmética que seguir, solo verdad/falso con nombre propio.
4. **Trazabilidad como primera clase**, no como añadido de depuración: el sistema debe poder responder
   "por qué pasó esto" señalando la regla exacta y el dato exacto que la disparó — lo que en Blueprints
   es *Execution Trace* y en un motor de reglas de negocio es el registro de *conflict set* y disparo.
5. **Reglas de desempate declaradas y visibles**, no implícitas en el orden de guardado — el patrón de
   Inform 7 (especificidad) y de Drools (salience + orden de declaración) es el que de verdad evita la
   sorpresa cuando dos reglas se pisan.

Cuando estas cinco piezas están, el sistema deja de sentirse como "programar" aunque formalmente lo
sea — y esa es, según la evidencia reunida, la mejor definición práctica de "sin convertirse en un
lenguaje que hay que depurar": no es que no haya lenguaje, es que casi nunca hace falta depurarlo
porque se entiende mirándolo, y cuando falla, se puede preguntar por qué sin abrir una consola.

---

## 1. Qué hace que un sistema de piezas sea entendible

### Tipado por forma: funciona, y funciona por una razón concreta

En Blockly, cada conector tiene una forma —una muesca tipo puzle— que solo encaja con bloques del
tipo correcto. Google lo describe explícitamente como mecanismo para "eliminar la posibilidad de
errores de sintaxis": el sistema de tipos no se explica, se *toca*. Un análisis académico de Blockly
(Lerner et al., *Polymorphic Blocks*, CHI 2015) confirma que el mecanismo dominante en las interfaces
de bloques es justo este: puertos con forma, "conectores tipo muesca reminiscentes de un rompecabezas"
[[Polymorphic Blocks, UCSD](https://cseweb.ucsd.edu/~lerner/papers/polymorphic-blocks-chi15.pdf)].
Esto no es cosmético: reduce activamente el espacio de errores posibles, porque una pieza numérica
físicamente no encaja en un hueco booleano.

En Scratch, los *hat blocks* (los "sombreros" que arrancan un script, como "al presionar la bandera
verde" o "al recibir mensaje") tienen una forma con el borde superior redondeado y solo bulto en la
parte inferior — de modo que **no se puede encajar nada por encima**. Es una restricción de forma que
codifica una regla semántica real: un suceso siempre está al principio de una secuencia, nunca en medio
[[TurboWarp docs, Events and hats](https://docs.turbowarp.org/development/extensions/hats)].

### Color: refuerza, no sustituye

En Scratch y Blockly el color agrupa categorías (eventos en amarillo, control en naranja, etc.). La
literatura y la documentación de Google lo describen como **refuerzo**, no como mecanismo de
comprensión por sí solo: "los bloques también se codificarán por color para reforzar al usuario final
qué es cada bloque" [[Blockly docs, What is Blockly?](https://developers.google.com/blockly/guides/get-started/what-is-blockly)].
La palabra clave es *reforzar*: si se quita el color, el sistema sigue siendo comprensible por forma y
texto; si se quita la forma, deja de serlo. Esto importa para el diseño del formulario de D&D: el color
puede ayudar a distinguish visualmente "Cuando / Si / Entonces", pero **no puede ser el único indicador**
de qué tipo de pieza es cada cosa — el texto tiene que bastar solo.

### Lenguaje natural con plantilla: el caso más fuerte es Inform 7

Inform 7 no usa bloques: usa frases en inglés casi natural — "Instead of taking the sword, say..." — y
es probablemente el sistema investigado que más se acerca en espíritu a lo que se pide para D&D: reglas
que se leen como oraciones. La clave de por qué esto no degenera en ambigüedad de lenguaje natural
libre es que **el lenguaje natural es solo la piel de una gramática de plantilla estricta**: "Instead
of [acción]" y "Before [acción]" son slots fijos con vocabulario controlado, no prosa libre interpretada
por IA. El usuario rellena huecos con nombres de objetos y acciones ya declaradas, tal como un
formulario con desplegables — lo cual valida directamente el enfoque de "formulario en vez de lienzo"
para la primera versión de D&D.

### Plantillas y ejemplos: donde de verdad se aprende

Ninguno de los sistemas investigados enseña por manual de referencia. Twine, Ink y Foundry VTT enseñan
por ejemplos copiables (recetario de "Active Effects" para D&D 5e en la wiki oficial de GitHub, con
casos como "dar +2 a Fuerza"), e IFTTT e incluso Zapier arrancan de plantillas ("applets"/"Zap
templates") en vez de un editor en blanco. La lección aplicable: el formulario de reglas del DM debería
llegar con una biblioteca de reglas de ejemplo instanciables (como los tres ejemplos que cierran este
informe), no solo con campos vacíos.

### Qué es decoración sin efecto real

La investigación no encontró evidencia de que animaciones de conexión, iconos decorativos o
personalización visual del lienzo mejoren la comprensión per se — son "aceptación", no comprensión.
Lo que sí tiene evidencia de efecto es: (a) restricción física de qué encaja con qué (tipado por forma
o por validación de campo), (b) vocabulario cerrado con nombres consistentes, y (c) mostrar el estado
real de ejecución (ver sección 5). El resto —estética, iconografía, color más allá del agrupamiento— es
lo que un análisis de Blockly llama explícitamente "comunicar la intención", útil pero secundario frente
a la forma.

---

## 2. Cómo se consigue potencia sin complejidad

Hay un patrón dominante y es el mismo en todos los sistemas que escalan bien: **componer por eventos
que se re-disparan, no por control de flujo que el usuario tiene que orquestar**.

### El patrón: encadenamiento de eventos (event chaining)

En Scratch, `broadcast` envía un mensaje que cualquier script puede escuchar con `when I receive`. Un
guion no llama a otro guion — simplemente anuncia que algo pasó, y quien esté interesado reacciona.
Existen dos variantes documentadas: `broadcast` (dispara y sigue, para eventos paralelos) y `broadcast
and wait` (dispara y espera a que termine el receptor, para eventos secuenciales)
[[Scratch Wiki, Broadcast](https://en.scratch-wiki.info/wiki/Broadcast)]. Este es el mismo patrón,
formalizado, que en teoría de bases de datos activas se llama **ECA en cascada**: "la ejecución de la
parte de acción de una regla activa puede coincidir con la parte de evento de la misma regla u otra,
disparándola" [[ScienceDirect, Event-Condition-Action Rule](https://www.sciencedirect.com/topics/computer-science/event-condition-action-rule)].

Zapier usa la misma idea en su forma empresarial: un Zap puede terminar disparando un webhook que otro
Zap escucha como trigger. Notion, Coda y Airtable la reproducen con "cuando cambia una propiedad" que
puede haber sido cambiada, a su vez, por otra automatización. **Es el único mecanismo de composición
encontrado en la investigación que no requiere que el autor entienda "orden de ejecución" como
concepto explícito** — porque no hay una llamada a función que seguir, solo una notificación que puede
o no tener oyentes.

Esto es exactamente aplicable al ejemplo 3 del cierre de este informe: una regla marca una bandera de
campaña, y una segunda regla, totalmente independiente, escucha "cuando cambia esa bandera". El DM
nunca tiene que declarar que "la regla A llama a la regla B" — solo que "A escribe algo" y "B reacciona
a que ese algo cambió", que es exactamente cómo describió el propio DM su ejemplo original.

### Plantillas parametrizables: el patrón de las "recetas"

Foundry VTT documenta esto explícitamente en su recetario de *Active Effects* para D&D 5e: en vez de
enseñar la gramática completa del sistema, la comunidad publica "recetas" (dar ventaja a un tipo de
tirada, aplicar resistencia a un daño) que el usuario clona y ajusta
[[dnd5e Active Effects Examples, HackMD](https://hackmd.io/@foundryvtt-dnd5e/active-effects)]. IFTTT
llama a esto "applets": una combinación fija de trigger+acción con dos o tres huecos rellenables. La
potencia no viene de que el usuario combine primitivas libremente desde cero, sino de que exista una
biblioteca creciente de combinaciones ya probadas que solo requieren rellenar parámetros.

### Vocabulario pequeño y muy combinable, contra vocabulario grande y específico

Es la tensión central entre Blueprints/Blockly (vocabulario grande, casi todo el motor expuesto) e
IFTTT (vocabulario minúsculo, combinaciones fijas). La evidencia de las quejas de usuarios de IFTTT
apunta al límite de la segunda estrategia: "los usuarios informan que no pueden encadenar varias
sentencias de IFTTT y el software parece limitado a cierta funcionalidad predeterminada que está
permitida" [ver sección 7]. La lección: un vocabulario pequeño solo escala si las piezas se pueden
recombinar libremente (como los eventos de Scratch), no si cada combinación tiene que existir de
antemano como *applet* (como en IFTTT).

---

## 3. Vocabulario mínimo real, y dónde está el techo

Analizando los vocabularios reales de los sistemas investigados:

| Sistema | Sucesos | Condiciones | Efectos | ¿Variables/bucles? |
|---|---|---|---|---|
| Scratch | ~8 hats (bandera verde, tecla, clic en sprite, mensaje recibido, ...) | booleanas por bloque de sensor | ~40 acciones de movimiento/apariencia/sonido | Sí, desde el principio — pero el "techo sin variables" ya cubre juegos simples |
| IFTTT | 1 trigger por applet | ninguna nativa (algunos filtros) | 1 acción por applet | No — y es la queja #1 de usuarios |
| Zapier | 1 trigger | *Filter* + *Paths* (condicional) | múltiples acciones encadenadas | Variables limitadas, sin bucles reales salvo "Looping by Zapier" (add-on) |
| Foundry Monk's Active Tile Triggers | ~10 (token entra/sale, clic, combate empieza, puerta se abre...) | probabilidad %, restricción por rol (GM/jugador) | ~15 (teletransportar, mostrar/ocultar, macro, tirada, mensaje, efecto...) | No — usa "variables de tile" internas simples, sin aritmética expuesta |
| Inform 7 | acciones del jugador ("taking", "going", "examining"...) | condiciones sobre el mundo (`if the door is open`) | cambios de estado, texto | Sí tiene variables y "kinds", pero el 80% de las reglas de una aventura no las necesitan |
| Notion / Airtable / Coda | cambio de propiedad, fila nueva, formulario enviado, botón pulsado, programado | comparación de campo, "coincide con condiciones" | editar propiedad, crear fila, notificar, webhook | Airtable y Coda sí tienen fórmulas/scripting como escape hatch |

**El techo real, según la evidencia**, aparece en tres sitios concretos:

1. **Contar cosas.** "Cuando 3 de 5 jugadores hayan hecho X" no es expresable con una sola bandera
   booleana — hace falta o bien una bandera por jugador (ver sección 4) o un contador. Ningún sistema
   puramente ECA sin memoria numérica lo resuelve limpiamente; Airtable lo resuelve con fórmulas,
   Zapier con "Looping" (add-on de pago), Scratch con variables.
2. **Repetir sobre una colección.** Roll20 (vía ScriptCards) documenta explícitamente que su capa de
   automatización de triggers simple no basta y necesitan "un intérprete de lenguaje de scripting con
   variables, bucles y ramificación" para casos reales de combate
   [[Script:ScriptCards, Roll20 Wiki](https://wiki.roll20.net/Script:ScriptCards)] — es la prueba más
   directa encontrada de que un sistema de automatización para D&D concretamente topa con este límite.
3. **Aritmética con memoria entre disparos.** Sumar puntos de daño acumulado, temporizadores en turnos.
   Airtable documenta textualmente que no se puede combinar *repeating groups* con lógica condicional
   en la misma automatización — el propio producto reconoce la frontera
   [[Airtable community, conditional logic and repeating groups](https://community.airtable.com/automations-8/can-airtable-automations-do-conditional-actions-inside-loops-and-support-nested-loops-46049)].

Para D&D, esto importa directamente para el ejemplo 2 de "bloqueo hasta que todos los jugadores estén
presentes": es justo el caso límite. Se resuelve dentro de la restricción "solo banderas" (ver más
abajo), pero es la prueba de que el límite existe de verdad, no es hipotético.

---

## 4. El problema del estado: banderas frente a variables frente a contadores

### Hasta dónde llegan las banderas booleanas con nombre

Se puede llegar sorprendentemente lejos con banderas si se permite **una bandera por combinación de
sujeto+condición** en vez de un contador genérico. Es el patrón que usa Ink de facto: aunque Ink tiene
variables numéricas reales, gran parte de la ficción interactiva profesional se escribe con banderas
booleanas por decisión ("player_knows_secret") y con el propio mecanismo `once`/`sticky` de las opciones
como memoria implícita — "por defecto, cada elección en el juego solo se puede elegir una vez"
[[Writing With Ink, GitHub](https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md)],
lo cual es en sí una bandera booleana gestionada automáticamente por el motor, sin que el autor declare
una variable.

**Caso "todos los jugadores presentes y hacen algo"**, resuelto solo con banderas (ver ejemplo 2 al
final): en vez de un contador `jugadores_presentes = 3`, se define una bandera booleana por jugador
(`presente_ana`, `presente_bruno`, ...) que cada evento de "jugador entra a sesión" activa, y una
condición compuesta "todas las banderas de esta lista están activas" — que es una comprobación
booleana sobre un conjunto con nombre (una *marca de campaña de tipo set*, como ya prevé el proyecto),
no una suma. Esto **sí cabe** dentro de la restricción "sin aritmética", porque la operación no es
`contar >= 3`, es `pertenece_a(jugador, marca_set) para todos los jugadores de la sesión`. Es el mismo
truco que usa Inform 7 con "for the nth time" en su Ley III de especificidad — trata la repetición como
comparación de conjunto, no como conteo aritmético explícito.

### Qué se pierde honestamente sin contadores/variables

Hay que decirlo sin rodeos: **no todo se puede resolver con banderas con nombre**. Se pierde:

- **Progreso parcial numérico** ("2 de 3 pistas encontradas, muéstralo en pantalla"): se puede *comprobar*
  con banderas-set ("¿está `pista_1` en el set de pistas encontradas?"), pero no se puede *mostrar un
  número* sin una operación de conteo, que es aritmética.
- **Umbrales configurables por el DM** ("cuando 3 o más" en vez de "cuando todos"): con solo banderas
  booleanas y sets sin conteo, solo se puede expresar "todos" o "al menos uno" (pertenencia), no
  "al menos N" para N arbitrario — a menos que se añada explícitamente una condición de tipo
  "tamaño del set ≥ N", que es la mínima aritmética que probablemente haga falta admitir sin llamarla
  "variable" (ver propuesta final: se recomienda esta única excepción, acotada).
- **Decaimiento con el tiempo** (una marca que expira tras N sesiones): eso ya es un contador temporal
  con estado propio, fuera del alcance de banderas puras.

La recomendación de diseño, desarrollada en la propuesta final, es: mantener banderas y sets como
memoria primaria, pero admitir **una única operación no aritmética sobre sets** — "tamaño del set
compara con un número fijo elegido en el formulario" — sin exponerlo como variable ni permitir sumas,
restas, ni aritmética entre marcas. Es la frontera mínima necesaria para que el propio ejemplo del DM
("hasta que todos los jugadores... o hasta que ciertas cosas pasen") sea expresable sin mentir sobre
las restricciones del proyecto.

---

## 5. Depuración y confianza: cómo se explica "por qué pasó esto"

Esta es la sección donde la investigación encontró más divergencia de calidad entre sistemas.

### Unreal Blueprints: el estándar más completo, y por qué no es transferible tal cual

Blueprints tiene tres mecanismos combinados: **breakpoints** (pausan la partida en un nodo concreto),
**Execution Trace** (una pila de "los últimos nodos ejecutados, el más reciente arriba, que se actualiza
mientras se avanza paso a paso") y **Call Stack** (equivalente a una pila de llamadas de un depurador de
código real) [[Blueprint Debugger, Epic docs](https://dev.epicgames.com/documentation/unreal-engine/blueprint-debugger-in-unreal-engine)].
Es potente pero requiere que el usuario entienda conceptos de depurador (breakpoint, step-over, call
stack) — exactamente lo que el proyecto quiere evitar para un DM que no programa.

### Foundry VTT y Active Effects: transparencia por inspección, no por traza

Foundry no ofrece una traza de ejecución por evento; en su lugar, cada Active Effect queda **listado en
la hoja del personaje**, visible, con su origen (qué objeto o condición lo generó) y su modo de cambio
(sumar, multiplicar, sobrescribir...) siempre a la vista, sin necesidad de "reproducir" nada — la
confianza viene de que el efecto nunca desaparece de la vista una vez aplicado, y se puede deshacer sin
perder el valor base porque "preserva los valores 'base' originales de un documento" [[Foundry VTT,
Active Effects article](https://foundryvtt.com/article/active-effects/)]. Es un patrón de **"lista de
efectos activos con procedencia"**, más cercano a lo que puede hacer un formulario para D&D que un
depurador con pasos.

### Ink y Twine: menos exploradas por herramientas de traza dedicadas, más por el propio modelo

En Ink, el propio lenguaje reduce la necesidad de depurar porque las opciones `once` desaparecen solas
tras usarse — el motor documenta el estado en `state.active` / `state.history`, que registran las
páginas visitadas en orden [ver Twine forum, aunque esto aplica en concreto a Twine/Harlowe: "state.active
contiene los valores actuales, mientras que state.history contiene un array de valores históricos"]. No
se encontró una herramienta de traza visual equivalente a la de Blueprints ni en Ink ni en Twine —
la "depuración" en estas comunidades se hace mayormente probando el árbol de decisión manualmente en el
editor Inky/Twine, lo cual es evidencia de una carencia real, no de una solución elegante.

### Zapier: test por paso, con una limitación honesta y documentada

Zapier permite probar cada paso individualmente antes de activar el Zap ("Test Step") y hacer un
"Test run" de extremo a extremo. Pero la propia documentación de terceros advierte: "el botón Test Step
confirma que un paso individual puede ejecutarse, pero no valida el flujo completo bajo condiciones
reales con variabilidad de datos real" [[How to Test Zapier Workflows](https://www.lowcode.agency/blog/how-to-test-your-zapier-workflows)].
Es el ejemplo más claro encontrado de "modo ensayo en seco parcial": prueba cada pieza, no la interacción
completa entre piezas — una advertencia directa para el diseño de D&D, donde probar una regla aislada no
garantiza que el encadenamiento con otra regla se comporte igual.

### La síntesis aplicable a D&D: traza declarativa, no depurador

Ninguno de los sistemas de "gente que no programa" investigados usa breakpoints con pasos, porque
rompe la metáfora de que esto no es programar. El patrón que sí aparece repetido —Foundry (lista de
efectos con procedencia), Airtable ("historial de ejecuciones" de cada automatización), ECA de bases de
datos activas (tabla de "eventos no emparejados" para depuración explícita
[[ScienceDirect]](https://www.sciencedirect.com/topics/computer-science/event-condition-action-rule))—
es: **un registro de eventos con causa explícita, consultable, sin pasos ni pausa**. Se detalla la
propuesta concreta en la sección final.

---

## 6. Orden y conflictos: qué pasa cuando dos reglas se pisan

Este es probablemente el punto donde más divergen los sistemas maduros, y donde hay más evidencia
verificada.

### Inform 7: especificidad declarada, con desempate por orden de escritura

Confirmado por fuente primaria (documentación oficial de Inform, apartado 19.16 "The Laws for Sorting
Rulebooks"): las reglas se comparan por pares con un conjunto de leyes en orden estricto —

- **Ley I** — cuántos aspectos restringe la regla (lugar, actor, momento, escena...): más restricciones,
  mayor especificidad.
- **Ley II** — una regla con condición `when`/`while` gana a una sin ella.
- **Ley III** — especificidad de la acción misma (objeto concreto gana a categoría general; una
  habitación concreta gana a una región que la contiene).
- **Ley IV** — una regla con restricción de escena (`during`) gana a una sin ella.

Si ninguna ley distingue entre dos reglas, **gana el orden en que aparecen en el texto fuente**
[[Ganelson/Inform, WI 19.16](https://ganelson.github.io/inform-website/book/WI_19_16.html)]. Es
importante matizar, porque la documentación de terceros lo resume distinto: "el problema de precedencia
se resuelve con una mezcla de especificidad lógica (las excepciones tienen prioridad sobre los casos
generales) y orden del código fuente (las reglas posteriores tienen prioridad sobre las anteriores)"
[[E Blong, Rule-Based Programming](https://eblong.com/zarf/rule-language.html)] — ambas fuentes
coinciden en que la especificidad manda primero, y el orden de escritura es el desempate final, nunca
al revés.

Por separado, sobre el orden de ejecución *entre rulebooks* (no entre reglas del mismo rulebook):
Inform recorre en secuencia fija **Before → Instead → Check → Carry out → After → Report**, y cada
rulebook tiene un "resultado por defecto" distinto si ninguna regla decide nada — Before/Check/Carry out
no deciden por defecto, After tiene éxito por defecto, e Instead falla por defecto [confirmado con
fuente The Inform 7 Handbook y documentación oficial].

### Drools (motores de reglas de negocio): salience explícito + LIFO + orden de declaración

Fuente oficial de Drools: cuando varias reglas están listas para dispararse a la vez, forman un
**conflict set** en la *Agenda*, y una **estrategia de resolución de conflictos** decide el orden. La
estrategia por defecto combina **salience** (un número de prioridad que el autor asigna explícitamente
a la regla) y, en empate, **LIFO** (last-in-first-out, basado en el contador de la memoria de trabajo).
Desde Drools 6.0, además, "el orden de definición de la regla en el fichero fuente se usa para fijar la
prioridad después de la salience" [[Drools User Guide, JBoss docs](https://docs.jboss.org/drools/release/6.2.0.CR3/drools-docs/html/ch06.html)].
Es el mismo patrón de fondo que Inform 7 —prioridad declarada explícita, con desempate por orden de
declaración— pero aquí la "especificidad" es reemplazada por un número que el propio autor pone a mano.

### Foundry VTT Active Effects: orden documentado por modo, prioridad sin resolver del todo en fuentes públicas

Confirmado por fuente oficial: los efectos se aplican en un **orden fijo por tipo de operación** —
Custom, Multiply, Add, Upgrade/Downgrade, Override — de modo que, por ejemplo, un `Override` siempre
gana a un `Add` sin importar cuál se creó antes, porque el modo mismo define su posición en la
secuencia de aplicación. La documentación oficial también expone un campo de **priority** configurable
por efecto, pero **no se encontró en las fuentes consultadas (la web oficial ni el wiki de dnd5e) una
explicación explícita de qué pasa cuando dos efectos tienen exactamente la misma prioridad y el mismo
modo** — se declara honestamente aquí como límite de la investigación, no se inventa el comportamiento.

### IFTTT / Zapier / Notion / Airtable / Coda: en su mayoría, orden de creación, sin declarar prioridad

Ninguno de los sistemas de automatización "de consumo" investigados expone un concepto de prioridad
declarada entre automatizaciones distintas — su modelo asume que las automatizaciones son
mayoritariamente independientes (disparadores distintos) y no da soporte de primera clase a "estas dos
automatizaciones podrían dispararse por lo mismo, decide cuál gana". Airtable sí documenta un mecanismo
parcial dentro de una misma automatización: grupos condicionales evaluados en orden, donde "Airtable
revisa el primer grupo condicional configurado — si se cumplen las condiciones de un grupo, se ejecutan
las acciones de ese grupo" (orden de aparición en el editor, similar al patrón "primera regla que
aplica" de una tabla de decisión clásica).

### La lección aplicable, con matices

Hay dos familias de solución real, verificadas:

1. **Especificidad automática** (Inform 7): el sistema calcula solo qué regla es "más concreta" y no
   pide al usuario que numere nada — pero exige que el sistema sepa comparar reglas por número de
   condiciones, lo cual es viable con un vocabulario cerrado como el propuesto para D&D.
2. **Prioridad explícita + desempate por orden** (Drools, y en parte Foundry): el usuario asigna un
   número o el sistema usa "última regla ganadora"/"orden de creación" — más simple de implementar,
   pero exige que el DM entienda que existe un número de prioridad, lo cual es una pizca más de carga
   cognitiva.

La propuesta final de este informe combina ambas: especificidad automática como comportamiento por
defecto (silenciosa, sin pedir nada al DM en el caso normal) y un campo de prioridad explícita opcional
solo visible cuando el sistema detecta que dos reglas pueden solaparse — ver sección de propuesta.

---

## 7. Los errores clásicos: por qué la gente abandona estos sistemas

Con evidencia concreta de cada caso:

### Blueprints: el "espagueti" no es un mito, es una queja documentada por la propia comunidad de desarrollo

Foros de desarrolladores describen literalmente mantener toda la lógica de un juego en Blueprints como
"código espagueti" que "está pagando factura" a medida que el proyecto crece — la recomendación
consistente de la comunidad es "usar Blueprints para prototipar rápido y mover a C++ los sistemas
pesados" [[C++ vs Blueprints, Whole Tomato](https://www.wholetomato.com/blog/c-versus-blueprints-which-should-i-use-for-unreal-engine-game-development/)].
El problema de fondo no es visual per se, es de **escala sin abstracción**: un lienzo de nodos sin
capacidad de encapsular sub-grafos reutilizables (funciones, macros) crece en anchura sin límite. Esto
es una advertencia directa para cuando D&D llegue al lienzo: necesitará una unidad de reutilización
(igual que una "regla" ya es esa unidad en el formulario) antes de dejar crecer grafos libres.

### Godot: VisualScript fue directamente descontinuado, con motivos documentados por los propios desarrolladores

Caso más contundente encontrado: el equipo de Godot anunció en su blog oficial que **discontinuaba**
VisualScript en la versión 4.0. Razones citadas textualmente: "a pesar del esfuerzo continuo,
VisualScript nunca ganó tracción y el camino para mejorarlo nunca estuvo claro"; "Godot carecía de
componentes de alto nivel para aprovechar la funcionalidad base de scripting visual" — a diferencia de
Unreal, GameMaker o Construct, que empaquetan *funciones de alto nivel* junto al scripting visual, no
solo primitivas de bajo nivel; y, sin rodeos, que el enfoque "era en muchos aspectos más difícil que
GDScript, un desastre lleno de bugs, y no daba a la gente lo que quería porque intentaba ser GDScript
con fideos [de conexiones]" [[Godot 4.0 will discontinue VisualScript](https://godotengine.org/article/godot-4-will-discontinue-visual-scripting/)].
**Esta es la advertencia más importante de todo el informe para el proyecto D&D**: un sistema visual
que solo expone primitivas genéricas (variable, si, bucle, llamar función) *envuelto* en cajas, sin
vocabulario propio del dominio, no tiene ninguna ventaja sobre programar y además es más lento de usar.
El vocabulario de D&D tiene que ser de dominio ("revisar detalle", "revelar", "marca de campaña"), no
"asignar variable" con una piel bonita.

### Zapier: el límite de negocio, no de diseño, pero con efecto de abandono real

El plan gratuito limita a 100 tareas/mes y Zaps de solo dos pasos; cada paso de acción que se ejecuta
con éxito cuenta como una tarea, así que "un Zap con cuatro pasos de acción consume cuatro tareas por
ejecución exitosa" — el resultado documentado: "el plan gratuito con límite de 100 tareas y solo dos
pasos lo convierte en una caja de arena, no en una herramienta de producción"
[[Zapier pricing analysis](https://tinycommand.com/blogs/zapier-pricing-explained)]. No es un error de
diseño del lenguaje, es un error de modelo de negocio que empuja al usuario a abandonar justo cuando
empieza a necesitar encadenar más de dos pasos — relevante para D&D porque confirma que **la fricción
que hace abandonar un sistema de automatización no siempre es de comprensión, a veces es de límites
artificiales**; el proyecto D&D no tiene ese problema de negocio, pero debe evitar imponer límites
arbitrarios de número de reglas/condiciones que reproduzcan la misma frustración sin motivo.

### IFTTT: demasiado simple para casos reales, confirmado por quejas de usuario recurrentes

"Los usuarios informan que no pueden encadenar varias sentencias de IFTTT y el software parece limitado
a cierta funcionalidad predeterminada que está permitida"; "adecuado para automatizaciones básicas con
triggers condicionales y acciones, [pero] las capacidades son limitadas, sin profundidad para flujos de
trabajo complejos con condiciones anidadas o procesos multi-paso" [ver sección de búsqueda IFTTT
limitaciones]. La valoración de 3.2/5 en Google Play sobre más de 186.000 reseñas es la señal cuantitativa
más dura encontrada de frustración real y sostenida con un sistema demasiado simple. La lección para
D&D: el "techo" de la sección 3 no es solo teórico, es la razón número uno de abandono cuando el sistema
no ofrece ni siquiera un escape hatch acotado.

### El error transversal, visible en todos los casos anteriores

Los cuatro casos (Blueprints, Godot VisualScript, Zapier free, IFTTT) fallan en direcciones opuestas del
mismo eje: **Blueprints/Godot fallan por exceso de potencia sin abstracción** (todo es posible, nada se
reutiliza, todo se vuelve espagueti); **IFTTT/Zapier free fallan por defecto de potencia o límites
artificiales** (no se puede hacer lo que hace falta, o cuesta demasiado hacerlo). El punto medio que
mejor lo resuelve, según la evidencia reunida, es Inform 7 y el patrón de Foundry Active Effects:
vocabulario de dominio rico pero cerrado, sin bucles/variables libres, con un techo claro y documentado
en vez de un techo silencioso que solo se descubre al chocar contra él.

---

## 8. De formulario a lienzo sin migrar datos

La pregunta de investigación aquí era qué representación intermedia aguanta representarse tanto como
formulario de tres campos como como grafo de nodos. La evidencia reunida (más limitada que en el resto
de secciones, por ser un tema más técnico/interno) apunta a un patrón consistente:

- **Microsoft Power Automate confirma explícitamente, en documentación oficial**, que su editor
  "clásico" (más parecido a un formulario paso a paso) y su editor "moderno" (lienzo de nodos) "trabajan
  sobre la misma definición de flujo subyacente. Cambiar entre ellos no cambia la lógica del flujo ni
  rompe nada — es puramente un cambio de interfaz" [[Classic vs modern designer, Microsoft Learn](https://learn.microsoft.com/en-us/power-automate/classic-vs-modern-designer)].
  Es la prueba directa, de fuente primaria, de que el patrón "un modelo, dos vistas" es viable en
  producción a gran escala.
- La literatura técnica sobre representaciones intermedias en sistemas visuales confirma que **JSON como
  grafo de nodos con aristas explícitas** (`{id, tipo, campos, conecta_a: [...]}`) es el formato que se
  usa tanto para serializar árboles/formularios como para dibujar grafos, porque un grafo es
  estrictamente más general que un árbol o una secuencia de tres campos: "un editor visual de grafos
  puede servir de representación intermedia que se traduce automáticamente a una especificación legible
  por máquina como JSON, preservando tanto la topología estructural del grafo como los atributos
  semánticos de nodos y aristas" [ver búsqueda sobre representación intermedia].

**Aplicado a D&D, en concreto**: una regla ECA de tres campos (Cuando / Si / Entonces) es, en el fondo,
ya un grafo trivial de tres nodos en cadena con un único camino: `suceso → condición → efecto`. Si desde
el primer día el formulario **guarda la regla como una lista ordenada de nodos tipados con
identificador propio** (en vez de, por ejemplo, tres columnas de texto planas en una tabla), el día que
llegue el lienzo no hace falta migrar nada: el lienzo simplemente permite que la condición tenga más de
una rama de entrada, o que el efecto dispare a más de un nodo siguiente — extensiones del mismo modelo
de datos, no un modelo nuevo. La condición de diseño concreta es: **el JSON de una regla debe modelar
"condición" como una lista de comprobaciones combinables (Y/O), no como un campo de texto único**,
incluso cuando el formulario de la v1 solo permite editar una condición simple — para que el lienzo
futuro solo tenga que exponer una UI nueva sobre una estructura de datos que ya existía.

---

## Propuesta de diseño para la plataforma de D&D

Esta sección no resume lo anterior: propone, con las restricciones dadas (sin bucles, sin variables,
sin aritmética; solo marcas de campaña booleanas/set; el efecto nunca decide permisos; hace falta traza),
un vocabulario inicial concreto.

### Vocabulario de sucesos ("Cuando…")

| Suceso | Descripción |
|---|---|
| **Un jugador revisa una entidad** | Se disparó al abrir/consultar una ficha, objeto, ubicación o PNJ concreto desde la interfaz de juego. |
| **Un jugador revisa un detalle** | Como el anterior, pero acotado a una sección/campo concreto dentro de una entidad (p. ej. la descripción larga, no solo el nombre). |
| **Una sesión empieza** | Se abre una sesión de juego dentro de la campaña. |
| **Una sesión termina** | El DM cierra la sesión activa. |
| **Un jugador se une a la sesión** | Un jugador concreto pasa a estar presente en la sesión en curso. |
| **Se marca una marca de campaña** | Otra regla (o el DM manualmente) activó una bandera o añadió un valor a un set — permite encadenar reglas entre sí. |
| **Se desmarca una marca de campaña** | Simétrico al anterior, para reglas que reaccionan a que algo deje de cumplirse. |
| **Se revela una entidad** | Otra regla (o el DM) subió el nivel de visibilidad de algo — el "efecto estrella" también es un suceso disparable, para permitir cadenas de revelaciones. |
| **El DM ejecuta una entidad manualmente** | Vía de escape explícita: el DM fuerza el disparo de una regla sin que haya ocurrido el suceso real, útil para pruebas y para casos no cubiertos por el vocabulario. |

### Vocabulario de condiciones ("Si…")

| Condición | Descripción |
|---|---|
| **La marca [X] está activa** | Comprobación booleana simple sobre una marca de campaña. |
| **La marca [X] NO está activa** | Negación de la anterior — evita tener que declarar marcas "inversas" a mano. |
| **[valor] pertenece al set [X]** | Comprobación de pertenencia en una marca de tipo set (p. ej. "Ana pertenece a `jugadores_presentes`"). |
| **Todos los de [lista] pertenecen al set [X]** | Comprobación "para todo", sin conteo — resuelve el caso "todos los jugadores presentes" sin aritmética. |
| **El tamaño del set [X] es al menos [N]** | Única concesión numérica del vocabulario: compara el tamaño de un set con un número fijo elegido en el formulario, nunca una suma ni una variable. Se expone como caso avanzado, no como aritmética general. |
| **La entidad [X] tiene el nivel de visibilidad [V] o superior/inferior** | Comprobación sobre el propio dato de visibilidad, para condicionar una regla a que algo ya se sepa (o no) antes de actuar. |
| **Estamos en la sesión [X] / hay una sesión activa** | Acota una regla a que solo dispare durante juego, no en preparación. |
| **[jugador] es quien disparó el suceso** | Permite reglas que solo reaccionan a un jugador concreto (p. ej. solo el que lleva el mapa). |

### Vocabulario de efectos ("Entonces…")

Recordatorio de la restricción no negociable: **un efecto escribe datos; nunca decide quién puede
verlos**. El servidor sigue comprobando `canView` de manera independiente en cada lectura, siempre —
el efecto "revelar" solo cambia el campo de visibilidad almacenado, exactamente igual que si el DM lo
hubiera cambiado a mano desde el panel.

| Efecto | Descripción |
|---|---|
| **Revelar entidad a nivel [V]** | Sube el nivel de visibilidad almacenado de una entidad. Nunca concede acceso por sí mismo: solo cambia el dato que `canView` ya evalúa igual que para cualquier otro cambio de visibilidad. |
| **Marcar [bandera]** | Activa una marca de campaña booleana. |
| **Desmarcar [bandera]** | Desactiva una marca de campaña booleana. |
| **Añadir [valor] al set [X]** | Añade un elemento a una marca de tipo set (p. ej. añadir el jugador actual a `jugadores_presentes`). |
| **Quitar [valor] del set [X]** | Simétrico. |
| **Enviar mensaje/notificación al DM** | Efecto puramente informativo, sin tocar datos de juego — el "avísame cuando" que pidió el propio DM. |
| **Enviar mensaje a jugador(es)** | Igual, pero dirigido a jugadores concretos o a todos los presentes. |
| **Anotar en la bitácora de sesión** | Escribe una línea de texto en el registro de la sesión activa, visible para el DM. |
| **Disparar un suceso personalizado con nombre** | Efecto puente explícito para el encadenamiento: emite un "suceso de marca de campaña" con un nombre elegido por el DM, para que otra regla lo escuche por "Se marca la marca de campaña [X]" sin acoplar las dos reglas directamente entre sí. |

### Mecanismo de traza propuesto

No un depurador con pasos (sección 5 mostró que ningún sistema para no-programadores lo usa con éxito).
En su lugar: **una tabla de disparos, por entidad y por regla, con causa explícita**, siguiendo el
patrón de "lista de efectos con procedencia" de Foundry y el de "tabla de eventos no emparejados" de los
sistemas ECA de bases de datos activas. Concretamente:

- Cada vez que una regla se evalúa (se cumpla o no la condición), se escribe **una fila de traza**:
  `{regla, suceso que la disparó, quién/qué lo causó, condición evaluada y resultado, efecto ejecutado o
  no, marca de tiempo}`.
- En la ficha de cualquier entidad revelada, un botón **"¿Por qué se reveló esto?"** consulta esa tabla
  filtrada por esa entidad y muestra la fila más reciente en lenguaje natural, reusando el propio
  vocabulario: *"Se reveló porque Ana revisó el detalle 'inscripción en la piedra' de 'Altar del bosque',
  cumpliendo la regla 'Camino secreto', el 3 de septiembre a las 21:14."*
- Las filas de traza donde la condición **no** se cumplió no se ocultan por defecto: son las que
  responden "¿por qué NO pasó esto todavía?", pregunta tan real como la inversa para un DM que espera
  que algo se dispare y no ve efecto.
- Se guarda como registro append-only, nunca como log de servidor técnico: es un dato de producto,
  consultable desde la propia interfaz de campaña, no algo que requiera acceso a consola o a ficheros.

### Mecanismo de resolución de conflictos/orden propuesto

Siguiendo el patrón combinado descrito al final de la sección 6:

1. **Por defecto, especificidad automática, sin pedir nada al DM** (patrón Inform 7): si dos reglas
   escuchan el mismo suceso, gana la que tiene **más condiciones** (más restrictiva) sobre la que tiene
   menos — igual que "Instead of taking the sword" gana a "Instead of taking something". Si tienen el
   mismo número de condiciones, gana la regla creada más recientemente (orden de declaración, como en
   Inform 7 y Drools).
2. **El sistema avisa, en el propio formulario, cuando detecta solape**: al guardar una regla nueva
   cuyo suceso coincide con el de otra ya existente sobre la misma entidad, se muestra una advertencia
   no bloqueante: *"Esta regla comparte suceso con 'Camino secreto'. Se ejecutará después, por tener
   menos condiciones."* — visibilidad del orden sin exigir que el DM declare un número.
3. **Prioridad manual, solo como escape hatch**, oculta por defecto: un campo opcional "orden manual"
   que solo aparece si el DM pulsa "ajustar prioridad" desde el aviso de solape del punto 2 — nunca
   un campo obligatorio en el formulario estándar, para no imponer a todos los DMs una decisión que la
   mayoría de las veces la especificidad automática ya resuelve bien.
4. **Ambos efectos se ejecutan si no son contradictorios**: la regla de conflicto solo decide *orden*,
   no exclusión — si dos reglas activan marcas de campaña distintas sin pisarse, ambas se ejecutan; el
   orden solo importa cuando escriben el mismo dato.

---

## Tres ejemplos completos de reglas

### Ejemplo 1 — El del propio autor: revisar un detalle desvela un camino secreto

> **Cuando** un jugador revisa el detalle "inscripción en la piedra" de la entidad "Altar del bosque"
> **Si** la marca de campaña `camino_secreto_revelado` NO está activa
> **Entonces**
> — Revelar la entidad "Camino secreto" a nivel "Visible para jugadores"
> — Marcar la marca de campaña `camino_secreto_revelado`
> — Anotar en la bitácora de sesión: "Se descubrió el camino secreto del bosque."

La condición sobre la marca evita que la regla se dispare repetidamente si el jugador vuelve a leer el
mismo detalle en sesiones futuras — un patrón directamente equivalente al `once` de Ink, implementado
con una bandera con nombre en vez de con un mecanismo de lenguaje implícito.

### Ejemplo 2 — Bloqueo hasta que todos los jugadores estén presentes y hayan hecho algo

Aquí sí hace falta algo más que una única bandera booleana simple — se declara honestamente, tal como
pedía la consigna — pero se resuelve enteramente con el vocabulario de marcas de tipo set del punto 3
de la propuesta, sin ninguna variable numérica ni contador visible al DM:

> **Regla A — registrar presencia**
> **Cuando** un jugador se une a la sesión
> **Si** — (sin condición)
> **Entonces** Añadir [jugador actual] al set `presentes_hoy`

> **Regla B — registrar que el jugador hizo algo concreto (p. ej. examinó el mapa de la mazmorra)**
> **Cuando** un jugador revisa la entidad "Mapa de la mazmorra"
> **Si** — (sin condición)
> **Entonces** Añadir [jugador actual] al set `revisaron_mapa`

> **Regla C — desbloqueo**
> **Cuando** se marca la marca de campaña `revisaron_mapa` *(dispara cada vez que Regla B añade a alguien)*
> **Si** todos los de "jugadores de la campaña" pertenecen al set `presentes_hoy`
>    **Y** todos los de "jugadores de la campaña" pertenecen al set `revisaron_mapa`
> **Entonces**
> — Revelar la entidad "Puerta sellada de la mazmorra" a nivel "Visible para jugadores"
> — Enviar mensaje al DM: "Todos los jugadores han revisado el mapa: la puerta sellada queda accesible."

Esto usa exclusivamente comprobaciones de pertenencia a set ("todos los de la lista pertenecen al set"),
no conteo aritmético — cumple la restricción declarada. Si el DM necesitara en el futuro un umbral
parcial ("con que 3 de 5 basta"), ahí sí haría falta la única concesión numérica propuesta en la sección
de condiciones ("el tamaño del set es al menos N"), documentada explícitamente como el límite del
sistema sin variables.

### Ejemplo 3 — Encadenamiento de reglas usando una marca de campaña como memoria compartida

Muestra el patrón de "disparar un suceso personalizado" (sección de efectos) para que dos reglas
independientes se coordinen sin conocerse directamente entre sí — el equivalente D&D del
`broadcast`/`when I receive` de Scratch:

> **Regla A — el guardia sospecha**
> **Cuando** un jugador revisa el detalle "carta a medio quemar" de la entidad "Escritorio del posadero"
> **Si** — (sin condición)
> **Entonces**
> — Marcar la marca de campaña `guardia_sospecha_del_grupo`
> — Disparar el suceso personalizado `alerta_posada`

> **Regla B — el posadero cierra el sótano (escucha la misma marca, sin conocer la Regla A)**
> **Cuando** se marca la marca de campaña `guardia_sospecha_del_grupo`
> **Si** la entidad "Sótano de la posada" tiene el nivel de visibilidad "Visible para jugadores" o superior
> **Entonces**
> — Revelar la entidad "Puerta del sótano trabada" a nivel "Visible para jugadores"
> — Anotar en la bitácora de sesión: "El posadero, nervioso, traba la puerta del sótano."

> **Regla C — el posadero avisa a un PNJ aliado (escucha el suceso personalizado, no la marca directamente)**
> **Cuando** ocurre el suceso personalizado `alerta_posada`
> **Si** la marca de campaña `pnj_capitan_guardia_activo` está activa
> **Entonces** Enviar mensaje al DM: "El capitán de la guardia podría enterarse de la sospecha del posadero — considera introducirlo esta sesión."

Las reglas B y C reaccionan a lo que produce la regla A sin que A declare a quién afecta — es
exactamente el patrón de composición identificado en la sección 2 como el que de verdad escala sin
convertirse en control de flujo explícito que el DM tenga que trazar mentalmente.

---

## Fuentes citadas

- [TurboWarp docs — Events and hats](https://docs.turbowarp.org/development/extensions/hats)
- [Scratch Wiki — Broadcast](https://en.scratch-wiki.info/wiki/Broadcast)
- [Polymorphic Blocks: Formalism-Inspired UI for Structured Connectors (CHI 2015)](https://cseweb.ucsd.edu/~lerner/papers/polymorphic-blocks-chi15.pdf)
- [Google — What is Blockly?](https://developers.google.com/blockly/guides/get-started/what-is-blockly)
- [Twine Forum — Struggling With Twine: The "state" variable](http://strugglingwithtwine.blogspot.com/2014/03/the-state-variable.html)
- [inkle — Writing With Ink (GitHub)](https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md)
- [Inform 7 — 19.16 The Laws for Sorting Rulebooks](https://ganelson.github.io/inform-website/book/WI_19_16.html)
- [The Inform 7 Handbook — Rulebooks & "Stop the Action"](https://inform-7-handbook.readthedocs.io/en/latest/chapter_4_actions/rulebooks_&_stop_the_action/)
- [E. Blong — Rule-Based Programming (análisis de Inform 7)](https://eblong.com/zarf/rule-language.html)
- [Epic Games — Blueprint Debugger in Unreal Engine](https://dev.epicgames.com/documentation/unreal-engine/blueprint-debugger-in-unreal-engine)
- [Whole Tomato — C++ vs Blueprints in Unreal Engine](https://www.wholetomato.com/blog/c-versus-blueprints-which-should-i-use-for-unreal-engine-game-development/)
- [Godot Engine — Godot 4.0 will discontinue VisualScript](https://godotengine.org/article/godot-4-will-discontinue-visual-scripting/)
- [Zapier vs IFTTT (lowcode.agency)](https://www.lowcode.agency/blog/zapier-vs-ifttt)
- [Zapier pricing explained (tinycommand.com)](https://tinycommand.com/blogs/zapier-pricing-explained)
- [How to Test Zapier Workflows Before Going Live](https://www.lowcode.agency/blog/how-to-test-your-zapier-workflows)
- [Foundry VTT — Active Effects (artículo oficial)](https://foundryvtt.com/article/active-effects/)
- [foundryvtt/dnd5e — Active Effect Guide (GitHub Wiki)](https://github.com/foundryvtt/dnd5e/wiki/Active-Effect-Guide)
- [dnd5e Active Effects Examples (HackMD)](https://hackmd.io/@foundryvtt-dnd5e/active-effects)
- [ironmonk108/monks-active-tiles — Monk's Active Tile Triggers](https://github.com/ironmonk108/monks-active-tiles)
- [League-of-Foundry-Developers/fvtt-module-trigger-happy](https://github.com/League-of-Foundry-Developers/fvtt-module-trigger-happy)
- [Roll20 Wiki — Script:ScriptCards](https://wiki.roll20.net/Script:ScriptCards)
- [Roll20 Wiki — API:Script Index](https://wiki.roll20.net/API:Script_Index)
- [Notion — Database automations](https://www.notion.com/help/database-automations)
- [Airtable — Conditional Groups of Automation Actions](https://support.airtable.com/docs/conditional-groups-of-automation-actions)
- [Airtable Community — conditional actions inside loops / nested loops](https://community.airtable.com/automations-8/can-airtable-automations-do-conditional-actions-inside-loops-and-support-nested-loops-46049)
- [Coda — Perform multiple actions with a single button](https://help.coda.io/hc/en-us/articles/39555746564365-Perform-multiple-actions-with-a-single-button)
- [Drools 6.2 User Guide (JBoss docs) — Conflict Resolution](https://docs.jboss.org/drools/release/6.2.0.CR3/drools-docs/html/ch06.html)
- [ScienceDirect — Event-Condition-Action Rule (overview)](https://www.sciencedirect.com/topics/computer-science/event-condition-action-rule)
- [Microsoft Learn — Classic designer vs modern designer for cloud flows](https://learn.microsoft.com/en-us/power-automate/classic-vs-modern-designer)
