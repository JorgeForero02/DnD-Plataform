import { Test } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { EntitiesService } from "./entities.service";
import { MembershipService } from "../campaigns/membership.service";
import { PrismaService } from "../prisma/prisma.service";

describe("EntitiesService", () => {
  let service: EntitiesService;
  const prisma = {
    entity: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  const membership = { requireMember: jest.fn(), getMembership: jest.fn() };
  const events = { emit: jest.fn() };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        EntitiesService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile();
    service = ref.get(EntitiesService);
    jest.clearAllMocks();
  });

  it("create() writes grants for SPECIFIC_PLAYERS and emits entity.created", async () => {
    prisma.entity.create.mockResolvedValue({ id: "e1", type: "NPC" });
    await service.create("dm1", "c1", {
      type: "NPC",
      name: "Strahd",
      tags: [],
      visibility: "SPECIFIC_PLAYERS",
      specificPlayerIds: ["p1", "p2"],
    } as any);
    const arg = prisma.entity.create.mock.calls[0][0];
    expect(arg.data.grants).toEqual({ create: [{ userId: "p1" }, { userId: "p2" }] });
    expect(arg.data.createdById).toBe("dm1");
    expect(events.emit).toHaveBeenCalledWith("entity.created", { campaignId: "c1", entityId: "e1", type: "NPC" });
  });

  it("list() hides entities the viewer cannot see (real canView)", async () => {
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    prisma.entity.findMany.mockResolvedValue([
      { id: "pub", visibility: "PUBLIC", createdById: "dm1", grants: [] },
      { id: "sec", visibility: "DM_ONLY", createdById: "dm1", grants: [] },
      { id: "pl", visibility: "PLAYERS", createdById: "dm1", grants: [] },
    ]);
    const res = await service.list("player1", "c1");
    expect(res.map((e: any) => e.id).sort()).toEqual(["pl", "pub"]);
  });

  it("remove() rejects a player who is neither DM nor creator", async () => {
    prisma.entity.findFirst.mockResolvedValue({ id: "e1", createdById: "someoneElse" });
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    await expect(service.remove("player1", "c1", "e1")).rejects.toBeInstanceOf(ForbiddenException);
  });
});
