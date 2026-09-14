import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { PrismaService } from "../prisma/prisma.service";
import { XpService } from "./xp.service";

// Puerta de efectos §5 bis (D-CF-68/D-CF-69, tarea 5). Dobles de Prisma como el resto de la
// carpeta: `transaction` ejecuta el callback con el propio doble, así que `tx.$queryRaw` y
// `tx.gameEvent` son los mismos mocks que fuera de la transacción.
//
// **La suma la hace la base** (ola de arreglos 1, Important 2): `award` no lee `xp` y escribe un
// absoluto, manda un `UPDATE … SET xp = GREATEST(0, xp + amount) … RETURNING xp, xpAntes`. El doble
// de `$queryRaw` simula esa sentencia sobre `saldos`, un mapa id → xp que hace de tabla, para que
// la prueba mida lo que la sentencia devuelve y no lo que el servicio habría calculado en memoria.

function montar(saldos: Record<string, number> = {}) {
  const prisma: Record<string, any> = {
    character: { findMany: jest.fn() },
    $queryRaw: jest.fn(async (_sql: TemplateStringsArray, ...valores: unknown[]) => {
      // La plantilla de `award` interpola, en orden: id, campaignId, amount, id.
      const [id, , amount] = valores as [string, string, number, string];
      if (!(id in saldos)) return [];
      const xpAntes = saldos[id];
      saldos[id] = Math.max(0, xpAntes + amount);
      return [{ xp: saldos[id], xpAntes }];
    }),
    transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
  };
  const membership = { requireDM: jest.fn().mockResolvedValue({ role: "DM" }) };
  const events = { record: jest.fn().mockResolvedValue({ id: "ev1" }) };

  const service = new XpService(
    prisma as unknown as PrismaService,
    membership as unknown as MembershipService,
    events as unknown as GameEventsService,
  );
  return { service, prisma, membership, events };
}

function personaje(
  overrides: Partial<{
    id: string;
    name: string;
    xp: number;
    visibility: string;
    statblockRef: string | null;
  }> = {},
) {
  return {
    id: "ch1",
    name: "Elara",
    xp: 0,
    visibility: "PLAYERS",
    statblockRef: null,
    ...overrides,
  };
}

describe("XpService.award", () => {
  it("exige DM: un jugador se lleva lo que requireDM lance, sin tocar nada", async () => {
    const { service, membership, prisma } = montar();
    membership.requireDM.mockRejectedValue(new ForbiddenException());

    await expect(
      service.award("jugador", "c1", { characterIds: ["ch1"], amount: 50 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("un characterId con statblockRef: 400 ANTES de escribir nada, ni siquiera a los demás", async () => {
    const { service, prisma } = montar();
    prisma.character.findMany.mockResolvedValue([
      personaje({ id: "pj1" }),
      personaje({ id: "pnj1", statblockRef: "SRD:goblin" }),
    ]);

    await expect(
      service.award("dm", "c1", { characterIds: ["pj1", "pnj1"], amount: 100 }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("un id que no está en la campaña (o archivado) da 404", async () => {
    const { service, prisma } = montar();
    // `findMany` filtra por campaignId y archivedAt: si vuelve menos filas que ids pedidos, falta
    // alguno.
    prisma.character.findMany.mockResolvedValue([personaje({ id: "pj1" })]);

    await expect(
      service.award("dm", "c1", { characterIds: ["pj1", "fantasma"], amount: 50 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("dos personajes válidos y amount 450: dos UPDATE que suman en la base y dos XP_AWARDED con el xpTotal devuelto", async () => {
    const saldos = { a: 100, b: 0 };
    const { service, prisma, events } = montar(saldos);
    prisma.character.findMany.mockResolvedValue([personaje({ id: "a" }), personaje({ id: "b" })]);

    const res = await service.award("dm", "c1", {
      characterIds: ["a", "b"],
      amount: 450,
      reason: "Derrotan al goblin",
    });

    expect(res).toEqual({
      awarded: [
        { characterId: "a", xp: 550 },
        { characterId: "b", xp: 450 },
      ],
    });
    // Lo que quedó en la «tabla», no lo que el servicio calculó aparte: es la base quien suma.
    expect(saldos).toEqual({ a: 550, b: 450 });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(events.record).toHaveBeenCalledTimes(2);
    expect(events.record).toHaveBeenCalledWith(
      "dm",
      "c1",
      expect.objectContaining({
        subjectType: "character",
        subjectId: "a",
        visibility: "PLAYERS",
        payload: {
          type: "XP_AWARDED",
          characterId: "a",
          amount: 450,
          xpTotal: 550,
          reason: "Derrotan al goblin",
        },
      }),
      expect.anything(),
    );
  });

  // Menor 3 del barrido PE-1: los personajes se bloquean (`FOR UPDATE`) en orden fijo por `id`,
  // no en el orden en que `findMany` los devolvió ni en el que mandó el cliente — mismo criterio
  // que `destinatariosOrdenados` en `ActivitiesService`, para no interbloquear con una petición
  // concurrente que pida los mismos personajes en orden inverso.
  it("bloquea los personajes por `id` ascendente, no en el orden que devolvió `findMany`", async () => {
    const saldos = { a: 0, b: 0 };
    const { service, prisma } = montar(saldos);
    // `findMany` los devuelve en el orden «de la base» — aquí, deliberadamente al revés del
    // alfabético — para que la prueba no dependa de que ya vinieran ordenados.
    prisma.character.findMany.mockResolvedValue([personaje({ id: "b" }), personaje({ id: "a" })]);

    await service.award("dm", "c1", { characterIds: ["b", "a"], amount: 10 });

    const idsEnOrden = prisma.$queryRaw.mock.calls.map(
      (llamada: [TemplateStringsArray, ...unknown[]]) => llamada[1],
    );
    expect(idsEnOrden).toEqual(["a", "b"]);
  });

  it("amount -600 sobre xp 100: xp nunca baja de 0, y XP_AWARDED.amount es el delta EFECTIVO (-100) con xpTotal 0", async () => {
    // Hasta la ola de arreglos 1 el suceso decía «-600» con total 0: la crónica habría leído
    // «pierde 600 PX» sobre alguien que tenía 100. Se registra lo que de verdad se movió, como
    // `HP_CHANGED` registra el daño reducido y no el bruto.
    const saldos = { a: 100 };
    const { service, prisma, events } = montar(saldos);
    prisma.character.findMany.mockResolvedValue([personaje({ id: "a" })]);

    const res = await service.award("dm", "c1", { characterIds: ["a"], amount: -600 });

    expect(res.awarded).toEqual([{ characterId: "a", xp: 0 }]);
    expect(saldos.a).toBe(0);
    expect(events.record).toHaveBeenCalledWith(
      "dm",
      "c1",
      expect.objectContaining({
        payload: expect.objectContaining({ amount: -100, xpTotal: 0 }),
      }),
      expect.anything(),
    );
  });

  it("el xpTotal del suceso es el que devolvió la base tras sumar, no la lectura previa más amount (Important 2: lost update)", async () => {
    // Simula que OTRA concesión se coló entre el `findMany` y el `UPDATE`: la «tabla» dice 300
    // aunque nadie en esta llamada haya leído ese número. Con la lectura previa + amount el
    // suceso habría dicho 50 y la fila 300 + 50; con la suma en la base los dos dicen 350.
    const saldos = { a: 300 };
    const { service, prisma, events } = montar(saldos);
    prisma.character.findMany.mockResolvedValue([personaje({ id: "a" })]);

    const res = await service.award("dm", "c1", { characterIds: ["a"], amount: 50 });

    expect(res.awarded).toEqual([{ characterId: "a", xp: 350 }]);
    expect(events.record).toHaveBeenCalledWith(
      "dm",
      "c1",
      expect.objectContaining({ payload: expect.objectContaining({ amount: 50, xpTotal: 350 }) }),
      expect.anything(),
    );
  });

  it("todo ocurre dentro de prisma.transaction, y la suma va por ESE cliente", async () => {
    const { service, prisma } = montar({ a: 0 });
    prisma.character.findMany.mockResolvedValue([personaje({ id: "a" })]);

    await service.award("dm", "c1", { characterIds: ["a"], amount: 10 });

    expect(prisma.transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
