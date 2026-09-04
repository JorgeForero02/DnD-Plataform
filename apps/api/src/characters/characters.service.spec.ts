import { Test } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { CharactersService } from "./characters.service";
import { MembershipService } from "../campaigns/membership.service";
import { PrismaService } from "../prisma/prisma.service";
import { GameEventsService } from "../game-events/game-events.service";

describe("CharactersService", () => {
  let service: CharactersService;
  const prisma = {
    character: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    transaction: jest.fn(),
  };
  const membership = { requireMember: jest.fn(), requireDM: jest.fn(), getMembership: jest.fn() };
  const gameEvents = { record: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        CharactersService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: GameEventsService, useValue: gameEvents },
      ],
    }).compile();
    service = ref.get(CharactersService);
    jest.clearAllMocks();
    membership.getMembership.mockResolvedValue({ role: "DM" });
  });

  function txMock(updateResult: unknown) {
    return { character: { update: jest.fn().mockResolvedValue(updateResult) } };
  }

  it("create() sets ownerId to the caller", async () => {
    prisma.character.create.mockResolvedValue({ id: "ch1" });
    await service.create("p1", "c1", { name: "Aragorn", level: 3, visibility: "PLAYERS" } as any);
    expect(prisma.character.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        campaignId: "c1",
        ownerId: "p1",
        name: "Aragorn",
        visibility: "PLAYERS",
      }),
    });
  });

  it("list() applies canView: player sees PLAYERS and own OWNER_DM, hides others' OWNER_DM and DM_ONLY", async () => {
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    prisma.character.findMany.mockResolvedValue([
      { id: "a", ownerId: "p1", visibility: "PLAYERS" },
      { id: "b", ownerId: "p1", visibility: "OWNER_DM" },
      { id: "c", ownerId: "p2", visibility: "OWNER_DM" },
      { id: "d", ownerId: "p1", visibility: "DM_ONLY" },
    ]);
    const res = await service.list("p1", "c1");
    expect(res.map((c: any) => c.id).sort()).toEqual(["a", "b"]);
  });

  it("update() rejects a non-owner non-DM player (403)", async () => {
    prisma.character.findFirst.mockResolvedValue({
      id: "ch1",
      ownerId: "p2",
      visibility: "PLAYERS",
    });
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    await expect(service.update("p1", "c1", "ch1", { name: "hax" })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  describe("archive() / unarchive() (2.5.8, ficha M9)", () => {
    const activo = {
      id: "ch1",
      ownerId: "p1",
      name: "Thora",
      visibility: "PLAYERS",
      archivedAt: null,
    };
    const archivado = { ...activo, archivedAt: new Date("2026-09-04T00:00:00Z") };

    it("list() excluye a los archivados — la misma consulta que 2D excluye a los PNJ, un filtro más", async () => {
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
      prisma.character.findMany.mockResolvedValue([]);
      await service.list("p1", "c1");
      expect(prisma.character.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { campaignId: "c1", statblockRef: null, archivedAt: null },
        }),
      );
    });

    it("archive() no borra nada, marca archivedAt y emite CHARACTER_ARCHIVED con la visibilidad del personaje", async () => {
      prisma.character.findFirst.mockResolvedValue(activo);
      const tx = txMock(archivado);
      prisma.transaction.mockImplementation((fn: (t: unknown) => unknown) => fn(tx));

      const result = await service.archive("dm1", "c1", "ch1");

      expect(prisma.character.delete).not.toHaveBeenCalled();
      expect(tx.character.update).toHaveBeenCalledWith({
        where: { id: "ch1" },
        data: { archivedAt: expect.any(Date) },
      });
      expect(gameEvents.record).toHaveBeenCalledWith(
        "dm1",
        "c1",
        {
          subjectType: "character",
          subjectId: "ch1",
          visibility: "PLAYERS",
          payload: { type: "CHARACTER_ARCHIVED", characterName: "Thora" },
        },
        tx,
      );
      expect(result).toBe(archivado);
    });

    it("archive() rechaza a quien no es dueño ni DM — misma regla que editar", async () => {
      prisma.character.findFirst.mockResolvedValue({ ...activo, ownerId: "otro" });
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      await expect(service.archive("p1", "c1", "ch1")).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.transaction).not.toHaveBeenCalled();
    });

    it("archive() sobre uno ya archivado es idempotente: no vuelve a emitir el suceso", async () => {
      prisma.character.findFirst.mockResolvedValue(archivado);
      await service.archive("dm1", "c1", "ch1");
      expect(prisma.transaction).not.toHaveBeenCalled();
      expect(gameEvents.record).not.toHaveBeenCalled();
    });

    it("unarchive() limpia archivedAt sin tocar hoja, inventario ni dinero, y emite CHARACTER_RESTORED", async () => {
      prisma.character.findFirst.mockResolvedValue(archivado);
      const tx = txMock(activo);
      prisma.transaction.mockImplementation((fn: (t: unknown) => unknown) => fn(tx));

      const result = await service.unarchive("dm1", "c1", "ch1");

      expect(tx.character.update).toHaveBeenCalledWith({
        where: { id: "ch1" },
        data: { archivedAt: null },
      });
      expect(gameEvents.record).toHaveBeenCalledWith(
        "dm1",
        "c1",
        {
          subjectType: "character",
          subjectId: "ch1",
          visibility: "PLAYERS",
          payload: { type: "CHARACTER_RESTORED", characterName: "Thora" },
        },
        tx,
      );
      expect(result).toBe(activo);
    });
  });
});
