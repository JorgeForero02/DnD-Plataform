import { Test } from "@nestjs/testing";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { RulesEngineService } from "./rules-engine.service";

// I3 (ola de cierre, 2026-09-14) — la TERCERA puerta de revelar una ficha (`REVEAL_ENTITY` del
// motor de reglas) también sube los cuerpos vivos enlazados, con `raiseLiveBodies`
// (`common/entity-link.ts`), y su escritura entra ahora en `this.prisma.transaction` en vez de
// un `updateMany` suelto — lo mismo que ya hacía `EntitiesService.update` (E-PM-5).
//
// `resolveProposal` es el camino más barato de ejercitar `applyRealEffects` (privado) sin montar
// `evaluate()` entero: aplica exactamente los efectos que ya trae la traza, sin recalcular nada.

describe("RulesEngineService — REVEAL_ENTITY del motor sube también los cuerpos vivos (I3)", () => {
  let service: RulesEngineService;

  const txCharacter = {
    findMany: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  };
  const txEntity = { updateMany: jest.fn().mockResolvedValue({ count: 1 }) };
  const tx = { entity: txEntity, character: txCharacter };

  const prisma = {
    entity: { findFirst: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    ruleTrace: { findFirst: jest.fn(), update: jest.fn() },
    rule: { update: jest.fn() },
    transaction: jest.fn((fn: (t: unknown) => unknown) => fn(tx)),
  };
  const membership = { requireDM: jest.fn().mockResolvedValue(undefined) };
  const gameEvents = {
    record: jest.fn().mockResolvedValue(undefined),
    recordFromEngine: jest.fn().mockResolvedValue(undefined),
  };
  const notifications = {};

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        RulesEngineService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: GameEventsService, useValue: gameEvents },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();
    service = ref.get(RulesEngineService);
    jest.clearAllMocks();
    prisma.transaction.mockImplementation((fn: (t: unknown) => unknown) => fn(tx));
    txCharacter.updateMany.mockResolvedValue({ count: 1 });
    txCharacter.findMany.mockResolvedValue([]);
    txEntity.updateMany.mockResolvedValue({ count: 1 });
  });

  const efectoRevelar = {
    effect: {
      kind: "REVEAL_ENTITY" as const,
      entityId: "clentity000000000000000001",
      visibility: "PLAYERS" as const,
    },
    before: "DM_ONLY",
    after: "PLAYERS",
  };

  function conTraza(effects: unknown[]) {
    prisma.ruleTrace.findFirst.mockResolvedValue({
      id: "trace1",
      campaignId: "c1",
      status: "PROPOSED",
      delegatedByUserId: "dm",
      effects,
      reason: null,
    });
  }

  it("sube la ficha y sus cuerpos vivos EN LA MISMA transacción, con un NPC_REVEALED por cuerpo", async () => {
    prisma.entity.findFirst.mockResolvedValue({ name: "Garrik" });
    txCharacter.findMany.mockResolvedValue([
      { id: "g1", name: "Bandido 1", visibility: "DM_ONLY" },
      { id: "g2", name: "Bandido 2", visibility: "OWNER_DM" },
    ]);
    conTraza([efectoRevelar]);

    await service.resolveProposal("dm", "c1", "trace1", { action: "APPLY" });

    expect(prisma.transaction).toHaveBeenCalledTimes(1);
    expect(txEntity.updateMany).toHaveBeenCalledWith({
      where: { id: "clentity000000000000000001", campaignId: "c1" },
      data: { visibility: "PLAYERS" },
    });
    expect(gameEvents.recordFromEngine).toHaveBeenCalledWith(
      "dm",
      "c1",
      expect.objectContaining({ payload: expect.objectContaining({ type: "ENTITY_REVEALED" }) }),
      tx,
    );
    // `raiseLiveBodies`: un cuerpo por debajo de la mesa, un `NPC_REVEALED` cada uno, en la MISMA tx.
    expect(txCharacter.findMany).toHaveBeenCalledWith({
      where: {
        entityId: "clentity000000000000000001",
        campaignId: "c1",
        archivedAt: null,
        visibility: { in: ["DM_ONLY", "OWNER_DM", "SPECIFIC_PLAYERS"] },
      },
      select: { id: true, name: true, visibility: true },
    });
    expect(txCharacter.updateMany).toHaveBeenCalledTimes(2);
    // `raiseLiveBodies` escribe con `gameEvents.record` (no `recordFromEngine`): es
    // `recordFromEngine` quien la llama por debajo pasándole la marca en `options`.
    const npcRevelados = gameEvents.record.mock.calls.filter(
      (c) => (c[2] as { payload: { type: string } }).payload.type === "NPC_REVEALED",
    );
    expect(npcRevelados).toHaveLength(2);
    // Marcado como venido del motor, igual que el `ENTITY_REVEALED` que lo acompaña — para que
    // el propio motor no confunda su eco con un hecho del mundo.
    expect(npcRevelados[0][4]).toEqual({ fromRulesEngine: true });
  });

  it("una ficha SPECIFIC_PLAYERS revelada por el motor no sube cuerpos: la mesa no la ve entera", async () => {
    const efectoAConcedidos = {
      effect: {
        kind: "REVEAL_ENTITY" as const,
        entityId: "clentity000000000000000002",
        visibility: "SPECIFIC_PLAYERS" as const,
      },
      before: "DM_ONLY",
      after: "SPECIFIC_PLAYERS",
    };
    prisma.entity.findFirst.mockResolvedValue({ name: "Garrik" });
    conTraza([efectoAConcedidos]);

    await service.resolveProposal("dm", "c1", "trace1", { action: "APPLY" });

    expect(txCharacter.findMany).not.toHaveBeenCalled();
  });

  it("HIDE_ENTITY no abre transacción ni toca cuerpos: ocultar la ficha no baja a nadie", async () => {
    const efectoOcultar = {
      effect: {
        kind: "HIDE_ENTITY" as const,
        entityId: "clentity000000000000000003",
        visibility: "DM_ONLY" as const,
      },
      before: "PLAYERS",
      after: "DM_ONLY",
    };
    prisma.entity.findFirst.mockResolvedValue({ name: "Garrik" });
    conTraza([efectoOcultar]);

    await service.resolveProposal("dm", "c1", "trace1", { action: "APPLY" });

    expect(prisma.transaction).not.toHaveBeenCalled();
    expect(gameEvents.recordFromEngine).not.toHaveBeenCalled();
  });
});
