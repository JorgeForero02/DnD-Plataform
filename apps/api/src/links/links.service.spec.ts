import { Test } from "@nestjs/testing";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { LinksService } from "./links.service";
import { MembershipService } from "../campaigns/membership.service";
import { PrismaService } from "../prisma/prisma.service";

describe("LinksService", () => {
  let service: LinksService;
  const prisma = {
    entity: { findUnique: jest.fn() },
    entityLink: { create: jest.fn(), findMany: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  const membership = { requireMember: jest.fn(), requireDM: jest.fn(), getMembership: jest.fn() };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        LinksService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
      ],
    }).compile();
    service = ref.get(LinksService);
    jest.clearAllMocks();
    // `clearAllMocks` borra las llamadas pero **no las implementaciones**: sin esto, el rechazo
    // de la prueba de permisos se cuela en la siguiente. Ya pasó en `game-events` y está
    // documentado allí; aquí se evita de entrada.
    membership.requireDM.mockResolvedValue(undefined);
  });

  it("create() rejects a self-link", async () => {
    prisma.entity.findUnique.mockResolvedValueOnce({ id: "e1", campaignId: "c1" });
    await expect(service.create("u1", "e1", { toId: "e1" })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("create() rejects a target in another campaign", async () => {
    prisma.entity.findUnique
      .mockResolvedValueOnce({ id: "e1", campaignId: "c1" }) // from
      .mockResolvedValueOnce({ id: "e2", campaignId: "OTHER" }); // to
    await expect(service.create("u1", "e1", { toId: "e2" })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("listFor() hides links whose target the viewer cannot see (real canView)", async () => {
    prisma.entity.findUnique.mockResolvedValue({ id: "e1", campaignId: "c1" });
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    prisma.entityLink.findMany.mockResolvedValue([
      {
        id: "l1",
        label: null,
        to: {
          id: "pub",
          name: "Town",
          type: "LOCATION",
          visibility: "PLAYERS",
          createdById: "dm1",
          grants: [],
        },
      },
      {
        id: "l2",
        label: null,
        to: {
          id: "sec",
          name: "Lair",
          type: "LOCATION",
          visibility: "DM_ONLY",
          createdById: "dm1",
          grants: [],
        },
      },
    ]);
    const res = await service.listFor("player1", "e1");
    expect(res.map((l) => l.to.id)).toEqual(["pub"]);
  });

  it("enlazar exige ser DM: un enlace revela que dos cosas tienen que ver", async () => {
    // Aunque el jugador no pueda abrir ninguna de las dos fichas, el enlace ya le cuenta algo.
    prisma.entity.findUnique.mockResolvedValue({ id: "e1", campaignId: "c1" });
    membership.requireDM.mockRejectedValue(new ForbiddenException());

    await expect(service.create("jugador", "e1", { toId: "e2" } as never)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.entityLink.create).not.toHaveBeenCalled();
  });
});
