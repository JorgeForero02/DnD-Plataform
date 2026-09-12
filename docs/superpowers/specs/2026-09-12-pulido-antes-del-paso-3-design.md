# Pulido antes del paso 3 — por causa, no por pantalla

> Escrito el 2026-09-12 con el autor, tras revisar producción (`6d2b2ca`) pantalla a pantalla:
> **24 puntos**, en [el anexo](./2026-09-12-pulido-anexo-lista-del-autor.md) con su captura descrita.
> Su diagnóstico, literal: *«hay muchas que se repiten demasiado: espacios desaprovechados,
> centrados no hechos, cards con contenido no explicado o mal distribuido, y un largo etc.»*.
> **Eso decide la forma de esta tanda: no son 24 arreglos, son cuatro causas que se arreglan una
> vez en las primitivas, más siete puntos sueltos.** Dos puntos (#5 y #19) son mecánica y tienen su
> [spec propia](./2026-09-12-reglas-de-la-mesa-design.md); uno (#24) es el
> [mapa de historia](./2026-09-12-mapa-de-historia-del-dm-design.md); uno (#13, dados 3D) lo aplazó
> el autor.

---

## 1 · Qué se pide, en una frase

Que la interfaz **deje de parecer «una sección de tablas y tarjetas»**: tarjetas que reparten bien
su espacio, acciones que no se salen de su fila, iconos donde faltan, un hilo que habla de
personajes, una bandeja de dados que se entiende, y los cuatro bugs que salieron de paso — medido
todo en el navegador, antes de construir el paso 3 encima.

## 2 · Tarea 0 · Investigar antes de tocar (media sesión, sin código)

El autor lo pidió tres veces: «investigar UI/UX en juegos y general». Referencias fijas, en este
orden, y **lo que se saca de cada una se escribe, con captura o cita, antes de abrir un fichero**:

| Referencia | Qué mirar |
|---|---|
| **Baldur's Gate 3** | la hoja de personaje (pestañas, densidad, cómo reparte una tarjeta), la barra de acciones y sus contenedores desplegables, la tarjeta de un combatiente en el turno |
| **Divinity: Original Sin 2** | la hoja y el inventario (ya son la referencia de la hoja: D-CF-29..33), y cómo un menú contextual sustituye a una fila de botones |
| **Foundry VTT (dnd5e 3.x/4.x)** | la tarjeta de chat de una tirada (un dado por dado, desglose), la bandeja de daño, el «Dice So Nice» solo como referencia de formas |
| **D&D Beyond** | la hoja en escritorio: tres columnas, tarjetas con cabecera, cómo centra y alinea números |
| **Owlbear Rodeo** | la bandeja de dados: pulsar un dado lo añade, se ve la pila, tirar con un botón |
| **dddice / dice-box** | solo para #13 (aplazado): dejar apuntada la librería y su coste |

Salida de la tarea 0: **una nota de diseño de dos páginas** (`docs/superpowers/notes/`) con las
reglas nuevas que entran en [04-convenciones.md](../../04-convenciones.md) § *reglas de interfaz*:

1. **Reparto interno de tarjeta**: cabecera · cuerpo · pie; padding único; los números alineados a
   una rejilla de columnas; una tarjeta no crece para llenar un hueco, **la rejilla la coloca**
   (`align-items: start` con alturas iguales por fila donde haga falta).
2. **Acciones de una fila**: hasta **dos** visibles (la principal y una secundaria), el resto en un
   **menú «…»** dibujado; nunca una fila de cinco botones.
3. **Espacio reservado**: lo que puede cambiar de tamaño al escribir (contadores, avisos) reserva
   su alto (`min-height`) — es lo que quita el *tearing* (#8).
4. **Sticky con escalón**: todo lo pegado respeta `--tira-fija-top`; se mide con `boundingBox`.
5. **Un dado, una forma**: seis dibujos, y el resultado enseña **cada dado** con su cara.

## 3 · Las causas, y qué puntos cierra cada una

### C1 · La tarjeta y la rejilla (`ui/Panel.tsx`, `Tarjeta.tsx`, `tokens.css`, y las rejillas de cada pestaña)

Cierra **#3, #4, #6, #7, #8, #9, #16, #17** y la parte de «tablas y tarjetas» de **#2**.

- `TarjetaDeHoja` gana `pie` y un reparto fijo; las cinco casillas de la cabecera pasan a un
  componente `Casilla` con **ancho y alto iguales** y los temporales como línea bajo la cifra sin
  romper la caja (#4).
- La cabecera en la mesa se ancla: fondo continuo con el cajón y borde inferior, sin margen negativo
  dentro del diálogo (#3).
- El panel de detalle de Objetos: `top` = `--tira-fija-top` + alto real de la banda (#6).
- Rasgos, «Su color»/visibilidad/archivar, Dados de campaña: rejillas con alturas por fila y
  bloques reordenados (color como fila compacta arriba; visibilidad como bloque; archivar/borrar
  al final en su propio filete) (#7, #9, #16).
- `min-height` en contadores y avisos que cambian al escribir (#8).
- **Una pasada de medición** por pantalla (`e2e/espacios.spec.ts`): ningún hueco vertical > 48 px
  entre tarjetas hermanas, ninguna tarjeta más baja que su vecina en la misma fila por más de 24 px
  salvo la última. Los números salen de la tarea 0 (#17).

### C2 · Acciones de fila con menú (`ui/MenuDeAcciones.tsx`, nuevo)

Cierra **#1** y **#14**, y prepara el menú «Acciones» del paso 3.

- Un componente: botón «…» dibujado que abre una lista hacia arriba/abajo según espacio, teclado
  (flechas, `Escape`), foco devuelto. Lo consumen el elenco (Daño · Curar como visibles; Condición ·
  Dar · Ver · Bando en el menú) y «La mesa tira» (audiencia y CD en un desplegable, dados visibles).

### C3 · Iconos completos (`ui/Iconos.tsx`)

Cierra **#12** y **#22**.

- Seis dados dibujados (d4 tetraedro, d6 cubo, d8 octaedro, d10 y d100 trapezoedro, d12
  dodecaedro, d20 icosaedro), en el mismo trazo que los que hay.
- Barrido: todo botón primario de página y toda entrada de navegación llevan icono; una prueba RTL
  recorre las páginas y afirma que ningún `Button variant="primary"` va sin `icon`.

### C4 · El hilo habla de personajes (`sessions/linea-de-log.ts`, `hilo/HiloDeSesion.tsx`, payloads)

Cierra **#15**.

- La cabecera de cada tarjeta del hilo pone **el personaje** (sujeto) y la persona pasa a un dato
  secundario («Sylas · Jorge»); en sucesos sin personaje (sentarse, cambio de papel) queda la persona.
- La frase nombra sujeto y objetivo: «**Sylas** pierde 7 PG (cortante) ← ataque de **Klarg**»,
  «**Klarg** ataca a **Sylas**: impacta», «**Elara** lanza Bola de fuego sobre Klarg y Sylas».
  El atacante sale de `ATTACK_RESOLVED.attackerId` y del `rollEventId` de `HP_CHANGED`; el daño
  puesto a mano desde el elenco gana `sourceCharacterId` opcional en el payload («← Klarg», si el DM
  lo dice).
- Ninguna frase nueva sale de la pantalla: todas viven en `linea-de-log.ts`, con su prueba.

### C5 · La bandeja de dados (`features/rolls/`)

Cierra **#10, #11, #14** (la parte de dados).

- Pulsar un dado lo **añade a la bandeja** (se ve la pila: dos d6, un d20); pulsar uno de la pila lo
  quita; modificador con `+`/`−`; ventaja/desventaja como los tres radios de siempre pero solo
  cuando hay un d20; expresión de texto en «modo avanzado» plegado. El servidor sigue recibiendo
  una expresión: la bandeja la compone.
- El resultado: **un dado por dado** con su forma y su cara, los descartados tachados, y el total.
  El desglose ya viene del servidor.
- En la mesa, la misma bandeja compacta.

### Sueltos

| # | Qué | Cómo |
|---|---|---|
| **#18** | Salir de la mesa lleva a «todas las campañas» | Volver a la campaña (pestaña Sesiones); migas que digan de dónde vienes. Un e2e |
| **#20** | PG temporales en bestiario: los botones no hacen nada, el aviso sale siempre | **Reproducir primero** (e2e rojo): probable estado no limpiado en `PanelDeBestiario` tras confirmar. Arreglar, mutar |
| **#21** | Catálogo sin filtros | `FilterChip` por tipo y origen, como el bestiario |
| **#23** | Grafo del mundo poco intuitivo | **Lo sustituye el mapa de historia** (spec propia); mientras, nada |
| **#2** | La hoja «como tablas y tarjetas» | C1 + la nota de la tarea 0; si tras C1 el autor sigue viéndola incómoda, se abre una spec de rediseño con referencias — no se improvisa |

## 4 · Lo que NO entra

- **#13 dados 3D**: aplazado por el autor. La bandeja 2D deja la forma lista para que una librería
  (dice-box) pinte encima el día que se decida.
- **#5 y #19**: su spec (reglas de la mesa). **#24**: su spec (mapa de historia).
- La mesa a 390 px (D-CF-26): sigue aplazada; aquí solo se garantiza no empeorarla.
- Rediseñar la hoja de arriba abajo: si C1 no basta, spec aparte.

## 5 · Pruebas

Regla de la casa, sin excepción: **todo lo que se ve se mide en el navegador**. RTL por componente
nuevo (`Casilla`, `MenuDeAcciones`, iconos, líneas del hilo, bandeja); `e2e/espacios.spec.ts` nuevo
con las medidas de la tarea 0; `tokens-contrast` sobre la bandeja y el menú; `teclado.spec` pasa
por el menú «…»; un e2e por bug suelto (#18, #20). Se corren **los ficheros tocados, uno a uno**,
como en la hoja (decisión del autor del 2026-09-11).

## 6 · Orden y tamaño

Tarea 0 → C1 → C3 → C2 → C5 → C4 → sueltos. **Modular**: C1 y C5 no comparten ficheros con las
otras specs; C2 lo consumirá el paso 3. Estimado: **1,5–2 sesiones**. Es la **primera** de las
cuatro tandas antes del paso 3 (D-CF-52): pulido → reglas de la mesa → puerta de efectos → mapa de
historia → paso 3.
