import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { createCampaignStatblockSchema } from "@dnd/shared";
import { MembershipService } from "../campaigns/membership.service";
import { PrismaService } from "../prisma/prisma.service";
import { StatblocksService } from "./statblocks.service";

// Tarea 2D.3 — los statblocks propios del DM y la puerta que resuelve un `ref`.

/** Una fila como la devuelve Prisma. Se escribe entera para que un campo nuevo se note aquí. */
const filaDelDragoncillo = {
  id: "sb1",
  campaignId: "c1",
  name: "Dragoncillo de la cripta",
  size: "MEDIUM" as const,
  type: "DRAGON" as const,
  subtype: null,
  alignment: "neutral malvado",
  ac: 16,
  acNote: "armadura natural",
  hitDiceCount: 6,
  hitDieSizeOverride: null,
  str: 16,
  dex: 12,
  con: 14,
  int: 10,
  wis: 11,
  cha: 13,
  saveProficiencies: ["con"],
  skillProficiencies: { perception: "proficient" },
  damageResistances: ["fuego de fuentes no mágicas"],
  damageImmunities: [],
  damageVulnerabilities: [],
  // `null` a propósito: es como queda un statblock escrito antes de la tarea 2.5.1. `aStatblock`
  // tiene que completarlo con la lista vacía, no con un modificador inventado.
  damageModifiers: null,
  conditionImmunities: ["frightened"],
  darkvisionFeet: 60,
  otherSenses: [],
  speeds: { walk: 30, fly: 60 },
  languages: "dracónico",
  cr: 3,
  traits: [{ name: "Aliento cálido", desc: "Prosa." }],
  actions: [{ name: "Mordisco", desc: "Prosa." }],
  reactions: [],
  legendaryActions: [],
  visibility: "DM_ONLY",
  createdById: "dm",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("StatblocksService", () => {
  let service: StatblocksService;
  const prisma = {
    campaignStatblock: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: { findUnique: jest.fn() },
  };
  const membership = { requireDM: jest.fn(), requireMember: jest.fn() };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        StatblocksService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
      ],
    }).compile();
    service = ref.get(StatblocksService);
    jest.resetAllMocks();
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
  });

  describe("la lista", () => {
    it("trae los quince del SRD, que no son de nadie y los ve cualquiera que juegue", async () => {
      membership.requireMember.mockResolvedValue({ role: "PLAYER" });
      prisma.campaignStatblock.findMany.mockResolvedValue([]);
      const r = await service.list("u1", "c1");
      expect(r.srd).toHaveLength(15);
      expect(r.srd.map((s) => s.name)).toContain("Goblin");
    });

    it("**esconde del jugador el statblock DM_ONLY, en el servidor**", async () => {
      membership.requireMember.mockResolvedValue({ role: "PLAYER" });
      prisma.campaignStatblock.findMany.mockResolvedValue([filaDelDragoncillo]);
      const r = await service.list("u1", "c1");
      // No es que no se pinte: es que **no viaja**. La revisión de 2C encontró dos veces el
      // fallo contrario, y las dos en una respuesta que ya se había escrito bien en otro sitio.
      expect(r.campaign).toEqual([]);
      expect(JSON.stringify(r)).not.toContain("Dragoncillo");
    });

    it("el DM sí lo ve", async () => {
      membership.requireMember.mockResolvedValue({ role: "DM" });
      prisma.campaignStatblock.findMany.mockResolvedValue([filaDelDragoncillo]);
      const r = await service.list("dm", "c1");
      expect(r.campaign).toHaveLength(1);
      expect(r.campaign[0].name).toBe("Dragoncillo de la cripta");
      expect(r.campaign[0].ref).toBe("CAMPAIGN:sb1");
      expect(r.campaign[0].source).toBe("CAMPAIGN");
    });

    it("tarea 2.5.1 — un statblock con damageModifiers a null (escrito antes de la tarea) se completa con la lista vacía", async () => {
      membership.requireMember.mockResolvedValue({ role: "DM" });
      prisma.campaignStatblock.findMany.mockResolvedValue([filaDelDragoncillo]);
      const r = await service.list("dm", "c1");
      expect(r.campaign[0].damageModifiers).toEqual([]);
    });

    it("un statblock PLAYERS lo ve el jugador", async () => {
      membership.requireMember.mockResolvedValue({ role: "PLAYER" });
      prisma.campaignStatblock.findMany.mockResolvedValue([
        { ...filaDelDragoncillo, visibility: "PLAYERS" },
      ]);
      const r = await service.list("u1", "c1");
      expect(r.campaign).toHaveLength(1);
    });
  });

  describe("crear", () => {
    const entrada = createCampaignStatblockSchema.parse({
      name: "Dragoncillo de la cripta",
      size: "MEDIUM",
      type: "DRAGON",
      ac: 16,
      hitDiceCount: 6,
      abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 11, cha: 13 },
      cr: 3,
    });

    it("lo exige el DM", async () => {
      membership.requireDM.mockRejectedValue(new Error("solo el DM"));
      await expect(service.create("u1", "c1", entrada)).rejects.toThrow("solo el DM");
      expect(prisma.campaignStatblock.create).not.toHaveBeenCalled();
    });

    it("**nace DM_ONLY**: preparar la mazmorra no puede ser filtrarla", () => {
      expect(entrada.visibility).toBe("DM_ONLY");
    });

    it("el `ref` y el creador los pone el servidor, no el cliente", async () => {
      membership.requireDM.mockResolvedValue({ role: "DM" });
      prisma.campaignStatblock.create.mockResolvedValue(filaDelDragoncillo);
      const r = await service.create("dm", "c1", entrada);
      const data = prisma.campaignStatblock.create.mock.calls[0][0].data;
      expect(data.campaignId).toBe("c1");
      expect(data.createdById).toBe("dm");
      expect(r.ref).toBe("CAMPAIGN:sb1");
    });

    it("el tamaño del dado no se guarda: se deriva del tamaño de la criatura", async () => {
      membership.requireDM.mockResolvedValue({ role: "DM" });
      prisma.campaignStatblock.create.mockResolvedValue(filaDelDragoncillo);
      await service.create("dm", "c1", entrada);
      const data = prisma.campaignStatblock.create.mock.calls[0][0].data;
      expect(data.hitDieSizeOverride).toBeNull();
    });

    it("tarea 2.5.1 — un damageModifiers en la entrada llega a la columna", async () => {
      membership.requireDM.mockResolvedValue({ role: "DM" });
      prisma.campaignStatblock.create.mockResolvedValue(filaDelDragoncillo);
      const conModificadores = createCampaignStatblockSchema.parse({
        ...entrada,
        damageModifiers: [{ damageType: "FIRE", effect: "RESIST" }],
      });
      await service.create("dm", "c1", conModificadores);
      const data = prisma.campaignStatblock.create.mock.calls[0][0].data;
      expect(data.damageModifiers).toEqual([{ damageType: "FIRE", effect: "RESIST" }]);
    });
  });

  describe("editar y borrar", () => {
    it("editar un statblock de otra campaña da 404, no 403", async () => {
      membership.requireDM.mockResolvedValue({ role: "DM" });
      prisma.campaignStatblock.findFirst.mockResolvedValue(null);
      // Decir «prohibido» sobre algo de otra campaña ya confirma que existe. Es la misma
      // elección que hizo el resto de la fase.
      await expect(service.update("dm", "c1", "sbX", { name: "x" })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("editar solo un campo no borra los demás", async () => {
      membership.requireDM.mockResolvedValue({ role: "DM" });
      prisma.campaignStatblock.findFirst.mockResolvedValue(filaDelDragoncillo);
      prisma.campaignStatblock.update.mockResolvedValue({ ...filaDelDragoncillo, ac: 18 });
      await service.update("dm", "c1", "sb1", { ac: 18 });
      const data = prisma.campaignStatblock.update.mock.calls[0][0].data;
      expect(data).toEqual({ ac: 18 });
      expect(data.name).toBeUndefined();
      expect(data.cr).toBeUndefined();
    });

    it("borrar exige DM y que sea de la campaña", async () => {
      membership.requireDM.mockResolvedValue({ role: "DM" });
      prisma.campaignStatblock.findFirst.mockResolvedValue(null);
      await expect(service.remove("dm", "c1", "sbX")).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.campaignStatblock.delete).not.toHaveBeenCalled();
    });
  });

  describe("resolver un ref: la puerta única", () => {
    it("resuelve uno del SRD sin tocar la base", async () => {
      const s = await service.resolver("c1", "SRD:goblin");
      expect(s?.name).toBe("Goblin");
      expect(prisma.campaignStatblock.findFirst).not.toHaveBeenCalled();
    });

    it("resuelve uno de la campaña", async () => {
      prisma.campaignStatblock.findFirst.mockResolvedValue(filaDelDragoncillo);
      const s = await service.resolver("c1", "CAMPAIGN:sb1");
      expect(s?.name).toBe("Dragoncillo de la cripta");
      expect(s?.ac).toBe(16);
      expect(s?.speeds).toEqual({ walk: 30, fly: 60 });
    });

    it("un `ref` con forma desconocida devuelve null y no consulta nada", async () => {
      expect(await service.resolver("c1", "goblin")).toBeNull();
      expect(await service.resolver("c1", "SRD:")).toBeNull();
      expect(await service.resolver("c1", "CAMPAIGN:")).toBeNull();
      expect(prisma.campaignStatblock.findFirst).not.toHaveBeenCalled();
    });

    it("**para quien no puede verlo, no existe**: devuelve null igual que si no estuviera", async () => {
      prisma.campaignStatblock.findFirst.mockResolvedValue(filaDelDragoncillo);
      const jugador = { userId: "u1", role: "PLAYER" as const, isAdmin: false };
      // No se distingue «no existe» de «no puedes verlo» a propósito: distinguirlo le diría al
      // jugador que el DM tiene un monstruo preparado, que es justo lo que DM_ONLY evita.
      expect(await service.resolver("c1", "CAMPAIGN:sb1", jugador)).toBeNull();
    });

    it("el DM sí lo resuelve", async () => {
      prisma.campaignStatblock.findFirst.mockResolvedValue(filaDelDragoncillo);
      const dm = { userId: "dm", role: "DM" as const, isAdmin: false };
      expect((await service.resolver("c1", "CAMPAIGN:sb1", dm))?.name).toBe(
        "Dragoncillo de la cripta",
      );
    });

    it("no resuelve un statblock de OTRA campaña aunque el id exista", async () => {
      prisma.campaignStatblock.findFirst.mockResolvedValue(null);
      expect(await service.resolver("c2", "CAMPAIGN:sb1", undefined)).toBeNull();
      expect(prisma.campaignStatblock.findFirst.mock.calls[0][0].where).toEqual({
        id: "sb1",
        campaignId: "c2",
      });
    });
  });
});
