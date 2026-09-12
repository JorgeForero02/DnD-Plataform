# El mapa de historia del DM — la línea de tiempo ramificada, dibujada a mano

> Escrito el 2026-09-12 con el autor, en sus palabras: *«el DM tiene opción de armar la línea de
> tiempo; funciona como visión general de las misiones o puntos de historia, como una lista de
> misiones de un juego pero con caminos extra: los jugadores tomaron un desvío, hicieron
> secundarias de paso… un gráfico lineal editable donde el DM ve qué hicieron y qué no; lo
> principal de un color y el resto de otro; **no conectado estrictamente a los eventos del backend:
> es un patio de juegos del DM**, donde puede poner elementos del mundo como nodos y conectar sus
> caminos».*
>
> Ya estaba decidido: **D4** («el tablero telaraña se retira y lo sustituye la línea de tiempo de
> la campaña»), la notación del autor en el prompt de Figma §18 (**cuadrados = lo principal,
> círculos = secundarias**), y el plan del 2026-09-02 (T1/T2: React Flow + dagre). **Lo que cambia
> hoy:** aquel plan la generaba desde el log y el DM solo dibujaba «el camino que no se tomó»; el
> autor la quiere **dibujada por el DM**, con enlaces al mundo y a las sesiones opcionales.
>
> Lo que dice «hoy» se comprobó el 2026-09-12 sobre `main` (`f5b22e3`).

---

## 1 · Qué se pide, en una frase

Una pestaña del taller del DM, **«Mapa de historia»**, con un lienzo editable de nodos y caminos
—principal y secundario por forma y color, recorrido o no recorrido— que el DM dibuja para
preparar y para ver de un vistazo qué hicieron los jugadores y qué no; guardado en el servidor,
solo del DM, y con cada nodo **opcionalmente** enlazado a una ficha del mundo o a una sesión.

## 2 · Lo que hay hoy, medido

| Pieza | Estado |
|---|---|
| `sessions/taller/TableroTelarana.tsx` (125 líneas del taller + su lienzo) | El «tablero telaraña»: SVG a mano con fichas del mundo y sus enlaces, arrastre propio (`posiciones.ts`). **D4 lo declaró retirado el 2026-09-02 y sigue ahí** — es el punto #23 del pulido («muy poco intuitivo para editar»). Esta spec lo sustituye |
| `links` | Enlaces entre fichas del mundo con rótulo; se editan desde la ficha. **Se quedan**: son datos del mundo, no del mapa |
| Sesiones, `GameEvent` | Existen; el mapa **no** se genera de ellos (decisión de hoy) |
| Librerías de grafo | Ninguna instalada. `@xyflow/react` (React Flow 12) estaba propuesto en T2; `dagre` para el auto-orden |

## 3 · El modelo: nodos y caminos, del DM

Dos tablas nuevas, por campaña:

```
model StoryNode {
  id          String   @id @default(cuid())
  campaignId  String
  kind        String   // MAIN | SIDE          — cuadrado / círculo
  status      String   // PLANNED | DONE | SKIPPED   — por hacer / hecho / no pasó
  title       String
  note        String?  // Markdown corto, del DM
  x           Float
  y           Float
  entityId    String?  // enlace opcional a una ficha del mundo
  sessionId   String?  // enlace opcional a la sesión donde ocurrió
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
model StoryEdge {
  id          String  @id @default(cuid())
  campaignId  String
  fromId      String
  toId        String
  kind        String  // TAKEN | NOT_TAKEN     — camino recorrido / camino que se quedó
  label       String?
  @@unique([fromId, toId])
}
```

Esquemas Zod en `@dnd/shared` (`story-map.schema.ts`) con los enums cerrados y sus formas
legibles en un `vocabulario.ts` (regla: ningún enum a pantalla). **Borrar una ficha del mundo o una
sesión deja el nodo con el enlace a `null`** (`onDelete: SetNull`): el mapa es del DM y no se rompe
porque el mundo cambie.

## 4 · Quién lo ve

**Solo el DM** (`requireDM` en todas las rutas; un jugador recibe 404 como en el resto del taller).
Es un patio de juegos de preparación: enseña lo que no ha pasado. Revelarlo a la mesa —o un
«mapa de lo que sabéis» generado para jugadores— **queda fuera** de esta spec, declarado.

## 5 · La API

`/campaigns/:id/story-map` (DM):

| Ruta | Qué |
|---|---|
| `GET` | `{ nodes, edges }` entero (un mapa cabe en una respuesta: decenas de nodos, no miles) |
| `POST nodes` · `PATCH nodes/:id` · `DELETE nodes/:id` | crear, editar (título, nota, tipo, estado, enlaces), borrar (y sus aristas) |
| `PUT nodes/positions` | `[{ id, x, y }]` en bloque, al soltar el arrastre (una petición por gesto, no por píxel) |
| `POST edges` · `PATCH edges/:id` · `DELETE edges/:id` | caminos; `PATCH` cambia `kind` y `label` |

Sin sucesos en el hilo: el mapa no es crónica (decisión del autor). Sin tiempo real: se carga al
abrir la pestaña.

## 6 · La pantalla

Pestaña **«Mapa de historia»** del taller del DM, en el lugar del tablero telaraña, con
**React Flow** (`@xyflow/react`, dependencia nueva y **usada**; es lo que el proyecto exige para
meter una librería: cero imports muertos):

- **Nodos**: componente propio por tipo, sin arte: **cuadrado** para `MAIN`, **círculo** para
  `SIDE` (la notación del autor), con el título dentro y un borde por estado: `PLANNED` en el
  color de la superficie, `DONE` en el acento, `SKIPPED` en apagado y tachado. Si tiene `entityId`
  enseña el icono dibujado del tipo de ficha (los que ya usa el mundo); si tiene `sessionId`, la
  fecha de la sesión.
- **Caminos**: `TAKEN` en cobre continuo; `NOT_TAKEN` en cobre discontinuo (el «camino que se
  quedó sin recorrer» del Figma §18). Rótulo opcional sobre la arista.
- **Colores**: lo principal en cobre, lo secundario en acero; el estado va en el borde. Nada nuevo
  en `tokens.css`: se usan los que hay y se miden en `tokens-contrast.spec.ts` en los tres temas.
- **Editar**: pulsar un nodo abre un **panel lateral** (no un diálogo) con: título, tipo (radios
  «Principal / Secundaria» con su frase), estado (radios), nota, «Ficha del mundo» y «Sesión»
  como **desplegables con buscador** (el patrón del selector de objetos, `SelectorDeObjeto`, ya
  existe) — esto contesta el #23: «editar con desplegables». Pulsar una arista: tipo y rótulo.
- **Crear**: botón «Nuevo punto» (nace donde está el centro de la vista) y arrastrar desde el asa de
  un nodo a otro crea un camino. Teclado: `Supr` borra lo seleccionado, `Escape` cierra el panel;
  React Flow trae navegación por teclado entre nodos.
- **Ordenar**: botón «Ordenar solo» (dagre, de izquierda a derecha: la cadena principal como
  espina, las secundarias colgando) que **propone** posiciones y se puede deshacer; el DM manda.
- **Leyenda** fija abajo: cuadrado principal · círculo secundaria · continuo recorrido ·
  discontinuo no recorrido · borde por estado.
- **Vacío**: «Todavía no hay mapa. Empieza por el primer punto de la historia» con el botón.
- **A 390 px** no se edita: se ve y se arrastra el lienzo; el panel lateral es una hoja inferior.
  Se mide con `boundingBox`.

## 7 · Lo que se quita

`TableroTelarana.tsx`, `posiciones.ts` y su pestaña. Sus pruebas se retiran **con la decisión
citada (D4)**, no en silencio: es el único caso en que una prueba se borra, y va en el mismo commit
que la sustituye. Los **enlaces del mundo** se siguen editando desde la ficha (`links`), y el taller
conserva «Escribir ficha», «Preparar sesión» y «Lo que sabe la mesa».

## 8 · Pruebas

| Capa | Qué |
|---|---|
| Unitarias API | esquemas; borrar un nodo borra sus aristas; borrar una ficha del mundo deja `entityId` a `null` (Prisma `SetNull`, probado contra Postgres en e2e) |
| e2e API | jugador → 404 en `GET`; DM crea dos nodos y un camino, recarga y persisten; `PUT positions` en bloque |
| RTL | el nodo pinta cuadrado/círculo y el borde por estado sin enums; el panel ofrece radios y desplegables con buscador |
| Navegador | DM: crear punto, editar título, enlazar a una ficha, conectar dos, recargar → todo sigue; `tokens-contrast` en los tres temas sobre el lienzo; 390 px: lienzo visible, sin scroll horizontal del cuerpo |

## 9 · Lo que puede salir mal

| Riesgo | Qué hacer |
|---|---|
| React Flow trae CSS propio | se importa su hoja una vez y se le pisan los colores con los tokens; se mide |
| Guardar cada píxel del arrastre | `PUT positions` solo en `onNodeDragStop` |
| Un mapa enorme | fuera de alcance: decenas de nodos, sin paginación; si algún día pasa de cientos, se decide entonces |
| El DM borra una ficha del mundo | el nodo sobrevive sin enlace y lo dice |

## 10 · Decisiones

| Decisión | Elegido | Descartado |
|---|---|---|
| Fuente del mapa | **lo dibuja el DM**; enlaces al mundo y sesiones opcionales | generarlo del log (plan 2026-09-02 T2): el autor no lo quiere atado al backend |
| Librería | `@xyflow/react` + `dagre` (auto-orden opcional) | SVG a mano (es lo que hay y es el #23); Mermaid `gitGraph` (T1, no editable) |
| Quién lo ve | solo el DM | mapa para jugadores (otra spec, si llega) |
| Notación | cuadrado/círculo, cobre/acero, continuo/discontinuo, borde por estado | iconos por tipo de misión |

## 11 · Cuándo y tamaño

Antes del paso 3 (orden del autor): después de la puerta de efectos. **Modular**: toca
`sessions/taller/` (sustituye el tablero), un módulo nuevo `story-map` en la API, dos tablas. No
toca la hoja ni el inventario. Estimado: **5 tareas, una sesión**. Plan con `writing-plans` cuando
el autor apruebe.
