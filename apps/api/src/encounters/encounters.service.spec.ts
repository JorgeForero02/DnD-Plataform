import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Test } from "@nestjs/testing";
import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { encounterStatusSchema } from "@dnd/shared";
import { EncountersService } from "./encounters.service";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { CharacterSheetService } from "../characters/character-sheet.service";
import { RollsService } from "../rolls/rolls.service";
import { GameClockService } from "../game-clock/game-clock.service";

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
  const prisma = {
    session: { findFirst: jest.fn() },
    encounter: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    character: { findMany: jest.fn() },
    combatant: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    rollRequest: { create: jest.fn() },
    user: { findUnique: jest.fn() },
    transaction: jest.fn(),
    // **Ronda de arreglo 1 (I-1): `recolocar` ahora toma un candado (`bloquearEncuentro`) como
    // primera operación**, así que el `tx` de mentira necesita un `$queryRaw` que responda —lo
    // que devuelva no importa aquí, ningún camino unitario mira el estado que trae de vuelta.
    $queryRaw: jest.fn().mockResolvedValue([{ status: "PREPARING" }]),
  };
  const membership = { requireDM: jest.fn(), requireMember: jest.fn(), getMembership: jest.fn() };
  const events = { record: jest.fn().mockResolvedValue({ id: "ev1" }) };
  const sheets = { getInitiativeModifier: jest.fn() };
  const rolls = { roll: jest.fn() };
  const clock = { advance: jest.fn() };

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
      ],
    }).compile();
    service = ref.get(EncountersService);
    jest.clearAllMocks();
    events.record.mockResolvedValue({ id: "ev1" });
    membership.requireDM.mockResolvedValue(undefined);
    membership.requireMember.mockResolvedValue(undefined);
    prisma.session.findFirst.mockResolvedValue({ id: "s1", campaignId: "c1" });
    // **El Prisma simulado tiene que saber releer.** `recolocar` —la única función que convierte
    // «iniciativa + grupo» en «orden»— lee las filas recién creadas, las coloca y las vuelve a
    // leer, así que el `tx` de mentira necesita un `findMany` que devuelva lo que se creó y un
    // `update` que guarde la posición. Simularlo con un array es más fiel que devolver una
    // constante: así la prueba mide el reparto de posiciones de verdad y no una lista escrita a
    // mano que siempre daría la respuesta esperada.
    const creadas: Record<string, unknown>[] = [];
    prisma.combatant.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
      const fila = { id: `comb${creadas.length}`, ...data };
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

    prisma.transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
      cb({
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
        },
        rollRequest: { create: prisma.rollRequest.create },
        $queryRaw: prisma.$queryRaw,
      }),
    );
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
    prisma.encounter.findFirst.mockResolvedValue(null);
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

  it("agrupa a los combatientes con el mismo statblockRef: una sola tirada para el grupo entero", async () => {
    prisma.encounter.findFirst.mockResolvedValue(null);
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
    const encuentro = await service.start("dm", "c1", "s1", {
      characterIds: [...personajes, ...goblins].map((p) => p.id),
    });

    // Ocho combatientes (2D: un PNJ en la mesa es una fila de Character).
    expect(encuentro.combatants).toHaveLength(8);
    // Una sola tirada por grupo: dos personajes (grupo de uno cada uno) + un grupo de seis
    // goblins = tres tiradas, no ocho.
    expect(rolls.roll).toHaveBeenCalledTimes(3);
    // Los seis goblins comparten la misma iniciativa: compartieron la tirada.
    const goblinCombatants = encuentro.combatants.filter((c: any) =>
      goblins.some((g) => g.id === c.characterId),
    );
    const iniciativasGoblin = new Set(goblinCombatants.map((c: any) => c.initiative));
    expect(iniciativasGoblin.size).toBe(1);
    // Y comparten **la misma posición**, no seis consecutivas: *«each member of the group acts
    // at the same time»* (SRD 5.1, «Initiative»). Ocho combatientes, siete posiciones.
    const posicionesGoblin = new Set(goblinCombatants.map((c: any) => c.position));
    expect(posicionesGoblin.size).toBe(1);
    // Dos personajes (dos grupos de uno) + un grupo de seis goblins = TRES entradas de orden.
    const todasLasPosiciones = new Set(encuentro.combatants.map((c: any) => c.position));
    expect(todasLasPosiciones.size).toBe(3);
  });

  describe("el bando de un combatiente (plan 02)", () => {
    function dosPersonajesListos() {
      prisma.encounter.findFirst.mockResolvedValue(null);
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

      const encuentro = await service.start("dm", "c1", "s1", {
        characterIds: ["pc1", "gob1"],
        sides: { pc1: "ALLY", gob1: "ENEMY" },
      });

      const porPersonaje = new Map(
        encuentro.combatants.map((c: { characterId: string; side: string }) => [
          c.characterId,
          c.side,
        ]),
      );
      expect(porPersonaje.get("pc1")).toBe("ALLY");
      expect(porPersonaje.get("gob1")).toBe("ENEMY");
    });

    it("quien no viene clasificado entra como NEUTRAL, que es «no se ha dicho»", async () => {
      dosPersonajesListos();

      const encuentro = await service.start("dm", "c1", "s1", {
        characterIds: ["pc1", "gob1"],
        sides: { pc1: "ALLY" },
      });

      const porPersonaje = new Map(
        encuentro.combatants.map((c: { characterId: string; side: string }) => [
          c.characterId,
          c.side,
        ]),
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
    prisma.encounter.findFirst.mockResolvedValue({
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
    prisma.encounter.findFirst.mockResolvedValue({
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
    prisma.encounter.findFirst.mockResolvedValue({
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

    const resultado = await service.setInitiative("dm", "c1", "s1", "enc1", "comb0", {
      initiative: 20,
    });

    // El corregido sube al frente y **deja de compartir posición** con los otros dos.
    expect(resultado.initiative).toBe(20);
    expect(resultado.position).toBe(0);
    const filas = await (prisma.combatant.findMany as jest.Mock)({});
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
    prisma.encounter.findFirst.mockResolvedValue(null);
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

    const encuentro = await service.start("dm", "c1", "s1", {
      characterIds: bichos.map((b) => b.id),
    });

    const posicionPorClave = new Map<string, Set<number>>();
    for (const c of encuentro.combatants as { characterId: string; position: number }[]) {
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
      prisma.combatant.updateMany.mockResolvedValue({ count: 1 });
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

      expect(prisma.combatant.updateMany).toHaveBeenCalledWith({
        where: { id: "comb1", encounterId: "enc1" },
        data: { side: "ENEMY" },
      });
      expect(resultado.combatants[0]).toMatchObject({ characterId: "pc1", side: "ENEMY" });
    });

    it("cambiar el bando sin ser DM es 403", async () => {
      membership.requireDM.mockRejectedValue(new ForbiddenException());

      await expect(
        service.setSide("p1", "c1", "s1", "enc1", "comb1", { side: "ENEMY" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      // **Por el motivo correcto**: nada se escribió. Si el 403 llegara por otra vía (un
      // `NotFoundException` que Nest tradujera distinto, por ejemplo), esta llamada sí se habría
      // hecho.
      expect(prisma.combatant.updateMany).not.toHaveBeenCalled();
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

      // Con `activePosition` siguiendo a solo1 (0), «Pasar turno» avanza a pc2 (1) SIN terminar
      // el asalto: es pc2 quien falta por actuar, no un salto de ronda fantasma.
      prisma.encounter.findFirst.mockResolvedValue({
        id: "enc1",
        sessionId: "s1",
        status: "ACTIVE",
        round: 1,
        activePosition: 0,
        combatants: [
          { id: solo1.id, position: 0 },
          { id: pc2.id, position: 1 },
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
  });
});
