import { Test } from "@nestjs/testing";
import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { EncountersService } from "./encounters.service";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { CharacterSheetService } from "../characters/character-sheet.service";
import { RollsService } from "../rolls/rolls.service";
import { GameClockService } from "../game-clock/game-clock.service";

describe("EncountersService", () => {
  let service: EncountersService;
  const prisma = {
    session: { findFirst: jest.fn() },
    encounter: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    character: { findMany: jest.fn() },
    combatant: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
    transaction: jest.fn(),
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
    prisma.transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
      cb({
        encounter: { create: prisma.encounter.create, update: prisma.encounter.update },
        combatant: { create: prisma.combatant.create },
      }),
    );
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
    prisma.character.findMany.mockResolvedValue([{ id: "ch1", statblockRef: null }]);
    await expect(
      service.start("dm", "c1", "s1", { characterIds: ["ch1", "ch2"] }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("start() rechaza con 409 si la sesión ya tiene un encuentro activo", async () => {
    prisma.encounter.findFirst.mockResolvedValue({ id: "enc0", status: "ACTIVE" });
    prisma.character.findMany.mockResolvedValue([{ id: "ch1", statblockRef: null }]);
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
    }));
    const personajes = [
      { id: "pc1", statblockRef: null },
      { id: "pc2", statblockRef: null },
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
    prisma.combatant.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: `comb-${data.characterId}`,
        ...data,
      }),
    );

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
    // Y por compartir puntuación quedan en posiciones consecutivas: el orden se ordena por
    // puntuación descendente y los empates de grupo no se rompen entre sí.
    const posicionesGoblin = goblinCombatants
      .map((c: any) => c.position)
      .sort((a: number, b: number) => a - b);
    for (let i = 1; i < posicionesGoblin.length; i++) {
      expect(posicionesGoblin[i]).toBe(posicionesGoblin[i - 1] + 1);
    }
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

  it("setInitiative() requiere DM y solo cambia el número, no el orden", async () => {
    prisma.combatant.findFirst.mockResolvedValue({ id: "comb1", encounterId: "enc1", position: 3 });
    prisma.combatant.update.mockResolvedValue({ id: "comb1", initiative: 17, position: 3 });

    const resultado = await service.setInitiative("dm", "c1", "s1", "enc1", "comb1", {
      initiative: 17,
    });

    expect(resultado.initiative).toBe(17);
    expect(prisma.combatant.update).toHaveBeenCalledWith({
      where: { id: "comb1" },
      data: { initiative: 17 },
    });
  });

  it("setInitiative() requires DM: a player gets 403", async () => {
    membership.requireDM.mockRejectedValue(new ForbiddenException());
    await expect(
      service.setInitiative("p1", "c1", "s1", "enc1", "comb1", { initiative: 10 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
