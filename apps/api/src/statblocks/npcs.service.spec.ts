import { Test } from "@nestjs/testing";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { MembershipService } from "../campaigns/membership.service";
import { PrismaService } from "../prisma/prisma.service";
import { DICE_ROLLER } from "../rolls/rolls.service";
import { SRD_STATBLOCK_POR_REF } from "../rules/catalog/monsters-srd";
import { GameEventsService } from "../game-events/game-events.service";
import { NpcsService } from "./npcs.service";
import { StatblocksService } from "./statblocks.service";

// Tarea 2D.4 — bajar un statblock a la mesa.
//
// Lo que solo se puede probar aquí, con el tirador fijado: que **los PG tirados salen del tirador
// y no del motor**. Es la regla que la especificación de la fase 2 puso por escrito —el motor dice
// `2d6`, no lo tira— y la que hace que el motor se pueda probar a fondo.

describe("NpcsService", () => {
  let service: NpcsService;
  const prisma = {
    character: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    campaign: { findUniqueOrThrow: jest.fn() },
    user: { findUnique: jest.fn() },
    // PNJ del mundo y la mesa (Task 0): `entity-link.ts` valida y redacta con esto.
    entity: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    // Task 1 — la tercera columna que `reveal` puede subir.
    campaignStatblock: { findFirst: jest.fn(), update: jest.fn() },
    transaction: jest.fn(),
  };
  const membership = { requireDM: jest.fn(), requireMember: jest.fn() };
  const statblocks = { resolver: jest.fn(), puedeVerStatblock: jest.fn() };
  const gameEvents = { record: jest.fn().mockResolvedValue(undefined) };
  /** Un d(n) que siempre saca el máximo: con él la tirada es un número comprobable. */
  const rollerMaximo = jest.fn((caras: number) => caras);

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        NpcsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: StatblocksService, useValue: statblocks },
        { provide: DICE_ROLLER, useValue: rollerMaximo },
        { provide: GameEventsService, useValue: gameEvents },
      ],
    }).compile();
    service = ref.get(NpcsService);
    jest.clearAllMocks();
    membership.requireDM.mockResolvedValue({ role: "DM" });
    // Por defecto, quien mira ve la plantilla; las pruebas que comprueban la redacción lo cambian.
    statblocks.puedeVerStatblock.mockResolvedValue(true);
    // Sin fichas del mundo enlazadas por defecto — las pruebas de `entityId` lo cambian.
    prisma.entity.findMany.mockResolvedValue([]);
    // La transacción, en las unitarias, es «ejecuta el callback con el propio cliente».
    prisma.transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
    prisma.character.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: `c-${data.name}`, ...data, tempHp: 0 }),
    );
  });

  it("los PG por promedio son los que imprime el libro, y el tirador ni se toca", async () => {
    statblocks.resolver.mockResolvedValue(SRD_STATBLOCK_POR_REF.get("SRD:ogre"));
    const r = await service.instanciar("dm", "c1", { ref: "SRD:ogre", count: 1, hp: "AVERAGE" });
    expect(r[0].currentHp).toBe(59);
    expect(rollerMaximo).not.toHaveBeenCalled();
  });

  it("los PG tirados salen del TIRADOR, con la Constitución dentro de la expresión", async () => {
    statblocks.resolver.mockResolvedValue(SRD_STATBLOCK_POR_REF.get("SRD:ogre"));
    const r = await service.instanciar("dm", "c1", { ref: "SRD:ogre", count: 1, hp: "ROLL" });
    // Ogro: 7d10+21. Con un d10 que siempre saca 10 → 70 + 21 = 91.
    //
    // **Si la Constitución no entrara en la expresión saldrían 70**, que es el fallo que 2D.1
    // midió con trece pruebas en rojo. Aquí se vuelve a cazar desde el otro extremo del sistema.
    expect(r[0].currentHp).toBe(91);
    expect(rollerMaximo).toHaveBeenCalledTimes(7);
    expect(rollerMaximo).toHaveBeenCalledWith(10);
  });

  it("un goblin sin modificador de Constitución no arrastra un «+0» en la expresión", async () => {
    statblocks.resolver.mockResolvedValue(SRD_STATBLOCK_POR_REF.get("SRD:goblin"));
    const r = await service.instanciar("dm", "c1", { ref: "SRD:goblin", count: 1, hp: "ROLL" });
    // 2d6 con seises: 12. Sin cola que sumar.
    expect(r[0].currentHp).toBe(12);
  });

  it("uno solo no se numera; varios sí", async () => {
    statblocks.resolver.mockResolvedValue(SRD_STATBLOCK_POR_REF.get("SRD:goblin"));
    const uno = await service.instanciar("dm", "c1", {
      ref: "SRD:goblin",
      count: 1,
      hp: "AVERAGE",
    });
    expect(uno[0].name).toBe("Goblin");

    const tres = await service.instanciar("dm", "c1", {
      ref: "SRD:goblin",
      count: 3,
      hp: "AVERAGE",
    });
    expect(tres.map((n) => n.name)).toEqual(["Goblin 1", "Goblin 2", "Goblin 3"]);
  });

  it("el dueño es el DM, que es lo que hace valer las comprobaciones que ya existen", async () => {
    statblocks.resolver.mockResolvedValue(SRD_STATBLOCK_POR_REF.get("SRD:goblin"));
    await service.instanciar("dm", "c1", { ref: "SRD:goblin", count: 1, hp: "AVERAGE" });
    const data = prisma.character.create.mock.calls[0][0].data;
    expect(data.ownerId).toBe("dm");
    expect(data.campaignId).toBe("c1");
    expect(data.statblockRef).toBe("SRD:goblin");
    expect(data.visibility).toBe("DM_ONLY");
    // Ni nivel ni clase: un PNJ no los tiene, y ponerlos sería mezclar las dos formas.
    expect(data.classKey).toBeUndefined();
    expect(data.raceKey).toBeUndefined();
    expect(data.level).toBeUndefined();
  });

  it("la tanda entra dentro de UNA transacción: seis o ninguno", async () => {
    statblocks.resolver.mockResolvedValue(SRD_STATBLOCK_POR_REF.get("SRD:goblin"));
    await service.instanciar("dm", "c1", { ref: "SRD:goblin", count: 6, hp: "AVERAGE" });
    expect(prisma.transaction).toHaveBeenCalledTimes(1);
    expect(prisma.character.create).toHaveBeenCalledTimes(6);
  });

  it("un ref que no resuelve se rechaza antes de escribir nada", async () => {
    statblocks.resolver.mockResolvedValue(null);
    await expect(
      service.instanciar("dm", "c1", { ref: "SRD:que-va", count: 1, hp: "AVERAGE" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.transaction).not.toHaveBeenCalled();
  });

  it("lo exige el DM", async () => {
    membership.requireDM.mockRejectedValue(new Error("solo el DM"));
    await expect(
      service.instanciar("pl", "c1", { ref: "SRD:goblin", count: 1, hp: "AVERAGE" }),
    ).rejects.toThrow("solo el DM");
    expect(statblocks.resolver).not.toHaveBeenCalled();
  });

  it("la lista esconde del jugador los PNJ que el DM no ha enseñado", async () => {
    membership.requireMember.mockResolvedValue({ role: "PLAYER" });
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    prisma.campaign.findUniqueOrThrow.mockResolvedValue({ clockSeconds: 0 });
    prisma.character.findMany.mockResolvedValue([
      {
        id: "n1",
        name: "Goblin",
        statblockRef: "SRD:goblin",
        visibility: "DM_ONLY",
        ownerId: "dm",
        currentHp: 7,
        tempHp: 0,
        conditions: [],
      },
      {
        id: "n2",
        name: "Posadero",
        statblockRef: "SRD:commoner",
        visibility: "PLAYERS",
        ownerId: "dm",
        currentHp: 4,
        tempHp: 0,
        conditions: [],
      },
    ]);
    const r = await service.list("pl", "c1");
    expect(r.map((n) => n.id)).toEqual(["n2"]);
    expect(JSON.stringify(r)).not.toContain("Goblin");
  });

  it("la lista solo trae las condiciones VIVAS, contra el reloj de campaña", async () => {
    membership.requireMember.mockResolvedValue({ role: "DM" });
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    // El reloj va por el segundo 600.
    prisma.campaign.findUniqueOrThrow.mockResolvedValue({ clockSeconds: 600 });
    prisma.character.findMany.mockResolvedValue([
      {
        id: "n1",
        name: "Ogro",
        statblockRef: "SRD:ogre",
        visibility: "DM_ONLY",
        ownerId: "dm",
        currentHp: 40,
        tempHp: 0,
        conditions: [
          { key: "prone", level: null, expiresAtClock: null },
          // Vencida en el segundo 300: el reloj ya pasó de largo.
          { key: "poisoned", level: null, expiresAtClock: 300 },
          { key: "exhaustion", level: 2, expiresAtClock: 900 },
        ],
      },
    ]);
    const r = await service.list("dm", "c1");
    expect(r[0].conditions.map((c) => c.key)).toEqual(["prone", "exhaustion"]);
  });

  it("**el `ref` de una plantilla que no puedes ver no viaja**", async () => {
    membership.requireMember.mockResolvedValue({ role: "PLAYER" });
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    prisma.campaign.findUniqueOrThrow.mockResolvedValue({ clockSeconds: 0 });
    // La plantilla es del DM: este jugador no la ve en el bestiario.
    statblocks.puedeVerStatblock.mockResolvedValue(false);
    prisma.character.findMany.mockResolvedValue([
      {
        id: "n1",
        name: "Cosa",
        statblockRef: "CAMPAIGN:sb1",
        visibility: "PLAYERS",
        ownerId: "dm",
        currentHp: 20,
        tempHp: 0,
        conditions: [],
      },
    ]);
    const r = await service.list("pl", "c1");
    // Ve el PNJ —el DM se lo ha enseñado— pero no el identificador de la fila escondida.
    expect(r[0].name).toBe("Cosa");
    expect(r[0].statblockRef).toBeNull();
  });

  it("la lista NO devuelve el PG máximo: su fuente única es la hoja", async () => {
    membership.requireMember.mockResolvedValue({ role: "DM" });
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    prisma.campaign.findUniqueOrThrow.mockResolvedValue({ clockSeconds: 0 });
    prisma.character.findMany.mockResolvedValue([
      {
        id: "n1",
        name: "Ogro",
        statblockRef: "SRD:ogre",
        visibility: "DM_ONLY",
        ownerId: "dm",
        currentHp: 40,
        tempHp: 0,
        conditions: [],
      },
    ]);
    const r = await service.list("dm", "c1");
    // Derivarlo aquí sería un segundo camino que discreparía de la hoja en cuanto hubiera
    // agotamiento, que es exactamente el fallo que 2D.4 encontró y unificó.
    expect(r[0]).not.toHaveProperty("maxHp");
  });

  describe("entityId — el puente con la ficha del mundo (spec §3.1, §4)", () => {
    it("instanciar con entityId valida la ficha y la escribe en cada fila", async () => {
      statblocks.resolver.mockResolvedValue(SRD_STATBLOCK_POR_REF.get("SRD:goblin"));
      prisma.entity.findFirst.mockResolvedValue({ id: "e1", type: "NPC", grants: [] });
      await service.instanciar("dm", "c1", {
        ref: "SRD:goblin",
        count: 2,
        hp: "AVERAGE",
        entityId: "e1",
      } as any);
      const creadas = prisma.character.create.mock.calls.map((c: any) => c[0].data.entityId);
      expect(creadas).toEqual(["e1", "e1"]);
    });

    it("instanciar con una ficha que no es NPC de la campaña: 400 y no crea nada", async () => {
      statblocks.resolver.mockResolvedValue(SRD_STATBLOCK_POR_REF.get("SRD:goblin"));
      prisma.entity.findFirst.mockResolvedValue(null);
      await expect(
        service.instanciar("dm", "c1", {
          ref: "SRD:goblin",
          count: 1,
          hp: "AVERAGE",
          entityId: "e9",
        } as any),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.transaction).not.toHaveBeenCalled();
    });

    it("list(): entityId redactado para quien no ve la ficha", async () => {
      membership.requireMember.mockResolvedValue({ role: "PLAYER" });
      prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
      prisma.campaign.findUniqueOrThrow.mockResolvedValue({ clockSeconds: 0 });
      prisma.character.findMany.mockResolvedValue([
        {
          id: "n1",
          name: "Goblin",
          statblockRef: "SRD:goblin",
          visibility: "PLAYERS",
          ownerId: "dm",
          currentHp: 7,
          tempHp: 0,
          entityId: "oculta",
          conditions: [],
        },
      ]);
      prisma.entity.findMany.mockResolvedValue([
        { id: "oculta", visibility: "DM_ONLY", createdById: "dm", grants: [] },
      ]);
      const filas = await service.list("pl", "c1");
      expect(filas[0].entityId).toBeNull();
    });
  });

  describe("reveal / hide (spec §3.2)", () => {
    const goblin = {
      id: "g1",
      campaignId: "c1",
      name: "Bandido",
      ownerId: "dm",
      visibility: "DM_ONLY",
      statblockRef: "CAMPAIGN:sb1",
      entityId: "e1",
    };
    beforeEach(() => {
      membership.requireDM.mockResolvedValue({ role: "DM" });
      prisma.character.findFirst.mockResolvedValue(goblin);
      prisma.character.update.mockImplementation(async ({ data }: any) => ({ ...goblin, ...data }));
      prisma.entity.findFirst.mockResolvedValue({
        id: "e1",
        name: "Garrik",
        visibility: "DM_ONLY",
        createdById: "dm",
        grants: [],
      });
      prisma.entity.update.mockImplementation(async ({ data }: any) => ({
        id: "e1",
        name: "Garrik",
        createdById: "dm",
        grants: [],
        ...data,
      }));
      prisma.campaignStatblock.findFirst.mockResolvedValue({
        id: "sb1",
        campaignId: "c1",
        visibility: "DM_ONLY",
        createdById: "dm",
      });
    });

    it("sube las tres columnas en una transacción y escribe NPC_REVEALED y ENTITY_REVEALED", async () => {
      const r = await service.reveal("dm", "c1", "g1");
      expect(prisma.transaction).toHaveBeenCalledTimes(1);
      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: "g1" },
        data: { visibility: "PLAYERS" },
      });
      expect(prisma.entity.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "e1" }, data: { visibility: "PLAYERS" } }),
      );
      expect(prisma.campaignStatblock.update).toHaveBeenCalledWith({
        where: { id: "sb1" },
        data: { visibility: "PLAYERS" },
      });
      expect(r.revealed).toEqual({ character: true, entity: true, template: true });
      const tipos = gameEvents.record.mock.calls.map((c: any) => c[2].payload.type);
      expect(tipos).toEqual(["NPC_REVEALED", "ENTITY_REVEALED"]);
      expect(gameEvents.record.mock.calls[0][2]).toMatchObject({
        visibility: "PLAYERS",
        subjectType: "character",
        subjectId: "g1",
        payload: { characterName: "Bandido", entityName: "Garrik", templateRevealed: true },
      });
    });

    it("no toca lo que ya está a la vista, y si nada cambia no escribe suceso", async () => {
      prisma.character.findFirst.mockResolvedValue({ ...goblin, visibility: "PLAYERS" });
      prisma.entity.findFirst.mockResolvedValue({
        id: "e1",
        name: "Garrik",
        visibility: "PUBLIC",
        createdById: "dm",
        grants: [],
      });
      prisma.campaignStatblock.findFirst.mockResolvedValue({
        id: "sb1",
        visibility: "PLAYERS",
        createdById: "dm",
      });
      const r = await service.reveal("dm", "c1", "g1");
      expect(r.revealed).toEqual({ character: false, entity: false, template: false });
      expect(prisma.character.update).not.toHaveBeenCalled();
      expect(gameEvents.record).not.toHaveBeenCalled();
    });

    it("una plantilla del libro no se toca; sin entityId no se toca ninguna ficha", async () => {
      prisma.character.findFirst.mockResolvedValue({
        ...goblin,
        statblockRef: "SRD:goblin",
        entityId: null,
      });
      const r = await service.reveal("dm", "c1", "g1");
      expect(r.revealed).toEqual({ character: true, entity: false, template: false });
      expect(prisma.campaignStatblock.findFirst).not.toHaveBeenCalled();
      expect(prisma.entity.findFirst).not.toHaveBeenCalled();
    });

    it("un jugador no revela: 403", async () => {
      membership.requireDM.mockRejectedValue(new ForbiddenException());
      await expect(service.reveal("pl", "c1", "g1")).rejects.toThrow(ForbiddenException);
    });

    it("hide baja solo la instancia a DM_ONLY y escribe NPC_HIDDEN como DM_ONLY", async () => {
      prisma.character.findFirst.mockResolvedValue({ ...goblin, visibility: "PLAYERS" });
      await service.hide("dm", "c1", "g1");
      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: "g1" },
        data: { visibility: "DM_ONLY" },
      });
      expect(prisma.entity.update).not.toHaveBeenCalled();
      expect(prisma.campaignStatblock.update).not.toHaveBeenCalled();
      expect(gameEvents.record.mock.calls[0][2]).toMatchObject({
        visibility: "DM_ONLY",
        payload: { type: "NPC_HIDDEN", characterName: "Bandido" },
      });
    });

    it("hide sobre uno ya oculto no escribe nada", async () => {
      await service.hide("dm", "c1", "g1");
      expect(prisma.character.update).not.toHaveBeenCalled();
      expect(gameEvents.record).not.toHaveBeenCalled();
    });
  });
});
