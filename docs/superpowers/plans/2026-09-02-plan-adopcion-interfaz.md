# Plan de adopción de la interfaz — lo que volvió de Figma Make, y la mesa de juego

**Qué es esto y qué NO es.** No sustituye a
[el plan de la ronda de interfaz](./2026-09-02-plan-interfaz-y-contenido.md): lo **continúa**.
Aquel sigue siendo la fuente de las tareas H, R, T, L, E, C y Q; de sus 26, **12 están hechas**.
Este documento añade dos bloques nuevos —**F**, adoptar lo que volvió de Figma Make, y **M**, la
mesa de juego con mapa— y **coloca todo lo que queda en un orden**, porque ahora hay más piezas
que manos y el orden es la mitad del trabajo.

Lo que volvió está revisado, medido en un navegador, en
[la revisión de Figma Make](../specs/2026-09-02-figma-make-revision.md). Este plan **no repite**
esa revisión: la usa.

---

## 0 · De dónde sale cada cosa

Todo lo de aquí tiene un origen concreto, y conviene que se vea, porque el criterio para incluir
o dejar fuera ha sido ese y no el gusto:

| Origen | Qué pidió |
|---|---|
| **Encargo del autor, 2026-09-02** | Interfaz de inicio de sesión ✅ · hoja dinámica ✅ · sistema de eventos por bloques con tutorial (parcial) · que los tipos de ficha se diferencien ✅ · el jugador no debe verlo todo ✅ · línea de tiempo editable con rutas alternas · enlaces más entendibles ✅ · mejor diseño de la hoja en vitela · documentos y cuaderno del DM más completos · más razas y clases · QoL · **auditoría e2e final** |
| **Lo que volvió de Figma Make** | Seis cosas que copiar, listadas en la revisión, y una pregunta de arquitectura de información que su maqueta destapó |
| **Encargo del autor, hoy** | *«no quiero un juego plano; quiero que los jugadores vean el mapa, su hoja, sus tiradas y demás en una misma pantalla, con objetos interactivos renderizados y tiles»* |

---

## 1 · Las decisiones que bloquean

Las tres del plan anterior **siguen sin respuesta** —D1 contenido fuera del SRD, D2 editor de
documentos, D3 alcance de la línea de tiempo— y bloquean C1–C3, E1–E3 y T2. No se repiten aquí;
están en su sitio.

Se añade una cuarta, y es la más grande que ha tenido este proyecto.

### D4 · Qué es la mesa de juego, y dónde entra

El plan maestro dice hoy **«mapa 2D: imagen subida, pines que enlazan a fichas, niebla, capa del
DM y capa del jugador»**. Eso es un documento con chinchetas. Lo que se pide es un **tablero**.
No es la misma tarea con más pulido: es otra cosa, y arrastra tres que hoy no existen.

**Lo que arrastra, y no se puede esquivar:**

- **Posiciones.** Un personaje **no tiene coordenadas** en el modelo. La fase 2A resolvió las
  distancias **sin posiciones a propósito**, y esa decisión está escrita. Un tablero las exige.
- **Tiempo real.** Una ficha que se mueve y solo la ve quien la movió no sirve para nada. Eso es
  la fase 4 entera: WebSocket, presencia, quizá Redis.
- **Almacenamiento de ficheros.** Tiles, sprites y mapas son ficheros, y hoy no hay dónde
  guardarlos. Es la fase 3, que introduce S3/MinIO y el modelo `Asset`.

**Y una pregunta que no es técnica, es de producto:** la niebla de guerra **es `canView` aplicado
a coordenadas**, y `canView` no sabe nada de coordenadas. **La posición de una ficha enemiga es
información exactamente igual que su Clase de Armadura: si no se debe saber, no se envía.** Un
tablero que manda todas las posiciones al navegador y tapa unas cuantas con un rectángulo negro
**no tiene niebla de guerra, tiene una cortina**, y cualquiera con la consola abierta ve el mapa
entero. Esto no es una precaución: es la regla que gobierna el producto desde el primer día.

**Las tres salidas:**

- **(a) La mesa sustituye a la fase 3.** Se salta el «mapa con pines» y se va directo al tablero.
  Es lo que el autor quiere ver, y es lo más caro: no hay nada de esto construido.
- **(b) La fase 3 se hace como está, y la mesa va después.** Se entrega antes algo usable —una
  imagen con pines y niebla ya sirve en una partida real— y el tablero se construye encima,
  reutilizando el almacenamiento y la biblioteca.
- **(c) Un tablero mínimo primero, sin tiempo real:** rejilla, fichas movibles y la hoja al lado,
  **con las posiciones guardadas en el servidor y recargando**. Sirve para jugar en la misma
  habitación, que es la mesa del autor, y aplaza la fase 4.

**Mi recomendación es (c), y luego (b).** Razón: (c) entrega la pantalla que se pide —mapa, ficha
y tiradas juntas— en semanas y no en meses, permite descubrir la parte difícil (la visibilidad
por coordenadas) con poco código encima, y **no compromete** la elección de tiempo real. La
partida real de la semana que viene es presencial; un tablero que se refresca al recargar es
suficiente para esa mesa y no lo sería para una remota.

**Hasta que D4 se responda, el bloque M no se dibuja.** Lo que sí se puede hacer sin respuesta es
M0, que es investigación, y M1, que es la decisión de modelo — y ambas hacen falta con cualquiera
de las tres salidas.

---

## 2 · Bloque F — adoptar lo que volvió

Barato, concreto y con el beneficio más inmediato de todo el plan. Nada de aquí depende de una
decisión pendiente.

| # | Tarea | Frontera | Depende |
|---|---|---|---|
| **F1** | **La regla, leída como una frase**, siempre visible bajo los carriles: «*Cuando* Cae a 0 puntos de golpe, *si* Es un personaje jugador, *entonces* Marca «inconsciente».», con cada conector coloreado según su parte y **la caja vacía dicha en palabras** («…*entonces* — falta el efecto»). Es la respuesta directa al «no entendió nada» del DM: si no se puede leer en voz alta, el editor ha fallado | `features/rules/**` | — |
| **F2** | **Los carriles, en horizontal.** Uno junto a otro, con su rótulo y su glosa —«pasa algo (un suceso)», «se cumple (un estado)», «haz esto (un efecto)»—, para que la frase se lea de izquierda a derecha **porque está dispuesta como se lee**. En pantalla estrecha se apilan, en ese mismo orden | `features/rules/**` | F1 |
| **F3** | **Los dos dados, con el descartado a la vista.** Ventaja y desventaja como decisión de tres estados; se pintan los dos resultados con el descartado tachado y el rótulo «se queda el alto»; y el desglose `17 = 12 dado +3 destreza +2 competencia`. **Adelanta la parte visual de 2C** sin tocar el motor: el azar sigue viviendo en el servidor | `features/character-sheet/TirarBoton.tsx`, `features/rolls/**` (nuevo) | — |
| **F4** | **Las condiciones dicen qué hacen**, en una línea bajo el nombre: «Apresado · Velocidad 0. No se beneficia de bonos a la velocidad.» En la mesa se consulta cada dos minutos y ahorra abrir el manual. **El texto es del SRD y va con su atribución** | `features/character-sheet/Condiciones.tsx`, `apps/api/src/rules/catalog/` | — |
| **F5** | **Los avisos ofrecen el arreglo, no lo señalan.** «Nadie deshace esta marca. ¿Añades una regla que la quite al acabar el combate? **Añadir reversión**», y el enlace **hace** la regla. Es **R2 con mejor forma**, así que R2 se ejecuta con esta forma y no con la que traía el plan anterior | `features/rules/**`, `apps/api/src/rules-engine/` | F1 |
| **F6** | **La burbuja del tutorial como línea de pie**, no como globo que tapa: «Arrastra una pieza de Efectos a la ranura ENTONCES para terminar la regla». No se puede cerrar y **se cierra sola al hacer la acción**. Es **R3 con mejor forma** | `features/rules/**` | F1 |
| **F7** | **Arquitectura de información con las fases dentro.** La maqueta llegó a **veinticinco entradas** en la barra lateral porque puso todas las fases a la vez; la nuestra tiene once y funciona. Decidir y escribir **cómo crece**: qué se agrupa, qué aparece solo cuando la fase existe, y **qué NO se enseña deshabilitado** —lo que no está hecho no se anuncia con un candado— | `pages/CampaignDetailPage.tsx`, `docs/04-convenciones.md` | — |
| **F8** | **«Ver como» a nivel de campaña**, extendiendo lo que ya existe en la mesa. **Y con el mecanismo correcto:** no es un interruptor de maqueta que pinta distinto, es **la misma petición al servidor con otro espectador**, así que el DM ve *menos*. Copiar el gesto, jamás el mecanismo | `features/campaigns/**`, `apps/api/src/**` | — |

**Criterio de aceptación del bloque:** un DM que no ha visto nunca el editor arma una regla
completa **leyendo la frase**, sin abrir ayuda. Y una prueba de navegador que compruebe que la
frase concuerda con las cajas —si discrepan, **miente la frase**, y una frase que miente sobre lo
que hace el servidor es peor que no tenerla.

---

## 3 · Bloque M — la mesa de juego

**Todo el bloque salvo M0 y M1 está bloqueado por D4.**

| # | Tarea | Frontera | Depende |
|---|---|---|---|
| **M0** | **Estudio de mesas virtuales**, con los ojos en lo que aquí importa: cómo resuelven la niebla **en el servidor** (y quién la resuelve en el cliente, que es el error a no copiar), cómo se mueven las fichas, qué formato de tiles se importa, y qué hace cada una cuando el jugador está en el móvil. Salida: un documento con la elección de rejilla y de formato, no un catálogo | `docs/superpowers/specs/` | — |
| **M1** | **Las posiciones en el modelo**, decididas y escritas antes de dibujar nada: quién tiene coordenadas (una ficha, no un personaje), en qué espacio, qué pasa con dos tableros a la vez, y **cómo se filtra una posición por `canView`**. Es un contrato, y lo escribe el orquestador | `packages/shared/`, `apps/api/prisma/`, `docs/05-datos.md` | M0 |
| **M2** ⛔ | **El tablero.** Rejilla, la imagen de fondo, desplazar y acercar. Sin fichas todavía | `features/mesa/**` (nuevo) | D4, M1 |
| **M3** ⛔ | **Las fichas y el movimiento.** Arrastrar sobre la rejilla, con el retrato del personaje. **El servidor valida el movimiento**; el cliente lo pinta | `features/mesa/**`, `apps/api/src/mesa/` | M2 |
| **M4** ⛔ | **La niebla, resuelta en el servidor.** Lo que el jugador no debe ver **no se le envía**. La prueba que lo demuestra no es visual: es una petición como jugador cuya respuesta **no contiene** la ficha oculta | `apps/api/src/mesa/`, `common/visibility.ts` | M3 |
| **M5** ⛔ | **La pantalla de juego completa**: tablero al centro, **la hoja a un lado y las tiradas dentro**, sin cambiar de pantalla. Es lo que se pidió, y solo tiene sentido cuando M2–M4 existen | `features/mesa/**` | M4 |
| **M6** ⛔ | **Objetos interactivos**: puertas, cofres, trampas. Un objeto del tablero **es una ficha del mundo** con posición, así que se abre y se lee como cualquier otra | `features/mesa/**`, `features/entities/` | M5 |
| **M7** ⛔ | **Importar tiles.** Formato estándar, nunca un editor propio: la decisión de la fase 3 —**no se construyen editores de arte**— sigue en pie y aquí también | `apps/api/src/assets/` | Fase 3 |

**Criterio de aceptación del bloque:** una partida real jugada sobre él. Y **la prueba que de
verdad importa**: abrir la consola del navegador de un jugador y **no encontrar** la posición de
lo que está bajo la niebla.

---

## 4 · Lo que queda vivo del plan anterior

No se reescribe; se ordena. Sigue siendo suyo el detalle.

| Bloque | Queda | Estado |
|---|---|---|
| **H** — la hoja | **H4** la hoja en vitela | Libre. Es el «mejor diseño de la hoja rasgada» que pidió el autor |
| **R** — reglas | **R2** y **R3** | **Se ejecutan como F5 y F6**, con la forma que volvió de la maqueta |
| **T** — línea de tiempo | **T1** prototipo, **T2** el grafo | T1 libre; T2 ⛔ por D3 |
| **L** — enlaces | — | Cerrado |
| **E** — documentos | **E1**, **E2**, **E3** | ⛔ por D2. E0 ya dio su veredicto |
| **C** — contenido | **C1**, **C2**, **C3** | ⛔ por D1 |
| **Q** — calidad de vida | **Q3** a **Q7**, y **AUD** | Libres. AUD es la auditoría e2e final que pidió el autor |

---

## 5 · El orden

**Primera tanda — ahora, sin decisiones pendientes, y en paralelo:**

1. **F1 + F2** (la frase y los carriles) — `features/rules/**`
2. **F3** (los dados) — `features/character-sheet/TirarBoton.tsx` + `features/rolls/**`
3. **F4** (las condiciones) — `Condiciones.tsx` + catálogo de la API
4. **H4** (la hoja en vitela) — `features/character-sheet/*.tsx`, `ui/tokens.css`
5. **M0** (el estudio de mesas virtuales) — solo escribe en `docs/`

Cinco frentes, cinco fronteras que no se tocan, que es el techo declarado.

**Segunda tanda:** F5 y F6 (necesitan F1), F7 y F8, Q3–Q7, T1, y **M1** cuando M0 haya vuelto.

**Tercera tanda:** lo que las decisiones desbloqueen, y **M2 en adelante si D4 sale por (c)**.

**Y al final, AUD**, la auditoría e2e, que es lo último por definición: auditar un blanco en
movimiento no vale para nada.

---

## 6 · Las reglas de esta ronda

Las mismas que la anterior, porque funcionaron, y una nueva que sale de lo que pasó anoche.

- **Cinco agentes como techo**, cada uno con su frontera de ficheros escrita en el encargo.
- **Playwright serializado.** Los agentes **escriben** las pruebas de navegador; **las corre el
  orquestador** al recogerlos. Anoche eso encontró los dos únicos fallos de la tanda, y ninguno
  lo habría visto la suite unitaria.
- **El orquestador escribe** migraciones, contratos de `packages/shared`, cableado y
  documentación. Un agente que necesite tocar eso **se para y lo propone**.
- **Prueba de mutación obligatoria** por comportamiento nuevo. Si no se pone roja, la prueba no
  vale.
- **Nada de `--no-verify`.**
- **Nunca `git checkout` sobre un fichero con cambios sin commitear** para deshacer una mutación:
  no revierte la mutación, revierte al último commit. Nos mordió dos veces anoche —a un agente y
  al orquestador—, y las dos veces hubo que reescribir trabajo. Se copia el fichero antes y se
  restaura la copia.
- **Lo que no se puede demostrar, se dice.** El arrastre del editor de reglas no está probado en
  navegador y **puede que no funcione**; está declarado en `06-pendientes.md` en vez de
  disimulado. Una prueba que pasa en verde tanto si la función va como si no va **no prueba
  nada**, y se retira.
