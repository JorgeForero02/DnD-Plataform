import { Test } from "@nestjs/testing";
import { NotificationsService } from "./notifications.service";
import { MembershipService } from "../campaigns/membership.service";
import { PrismaService } from "../prisma/prisma.service";

// Tarea 2A.14.

describe("NotificationsService", () => {
  let service: NotificationsService;
  const prisma = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    campaign: { findUnique: jest.fn() },
    entity: { findUnique: jest.fn() },
    session: { findUnique: jest.fn() },
    user: { findMany: jest.fn() },
  };
  const membership = { listMembers: jest.fn() };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
      ],
    }).compile();
    service = ref.get(NotificationsService);
    jest.resetAllMocks();
  });

  describe("notify()", () => {
    it("escribe la notificación con los datos, no una frase", async () => {
      prisma.notification.create.mockResolvedValue({ id: "n1" });
      await service.notify("u1", {
        type: "CAMPAIGN_MEMBER_JOINED",
        campaignId: "c1",
        payload: { userId: "p1" },
        subjectType: "campaignMember",
        subjectId: "p1",
      });
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: "u1",
          campaignId: "c1",
          type: "CAMPAIGN_MEMBER_JOINED",
          payload: { userId: "p1" },
          subjectType: "campaignMember",
          subjectId: "p1",
        },
      });
    });
  });

  describe("list()", () => {
    it("filtra siempre por userId: un usuario no puede pedir las de otro", async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);
      await service.list("u1", { limit: 50 });
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: "u1" }) }),
      );
    });

    it("devuelve unreadCount aparte de la página pedida", async () => {
      prisma.notification.findMany.mockResolvedValue([{ id: "n1" }]);
      prisma.notification.count.mockResolvedValue(7);
      const res = await service.list("u1", { limit: 50 });
      expect(res.unreadCount).toBe(7);
      expect(res.notifications).toHaveLength(1);
    });

    it("una página completa deja un cursor; una incompleta, no", async () => {
      prisma.notification.findMany.mockResolvedValue([{ id: "n1" }, { id: "n2" }]);
      prisma.notification.count.mockResolvedValue(0);
      const res = await service.list("u1", { limit: 2 });
      expect(res.nextCursor).toBe("n2");
    });
  });

  describe("markRead()", () => {
    it("sin ids marca todas las suyas", async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 3 });
      const res = await service.markRead("u1", {});
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: "u1" },
        data: { readAt: expect.any(Date) },
      });
      expect(res.updated).toBe(3);
    });

    it("con ids, solo esas — y el userId sigue en el where, no comprobado después", async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });
      await service.markRead("u1", { ids: ["n1", "n2"] });
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: "u1", id: { in: ["n1", "n2"] } },
        data: { readAt: expect.any(Date) },
      });
    });
  });

  describe("onMemberJoined()", () => {
    it("avisa al dueño de la campaña, no al que se unió", async () => {
      prisma.campaign.findUnique.mockResolvedValue({ ownerId: "dm1" });
      prisma.notification.create.mockResolvedValue({ id: "n1" });
      await service.onMemberJoined({ campaignId: "c1", userId: "player1" });
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "dm1",
            type: "CAMPAIGN_MEMBER_JOINED",
            payload: { userId: "player1" },
          }),
        }),
      );
    });

    it("si el propio dueño acepta su invitación, no se avisa a sí mismo", async () => {
      prisma.campaign.findUnique.mockResolvedValue({ ownerId: "dm1" });
      await service.onMemberJoined({ campaignId: "c1", userId: "dm1" });
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });
  });

  describe("onEntityCreated()", () => {
    it("no avisa a un jugador que no puede ver la entidad (DM_ONLY)", async () => {
      prisma.entity.findUnique.mockResolvedValue({
        id: "e1",
        campaignId: "c1",
        type: "NPC",
        name: "Strahd",
        visibility: "DM_ONLY",
        createdById: "dm1",
        grants: [],
      });
      membership.listMembers.mockResolvedValue([
        { userId: "dm1", role: "DM", displayName: "DM" },
        { userId: "player1", role: "PLAYER", displayName: "PL" },
      ]);
      prisma.user.findMany.mockResolvedValue([
        { id: "dm1", isAdmin: false },
        { id: "player1", isAdmin: false },
      ]);
      await service.onEntityCreated({ campaignId: "c1", entityId: "e1" });
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it("avisa a un jugador que sí puede ver la entidad, y no a quien la creó", async () => {
      prisma.entity.findUnique.mockResolvedValue({
        id: "e1",
        campaignId: "c1",
        type: "NPC",
        name: "Gundren",
        visibility: "PLAYERS",
        createdById: "dm1",
        grants: [],
      });
      membership.listMembers.mockResolvedValue([
        { userId: "dm1", role: "DM", displayName: "DM" },
        { userId: "player1", role: "PLAYER", displayName: "PL" },
      ]);
      prisma.user.findMany.mockResolvedValue([
        { id: "dm1", isAdmin: false },
        { id: "player1", isAdmin: false },
      ]);
      prisma.notification.create.mockResolvedValue({ id: "n1" });
      await service.onEntityCreated({ campaignId: "c1", entityId: "e1" });
      expect(prisma.notification.create).toHaveBeenCalledTimes(1);
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "player1",
            type: "ENTITY_CREATED",
            payload: { entityId: "e1", entityType: "NPC", entityName: "Gundren" },
          }),
        }),
      );
    });
  });
  // --- Plan 12 · los dos avisos que nadie emitía ---

  describe("onCommentAdded()", () => {
    const mesa = [
      { userId: "dm1", role: "DM", displayName: "DM" },
      { userId: "autora", role: "PLAYER", displayName: "Autora" },
      { userId: "otra", role: "PLAYER", displayName: "Otra" },
    ];
    const nadieEsAdmin = [
      { id: "dm1", isAdmin: false },
      { id: "autora", isAdmin: false },
      { id: "otra", isAdmin: false },
    ];

    function fichaDe(visibility: string, createdById = "autora") {
      return {
        id: "e1",
        campaignId: "c1",
        type: "NPC",
        name: "Gundren",
        visibility,
        createdById,
        grants: [],
      };
    }

    function destinatarios() {
      return prisma.notification.create.mock.calls.map(
        (c: unknown[]) => (c[0] as { data: { userId: string } }).data.userId,
      );
    }

    beforeEach(() => {
      membership.listMembers.mockResolvedValue(mesa);
      prisma.user.findMany.mockResolvedValue(nadieEsAdmin);
      prisma.notification.create.mockResolvedValue({ id: "n1" });
    });

    it("avisa al DM y al autor de la ficha, y a nadie más", async () => {
      prisma.entity.findUnique.mockResolvedValue(fichaDe("PLAYERS"));
      await service.onCommentAdded({ campaignId: "c1", entityId: "e1", actorId: "otra" });
      expect(destinatarios().sort()).toEqual(["autora", "dm1"]);
    });

    it("NADIE se avisa de lo que acaba de hacer: veinte comentarios propios, cero avisos propios", async () => {
      prisma.entity.findUnique.mockResolvedValue(fichaDe("PLAYERS", "dm1"));
      for (let i = 0; i < 20; i++) {
        await service.onCommentAdded({ campaignId: "c1", entityId: "e1", actorId: "dm1" });
      }
      expect(destinatarios()).not.toContain("dm1");
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it("NO llega a quien no puede ver la ficha, aunque sea el autor", async () => {
      // La ficha es `DM_ONLY`: su propio autor jugador ya no la ve, y el aviso tampoco le llega.
      // Decirle «han comentado esta ficha» le confirmaría que existe, que es justo lo que esconde.
      prisma.entity.findUnique.mockResolvedValue(fichaDe("DM_ONLY"));
      await service.onCommentAdded({ campaignId: "c1", entityId: "e1", actorId: "dm1" });
      expect(destinatarios()).toEqual([]);
    });

    it("el cuerpo del comentario NO viaja en el aviso", async () => {
      prisma.entity.findUnique.mockResolvedValue(fichaDe("PLAYERS"));
      await service.onCommentAdded({ campaignId: "c1", entityId: "e1", actorId: "otra" });
      const payloads = prisma.notification.create.mock.calls.map(
        (c: unknown[]) => (c[0] as { data: { payload: Record<string, unknown> } }).data.payload,
      );
      for (const payload of payloads) {
        expect(Object.keys(payload).sort()).toEqual(["entityId", "entityName", "entityType"]);
      }
    });
  });

  describe("onSessionScheduled()", () => {
    const mesa = [
      { userId: "dm1", role: "DM", displayName: "DM" },
      { userId: "player1", role: "PLAYER", displayName: "PL" },
    ];

    beforeEach(() => {
      membership.listMembers.mockResolvedValue(mesa);
      prisma.user.findMany.mockResolvedValue([
        { id: "dm1", isAdmin: false },
        { id: "player1", isAdmin: false },
      ]);
      prisma.notification.create.mockResolvedValue({ id: "n1" });
    });

    it("avisa a la mesa, menos a quien la planificó", async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: "s1",
        title: "La noche del puerto",
        visibility: "PLAYERS",
        scheduledAt: new Date("2026-09-20T20:00:00.000Z"),
      });
      await service.onSessionScheduled({ campaignId: "c1", sessionId: "s1", actorId: "dm1" });
      expect(prisma.notification.create).toHaveBeenCalledTimes(1);
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "player1",
            type: "SESSION_SCHEDULED",
            payload: {
              sessionId: "s1",
              sessionTitle: "La noche del puerto",
              scheduledAt: "2026-09-20T20:00:00.000Z",
            },
          }),
        }),
      );
    });

    it("una sesión DM_ONLY no se le anuncia al jugador", async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: "s1",
        title: "Lo que trama el villano",
        visibility: "DM_ONLY",
        scheduledAt: new Date("2026-09-20T20:00:00.000Z"),
      });
      await service.onSessionScheduled({ campaignId: "c1", sessionId: "s1", actorId: "dm1" });
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it("sin fecha no hay nada que avisar", async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: "s1",
        title: "Algún día",
        visibility: "PLAYERS",
        scheduledAt: null,
      });
      await service.onSessionScheduled({ campaignId: "c1", sessionId: "s1", actorId: "dm1" });
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });
  });
});
