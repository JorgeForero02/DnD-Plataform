import { Test } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { salvacionesDeMarchaForzada } from "@dnd/shared";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { PrismaService } from "../prisma/prisma.service";
import { GameClockService } from "./game-clock.service";

// Tarea 2C.3 — el reloj de la campaña.

describe("GameClockService", () => {
  let service: GameClockService;
  const prisma = {
    campaign: { findUnique: jest.fn(), update: jest.fn() },
    // 2C.4: al avanzar, el reloj anuncia las condiciones que acaban de vencer. Sin ninguna por
    // defecto — el caso de casi todos los avances.
    characterCondition: { findMany: jest.fn() },
    transaction: jest.fn(),
  };
  const membership = { requireMember: jest.fn(), requireDM: jest.fn() };
  const events = { record: jest.fn() };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        GameClockService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: GameEventsService, useValue: events },
      ],
    }).compile();
    service = ref.get(GameClockService);
    jest.resetAllMocks();
    membership.requireMember.mockResolvedValue(undefined);
    membership.requireDM.mockResolvedValue(undefined);
    prisma.campaign.findUnique.mockResolvedValue({ id: "c1", clockSeconds: 1000 });
    prisma.campaign.update.mockResolvedValue({ id: "c1", clockSeconds: 4600 });
    prisma.transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
    events.record.mockResolvedValue({ id: "e1" });
    prisma.characterCondition.findMany.mockResolvedValue([]);
  });

  it("leer el reloj es de cualquier miembro: qué hora es en el mundo no es información privilegiada", async () => {
    const estado = await service.read("jugador", "c1");
    expect(estado).toEqual({ seconds: 1000 });
    expect(membership.requireMember).toHaveBeenCalledWith("c1", "jugador");
  });

  it("**avanzarlo es solo del DM**: un jugador que pudiera adelantarlo apagaría sus condiciones", async () => {
    membership.requireDM.mockRejectedValue(new ForbiddenException());
    await expect(
      service.advance("jugador", "c1", { kind: "TIME", seconds: 3600 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.campaign.update).not.toHaveBeenCalled();
  });

  it("**se avanza con `increment`, no con un valor calculado aquí**", async () => {
    // Dos avances a la vez —el DM en dos pestañas, o una regla que dispare otro— perderían uno de
    // los dos si el número se compusiera en memoria. Lo suma el motor de la base.
    await service.advance("dm", "c1", { kind: "TIME", seconds: 3600 });
    expect(prisma.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { clockSeconds: { increment: 3600 } } }),
    );
  });

  it("deja rastro en la línea de tiempo con el antes y el después", async () => {
    const r = await service.advance("dm", "c1", {
      kind: "TIME",
      seconds: 3600,
      reason: "La noche",
    });
    expect(events.record).toHaveBeenCalledWith(
      "dm",
      "c1",
      expect.objectContaining({
        subjectType: "campaign",
        visibility: "PLAYERS",
        payload: expect.objectContaining({
          type: "CLOCK_ADVANCED",
          seconds: 3600,
          from: 1000,
          to: 4600,
          reason: "La noche",
        }),
      }),
      expect.anything(),
    );
    expect(r).toMatchObject({ from: 1000, to: 4600, seconds: 3600, eventId: "e1" });
  });

  it("el suceso del reloj es visible para la mesa: si no, caducaría algo sin que nadie sepa por qué", async () => {
    await service.advance("dm", "c1", { kind: "TIME", seconds: 60 });
    expect(events.record.mock.calls[0][2]).toMatchObject({ visibility: "PLAYERS" });
  });

  describe("viajar es avanzar el reloj, con la tabla del SRD detrás", () => {
    it("seis horas a paso normal son 6 h de reloj y 18 millas", async () => {
      const r = await service.advance("dm", "c1", { kind: "TRAVEL", pace: "NORMAL", hours: 6 });
      expect(r.seconds).toBe(6 * 3600);
      expect(r.miles).toBe(18);
      expect(r.pace).toBe("NORMAL");
    });

    it("**el paso rápido cuesta −5 a la Percepción pasiva**, y el servidor lo dice", async () => {
      const r = await service.advance("dm", "c1", { kind: "TRAVEL", pace: "FAST", hours: 4 });
      expect(r.miles).toBe(16);
      expect(r.passivePerception).toBe(-5);
    });

    it("el paso normal no arrastra un −0 que la pantalla tendría que decidir si pinta", async () => {
      const r = await service.advance("dm", "c1", { kind: "TRAVEL", pace: "NORMAL", hours: 4 });
      expect(r.passivePerception).toBeUndefined();
    });

    it("hasta ocho horas no hay marcha forzada", async () => {
      const r = await service.advance("dm", "c1", { kind: "TRAVEL", pace: "SLOW", hours: 8 });
      expect(r.forcedMarchSaves).toEqual([]);
    });

    it("**a la novena hora se pide una salvación, y la CD sube una por hora**", async () => {
      const r = await service.advance("dm", "c1", { kind: "TRAVEL", pace: "NORMAL", hours: 10 });
      expect(r.forcedMarchSaves).toEqual([
        { hora: 9, dc: 11 },
        { hora: 10, dc: 12 },
      ]);
    });

    it("y avanzar el reloj sin viajar no pide ninguna, aunque sean doce horas", async () => {
      const r = await service.advance("dm", "c1", { kind: "TIME", seconds: 12 * 3600 });
      expect(r.forcedMarchSaves).toEqual([]);
    });
  });
});

describe("el reloj anuncia lo que acaba de vencer (2C.4)", () => {
  // La caducidad no se guarda —es una resta contra el reloj—, pero **el jugador tiene que ver por
  // qué** dejó de estar envenenado. Eso es lo que escribe este suceso.

  let service: GameClockService;
  const prisma = {
    campaign: { findUnique: jest.fn(), update: jest.fn() },
    characterCondition: { findMany: jest.fn() },
    transaction: jest.fn(),
  };
  const membership = { requireMember: jest.fn(), requireDM: jest.fn() };
  const events = { record: jest.fn() };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        GameClockService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: GameEventsService, useValue: events },
      ],
    }).compile();
    service = ref.get(GameClockService);
    jest.resetAllMocks();
    membership.requireDM.mockResolvedValue(undefined);
    prisma.campaign.findUnique.mockResolvedValue({ id: "c1", clockSeconds: 1000 });
    prisma.campaign.update.mockResolvedValue({ id: "c1", clockSeconds: 4600 });
    prisma.transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
    events.record.mockResolvedValue({ id: "e1" });
  });

  it("escribe un CONDITION_EXPIRED por cada una que vence en el tramo", async () => {
    prisma.characterCondition.findMany.mockResolvedValue([
      { key: "poisoned", level: null, expiresAtClock: 2000, characterId: "ch1" },
    ]);

    await service.advance("dm", "c1", { kind: "TIME", seconds: 3600 });

    expect(events.record).toHaveBeenCalledWith(
      "dm",
      "c1",
      expect.objectContaining({
        subjectType: "character",
        subjectId: "ch1",
        visibility: "PLAYERS",
        payload: { type: "CONDITION_EXPIRED", key: "poisoned", expiredAtClock: 2000 },
      }),
      expect.anything(),
    );
  });

  it("y si no vence ninguna, el único suceso es el del reloj", async () => {
    prisma.characterCondition.findMany.mockResolvedValue([]);
    await service.advance("dm", "c1", { kind: "TIME", seconds: 3600 });
    expect(events.record).toHaveBeenCalledTimes(1);
  });
});

describe("salvacionesDeMarchaForzada (SRD 5.1)", () => {
  // «For each additional hour of travel beyond 8 hours […] a Constitution saving throw at the end
  // of the hour. The DC is 10 + 1 for each hour past 8 hours.»
  // https://5thsrd.org/adventuring/movement/

  it("ocho horas o menos no piden nada", () => {
    expect(salvacionesDeMarchaForzada(8)).toEqual([]);
    expect(salvacionesDeMarchaForzada(1)).toEqual([]);
  });

  it("la CD empieza en 11 a la novena hora, no en 10", () => {
    // «10 + 1 for each hour past 8»: a la novena hora ya ha pasado UNA hora de las ocho.
    expect(salvacionesDeMarchaForzada(9)).toEqual([{ hora: 9, dc: 11 }]);
  });

  it("un día entero de marcha son dieciséis salvaciones, hasta CD 26", () => {
    const todas = salvacionesDeMarchaForzada(24);
    expect(todas).toHaveLength(16);
    expect(todas[todas.length - 1]).toEqual({ hora: 24, dc: 26 });
  });
});
