import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Test } from "@nestjs/testing";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { GAME_EVENT_TYPES, gameEventPayloadSchema } from "@dnd/shared";
import { MembershipService } from "../campaigns/membership.service";
import { PrismaService } from "../prisma/prisma.service";
import { conBuzonDeSucesos } from "../common/after-commit";
import { GameEventsService } from "./game-events.service";

// Tarea 2A.5.

describe("el enum de Prisma y la unión de Zod no se separan", () => {
  // Es **el riesgo declarado** del §1.6 del plan: los dos lados se mantienen a mano. Esta
  // prueba es barata y evita el fallo obvio — un tipo nuevo escrito en un sitio y no en el otro.
  const schema = readFileSync(join(__dirname, "..", "..", "prisma", "schema.prisma"), "utf8");
  const enumBlock = /enum GameEventType \{([^}]*)\}/.exec(schema);

  it("el bloque del enum existe en schema.prisma", () => {
    expect(enumBlock).not.toBeNull();
  });

  it("el enum de Prisma tiene exactamente los tipos de @dnd/shared, sin sobras ni faltas", () => {
    const enPrisma = (enumBlock![1].match(/^\s*([A-Z_]+)\s*$/gm) ?? []).map((l) => l.trim());
    expect(enPrisma.sort()).toEqual([...GAME_EVENT_TYPES].sort());
  });

  it.each([...GAME_EVENT_TYPES])("%s tiene su miembro en la unión discriminada", (type) => {
    const miembro = gameEventPayloadSchema.options.find(
      (option) => option.shape.type.value === type,
    );
    expect(miembro).toBeDefined();
  });
});

describe("GameEventsService", () => {
  let service: GameEventsService;
  const prisma = {
    gameEvent: { create: jest.fn(), findMany: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  const membership = { requireMember: jest.fn(), getMembership: jest.fn() };
  // El emisor es por donde el motor de reglas escucha. Se simula para que la unitaria siga sin
  // saber que el motor existe: `record` emite, y quién escuche es problema de otro módulo.
  const emitter = { emitAsync: jest.fn() };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        GameEventsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();
    service = ref.get(GameEventsService);
    // `clearAllMocks` borra las llamadas pero **no las implementaciones**: sin volver a
    // resolver `requireMember`, el rechazo de una prueba anterior se cuela en la siguiente.
    jest.resetAllMocks();
    membership.requireMember.mockResolvedValue(undefined);
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
  });

  it("record() valida el payload al escribir: un evento mal formado no llega a la base", async () => {
    await expect(
      service.record("u1", "c1", {
        subjectType: "session",
        subjectId: "s1",
        visibility: "PLAYERS",
        // Un `SESSION_STARTED` sin título. Nadie lo escribiría a mano, pero el `payload` es un
        // `Json` en la base y esta es la única barrera que tiene.
        payload: { type: "SESSION_STARTED" } as never,
      }),
    ).rejects.toThrow();
    expect(prisma.gameEvent.create).not.toHaveBeenCalled();
  });

  it("record() guarda el tipo como columna, no solo dentro del payload", async () => {
    prisma.gameEvent.create.mockResolvedValue({ id: "e1" });
    await service.record("u1", "c1", {
      sessionId: "s1",
      subjectType: "session",
      subjectId: "s1",
      visibility: "PLAYERS",
      payload: { type: "SESSION_STARTED", sessionTitle: "La cripta" },
    });
    expect(prisma.gameEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "SESSION_STARTED", campaignId: "c1" }),
      }),
    );
  });

  it("list() esconde al jugador los eventos DM_ONLY", async () => {
    prisma.gameEvent.findMany.mockResolvedValue([
      { id: "e1", visibility: "PLAYERS", actorUserId: "dm" },
      { id: "e2", visibility: "DM_ONLY", actorUserId: "dm" },
    ]);
    const res = await service.list("p1", "c1", { limit: 50 });
    expect(res.events.map((e) => e.id)).toEqual(["e1"]);
  });

  it("el DM sí los ve", async () => {
    membership.getMembership.mockResolvedValue({ role: "DM" });
    prisma.gameEvent.findMany.mockResolvedValue([
      { id: "e1", visibility: "PLAYERS", actorUserId: "dm" },
      { id: "e2", visibility: "DM_ONLY", actorUserId: "dm" },
    ]);
    const res = await service.list("dm", "c1", { limit: 50 });
    expect(res.events.map((e) => e.id)).toEqual(["e1", "e2"]);
  });

  it("el cursor sale de la última fila TRAÍDA, no de la última visible", async () => {
    // Si saliera de la visible, una página entera de eventos DM_ONLY dejaría al jugador
    // atascado: cursor nulo con log por leer. Es el fallo que este orden evita.
    prisma.gameEvent.findMany.mockResolvedValue([
      { id: "e1", visibility: "DM_ONLY", actorUserId: "dm" },
      { id: "e2", visibility: "DM_ONLY", actorUserId: "dm" },
    ]);
    const res = await service.list("p1", "c1", { limit: 2 });
    expect(res.events).toEqual([]);
    expect(res.nextCursor).toBe("e2");
  });

  it("una página incompleta significa que no hay más, y el cursor es nulo", async () => {
    prisma.gameEvent.findMany.mockResolvedValue([
      { id: "e1", visibility: "PLAYERS", actorUserId: "dm" },
    ]);
    const res = await service.list("p1", "c1", { limit: 50 });
    expect(res.nextCursor).toBeNull();
  });

  it("list() exige ser miembro antes de mirar nada", async () => {
    membership.requireMember.mockRejectedValue(new Error("403"));
    await expect(service.list("x", "c1", { limit: 50 })).rejects.toThrow();
    expect(prisma.gameEvent.findMany).not.toHaveBeenCalled();
  });

  it("filtrar por sesión llega a la consulta como columna, no como filtro en memoria", async () => {
    prisma.gameEvent.findMany.mockResolvedValue([]);
    await service.list("p1", "c1", { limit: 50, sessionId: "s9" });
    expect(prisma.gameEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { campaignId: "c1", sessionId: "s9" } }),
    );
  });

  it("record() emite el suceso para que el motor de reglas lo escuche", async () => {
    // **El motor escucha; no se le llama.** Al revés habría un ciclo entre los dos módulos —el
    // motor escribe eventos, los eventos disparan el motor— que Nest solo resolvería con un
    // `forwardRef`, que es esconder el ciclo en vez de quitarlo.
    prisma.gameEvent.create.mockResolvedValue({ id: "e1" });
    await service.record("u1", "c1", {
      subjectType: "session",
      subjectId: "s1",
      visibility: "PLAYERS",
      payload: { type: "SESSION_STARTED", sessionTitle: "La cripta" },
    });
    expect(emitter.emitAsync).toHaveBeenCalledWith(
      "game_event.recorded",
      expect.objectContaining({ campaignId: "c1", type: "SESSION_STARTED" }),
    );
  });

  it("con una transacción abierta, la emisión espera al commit y no se dispara dentro", async () => {
    // **Es la ficha M2B-3.** El motor de reglas trabaja por OTRA conexión: si se emite con la
    // transacción abierta, lee el mundo de antes del suceso y sus efectos quedan fuera de la
    // transacción — sobreviven a un cambio deshecho.
    prisma.gameEvent.create.mockResolvedValue({ id: "e1" });
    emitter.emitAsync.mockResolvedValue([]);
    const orden: string[] = [];

    await conBuzonDeSucesos(async () => {
      await service.record(
        "u1",
        "c1",
        {
          subjectType: "session",
          subjectId: "s1",
          visibility: "PLAYERS",
          payload: { type: "SESSION_STARTED", sessionTitle: "La cripta" },
        },
        prisma as never,
      );
      // Dentro de la transacción: escrito, pero todavía sin emitir.
      expect(emitter.emitAsync).not.toHaveBeenCalled();
      orden.push("commit");
    });

    orden.push("emitido");
    expect(emitter.emitAsync).toHaveBeenCalledTimes(1);
    expect(orden).toEqual(["commit", "emitido"]);
  });

  it("si la transacción se deshace, el suceso no se emite nunca", async () => {
    prisma.gameEvent.create.mockResolvedValue({ id: "e1" });
    emitter.emitAsync.mockResolvedValue([]);

    await expect(
      conBuzonDeSucesos(async () => {
        await service.record(
          "u1",
          "c1",
          {
            subjectType: "session",
            subjectId: "s1",
            visibility: "PLAYERS",
            payload: { type: "SESSION_STARTED", sessionTitle: "La cripta" },
          },
          prisma as never,
        );
        throw new Error("la transacción se deshace");
      }),
    ).rejects.toThrow("la transacción se deshace");

    expect(emitter.emitAsync).not.toHaveBeenCalled();
  });

  it("sin transacción, record() espera al motor en vez de dejarlo suelto", async () => {
    // `emit` no se esperaba, así que el comentario que prometía «el motor evalúa dentro de la
    // petición» era falso. Con `emitAsync` esperado, la promesa de `record` incluye al motor.
    prisma.gameEvent.create.mockResolvedValue({ id: "e1" });
    let terminado = false;
    emitter.emitAsync.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 5));
      terminado = true;
      return [];
    });

    await service.record("u1", "c1", {
      subjectType: "session",
      subjectId: "s1",
      visibility: "PLAYERS",
      payload: { type: "SESSION_STARTED", sessionTitle: "La cripta" },
    });

    expect(terminado).toBe(true);
  });

  it("si el evento no llega a escribirse, tampoco se emite nada", async () => {
    prisma.gameEvent.create.mockRejectedValue(new Error("base caida"));
    await expect(
      service.record("u1", "c1", {
        subjectType: "session",
        subjectId: "s1",
        visibility: "PLAYERS",
        payload: { type: "SESSION_STARTED", sessionTitle: "La cripta" },
      }),
    ).rejects.toThrow();
    expect(emitter.emitAsync).not.toHaveBeenCalled();
  });
});

describe("ver el log por los ojos de otro jugador", () => {
  let service: GameEventsService;
  const prisma = {
    gameEvent: { create: jest.fn(), findMany: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  const membership = { requireMember: jest.fn(), getMembership: jest.fn() };
  const emitter = { emitAsync: jest.fn() };

  const eventos = [
    { id: "e1", visibility: "PLAYERS", actorUserId: "dm1" },
    { id: "e2", visibility: "DM_ONLY", actorUserId: "dm1" },
  ];

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        GameEventsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();
    service = ref.get(GameEventsService);
    jest.resetAllMocks();
    prisma.gameEvent.findMany.mockResolvedValue(eventos);
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
  });

  it("el DM ve los suyos y los DM_ONLY; mirando como jugador, ve MENOS", async () => {
    // El punto entero: `as` no relaja nada, aprieta. Sigue filtrando `canView`, con otro
    // espectador. Es la única forma honesta de que el DM confíe en los cinco niveles.
    membership.requireMember.mockResolvedValue({ role: "DM" });
    membership.getMembership.mockResolvedValue({ role: "DM" });

    const suyo = await service.list("dm1", "c1", { limit: 50 });
    expect(suyo.events.map((e) => e.id)).toEqual(["e1", "e2"]);

    membership.getMembership.mockImplementation((_c: string, u: string) =>
      Promise.resolve({ role: u === "dm1" ? "DM" : "PLAYER" }),
    );
    const comoJugador = await service.list("dm1", "c1", { limit: 50, as: "jug1" });
    expect(comoJugador.events.map((e) => e.id)).toEqual(["e1"]);
  });

  it("un jugador NO puede mirar por los ojos de otro", async () => {
    membership.requireMember.mockResolvedValue({ role: "PLAYER" });

    await expect(service.list("jug1", "c1", { limit: 50, as: "jug2" })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.gameEvent.findMany).not.toHaveBeenCalled();
  });

  it("pedir por alguien que no es de la campaña es 404, no un oráculo de existencia", async () => {
    membership.requireMember.mockResolvedValue({ role: "DM" });
    membership.getMembership.mockResolvedValue(null);

    await expect(service.list("dm1", "c1", { limit: 50, as: "ajeno" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
