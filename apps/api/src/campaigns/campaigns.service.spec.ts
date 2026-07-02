import { Test } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CampaignsService } from "./campaigns.service";
import { MembershipService } from "./membership.service";
import { PrismaService } from "../prisma/prisma.service";

describe("CampaignsService", () => {
  let service: CampaignsService;
  const prisma = { campaign: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() } };
  const membership = { requireMember: jest.fn() };
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
    jest.clearAllMocks();
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
    expect(events.emit).toHaveBeenCalledWith("campaign.created", { campaignId: "c1", ownerId: "u1" });
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
});
