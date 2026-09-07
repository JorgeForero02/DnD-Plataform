import { Test } from "@nestjs/testing";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import {
  createDmTableSchema,
  dmTableEntrySchema,
  entregaSchema,
  type ResolvedItem,
} from "@dnd/shared";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { resolveContentRef } from "../inventory/common/resolve-item";
import { PrismaService } from "../prisma/prisma.service";
import { DmTablesService } from "./dm-tables.service";

// Tarea 2C.6 — las tablas del DM.
// Tarea B2 — resolver la `entrega` de una fila al tirar.

// `resolveContentRef` es el resolutor único del carril de inventario (A4): se mockea aquí para
// que esta prueba siga siendo una prueba del SERVICIO de tablas —qué hace con lo que el resolutor
// contesta—, no una segunda copia de las pruebas del catálogo del SRD.
jest.mock("../inventory/common/resolve-item");
const resolveContentRefMock = jest.mocked(resolveContentRef);

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

// Tipado como `ResolvedItem` (y no dejado inferir) a propósito: si el catálogo del SRD renombra
// mañana un campo como `weightOz`, este fixture escrito a mano deja de compilar en vez de seguir
// en verde mientras la producción real ya no encaja.
const espadaCortaResuelta: ResolvedItem = {
  ref: "SRD:short-sword",
  source: "SRD",
  name: "Espada corta",
  kind: "WEAPON",
  weightOz: 32,
  costCp: 1000,
  effects: [],
  requiresAttunement: false,
};

const tablaDeBotin = {
  id: "t2",
  name: "Botín",
  visibility: "PLAYERS",
  trigger: "NONE",
  entries: [
    {
      min: 1,
      max: 10,
      text: "Una espada corta y 15 mo",
      entrega: {
        objetos: [{ ref: { source: "SRD", key: "short-sword" }, cantidad: 1 }],
        monedas: { gp: 15 },
      },
    },
  ],
};

const tablaConRefCaduca = {
  id: "t3",
  name: "Botín caduco",
  visibility: "PLAYERS",
  trigger: "NONE",
  entries: [
    {
      min: 1,
      max: 10,
      text: "Un objeto que ya no existe",
      entrega: {
        objetos: [{ ref: { source: "CAMPAIGN", id: "borrado" }, cantidad: 1 }],
      },
    },
  ],
};

// **Ficha P2-7.** El `Json` de `DmTableEntry` es una columna sin forma: lo que se escribe por la
// API pasa por `entregaSchema`, pero un dato que llegó a la base por otra vía —un `curl`, una
// migración, la mano de alguien— no. Esta fila es exactamente eso: una `entrega` que no valida.
const tablaConEntregaMalformada = {
  id: "t5",
  name: "Botín malformado",
  visibility: "PLAYERS",
  trigger: "NONE",
  entries: [
    {
      min: 1,
      max: 10,
      text: "Algo que la fila dice mal",
      // `objetos` tendría que ser una lista de `{ ref, cantidad }`. No lo es.
      entrega: { objetos: "una espada corta", monedas: { gp: "muchas" } },
    },
  ],
};

const tablaDeRumores = {
  id: "t4",
  name: "Rumores",
  visibility: "PLAYERS",
  trigger: "NONE",
  entries: [{ min: 1, max: 10, text: "Un rumor sobre el molinero" }],
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

    describe("la entrega de la fila (encargo B2)", () => {
      beforeEach(() => {
        prisma.dmTable.findFirst.mockImplementation(({ where }: { where: { id: string } }) =>
          Promise.resolve(
            [tablaDeBotin, tablaConRefCaduca, tablaConEntregaMalformada, tablaDeRumores].find(
              (t) => t.id === where.id,
            ) ?? null,
          ),
        );
      });

      it("la tirada devuelve los objetos resueltos, no solo sus claves", async () => {
        resolveContentRefMock.mockResolvedValue({ resolved: espadaCortaResuelta });
        const r = await service.roll("dm", "c1", tablaDeBotin.id);
        expect(r.entrega?.objetos?.[0]).toMatchObject({
          ref: { source: "SRD", key: "short-sword" },
          name: "Espada corta",
        });
        expect(r.entrega?.monedas).toEqual({ gp: 15 });
      });

      it("una `ref` que ya no existe sale con su motivo, y NO rompe la tirada", async () => {
        resolveContentRefMock.mockRejectedValue(
          new BadRequestException("Ese objeto de campaña no existe, o no es de esta campaña."),
        );
        const r = await service.roll("dm", "c1", tablaConRefCaduca.id);
        expect(r.text).toBeTruthy();
        expect(r.entrega?.objetos?.[0]).toMatchObject({ ausente: true });
        expect(r.entrega?.objetos?.[0]).not.toHaveProperty("name");
        expect((r.entrega?.objetos?.[0] as { motivo?: string }).motivo).toBe(
          "Ese objeto de campaña no existe, o no es de esta campaña.",
        );
      });

      // **Ficha P2-7 — el guardián existía y no lo sujetaba nadie.**
      //
      // El que actúa al leer es `entregaSchema.safeParse` dentro de `resolverEntrega`; NO
      // `entregaResueltaSchema`, que solo se usa como tipo de salida. Su comportamiento se había
      // verificado **por ejecución** y no por prueba, así que quitarlo dejaba las tres suites en
      // verde. Lo que la tabla promete es el texto: una `entrega` que no se entiende se trata como
      // ausente, nunca como un error que se lleve por delante la tirada.
      it("un `entrega` malformado en el `Json` NO rompe la tirada: sale sin entrega, con su texto", async () => {
        const r = await service.roll("dm", "c1", tablaConEntregaMalformada.id);
        expect(r.text).toBe("Algo que la fila dice mal");
        expect(r.entrega).toBeUndefined();
        // Y no se intentó resolver nada: el esquema para antes de llegar al catálogo.
        expect(resolveContentRefMock).not.toHaveBeenCalled();
      });

      it("una tabla de rumores tira exactamente como antes", async () => {
        const r = await service.roll("dm", "c1", tablaDeRumores.id);
        expect(r.text).toBeTruthy();
        expect(r.entrega).toBeUndefined();
        expect(resolveContentRefMock).not.toHaveBeenCalled();
      });

      it("y el disparo automático desde una pifia (`tirarSobre` con `trigger`) también resuelve la entrega", async () => {
        resolveContentRefMock.mockResolvedValue({ resolved: espadaCortaResuelta });
        const r = await service.tirarSobre("dm", "c1", tablaDeBotin, {
          trigger: "FUMBLE",
          roller: () => 1,
        });
        expect(r.entrega?.objetos?.[0]).toMatchObject({ name: "Espada corta" });
      });

      it("**un fallo del servidor no se traga**: se propaga y NO se pinta como una ref caduca", async () => {
        // Revisión de calidad, vuelta 1 (crítico): una caída de Postgres no es lo mismo que una
        // `ref` que ya no existe, y confundirlas en la respuesta es peor que un 500.
        resolveContentRefMock.mockRejectedValue(new Error("Connection terminated unexpectedly"));
        await expect(service.roll("dm", "c1", tablaConRefCaduca.id)).rejects.toThrow(
          "Connection terminated unexpectedly",
        );
      });

      it("**la entrega se resuelve con el cliente de la transacción, no con `this.prisma` a pelo**", async () => {
        // Revisión de calidad, vuelta 1 (I-2): si alguien cambia `opciones?.tx ?? this.prisma`
        // por `this.prisma` a secas, esta prueba tiene que enrojecer.
        resolveContentRefMock.mockResolvedValue({ resolved: espadaCortaResuelta });
        const tx = { marca: "soy-la-transaccion" };
        await service.tirarSobre("dm", "c1", tablaDeBotin, { tx: tx as never, roller: () => 1 });
        expect(resolveContentRefMock).toHaveBeenCalledWith(
          expect.anything(),
          "c1",
          { source: "SRD", key: "short-sword" },
          tx,
        );
      });
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

describe("una fila puede entregar algo (encargo B1)", () => {
  it("una fila sin `entrega` sigue siendo válida, y es el caso normal", () => {
    const fila = dmTableEntrySchema.parse({ min: 1, max: 3, text: "Un rumor sobre el molinero" });
    expect(fila.entrega).toBeUndefined();
  });

  it("una fila puede entregar objetos y monedas", () => {
    const fila = dmTableEntrySchema.parse({
      min: 4,
      max: 6,
      text: "Una espada corta y 15 mo",
      entrega: {
        objetos: [{ ref: { source: "SRD", key: "shortsword" }, cantidad: 1 }],
        monedas: { gp: 15 },
      },
    });
    expect(fila.entrega?.objetos?.[0].ref).toEqual({ source: "SRD", key: "shortsword" });
  });

  it("una entrega vacía se rechaza: o entrega algo o no está", () => {
    expect(() => dmTableEntrySchema.parse({ min: 1, max: 1, text: "Nada", entrega: {} })).toThrow();
  });

  it("una entrega con `objetos: []` también se rechaza: vacío es vacío se escriba como se escriba", () => {
    expect(() =>
      dmTableEntrySchema.parse({ min: 1, max: 1, text: "Nada", entrega: { objetos: [] } }),
    ).toThrow();
  });

  it("una entrega con `monedas: {}` también se rechaza", () => {
    expect(() =>
      dmTableEntrySchema.parse({ min: 1, max: 1, text: "Nada", entrega: { monedas: {} } }),
    ).toThrow();
  });

  it("un rango invertido con `entrega` presente se sigue rechazando por el rango", () => {
    // El `.refine` del rango sigue vivo tras añadir el campo nuevo al objeto de dentro.
    const r = dmTableEntrySchema.safeParse({
      min: 9,
      max: 2,
      text: "A",
      entrega: { monedas: { gp: 1 } },
    });
    expect(r.success).toBe(false);
  });

  // Revisión de calidad, vuelta 1 (I-1): nueve mutaciones a `z.any()` dejaban la suite en verde
  // porque no había un solo rechazo probado dentro de `entregaSchema`. Estas ocho cierran cada
  // campo entero: `ref`, `cantidad`, las cinco monedas y el tope de veinte objetos. (La novena
  // mutación, sobre `entregaObjetoResueltoSchema` —el esquema de SALIDA, que nunca se ejecuta en
  // producción—, la cierra el compilador, no una prueba: ver el informe.)
  describe("guardianes de `entregaSchema` (revisión de calidad, vuelta 1)", () => {
    it("una `ref` que no es ni SRD ni CAMPAIGN se rechaza", () => {
      const r = entregaSchema.safeParse({
        objetos: [{ ref: { source: "OTRO", key: "algo" }, cantidad: 1 }],
      });
      expect(r.success).toBe(false);
    });

    it("`cantidad: 0` se rechaza: entregar cero unidades no es entregar nada", () => {
      const r = entregaSchema.safeParse({
        objetos: [{ ref: { source: "SRD", key: "short-sword" }, cantidad: 0 }],
      });
      expect(r.success).toBe(false);
    });

    it("una `cantidad` negativa se rechaza", () => {
      const r = entregaSchema.safeParse({
        objetos: [{ ref: { source: "SRD", key: "short-sword" }, cantidad: -3 }],
      });
      expect(r.success).toBe(false);
    });

    it.each(["cp", "sp", "ep", "gp", "pp"] as const)(
      "%s con decimales se rechaza: son piezas, no fracciones",
      (moneda) => {
        const r = entregaSchema.safeParse({ monedas: { [moneda]: 1.5 } });
        expect(r.success).toBe(false);
      },
    );

    it.each(["cp", "sp", "ep", "gp", "pp"] as const)("%s negativa se rechaza", (moneda) => {
      const r = entregaSchema.safeParse({ monedas: { [moneda]: -1 } });
      expect(r.success).toBe(false);
    });

    it("la fila 21 de objetos se rechaza: el tope son veinte", () => {
      const objetos = Array.from({ length: 21 }, (_, i) => ({
        ref: { source: "SRD" as const, key: `objeto-${i}` },
        cantidad: 1,
      }));
      const r = entregaSchema.safeParse({ objetos });
      expect(r.success).toBe(false);
    });

    it("veinte objetos, en cambio, valen", () => {
      const objetos = Array.from({ length: 20 }, (_, i) => ({
        ref: { source: "SRD" as const, key: `objeto-${i}` },
        cantidad: 1,
      }));
      const r = entregaSchema.safeParse({ objetos });
      expect(r.success).toBe(true);
    });
  });
});
