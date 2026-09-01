import { Test } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
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
});
