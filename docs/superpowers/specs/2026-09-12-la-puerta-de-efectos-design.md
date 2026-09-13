# La puerta de efectos — curar a otro, el daño de una salvación, la bandeja de daño, y «hasta el próximo descanso»

> Escrito el 2026-09-12 con el autor, al descubrir que tres huecos que él creía cerrados en el paso
> 2 seguían abiertos: P2-4 y P2-5 de [06-pendientes.md](../../06-pendientes.md) y una duración que
> el esquema declara a propósito como pendiente
> (`packages/shared/src/character-state.schema.ts:270-279`). **El paso 3 los necesita los tres**:
> sin ellos media docena de conjuros de clérigo nacen inusables (D-P2-11) y una bola de fuego no
> quema a nadie.
>
> Lo que dice «hoy» se comprobó abriendo los ficheros el 2026-09-12 sobre `main` (`80a9243`).

---

## 1 · Qué se pide, en una frase

Que **una actividad ya autorizada pueda tocar a otro personaje** —curarlo, pedirle una salvación,
aplicarle el daño de esa salvación— y que **una condición pueda durar «hasta el próximo descanso»**,
sin abrir la puerta genérica de editar la ficha de nadie.

## 2 · Lo que hay hoy, medido

| Pieza | Estado real |
|---|---|
| **`ActivitiesService.usar`** (`apps/api/src/activities/activities.service.ts:82-286`) | Ya resuelve cada objetivo con `requireVisibleCharacter` (= `canView`, L117-123), ya ordena los candados (`destinatariosOrdenados`) y ya llama a `changeHp` (rama `dados`, L203-221) y a `rollRequests.create` (rama `salvacion`, L177-191) **dentro de su transacción**. Devuelve un aviso literal diciendo que el daño de la salvación no se aplica solo (L192-199) |
| **`changeHp`** (`character-sheet.service.ts:1318-1332`) | Vuelve a autorizar **siempre** con `requireEditable` (dueño o DM), aunque llegue un `tx`. Un clérigo que cura a otro jugador → 403 |
| **`RollRequestsService.create`** (`roll-requests.service.ts:70-114`) | Con `tx` pasa por `autorizarYComprobarPersonajesConCliente`, que exige `role === "DM"`. Un jugador que lanza una salvación a otro → 403 |
| **`RollRequestsService.answer`** (L230-363) | Tira `1d20+mod`, escribe `resolvedEventId`. **No sabe qué efecto colgaba de la petición**: `RollRequest` (`schema.prisma:813-838`) guarda `key`, `label`, `dc`, `mode`, `audience` y nada del daño |
| **Condiciones** (`character-state.schema.ts:279`, `schema.prisma:741-751`) | `durationSeconds` → `expiresAtClock`; sin duración = indefinida. El comentario del esquema dice literal: «hasta el próximo descanso largo… no son duraciones, son sucesos… declaradas como pendientes» |
| **Descanso** (`rest/rest.service.ts:69-100`) | Una transacción por descanso: avanza el reloj, repone recursos por `resetOn`, y en el largo pone `currentHp: null` y limpia salvaciones de muerte. Es el sitio donde un suceso «descanso» ya ocurre |
| **Precedente de la segunda puerta** | `GameEventsService.record` / `recordFromEngine` ([01-arquitectura.md](../../01-arquitectura.md)): la misma escritura con dos autorizaciones distintas, y la interna **no se expone por HTTP** |

**O sea que las tres cosas son pegamento entre piezas que existen**, más una columna nueva en dos
tablas.

## 3 · La segunda puerta: «vengo de un efecto ya autorizado»

**Principio (D-P2-11, ya decidido):** el permiso no es «puedes editar esta ficha», es «vienes de una
actividad que su dueño o el DM usó, sobre un objetivo que `canView` te deja ver». Esa
comprobación **ya la hace `usar`**; lo que falta es que las dos puertas de abajo la acepten sin
repetir la suya.

### 3.1 · `changeHpFromEffect`

```ts
// character-sheet.service.ts — junto a changeHp, misma firma de entrada, sin autorizar
async changeHpFromEffect(
  tx: Prisma.TransactionClient,
  actorUserId: string,        // quien usó la actividad: firma el suceso HP_CHANGED
  campaignId: string,
  targetCharacterId: string,  // ya resuelto con canView por quien llama
  input: ChangeHpInput,
): Promise<ChangeHpResult>
```

- Es **el cuerpo de `changeHp` sin `autorizarEdicionConCliente`**: `changeHp` pasa a autorizar y
  delegar en él, para que no haya dos copias de la mecánica (PG temporales, resistencias,
  masivo, concentración, `stable`, el suceso).
- **Exige `tx`**: no abre transacción propia. Sin `tx` no hay forma de llamarla, y eso es a
  propósito — una puerta que solo existe dentro de una transacción ajena no se puede pulsar desde
  un controlador.
- **No se expone por HTTP.** Una prueba lo afirma: ningún controlador la importa (grep en la suite,
  como `viewerFor` tiene la suya).
- El suceso `HP_CHANGED` lleva `reason: "Actividad: <key>"` (ya lo hace `usar`) y, cuando venga de
  una salvación, `rollEventId` = la tirada de salvación que lo causó (§4).

### 3.2 · `createFromEffect`

```ts
// roll-requests.service.ts
async createFromEffect(
  tx: Prisma.TransactionClient,
  actorUserId: string,        // requestedById: el jugador que lanzó, no el DM
  campaignId: string,
  input: CreateRollRequestInput & { pendingEffect?: PendingSaveEffect },
): Promise<RollRequest[]>
```

- Es `crearEnTransaccion` con **la comprobación de personajes pero sin `requireDM`**. Los
  `characterIds` ya pasaron por `canView` en `usar`; aquí se vuelve a comprobar que están en la
  campaña y no archivados (barato, y es lo que `autorizarYComprobarPersonajesConCliente` ya hace
  además del rol).
- `usar` deja de llamar a `create` y llama a esta.
- **Quién puede responder no cambia** (`answer`, L237-239): el dueño del personaje objetivo o el
  DM. Un jugador pide; el otro jugador responde con su hoja.

### 3.3 · Lo que NO se abre

- `requireEditable` no se toca. El `PATCH` de una ficha ajena sigue siendo 403.
- La puerta genérica de condiciones (`PUT …/conditions/:key`) no se toca; `effects[]` de una
  actividad sobre un objetivo ajeno **sigue exigiendo** que la clave no sea reservada
  (`concedidoPorActividad` solo para el actor, `activities.service.ts:249-271`).
- Ninguna de las dos puertas nuevas tiene ruta. Si alguien la quiere por HTTP, es otra spec.

## 4 · El daño de una salvación se aplica al responderla (P2-5)

### 4.1 · La regla, y de dónde sale

SRD 5.1, *Saving Throws*: *«A saving throw is successful if the total equals or exceeds the DC»*.
SRD 5.1, *Fireball*: *«A target takes 8d6 fire damage on a failed save, or half as much damage on a
successful one»*. Y sobre tirar una vez: SRD 5.1, *Damage Rolls*: *«If a spell or other effect
deals damage to more than one target at the same time, roll the damage once for all of them.»*
(Cita verificada en la copia de Foundry, `spells/3rd-level/fireball.yml`, y en el SRD en inglés;
la cita va en el commit.)

De ahí salen las tres decisiones:
- **El daño se tira UNA vez, al usar la actividad**, y se guarda; cada objetivo aplica entero o
  mitad al responder. No se tira al responder, que daría un daño distinto por objetivo.
- **Salva si `total >= dc`**. Mitad = `Math.floor(total / 2)` (SRD, *Rounding Down*).
- `siSalva: "ninguno"` → el que salva no recibe nada; `"mitad"` → recibe la mitad.

### 4.2 · Lo que se guarda

Columna nueva en `RollRequest`: **`pendingEffect Json?`**, con su esquema en `@dnd/shared`:

```ts
// packages/shared/src/roll-request.schema.ts (o donde viva createRollRequestSchema)
export const pendingSaveEffectSchema = z.object({
  amount: z.number().int().min(0),                 // el daño ya tirado, una vez para todos
  signo: z.union([z.literal(1), z.literal(-1)]),   // 1 cura, -1 daña — como `dados.signo`
  tipoDeDano: damageTypeSchema.optional(),
  siSalva: z.enum(["ninguno", "mitad"]),
  actividadKey: z.string().min(1),
  actorCharacterId: z.string().min(1),             // quién lanzó: para el motivo del suceso
});
export type PendingSaveEffect = z.infer<typeof pendingSaveEffectSchema>;
```

`usar`, en la rama `salvacion` con `dados`: tira con `tirarDados` (ya existe, rama `dados`),
mete la traza en la respuesta, y pasa `pendingEffect` a `createFromEffect`. **El aviso literal de
L192-199 desaparece**: ya no es verdad.

### 4.3 · Lo que pasa al responder

En `answer`, tras cerrar la petición (`resolvedAt`, L354-360) y **dentro de una transacción con
ella** —hoy `updateMany` va suelto; pasa a `prisma.transaction` para que «respondida» y «daño
aplicado» no puedan separarse—:

```
si peticion.pendingEffect y peticion.dc no es null:
  salvo = resultado.total >= peticion.dc
  cantidad = salvo ? (siSalva === "mitad" ? floor(amount/2) : 0) : amount
  si cantidad > 0:
    changeHpFromEffect(tx, peticion.requestedById, campaignId, peticion.characterId, {
      delta: signo * cantidad,
      reason: `Actividad: ${actividadKey}` + (salvo ? " (salvó, mitad)" : " (falló)"),
      damageType: signo < 0 ? tipoDeDano : undefined,
      rollEventId: resultado.eventId,   // la salvación es la causa: ABILITY_ROLL, vale para changeHp
    })
```

- **El actor del `HP_CHANGED` es quien lanzó** (`requestedById`), no quien respondió: la crónica
  dice «Elara pierde 14 PG ← bola de fuego de Marta», que es la verdad.
- La respuesta de `answer` añade `effectApplied?: { delta: number; saved: boolean }` para que la
  pantalla lo diga sin recargar.
- Una petición **sin** `pendingEffect` (las del DM de siempre, la iniciativa) no cambia en nada.
- Si la petición se cancela (`cancelledAt`, iniciativa) o se responde dos veces, el efecto no se
  aplica: son los mismos caminos de error que ya existen.

### 4.4 · Curación por salvación

No existe en el SRD (nadie salva contra una curación). `signo: 1` con `siSalva` se acepta por
simetría del esquema pero **no se siembra**; si el paso 3 lo necesita, el mismo camino vale.

## 4 bis · La bandeja de daño: el daño de un ataque se aplica con un clic, no a mano

**Añadido el 2026-09-12 por decisión del autor**, tras investigar cómo lo hace Foundry: «es tedioso
tener que estar cambiando a mano; al menos así da tiempo al DM de revisar si da, y al jugador
también».

### 4b.1 · Qué hace Foundry (sistema oficial dnd5e, sin módulos)

No aplica el daño solo. Al tirar daño, la tarjeta del chat trae una **bandeja** con «la lista fija
de las criaturas que estaban marcadas al tirar», un **preview por objetivo** que ya descuenta
resistencias, inmunidades y vulnerabilidades —cada una un interruptor que el DM puede ignorar o
rebajar—, y un botón **aplicar** (dnd5e 3.1.0). Al aplicar, si el objetivo se concentraba, pide la
salvación de concentración. Hasta la 6.0 la bandeja era solo del DM; los jugadores pidieron
aplicarla a **sus propios** personajes y se aceptó (issue #3300). Aplicar a un enemigo sigue siendo
del DM. Fuentes en el commit.

### 4b.2 · Lo que hay hoy, medido

- `resolveAttack` (`character-sheet.service.ts`, ~L2340-2420) ya conoce el objetivo, mira su CA
  real y escribe `ATTACK_RESOLVED` con `subjectId = target.id`, `verdict` y `rollEventId` (la
  tirada de ataque). **El objetivo no viaja en el payload** —a propósito, para no filtrar la CA—,
  pero es el sujeto del suceso, así que se recupera sin cambiar el esquema.
- `rollAttack` con `part: "DAMAGE"` recibe `attackRollEventId`, encuentra la tirada de ataque
  (`esCriticoDesdeLaTirada`, ~L2140) y dobla los dados si fue 20 natural. **No sabe nada del
  objetivo**: el daño sale al hilo y ahí se queda.
- Aplicarlo hoy es `PonerDano` en el elenco (`sessions/elenco/PonerDano.tsx`): abrir el objetivo,
  teclear la cifra, elegir el tipo, citar la tirada. Cuatro gestos por ataque, y solo el DM.
- `changeHp` ya aplica resistencia, vulnerabilidad e inmunidad por tipo (2.5.1), PG temporales,
  daño masivo y pide la salvación de concentración. **El cálculo existe; falta el clic.**

### 4b.3 · La regla

No se automatiza el descuento: **se propone y alguien lo confirma**. Es la doctrina D-2.5-2 («el
daño lo aplican el DM y el dueño») con el trabajo de sumar hecho por la máquina. El fantasma del
autor: resistencia a contundente, perforante y cortante **no mágicos** (SRD 5.1, *Ghost*), inmune
a frío, necrótico y veneno. La bandeja diría «11 cortante → **5** (resistencia: no mágico)» con una
espada normal y «→ 11» con una +1; el DM lo ve antes de pulsar.

### 4b.4 · El dato: `RollEvent` de daño sabe a quién

El daño de un ataque **resuelto contra un objetivo** guarda en su suceso (`ABILITY_ROLL`, el que ya
escribe `rolls.roll`) dos campos nuevos y opcionales en el payload:

```ts
// game-event.schema.ts — payload del ABILITY_ROLL de daño
pendingDamage: z.object({
  targetCharacterId: z.string().min(1),   // subjectId del ATTACK_RESOLVED que lo justifica
  attackResolvedEventId: z.string().min(1),
  damageType: damageTypeSchema,
  amount: z.number().int().min(0),         // el total tirado, ya con crítico y Furia
  appliedEventId: z.string().min(1).optional(), // el HP_CHANGED cuando se aplique; ausente = pendiente
}).optional(),
```

`rollAttack` (`part: "DAMAGE"`) lo rellena **solo si** `attackRollEventId` apunta a una tirada con
un `ATTACK_RESOLVED` colgando y el veredicto fue `HIT` o `CRITICAL`; un daño tirado «al aire» o sobre
un fallo no lleva `pendingDamage`. La salvación con `pendingEffect` (§4) es el mismo concepto por la
otra puerta: **una tirada que sabe a quién le toca**.

### 4b.5 · El preview y el clic

Endpoint nuevo, **de solo lectura y de aplicación**, ambos en `character-sheet.controller.ts`:

- `GET /campaigns/:id/rolls/:rollEventId/damage-preview` → `{ target, amount, damageType,
  resulting: { taken, absorbedByTemp, modifier: "resistant" | "vulnerable" | "immune" | null,
  reason }, canApply: boolean }`. Lo calcula la misma función que `changeHp` usa para reducir
  (`character-state/damage/`), sin escribir nada. **Solo lo ve quien podría aplicarlo** (§4b.6);
  para los demás, 404 — enseñar «resistente» a un jugador que no ve el statblock es filtrar.
- `POST /campaigns/:id/rolls/:rollEventId/apply-damage` → llama a `changeHpFromEffect(tx,
  actorUserId = quien tiró el daño, targetCharacterId, { delta: -amount, damageType, rollEventId,
  reason: "Ataque: <arma>" })` y marca `pendingDamage.appliedEventId`. **Idempotente**: un segundo
  clic es 409 «ya aplicado» (la marca se escribe en la misma transacción que el `HP_CHANGED`, con
  `updateMany … where appliedEventId IS NULL`, el mismo patrón que `resolvedAt` en las peticiones).

Pantalla (`sessions/hilo/`): la tarjeta de un daño con `pendingDamage` enseña la línea del preview
—«Espectro: 11 cortante → 5 · resistencia a no mágico»— y un botón **Aplicar** para quien pueda.
Aplicado, la tarjeta dice «aplicado» y enlaza el `HP_CHANGED`. Si el DM quiere otra cosa (ignorar
la resistencia, como el interruptor de Foundry), usa `PonerDano` como hoy: **no se construye un
segundo formulario**; la bandeja es el camino corto, no el único.

### 4b.6 · Quién pulsa

| Quién | Sobre quién | Por qué |
|---|---|---|
| El DM | cualquiera | como hoy (D-2.5-2) |
| El dueño del objetivo | su propio personaje | Foundry 6.0, issue #3300: aplicarse el daño que te hicieron es tuyo |
| El atacante | nadie | el atacante no toca los PG de otro; eso sigue siendo la puerta cerrada |

Se comprueba en el servidor con `requireOwnerOrDM` sobre el **objetivo**, no sobre el atacante. El
`HP_CHANGED` lo firma **quien tiró el daño** (el atacante, `actorUserId`), porque la crónica dice
quién lo causó, no quién pulsó.

### 4b.7 · Lo que NO entra

- Interruptores por resistencia en la bandeja (el «ignorar» de Foundry): `PonerDano` ya lo cubre.
- Aplicar a varios objetivos desde un ataque: un ataque de arma tiene un objetivo. El área es la
  salvación (§4), que ya reparte por objetivo.
- Daño automático sin clic. Descartado por el autor: revisar antes de pulsar es el punto.

## 5 · «Hasta el próximo descanso» es una duración que el descanso resuelve

### 5.1 · La regla

SRD 5.1 usa «until you finish a long rest» y «until you finish a short or long rest» como
duración literal de decenas de efectos (agotamiento se reduce con un descanso largo; *Rage*,
*Second Wind* y *Channel Divinity* se reponen por descanso; condiciones como las de
*Contagion* duran «until the disease is cured»). Modelarlo como número mentía; modelarlo como
**suceso que el descanso resuelve** es lo que el esquema pedía.

### 5.2 · El dato

Columna nueva en `CharacterCondition`: **`expiresOnRest String?`** con valores `"SHORT" | "LONG"`
(mismo vocabulario que `RestInput.kind`). Esquema:

```ts
// character-state.schema.ts — applyConditionSchema
expiresOnRest: z.enum(["SHORT", "LONG"]).optional(),
```

con `refine`: **`durationSeconds` y `expiresOnRest` son excluyentes** — una condición dura por
reloj o hasta un descanso, nunca las dos. Sin ninguna, indefinida, como hoy.

### 5.3 · Qué hace el descanso

En `RestService.rest`, dentro de su transacción y **después** de reponer recursos:

- Descanso **corto** completo → retira las condiciones con `expiresOnRest = "SHORT"`.
- Descanso **largo** completo → retira `"SHORT"` **y** `"LONG"` (un descanso largo incluye lo que
  un corto repone: es la misma lógica que `reponerPorTipo` ya aplica a los recursos, L97-98).
- Descanso largo **interrumpido** (`input.interrupted`) → no retira nada, como no repone nada.
- **Retirar = borrar la fila y escribir `CONDITION_REMOVED`** con `reason: "Descanso largo"` /
  `"Descanso corto"`, uno por condición, con el mismo `tx`. No queda «vencida»: el vencimiento por
  reloj se marca porque el DM tiene que enterarse de que pasó la hora; el descanso lo declara
  alguien a propósito, y lo que retira lo dice la crónica.

### 5.4 · Pantalla

`Condiciones.tsx` (`:126`, el selector de duración): a las opciones de tiempo se añaden dos
**radios con su frase** (regla de interfaz: opciones con significado no van en desplegable):
«Hasta el próximo descanso corto» · «Hasta el próximo descanso largo». La condición activa lo
enseña en su línea («hasta descanso largo») y el chip de la cabecera de la hoja también. Ningún
valor `SHORT`/`LONG` llega a pantalla: pasa por `vocabulario.ts`.

### 5.5 · Lo que NO entra

- **Modificadores temporales** «hasta el descanso»: misma forma, pero hoy solo los pone el DM y
  con `durationSeconds`; se añade cuando el paso 3 lo pida, con la misma columna. YAGNI.
- «Mientras te concentres»: ya existe como mecánica de concentración; no es una duración.
- `effects[]` de las actividades con `expiresOnRest`: el esquema de `effects` se ensancha en el
  paso 3, cuando el conversor lo necesite.

## 5 bis · XP: existe la columna, se sube por hito o por XP según la mesa, y nunca sola

**Añadido el 2026-09-13** desde la ficha «XP: no existe; se sube por hito» de
[06-pendientes.md](../../06-pendientes.md), que pedía pasar sus dos preguntas por los cuatro pasos
de [04-convenciones.md](../../04-convenciones.md) antes de planificar. Cabe aquí porque comparte
`character-sheet.service`, la mesa, el hilo y el fin de combate (`encounters.service`), y no toca el
catálogo del paso 3.

### 5b.1 · Lo que hay hoy, medido

- `Character.level` existe (`schema.prisma:594`); **no hay `xp`**, ni tabla de umbrales, ni XP por VD.
- Subir de nivel es del DM (D-CF-66): `PATCH …/sheet { level }` y «Subir de nivel» (`level-up`).
- Todo statblock tiene `cr` (`schema.prisma:1270`, `monsters-srd.ts`), del que sale el bonificador de
  competencia. La tabla *Experience Points by Challenge Rating* no está en ningún sitio.
- `EncountersService.end` (`encounters.service.ts:478-513`) cierra el encuentro en una transacción
  y escribe `ENCOUNTER_ENDED` sin nombrar combatientes. `Combatant.side` es `ALLY | ENEMY | NEUTRAL`.
- Reglas de la mesa (`table-rules.schema.ts`, D-CF-53): `abilities`, `nivelInicial`,
  `pgNivelesSiguientes`, `permitidos`, `oroInicial`; **sin regla de progresión**.

### 5b.2 · La regla, y de dónde sale

SRD 5.1, *Beyond 1st Level*: «As your character goes on adventures and overcomes challenges, he or
she gains experience, represented by experience points. A character who reaches a specified
experience point total advances in capability. This advancement is called gaining a level.» Y la
tabla *Character Advancement*: 0, 300, 900, 2 700, 6 500, 14 000, 23 000, 34 000, 48 000, 64 000,
85 000, 100 000, 120 000, 140 000, 165 000, 195 000, 225 000, 265 000, 305 000, 355 000 (niveles
1–20). Coincide con `DND5E.CHARACTER_EXP_LEVELS` de Foundry (`module/config.mjs:4147`).

SRD 5.1, *Monsters · Experience Points*: «The number of experience points (XP) a monster is worth
is based on its challenge rating. **Typically, XP is awarded for defeating the monster, although the
GM may also award XP for neutralizing the threat posed by the monster in some other manner.**» Tabla
*Experience Points by Challenge Rating*: 0 → 0 ó 10 («those with no effective attacks are worth no
experience points, while those that have attacks are worth 10 XP each»), 1/8 → 25, 1/4 → 50,
1/2 → 100, 1 → 200, 2 → 450, 3 → 700, 4 → 1 100, 5 → 1 800, 6 → 2 300, 7 → 2 900, 8 → 3 900,
9 → 5 000, 10 → 5 900, 11 → 7 200, 12 → 8 400, 13 → 10 000, 14 → 11 500, 15 → 13 000, 16 → 15 000,
17 → 18 000, 18 → 20 000, 19 → 22 000, 20 → 25 000, 21 → 33 000, 22 → 41 000, 23 → 50 000,
24 → 62 000, 25 → 75 000, 26 → 90 000, 27 → 105 000, 28 → 120 000, 29 → 135 000, 30 → 155 000.
Coincide con `DND5E.CR_EXP_LEVELS` de Foundry (`module/config.mjs:4158`; la copia del SRD en
`OldManUmby/DND.SRD.Wiki` omite las filas 9–13 por error de transcripción — se contrastó con Foundry).
**El SRD 5.1 no dice cómo repartir el XP entre el grupo**: la frase «divide the total experience
points of the monsters equally among themselves» y la de contar a los PNJ como parte del grupo son
de la *Dungeon Master's Guide*, que no es SRD. Foundry (`module/applications/award.mjs`): **no
concede XP al terminar un combate**; el DM lo da a mano con la aplicación *Award* o el comando
`/award`, con la cifra sugerida desde el grupo (`origin.system.details.xp.value`) y repartida
«each» o dividida entre los destinatarios elegidos, que son **actores de tipo `character`**
(`game.users.map(u => u.character)` o los miembros del grupo). En un actor `npc`, `details.xp.value`
es **lo que vale matarlo** (`npc.mjs:379-381`, «Kill Experience»), no lo que ha ganado. Y con
`levelingMode === "noxp"` el XP se oculta (`award.mjs:108`).

### 5b.3 · Las dos preguntas, por los cuatro pasos

**(1) ¿Reparto automático de la suma de VD al terminar el combate, o siempre a mano?** —
**Se propone, no se aplica** (D-CF-68). Paso 1: reutiliza `end()` y el patrón de la bandeja de
daño (§4 bis: la máquina suma, alguien confirma) y D-N-3 (el combate propone su final). Paso 2: el
SRD dice «typically» y deja al DM dar XP por neutralizar sin matar; un automatismo lo contradice
y además no sabe si el goblin huyó o fue capturado. Paso 3: Foundry no lo automatiza. Decisión:
`end()` devuelve `xpPropuesto: { total, porCabeza, destinatarios[], desglose[] }` —la suma de la
tabla por VD de los combatientes `ENEMY` con statblock, dividida a partes iguales (`floor`) entre
los combatientes `ALLY` que pueden recibir XP (5b.4)— **solo al DM**, y la mesa lo enseña
prellenado en «Dar XP» con un clic para confirmar y campos editables. Sin `ENEMY` con VD, o sin
receptores, no hay propuesta. Descartado: aplicar solo (contra el SRD y contra D-2.5-2/D-N-3).

**(2) ¿XP también a PNJ jugables?** — **No** (D-CF-69). Paso 2: un PNJ jugable es una fila de
`Character` con `statblockRef` (D-2D-2), y con `statblockRef` «`classKey`, `subclassKey`, `raceKey`
y `level` NO se usan» (`schema.prisma:667-669`): sus números salen del VD, no de un nivel, así que
no hay nivel al que avanzar ni umbral que cruzar. Paso 3: en Foundry el XP de un `npc` es lo que
vale derrotarlo, y *Award* solo reparte a `character`. Decisión: `POST …/xp` rechaza con 400 a un
personaje con `statblockRef` («un PNJ de statblock no acumula XP: sus números salen del VD»), el
selector de «Dar XP» lo enseña **marcado y no seleccionable con ese motivo** (regla de interfaz), y
la propuesta de `end()` no lo cuenta entre los receptores. La regla de la DMG de contar al PNJ para
reducir la parte de los jugadores **no se aplica**: no es SRD; el DM edita la cifra si quiere.

### 5b.4 · El dato y la puerta

- Columna nueva `Character.xp Int @default(0)`. Migración aditiva con default.
- `packages/shared/src/xp.ts`: `UMBRALES_DE_NIVEL` (20 valores), `XP_POR_VD` (mapa VD → XP, con
  0 → 10 porque el statblock no dice si «tiene ataques»; el DM lo baja si quiere), `nivelPorXp(xp)`,
  `umbralDeNivel(nivel)`, `xpPorVd(cr)`; y `awardXpSchema = { characterIds: string[] (1..20),
  amount: int (−100000..100000, ≠ 0), reason?: string }`. Negativo permitido para corregir un
  error del DM; `xp` nunca baja de 0 (`max(0, xp + amount)`).
- `POST /campaigns/:id/xp` (`character-sheet.controller.ts`), **DM**: en una transacción, por cada
  personaje visible, no archivado y sin `statblockRef`, `xp += amount` y un suceso `XP_AWARDED`
  (tipo nuevo en `GameEventType`, payload `{ characterId, amount, xpTotal, reason? }`,
  visibilidad la del personaje) — la crónica dice «Elara gana 450 PX». **No sube el nivel**:
  D-CF-66, el nivel lo pulsa el DM.
- La hoja (`GET …/sheet`) añade `xp: { actual, siguiente: number | null, nivelPorXp }`. Si
  `nivelPorXp > level`, **avisa** «Has alcanzado el XP del nivel N: el DM puede subirte» y se
  queda; en la del DM el aviso enlaza a «Subir de nivel». Al nivel 20, `siguiente` es `null`.
- Regla de la mesa `progresion: z.enum(["HITO", "XP"]).default("HITO")` en `tableRulesSchema`.
  Con `HITO` —el defecto, para que una campaña que existe no cambie— la hoja no enseña el
  marcador de XP, la mesa no ofrece «Dar XP» y `end()` no propone reparto; con `XP` sí. Es un modo,
  no un permiso: se esconde como Foundry con `noxp`, no se apaga con motivo. **La columna existe y
  la puerta funciona en los dos modos**: cambiar la regla no pierde ni borra XP.
- Pantalla: «Dar XP» en `sessions/dm/` (un `PanelFlotante`, D-CF-67) con los personajes del elenco
  como casillas —los de statblock marcados y no seleccionables con su motivo—, la cantidad,
  «a cada uno» / «a repartir» (como el *each* de Foundry), y el motivo. Al terminar un combate en
  modo `XP`, se abre prellenado con la propuesta. La hoja enseña «1 250 / 2 700 PX» y el aviso.
  La regla de progresión va en las reglas de la mesa como dos radios con su frase.

### 5b.5 · Lo que NO entra

- Subir de nivel solo al cruzar el umbral: descartado (D-CF-66, «avisar y dejar»).
- XP por hito con número («un hito = X PX»): un hito no es una cifra; con `HITO` no hay XP.
- XP para PNJ de statblock (5b.3) y la regla de la DMG de contar PNJ para la parte.
- Un historial aparte de XP: `XP_AWARDED` en la crónica ya lo es.

## 6 · Seguridad, resumida

| Puerta | Quién la cruza | Cómo se demuestra |
|---|---|---|
| `changeHpFromEffect` | solo código con `tx`, tras `canView` en `usar` | e2e: jugador A cura a B con actividad → 200 y `HP_CHANGED` firmado por A; jugador A `PATCH` PG de B → 403 (sin cambios) |
| `createFromEffect` | ídem | e2e: A lanza salvación a B → B ve la petición; A `POST /roll-requests` directo → 403 (sin cambios) |
| Objetivo invisible | `requireVisibleCharacter` ya en `usar` | e2e: A usa actividad sobre un PNJ `DM_ONLY` → 404, sin gastar el recurso (ya existe la garantía L117) |
| Bandeja de daño | DM sobre cualquiera; dueño solo sobre sí; el atacante nunca | e2e: el atacante pulsa «aplicar» sobre el enemigo → 403; el DM → 200 y `HP_CHANGED` firmado por el atacante; segundo clic → 409 |
| Dar XP | solo el DM; nunca a un `statblockRef`; `xpPropuesto` solo lo ve el DM | e2e: jugador `POST …/xp` → 403; DM a un PNJ de statblock → 400; `end()` como jugador no trae `xpPropuesto` |
| Daño al responder | solo con `pendingEffect` que escribió `usar` | unitaria: `answer` con `pendingEffect` inyectado a mano en la base **no** es posible por HTTP; el esquema de `create` por HTTP **no acepta** `pendingEffect` (se quita del input público) |

## 7 · Pruebas

| Capa | Qué |
|---|---|
| Unitarias API | `changeHp` delega en `changeHpFromEffect` (misma mecánica, prueba de igualdad de resultado); `createFromEffect` sin DM; `answer` aplica entero/mitad/nada según `total` vs `dc` y `siSalva`, con `floor`; descanso corto retira SHORT, largo retira SHORT+LONG, interrumpido nada; `refine` de excluyentes |
| Unitarias API (XP) | `nivelPorXp` en los 20 umbrales y en el empate (900 → nivel 3); `xpPorVd` en 0, 1/8, 1/4, 1/2 y 30; la propuesta de `end()`: suma por VD, `floor` del reparto, excluye `statblockRef` y `NEUTRAL`, `null` en modo `HITO`; `xp` no baja de 0; la hoja avisa cuando `nivelPorXp > level` |
| Unitarias web (XP) | «Dar XP» marca y bloquea al PNJ de statblock con su motivo; la hoja pinta «1 250 / 2 700» y el aviso; los radios de progresión |
| e2e API | los de §6 + «dos goblins (VD 1/4) contra dos jugadores: `end()` propone 100 en total, 50 por cabeza; el DM confirma y la hoja de cada uno sube 50» + «bola de fuego a dos objetivos: el mismo `amount` para los dos, uno salva y recibe la mitad» + «espada normal contra el fantasma: preview 5 de 11; espada +1: 11» |
| Unitarias web | el selector ofrece los dos radios y manda `expiresOnRest`; la línea y el chip lo traducen |
| Navegador | un e2e: el clérigo cura al guerrero desde su hoja; la CA/PG del guerrero cambia en su navegador (dos contextos, como `no-puedes-editar.spec.ts`) |
| Mutación | quitar el `>=` por `>` en `answer` → enrojece el caso «empate salva»; quitar `"SHORT"` del largo → enrojece; `>` por `>=` en `nivelPorXp` → enrojece el empate 900; quitar el filtro `statblockRef` de la propuesta → enrojece |

## 8 · Lo que puede salir mal

| Riesgo | Señal | Qué hacer |
|---|---|---|
| Dos copias de la mecánica de PG | `changeHp` y `changeHpFromEffect` divergen | `changeHp` **solo** autoriza y delega; una prueba compara resultados |
| Daño aplicado dos veces | responder dos veces | ya es 400 por `resolvedAt`; el efecto va en la misma transacción que el cierre |
| Interbloqueo | `answer` bloquea `Character` del objetivo mientras `usar` de otro tiene candados | `answer` toca un solo personaje; `usar` ya ordena por `id`. Sin cruce |
| Un jugador se cura sin gastar | `changeHpFromEffect` llamada sin consumo | solo la llama `usar` tras `consumir`; no hay ruta |
| El descanso retira lo que el DM quería conservar | condición «hasta descanso» puesta por error | la crónica lo dice y el DM la vuelve a aplicar; es reversible |

## 9 · Decisiones tomadas aquí (van a `decisiones.md`)

| Decisión | Elegido | Descartado |
|---|---|---|
| Segunda puerta | métodos internos con `tx` obligatorio, sin ruta (precedente `recordFromEngine`) | aflojar `requireEditable`; llamar con el id del DM (diputado confundido) |
| Daño de salvación | se tira una vez al usar, se guarda en `RollRequest.pendingEffect`, se aplica al responder | tirar al responder (un daño por objetivo, contra el SRD) |
| Empate | `total >= dc` salva (SRD) | — |
| «Hasta el descanso» | columna `expiresOnRest`, excluyente con `durationSeconds`; el descanso **borra** con suceso | marcar «vencida»; un número grande de segundos |
| Alcance | solo condiciones | modificadores temporales (cuando el paso 3 lo pida) |
| XP al terminar el combate | **propuesto** por `end()` solo al DM, confirmado en «Dar XP» (D-CF-68) | aplicarlo solo (contra «typically» del SRD y D-N-3) |
| XP a PNJ de statblock | **no** (D-CF-69): sin nivel no hay umbral; 400 y casilla bloqueada con motivo | contarlos para reducir la parte (regla de la DMG, no SRD) |
| Progresión | regla de la mesa `progresion: HITO / XP`, defecto `HITO`; modo, no permiso: `HITO` esconde XP como el `noxp` de Foundry | XP siempre visible; subir solo al cruzar el umbral (D-CF-66) |
| Bandeja de daño | preview calculado por el servidor + un clic para el DM o el dueño del objetivo; el atacante nunca; sin descuento automático | daño automático al impactar (descartado por el autor: revisar antes de pulsar); un segundo formulario con interruptores (lo cubre `PonerDano`) |

## 10 · Cuándo

**Después de la hoja a página completa y antes del paso 3.** No comparte árbol con la hoja (API +
`Condiciones.tsx`, que la hoja mueve pero no reescribe) — aun así, **un implementador por árbol**:
se ejecuta cuando la hoja cierre. Tres migraciones (`RollRequest.pendingEffect`,
`CharacterCondition.expiresOnRest`, `Character.xp` + `XP_AWARDED`), aditivas y con default, sin riesgo para producción.

## Definición de terminado del diseño

Aprobado por el autor cuando lo lea. Su plan por tareas se escribe con `writing-plans` (estimado:
7–9 tareas, una sesión larga: las cinco de antes más `pendingDamage` + preview/aplicar y su tarjeta en el hilo, más XP en dos).
