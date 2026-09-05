import { Test } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { CommentsService } from "./comments.service";
import { MembershipService } from "../campaigns/membership.service";
import { PrismaService } from "../prisma/prisma.service";
import { GameEventsService } from "../game-events/game-events.service";

describe("CommentsService", () => {
  let service: CommentsService;
  const prisma = {
    entity: { findUnique: jest.fn() },
    comment: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
    user: { findUnique: jest.fn() },
    // `create()` escribe el comentario y su suceso en la misma transaccion. La implementacion se
    // pone en `beforeEach`: escrita aqui, el doble se referencia a si mismo (TS7022).
    transaction: jest.fn(),
  };
  const membership = { requireMember: jest.fn(), getMembership: jest.fn() };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: GameEventsService, useValue: { record: jest.fn() } },
        { provide: MembershipService, useValue: membership },
      ],
    }).compile();
    service = ref.get(CommentsService);
    jest.clearAllMocks();
    prisma.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));
  });

  it("create() forbids commenting on an entity the user cannot see", async () => {
    prisma.entity.findUnique.mockResolvedValue({
      id: "e1",
      campaignId: "c1",
      visibility: "DM_ONLY",
      createdById: "dm1",
      grants: [],
    });
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    await expect(service.create("player1", "e1", { body: "hi" })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("create() allows commenting on a visible entity", async () => {
    prisma.entity.findUnique.mockResolvedValue({
      id: "e1",
      campaignId: "c1",
      visibility: "PLAYERS",
      createdById: "dm1",
      grants: [],
    });
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    prisma.comment.create.mockResolvedValue({ id: "cm1" });
    await service.create("player1", "e1", { body: "hi" });
    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: { entityId: "e1", authorId: "player1", body: "hi" },
    });
  });

  it("remove() forbids a non-author non-DM", async () => {
    prisma.comment.findUnique.mockResolvedValue({
      id: "cm1",
      authorId: "someoneElse",
      entity: { campaignId: "c1" },
    });
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    await expect(service.remove("player1", "cm1")).rejects.toBeInstanceOf(ForbiddenException);
  });
});
