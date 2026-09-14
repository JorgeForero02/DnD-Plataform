import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Test } from "@nestjs/testing";
import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { encounterSchema, encounterStatusSchema } from "@dnd/shared";
import { EncountersService } from "./encounters.service";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { CharacterSheetService } from "../characters/character-sheet.service";
import { RollsService } from "../rolls/rolls.service";
import { GameClockService } from "../game-clock/game-clock.service";
import { StatblocksService } from "../statblocks/statblocks.service";

// Ronda de arreglo 1 (2026-09-05) — mismo guardián que ya existe para `GameEventType` en
// `apps/api/src/game-events/game-events.service.spec.ts`, para `EncounterStatus`: el enum de
// Prisma y el `z.enum` de `@dnd/shared` se mantienen a mano en dos ficheros, y `PREPARING` llegó
// al primero sin llegar al segundo en la tarea 1 — la web seguía creyendo que solo existían
// `ACTIVE` y `ENDED`.
describe("el enum de Prisma y el z.enum de @dnd/shared no se separan (EncounterStatus)", () => {
  const schema = readFileSync(join(__dirname, "..", "..", "prisma", "schema.prisma"), "utf8");
  const enumBlock = /enum EncounterStatus \{([^}]*)\}/.exec(schema);

  it("el bloque del enum existe en schema.prisma", () => {
    expect(enumBlock).not.toBeNull();
  });

  it("el enum de Prisma tiene exactamente los valores de @dnd/shared, sin sobras ni faltas", () => {
    const enPrisma = (enumBlock![1].match(/^\s*([A-Z_]+)\s*$/gm) ?? []).map((l) => l.trim());
    expect(enPrisma.sort()).toEqual([...encounterStatusSchema.options].sort());
  });
});

describe("EncountersService", () => {
  let service: EncountersService;
  // **Vuelta de arreglo 1 sobre A2.** El `tx` de mentira es un objeto NUEVO en cada llamada a
  // `prisma.transaction` — capturarlo aquí es lo que permite comprobar que `events.record` recibe
  // ESE objeto y no `prisma` a secas. Sin esto, `expect.anything()` acepta cualquiera de los dos
  // y la prueba «en la misma transacción» no comprueba lo que su nombre promete.
  let ultimoTx: Record<string, unknown> | undefined;
  const prisma = {
    session: { findFirst: jest.fn() },
    encounter: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    // `findFirst` es del Task 2 (`removeCombatant`, E-PM-6): lee visibilidad y nombre del
    // personaje que sale para decidir si `characterName` viaja en `COMBATANT_LEFT`.
    character: { findMany: jest.fn(), findFirst: jest.fn() },
    combatant: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      // Task 2: `removeCombatant` borra la fila dentro de la transacción (`recolocar` renumera
      // lo que queda).
      delete: jest.fn(),
    },
    rollRequest: { create: jest.fn() },
    user: { findUnique: jest.fn() },
    // El reparto de `start()` pregunta quiénes son DM de la campaña (ficha P2 «dos DM», 2026-09-10):
    // por defecto, solo `dm`, que es el dueño de todos los PNJ de estas pruebas.
    campaignMember: { findMany: jest.fn() },
    // **Paso 1, tarea 4:** al empezar turno, `advanceTurn` corta las condiciones que esperaban ese
    // borde —hoy, la marca de Ayudar— poniéndoles el reloj de ese instante. Necesita el reloj de
    // la campaña y la escritura sobre las condiciones.
    campaign: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ clockSeconds: 0 }),
      // Puerta de efectos §5 bis (tarea 5): `end()` lee la regla de progresión ANTES de abrir su
      // transacción. `{}` por defecto (`progresion: "HITO"`) es el comportamiento de siempre —
      // sin XP en ningún sitio, `end()` no propone ningún reparto.
      findUnique: jest.fn().mockResolvedValue({ tableRules: {} }),
    },
    characterCondition: { updateMany: jest.fn() },
    transaction: jest.fn(),
    // **Ronda de arreglo 1 (I-1): `recolocar` ahora toma un candado (`bloquearEncuentro`) como
    // primera operación**, así que el `tx` de mentira necesita un `$queryRaw` que responda —lo
    // que devuelva no importa aquí, ningún camino unitario mira el estado que trae de vuelta.
    $queryRaw: jest.fn().mockResolvedValue([{ status: "PREPARING" }]),
  };
  const membership = { requireDM: jest.fn(), requireMember: jest.fn(), getMembership: jest.fn() };
  const events = { record: jest.fn().mockResolvedValue({ id: "ev1" }) };
  const sheets = { getInitiativeModifier: jest.fn(), getSheet: jest.fn() };
  const rolls = { roll: jest.fn() };
  const clock = { advance: jest.fn() };
  // Puerta de efectos §5 bis (tarea 5): `end()` en modo XP resuelve el VD de cada `ENEMY` con
  // statblock. Sin implementación por defecto — cada prueba de `end()` la pone a mano.
  const statblocks = { resolver: jest.fn() };

  /**
   * **Las filas de `Combatant` tal y como quedan escritas en el Prisma simulado**, después de que
   * `recolocar` haya repartido las posiciones con sus `update`.
   *
   * Vive aquí arriba desde el 2026-09-07 (ficha P3) para que las pruebas de comportamiento de
   * `start()` puedan afirmar sobre **lo que se escribió** en vez de sobre lo que devolvió el
   * método. Antes lo miraban por el `return` —por comodidad, no porque el valor devuelto fuera lo
   * que probaban—, y eso las ataba a por dónde vuelve la respuesta: al pasar `start()` a devolver
   * por `get()` se caían cuatro pruebas que no tenían nada que ver con ese cambio.
   */
  const creadas: Record<string, unknown>[] = [];

  /**
   * El encuentro tal y como queda en la base simulada. Hace falta desde que `advanceTurn()` y
   * `setInitiative()` devuelven por `get()` (ficha P3, 2026-09-08): ese `get()` **relee**, así que
   * sin reflejar los `update` la respuesta traería el asalto anterior.
   */
  const encuentroSimulado: Record<string, unknown> = {};

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        EncountersService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: GameEventsService, useValue: events },
        { provide: CharacterSheetService, useValue: sheets },
        { provide: RollsService, useValue: rolls },
        { provide: GameClockService, useValue: clock },
        { provide: StatblocksService, useValue: statblocks },
      ],
    }).compile();
    service = ref.get(EncountersService);
    jest.clearAllMocks();
    events.record.mockResolvedValue({ id: "ev1" });
    membership.requireDM.mockResolvedValue(undefined);
    membership.requireMember.mockResolvedValue(undefined);
    prisma.campaignMember.findMany.mockResolvedValue([{ userId: "dm" }]);
    prisma.session.findFirst.mockResolvedValue({ id: "s1", campaignId: "c1" });
    // **El Prisma simulado tiene que saber releer.** `recolocar` —la única función que convierte
    // «iniciativa + grupo» en «orden»— lee las filas recién creadas, las coloca y las vuelve a
    // leer, así que el `tx` de mentira necesita un `findMany` que devuelva lo que se creó y un
    // `update` que guarde la posición. Simularlo con un array es más fiel que devolver una
    // constante: así la prueba mide el reparto de posiciones de verdad y no una lista escrita a
    // mano que siempre daría la respuesta esperada.
    creadas.length = 0;
    prisma.combatant.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
      // **Los cuatro valores por defecto de la columna, no `undefined`.** Sin esto, un
      // combatiente recién creado por la fixture no tenía economía del turno hasta que un test
      // se la ponía a mano — `gastar` (paso 2, tarea A2) sí lee esas columnas desde el primer
      // gasto, y `undefined` no es «nada gastado todavía».
      const fila = {
        id: `comb${creadas.length}`,
        actionUsed: false,
        bonusUsed: false,
        reactionUsed: false,
        movementUsed: 0,
        ...data,
      };
      creadas.push(fila);
      return Promise.resolve(fila);
    });
    prisma.combatant.update.mockImplementation(
      ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const fila = creadas.find((f) => f.id === where.id);
        if (fila) Object.assign(fila, data);
        return Promise.resolve(fila ?? { id: where.id, ...data });
      },
    );
    // **La lectura del encuentro se simula desde las filas escritas**, igual que `findMany` de
    // abajo. Hace falta desde que `start()` devuelve por `get()` (ficha P3): ese `get()` relee el
    // encuentro, y un Prisma simulado que solo sabe crear obligaría a cada prueba a escribir a
    // mano la respuesta que espera — que es la forma de acabar midiendo el mock.
    //
    // El guardián del 409 de `start()` consulta por `status` y cada prueba le pone su
    // `mockResolvedValueOnce`; lo que devuelve esta implementación es la **relectura por id**.
    // El encuentro simulado, que los `update` van modificando: `get()` **relee**, así que un
    // simulado que no reflejara la escritura devolvería el asalto viejo. Es el mismo trato que
    // `creadas` da a los combatientes.
    Object.assign(encuentroSimulado, {
      id: "enc1",
      sessionId: "s1",
      status: "ACTIVE",
      round: 1,
      activePosition: 0,
    });
    // **`mockReset` antes de instalar la implementación, y hace falta.** `jest.clearAllMocks()`
    // borra las llamadas pero **no la cola de `mockResolvedValueOnce`**: un `Once` que una prueba
    // encolara y no llegara a consumir se lo comía la siguiente, que además fallaba en un sitio
    // que no tenía nada que ver. Con varias pruebas encolando lecturas, eso es acoplamiento por
    // orden de ejecución.
    prisma.encounter.findFirst.mockReset();
    prisma.encounter.findFirst.mockImplementation(
      async ({ where }: { where?: Record<string, unknown> } = {}) => {
        // **Ramifica por el `where`, y no es un detalle.** Con una implementación que devolviera
        // siempre lo mismo, el guardián del 409 de `start()` —que consulta por `status`— quedaba
        // sin poder comprobarse: su prueba pasaría igual sin su propio mock, y cualquier prueba
        // futura que olvidara silenciarlo fallaría con un `ConflictException` que no explica nada.
        if (where?.status) return null;
        // **Si ya hubo un `update`, la relectura devuelve LO QUE ESE UPDATE DEJÓ.** Cada prueba
        // que avanza el turno declara el estado final en su propio `encounter.update`
        // —`round: 2`, la posición nueva—, así que leerlo de ahí es más fiel que mantener una
        // segunda copia aquí que habría que acordarse de sincronizar. Sin esto, `get()` devolvía
        // el asalto anterior y las pruebas de `advanceTurn` medían el estado de antes.
        const ultimo = prisma.encounter.update.mock.results.at(-1);
        const trasElUpdate = ultimo?.type === "return" ? await ultimo.value : null;
        return {
          ...encuentroSimulado,
          ...(trasElUpdate ?? {}),
          combatants: creadas.map((f) => ({
            ...f,
            character: { visibility: "PLAYERS", ownerId: "dm", currentHp: 10 },
          })),
        };
      },
    );
    prisma.combatant.findMany.mockImplementation(
      ({
        where,
        orderBy,
      }: {
        where?: { encounterId?: string; position?: number };
        orderBy?: { position: "asc" };
      } = {}) => {
        let filas = [...creadas];
        if (where?.position !== undefined) {
          filas = filas.filter((f) => f.position === where.position);
        }
        if (orderBy) filas.sort((a, b) => (a.position as number) - (b.position as number));
        return Promise.resolve(filas);
      },
    );
    // **Paso 2, tarea A2** — `gastar` relee la fila DENTRO de la transacción antes de escribir
    // (`tx.combatant.findFirst`), y también la lee ANTES de abrir transacción para comprobar
    // quién puede escribir. Las dos lecturas van sobre la misma tabla `creadas`, así que el
    // segundo gasto de una prueba ve lo que escribió el primero — igual que ya hacía `findMany`.
    // Los tests que necesiten otra forma (un id que no está en `creadas`, un combatiente suelto
    // de otra prueba) siguen pudiendo pisarlo con su propio `mockResolvedValue`.
    prisma.combatant.findFirst.mockImplementation(({ where }: { where?: { id?: string } } = {}) => {
      const fila = creadas.find((f) => f.id === where?.id);
      return Promise.resolve(fila ?? null);
    });
    // **Paso 2, tarea A1** — `advanceTurn` repone la economía del turno con un `updateMany` por
    // posición. Filtra sobre las mismas filas de `creadas`, igual que `combatant.update` ya
    // hacía por id.
    prisma.combatant.updateMany.mockImplementation(
      ({
        where,
        data,
      }: {
        where?: { encounterId?: string; position?: number; characterId?: string };
        data: Record<string, unknown>;
      }) => {
        const afectadas = creadas.filter(
          (f) =>
            (where?.encounterId === undefined || f.encounterId === where.encounterId) &&
            (where?.position === undefined || f.position === where.position) &&
            (where?.characterId === undefined || f.characterId === where.characterId),
        );
        for (const fila of afectadas) Object.assign(fila, data);
        return Promise.resolve({ count: afectadas.length });
      },
    );

    ultimoTx = undefined;
    prisma.transaction.mockImplementation((cb: (tx: unknown) => unknown) => {
      const tx = {
        encounter: {
          create: prisma.encounter.create,
          update: prisma.encounter.update,
          findUnique: prisma.encounter.findUnique,
        },
        combatant: {
          create: prisma.combatant.create,
          update: prisma.combatant.update,
          updateMany: prisma.combatant.updateMany,
          findMany: prisma.combatant.findMany,
          // Paso 1, tarea 16: `setSide` lee el bando de antes en la misma transacción, para que
          // su suceso pueda decir **de qué lado a cuál**.
          findFirst: prisma.combatant.findFirst,
          // Task 2: `removeCombatant` borra dentro de `recolocar`.
          delete: prisma.combatant.delete,
        },
        rollRequest: { create: prisma.rollRequest.create },
        campaign: { findUniqueOrThrow: prisma.campaign.findUniqueOrThrow },
        characterCondition: { updateMany: prisma.characterCondition.updateMany },
        $queryRaw: prisma.$queryRaw,
      };
      ultimoTx = tx;
      return cb(tx);
    });
    prisma.rollRequest.create.mockResolvedValue({ id: "req1" });
  });

  it("start() requires DM: a player gets 403", async () => {
    membership.requireDM.mockRejectedValue(new ForbiddenException());
    await expect(service.start("p1", "c1", "s1", { characterIds: ["ch1"] })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.character.findMany).not.toHaveBeenCalled();
  });

  it("start() 404 si algún personaje no existe en la campaña", async () => {
    prisma.encounter.findFirst.mockResolvedValueOnce(null); // solo el guardián del 409
    prisma.character.findMany.mockResolvedValue([{ id: "ch1", statblockRef: null, ownerId: "dm" }]);
    await expect(
      service.start("dm", "c1", "s1", { characterIds: ["ch1", "ch2"] }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("start() rechaza con 409 si la sesión ya tiene un encuentro activo", async () => {
    prisma.encounter.findFirst.mockResolvedValue({ id: "enc0", status: "ACTIVE" });
    prisma.character.findMany.mockResolvedValue([{ id: "ch1", statblockRef: null, ownerId: "dm" }]);
    await expect(service.start("dm", "c1", "s1", { characterIds: ["ch1"] })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(sheets.getInitiativeModifier).not.toHaveBeenCalled();
  });

  // **Lo que `start()` devuelve tiene que ser un `Encounter` de verdad** (ficha P3, 2026-09-07).
  //
  // Hasta hoy devolvía `{ ...creado.encounter, combatants: creado.combatants }`: filas de
  // `Combatant` crudas, sin `derrotado` y sin `finalPropuesto` en el encuentro —los dos
  // obligatorios en `encounterSchema` desde que el combate propone su final—, mientras el cliente
  // lo tipa como `Encounter`.
  //
  // **La decisión (autor, 2026-09-07) es devolver por `get()`, como la mayoría de sus hermanos**:
  // `current()`, `setSide()` y `forceStart()` ya lo hacían. **`advanceTurn()` no**, y aquí ponía
  // que sí: el nombre se puso de memoria sobre unos números de línea, y el comentario cargaba con
  // el argumento entero del cambio. Corregido el 2026-09-08 con `grep` delante.
  //
  // **Y no pierde nada al pasar por el filtro**, comprobado y no supuesto: `start()` empieza por
  // `requireDM`, y `canView` devuelve `true` para el DM en su segunda línea
  // (`common/visibility.ts:24`). El espectador es siempre quien lo ve todo.
  // **Los dos que quedaban fuera del patrón** (ficha P3 del 2026-09-08, el resto de la anterior).
  //
  // `advanceTurn()` devolvía `{ ...actualizado, roundAdvanced }` —la fila cruda del encuentro, sin
  // `combatants`— y `setInitiative()` devolvía **una sola fila de `Combatant`**, y los dos los
  // tipa el cliente como `Encounter`. Ahora devuelven por `get()` como `start()`, `current()`,
  // `setSide()` y `forceStart()`.
  //
  // **`roundAdvanced` viaja AL LADO, no dentro**, y la decisión salió de una medición: no lo
  // consume ni una pantalla (cero usos en `apps/web`), así que derivarlo obligaría a quien llama a
  // recordar el asalto anterior para nada, y borrarlo tiraría un dato real —«este avance cambió de
  // asalto»— que el servidor ya sabe. La respuesta es el encuentro **más** ese campo hermano, y el
  // tipo del cliente lo dice en vez de mentir.
  //
  // **Comprobado, no supuesto:** los dos empiezan por `requireDM` igual que `start()`, así que el
  // espectador de `get()` es siempre el DM y `canView` no recorta ningún combatiente
  // (`common/visibility.ts:24`). Si admitieran al dueño, un `DM_ONLY` podría desaparecer de la
  // respuesta y eso sería otra conversación.
  describe("los dos que quedaban devolviendo filas crudas", () => {
    // **Ids con forma de `cuid`**, y no es un capricho del arnés: `encounterSchema` los valida con
    // `.cuid()`, así que los `enc1`/`comb0` que usa el resto del fichero no pasarían — y lo que
    // aquí se comprueba es justo que la respuesta valida.
    const ENC = "clzq0a0000000000000000enc";
    const SES = "clzq0a0000000000000000ses";
    const CB0 = "clzq0a0000000000000000cb0";
    const PC1 = "clzq0a0000000000000000pc1";

    /** Lo que `get()` leerá: el espectador DM y el encuentro con su combatiente completo. */
    function relecturaDeGet(over: Record<string, unknown> = {}) {
      prisma.user.findUnique.mockResolvedValueOnce({ id: "dm", isAdmin: false });
      membership.getMembership.mockResolvedValueOnce({ role: "DM" });
      prisma.encounter.findFirst.mockResolvedValueOnce({
        id: ENC,
        sessionId: SES,
        status: "ACTIVE",
        round: 1,
        activePosition: 0,
        combatants: [
          {
            id: CB0,
            characterId: PC1,
            initiative: 18,
            position: 0,
            side: "ALLY",
            actionUsed: false,
            bonusUsed: false,
            reactionUsed: false,
            movementUsed: 0,
            character: { visibility: "PLAYERS", ownerId: "dm", currentHp: 10 },
          },
        ],
        ...over,
      });
    }

    it("advanceTurn() devuelve un **`Encounter` válido**, con `roundAdvanced` al lado", async () => {
      // La lectura que hace el propio método, antes de la relectura de `get()`.
      prisma.encounter.findFirst.mockResolvedValueOnce({
        id: ENC,
        sessionId: SES,
        status: "ACTIVE",
        round: 1,
        activePosition: 0,
        combatants: [
          { id: CB0, characterId: PC1, position: 0, initiative: 18 },
          { id: "cb1", characterId: "pc2", position: 1, initiative: 9 },
        ],
      });
      prisma.encounter.update.mockResolvedValue({
        id: ENC,
        sessionId: SES,
        status: "ACTIVE",
        round: 1,
        activePosition: 1,
      });
      clock.advance.mockResolvedValue({ from: 0, to: 6, seconds: 6, eventId: "ev" });
      relecturaDeGet({ activePosition: 1 });

      const { roundAdvanced: _r, ...encuentro } = await service.advanceTurn("dm", "c1", SES, ENC);
      void _r;

      // **Solo el esquema.** El campo hermano tiene su propia prueba justo debajo, y están
      // separadas a propósito: si las dos aserciones vivieran juntas, una sola mutación
      // —quitar `roundAdvanced`— tumbaría las dos cosas y no diría cuál sostiene cuál.
      expect(() => encounterSchema.parse(encuentro)).not.toThrow();
    });

    it("...y `roundAdvanced` sigue viajando a su lado, fuera del encuentro", async () => {
      prisma.encounter.findFirst.mockResolvedValueOnce({
        id: ENC,
        sessionId: SES,
        status: "ACTIVE",
        round: 1,
        activePosition: 0,
        combatants: [
          { id: CB0, characterId: PC1, position: 0, initiative: 18 },
          { id: "cb1", characterId: "pc2", position: 1, initiative: 9 },
        ],
      });
      prisma.encounter.update.mockResolvedValue({
        id: ENC,
        sessionId: SES,
        status: "ACTIVE",
        round: 1,
        activePosition: 1,
      });
      clock.advance.mockResolvedValue({ from: 0, to: 6, seconds: 6, eventId: "ev" });
      relecturaDeGet({ activePosition: 1 });

      const devuelto = await service.advanceTurn("dm", "c1", SES, ENC);

      expect(typeof devuelto.roundAdvanced).toBe("boolean");
      // Y **fuera del encuentro**, que es la mitad declarada de la decisión: no es un campo del
      // `Encounter`, es qué pasó en esta llamada. Se afirma sobre el esquema y no sobre el
      // resultado de validar — Zod descarta las claves de más sin quejarse, así que un
      // `safeParse(...).success === false` no diría nada: pasaría igual con el campo dentro.
      expect(Object.keys(encounterSchema.shape)).not.toContain("roundAdvanced");
    });

    it("setInitiative() devuelve el **encuentro entero**, no la fila que tocó", async () => {
      prisma.combatant.findFirst.mockResolvedValue({
        id: CB0,
        encounterId: ENC,
        characterId: PC1,
        initiative: 10,
        groupKey: PC1,
      });
      await (prisma.combatant.create as jest.Mock)({
        data: {
          id: CB0,
          encounterId: ENC,
          characterId: PC1,
          position: 0,
          initiative: 10,
          side: "ALLY",
          groupKey: PC1,
        },
      });
      relecturaDeGet();

      const devuelto = await service.setInitiative("dm", "c1", SES, ENC, CB0, {
        initiative: 15,
      });

      // **Y no se le inventa un `roundAdvanced` por simetría**: este método no cambia de asalto,
      // así que un campo hermano aquí afirmaría algo que no ocurre.
      expect(() => encounterSchema.parse(devuelto)).not.toThrow();
      expect(devuelto).not.toHaveProperty("roundAdvanced");
    });
  });

  it("start() devuelve un encuentro que **valida contra `encounterSchema`**", async () => {
    prisma.encounter.findFirst.mockResolvedValueOnce(null); // el guardián del 409
    prisma.character.findMany.mockResolvedValue([
      { id: "pc1", statblockRef: null, ownerId: "dm" },
      { id: "gob1", statblockRef: "SRD:goblin", ownerId: "dm" },
    ]);
    sheets.getInitiativeModifier.mockResolvedValue(2);
    rolls.roll.mockResolvedValue({ revealed: true, total: 15, eventId: "rev" });
    prisma.encounter.create.mockResolvedValue({
      id: "clzq0a0000000000000000enc",
      sessionId: "clzq0a0000000000000000ses",
      status: "ACTIVE",
      round: 1,
      activePosition: 0,
    });
    // Lo que `get()` leerá después de crear: las filas con su personaje, que es lo que la
    // respuesta cruda no traía.
    prisma.encounter.findFirst.mockResolvedValue({
      id: "clzq0a0000000000000000enc",
      sessionId: "clzq0a0000000000000000ses",
      status: "ACTIVE",
      round: 1,
      activePosition: 0,
      combatants: [
        {
          id: "clzq0a0000000000000000cb1",
          characterId: "clzq0a0000000000000000pc1",
          initiative: 15,
          position: 0,
          side: "ALLY",
          actionUsed: false,
          bonusUsed: false,
          reactionUsed: false,
          movementUsed: 0,
          character: { visibility: "PLAYERS", ownerId: "dm", currentHp: 10 },
        },
      ],
    });
    // **`Once` y no `mockResolvedValue`**: `beforeEach` llama a `jest.clearAllMocks()`, que borra
    // las llamadas pero **no las implementaciones**, y `jest.config.js` no pone `resetMocks`. Un
    // valor permanente aquí dejaría a todas las pruebas de más abajo con un espectador DM
    // heredado — y son justo las que miden qué ve cada rol. `viewerFor` consulta cada uno una vez.
    prisma.user.findUnique.mockResolvedValueOnce({ id: "dm", isAdmin: false });
    membership.getMembership.mockResolvedValueOnce({ role: "DM" });

    const devuelto = await service.start("dm", "c1", "clzq0a0000000000000000ses", {
      characterIds: ["pc1", "gob1"],
    });

    // **Se valida con el esquema entero, no con `objectContaining`**: lo que esta ficha arregla es
    // precisamente que faltaban campos, y una aserción parcial no ve lo que falta.
    expect(() => encounterSchema.parse(devuelto)).not.toThrow();
  });

  it("agrupa a los combatientes con el mismo statblockRef: una sola tirada para el grupo entero", async () => {
    prisma.encounter.findFirst.mockResolvedValueOnce(null); // solo el guardián del 409
    const goblins = Array.from({ length: 6 }, (_, i) => ({
      id: `gob${i}`,
      statblockRef: "SRD:goblin",
      ownerId: "dm",
    }));
    const personajes = [
      { id: "pc1", statblockRef: null, ownerId: "dm" },
      { id: "pc2", statblockRef: null, ownerId: "dm" },
    ];
    prisma.character.findMany.mockResolvedValue([...personajes, ...goblins]);

    sheets.getInitiativeModifier.mockImplementation(async (_u: string, _c: string, id: string) =>
      id === "pc1" ? 3 : id === "pc2" ? 1 : 2,
    );
    let siguienteTotal = 20;
    rolls.roll.mockImplementation(async () => ({
      revealed: true,
      total: siguienteTotal--,
      eventId: "rev",
    }));
    prisma.encounter.create.mockResolvedValue({
      id: "enc1",
      sessionId: "s1",
      status: "ACTIVE",
      round: 1,
      activePosition: 0,
    });
    await service.start("dm", "c1", "s1", {
      characterIds: [...personajes, ...goblins].map((p) => p.id),
    });

    // **Se afirma sobre lo ESCRITO (`creadas`), no sobre lo devuelto.** Lo que esta prueba
    // comprueba es que `start()` agrupa por `statblockRef` al crear los combatientes; mirarlo por
    // el `return` era comodidad, y ataba la prueba a por dónde vuelve la respuesta.
    // Ocho combatientes (2D: un PNJ en la mesa es una fila de Character).
    expect(creadas).toHaveLength(8);
    // Una sola tirada por grupo: dos personajes (grupo de uno cada uno) + un grupo de seis
    // goblins = tres tiradas, no ocho.
    expect(rolls.roll).toHaveBeenCalledTimes(3);
    // Los seis goblins comparten la misma iniciativa: compartieron la tirada.
    const goblinCombatants = creadas.filter((c: any) =>
      goblins.some((g) => g.id === c.characterId),
    );
    const iniciativasGoblin = new Set(goblinCombatants.map((c: any) => c.initiative));
    expect(iniciativasGoblin.size).toBe(1);
    // Y comparten **la misma posición**, no seis consecutivas: *«each member of the group acts
    // at the same time»* (SRD 5.1, «Initiative»). Ocho combatientes, siete posiciones.
    const posicionesGoblin = new Set(goblinCombatants.map((c: any) => c.position));
    expect(posicionesGoblin.size).toBe(1);
    // Dos personajes (dos grupos de uno) + un grupo de seis goblins = TRES entradas de orden.
    const todasLasPosiciones = new Set(creadas.map((c: any) => c.position));
    expect(todasLasPosiciones.size).toBe(3);
  });

  describe("el bando de un combatiente (plan 02)", () => {
    function dosPersonajesListos() {
      prisma.encounter.findFirst.mockResolvedValueOnce(null); // solo el guardián del 409
      prisma.character.findMany.mockResolvedValue([
        { id: "pc1", statblockRef: null, ownerId: "dm" },
        { id: "gob1", statblockRef: null, ownerId: "dm" },
      ]);
      sheets.getInitiativeModifier.mockResolvedValue(0);
      let siguienteTotal = 20;
      rolls.roll.mockImplementation(async () => ({
        revealed: true,
        total: siguienteTotal--,
        eventId: "rev",
      }));
      prisma.encounter.create.mockResolvedValue({
        id: "enc1",
        sessionId: "s1",
        status: "ACTIVE",
        round: 1,
        activePosition: 0,
      });
    }

    it("guarda el bando que dice el DM, personaje a personaje", async () => {
      dosPersonajesListos();

      await service.start("dm", "c1", "s1", {
        characterIds: ["pc1", "gob1"],
        sides: { pc1: "ALLY", gob1: "ENEMY" },
      });

      // Sobre lo escrito: el bando es una columna que `start()` rellena, no una forma de la
      // respuesta.
      const porPersonaje = new Map(
        (creadas as { characterId: string; side: string }[]).map((c) => [c.characterId, c.side]),
      );
      expect(porPersonaje.get("pc1")).toBe("ALLY");
      expect(porPersonaje.get("gob1")).toBe("ENEMY");
    });

    it("quien no viene clasificado entra como NEUTRAL, que es «no se ha dicho»", async () => {
      dosPersonajesListos();

      await service.start("dm", "c1", "s1", {
        characterIds: ["pc1", "gob1"],
        sides: { pc1: "ALLY" },
      });

      const porPersonaje = new Map(
        (creadas as { characterId: string; side: string }[]).map((c) => [c.characterId, c.side]),
      );
      // **NEUTRAL y no ENEMY**: el servidor no rellena el hueco con una suposición. Un valor por
      // defecto que afirmara algo convertiría un silencio en una afirmación que nadie hizo.
      expect(porPersonaje.get("gob1")).toBe("NEUTRAL");
    });

    it("get() le manda el bando al jugador, junto al combatiente que ya podía ver", async () => {
      prisma.session.findFirst.mockResolvedValue({ id: "s1", campaignId: "c1" });
      prisma.user.findUnique.mockResolvedValue({ id: "p1", isAdmin: false });
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.encounter.findFirst.mockResolvedValue({
        id: "enc1",
        sessionId: "s1",
        status: "ACTIVE",
        round: 1,
        activePosition: 0,
        combatants: [
          {
            id: "c0",
            characterId: "pc1",
            initiative: 18,
            position: 0,
            side: "ALLY",
            character: { visibility: "PLAYERS", ownerId: "p1" },
          },
          {
            id: "c1",
            characterId: "gob1",
            initiative: 12,
            position: 1,
            side: "ENEMY",
            character: { visibility: "DM_ONLY", ownerId: "dm" },
          },
        ],
      });

      const visto = await service.get("p1", "c1", "s1", "enc1");

      // El goblin escondido sigue sin aparecer —su bando no es una puerta trasera para verlo—, y
      // el aliado que sí se ve llega con el suyo.
      expect(visto.combatants).toHaveLength(1);
      expect(visto.combatants[0]).toMatchObject({ characterId: "pc1", side: "ALLY" });
    });
  });

  it("advanceTurn() recorre el orden y sube de asalto al llegar al final", async () => {
    prisma.encounter.findFirst.mockResolvedValueOnce({
      id: "enc1",
      sessionId: "s1",
      status: "ACTIVE",
      round: 1,
      activePosition: 1,
      combatants: [
        { id: "c0", position: 0 },
        { id: "c1", position: 1 },
      ],
    });
    prisma.encounter.update.mockResolvedValue({
      id: "enc1",
      sessionId: "s1",
      status: "ACTIVE",
      round: 2,
      activePosition: 0,
    });
    clock.advance.mockResolvedValue({ from: 0, to: 6, seconds: 6, eventId: "ev-clock" });

    const resultado = await service.advanceTurn("dm", "c1", "s1", "enc1");

    expect(resultado.roundAdvanced).toBe(true);
    expect(resultado.round).toBe(2);
    // Subir de asalto avanza el reloj EXACTAMENTE seis segundos (D-2C-1), por el mismo camino
    // que cualquier otro avance del reloj de campaña.
    expect(clock.advance).toHaveBeenCalledWith(
      "dm",
      "c1",
      { kind: "TIME", seconds: 6 },
      expect.anything(),
    );
  });

  it("advanceTurn() a media ronda NO toca el reloj", async () => {
    prisma.encounter.findFirst.mockResolvedValueOnce({
      id: "enc1",
      sessionId: "s1",
      status: "ACTIVE",
      round: 1,
      activePosition: 0,
      combatants: [
        { id: "c0", position: 0 },
        { id: "c1", position: 1 },
        { id: "c2", position: 2 },
      ],
    });
    prisma.encounter.update.mockResolvedValue({
      id: "enc1",
      sessionId: "s1",
      status: "ACTIVE",
      round: 1,
      activePosition: 1,
    });

    const resultado = await service.advanceTurn("dm", "c1", "s1", "enc1");

    expect(resultado.roundAdvanced).toBe(false);
    expect(clock.advance).not.toHaveBeenCalled();
  });

  it("advanceTurn() sobre un encuentro que no está ACTIVE es un 409", async () => {
    prisma.encounter.findFirst.mockResolvedValueOnce({
      id: "enc1",
      sessionId: "s1",
      status: "ENDED",
      round: 3,
      activePosition: 0,
      combatants: [{ id: "c0", position: 0 }],
    });
    await expect(service.advanceTurn("dm", "c1", "s1", "enc1")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  // **Paso 2, tarea A1.** `gastar` todavía no existe —es la tarea 2—, así que aquí se simula el
  // estado gastado poniendo las columnas directamente en la fila de la fixture que crea
  // `combatant.create`, en vez de inventar un método público que la tarea 2 tendría que rehacer.
  describe("advanceTurn() repone la economía del turno (paso 2, tarea A1)", () => {
    it("al empezar su turno, el combatiente recupera acción, adicional y movimiento", async () => {
      const activo = await (prisma.combatant.create as jest.Mock)({
        data: { encounterId: "enc1", characterId: "pc-activo", initiative: 10, position: 0 },
      });
      const objetivo = await (prisma.combatant.create as jest.Mock)({
        data: { encounterId: "enc1", characterId: "pc-objetivo", initiative: 8, position: 1 },
      });
      // gastar(objetivo, "ACTION"); gastar(objetivo, "BONUS")
      objetivo.actionUsed = true;
      objetivo.bonusUsed = true;
      objetivo.movementUsed = 15;

      prisma.encounter.findFirst.mockResolvedValueOnce({
        id: "enc1",
        sessionId: "s1",
        status: "ACTIVE",
        round: 1,
        activePosition: 0,
        combatants: [activo, objetivo],
      });
      prisma.encounter.update.mockResolvedValue({
        id: "enc1",
        sessionId: "s1",
        status: "ACTIVE",
        round: 1,
        activePosition: 1,
      });

      await service.advanceTurn("dm", "c1", "s1", "enc1"); // le toca a él

      expect(objetivo.actionUsed).toBe(false);
      expect(objetivo.bonusUsed).toBe(false);
      expect(objetivo.movementUsed).toBe(0);
    });

    // **La que importa.** Si la reposición se hiciera sobre quien TERMINA turno en vez de sobre
    // quien lo EMPIEZA, esta prueba se pone en rojo — ver la mutación descrita en el informe.
    it("la reacción se repone al empezar SU turno, no al final del turno anterior", async () => {
      const c0 = await (prisma.combatant.create as jest.Mock)({
        data: { encounterId: "enc1", characterId: "pc0", initiative: 20, position: 0 },
      });
      const c1 = await (prisma.combatant.create as jest.Mock)({
        data: { encounterId: "enc1", characterId: "pc1", initiative: 15, position: 1 },
      });
      const combatiente = await (prisma.combatant.create as jest.Mock)({
        data: { encounterId: "enc1", characterId: "pc2", initiative: 10, position: 2 },
      });

      // gastar(combatiente, "REACTION"): reacciona en el turno de otro.
      combatiente.reactionUsed = true;

      const estado = {
        id: "enc1",
        sessionId: "s1",
        status: "ACTIVE",
        round: 1,
        activePosition: 0,
        combatants: [c0, c1, combatiente],
      };
      // `findFirst`/`update` sobre el mismo objeto mutable, porque esta prueba encadena dos
      // llamadas a `advanceTurn` y la segunda tiene que ver el `activePosition` que dejó la
      // primera.
      // El `character` de cada combatiente hace falta desde que `advanceTurn` devuelve por
      // `get()` (ficha P3, 2026-09-08): esa lectura filtra por `canView`, que lo mira. No cambia
      // lo que esta prueba mide — la reposición de la reacción —, solo completa la fila.
      prisma.encounter.findFirst.mockImplementation(() =>
        Promise.resolve({
          ...estado,
          combatants: estado.combatants.map((c: Record<string, unknown>) => ({
            ...c,
            character: { visibility: "PLAYERS", ownerId: "dm", currentHp: 10 },
          })),
        }),
      );
      prisma.encounter.update.mockImplementation(
        ({ data }: { data: { activePosition: number; round: number } }) => {
          Object.assign(estado, data);
          return Promise.resolve({ ...estado });
        },
      );

      await service.advanceTurn("dm", "c1", "s1", "enc1"); // turno del siguiente (pc1)
      expect(combatiente.reactionUsed).toBe(true); // SIGUE gastada: no era su turno

      await service.advanceTurn("dm", "c1", "s1", "enc1"); // vuelve a tocarle (position 2)
      expect(combatiente.reactionUsed).toBe(false);
    });

    // **Vuelta de arreglo 1.** Con un solo combatiente por posición, un `update` sobre una fila
    // suelta habría bastado y esta suite entera seguiría en verde — justo el fallo que el encargo
    // señala con los seis goblins. Dos combatientes en la MISMA posición (mismo grupo) obligan a
    // que la reposición sea un `updateMany` por posición, no un `update` por fila.
    it("dos combatientes del mismo grupo (misma position) recuperan los dos al empezar ese turno", async () => {
      const activo = await (prisma.combatant.create as jest.Mock)({
        data: { encounterId: "enc1", characterId: "pj", initiative: 20, position: 0 },
      });
      const goblin1 = await (prisma.combatant.create as jest.Mock)({
        data: { encounterId: "enc1", characterId: "goblin1", initiative: 10, position: 1 },
      });
      const goblin2 = await (prisma.combatant.create as jest.Mock)({
        data: { encounterId: "enc1", characterId: "goblin2", initiative: 10, position: 1 },
      });

      // gastar(goblin1, "ACTION"); gastar(goblin2, "ACTION"), etc. — a los dos del grupo.
      for (const g of [goblin1, goblin2]) {
        g.actionUsed = true;
        g.bonusUsed = true;
        g.movementUsed = 30;
      }

      prisma.encounter.findFirst.mockResolvedValueOnce({
        id: "enc1",
        sessionId: "s1",
        status: "ACTIVE",
        round: 1,
        activePosition: 0,
        combatants: [activo, goblin1, goblin2],
      });
      prisma.encounter.update.mockResolvedValue({
        id: "enc1",
        sessionId: "s1",
        status: "ACTIVE",
        round: 1,
        activePosition: 1,
      });

      await service.advanceTurn("dm", "c1", "s1", "enc1"); // le toca al grupo de goblins

      for (const g of [goblin1, goblin2]) {
        expect(g.actionUsed).toBe(false);
        expect(g.bonusUsed).toBe(false);
        expect(g.movementUsed).toBe(0);
      }
    });
  });

  // **Esta prueba afirmaba lo contrario, y la revisión de cierre la desmontó.** Decía «solo
  // cambia el número, no el orden», y era cierto — el servicio actualizaba `initiative` y dejaba
  // `position` intacta. El problema es que `advanceTurn` ordena **solo** por `position`, así que
  // corregir el número no cambiaba nada del juego: la columna era decorativa y la única razón
  // por la que el SRD deja editarla —deshacer un empate— no se cumplía.
  it("setInitiative() saca al combatiente de su grupo y recoloca el orden", async () => {
    // Tres goblins con la misma tirada: una sola entrada de orden.
    for (const id of ["g1", "g2", "g3"]) {
      await (prisma.combatant.create as jest.Mock)({
        data: { encounterId: "enc1", characterId: id, initiative: 12, groupKey: "SRD:goblin" },
      });
    }
    prisma.combatant.findFirst.mockResolvedValue({ id: "comb0", encounterId: "enc1" });

    await service.setInitiative("dm", "c1", "s1", "enc1", "comb0", { initiative: 20 });

    // El corregido sube al frente y **deja de compartir posición** con los otros dos.
    //
    // **Se mira la fila escrita, no el valor devuelto** (2026-09-08). Estas dos aserciones leían
    // `resultado.initiative` y `resultado.position` porque `setInitiative` devolvía justo esa
    // fila; era comodidad, no lo que la prueba comprueba —que la corrección recoloca el orden—, y
    // las ataba a la forma de la respuesta. El resto de la prueba ya miraba `filas`.
    const filas = await (prisma.combatant.findMany as jest.Mock)({});
    const corregido = filas.find((f: any) => f.id === "comb0");
    expect(corregido.initiative).toBe(20);
    expect(corregido.position).toBe(0);
    const posiciones = new Map(filas.map((f: any) => [f.id, f.position]));
    expect(posiciones.get("comb1")).toBe(1);
    expect(posiciones.get("comb2")).toBe(1);
    // Dos entradas de orden donde antes había una.
    expect(new Set(filas.map((f: any) => f.position)).size).toBe(2);
  });

  // **El filtrado por visibilidad, en unitaria y no solo en e2e.** Lo pidió la revisión de
  // cierre citando `docs/08-pruebas.md`: toda tarea de API prueba en unitaria «el filtrado de
  // visibilidad para un jugador que no debe ver algo», y «si una comprobación cabe en una
  // unitaria, va en una unitaria». Esta cabe, y descansaba entera en un solo e2e.
  // **Dos grupos empatados no se parten el uno al otro.** Lo pidió la revisión de cierre, y su
  // argumento es que ni la unitaria ni el e2e ejecutaban nunca el desempate: los dos usaban un
  // solo grupo, y los números del spec están elegidos para que no haya empate. Con el desempate
  // anterior —solo por `id` de personaje— seis goblins y cuatro orcos con la misma tirada se
  // ordenaban por `cuid` y quedaban **intercalados**.
  it("dos grupos con la misma tirada quedan cada uno en SU posición, sin intercalarse", async () => {
    prisma.encounter.findFirst.mockResolvedValueOnce(null); // solo el guardián del 409
    const bichos = [
      ...Array.from({ length: 3 }, (_, i) => ({
        id: `orco${i}`,
        statblockRef: "SRD:orc",
        ownerId: "dm",
      })),
      ...Array.from({ length: 3 }, (_, i) => ({
        id: `gob${i}`,
        statblockRef: "SRD:goblin",
        ownerId: "dm",
      })),
    ];
    prisma.character.findMany.mockResolvedValue(bichos);
    sheets.getInitiativeModifier.mockResolvedValue(0);
    // **La misma tirada para los dos grupos**: el empate es el caso que se quiere medir.
    rolls.roll.mockResolvedValue({ revealed: true, total: 12, eventId: "rev" });
    prisma.encounter.create.mockResolvedValue({
      id: "enc1",
      sessionId: "s1",
      status: "ACTIVE",
      round: 1,
      activePosition: 0,
    });

    await service.start("dm", "c1", "s1", {
      characterIds: bichos.map((b) => b.id),
    });

    // Sobre lo escrito: las posiciones las reparte `recolocar` con sus `update`, y `creadas`
    // recoge el estado final de la base simulada. Es más fiel que el `return`, que solo era el
    // sitio más cómodo desde donde mirarlas.
    const posicionPorClave = new Map<string, Set<number>>();
    for (const c of creadas as unknown as { characterId: string; position: number }[]) {
      const clave = c.characterId.startsWith("orco") ? "orc" : "goblin";
      posicionPorClave.set(clave, (posicionPorClave.get(clave) ?? new Set()).add(c.position));
    }
    // Cada grupo, UNA posición; y las dos distintas entre sí.
    expect(posicionPorClave.get("orc")!.size).toBe(1);
    expect(posicionPorClave.get("goblin")!.size).toBe(1);

    // **Y el orden entre los dos grupos empatados es DETERMINISTA, por clave de grupo.**
    // Sin esta aserción la prueba no distinguía: con el desempate quitado, V8 ordena de forma
    // estable y los grupos salían igualmente separados, así que la prueba pasaba con el código
    // bueno y con el malo. Se comprobó rompiéndolo a propósito. `SRD:goblin` va antes que
    // `SRD:orc` alfabéticamente, y esa es toda la regla: cualquiera sirve mientras no dependa
    // del `cuid` que Postgres reparta esa tarde.
    expect([...posicionPorClave.get("goblin")!][0]).toBe(0);
    expect([...posicionPorClave.get("orc")!][0]).toBe(1);
  });

  // ---------------------------------------------------------------------------------------
  // **El combate PROPONE terminarse; no se termina solo.** Ficha P2, cerrada el 2026-09-07.
  //
  // **Dos frases de esa ficha eran falsas al abrirla y hay que decirlo**: decía que «hoy todos los
  // combatientes son NEUTRAL, así que no se puede ni calcular» —el bando existe desde el paso 2,
  // `schema.prisma:429`— y daba por hecho que un jugador a 0 PG desaparecía de la mesa, cuando
  // **nada en `encounters/` mira `currentHp`**: no desaparecía nadie.
  //
  // **Por qué se propone en vez de cerrar**, y lo dice el SRD 5.1 (2014) mejor que el plan.
  // «Monsters and Death»: *«Most DMs have a monster die the instant it drops to 0 hit points,
  // rather than having it fall unconscious and make death saving throws. Mighty villains and
  // special nonplayer characters are common exceptions; the DM might have them fall unconscious
  // and follow the same rules as player characters.»* O sea que ni siquiera la muerte del monstruo
  // es automática en 5.1: **es costumbre del DM, con excepciones explícitas**. Un cierre
  // automático sería el servidor decidiendo por él.
  describe("get() — la propuesta de terminar", () => {
    function encuentro(combatants: unknown[], rol = "DM") {
      prisma.session.findFirst.mockResolvedValue({ id: "s1", campaignId: "c1" });
      prisma.user.findUnique.mockResolvedValue({ id: "u1", isAdmin: false });
      membership.getMembership.mockResolvedValue({ role: rol });
      prisma.encounter.findFirst.mockResolvedValue({
        id: "enc1",
        sessionId: "s1",
        status: "ACTIVE",
        round: 1,
        activePosition: 0,
        combatants,
      });
    }
    const heroe = {
      id: "cb0",
      characterId: "pc1",
      initiative: 18,
      position: 0,
      side: "ALLY",
      character: { visibility: "PLAYERS", ownerId: "u1", currentHp: 12 },
    };
    const goblin = (over: Record<string, unknown> = {}) => ({
      id: "cb1",
      characterId: "gob1",
      initiative: 9,
      position: 1,
      side: "ENEMY",
      character: { visibility: "PLAYERS", ownerId: "dm", currentHp: 7, ...over },
    });

    it("con un enemigo en pie no propone nada", async () => {
      encuentro([heroe, goblin()]);
      const r = await service.get("u1", "c1", "s1", "enc1");
      expect(r.finalPropuesto).toBe(false);
    });

    it("**con todos los enemigos a 0 PG, lo propone**", async () => {
      encuentro([heroe, goblin({ currentHp: 0 })]);
      const r = await service.get("u1", "c1", "s1", "enc1");
      expect(r.finalPropuesto).toBe(true);
      // Y no cierra nada por su cuenta: sigue ACTIVE hasta que el DM lo diga.
      expect(r.status).toBe("ACTIVE");
      expect(prisma.encounter.update).not.toHaveBeenCalled();
    });

    it("marca **derrotado** a quien está a 0, y solo a ese", async () => {
      encuentro([heroe, goblin({ currentHp: 0 })]);
      const r = await service.get("u1", "c1", "s1", "enc1");
      expect(r.combatants.map((c) => c.derrotado)).toEqual([false, true]);
    });

    // **`NEUTRAL` no cuenta como bando en pie ni como enemigo caído**: significa «no se ha dicho»,
    // y una propuesta basada en un silencio sería una afirmación inventada.
    it("un NEUTRAL en pie no impide la propuesta, y un NEUTRAL a 0 no la provoca", async () => {
      const neutral = { ...goblin(), id: "cb2", characterId: "n1", position: 2, side: "NEUTRAL" };
      encuentro([heroe, goblin({ currentHp: 0 }), neutral]);
      expect((await service.get("u1", "c1", "s1", "enc1")).finalPropuesto).toBe(true);

      encuentro([heroe, { ...neutral, character: { ...neutral.character, currentHp: 0 } }]);
      expect((await service.get("u1", "c1", "s1", "enc1")).finalPropuesto).toBe(false);
    });

    // Sin ningún ENEMY no hay nada que proponer: un encuentro de exploración no se ofrece a
    // cerrarse solo porque nadie esté peleando.
    it("sin enemigos no propone", async () => {
      encuentro([heroe]);
      expect((await service.get("u1", "c1", "s1", "enc1")).finalPropuesto).toBe(false);
    });

    // **La propuesta es del DM y solo suya.** Calcularla para el jugador filtraría por la puerta
    // de atrás: un jugador que no ve al último goblin escondido deduciría que ya no queda ninguno
    // en pie. Es la misma fuga que `activePosition` cierra devolviendo `null`.
    it("un jugador NO recibe la propuesta, aunque los enemigos estén a 0", async () => {
      encuentro([heroe, goblin({ currentHp: 0 })], "PLAYER");
      expect((await service.get("u1", "c1", "s1", "enc1")).finalPropuesto).toBe(false);
    });
  });

  describe("get() y lo que NO se le manda a un jugador", () => {
    function encuentroConGoblinesEscondidos() {
      prisma.session.findFirst.mockResolvedValue({ id: "s1", campaignId: "c1" });
      prisma.user.findUnique.mockResolvedValue({ id: "p1", isAdmin: false });
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.encounter.findFirst.mockResolvedValue({
        id: "enc1",
        sessionId: "s1",
        status: "ACTIVE",
        round: 1,
        // El turno es del grupo de goblins, que este jugador no ve.
        activePosition: 1,
        combatants: [
          {
            id: "c0",
            characterId: "pc1",
            initiative: 18,
            position: 0,
            character: { visibility: "PLAYERS", ownerId: "p1" },
          },
          {
            id: "c1",
            characterId: "gob1",
            initiative: 12,
            position: 1,
            character: { visibility: "DM_ONLY", ownerId: "dm" },
          },
          {
            id: "c2",
            characterId: "pc2",
            initiative: 9,
            position: 2,
            character: { visibility: "PLAYERS", ownerId: "p2" },
          },
        ],
      });
    }

    it("un PNJ DM_ONLY no aparece, y no deja hueco que lo delate", async () => {
      encuentroConGoblinesEscondidos();

      const visto = await service.get("p1", "c1", "s1", "enc1");

      expect(visto.combatants.map((c) => c.characterId)).toEqual(["pc1", "pc2"]);
      // **Densas, 0 y 1.** Devolver las originales —0 y 2— dejaría un hueco en medio, y contar
      // lo que falta es una forma de ver lo escondido.
      expect(visto.combatants.map((c) => c.position)).toEqual([0, 1]);
      // Y el orden relativo se conserva: para eso sirve la lista.
      expect(visto.combatants[0].initiative).toBeGreaterThan(visto.combatants[1].initiative);
    });

    it("si el turno es de alguien que no ve, la posición activa viaja como null", async () => {
      encuentroConGoblinesEscondidos();

      const visto = await service.get("p1", "c1", "s1", "enc1");

      // «Ahora no te toca a ti» es verdad y no delata a nadie. Un número apuntando a un hueco sí.
      expect(visto.activePosition).toBeNull();
    });

    // Ronda de arreglo 1 (A3/A11) — crítico 1. Hasta esta ronda `get()` serializaba cinco campos
    // a mano y se dejaba las cuatro columnas de la economía del turno (tarea A2) fuera de la
    // respuesta: la fila ya las traía —Prisma no necesita un `select` para devolverlas— y nadie
    // las leía al construir el combatiente visible. La mesa (`TiraDeIniciativa.tsx`) no tenía
    // ninguna fuente de verdad y tuvo que inventarse un estado de cliente que se desincronizaba
    // en cuanto la acción adicional se gastaba por una puerta que no fuera `PATCH .../spend`
    // (`ActivitiesService.usar`, tarea A11).
    it("la economía del turno de cada combatiente viaja en la respuesta, tal cual la tiene la fila", async () => {
      prisma.session.findFirst.mockResolvedValue({ id: "s1", campaignId: "c1" });
      prisma.user.findUnique.mockResolvedValue({ id: "p1", isAdmin: false });
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.encounter.findFirst.mockResolvedValue({
        id: "enc1",
        sessionId: "s1",
        status: "ACTIVE",
        round: 1,
        activePosition: 0,
        combatants: [
          {
            id: "c0",
            characterId: "pc1",
            initiative: 18,
            position: 0,
            side: "ALLY",
            actionUsed: true,
            bonusUsed: true,
            reactionUsed: false,
            movementUsed: 15,
            character: { visibility: "PLAYERS", ownerId: "p1" },
          },
        ],
      });

      const visto = await service.get("p1", "c1", "s1", "enc1");

      // Aserción de identidad sobre el combatiente entero, no `objectContaining`: si `get()`
      // dejara de copiar una de las cuatro columnas, o copiara la de otro combatiente por error,
      // esto lo cazaría — `objectContaining` habría dejado pasar exactamente el hueco que este
      // caso existe para cerrar.
      expect(visto.combatants[0]).toEqual({
        id: "c0",
        characterId: "pc1",
        initiative: 18,
        position: 0,
        side: "ALLY",
        actionUsed: true,
        bonusUsed: true,
        reactionUsed: false,
        movementUsed: 15,
        // Añadido el 2026-09-07 con la ficha del final propuesto. **Esta aserción es de identidad
        // a propósito**, así que un campo nuevo la rompe — que es lo que se quiere: obliga a
        // mirar si el campo debía estar ahí en vez de dejarlo colarse. Este `false` sale de un
        // combatiente cuyo `character` no declara `currentHp` en este montaje, y `undefined === 0`
        // es falso, que es la respuesta correcta: no consta que haya caído.
        derrotado: false,
      });
    });

    it("y el DM lo ve entero, con las posiciones de verdad", async () => {
      encuentroConGoblinesEscondidos();
      membership.getMembership.mockResolvedValue({ role: "DM" });

      const visto = await service.get("dm", "c1", "s1", "enc1");

      expect(visto.combatants).toHaveLength(3);
      expect(visto.combatants.map((c) => c.position)).toEqual([0, 1, 2]);
      expect(visto.activePosition).toBe(1);
    });
  });

  it("setInitiative() requires DM: a player gets 403", async () => {
    membership.requireDM.mockRejectedValue(new ForbiddenException());
    await expect(
      service.setInitiative("p1", "c1", "s1", "enc1", "comb1", { initiative: 10 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  describe("setSide() (tarea 5)", () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue({ id: "dm", isAdmin: false });
      membership.getMembership.mockResolvedValue({ role: "DM" });
    });

    it("el DM cambia el bando de un combatiente", async () => {
      // **Desde el paso 1, tarea 16, `setSide` lee el bando de antes y escribe su suceso**, así
      // que ya no es un `updateMany` suelto: es un `findFirst` + un `update` dentro de una
      // transacción, para que el registro pueda decir de qué lado a cuál.
      prisma.combatant.findFirst.mockResolvedValue({ side: "ALLY" });
      prisma.combatant.update.mockResolvedValue({ id: "comb1", side: "ENEMY" });
      // El estado que `get()` lee DESPUÉS de la escritura ya trae el bando corregido — es lo que
      // `combatant.updateMany` acaba de guardar en una base real.
      prisma.encounter.findFirst.mockResolvedValue({
        id: "enc1",
        sessionId: "s1",
        status: "ACTIVE",
        round: 1,
        activePosition: 0,
        combatants: [
          {
            id: "comb1",
            characterId: "pc1",
            initiative: 18,
            position: 0,
            side: "ENEMY",
            character: { visibility: "PLAYERS", ownerId: "dm" },
          },
        ],
      });

      const resultado = await service.setSide("dm", "c1", "s1", "enc1", "comb1", {
        side: "ENEMY",
      });

      expect(prisma.combatant.update).toHaveBeenCalledWith({
        where: { id: "comb1" },
        data: { side: "ENEMY" },
      });
      expect(resultado.combatants[0]).toMatchObject({ characterId: "pc1", side: "ENEMY" });
      // **Y deja rastro, con los dos lados.** Sin esto, el canal en vivo no tiene de qué tirar.
      expect(events.record).toHaveBeenCalledWith(
        "dm",
        "c1",
        expect.objectContaining({
          payload: expect.objectContaining({
            type: "COMBATANT_SIDE_CHANGED",
            from: "ALLY",
            to: "ENEMY",
          }),
        }),
        expect.anything(),
      );
    });

    it("cambiar el bando sin ser DM es 403", async () => {
      membership.requireDM.mockRejectedValue(new ForbiddenException());

      await expect(
        service.setSide("p1", "c1", "s1", "enc1", "comb1", { side: "ENEMY" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      // **Por el motivo correcto**: nada se escribió. Si el 403 llegara por otra vía (un
      // `NotFoundException` que Nest tradujera distinto, por ejemplo), esta llamada sí se habría
      // hecho.
      expect(prisma.combatant.update).not.toHaveBeenCalled();
    });
  });

  // **El segundo encargo de la tarea 5, no el brief.** `setInitiative` recolocaba sin mirar el
  // estado del encuentro y sin tocar `activePosition` — la ruta del botón «Corregir» con el
  // combate `ACTIVE`. Estas dos pruebas son las que hoy no existían.
  describe("setInitiative() con el combate ACTIVE no pierde el turno (ronda de arreglo, 2026-09-05)", () => {
    it("conserva el turno por identidad cuando el grupo se parte: activePosition sigue a quien se queda", async () => {
      const pc1 = await (prisma.combatant.create as jest.Mock)({
        data: { encounterId: "enc1", characterId: "pc1", initiative: 18, groupKey: "pc1" },
      });
      await (prisma.combatant.update as jest.Mock)({
        where: { id: pc1.id },
        data: { position: 0 },
      });
      const goblins: { id: string }[] = [];
      for (const id of ["g1", "g2", "g3"]) {
        const fila = await (prisma.combatant.create as jest.Mock)({
          data: { encounterId: "enc1", characterId: id, initiative: 12, groupKey: "SRD:goblin" },
        });
        await (prisma.combatant.update as jest.Mock)({
          where: { id: fila.id },
          data: { position: 1 },
        });
        goblins.push(fila);
      }
      // El turno es del grupo de goblins (posición 1), con el combate en marcha.
      prisma.combatant.findFirst.mockResolvedValue({ id: goblins[0].id, encounterId: "enc1" });
      prisma.encounter.findUnique.mockResolvedValue({
        id: "enc1",
        status: "ACTIVE",
        activePosition: 1,
      });

      // El DM sube a g1 por encima de pc1: el grupo se parte. g2 y g3 se quedan juntos y su
      // posición sube de 1 a 2 (g1 y pc1 se les cuelan delante).
      await service.setInitiative("dm", "c1", "s1", "enc1", goblins[0].id, { initiative: 25 });

      // **La aserción que la mutación mata.** Sin el ajuste de `activePosition`, esta llamada no
      // ocurre nunca: el encuentro se queda con el número viejo (1), que tras la recolocación ya
      // no es el grupo sino pc1.
      expect(prisma.encounter.update).toHaveBeenCalledWith({
        where: { id: "enc1" },
        data: { activePosition: 2 },
      });
    });

    it("no se salta un asalto al corregir a quien tenía el turno en solitario, aunque fuera el último", async () => {
      const pc2 = await (prisma.combatant.create as jest.Mock)({
        data: { encounterId: "enc1", characterId: "pc2", initiative: 18, groupKey: "pc2" },
      });
      await (prisma.combatant.update as jest.Mock)({
        where: { id: pc2.id },
        data: { position: 0 },
      });
      const solo1 = await (prisma.combatant.create as jest.Mock)({
        data: { encounterId: "enc1", characterId: "solo1", initiative: 5, groupKey: "solo1" },
      });
      await (prisma.combatant.update as jest.Mock)({
        where: { id: solo1.id },
        data: { position: 1 },
      });

      // El turno es de solo1 (posición 1), que además es el ÚLTIMO de este asalto (k=2).
      prisma.combatant.findFirst.mockResolvedValue({ id: solo1.id, encounterId: "enc1" });
      prisma.encounter.findUnique.mockResolvedValue({
        id: "enc1",
        status: "ACTIVE",
        activePosition: 1,
      });

      // El DM sube su propia iniciativa por encima de pc2: solo1 pasa de la posición 1 a la 0, y
      // pc2 pasa a ocupar la 1 — la que ANTES era la última. Si `activePosition` se quedara en el
      // 1 de siempre, ahora apuntaría a pc2 y **también sería la última posición**: el siguiente
      // «Pasar turno» la vería como fin de asalto y subiría de ronda sin que nadie lo pidiera.
      await service.setInitiative("dm", "c1", "s1", "enc1", solo1.id, { initiative: 30 });

      expect(prisma.encounter.update).toHaveBeenCalledWith({
        where: { id: "enc1" },
        data: { activePosition: 0 },
      });

      // **`advanceTurn` lee lo que `setInitiative` ACABA de escribir, no un número a mano.** La
      // primera versión de esta mitad rehacía `encounter.findFirst` con un `activePosition: 0`
      // tecleado, así que pasaba igual con la mutación neutralizada — no probaba el enlace, solo
      // repetía la aserción de arriba con otras palabras (M-2 de la revisión). Aquí se relee de
      // los mocks compartidos: `combatantesReales` es la misma tabla que `recolocar` acaba de
      // reescribir (el `update` de combatientes muta el mismo array `creadas` que sirve a
      // `findMany`), y `activePositionEscrita` es el argumento real de la ÚLTIMA llamada a
      // `encounter.update` — si el ajuste no se hubiera hecho, esa llamada no existiría y esta
      // línea rompería aquí mismo, antes de llegar a `advanceTurn`.
      const combatantesReales = await (prisma.combatant.findMany as jest.Mock)({});
      const llamadas = (prisma.encounter.update as jest.Mock).mock.calls;
      const activePositionEscrita = llamadas[llamadas.length - 1][0].data.activePosition;

      prisma.encounter.findFirst.mockResolvedValueOnce({
        id: "enc1",
        sessionId: "s1",
        status: "ACTIVE",
        round: 1,
        activePosition: activePositionEscrita,
        combatants: combatantesReales,
      });

      const resultado = await service.advanceTurn("dm", "c1", "s1", "enc1");

      // Con `activePosition` siguiendo a solo1, «Pasar turno» avanza a pc2 SIN terminar el
      // asalto: es pc2 quien falta por actuar, no un salto de ronda fantasma.
      expect(resultado.roundAdvanced).toBe(false);
      expect(clock.advance).not.toHaveBeenCalled();
    });

    it("también sigue por identidad a quien tenía el turno SIN haber sido tocado (I-2 de la revisión)", async () => {
      // El caso más frecuente: el DM corrige a alguien que NO tiene el turno. pc1 tiene el
      // turno (posición 0, en solitario); el DM sube a un goblin del grupo (posición 1).
      const pc1 = await (prisma.combatant.create as jest.Mock)({
        data: { encounterId: "enc1", characterId: "pc1", initiative: 18, groupKey: "pc1" },
      });
      await (prisma.combatant.update as jest.Mock)({
        where: { id: pc1.id },
        data: { position: 0 },
      });
      const goblins: { id: string }[] = [];
      for (const id of ["g1", "g2", "g3"]) {
        const fila = await (prisma.combatant.create as jest.Mock)({
          data: { encounterId: "enc1", characterId: id, initiative: 12, groupKey: "SRD:goblin" },
        });
        await (prisma.combatant.update as jest.Mock)({
          where: { id: fila.id },
          data: { position: 1 },
        });
        goblins.push(fila);
      }

      // El turno es de pc1 (posición 0), NO del grupo que se va a corregir.
      prisma.combatant.findFirst.mockResolvedValue({ id: goblins[0].id, encounterId: "enc1" });
      prisma.encounter.findUnique.mockResolvedValue({
        id: "enc1",
        status: "ACTIVE",
        activePosition: 0,
      });

      // g1 sube por encima de pc1: pc1 (que tenía el turno y no se tocó) pasa de la posición 0 a
      // la 1. Sin seguirlo por identidad, `activePosition` se quedaría en el 0 de siempre, que
      // ahora es g1 — un robo de identidad sobre el turno activo sin haberlo corregido.
      await service.setInitiative("dm", "c1", "s1", "enc1", goblins[0].id, { initiative: 25 });

      expect(prisma.encounter.update).toHaveBeenCalledWith({
        where: { id: "enc1" },
        data: { activePosition: 1 },
      });
    });

    it("si a quien tenía el turno ya no se le encuentra tras recolocar, cae a la posición anterior que quede — nunca a -1 (M-3 de la revisión)", async () => {
      // Defiende una rama que hoy no ejercita ninguna ruta real (`setInitiative` no borra
      // combatientes): que a quien tenía el turno se le pierda el rastro tras `recolocar`. Se
      // simula devolviendo un id fantasma para la consulta de «quién ocupaba `activePosition`»,
      // que no aparece entre las filas reales que `recolocar` devuelve.
      const pc1 = await (prisma.combatant.create as jest.Mock)({
        data: { encounterId: "enc1", characterId: "pc1", initiative: 18, groupKey: "pc1" },
      });
      await (prisma.combatant.update as jest.Mock)({
        where: { id: pc1.id },
        data: { position: 0 },
      });
      const goblins: { id: string }[] = [];
      for (const id of ["g1", "g2", "g3"]) {
        const fila = await (prisma.combatant.create as jest.Mock)({
          data: { encounterId: "enc1", characterId: id, initiative: 12, groupKey: "SRD:goblin" },
        });
        await (prisma.combatant.update as jest.Mock)({
          where: { id: fila.id },
          data: { position: 1 },
        });
        goblins.push(fila);
      }
      const soloZ = await (prisma.combatant.create as jest.Mock)({
        data: { encounterId: "enc1", characterId: "soloZ", initiative: 5, groupKey: "soloZ" },
      });
      await (prisma.combatant.update as jest.Mock)({
        where: { id: soloZ.id },
        data: { position: 2 },
      });

      prisma.combatant.findFirst.mockResolvedValue({ id: goblins[0].id, encounterId: "enc1" });
      prisma.encounter.findUnique.mockResolvedValue({
        id: "enc1",
        status: "ACTIVE",
        // El turno "era" de la posición 2 (soloZ), pero la consulta de abajo va a decir que la
        // ocupaba un fantasma que no existe entre los combatientes reales.
        activePosition: 2,
      });
      prisma.combatant.findMany.mockImplementationOnce(async () => [{ id: "fantasma-sin-fila" }]);

      // g1 sube por encima de pc1: entradas nuevas: g1(0), pc1(1), goblins restantes(2), soloZ(3).
      await service.setInitiative("dm", "c1", "s1", "enc1", goblins[0].id, { initiative: 30 });

      // El fantasma no está entre las filas reales: se cae a la posición inmediatamente anterior
      // a la vieja (2) que quede entre las reales — la 1 —, nunca a -1 ni a `undefined`.
      expect(prisma.encounter.update).toHaveBeenCalledWith({
        where: { id: "enc1" },
        data: { activePosition: 1 },
      });
    });
  });

  // Paso 2, tarea A2 — la puerta para gastar la economía del turno que A1 dejó puesta.
  describe("gastar() (paso 2, tarea A2)", () => {
    const campaignId = "c1";
    const sessionId = "s1";
    const encId = "enc1";
    const jugadoraId = "jugadora1";

    /**
     * Un combatiente con su personaje ya adjunto, tal y como lo devuelve el `include` real.
     * `visibility` es `PLAYERS` por defecto — el 403 de ownership solo tiene sentido probarlo
     * sobre algo que SÍ se ve; lo que no se ve tiene su propia prueba con `DM_ONLY`.
     */
    async function combatienteDe(characterId: string, ownerId: string, visibility = "PLAYERS") {
      const fila = await (prisma.combatant.create as jest.Mock)({
        data: { encounterId: encId, characterId, initiative: 10, position: 0 },
      });
      fila.character = { ownerId, visibility };
      return fila as { id: string };
    }

    beforeEach(() => {
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      sheets.getSheet.mockResolvedValue({ effectiveSpeeds: { walk: { total: 30 } } });
      // `gastar` mira `canView` antes que la autorización de escritura (vuelta de arreglo 1): le
      // hace falta un `viewer` completo, igual que `get()`.
      prisma.user.findUnique.mockResolvedValue({ id: jugadoraId, isAdmin: false });
    });

    it("gastar la acción la marca", async () => {
      const { id: cId } = await combatienteDe("pj1", jugadoraId);

      const r = await service.gastar(jugadoraId, campaignId, sessionId, encId, cId, {
        coste: "ACTION",
      });

      expect(r.economia.actionUsed).toBe(true);
      expect(r.excedido).toBe(false);
    });

    // **La que define la tarea.** La mutación que la pone roja —lanzar en vez de avisar en el
    // segundo gasto— está descrita y deshecha en el informe.
    //
    // **Vuelta de arreglo 1** — «avisa» no es solo el valor de retorno: «se registra, se avisa y
    // se deja pasar» son TRES cosas, y la revisión midió que la unitaria de antes no comprobaba
    // la primera. Un `if (!excedido) await this.events.record(...)` dejaba esto en verde igual.
    it("gastarla dos veces AVISA pero no impide, y las DOS quedan registradas", async () => {
      const { id: cId } = await combatienteDe("pj1", jugadoraId);

      await service.gastar(jugadoraId, campaignId, sessionId, encId, cId, { coste: "ACTION" });
      const r = await service.gastar(jugadoraId, campaignId, sessionId, encId, cId, {
        coste: "ACTION",
      });

      expect(r.excedido).toBe(true); // avisa
      expect(r.economia.actionUsed).toBe(true); // y no revienta

      // Las dos escrituras dejan su suceso — «se registra» no es opcional para la que avisa.
      const sucesosDeAccion = events.record.mock.calls.filter(
        (llamada) => llamada[2].payload.type === "ACTION_SPENT",
      );
      expect(sucesosDeAccion).toHaveLength(2);
      expect(sucesosDeAccion[0][2].payload.excedido).toBe(false);
      expect(sucesosDeAccion[1][2].payload.excedido).toBe(true);
    });

    it("el movimiento se acumula y avisa al pasarse de su velocidad", async () => {
      const { id: cId } = await combatienteDe("pj1", jugadoraId);

      await service.gastar(jugadoraId, campaignId, sessionId, encId, cId, {
        coste: "MOVEMENT",
        cantidad: 20,
      });
      const r = await service.gastar(jugadoraId, campaignId, sessionId, encId, cId, {
        coste: "MOVEMENT",
        cantidad: 20,
      });

      expect(r.economia.movementUsed).toBe(40);
      expect(r.excedido).toBe(true); // velocidad 30
    });

    // **Vuelta de arreglo 1 — «velocidad cero» y «no sé su velocidad» no son lo mismo.** Un
    // statblock a medio construir no declara `walk`, y `?? 0` convertía ese hueco en «se pasó de
    // cero pies», un aviso falso escrito en el sitio que la mesa lee seis semanas después. Sin
    // esta prueba, ninguna de las otras dos de movimiento lo cazaba: las dos mockean
    // `getSheet` con `walk: { total: 30 }`.
    it("sin velocidad de caminar en la hoja, el movimiento NUNCA avisa — no es lo mismo no saberla que tenerla a cero", async () => {
      const { id: cId } = await combatienteDe("pj-sin-hoja", jugadoraId);
      sheets.getSheet.mockResolvedValue({ effectiveSpeeds: {} });

      const r = await service.gastar(jugadoraId, campaignId, sessionId, encId, cId, {
        coste: "MOVEMENT",
        cantidad: 20,
      });

      expect(r.economia.movementUsed).toBe(20);
      expect(r.excedido).toBe(false);
    });

    it("un jugador no gasta por el combatiente de otro", async () => {
      const { id: combatanteDeOtro } = await combatienteDe("pj-otro", "otraJugadora");

      await expect(
        service.gastar(jugadoraId, campaignId, sessionId, encId, combatanteDeOtro, {
          coste: "ACTION",
        }),
      ).rejects.toThrow(ForbiddenException);
      // Nada se escribió: el 403 se lanza antes de abrir la transacción.
      expect(prisma.combatant.update).not.toHaveBeenCalled();
    });

    // **Vuelta de arreglo 1 — 404, no 403, para lo que `get()` ya esconde.** `docs/04-
    // convenciones.md`: «un 403 sobre algo que no deberías saber que existe es una filtración: va
    // 404». Un PNJ `DM_ONLY` no aparece en la lista de combate de este jugador (mismo `canView`
    // que usa `get()`); si `gastar` contestara 403, la respuesta distinta de un 404 normal le
    // confirmaría que ese combatiente existe.
    it("un PNJ DM_ONLY que el jugador no ve es 404, no 403 — no delata que existe", async () => {
      const { id: cId } = await combatienteDe("goblin-escondido", "otroDM", "DM_ONLY");

      await expect(
        service.gastar(jugadoraId, campaignId, sessionId, encId, cId, { coste: "ACTION" }),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.gastar(jugadoraId, campaignId, sessionId, encId, cId, { coste: "ACTION" }),
      ).rejects.not.toBeInstanceOf(ForbiddenException);
      expect(prisma.combatant.update).not.toHaveBeenCalled();
    });

    // **La otra mitad del 403 de arriba.** Si el guardián solo comprobara "eres el dueño" y no
    // "o eres el DM", esta prueba lo pondría en rojo: el DM lleva PNJ que no son suyos y tiene
    // que poder gastar su economía igual que la de sus propios personajes.
    it("el DM sí gasta por un combatiente que no es suyo", async () => {
      membership.getMembership.mockResolvedValue({ role: "DM" });
      const { id: cId } = await combatienteDe("goblin1", "otraJugadora");

      const r = await service.gastar("dm", campaignId, sessionId, encId, cId, {
        coste: "REACTION",
      });

      expect(r.economia.reactionUsed).toBe(true);
    });

    // **`FREE` no consume nada y nunca excede.** Si se tratara como cualquier otro coste, esta
    // prueba lo pondría en rojo: nada de lo que devuelve cambiaría, pero se comprobaría contra
    // una columna que `FREE` no toca.
    it("FREE no consume nada, nunca excede, y aun así se registra", async () => {
      const { id: cId } = await combatienteDe("pj1", jugadoraId);

      const r = await service.gastar(jugadoraId, campaignId, sessionId, encId, cId, {
        coste: "FREE",
      });

      expect(r.excedido).toBe(false);
      expect(r.economia).toEqual({
        actionUsed: false,
        bonusUsed: false,
        reactionUsed: false,
        movementUsed: 0,
      });
      expect(prisma.combatant.update).not.toHaveBeenCalled();
      expect(events.record).toHaveBeenCalledWith(
        jugadoraId,
        campaignId,
        expect.objectContaining({
          payload: expect.objectContaining({ type: "ACTION_SPENT", coste: "FREE" }),
        }),
        ultimoTx,
      );
    });

    // **El suceso se escribe, con lo que hace falta para traducirlo**, y va dentro de la MISMA
    // transacción que la fila — se le pasa el `tx`, no `this.prisma` a secas.
    //
    // **Vuelta de arreglo 1** — `expect.anything()` acepta tanto el `tx` de verdad como
    // `this.prisma`, así que esta prueba no comprobaba lo que su nombre promete. Se compara
    // contra `ultimoTx`, el objeto que el `mockImplementation` de `prisma.transaction` acaba de
    // crear para ESTA llamada — y se comprueba además que NO es `prisma` a secas.
    it("escribe ACTION_SPENT en la misma transacción (el tx de verdad, no `this.prisma`)", async () => {
      const { id: cId } = await combatienteDe("pj1", jugadoraId);

      await service.gastar(jugadoraId, campaignId, sessionId, encId, cId, {
        coste: "MOVEMENT",
        cantidad: 15,
      });

      expect(ultimoTx).toBeDefined();
      expect(ultimoTx).not.toBe(prisma);
      expect(events.record).toHaveBeenCalledWith(
        jugadoraId,
        campaignId,
        expect.objectContaining({
          sessionId,
          subjectType: "character",
          subjectId: "pj1",
          visibility: "PLAYERS",
          payload: expect.objectContaining({
            type: "ACTION_SPENT",
            encounterId: encId,
            combatantId: cId,
            coste: "MOVEMENT",
            cantidad: 15,
            excedido: false,
          }),
        }),
        ultimoTx,
      );
    });

    it("gastar sobre un combatiente que no existe es 404", async () => {
      await expect(
        service.gastar(jugadoraId, campaignId, sessionId, encId, "fantasma", { coste: "ACTION" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // Puerta de efectos §5 bis (D-CF-68, spec §5b.3, tarea 5). `end()` propone el reparto de XP en
  // modo `XP`: la suma de la tabla por VD de los `ENEMY` con statblock, dividida (`floor`) entre
  // los `ALLY` sin `statblockRef` y no archivados. `NEUTRAL` nunca cuenta, y modo `HITO` no
  // propone nada.
  describe("end() — la propuesta de XP (D-CF-68, spec §5b.3)", () => {
    const dmId = "dm";
    const campaignId = "c1";
    const sessionId2 = "s1";
    const encId2 = "enc1";

    beforeEach(() => {
      prisma.session.findFirst.mockResolvedValue({ id: sessionId2, campaignId });
      prisma.encounter.findFirst.mockReset();
      prisma.encounter.findFirst.mockResolvedValue({ id: encId2, status: "ACTIVE", round: 1 });
    });

    const combatiente = (
      side: "ALLY" | "ENEMY" | "NEUTRAL",
      character: {
        id: string;
        name: string;
        statblockRef?: string | null;
        archivedAt?: Date | null;
      },
    ) => ({
      id: `comb-${character.id}`,
      side,
      character: {
        id: character.id,
        name: character.name,
        statblockRef: character.statblockRef ?? null,
        archivedAt: character.archivedAt ?? null,
      },
    });

    const A = { id: "A", name: "Aria" };
    const P = { id: "P", name: "Klarg (PNJ jugable)", statblockRef: "SRD:goblin" };
    const G1 = { id: "G1", name: "Goblin", statblockRef: "SRD:goblin" };
    const G2 = { id: "G2", name: "Goblin", statblockRef: "SRD:goblin" };
    const N = { id: "N", name: "Testigo" };

    beforeEach(() => {
      statblocks.resolver.mockImplementation(async (_campaignId: string, ref: string) =>
        ref === "SRD:goblin" ? { cr: 0.25 } : null,
      );
    });

    it("modo XP: dos ENEMY con statblock (VD 0,25) y un solo ALLY sin statblock → total 100, porCabeza 100", async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({ tableRules: { progresion: "XP" } });
      prisma.combatant.findMany.mockResolvedValueOnce([
        combatiente("ALLY", A),
        combatiente("ALLY", P),
        combatiente("ENEMY", G1),
        combatiente("ENEMY", G2),
        combatiente("NEUTRAL", N),
      ]);

      const res = await service.end(dmId, campaignId, sessionId2, encId2);

      expect(res.xpPropuesto).toEqual({
        total: 100,
        porCabeza: 100,
        destinatarios: [{ characterId: "A", name: "Aria" }],
        desglose: [
          { characterId: "G1", name: "Goblin", cr: 0.25, xp: 50 },
          { characterId: "G2", name: "Goblin", cr: 0.25, xp: 50 },
        ],
      });
    });

    it("dos allies sin statblock se reparten a partes iguales: porCabeza 50", async () => {
      const A2 = { id: "A2", name: "Brann" };
      prisma.campaign.findUnique.mockResolvedValueOnce({ tableRules: { progresion: "XP" } });
      prisma.combatant.findMany.mockResolvedValueOnce([
        combatiente("ALLY", A),
        combatiente("ALLY", A2),
        combatiente("ENEMY", G1),
        combatiente("ENEMY", G2),
      ]);

      const res = await service.end(dmId, campaignId, sessionId2, encId2);

      expect(res.xpPropuesto?.porCabeza).toBe(50);
    });

    it("tres allies y total 100: porCabeza 33 (floor)", async () => {
      const A2 = { id: "A2", name: "Brann" };
      const A3 = { id: "A3", name: "Corin" };
      prisma.campaign.findUnique.mockResolvedValueOnce({ tableRules: { progresion: "XP" } });
      prisma.combatant.findMany.mockResolvedValueOnce([
        combatiente("ALLY", A),
        combatiente("ALLY", A2),
        combatiente("ALLY", A3),
        combatiente("ENEMY", G1),
        combatiente("ENEMY", G2),
      ]);

      const res = await service.end(dmId, campaignId, sessionId2, encId2);

      expect(res.xpPropuesto?.total).toBe(100);
      expect(res.xpPropuesto?.porCabeza).toBe(33);
    });

    it("modo HITO: sin xpPropuesto, aunque haya ENEMY con statblock y ALLY sin él", async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({ tableRules: {} });

      const res = await service.end(dmId, campaignId, sessionId2, encId2);

      expect(res).not.toHaveProperty("xpPropuesto");
      // Modo HITO ni siquiera mira los combatientes.
      expect(prisma.combatant.findMany).not.toHaveBeenCalled();
    });

    it("sin ningún ENEMY con statblock: sin xpPropuesto", async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({ tableRules: { progresion: "XP" } });
      prisma.combatant.findMany.mockResolvedValueOnce([
        combatiente("ALLY", A),
        combatiente("NEUTRAL", N),
      ]);

      const res = await service.end(dmId, campaignId, sessionId2, encId2);

      expect(res).not.toHaveProperty("xpPropuesto");
    });

    // Ola de arreglos 1 (Important 1 de la revisión de API). `statblock.schema.ts` acepta
    // cualquier `cr` de 0 a 30, y `xpPorVd` lanza para lo que no sea una fila de la tabla: un VD
    // 2,5 escrito en el editor de campaña convertía `end()` en un 500 y el combate no se podía
    // cerrar por una propuesta que solo era informativa.
    it("un ENEMY con un VD fuera de la tabla (2,5) no revienta end(): sale de la suma y se lista en sinTabla", async () => {
      const R = { id: "R", name: "Bicho raro", statblockRef: "CAMPAIGN:raro" };
      statblocks.resolver.mockImplementation(async (_campaignId: string, ref: string) =>
        ref === "SRD:goblin" ? { cr: 0.25 } : ref === "CAMPAIGN:raro" ? { cr: 2.5 } : null,
      );
      prisma.campaign.findUnique.mockResolvedValueOnce({ tableRules: { progresion: "XP" } });
      prisma.combatant.findMany.mockResolvedValueOnce([
        combatiente("ALLY", A),
        combatiente("ENEMY", G1),
        combatiente("ENEMY", R),
      ]);

      const res = await service.end(dmId, campaignId, sessionId2, encId2);

      expect(res.xpPropuesto).toEqual({
        total: 50,
        porCabeza: 50,
        destinatarios: [{ characterId: "A", name: "Aria" }],
        desglose: [{ characterId: "G1", name: "Goblin", cr: 0.25, xp: 50 }],
        sinTabla: [{ characterId: "R", name: "Bicho raro", cr: 2.5 }],
      });
    });

    it("si TODOS los VD están fuera de tabla, la propuesta existe con total 0 y explica por qué; sin ningún VD raro no viaja sinTabla", async () => {
      const R = { id: "R", name: "Bicho raro", statblockRef: "CAMPAIGN:raro" };
      statblocks.resolver.mockImplementation(async (_campaignId: string, ref: string) =>
        ref === "CAMPAIGN:raro" ? { cr: 0.75 } : ref === "SRD:goblin" ? { cr: 0.25 } : null,
      );
      prisma.campaign.findUnique.mockResolvedValueOnce({ tableRules: { progresion: "XP" } });
      prisma.combatant.findMany.mockResolvedValueOnce([
        combatiente("ALLY", A),
        combatiente("ENEMY", R),
      ]);

      const soloRaros = await service.end(dmId, campaignId, sessionId2, encId2);

      expect(soloRaros.xpPropuesto?.total).toBe(0);
      expect(soloRaros.xpPropuesto?.sinTabla).toEqual([
        { characterId: "R", name: "Bicho raro", cr: 0.75 },
      ]);

      prisma.campaign.findUnique.mockResolvedValueOnce({ tableRules: { progresion: "XP" } });
      prisma.combatant.findMany.mockResolvedValueOnce([
        combatiente("ALLY", A),
        combatiente("ENEMY", G1),
      ]);

      const normal = await service.end(dmId, campaignId, sessionId2, encId2);

      expect(normal.xpPropuesto).not.toHaveProperty("sinTabla");
    });
  });

  describe("removeCombatant() — sacar del combate (spec §3.3, E-PM-7)", () => {
    // `character` hace falta desde que `removeCombatant` devuelve por `get()` (patrón P3): esa
    // lectura filtra por `canView`, que lo mira — igual que ya hacía la fixture de `advanceTurn`
    // más arriba. No cambia lo que estas pruebas miden (el avance de turno al sacar a alguien),
    // solo completa la fila para que la relectura no reviente.
    const filas = (ids: string[]) =>
      ids.map((id, i) => ({
        id,
        characterId: `ch-${id}`,
        initiative: 20 - i * 5,
        groupKey: id,
        position: i,
        side: "ENEMY",
        character: { visibility: "PLAYERS", ownerId: "dm", currentHp: 10 },
      }));

    it("404 si el combatiente no es de este encuentro", async () => {
      prisma.combatant.findFirst.mockResolvedValue(null);
      await expect(service.removeCombatant("dm", "c1", "s1", "e1", "x")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("409 si el encuentro no está ACTIVE", async () => {
      prisma.combatant.findFirst.mockResolvedValue({ id: "a", encounterId: "e1" });
      prisma.encounter.findFirst.mockResolvedValue({
        id: "e1",
        status: "PREPARING",
        round: 1,
        activePosition: 0,
        combatants: filas(["a", "b"]),
      });
      await expect(service.removeCombatant("dm", "c1", "s1", "e1", "a")).rejects.toThrow(
        ConflictException,
      );
    });

    it("409 al último combatiente: se termina el combate, no se vacía", async () => {
      prisma.combatant.findFirst.mockResolvedValue({ id: "a", encounterId: "e1" });
      prisma.encounter.findFirst.mockResolvedValue({
        id: "e1",
        status: "ACTIVE",
        round: 1,
        activePosition: 0,
        combatants: filas(["a"]),
      });
      await expect(service.removeCombatant("dm", "c1", "s1", "e1", "a")).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.combatant.delete).not.toHaveBeenCalled();
    });

    it("sacar a quien NO tiene el turno: el turno se sigue por identidad y no se escribe suceso de turno", async () => {
      // a (pos 0) tiene el turno; se saca a b (pos 1); c pasa de pos 2 a 1
      prisma.combatant.findFirst.mockResolvedValue({
        id: "b",
        encounterId: "e1",
        characterId: "ch-b",
      });
      prisma.encounter.findFirst.mockResolvedValue({
        id: "e1",
        status: "ACTIVE",
        round: 2,
        activePosition: 0,
        combatants: filas(["a", "b", "c"]),
      });
      prisma.character.findFirst.mockResolvedValue({
        id: "ch-b",
        name: "Bandido",
        visibility: "PLAYERS",
      });
      prisma.combatant.findMany.mockResolvedValue(
        filas(["a", "c"]).map((f, i) => ({ ...f, position: i })),
      );
      await service.removeCombatant("dm", "c1", "s1", "e1", "b");
      expect(prisma.combatant.delete).toHaveBeenCalledWith({ where: { id: "b" } });
      const tipos = events.record.mock.calls.map((c: any) => c[2].payload.type);
      expect(tipos).toEqual(["COMBATANT_LEFT"]);
      expect(events.record.mock.calls[0][2].payload.characterName).toBe("Bandido");
      expect(prisma.encounter.update).toHaveBeenCalledWith({
        where: { id: "e1" },
        data: { activePosition: 0 },
      });
    });

    it("sacar a quien tiene el turno (solo en su posición) avanza al siguiente con TURN_ADVANCED, sin subir asalto", async () => {
      prisma.combatant.findFirst.mockResolvedValue({
        id: "a",
        encounterId: "e1",
        characterId: "ch-a",
      });
      prisma.encounter.findFirst.mockResolvedValue({
        id: "e1",
        status: "ACTIVE",
        round: 2,
        activePosition: 0,
        combatants: filas(["a", "b", "c"]),
      });
      prisma.character.findFirst.mockResolvedValue({
        id: "ch-a",
        name: "Garrik",
        visibility: "DM_ONLY",
      });
      prisma.combatant.findMany.mockResolvedValue(
        filas(["b", "c"]).map((f, i) => ({ ...f, position: i })),
      );
      await service.removeCombatant("dm", "c1", "s1", "e1", "a");
      const tipos = events.record.mock.calls.map((c: any) => c[2].payload.type);
      expect(tipos).toEqual(["COMBATANT_LEFT", "TURN_ADVANCED"]);
      expect(events.record.mock.calls[0][2].payload.characterName).toBeUndefined(); // oculto: «Alguien»
      expect(prisma.encounter.update).toHaveBeenCalledWith({
        where: { id: "e1" },
        data: { activePosition: 0, round: 2 },
      });
      expect(clock.advance).not.toHaveBeenCalled();
      expect(prisma.combatant.updateMany).toHaveBeenCalledWith({
        where: { encounterId: "e1", position: 0 },
        data: { actionUsed: false, bonusUsed: false, reactionUsed: false, movementUsed: 0 },
      });
    });

    it("sacar al último de la vuelta cuando le toca sube de asalto UNA vez y avanza el reloj seis segundos", async () => {
      prisma.combatant.findFirst.mockResolvedValue({
        id: "c",
        encounterId: "e1",
        characterId: "ch-c",
      });
      prisma.encounter.findFirst.mockResolvedValue({
        id: "e1",
        status: "ACTIVE",
        round: 2,
        activePosition: 2,
        combatants: filas(["a", "b", "c"]),
      });
      prisma.character.findFirst.mockResolvedValue({
        id: "ch-c",
        name: "Orco",
        visibility: "PLAYERS",
      });
      prisma.combatant.findMany.mockResolvedValue(filas(["a", "b"]));
      clock.advance.mockResolvedValue({ to: 66 });
      await service.removeCombatant("dm", "c1", "s1", "e1", "c");
      const tipos = events.record.mock.calls.map((c: any) => c[2].payload.type);
      expect(tipos).toEqual(["COMBATANT_LEFT", "TURN_ADVANCED", "ROUND_ADVANCED"]);
      expect(prisma.encounter.update).toHaveBeenCalledWith({
        where: { id: "e1" },
        data: { activePosition: 0, round: 3 },
      });
      expect(clock.advance).toHaveBeenCalledTimes(1);
    });

    it("sacar a uno de un grupo que tiene el turno: el turno se queda en el grupo", async () => {
      const character = { visibility: "PLAYERS", ownerId: "dm", currentHp: 10 };
      const grupo = [
        {
          id: "g1",
          characterId: "ch-g1",
          initiative: 15,
          groupKey: "SRD:goblin",
          position: 0,
          side: "ENEMY",
          character,
        },
        {
          id: "g2",
          characterId: "ch-g2",
          initiative: 15,
          groupKey: "SRD:goblin",
          position: 0,
          side: "ENEMY",
          character,
        },
        {
          id: "p",
          characterId: "ch-p",
          initiative: 10,
          groupKey: "p",
          position: 1,
          side: "ALLY",
          character,
        },
      ];
      prisma.combatant.findFirst.mockResolvedValue({
        id: "g1",
        encounterId: "e1",
        characterId: "ch-g1",
      });
      prisma.encounter.findFirst.mockResolvedValue({
        id: "e1",
        status: "ACTIVE",
        round: 1,
        activePosition: 0,
        combatants: grupo,
      });
      prisma.character.findFirst.mockResolvedValue({
        id: "ch-g1",
        name: "Goblin 1",
        visibility: "PLAYERS",
      });
      prisma.combatant.findMany.mockResolvedValue(grupo.filter((g) => g.id !== "g1"));
      await service.removeCombatant("dm", "c1", "s1", "e1", "g1");
      const tipos = events.record.mock.calls.map((c: any) => c[2].payload.type);
      expect(tipos).toEqual(["COMBATANT_LEFT"]);
      expect(prisma.encounter.update).toHaveBeenCalledWith({
        where: { id: "e1" },
        data: { activePosition: 0 },
      });
    });
  });
});
