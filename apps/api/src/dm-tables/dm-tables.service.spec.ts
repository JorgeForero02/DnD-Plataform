import { Test } from "@nestjs/testing";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { createDmTableSchema } from "@dnd/shared";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { PrismaService } from "../prisma/prisma.service";
import { DmTablesService } from "./dm-tables.service";

// Tarea 2C.6 — las tablas del DM.

const tablaDePifias = {
  id: "t1",
  name: "Pifias de la casa",
  visibility: "DM_ONLY",
  trigger: "FUMBLE",
  entries: [
    { min: 1, max: 5, text: "Se te cae el arma." },
    { min: 6, max: 10, text: "Pierdes el equilibrio." },
  ],
};

describe("DmTablesService", () => {
  let service: DmTablesService;
  const prisma = {
    campaign: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), update: jest.fn() },
    dmTable: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    dmTableEntry: { deleteMany: jest.fn() },
    user: { findUnique: jest.fn() },
    transaction: jest.fn(),
  };
  const membership = { requireDM: jest.fn(), requireMember: jest.fn() };
  const events = { record: jest.fn() };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        DmTablesService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: GameEventsService, useValue: events },
      ],
    }).compile();
    service = ref.get(DmTablesService);
    jest.resetAllMocks();
    membership.requireDM.mockResolvedValue({ role: "DM" });
    membership.requireMember.mockResolvedValue({ role: "DM" });
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    prisma.transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
    events.record.mockResolvedValue({ id: "e1" });
  });

  describe("el interruptor de la casa", () => {
    it("**está apagado por defecto**, y solo el DM lo toca", async () => {
      membership.requireDM.mockRejectedValue(new ForbiddenException());
      await expect(
        service.setHouseTables("jugador", "c1", { enabled: true }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.campaign.update).not.toHaveBeenCalled();
    });

    it("**con el interruptor apagado no hay tabla que disparar**, aunque exista", async () => {
      // Es el criterio con el que cierra 2C.6: un crítico sigue duplicando dados y nada más.
      prisma.campaign.findUnique.mockResolvedValue({ id: "c1", houseTablesEnabled: false });
      expect(await service.tablaDisparadaPor("c1", "CRITICAL")).toBeNull();
      expect(prisma.dmTable.findFirst).not.toHaveBeenCalled();
    });

    it("y encendido, se busca la tabla de ese disparador", async () => {
      prisma.campaign.findUnique.mockResolvedValue({ id: "c1", houseTablesEnabled: true });
      prisma.dmTable.findFirst.mockResolvedValue(tablaDePifias);
      const tabla = await service.tablaDisparadaPor("c1", "FUMBLE");
      expect(tabla).toBe(tablaDePifias);
      expect(prisma.dmTable.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { campaignId: "c1", trigger: "FUMBLE" } }),
      );
    });
  });

  describe("tirar sobre una tabla", () => {
    it("**el dado sale de la tabla**: tantas caras como su resultado más alto", async () => {
      const r = await service.tirarSobre("dm", "c1", tablaDePifias, { roller: () => 7 });
      expect(r.die).toBe(10);
      expect(r.roll).toBe(7);
      expect(r.text).toBe("Pierdes el equilibrio.");
    });

    it("el resultado cae en la fila cuyo rango lo contiene, también en los bordes", async () => {
      expect((await service.tirarSobre("dm", "c1", tablaDePifias, { roller: () => 5 })).text).toBe(
        "Se te cae el arma.",
      );
      expect((await service.tirarSobre("dm", "c1", tablaDePifias, { roller: () => 6 })).text).toBe(
        "Pierdes el equilibrio.",
      );
    });

    it("**deja rastro con la visibilidad de la tabla**, no con la de la mesa", async () => {
      // Una tabla de pifias que solo ve el DM no puede cantar su resultado en el registro.
      await service.tirarSobre("dm", "c1", tablaDePifias, { roller: () => 3 });
      expect(events.record).toHaveBeenCalledWith(
        "dm",
        "c1",
        expect.objectContaining({
          visibility: "DM_ONLY",
          payload: expect.objectContaining({
            type: "TABLE_ROLLED",
            tableName: "Pifias de la casa",
            die: 10,
            roll: 3,
          }),
        }),
        undefined,
      );
    });

    it("y dice si la disparó un natural o la tiró el DM a mano", async () => {
      await service.tirarSobre("dm", "c1", tablaDePifias, { roller: () => 1, trigger: "FUMBLE" });
      expect(events.record.mock.calls[0][2].payload.trigger).toBe("FUMBLE");

      jest.clearAllMocks();
      events.record.mockResolvedValue({ id: "e2" });
      await service.tirarSobre("dm", "c1", tablaDePifias, { roller: () => 1 });
      expect(events.record.mock.calls[0][2].payload.trigger).toBeUndefined();
    });
  });

  describe("editar una tabla (ficha C2C-6)", () => {
    it("**las filas se reemplazan enteras**, y dentro de la misma transacción", async () => {
      // Una tabla a medio reemplazar es una tabla con huecos, y con huecos hay tiradas sin
      // resultado. Por eso no hay un `PATCH` por fila: las filas se validan como conjunto.
      prisma.dmTable.findFirst.mockResolvedValue(tablaDePifias);
      prisma.dmTable.update.mockResolvedValue({ ...tablaDePifias, name: "Otro nombre" });

      await service.update("dm", "c1", "t1", {
        name: "Otro nombre",
        visibility: "DM_ONLY",
        trigger: "FUMBLE",
        entries: [{ min: 1, max: 6, text: "Nuevo" }],
      });

      expect(prisma.dmTableEntry.deleteMany).toHaveBeenCalledWith({ where: { tableId: "t1" } });
      expect(prisma.dmTable.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entries: { create: [{ min: 1, max: 6, text: "Nuevo" }] },
          }),
        }),
      );
    });

    it("editar es del DM, y una tabla de otra campaña es 404", async () => {
      membership.requireDM.mockRejectedValue(new ForbiddenException());
      await expect(
        service.update("jugador", "c1", "t1", {
          name: "X",
          visibility: "DM_ONLY",
          trigger: "NONE",
          entries: [{ min: 1, max: 2, text: "A" }],
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      jest.clearAllMocks();
      membership.requireDM.mockResolvedValue({ role: "DM" });
      prisma.dmTable.findFirst.mockResolvedValue(null);
      await expect(
        service.update("dm", "c1", "ajena", {
          name: "X",
          visibility: "DM_ONLY",
          trigger: "NONE",
          entries: [{ min: 1, max: 2, text: "A" }],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("quién ve qué", () => {
    it("**el estado del interruptor viaja con la lista, y lo ve la mesa entera**", async () => {
      // Se podía escribir y no leer: al entrar, la pantalla no sabía en qué posición estaba. Y lo
      // ve también un jugador — si la casa juega con tabla de pifias, tiene derecho a saberlo
      // antes de sacar un 1.
      membership.requireMember.mockResolvedValue({ role: "PLAYER" });
      prisma.dmTable.findMany.mockResolvedValue([]);
      prisma.campaign.findUniqueOrThrow.mockResolvedValue({ id: "c1", houseTablesEnabled: true });
      const lista = await service.list("jugador", "c1");
      expect(lista.houseTablesEnabled).toBe(true);
    });

    it("una tabla DM_ONLY no viaja al jugador: **no se esconde en el cliente, no se manda**", async () => {
      membership.requireMember.mockResolvedValue({ role: "PLAYER" });
      prisma.dmTable.findMany.mockResolvedValue([
        tablaDePifias,
        { ...tablaDePifias, id: "t2", visibility: "PLAYERS", trigger: "NONE" },
      ]);
      prisma.campaign.findUniqueOrThrow.mockResolvedValue({ id: "c1", houseTablesEnabled: false });
      const lista = await service.list("jugador", "c1");
      expect(lista.tables.map((t) => t.id)).toEqual(["t2"]);
    });

    it("**tirarla sin poder verla es 404, no 403**: un 403 confirmaría que existe", async () => {
      membership.requireMember.mockResolvedValue({ role: "PLAYER" });
      prisma.dmTable.findFirst.mockResolvedValue(tablaDePifias);
      await expect(service.roll("jugador", "c1", "t1")).rejects.toBeInstanceOf(NotFoundException);
      expect(events.record).not.toHaveBeenCalled();
    });
  });
});

describe("el esquema de una tabla (2C.6)", () => {
  const base = { name: "Pifias", entries: [{ min: 1, max: 10, text: "Algo" }] };

  it("una tabla de una sola fila que empieza en 1 vale", () => {
    expect(createDmTableSchema.safeParse(base).success).toBe(true);
  });

  it("**por defecto solo la ve el DM y no la dispara nada**", () => {
    const r = createDmTableSchema.parse(base);
    expect(r.visibility).toBe("DM_ONLY");
    expect(r.trigger).toBe("NONE");
  });

  it("**dos filas que se solapan se rechazan**: la misma tirada daría dos resultados", () => {
    const r = createDmTableSchema.safeParse({
      name: "Mala",
      entries: [
        { min: 1, max: 7, text: "A" },
        { min: 7, max: 10, text: "B" },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("**un hueco se rechaza**: «no sale nada» no es una entrada de ninguna tabla", () => {
    const r = createDmTableSchema.safeParse({
      name: "Mala",
      entries: [
        { min: 1, max: 5, text: "A" },
        { min: 8, max: 10, text: "B" },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("y una que no empieza en el 1 también", () => {
    const r = createDmTableSchema.safeParse({
      name: "Mala",
      entries: [{ min: 3, max: 10, text: "A" }],
    });
    expect(r.success).toBe(false);
  });

  it("un rango al revés se rechaza en la propia fila", () => {
    const r = createDmTableSchema.safeParse({
      name: "Mala",
      entries: [{ min: 9, max: 2, text: "A" }],
    });
    expect(r.success).toBe(false);
  });
});
