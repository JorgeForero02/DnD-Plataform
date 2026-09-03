import { Test } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { MembershipService } from "../campaigns/membership.service";
import { PrismaService } from "../prisma/prisma.service";
import { DICE_ROLLER } from "../rolls/rolls.service";
import { SRD_STATBLOCK_POR_REF } from "../rules/catalog/monsters-srd";
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
    character: { create: jest.fn(), findMany: jest.fn() },
    user: { findUnique: jest.fn() },
    transaction: jest.fn(),
  };
  const membership = { requireDM: jest.fn(), requireMember: jest.fn() };
  const statblocks = { resolver: jest.fn() };
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
      ],
    }).compile();
    service = ref.get(NpcsService);
    jest.clearAllMocks();
    membership.requireDM.mockResolvedValue({ role: "DM" });
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
    prisma.character.findMany.mockResolvedValue([
      {
        id: "n1",
        name: "Goblin",
        statblockRef: "SRD:goblin",
        visibility: "DM_ONLY",
        ownerId: "dm",
        currentHp: 7,
        tempHp: 0,
      },
      {
        id: "n2",
        name: "Posadero",
        statblockRef: "SRD:commoner",
        visibility: "PLAYERS",
        ownerId: "dm",
        currentHp: 4,
        tempHp: 0,
      },
    ]);
    const r = await service.list("pl", "c1");
    expect(r.map((n) => n.id)).toEqual(["n2"]);
    expect(JSON.stringify(r)).not.toContain("Goblin");
  });
});
