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
    invite: { create: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn() },
    campaignMember: { upsert: jest.fn() },
    transaction: jest.fn(),
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
    prisma.transaction.mockImplementation(async (fn: any) => fn(prisma));
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
    prisma.invite.updateMany.mockResolvedValue({ count: 1 });
    prisma.campaignMember.upsert.mockResolvedValue({ role: "PLAYER" });
    const r = await service.accept("abc", "u2");
    expect(prisma.campaignMember.upsert).toHaveBeenCalled();
    // Gastar el enlace es condicional —solo si sigue sin usar y sin revocar— y va dentro de la
    // transacción: es la base la que decide quién gana una carrera (ficha P3, 2026-09-10).
    expect(prisma.invite.updateMany).toHaveBeenCalledWith({
      where: { id: "i1", usedAt: null, revokedAt: null },
      // **Y QUIÉN**, no solo cuándo (plan 11, ficha D3b): el listado del DM tiene que poder
      // decir «esta se la di a Marta y entró Marta», y `usedAt` no guardaba eso.
      data: { usedAt: expect.any(Date), usedById: "u2" },
    });
    expect(prisma.transaction).toHaveBeenCalled();
    expect(events.emit).toHaveBeenCalledWith("campaign.member_joined", {
      campaignId: "c1",
      userId: "u2",
    });
    expect(r).toEqual({ campaignId: "c1", role: "PLAYER" });
  });

  it("accept() loses the race when the base says the invite was already spent, and seats nobody", async () => {
    prisma.invite.findUnique.mockResolvedValue({
      id: "i1",
      campaignId: "c1",
      role: "PLAYER",
      usedAt: null,
    });
    prisma.invite.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.accept("abc", "u2")).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.campaignMember.upsert).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });
});
