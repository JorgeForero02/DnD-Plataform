# La iniciativa la tiran los jugadores, y el bando lo elige el DM

> Escrito el 2026-09-05, después de que el autor entrara en producción y se estancara en el primer
> combate. Diseño aprobado por él en sus cuatro secciones antes de escribirse.
>
> **Qué arregla.** Hoy el servidor tira la iniciativa de todo el mundo, incluidos los personajes de
> los jugadores, y **eso es una desviación del SRD**: la iniciativa es una prueba de Destreza que
> hace *cada participante*, y el DM tira **la de los monstruos**. Y hoy ningún combatiente puede
> tener bando, así que la mesa no distingue un aliado de un enemigo.
>
> **Por qué van juntos.** Los dos se deciden en la misma pantalla —el diálogo «Entrar en combate»—
> y los dos son la razón de que un combate se estanque. Separarlos obliga a tocar dos veces la
> misma pantalla y a pagar dos veces su prueba de navegador.

---

## 1 · Lo que hay hoy, medido

**Del lado del servidor está casi todo hecho, y esa es la noticia.**

| Pieza | Estado | Dónde |
|---|---|---|
| `sides` en la entrada de `start` | **hecho**, validado, rechaza claves ajenas con 400 | `packages/shared/src/encounter.schema.ts:70` |
| `Combatant.side` con su enum | **hecho**, `@default(NEUTRAL)` | `apps/api/prisma/schema.prisma:442` |
| Peticiones de tirada a varios personajes | **hecho**: clave derivada, modo, audiencia, inspiración, traza | `apps/api/src/roll-requests/` |
| Corregir una iniciativa | **hecho** | `EncountersService.setInitiative` |
| Modificador de iniciativa de una hoja | **hecho** | `CharacterSheetService.getInitiativeModifier` |
| Canal en vivo por campaña | **hecho y desplegado** | `apps/api/src/live/` |
| **Que alguien mande `sides`** | **NO existe** — cero pantallas lo escriben | — |
| **Que la iniciativa se pida** | **NO existe** — `start()` tira por todos | `EncountersService.start` |

**El bando es trabajo de pantalla, no de servidor.** El servidor lleva esperando desde el plan 02
(`41013cd`) a que alguien le mande el dato.

---

## 2 · El modelo

### `EncounterStatus` gana `PREPARING`

```
ACTIVE · ENDED   →   PREPARING · ACTIVE · ENDED
```

Un valor de enum de PostgreSQL **se añade, nunca se edita ni se borra**. Los encuentros existentes
siguen `ACTIVE` y no se migra ningún dato.

### El índice parcial hay que recontarlo — y es la trampa de esta tanda

Hoy, en `apps/api/prisma/migrations/20260904040055_encounters_and_initiative/migration.sql:64`:

```sql
CREATE UNIQUE INDEX "encounter_one_active_per_session"
  ON "Encounter" ("sessionId") WHERE "status" = 'ACTIVE';
```

Con `PREPARING` ese `WHERE` **se queda corto**: podría existir uno preparándose y otro activo en la
misma sesión, que es justo el lío que el índice impide. Pasa a:

```sql
WHERE "status" IN ('ACTIVE', 'PREPARING')
```

**Su prueba es e2e contra Postgres real, no unitaria.** Lo dice el propio esquema: *«una comprobación
en el servicio sería una carrera esperando a ocurrir en cuanto el DM tenga dos pestañas abiertas»*.

### `RollRequest` gana `encounterId String?`

**Nulo en toda petición normal, y a propósito**: una petición de percepción no viene de un combate y
no debe fingir que sí.

Compra tres cosas sin inventar un tipo nuevo ni un booleano `esIniciativa` —que mentiría el día que
haya otra petición ligada a algo—:

1. el encuentro sabe **a quién espera**: sus peticiones sin `resolvedAt`;
2. la pantalla del jugador sabe que **esta se presenta a lo grande**;
3. al responder se sabe **dónde escribir** el resultado.

### Lo que no cambia

`Combatant` se queda igual — su `initiative` ya es un entero corregible. `RollRequest` no gana
estado: `resolvedAt` nulo ya significa pendiente.

---

## 3 · El servidor

### `start()` se parte por quién lleva al personaje, y **el DM no es «alguien»**

```
Character cuyo dueño NO es el DM  ──►  petición de iniciativa
Character cuyo dueño SÍ es el DM  ──►  el servidor tira ya, como hoy
```

**La primera versión de este diseño decía «con dueño / sin dueño» y era falsa.** `Character.ownerId`
es **obligatorio** (`apps/api/prisma/schema.prisma:520`): un PNJ que crea el DM también tiene dueño
—el DM—, así que «tener dueño» no distingue nada y el servidor habría pedido iniciativa a los
goblins. Queda escrito porque el error es instructivo: **el campo existía y el criterio se dedujo de
su nombre en vez de su contenido.**

El criterio bueno cubre los tres casos sin excepciones:

| Personaje | Dueño | Qué pasa |
|---|---|---|
| El de un jugador | ese jugador | **se le pide** |
| Un PNJ o enemigo del DM | el DM | **tira el servidor** |
| Un PNJ **cedido a un jugador** | ese jugador | **se le pide** — y es lo correcto |

**Y no mira `statblockRef` a propósito**, aunque ese campo distingue a los PNJ instanciados
(`schema.prisma:597`). Un PNJ jugable **es una fila de `Character` como cualquier otra** desde 2D, y
quien lo lleva decide si tira, no de dónde salieron sus números. Deducirlo del tipo de ficha sería
el mismo error que `schema.prisma:440` ya advierte para el bando: *«ni el tipo de ficha ni la
visibilidad sirven»*.

**El DM no recibe petición ni siquiera si lleva un personaje propio.** Está delante, acaba de pulsar
el botón, y abrirle un panel modal encima del diálogo que acaba de cerrar sería absurdo. Si quiere
otro número, tiene «Corregir».

El encuentro nace **`PREPARING`** si queda alguien a quien pedir, y **`ACTIVE` directo** si el DM
combate solo contra PNJ — un caso real que no debe pagar una sala de espera vacía.

**Un jugador con varios personajes recibe una petición por cada uno.** Es como ya funciona
`roll-requests` y cada hoja tiene su modificador. Verá dos paneles seguidos: aceptado.

### Responder escribe la iniciativa, **en la misma transacción**

Si la petición trae `encounterId`, su resultado se copia a `Combatant.initiative` y se recolocan las
posiciones. **Dentro de la transacción que resuelve la petición.**

**Separarlas abre un instante en que la tirada existe y el orden no la conoce** — y con tres
jugadores respondiendo a la vez, ese instante da un orden distinto según quién llegó antes. Cuando
no queda ninguna pendiente, el encuentro pasa a `ACTIVE` solo.

### «Empezar igualmente» — y la frase importa tanto como el número

Ruta nueva, **solo para el DM**, comprobado en el servidor. Por cada petición sin responder: tira,
**anula la petición**, y escribe el suceso diciendo quién tiró y por qué.

```
Iniciativa · [demo] Brann
1d20+3 = 14
⤷ la tiró el sistema: Marta no respondió
```

### Cancelar **borra** el encuentro

Decisión del autor: un combate que nunca empezó **no es historia, es un clic deshecho**. Se borra
con sus peticiones por cascada, en vez de dejar un `ENDED` que llena el registro de ruido.

### El bando: nada que hacer, salvo poder rectificarlo

`start()` ya recibe y persiste `sides`. Lo único que se añade es **corregirlo con el combate en
marcha** —un aliado te traiciona al segundo asalto—, como ruta hermana de `setInitiative`. Sin ella
el bando sería la única decisión del combate que no se puede rectificar.

### Los avisos salen solos

La emisión vive **solo** en `GameEventsService.record`. «Te piden iniciativa», «fulano ya tiró» y
«empieza el combate» llegan por el canal del plan 12 **sin sondeo y sin escribir un camino nuevo de
recarga**. Es su primer trabajo real.

---

## 4 · Las pantallas

**Las tres se comparan con el prototipo antes de darlas por buenas.** El autor dice que el bando ya
está resuelto ahí, en la ficha del elenco al empezar el combate.

### `EmpezarCombate.tsx` — el diálogo del DM

**La frase que hoy miente.** Dice *«La iniciativa la tira el servidor»* y deja de ser cierta. **Si
el texto explica una regla del servidor y discrepan, miente el texto** — regla vinculante desde el
reseño del 2026-09-02.

**El bando, por fila, como radios con explicación** —no un desplegable—, que es la otra regla
vinculante: tres opciones con significado se ven todas a la vez.

**Con una sugerencia rellenada y visible**: el grupo propuesto `ALLY`, los PNJ de la mesa `ENEMY`.
Es lo que pasa nueve de cada diez veces, **y es una propuesta que el DM ve y cambia de un clic**, no
un valor oculto. El servidor sigue sin adivinar nada: decide la pantalla del DM, que es quien sabe.

```
EL GRUPO
  [demo] Sylas   Elfo · Mago       (•) aliado  ( ) enemigo  ( ) neutral
  [demo] Brann   Enano · Guerrero  (•) aliado  ( ) enemigo  ( ) neutral

PNJ EN LA MESA
  [demo] Klarg   18 PG             ( ) aliado  (•) enemigo  ( ) neutral
  Bandido        11 PG             ( ) aliado  (•) enemigo  ( ) neutral

4 combatientes · 2 tirarán su iniciativa   [ Cancelar ]  [ Pedir iniciativa ]
```

El botón pasa de «Tirar iniciativa» a **«Pedir iniciativa»**, que es lo que hace.

### `TiraDeIniciativa.tsx` — la sala de espera

Sustituye al orden de turnos mientras el encuentro está `PREPARING`. **Nombra al jugador, no al
personaje**: quien tarda es una persona y el DM necesita saber a quién mirar.

```
PREPARANDO COMBATE                              2 de 4

  [demo] Klarg     6   ✓
  Bandido          5   ✓
  [demo] Brann     …   esperando a Marta
  [demo] Sylas     …   esperando a Bruno

                         [ Cancelar ]  [ Empezar igualmente ]
```

Se actualiza sola por el canal en vivo, disparando invalidaciones que ya existen.

### El panel del jugador — en `roll-requests`, junto a `TiradasPendientes.tsx`

**Es una petición de tirada**; lo que cambia es cómo se presenta cuando trae `encounterId`.

```
╔═══════════════════════════════╗
║     EMPIEZA EL COMBATE        ║
║     Tira iniciativa           ║
║        ╭─────────╮            ║
║        │  1d20   │   +3       ║
║        ╰─────────╯            ║
║       [    TIRAR    ]         ║
╚═══════════════════════════════╝
```

Tres cosas que tiene que hacer bien:

- **El modificador se enseña ANTES de tirar.** El jugador debe ver con qué tira, no descubrirlo
  después. Sale de `getInitiativeModifier`.
- **No se puede cerrar sin tirar, pero no secuestra la aplicación**: puede seguir mirando su hoja.
- **Si tiene ventaja, se dice.** El modo lo fija la petición y ya viaja en ella.

Y respeta lo que `roll-requests` ya sabe: **gastar inspiración** si quiere, y la traza en el registro.

### Corregir el bando: en la ficha del elenco

Junto a «Daño» y «Condición», que es donde el DM ya toca a cada combatiente — **no** en el orden de
turnos, que es una tira estrecha y ya tiene el «Corregir» de la iniciativa. **Es donde el prototipo
lo pone.**

### Los enum, una sola vez

`ALLY`, `ENEMY`, `NEUTRAL` y `PREPARING` **no llegan crudos a la pantalla**. La forma legible se
escribe una vez por dominio y todo lo demás la importa. Ese fallo apareció tres veces en una mañana.

---

## 5 · Pruebas

### Unitarias de servidor

- **El reparto por dueño**: se pide a quien NO es el DM. Tres casos, y el tercero es el que se
  olvida: **un PNJ cedido a un jugador también recibe petición**, y uno del DM no.
- **`PREPARING` si queda alguien; `ACTIVE` directo si el DM combate solo contra PNJ.**
- Responder **escribe y recoloca**; la última respuesta **pasa a `ACTIVE`**.
- «Empezar igualmente» **tira, anula y escribe el motivo**.
- **Cancelar borra** el encuentro y sus peticiones.
- **Un jugador con dos personajes recibe dos peticiones.**

### e2e contra Postgres real — tres que no admiten dobles

1. **El índice parcial recontado**: un segundo encuentro con otro `PREPARING` falla **en la base**.
2. **La carrera**: tres respuestas simultáneas dan **un solo orden**, y el paso a `ACTIVE` ocurre
   **una sola vez**. Sin esta prueba, la decisión de la transacción **no está protegida**.
3. **Las tres puertas**: responder la petición de otro → 403 · «Empezar igualmente» sin ser DM →
   403 · corregir un bando sin ser DM → 403.

### Unitarias de web

El panel enseña el modificador antes de tirar · no se cierra sin tirar · la sala de espera cuenta
bien y nombra al jugador · **ningún enum llega crudo** (hay un barrido).

### Navegador — la que demuestra que funciona

**Un e2e con dos navegadores.** El DM pide iniciativa y **la pestaña del jugador enseña el panel sin
recargar**; el jugador tira y **el contador del DM baja solo**. Lo demás es fontanería.

### Mutaciones — obligatorias, estas cuatro

| Se rompe | Se pone roja |
|---|---|
| sacar la escritura de la transacción | la carrera de respuestas simultáneas |
| dejar que responda cualquiera | la puerta del 403 |
| que el servidor vuelva a tirar por los jugadores | el reparto por dueño |
| sacar `PREPARING` del `WHERE` del índice | el segundo encuentro se crea |

### Lo que estas pruebas NO cubren

**`jsdom` no maqueta.** Que el panel quepa, no tape la hoja y siga siendo usable **a 390 px** no lo
ve ninguna prueba de arriba: se mide en el navegador con números o no se sabe. Es lo que dejó 871
pruebas verdes con la mesa rota.

---

## 6 · Errores, y qué ve la persona

| Qué pasa | Qué se hace |
|---|---|
| Responder una petición **ya anulada** por «Empezar igualmente» | **409 con su motivo**: *«el combate ya empezó y tu iniciativa la tiró el sistema»*. No un 500 ni un silencio |
| El DM **cierra la pestaña** con el encuentro preparándose | Se queda `PREPARING`; al volver lo encuentra igual, con quien ya tiró dentro |
| Un jugador **pierde el canal** | El sondeo de 60 s sigue de red de seguridad: tarda más, pero llega |
| El personaje **sale de la mesa** con la petición pendiente | Muere con el combatiente, por cascada. Sin huérfanos |

---

## 7 · Lo que este trabajo NO hace

- **No termina el combate solo cuando no quedan enemigos.** Terminar es **decisión del DM**: un
  enemigo a 0 puede estar inconsciente, los enemigos huyen, y un combate se acaba parlamentando.
  Lo correcto es **proponerlo** —*«no queda ningún enemigo en pie, ¿terminamos?»*, como dice la
  doctrina de las Herramientas del DM: *«el sistema propone; tú decides»*— y eso **necesita el bando
  primero**, que es lo que esta tanda entrega. **Queda para después, con su decisión propia sobre
  qué cuenta como derrotado.**
- **No toca el agrupado de criaturas idénticas**: los seis goblins siguen actuando a la vez con una
  sola tirada.
- **No toca `setInitiative`**: corregir el número sigue siendo del DM.

## Definición de terminado

`pnpm verify` verde · el **e2e de dos navegadores corrido y mirado** · las **cuatro mutaciones**
probadas · las pantallas **comparadas con el prototipo** · y el panel del jugador **medido a 390 px
en el navegador**, no supuesto.
