import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Prisma } from "@prisma/client";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { PrismaService } from "../prisma/prisma.service";
import { InventoryService } from "./inventory.service";
import { CharacterSheetService } from "../characters/character-sheet.service";

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
    // D-CF-15 (migración 7): `list()` lee la variante de sobrecarga de la campaña incluso
    // cuando no hace falta identificación — por defecto, apagada, para no calcularla de más.
    campaign: { findUniqueOrThrow: jest.fn() },
    // `consume` aplica los efectos del objeto escribiendo aquí **directo con el `tx`**, sin pasar
    // por `TemporaryModifiersService.grant` — que desde el 2026-09-07 es solo del DM.
    // T15 (3A.2) — `list()` también LEE (`findMany`) los `TemporaryModifier` de objeto vivos,
    // para adjuntarlos a cada fila (`temporalesPorObjeto`, `character-sheet.service.ts`).
    temporaryModifier: { create: jest.fn(), findMany: jest.fn() },
    // La bolsa bloquea la fila del personaje antes de mirar el saldo (`FOR UPDATE`), como hacen
    // los puntos de golpe: el Prisma simulado devuelve el personaje que la prueba haya puesto.
    $queryRaw: jest.fn(),
    transaction: jest.fn(),
  };
  const membership = { requireMember: jest.fn(), getMembership: jest.fn() };
  const events = { record: jest.fn() };
  // M2B-11: `update()` le pide la CA a la hoja antes y después de escribir; aquí basta con un
  // número fijo, la fórmula real la prueba `character-sheet.service.spec.ts`.
  const characterSheet = { armorClassInTransaction: jest.fn() };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: GameEventsService, useValue: events },
        { provide: CharacterSheetService, useValue: characterSheet },
      ],
    }).compile();
    service = ref.get(InventoryService);
    jest.resetAllMocks();
    membership.requireMember.mockResolvedValue(undefined);
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    characterSheet.armorClassInTransaction.mockResolvedValue(15);
    prisma.character.findFirst.mockResolvedValue(character);
    // **`displayName` presente por defecto.** Sin él, la ausencia de `de` en las pruebas "el
    // dueño se añade algo a sí mismo" pasaría por el motivo equivocado: no porque la condición
    // «solo cuando quien actúa no es el dueño» las proteja, sino porque no habría ningún nombre
    // que poner. Con un nombre siempre disponible, la mutación que borra esa condición sí se ve.
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false, displayName: "Alguien" });
    prisma.campaign.findUniqueOrThrow.mockResolvedValue({
      id: "cmp1",
      encumbranceVariant: false,
      clockSeconds: 0,
    });
    prisma.temporaryModifier.findMany.mockResolvedValue([]);
    prisma.transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
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
      ).rejects.toThrow(ForbiddenException);
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

      let error: unknown;
      try {
        await service.add("dm1", "cmp1", "c1", {
          ref: { source: "CAMPAIGN", id: "ci1" },
          quantity: 1,
          location: "CARRIED",
        });
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as Error).message).toMatch(/no puede ver/);
      expect(prisma.inventoryItem.create).not.toHaveBeenCalled();
    });

    // Fix round 4 — el mismo objeto DM_ONLY, pero con `identified: false`: el flujo RECOMENDADO
    // (M4b) para esconder un objeto de campaña del todo. La regla 6 solo tiene sentido cuando la
    // fila nacería hablando con su nombre real; una fila sin identificar no lo hace, así que
    // este `add()` debe funcionar.
    it("D-CF-15 (fix round 4): el mismo objeto DM_ONLY, dado con `identified: false`, SÍ funciona", async () => {
      prisma.campaignItem.findFirst.mockResolvedValue({
        id: "ci1",
        campaignId: "cmp1",
        name: "Reliquia secreta",
        kind: "OTHER",
        description: null,
        weightOz: 0,
        costCp: null,
        effects: null,
        requiresAttunement: false,
        slot: null,
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
        visibility: "DM_ONLY",
        createdById: "dm1",
        grants: [],
      });
      membership.getMembership.mockImplementation((_c: string, userId: string) =>
        Promise.resolve({ role: userId === "dm1" ? "DM" : "PLAYER" }),
      );
      prisma.inventoryItem.create.mockResolvedValue(
        row({
          srdKey: null,
          campaignItemId: "ci1",
          identified: false,
          unidentifiedName: "Un sello frío al tacto",
        }),
      );

      const res = await service.add("dm1", "cmp1", "c1", {
        ref: { source: "CAMPAIGN", id: "ci1" },
        quantity: 1,
        location: "CARRIED",
        identified: false,
        unidentifiedName: "Un sello frío al tacto",
      });

      expect(prisma.inventoryItem.create).toHaveBeenCalled();
      expect(events.record).toHaveBeenCalledWith(
        "dm1",
        "cmp1",
        expect.objectContaining({
          payload: expect.objectContaining({ type: "ITEM_ADDED", item: "Un sello frío al tacto" }),
        }),
        expect.anything(),
      );
      expect(JSON.stringify(events.record.mock.calls.at(-1))).not.toContain("Reliquia secreta");
      expect(res).toBeDefined();
    });

    // B3 — dar algo a alguien dice quién lo dio. El rastro (actor, sujeto, qué) ya existía;
    // lo que faltaba era el nombre legible dentro del `payload` para que la frase del registro
    // lo diga. `de` es opcional y solo aparece cuando quien actúa no es el dueño.
    it("dar un objeto deja un suceso que dice quién lo dio, con su nombre y no con su id", async () => {
      membership.getMembership.mockImplementation((_c: string, userId: string) =>
        Promise.resolve({ role: userId === "dm1" ? "DM" : "PLAYER" }),
      );
      prisma.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
        Promise.resolve(
          where.id === "dm1" ? { isAdmin: false, displayName: "El DM" } : { isAdmin: false },
        ),
      );
      prisma.inventoryItem.create.mockResolvedValue(row());

      await service.add("dm1", "cmp1", "c1", {
        ref: { source: "SRD", key: "dagger" },
        quantity: 1,
        location: "CARRIED",
      });

      const [, , eventoArg] = events.record.mock.calls.at(-1)!;
      expect(eventoArg.subjectId).toBe("c1");
      expect(eventoArg.payload).toMatchObject({ type: "ITEM_ADDED", quantity: 1 });
      // El valor exacto, no `expect.any(String)`: si el `de` llevara el `id` del DM en vez de
      // su nombre, `expect.any(String)` lo habría dejado pasar igual.
      expect(eventoArg.payload.de).toBe("El DM");
    });

    it("el dueño se añade algo a su propia bolsa: el suceso no lleva `de`", async () => {
      prisma.inventoryItem.create.mockResolvedValue(row());

      await service.add("owner1", "cmp1", "c1", {
        ref: { source: "SRD", key: "dagger" },
        quantity: 1,
        location: "CARRIED",
      });

      const [, , eventoArg] = events.record.mock.calls.at(-1)!;
      expect(eventoArg.payload).not.toHaveProperty("de");
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

    // Fix round 3 (R9) — de los tres 400 de `resolvePlacement` (sin ranura, ranura equivocada,
    // sintonización no pedida), ninguna prueba los ejercitaba con una fila SIN IDENTIFICAR: el
    // camino que compone el mensaje (`nombreVisible`) es el mismo, pero "mismo helper" no es
    // "mismo helper probado aquí" (mismo criterio que ya dejó fix round 2, R7).
    it("D-CF-15 (R9): equipar sin ranura con la fila sin identificar dice el alias en el 400, nunca el nombre real", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValueOnce(
        row({
          id: "row1",
          srdKey: null,
          campaignItemId: "ring1",
          identified: false,
          unidentifiedName: "Anillo de aspecto extraño",
        }),
      );
      prisma.campaignItem.findFirst.mockResolvedValue({
        id: "ring1",
        campaignId: "cmp1",
        name: "Anillo de protección",
        kind: "OTHER",
        description: "Un aro de plata pulida.",
        weightOz: 0,
        costCp: null,
        effects: [{ kind: "ac", amount: 1 }],
        requiresAttunement: true,
        slot: null,
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
      });

      const error = await service
        .update("owner1", "cmp1", "c1", "row1", { location: "EQUIPPED" })
        .catch((e: unknown) => e);
      expect((error as { status?: number }).status).toBe(400);
      expect((error as Error).message).toContain("Anillo de aspecto extraño");
      expect((error as Error).message).not.toContain("Anillo de protección");
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

  describe("update() — quantityDelta (M2B-8)", () => {
    it("aplica el delta con increment dentro de la transacción", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValueOnce(row({ quantity: 20 }));
      prisma.inventoryItem.update.mockResolvedValue(row({ quantity: 18 }));

      await service.update("owner1", "cmp1", "c1", "row1", { quantityDelta: -2 });

      expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: "row1" },
        data: expect.objectContaining({ quantity: { increment: -2 } }),
      });
    });

    it("un delta que dejaría la cantidad por debajo de 1 es 409, y no escribe nada", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValueOnce(row({ quantity: 1 }));

      await expect(
        service.update("owner1", "cmp1", "c1", "row1", { quantityDelta: -1 }),
      ).rejects.toMatchObject({ status: 409 });
      expect(prisma.inventoryItem.update).not.toHaveBeenCalled();
    });

    it("Q-4: un delta positivo que se pasaría de 9999 también es 409, y no escribe nada", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValueOnce(row({ quantity: 9998 }));

      await expect(
        service.update("owner1", "cmp1", "c1", "row1", { quantityDelta: 5 }),
      ).rejects.toMatchObject({ status: 409 });
      expect(prisma.inventoryItem.update).not.toHaveBeenCalled();
    });

    it("un delta positivo que se queda justo en 9999 sí funciona", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValueOnce(row({ quantity: 9998 }));
      prisma.inventoryItem.update.mockResolvedValue(row({ quantity: 9999 }));

      await service.update("owner1", "cmp1", "c1", "row1", { quantityDelta: 1 });

      expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: "row1" },
        data: expect.objectContaining({ quantity: { increment: 1 } }),
      });
    });
  });

  describe("update() — ITEM_QUANTITY_CHANGED (D-CF-14, commit 4, M2B-8)", () => {
    it("un PATCH con `quantity` absoluta que cambia la cantidad registra el suceso con `from`/`to`", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValueOnce(row({ quantity: 3 }));
      prisma.inventoryItem.update.mockResolvedValue(row({ quantity: 5 }));

      await service.update("owner1", "cmp1", "c1", "row1", { quantity: 5 });

      expect(events.record).toHaveBeenCalledWith(
        "owner1",
        "cmp1",
        expect.objectContaining({
          payload: expect.objectContaining({
            type: "ITEM_QUANTITY_CHANGED",
            from: 3,
            to: 5,
          }),
        }),
        expect.anything(),
      );
    });

    it("un PATCH con `quantityDelta` que cambia la cantidad también registra el suceso", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValueOnce(row({ quantity: 20 }));
      prisma.inventoryItem.update.mockResolvedValue(row({ quantity: 18 }));

      await service.update("owner1", "cmp1", "c1", "row1", { quantityDelta: -2 });

      expect(events.record).toHaveBeenCalledWith(
        "owner1",
        "cmp1",
        expect.objectContaining({
          payload: expect.objectContaining({
            type: "ITEM_QUANTITY_CHANGED",
            from: 20,
            to: 18,
          }),
        }),
        expect.anything(),
      );
    });

    it("un PATCH con la misma `quantity` de siempre no registra nada", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValueOnce(row({ quantity: 5 }));
      prisma.inventoryItem.update.mockResolvedValue(row({ quantity: 5 }));

      await service.update("owner1", "cmp1", "c1", "row1", { quantity: 5 });

      expect(events.record).not.toHaveBeenCalled();
    });

    it("un PATCH que solo toca otro campo (p.ej. `storedAt`) no registra nada", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValueOnce(row({ quantity: 5 }));
      prisma.inventoryItem.update.mockResolvedValue(row({ quantity: 5, storedAt: "El Faro" }));

      await service.update("owner1", "cmp1", "c1", "row1", { storedAt: "El Faro" });

      expect(events.record).not.toHaveBeenCalled();
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

  describe("D-CF-15 (migración 7) — identificación: «lo tengo pero no sé qué es»", () => {
    /** Un anillo de campaña, sin identificar, en la mochila del personaje. */
    function anilloSinIdentificar(over: Partial<Record<string, unknown>> = {}) {
      return {
        id: "ring1",
        campaignId: "cmp1",
        name: "Anillo de protección",
        kind: "OTHER",
        description: "Un aro de plata pulida.",
        weightOz: 0,
        costCp: null,
        effects: [{ kind: "ac", amount: 1 }],
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

    function filaSinIdentificar(over: Partial<Record<string, unknown>> = {}) {
      return row({
        srdKey: null,
        campaignItemId: "ring1",
        identified: false,
        unidentifiedName: "Anillo de aspecto extraño",
        ...over,
      });
    }

    describe("list()", () => {
      it("un jugador ve el alias, y «Anillo de protección» no aparece en ningún sitio", async () => {
        prisma.inventoryItem.findMany.mockResolvedValue([filaSinIdentificar()]);
        prisma.campaignItem.findFirst.mockResolvedValue(anilloSinIdentificar());
        membership.getMembership.mockResolvedValue({ role: "PLAYER" });

        const res = await service.list("owner1", "cmp1", "c1");

        expect(res.items).toHaveLength(1);
        expect(res.items[0].item).toMatchObject({
          name: "Anillo de aspecto extraño",
          identified: false,
        });
        expect(JSON.stringify(res)).not.toContain("Anillo de protección");
      });

      it("sin alias del DM, el jugador ve el título genérico, nunca el nombre real", async () => {
        prisma.inventoryItem.findMany.mockResolvedValue([
          filaSinIdentificar({ unidentifiedName: null }),
        ]);
        prisma.campaignItem.findFirst.mockResolvedValue(anilloSinIdentificar());
        membership.getMembership.mockResolvedValue({ role: "PLAYER" });

        const res = await service.list("owner1", "cmp1", "c1");

        expect(res.items[0].item.name).toBe("Objeto sin identificar");
      });

      it("el DM ve el nombre real, más el estado y el alias sueltos", async () => {
        prisma.inventoryItem.findMany.mockResolvedValue([filaSinIdentificar()]);
        prisma.campaignItem.findFirst.mockResolvedValue(anilloSinIdentificar());
        membership.getMembership.mockResolvedValue({ role: "DM" });

        const res = await service.list("dm1", "cmp1", "c1");

        expect(res.items[0].item).toMatchObject({
          name: "Anillo de protección",
          identified: false,
          unidentifiedName: "Anillo de aspecto extraño",
        });
      });

      it("una fila identificada no cambia para nadie", async () => {
        prisma.inventoryItem.findMany.mockResolvedValue([
          filaSinIdentificar({ identified: true, unidentifiedName: null }),
        ]);
        prisma.campaignItem.findFirst.mockResolvedValue(anilloSinIdentificar());
        membership.getMembership.mockResolvedValue({ role: "PLAYER" });

        const res = await service.list("owner1", "cmp1", "c1");

        expect(res.items[0].item.name).toBe("Anillo de protección");
        expect(res.items[0].item.identified).toBe(true);
      });
    });

    describe("update()", () => {
      it("el dueño (que no es DM) NO puede identificar su propio objeto: 403, y no escribe", async () => {
        membership.getMembership.mockResolvedValue({ role: "PLAYER" });
        prisma.inventoryItem.findFirst.mockResolvedValue(filaSinIdentificar());

        await expect(
          service.update("owner1", "cmp1", "c1", "row1", { identified: true }),
        ).rejects.toThrow(ForbiddenException);
        expect(prisma.inventoryItem.update).not.toHaveBeenCalled();
      });

      it("el dueño NO puede ponerle un alias, aunque solo mande ese campo: 403", async () => {
        membership.getMembership.mockResolvedValue({ role: "PLAYER" });
        prisma.inventoryItem.findFirst.mockResolvedValue(filaSinIdentificar());

        await expect(
          service.update("owner1", "cmp1", "c1", "row1", {
            unidentifiedName: "Otro alias",
          }),
        ).rejects.toThrow(ForbiddenException);
        expect(prisma.inventoryItem.update).not.toHaveBeenCalled();
      });

      it("el dueño SIGUE pudiendo cambiar la cantidad de su objeto sin identificar", async () => {
        membership.getMembership.mockResolvedValue({ role: "PLAYER" });
        prisma.campaignItem.findFirst.mockResolvedValue(anilloSinIdentificar());
        prisma.inventoryItem.findFirst.mockResolvedValue(filaSinIdentificar({ quantity: 1 }));
        prisma.inventoryItem.update.mockResolvedValue(filaSinIdentificar({ quantity: 2 }));

        const res = await service.update("owner1", "cmp1", "c1", "row1", { quantity: 2 });

        expect(res.item.quantity).toBe(2);
      });

      it("el DM sí puede marcarlo identificado y ponerle un alias, y no registra ningún suceso", async () => {
        membership.getMembership.mockResolvedValue({ role: "DM" });
        prisma.campaignItem.findFirst.mockResolvedValue(anilloSinIdentificar());
        prisma.inventoryItem.findFirst.mockResolvedValue(filaSinIdentificar());
        prisma.inventoryItem.update.mockResolvedValue(
          filaSinIdentificar({ identified: false, unidentifiedName: "Un aro reluciente" }),
        );

        const res = await service.update("dm1", "cmp1", "c1", "row1", {
          unidentifiedName: "Un aro reluciente",
        });

        expect(prisma.inventoryItem.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ unidentifiedName: "Un aro reluciente" }),
          }),
        );
        // El DM SÍ ve el alias suelto en la respuesta cruda — lo necesita para poder editarlo.
        expect(res.item.unidentifiedName).toBe("Un aro reluciente");
        expect(events.record).not.toHaveBeenCalled();
      });

      it("cuando quien manda el PATCH no es el DM, la fila cruda de la respuesta nunca lleva el alias", async () => {
        membership.getMembership.mockResolvedValue({ role: "PLAYER" });
        prisma.campaignItem.findFirst.mockResolvedValue(anilloSinIdentificar());
        prisma.inventoryItem.findFirst.mockResolvedValue(filaSinIdentificar({ quantity: 1 }));
        prisma.inventoryItem.update.mockResolvedValue(filaSinIdentificar({ quantity: 2 }));

        const res = await service.update("owner1", "cmp1", "c1", "row1", { quantity: 2 });

        expect(res.item.unidentifiedName).toBeNull();
      });
    });

    // Fix round 2 (R7) — el helper `nombreVisible` ya cubría `remove()` y los mensajes de
    // manos/sintonía desde fix round 1, pero ninguna prueba los recorría con una fila sin
    // identificar. El riesgo era nulo (mismo helper que ya prueban `update()`/`ensureSlotAllowed`
    // arriba), pero "nulo" no es lo mismo que "probado".
    describe("remove() y los mensajes de manos/sintonía, con una fila sin identificar", () => {
      it("remove(): el ITEM_REMOVED usa el nombre visible, nunca el real", async () => {
        prisma.campaignItem.findFirst.mockResolvedValue(anilloSinIdentificar());
        prisma.inventoryItem.findFirst.mockResolvedValue(filaSinIdentificar());
        prisma.inventoryItem.deleteMany.mockResolvedValue({ count: 1 });

        await service.remove("owner1", "cmp1", "c1", "row1");

        expect(events.record).toHaveBeenCalledWith(
          "owner1",
          "cmp1",
          expect.objectContaining({
            payload: expect.objectContaining({
              type: "ITEM_REMOVED",
              item: "Anillo de aspecto extraño",
              // Fix round 3 (R9) — `refVisible` es la pareja de `nombreVisible` (fix round 2,
              // R5): la unitaria de `remove()` solo comprobaba `item`, y `ref` es la mitad que
              // delata un objeto de campaña por su `cuid` real si alguien olvida pasarlo por el
              // mismo visor. Aquí es `CAMPAIGN:ring1` (el `cuid` no dice nada por sí solo), pero
              // la aserción existe para que un SRD sin identificar —que SÍ delataría su `ref`
              // real— no pueda colarse sin que esta prueba lo note.
              ref: "CAMPAIGN:ring1",
            }),
          }),
          expect.anything(),
        );
      });

      it("ensureSlotAllowed(): «la mano izquierda ya lleva» usa el alias del objeto sin identificar en OFF_HAND, y NUNCA el nombre real", async () => {
        // Mismo patrón que "MUTACIÓN CLAVE: un arma a dos manos..." de arriba: un mandoble
        // (`greatsword`, TWO_HANDED de verdad en el catálogo) intenta ir a MAIN_HAND con la
        // OFF_HAND ya ocupada — aquí, por un anillo sin identificar.
        prisma.inventoryItem.findFirst
          .mockResolvedValueOnce(row({ id: "row1", srdKey: "greatsword" })) // fila a equipar
          .mockResolvedValueOnce(filaSinIdentificar({ id: "off-1", slot: "OFF_HAND" })); // OFF_HAND ocupada
        prisma.campaignItem.findFirst.mockResolvedValue(anilloSinIdentificar());

        // Fix round 3 (R9) — `.rejects.toThrow(/regex/)` solo comprueba que el patrón APARECE:
        // un mensaje que llevara el alias Y el nombre real a la vez seguiría pasando esa
        // aserción sola. Se captura el error y se comprueban las dos cosas por separado.
        const error = await service
          .update("owner1", "cmp1", "c1", "row1", { location: "EQUIPPED", slot: "MAIN_HAND" })
          .catch((e: unknown) => e);
        expect((error as Error).message).toContain("Anillo de aspecto extraño");
        expect((error as Error).message).not.toContain("Anillo de protección");
      });
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
      // Es el propio dueño quien mueve su bolsa: no hay nadie de quien «recibirlo».
      expect(events.record.mock.calls.at(-1)![2].payload).not.toHaveProperty("de");
    });

    it("B3: el DM cambia el dinero de un personaje ajeno y el suceso dice quién lo dio", async () => {
      membership.getMembership.mockImplementation((_c: string, userId: string) =>
        Promise.resolve({ role: userId === "dm1" ? "DM" : "PLAYER" }),
      );
      prisma.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
        Promise.resolve(
          where.id === "dm1" ? { isAdmin: false, displayName: "El DM" } : { isAdmin: false },
        ),
      );
      prisma.character.update.mockResolvedValue({ ...character, gp: 25 });

      await service.changeMoney("dm1", "cmp1", "c1", { gp: 5, reason: "botín" });

      const eventoArg = events.record.mock.calls.at(-1)![2];
      expect(eventoArg.payload).toMatchObject({ type: "MONEY_CHANGED", gp: 5 });
      expect(eventoArg.payload.de).toBe("El DM");
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

  describe("consume() — gastar un consumible (auditoría de mecánica 2B)", () => {
    it("descuenta las unidades gastadas y deja la fila si quedan", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValue(row({ srdKey: "arrows-20", quantity: 3 }));
      prisma.inventoryItem.update.mockResolvedValue({});

      const res = await service.consume("owner1", "cmp1", "c1", "row1", { amount: 1 });

      expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: "row1" },
        data: { quantity: 2 },
      });
      expect(res).toEqual({ remaining: 2, deleted: false });
    });

    it("la última unidad se lleva la fila: una pila de cero no es información", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValue(row({ srdKey: "torch", quantity: 1 }));
      prisma.inventoryItem.delete.mockResolvedValue({});

      const res = await service.consume("owner1", "cmp1", "c1", "row1", { amount: 1 });

      expect(prisma.inventoryItem.delete).toHaveBeenCalledWith({ where: { id: "row1" } });
      expect(res).toEqual({ remaining: 0, deleted: true });
    });

    it("gastar más de lo que hay es 400, y no toca nada", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValue(row({ srdKey: "torch", quantity: 2 }));

      await expect(
        service.consume("owner1", "cmp1", "c1", "row1", { amount: 5 }),
      ).rejects.toMatchObject({ status: 400 });
      expect(prisma.inventoryItem.update).not.toHaveBeenCalled();
      expect(prisma.inventoryItem.delete).not.toHaveBeenCalled();
    });

    // **El camino legítimo, y por qué esta prueba existe.**
    //
    // El 2026-09-07 se cerró `grant` a solo-DM (ficha P1, puerta B). Esa puerta se había concedido
    // por un caso de uso real —«beberse una poción que ya llevas encima no debería ser una
    // petición al DM»—, así que **cerrarla solo es correcto si este camino sigue abierto**: lo
    // ejecuta el **dueño jugador** (`owner1`, no un DM) y escribe el modificador **directo con el
    // `tx`**. Sin esta prueba, aquel commit podía romper la mitad buena sin que nada enrojeciera.
    it("beberse una poción sigue aplicando su efecto, y lo hace el dueño sin pedirle nada al DM", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValue(
        row({ srdKey: null, campaignItemId: "ci1", quantity: 1 }),
      );
      prisma.campaignItem.findFirst.mockResolvedValue({
        id: "ci1",
        campaignId: "cmp1",
        name: "Poción de piel de roble",
        visibility: "PLAYERS",
        createdById: "dm",
        // `resolveContentRef` compone el `grantedUserIds` de `canView` desde aquí: sin la lista
        // la resolución revienta antes de llegar al efecto, y el fallo sale como un `map` de
        // `undefined` que no dice nada del objeto.
        grants: [],
        effects: [{ kind: "ac", amount: 2 }],
      });
      prisma.inventoryItem.delete.mockResolvedValue({});

      await service.consume("owner1", "cmp1", "c1", "row1", { amount: 1 });

      expect(prisma.temporaryModifier.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          characterId: "c1",
          target: "ac",
          amount: 2,
          // El motivo se pinta en la traza: es lo que impide un +2 sin origen.
          reason: "Poción de piel de roble",
          grantedById: "owner1",
        }),
      });
    });

    it("y deja rastro: gastar una poción es algo que la mesa recuerda mal una semana después", async () => {
      prisma.inventoryItem.findFirst.mockResolvedValue(row({ srdKey: "torch", quantity: 2 }));
      prisma.inventoryItem.update.mockResolvedValue({});

      await service.consume("owner1", "cmp1", "c1", "row1", { amount: 1 });

      expect(events.record).toHaveBeenCalledWith(
        "owner1",
        "cmp1",
        expect.objectContaining({
          payload: expect.objectContaining({ type: "ITEM_REMOVED", quantity: 1 }),
        }),
        expect.anything(),
      );
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
