import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { abilityRollAttemptSchema } from "@dnd/shared";
import type { Roller } from "../dice/dice";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { PrismaService } from "../prisma/prisma.service";
import { CharactersService } from "./characters.service";
import { AbilityRollsService } from "./ability-rolls.service";

// Tarea 3 (reglas de la mesa) — dobles de Prisma como en `level-up.service.spec.ts`: `transaction`
// ejecuta el callback con el propio doble, así que `tx.abilityRollAttempt` y `tx.gameEvent` (que
// aquí no hace falta) son los mismos mocks que `prisma.abilityRollAttempt`.

function dadoFijo(valor: number): Roller {
  return () => valor;
}

function montar(roller: Roller = dadoFijo(4)) {
  const prisma: Record<string, any> = {
    campaign: {
      findUnique: jest.fn().mockResolvedValue({
        id: "c1",
        tableRules: {
          abilities: { metodo: "DADOS", expresion: "3d6", intentos: 2, asignacionLibre: true },
        },
      }),
    },
    abilityRollAttempt: {
      findFirst: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      create: jest
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({ id: "a1", createdAt: new Date(), ...data }),
        ),
      findMany: jest.fn().mockResolvedValue([]),
    },
    gameEvent: { findMany: jest.fn().mockResolvedValue([]) },
    // Ola de arreglos 1 (M-1): la transacción empieza tomando el candado de la fila del
    // personaje (`SELECT … FOR UPDATE`), como `level-up.service.ts`.
    $queryRaw: jest.fn().mockResolvedValue([{ id: "ch1" }]),
    transaction: jest.fn((fn) => fn(prisma)),
  };
  const membership = { requireMember: jest.fn().mockResolvedValue({ role: "PLAYER" }) };
  const characters = {
    requireEditable: jest.fn().mockResolvedValue({ id: "ch1", campaignId: "c1", ownerId: "pl" }),
  };
  const events = { record: jest.fn().mockResolvedValue({ id: "ev1" }) };

  const service = new AbilityRollsService(
    prisma as unknown as PrismaService,
    membership as unknown as MembershipService,
    characters as unknown as CharactersService,
    events as unknown as GameEventsService,
    roller,
  );
  return { service, prisma, membership, characters, events };
}

describe("AbilityRollsService", () => {
  it("tira seis veces con la expresión del DM, escribe seis ABILITY_ROLL OWNER_DM y la fila del intento en la misma transacción", async () => {
    const { service, prisma, events } = montar();

    const r = await service.roll("pl", "c1", "ch1");

    expect(r.values).toEqual([12, 12, 12, 12, 12, 12]);
    expect(r.attempt).toBe(1);
    expect(r.of).toBe(2);
    expect(events.record).toHaveBeenCalledTimes(6);
    expect(events.record).toHaveBeenCalledWith(
      "pl",
      "c1",
      expect.objectContaining({
        visibility: "OWNER_DM",
        subjectType: "character",
        subjectId: "ch1",
        payload: expect.objectContaining({
          type: "ABILITY_ROLL",
          expression: "3d6",
          reason: "Característica",
        }),
      }),
      expect.anything(), // tx
    );
    expect(prisma.abilityRollAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          characterId: "ch1",
          values: [12, 12, 12, 12, 12, 12],
          chosen: false,
        }),
      }),
    );
  });

  it("M-1: toma el candado de la fila del personaje ANTES de contar los intentos, dentro de la transacción", async () => {
    const { service, prisma } = montar();

    await service.roll("pl", "c1", "ch1");

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    const [sql, ...valores] = (prisma.$queryRaw as jest.Mock).mock.calls[0] as [
      string[],
      ...unknown[],
    ];
    expect(sql.join("?")).toMatch(/SELECT id FROM "Character" WHERE id = \? FOR UPDATE/);
    expect(valores).toEqual(["ch1"]);
    // El candado va primero: dos POST a la vez se ponen en fila antes de que ninguno cuente, y
    // el segundo ve el intento del primero (Postgres corre en READ COMMITTED).
    expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.abilityRollAttempt.count.mock.invocationCallOrder[0],
    );
    // Y dentro de la transacción, no fuera de ella.
    expect(prisma.transaction.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.$queryRaw.mock.invocationCallOrder[0],
    );
  });

  it("el intento N+1 es 409 NO_MORE_ATTEMPTS y no tira nada", async () => {
    const { service, prisma, events } = montar();
    prisma.abilityRollAttempt.count.mockResolvedValue(2);

    await expect(service.roll("pl", "c1", "ch1")).rejects.toMatchObject({
      response: expect.objectContaining({ code: "NO_MORE_ATTEMPTS" }),
    });
    expect(events.record).not.toHaveBeenCalled();
  });

  it("con un intento ya elegido es 409 ABILITIES_FIXED", async () => {
    const { service, prisma } = montar();
    prisma.abilityRollAttempt.findFirst.mockResolvedValue({ id: "a1", chosen: true });

    await expect(service.roll("pl", "c1", "ch1")).rejects.toMatchObject({
      response: expect.objectContaining({ code: "ABILITIES_FIXED" }),
    });
  });

  it("si la regla no es DADOS es 400", async () => {
    const { service, prisma } = montar();
    prisma.campaign.findUnique.mockResolvedValue({ id: "c1", tableRules: {} });

    await expect(service.roll("pl", "c1", "ch1")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("otro jugador que no es dueño ni DM no puede tirar (requireEditable → 403)", async () => {
    const { service, characters } = montar();
    characters.requireEditable.mockRejectedValue(new ForbiddenException());

    await expect(service.roll("otro", "c1", "ch1")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("list: con la regla en MATRIZ las filas no llevan `of` (M-5) y cada una cumple abilityRollAttemptSchema (M-4)", async () => {
    const { service, prisma } = montar();
    prisma.campaign.findUnique.mockResolvedValue({
      tableRules: { abilities: { metodo: "MATRIZ" } },
    });
    prisma.abilityRollAttempt.findMany.mockResolvedValue([
      {
        id: "a1",
        characterId: "c1",
        values: [15, 14, 13, 12, 10, 8],
        chosen: false,
        rollEventIds: ["e1", "e2", "e3", "e4", "e5", "e6"],
        createdAt: new Date("2026-09-17T10:00:00Z"),
      },
    ]);
    prisma.gameEvent.findMany.mockResolvedValue(
      ["e1", "e2", "e3", "e4", "e5", "e6"].map((id, i) => ({
        id,
        payload: {
          expression: "4d6kh3",
          rolls: [6, 5, 4, 1],
          kept: [6, 5, 4],
          dropped: [1],
          modifier: 0,
          total: 15 - i,
        },
      })),
    );

    const filas = await service.list("dm", "camp", "c1");

    expect(filas).toHaveLength(1);
    expect(filas[0].of).toBeUndefined();
    expect(() => abilityRollAttemptSchema.parse(filas[0])).not.toThrow();
  });
});
