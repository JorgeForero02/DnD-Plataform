# El prototipo de la mesa (2026-09-18)

**Decisión del autor, 2026-09-18:** el HTML [`prototipo/mesa/2026-09-18-prototipo-mesa.html`](../../../prototipo/mesa/2026-09-18-prototipo-mesa.html)
—que él reescribió a partir de una maqueta de la barra de acciones— **es el prototipo de la
pantalla de la mesa**. Sus palabras: *«quiero que la mesa se vea como sale en el html; anótalo
como prototipo de verdad; las cosas que tenemos no quitarlas, pero hay que apuntar a eso»*.

Se abre con doble clic: un solo fichero, sin build. Para el resto de pantallas y la navegación
sigue mandando el prototipo de Figma Make (`04-convenciones.md`, § *El prototipo es revisión
obligatoria*).

> **Alcance, aclarado por el autor el mismo día:** el prototipo decide **la disposición y cómo se
> aprovecha el espacio**, no qué existe. *«También debemos conservar varios botones que no salen en
> el prototipo — los de daño, las opciones del DM por personaje…; esto es solo para aprovechar
> mejor el espacio.»* Así que **todo lo que hoy hace la mesa se conserva aunque el HTML no lo
> dibuje**: «Poner daño» y «Dar temporales», el menú «Más acciones» de cada ficha del elenco
> (condición, su hoja, corregir bando, quitar), los mandos del DM por combatiente, pedir una
> tirada, revelar, la iniciativa forzada/repartida, los efectos de mesa… Lo que el prototipo no
> pinta se **coloca** dentro de su disposición; no se quita. Si una pieza no cabe, se abre ficha
> con la medida, no se borra.

## Qué cambia frente a `MesaDeSesion.tsx` hoy

| Hoy | Prototipo |
|---|---|
| `BandaDeMesa` + `CabeceraDeEscena`, dos bloques | **Una banda**: ← campaña · título de la escena + lugar · duración y «N en la mesa» · reloj (hora, día, noche) · conmutador **«Con tablero / Sin tablero»** · atajos «?» · «Ver como» |
| `CapaDeCombate` con `EconomiaDeAccion` de botones «Usar mi acción…» | **Franja de combate**: orden de turnos con el actual marcado, ronda, y la economía como **estado** que se gasta al actuar (T22) |
| Rejilla fija `17rem / 1fr / 15rem` | **Tres columnas con tiradores** redimensionables (ancho guardado en `localStorage`) |
| Elenco + rail (Hoja · Bolsa · Mundo · Dados) | Igual, **con teclas** N · I · M · D; las tarjetas del elenco se pulsan para **apuntar** (objetivo); PNJ ocultos al jugador salvo lo revelado |
| Marco del tablero + **cajón inferior** del registro | Marco con cabecera (nombre del lugar, «abrir aparte») y **la barra de acciones debajo**. **El cajón desaparece** |
| Hilo dentro del cajón | **Registro como columna lateral**: filtros Todo / Relato / Números, «Nuevas líneas ↓», caja «…y en dos palabras, ¿qué pasó?» (`/` la enfoca) |
| Herramientas del DM en lista vertical | Rejilla 2×4 (Pedir tirada · Sacar criatura · Revelar · Reloj · XP · Bloques · Tablas · Consultar mundo) + «Lo que el motor está siguiendo» |
| — | **Bandeja del DM** (lateral, solo DM): el daño que proponen las acciones de los jugadores espera ahí; aplicar / partir para quien salvó / descartar; **A** aplica todo |
| — | **Barra de acciones** (3A.3): chip de objetivo (**X** cicla), menús 1–5 (Ataques · Conjuros · Aptitudes · Objetos · «Esquivar, ayudar…»), **Repetir (R)** la última acción |
| — | **Deshacer (Z)** lo último hecho, con aviso de 7 s. **Espacio** = siguiente turno |
| — | Modo **«Sin tablero»** (crónica): el registro ocupa el centro; la vista de jugador pierde la lateral |

## Lo que el prototipo NO decide (igual que con el de Figma)

- **`canView` manda**: su «Ver como» pinta; el nuestro decide lo que el servidor envía.
- **Ningún botón que el servidor rechace**: cada fila apagada lleva su motivo, y el motivo lo da
  `GET …/characters/:id/actions` (T21), no la pantalla.
- Sus dados son `Math.random`: aquí toda tirada pasa por el evaluador y queda en el registro.
- Deshacer, bandeja y repetir son **forma**; qué se puede deshacer y hasta cuándo lo decide el
  servidor, con su prueba delante.
- Si discrepa con `04-convenciones.md`, manda el documento y la discrepancia se declara allí.

## Cómo se usa

Toda tarea que toque la mesa —3A.2 (pestaña Conjuros, lanzar y usar) y 3A.3 (la barra)— se
**mide contra este HTML** en el navegador, al lado de una captura nuestra. **No se quita nada de
lo que existe**: se converge pieza a pieza, y cada pieza que se acerque lo dice en su commit.
