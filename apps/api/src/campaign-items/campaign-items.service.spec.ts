import { Test } from "@nestjs/testing";
import { ConflictException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { CampaignItemsService } from "./campaign-items.service";

describe("CampaignItemsService", () => {
  let service: CampaignItemsService;
  const prisma = {
    campaignItem: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    campaignItemVisibilityGrant: { deleteMany: jest.fn(), createMany: jest.fn() },
    inventoryItem: { count: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
    user: { findUnique: jest.fn() },
    transaction: jest.fn(),
  };
  const membership = {
    requireMember: jest.fn(),
    requireDM: jest.fn(),
    getMembership: jest.fn(),
  };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        CampaignItemsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
      ],
    }).compile();
    service = ref.get(CampaignItemsService);
    jest.clearAllMocks();
    // `clearAllMocks` borra las llamadas pero no las implementaciones; entities.service.spec.ts
    // ya dejó este comentario y el mismo escollo aplica aquí.
    membership.requireDM.mockResolvedValue(undefined);
    membership.requireMember.mockResolvedValue(undefined);
    prisma.transaction.mockImplementation(async (fn: any) => fn(prisma));
  });

  const baseInput = {
    name: "Espada larga +1",
    kind: "WEAPON" as const,
    weightOz: 48,
    effects: [],
    requiresAttunement: false,
    visibility: "PLAYERS" as const,
    weapon: {
      category: "MARTIAL" as const,
      range: "MELEE" as const,
      damageDice: "1d8",
      damageType: "SLASHING" as const,
      properties: [],
    },
  };

  it("create() exige ser DM, no solo miembro", async () => {
    membership.requireDM.mockRejectedValue(new ForbiddenException());
    await expect(service.create("jugador", "c1", baseInput as any)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.campaignItem.create).not.toHaveBeenCalled();
  });

  it("create() en el caso normal escribe las columnas de arma y el createdById", async () => {
    prisma.campaignItem.create.mockResolvedValue({ id: "i1", kind: "WEAPON" });
    await service.create("dm1", "c1", baseInput as any);
    const arg = prisma.campaignItem.create.mock.calls[0][0];
    expect(arg.data.createdById).toBe("dm1");
    expect(arg.data.weaponCategory).toBe("MARTIAL");
    expect(arg.data.damageDice).toBe("1d8");
    expect(arg.data.grants).toBeUndefined();
  });

  it("create() escribe los grants de SPECIFIC_PLAYERS", async () => {
    prisma.campaignItem.create.mockResolvedValue({ id: "i1" });
    await service.create("dm1", "c1", {
      ...baseInput,
      visibility: "SPECIFIC_PLAYERS",
      specificPlayerIds: ["p1", "p2"],
    } as any);
    const arg = prisma.campaignItem.create.mock.calls[0][0];
    expect(arg.data.grants).toEqual({ create: [{ userId: "p1" }, { userId: "p2" }] });
  });

  it("update() rechaza a un jugador, aunque sea el que abrió la campaña", async () => {
    prisma.campaignItem.findFirst.mockResolvedValue({ id: "i1", campaignId: "c1" });
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    await expect(
      service.update("jugador", "c1", "i1", { name: "Otro nombre" } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("list() no devuelve un objeto DM_ONLY a un jugador (canView real)", async () => {
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    prisma.campaignItem.findMany.mockResolvedValue([
      { id: "pub", visibility: "PUBLIC", createdById: "dm1", grants: [] },
      { id: "secreto", visibility: "DM_ONLY", createdById: "dm1", grants: [] },
      { id: "mesa", visibility: "PLAYERS", createdById: "dm1", grants: [] },
    ]);
    const res = await service.list("player1", "c1");
    expect(res.map((i: any) => i.id).sort()).toEqual(["mesa", "pub"]);
  });

  it("list() sí devuelve un SPECIFIC_PLAYERS a quien tiene la concesión", async () => {
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    prisma.campaignItem.findMany.mockResolvedValue([
      {
        id: "para-ti",
        visibility: "SPECIFIC_PLAYERS",
        createdById: "dm1",
        grants: [{ userId: "player1" }],
      },
      {
        id: "para-otro",
        visibility: "SPECIFIC_PLAYERS",
        createdById: "dm1",
        grants: [{ userId: "player2" }],
      },
    ]);
    const res = await service.list("player1", "c1");
    expect(res.map((i: any) => i.id)).toEqual(["para-ti"]);
  });

  it("remove() con inventario responde 409 con el conteo", async () => {
    prisma.campaignItem.findFirst.mockResolvedValue({ id: "i1", campaignId: "c1" });
    membership.getMembership.mockResolvedValue({ role: "DM" });
    prisma.inventoryItem.count.mockResolvedValue(3);
    await expect(service.remove("dm1", "c1", "i1")).rejects.toBeInstanceOf(ConflictException);
    await expect(service.remove("dm1", "c1", "i1")).rejects.toThrow(/3/);
    expect(prisma.campaignItem.delete).not.toHaveBeenCalled();
  });

  it("remove() sin inventario borra", async () => {
    prisma.campaignItem.findFirst.mockResolvedValue({ id: "i1", campaignId: "c1" });
    membership.getMembership.mockResolvedValue({ role: "DM" });
    prisma.inventoryItem.count.mockResolvedValue(0);
    const res = await service.remove("dm1", "c1", "i1");
    expect(res).toEqual({ deleted: true });
    expect(prisma.campaignItem.delete).toHaveBeenCalledWith({ where: { id: "i1" } });
  });

  describe("editar la definición y las mochilas que ya lo llevan (auditoría de mecánica 2B)", () => {
    const guardado = {
      id: "i1",
      campaignId: "c1",
      name: "Guja del Rey Bajo",
      kind: "WEAPON",
      slot: "MAIN_HAND",
      requiresAttunement: false,
      visibility: "PLAYERS",
      createdById: "dm1",
      weaponProperties: [],
      strengthRequirement: 0,
      stealthDisadvantage: false,
      grants: [],
    };

    beforeEach(() => {
      prisma.campaignItem.findFirst.mockResolvedValue(guardado);
      prisma.campaignItem.update.mockResolvedValue({ ...guardado, grants: [] });
      prisma.inventoryItem.findMany.mockResolvedValue([]);
      prisma.inventoryItem.updateMany.mockResolvedValue({ count: 0 });
      membership.getMembership.mockResolvedValue({ role: "DM" });
    });

    it("cambiar la FORMA del objeto lo devuelve a la mochila de quien lo lleve puesto", async () => {
      await service.update("dm1", "c1", "i1", {
        weapon: {
          category: "MARTIAL",
          range: "MELEE",
          damageDice: "1d10",
          damageType: "SLASHING",
          properties: ["TWO_HANDED"],
        },
      } as never);

      // Sin esto quedaba un escudo conviviendo con un arma que acababa de volverse a dos manos,
      // y la CA inflada +2 durante todo el combate.
      expect(prisma.inventoryItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { location: "CARRIED", slot: null, attuned: false },
        }),
      );
    });

    it("cambiar solo el nombre NO desequipa a nadie", async () => {
      await service.update("dm1", "c1", "i1", { name: "Otro nombre" } as never);
      expect(prisma.inventoryItem.updateMany).not.toHaveBeenCalled();
    });

    it("bajar la visibilidad de un objeto que alguien lleva encima es 400, y nombra a quien lo lleva", async () => {
      prisma.inventoryItem.findMany.mockResolvedValue([
        { character: { id: "ch1", name: "Brann", ownerId: "jugador1" } },
      ]);
      membership.getMembership.mockImplementation(async (_c: string, userId: string) =>
        userId === "dm1" ? { role: "DM" } : { role: "PLAYER" },
      );

      // La misma regla que impide entregárselo: lo que alguien no debe ver no se le manda, pero
      // hacerlo desaparecer de su mochila sin avisar tampoco es una respuesta.
      await expect(
        service.update("dm1", "c1", "i1", { visibility: "DM_ONLY" } as never),
      ).rejects.toMatchObject({
        status: 400,
        response: { message: expect.stringContaining("Brann") },
      });
      expect(prisma.campaignItem.update).not.toHaveBeenCalled();
    });
  });

  describe("resolveForCharacter()", () => {
    it("resuelve un arma de la campaña correcta a ResolvedItem", async () => {
      prisma.campaignItem.findMany.mockResolvedValue([
        {
          id: "i1",
          campaignId: "c1",
          name: "Espada larga +1",
          kind: "WEAPON",
          description: null,
          weightOz: 48,
          costCp: null,
          effects: [],
          requiresAttunement: false,
          slot: "MAIN_HAND",
          weaponCategory: "MARTIAL",
          weaponRange: "MELEE",
          damageDice: "1d8",
          damageType: "SLASHING",
          weaponProperties: [],
          versatileDice: null,
          rangeNormalFt: null,
          rangeLongFt: null,
          armorCategory: null,
          baseAc: null,
          dexCap: null,
          strengthRequirement: 0,
          stealthDisadvantage: false,
        },
      ]);
      const res = await service.resolveForCharacter("c1", ["i1"]);
      expect(res).toEqual([
        expect.objectContaining({
          ref: "CAMPAIGN:i1",
          source: "CAMPAIGN",
          weapon: expect.objectContaining({ damageDice: "1d8" }),
          armor: undefined,
        }),
      ]);
    });

    it("un identificador de otra campaña no se resuelve nunca", async () => {
      // `findMany` filtra por campaignId en el where; simulamos que Prisma no devuelve la fila
      // de otra campaña, que es justo el contrato que se está comprobando.
      prisma.campaignItem.findMany.mockResolvedValue([]);
      const res = await service.resolveForCharacter("c1", ["item-de-otra-campana"]);
      expect(res).toEqual([]);
      expect(prisma.campaignItem.findMany).toHaveBeenCalledWith({
        where: { id: { in: ["item-de-otra-campana"] }, campaignId: "c1" },
      });
    });
  });
});
