import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { PrismaService } from "../prisma/prisma.service";
import { XpService } from "./xp.service";

// Puerta de efectos §5 bis (D-CF-68/D-CF-69, tarea 5). Dobles de Prisma como el resto de la
// carpeta: `transaction` ejecuta el callback con el propio doble, así que `tx.character.update` y
// `tx.gameEvent` son los mismos mocks que fuera de la transacción.

function montar() {
  const prisma: Record<string, any> = {
    character: {
      findMany: jest.fn(),
      update: jest.fn().mockImplementation(({ where, data }) => ({ id: where.id, ...data })),
    },
    transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
  };
  const membership = { requireDM: jest.fn().mockResolvedValue({ role: "DM" }) };
  const events = { record: jest.fn().mockResolvedValue({ id: "ev1" }) };

  const service = new XpService(
    prisma as unknown as PrismaService,
    membership as unknown as MembershipService,
    events as unknown as GameEventsService,
  );
  return { service, prisma, membership, events };
}

function personaje(
  overrides: Partial<{
    id: string;
    name: string;
    xp: number;
    visibility: string;
    statblockRef: string | null;
  }> = {},
) {
  return {
    id: "ch1",
    name: "Elara",
    xp: 0,
    visibility: "PLAYERS",
    statblockRef: null,
    ...overrides,
  };
}

describe("XpService.award", () => {
  it("exige DM: un jugador se lleva lo que requireDM lance, sin tocar nada", async () => {
    const { service, membership, prisma } = montar();
    membership.requireDM.mockRejectedValue(new ForbiddenException());

    await expect(
      service.award("jugador", "c1", { characterIds: ["ch1"], amount: 50 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("un characterId con statblockRef: 400 ANTES de escribir nada, ni siquiera a los demás", async () => {
    const { service, prisma } = montar();
    prisma.character.findMany.mockResolvedValue([
      personaje({ id: "pj1" }),
      personaje({ id: "pnj1", statblockRef: "SRD:goblin" }),
    ]);

    await expect(
      service.award("dm", "c1", { characterIds: ["pj1", "pnj1"], amount: 100 }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("un id que no está en la campaña (o archivado) da 404", async () => {
    const { service, prisma } = montar();
    // `findMany` filtra por campaignId y archivedAt: si vuelve menos filas que ids pedidos, falta
    // alguno.
    prisma.character.findMany.mockResolvedValue([personaje({ id: "pj1" })]);

    await expect(
      service.award("dm", "c1", { characterIds: ["pj1", "fantasma"], amount: 50 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("dos personajes válidos y amount 450: dos updates con xp anterior + 450 y dos XP_AWARDED con xpTotal", async () => {
    const { service, prisma, events } = montar();
    prisma.character.findMany.mockResolvedValue([
      personaje({ id: "a", xp: 100 }),
      personaje({ id: "b", xp: 0 }),
    ]);

    const res = await service.award("dm", "c1", {
      characterIds: ["a", "b"],
      amount: 450,
      reason: "Derrotan al goblin",
    });

    expect(res).toEqual({
      awarded: [
        { characterId: "a", xp: 550 },
        { characterId: "b", xp: 450 },
      ],
    });
    expect(prisma.character.update).toHaveBeenCalledWith({ where: { id: "a" }, data: { xp: 550 } });
    expect(prisma.character.update).toHaveBeenCalledWith({ where: { id: "b" }, data: { xp: 450 } });
    expect(events.record).toHaveBeenCalledTimes(2);
    expect(events.record).toHaveBeenCalledWith(
      "dm",
      "c1",
      expect.objectContaining({
        subjectType: "character",
        subjectId: "a",
        visibility: "PLAYERS",
        payload: {
          type: "XP_AWARDED",
          characterId: "a",
          amount: 450,
          xpTotal: 550,
          reason: "Derrotan al goblin",
        },
      }),
      expect.anything(),
    );
  });

  it("amount -600 sobre xp 100: xp nunca baja de 0, y XP_AWARDED.amount sigue siendo -600 con xpTotal 0", async () => {
    const { service, prisma, events } = montar();
    prisma.character.findMany.mockResolvedValue([personaje({ id: "a", xp: 100 })]);

    const res = await service.award("dm", "c1", { characterIds: ["a"], amount: -600 });

    expect(res.awarded).toEqual([{ characterId: "a", xp: 0 }]);
    expect(prisma.character.update).toHaveBeenCalledWith({ where: { id: "a" }, data: { xp: 0 } });
    expect(events.record).toHaveBeenCalledWith(
      "dm",
      "c1",
      expect.objectContaining({
        payload: expect.objectContaining({ amount: -600, xpTotal: 0 }),
      }),
      expect.anything(),
    );
  });

  it("todo ocurre dentro de prisma.transaction", async () => {
    const { service, prisma } = montar();
    prisma.character.findMany.mockResolvedValue([personaje({ id: "a" })]);

    await service.award("dm", "c1", { characterIds: ["a"], amount: 10 });

    expect(prisma.transaction).toHaveBeenCalledTimes(1);
  });
});
