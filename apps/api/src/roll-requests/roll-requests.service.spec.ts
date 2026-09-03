import { Test } from "@nestjs/testing";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { MembershipService } from "../campaigns/membership.service";
import { CharacterSheetService } from "../characters/character-sheet.service";
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
      update: jest.fn(),
    },
    transaction: jest.fn(),
  };
  const membership = { requireDM: jest.fn(), requireMember: jest.fn() };
  const rolls = { roll: jest.fn() };
  const sheets = { getSheet: jest.fn() };

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
      ],
    }).compile();
    service = ref.get(RollRequestsService);
    jest.resetAllMocks();
    membership.requireDM.mockResolvedValue({ role: "DM" });
    membership.requireMember.mockResolvedValue({ role: "PLAYER" });
    prisma.transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
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

    it("por defecto solo las pendientes: es lo que sondea la pantalla", async () => {
      prisma.rollRequest.findMany.mockResolvedValue([]);
      await service.list("jugador", "c1", { includeResolved: true });
      const where = prisma.rollRequest.findMany.mock.calls[0][0].where;
      expect(where.resolvedAt).toBeUndefined();
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

      await service.answer("jugador", "c1", "rr1");

      expect(rolls.roll).toHaveBeenCalledWith(
        "jugador",
        "c1",
        expect.objectContaining({
          expression: "1d20+7",
          label: "Percepción",
          characterId: "ch1",
          dc: 14,
        }),
      );
    });

    it("un modificador de cero no escribe un `+0`, que el evaluador no entiende", async () => {
      prisma.rollRequest.findFirst.mockResolvedValue(pendiente);
      sheets.getSheet.mockResolvedValue(
        hojaCon({ "skill.perception": { key: "skill.perception", total: 0, steps: [] } }),
      );
      await service.answer("jugador", "c1", "rr1");
      expect(rolls.roll.mock.calls[0][2].expression).toBe("1d20");
    });

    it("y uno negativo va con su signo", async () => {
      prisma.rollRequest.findFirst.mockResolvedValue(pendiente);
      sheets.getSheet.mockResolvedValue(
        hojaCon({ "skill.perception": { key: "skill.perception", total: -1, steps: [] } }),
      );
      await service.answer("jugador", "c1", "rr1");
      expect(rolls.roll.mock.calls[0][2].expression).toBe("1d20-1");
    });

    it("**otro jugador no puede responder por ti**: sería tirar en tu nombre", async () => {
      prisma.rollRequest.findFirst.mockResolvedValue(pendiente);
      await expect(service.answer("otro", "c1", "rr1")).rejects.toBeInstanceOf(ForbiddenException);
      expect(rolls.roll).not.toHaveBeenCalled();
    });

    it("el DM sí puede responderla: es la misma regla que tirar por un personaje", async () => {
      membership.requireMember.mockResolvedValue({ role: "DM" });
      prisma.rollRequest.findFirst.mockResolvedValue(pendiente);
      await expect(service.answer("dm", "c1", "rr1")).resolves.toBeDefined();
    });

    it("una petición ya respondida no se responde dos veces", async () => {
      prisma.rollRequest.findFirst.mockResolvedValue({ ...pendiente, resolvedAt: new Date() });
      await expect(service.answer("jugador", "c1", "rr1")).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(rolls.roll).not.toHaveBeenCalled();
    });

    it("**pedir un valor que la hoja no deriva es un 400**, no una tirada de 1d20+0", async () => {
      // Un cero silencioso es un número que la mesa se cree.
      prisma.rollRequest.findFirst.mockResolvedValue({ ...pendiente, key: "skill.inventada" });
      await expect(service.answer("jugador", "c1", "rr1")).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(rolls.roll).not.toHaveBeenCalled();
    });

    it("**se marca respondida DESPUÉS de tirar**: si la tirada falla, el botón sigue ahí", async () => {
      prisma.rollRequest.findFirst.mockResolvedValue(pendiente);
      rolls.roll.mockRejectedValue(new Error("la base se cayó"));
      await expect(service.answer("jugador", "c1", "rr1")).rejects.toThrow();
      expect(prisma.rollRequest.update).not.toHaveBeenCalled();
    });

    it("y al responderla queda atada a la tirada que la respondió", async () => {
      prisma.rollRequest.findFirst.mockResolvedValue(pendiente);
      await service.answer("jugador", "c1", "rr1");
      expect(prisma.rollRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ resolvedEventId: "e1" }) }),
      );
    });
  });
});
