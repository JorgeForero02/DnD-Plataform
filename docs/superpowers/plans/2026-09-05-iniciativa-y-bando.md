# La iniciativa la piden los jugadores, el DM elige el bando, y el combate se puede jugar

> **Para quien ejecute esto:** usa **`superpowers:subagent-driven-development`** (recomendado) o
> **`superpowers:executing-plans`**. Los pasos llevan casilla (`- [ ]`) para ir marcándolos.

**Objetivo:** que cada jugador tire **su** iniciativa cuando empieza un combate, que el DM tire solo
la de los suyos, y que pueda decir **de qué bando** está cada combatiente.

**Arquitectura:** la iniciativa pasa a ser **una petición de tirada más** —`roll-requests` ya sabe
pedir, resolver contra la hoja, aplicar ventaja, gastar inspiración y dejar traza—, ligada a su
encuentro por un `encounterId` nulo en las demás. El encuentro gana un estado `PREPARING` que espera
esas respuestas. El bando **ya lo acepta y lo persiste el servidor**: falta que la pantalla lo mande.

**Pila:** NestJS · Prisma · PostgreSQL · React · Vitest · Playwright.

**Spec:** [`docs/superpowers/specs/2026-09-05-iniciativa-y-bando-design.md`](../specs/2026-09-05-iniciativa-y-bando-design.md)

---

## Restricciones globales

- **La autorización se comprueba en el servidor, siempre.** Esconder un botón no es control de acceso.
- **`canView` (`apps/api/src/common/visibility.ts`) es el dueño único de «quién ve qué».**
- **La validación es Zod desde `@dnd/shared`**, vía `ZodValidationPipe`. Ningún DTO a mano.
- **La forma de los datos vive una sola vez**, en `packages/shared/src`.
- **Ningún valor de enumeración llega a la pantalla.** La forma legible se escribe **una vez por
  dominio** y todo lo demás la importa.
- **Código en inglés; interfaz y documentación en español.**
- **Un commit por tarea**, mensaje en inglés (Conventional Commits).
- **Ninguna tarea se cierra sin prueba real en verde y sin mirar la salida.** Si toca pantalla, se
  abre el navegador.
- **Verificación por mutación obligatoria**: rompe a mano lo que acabas de proteger y comprueba que
  su prueba se pone **roja**.
- **Nunca** desactives una prueba, bajes un umbral ni saltes el gancho de pre-commit.
- **Un valor de enum de PostgreSQL se añade, nunca se edita ni se borra.**
- **Una sola tanda de Playwright en esta máquina**, y no compiles la API mientras corre.
- **`docs/07-historial.md` tiene tope de 1000 líneas**; si te acercas, se archiva **moviendo entero**.

---

## Dos correcciones a la spec, descubiertas leyendo el código

**Van aquí y no se corrigen allí**: la spec es un registro fechado.

### 1 · No hay transacción en `answer`, y es deliberado

La spec dice que la iniciativa se escriba *«en la misma transacción que resuelve la petición»*.
**`RollRequestsService.answer` no usa transacción**, y su comentario explica por qué: tira primero y
cierra después con un `updateMany` **condicionado a `resolvedAt: null`**, de modo que un doble clic
o dos pestañas no producen dos tiradas —gana quien toca la fila y el otro recibe un 400—.

**Se sigue ese patrón, no se pelea con él.** La escritura de la iniciativa va **después de ganar la
carrera**, cuando `cerrada.count === 1`, y esa parte sí en su transacción porque toca varias filas.

### 2 · `recolocar` es privada del módulo de encuentros

`recolocar(tx, encounterId)` es una función de fichero en `encounters.service.ts:89`, no exportada.
`roll-requests` **no puede llamarla**. Por eso la tarea 3 expone un método en `EncountersService` y
`RollRequestsService` depende de él — dirección única, sin ciclo: `encounters` no importa
`roll-requests`.

---

## Los ficheros

| Fichero | Responsabilidad |
|---|---|
| `apps/api/prisma/schema.prisma` | `PREPARING` en el enum, `encounterId` en `RollRequest` |
| `apps/api/prisma/migrations/<nueva>/migration.sql` | Valor de enum, columna, **índice parcial recontado** |
| `packages/shared/src/encounter.schema.ts` | `setSideSchema` nuevo. `sides` ya existe |
| `packages/shared/src/roll-request.schema.ts` | `encounterId` opcional en la creación |
| `apps/api/src/encounters/encounters.service.ts` | Reparto por dueño · `PREPARING` · forzar · cancelar · bando · el método que escribe la iniciativa |
| `apps/api/src/encounters/encounters.controller.ts` | Tres rutas nuevas |
| `apps/api/src/roll-requests/roll-requests.service.ts` | Al ganar la carrera, avisa a encuentros |
| `apps/web/src/features/encounters/EmpezarCombate.tsx` | Bandos por fila; el texto deja de mentir |
| `apps/web/src/features/encounters/TiraDeIniciativa.tsx` | La sala de espera |
| `apps/web/src/features/encounters/vocabulario.ts` | **Nuevo**: los tres bandos y los tres estados, en español, una vez |
| `apps/web/src/features/roll-requests/PanelDeIniciativa.tsx` | **Nuevo**: el panel que toma la mesa |
| `apps/web/src/features/sessions/elenco/FichaDeElenco.tsx` | Corregir el bando |

---

## Tarea 1 · El modelo, la migración y el índice recontado

**Ficheros:**
- Modificar: `apps/api/prisma/schema.prisma:32-35` (enum) y el modelo `RollRequest:736`
- Crear: `apps/api/prisma/migrations/20260905120000_encounter_preparing/migration.sql`
- Prueba: `apps/api/test/encounter-preparing.e2e-spec.ts`

**Interfaces · produce:** `EncounterStatus.PREPARING`, `RollRequest.encounterId: string | null`.

- [ ] **Paso 1 · Escribe la prueba que falla**

`apps/api/test/encounter-preparing.e2e-spec.ts`:

```ts
it("no deja dos encuentros sin terminar en la misma sesión, ni siquiera preparándose", async () => {
  const primero = await prisma.encounter.create({
    data: { sessionId, status: "PREPARING", round: 1, activePosition: 0 },
  });
  expect(primero.status).toBe("PREPARING");

  await expect(
    prisma.encounter.create({
      data: { sessionId, status: "ACTIVE", round: 1, activePosition: 0 },
    }),
  ).rejects.toThrow(/encounter_one_active_per_session/);
});
```

- [ ] **Paso 2 · Córrela y comprueba que falla**

```bash
pnpm --filter @dnd/api test:e2e -- encounter-preparing
```

Esperado: **falla** porque `PREPARING` no es un valor válido del enum.

- [ ] **Paso 3 · El esquema**

En `apps/api/prisma/schema.prisma`:

```prisma
enum EncounterStatus {
  // Pedido pero sin empezar: falta que algún jugador tire su iniciativa. Ver el plan de
  // 2026-09-05. **No es un estado terminal**: o pasa a ACTIVE, o el DM cancela y se BORRA.
  PREPARING
  ACTIVE
  ENDED
}
```

Y en `model RollRequest`, junto a `resolvedEventId`:

```prisma
  /// De qué encuentro salió, si salió de uno. **Nulo en toda petición normal, a propósito**: una
  /// petición de percepción no viene de un combate y no debe fingir que sí.
  ///
  /// Con él, el encuentro sabe a quién espera (sus peticiones sin `resolvedAt`), la pantalla del
  /// jugador sabe que ESTA se presenta a lo grande, y al responder se sabe dónde escribir.
  /// Un booleano `esIniciativa` mentiría el día que haya otra petición ligada a algo.
  encounterId   String?
  encounter     Encounter? @relation(fields: [encounterId], references: [id], onDelete: Cascade)
  /// Cerrada porque el DM forzó el arranque, **no porque alguien la respondiera**. Con
  /// `resolvedAt` puesto y `resolvedEventId` nulo, esto es lo que separa «lo anularon» de
  /// «lo respondí yo»: sin ella la pantalla del jugador le diría que tiró él.
  cancelledAt   DateTime?
```

Y en `model Encounter`, el lado inverso:

```prisma
  rollRequests   RollRequest[]
```

- [ ] **Paso 4 · La migración, a mano**

`ALTER TYPE ... ADD VALUE` **no puede ir en la misma transacción** que lo usa, así que va sola y
primero. Crea `apps/api/prisma/migrations/20260905120000_encounter_preparing/migration.sql`:

```sql
-- Un valor de enum se AÑADE, nunca se edita ni se borra. Los encuentros existentes siguen ACTIVE.
ALTER TYPE "EncounterStatus" ADD VALUE IF NOT EXISTS 'PREPARING' BEFORE 'ACTIVE';

ALTER TABLE "RollRequest" ADD COLUMN "encounterId" TEXT;
-- **Anular no es responder.** Cuando el DM fuerza el arranque, la petición se cierra SIN que nadie
-- la respondiera: `resolvedEventId` se queda nulo y esto lo distingue. Sin esta columna, la
-- pantalla del jugador diría que tiró él.
ALTER TABLE "RollRequest" ADD COLUMN "cancelledAt" TIMESTAMP(3);

-- Un tipo de suceso nuevo es una migración, como los seis del 2026-09-05.
ALTER TYPE "GameEventType" ADD VALUE IF NOT EXISTS 'INITIATIVE_ROLLED_BY_SYSTEM';
ALTER TABLE "RollRequest" ADD CONSTRAINT "RollRequest_encounterId_fkey"
  FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE;
CREATE INDEX "RollRequest_encounterId_idx" ON "RollRequest"("encounterId");

-- **El índice parcial hay que recontarlo.** Con PREPARING el WHERE viejo se queda corto: cabría
-- uno preparándose y otro activo a la vez, que es el lío que este índice existe para impedir.
DROP INDEX "encounter_one_active_per_session";
CREATE UNIQUE INDEX "encounter_one_active_per_session"
  ON "Encounter" ("sessionId") WHERE "status" IN ('ACTIVE', 'PREPARING');
```

- [ ] **Paso 5 · Aplícala y córrela**

```bash
docker compose up -d
pnpm --filter @dnd/api exec prisma migrate dev --name encounter_preparing
pnpm --filter @dnd/api test:e2e -- encounter-preparing
```

Esperado: **pasa**.

- [ ] **Paso 6 · Mutación**

Cambia el `WHERE` del índice a solo `'ACTIVE'`, vuelve a aplicar y corre: la prueba **se pone
roja**. Deshaz.

- [ ] **Paso 7 · Commit**

```bash
git add apps/api/prisma apps/api/test/encounter-preparing.e2e-spec.ts
git commit -m "feat(api): an encounter can be preparing, and the index counts it"
```

---

## Tarea 2 · `start()` reparte por dueño

**Ficheros:**
- Modificar: `apps/api/src/encounters/encounters.service.ts:160-265`
- Modificar: `packages/shared/src/roll-request.schema.ts` (`encounterId` en la creación)
- Prueba: `apps/api/src/encounters/encounters.service.spec.ts`

**Interfaces · consume:** `EncounterStatus.PREPARING`, `RollRequest.encounterId` (tarea 1).
**Produce:** `start()` devuelve un encuentro `PREPARING` cuando quedan peticiones.

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```ts
it("le pide la iniciativa a quien NO es el DM, y tira por los del DM", async () => {
  // pj de una jugadora, goblin del DM
  const encuentro = await service.start(dmId, campaignId, sessionId, {
    characterIds: [pjId, goblinId],
  });

  expect(encuentro.status).toBe("PREPARING");

  const peticiones = await prisma.rollRequest.findMany({
    where: { encounterId: encuentro.id },
  });
  expect(peticiones).toHaveLength(1);
  expect(peticiones[0].characterId).toBe(pjId);
  expect(peticiones[0].key).toBe("initiative");

  const goblin = await prisma.combatant.findFirst({
    where: { encounterId: encuentro.id, characterId: goblinId },
  });
  expect(goblin!.initiative).toBeGreaterThan(0);
});

it("un PNJ cedido a un jugador también recibe petición", async () => {
  // mismo statblock que el goblin, pero ownerId = jugadora
  const encuentro = await service.start(dmId, campaignId, sessionId, {
    characterIds: [pnjCedidoId],
  });
  const peticiones = await prisma.rollRequest.findMany({
    where: { encounterId: encuentro.id },
  });
  expect(peticiones.map((p) => p.characterId)).toEqual([pnjCedidoId]);
});

it("empieza ACTIVE directo si el DM combate solo contra los suyos", async () => {
  const encuentro = await service.start(dmId, campaignId, sessionId, {
    characterIds: [goblinId, banditoId],
  });
  expect(encuentro.status).toBe("ACTIVE");
});

it("un jugador con dos personajes recibe dos peticiones", async () => {
  const encuentro = await service.start(dmId, campaignId, sessionId, {
    characterIds: [pjId, segundoPjId],
  });
  const peticiones = await prisma.rollRequest.findMany({
    where: { encounterId: encuentro.id },
  });
  expect(peticiones).toHaveLength(2);
});
```

- [ ] **Paso 2 · Córrelas y comprueba que fallan**

```bash
pnpm --filter @dnd/api test -- encounters.service
```

Esperado: **fallan** — hoy `start()` tira por todos y siempre crea `ACTIVE`.

- [ ] **Paso 3 · `encounterId` en el esquema de la petición**

En `packages/shared/src/roll-request.schema.ts`, dentro de `createRollRequestSchema`:

```ts
  /**
   * De qué encuentro sale, si sale de uno. **Lo pone el servidor al empezar un combate, nunca
   * quien llama desde fuera**: una petición ligada a un encuentro bloquea la mesa, y eso no se
   * concede por parámetro.
   */
  encounterId: z.string().cuid().optional(),
```

- [ ] **Paso 4 · Reparte en `start()`**

En `encounters.service.ts`, **antes** del bucle de grupos:

```ts
// **El criterio es si el dueño es el DM, no si «tiene dueño».** `Character.ownerId` es
// obligatorio, así que un goblin del DM también tiene dueño: preguntar por su existencia no
// distingue nada. Y NO se mira `statblockRef` a propósito — un PNJ jugable es una fila de
// `Character` como cualquier otra desde 2D, y quien lo lleva decide si tira, no de dónde
// salieron sus números.
const suyos = combatientes.filter((c) => c.ownerId === userId);
const ajenos = combatientes.filter((c) => c.ownerId !== userId);
```

El bucle de grupos pasa a recorrer **solo `suyos`**. Los `ajenos` entran con `initiative: 0` y su
petición. El estado sale de si quedó alguna:

```ts
const status = ajenos.length > 0 ? "PREPARING" : "ACTIVE";
```

Dentro de la transacción, tras crear los combatientes y **antes** de `recolocar`:

```ts
await Promise.all(
  ajenos.map((personaje) =>
    tx.rollRequest.create({
      data: {
        campaignId,
        characterId: personaje.id,
        requestedById: userId,
        encounterId: encounter.id,
        key: "initiative",
        label: "Iniciativa",
        mode: "NORMAL",
        // La ve la mesa si el personaje la ve: mismo criterio que la tirada del servidor, y por
        // el mismo motivo — con `PUBLIC` fija, un PNJ escondido cantaba su iniciativa.
        audience: loVeLaMesa(personaje.visibility) ? "PUBLIC" : "DM_PRIVATE",
      },
    }),
  ),
);
```

- [ ] **Paso 5 · Comprueba que la clave `initiative` resuelve**

`RollRequestsService.modificadorDeLaHoja` lanza un 400 si la hoja no deriva la clave. Comprueba
que `getSheet` expone `initiative`:

```bash
grep -n "initiative" apps/api/src/rules/engine.ts apps/api/src/characters/character-sheet.service.ts | head
```

Si **no** la expone, añade el caso en `modificadorDeLaHoja` delegando en
`CharacterSheetService.getInitiativeModifier`, que ya existe y ya es la fuente única. **No
dupliques el cálculo.**

- [ ] **Paso 6 · Córrelas**

```bash
pnpm --filter @dnd/api test -- encounters.service
```

Esperado: **pasan las cuatro**.

- [ ] **Paso 7 · Mutación**

Cambia `c.ownerId !== userId` por `false` —que el servidor vuelva a tirar por todos—: las tres
primeras se ponen **rojas**. Deshaz.

- [ ] **Paso 8 · Commit**

```bash
git add apps/api packages/shared
git commit -m "feat(api): the players are asked for their initiative, the DM rolls for his own"
```

---

## Tarea 3 · Responder escribe la iniciativa en el combate

**Ficheros:**
- Modificar: `apps/api/src/encounters/encounters.service.ts` (método nuevo)
- Modificar: `apps/api/src/roll-requests/roll-requests.service.ts` (tras ganar la carrera)
- Modificar: `apps/api/src/roll-requests/roll-requests.module.ts` (importa `EncountersModule`)
- Prueba: `apps/api/test/iniciativa-pedida.e2e-spec.ts`

**Interfaces · produce:**

```ts
// EncountersService
async aplicarIniciativaDePeticion(
  encounterId: string,
  characterId: string,
  initiative: number,
): Promise<{ empezo: boolean }>;
```

- [ ] **Paso 1 · Escribe la prueba que falla**

```ts
it("responder la petición coloca al personaje y, si era la última, empieza el combate", async () => {
  const { encuentro, peticiones } = await empezarConDosJugadores();
  expect(encuentro.status).toBe("PREPARING");

  await rollRequests.answer(jugadoraId, campaignId, peticiones[0].id, {
    spendInspiration: false,
  });
  expect((await recargar(encuentro.id)).status).toBe("PREPARING");

  await rollRequests.answer(jugadorId, campaignId, peticiones[1].id, {
    spendInspiration: false,
  });
  const final = await recargar(encuentro.id);
  expect(final.status).toBe("ACTIVE");

  const filas = await prisma.combatant.findMany({ where: { encounterId: encuentro.id } });
  expect(filas.every((f) => f.initiative !== 0)).toBe(true);
  expect(new Set(filas.map((f) => f.position)).size).toBe(filas.length);
});

it("tres respuestas simultáneas dan UN solo orden y empiezan el combate UNA vez", async () => {
  const { encuentro, peticiones } = await empezarConTresJugadores();
  const sucesosAntes = await contarSucesos(encuentro.id, "ENCOUNTER_STARTED");

  await Promise.all(
    peticiones.map((p, i) =>
      rollRequests.answer(duenos[i], campaignId, p.id, { spendInspiration: false }),
    ),
  );

  const filas = await prisma.combatant.findMany({ where: { encounterId: encuentro.id } });
  expect(new Set(filas.map((f) => f.position)).size).toBe(filas.length);
  expect(await contarSucesos(encuentro.id, "ENCOUNTER_STARTED")).toBe(sucesosAntes + 1);
});
```

- [ ] **Paso 2 · Córrela y comprueba que falla**

```bash
pnpm --filter @dnd/api test:e2e -- iniciativa-pedida
```

Esperado: **falla** — nadie escribe la iniciativa.

- [ ] **Paso 3 · El método en `EncountersService`**

```ts
/**
 * Escribe la iniciativa que acaba de tirar un jugador y recoloca el orden. Si con ella no queda
 * ninguna petición pendiente, **el combate empieza**.
 *
 * **Lo llama `roll-requests`, no al revés.** `recolocar` es privada de este módulo y es la ÚNICA
 * que sabe convertir «iniciativa + grupo» en «orden»; exponerla sería abrir la puerta a una
 * segunda forma de ordenar. La dirección es acíclica: `encounters` no importa `roll-requests`.
 */
async aplicarIniciativaDePeticion(
  encounterId: string,
  characterId: string,
  initiative: number,
): Promise<{ empezo: boolean }> {
  return this.prisma.transaction(async (tx) => {
    await tx.combatant.updateMany({
      where: { encounterId, characterId },
      data: { initiative },
    });
    await recolocar(tx, encounterId);

    const pendientes = await tx.rollRequest.count({
      where: { encounterId, resolvedAt: null },
    });
    if (pendientes > 0) return { empezo: false };

    // **`updateMany` con el estado en el `where`, no `update`.** Con tres jugadores respondiendo
    // a la vez, dos pueden ver cero pendientes; solo uno toca la fila y solo ese escribe el
    // suceso. Es el mismo guardián que usa `answer` para no tirar dos veces.
    const arrancado = await tx.encounter.updateMany({
      where: { id: encounterId, status: "PREPARING" },
      data: { status: "ACTIVE" },
    });
    return { empezo: arrancado.count === 1 };
  });
}
```

- [ ] **Paso 4 · Engánchalo en `answer`**

En `roll-requests.service.ts`, justo después del `if (cerrada.count === 0) throw ...`:

```ts
// **Después de ganar la carrera, no antes.** Si se escribiera antes del `updateMany`, un doble
// clic colocaría dos veces al mismo combatiente con dos tiradas distintas.
if (peticion.encounterId) {
  const { empezo } = await this.encounters.aplicarIniciativaDePeticion(
    peticion.encounterId,
    peticion.characterId,
    resultado.total,
  );
  if (empezo) {
    // **`RollRequest` NO tiene `sessionId`** — se comprobó contra el esquema, no se supuso. La
    // sesión sale del encuentro, que es quien la tiene.
    const encuentro = await this.prisma.encounter.findUnique({
      where: { id: peticion.encounterId },
      select: { sessionId: true },
    });
    await this.events.record(userId, campaignId, {
      sessionId: encuentro!.sessionId,
      subjectType: "encounter",
      subjectId: peticion.encounterId,
      type: "ENCOUNTER_STARTED",
    });
  }
}
```

- [ ] **Paso 5 · Córrela**

```bash
pnpm --filter @dnd/api test:e2e -- iniciativa-pedida
```

Esperado: **pasan las dos**.

- [ ] **Paso 6 · Mutación**

Cambia el `updateMany` del encuentro por un `update` sin el estado en el `where`: la prueba de las
tres respuestas simultáneas se pone **roja** (el suceso se escribe más de una vez). Deshaz.

- [ ] **Paso 7 · Commit**

```bash
git add apps/api
git commit -m "feat(api): answering an initiative request places the combatant and starts the fight"
```

---

## Tarea 4 · «Empezar igualmente» y «Cancelar»

**Ficheros:**
- Modificar: `apps/api/src/encounters/encounters.service.ts`, `encounters.controller.ts`
- Prueba: `apps/api/test/iniciativa-forzada.e2e-spec.ts`

**Interfaces · produce:** `POST /campaigns/:id/sessions/:sid/encounters/:eid/force-start` ·
`DELETE …/encounters/:eid` (solo cuando está `PREPARING`).

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```ts
it("forzar tira por los ausentes, anula sus peticiones y dice que fue el sistema", async () => {
  const { encuentro, peticiones } = await empezarConDosJugadores();
  await rollRequests.answer(jugadoraId, campaignId, peticiones[0].id, {
    spendInspiration: false,
  });

  await service.forceStart(dmId, campaignId, sessionId, encuentro.id);

  expect((await recargar(encuentro.id)).status).toBe("ACTIVE");
  const pendientes = await prisma.rollRequest.count({
    where: { encounterId: encuentro.id, resolvedAt: null },
  });
  expect(pendientes).toBe(0);

  const sucesos = await prisma.gameEvent.findMany({
    where: { subjectId: encuentro.id, type: "INITIATIVE_ROLLED_BY_SYSTEM" },
  });
  expect(sucesos).toHaveLength(1);
});

it("forzar sin ser el DM es 403", async () => {
  const { encuentro } = await empezarConDosJugadores();
  await expect(
    service.forceStart(jugadoraId, campaignId, sessionId, encuentro.id),
  ).rejects.toThrow(ForbiddenException);
});

it("responder una petición ya anulada es 409 y lo explica", async () => {
  const { encuentro, peticiones } = await empezarConDosJugadores();
  await service.forceStart(dmId, campaignId, sessionId, encuentro.id);
  await expect(
    rollRequests.answer(jugadoraId, campaignId, peticiones[0].id, { spendInspiration: false }),
  ).rejects.toMatchObject({ status: 409 });
});

it("cancelar BORRA el encuentro y sus peticiones", async () => {
  const { encuentro } = await empezarConDosJugadores();
  await service.cancel(dmId, campaignId, sessionId, encuentro.id);

  expect(await prisma.encounter.findUnique({ where: { id: encuentro.id } })).toBeNull();
  expect(
    await prisma.rollRequest.count({ where: { encounterId: encuentro.id } }),
  ).toBe(0);
});

it("cancelar un combate YA empezado no se puede", async () => {
  const encuentro = await service.start(dmId, campaignId, sessionId, {
    characterIds: [goblinId],
  });
  expect(encuentro.status).toBe("ACTIVE");
  await expect(
    service.cancel(dmId, campaignId, sessionId, encuentro.id),
  ).rejects.toThrow(ConflictException);
});
```

- [ ] **Paso 2 · Córrelas y comprueba que fallan**

```bash
pnpm --filter @dnd/api test:e2e -- iniciativa-forzada
```

- [ ] **Paso 3 · Los dos métodos**

```ts
/**
 * El DM empieza sin esperar a quien no ha tirado. **El servidor tira por él y LO DICE**: la frase
 * importa tanto como el número, porque un jugador que vuelve tiene derecho a saber que su
 * iniciativa no la tiró él.
 */
async forceStart(userId: string, campaignId: string, sessionId: string, encounterId: string) {
  await this.membership.requireDm(campaignId, userId);
  const encuentro = await this.prisma.encounter.findFirst({
    where: { id: encounterId, sessionId, status: "PREPARING" },
    include: { rollRequests: { where: { resolvedAt: null }, include: { character: true } } },
  });
  if (!encuentro) throw new NotFoundException("Ese combate no está preparándose.");

  for (const peticion of encuentro.rollRequests) {
    const modificador = await this.sheets.getInitiativeModifier(
      userId,
      campaignId,
      peticion.characterId,
    );
    const resultado = await this.rolls.roll(userId, campaignId, {
      expression: conSigno(modificador),
      label: "Iniciativa",
      characterId: peticion.characterId,
      sessionId,
      mode: "NORMAL",
      spendInspiration: false,
      audience: loVeLaMesa(peticion.character.visibility) ? "PUBLIC" : "DM_PRIVATE",
    });
    if (!resultado.revealed) {
      throw new BadRequestException("La tirada de iniciativa no se pudo leer");
    }
    await this.prisma.transaction(async (tx) => {
      // **Anular no es responder.** `resolvedEventId` se queda nulo: nadie respondió esta
      // petición, y confundirlas haría que la pantalla del jugador dijera que él tiró.
      await tx.rollRequest.updateMany({
        where: { id: peticion.id, resolvedAt: null },
        data: { resolvedAt: new Date(), cancelledAt: new Date() },
      });
      await tx.combatant.updateMany({
        where: { encounterId, characterId: peticion.characterId },
        data: { initiative: resultado.total },
      });
      await recolocar(tx, encounterId);
    });
    await this.events.record(userId, campaignId, {
      sessionId,
      subjectType: "encounter",
      subjectId: encounterId,
      type: "INITIATIVE_ROLLED_BY_SYSTEM",
      payload: { characterId: peticion.characterId },
    });
  }

  await this.prisma.encounter.updateMany({
    where: { id: encounterId, status: "PREPARING" },
    data: { status: "ACTIVE" },
  });
  return this.get(userId, campaignId, sessionId, encounterId);
}

/**
 * El DM se arrepiente antes de empezar. **Se BORRA, no se marca `ENDED`**: un combate que nunca
 * empezó no es historia, es un clic deshecho, y dejarlo llena el registro de ruido. Decisión del
 * autor, 2026-09-05. Las peticiones se van por cascada.
 */
async cancel(userId: string, campaignId: string, sessionId: string, encounterId: string) {
  await this.membership.requireDm(campaignId, userId);
  const borrado = await this.prisma.encounter.deleteMany({
    where: { id: encounterId, sessionId, status: "PREPARING" },
  });
  if (borrado.count === 0) {
    throw new ConflictException("Ese combate ya empezó: no se puede cancelar, se termina.");
  }
}
```

- [ ] **Paso 4 · El 409 al responder una anulada**

`cancelledAt` **ya existe** desde la tarea 1: aquí solo se lee. En `answer`, tras la comprobación
de `resolvedAt`:

```ts
if (peticion.cancelledAt) {
  throw new ConflictException(
    "El combate ya empezó y tu iniciativa la tiró el sistema.",
  );
}
```

- [ ] **Paso 5 · Las dos rutas en el controlador**

```ts
@Post(":encounterId/force-start")
forceStart(
  @CurrentUser() user: { id: string },
  @Param("campaignId") campaignId: string,
  @Param("sessionId") sessionId: string,
  @Param("encounterId") encounterId: string,
) {
  return this.service.forceStart(user.id, campaignId, sessionId, encounterId);
}

@Delete(":encounterId")
@HttpCode(204)
cancel(
  @CurrentUser() user: { id: string },
  @Param("campaignId") campaignId: string,
  @Param("sessionId") sessionId: string,
  @Param("encounterId") encounterId: string,
) {
  return this.service.cancel(user.id, campaignId, sessionId, encounterId);
}
```

- [ ] **Paso 6 · Córrelas** — `pnpm --filter @dnd/api test:e2e -- iniciativa-forzada`. Esperado:
      **pasan las cinco**.

- [ ] **Paso 7 · Mutación**

Quita el `requireDm` de `forceStart`: la prueba del 403 se pone **roja**. Deshaz.

- [ ] **Paso 8 · Commit**

```bash
git add apps/api
git commit -m "feat(api): the DM can start without the stragglers, and cancelling deletes"
```

---

## Tarea 5 · Corregir el bando con el combate en marcha

**Ficheros:**
- Modificar: `packages/shared/src/encounter.schema.ts`, `encounters.service.ts`, `encounters.controller.ts`
- Prueba: `apps/api/src/encounters/encounters.service.spec.ts`

**Interfaces · produce:** `setSideSchema` · `PATCH …/encounters/:eid/combatants/:cid/side`.

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```ts
it("el DM cambia el bando de un combatiente", async () => {
  await service.setSide(dmId, campaignId, sessionId, encuentroId, combatanteId, {
    side: "ENEMY",
  });
  const fila = await prisma.combatant.findUnique({ where: { id: combatanteId } });
  expect(fila!.side).toBe("ENEMY");
});

it("cambiar el bando sin ser DM es 403", async () => {
  await expect(
    service.setSide(jugadoraId, campaignId, sessionId, encuentroId, combatanteId, {
      side: "ENEMY",
    }),
  ).rejects.toThrow(ForbiddenException);
});
```

- [ ] **Paso 2 · Córrelas** — fallan: `setSide` no existe.

- [ ] **Paso 3 · El esquema**

En `packages/shared/src/encounter.schema.ts`:

```ts
/**
 * El DM corrige el bando con el combate en marcha — un aliado te traiciona al segundo asalto.
 * Hermana de `setInitiativeSchema`: sin ella, el bando sería la única decisión del combate que no
 * se puede rectificar.
 */
export const setSideSchema = z.object({
  side: z.enum(["ALLY", "ENEMY", "NEUTRAL"]),
});
export type SetSideInput = z.infer<typeof setSideSchema>;
```

- [ ] **Paso 4 · El método y la ruta**

```ts
async setSide(
  userId: string,
  campaignId: string,
  sessionId: string,
  encounterId: string,
  combatantId: string,
  input: SetSideInput,
) {
  await this.membership.requireDm(campaignId, userId);
  const tocado = await this.prisma.combatant.updateMany({
    where: { id: combatantId, encounterId },
    data: { side: input.side },
  });
  if (tocado.count === 0) throw new NotFoundException("Ese combatiente no está en este combate.");
  return this.get(userId, campaignId, sessionId, encounterId);
}
```

- [ ] **Paso 5 · Córrelas** — pasan.
- [ ] **Paso 6 · Mutación** — quita el `requireDm`: la del 403 se pone **roja**. Deshaz.
- [ ] **Paso 7 · Commit**

```bash
git add apps/api packages/shared
git commit -m "feat(api): a combatant's side can be corrected mid-fight"
```

---

## Tarea 6 · El vocabulario, una sola vez

**Ficheros:**
- Crear: `apps/web/src/features/encounters/vocabulario.ts`
- Prueba: `apps/web/src/features/encounters/__tests__/vocabulario.test.ts`

- [ ] **Paso 1 · La prueba**

```ts
import { NOMBRE_BANDO, BANDOS, NOMBRE_ESTADO_DE_COMBATE } from "../vocabulario";

it("los tres bandos tienen nombre y explicación en español", () => {
  expect(BANDOS.map((b) => b.valor)).toEqual(["ALLY", "ENEMY", "NEUTRAL"]);
  for (const bando of BANDOS) {
    expect(bando.nombre).toMatch(/^[A-ZÁÉÍÓÚÑ]/);
    expect(bando.explicacion.length).toBeGreaterThan(10);
  }
});

it("ningún valor crudo se escapa", () => {
  expect(NOMBRE_BANDO.ENEMY).toBe("Enemigo");
  expect(NOMBRE_ESTADO_DE_COMBATE.PREPARING).toBe("Preparando combate");
});
```

- [ ] **Paso 2 · Córrela** — falla: el fichero no existe.

- [ ] **Paso 3 · El fichero**

```ts
import type { CombatantSide, EncounterStatus } from "@dnd/shared";

// **Ningún valor de enumeración llega a la pantalla** (docs/04-convenciones.md), y la traducción
// vive **una sola vez por dominio**. Ese fallo apareció tres veces en una sola mañana:
// `(LOCATION)`, `PUBLIC`, `Nuevo LOCATION`.

export const NOMBRE_BANDO: Record<CombatantSide, string> = {
  ALLY: "Aliado",
  ENEMY: "Enemigo",
  NEUTRAL: "Neutral",
};

/**
 * Los tres, con su explicación. **Se pintan como radios, no como desplegable**: son opciones con
 * significado y el DM tiene que verlas todas a la vez (regla vinculante del reseño 2026-09-02).
 */
export const BANDOS = [
  { valor: "ALLY", nombre: "Aliado", explicacion: "Lucha del lado del grupo." },
  { valor: "ENEMY", nombre: "Enemigo", explicacion: "Lucha contra el grupo." },
  { valor: "NEUTRAL", nombre: "Neutral", explicacion: "Ni una cosa ni la otra, todavía." },
] as const satisfies ReadonlyArray<{ valor: CombatantSide; nombre: string; explicacion: string }>;

export const NOMBRE_ESTADO_DE_COMBATE: Record<EncounterStatus, string> = {
  PREPARING: "Preparando combate",
  ACTIVE: "En combate",
  ENDED: "Combate terminado",
};
```

- [ ] **Paso 4 · Córrela** — pasa.
- [ ] **Paso 5 · Commit**

```bash
git add apps/web/src/features/encounters
git commit -m "feat(web): one Spanish name per side and per combat state, written once"
```

---

## Tarea 7 · El diálogo del DM manda los bandos, y deja de mentir

**Ficheros:**
- Modificar: `apps/web/src/features/encounters/EmpezarCombate.tsx`, `api.ts`
- Prueba: `apps/web/src/features/encounters/__tests__/EmpezarCombate.test.tsx`

- [ ] **Paso 1 · Las pruebas**

```tsx
it("propone aliado al grupo y enemigo a los PNJ, y se puede cambiar", async () => {
  render(<EmpezarCombate {...props} />);
  expect(screen.getByRole("radio", { name: /aliado/i, checked: true })).toBeInTheDocument();
  await userEvent.click(screen.getAllByRole("radio", { name: /neutral/i })[0]);
  await userEvent.click(screen.getByRole("button", { name: /pedir iniciativa/i }));
  expect(empezar).toHaveBeenCalledWith(
    expect.objectContaining({ sides: expect.objectContaining({ [sylasId]: "NEUTRAL" }) }),
  );
});

it("ya no dice que la iniciativa la tira el servidor", () => {
  render(<EmpezarCombate {...props} />);
  expect(screen.queryByText(/la tira el servidor/i)).not.toBeInTheDocument();
  expect(screen.getByText(/cada jugador tira la suya/i)).toBeInTheDocument();
});

it("dice cuántos van a tirar", () => {
  render(<EmpezarCombate {...props} />);
  expect(screen.getByText(/2 tirarán su iniciativa/i)).toBeInTheDocument();
});
```

- [ ] **Paso 2 · Córrelas** — fallan.

- [ ] **Paso 3 · La implementación**

Estado de bandos, sembrado con la propuesta:

```tsx
// **Una propuesta rellenada y visible, no un valor oculto.** El grupo suele ser aliado y los PNJ
// de la mesa enemigos; el DM lo ve marcado y lo cambia de un clic. El servidor sigue sin
// adivinar nada: `schema.prisma:440` dice que no puede, y no puede.
const [bandos, setBandos] = useState<Record<string, CombatantSide>>(() =>
  Object.fromEntries(
    candidatos.map((c) => [c.id, c.esDelGrupo ? "ALLY" : "ENEMY"]),
  ),
);
```

Los radios por fila, importando `BANDOS` del vocabulario. El texto de cabecera pasa a:

> «Elige quién combate y de qué lado está. **Cada jugador tira la suya**; tú tiras la de los tuyos.
> Las criaturas idénticas actúan a la vez con una sola tirada.»

Y el botón, a **«Pedir iniciativa»**.

- [ ] **Paso 4 · Córrelas** — pasan.
- [ ] **Paso 5 · Mutación** — deja de mandar `sides` en el `POST`: la primera se pone **roja**. Deshaz.
- [ ] **Paso 6 · Commit**

```bash
git add apps/web
git commit -m "feat(web): the combat dialog sends each side, and stops promising a server roll"
```

---

## Tarea 8 · La sala de espera

**Ficheros:**
- Modificar: `apps/web/src/features/encounters/TiraDeIniciativa.tsx`, `hooks.ts`, `api.ts`
- Prueba: `apps/web/src/features/encounters/__tests__/SalaDeEspera.test.tsx`

- [ ] **Paso 1 · Las pruebas**

```tsx
it("cuenta quién ha tirado y nombra AL JUGADOR, no al personaje", () => {
  render(<TiraDeIniciativa encuentro={preparando} />);
  expect(screen.getByText("2 de 4")).toBeInTheDocument();
  expect(screen.getByText(/esperando a Marta/i)).toBeInTheDocument();
});

it("el jugador no ve los botones del DM", () => {
  render(<TiraDeIniciativa encuentro={preparando} soyDm={false} />);
  expect(screen.queryByRole("button", { name: /empezar igualmente/i })).not.toBeInTheDocument();
});
```

- [ ] **Paso 2 · Córrelas** — fallan.
- [ ] **Paso 3 · La implementación.** Se pinta cuando `encuentro.status === "PREPARING"`, en lugar
      del orden de turnos. Botones «Cancelar» y «Empezar igualmente», **solo si `soyDm`** — y
      recuerda que **esconder un botón no es control de acceso**: la puerta ya está en el servidor
      (tarea 4), esto es cortesía.
- [ ] **Paso 4 · Córrelas** — pasan.
- [ ] **Paso 5 · Commit**

```bash
git add apps/web
git commit -m "feat(web): a waiting room shows who has rolled and who is holding up the fight"
```

---

## Tarea 9 · El panel del jugador

**Ficheros:**
- Crear: `apps/web/src/features/roll-requests/PanelDeIniciativa.tsx`
- Modificar: `apps/web/src/features/roll-requests/TiradasPendientes.tsx`
- Prueba: `apps/web/src/features/roll-requests/__tests__/PanelDeIniciativa.test.tsx`

- [ ] **Paso 1 · Las pruebas**

```tsx
it("enseña el modificador ANTES de tirar", () => {
  render(<PanelDeIniciativa peticion={{ ...peticion, modificador: 3 }} />);
  expect(screen.getByText("+3")).toBeInTheDocument();
});

it("no se puede cerrar sin tirar", () => {
  render(<PanelDeIniciativa peticion={peticion} />);
  expect(screen.queryByRole("button", { name: /cerrar|cancelar/i })).not.toBeInTheDocument();
});

it("una petición normal NO usa este panel", () => {
  render(<TiradasPendientes peticiones={[sinEncuentro]} />);
  expect(screen.queryByText(/empieza el combate/i)).not.toBeInTheDocument();
});
```

- [ ] **Paso 2 · Córrelas** — fallan.
- [ ] **Paso 3 · La implementación.** `TiradasPendientes` separa las que traen `encounterId` y las
      pinta con `PanelDeIniciativa`. El modificador sale de la petición —el servidor lo manda—, no
      se recalcula en el navegador. Si `mode !== "NORMAL"`, se dice.
- [ ] **Paso 4 · Córrelas** — pasan.
- [ ] **Paso 5 · Commit**

```bash
git add apps/web
git commit -m "feat(web): a combat starting takes over the table until the player rolls"
```

---

## Tarea 10 · Corregir el bando desde la ficha del elenco

**Ficheros:**
- Modificar: `apps/web/src/features/sessions/elenco/FichaDeElenco.tsx`
- Prueba: `apps/web/src/features/sessions/elenco/__tests__/FichaDeElenco.test.tsx`

**Antes de escribir nada, compara con el prototipo**: el autor dice que el bando ya está resuelto
ahí, en la ficha del elenco al empezar el combate.

- [ ] **Paso 1 · La prueba**

```tsx
it("el DM cambia el bando desde la ficha, y el jugador no lo ve", async () => {
  render(<FichaDeElenco {...props} soyDm />);
  await userEvent.click(screen.getByRole("button", { name: /enemigo/i }));
  expect(cambiarBando).toHaveBeenCalledWith(combatanteId, "ENEMY");

  render(<FichaDeElenco {...props} soyDm={false} />);
  expect(screen.queryByRole("button", { name: /enemigo/i })).not.toBeInTheDocument();
});
```

- [ ] **Paso 2 · Córrela** — falla.
- [ ] **Paso 3 · La implementación**, junto a «Daño» y «Condición», con `NOMBRE_BANDO` del
      vocabulario. **Solo con el combate en marcha.**
- [ ] **Paso 4 · Córrela** — pasa.
- [ ] **Paso 5 · Commit**

```bash
git add apps/web
git commit -m "feat(web): the side can be corrected from the cast card, where the prototype puts it"
```

---

## Tarea 11 · El e2e de dos navegadores, y la medición a 390 px

**Ficheros:**
- Crear: `apps/web/e2e/iniciativa-en-vivo.spec.ts`
- Modificar: `docs/08-pruebas.md` (los conteos de e2e viven **solo** ahí)

**Es la única prueba que demuestra que esto funciona.** Lo demás es fontanería.

- [ ] **Paso 1 · El recorrido**

```ts
test("el DM pide iniciativa y el jugador se entera sin recargar", async ({ browser }) => {
  const dm = await (await browser.newContext()).newPage();
  const jugadora = await (await browser.newContext()).newPage();

  await entrarComo(dm, DM);
  await entrarComo(jugadora, JUGADORA);
  await abrirLaMesa(dm);
  await abrirLaMesa(jugadora);

  await dm.getByRole("button", { name: "Entrar en combate" }).click();
  await dm.getByRole("button", { name: "Pedir iniciativa" }).click();

  // **Sin recargar**: si esto pasa, el canal en vivo funciona de verdad.
  await expect(jugadora.getByText("EMPIEZA EL COMBATE")).toBeVisible({ timeout: 10_000 });
  await expect(dm.getByText(/0 de \d/)).toBeVisible();

  await jugadora.getByRole("button", { name: "Tirar" }).click();
  await expect(dm.getByText(/1 de \d/)).toBeVisible({ timeout: 10_000 });
});

test("el panel de iniciativa cabe a 390 px", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await entrarComo(page, JUGADORA);
  await pedirIniciativaDesdeLaApi();
  const caja = await page.getByTestId("panel-de-iniciativa").boundingBox();
  // **`jsdom` no maqueta**: esto se mide con números o no se sabe. Es lo que dejó 871 pruebas
  // verdes con la mesa rota.
  expect(caja!.x).toBeGreaterThanOrEqual(0);
  expect(caja!.x + caja!.width).toBeLessThanOrEqual(390);
});
```

- [ ] **Paso 2 · Córrelo**

```bash
docker compose up -d
pnpm --filter @dnd/web e2e -- iniciativa-en-vivo
```

**Una sola tanda de Playwright en esta máquina**, y **no compiles la API mientras corre**.

- [ ] **Paso 3 · Mutación**

Apaga la emisión del canal (comenta el `record` del arranque): la primera prueba se pone **roja**
por tiempo agotado, porque el jugador solo se enteraría con el sondeo de 60 s. Deshaz.

- [ ] **Paso 4 · Los conteos** — actualiza `docs/08-pruebas.md`, que es su **fuente única declarada**.

- [ ] **Paso 5 · Commit**

```bash
git add apps/web docs/08-pruebas.md
git commit -m "test(web): two browsers prove the initiative request lands without a reload"
```

---

## Tarea 12 · Documentación y cierre

- [ ] **Paso 1** · `docs/05-datos.md`: `PREPARING`, `RollRequest.encounterId`, el índice recontado.
- [ ] **Paso 2** · `docs/06-pendientes.md`: **tacha las dos fichas** que esto cierra —el bando sin
      pantalla, y que la iniciativa la tire el servidor— **con su fecha y su `fichero:línea`**.
- [ ] **Paso 3** · `docs/decisiones.md`: una línea por decisión del autor, con enlace.
- [ ] **Paso 4** · `docs/07-historial.md`: la entrada. **Mira el tope de 1000 antes de escribir.**
- [ ] **Paso 5** · `pnpm verify` en verde, y el gancho corriendo.
- [ ] **Paso 6 · Commit**

```bash
git add docs
git commit -m "docs: initiative is asked for, and a combatant has a side"
```

---

## Tarea 13 · El ataque elige objetivo, y el servidor dice si acierta

**Añadida el 2026-09-05**, del barrido que hizo el autor usando la aplicación. **El servidor ya está
hecho** y ninguna pantalla lo llama: es el mismo cierre a medias que ya se declaró cuatro veces.

**Ficheros:**
- Modificar: `apps/web/src/features/character-sheet/TirarAtaqueBoton.tsx`
- Modificar: `apps/web/src/features/character-sheet/api.ts`, `hooks.ts`
- Prueba: `apps/web/src/features/character-sheet/__tests__/TirarAtaqueBoton.test.tsx`

**Interfaces · consume:** el bando de la tarea 5 —para proponer objetivos del bando contrario— y
`POST sheet/attacks/:attackKey/resolve` (`apps/api/src/characters/character-sheet.controller.ts:137`),
que ya existe y acepta `targetCharacterId` (`packages/shared/src/attack.schema.ts:52`).

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```tsx
it("elige objetivo y manda targetCharacterId", async () => {
  render(<TirarAtaqueBoton {...props} combatientes={[goblin, bandido]} />);
  await userEvent.click(screen.getByRole("button", { name: /atacar/i }));
  await userEvent.click(screen.getByRole("option", { name: /goblin/i }));
  expect(resolver).toHaveBeenCalledWith(
    expect.objectContaining({ targetCharacterId: goblin.id }),
  );
});

it("fuera de combate no pide objetivo: solo tira", async () => {
  render(<TirarAtaqueBoton {...props} combatientes={[]} />);
  await userEvent.click(screen.getByRole("button", { name: /atacar/i }));
  expect(screen.queryByRole("option")).not.toBeInTheDocument();
  expect(tirar).toHaveBeenCalled();
  expect(resolver).not.toHaveBeenCalled();
});

it("propone primero el bando contrario, pero deja atacar a cualquiera", async () => {
  render(<TirarAtaqueBoton {...props} combatientes={[aliado, enemigo]} />);
  await userEvent.click(screen.getByRole("button", { name: /atacar/i }));
  const opciones = screen.getAllByRole("option");
  expect(opciones[0]).toHaveTextContent(enemigo.nombre);
  expect(opciones).toHaveLength(2);
});
```

**La tercera importa**: un jugador puede atacar a un aliado —confusión, un hechizo que domina, o una
traición— y el sistema **no se lo impide**, solo ordena la lista. Impedirlo sería el servidor
decidiendo por la mesa, que es lo mismo que este proyecto se negó a hacer con el bando.

- [ ] **Paso 2 · Córrelas**

```bash
pnpm --filter @dnd/web test -- TirarAtaqueBoton
```

Esperado: **fallan**.

- [ ] **Paso 3 · La implementación.** Con combate en marcha, el botón abre la lista de combatientes
      —del bando contrario primero— y manda a `resolve`; **sin combate se queda como está** y solo
      tira. La respuesta dice si acierta, con su traza y su crítico, que el servidor ya calcula.

- [ ] **Paso 4 · Córrelas** — pasan.

- [ ] **Paso 5 · Mutación** — deja de mandar `targetCharacterId`: la primera se pone **roja**. Deshaz.

- [ ] **Paso 6 · Commit**

```bash
git add apps/web
git commit -m "feat(web): an attack picks its target, and the server says whether it lands"
```

---

## Tarea 14 · Se puede curar

**Hoy no se puede subir un punto de golpe a nadie**:
`apps/web/src/features/sessions/elenco/PonerDano.tsx:123` manda `delta: -n`, siempre negativo, y no
hay otra puerta. Con las salvaciones contra muerte existiendo, **un personaje caído no se puede
levantar**.

**Ficheros:**
- Modificar: `apps/web/src/features/sessions/elenco/PonerDano.tsx` y su hermano de curar
- Modificar: `apps/web/src/features/character-sheet/AplicarDano.tsx`
- Prueba: `apps/web/src/features/sessions/elenco/__tests__/Curar.test.tsx`
- Prueba de servidor: en el spec de `character-state`

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```tsx
it("curar manda un delta positivo", async () => {
  render(<Curar {...props} />);
  await userEvent.type(screen.getByRole("spinbutton"), "7");
  await userEvent.click(screen.getByRole("button", { name: /curar/i }));
  expect(cambiarPg).toHaveBeenCalledWith(expect.objectContaining({ delta: 7 }));
});

it("no se pasa del maximo", async () => {
  render(<Curar {...props} personaje={{ currentHp: 28, maxHp: 31 }} />);
  await userEvent.type(screen.getByRole("spinbutton"), "50");
  await userEvent.click(screen.getByRole("button", { name: /curar/i }));
  expect(screen.getByText("31 / 31")).toBeInTheDocument();
});
```

Y en el servidor:

```ts
it("curar a alguien a 0 PG lo levanta y le borra las salvaciones de muerte", async () => {
  await service.changeHp(dmId, campaignId, caidoId, { delta: 5 });
  const ficha = await prisma.character.findUnique({ where: { id: caidoId } });
  expect(ficha.currentHp).toBe(5);
  expect(ficha.deathSaveSuccesses).toBe(0);
  expect(ficha.deathSaveFailures).toBe(0);
});

it("curar el personaje de otro sin ser DM es 403", async () => {
  await expect(
    service.changeHp(jugadoraId, campaignId, personajeDeOtroId, { delta: 5 }),
  ).rejects.toThrow(ForbiddenException);
});
```

**Verifica la regla en el SRD en inglés antes de escribirla** —«Damage and Healing»— y **pon la cita
en el commit**: aquí decide código, y en este proyecto una regla se cita de la fuente.

- [ ] **Paso 2 · Córrelas** — fallan.

- [ ] **Paso 3 · La implementación.** **El tope por arriba es del servidor, no de la pantalla**: una
      pantalla que limita es una sugerencia, y la verdad vive donde este proyecto ya declaró.

- [ ] **Paso 4 · Córrelas** — pasan.

- [ ] **Paso 5 · Mutación** — quita el borrado de las salvaciones de muerte: su prueba se pone
      **roja**. Deshaz.

- [ ] **Paso 6 · Commit**

```bash
git add apps/web apps/api
git commit -m "feat: a character can be healed, and healing lifts the dying"
```

---

## Tarea 15 · El cuadro de ataques vacío dice por qué

**No es un fallo, es una explicación que falta** — y confundió al autor hasta hacerle pensar que su
clase no le dejaba elegir ataques. Los ataques **se derivan de lo equipado**
(`apps/api/src/rules/attacks.ts`), que es el SRD y está bien; lo que falta es decirlo.

**Ficheros:**
- Modificar: `apps/web/src/features/character-sheet/AtaquesYLanzamiento.tsx`
- Prueba: su fichero de pruebas en `apps/web/src/features/character-sheet/__tests__/`

- [ ] **Paso 1 · La prueba**

```tsx
it("sin armas equipadas, dice que falta y por donde se arregla", () => {
  render(<AtaquesYLanzamiento sheet={{ ...hoja, attacks: [] }} />);
  expect(screen.getByText(/no llevas ningún arma equipada/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /bolsa/i })).toBeInTheDocument();
});

it("con armas, ni rastro del aviso", () => {
  render(<AtaquesYLanzamiento sheet={{ ...hoja, attacks: [hacha] }} />);
  expect(screen.queryByText(/no llevas ningún arma/i)).not.toBeInTheDocument();
});
```

- [ ] **Paso 2 · Córrela** — falla.
- [ ] **Paso 3 · La implementación.** Un estado vacío que **explica y enlaza**, sin inventarse
      ataques que el SRD no da.
- [ ] **Paso 4 · Córrela** — pasa.
- [ ] **Paso 5 · Commit**

```bash
git add apps/web
git commit -m "feat(web): an empty attack table says what is missing and where to fix it"
```

---

## Lo que este plan NO toca, y va aparte

**Los conjuros y los rasgos de clase.** Un mago no tiene ni un hechizo y la Furia de un bárbaro es
**solo un nombre** — medido el 2026-09-05: cero conjuros en `apps/api/src`, y cero usos de `"rage"`
o `"extra-attack"` fuera del catálogo.

**No entran aquí, y tampoco son dos cosas.** El autor pidió el 2026-09-05 partir el trabajo en tres,
y esto es el tercero: **una auditoría del sistema de ataques, aptitudes y hojas entero, y después su
planificación**. Meterlo en este plan lo haría inentregable, y planificarlo antes de auditarlo
repetiría el error que lo trajo hasta aquí.

## Definición de terminado

`pnpm verify` verde · **el e2e de dos navegadores corrido y mirado** · las **seis mutaciones**
probadas (índice, reparto, carrera, 403 de forzar, 403 de bando, canal apagado) · las pantallas
**comparadas con el prototipo** · y el panel **medido a 390 px en el navegador**, no supuesto.

## Lo que este plan NO hace

- **No termina el combate solo** cuando no quedan enemigos. Eso es **decisión del DM** —un enemigo a
  0 puede estar inconsciente, los enemigos huyen, un combate se acaba parlamentando— y lo correcto
  es **proponerlo**, como dice la doctrina de las Herramientas del DM: *«el sistema propone; tú
  decides»*. Necesita el bando, que es lo que esta tanda entrega. **Queda para después, con su
  decisión propia sobre qué cuenta como derrotado.**
- **No toca el agrupado de criaturas idénticas.**
- **No toca `setInitiative`**: corregir el número sigue siendo del DM.
