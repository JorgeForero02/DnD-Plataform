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
});
