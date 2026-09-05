# Investigación para las decisiones abiertas — 2026-09-05

> Encargo del autor: **investigar en las reglas y en internet** las secciones «funciones de la
> maqueta», «faltan datos en el modelo» y «las sueltas», y documentarlo a fondo.
>
> **Método.** Cada punto lleva tres cosas separadas y etiquetadas: **qué dicen las reglas** (con
> cita y enlace, y **manda el SRD en inglés**), **qué hace hoy nuestro código** (con
> `fichero:línea`, comprobado, no recordado) y **la recomendación**, que es mía y se puede tirar.
> Cuando una cosa no está en el SRD 5.1 se dice, porque es lo que decide si podemos copiarla.

---

# PARTE 0 · Lo que ya has decidido hoy, anotado

## D1 · El hilo va como una conversación — **DECIDIDO**

Lo último abajo, en línea, como un chat. Se invierte el orden actual.

**Consecuencia única que hay que resolver al hacerlo**, y no es una objeción: la franja **«desde
aquí te perdiste N sucesos»** hoy se apoya en que lo nuevo está arriba. Al invertir, la franja pasa
a marcar el punto por **debajo** del cual está lo no leído, y el scroll debe **anclarse abajo** y no
saltar si estás leyendo hacia arriba. Su marca sigue **congelada al montar**
(`features/sessions/reincorporarse.ts`) — si se releyera en cada sondeo desaparecería a los quince
segundos, justo cuando alguien vuelve a la mesa.

## D3 · El color de cada personaje — **DECIDIDO, con la elección que me delegaste**

**Lo elige el jugador, con un valor por defecto ya puesto.** El por defecto sale del identificador
del personaje (determinista: el mismo personaje, el mismo color, siempre), y **se puede cambiar**
desde la hoja; el DM puede cambiar el de cualquiera de su mesa.

**Por qué no aleatorio puro:** aleatorio significa que dos personajes pueden salir iguales y nadie
puede arreglarlo, que es exactamente la queja que origina la ficha («los dos salimos en cobre»).
Con elección, el choque tiene solución en un clic.

**Es un campo del modelo** (`Character.color`), no un cálculo: hoy no existe —lo comprobé— y por eso
el hilo tiñe por huella del `actorUserId` sobre cuatro tonos. **Un mismo campo sirve para las dos
cosas**: el color de la voz en el hilo y el del retrato en el elenco, que son el mismo problema.

---

# PARTE 1 · Las dos que pediste que te explicara

## E2 · «La contradicción del cobre»

**Qué es el cobre aquí.** La identidad «Sala de guerra» reparte **tres acentos con tres oficios**, y
está escrito como norma en `docs/04-convenciones.md:196-199`:

```
--accent   (azul señal)  significa  ESTO SE PUEDE PULSAR
--copper   (cobre)       significa  ESTO PERTENECE AL MUNDO   (filetes, capitulares,
                                    marcas de tipo, la cuadrícula cartográfica)
--warning  (ámbar)       avisa
```

Y la frase literal de la norma: **«Un cobre nunca es un botón.»** El motivo escrito es que tres
tonos hacen tres trabajos distintos, para que ninguno se distinga de otro **solo por dónde está
colocado**.

**Dónde choca.** La maqueta pinta el **chip de filtro activo en cobre** (`border-copper
bg-copper/15 text-copper-text`) — y un chip de filtro es literalmente un `<button>`. O sea: la
maqueta usa el color de «esto es del mundo» para «esto se pulsa».

**Por qué es una decisión y no un descuido.** Dos carriles distintos chocaron con esto **por
separado**, sin hablar entre ellos, y **los dos siguieron la norma en contra de la maqueta**: la
capa visual dejó el chip activo en azul, y el taller usó radios con explicación en vez de las fichas
de cobre. Los dos lo declararon en vez de decidirlo a escondidas.

**Lo que hay que decidir, en una frase:** o **manda el documento** y la maqueta se corrige (el chip
activo va en azul), o **manda la maqueta** y la norma se reescribe para admitir que el cobre también
selecciona. Lo que no puede quedarse es que los dos documentos del proyecto se contradigan, porque
el siguiente que llegue seguirá uno de los dos al azar.

**Mi recomendación: manda el documento.** El cobre está usado en toda la aplicación para el mundo
—capitulares, filetes, marcas de tipo—, y si además selecciona, deja de significar nada. Corregir la
maqueta es cambiar un color en un componente; cambiar la norma es repintar el criterio de toda la
interfaz.

## E4 · «El tablero telaraña» — qué parte es

Es **el corcho del taller del DM**: el panel de la izquierda cuando la mesa está en reposo. Lo viste
en la primera captura, con el cartel «El corcho está vacío».

**Qué hace.** Cada ficha del mundo es una **chincheta** clavada en el corcho, y entre dos chinchetas
enlazadas se dibuja un **hilo** — de ahí «telaraña». Pulsar una chincheta trae esa ficha a la solapa
de al lado. Es el mundo visto como relaciones, no como lista.

**Cuál es el problema, y está medido.** El modelo **no guarda posiciones**: `Entity` no tiene `x` ni
`y`. Así que la posición se calcula como **función pura del identificador y del tipo** — reparto
radial: siete sectores, uno por tipo, y dentro de cada sector un ángulo y uno de tres anillos según
la huella del `id`. Lo bueno de eso es que **una ficha cae siempre en el mismo sitio**: entre
recargas, entre sesiones y entre personas. El DM que aprende dónde está «El Puerto Viejo» lo sigue
teniendo ahí con diez fichas más.

**Y lo malo, ejecutado y no estimado** — porcentaje de chinchetas tapadas por otra, sobre 400 mundos
sintéticos por casilla:

```
 tablero      6 fichas   10    14    18    24    30
 600x420        34%      51%   63%   73%   82%   89%
 900x560        22%      35%   44%   54%   65%   73%
1000x700        18%      29%   38%   46%   56%   64%
```

Por eso hoy la chincheta es de una sola línea y **solo se clavan las 18 más recientes**; el resto
queda fuera del corcho y se dice en pantalla.

**Las dos salidas, y son incompatibles entre sí:**

1. **Posiciones estables guardadas** (`x`,`y` en `Entity`, colocadas por el DM arrastrando). Cada
   ficha donde el DM la puso, para siempre. Cuesta: campo nuevo, migración, y un gesto de arrastrar
   que hoy no existe.
2. **Colocación por conjunto**: el reparto se recalcula con todas las fichas presentes para que no
   se solapen. Nunca hay solape. Cuesta: **las fichas se mueven cuando creas otra**, así que la
   memoria del sitio se pierde — justo lo que la versión actual protege.

**Mi recomendación: la 1**, y con una vuelta que las reconcilia — el reparto de hoy se conserva como
**posición inicial sugerida**, y el DM la mueve si quiere. Quien no toque nada tiene lo de ahora;
quien coloque, manda. Pero es tu decisión: es la forma de un panel.

---

# PARTE 2 · Funciones de la maqueta — investigadas en las reglas

## I5 · ¿Un botón «Curar» junto a «Daño» en el elenco del DM?

**Qué dicen las reglas.** El SRD trata curar y dañar como **dos operaciones distintas con reglas
distintas**, no como un número con signo:

> *«When a creature receives healing of any kind, hit points regained are added to its current hit
> points. A creature's hit points can't exceed its hit point maximum, so any hit points regained in
> excess of this number are lost.»* — SRD, Damage and Healing.

Y los **puntos de golpe temporales** no se comportan como los normales:

> *«Healing can't restore temporary hit points, and they can't be added together. If you have
> temporary hit points and receive more of them, you decide whether to keep the ones you have or to
> gain the new ones.»*

**Y la convención de mesa**, que es lo que más pesa aquí: **cada jugador lleva sus propios puntos de
golpe; el DM lleva los de los monstruos.** No es una regla escrita del SRD, es cómo se juega.

**Qué hace hoy nuestro código.** El elenco del DM tiene «Daño» y «Condición»; **curar es ojo →
hoja**. La hoja sí tiene el control completo, con `useChangeHp` (relativo) y `useSetHp` (absoluto
con `expectedVersion`).

**Recomendación: sí, pero no como «Curar» simétrico de «Daño».** El DM necesita corregir en la mesa
—se equivocó, el clérigo curó, la poción— y mandarlo a la hoja por cada `+5` rompe el ritmo. Ahora
bien: **daño y curación no son el mismo gesto**, porque el daño tiene tipo, traza, resistencias y
salvación de concentración, y la curación tiene tope en el máximo y no toca los temporales. Lo
honesto es un control de **«Ajustar PG»** con dos botones claros (curar / dañar) donde el de dañar
abre lo que ya existe.

## I6 · ¿El jugador conserva sus ±5 sobre su propio personaje?

**Reglas y convención:** los puntos de golpe del personaje **los lleva su jugador**. Un sistema en
el que solo el DM puede tocarlos invierte la mesa: cada golpe encajado sería una petición al DM.

**Hoy los conserva** (`elenco/FichaDeElenco.tsx`, variante «tu personaje»).

**Recomendación: se quedan, sin discusión.** La maqueta no los pinta porque la maqueta es una
maqueta sin datos. Quitarlos por parecerse a ella sería copiar el dibujo y perder el juego.

## I7 · ¿«Mirar en detalle» sobre la ficha de un compañero?

**Qué dicen las reglas.** Nada: no hay regla sobre quién puede leer la hoja de otro. Es convención
de mesa, y en una mesa física **las hojas están a la vista y se preguntan**.

**Qué dice nuestro proyecto**, y esto sí es normativo: el reseño de la mesa decide que **sobre el
retrato de otro no van mandos** — sus fichas son **información, no controles**. La asimetría es
deliberada.

**Y qué dice el servidor**, que es lo que manda: lo que un jugador puede ver de otro personaje ya lo
decide `canView`. Abrir la hoja de un compañero **no es un permiso nuevo**: o el servidor ya la
deja ver, o no la dejará por mucho botón que haya.

**Recomendación: sí, y no rompe la regla.** «Mirar en detalle» es **leer**, no mandar. La regla
prohíbe *controles* sobre el personaje de otro —dañar, curar, poner condiciones—, no prohíbe mirar.
Lo que hay que hacer es **escribir la excepción en `docs/04-convenciones.md`** con esas palabras,
para que el siguiente no la lea como una violación. Y el detalle abre **lo que el servidor mande**,
que para un compañero será menos que para su dueño.

## I8 · Los tres botones de intervención — **aquí la maqueta se equivoca en las reglas**

Los tres son «Ventaja por flanqueo +3», «Ayuda de Mira +1d4» y «Usar inspiración». Investigados uno
a uno:

**Flanqueo.** Es una **regla opcional del DMG**, no del SRD, y **no da un número: da ventaja**.

> *«When a creature and at least one of its allies are adjacent to an enemy and on opposite sides
> or corners of the enemy's space, they flank that enemy, and each of them has advantage on melee
> attack rolls against that enemy.»*

El «+3» de la maqueta viene de otra edición: en 3.ª y en Pathfinder el flanqueo daba **+2 al
ataque**. En 5.ª no existe ese bono. (Y el valor de la ventaja **equivale** a entre +3 y +5 según la
CA, que es probablemente de donde salió el número — pero es una equivalencia estadística, no una
regla.)

**Ayuda.** La acción **Ayudar** existe y es del SRD, pero **tampoco da +1d4: da ventaja**, y con
condiciones exactas:

> *«You can lend your aid to another creature in the completion of a task… the creature gains
> advantage on the next ability check it makes… Alternatively, you can aid a friendly creature in
> attacking a creature within 5 feet of you… the first attack roll is made with advantage.»*

El enemigo tiene que estar **a 5 pies de quien ayuda**, el beneficio es **una sola tirada**, y
**caduca al principio de tu siguiente turno**. El «+1d4» es de otra cosa: **`Bless`** (conjuro, +1d4
a tiradas de ataque y salvaciones) o **Inspiración Bárdica** (rasgo de bardo, un d6 que sube con el
nivel).

**Inspiración.** Esta sí es del SRD y sí es un botón legítimo:

> *«If you have inspiration, you can expend it when you make an attack roll, saving throw, or
> ability check. Spending your inspiration gives you advantage on that roll.»*

Es **binaria** —la tienes o no, no se acumula—, la **concede el DM** por interpretar bien, y se
puede **regalar a otro jugador**.

**Qué hace hoy nuestro código.** Ninguno de los tres existe, y **no hay nada en el servidor detrás
de ninguno**. Sí existe la tubería correcta para dos de ellos: **la sugerencia de ventaja/desventaja
de 2.5.5**, que *propone* y no impone.

**Recomendación:**
- **Inspiración: constrúyela.** Es SRD, es binaria (un booleano en `Character`), la concede el DM y
  se gasta para ventaja. Encaja en la tubería de sugerencias que ya existe.
- **Ayudar: constrúyela como acción**, no como bono. Da ventaja a la siguiente tirada de un aliado y
  **caduca al principio del turno de quien ayudó** — eso es una condición con vencimiento, y el
  sistema de condiciones con caducidad **ya existe desde 2C.4**.
- **Flanqueo: no lo pongas todavía**, y si lo pones, **como interruptor de campaña** («esta mesa usa
  flanqueo») y dando **ventaja, no +3**. Es opcional, y además requiere saber quién está adyacente a
  quién — o sea, **el tablero**, que reservas tú.

**Y en cualquier caso: los rótulos de la maqueta no se copian.** «+3» y «+1d4» son incorrectos, y la
regla del proyecto es explícita: si el texto y el servidor discrepan, miente el texto.

## I9 · ¿«Daño» admite signo?

**Reglas:** curar y dañar no son la misma operación (ver I5). Un «−5» escrito como daño negativo
saltaría la resistencia, la traza y la salvación de concentración; un «+5» escrito como curación
tiene que respetar el máximo y no tocar los temporales.

**Recomendación: no.** Que el campo no admita signo, y que **haya dos gestos** con nombres claros.
Un signo delante de un número es la clase de cosa que en una mesa a las dos de la mañana mata a un
personaje por un teclazo.

---

# PARTE 3 · Faltan datos en el modelo — investigado

## I10 · «Enemigos» y «lo que está haciendo»

**Qué dicen las reglas.** El SRD **no tiene «bandos»**: no hay campo de facción. Lo que sí tiene es
**iniciativa y turnos**, y ahí sí hay dos lados de hecho — el DM lleva a los monstruos, los
jugadores a los suyos. La actitud (hostil / indiferente / amistosa) aparece en el juego social, no
como propiedad fija de una criatura.

**Qué hay hoy.** Un PNJ **es una fila de `Character`** (decisión de 2D) y **no tiene bando**. Y «lo
que está haciendo» tendría que salir del hilo, que es prosa.

**Recomendación:** no inventes un campo `faction` en `Character`. **El bando ya existe donde tiene
sentido: en el encuentro.** Un combatiente de un encuentro es de un lado o del otro, y ahí sí es un
dato con vida corta y significado claro. Fuera de combate, «enemigo» no significa nada estable —el
mercader de hoy es el enemigo de mañana—. Y **«lo que está haciendo» déjalo morir**: en la maqueta
es texto decorativo; aquí sería o una invención o una lectura del hilo que se equivocará.

## I11 · «La escena abre en» un lugar del mundo

**Reglas:** nada. Es organización de la partida, no regla.

**Hoy:** `Session` **no tiene campo de escena inicial**. El taller pinta la siguiente sesión
planificada y sus notas.

**Recomendación: sí, y es barato** — un `Session.openingEntityId` opcional apuntando a una ficha del
mundo, con su `canView` de siempre para que no revele un lugar `DM_ONLY` a los jugadores. Valor
real: al empezar la sesión, la mesa **abre sabiendo dónde está**, que es justo lo que la cabecera de
escena promete hoy sin datos.

## I12 · Catálogo de condiciones de la casa

**Qué dicen las reglas.** El SRD trae **quince condiciones**, y es una **lista cerrada**: cegado,
encantado, ensordecido, asustado, apresado, incapacitado, invisible, paralizado, petrificado,
envenenado, derribado, restringido, aturdido, inconsciente y **agotamiento** (que es de seis
niveles).

**Hoy:** el vocabulario es cerrado y hay **una sola clave libre** que la aplicación sabe traducir:
«Concentración en un conjuro». Cualquier otra saldría como «Sin traducir: X», que **viola la regla
de enumeraciones** del proyecto.

**Recomendación: sí, pero como catálogo de campaña, no como texto libre.** El DM define sus
condiciones de la casa —nombre, descripción, y si sugiere ventaja o desventaja— y a partir de ahí
son un valor más del desplegable **con su nombre traducido, porque lo escribió él**. Es el mismo
patrón que ya usan **las tablas de la casa** (2C.6), incluido su interruptor por campaña: hay
precedente en el código y no hay que inventar la forma.

**Lo que no debe pasar:** que una condición de la casa **entre en el motor de reglas como si fuera
del SRD**. Decoración y ficción, sí; efectos automáticos, no — salvo la sugerencia de
ventaja/desventaja, que **propone y no impone**.

---

# PARTE 4 · Las sueltas — investigadas

## I13 · B6 · ¿Las seis características al crear? — **con un hallazgo que cambia la pregunta**

**El hallazgo, verificado en la fuente:** el **SRD 5.1 NO trae ningún método para generar
características**. Su página de características define qué son y cómo salen los modificadores, y
**no menciona ni el array estándar, ni la compra por puntos, ni 4d6**. Todo eso vive en el Manual
del Jugador, que **no es contenido abierto**.

Los tres métodos que existen en el juego publicado son:

| Método | Qué es | Dónde vive |
|---|---|---|
| **Array estándar** | 15, 14, 13, 12, 10, 8 repartidos a gusto | PHB (no SRD 5.1) |
| **Compra por puntos** | 27 puntos; un 14 cuesta 7 | PHB (no SRD 5.1) |
| **Tirada** | 4d6, se descarta el menor, seis veces | PHB (no SRD 5.1) |

**Qué significa para nosotros.** Los **números** del array son de otra gente. La **mecánica de tirar
4d6 y descartar el menor** es una operación aritmética, no un texto: eso se puede implementar sin
copiar nada. Y **teclear los seis números a mano no depende de ningún método** — es lo que hace hoy
la hoja, y es lo más seguro legalmente.

**Recomendación: las tres, en este orden de prioridad, y ninguna copia texto ajeno.**
1. **Teclearlos** sigue siendo el camino por defecto y no se toca.
2. **Tirar 4d6 y descartar el menor** al crear, **con el servidor tirando los dados** (la regla del
   proyecto: el servidor decide el número, el dado solo lo representa).
3. **Un reparto fijo configurable por campaña**, con los seis valores **que ponga el DM** y vacío por
   defecto. Si tu mesa usa 15/14/13/12/10/8, los escribes tú una vez; el software no los trae
   puestos.

Con eso el creador puede ofrecer las características al crear **sin depender de contenido que no
podemos incluir**.

## I14 · `recapVisibility` — aplicarla o retirarla

**Qué hay, verificado hoy:** el esquema la acepta (`session.schema.ts:76`), la web la manda
(`sessions/hooks.ts:81` con `?? "PLAYERS"`) y `sessions.service.ts:186` **usa
`closed.visibility`** — o sea, la crónica hereda la visibilidad de la sesión y **elegir quién la ve
no hace absolutamente nada**.

**Recomendación: aplicarla.** Hay un caso real y frecuente: la sesión es `PLAYERS` pero **el DM
quiere escribir el resumen con lo que aún no deben saber**, o al revés, una sesión reservada cuya
crónica sí se comparte. Retirarla es más barato, pero deja el producto peor: la pantalla ya ofrece
la elección porque tiene sentido ofrecerla.

**Cuidado técnico:** la crónica vive **dentro de `notes` (Json)**, no en una columna `recap`. Si la
crónica pasa a tener visibilidad propia, hay que decidir si sube a columna — y probablemente sí,
porque **filtrar por un campo dentro de un Json es exactamente lo que este proyecto ya decidió no
hacer** cuando promovió `damageType` y `attackRollEventId`.

## I15 · Dirección de la paleta de `--warning`

**Comprobado en el código, y esta ficha está medio cerrada:** `tokens.css:53` ya tiene `--warning` y
`--warning-text` en los cuatro temas, con contrastes medidos. Y `:96` deja escrito por qué **no hay
`--success`**: «un segundo verde serían dos verdes que aprender».

**Recomendación: darla por cerrada y escribirla en `docs/`.** Lo que queda no es una decisión de
paleta, es documentación pendiente.

## I16 · `type: tipo` convierte un PNJ en Documento sin confirmación

**Reglas:** ninguna. Es seguridad de datos.

**Qué pasa hoy:** cambiar el tipo en el editor de una ficha la reclasifica sin preguntar. Un PNJ con
statblock, enlaces y comentarios puede volverse «Documento» de un clic.

**Recomendación: confirmación con consecuencia dicha**, no un «¿Seguro?». La frase tiene que decir
**qué se pierde o se descoloca**: dónde deja de aparecer, qué filtros dejan de encontrarla, y si su
statblock deja de tener sentido. Y **si el cambio no puede deshacerse solo, decirlo**.

## I17 · Dónde vive cada gesto (archivar, revelar, concentración)

**Estado real medido hoy:** de los tres, **dos ya están hechos** —concentración tiene su pantalla
desde `e8a75e5`, y revelar tiene botón propio (de hecho **tres**, y hay que decidir cuál manda)—.
**Queda archivar (M9)**, que no existe en la web.

**Recomendación:** archivar va **en la ficha del personaje, junto a borrar, y siendo el gesto
fácil** — borrar es el peligroso y debe costar más. Y de los tres sitios que revelan, **manda el del
mundo** (`features/entities/BotonRevelar.tsx`): revelar es un acto sobre la ficha, y las
herramientas del DM y el taller deben **llamar a ese**, no tener su copia.

## I18 · Las doce desviaciones menores ya declaradas

No necesitan investigación de reglas: son de interfaz, están argumentadas y **ninguna miente al
jugador**. Mi recomendación es **aceptarlas en bloque** y anotarlas, con dos matices:

- **`C3-1` («a ciegas» con tres radios en vez de una casilla) es correcta y hay que quedársela**: el
  esquema tiene **tres** valores y una casilla mata «privada».
- **`C4-4` (no se mandan `tags` al editar) hay que verificarla antes de aceptarla**: si el `PATCH`
  **reemplaza** en vez de fusionar, omitirlas las borra. Es una comprobación de diez minutos y no la
  ha hecho nadie.

## I19 · `DM_EXECUTED` — «la batuta»

**Qué es:** el DM lee el diálogo en voz alta, **pulsa**, y pasa lo que tenía que pasar. En el
vocabulario del motor apunta a una ficha del mundo.

**Reglas:** ninguna. Es una herramienta de dirección, no una regla de D&D.

**Hoy:** el disparador existe en el vocabulario, **no existe el gesto en ninguna pantalla**, y por
eso lo dejé retirado y declarado.

**Recomendación: hazlo, y es pequeño.** Un botón **«Ejecutar»** en la ficha del mundo, para el DM,
que escribe el suceso. Con eso, una regla armada sobre «cuando el DM ejecute esta ficha» se
convierte en **el guion de la escena**: el DM prepara en frío lo que pasa al abrir el cofre, y en la
mesa solo pulsa. Es la pieza que hace útil todo el motor de reglas para preparar sesiones.

## I20 · `ENTITY_ATTACKED` — qué significa atacar

**Qué dicen las reglas.** Se ataca a **criaturas**, y una criatura tiene estadísticas. Un lugar o un
documento no se atacan; los objetos tienen CA y PG en el DMG, pero eso ya no es el SRD y es otra
liga.

**Hoy:** el disparador apunta a una **ficha del mundo** (`Entity`), y en esta aplicación se ataca a
un **personaje** (`Character`) — un PNJ es una fila de `Character` desde 2D.

**Recomendación: cámbiale el objetivo, no lo construyas como está.** Lo que la mesa quiere de
verdad es *«cuando ataquen a este PNJ, dispara esto»*, y ese PNJ es un `Character`. O sea: el
disparador debería apuntar a un personaje, y entonces el suceso ya existe —**`ATTACK_RESOLVED` se
escribe desde 2.5.3**— y no hace falta ninguno nuevo. **Retirar `ENTITY_ATTACKED` del vocabulario y
usar el ataque que ya se registra** es más honesto que fabricar un suceso para un objetivo que no se
puede atacar.

## I21 · La barra de acciones — y **la economía de turno, que es lo que falta de verdad**

**Qué dicen las reglas.** El turno de 5.ª edición es exactamente esto, y es una lista cerrada:

> *«On your turn, you can move a distance up to your speed and take one action.»*
> *«You can take only one bonus action on your turn.»*
> *«When you take a reaction, you can't take another one until the start of your next turn.»*
> *«You can also interact with one object or feature of the environment for free.»*

Y las **acciones en combate** del SRD son diez: **Atacar, Lanzar un conjuro, Correr (Dash),
Desengancharse (Disengage), Esquivar (Dodge), Ayudar (Help), Esconderse (Hide), Preparar (Ready),
Buscar (Search) y Usar un objeto**.

**Qué tenemos, verificado ruta por ruta:**

```
Ataques      GET sheet · POST sheet/attacks/:key/roll · /resolve      ✅ existe
Objetos      GET inventory · POST inventory/:rowId/consume            ✅ existe
Recursos     GET resources · POST resources/:key/spend · /restore     ✅ existe
Espacios     resources.service.ts:220 los genera como spell-slot-<n>  ✅ existe
Conjuros por nombre                                                   ❌ no hay módulo
Las diez acciones y la economía de turno                              ❌ no hay vocabulario
```

**Recomendación, en tres piezas y en este orden:**

1. **La barra con lo que ya existe** (ataques, objetos, recursos, espacios). Se construye hoy, sin
   tocar el servidor, y ya es la mitad útil.
2. **La economía de turno** —acción, acción adicional, reacción, movimiento, interacción gratuita— y
   **las diez acciones** como vocabulario cerrado. **Sin esto, una barra de acciones es una fila de
   botones que no impide nada**, y la mitad de su valor en la mesa es justamente recordar que ya
   gastaste tu acción adicional. Es del SRD, es una lista cerrada y encaja con la iniciativa y los
   turnos que ya existen desde 2.5.2.
3. **Conjuros por nombre**: fase propia. Esquema, catálogo y motor.

**Y la condición de entrega de la pieza 1:** que **diga en su propia pantalla** que los conjuros no
están todavía, en vez de dejar un hueco que parezca un fallo.

---

# Fuentes

- [Actions in Combat — 5e SRD](https://5thsrd.org/combat/actions_in_combat/)
- [The Order of Combat (economía del turno) — SRD 5.1](https://dnd5e.info/combat/the-order-of-combat/)
- [Help Action — 5e SRD](https://www.dandwiki.com/wiki/5e_SRD:Help_Action)
- [Inspiration — 5e SRD](https://5thsrd.org/rules/inspiration/)
- [Flanking (regla opcional del DMG), explicada](https://arcaneeye.com/mechanic-overview/flanking-in-dd-5e/)
- [Damage and Healing — 5e SRD](https://5thsrd.org/combat/damage_and_healing/)
- [Temporary Hit Points — 5e SRD](https://www.dandwiki.com/wiki/5e_SRD:Temporary_Hit_Points)
- [Appendix PH-A: Conditions — SRD 5.1](https://dnd5e.info/appendices/appendix-ph-a-conditions/)
- [Ability Scores and Modifiers — SRD 5.1](https://dnd5e.info/using-ability-scores/ability-scores-and-modifiers/) (comprobado: **no** trae método de generación)
- [Métodos de generación de características (array, compra por puntos, 4d6)](https://rpgbot.net/dnd5/how-to-play/choosing-ability-scores/)
- [Concentración: CD 10 o la mitad del daño](https://5thsrd.org/spellcasting/casting_a_spell/)
