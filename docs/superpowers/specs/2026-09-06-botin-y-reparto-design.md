# Botín, reparto y dinero — diseño

> Escrito el 2026-09-06, a partir de cuatro preguntas del autor: ¿el paso 2 trae comercio? · ¿cómo
> asigna el DM el botín? · ¿las tablas de botín están conectadas al catálogo? · ¿puede el DM dar un
> objeto desde la pantalla, o darlo automáticamente?
>
> **Todo lo que dice «hoy» se comprobó abriendo el fichero**, el 2026-09-06 sobre `d3d8f28`.
>
> **Escrita fuera del repositorio y movida aquí el 2026-09-06**, cuando el agente del paso 1 soltó
> el árbol. El contenido no cambió al moverla.


---

## 1 · Qué hay hoy, medido

| Pieza | Estado real |
|---|---|
| **Meter un objeto en el inventario de alguien** | Existe: `inventory.service.ts:246`, `add`, autoriza con `requireOwnerOrDM` — **el DM puede dárselo a cualquiera** |
| **Cambiar el dinero de alguien** | Existe: `PATCH /campaigns/:c/characters/:p/money`, su propio recurso hermano del inventario |
| **Precio de un objeto** | Existe (`item.schema.ts:231`, `costCp`) **y se ve**: `ItemDetail.tsx:74` pinta «Valor». Lo que no existe es comprar con él |
| **Tablas del DM** | Existen, con visibilidad por `canView` y su suceso al tirar. **Pero una fila es `{min, max, text}`**: un rango y **una cadena de texto** |
| **Objetos propios del DM** | Existen, los crea solo el DM (`campaign-items.service.ts:71`) con su visibilidad |
| **Botín como concepto** | **No existe.** Cero apariciones en el servidor, en `shared` y en la web — salvo dos comentarios de la tabla del DM que dicen que sirve «igual para botín, rumores y encuentros» |
| **Comercio** | **No existe**, y no está en ningún plan escrito |

**La consecuencia en la mesa, dicha sin adornos:** el DM tira su tabla de botín, lee *«una espada
corta y 15 mo»*, y entonces **abre la hoja de un jugador, pulsa «Añadir objeto», lo busca en el
catálogo, lo mete, y repite**. Con cuatro jugadores y un cofre, son cuatro pantallas y una docena de
clics para algo que en la mesa de verdad dura cinco segundos.

---

## 2 · Qué entra en el paso 2, y esto es lo que el autor preguntó

**Del comercio: nada, y no debería.** El paso 2 es la economía de acciones y el molde de la
actividad. Comprar y vender no son ninguna de las dos cosas, y meterlos ahí convertiría un paso ya
grande en dos trabajos.

**Pero el paso 2 ya trae una cosa que hace que el botín valga la pena**, y conviene verla:

> Una **poción de curación** es un objeto consumible con una actividad `dados` de signo positivo.
> Eso es exactamente la tarea 6 del paso 2 (las cinco actividades, con daño y curación **fundidos**)
> más la tarea 7 (ejecutar una actividad gastando su uso). **Sin el paso 2, dar una poción es dar
> una fila de inventario que no hace nada**; con él, se bebe y cura.

O sea: **el paso 2 no reparte botín, pero es lo que convierte el botín en algo que se usa.** Ese es
el argumento para no adelantar esto y sí terminar aquel.

### Lo que SÍ puede correr en paralelo al paso 2, y es el hallazgo útil

**Los bloques de abajo y el paso 2 no comparten un solo fichero.** Comprobado:

```
Paso 2  →  schema.prisma (Combatant) · shared/activity · shared/origen ·
           src/activities · rules/catalog · web/character-sheet

Botín   →  shared/dm-table · src/dm-tables · src/inventory ·
           web/dm-tables · web/sessions (la mesa)
```

**Cero solape.** Así que esto no es «meterlo en el paso 2»: es que **puede hacerse a la vez**, por
otra sesión y en otro worktree, sin pisarse. Y es mucho más pequeño.

---

## 3 · Los tres bloques, por orden de cuánto duelen

### B1 · Una tabla puede entregar objetos, no solo texto

**El problema:** una fila de tabla es prosa. Nadie puede pulsar el resultado para meterlo en una
bolsa, porque no hay nada que pulsar — «una espada corta» es una cadena.

**El arreglo, y es un campo opcional:**

```ts
dmTableEntrySchema = {
  min, max,
  text: string,                       // se queda: es lo que se lee en voz alta
  entrega?: {                         // NUEVO, opcional
    objetos?: { ref: ContentRef; cantidad: number }[],
    monedas?: { cp?, sp?, ep?, gp?, pp? },
  }
}
```

**Por qué opcional y no obligatorio:** la misma tabla sirve para rumores y encuentros, y una tabla de
rumores **no entrega nada**. Un campo opcional deja las tablas existentes exactamente como están —
ninguna migración de datos, ninguna fila que reescribir.

**La `ref` es la misma `ContentRef` de 2B** (`SRD:longsword` o `CAMPAIGN:<id>`), o sea que el
catálogo del SRD y los objetos propios del DM entran por la misma puerta. Es la decisión D-2B-3
aplicada tal cual, sin inventar un segundo formato.

**Lo que hay que cuidar, y ya tiene precedente:** un objeto propio con visibilidad `DM_ONLY` no puede
colarse en la bolsa de un jugador. La regla ya existe —**D-2B-7: dárselo a quien no puede verlo se
rechaza con un 400 que explica cómo arreglarlo**— y aquí se reutiliza; no se escribe otra.

**Pruebas:** una tabla de rumores sigue funcionando sin tocarla · una fila con `entrega` devuelve sus
objetos resueltos · una `ref` que ya no existe da un motivo legible y no un objeto vacío · un objeto
`DM_ONLY` entregado a un jugador da 400.

### B2 · Repartir desde un sitio, no desde cuatro

**El problema:** dar un objeto exige abrir la hoja de quien lo recibe. El DM sale de la mesa, entra
en una ficha, vuelve. Cuatro veces.

**El arreglo:** un gesto **«Dar…»** que vive donde ya se juega —la mesa— y que elige destinatario
entre los personajes de la sesión. Por dentro **no es un endpoint nuevo**: es el `add` que ya existe
(`inventory.service.ts:246`), llamado con otro `characterId`.

Y con el resultado de una tabla delante, el mismo gesto: **«dar esto a…»** sobre lo que la tabla
acaba de entregar.

**Lo que NO se hace:** repartir automáticamente entre todos. Quién se queda qué es una conversación
de mesa, y un reparto automático es el servidor decidiendo por los jugadores — la misma línea que
este proyecto ya trazó con el bando y con el fin del combate.

**Deja rastro, y esto no es opcional:** un suceso que diga **quién dio qué a quién**. Un objeto que
aparece en una bolsa sin explicación es exactamente la clase de cosa que en la sesión siguiente nadie
recuerda. El vocabulario cerrado gana un tipo; los enums de PostgreSQL solo crecen.

**Pruebas:** el DM da desde la mesa y el objeto está en la bolsa del jugador · un jugador **no**
puede darle un objeto al personaje de otro (`requireOwnerOrDM` ya lo impide: la prueba lo fija) · el
registro dice quién, qué y a quién · en el navegador, dar sin salir de la mesa.

### B3 · El dinero es parte del botín

**El problema:** el dinero se cambia en la hoja, moneda a moneda, con la casilla y su «Aplicar». Para
repartir 60 mo entre cuatro, el DM hace ocho gestos en cuatro pantallas.

**El arreglo:** que el mismo gesto «Dar…» acepte monedas, y que la entrega de una tabla las traiga.
Por dentro es el `PATCH .../money` que ya existe.

**Y una cosa que no haría:** repartir a partes iguales automáticamente. El reparto desigual es la
norma en una mesa —el que pagó la posada, el que compró la cuerda— y una división automática obliga
a deshacerla a mano la mitad de las veces.

---

## 4 · El comercio, y por qué queda fuera

**No entra, y la puerta se deja abierta sin coste.** El precio ya está en el catálogo (`costCp`) y ya
se ve en la ficha del objeto, así que **la mitad cara del comercio ya está hecha**: los datos.

Lo que falta es lo que no se puede acertar sin jugar: si hay tiendas con inventario propio, si el
precio de venta es la mitad —como suele hacerse en la mesa—, si regatear tira una prueba de Persuasión.
**Eso son decisiones de mesa, no de modelo**, y escribirlas antes de que alguien intente vender una
espada es diseñar para un caso que no existe.

**Cuándo entra:** el día que en una partida alguien diga «vendo esto». Entonces la pregunta ya no será
«cómo debería funcionar» sino «lo que quiero es esto», que es mucho más barata de contestar.

---

## 5 · Lo que puede salir mal

| Riesgo | Señal | Qué hacer |
|---|---|---|
| **Filtrar un objeto secreto** | un `DM_ONLY` aparece en la bolsa de un jugador | D-2B-7 ya lo rechaza con 400; la prueba lo fija en esta puerta también |
| **Romper las tablas que ya existen** | una tabla de rumores deja de tirar | `entrega` es **opcional**: sin él, el camino de hoy no cambia en nada |
| **Un botín que aparece sin explicación** | un jugador con un objeto que nadie recuerda | el suceso de reparto, obligatorio |
| **Una `ref` caduca** | el DM borró su objeto propio y la tabla lo sigue nombrando | motivo legible, como ya hace el catálogo con una clase que no existe |
| **Diseñar el comercio de memoria** | tiendas, márgenes y regateo sin haberlo jugado | fuera hasta que se pida en una partida |

---

## 6 · Qué decide el autor

1. **¿Esto corre en paralelo al paso 2, o después?** Recomendado: **en paralelo**, porque no comparten
   ni un fichero y es mucho más pequeño. Si prefieres una sola cosa a la vez, va después del 2 y antes
   del 3.
2. **¿El reparto deja suceso siempre, o solo cuando lo hace el DM?** Recomendado: **siempre**. Un
   jugador que le pasa una poción a otro es información de mesa igual que el botín.
3. **¿Las monedas entran en B1 (la tabla las entrega) o solo en B3 (se dan a mano)?** Recomendado:
   **las dos**, porque es el mismo campo opcional y la mitad de las tablas de botín llevan monedas.

## Definición de terminado del diseño

**Esto no es un plan.** Está terminado cuando el autor apruebe los tres bloques, el orden respecto al
paso 2, y la regla de que **el reparto automático no existe**: el sistema entrega, la mesa decide
quién se lo queda. Su plan por tareas se escribe después.
