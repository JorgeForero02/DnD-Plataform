import { Test } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { CharactersService } from "./characters.service";
import { MembershipService } from "../campaigns/membership.service";
import { PrismaService } from "../prisma/prisma.service";

describe("CharactersService", () => {
  let service: CharactersService;
  const prisma = {
    character: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: { findUnique: jest.fn() },
  };
  const membership = { requireMember: jest.fn(), requireDM: jest.fn(), getMembership: jest.fn() };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        CharactersService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
      ],
    }).compile();
    service = ref.get(CharactersService);
    jest.clearAllMocks();
  });

  it("create() sets ownerId to the caller", async () => {
    prisma.character.create.mockResolvedValue({ id: "ch1" });
    await service.create("p1", "c1", { name: "Aragorn", level: 3, visibility: "PLAYERS" } as any);
    expect(prisma.character.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        campaignId: "c1",
        ownerId: "p1",
        name: "Aragorn",
        visibility: "PLAYERS",
      }),
    });
  });

  it("list() applies canView: player sees PLAYERS and own OWNER_DM, hides others' OWNER_DM and DM_ONLY", async () => {
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    prisma.character.findMany.mockResolvedValue([
      { id: "a", ownerId: "p1", visibility: "PLAYERS" },
      { id: "b", ownerId: "p1", visibility: "OWNER_DM" },
      { id: "c", ownerId: "p2", visibility: "OWNER_DM" },
      { id: "d", ownerId: "p1", visibility: "DM_ONLY" },
    ]);
    const res = await service.list("p1", "c1");
    expect(res.map((c: any) => c.id).sort()).toEqual(["a", "b"]);
  });

  it("update() rejects a non-owner non-DM player (403)", async () => {
    prisma.character.findFirst.mockResolvedValue({
      id: "ch1",
      ownerId: "p2",
      visibility: "PLAYERS",
    });
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    await expect(service.update("p1", "c1", "ch1", { name: "hax" })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
