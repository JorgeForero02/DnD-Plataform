import { Test } from "@nestjs/testing";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { MembershipService } from "./membership.service";
import { PrismaService } from "../prisma/prisma.service";

type MemberFixture = { id: string; role: "DM" | "PLAYER" } | null;

describe("MembershipService", () => {
  let service: MembershipService;
  const tx = {
    entityVisibilityGrant: { deleteMany: jest.fn() },
    campaignMember: { delete: jest.fn() },
  };
  const prisma = {
    campaignMember: { findUnique: jest.fn() },
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(tx)),
  };

  // Keys `findUnique` by the userId in the compound-unique lookup instead of queuing
  // mockResolvedValueOnce() answers by call order: a future change that adds or removes a
  // findUnique call (e.g. an extra lookup) can't silently make the wrong actor "the DM" —
  // every call resolves the same fixture for the same userId, regardless of how many times
  // or in what order it's called.
  function mockMembersByUserId(members: Record<string, MemberFixture>) {
    prisma.campaignMember.findUnique.mockImplementation(
      (args: { where: { campaignId_userId: { campaignId: string; userId: string } } }) =>
        Promise.resolve(members[args.where.campaignId_userId.userId] ?? null),
    );
  }

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [MembershipService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = ref.get(MembershipService);
    // resetAllMocks (not clearAllMocks): clearAllMocks only wipes call records and leaves any
    // mockResolvedValue/mockImplementation from a previous test as the fallback behind later
    // mockResolvedValueOnce queues. resetAllMocks also drops implementations, so every test
    // starts from a mock with no configured behavior at all.
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(tx));
  });

  it("requireMember throws when not a member", async () => {
    prisma.campaignMember.findUnique.mockResolvedValue(null);
    await expect(service.requireMember("c1", "u1")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("requireDM throws when member is only a PLAYER", async () => {
    prisma.campaignMember.findUnique.mockResolvedValue({ id: "m1", role: "PLAYER" });
    await expect(service.requireDM("c1", "u1")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("requireDM returns the member when DM", async () => {
    prisma.campaignMember.findUnique.mockResolvedValue({ id: "m1", role: "DM" });
    await expect(service.requireDM("c1", "u1")).resolves.toEqual({ id: "m1", role: "DM" });
  });

  describe("removeMember — leaving (targetUserId === actorId)", () => {
    it("a PLAYER leaving deletes their own membership", async () => {
      mockMembersByUserId({ u1: { id: "m1", role: "PLAYER" } });
      await expect(service.removeMember("c1", "u1", "u1")).resolves.toEqual({ removed: true });
      expect(tx.campaignMember.delete).toHaveBeenCalledWith({
        where: { campaignId_userId: { campaignId: "c1", userId: "u1" } },
      });
    });

    it("a DM leaving is rejected: delete it instead", async () => {
      mockMembersByUserId({ u1: { id: "m1", role: "DM" } });
      const promise = service.removeMember("c1", "u1", "u1");
      await expect(promise).rejects.toBeInstanceOf(ForbiddenException);
      await expect(promise).rejects.toThrow(
        "The DM cannot leave their own campaign; delete it instead",
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe("removeMember — removing someone else (targetUserId !== actorId)", () => {
    it("a PLAYER removing another member is rejected (not a DM)", async () => {
      mockMembersByUserId({
        actor1: { id: "actor", role: "PLAYER" },
        target1: { id: "target", role: "PLAYER" },
      });
      await expect(service.removeMember("c1", "actor1", "target1")).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("a DM removing a PLAYER deletes the membership and the player's visibility grants", async () => {
      mockMembersByUserId({
        dm1: { id: "actor", role: "DM" },
        player1: { id: "target", role: "PLAYER" },
      });
      await expect(service.removeMember("c1", "dm1", "player1")).resolves.toEqual({
        removed: true,
      });
      expect(tx.entityVisibilityGrant.deleteMany).toHaveBeenCalledWith({
        where: { userId: "player1", entity: { campaignId: "c1" } },
      });
      expect(tx.campaignMember.delete).toHaveBeenCalledWith({
        where: { campaignId_userId: { campaignId: "c1", userId: "player1" } },
      });
    });

    it("a DM removing another DM is rejected", async () => {
      mockMembersByUserId({
        dm1: { id: "actor", role: "DM" },
        dm2: { id: "target", role: "DM" },
      });
      const promise = service.removeMember("c1", "dm1", "dm2");
      await expect(promise).rejects.toBeInstanceOf(ForbiddenException);
      await expect(promise).rejects.toThrow("A DM cannot be removed");
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("removing a target who is not a member throws NotFoundException", async () => {
      mockMembersByUserId({ dm1: { id: "actor", role: "DM" } }); // "ghost" resolves to null
      await expect(service.removeMember("c1", "dm1", "ghost")).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
