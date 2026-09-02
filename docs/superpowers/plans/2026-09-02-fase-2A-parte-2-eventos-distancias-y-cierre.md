# Fase 2A · Parte 2 — eventos, distancias, y las decisiones que faltaban · 2026-09-02

> **Qué es esto.** [El plan de 2A](./2026-09-01-fase-2A-motor-y-hoja-de-personaje.md) cubría el
> motor de reglas de 5.ª edición y la hoja de personaje: once tareas y **ocho preguntas sin
> responder**. Después el autor pidió tres cosas más —el sistema de eventos «por cajas», el
> sistema de distancias, y una bandeja de notificaciones— y se marchó a la universidad dejando
> la fase en marcha.
>
> Este documento **completa el plan**: falla las ocho preguntas, añade las seis tareas nuevas,
> fija el orden final de las diecisiete, y **nombra los once huecos** que aparecieron al juntar
> todo. Se lee **después** del plan original, no en su lugar.

---

## 1 · Las ocho preguntas, falladas

El autor autorizó expresamente decidir en su ausencia (*«cualquier decisión tú la tomas»*). Cada
fallo dice **qué se decide, por qué, y qué cuesta si está mal**, para que revisarlo sea barato.

| | Pregunta | Fallo | Por qué, y qué cuesta si me equivoco |
|---|---|---|---|
| **1** | ¿Se aprueba el modelo de estado (sesión con estado + columnas + log `GameEvent`)? | **Sí** | Es el mismo modelo que el sistema de eventos necesita, así que ahora tiene **dos clientes** y no uno. Si estuviera mal, se paga en 2A.5 y se nota enseguida — antes de que nada dependa de él |
| **2** | ¿Deltas atómicos para daño y curación, y `expectedVersion` + 409 solo para las correcciones del DM? | **Sí** | Perder una curación porque dos personas escribieron a la vez es el fallo que nadie reproduce y todo el mundo recuerda. El coste de equivocarse es un 409 de más en un caso raro; el de no hacerlo, un jugador muerto por una carrera |
| **3** | ¿Las tiradas de creación las ejecuta el servidor y quedan en el log, ya en 2A? | **Sí** | Es la decisión que hace posible el disparador «una tirada falla» del sistema de eventos (§2.4). Sin tiradas del servidor, ese disparador no existe. Si sobra, sobra poco: es un endpoint |
| **4** | ¿Dónde vive el catálogo SRD? | **(a) TypeScript versionado** | El motor sigue puro y el diff es revisable en una revisión de código. Cambiar a filas sembradas después es una migración de datos, no un rediseño |
| **5** | PG al subir de nivel: ¿media fija por defecto, tirar configurable? | **Sí** | Es lo que hace la mayoría de las mesas y no cierra la puerta a lo otro |
| **6** | ¿Permisos por campo fuera de 2A, salvo el caso estrecho de `grantedBy: DM_ONLY`? | **Sí** | 2A ya es grande. El caso estrecho cubre lo que 2A necesita de verdad |
| **7** | ¿Se traducen al español los nombres y textos del SRD? | **Sí**, indicando la modificación en la atribución | La interfaz es en español por norma del proyecto; media traducción es peor que ninguna. CC BY 4.0 lo permite **si se dice**, y eso va en el aviso |
| **8** | ¿El autor monta un personaje real y lo mira diez minutos al cerrar 2A? | **Sí, y es parte de la tarea** | Descubrir ahí que la hoja está mal pensada cuesta una tarde; descubrirlo con el inventario encima cuesta 2B entera |

**Y las cuatro decisiones de forma que seguían abiertas** desde
[el informe de huecos de la fase 2](../specs/2026-09-01-huecos-fase-2-design.md), porque
cambian una tabla y no se pueden dejar para después:

| Hueco | Fallo | Por qué |
|---|---|---|
| **Casillas de equipo (manos)** | **Se modela en 2B**, pero la **columna existe desde 2A**: `Character.equippedSlots` vacía | La CA y el ataque dependen de qué llevas en cada mano. Reservar la forma cuesta una columna; añadirla después de que existan mil personajes cuesta una migración con datos |
| **Descansos y dados de golpe** | **Entran en 2A** | El descanso ya está en el log (`REST_DECLARED`) y los dados de golpe son un recurso consumible, que 2A ya construye (2A.8). Es casi gratis y sin ellos la hoja miente |
| **PG temporales** | **Entran en 2A**, como columna propia | No se suman a los PG: se gastan primero. Modelarlos como un número sumado es el error clásico y luego no se deshace |
| **Pericia (*expertise*)** | **Entra en 2A**, como tercer estado por habilidad | Un booleano «tiene competencia» no puede representarla, y cambiar un booleano por un enum con filas escritas es exactamente la migración que se evita decidiendo ahora |

---

## 2 · Las seis tareas nuevas

Numeradas a continuación de las once del plan original.

### 2.1 · Tarea 2A.12 — velocidades, condiciones y velocidad efectiva

**Entrega.** Las velocidades del personaje (andar, trepar, nadar, volar, excavar) en columnas;
un modelo **mínimo** de condiciones (tabla propia, clave de una **lista cerrada** del SRD,
aplicada y quitada por el DM o el dueño, **sin automatización**); y la **velocidad efectiva
derivada con su traza**: *«15 pies: base 30, derribado (mitad)»*.

Cifras y reglas exactas en
[la especificación de distancias](../specs/2026-09-02-distancias-y-movimiento-design.md).
**Se guarda en pies**; los metros son presentación.

**Prueba.** Unitaria por condición con su cifra del SRD (derribado, agarrado, apresado,
paralizado, inconsciente, aturdido, petrificado, y los seis niveles de agotamiento); dos
condiciones a la vez (**la que deja la velocidad a 0 gana**, no se multiplican mitades); y la
traza nombra **todas** las causas, no solo la primera.

**No toca.** Alcances de conjuros (2B), posiciones (fase 3).

> **Hueco H1, resuelto aquí:** el plan original dejaba las condiciones en 2C, pero la velocidad
> efectiva las necesita. Entra **el modelo**, no la automatización: 2C añadirá que se apliquen
> solas, sobre una tabla que ya existirá.

### 2.2 · Tarea 2A.13 — tirar de verdad: endpoint, registro y resultado

**Entrega.** `POST /campaigns/:id/rolls`: el servidor tira con el evaluador de 2A.1, escribe un
`GameEvent` de tipo `ABILITY_ROLL` con **la expresión, los dados, lo conservado, lo descartado,
el total, la CD si la había y el resultado** (falla / supera / 1 natural / 20 natural), y lo
devuelve. Visibilidad del evento elegida por quien tira.

**Por qué es una tarea y no un detalle.** Es lo que hace posibles **las tiradas de creación**
(2A.6), **el disparador de tirada** del sistema de eventos, y **la línea de tiempo** de la
sesión. Tres cosas dependen de ella.

**Prueba.** e2e con Postgres real: un jugador tira, el DM lo ve en el log; una tirada `DM_ONLY`
**no** aparece en el `GET` del jugador. Unitaria: el resultado se clasifica bien en los cuatro
casos, y **un 20 natural con la CD sin alcanzar sigue siendo un 20 natural** (son dos hechos
distintos, no uno).

### 2.3 · Tarea 2A.14 — bandeja de notificaciones

**Entrega.** Tabla `Notification` (destinatario, tipo, sujeto, leída, fecha), alimentada por los
eventos de dominio que **ya se emiten y nadie escucha** (`campaign.member_joined`,
`entity.created`…) y por los nuevos. Bandeja en la cabecera, con su contador. **Sin tiempo
real**: se pide al cargar y al cambiar de pantalla.

**Por qué está en 2A y no antes.** Porque el efecto «avisar» del motor de eventos no tiene
dónde escribir sin ella, y sin «avisar» el modo propuesta (§2.5) no puede existir.

**Prueba.** e2e: el DM invita, el jugador acepta, **y al DM le aparece una notificación**;
marcarla leída no se lo notifica a nadie más; un jugador no ve las notificaciones de otro.

### 2.4 · Tarea 2A.15 — marcas, conjuntos y sucesos del mundo

**Entrega.** `CampaignFlag` (marcas con nombre) y `CampaignSet` + `CampaignSetMember`
(conjuntos con nombre). Persistir como `GameEvent` los sucesos que el motor necesita escuchar:
`ENTITY_OPENED`, `ENTITY_REVEALED`, `ENTITY_LINKED`, `FLAG_SET`, `SET_CHANGED`, `SIGNAL_RAISED`.

**Prueba.** e2e: abrir una ficha escribe su suceso; el suceso es `DM_ONLY` (ver hueco **H3**);
añadir dos veces el mismo elemento a un conjunto **no lo duplica** (los efectos son
idempotentes, §2.5 del diseño).

### 2.5 · Tarea 2A.16 — el motor de reglas

**Entrega.** Todo lo diseñado en
[el sistema de eventos](../specs/2026-09-02-sistema-de-eventos-design.md): modelo `Rule`
(suceso + condiciones + efectos, JSON validado por una unión discriminada de Zod), evaluación al
escribir un `GameEvent`, **encadenamiento con tope de 10 saltos**, **orden por especificidad con
desempate declarado**, **modo automático o propuesta**, la tabla de traza con el **antes y el
después de cada efecto** (para poder deshacer), y el **ensayo en seco**.

**Prueba.** Unitarias del motor **puras**, sin base de datos, con sucesos de mentira: el
encadenamiento llega hasta donde debe y **se corta en el salto 11 dejándolo escrito en la
traza**; dos reglas en conflicto se ordenan por número de condiciones y **el empate se marca
como conflicto en vez de resolverse a escondidas**; un efecto aplicado dos veces deja el mismo
estado. e2e: una regla en **modo propuesta no cambia nada** hasta que el DM la aplica.

### 2.6 · Tarea 2A.17 — la pantalla del motor

**Entrega.** La frase de tres partes («CUANDO / SI / ENTONCES»), la lista de reglas de la
campaña, la **bandeja de propuestas**, la **traza** («¿por qué se reveló esto?») con su botón de
deshacer, y el ensayo en seco.

**Prueba.** Playwright con dos contextos: el DM arma una regla en modo propuesta, **el jugador
abre la ficha**, el DM ve la propuesta, la aplica, **y entonces** el jugador ve lo revelado — no
antes. Ese recorrido, si se revierte el modo propuesta, **falla**.

---

## 3 · El orden final: diecisiete tareas

El criterio no ha cambiado: **lo que no toca base de datos ni red va primero**, y nada depende
de algo que aún no existe.

| # | Tarea | Depende de |
|---|---|---|
| 1 | **2A.1 · Evaluador de dados** ✅ *hecho el 2026-09-02* | — |
| 2 | 2A.2 · Motor de 5.ª edición: núcleo determinista y traza | — |
| 3 | 2A.3 · Catálogo SRD 5.1 y su verificación | 2A.2 |
| 4 | 2A.4 · Elecciones pendientes y avisos | 2A.2 |
| 5 | 2A.5 · Estado de partida: sesión con estado y log `GameEvent` | — |
| 6 | **2A.13 · Tirar de verdad: endpoint y registro** | 2A.1, 2A.5 |
| 7 | 2A.6 · La hoja persistida: características, raza, clase, creación con tiradas | 2A.3, 2A.13 |
| 8 | 2A.7 · PG mutables: deltas, concurrencia y su rastro | 2A.5, 2A.6 |
| 9 | 2A.8 · Recursos consumibles, **descansos y dados de golpe** | 2A.7 |
| 10 | **2A.12 · Velocidades, condiciones y velocidad efectiva** | 2A.6 |
| 11 | 2A.9 · Subida de nivel: diff propuesto, jugador que confirma | 2A.6 |
| 12 | 2A.10 · La pantalla de la hoja: valores, traza y avisos | 2A.6, 2A.12 |
| 13 | **2A.14 · Bandeja de notificaciones** | 2A.5 |
| 14 | **2A.15 · Marcas, conjuntos y sucesos del mundo** | 2A.5 |
| 15 | **2A.16 · El motor de reglas** | 2A.15, 2A.14, 2A.13 |
| 16 | **2A.17 · La pantalla del motor** | 2A.16 |
| 17 | 2A.11 · La pantalla de subida de nivel y el cierre de 2A | 2A.9, 2A.10 |

**Si no da tiempo a todo**, el corte natural es después de la 12: la hoja de personaje queda
entera y utilizable, y el motor de eventos entra en una segunda tanda. Lo que **no** se parte
por la mitad es el bloque 14–16: un motor sin pantalla no lo puede usar nadie, y una pantalla
sin motor es una mentira.

---

## 4 · Los once huecos encontrados al completar el plan

Aparecieron al juntar el plan original con lo que pidió el autor. **Cinco están resueltos aquí**
y **seis siguen abiertos**; los abiertos van también a
[06-pendientes](../../06-pendientes.md) para que no vivan solo en este documento.

| | Hueco | Estado |
|---|---|---|
| **H1** | Las condiciones vivían en 2C, pero la velocidad efectiva las necesita | **Resuelto**: modelo mínimo en 2A.12, automatización en 2C |
| **H2** | Nada ejecutaba una tirada: 2A.1 solo evalúa | **Resuelto**: tarea 2A.13 |
| **H3** | **Registrar «quién abrió qué ficha» es vigilancia** | **Resuelto con condiciones, y el autor puede revocarlo**: el suceso se guarda con visibilidad `DM_ONLY`, es de la campaña y no del sistema, y **la interfaz avisa al jugador de que abrir una ficha puede disparar reglas**. Un DM ya ve todo lo suyo; lo que no puede pasar es que el jugador no lo sepa |
| **H4** | El efecto «avisar» no tenía dónde escribir | **Resuelto**: tarea 2A.14 |
| **H5** | Deshacer un efecto exige saber cómo estaba antes | **Resuelto**: la traza guarda **antes y después** de cada efecto. Es barato al escribirla y carísimo de añadir luego |
| **H6** | **¿Con qué autoridad escribe una regla?** Si un jugador abre una ficha y eso revela algo, el jugador no podía hacer esa escritura | **Abierto, con propuesta**: los efectos se aplican **con la autoridad del DM que armó la regla**, y la traza lo dice así. Necesita revisión de seguridad propia antes de 2A.16 |
| **H7** | Una regla que apunta a una ficha **borrada** | **Abierto**: la regla queda **rota y marcada**, nunca se descarta en silencio. Falta decidir si se puede seguir armando |
| **H8** | El motor evalúa **dentro de la petición** que escribió el suceso | **Abierto**: con 10 saltos y varias reglas, una petición de lectura puede tardar. Propuesta: síncrono con tope, y cola si se mide que molesta. **Hay que medirlo, no suponerlo** |
| **H9** | Las propuestas caducan | **Abierto**: una propuesta de hace tres sesiones es ruido. Falta decidir el plazo |
| **H10** | Las formas de área (cono, esfera, línea…) las necesitan el motor (2A) y los conjuros (2B) | **Abierto, con propuesta**: la forma vive en `@dnd/shared` desde 2A, aunque en 2A no alcance a nadie |
| **H11** | **Ninguna prueba ata el texto de la interfaz a `canView`** | **Abierto** (ya estaba como U10 en 06): las frases de visibilidad ya mintieron una vez |

---

## 5 · Cómo se trabaja esto en ausencia del autor

Acordado el 2026-09-02: el autor deja el ordenador encendido y **no está disponible**.

- **Un commit por tarea**, con `pnpm verify` limpio, sus pruebas en verde y la documentación en
  el mismo commit. Sin excepciones por ir con prisa.
- **Cada decisión que no estaba escrita se falla y se anota** aquí o en 06, con su motivo y su
  coste. No se para a preguntar.
- **Se despliega por tandas.** Lo que esté terminado y probado sube; lo demás espera.
- **Nada de subagentes para implementar.** Investigar un hueco concreto, sí; escribir el código
  de una tarea, no — es lo que agota el presupuesto de la sesión sin que se note.
- **Si una tarea resulta estar mal planteada**, se para *esa* tarea, se anota por qué, y se pasa
  a la siguiente que no dependa de ella. No se improvisa un rediseño a las cuatro de la mañana.
