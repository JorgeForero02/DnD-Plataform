import { Test } from "@nestjs/testing";
import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { SessionsService } from "./sessions.service";
import { MembershipService } from "../campaigns/membership.service";
import { PrismaService } from "../prisma/prisma.service";
import { GameEventsService } from "../game-events/game-events.service";

describe("SessionsService", () => {
  let service: SessionsService;
  const prisma = {
    session: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    entity: { findFirst: jest.fn(), findMany: jest.fn() },
  };
  const membership = { requireDM: jest.fn(), requireMember: jest.fn(), getMembership: jest.fn() };
  const events = { record: jest.fn() };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: GameEventsService, useValue: events },
      ],
    }).compile();
    service = ref.get(SessionsService);
    jest.clearAllMocks();
  });

  it("create() requires DM", async () => {
    membership.requireDM.mockRejectedValue(new ForbiddenException());
    await expect(
      service.create("p1", "c1", { title: "S1", visibility: "PLAYERS" } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("list() hides DM_ONLY sessions from a player", async () => {
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    prisma.session.findMany.mockResolvedValue([
      { id: "s1", visibility: "PLAYERS" },
      { id: "s2", visibility: "DM_ONLY" },
    ]);
    const res = await service.list("p1", "c1");
    expect(res.map((s: any) => s.id)).toEqual(["s1"]);
  });

  it("start() requires DM: a player gets 403", async () => {
    membership.requireDM.mockRejectedValue(new ForbiddenException());
    await expect(service.start("p1", "c1", "s1")).rejects.toBeInstanceOf(ForbiddenException);
    // Y no llega a mirar la sesión: el permiso se comprueba antes de tocar nada.
    expect(prisma.session.findFirst).not.toHaveBeenCalled();
  });

  it("close() requires DM too", async () => {
    membership.requireDM.mockRejectedValue(new ForbiddenException());
    await expect(service.close("p1", "c1", "s1")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("close() on a session that is not running is a 409, not a silent no-op", async () => {
    membership.requireDM.mockResolvedValue(undefined);
    prisma.session.findFirst.mockResolvedValue({ id: "s1", status: "PLANNED" });
    await expect(service.close("dm", "c1", "s1")).rejects.toBeInstanceOf(ConflictException);
  });

  it("start() on a closed session is a 409: una sesión cerrada no se vuelve a abrir", async () => {
    membership.requireDM.mockResolvedValue(undefined);
    prisma.session.findFirst.mockResolvedValue({ id: "s1", status: "CLOSED" });
    await expect(service.start("dm", "c1", "s1")).rejects.toBeInstanceOf(ConflictException);
  });

  it("start() on a session already running is idempotent, not an error", async () => {
    // El DM que pulsa dos veces no merece un error: ya está en curso, que es lo que quería.
    membership.requireDM.mockResolvedValue(undefined);
    prisma.session.findFirst.mockResolvedValue({ id: "s1", status: "IN_PROGRESS" });
    await expect(service.start("dm", "c1", "s1")).resolves.toMatchObject({ status: "IN_PROGRESS" });
  });
  describe("dónde abre la escena (plan 02)", () => {
    function espectador(role: "DM" | "PLAYER") {
      membership.getMembership.mockResolvedValue({ role });
      prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    }

    const santuario = {
      id: "clsantuario00000000000001",
      name: "El Santuario Sellado",
      type: "LOCATION",
      visibility: "DM_ONLY",
      createdById: "dm",
      grants: [],
    };

    it("un jugador que no puede ver la ficha de apertura NO recibe ni su nombre ni su id", async () => {
      espectador("PLAYER");
      prisma.session.findFirst.mockResolvedValue({
        id: "s1",
        visibility: "PLAYERS",
        openingEntityId: santuario.id,
      });
      prisma.entity.findMany.mockResolvedValue([santuario]);

      const visto = (await service.get("p1", "c1", "s1")) as Record<string, unknown>;

      // **Ausente, no `null`.** Un `null` diría «esta sesión no abre en ningún sitio», que aquí es
      // falso; y dejar el id sería confirmar que abre en algo escondido.
      expect("openingEntity" in visto).toBe(false);
      expect("openingEntityId" in visto).toBe(false);
    });

    it("y el DM la recibe entera", async () => {
      espectador("DM");
      prisma.session.findFirst.mockResolvedValue({
        id: "s1",
        visibility: "PLAYERS",
        openingEntityId: santuario.id,
      });
      prisma.entity.findMany.mockResolvedValue([santuario]);

      const visto = (await service.get("dm", "c1", "s1")) as Record<string, unknown>;

      expect(visto.openingEntityId).toBe(santuario.id);
      expect(visto.openingEntity).toEqual({
        id: santuario.id,
        name: "El Santuario Sellado",
        type: "LOCATION",
      });
    });

    it("una ficha PLAYERS sí llega al jugador", async () => {
      espectador("PLAYER");
      prisma.session.findFirst.mockResolvedValue({
        id: "s1",
        visibility: "PLAYERS",
        openingEntityId: santuario.id,
      });
      prisma.entity.findMany.mockResolvedValue([{ ...santuario, visibility: "PLAYERS" }]);

      const visto = (await service.get("p1", "c1", "s1")) as Record<string, unknown>;

      expect(visto.openingEntity).toMatchObject({ name: "El Santuario Sellado" });
    });

    it("una ficha SPECIFIC_PLAYERS llega a quien tiene la concesión, y a nadie más", async () => {
      // `canView` sobre una Entity necesita sus concesiones de verdad. El atajo de `canSee`
      // —`createdById: ""`, `grantedUserIds: []`— habría escondido esta ficha de quien SÍ tiene
      // derecho a verla, que es el fallo contrario a una fuga y por eso ninguna prueba de fuga lo
      // cazaría.
      espectador("PLAYER");
      prisma.session.findFirst.mockResolvedValue({
        id: "s1",
        visibility: "PLAYERS",
        openingEntityId: santuario.id,
      });
      prisma.entity.findMany.mockResolvedValue([
        { ...santuario, visibility: "SPECIFIC_PLAYERS", grants: [{ userId: "p1" }] },
      ]);

      const visto = (await service.get("p1", "c1", "s1")) as Record<string, unknown>;
      expect(visto.openingEntity).toMatchObject({ name: "El Santuario Sellado" });
    });

    it("apuntar la sesión a una ficha de OTRA campaña es 404, no 400", async () => {
      // 404 y no 400 porque un «prohibido» ya confirma que la ficha existe, y quien pregunta no
      // debería saberlo — la regla del 403-que-va-404 de `docs/04-convenciones.md`.
      membership.requireDM.mockResolvedValue(undefined);
      prisma.entity.findFirst.mockResolvedValue(null);
      await expect(
        service.create("dm", "c1", {
          title: "S1",
          visibility: "PLAYERS",
          openingEntityId: santuario.id,
        } as never),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.session.create).not.toHaveBeenCalled();
    });
  });

  describe("la sesión en juego: asistencia, sellos y resumen", () => {
    let service: SessionsService;
    const prisma = {
      session: { findFirst: jest.fn(), update: jest.fn() },
      transaction: jest.fn(),
    };
    const membership = { requireDM: jest.fn(), requireMember: jest.fn(), getMembership: jest.fn() };
    const events = { record: jest.fn().mockResolvedValue({ id: "ev1" }) };

    beforeEach(async () => {
      const ref = await Test.createTestingModule({
        providers: [
          SessionsService,
          { provide: PrismaService, useValue: prisma },
          { provide: MembershipService, useValue: membership },
          { provide: GameEventsService, useValue: events },
        ],
      }).compile();
      service = ref.get(SessionsService);
      jest.clearAllMocks();
      events.record.mockResolvedValue({ id: "ev1" });
      prisma.transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
        cb({ session: { update: prisma.session.update }, gameEvent: {} }),
      );
    });

    it("empezar con asistencia la guarda; empezar sin ella NO borra la que había", async () => {
      // Machacar con `null` al re-arrancar sería perder un dato que alguien se molestó en declarar.
      prisma.session.findFirst.mockResolvedValue({
        id: "s1",
        status: "PLANNED",
        visibility: "PLAYERS",
      });
      prisma.session.update.mockResolvedValue({ id: "s1", title: "S", visibility: "PLAYERS" });

      await service.start("dm1", "c1", "s1", {
        attendance: [{ userId: "u1", characterId: "ch1" }],
      });
      expect(prisma.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ attendance: [{ userId: "u1", characterId: "ch1" }] }),
        }),
      );

      jest.clearAllMocks();
      prisma.session.findFirst.mockResolvedValue({
        id: "s1",
        status: "PLANNED",
        visibility: "PLAYERS",
      });
      prisma.session.update.mockResolvedValue({ id: "s1", title: "S", visibility: "PLAYERS" });
      prisma.transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
        cb({ session: { update: prisma.session.update } }),
      );
      await service.start("dm1", "c1", "s1", {});
      expect(prisma.session.update.mock.calls[0][0].data).not.toHaveProperty("attendance");
    });

    it("un sello lo puede poner CUALQUIER miembro, no solo el DM", async () => {
      // Decisión deliberada: la crítica más repetida a las herramientas de crónica es que un
      // bloque que solo escribe el DM se queda vacío.
      prisma.session.findFirst.mockResolvedValue({ id: "s9", status: "IN_PROGRESS" });

      await service.stampNote("jugador", "c1", { kind: "COMBAT", visibility: "PLAYERS" });

      expect(membership.requireMember).toHaveBeenCalledWith("c1", "jugador");
      expect(membership.requireDM).not.toHaveBeenCalled();
    });

    it("el sello se cuelga de la sesión EN CURSO, que la busca el servidor", async () => {
      prisma.session.findFirst.mockResolvedValue({ id: "s9", status: "IN_PROGRESS" });

      await service.stampNote("dm1", "c1", { kind: "NPC", text: "Kellan", visibility: "PLAYERS" });

      expect(events.record).toHaveBeenCalledWith(
        "dm1",
        "c1",
        expect.objectContaining({
          sessionId: "s9",
          payload: expect.objectContaining({ type: "SESSION_NOTE", kind: "NPC", text: "Kellan" }),
        }),
      );
    });

    it("sin sesión en curso, sellar es un 409: no hay dónde colgarlo", async () => {
      prisma.session.findFirst.mockResolvedValue(null);

      await expect(
        service.stampNote("dm1", "c1", { kind: "NOTE", visibility: "PLAYERS" }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(events.record).not.toHaveBeenCalled();
    });

    it("cerrar guarda el resumen en su COLUMNA, no dentro de `notes`", async () => {
      prisma.session.findFirst.mockResolvedValue({
        id: "s1",
        status: "IN_PROGRESS",
        visibility: "PLAYERS",
        startedAt: new Date(),
      });
      prisma.session.update.mockResolvedValue({
        id: "s1",
        title: "S",
        visibility: "PLAYERS",
        recapVisibility: "PLAYERS",
      });

      await service.close("dm1", "c1", "s1", {
        recap: "Huyeron del puerto",
        recapVisibility: "PLAYERS",
      });

      const llamada = prisma.session.update.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(llamada.data.recap).toBe("Huyeron del puerto");
      // **Y `notes` no se toca.** Ahí lo escribe el motor de reglas como array de cadenas
      // (`ADD_SESSION_NOTE`), así que una nota de una regla se llevaba la crónica por delante.
      expect(llamada.data).not.toHaveProperty("notes");
    });

    it("**la crónica se publica con SU visibilidad, no con la de la sesión**", async () => {
      // El caso que importa: una sesión `DM_ONLY` cuya crónica sí se publica a la mesa. Con el
      // defecto —`visibility: closed.visibility`— el suceso salía `DM_ONLY` y elegir quién ve la
      // crónica no hacía absolutamente nada.
      prisma.session.findFirst.mockResolvedValue({
        id: "s1",
        status: "IN_PROGRESS",
        visibility: "DM_ONLY",
        startedAt: new Date(),
      });
      prisma.session.update.mockResolvedValue({
        id: "s1",
        title: "S",
        visibility: "DM_ONLY",
        recapVisibility: "PLAYERS",
      });

      await service.close("dm1", "c1", "s1", {
        recap: "Lo que la mesa sí puede leer",
        recapVisibility: "PLAYERS",
      });

      expect(events.record).toHaveBeenCalledWith(
        "dm1",
        "c1",
        expect.objectContaining({ visibility: "PLAYERS" }),
        expect.anything(),
      );
    });

    it("y al revés: sesión PLAYERS con crónica DM_ONLY", async () => {
      prisma.session.findFirst.mockResolvedValue({
        id: "s1",
        status: "IN_PROGRESS",
        visibility: "PLAYERS",
        startedAt: new Date(),
      });
      prisma.session.update.mockResolvedValue({
        id: "s1",
        title: "S",
        visibility: "PLAYERS",
        recapVisibility: "DM_ONLY",
      });

      await service.close("dm1", "c1", "s1", {
        recap: "Lo que el DM se guarda",
        recapVisibility: "DM_ONLY",
      });

      expect(events.record).toHaveBeenCalledWith(
        "dm1",
        "c1",
        expect.objectContaining({ visibility: "DM_ONLY" }),
        expect.anything(),
      );
    });
  });
});
