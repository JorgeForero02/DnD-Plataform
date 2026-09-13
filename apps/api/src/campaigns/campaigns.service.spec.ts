import { Test } from "@nestjs/testing";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CampaignsService } from "./campaigns.service";
import { MembershipService } from "./membership.service";
import { PrismaService } from "../prisma/prisma.service";

describe("CampaignsService", () => {
  let service: CampaignsService;
  const prisma = {
    campaign: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    entity: { findMany: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  const membership = { requireMember: jest.fn(), requireDM: jest.fn(), removeMember: jest.fn() };
  const events = { emit: jest.fn() };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile();
    service = ref.get(CampaignsService);
    jest.resetAllMocks();
  });

  it("create() makes the owner a DM member and emits campaign.created", async () => {
    prisma.campaign.create.mockResolvedValue({ id: "c1" });
    await service.create("u1", { name: "Curse of Strahd" });
    expect(prisma.campaign.create).toHaveBeenCalledWith({
      data: {
        name: "Curse of Strahd",
        description: undefined,
        ownerId: "u1",
        members: { create: { userId: "u1", role: "DM" } },
      },
    });
    expect(events.emit).toHaveBeenCalledWith("campaign.created", {
      campaignId: "c1",
      ownerId: "u1",
    });
  });

  it("getById() rejects a non-member (requireMember throws)", async () => {
    membership.requireMember.mockRejectedValue(new ForbiddenException());
    await expect(service.getById("u2", "c1")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("getById() returns the campaign for a member", async () => {
    membership.requireMember.mockResolvedValue({ id: "m1", role: "DM" });
    prisma.campaign.findUnique.mockResolvedValue({ id: "c1", name: "X" });
    await expect(service.getById("u1", "c1")).resolves.toEqual({ id: "c1", name: "X" });
  });

  describe("update()", () => {
    it("calls requireDM before writing", async () => {
      membership.requireDM.mockRejectedValue(new ForbiddenException());
      await expect(service.update("u1", "c1", { name: "New name" })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.campaign.update).not.toHaveBeenCalled();
    });

    it("with { name: 'X' } includes name in data", async () => {
      membership.requireDM.mockResolvedValue({ id: "m1", role: "DM" });
      prisma.campaign.update.mockResolvedValue({ id: "c1" });
      await service.update("u1", "c1", { name: "X" });
      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: "c1" },
        data: { name: "X" },
      });
    });

    it("with { description: '' } includes description in data (empties, not omits)", async () => {
      membership.requireDM.mockResolvedValue({ id: "m1", role: "DM" });
      prisma.campaign.update.mockResolvedValue({ id: "c1" });
      await service.update("u1", "c1", { description: "" });
      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: "c1" },
        data: { description: "" },
      });
    });

    it("with {} does not invent fields in data", async () => {
      membership.requireDM.mockResolvedValue({ id: "m1", role: "DM" });
      prisma.campaign.update.mockResolvedValue({ id: "c1" });
      await service.update("u1", "c1", {});
      expect(prisma.campaign.update).toHaveBeenCalledWith({ where: { id: "c1" }, data: {} });
    });

    it("emits campaign.updated", async () => {
      membership.requireDM.mockResolvedValue({ id: "m1", role: "DM" });
      prisma.campaign.update.mockResolvedValue({ id: "c1" });
      await service.update("u1", "c1", { name: "New name" });
      expect(events.emit).toHaveBeenCalledWith("campaign.updated", {
        campaignId: "c1",
        actorId: "u1",
      });
    });

    it("update escribe tableRules cuando viaja y no la toca cuando no", async () => {
      membership.requireDM.mockResolvedValue({ id: "m1", role: "DM" });
      prisma.campaign.update.mockResolvedValue({ id: "c1" });
      const reglas = { abilities: { metodo: "MATRIZ" }, nivelInicial: 3 };
      await service.update("dm", "c1", { tableRules: reglas as never });
      expect(prisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tableRules: reglas }) }),
      );
      (prisma.campaign.update as jest.Mock).mockClear();
      await service.update("dm", "c1", { name: "Otra" });
      const data = (prisma.campaign.update as jest.Mock).mock.calls[0][0].data;
      expect("tableRules" in data).toBe(false);
    });

    it("update rechaza con 400 una expresión de dados que el evaluador no acepta, y acepta 3d6", async () => {
      membership.requireDM.mockResolvedValue({ id: "m1", role: "DM" });
      prisma.campaign.update.mockResolvedValue({ id: "c1" });
      await expect(
        service.update("dm", "c1", {
          tableRules: {
            abilities: { metodo: "DADOS", expresion: "4d", intentos: 1, asignacionLibre: true },
          } as never,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.campaign.update).not.toHaveBeenCalled();
      await expect(
        service.update("dm", "c1", {
          tableRules: {
            abilities: { metodo: "DADOS", expresion: "3d6", intentos: 2, asignacionLibre: false },
          } as never,
        }),
      ).resolves.toBeDefined();
    });
  });

  describe("remove()", () => {
    it("calls requireDM before deleting", async () => {
      membership.requireDM.mockRejectedValue(new ForbiddenException());
      await expect(service.remove("u1", "c1")).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.campaign.delete).not.toHaveBeenCalled();
    });

    it("deletes the campaign and emits campaign.deleted", async () => {
      membership.requireDM.mockResolvedValue({ id: "m1", role: "DM" });
      prisma.campaign.delete.mockResolvedValue({ id: "c1" });
      await expect(service.remove("u1", "c1")).resolves.toEqual({ deleted: true });
      expect(prisma.campaign.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
      expect(events.emit).toHaveBeenCalledWith("campaign.deleted", {
        campaignId: "c1",
        actorId: "u1",
      });
    });
  });

  describe("removeMember()", () => {
    it("delegates to MembershipService.removeMember and emits campaign.member.removed", async () => {
      membership.removeMember.mockResolvedValue({ removed: true });
      await expect(service.removeMember("u1", "c1", "u2")).resolves.toEqual({ removed: true });
      expect(membership.removeMember).toHaveBeenCalledWith("c1", "u1", "u2");
      expect(events.emit).toHaveBeenCalledWith("campaign.member.removed", {
        campaignId: "c1",
        actorId: "u1",
        targetUserId: "u2",
      });
    });
  });

  describe("«dónde se quedó» en el listado (D-OP-17)", () => {
    // La pantalla de crónicas quiere decir, por cada campaña, la crónica de su última sesión cerrada
    // — es lo que la convierte en «partidas guardadas» y no en una lista de proyectos.

    function conUltimaSesion(sessions: unknown[], role = "PLAYER") {
      prisma.user.findUnique.mockResolvedValue({ id: "p1", isAdmin: false });
      prisma.entity.findMany.mockResolvedValue([]);
      prisma.campaign.findMany.mockResolvedValue([
        {
          id: "c1",
          name: "La costa",
          description: null,
          members: [{ role }],
          _count: { members: 3 },
          sessions,
        },
      ]);
    }

    it("trae la crónica cuando el jugador puede leerla", async () => {
      conUltimaSesion([
        {
          title: "La noche del puerto",
          endedAt: new Date("2026-09-04T22:00:00Z"),
          recap: "Huyeron del puerto",
          recapVisibility: "PLAYERS",
        },
      ]);
      const [campana] = (await service.listForUser("p1")) as Record<string, unknown>[];
      expect(campana.lastRecap).toMatchObject({
        text: "Huyeron del puerto",
        sessionTitle: "La noche del puerto",
      });
      // Y `sessions` no se filtra hacia fuera: era el vehículo de la consulta, no parte de la
      // respuesta.
      expect(campana).not.toHaveProperty("sessions");
    });

    it("**una crónica que el jugador no puede ver NO viaja, ni vacía**", async () => {
      conUltimaSesion([
        {
          title: "Preparación",
          endedAt: new Date(),
          recap: "Lo que el DM se guarda",
          recapVisibility: "DM_ONLY",
        },
      ]);
      const [campana] = (await service.listForUser("p1")) as Record<string, unknown>[];
      expect("lastRecap" in campana).toBe(false);
    });

    it("y el DM de esa misma mesa sí la ve", async () => {
      conUltimaSesion(
        [
          {
            title: "Preparación",
            endedAt: new Date(),
            recap: "Lo que el DM se guarda",
            recapVisibility: "DM_ONLY",
          },
        ],
        "DM",
      );
      const [campana] = (await service.listForUser("p1")) as Record<string, unknown>[];
      expect(campana.lastRecap).toMatchObject({ text: "Lo que el DM se guarda" });
    });

    it("**una campaña SIN ninguna sesión cerrada sale bien y sin el campo** — el caso que se olvida", async () => {
      conUltimaSesion([]);
      const [campana] = (await service.listForUser("p1")) as Record<string, unknown>[];
      expect("lastRecap" in campana).toBe(false);
      // Y lo demás sigue entero: el listado no se rompe por no tener crónica.
      expect(campana).toMatchObject({ id: "c1", name: "La costa", _count: { members: 3 } });
    });

    it("una sesión cerrada SIN crónica escrita tampoco inventa nada", async () => {
      conUltimaSesion([
        { title: "Sin notas", endedAt: new Date(), recap: null, recapVisibility: "PLAYERS" },
      ]);
      const [campana] = (await service.listForUser("p1")) as Record<string, unknown>[];
      expect("lastRecap" in campana).toBe(false);
    });

    it("**la crónica de una sesión DM_ONLY sí llega si la crónica es PLAYERS**", async () => {
      // Es la mitad de para qué sirve que la visibilidad de la crónica sea propia: publicar lo que
      // pasó en una sesión de preparación es legítimo.
      conUltimaSesion([
        {
          title: "Preparación",
          endedAt: new Date(),
          recap: "Lo que la mesa sí puede leer",
          recapVisibility: "PLAYERS",
        },
      ]);
      const [campana] = (await service.listForUser("p1")) as Record<string, unknown>[];
      expect(campana.lastRecap).toMatchObject({ text: "Lo que la mesa sí puede leer" });
    });
  });
});
