import { Test } from "@nestjs/testing";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { WorldStateService } from "./world-state.service";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { PrismaService } from "../prisma/prisma.service";

// Tarea 2A.15.

describe("WorldStateService", () => {
  let service: WorldStateService;
  const prisma = {
    campaignFlag: { upsert: jest.fn(), findMany: jest.fn() },
    campaignSet: { upsert: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    campaignSetMember: { findUnique: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
  };
  const membership = { requireDM: jest.fn(), requireMember: jest.fn() };
  const events = { record: jest.fn() };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        WorldStateService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: GameEventsService, useValue: events },
      ],
    }).compile();
    service = ref.get(WorldStateService);
    jest.resetAllMocks();
    membership.requireDM.mockResolvedValue(undefined);
    membership.requireMember.mockResolvedValue(undefined);
  });

  describe("setFlag()", () => {
    it("un jugador no puede poner una marca (403)", async () => {
      membership.requireDM.mockRejectedValue(new ForbiddenException("DM role required"));
      await expect(
        service.setFlag("player1", "c1", { key: "puente-caido", value: true }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.campaignFlag.upsert).not.toHaveBeenCalled();
    });

    it("el DM la escribe y queda un GameEvent FLAG_SET", async () => {
      prisma.campaignFlag.upsert.mockResolvedValue({ id: "f1", key: "puente-caido", value: true });
      await service.setFlag("dm1", "c1", { key: "puente-caido", value: true });
      expect(prisma.campaignFlag.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { campaignId_key: { campaignId: "c1", key: "puente-caido" } },
        }),
      );
      expect(events.record).toHaveBeenCalledWith(
        "dm1",
        "c1",
        expect.objectContaining({
          payload: { type: "FLAG_SET", key: "puente-caido", value: true },
        }),
      );
    });
  });

  describe("listFlags()", () => {
    it("exige ser miembro", async () => {
      membership.requireMember.mockRejectedValue(new ForbiddenException());
      await expect(service.listFlags("x", "c1")).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.campaignFlag.findMany).not.toHaveBeenCalled();
    });
  });

  describe("addMember() — idempotencia", () => {
    it("añadir dos veces el mismo miembro no duplica el GameEvent", async () => {
      prisma.campaignSet.findUnique.mockResolvedValue({ id: "s1", key: "sabios" });
      // Primera vez: no existía.
      prisma.campaignSetMember.findUnique.mockResolvedValueOnce(null);
      prisma.campaignSetMember.upsert.mockResolvedValue({ id: "m1" });
      await service.addMember("dm1", "c1", "sabios", { memberType: "user", memberId: "p1" });
      expect(events.record).toHaveBeenCalledTimes(1);

      // Segunda vez: ya existía.
      prisma.campaignSetMember.findUnique.mockResolvedValueOnce({ id: "m1" });
      await service.addMember("dm1", "c1", "sabios", { memberType: "user", memberId: "p1" });
      // El upsert se sigue llamando (no falla, es el mismo efecto), pero no se duplica el evento.
      expect(prisma.campaignSetMember.upsert).toHaveBeenCalledTimes(2);
      expect(events.record).toHaveBeenCalledTimes(1);
    });

    it("un jugador no puede añadir un miembro (403)", async () => {
      membership.requireDM.mockRejectedValue(new ForbiddenException());
      await expect(
        service.addMember("player1", "c1", "sabios", { memberType: "user", memberId: "p1" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("un conjunto inexistente es 404", async () => {
      prisma.campaignSet.findUnique.mockResolvedValue(null);
      await expect(
        service.addMember("dm1", "c1", "no-existe", { memberType: "user", memberId: "p1" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("removeMember()", () => {
    it("quitar un miembro que no estaba no escribe evento", async () => {
      prisma.campaignSet.findUnique.mockResolvedValue({ id: "s1", key: "sabios" });
      prisma.campaignSetMember.deleteMany.mockResolvedValue({ count: 0 });
      await service.removeMember("dm1", "c1", "sabios", "user", "p1");
      expect(events.record).not.toHaveBeenCalled();
    });

    it("quitar un miembro que sí estaba escribe SET_CHANGED REMOVED", async () => {
      prisma.campaignSet.findUnique.mockResolvedValue({ id: "s1", key: "sabios" });
      prisma.campaignSetMember.deleteMany.mockResolvedValue({ count: 1 });
      await service.removeMember("dm1", "c1", "sabios", "user", "p1");
      expect(events.record).toHaveBeenCalledWith(
        "dm1",
        "c1",
        expect.objectContaining({
          payload: {
            type: "SET_CHANGED",
            setKey: "sabios",
            action: "REMOVED",
            memberType: "user",
            memberId: "p1",
          },
        }),
      );
    });
  });

  describe("raiseSignal()", () => {
    it("un jugador no puede levantar una señal (403)", async () => {
      membership.requireDM.mockRejectedValue(new ForbiddenException());
      await expect(service.raiseSignal("player1", "c1", { key: "trampa" })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("el DM la levanta y el evento es DM_ONLY", async () => {
      await service.raiseSignal("dm1", "c1", { key: "trampa", reason: "de prueba" });
      expect(events.record).toHaveBeenCalledWith(
        "dm1",
        "c1",
        expect.objectContaining({
          visibility: "DM_ONLY",
          payload: { type: "SIGNAL_RAISED", key: "trampa", reason: "de prueba" },
        }),
      );
    });
  });

  describe("recordEntityOpened()", () => {
    it("escribe un ENTITY_OPENED con visibilidad DM_ONLY", async () => {
      await service.recordEntityOpened("u1", "c1", "e1", "NPC", "Gundren");
      expect(events.record).toHaveBeenCalledWith(
        "u1",
        "c1",
        expect.objectContaining({
          visibility: "DM_ONLY",
          payload: { type: "ENTITY_OPENED", entityType: "NPC", entityName: "Gundren" },
        }),
      );
    });
  });
});
