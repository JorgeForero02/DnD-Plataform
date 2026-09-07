import { BadRequestException, ConflictException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { MembershipService } from "../../campaigns/membership.service";
import { GameClockService } from "../../game-clock/game-clock.service";
import { GameEventsService } from "../../game-events/game-events.service";
import { PrismaService } from "../../prisma/prisma.service";
import { MARCADOR_DE_USOS_SIN_TOPE } from "../resources/resources.service";
import { RestService } from "./rest.service";

// Tarea 2A.8.

describe("RestService", () => {
  let service: RestService;
  const character = {
    id: "c1",
    ownerId: "owner1",
    visibility: "PLAYERS",
    campaignId: "cmp1",
    con: 14, // modificador +2
    currentHp: 5,
  };
  const prisma = {
    character: { findFirst: jest.fn(), findFirstOrThrow: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    characterResource: { findMany: jest.fn(), update: jest.fn() },
    characterCondition: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    // 2C.3: el descanso largo lee el reloj de la campaña —«una vez cada 24 horas» son horas de
    // JUEGO, no del servidor— y marca cuándo terminó.
    campaign: { findUniqueOrThrow: jest.fn() },
    transaction: jest.fn(),
  };
  const membership = { requireMember: jest.fn(), getMembership: jest.fn() };
  const events = { record: jest.fn() };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        RestService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: GameEventsService, useValue: events },
        // **D-A-1 (paso 1, tarea 9):** un descanso avanza el reloj —largo 8 h, corto 1 h— dentro
        // de su misma transacción. Aquí no se mide el reloj, se mide el descanso: basta con que
        // el doble responda.
        { provide: GameClockService, useValue: { avanzar: jest.fn().mockResolvedValue({}) } },
      ],
    }).compile();
    service = ref.get(RestService);
    jest.resetAllMocks();
    membership.requireMember.mockResolvedValue(undefined);
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.character.findFirst.mockResolvedValue(character);
    prisma.character.findFirstOrThrow.mockResolvedValue(character);
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    prisma.characterCondition.findUnique.mockResolvedValue(null);
    prisma.transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
    prisma.campaign.findUniqueOrThrow.mockResolvedValue({ id: "cmp1", clockSeconds: 0 });
    prisma.characterCondition.findMany.mockResolvedValue([]);
    // Reloj a cero y sin descanso largo previo: el caso de una campaña recién empezada.
  });

  it("quien no es DM ni dueño no puede declarar un descanso", async () => {
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    await expect(service.declare("otro", "cmp1", "c1", { kind: "SHORT" })).rejects.toThrow();
  });

  it("descanso corto: repone SOLO lo marcado SHORT_REST, no lo de LONG_REST", async () => {
    prisma.characterResource.findMany.mockResolvedValue([
      { id: "r1", key: "spell-slot-1", current: 0, max: 2, resetOn: "SHORT_REST" },
      { id: "r2", key: "rage", current: 0, max: 3, resetOn: "LONG_REST" },
    ]);

    await service.declare("owner1", "cmp1", "c1", { kind: "SHORT" });

    expect(prisma.characterResource.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { current: 2 },
    });
    expect(prisma.characterResource.update).not.toHaveBeenCalledWith({
      where: { id: "r2" },
      data: { current: 3 },
    });
  });

  // **Ficha A11-usos-sin-tope — `max: null` es "sin tope", no "no lo repongas nunca".**
  //
  // `reponerPorTipo` exigía `recurso.max !== null` para tocar una fila, así que la Furia de un
  // bárbaro de nivel 20 —el SRD la declara *Unlimited* y `resolve.ts` la siembra con `max: null`—
  // **no se reponía en ningún descanso**, por mucho que su `resetOn` dijera `LONG_REST`. Un
  // recurso sin tope que se queda a medias para siempre es peor que uno con tope.
  it("un recurso SIN TOPE también se repone en su descanso: `max: null` no lo exime", async () => {
    prisma.characterResource.findMany.mockResolvedValue([
      { id: "sinTope", key: "rage", current: 7, max: null, resetOn: "LONG_REST" },
    ]);

    await service.declare("owner1", "cmp1", "c1", { kind: "LONG" });

    expect(prisma.characterResource.update).toHaveBeenCalledWith({
      where: { id: "sinTope" },
      data: { current: MARCADOR_DE_USOS_SIN_TOPE },
    });
  });

  // El otro lado de la misma moneda: ya lleno, no se escribe. Sin esta, la de arriba pasaría
  // igual con un `update` incondicional, que es escribir en cada descanso sobre cada fila.
  it("y si ya está en el marcador, el descanso no lo vuelve a escribir", async () => {
    prisma.characterResource.findMany.mockResolvedValue([
      {
        id: "sinTope",
        key: "rage",
        current: MARCADOR_DE_USOS_SIN_TOPE,
        max: null,
        resetOn: "LONG_REST",
      },
    ]);

    await service.declare("owner1", "cmp1", "c1", { kind: "LONG" });

    expect(prisma.characterResource.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "sinTope" } }),
    );
  });

  it("MUTACIÓN CLAVE: descanso LARGO recupera la mitad de los dados de golpe, **redondeando hacia ABAJO** y no todos", async () => {
    // 5 dados máximos, 1 disponible: la mitad de 5 son **2** —el SRD redondea hacia abajo incluso
    // con un medio exacto—, así que sube de 1 a 3, nunca a 4 ni a 5.
    //
    // **Esta prueba afirmaba lo contrario**, con su cuenta escrita («2,5 -> 3 hacia arriba»), y
    // consagraba una regla mal implementada: lo cazó una revisión contra la fuente
    // (<https://5thsrd.org/adventuring/resting/>). Se corrigió el código y la prueba con él, que es
    // lo que hay que hacer cuando la prueba defiende el error.
    prisma.characterResource.findMany.mockResolvedValue([
      { id: "hd", key: "hit-dice-d10", current: 1, max: 5, resetOn: "NONE" },
    ]);

    await service.declare("owner1", "cmp1", "c1", { kind: "LONG" });

    expect(prisma.characterResource.update).toHaveBeenCalledWith({
      where: { id: "hd" },
      data: { current: 3 },
    });
  });

  it("y con un solo dado de golpe, el mínimo de uno lo salva del redondeo hacia abajo", async () => {
    // La mitad de 1 es 0 hacia abajo, y la regla dice «minimum of one die». Es la cláusula que
    // demuestra que el redondeo es hacia abajo: con redondeo hacia arriba, sobraría.
    prisma.characterResource.findMany.mockResolvedValue([
      { id: "hd", key: "hit-dice-d8", current: 0, max: 1, resetOn: "NONE" },
    ]);

    await service.declare("owner1", "cmp1", "c1", { kind: "LONG" });

    expect(prisma.characterResource.update).toHaveBeenCalledWith({
      where: { id: "hd" },
      data: { current: 1 },
    });
  });

  it("recuperar la mitad nunca pasa del máximo, y con máximo 1 recupera como mínimo 1", async () => {
    prisma.characterResource.findMany.mockResolvedValue([
      { id: "hd", key: "hit-dice-d6", current: 1, max: 1, resetOn: "NONE" },
    ]);

    await service.declare("owner1", "cmp1", "c1", { kind: "LONG" });

    // Ya estaba a máximo (1 de 1): no hay llamada de actualización para ese recurso.
    expect(prisma.characterResource.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "hd" } }),
    );
  });

  it("descanso LARGO devuelve los PG al máximo poniendo currentHp a null", async () => {
    prisma.characterResource.findMany.mockResolvedValue([]);
    await service.declare("owner1", "cmp1", "c1", { kind: "LONG" });
    expect(prisma.character.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: expect.objectContaining({ currentHp: null }),
    });
  });

  it("descanso LARGO baja un nivel de agotamiento, sin quitar más de uno", async () => {
    prisma.characterResource.findMany.mockResolvedValue([]);
    prisma.characterCondition.findUnique.mockResolvedValue({ id: "cond1", level: 3 });

    await service.declare("owner1", "cmp1", "c1", { kind: "LONG" });

    expect(prisma.characterCondition.update).toHaveBeenCalledWith({
      where: { id: "cond1" },
      data: { level: 2 },
    });
    expect(prisma.characterCondition.delete).not.toHaveBeenCalled();
  });

  it("descanso LARGO en agotamiento nivel 1 QUITA la condición, no la deja en 0", async () => {
    prisma.characterResource.findMany.mockResolvedValue([]);
    prisma.characterCondition.findUnique.mockResolvedValue({ id: "cond1", level: 1 });

    await service.declare("owner1", "cmp1", "c1", { kind: "LONG" });

    expect(prisma.characterCondition.delete).toHaveBeenCalledWith({ where: { id: "cond1" } });
  });

  it("descanso corto con spendHitDice cura y descuenta esos dados, sin tocar más de los que hay", async () => {
    prisma.characterResource.findMany.mockResolvedValue([
      { id: "hd", key: "hit-dice-d8", current: 1, max: 4, resetOn: "NONE" },
    ]);

    await service.declare("owner1", "cmp1", "c1", { kind: "SHORT", spendHitDice: 3 });

    // Solo había 1 disponible: se gasta 1, nunca 3.
    expect(prisma.characterResource.update).toHaveBeenCalledWith({
      where: { id: "hd" },
      data: { current: 0 },
    });
    expect(prisma.character.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "c1" } }),
    );
    const llamada = (prisma.character.update as jest.Mock).mock.calls[0][0];
    expect(llamada.data.currentHp).toBeGreaterThan(character.currentHp);
  });

  it("la curación por dados de golpe NO pasa de los PG máximos", async () => {
    // Lo dejó anotado quien implementó la tarea: sumaba sin tope, porque el máximo no se guarda
    // —se calcula— y este módulo no lo tenía a mano. Con `common/max-hp.ts` sí lo tiene, y esta
    // prueba es lo que impide que el arreglo se deshaga: **una curación no puede inventar
    // puntos que el personaje no tiene**.
    //
    // Ficha entera y coherente para que el catálogo la sepa derivar: guerrero humano de nivel 1
    // con Constitución 14 (13 base + 1 del humano) → d10 máximo + 2 = **12 PG máximos**.
    const fichaEntera = {
      ...character,
      str: 15,
      dex: 13,
      con: 13,
      int: 9,
      wis: 11,
      cha: 9,
      raceKey: "human",
      classKey: "fighter",
      subraceKey: null,
      choices: null,
      level: 1,
      currentHp: 11, // a uno del máximo
    };
    prisma.character.findFirst.mockResolvedValue(fichaEntera);
    prisma.character.findFirstOrThrow.mockResolvedValue(fichaEntera);
    prisma.characterResource.findMany.mockResolvedValue([
      { id: "hd", key: "hit-dice-d10", current: 4, max: 4, resetOn: "NONE" },
    ]);

    // Cuatro dados de d10 con +2 cada uno curan como poco 12: de sobra para pasarse.
    await service.declare("owner1", "cmp1", "c1", { kind: "SHORT", spendHitDice: 4 });

    const llamada = (prisma.character.update as jest.Mock).mock.calls[0][0];
    expect(llamada.data.currentHp).toBe(12);
  });

  it("con una ficha a medio hacer no se inventa un máximo: cura sin tope y no revienta", async () => {
    // Una hoja sin clase no se puede derivar, y eso es un estado legítimo. Preferimos curar sin
    // tope a romper un descanso por un dato que el jugador todavía no ha rellenado.
    prisma.characterResource.findMany.mockResolvedValue([
      { id: "hd", key: "hit-dice-d8", current: 1, max: 4, resetOn: "NONE" },
    ]);

    await expect(
      service.declare("owner1", "cmp1", "c1", { kind: "SHORT", spendHitDice: 1 }),
    ).resolves.toBeDefined();
  });

  it("escribe REST_DECLARED al terminar", async () => {
    prisma.characterResource.findMany.mockResolvedValue([]);
    await service.declare("owner1", "cmp1", "c1", { kind: "SHORT" });
    expect(events.record).toHaveBeenCalledWith(
      "owner1",
      "cmp1",
      expect.objectContaining({ payload: { type: "REST_DECLARED", rest: "SHORT" } }),
      prisma,
    );
  });
});

describe("las tres reglas del descanso largo que el reloj hace comprobables (2C.3)", () => {
  // Las tres son del SRD (https://5thsrd.org/adventuring/resting/) y las tres necesitan tiempo de
  // juego: sin reloj, «una vez cada 24 horas» no se puede comprobar contra nada.

  let service: RestService;
  const character = {
    id: "c1",
    ownerId: "owner1",
    visibility: "PLAYERS",
    campaignId: "cmp1",
    con: 14,
    currentHp: 5,
    lastLongRestClock: null as number | null,
  };
  const prisma = {
    character: { findFirst: jest.fn(), findFirstOrThrow: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    characterResource: { findMany: jest.fn(), update: jest.fn() },
    characterCondition: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    campaign: { findUniqueOrThrow: jest.fn() },
    transaction: jest.fn(),
  };
  const membership = { requireMember: jest.fn(), getMembership: jest.fn() };
  const events = { record: jest.fn() };

  async function montar(sobre: Partial<typeof character> = {}, clockSeconds = 0) {
    const ref = await Test.createTestingModule({
      providers: [
        RestService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: GameEventsService, useValue: events },
        // **D-A-1 (paso 1, tarea 9):** un descanso avanza el reloj —largo 8 h, corto 1 h— dentro
        // de su misma transacción. Aquí no se mide el reloj, se mide el descanso: basta con que
        // el doble responda.
        { provide: GameClockService, useValue: { avanzar: jest.fn().mockResolvedValue({}) } },
      ],
    }).compile();
    service = ref.get(RestService);
    jest.resetAllMocks();
    const fila = { ...character, ...sobre };
    membership.requireMember.mockResolvedValue(undefined);
    membership.getMembership.mockResolvedValue({ role: "DM" });
    prisma.character.findFirst.mockResolvedValue(fila);
    prisma.character.findFirstOrThrow.mockResolvedValue(fila);
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    prisma.characterResource.findMany.mockResolvedValue([]);
    prisma.characterCondition.findUnique.mockResolvedValue(null);
    prisma.campaign.findUniqueOrThrow.mockResolvedValue({ id: "cmp1", clockSeconds });
    prisma.characterCondition.findMany.mockResolvedValue([]);
    prisma.transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
    return { service, prisma, events };
  }

  it("**el segundo descanso largo en 24 horas de juego se rechaza, con su motivo**", async () => {
    // Hasta 2C se podía descansar largo tres veces seguidas y curarse entero cada vez.
    const { service, prisma } = await montar({ lastLongRestClock: 0 }, 3600 * 10);
    await expect(service.declare("owner1", "cmp1", "c1", { kind: "LONG" })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("y a las 24 horas exactas ya vale: el límite es «una vez cada 24 h», no «una vez al día»", async () => {
    const { service } = await montar({ lastLongRestClock: 0 }, 86_400);
    await expect(service.declare("owner1", "cmp1", "c1", { kind: "LONG" })).resolves.toBeDefined();
  });

  it("el descanso largo deja su marca **en el reloj de la campaña**, no en la hora del servidor", async () => {
    // Con `Date.now()`, una sesión de cuatro horas reales que cubre tres días de viaje habría
    // bloqueado dos descansos que el juego permite.
    const { service, prisma } = await montar({}, 50_000);
    await service.declare("owner1", "cmp1", "c1", { kind: "LONG" });
    expect(prisma.character.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { lastLongRestClock: 50_000 } }),
    );
  });

  it("**a 0 PG no se descansa largo**: hay que empezarlo con al menos 1", async () => {
    const { service, prisma } = await montar({ currentHp: 0 });
    await expect(service.declare("owner1", "cmp1", "c1", { kind: "LONG" })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("`currentHp` a null es «a PG máximos», no «a cero»: ese sí descansa", async () => {
    const { service } = await montar({ currentHp: null as unknown as number });
    await expect(service.declare("owner1", "cmp1", "c1", { kind: "LONG" })).resolves.toBeDefined();
  });

  it("**un descanso interrumpido no repone NADA** — el SRD dice empezar otra vez, no medio descanso", async () => {
    // Nuestro propio plan prometía «con una hora hecha, se cobran los beneficios de un corto».
    // Eso no está en el SRD 5.1: es un arbitraje de mesa. Manda la fuente.
    const { service, prisma } = await montar();
    prisma.characterResource.findMany.mockResolvedValue([
      { id: "r1", key: "rage", current: 0, max: 3, resetOn: "LONG_REST" },
      { id: "r2", key: "spell-slot-1", current: 0, max: 2, resetOn: "SHORT_REST" },
    ]);

    await service.declare("owner1", "cmp1", "c1", { kind: "LONG", interrupted: true });

    expect(prisma.characterResource.update).not.toHaveBeenCalled();
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("y queda escrito como interrumpido, para que nadie tenga que acordarse de que no contó", async () => {
    const { service, events } = await montar();
    await service.declare("owner1", "cmp1", "c1", { kind: "LONG", interrupted: true });
    expect(events.record).toHaveBeenCalledWith(
      "owner1",
      "cmp1",
      expect.objectContaining({
        payload: { type: "REST_DECLARED", rest: "LONG", interrupted: true },
      }),
      expect.anything(),
    );
  });

  it("un descanso interrumpido **no gasta el descanso del día**: lo que se limita es beneficiarse", async () => {
    const { service, prisma } = await montar({ lastLongRestClock: 0 }, 3600);
    await expect(
      service.declare("owner1", "cmp1", "c1", { kind: "LONG", interrupted: true }),
    ).resolves.toBeDefined();
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("y tampoco exige estar en pie: tumbarse a 0 PG no da nada, pero no es un error", async () => {
    const { service } = await montar({ currentHp: 0 });
    await expect(
      service.declare("owner1", "cmp1", "c1", { kind: "LONG", interrupted: true }),
    ).resolves.toBeDefined();
  });

  it("el descanso CORTO no mira el reloj: no tiene límite de 24 horas", async () => {
    const { service } = await montar({ lastLongRestClock: 0 }, 60);
    await expect(service.declare("owner1", "cmp1", "c1", { kind: "SHORT" })).resolves.toBeDefined();
  });
});

describe("dos bordes del descanso que una revisión contra la fuente encontró", () => {
  let service: RestService;
  const prisma = {
    character: { findFirst: jest.fn(), findFirstOrThrow: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    characterResource: { findMany: jest.fn(), update: jest.fn() },
    characterCondition: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    campaign: { findUniqueOrThrow: jest.fn() },
    transaction: jest.fn(),
  };
  const membership = { requireMember: jest.fn(), getMembership: jest.fn() };
  const events = { record: jest.fn() };

  async function montar(sobre: Record<string, unknown> = {}, clockSeconds = 0) {
    const ref = await Test.createTestingModule({
      providers: [
        RestService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: GameEventsService, useValue: events },
        // **D-A-1 (paso 1, tarea 9):** un descanso avanza el reloj —largo 8 h, corto 1 h— dentro
        // de su misma transacción. Aquí no se mide el reloj, se mide el descanso: basta con que
        // el doble responda.
        { provide: GameClockService, useValue: { avanzar: jest.fn().mockResolvedValue({}) } },
      ],
    }).compile();
    service = ref.get(RestService);
    jest.resetAllMocks();
    const fila = {
      id: "c1",
      ownerId: "owner1",
      visibility: "PLAYERS",
      campaignId: "cmp1",
      con: 5, // modificador −3
      currentHp: 10,
      ...sobre,
    };
    membership.requireMember.mockResolvedValue(undefined);
    membership.getMembership.mockResolvedValue({ role: "DM" });
    prisma.character.findFirst.mockResolvedValue(fila);
    prisma.character.findFirstOrThrow.mockResolvedValue(fila);
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    prisma.characterResource.findMany.mockResolvedValue([]);
    prisma.characterCondition.findUnique.mockResolvedValue(null);
    prisma.characterCondition.findMany.mockResolvedValue([]);
    prisma.campaign.findUniqueOrThrow.mockResolvedValue({ id: "cmp1", clockSeconds });
    prisma.transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
    return { service, prisma };
  }

  it("**el mínimo de cero de un dado de golpe es POR DADO**, no por descanso", async () => {
    // SRD: «for each Hit Die spent in this way… the character regains hit points equal to the
    // total **(minimum of 0)**». Con Constitución 5 (modificador −3) y dos dados, cada dado aporta
    // al menos 0: nunca resta de lo que aportó el otro.
    const { service, prisma } = await montar({ currentHp: 1 });
    prisma.characterResource.findMany.mockResolvedValue([
      { id: "hd", key: "hit-dice-d4", current: 2, max: 2, resetOn: "NONE" },
    ]);

    await service.declare("owner1", "cmp1", "c1", { kind: "SHORT", spendHitDice: 2 });

    // Con d4 y −3, cada dado da como mucho 1 y como poco 0: la curación va de 0 a 2, **nunca
    // negativa**, y por tanto los PG nunca bajan de 1.
    const curacion = prisma.character.update.mock.calls.find(
      (llamada) => typeof llamada[0].data.currentHp === "number",
    );
    if (curacion) expect(curacion[0].data.currentHp).toBeGreaterThanOrEqual(1);
  });

  it("**un agotamiento ya vencido no se baja**: un descanso no gasta un nivel de algo que no aplica", async () => {
    const { service, prisma } = await montar({}, 10_000);
    prisma.characterCondition.findUnique.mockResolvedValue({
      id: "cc1",
      key: "exhaustion",
      level: 3,
      expiresAtClock: 3600,
    });

    await service.declare("owner1", "cmp1", "c1", { kind: "LONG" });

    expect(prisma.characterCondition.update).not.toHaveBeenCalled();
    expect(prisma.characterCondition.delete).not.toHaveBeenCalled();
  });

  it("y uno vivo sí baja un nivel", async () => {
    const { service, prisma } = await montar({}, 1000);
    prisma.characterCondition.findUnique.mockResolvedValue({
      id: "cc1",
      key: "exhaustion",
      level: 3,
      expiresAtClock: null,
    });

    await service.declare("owner1", "cmp1", "c1", { kind: "LONG" });

    expect(prisma.characterCondition.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { level: 2 } }),
    );
  });
});
