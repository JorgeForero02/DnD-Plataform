import { Test } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InvitesService } from "./invites.service";
import { MembershipService } from "../campaigns/membership.service";
import { PrismaService } from "../prisma/prisma.service";
import { GameEventsService } from "../game-events/game-events.service";

describe("InvitesService", () => {
  let service: InvitesService;
  const prisma = {
    invite: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    campaignMember: { upsert: jest.fn() },
    // Lo lee `accept()` para poner el nombre en el suceso `MEMBER_JOINED`.
    user: { findUnique: jest.fn() },
  };
  const membership = { requireDM: jest.fn() };
  const events = { emit: jest.fn() };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        InvitesService,
        { provide: PrismaService, useValue: prisma },
        { provide: GameEventsService, useValue: { record: jest.fn() } },
        { provide: MembershipService, useValue: membership },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile();
    service = ref.get(InvitesService);
    jest.clearAllMocks();
  });

  it("create() requires DM then creates a token", async () => {
    prisma.invite.create.mockResolvedValue({ id: "i1", token: "abc" });
    await service.create("dm1", "c1");
    expect(membership.requireDM).toHaveBeenCalledWith("c1", "dm1");
    expect(prisma.invite.create).toHaveBeenCalled();
  });

  it("accept() rejects an unknown token", async () => {
    prisma.invite.findUnique.mockResolvedValue(null);
    await expect(service.accept("nope", "u2")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("accept() rejects an already-used invite", async () => {
    prisma.invite.findUnique.mockResolvedValue({ id: "i1", usedAt: new Date() });
    await expect(service.accept("abc", "u2")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("accept() adds member, marks used, emits member_joined", async () => {
    prisma.invite.findUnique.mockResolvedValue({
      id: "i1",
      campaignId: "c1",
      role: "PLAYER",
      usedAt: null,
    });
    prisma.campaignMember.upsert.mockResolvedValue({ role: "PLAYER" });
    const r = await service.accept("abc", "u2");
    expect(prisma.campaignMember.upsert).toHaveBeenCalled();
    expect(prisma.invite.update).toHaveBeenCalledWith({
      where: { id: "i1" },
      data: { usedAt: expect.any(Date) },
    });
    expect(events.emit).toHaveBeenCalledWith("campaign.member_joined", {
      campaignId: "c1",
      userId: "u2",
    });
    expect(r).toEqual({ campaignId: "c1", role: "PLAYER" });
  });
});
