# Pendientes cerrados — archivados el 2026-09-06 (paso 1, «las goteras»)

**Congelado. Nada de aquí se edita.** Son las fichas que `docs/06-pendientes.md` cerró durante la
ejecución del plan
[`superpowers/plans/2026-09-06-paso-1-goteras.md`](../superpowers/plans/2026-09-06-paso-1-goteras.md).
Se conservan por si algo se reabre y hace falta saber cómo se cerró la vez anterior.

Continúa a
[`pendientes-cerrados-hasta-2026-09-05.md`](./pendientes-cerrados-hasta-2026-09-05.md).

**La regla, sin criterio de nadie:** lo tachado sale, lo abierto se queda, y cada ficha se mueve
**entera** — nunca se resume. Los identificadores **no se reciclan**.

**Lo que la tarea 0 de ese plan enseñó, y por eso se guarda:** las dos fichas de abajo describían
como pendiente algo que la tanda de la noche anterior ya había entregado. Las dos traían su
evidencia citada, cierta el día que se escribió. **Es el mismo patrón que ya archivó siete fichas
el 2026-09-05**, así que no es un descuido puntual: una ficha se cierra en el commit que la cierra,
o nadie la cierra.

---

## ~~P1 · El ataque comparado contra la CA existe en el servidor y ninguna pantalla lo llama~~ — **CERRADA el 2026-09-06**

**La cerró la tarea 13 del plan de la iniciativa, y esta ficha se quedó describiendo como pendiente
algo ya hecho.** Comprobado el 2026-09-06 abriendo los ficheros, no de memoria:
`apps/web/src/features/character-sheet/api.ts:563` exporta `resolveAttack` y
`apps/web/src/features/character-sheet/hooks.ts:397` lo llama; el barrido que la ficha citaba en
cero da hoy siete apariciones, incluidas las de
`apps/web/src/features/character-sheet/__tests__/TirarAtaqueBoton.test.tsx`. **El «cierra cuando» se
cumple**: el jugador elige a quién ataca desde el cuadro de ataques y el resultado dice si acierta.

<details><summary>Lo que decía la ficha (2026-09-05)</summary>

**Encontrado por el autor usando la aplicación, y es la tercera vez que aparece este patrón en un
día.** El servidor sabe resolver un ataque contra un objetivo:

- `apps/api/src/characters/character-sheet.controller.ts:137` — `@Post("sheet/attacks/:attackKey/resolve")`
- `packages/shared/src/attack.schema.ts:52` — `targetCharacterId: z.string().cuid()`
- y el motor de reglas escucha `CHARACTER_ATTACKED` (`apps/api/src/rules-engine/engine/matching.ts:40`).

**Y nadie lo llama.** Barrido del 2026-09-05 sobre `apps/web/src`: **cero** apariciones de
`resolveAttack` o `attacks/resolve`, y el único `targetCharacterId` que manda el navegador es el de
**Ayudar** (`apps/web/src/features/sessions/elenco/AyudarA.tsx:71`).

**Lo que eso significa en la mesa:** el botón de atacar **solo tira dados**. El jugador saca un 17 y
se lo dice al DM de viva voz, que decide de cabeza si acierta. La comparación contra la CA, la
traza, el crítico y el suceso que dispara las reglas **están construidos y no se usan**.

**Ojo con la ficha vieja.** «El ataque es un oráculo sobre la CA» se dio por cerrada con el plan 03,
y se cerró **la mitad del servidor**: la pantalla nunca llegó. Es el mismo cierre a medias que ya se
declaró cuatro veces —servidor hecho, nadie que lo dispare—.

**Cierra cuando** el jugador pueda elegir a quién ataca desde el cuadro de ataques y el resultado
diga si acierta.

</details>

## ~~P3b · Un cuadro de ataques vacío no dice por qué está vacío~~ — **CERRADA el 2026-09-06**

**La cerró la tarea 15 del plan de la iniciativa.** Comprobado el 2026-09-06 abriendo el fichero:
`apps/web/src/features/character-sheet/AtaquesYLanzamiento.tsx:157-170` explica el hueco con las
palabras que la ficha pedía —«No llevas ningún arma equipada… Equipa un arma en la **bolsa**»— y
enlaza a `#inventario`, que es la misma hoja y no otra pantalla. **No inventa ataques**: la nota de
`attack.spell` solo aparece si el motor ya derivó uno.

> **Y le cambia el identificador.** Esta ficha nació como `P3` y había **otra `P3`** cuarenta líneas
> más arriba —«no faltaba curar, faltaba el gesto rápido del elenco»—: dos fichas distintas con la
> misma etiqueta. Se renombra a `P3b` al cerrarla para que la referencia no sea ambigua en el
> archivo.

<details><summary>Lo que decía la ficha (2026-09-05)</summary>

**No es un fallo: es una explicación que falta**, y confundió al autor hasta hacerle pensar que
faltaba una opción de su clase.

Los ataques **no se escogen, se derivan de lo equipado** — `apps/api/src/rules/attacks.ts` lo dice en
su cabecera: *«entra qué hay equipado más lo que ya derivó el motor; sale, por cada arma, el bono de
ataque con su traza»*. Es el SRD y está bien.

Pero un personaje sin arma en la mano ve **un cuadro vacío y ningún motivo**, y de ahí se deduce
«esta pantalla no me deja elegir ataques», que es exactamente lo contrario de lo que pasa.

**Cierra cuando** el cuadro vacío diga qué falta y por dónde se arregla —«no llevas ningún arma
equipada; equipa una desde la Bolsa»—, sin inventarse ataques que el SRD no da.

</details>


---

## ~~`RollRequestsService.list` corta en 50 sin filtrar por encuentro~~ — **CERRADA el 2026-09-06** (paso 1, tarea 17)

**Cerrada por las dos mitades, que es lo que hacía falta.** En el servidor,
`apps/api/src/roll-requests/roll-requests.service.ts` acepta `encounterId` y filtra por él —**sin
subir el `take`**, que solo movería el problema más lejos—; en la pantalla,
`apps/web/src/features/encounters/TiraDeIniciativa.tsx` lo **manda** en vez de filtrar en el
cliente, que es lo que no podía recuperar lo que el servidor ya había recortado.

Probado contra Postgres (`apps/api/test/peticion-de-tirada.e2e-spec.ts`): con la petición del
combate escrita primero y sesenta sueltas después, **sin filtro no está en la lista** —el fallo,
que sigue ahí— y **con filtro sí**. Mutación: quitar el filtro devuelve 50 donde la prueba espera 1.

<details><summary>Lo que decía la ficha (2026-09-06)</summary>

`apps/api/src/roll-requests/roll-requests.service.ts:97-107`: la lista pendiente de una campaña
sale con `take: 50` ordenada por `createdAt desc`, sin ningún filtro por `encounterId`. Una
campaña activa que acumule más de 50 peticiones pendientes de OTRO tipo —percepciones, salvaciones
pedidas por el DM durante la sesión— antes de que alguien abra un combate empujaría fuera del
corte las peticiones de iniciativa del encuentro nuevo, y la sala de espera
(`TiraDeIniciativa.tsx`) leería «todos han tirado su iniciativa» sin que nadie hubiera tirado
nada: el `[]` que devuelve la página de 50 es indistinguible de «cero pendientes de verdad».

**Es del servidor y de otra tarea, no se toca aquí.** La medida más simple sería que `list`
aceptara (u ordenara primero) por `encounterId` cuando la pantalla lo necesita, en vez de fiarse
de que 50 filas por `createdAt` siempre contengan las de un combate recién abierto.

</details>


---

## ~~P1 · Un PNJ revelado entrega las características de un statblock `DM_ONLY`~~ — **CERRADA el 2026-09-06** (paso 1, tarea 18)

**Cerrada por la salida (a) que eligió el autor —ocultar— con su excepción nombrada: los PG
actuales sí se ven** (D-A-2, `docs/decisiones.md`). El motivo es de mesa: saber que un enemigo está
malherido se ve en la ficción y es información legítima; su hoja no lo es.

`apps/api/src/characters/character-sheet.service.ts` marca el caso —el PNJ se ve, su plantilla no—
y devuelve la fila **sin las seis características**. La frase que acompaña la respuesta se corrigió
con ella: decía «los números de este PNJ no son públicos» mientras mandaba los PG, y ahora dice «de
este PNJ solo se ven sus puntos de golpe actuales».

**Las dos mitades están probadas y las dos mutaciones medidas** en
`apps/api/test/pnj-en-la-mesa.e2e-spec.ts`: devolver la fila entera pone roja la del ocultado (el 18
aparece entre los valores), y esconder los PG pone roja la de los PG (73 → `null`). Pasarse de celo
era tan malo como la fuga.

<details><summary>Lo que decía la ficha (2026-09-04)</summary>

**Encontrado auditando la documentación, y no lo buscaba nadie: salió de un fallo de prueba.** El
recorrido `pnj-en-la-mesa` comprueba que *«los números de un statblock `DM_ONLY` no llegan al
jugador por la hoja del PNJ»*, y comprueba **la CA y la nota del libro**. No comprueba el resto, y
el resto sí llega.

**Lo que ve el jugador**, sobre el cuerpo serializado de su propia petición —esto es de una corrida
real, no una deducción—:

```
GET .../characters/:id/sheet   (como JUGADOR, sobre un PNJ que el DM subió a PLAYERS)
  "str":18,"dex":8,"con":18,"int":6,"wis":12,"cha":5      ← las del statblock DM_ONLY
  "currentHp":85                                          ← los PG exactos que salen de su dado de golpe
  "sheet":null, "hp":{"max":null}
  "reason":"Los números de este PNJ no son públicos: su ficha es del DM."
```

**La misma respuesta dice que sus números no son públicos y trae seis de ellos.** Con las seis
características se reconstruyen los seis modificadores de salvación y los dieciocho de habilidad
—todo menos el bonificador de competencia— y la iniciativa. Queda escondido lo que `hojaDeStatblock`
sí retiene: CA, PG máximos, competencia, la traza y la nota del libro.

**Cómo pasa, y por qué no es un descuido:** `npcs.service.ts:69` **copia** las características del
statblock a las columnas de la fila de `Character` al instanciar, que es la decisión D-2D-2 —«un
PNJ en la mesa es una fila de `Character`»— y `getSheet` devuelve esa fila entera a quien pasa
`canSee`. Las dos piezas son correctas por separado.

**Y por eso incumple una regla vinculante de interfaz**: *si el texto explica una regla del
servidor y discrepan, miente el texto*. Aquí discrepan.

**No se arregla sin el autor**, porque las dos salidas son decisiones suyas y no equivalentes:

1. **Ocultar las columnas** de un personaje con `statblockRef` a quien no sea el DM o su dueño.
   Es coherente con la frase, y **cambia lo que hoy se envía**: hay que decidir qué sigue viendo un
   jugador de un PNJ revelado (¿los PG actuales, para saber si está malherido?).
2. **Cambiar la frase** y aceptar que revelar un PNJ revela sus características. Es más barato y
   deja el bulto donde está: entonces la garantía real es «no verás su CA ni su traza», no «no
   verás sus números».

**Cierra cuando** una de las dos esté tomada y escrita. La prueba que lo destaparía existe a
medias: `pnj-en-la-mesa.e2e-spec.ts` recorre **cada valor** del cuerpo desde el 2026-09-04, así que
añadir `expect(valores).not.toContain(18)` es una línea — hoy se pondría roja.

</details>


---

## ~~P1 · La resistencia, vulnerabilidad e inmunidad al daño no se aplican NUNCA a un personaje de jugador~~ — **CERRADA el 2026-09-06** (paso 1, tareas 8a y 8b)

**Cerrada en dos commits**, que es como el aviso de la sesión de acompañamiento propuso partirla y
resultó ser el corte bueno:

- **8a** (`4713c7c`) — de dónde salen: un `kind: "damageModifier"` en `rules/catalog/types.ts` con
  **la misma forma** que `statblock.damageModifiers`, el enano y el tiefling declarándolo con su
  cita del SRD en inglés, y `resolve.ts` agregándolo. **El dracónido se queda como texto a
  propósito**: su resistencia depende de un linaje que es una elección que el catálogo no modela.
- **8b** — `changeHp` lee esa fuente cuando no hay `statblockRef`. La prueba
  `character-sheet.service.spec.ts` que afirmaba lo contrario **se corrigió, no se borró**: lo que
  sigue siendo cierto —que un daño al que no eres resistente entra entero— es lo que mide ahora.

**Lo que el «cierra cuando» pedía, medido:** un enano recibe 5 de 10 de veneno con su traza
diciendo «Resistencia enana», y el mismo enano recibe 10 de 10 de cortante. Mutación: dejar la
fuente en `[]` devuelve 74 donde la prueba espera 79.

<details><summary>Lo que decía la ficha (2026-09-06)</summary>

**Verificado leyendo `changeHp`:** los modificadores de daño solo se consultan si
`character.statblockRef` existe y hay resolutor de statblocks —
`apps/api/src/characters/character-sheet.service.ts:1138`, `if (input.damageType &&
character.statblockRef && this.statblocks)`—, y **un personaje de jugador nunca tiene
`statblockRef`**: `apps/api/src/characters/characters.service.ts:68` filtra explícitamente
`statblockRef: null` para separar «quién se sienta a la mesa» de los PNJ instanciados (fase 2D).
Esto ya estaba probado y declarado a propósito, no es un descuido nuevo: «con damageType pero sin
statblockRef (un jugador), tampoco se reduce nada» (`apps/api/src/characters/character-sheet.service.spec.ts:1364`).

**Lo que eso significa en la mesa:** un enano recibe un veneno entero — el SRD 5.1 le da
resistencia al veneno (*«Dwarven Resilience»*) — y un tiefling arde con el fuego entero — el SRD
le da resistencia al fuego —, con una traza convincente al lado que nunca se dispara porque
`applyDamageModifiers` (`apps/api/src/character-state/damage/apply-damage-modifiers.ts`) jamás
llega a ejecutarse para un PJ.

**La maquinaria de aplicar el modificador ya existe y está bien probada** (`applyDamageModifiers`,
el tipo de daño en el suceso, la traza en la respuesta). **Lo que falta es de dónde salen los
modificadores de UN PERSONAJE DE JUGADOR.** Hoy solo hay una fuente: `statblock.damageModifiers`
(2.5.1, pieza B), y los rasgos de raza que darían resistencia (`apps/api/src/rules/catalog/races.ts`)
son **puro texto decorativo** — `kind: "feature"` con un `name` y un `labelKey`, sin ningún dato
estructurado. No existe ningún `kind` de concesión para resistencia/vulnerabilidad/inmunidad en
`apps/api/src/rules/catalog/types.ts`.

**Por qué se deja a medias y no se fuerza (tarea 14, 2026-09-06):** cerrar esto de verdad exige, como
mínimo: (1) un `kind` nuevo de concesión en el catálogo (`types.ts`) que declare
resistencia/vulnerabilidad/inmunidad por tipo de daño, reutilizando el esquema de
`damageModifiers` de `@dnd/shared` en vez de inventar uno segundo; (2) rellenar `races.ts` con los
rasgos reales del SRD que hoy son solo prosa (resistencia enana al veneno, resistencia del
tiefling al fuego, y cualquier otro que el SRD 5.1 dé estructurado); (3) que `resolve.ts` agregue
esas concesiones en algo que la hoja derive (`derived.damageModifiers` o similar), con su traza,
igual que ya hace con velocidad o habilidades; y (4) que `changeHp` lea esa fuente para un PJ
—`character.statblockRef` nulo— en vez de (o además de) la del statblock. Es una feature con su
propio diseño de datos, no un cambio de una línea, y forzarla dentro de esta tarea habría sido
la «media tarea inventada como entera» que este proyecto no quiere.

**Cierra cuando** un personaje de jugador con un rasgo de resistencia/vulnerabilidad/inmunidad al
daño lo vea aplicarse de verdad en `changeHp`, con su traza, exactamente igual que un PNJ con
statblock — probado con mutación: quitarle el origen del modificador (statblock o lo que lo
sustituya) tiene que enrojecer la prueba que compruebe la reducción.

</details>


---

## ~~P2-eventos · `setSide` y el reajuste de `activePosition` no emiten suceso~~ — **CERRADA el 2026-09-06** (paso 1, tarea 16)

Dos tipos nuevos en el vocabulario cerrado —`COMBATANT_SIDE_CHANGED` y `ACTIVE_TURN_SHIFTED`—, su
`record` **dentro de la misma transacción** que la escritura, y su línea en español en
`linea-de-log.ts`, con el nombre del bando saliendo de `dominio/combate.ts`: **ningún valor de
enumeración llega a la pantalla**, tampoco dentro de una frase de registro. Un valor del enum de
PostgreSQL **se añade** (migración `20260906140000_side_and_turn_events`), nunca se edita.

**La ficha decía «que lo decidan las tareas 8 y 10, que montan la pantalla». Ya estaban montadas**,
que era su condición.

Los dos sucesos viajan **sin nombres ni posiciones**, por lo mismo que `TURN_ADVANCED`: son
`PLAYERS` y la ficha del encuentro renumera denso para que nadie cuente los huecos de lo que no ve.
Y corregir al **mismo** bando no escribe nada, que también está probado. Mutación: neutralizar la
condición del `record` pone roja la unitaria de `setSide`.

<details><summary>Lo que decía la ficha (2026-09-05)</summary>

**Decidido con la pantalla, no aquí** — queda para las tareas 8 y 10, que son las que montan el
canal en vivo del combate. Lo que hoy cuesta, mientras tanto:

- **`EncountersService.setSide`** corrige el bando (`PATCH .../combatants/:cid/side`) y no llama a
  `GameEventsService.record`. Quien lo escribió lo ve al releer (`get()` al final del método); una
  segunda pestaña abierta en la misma mesa **no se entera hasta que alguien la refresque** — nada
  que hoy escuche el registro (`TURN_ADVANCED`, `ENCOUNTER_STARTED`…) avisa de un cambio de bando.
- **El ajuste de `activePosition`** que la misma ronda de arreglo añadió a `setInitiative` —seguir
  el turno por identidad cuando el combate está `ACTIVE` (ver `docs/07-historial.md`)— tampoco
  escribe suceso. Es un efecto **secundario** de corregir un número de iniciativa, y hoy es
  invisible por el mismo canal: el `PATCH .../combatants/:cid` no emite nada distinto de lo que ya
  emitía antes de la ronda de arreglo (que es ninguno), así que quien mire otra pestaña no sabe que
  el turno activo cambió de combatiente hasta que refresca.

**Cierra cuando** las tareas 8 y 10 decidan qué suceso (si alguno) corresponde a cada uno de los dos
casos y lo escriban — no antes, porque decidirlo sin la pantalla delante sería adivinar el vocabulario.

</details>


---

## ~~P2-cancelar · `EncountersService.cancel` borra la petición del jugador sin decírselo~~ — **CERRADA el 2026-09-06** (paso 1, tarea 19 · D-A-3)

**Cerrada corrigiendo una decisión, no ejecutando una pendiente.** E-IB-18 decía que cancelar no
escribe suceso —«no es historia, es un clic deshecho»— y **el autor la revisó**: *«pese a que no
queda trazabilidad, puede descolocar a un jugador»*. El motivo del cambio es el jugador y no el
historial: a quien tenía una petición pendiente le desaparecía la entrada de la bandeja sin
explicación.

**La trampa de diseño que la ficha ya dejaba resuelta**, y que se respeta: el sujeto **no puede ser
el encuentro** —ya no existe para serlo—, así que es la **sesión**, y el suceso **no lleva
`encounterId`**, que sería una referencia a una fila borrada. El `record` va dentro de la misma
transacción que el borrado.

Probado en `apps/api/test/iniciativa-forzada.e2e-spec.ts`: el suceso es de sesión, es `PLAYERS`, y
**la jugadora que esperaba lo ve en su registro**. Mutación: quitar el `record` pone rojas las dos.
**E-IB-18 no se borra de `docs/decisiones.md`**: se tacha y se dice quién la revisó y por qué.

<details><summary>Lo que decía la ficha (2026-09-05)</summary>

**Decisión del autor, no un hueco a rellenar sin más.** `cancel()` borra el `Encounter` y sus
`RollRequest` (`apps/api/src/encounters/encounters.service.ts:1051`, método `cancel`, cita
comprobada en `04b6e2b` — el fichero se ha reescrito varias veces y el número se mueve) sin
escribir ningún suceso — a propósito: «no es historia, es un clic deshecho», y un suceso con
`subjectType: "encounter"` sobre un sujeto que acaba de desaparecer sería justo la historia que
esa decisión dice que no se guarda.

**El coste que deja, y por qué queda anotado igual.** Un jugador con una petición de iniciativa
pendiente ve desaparecer esa entrada de su bandeja sin ninguna explicación — no hay 409, no hay
suceso, no hay nada: la fila simplemente deja de estar. Es exactamente el mismo silencio que
`cancel` elige a propósito para el registro de la mesa, pero visto desde la pantalla del jugador
en vez de desde el historial.

**Si el autor decide algún día que hace falta avisar,** el sujeto del suceso no puede ser el
encuentro —ya no existe para serlo—: tendría que ser la **sesión** (`subjectType: "session"`),
con un tipo nuevo declarado en `packages/shared/src/game-event.schema.ts` (algo como
`ENCOUNTER_CANCELLED`, sin ligar a ningún `Encounter` porque para cuando alguien lo lea ya no
habrá ninguno que enlazar).

**Cierra cuando** el autor decida que el silencio le cuesta más de lo que ahorra, y alguien
implemente ese suceso de sesión.

</details>


---

## ~~P1 · El panel de dados existe y no lo monta nadie~~ — **CERRADA el 2026-09-06** (paso 1, tarea 14)

**Ya estaba montado al llegar a la tarea, y eso es lo que hay que decir.** `MesaDeSesion.tsx` lo
monta **fuera del `<main>`**, con su propio estado —los dados no son un cajón, y por eso abrir la
hoja no los cierra— y el `z-30` frente al `z-40` de los cajones documentado en el sitio. El `grep`
que la ficha cita en «solo su declaración» da hoy cuatro apariciones.

**Lo que sí faltaba, y es lo que aporta la tarea:** nada impedía que volviera a desmontarse. Dos
pruebas nuevas en `mesa-de-sesion.test.tsx` lo sujetan —el panel existe al pulsar «Dados» y
`panel.closest("main")` es `null`, y el mismo botón lo quita— y la mutación está medida: apagar el
montaje las pone rojas. **El apilamiento no lo puede ver `jsdom`**: eso se mide en el navegador.

<details><summary>Lo que decía la ficha (2026-09-04)</summary>

`features/rolls/panel/PanelDeDadosDeLaMesa.tsx` y su cubo tridimensional están construidos,
revisados y en `main`. **`grep -rn "PanelDeDadosDeLaMesa" apps/web/src` devuelve solo su
declaración.** La fila ALTA de la auditoría —*«no hay dados en la mesa: `MesaDeSesion.tsx` no
importa nada de `features/rolls`»*— **sigue exactamente igual que antes de construirlo**.

Cierra con dos líneas en el compositor: una entrada `"dados"` en `RailDePaneles` y el panel montado
**fuera del `<main>`**, con `campaignId`, `sessionId`, `characterId` y `onCerrar`. Va a `z-30`
frente al `z-40` de los cajones, que es como la maqueta los hace convivir.

**Es el caso número cinco de «una ficha no se cierra sin pantalla».**

</details>


---

## ~~`NpcEnLaMesa` no trae `ownerId`: un PNJ cedido es más restrictivo en la pantalla que en el servidor~~ — **CERRADA el 2026-09-06** (paso 1, tarea 15)

`GET /npcs` devuelve `ownerId` y `FichaDePnj` condiciona los mandos a `pnj.ownerId === miId`
**además de** al DM. **No es una fuga**: el dueño de un PNJ que ya estás viendo no dice nada que la
lista no diga —`canView` decidió antes que puedes verlo— y es el mismo campo que la lista de
personajes publica desde 2A.

**Esconder el botón no es control de acceso**: la puerta real sigue siendo `requireEditable` en el
servidor, y esto es cortesía **en las dos direcciones** — no enseñar un mando que va a dar 403, y no
esconder uno que sí se puede usar.

Y una prueba vieja se corrigió por el camino: «un jugador ve al PNJ pero no lleva mandos sobre él»
montaba el goblin del DM con la sesión iniciada **como el DM**, así que el espectador era su dueño y
pasaba por la razón equivocada. Mutación: quitar `ownerId` de la respuesta pone roja la del e2e.

<details><summary>Lo que decía la ficha (2026-09-06)</summary>

El servidor **sí** trata a un PNJ cedido por dueño: `apps/api/src/encounters/encounters.service.ts:244-245`
separa las peticiones de iniciativa por `ownerId` sin mirar `statblockRef`, así que un PNJ cedido a
un jugador le genera a ÉL la petición de iniciativa, y `requireEditable` (`characters.service.ts`)
le dejaría cambiarle los PG y ponerle condiciones igual que a un personaje propio — un PNJ es una
fila de `Character`, y el servidor no distingue.

**La pantalla es más restrictiva: nunca.** `ColumnaElenco.tsx`/`FichaDePnj.tsx` (tarea 9b) solo dan
mandos («Daño», «Condición», bando) al DM — nunca a un jugador, sea o no el dueño del PNJ cedido —
porque `NpcEnLaMesa` (`apps/web/src/features/bestiario/api.ts`) **no trae `ownerId`**: no hay dato
del que leer «es tuyo». `TiraDeIniciativa.tsx` ya documenta el mismo hueco para nombrar al jugador
que falta por tirar («Hueco conocido», su comentario sobre `soyCombatiente`).

**No es un agujero de seguridad** —la pantalla nunca promete más de lo que da, y el servidor sigue
siendo quien de verdad autoriza—, pero sí es una función que el servidor permite y la interfaz no
deja usar: un jugador con un PNJ cedido no puede anotarle el golpe que acaba de recibir sin pedirle
al DM que lo haga por él.

**Cómo se cierra:** añadir `ownerId: string | null` a la respuesta de `GET /campaigns/:id/npcs`
(`NpcsController`/`NpcEnLaMesa`), y en la web condicionar los mandos de `FichaDePnj` también a
`pnj.ownerId === miId`, igual que ya hace `FichaDeElenco` con `puedeCambiarPg`. No se hace en esta
ronda porque toca el contrato del endpoint, y esta ronda es de arreglos sobre lo ya construido.

</details>
