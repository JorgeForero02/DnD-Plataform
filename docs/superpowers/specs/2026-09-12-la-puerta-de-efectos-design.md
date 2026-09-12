# La puerta de efectos — curar a otro, el daño de una salvación, y «hasta el próximo descanso»

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

## 6 · Seguridad, resumida

| Puerta | Quién la cruza | Cómo se demuestra |
|---|---|---|
| `changeHpFromEffect` | solo código con `tx`, tras `canView` en `usar` | e2e: jugador A cura a B con actividad → 200 y `HP_CHANGED` firmado por A; jugador A `PATCH` PG de B → 403 (sin cambios) |
| `createFromEffect` | ídem | e2e: A lanza salvación a B → B ve la petición; A `POST /roll-requests` directo → 403 (sin cambios) |
| Objetivo invisible | `requireVisibleCharacter` ya en `usar` | e2e: A usa actividad sobre un PNJ `DM_ONLY` → 404, sin gastar el recurso (ya existe la garantía L117) |
| Daño al responder | solo con `pendingEffect` que escribió `usar` | unitaria: `answer` con `pendingEffect` inyectado a mano en la base **no** es posible por HTTP; el esquema de `create` por HTTP **no acepta** `pendingEffect` (se quita del input público) |

## 7 · Pruebas

| Capa | Qué |
|---|---|
| Unitarias API | `changeHp` delega en `changeHpFromEffect` (misma mecánica, prueba de igualdad de resultado); `createFromEffect` sin DM; `answer` aplica entero/mitad/nada según `total` vs `dc` y `siSalva`, con `floor`; descanso corto retira SHORT, largo retira SHORT+LONG, interrumpido nada; `refine` de excluyentes |
| e2e API | los cuatro de §6 + «bola de fuego a dos objetivos: el mismo `amount` para los dos, uno salva y recibe la mitad» |
| Unitarias web | el selector ofrece los dos radios y manda `expiresOnRest`; la línea y el chip lo traducen |
| Navegador | un e2e: el clérigo cura al guerrero desde su hoja; la CA/PG del guerrero cambia en su navegador (dos contextos, como `no-puedes-editar.spec.ts`) |
| Mutación | quitar el `>=` por `>` en `answer` → enrojece el caso «empate salva»; quitar `"SHORT"` del largo → enrojece |

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

## 10 · Cuándo

**Después de la hoja a página completa y antes del paso 3.** No comparte árbol con la hoja (API +
`Condiciones.tsx`, que la hoja mueve pero no reescribe) — aun así, **un implementador por árbol**:
se ejecuta cuando la hoja cierre. Dos migraciones (`RollRequest.pendingEffect`,
`CharacterCondition.expiresOnRest`), aditivas y con default, sin riesgo para producción.

## Definición de terminado del diseño

Aprobado por el autor cuando lo lea. Su plan por tareas se escribe con `writing-plans` (estimado:
5 tareas, una sesión).
