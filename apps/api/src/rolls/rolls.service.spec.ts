import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { Roller } from "../dice/dice";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { PrismaService } from "../prisma/prisma.service";
import { RollsService } from "./rolls.service";

// Tarea 2A.13.
//
// El tirador se inyecta, así que **estas pruebas no dependen del azar**: se le dice qué sale y
// se comprueba qué se clasifica. Probar la clasificación con dados reales sería una prueba que
// falla una vez cada veinte ejecuciones, que es peor que no tenerla.

/** Devuelve los valores dados, en orden, y luego repite el último. */
function dadosFijos(...valores: number[]): Roller {
  let i = 0;
  return () => valores[Math.min(i++, valores.length - 1)];
}

function montar(roller: Roller) {
  const prisma = {
    character: { findFirst: jest.fn() },
    session: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  const membership = { requireMember: jest.fn(), getMembership: jest.fn() };
  const events = { record: jest.fn() };
  const service = new RollsService(
    prisma as unknown as PrismaService,
    membership as unknown as MembershipService,
    events as unknown as GameEventsService,
    roller,
  );
  membership.requireMember.mockResolvedValue(undefined);
  membership.getMembership.mockResolvedValue({ role: "PLAYER" });
  prisma.session.findFirst.mockResolvedValue(null);
  events.record.mockResolvedValue({ id: "e1" });
  return { service, prisma, membership, events };
}

describe("los cuatro resultados se clasifican bien", () => {
  it("sin CD, el resultado es NO_DC — y eso no es un fallo", () => {
    // En la mesa se tira muchas veces sin CD: daño, iniciativa, un dado a secas.
    return montar(dadosFijos(11))
      .service.roll("u1", "c1", { expression: "d20", visibility: "PLAYERS" })
      .then((r) => {
        expect(r.outcome).toBe("NO_DC");
        expect(r.natural).toBe("NONE");
        expect(r.total).toBe(11);
      });
  });

  it("con CD, alcanzarla es SUCCESS; quedarse a uno es FAILURE", async () => {
    const alcanza = await montar(dadosFijos(15)).service.roll("u1", "c1", {
      expression: "d20",
      dc: 15,
      visibility: "PLAYERS",
    });
    const falla = await montar(dadosFijos(14)).service.roll("u1", "c1", {
      expression: "d20",
      dc: 15,
      visibility: "PLAYERS",
    });
    expect(alcanza.outcome).toBe("SUCCESS");
    expect(falla.outcome).toBe("FAILURE");
  });

  it("**un 20 natural que no llega a la CD sigue siendo un 20 natural**", async () => {
    // Son dos hechos distintos y por eso son dos campos. Meterlos en uno obliga a perder uno.
    const r = await montar(dadosFijos(20)).service.roll("u1", "c1", {
      expression: "d20-15",
      dc: 20,
      visibility: "PLAYERS",
    });
    expect(r.natural).toBe("TWENTY");
    expect(r.outcome).toBe("FAILURE");
    expect(r.total).toBe(5);
  });

  it("y un 1 natural que supera la CD sigue siendo un 1 natural", async () => {
    const r = await montar(dadosFijos(1)).service.roll("u1", "c1", {
      expression: "d20+20",
      dc: 10,
      visibility: "PLAYERS",
    });
    expect(r.natural).toBe("ONE");
    expect(r.outcome).toBe("SUCCESS");
  });
});

describe("qué cuenta como natural, y qué no", () => {
  it("con ventaja, el natural es el dado que se CONSERVA, no el que se descarta", async () => {
    const r = await montar(dadosFijos(20, 3)).service.roll("u1", "c1", {
      expression: "2d20kh1",
      visibility: "PLAYERS",
    });
    expect(r.natural).toBe("TWENTY");
    expect(r.kept).toEqual([20]);
    // Lo descartado **no se pierde**: se enseña.
    expect(r.dropped).toEqual([3]);
  });

  it("con desventaja, un 20 descartado NO es un 20 natural", async () => {
    const r = await montar(dadosFijos(20, 2)).service.roll("u1", "c1", {
      expression: "2d20kl1",
      visibility: "PLAYERS",
    });
    expect(r.natural).toBe("NONE");
    expect(r.kept).toEqual([2]);
    expect(r.dropped).toEqual([20]);
  });

  it("un d6 no produce naturales, aunque saque un 1", async () => {
    const r = await montar(dadosFijos(1)).service.roll("u1", "c1", {
      expression: "1d6",
      visibility: "PLAYERS",
    });
    expect(r.natural).toBe("NONE");
  });

  it("tres d20 a la vez no tienen un natural que cantar, y se dice NONE en vez de elegir uno", async () => {
    const r = await montar(dadosFijos(20, 1, 7)).service.roll("u1", "c1", {
      expression: "3d20",
      visibility: "PLAYERS",
    });
    expect(r.natural).toBe("NONE");
  });
});

describe("lo que se devuelve y lo que se escribe", () => {
  it("separa los dados del modificador, con su signo", async () => {
    const { service } = montar(dadosFijos(4, 5));
    const r = await service.roll("u1", "c1", { expression: "2d6+3", visibility: "PLAYERS" });
    expect(r.rolls).toEqual([4, 5]);
    expect(r.modifier).toBe(3);
    expect(r.total).toBe(12);
  });

  it("un modificador negativo cuenta con su signo", async () => {
    const { service } = montar(dadosFijos(10));
    const r = await service.roll("u1", "c1", { expression: "d20-2", visibility: "PLAYERS" });
    expect(r.modifier).toBe(-2);
    expect(r.total).toBe(8);
  });

  it("escribe un GameEvent de tipo ABILITY_ROLL con la visibilidad elegida", async () => {
    const { service, events } = montar(dadosFijos(12));
    await service.roll("u1", "c1", {
      expression: "d20",
      label: "Percepción",
      visibility: "DM_ONLY",
    });
    expect(events.record).toHaveBeenCalledWith(
      "u1",
      "c1",
      expect.objectContaining({
        visibility: "DM_ONLY",
        payload: expect.objectContaining({ type: "ABILITY_ROLL", reason: "Percepción" }),
      }),
    );
  });

  it("una expresión inválida es 400 con su motivo, y NO se escribe nada en el log", async () => {
    const { service, events } = montar(dadosFijos(1));
    await expect(
      service.roll("u1", "c1", { expression: "4d", visibility: "PLAYERS" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(events.record).not.toHaveBeenCalled();
  });
});

describe("la sesión de la tirada", () => {
  it("sin decirla, se usa la que esté en curso", async () => {
    const { service, prisma, events } = montar(dadosFijos(9));
    prisma.session.findFirst.mockResolvedValue({ id: "s-en-curso" });
    await service.roll("u1", "c1", { expression: "d20", visibility: "PLAYERS" });
    expect(events.record.mock.calls[0][2]).toMatchObject({ sessionId: "s-en-curso" });
  });

  it("sin sesión abierta, la tirada queda fuera de sesión en vez de fallar", async () => {
    const { service, events } = montar(dadosFijos(9));
    await service.roll("u1", "c1", { expression: "d20", visibility: "PLAYERS" });
    expect(events.record.mock.calls[0][2]).toMatchObject({ sessionId: null });
  });

  it("una sesión que no es de esta campaña es 404", async () => {
    const { service, prisma } = montar(dadosFijos(9));
    prisma.session.findFirst.mockResolvedValue(null);
    await expect(
      service.roll("u1", "c1", { expression: "d20", sessionId: "s-ajena", visibility: "PLAYERS" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("tirar por un personaje se comprueba en el servidor", () => {
  it("el dueño puede", async () => {
    const { service, prisma, events } = montar(dadosFijos(9));
    prisma.character.findFirst.mockResolvedValue({ id: "ch1", ownerId: "u1" });
    await service.roll("u1", "c1", {
      expression: "d20",
      characterId: "ch1",
      visibility: "PLAYERS",
    });
    expect(events.record.mock.calls[0][2]).toMatchObject({
      subjectType: "character",
      subjectId: "ch1",
    });
  });

  it("el DM también, aunque no sea suyo", async () => {
    const { service, prisma, membership } = montar(dadosFijos(9));
    prisma.character.findFirst.mockResolvedValue({ id: "ch1", ownerId: "otro" });
    membership.getMembership.mockResolvedValue({ role: "DM" });
    await expect(
      service.roll("dm", "c1", { expression: "d20", characterId: "ch1", visibility: "PLAYERS" }),
    ).resolves.toBeDefined();
  });

  it("otro jugador NO puede tirar por la hoja ajena", async () => {
    const { service, prisma, events } = montar(dadosFijos(9));
    prisma.character.findFirst.mockResolvedValue({ id: "ch1", ownerId: "otro" });
    await expect(
      service.roll("u1", "c1", { expression: "d20", characterId: "ch1", visibility: "PLAYERS" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(events.record).not.toHaveBeenCalled();
  });

  it("un personaje de otra campaña es 404, no 403: no se confirma que exista", async () => {
    const { service, prisma } = montar(dadosFijos(9));
    prisma.character.findFirst.mockResolvedValue(null);
    await expect(
      service.roll("u1", "c1", { expression: "d20", characterId: "ch9", visibility: "PLAYERS" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("quien no es miembro no llega ni a tirar", async () => {
    const { service, membership, events } = montar(dadosFijos(9));
    membership.requireMember.mockRejectedValue(new ForbiddenException());
    await expect(
      service.roll("x", "c1", { expression: "d20", visibility: "PLAYERS" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(events.record).not.toHaveBeenCalled();
  });
});
