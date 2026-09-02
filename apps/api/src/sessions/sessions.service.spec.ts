import { Test } from "@nestjs/testing";
import { ConflictException, ForbiddenException } from "@nestjs/common";
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
});

describe("la sesión en juego: asistencia, sellos y resumen", () => {
  let service: SessionsService;
  const prisma = {
    session: { findFirst: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
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
    prisma.$transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
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

    await service.start("dm1", "c1", "s1", { attendance: [{ userId: "u1", characterId: "ch1" }] });
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
    prisma.$transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
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

  it("cerrar guarda el resumen en `notes`", async () => {
    prisma.session.findFirst.mockResolvedValue({
      id: "s1",
      status: "IN_PROGRESS",
      visibility: "PLAYERS",
      startedAt: new Date(),
    });
    prisma.session.update.mockResolvedValue({ id: "s1", title: "S", visibility: "PLAYERS" });

    await service.close("dm1", "c1", "s1", {
      recap: "Huyeron del puerto",
      recapVisibility: "PLAYERS",
    });

    expect(prisma.session.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ notes: { recap: "Huyeron del puerto" } }),
      }),
    );
  });
});
