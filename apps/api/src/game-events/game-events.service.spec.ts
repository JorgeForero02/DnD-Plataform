import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Test } from "@nestjs/testing";
import { GAME_EVENT_TYPES, gameEventPayloadSchema } from "@dnd/shared";
import { MembershipService } from "../campaigns/membership.service";
import { PrismaService } from "../prisma/prisma.service";
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

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        GameEventsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
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
});
