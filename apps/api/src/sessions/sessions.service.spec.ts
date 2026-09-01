import { Test } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { SessionsService } from "./sessions.service";
import { MembershipService } from "../campaigns/membership.service";
import { PrismaService } from "../prisma/prisma.service";

describe("SessionsService", () => {
  let service: SessionsService;
  const prisma = {
    session: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: { findUnique: jest.fn() },
  };
  const membership = { requireDM: jest.fn(), requireMember: jest.fn(), getMembership: jest.fn() };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
      ],
    }).compile();
    service = ref.get(SessionsService);
    jest.clearAllMocks();
  });

  it("create() requires DM", async () => {
    membership.requireDM.mockRejectedValue(new ForbiddenException());
    await expect(
      service.create("p1", "c1", { title: "S1", visibility: "PLAYERS" } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("list() hides DM_ONLY sessions from a player", async () => {
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    prisma.session.findMany.mockResolvedValue([
      { id: "s1", visibility: "PLAYERS" },
      { id: "s2", visibility: "DM_ONLY" },
    ]);
    const res = await service.list("p1", "c1");
    expect(res.map((s: any) => s.id)).toEqual(["s1"]);
  });
});
