import { Test } from "@nestjs/testing";
import { Prisma } from "@prisma/client";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { PrismaService } from "../prisma/prisma.service";
import { InventoryService } from "./inventory.service";

// Carril A4 — el inventario, el equipo y la bolsa, con el Prisma simulado.
//
// El catálogo SRD (`findSrdItem`) es una función pura sobre datos en código: usarla de verdad
// aquí —«greatsword» es TWO_HANDED, «shield» es SHIELD— es más honesto que inventarse un mock
// que podría desincronizarse del catálogo real. Los objetos de campaña (visibilidad, sintonía)
// sí van por `prisma.campaignItem`, simulado.

describe("InventoryService", () => {
  let service: InventoryService;

  const character = {
    id: "c1",
    campaignId: "cmp1",
    ownerId: "owner1",
    visibility: "PLAYERS",
    str: 12,
    cp: 10,
    sp: 5,
    ep: 0,
    gp: 20,
    pp: 0,
  };

  const prisma = {
    character: { findFirst: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    inventoryItem: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    campaignItem: { findFirst: jest.fn() },
    // La bolsa bloquea la fila del personaje antes de mirar el saldo (`FOR UPDATE`), como hacen
    // los puntos de golpe: el Prisma simulado devuelve el personaje que la prueba haya puesto.
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  const membership = { requireMember: jest.fn(), getMembership: jest.fn() };
  const events = { record: jest.fn() };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: GameEventsService, useValue: events },
      ],
    }).compile();
    service = ref.get(InventoryService);
    jest.resetAllMocks();
    membership.requireMember.mockResolvedValue(undefined);
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.character.findFirst.mockResolvedValue(character);
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
    prisma.$queryRaw.mockImplementation(async () => {
      const actual = await prisma.character.findFirst.mock.results.at(-1)?.value;
      return actual ? [actual] : [];
    });
  });

  // Una fila de inventario cualquiera, con un objeto del SRD.
  function row(over: Partial<Record<string, unknown>> = {}) {
    return {
      id: "row1",
      characterId: "c1",
      srdKey: "dagger",
      campaignItemId: null,
      quantity: 1,
      location: "CARRIED",
      slot: null,
      attuned: false,
      storedAt: null,
      note: null,
      ...over,
    };
  }

  describe("add()", () => {
    it("el dueño mete un objeto del SRD en la mochila", async () => {
      prisma.inventoryItem.create.mockResolvedValue(row());

      await service.add("owner1", "cmp1", "c1", {
        ref: { source: "SRD", key: "dagger" },
        quantity: 1,
        location: "CARRIED",
      });

      expect(prisma.inventoryItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ srdKey: "dagger", location: "CARRIED", slot: null }),
        }),
      );
    });

    it("un objeto del SRD que no existe es 400, no 500", async () => {
      await expect(
        service.add("owner1", "cmp1", "c1", {
          ref: { source: "SRD", key: "no-existe-esta-clave" },
          quantity: 1,
          location: "CARRIED",
        }),
      ).rejects.toThrow();
      expect(prisma.inventoryItem.create).not.toHaveBeenCalled();
    });

    it("un jugador ajeno (ni DM ni dueño) no puede meter nada (403)", async () => {
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      await expect(
        service.add("otro-jugador", "cmp1", "c1", {
          ref: { source: "SRD", key: "dagger" },
          quantity: 1,
          location: "CARRIED",
        }),
      ).rejects.toThrow();
      expect(prisma.inventoryItem.create).not.toHaveBeenCalled();
    });

    it("el personaje que no se puede ver es 404", async () => {
      prisma.character.findFirst.mockResolvedValue(null);
      await expect(
        service.add("x", "cmp1", "c1", {
          ref: { source: "SRD", key: "dagger" },
          quantity: 1,
          location: "CARRIED",
        }),
      ).rejects.toThrow();
    });

    it("un objeto DM_ONLY de la campaña no se le puede dar a un personaje cuyo dueño no lo ve (400)", async () => {
      prisma.campaignItem.findFirst.mockResolvedValue({
        id: "ci1",
        campaignId: "cmp1",
        name: "Daga maldita",
        kind: "WEAPON",
        description: null,
        weightOz: 16,
        costCp: null,
        effects: null,
        requiresAttunement: false,
        slot: null,
        weaponCategory: "SIMPLE",
        weaponRange: "MELEE",
        damageDice: "1d4",
        damageType: "PIERCING",
        weaponProperties: [],
        versatileDice: null,
        rangeNormalFt: null,
        rangeLongFt: null,
        armorCategory: null,
        baseAc: null,
        dexCap: null,
        strengthRequirement: 0,
        stealthDisadvantage: false,
        visibility: "DM_ONLY",
        createdById: "dm1",
        grants: [],
      });
      // El DM da el objeto, pero el dueño del personaje ("owner1") es un jugador y DM_ONLY
      // nunca lo ve.
      membership.getMembership.mockImplementation((_c: string, userId: string) =>
        Promise.resolve({ role: userId === "dm1" ? "DM" : "PLAYER" }),
      );

      await expect(
        service.add("dm1", "cmp1", "c1", {
          ref: { source: "CAMPAIGN", id: "ci1" },
          quantity: 1,
          location: "CARRIED",
        }),
      ).rejects.toThrow(/no puede ver/);
      expect(prisma.inventoryItem.create).not.toHaveBeenCalled();
    });
  });

  describe("update() — equipar", () => {
    it("equipar en una ranura libre funciona", async () => {
      prisma.inventoryItem.findFirst
        .mockResolvedValueOnce(row({ srdKey: "dagger" })) // la fila a equipar
        .mockResolvedValueOnce(null); // MAIN_HAND libre
      prisma.inventoryItem.update.mockResolvedValue(
        row({ location: "EQUIPPED", slot: "MAIN_HAND" }),
      );

      await service.update("owner1", "cmp1", "c1", "row1", {
        location: "EQUIPPED",
        slot: "MAIN_HAND",
      });

      expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: "row1" },
        data: expect.objectContaining({ location: "EQUIPPED", slot: "MAIN_HAND", attuned: false }),
      });
    });

    it("equipar en una ranura ocupada es 409, y dice quién la ocupa", async () => {
      prisma.inventoryItem.findFirst
        .mockResolvedValueOnce(row({ id: "row1", srdKey: "dagger" })) // la fila a mover
        .mockResolvedValueOnce(
          row({ id: "row2", srdKey: "long-sword", location: "EQUIPPED", slot: "MAIN_HAND" }),
        ); // ocupante

      await expect(
        service.update("owner1", "cmp1", "c1", "row1", { location: "EQUIPPED", slot: "MAIN_HAND" }),
      ).rejects.toMatchObject({
        status: 409,
        response: { message: expect.stringContaining("La ranura ya la ocupa") },
      });
      expect(prisma.inventoryItem.update).not.toHaveBeenCalled();
    });

    it("MUTACIÓN CLAVE: un arma a dos manos en la mano principal deja la otra mano inutilizable (escudo después)", async () => {
      prisma.inventoryItem.findFirst
        .mockResolvedValueOnce(row({ id: "row1", srdKey: "greatsword" })) // fila a equipar
        .mockResolvedValueOnce(null) // OFF_HAND libre
        .mockResolvedValueOnce(null); // MAIN_HAND libre -> se equipa sin problema
      prisma.inventoryItem.update.mockResolvedValue(
        row({ location: "EQUIPPED", slot: "MAIN_HAND" }),
      );

      await service.update("owner1", "cmp1", "c1", "row1", {
        location: "EQUIPPED",
        slot: "MAIN_HAND",
      });
      expect(prisma.inventoryItem.update).toHaveBeenCalled();

      jest.clearAllMocks();
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.character.findFirst.mockResolvedValue(character);
      // Ahora un escudo intenta ir a OFF_HAND, con el mandoble ya puesto en MAIN_HAND.
      prisma.inventoryItem.findFirst
        .mockResolvedValueOnce(row({ id: "row2", srdKey: "shield" })) // fila a equipar
        .mockResolvedValueOnce(
          row({ id: "row1", srdKey: "greatsword", location: "EQUIPPED", slot: "MAIN_HAND" }),
        ); // MAIN_HAND ocupada por el mandoble

      // **Se comprueba el MENSAJE, no solo el 409.** Con el Prisma simulado, que ignora el
      // `where`, un 409 a secas también lo produce la comprobación genérica de «esa ranura está
      // ocupada»: borrar entera la regla de manos dejaba la prueba en verde. El mensaje es lo
      // único que distingue qué comprobación saltó. Lo encontró la revisión de 2B.
      await expect(
        service.update("owner1", "cmp1", "c1", "row2", { location: "EQUIPPED", slot: "OFF_HAND" }),
      ).rejects.toMatchObject({
        status: 409,
        response: { message: expect.stringContaining("no queda hueco para la mano izquierda") },
      });
      expect(prisma.inventoryItem.update).not.toHaveBeenCalled();
    });

    it("MUTACIÓN CLAVE: el orden inverso también se bloquea — escudo puesto primero, luego el mandoble", async () => {
      // El escudo ya está en OFF_HAND; se intenta equipar el mandoble (TWO_HANDED) en MAIN_HAND.
      prisma.inventoryItem.findFirst
        .mockResolvedValueOnce(row({ id: "row1", srdKey: "greatsword" })) // fila a equipar
        .mockResolvedValueOnce(
          row({ id: "row2", srdKey: "shield", location: "EQUIPPED", slot: "OFF_HAND" }),
        ); // OFF_HAND ocupada por el escudo

      // **El mensaje, no solo el 409**: el Prisma simulado ignora el `where`, así que la
      // comprobación genérica de ranura ocupada produce el mismo código. Sin esta cadena, borrar
      // entera la regla de manos dejaba la prueba en verde (revisión de 2B).
      await expect(
        service.update("owner1", "cmp1", "c1", "row1", { location: "EQUIPPED", slot: "MAIN_HAND" }),
      ).rejects.toMatchObject({
        status: 409,
        response: { message: expect.stringContaining("necesita las dos manos libres") },
      });
      expect(prisma.inventoryItem.update).not.toHaveBeenCalled();
    });

    it("equipar un objeto sin ranura (ni propia ni pedida) es 400", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValueOnce(row({ id: "row1", srdKey: "torch" }));
      await expect(
        service.update("owner1", "cmp1", "c1", "row1", { location: "EQUIPPED" }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("update() — sintonización", () => {
    const dmOnlyMember = () => ({ role: "PLAYER" });

    function campaignRing(over: Partial<Record<string, unknown>> = {}) {
      return {
        id: "ring1",
        campaignId: "cmp1",
        name: "Anillo de protección",
        kind: "OTHER",
        description: null,
        weightOz: 0,
        costCp: null,
        effects: null,
        requiresAttunement: true,
        slot: "RING_1",
        weaponCategory: null,
        weaponRange: null,
        damageDice: null,
        damageType: null,
        weaponProperties: [],
        versatileDice: null,
        rangeNormalFt: null,
        rangeLongFt: null,
        armorCategory: null,
        baseAc: null,
        dexCap: null,
        strengthRequirement: 0,
        stealthDisadvantage: false,
        visibility: "PLAYERS",
        createdById: "dm1",
        grants: [],
        ...over,
      };
    }

    it("sintonizar sin estar equipado es 400", async () => {
      membership.getMembership.mockImplementation(dmOnlyMember);
      prisma.inventoryItem.findFirst.mockResolvedValueOnce(
        row({ id: "row1", srdKey: null, campaignItemId: "ring1", location: "CARRIED", slot: null }),
      );
      prisma.campaignItem.findFirst.mockResolvedValue(campaignRing());

      await expect(
        service.update("owner1", "cmp1", "c1", "row1", { attuned: true }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("sintonizar un objeto equipado que no requiere sintonización es 400", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValueOnce(
        row({ id: "row1", srdKey: "dagger", location: "EQUIPPED", slot: "MAIN_HAND" }),
      );
      await expect(
        service.update("owner1", "cmp1", "c1", "row1", { attuned: true }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("MUTACIÓN CLAVE: la cuarta sintonización se rechaza con 400 y nombra a las tres", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValueOnce(
        row({
          id: "row4",
          srdKey: null,
          campaignItemId: "ring1",
          location: "EQUIPPED",
          slot: "RING_2",
        }),
      );
      prisma.inventoryItem.findMany.mockResolvedValue([
        { id: "a1", srdKey: null, campaignItemId: "ring1" },
        { id: "a2", srdKey: null, campaignItemId: "ring1" },
        { id: "a3", srdKey: null, campaignItemId: "ring1" },
      ]);
      prisma.campaignItem.findFirst.mockResolvedValue(campaignRing());

      await expect(
        service.update("owner1", "cmp1", "c1", "row4", { attuned: true }),
      ).rejects.toMatchObject({ status: 400 });
      expect(prisma.inventoryItem.update).not.toHaveBeenCalled();
    });

    it("sintonizar el cuarto objeto SÍ funciona si antes hay solo dos sintonizados", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValueOnce(
        row({
          id: "row3",
          srdKey: null,
          campaignItemId: "ring1",
          location: "EQUIPPED",
          slot: "RING_2",
        }),
      );
      prisma.inventoryItem.findMany.mockResolvedValue([
        { id: "a1", srdKey: null, campaignItemId: "ring1" },
        { id: "a2", srdKey: null, campaignItemId: "ring1" },
      ]);
      prisma.campaignItem.findFirst.mockResolvedValue(campaignRing());
      prisma.inventoryItem.update.mockResolvedValue(row({ attuned: true }));

      await service.update("owner1", "cmp1", "c1", "row3", { attuned: true });
      expect(prisma.inventoryItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ attuned: true }) }),
      );
    });

    it("MUTACIÓN CLAVE: desequipar un objeto sintonizado lo desintoniza también", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValueOnce(
        row({
          id: "row1",
          srdKey: null,
          campaignItemId: "ring1",
          location: "EQUIPPED",
          slot: "RING_1",
          attuned: true,
        }),
      );
      prisma.campaignItem.findFirst.mockResolvedValue(campaignRing());
      prisma.inventoryItem.update.mockResolvedValue(row({ location: "CARRIED", attuned: false }));

      await service.update("owner1", "cmp1", "c1", "row1", { location: "CARRIED" });

      expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: "row1" },
        data: expect.objectContaining({ location: "CARRIED", slot: null, attuned: false }),
      });
    });
  });

  describe("permisos y visibilidad", () => {
    it("un jugador ajeno no puede modificar el inventario (403)", async () => {
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.inventoryItem.findFirst.mockResolvedValue(row());
      await expect(
        service.update("otro-jugador", "cmp1", "c1", "row1", { quantity: 2 }),
      ).rejects.toThrow();
      expect(prisma.inventoryItem.update).not.toHaveBeenCalled();
    });

    it("el personaje que no se puede ver es 404 al listar", async () => {
      prisma.character.findFirst.mockResolvedValue(null);
      await expect(service.list("x", "cmp1", "c1")).rejects.toThrow();
    });
  });

  describe("changeMoney()", () => {
    it("un delta positivo mueve la bolsa y escribe un suceso", async () => {
      prisma.character.update.mockResolvedValue({ ...character, gp: 25 });

      const res = await service.changeMoney("owner1", "cmp1", "c1", { gp: 5, reason: "botín" });

      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: "c1" },
        data: { gp: { increment: 5 } },
      });
      // **La carga, no el espía.** La regla declarada es «los deltas por denominación, no un
      // total»: cambiar `...deltas` por los totales de la fila dejaba esto en verde y el log
      // inservible para sumar.
      expect(events.record).toHaveBeenCalledWith(
        "owner1",
        "cmp1",
        expect.objectContaining({
          payload: expect.objectContaining({ type: "MONEY_CHANGED", gp: 5 }),
        }),
        expect.anything(),
      );
      expect(res.gp).toBe(25);
    });

    it("MUTACIÓN CLAVE: un delta que dejaría una moneda en negativo se rechaza con 400, sin tocar nada", async () => {
      await expect(service.changeMoney("owner1", "cmp1", "c1", { gp: -100 })).rejects.toMatchObject(
        { status: 400 },
      );
      expect(prisma.character.update).not.toHaveBeenCalled();
      expect(events.record).not.toHaveBeenCalled();
    });

    it("un jugador ajeno no puede tocar la bolsa (403)", async () => {
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      await expect(service.changeMoney("otro-jugador", "cmp1", "c1", { gp: 1 })).rejects.toThrow();
      expect(prisma.character.update).not.toHaveBeenCalled();
    });
  });

  describe("remove()", () => {
    it("quita la fila y lo escribe en la línea de tiempo", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValue(row());
      prisma.inventoryItem.deleteMany.mockResolvedValue({ count: 1 });

      const res = await service.remove("owner1", "cmp1", "c1", "row1");

      // **`deleteMany` con el `characterId` dentro**: soltar dos veces con mala red daba un 500
      // sobre una operación que sí había funcionado.
      expect(prisma.inventoryItem.deleteMany).toHaveBeenCalledWith({
        where: { id: "row1", characterId: "c1" },
      });
      expect(res).toEqual({ deleted: true });
      // Y deja rastro, como el dinero: una semana después alguien preguntará quién lo soltó.
      expect(events.record).toHaveBeenCalledWith(
        "owner1",
        "cmp1",
        expect.objectContaining({ payload: expect.objectContaining({ type: "ITEM_REMOVED" }) }),
        expect.anything(),
      );
    });

    it("soltar dos veces no revienta: la segunda dice que no había nada que quitar", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValue(row());
      prisma.inventoryItem.deleteMany.mockResolvedValue({ count: 0 });

      expect(await service.remove("owner1", "cmp1", "c1", "row1")).toEqual({ deleted: false });
      expect(events.record).not.toHaveBeenCalled();
    });

    it("una fila que no existe es 404", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValue(null);
      await expect(service.remove("owner1", "cmp1", "c1", "no-existe")).rejects.toThrow();
    });
  });

  describe("carrera del índice único parcial (P2002)", () => {
    it("una violación de la restricción única se traduce a 409, no revienta como 500", async () => {
      prisma.inventoryItem.findFirst
        .mockResolvedValueOnce(row({ srdKey: "dagger" })) // la fila objetivo
        .mockResolvedValueOnce(null); // la comprobación previa no ve ocupante: la carrera es con
      // otra petición que escribe entre esa comprobación y este `update`.
      prisma.inventoryItem.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "test",
        }),
      );

      // La ranura tiene que pegarle al objeto —una daga va en una mano, no en la cabeza—, así
      // que la carrera se provoca donde de verdad puede ocurrir.
      await expect(
        service.update("owner1", "cmp1", "c1", "row1", { location: "EQUIPPED", slot: "MAIN_HAND" }),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe("la ranura tiene que pegarle al objeto (auditoría de mecánica 2B)", () => {
    it("una armadura en la cabeza es 400: si no, seguía dando su Clase de Armadura", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValueOnce(row({ srdKey: "chain-mail" }));

      await expect(
        service.update("owner1", "cmp1", "c1", "row1", { location: "EQUIPPED", slot: "HEAD" }),
      ).rejects.toMatchObject({ status: 400 });
      expect(prisma.inventoryItem.update).not.toHaveBeenCalled();
    });

    it("y un escudo fuera de la mano izquierda también, que es como se apagaba la hoja entera", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValueOnce(row({ srdKey: "shield" }));

      await expect(
        service.update("owner1", "cmp1", "c1", "row1", { location: "EQUIPPED", slot: "FEET" }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });
});
