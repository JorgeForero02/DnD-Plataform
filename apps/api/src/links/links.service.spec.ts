import { Test } from "@nestjs/testing";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { LinksService } from "./links.service";
import { MembershipService } from "../campaigns/membership.service";
import { PrismaService } from "../prisma/prisma.service";
import { GameEventsService } from "../game-events/game-events.service";

describe("LinksService", () => {
  let service: LinksService;
  const prisma = {
    entity: { findUnique: jest.fn() },
    entityLink: { create: jest.fn(), findMany: jest.fn() },
    user: { findUnique: jest.fn() },
    // `create()` escribe el enlace y su suceso en la misma transaccion. La implementacion se
    // pone en `beforeEach` y no aqui: escrita aqui, el doble se referencia a si mismo y
    // TypeScript no puede inferir su tipo (TS7022).
    transaction: jest.fn(),
  };
  const gameEvents = { record: jest.fn() };
  const membership = { requireMember: jest.fn(), requireDM: jest.fn(), getMembership: jest.fn() };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        LinksService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: GameEventsService, useValue: gameEvents },
      ],
    }).compile();
    service = ref.get(LinksService);
    jest.clearAllMocks();
    // `clearAllMocks` borra las llamadas pero **no las implementaciones**: sin esto, el rechazo
    // de la prueba de permisos se cuela en la siguiente. Ya pasó en `game-events` y está
    // documentado allí; aquí se evita de entrada.
    membership.requireDM.mockResolvedValue(undefined);
    // Por el mismo motivo que la linea de arriba: `clearAllMocks` deja `transaction` sin
    // implementacion, y sin ella `create()` devolveria `undefined` en vez de ejecutar su cuerpo.
    prisma.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));
  });

  // **El suceso del enlace.** Hasta el 2026-09-04 `create()` escribia la fila y se callaba: el
  // motor sabia evaluar `ENTITY_LINKED` y nadie lo emitia, asi que una regla armada sobre
  // «cuando se enlacen dos fichas» no se disparaba nunca. Lo que se comprueba es que el suceso
  // sale, con sus dos extremos y su etiqueta.
  it("create() records ENTITY_LINKED with both ends", async () => {
    prisma.entity.findUnique
      .mockResolvedValueOnce({ id: "e1", campaignId: "c1", visibility: "PUBLIC" })
      .mockResolvedValueOnce({ id: "e2", campaignId: "c1", visibility: "PUBLIC" });
    prisma.entityLink.create.mockResolvedValueOnce({ id: "l1" });

    await service.create("u1", "e1", { toId: "e2", label: "vive en" });

    expect(gameEvents.record).toHaveBeenCalledTimes(1);
    const [actor, campaignId, input] = gameEvents.record.mock.calls[0];
    expect(actor).toBe("u1");
    expect(campaignId).toBe("c1");
    expect(input.payload).toEqual({
      type: "ENTITY_LINKED",
      fromId: "e1",
      toId: "e2",
      label: "vive en",
    });
  });

  // **La visibilidad del suceso no se hereda de una de las fichas**, porque el enlace revela que
  // dos cosas tienen que ver aunque no se pueda abrir ninguna. Con las dos a la vista de la mesa
  // no revela nada nuevo; en cuanto una se esconde, la linea es solo del DM.
  it.each([
    ["PUBLIC", "PLAYERS", "PLAYERS"],
    ["PLAYERS", "PLAYERS", "PLAYERS"],
    ["PUBLIC", "DM_ONLY", "DM_ONLY"],
    ["SPECIFIC_PLAYERS", "PUBLIC", "DM_ONLY"],
    ["OWNER_DM", "PLAYERS", "DM_ONLY"],
  ])("create() with %s + %s logs the link as %s", async (desde, hasta, esperada) => {
    prisma.entity.findUnique
      .mockResolvedValueOnce({ id: "e1", campaignId: "c1", visibility: desde })
      .mockResolvedValueOnce({ id: "e2", campaignId: "c1", visibility: hasta });
    prisma.entityLink.create.mockResolvedValueOnce({ id: "l1" });

    await service.create("u1", "e1", { toId: "e2" });

    expect(gameEvents.record.mock.calls[0][2].visibility).toBe(esperada);
  });

  // Un enlace sin etiqueta no manda `label: undefined`: el esquema del payload lo declara
  // opcional, y mandarlo vacio ensucia el `Json` que se guarda para siempre.
  it("create() omits the label when there is none", async () => {
    prisma.entity.findUnique
      .mockResolvedValueOnce({ id: "e1", campaignId: "c1", visibility: "PUBLIC" })
      .mockResolvedValueOnce({ id: "e2", campaignId: "c1", visibility: "PUBLIC" });
    prisma.entityLink.create.mockResolvedValueOnce({ id: "l1" });

    await service.create("u1", "e1", { toId: "e2" });

    expect(gameEvents.record.mock.calls[0][2].payload).not.toHaveProperty("label");
  });

  it("create() rejects a self-link", async () => {
    prisma.entity.findUnique.mockResolvedValueOnce({ id: "e1", campaignId: "c1" });
    await expect(service.create("u1", "e1", { toId: "e1" })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("create() rejects a target in another campaign", async () => {
    prisma.entity.findUnique
      .mockResolvedValueOnce({ id: "e1", campaignId: "c1" }) // from
      .mockResolvedValueOnce({ id: "e2", campaignId: "OTHER" }); // to
    await expect(service.create("u1", "e1", { toId: "e2" })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  // Ayudante: `entityLink.findMany` se llama ahora **dos veces** —salientes por `fromId`,
  // entrantes por `toId`—, así que un `mockResolvedValue` único devolvería filas con la forma
  // equivocada en la segunda llamada. Se despacha por el `where` real, y **comparando con el id
  // de la ficha**: la primera versión solo miraba si existía la clave `fromId`, y con eso una
  // consulta que preguntara por otra ficha seguía devolviendo filas — la prueba de mutación lo
  // cazó, se quedó verde con `where: { toId: "__mutacion__" }`.
  function conEnlaces(entityId: string, salientes: unknown[], entrantes: unknown[]) {
    prisma.entityLink.findMany.mockImplementation((args: { where: Record<string, string> }) => {
      if (args.where.fromId === entityId) return Promise.resolve(salientes);
      if (args.where.toId === entityId) return Promise.resolve(entrantes);
      return Promise.resolve([]);
    });
  }

  const publica = {
    id: "pub",
    name: "Town",
    type: "LOCATION",
    visibility: "PLAYERS",
    createdById: "dm1",
    grants: [],
  };
  const secreta = {
    id: "sec",
    name: "Lair",
    type: "LOCATION",
    visibility: "DM_ONLY",
    createdById: "dm1",
    grants: [],
  };

  it("listFor() hides links whose target the viewer cannot see (real canView)", async () => {
    prisma.entity.findUnique.mockResolvedValue({ id: "e1", campaignId: "c1", createdById: "dm1" });
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    conEnlaces(
      "e1",
      [
        { id: "l1", label: null, to: publica },
        { id: "l2", label: null, to: secreta },
      ],
      [],
    );
    const res = await service.listFor("player1", "e1");
    expect(res.map((l) => l.to.id)).toEqual(["pub"]);
  });

  // L1: el fallo que motivó el bloque. «Corvin vive en la Torre Gris» se guarda una sola vez,
  // desde Corvin; al abrir la Torre, Corvin no aparecía por ningún lado.
  it("listFor() devuelve también los enlaces entrantes, marcados como retroenlace", async () => {
    prisma.entity.findUnique.mockResolvedValue({
      id: "torre",
      campaignId: "c1",
      createdById: "dm1",
    });
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    conEnlaces(
      "torre",
      [],
      [
        {
          id: "l9",
          label: "vive en",
          from: {
            id: "corvin",
            name: "Maestre Corvin",
            type: "NPC",
            visibility: "PLAYERS",
            createdById: "dm1",
            grants: [],
          },
        },
      ],
    );

    const res = await service.listFor("player1", "torre");
    expect(res).toHaveLength(1);
    expect(res[0].direction).toBe("INCOMING");
    expect(res[0].to.name).toBe("Maestre Corvin");
    expect(res[0].label).toBe("vive en");
  });

  it("un retroenlace no revela una ficha que quien mira no puede ver", async () => {
    prisma.entity.findUnique.mockResolvedValue({
      id: "torre",
      campaignId: "c1",
      createdById: "dm1",
    });
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    conEnlaces(
      "torre",
      [],
      [
        { id: "l8", label: "se reúne en", from: secreta },
        { id: "l9", label: "vive en", from: publica },
      ],
    );

    const res = await service.listFor("player1", "torre");
    expect(res.map((l) => l.to.id)).toEqual(["pub"]);
  });

  it("el DM sí ve el retroenlace secreto, y puede quitarlo", async () => {
    prisma.entity.findUnique.mockResolvedValue({
      id: "torre",
      campaignId: "c1",
      createdById: "dm1",
    });
    membership.getMembership.mockResolvedValue({ role: "DM" });
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    conEnlaces("torre", [], [{ id: "l8", label: "se reúne en", from: secreta }]);

    const res = await service.listFor("dm1", "torre");
    expect(res.map((l) => l.to.id)).toEqual(["sec"]);
    expect(res[0].canRemove).toBe(true);
  });

  // `remove` exige DM **o creador del origen**; en un entrante el origen es la otra ficha, así
  // que quien creó esta no puede quitarlo y la pantalla no debe ofrecérselo.
  it("canRemove de un entrante mira al creador de la otra ficha, no al de esta", async () => {
    prisma.entity.findUnique.mockResolvedValue({
      id: "torre",
      campaignId: "c1",
      createdById: "jugador",
    });
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    conEnlaces(
      "torre",
      [{ id: "sal", label: null, to: publica }],
      [{ id: "ent", label: null, from: { ...publica, id: "otra", createdById: "dm1" } }],
    );

    const res = await service.listFor("jugador", "torre");
    expect(res.find((l) => l.id === "sal")!.canRemove).toBe(true);
    expect(res.find((l) => l.id === "ent")!.canRemove).toBe(false);
  });

  // Fix round 1, Low finding 1: `create()` ya exige que las dos fichas sean de la misma
  // campaña, pero eso vive en `create()`, no en el `where` de la consulta — una fila insertada
  // por otra vía con un extremo de otra campaña se habría evaluado igual. El `where` tiene que
  // restringir los DOS lados, no solo `from`.
  it("listForCampaign() restringe los DOS extremos a la campaña en el `where`", async () => {
    membership.getMembership.mockResolvedValue({ role: "DM" });
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    prisma.entityLink.findMany.mockResolvedValue([]);

    await service.listForCampaign("dm1", "c1");

    expect(prisma.entityLink.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { from: { campaignId: "c1" }, to: { campaignId: "c1" } },
      }),
    );
  });

  it("enlazar exige ser DM: un enlace revela que dos cosas tienen que ver", async () => {
    // Aunque el jugador no pueda abrir ninguna de las dos fichas, el enlace ya le cuenta algo.
    prisma.entity.findUnique.mockResolvedValue({ id: "e1", campaignId: "c1" });
    membership.requireDM.mockRejectedValue(new ForbiddenException());

    await expect(service.create("jugador", "e1", { toId: "e2" } as never)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.entityLink.create).not.toHaveBeenCalled();
  });
});
