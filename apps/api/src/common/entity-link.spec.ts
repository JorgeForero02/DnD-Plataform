import { BadRequestException } from "@nestjs/common";
import { entityIdsVisibleFor, requireNpcEntity } from "./entity-link";

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
});
