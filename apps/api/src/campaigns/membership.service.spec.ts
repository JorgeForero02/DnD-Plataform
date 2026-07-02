import { Test } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { MembershipService } from "./membership.service";
import { PrismaService } from "../prisma/prisma.service";

describe("MembershipService", () => {
  let service: MembershipService;
  const prisma = { campaignMember: { findUnique: jest.fn() } };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [MembershipService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = ref.get(MembershipService);
    jest.clearAllMocks();
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
});
