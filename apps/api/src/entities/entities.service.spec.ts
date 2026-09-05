import { Test } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { WorldStateService } from "../world-state/world-state.service";
import { EntitiesService } from "./entities.service";
import { MembershipService } from "../campaigns/membership.service";
import { PrismaService } from "../prisma/prisma.service";
import { GameEventsService } from "../game-events/game-events.service";

describe("EntitiesService", () => {
  let service: EntitiesService;
  const prisma = {
    entity: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    // Las concesiones de ANTES: hacen falta para saber si la audiencia creció, y `update` las
    // pide aparte porque `requireEditable` no las trae. Por defecto, ninguna.
    entityVisibilityGrant: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findUnique: jest.fn() },
    // `transaction` simula lo que hace `PrismaService.transaction` de verdad: corre `fn` con un
    // `tx` propio de la prueba (ver `txMock` abajo), que trae los métodos que usa `update()` y
    // que `entity.findFirst`/`create` no cubren.
    transaction: jest.fn(),
  };
  const membership = { requireMember: jest.fn(), requireDM: jest.fn(), getMembership: jest.fn() };
  const events = { emit: jest.fn() };
  const worldState = { recordEntityOpened: jest.fn().mockResolvedValue(undefined) };
  const gameEvents = { record: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        EntitiesService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: EventEmitter2, useValue: events },
        { provide: WorldStateService, useValue: worldState },
        { provide: GameEventsService, useValue: gameEvents },
      ],
    }).compile();
    service = ref.get(EntitiesService);
    jest.clearAllMocks();
    // `clearAllMocks` borra las llamadas pero **no las implementaciones**: sin esto, el rechazo
    // de la prueba de permisos se cuela en la siguiente. Ya pasó en `game-events` y está
    // documentado allí; aquí se evita de entrada.
    membership.requireDM.mockResolvedValue(undefined);
    prisma.transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(txMock()));
  });

  function txMock(entityUpdateResult?: unknown) {
    return {
      entityVisibilityGrant: { deleteMany: jest.fn(), createMany: jest.fn() },
      entity: { update: jest.fn().mockResolvedValue(entityUpdateResult) },
    };
  }

  it("crear una ficha del mundo exige ser DM, no solo miembro", async () => {
    // Lo señaló el DM probando con un jugador dentro: podía crear PNJ, lugares y misiones, y con
    // ello veía el andamiaje entero de construir mundo. Escribir el mundo no es su papel.
    membership.requireDM.mockRejectedValue(new ForbiddenException());

    await expect(
      service.create("jugador", "c1", {
        type: "NPC",
        name: "X",
        tags: [],
        visibility: "PLAYERS",
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.entity.create).not.toHaveBeenCalled();
  });

  it("create() writes grants for SPECIFIC_PLAYERS and emits entity.created", async () => {
    prisma.entity.create.mockResolvedValue({ id: "e1", type: "NPC" });
    await service.create("dm1", "c1", {
      type: "NPC",
      name: "Strahd",
      tags: [],
      visibility: "SPECIFIC_PLAYERS",
      specificPlayerIds: ["p1", "p2"],
    } as any);
    const arg = prisma.entity.create.mock.calls[0][0];
    expect(arg.data.grants).toEqual({ create: [{ userId: "p1" }, { userId: "p2" }] });
    expect(arg.data.createdById).toBe("dm1");
    expect(events.emit).toHaveBeenCalledWith("entity.created", {
      campaignId: "c1",
      entityId: "e1",
      type: "NPC",
    });
  });

  it("list() hides entities the viewer cannot see (real canView)", async () => {
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    prisma.entity.findMany.mockResolvedValue([
      { id: "pub", visibility: "PUBLIC", createdById: "dm1", grants: [] },
      { id: "sec", visibility: "DM_ONLY", createdById: "dm1", grants: [] },
      { id: "pl", visibility: "PLAYERS", createdById: "dm1", grants: [] },
    ]);
    const res = await service.list("player1", "c1");
    expect(res.map((e: any) => e.id).sort()).toEqual(["pl", "pub"]);
  });

  it("remove() rejects a player who is neither DM nor creator", async () => {
    prisma.entity.findFirst.mockResolvedValue({ id: "e1", createdById: "someoneElse" });
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    await expect(service.remove("player1", "c1", "e1")).rejects.toBeInstanceOf(ForbiddenException);
  });

  describe("get() y el suceso ENTITY_OPENED", () => {
    const laFicha = {
      id: "e9",
      type: "NPC",
      name: "Cripta",
      visibility: "PLAYERS",
      createdById: "dm1",
      grants: [],
    };

    it("un jugador que la abre SÍ dispara el suceso (es el caso que justifica el motor)", async () => {
      prisma.entity.findFirst.mockResolvedValue(laFicha);
      prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });

      await service.get("jugador", "c1", "e9");

      expect(worldState.recordEntityOpened).toHaveBeenCalledWith(
        "jugador",
        "c1",
        "e9",
        "NPC",
        "Cripta",
      );
    });

    it("el DM abriendo sus propias notas NO lo dispara: prepararía la sesión disparándose reglas a sí mismo", async () => {
      prisma.entity.findFirst.mockResolvedValue(laFicha);
      prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
      membership.getMembership.mockResolvedValue({ role: "DM" });

      await service.get("dm1", "c1", "e9");

      expect(worldState.recordEntityOpened).not.toHaveBeenCalled();
    });

    it("el creador de la ficha tampoco lo dispara, aunque no sea el DM", async () => {
      prisma.entity.findFirst.mockResolvedValue({ ...laFicha, createdById: "autor" });
      prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });

      await service.get("autor", "c1", "e9");

      expect(worldState.recordEntityOpened).not.toHaveBeenCalled();
    });
  });

  describe("update() y el suceso ENTITY_REVEALED (ficha P1 de docs/06-pendientes.md)", () => {
    const laFichaOculta = {
      id: "e9",
      type: "LOCATION",
      name: "El Puerto Viejo",
      visibility: "DM_ONLY",
      createdById: "dm1",
    };

    beforeEach(() => {
      membership.getMembership.mockResolvedValue({ role: "DM" });
    });

    it("subir la visibilidad emite ENTITY_REVEALED con el nombre de la ficha y la visibilidad NUEVA", async () => {
      prisma.entity.findFirst.mockResolvedValue(laFichaOculta);
      const tx = txMock({ ...laFichaOculta, visibility: "PLAYERS", grants: [] });
      prisma.transaction.mockImplementation((fn: (t: unknown) => unknown) => fn(tx));

      await service.update("dm1", "c1", "e9", { visibility: "PLAYERS" } as never);

      expect(gameEvents.record).toHaveBeenCalledWith(
        "dm1",
        "c1",
        {
          subjectType: "campaign",
          subjectId: "e9",
          visibility: "PLAYERS",
          // D-OP-12: los sucesos ya nombran. `PLAYERS` no nombra a nadie —lo ve la mesa entera—,
          // así que la lista viaja vacía; un `SPECIFIC_PLAYERS` llevaría los concedidos.
          grantedUserIds: [],
          payload: { type: "ENTITY_REVEALED", entityName: "El Puerto Viejo" },
        },
        tx,
      );
    });

    it("bajar la visibilidad NO emite nada — bajar no es revelar", async () => {
      const fichaVisible = { ...laFichaOculta, visibility: "PLAYERS" };
      prisma.entity.findFirst.mockResolvedValue(fichaVisible);
      const tx = txMock({ ...fichaVisible, visibility: "DM_ONLY", grants: [] });
      prisma.transaction.mockImplementation((fn: (t: unknown) => unknown) => fn(tx));

      await service.update("dm1", "c1", "e9", { visibility: "DM_ONLY" } as never);

      expect(gameEvents.record).not.toHaveBeenCalled();
    });

    it("no tocar la visibilidad NO emite nada, aunque cambien otros campos", async () => {
      prisma.entity.findFirst.mockResolvedValue(laFichaOculta);
      const tx = txMock({ ...laFichaOculta, name: "El Puerto Nuevo", grants: [] });
      prisma.transaction.mockImplementation((fn: (t: unknown) => unknown) => fn(tx));

      await service.update("dm1", "c1", "e9", { name: "El Puerto Nuevo" } as never);

      expect(gameEvents.record).not.toHaveBeenCalled();
    });

    it("un salto de un solo nivel (DM_ONLY → OWNER_DM) también cuenta como subir", async () => {
      prisma.entity.findFirst.mockResolvedValue(laFichaOculta);
      const tx = txMock({ ...laFichaOculta, visibility: "OWNER_DM", grants: [] });
      prisma.transaction.mockImplementation((fn: (t: unknown) => unknown) => fn(tx));

      await service.update("dm1", "c1", "e9", { visibility: "OWNER_DM" } as never);

      expect(gameEvents.record).toHaveBeenCalledTimes(1);
    });
  });
});
