import { Test } from "@nestjs/testing";
import { MembershipService } from "../../campaigns/membership.service";
import { GameEventsService } from "../../game-events/game-events.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RestService } from "./rest.service";

// Tarea 2A.8.

describe("RestService", () => {
  let service: RestService;
  const character = {
    id: "c1",
    ownerId: "owner1",
    visibility: "PLAYERS",
    campaignId: "cmp1",
    con: 14, // modificador +2
    currentHp: 5,
  };
  const prisma = {
    character: { findFirst: jest.fn(), findFirstOrThrow: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    characterResource: { findMany: jest.fn(), update: jest.fn() },
    characterCondition: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    $transaction: jest.fn(),
  };
  const membership = { requireMember: jest.fn(), getMembership: jest.fn() };
  const events = { record: jest.fn() };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        RestService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: GameEventsService, useValue: events },
      ],
    }).compile();
    service = ref.get(RestService);
    jest.resetAllMocks();
    membership.requireMember.mockResolvedValue(undefined);
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.character.findFirst.mockResolvedValue(character);
    prisma.character.findFirstOrThrow.mockResolvedValue(character);
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    prisma.characterCondition.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
  });

  it("quien no es DM ni dueño no puede declarar un descanso", async () => {
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    await expect(service.declare("otro", "cmp1", "c1", { kind: "SHORT" })).rejects.toThrow();
  });

  it("descanso corto: repone SOLO lo marcado SHORT_REST, no lo de LONG_REST", async () => {
    prisma.characterResource.findMany.mockResolvedValue([
      { id: "r1", key: "spell-slot-1", current: 0, max: 2, resetOn: "SHORT_REST" },
      { id: "r2", key: "rage", current: 0, max: 3, resetOn: "LONG_REST" },
    ]);

    await service.declare("owner1", "cmp1", "c1", { kind: "SHORT" });

    expect(prisma.characterResource.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { current: 2 },
    });
    expect(prisma.characterResource.update).not.toHaveBeenCalledWith({
      where: { id: "r2" },
      data: { current: 3 },
    });
  });

  it("MUTACIÓN CLAVE: descanso LARGO recupera la mitad de los dados de golpe, redondeando hacia arriba y no todos", async () => {
    // 5 dados máximos, 1 disponible: la mitad de 5 es 2.5 -> 3 hacia arriba; sube de 1 a 4,
    // nunca a 5.
    prisma.characterResource.findMany.mockResolvedValue([
      { id: "hd", key: "hit-dice-d10", current: 1, max: 5, resetOn: "NONE" },
    ]);

    await service.declare("owner1", "cmp1", "c1", { kind: "LONG" });

    expect(prisma.characterResource.update).toHaveBeenCalledWith({
      where: { id: "hd" },
      data: { current: 4 },
    });
  });

  it("recuperar la mitad nunca pasa del máximo, y con máximo 1 recupera como mínimo 1", async () => {
    prisma.characterResource.findMany.mockResolvedValue([
      { id: "hd", key: "hit-dice-d6", current: 1, max: 1, resetOn: "NONE" },
    ]);

    await service.declare("owner1", "cmp1", "c1", { kind: "LONG" });

    // Ya estaba a máximo (1 de 1): no hay llamada de actualización para ese recurso.
    expect(prisma.characterResource.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "hd" } }),
    );
  });

  it("descanso LARGO devuelve los PG al máximo poniendo currentHp a null", async () => {
    prisma.characterResource.findMany.mockResolvedValue([]);
    await service.declare("owner1", "cmp1", "c1", { kind: "LONG" });
    expect(prisma.character.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { currentHp: null },
    });
  });

  it("descanso LARGO baja un nivel de agotamiento, sin quitar más de uno", async () => {
    prisma.characterResource.findMany.mockResolvedValue([]);
    prisma.characterCondition.findUnique.mockResolvedValue({ id: "cond1", level: 3 });

    await service.declare("owner1", "cmp1", "c1", { kind: "LONG" });

    expect(prisma.characterCondition.update).toHaveBeenCalledWith({
      where: { id: "cond1" },
      data: { level: 2 },
    });
    expect(prisma.characterCondition.delete).not.toHaveBeenCalled();
  });

  it("descanso LARGO en agotamiento nivel 1 QUITA la condición, no la deja en 0", async () => {
    prisma.characterResource.findMany.mockResolvedValue([]);
    prisma.characterCondition.findUnique.mockResolvedValue({ id: "cond1", level: 1 });

    await service.declare("owner1", "cmp1", "c1", { kind: "LONG" });

    expect(prisma.characterCondition.delete).toHaveBeenCalledWith({ where: { id: "cond1" } });
  });

  it("descanso corto con spendHitDice cura y descuenta esos dados, sin tocar más de los que hay", async () => {
    prisma.characterResource.findMany.mockResolvedValue([
      { id: "hd", key: "hit-dice-d8", current: 1, max: 4, resetOn: "NONE" },
    ]);

    await service.declare("owner1", "cmp1", "c1", { kind: "SHORT", spendHitDice: 3 });

    // Solo había 1 disponible: se gasta 1, nunca 3.
    expect(prisma.characterResource.update).toHaveBeenCalledWith({
      where: { id: "hd" },
      data: { current: 0 },
    });
    expect(prisma.character.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "c1" } }),
    );
    const llamada = (prisma.character.update as jest.Mock).mock.calls[0][0];
    expect(llamada.data.currentHp).toBeGreaterThan(character.currentHp);
  });

  it("la curación por dados de golpe NO pasa de los PG máximos", async () => {
    // Lo dejó anotado quien implementó la tarea: sumaba sin tope, porque el máximo no se guarda
    // —se calcula— y este módulo no lo tenía a mano. Con `common/max-hp.ts` sí lo tiene, y esta
    // prueba es lo que impide que el arreglo se deshaga: **una curación no puede inventar
    // puntos que el personaje no tiene**.
    //
    // Ficha entera y coherente para que el catálogo la sepa derivar: guerrero humano de nivel 1
    // con Constitución 14 (13 base + 1 del humano) → d10 máximo + 2 = **12 PG máximos**.
    const fichaEntera = {
      ...character,
      str: 15,
      dex: 13,
      con: 13,
      int: 9,
      wis: 11,
      cha: 9,
      raceKey: "human",
      classKey: "fighter",
      subraceKey: null,
      choices: null,
      level: 1,
      currentHp: 11, // a uno del máximo
    };
    prisma.character.findFirst.mockResolvedValue(fichaEntera);
    prisma.character.findFirstOrThrow.mockResolvedValue(fichaEntera);
    prisma.characterResource.findMany.mockResolvedValue([
      { id: "hd", key: "hit-dice-d10", current: 4, max: 4, resetOn: "NONE" },
    ]);

    // Cuatro dados de d10 con +2 cada uno curan como poco 12: de sobra para pasarse.
    await service.declare("owner1", "cmp1", "c1", { kind: "SHORT", spendHitDice: 4 });

    const llamada = (prisma.character.update as jest.Mock).mock.calls[0][0];
    expect(llamada.data.currentHp).toBe(12);
  });

  it("con una ficha a medio hacer no se inventa un máximo: cura sin tope y no revienta", async () => {
    // Una hoja sin clase no se puede derivar, y eso es un estado legítimo. Preferimos curar sin
    // tope a romper un descanso por un dato que el jugador todavía no ha rellenado.
    prisma.characterResource.findMany.mockResolvedValue([
      { id: "hd", key: "hit-dice-d8", current: 1, max: 4, resetOn: "NONE" },
    ]);

    await expect(
      service.declare("owner1", "cmp1", "c1", { kind: "SHORT", spendHitDice: 1 }),
    ).resolves.toBeDefined();
  });

  it("escribe REST_DECLARED al terminar", async () => {
    prisma.characterResource.findMany.mockResolvedValue([]);
    await service.declare("owner1", "cmp1", "c1", { kind: "SHORT" });
    expect(events.record).toHaveBeenCalledWith(
      "owner1",
      "cmp1",
      expect.objectContaining({ payload: { type: "REST_DECLARED", rest: "SHORT" } }),
      prisma,
    );
  });
});
