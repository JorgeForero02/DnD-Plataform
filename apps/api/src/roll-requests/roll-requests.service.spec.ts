import { Test } from "@nestjs/testing";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { MembershipService } from "../campaigns/membership.service";
import { CharacterSheetService } from "../characters/character-sheet.service";
import { EncountersService } from "../encounters/encounters.service";
import { GameEventsService } from "../game-events/game-events.service";
import { PrismaService } from "../prisma/prisma.service";
import { RollsService } from "../rolls/rolls.service";
import { RollRequestsService } from "./roll-requests.service";

// Tarea 2C.5.

describe("RollRequestsService", () => {
  let service: RollRequestsService;
  const prisma = {
    character: { findMany: jest.fn() },
    rollRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    transaction: jest.fn(),
  };
  const membership = { requireDM: jest.fn(), requireMember: jest.fn() };
  const rolls = { roll: jest.fn() };
  const sheets = { getSheet: jest.fn() };
  // Tarea 3: `answer` escribe la iniciativa en el combatiente cuando la petición viene de un
  // encuentro (`peticion.encounterId`). Ninguna de las peticiones de este fichero lleva
  // `encounterId`, así que esta rama no se ejerce aquí — sí en `iniciativa-pedida.e2e-spec.ts`,
  // contra Postgres real, que es donde importa que escriba de verdad.
  const encounters = { aplicarIniciativaDePeticion: jest.fn() };
  const events = { record: jest.fn() };

  const hojaCon = (derived: Record<string, { key: string; total: number; steps: [] }>) => ({
    sheet: { derived, speeds: {}, warnings: [] },
  });

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        RollRequestsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: RollsService, useValue: rolls },
        { provide: CharacterSheetService, useValue: sheets },
        { provide: EncountersService, useValue: encounters },
        { provide: GameEventsService, useValue: events },
      ],
    }).compile();
    service = ref.get(RollRequestsService);
    jest.resetAllMocks();
    membership.requireDM.mockResolvedValue({ role: "DM" });
    membership.requireMember.mockResolvedValue({ role: "PLAYER" });
    prisma.transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
    // Cerrar la petición es ahora un `updateMany` con la condición dentro del `where`: si no tocó
    // ninguna fila, otra respuesta ganó la carrera.
    prisma.rollRequest.updateMany.mockResolvedValue({ count: 1 });
    prisma.rollRequest.create.mockImplementation(({ data }: { data: unknown }) => ({
      id: "rr1",
      ...(data as object),
    }));
    rolls.roll.mockResolvedValue({ revealed: true, eventId: "e1", total: 17 });
    sheets.getSheet.mockResolvedValue(
      hojaCon({ "skill.perception": { key: "skill.perception", total: 5, steps: [] } }),
    );
  });

  describe("pedir", () => {
    it("**una petición por personaje**, aunque el DM pida a tres a la vez", async () => {
      // Así cada uno tira con SU modificador, y el registro no tiene que desenredar después quién
      // de los tres falló.
      prisma.character.findMany.mockResolvedValue([{ id: "a" }, { id: "b" }, { id: "c" }]);

      const creadas = await service.create("dm", "c1", {
        characterIds: ["a", "b", "c"],
        key: "skill.perception",
        label: "Percepción",
        mode: "NORMAL",
        audience: "PUBLIC",
      });

      expect(creadas).toHaveLength(3);
      expect(prisma.rollRequest.create).toHaveBeenCalledTimes(3);
    });

    it("pedir es del DM: un jugador no puede", async () => {
      membership.requireDM.mockRejectedValue(new ForbiddenException());
      await expect(
        service.create("jugador", "c1", {
          characterIds: ["a"],
          key: "skill.perception",
          label: "Percepción",
          mode: "NORMAL",
          audience: "PUBLIC",
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.rollRequest.create).not.toHaveBeenCalled();
    });

    it("**si uno de los personajes no es de la campaña, no se escribe ninguna**", async () => {
      // Con la comprobación dentro del bucle quedarían dos peticiones escritas y un error, que es
      // el peor de los dos mundos.
      prisma.character.findMany.mockResolvedValue([{ id: "a" }, { id: "b" }]);
      await expect(
        service.create("dm", "c1", {
          characterIds: ["a", "b", "ajeno"],
          key: "skill.perception",
          label: "Percepción",
          mode: "NORMAL",
          audience: "PUBLIC",
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.rollRequest.create).not.toHaveBeenCalled();
    });
  });

  describe("listar", () => {
    it("el DM ve las de la campaña entera", async () => {
      membership.requireMember.mockResolvedValue({ role: "DM" });
      prisma.rollRequest.findMany.mockResolvedValue([]);
      await service.list("dm", "c1", { includeResolved: false });
      expect(prisma.rollRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { campaignId: "c1", resolvedAt: null } }),
      );
    });

    it("**un jugador solo ve las de sus personajes**, y el filtro va en la consulta", async () => {
      prisma.rollRequest.findMany.mockResolvedValue([]);
      await service.list("jugador", "c1", { includeResolved: false });
      expect(prisma.rollRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            campaignId: "c1",
            character: { ownerId: "jugador" },
            resolvedAt: null,
          },
        }),
      );
    });

    it("**por defecto solo las pendientes**: es lo que sondea la pantalla", async () => {
      // El cuerpo de esta prueba comprobaba `includeResolved: true`, o sea **el caso contrario al
      // que su nombre prometía**. Lo cazó una revisión: quien leyera la lista de pruebas creería
      // que el defecto está cubierto, y no lo estaba.
      prisma.rollRequest.findMany.mockResolvedValue([]);
      await service.list("jugador", "c1", { includeResolved: false });
      expect(prisma.rollRequest.findMany.mock.calls[0][0].where.resolvedAt).toBeNull();
    });

    it("y con `includeResolved` salen también las respondidas", async () => {
      prisma.rollRequest.findMany.mockResolvedValue([]);
      await service.list("jugador", "c1", { includeResolved: true });
      expect(prisma.rollRequest.findMany.mock.calls[0][0].where.resolvedAt).toBeUndefined();
    });

    // Ronda de arreglo 1 (tarea 9) — el modificador de cada fila pendiente.
    it("una fila pendiente trae su modificador, calculado con la misma hoja que usa `answer()`", async () => {
      prisma.rollRequest.findMany.mockResolvedValue([
        {
          id: "rr1",
          characterId: "ch1",
          key: "skill.perception",
          resolvedAt: null,
        },
      ]);
      sheets.getSheet.mockResolvedValue(
        hojaCon({ "skill.perception": { key: "skill.perception", total: 5, steps: [] } }),
      );

      const [fila] = await service.list("jugador", "c1", { includeResolved: false });

      expect(fila.modifier).toBe(5);
      expect(sheets.getSheet).toHaveBeenCalledWith("jugador", "c1", "ch1");
    });

    it("una hoja que no deriva manda `null`, y no revienta el resto del listado", async () => {
      prisma.rollRequest.findMany.mockResolvedValue([
        { id: "rr1", characterId: "ch1", key: "skill.perception", resolvedAt: null },
        { id: "rr2", characterId: "ch2", key: "skill.perception", resolvedAt: null },
      ]);
      sheets.getSheet
        .mockResolvedValueOnce({ sheet: null }) // ch1: le faltan características, raza o clase.
        .mockResolvedValueOnce(
          hojaCon({ "skill.perception": { key: "skill.perception", total: 3, steps: [] } }),
        );

      const filas = await service.list("jugador", "c1", { includeResolved: false });

      expect(filas[0].modifier).toBeNull();
      expect(filas[1].modifier).toBe(3);
    });

    it("una petición ya respondida no recalcula: su modificador es `null` sin tocar la hoja", async () => {
      prisma.rollRequest.findMany.mockResolvedValue([
        { id: "rr1", characterId: "ch1", key: "skill.perception", resolvedAt: new Date() },
      ]);

      const [fila] = await service.list("jugador", "c1", { includeResolved: true });

      expect(fila.modifier).toBeNull();
      expect(sheets.getSheet).not.toHaveBeenCalled();
    });
  });

  describe("responder", () => {
    const pendiente = {
      id: "rr1",
      campaignId: "c1",
      characterId: "ch1",
      key: "skill.perception",
      label: "Percepción",
      dc: 14,
      mode: "NORMAL",
      audience: "PUBLIC",
      resolvedAt: null,
      character: { id: "ch1", ownerId: "jugador" },
    };

    it("**el modificador se lee de la hoja al tirar**, no se guardó al pedir", async () => {
      // Es la razón de que la petición guarde una clave y no una expresión: si el jugador sube de
      // nivel entre que se pide y se tira, el número correcto es el de ahora.
      prisma.rollRequest.findFirst.mockResolvedValue(pendiente);
      sheets.getSheet.mockResolvedValue(
        hojaCon({ "skill.perception": { key: "skill.perception", total: 7, steps: [] } }),
      );

      await service.answer("jugador", "c1", "rr1", { spendInspiration: false });

      expect(rolls.roll).toHaveBeenCalledWith(
        "jugador",
        "c1",
        expect.objectContaining({
          expression: "1d20+7",
          label: "Percepción",
          characterId: "ch1",
          dc: 14,
          // **El modo y la audiencia que pidió el DM llegan a la tirada**, y no se comprobaban en
          // ninguna de las trece pruebas del fichero: un cambio que mandara siempre `NORMAL`
          // dejaría a la mesa sin la ventaja que el DM pidió y la suite seguiría verde. Lo cazó una
          // revisión, y es el mismo patrón del susto anterior: la propiedad que el fichero más
          // defiende es la que nadie medía.
          mode: "NORMAL",
          audience: "PUBLIC",
        }),
      );
    });

    it("un modificador de cero no escribe un `+0`, que el evaluador no entiende", async () => {
      prisma.rollRequest.findFirst.mockResolvedValue(pendiente);
      sheets.getSheet.mockResolvedValue(
        hojaCon({ "skill.perception": { key: "skill.perception", total: 0, steps: [] } }),
      );
      await service.answer("jugador", "c1", "rr1", { spendInspiration: false });
      expect(rolls.roll.mock.calls[0][2].expression).toBe("1d20");
    });

    it("y uno negativo va con su signo", async () => {
      prisma.rollRequest.findFirst.mockResolvedValue(pendiente);
      sheets.getSheet.mockResolvedValue(
        hojaCon({ "skill.perception": { key: "skill.perception", total: -1, steps: [] } }),
      );
      await service.answer("jugador", "c1", "rr1", { spendInspiration: false });
      expect(rolls.roll.mock.calls[0][2].expression).toBe("1d20-1");
    });

    it("la ventaja y la audiencia que pidió el DM se respetan al tirar", async () => {
      prisma.rollRequest.findFirst.mockResolvedValue({
        ...pendiente,
        mode: "ADVANTAGE",
        audience: "BLIND",
      });
      await service.answer("jugador", "c1", "rr1", { spendInspiration: false });
      expect(rolls.roll.mock.calls[0][2]).toMatchObject({
        mode: "ADVANTAGE",
        audience: "BLIND",
      });
    });

    it("**otro jugador no puede responder por ti**, y recibe 404, no 403", async () => {
      prisma.rollRequest.findFirst.mockResolvedValue(pendiente);
      // **404 y no 403**: un 403 confirmaría que esa petición existe en esta campaña.
      await expect(
        service.answer("otro", "c1", "rr1", { spendInspiration: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(rolls.roll).not.toHaveBeenCalled();
    });

    it("el DM sí puede responderla: es la misma regla que tirar por un personaje", async () => {
      membership.requireMember.mockResolvedValue({ role: "DM" });
      prisma.rollRequest.findFirst.mockResolvedValue(pendiente);
      await expect(
        service.answer("dm", "c1", "rr1", { spendInspiration: false }),
      ).resolves.toBeDefined();
    });

    it("una petición ya respondida no se responde dos veces", async () => {
      prisma.rollRequest.findFirst.mockResolvedValue({ ...pendiente, resolvedAt: new Date() });
      await expect(
        service.answer("jugador", "c1", "rr1", { spendInspiration: false }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(rolls.roll).not.toHaveBeenCalled();
    });

    it("**pedir un valor que la hoja no deriva es un 400**, no una tirada de 1d20+0", async () => {
      // Un cero silencioso es un número que la mesa se cree.
      prisma.rollRequest.findFirst.mockResolvedValue({ ...pendiente, key: "skill.inventada" });
      await expect(
        service.answer("jugador", "c1", "rr1", { spendInspiration: false }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(rolls.roll).not.toHaveBeenCalled();
    });

    it("**se marca respondida DESPUÉS de tirar**: si la tirada falla, el botón sigue ahí", async () => {
      prisma.rollRequest.findFirst.mockResolvedValue(pendiente);
      rolls.roll.mockRejectedValue(new Error("la base se cayó"));
      await expect(
        service.answer("jugador", "c1", "rr1", { spendInspiration: false }),
      ).rejects.toThrow();
      expect(prisma.rollRequest.updateMany).not.toHaveBeenCalled();
    });

    it("**dos respuestas a la vez no dan dos tiradas**: gana la que cierre la fila", async () => {
      // Doble clic, o dos pestañas: las dos leen `resolvedAt: null` y las dos pasan el `if`. Lo
      // que lo cierra es la condición dentro del `where`, que es la base garantizando lo que un
      // `if` no puede.
      prisma.rollRequest.findFirst.mockResolvedValue(pendiente);
      prisma.rollRequest.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.answer("jugador", "c1", "rr1", { spendInspiration: false }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("y al responderla queda atada a la tirada que la respondió", async () => {
      prisma.rollRequest.findFirst.mockResolvedValue(pendiente);
      await service.answer("jugador", "c1", "rr1", { spendInspiration: false });
      expect(prisma.rollRequest.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // **La condición va en el `where`**, no en un `if` de antes: entre la lectura y esta
          // escritura cabe otra respuesta entera.
          where: { id: "rr1", resolvedAt: null },
          data: expect.objectContaining({ resolvedEventId: "e1" }),
        }),
      );
    });
  });
});
