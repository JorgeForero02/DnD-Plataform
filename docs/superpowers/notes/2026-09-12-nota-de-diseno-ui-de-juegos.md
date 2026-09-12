# Nota de diseño — UI de juegos, antes del pulido (2026-09-12)

> Tarea 0 del plan de pulido. Lo que se saca de cada referencia, con cita o URL. Sin código.
> Por punto del anexo: BG3 → #1, #2, #14; DOS2 → #1, #2; Foundry → #10, #11, #14; Beyond → #2, #4,
> #7; Owlbear → #10, #14.

## 1 · Baldur's Gate 3

- **Hoja**: la fuente citada en el primer borrador de esta nota (una guía de **creación** de
  personaje) no describe la hoja en partida — se retira esa cita por no sostener lo que decía.
  Lo que sí sostiene una fuente: `TAB` es la tecla oficial de **«Toggle Party / Character
  Overview»**, distinta de `I` («Toggle Inventory») y `K` («Toggle Spell») — tres toggles
  separados, no tres pestañas de una sola pantalla — fuente:
  <https://baldursgate3.wiki.fextralife.com/Controls>. Que la hoja de cada personaje **tiene
  pestañas internas propias** —una de ellas «Character Features», donde el parche 8 movió las
  pasivas activables («*Toggleable passives are now listed in the Character Features tab*»)— y
  que existe **una hoja por personaje**, incluida la de un compañero recién reclutado («*Inventory
  sorting options in the Character Sheets of newly recruited companions*»), lo confirman las notas
  de ese parche — fuente: <https://baldursgate3.wiki.fextralife.com/Patch+8>. **Sin fuente
  citable**: la disposición exacta de esa hoja (qué campo va en qué columna, la densidad visual
  concreta) — no se afirma.
- **Barra de acciones**: tres zonas fijas separadas por divisores rojos —Acciones, Acciones
  adicionales, Objetos—, con una pestaña «Pasivas» aparte para lo que solo se activa/desactiva
  (no ocupa hueco de turno); + / − junto a «Terminar turno» añade filas cuando la barra se llena
  — fuente: <https://eip.gg/bg3/guides/tips-tricks/>. Es la referencia directa del anexo #1
  («un submenú o agrupación» contra la fila que se sale de la tarjeta): agrupar por **categoría
  fija**, no alfabético ni cronológico.
- **Tarjeta del combatiente**: no hay una captura pública desglosada del HUD de turno con conteo
  exacto de acciones visibles citable con URL — este punto se deja **sin afirmar** en vez de
  inventar un número; lo que sí es citable es que el ataque básico desde la barra abre un menú
  propio para aplicar venenos con la acción adicional, es decir, lo secundario cuelga de un menú
  y no de un botón más — misma fuente de arriba.
- Lo que se adopta: **categorías fijas con separador**, y lo raramente usado (pasivas, aplicar
  veneno) en un menú, no en la fila. Lo que no: la barra reconfigurable a mano (arrastrar,
  bloquear/desbloquear) — nuestra mesa no tiene inventario de hechizos tan grande como para
  justificar esa complejidad, y el anexo no la pide.

## 2 · Divinity: Original Sin 2

- **Menú contextual**: clic derecho sobre un objeto abre un menú contextual con las acciones
  disponibles (equipar, examinar, etc.) en vez de una fila de botones bajo el objeto — fuente:
  <https://steamcommunity.com/app/435150/discussions/0/1479856439032566902/> y el mod Epip, que
  documenta menús contextuales «resolver functions» sobre el mundo:
  <https://www.pinewood.team/epip/>.
- Lo que se adopta: el menú «…» (C2, `ui/MenuDeAcciones.tsx`<!-- docs-lint-ignore -->) para lo
  que hoy es una fila de botones en el elenco — mismo principio que DOS2, un clic revela, no una
  fila permanente.
- Lo que no: el clic derecho como gesto. En web es una convención rota (abre el menú del
  navegador, no funciona en móvil); el botón «…» dibujado hace el mismo trabajo sin pisar esa
  convención.

## 3 · Foundry VTT (dnd5e)

- **Tarjeta de chat de una tirada**: Dice So Nice! anima **cada dado por separado**, con física
  propia por dado y personalización por tipo de dado (d4 a d30) y por actor — fuente:
  <https://foundryvtt.com/packages/dice-so-nice/>. Es la referencia directa del anexo #11: un
  resultado con varios dados se pinta **dado a dado**, no como un único número.
- **Bandeja de daño**: se cita solo para dejar constancia — es de la tanda «puerta de efectos»
  (spec propia, D-CF-51), no de esta.
- **Dice So Nice**: se usa aquí solo como referencia de **formas** (anexo #12): construye sobre
  el «Online 3D dice roller» de Anton Natarov y renderiza con Three.js/cannon-es — misma fuente.
  Confirma que los seis sólidos platónicos (tetraedro, cubo, octaedro, trapezoedro para d10/d100,
  dodecaedro, icosaedro) son la forma estándar reconocible por tipo de dado.

## 4 · D&D Beyond

- **Hoja en escritorio**: el patrón de columnas —puntuaciones de característica, salvaciones y
  habilidades centradas, con inventario/rasgos/idiomas a los lados en tarjetas con cabecera— es
  el que copian explícitamente las hojas de terceros que imitan su UX; el proyecto
  `compactBeyond5eSheet` lo describe como «piggy-backing off of» la investigación de UX de D&D
  Beyond, con «Skills and Resources always present» y tarjetas con cabecera consistente — fuente:
  <https://github.com/ElfFriend-DnD/foundryvtt-compactBeyond5eSheet>. La propia comunidad de D&D
  Beyond pide **más** columnas en pantalla ancha porque hoy la columna central deja hueco vacío a
  los lados — fuente: <https://www.dndbeyond.com/forums/d-d-beyond-general/d-d-beyond-feedback/91582-request-for-better-fullscreen-character-sheet>.
  Confirma el diagnóstico del anexo #2 y #7: **tarjetas con cabecera fija, números centrados**, y
  huecos vacíos como defecto a evitar, no a tolerar.

## 5 · Owlbear Rodeo

- **Bandeja de dados**: se elige un set de dados, se ajusta la cantidad con +/− o escribiéndola,
  se añaden bonificador y ventaja/desventaja en el mismo diálogo, y un botón «Roll» tira todos a
  la vez; hay un atajo de «tiradas recientes» para repetir combinaciones — fuente:
  <https://blog.owlbear.rodeo/owlbear-rodeo-2-0-dice-deep-dive/>. Es la referencia directa del
  anexo #10: **bandeja que se ve y se ajusta antes de tirar**, en vez de un formulario largo de
  expresión + atajos + radios.
- Lo que se adopta: pulsar un dado lo añade a una pila visible, ventaja/desventaja como radios
  solo cuando hay un d20, expresión de texto como alternativa plegada.
- Lo que no: el diálogo modal aparte por cada set de dados — nuestra bandeja vive en el propio
  panel de Dados / cajón «La mesa tira», sin abrir una ventana nueva.

## 6 · dddice / dice-box (solo para #13, aplazado)

- **dice-box** (`@3d-dice/dice-box`): MIT, motor de dados 3D con BabylonJS + AmmoJS, web workers
  y `OffscreenCanvas`; acepta notación simple (`2d20`, `2d6+4`) y devuelve el resultado por dado
  — fuente: <https://github.com/3d-dice/dice-box>. Requiere copiar assets estáticos al proyecto;
  coste de integración estimado: medio (una dependencia pesada de render 3D + build step propio
  para los assets, nada trivial de mantener en CI).
- **dddice** (`dddice-js`): SDK para su propio servicio de dados en la nube (salas compartidas
  entre jugadores vía su API), no una librería local — coste de integración estimado: mayor que
  dice-box, porque además del render exige una cuenta y una API externa; no es autoalojable.
- **No se hace.** Confirma D-CF-55: la bandeja 2D de esta tanda deja el hueco (un resultado por
  dado, con su forma) para que una de estas dos pinte encima el día que se decida; entre las dos,
  dice-box es la candidata natural por ser local y MIT.

## 7 · Los números que este plan mide

| Constante | Valor | De dónde sale |
|---|---|---|
| HUECO_MAX_PX | 48 px | Propuesto por la spec § 3 (C1); sin cita externa mejor — es una medida de la casa, no un dato de un juego de referencia |
| DESNIVEL_MAX_PX | 24 px | Ídem, spec § 3 (C1) |
| ANCHO_CASILLA_REM | 4.75rem | Ya es el ancho mínimo de la casilla PG hoy (`apps/web/src/features/character-sheet/Cabecera.tsx:84`, `min-w-[4.75rem]`); se fija como ancho **fijo** de las cinco casillas en vez de mínimo, para que dejen de ser asimétricas (anexo #4) |
| ALTO_CASILLA_REM | 3.75rem | El anexo #4 pide «mismo ancho y alto en las cinco»: lo que exige es que las cinco casillas midan **igual entre sí**, no que la casilla sea cuadrada — «ancho y alto iguales» describe uniformidad entre casillas, no una proporción 1:1 dentro de una. No hay una suma de las tres líneas (rótulo, valor, «+N temporales») que dé 3.75rem exacto desde los tokens de `tokens.css` — la casilla PG es la única de las cinco con tres líneas y las otras cuatro solo tienen dos, así que ese alto no sale de sumar líneas de una casilla concreta, sino de comprobar a ojo que las tres líneas de la casilla más cargada (PG) caben dentro sin recortarse. Es el valor por defecto que trae el propio encargo, aceptado tal cual en vez de forzar un cálculo de precisión que los tokens no permiten |
| ACCIONES_VISIBLES | 2 | spec § 2, regla 2; confirmado por BG3 (categorías fijas, lo raro a un menú, § 1) y DOS2 (menú contextual en vez de fila, § 2) |

**Aviso para las tareas 1 y 4:** los fragmentos de código de ejemplo del plan de pulido
(`docs/superpowers/plans/`) todavía traen el valor por defecto viejo, `5.5rem`, para
`ANCHO_CASILLA_REM`. Esta nota lo sustituye por `4.75rem` (razón arriba, y ya en
`04-convenciones.md`): **gana el número de esta nota**, no el de un fragmento de plan que quedó
desactualizado al escribirla.

## 8 · Las cinco reglas (texto final que entra en 04-convenciones)

Ver `docs/04-convenciones.md` § *Reglas de interfaz que salieron del reseño*, últimos cinco
puntos de la lista: reparto interno de tarjeta, acciones de una fila con menú, espacio
reservado, sticky con escalón, un dado una forma. El texto ahí es la fuente única; esta nota no
lo repite para no tener dos sitios que puedan discrepar.
