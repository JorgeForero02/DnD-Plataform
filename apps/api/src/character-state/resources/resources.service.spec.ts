import { Test } from "@nestjs/testing";
import { MembershipService } from "../../campaigns/membership.service";
import { GameEventsService } from "../../game-events/game-events.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ResourcesService } from "./resources.service";

// Tarea 2A.8.

describe("ResourcesService", () => {
  let service: ResourcesService;
  const character = { id: "c1", ownerId: "owner1", visibility: "PLAYERS", campaignId: "cmp1" };
  const prisma = {
    character: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
    characterResource: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const membership = { requireMember: jest.fn(), getMembership: jest.fn() };
  const events = { record: jest.fn() };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        ResourcesService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: GameEventsService, useValue: events },
      ],
    }).compile();
    service = ref.get(ResourcesService);
    jest.resetAllMocks();
    membership.requireMember.mockResolvedValue(undefined);
    prisma.character.findFirst.mockResolvedValue(character);
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
  });

  describe("upsert()", () => {
    it("el dueño puede crear un recurso propio (grantedBy OWNER)", async () => {
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.characterResource.findUnique.mockResolvedValue(null);
      prisma.characterResource.upsert.mockResolvedValue({ key: "rage", current: 3 });

      await service.upsert("owner1", "cmp1", "c1", {
        key: "rage",
        label: "Furia",
        current: 3,
        max: 3,
        resetOn: "LONG_REST",
        grantedBy: "OWNER",
      });

      expect(prisma.characterResource.upsert).toHaveBeenCalled();
    });

    it("MUTACIÓN CLAVE: un jugador NO puede subir un recurso DM_ONLY (403)", async () => {
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      // La primera petición sobre esa clave: no hay fila todavía, así que el candado mira el
      // `grantedBy` que trae esta misma petición.
      prisma.characterResource.findUnique.mockResolvedValue(null);

      await expect(
        service.upsert("owner1", "cmp1", "c1", {
          key: "inspiration",
          label: "Inspiración",
          current: 1,
          max: 1,
          resetOn: "NONE",
          grantedBy: "DM_ONLY",
        }),
      ).rejects.toThrow();
      expect(prisma.characterResource.upsert).not.toHaveBeenCalled();
    });

    it("un jugador tampoco puede subir un DM_ONLY ya existente, aunque mande OWNER en el cuerpo", async () => {
      // El candado lo pone la fila que YA existe, no lo que pida el cuerpo: aflojarlo desde
      // el propio PUT del dueño sería el diputado confundido de manual.
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.characterResource.findUnique.mockResolvedValue({
        key: "inspiration",
        grantedBy: "DM_ONLY",
        current: 0,
        max: 1,
      });

      await expect(
        service.upsert("owner1", "cmp1", "c1", {
          key: "inspiration",
          label: "Inspiración",
          current: 1,
          max: 1,
          resetOn: "NONE",
          grantedBy: "OWNER",
        }),
      ).rejects.toThrow();
    });

    it("el DM sí puede subir un recurso DM_ONLY", async () => {
      membership.getMembership.mockResolvedValue({ role: "DM" });
      prisma.characterResource.findUnique.mockResolvedValue(null);
      prisma.characterResource.upsert.mockResolvedValue({ key: "inspiration", current: 1 });

      await service.upsert("dm1", "cmp1", "c1", {
        key: "inspiration",
        label: "Inspiración",
        current: 1,
        max: 1,
        resetOn: "NONE",
        grantedBy: "DM_ONLY",
      });

      expect(prisma.characterResource.upsert).toHaveBeenCalled();
    });

    it("quien no es DM ni dueño no puede tocar ningún recurso del personaje", async () => {
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      await expect(
        service.upsert("otro-jugador", "cmp1", "c1", {
          key: "ki",
          label: "Ki",
          current: 1,
          max: 4,
          resetOn: "SHORT_REST",
          grantedBy: "OWNER",
        }),
      ).rejects.toThrow();
    });
  });

  describe("spend() y restore()", () => {
    it("gastar recorta el delta entre 0 y el máximo, y escribe RESOURCE_SPENT", async () => {
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.characterResource.findUnique.mockResolvedValue({
        id: "r1",
        key: "ki",
        label: "Ki",
        current: 2,
        max: 4,
      });
      prisma.characterResource.update.mockResolvedValue({ id: "r1", current: 1 });

      const res = await service.spend("owner1", "cmp1", "c1", "ki", { amount: 1 });

      expect(prisma.characterResource.update).toHaveBeenCalledWith({
        where: { id: "r1" },
        data: { current: 1 },
      });
      expect(events.record).toHaveBeenCalledWith(
        "owner1",
        "cmp1",
        expect.objectContaining({
          payload: expect.objectContaining({
            type: "RESOURCE_SPENT",
            key: "ki",
            amount: 1,
            remaining: 1,
          }),
        }),
        prisma,
      );
      expect(res).toEqual({ id: "r1", current: 1 });
    });

    it("gastar más de lo que hay se queda en 0, nunca en negativo", async () => {
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.characterResource.findUnique.mockResolvedValue({
        id: "r1",
        key: "ki",
        label: "Ki",
        current: 1,
        max: 4,
      });
      prisma.characterResource.update.mockResolvedValue({ id: "r1", current: 0 });

      await service.spend("owner1", "cmp1", "c1", "ki", { amount: 99 });

      expect(prisma.characterResource.update).toHaveBeenCalledWith({
        where: { id: "r1" },
        data: { current: 0 },
      });
    });

    it("reponer no pasa de max, y escribe RESOURCE_RESTORED", async () => {
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.characterResource.findUnique.mockResolvedValue({
        id: "r1",
        key: "ki",
        label: "Ki",
        current: 3,
        max: 4,
      });
      prisma.characterResource.update.mockResolvedValue({ id: "r1", current: 4 });

      await service.restore("owner1", "cmp1", "c1", "ki", { amount: 5 });

      expect(prisma.characterResource.update).toHaveBeenCalledWith({
        where: { id: "r1" },
        data: { current: 4 },
      });
      expect(events.record).toHaveBeenCalledWith(
        "owner1",
        "cmp1",
        expect.objectContaining({
          payload: expect.objectContaining({ type: "RESOURCE_RESTORED", remaining: 4 }),
        }),
        prisma,
      );
    });

    it("gastar o reponer no exige el candado de grantedBy: usar lo que ya tienes no es concederte más", async () => {
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.characterResource.findUnique.mockResolvedValue({
        id: "r1",
        key: "inspiration",
        label: "Inspiración",
        current: 1,
        max: 1,
        grantedBy: "DM_ONLY",
      });
      prisma.characterResource.update.mockResolvedValue({ id: "r1", current: 0 });

      await expect(
        service.spend("owner1", "cmp1", "c1", "inspiration", { amount: 1 }),
      ).resolves.toBeDefined();
    });

    it("gastar un recurso que no existe es 404", async () => {
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.characterResource.findUnique.mockResolvedValue(null);
      await expect(
        service.spend("owner1", "cmp1", "c1", "no-existe", { amount: 1 }),
      ).rejects.toThrow();
    });
  });

  describe("list()", () => {
    it("exige poder ver el personaje", async () => {
      prisma.character.findFirst.mockResolvedValue(null);
      await expect(service.list("x", "cmp1", "c1")).rejects.toThrow();
    });
  });

  describe("seedResourcesFor()", () => {
    it("siembra dados de golpe con máximo igual al nivel, y NUNCA con resetOn de descanso", async () => {
      prisma.characterResource.upsert.mockResolvedValue({});
      await service.seedResourcesFor(
        "c1",
        { classKey: "barbarian", spellSlots: [], spellSlotResetOn: "NONE" },
        5,
      );

      expect(prisma.characterResource.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { characterId_key: { characterId: "c1", key: "hit-dice-d12" } },
          create: expect.objectContaining({ current: 5, max: 5, resetOn: "NONE" }),
        }),
      );
    });

    it("MUTACIÓN CLAVE: el brujo siembra sus espacios con reposición en descanso CORTO", async () => {
      prisma.characterResource.upsert.mockResolvedValue({});
      await service.seedResourcesFor(
        "c1",
        {
          classKey: "warlock",
          spellSlots: [{ spellLevel: 1, slots: 2 }],
          spellSlotResetOn: "SHORT_REST",
        },
        3,
      );

      expect(prisma.characterResource.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { characterId_key: { characterId: "c1", key: "spell-slot-1" } },
          create: expect.objectContaining({ current: 2, max: 2, resetOn: "SHORT_REST" }),
        }),
      );
    });
  });
});
