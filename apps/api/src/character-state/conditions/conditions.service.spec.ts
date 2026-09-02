import { Test } from "@nestjs/testing";
import { MembershipService } from "../../campaigns/membership.service";
import { GameEventsService } from "../../game-events/game-events.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ConditionsService } from "./conditions.service";

// Tarea 2A.12.

describe("ConditionsService", () => {
  let service: ConditionsService;
  const character = { id: "c1", ownerId: "owner1", visibility: "PLAYERS", campaignId: "cmp1" };
  const prisma = {
    character: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
    characterCondition: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const membership = { requireMember: jest.fn(), getMembership: jest.fn() };
  const events = { record: jest.fn() };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        ConditionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: GameEventsService, useValue: events },
      ],
    }).compile();
    service = ref.get(ConditionsService);
    jest.resetAllMocks();
    membership.requireMember.mockResolvedValue(undefined);
    prisma.character.findFirst.mockResolvedValue(character);
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
  });

  it("el dueño puede aplicar una condición sobre su propio personaje", async () => {
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.characterCondition.upsert.mockResolvedValue({ key: "prone" });

    await service.apply("owner1", "cmp1", "c1", { key: "prone" });

    expect(prisma.characterCondition.upsert).toHaveBeenCalled();
    expect(events.record).toHaveBeenCalledWith(
      "owner1",
      "cmp1",
      expect.objectContaining({ payload: expect.objectContaining({ type: "CONDITION_APPLIED" }) }),
      prisma,
    );
  });

  it("el DM puede aplicar una condición a cualquier personaje visible", async () => {
    membership.getMembership.mockResolvedValue({ role: "DM" });
    prisma.characterCondition.upsert.mockResolvedValue({ key: "grappled" });

    await service.apply("dm1", "cmp1", "c1", { key: "grappled" });

    expect(prisma.characterCondition.upsert).toHaveBeenCalled();
  });

  it("otro jugador que no es dueño ni DM no puede aplicar una condición", async () => {
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    await expect(service.apply("otro-jugador", "cmp1", "c1", { key: "prone" })).rejects.toThrow();
    expect(prisma.characterCondition.upsert).not.toHaveBeenCalled();
  });

  it("el agotamiento lleva su nivel, y una condición sin nivel lo guarda como null", async () => {
    membership.getMembership.mockResolvedValue({ role: "DM" });
    prisma.characterCondition.upsert.mockResolvedValue({ key: "exhaustion", level: 3 });

    await service.apply("dm1", "cmp1", "c1", { key: "exhaustion", level: 3 });

    expect(prisma.characterCondition.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ level: 3 }) }),
    );
  });

  it("una clave que no es de las quince del SRD se guarda igual", async () => {
    membership.getMembership.mockResolvedValue({ role: "DM" });
    prisma.characterCondition.upsert.mockResolvedValue({ key: "concentrating-on-bless" });

    await service.apply("dm1", "cmp1", "c1", { key: "concentrating-on-bless", note: "Bendición" });

    expect(prisma.characterCondition.upsert).toHaveBeenCalled();
  });

  it("quitar una condición inexistente es 404", async () => {
    membership.getMembership.mockResolvedValue({ role: "DM" });
    prisma.characterCondition.findUnique.mockResolvedValue(null);
    await expect(service.remove("dm1", "cmp1", "c1", "prone")).rejects.toThrow();
  });

  it("quitar escribe CONDITION_REMOVED", async () => {
    membership.getMembership.mockResolvedValue({ role: "DM" });
    prisma.characterCondition.findUnique.mockResolvedValue({ id: "cond1", key: "prone" });
    prisma.characterCondition.delete.mockResolvedValue({ id: "cond1" });

    await service.remove("dm1", "cmp1", "c1", "prone");

    expect(prisma.characterCondition.delete).toHaveBeenCalledWith({ where: { id: "cond1" } });
    expect(events.record).toHaveBeenCalledWith(
      "dm1",
      "cmp1",
      expect.objectContaining({ payload: { type: "CONDITION_REMOVED", key: "prone" } }),
      prisma,
    );
  });
});
