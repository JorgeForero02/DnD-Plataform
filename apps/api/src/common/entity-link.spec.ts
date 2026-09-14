import { BadRequestException } from "@nestjs/common";
import { entityIdsVisibleFor, raiseLiveBodies, requireNpcEntity, sinEntityId } from "./entity-link";

describe("entity-link", () => {
  const dm = { userId: "dm", role: "DM" as const, isAdmin: false };
  const player = { userId: "pl", role: "PLAYER" as const, isAdmin: false };

  it("requireNpcEntity: 400 si no existe, es de otra campaña o no es NPC", async () => {
    const db = { entity: { findFirst: jest.fn().mockResolvedValue(null) } };
    await expect(requireNpcEntity(db as any, "c1", "e1")).rejects.toThrow(BadRequestException);
    expect(db.entity.findFirst).toHaveBeenCalledWith({
      where: { id: "e1", campaignId: "c1", type: "NPC" },
      include: { grants: true },
    });
  });

  it("requireNpcEntity devuelve la ficha cuando es un PNJ de la campaña", async () => {
    const ficha = { id: "e1", campaignId: "c1", type: "NPC", grants: [] };
    const db = { entity: { findFirst: jest.fn().mockResolvedValue(ficha) } };
    await expect(requireNpcEntity(db as any, "c1", "e1")).resolves.toBe(ficha);
  });

  it("entityIdsVisibleFor: el jugador solo recibe las fichas que canView le deja ver", async () => {
    const db = {
      entity: {
        findMany: jest.fn().mockResolvedValue([
          { id: "vis", visibility: "PLAYERS", createdById: "dm", grants: [] },
          { id: "oculta", visibility: "DM_ONLY", createdById: "dm", grants: [] },
        ]),
      },
    };
    const set = await entityIdsVisibleFor(db as any, player, ["vis", "oculta", null]);
    expect([...set]).toEqual(["vis"]);
    expect(db.entity.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["vis", "oculta"] } },
      include: { grants: true },
    });
  });

  it("entityIdsVisibleFor: sin ids no consulta la base", async () => {
    const db = { entity: { findMany: jest.fn() } };
    const set = await entityIdsVisibleFor(db as any, dm, [null, null]);
    expect(set.size).toBe(0);
    expect(db.entity.findMany).not.toHaveBeenCalled();
  });

  describe("sinEntityId (PM-1, cierre 2026-09-14)", () => {
    it("quita el campo entityId sin tocar el resto de la fila", () => {
      const fila = { id: "c1", name: "Garrik", entityId: "e1" };
      expect(sinEntityId(fila)).toEqual({ id: "c1", name: "Garrik" });
    });

    it("quita entityId aunque sea null", () => {
      const fila = { id: "c1", name: "Garrik", entityId: null };
      const resultado = sinEntityId(fila);
      expect(resultado).toEqual({ id: "c1", name: "Garrik" });
      expect("entityId" in resultado).toBe(false);
    });
  });

  describe("raiseLiveBodies (I3, ola de cierre) — revelar una ficha sube sus cuerpos vivos", () => {
    const gameEvents = { record: jest.fn().mockResolvedValue(undefined) };

    beforeEach(() => jest.clearAllMocks());

    it("sube cada cuerpo por debajo de la mesa y escribe un NPC_REVEALED por cada uno", async () => {
      const tx = {
        character: {
          findMany: jest.fn().mockResolvedValue([
            { id: "g1", name: "Bandido 1", visibility: "DM_ONLY" },
            { id: "g2", name: "Bandido 2", visibility: "SPECIFIC_PLAYERS" },
          ]),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };

      await raiseLiveBodies(
        tx as any,
        { campaignId: "c1", entityId: "e1", entityName: "Garrik", userId: "dm" },
        gameEvents as any,
      );

      expect(tx.character.findMany).toHaveBeenCalledWith({
        where: {
          entityId: "e1",
          campaignId: "c1",
          archivedAt: null,
          visibility: { in: ["DM_ONLY", "OWNER_DM", "SPECIFIC_PLAYERS"] },
        },
        select: { id: true, name: true, visibility: true },
      });
      expect(tx.character.updateMany).toHaveBeenCalledTimes(2);
      expect(gameEvents.record).toHaveBeenCalledTimes(2);
      expect(gameEvents.record).toHaveBeenCalledWith(
        "dm",
        "c1",
        {
          subjectType: "character",
          subjectId: "g1",
          visibility: "PLAYERS",
          payload: { type: "NPC_REVEALED", characterName: "Bandido 1", entityName: "Garrik" },
        },
        tx,
        undefined,
      );
    });

    it("m2: si el `updateMany` de un cuerpo ve count 0 (otra transacción ganó la carrera), no escribe su suceso", async () => {
      const tx = {
        character: {
          findMany: jest
            .fn()
            .mockResolvedValue([{ id: "g1", name: "Bandido", visibility: "DM_ONLY" }]),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
      };

      await raiseLiveBodies(
        tx as any,
        { campaignId: "c1", entityId: "e1", entityName: "Garrik", userId: "dm" },
        gameEvents as any,
      );

      expect(gameEvents.record).not.toHaveBeenCalled();
    });

    it("sin cuerpos, no toca la base de escrituras ni escribe ningún suceso", async () => {
      const tx = {
        character: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn() },
      };

      await raiseLiveBodies(
        tx as any,
        { campaignId: "c1", entityId: "e1", entityName: "Garrik", userId: "dm" },
        gameEvents as any,
      );

      expect(tx.character.updateMany).not.toHaveBeenCalled();
      expect(gameEvents.record).not.toHaveBeenCalled();
    });

    it("pasa la marca `fromRulesEngine` a `gameEvents.record`, para el camino del motor", async () => {
      const tx = {
        character: {
          findMany: jest
            .fn()
            .mockResolvedValue([{ id: "g1", name: "Bandido", visibility: "DM_ONLY" }]),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };

      await raiseLiveBodies(
        tx as any,
        { campaignId: "c1", entityId: "e1", entityName: "Garrik", userId: "dm" },
        gameEvents as any,
        { fromRulesEngine: true },
      );

      expect(gameEvents.record).toHaveBeenCalledWith(
        "dm",
        "c1",
        expect.objectContaining({ payload: expect.objectContaining({ type: "NPC_REVEALED" }) }),
        tx,
        { fromRulesEngine: true },
      );
    });
  });
});
