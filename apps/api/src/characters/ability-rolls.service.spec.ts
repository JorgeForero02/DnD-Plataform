import { BadRequestException, ForbiddenException } from "@nestjs/common";
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
});
