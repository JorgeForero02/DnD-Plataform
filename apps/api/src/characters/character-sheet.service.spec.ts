import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { Character } from "@prisma/client";
import type { Roller } from "../dice/dice";
import { deriveCharacter, findSrdItem } from "../rules/catalog";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { PrismaService } from "../prisma/prisma.service";
import { CharactersService } from "./characters.service";
import { RollsService } from "../rolls/rolls.service";
import { ResourcesService } from "../character-state/resources/resources.service";
import type { StatblocksService } from "../statblocks/statblocks.service";
import { SRD_STATBLOCK_POR_REF } from "../rules/catalog/monsters-srd";
import { CharacterSheetService } from "./character-sheet.service";

// Tareas 2A.6 y 2A.7 — Prisma simulado, como el resto de la carpeta.
//
// **Los PG máximos no se hardcodean en la prueba**: salen de `deriveCharacter` con la misma
// ficha que se le da al Prisma simulado. Si algún día la fórmula de PG máximos cambia, esta
// prueba se recalcula sola en vez de mentir con un número congelado.

const BUILD_EJEMPLO = {
  abilities: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
  race: { source: "SRD" as const, key: "dwarf" },
  subrace: { source: "SRD" as const, key: "dwarf-hill" },
  class: { source: "SRD" as const, key: "fighter" },
  level: 1,
  choices: { "fighter-skills": ["athletics", "perception"] },
};
const HOJA_EJEMPLO = deriveCharacter(BUILD_EJEMPLO);
const MAX_HP = HOJA_EJEMPLO.derived.maxHp.total;

/** Una fila de `Character` completa y derivable, salvo lo que sobreescriba la prueba. */
function personaje(overrides: Partial<Character> = {}): Character {
  return {
    id: "ch1",
    campaignId: "c1",
    ownerId: "p1",
    name: "Thorin",
    race: null,
    class: null,
    level: BUILD_EJEMPLO.level,
    bio: null,
    visibility: "PLAYERS",
    createdAt: new Date(),
    str: BUILD_EJEMPLO.abilities.str,
    dex: BUILD_EJEMPLO.abilities.dex,
    con: BUILD_EJEMPLO.abilities.con,
    int: BUILD_EJEMPLO.abilities.int,
    wis: BUILD_EJEMPLO.abilities.wis,
    cha: BUILD_EJEMPLO.abilities.cha,
    raceKey: BUILD_EJEMPLO.race.key,
    subraceKey: BUILD_EJEMPLO.subrace.key,
    classKey: BUILD_EJEMPLO.class.key,
    choices: BUILD_EJEMPLO.choices,
    equippedSlots: null,
    currentHp: null,
    tempHp: 0,
    version: 0,
    deathSaveSuccesses: 0,
    deathSaveFailures: 0,
    cp: 0,
    sp: 0,
    ep: 0,
    gp: 0,
    pp: 0,
    ...overrides,
  } as Character;
}

function dadoFijo(valor: number): Roller {
  return () => valor;
}

function montar(roller?: Roller, statblocks?: { resolver: jest.Mock }) {
  const prisma = {
    character: { findFirst: jest.fn(), update: jest.fn() },
    // M8: la hoja lee los modificadores temporales vivos. Por defecto ninguno, que es el estado de
    // todas las pruebas escritas antes de que existieran.
    temporaryModifier: { findMany: jest.fn().mockResolvedValue([]) },
    characterCondition: {
      findMany: jest.fn().mockResolvedValue([]),
      // I8: el ataque mira si hay ayuda recibida. Por defecto no la hay, que es el estado de
      // todas las pruebas escritas antes de que la acción Ayudar existiera.
      findUnique: jest.fn().mockResolvedValue(null),
      delete: jest.fn(),
    },
    // Fase 2B: la hoja lee el equipo **equipado** para derivar. Por defecto, sin equipo — que es
    // el estado de todas las pruebas escritas antes de que el inventario existiera.
    inventoryItem: { findMany: jest.fn().mockResolvedValue([]) },
    campaignItem: { findFirst: jest.fn().mockResolvedValue(null) },
    // 2C.4: la hoja lee el reloj para saber qué condiciones siguen vivas y si el agotamiento
    // parte los PG máximos. Reloj a cero por defecto: nada ha vencido todavía.
    campaign: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "cmp1", clockSeconds: 0 }) },
    user: { findUnique: jest.fn() },
    // Tarea 2.5.4: `rollAttack` lee el `natural` de una tirada de ataque real fuera de
    // transacción (`esCriticoDesdeLaTirada`); por defecto no existe, así que el camino sin
    // `attackRollEventId` (el de siempre) es el que se ejercita salvo que la prueba diga otra
    // cosa.
    gameEvent: { findFirst: jest.fn().mockResolvedValue(null) },
    // D-OP-11: se puede apuntar a quien pasa `canView` **o** a quien está en el encuentro activo.
    // Por defecto, en el encuentro: es el caso de mesa —el objetivo está delante— y es el que
    // ejercitan todas las pruebas de ataque escritas antes de que existiera la regla.
    combatant: { findFirst: jest.fn().mockResolvedValue({ id: "comb1" }) },
    transaction: jest.fn(),
  };
  const membership = {
    requireMember: jest.fn().mockResolvedValue({ role: "PLAYER" }),
    requireDM: jest.fn().mockResolvedValue({ role: "DM" }),
    getMembership: jest.fn().mockResolvedValue({ role: "PLAYER" }),
  };
  const events = { record: jest.fn().mockResolvedValue({ id: "ev1" }) };
  const characters = { requireEditable: jest.fn() };
  const rolls = { roll: jest.fn().mockResolvedValue({ id: "roll1", total: 15 }) };
  prisma.user.findUnique.mockResolvedValue({ isAdmin: false });

  const resources = { seedResourcesFor: jest.fn().mockResolvedValue(undefined) };

  const service = new CharacterSheetService(
    prisma as unknown as PrismaService,
    membership as unknown as MembershipService,
    events as unknown as GameEventsService,
    characters as unknown as CharactersService,
    rolls as unknown as RollsService,
    roller,
    resources as unknown as ResourcesService,
    statblocks as unknown as StatblocksService,
  );
  return { service, prisma, membership, events, characters, resources, rolls };
}

/** Simula `prisma.transaction`, con un `tx` que solo sabe bloquear la fila dada y actualizarla. */
function montarTransaccion(prisma: { transaction: jest.Mock }, fila: Character) {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([fila]),
    character: {
      update: jest.fn(({ data }: { data: Partial<Character> }) => ({ ...fila, ...data })),
    },
    // Por defecto, ninguna sesión abierta: el suceso queda fuera de sesión salvo que el test
    // diga lo contrario. Sobrescríbelo con `tx.session.findFirst.mockResolvedValue(...)`.
    session: { findFirst: jest.fn().mockResolvedValue(null) },
    // Desde la revisión de reglas del 2026-09-03, gestionar PG deriva con **las condiciones y el
    // reloj**: curar tiene que toparse contra el máximo de verdad, no contra el entero.
    // M8: la hoja lee los modificadores temporales vivos. Por defecto ninguno, que es el estado de
    // todas las pruebas escritas antes de que existieran.
    temporaryModifier: { findMany: jest.fn().mockResolvedValue([]) },
    characterCondition: {
      findMany: jest.fn().mockResolvedValue([]),
      // I8: el ataque mira si hay ayuda recibida. Por defecto no la hay, que es el estado de
      // todas las pruebas escritas antes de que la acción Ayudar existiera.
      findUnique: jest.fn().mockResolvedValue(null),
      delete: jest.fn(),
    },
    campaign: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "cmp1", clockSeconds: 0 }),
    },
    // Tarea 2.5.4: el `rollEventId` que llega en `changeHp` se comprueba contra la base antes de
    // escribirlo; por defecto "existe", que es el camino de siempre sin el campo nuevo.
    gameEvent: { findFirst: jest.fn().mockResolvedValue({ id: "ev1" }) },
    // Tarea 2.5.4: la salvación de concentración se pide creando la fila de siempre (2C.5).
    rollRequest: { create: jest.fn().mockResolvedValue({ id: "req1" }) },
  };
  prisma.transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(tx));
  return tx;
}

describe("CharacterSheetService — 2A.6 la hoja calculada", () => {
  it("getSheet() deriva maxHp y CA con deriveCharacter, nunca de una columna", async () => {
    const { service, prisma } = montar();
    prisma.character.findFirst.mockResolvedValue(personaje());

    const res = await service.getSheet("p1", "c1", "ch1");

    expect(res.sheet).not.toBeNull();
    expect(res.hp.max).toBe(MAX_HP);
    expect(res.sheet?.derived.ac).toBeDefined();
  });

  it("getSheet() de un jugador que no ve el personaje (DM_ONLY de otro dueño) da 404, no un 500", async () => {
    const { service, prisma, membership } = montar();
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.character.findFirst.mockResolvedValue(
      personaje({ ownerId: "otro", visibility: "DM_ONLY" }),
    );

    await expect(service.getSheet("p1", "c1", "ch1")).rejects.toMatchObject({ status: 404 });
  });

  it("sin raza ni clase la hoja no se deriva: sheet null y un motivo, no un 500", async () => {
    const { service, prisma } = montar();
    prisma.character.findFirst.mockResolvedValue(
      personaje({ raceKey: null, classKey: null, subraceKey: null, choices: null }),
    );

    const res = await service.getSheet("p1", "c1", "ch1");

    expect(res.sheet).toBeNull();
    expect(res.reason).toMatch(/raza/);
    expect(res.reason).toMatch(/clase/);
    expect(res.hp.max).toBeNull();
  });

  it("un dato guardado por encima del máximo se recorta AL LEER, sin reescribir la fila", async () => {
    const { service, prisma } = montar();
    prisma.character.findFirst.mockResolvedValue(personaje({ currentHp: MAX_HP + 50 }));

    const res = await service.getSheet("p1", "c1", "ch1");

    expect(res.hp.current).toBe(MAX_HP);
    expect(res.hp.exceedsMax).toBe(true);
    // La comprobación de que "no reescribe la fila" es que nunca se llamó a `update`.
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("updateSheet() exige dueño o DM (403)", async () => {
    const { service, characters } = montar();
    characters.requireEditable.mockRejectedValue(new ForbiddenException("no"));

    await expect(service.updateSheet("intruso", "c1", "ch1", { level: 2 })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("updateSheet() guarda columnas, nunca calcula: una raza inexistente es 400", async () => {
    const { service, characters } = montar();
    characters.requireEditable.mockResolvedValue(personaje());

    await expect(
      service.updateSheet("p1", "c1", "ch1", { race: { source: "SRD", key: "no-existe" } }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("CharacterSheetService — 2A.7 PG mutables", () => {
  it("changeHp() exige dueño o DM (403)", async () => {
    const { service, characters } = montar();
    characters.requireEditable.mockRejectedValue(new ForbiddenException("no"));

    await expect(service.changeHp("intruso", "c1", "ch1", { delta: -3 })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("el daño gasta primero los PG temporales, y no se suman a los actuales", async () => {
    const { service, prisma, characters, events } = montar();
    characters.requireEditable.mockResolvedValue(personaje());
    const fila = personaje({ currentHp: MAX_HP, tempHp: 4 });
    const tx = montarTransaccion(prisma, fila);

    const res = await service.changeHp("p1", "c1", "ch1", { delta: -6 });

    // 4 de temporal absorben 4; los 2 restantes bajan del máximo.
    expect(tx.character.update).toHaveBeenCalledWith({
      where: { id: "ch1" },
      data: expect.objectContaining({ currentHp: MAX_HP - 2, tempHp: 0, version: 1 }),
    });
    expect(res.hp.current).toBe(MAX_HP - 2);
    expect(events.record).toHaveBeenCalledWith(
      "p1",
      "c1",
      expect.objectContaining({
        payload: expect.objectContaining({
          type: "HP_CHANGED",
          delta: -6,
          from: MAX_HP,
          to: MAX_HP - 2,
        }),
      }),
      tx,
    );
  });

  it("un daño mayor que los PG totales se recorta en 0, no en negativo", async () => {
    const { service, prisma, characters } = montar();
    characters.requireEditable.mockResolvedValue(personaje());
    const fila = personaje({ currentHp: 3, tempHp: 0 });
    const tx = montarTransaccion(prisma, fila);

    const res = await service.changeHp("p1", "c1", "ch1", { delta: -999 });

    expect(res.hp.current).toBe(0);
    expect(tx.character.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ currentHp: 0 }) }),
    );
  });

  it("curar no puede pasarse del máximo calculado", async () => {
    const { service, prisma, characters } = montar();
    characters.requireEditable.mockResolvedValue(personaje());
    const fila = personaje({ currentHp: MAX_HP - 1, tempHp: 0 });
    montarTransaccion(prisma, fila);

    const res = await service.changeHp("p1", "c1", "ch1", { delta: 999 });

    expect(res.hp.current).toBe(MAX_HP);
    expect(res.hp.max).toBe(MAX_HP);
  });

  it("setHp() solo lo puede usar el DM", async () => {
    const { service, membership } = montar();
    membership.requireDM.mockRejectedValue(new ForbiddenException("DM role required"));

    await expect(
      service.setHp("jugador", "c1", "ch1", { expectedVersion: 0 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("setHp() con una versión vieja da 409 con el estado actual en el cuerpo", async () => {
    const { service, prisma } = montar();
    const fila = personaje({ version: 5, currentHp: 10 });
    prisma.character.findFirst.mockResolvedValue(fila);
    montarTransaccion(prisma, fila);

    let capturado: unknown;
    try {
      await service.setHp("dm1", "c1", "ch1", { expectedVersion: 4 });
    } catch (error) {
      capturado = error;
    }

    expect(capturado).toBeInstanceOf(ConflictException);
    const cuerpo = (capturado as ConflictException).getResponse() as { hp: { version: number } };
    expect(cuerpo.hp.version).toBe(5);
  });

  it("los PG temporales de dos fuentes no se suman: se queda la mayor", async () => {
    const { service, prisma } = montar();
    const fila = personaje({ version: 0, tempHp: 5 });
    prisma.character.findFirst.mockResolvedValue(fila);
    const tx = montarTransaccion(prisma, fila);

    // Una fuente más floja (3) no se suma a los 5 que ya hay: se queda igual.
    const menor = await service.setHp("dm1", "c1", "ch1", { expectedVersion: 0, tempHp: 3 });
    expect(menor.hp.temp).toBe(5);
    expect(tx.character.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { version: 1 } }),
    );
  });

  it("una fuente mayor de PG temporales sí sustituye a la menor", async () => {
    const { service, prisma, events } = montar();
    const fila = personaje({ version: 0, tempHp: 5 });
    prisma.character.findFirst.mockResolvedValue(fila);
    montarTransaccion(prisma, fila);

    const mayor = await service.setHp("dm1", "c1", "ch1", { expectedVersion: 0, tempHp: 8 });
    expect(mayor.hp.temp).toBe(8);
    expect(events.record).toHaveBeenCalledWith(
      "dm1",
      "c1",
      expect.objectContaining({ payload: expect.objectContaining({ type: "TEMP_HP_SET", to: 8 }) }),
      expect.anything(),
    );
  });

  it("rollDeathSave() exige estar a 0 PG (400 si no)", async () => {
    const { service, characters, prisma } = montar();
    characters.requireEditable.mockResolvedValue(personaje());
    const fila = personaje({ currentHp: MAX_HP });
    montarTransaccion(prisma, fila);

    await expect(service.rollDeathSave("p1", "c1", "ch1", {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("un 1 natural cuenta como DOS fracasos", async () => {
    const { service, characters, prisma } = montar(dadoFijo(1));
    characters.requireEditable.mockResolvedValue(personaje());
    const fila = personaje({ currentHp: 0, deathSaveFailures: 0 });
    const tx = montarTransaccion(prisma, fila);

    const res = await service.rollDeathSave("p1", "c1", "ch1", {});

    expect(res.deathSaves.failures).toBe(2);
    expect(res.deathSaves.status).toBe("dying");
    expect(tx.character.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deathSaveFailures: 2 }) }),
    );
  });

  it("un 20 natural revive a 1 PG y borra la cuenta", async () => {
    const { service, characters, prisma } = montar(dadoFijo(20));
    characters.requireEditable.mockResolvedValue(personaje());
    const fila = personaje({ currentHp: 0, deathSaveSuccesses: 1, deathSaveFailures: 2 });
    montarTransaccion(prisma, fila);

    const res = await service.rollDeathSave("p1", "c1", "ch1", {});

    expect(res.hp.current).toBe(1);
    expect(res.deathSaves).toEqual({ successes: 0, failures: 0, status: "alive" });
  });

  it("tres fracasos matan; tres éxitos estabilizan a 0 PG", async () => {
    const { service, characters, prisma } = montar(dadoFijo(1));
    characters.requireEditable.mockResolvedValue(personaje());
    const filaMuerte = personaje({ currentHp: 0, deathSaveFailures: 2 });
    montarTransaccion(prisma, filaMuerte);
    const muerte = await service.rollDeathSave("p1", "c1", "ch1", {});
    expect(muerte.deathSaves.status).toBe("dead");

    const { service: service2, characters: characters2, prisma: prisma2 } = montar(dadoFijo(15));
    characters2.requireEditable.mockResolvedValue(personaje());
    const filaEstable = personaje({ currentHp: 0, deathSaveSuccesses: 2 });
    montarTransaccion(prisma2, filaEstable);
    const estable = await service2.rollDeathSave("p1", "c1", "ch1", {});
    expect(estable.deathSaves).toEqual({ successes: 0, failures: 0, status: "stable" });
  });
});

describe("lo que el daño y la curación le hacen a las salvaciones de muerte", () => {
  // Las tres reglas del SRD que vivían en la cabeza de la mesa y no en el código. La segunda
  // —curar a alguien a 0 PG sin borrar sus fracasos— **era un fallo activo sobre código ya
  // desplegado**: el clérigo te levantaba con dos fracasos encima y ahí seguían la sesión
  // siguiente. Lo encontró una investigación de huecos de mecánica, no una prueba.

  it("golpear a quien ya está a 0 PG suma UN fracaso", async () => {
    const { service, prisma, characters } = montar();
    characters.requireEditable.mockResolvedValue(personaje());
    const tx = montarTransaccion(prisma, personaje({ currentHp: 0, tempHp: 0 }));

    await service.changeHp("p1", "c1", "ch1", { delta: -3 });

    expect(tx.character.update).toHaveBeenCalledWith({
      where: { id: "ch1" },
      data: expect.objectContaining({ deathSaveFailures: 1 }),
    });
  });

  it("y DOS si el golpe fue crítico — es la mitad que se olvida al implementarlo", async () => {
    const { service, prisma, characters } = montar();
    characters.requireEditable.mockResolvedValue(personaje());
    const tx = montarTransaccion(prisma, personaje({ currentHp: 0, tempHp: 0 }));

    await service.changeHp("p1", "c1", "ch1", { delta: -3, critical: true });

    expect(tx.character.update).toHaveBeenCalledWith({
      where: { id: "ch1" },
      data: expect.objectContaining({ deathSaveFailures: 2 }),
    });
  });

  it("curar aunque sea UN punto desde 0 borra los dos contadores", async () => {
    const { service, prisma, characters } = montar();
    characters.requireEditable.mockResolvedValue(personaje());
    const tx = montarTransaccion(
      prisma,
      personaje({ currentHp: 0, tempHp: 0, deathSaveSuccesses: 1, deathSaveFailures: 2 }),
    );

    await service.changeHp("p1", "c1", "ch1", { delta: 1 });

    expect(tx.character.update).toHaveBeenCalledWith({
      where: { id: "ch1" },
      data: expect.objectContaining({ deathSaveSuccesses: 0, deathSaveFailures: 0 }),
    });
  });

  it("el daño que sobra e iguala los PG máximos mata en el acto, sin tiradas", async () => {
    // Muerte masiva. El sobrante se calcula **antes** de recortar a 0: si se recorta primero,
    // la evidencia desaparece y el personaje solo queda inconsciente.
    const { service, prisma, characters, events } = montar();
    characters.requireEditable.mockResolvedValue(personaje());
    montarTransaccion(prisma, personaje({ currentHp: 5, tempHp: 0 }));

    await service.changeHp("p1", "c1", "ch1", { delta: -(5 + MAX_HP) });

    expect(events.record).toHaveBeenCalledWith(
      "p1",
      "c1",
      expect.objectContaining({ payload: expect.objectContaining({ massive: true }) }),
      expect.anything(),
    );
  });

  it("un golpe fuerte que NO llega a los PG máximos deja inconsciente, no muerto", async () => {
    const { service, prisma, characters } = montar();
    characters.requireEditable.mockResolvedValue(personaje());
    const tx = montarTransaccion(prisma, personaje({ currentHp: 5, tempHp: 0 }));

    await service.changeHp("p1", "c1", "ch1", { delta: -(5 + MAX_HP - 1) });

    expect(tx.character.update).toHaveBeenCalledWith({
      where: { id: "ch1" },
      data: expect.objectContaining({ currentHp: 0, deathSaveFailures: 0 }),
    });
  });

  it("un golpe normal a alguien en pie no toca los contadores", async () => {
    const { service, prisma, characters } = montar();
    characters.requireEditable.mockResolvedValue(personaje());
    const tx = montarTransaccion(prisma, personaje({ currentHp: MAX_HP, tempHp: 0 }));

    await service.changeHp("p1", "c1", "ch1", { delta: -2 });

    expect(tx.character.update).toHaveBeenCalledWith({
      where: { id: "ch1" },
      data: expect.objectContaining({ deathSaveSuccesses: 0, deathSaveFailures: 0 }),
    });
  });
});

describe("la siembra de recursos al terminar la ficha", () => {
  // Este agujero estuvo abierto desde 2A.8: `seedResourcesFor` tenía su prueba y **no lo
  // llamaba nadie**, así que ningún personaje tenía dados de golpe ni espacios de conjuro y el
  // panel de recursos salía vacío para todos. Lo encontró la revisión de la pantalla, no la
  // suite.

  it("al fijar clase y nivel, siembra con la hoja derivada y el nivel guardado", async () => {
    const { service, prisma, characters, resources } = montar();
    const guardado = personaje({ classKey: "wizard", level: 3 });
    characters.requireEditable.mockResolvedValue(guardado);
    prisma.character.update.mockResolvedValue(guardado);

    await service.updateSheet("owner1", "cmp1", "ch1", { level: 3 });

    expect(resources.seedResourcesFor).toHaveBeenCalledWith(
      "ch1",
      expect.objectContaining({ classKey: "wizard" }),
      3,
    );
  });

  it("una ficha a medias no siembra nada — no hay clase de la que sembrar", async () => {
    const { service, prisma, characters, resources } = montar();
    const aMedias = personaje({ classKey: null, raceKey: null });
    characters.requireEditable.mockResolvedValue(aMedias);
    prisma.character.update.mockResolvedValue(aMedias);

    await service.updateSheet("owner1", "cmp1", "ch1", { level: 2 });

    expect(resources.seedResourcesFor).not.toHaveBeenCalled();
  });
});

describe("la velocidad efectiva la calcula el servidor, no la pantalla", () => {
  // La primera versión de la hoja copiaba `effectiveSpeed` letra por letra en el navegador
  // porque ningún endpoint la exponía. Dos copias de una regla del juego se separan en cuanto
  // se toca una: la regla vive una vez, igual que `canView`.

  it("aplica las condiciones activas y deja la traza que las nombra", async () => {
    const { service, prisma } = montar();
    const fila = personaje();
    prisma.character.findFirst.mockResolvedValue(fila);
    prisma.characterCondition.findMany.mockResolvedValue([{ key: "grappled", level: null }]);

    const r = await service.getSheet("owner1", "cmp1", "ch1");

    expect(r.effectiveSpeeds.walk.total).toBe(0);
    expect(r.effectiveSpeeds.walk.steps.some((p) => p.sourceKey === "grappled")).toBe(true);
  });

  it("sin condiciones, la efectiva es la base", async () => {
    const { service, prisma } = montar();
    prisma.character.findFirst.mockResolvedValue(personaje());
    prisma.characterCondition.findMany.mockResolvedValue([]);

    const r = await service.getSheet("owner1", "cmp1", "ch1");

    expect(r.effectiveSpeeds.walk.total).toBeGreaterThan(0);
  });
});

describe("las anulaciones manuales del DM", () => {
  // El evento `MANUAL_OVERRIDE_SET` existía en el esquema desde 2A.5 y **no lo escribía nadie**,
  // porque no había columna: media función construida. Sin ella, la única salida cuando el
  // catálogo no cubre algo —un objeto mágico, una regla de la casa, un PNJ con la CA que el DM
  // decide— era mentirle a la ficha subiendo una característica.

  it("la anulación gana sobre lo derivado y deja su delta en la traza", async () => {
    const { service, prisma } = montar();
    prisma.character.findFirst.mockResolvedValue(personaje({ overrides: { ac: 18 } }));

    const r = await service.getSheet("owner1", "cmp1", "ch1");

    expect(r.sheet!.derived.ac.total).toBe(18);
    const anulacion = r.sheet!.derived.ac.steps.find((p) => p.sourceType === "manual");
    expect(anulacion).toBeDefined();
    // La traza sigue sumando: el paso guarda el DELTA hasta el valor nuevo, no el valor.
    expect(r.sheet!.derived.ac.steps.reduce((a, p) => a + p.amount, 0)).toBe(18);
  });

  it("un jugador no puede ponerla: eso sería un campo libre, no una anulación", async () => {
    // **Esta prueba estaba mal escrita y una mutación lo demostró.** Solo comprobaba que la
    // llamada fallaba, y fallaba igual con la comprobación de DM quitada: sin ella el mock de
    // `update` devolvía `undefined` y reventaba más abajo. Verde por el motivo equivocado.
    // Ahora exige lo que de verdad importa: que se pregunte por el DM y que NO se escriba nada.
    const { service, prisma, membership } = montar();
    const fila = personaje();
    prisma.character.findFirst.mockResolvedValue(fila);
    prisma.character.update.mockResolvedValue(fila);
    membership.requireDM.mockRejectedValue(new ForbiddenException("solo el DM"));

    await expect(
      service.setOverride("jugador", "cmp1", "ch1", "ac", { value: 25 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(membership.requireDM).toHaveBeenCalledWith("cmp1", "jugador");
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("**una CA de −999 se rechaza**, y hasta 2C.2 se aceptaba: el tope era el mismo para las cinco", async () => {
    // Ficha P2. El tope no sale del rango de la 5.ª edición —la anulación es la válvula de
    // escape del catálogo y apretarla al manual la inutilizaría— sino de «qué cifra ya no puede
    // ser un error de tecleo». Una CA negativa no existe en ninguna regla.
    const { service, prisma, events } = montar();
    const fila = personaje();
    prisma.character.findFirst.mockResolvedValue(fila);
    prisma.character.update.mockResolvedValue(fila);

    await expect(
      service.setOverride("dm1", "cmp1", "ch1", "ac", { value: -999 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    // Y no se escribe nada: ni la fila, ni el log.
    expect(prisma.character.update).not.toHaveBeenCalled();
    expect(events.record).not.toHaveBeenCalled();
  });

  it("el rango depende de QUÉ se anula: −5 de iniciativa vale, −5 de CA no", async () => {
    // Es el punto de tener una tabla por clave en vez de un tope único: un modificador de
    // iniciativa negativo es Destreza baja, algo que pasa en cualquier mesa.
    const { service, prisma } = montar();
    const fila = personaje();
    prisma.character.findFirst.mockResolvedValue(fila);
    prisma.character.update.mockResolvedValue(fila);

    await expect(
      service.setOverride("dm1", "cmp1", "ch1", "initiative", { value: -5 }),
    ).resolves.toBeDefined();
    await expect(
      service.setOverride("dm1", "cmp1", "ch1", "ac", { value: -5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("y la válvula de escape sigue abierta: una CA de 30 por un objeto raro se acepta", async () => {
    // La ficha avisaba de esto: apretar el tope hasta el rango del manual rompería justo el caso
    // para el que la anulación existe.
    const { service, prisma } = montar();
    const fila = personaje();
    prisma.character.findFirst.mockResolvedValue(fila);
    prisma.character.update.mockResolvedValue(fila);

    await expect(
      service.setOverride("dm1", "cmp1", "ch1", "ac", { value: 30, reason: "Regla de la casa" }),
    ).resolves.toBeDefined();
  });

  it("una velocidad de 0 se acepta: agarrado o paralizado es cero, no «sin anular»", async () => {
    const { service, prisma } = montar();
    const fila = personaje();
    prisma.character.findFirst.mockResolvedValue(fila);
    prisma.character.update.mockResolvedValue(fila);

    await expect(
      service.setOverride("dm1", "cmp1", "ch1", "speed.walk", { value: 0 }),
    ).resolves.toBeDefined();
  });

  it("al fijarla queda en el log con el valor anterior al lado", async () => {
    const { service, prisma, events } = montar();
    const fila = personaje({ overrides: { ac: 14 } });
    prisma.character.findFirst.mockResolvedValue(fila);
    prisma.character.update.mockResolvedValue(fila);

    await service.setOverride("dm1", "cmp1", "ch1", "ac", { value: 18, reason: "Anillo" });

    expect(events.record).toHaveBeenCalledWith(
      "dm1",
      "cmp1",
      expect.objectContaining({
        payload: expect.objectContaining({
          type: "MANUAL_OVERRIDE_SET",
          target: "ac",
          value: 18,
          previous: 14,
        }),
      }),
    );
  });

  it("quitarla devuelve el valor al que calcula el catálogo", async () => {
    const { service, prisma } = montar();
    prisma.character.findFirst.mockResolvedValue(personaje({ overrides: { ac: 18 } }));
    prisma.character.update.mockImplementation(({ data }: { data: { overrides: object } }) => ({
      ...personaje(),
      ...data,
    }));

    const r = await service.clearOverride("dm1", "cmp1", "ch1", "ac");

    expect(r.sheet!.derived.ac.total).not.toBe(18);
  });
});

describe("las elecciones se validan al escribir, no solo al derivar", () => {
  // Dos mitades sin terminar que una auditoría encontró el 2026-09-02, las dos invisibles desde
  // las unitarias y visibles por HTTP:
  //   1. `InvalidChoiceError` no lo capturaba nadie → una elección duplicada daba un 500.
  //   2. `assertNoUnknownChoices` existía con su prueba desde 2A.4 y no lo llamaba nadie → una
  //      clave inventada se guardaba en silencio y reaparecía como basura al subir de nivel.

  it("una habilidad repetida es un 400 con su motivo, no un 500", async () => {
    const { service, prisma, characters } = montar();
    const guardado = personaje({ classKey: "rogue", raceKey: "human", subraceKey: null });
    characters.requireEditable.mockResolvedValue(guardado);
    prisma.character.update.mockResolvedValue(guardado);

    await expect(
      service.updateSheet("owner1", "cmp1", "ch1", {
        // `rogue-skills` es el identificador de la concesión; `class.rogue.skills` es su
        // etiqueta. La primera versión de esta prueba usó la etiqueta, así que pasaba por la
        // rama de «concesión desconocida» y **nunca ejecutaba la del duplicado** — verde por el
        // camino equivocado, destapado por la mutación que quitó la traducción del error.
        choices: { "rogue-skills": ["stealth", "stealth", "perception", "acrobatics"] },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("una concesión que esta ficha no tiene se rechaza en vez de guardarse", async () => {
    const { service, prisma, characters } = montar();
    const guardado = personaje({ classKey: "rogue", raceKey: "human", subraceKey: null });
    characters.requireEditable.mockResolvedValue(guardado);
    prisma.character.update.mockResolvedValue(guardado);

    await expect(
      service.updateSheet("owner1", "cmp1", "ch1", {
        choices: { "concesion-que-no-existe": ["str"] },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("una elección ya guardada y caduca no contamina otra que sí es válida", async () => {
    // La mitad fina de la regla: se rechaza lo que llega en ESTA petición, no lo que ya estaba.
    const { service, prisma, characters } = montar();
    const guardado = personaje({
      classKey: "rogue",
      raceKey: "human",
      subraceKey: null,
      choices: { "wizard-skills": ["arcana"] },
    });
    characters.requireEditable.mockResolvedValue(guardado);
    prisma.character.update.mockResolvedValue(guardado);

    await expect(
      service.updateSheet("owner1", "cmp1", "ch1", {
        choices: { "rogue-skills": ["stealth"], "wizard-skills": ["arcana"] },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    // Y con solo la buena, pasa.
    await expect(
      service.updateSheet("owner1", "cmp1", "ch1", { choices: { "rogue-skills": ["stealth"] } }),
    ).resolves.toBeDefined();
  });

  it("pero una elección YA guardada que quedó caduca no bloquea otras ediciones", async () => {
    // La otra mitad de la regla, y la que hace que no sea una simple validación: cambiar de
    // clase deja elecciones viejas en la fila. Si eso rechazara cualquier edición posterior, el
    // personaje quedaría bloqueado por un dato que él mismo dejó atrás. Al derivar es un aviso.
    const { service, prisma, characters } = montar();
    const guardado = personaje({
      classKey: "rogue",
      raceKey: "human",
      subraceKey: null,
      choices: { "class.wizard.skills": ["arcana"] },
    });
    characters.requireEditable.mockResolvedValue(guardado);
    prisma.character.update.mockResolvedValue(guardado);

    await expect(service.updateSheet("owner1", "cmp1", "ch1", { level: 2 })).resolves.toBeDefined();
    expect(prisma.character.update).toHaveBeenCalled();
  });
});

// Encargo A8 (2026-09-07), vuelta de arreglo 1 — I2: las dos guardas de escritura que hacen
// irreproducible por la API pública el estado que `resolve.spec.ts` prueba como tolerado (una
// subclase de otra clase). Sin ellas, ese estado dejaría de ser algo que solo puede llegar por un
// dato viejo o un camino futuro, y pasaría a ser algo que cualquier `PATCH` puede crear.
describe("subclassKey — las guardas de escritura (A8, vuelta de arreglo 1)", () => {
  it("una subclase que no es de la clase actual se rechaza con 400, no se guarda", async () => {
    const { service, prisma, characters } = montar();
    const guardado = personaje({ classKey: "barbarian", raceKey: "human", subraceKey: null });
    characters.requireEditable.mockResolvedValue(guardado);
    prisma.character.update.mockResolvedValue(guardado);

    // "champion" es la subclase del guerrero, no del bárbaro.
    await expect(
      service.updateSheet("owner1", "cmp1", "ch1", {
        subclass: { source: "SRD", key: "champion" },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("cambiar de clase borra la subclase guardada, en la misma escritura", async () => {
    const { service, prisma, characters } = montar();
    const guardado = personaje({
      classKey: "barbarian",
      subclassKey: "berserker",
      raceKey: "human",
      subraceKey: null,
    });
    characters.requireEditable.mockResolvedValue(guardado);
    prisma.character.update.mockResolvedValue({ ...guardado, classKey: "fighter" });

    await service.updateSheet("owner1", "cmp1", "ch1", {
      class: { source: "SRD", key: "fighter" },
    });

    // Sin `objectContaining`: solo se manda `class` en el cuerpo, así que `data` es exactamente
    // estas dos claves — una comprobación laxa aquí dejaría pasar un `subclassKey` que no se
    // hubiera borrado de verdad si algo más lo añadiera a `data` por otro lado.
    expect(prisma.character.update).toHaveBeenCalledWith({
      where: { id: "ch1" },
      data: { classKey: "fighter", subclassKey: null },
    });
  });
});

describe("un muerto no se cura con puntos de golpe, y el combate se graba en su sesión", () => {
  it("curar a un personaje con tres fracasos a 0 PG es un 400, no una resurrección silenciosa", async () => {
    // Lo encontró un DM en una partida de prueba: echar diez puntos a un muerto lo devolvía a la
    // vida con el contador a cero y sin aviso. El SRD pide magia de resurrección; esta fase no la
    // modela, así que se rechaza con su motivo en vez de mentir.
    const { service, prisma, characters } = montar();
    const muerto = personaje({ currentHp: 0, deathSaveFailures: 3 });
    characters.requireEditable.mockResolvedValue(muerto);
    montarTransaccion(prisma, muerto);

    await expect(service.changeHp("p1", "c1", "ch1", { delta: 10 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("pero bajarle los PG a un cadáver (delta negativo) sigue permitido", async () => {
    const { service, prisma, characters } = montar();
    const muerto = personaje({ currentHp: 0, deathSaveFailures: 3 });
    characters.requireEditable.mockResolvedValue(muerto);
    montarTransaccion(prisma, muerto);

    await expect(service.changeHp("p1", "c1", "ch1", { delta: -1 })).resolves.toBeDefined();
  });

  it("el daño se graba con la sesión en curso, no fuera de sesión", async () => {
    // El registro no reconstruía la partida: el combate se grababa con `sessionId: null` aunque
    // la sesión estuviera abierta, así que `GET /events?sessionId` salía casi vacío.
    const { service, prisma, characters, events } = montar();
    const fila = personaje({ currentHp: MAX_HP });
    characters.requireEditable.mockResolvedValue(fila);
    const tx = montarTransaccion(prisma, fila);
    tx.session.findFirst.mockResolvedValue({ id: "sess-en-curso" });

    await service.changeHp("p1", "c1", "ch1", { delta: -5 });

    expect(events.record).toHaveBeenCalledWith(
      "p1",
      "c1",
      expect.objectContaining({ sessionId: "sess-en-curso" }),
      expect.anything(),
    );
  });
});

// ============================================================================================
// Fase 2B — el equipo equipado alimenta la hoja, y el arma equipada produce su tirada.
//
// **Lo que se prueba aquí es la costura**, no las reglas: que la armadura sustituya la fórmula y
// que el escudo sume plano ya está probado en `rules/items.spec.ts`, y qué característica ataca
// con un arma sutil, en `rules/attacks.spec.ts`. Lo que ningún otro sitio puede demostrar es que
// la hoja **lea el inventario**, que solo cuente lo equipado, y que la expresión de la tirada la
// componga el servidor.
// ============================================================================================

/** Una fila de inventario con un objeto del SRD, tal como la devuelve Prisma. */
function filaDeInventario(srdKey: string, extra: Record<string, unknown> = {}) {
  return {
    id: `inv-${srdKey}`,
    characterId: "ch1",
    srdKey,
    campaignItemId: null,
    quantity: 1,
    location: "EQUIPPED",
    slot: null,
    attuned: false,
    storedAt: null,
    note: null,
    createdAt: new Date(),
    ...extra,
  };
}

describe("2B — el equipo equipado cambia los números de la hoja, con su traza", () => {
  it("una cota de malla equipada sustituye la fórmula de CA y el paso sale en la traza", async () => {
    const { service, prisma } = montar();
    prisma.character.findFirst.mockResolvedValue(personaje());
    prisma.inventoryItem.findMany.mockResolvedValue([filaDeInventario("chain-mail")]);

    const res = await service.getSheet("p1", "c1", "ch1");

    // Sin equipo la CA de esta ficha es 10 + Destreza; con cota de malla, 16 y la Destreza
    // recortada a cero. El número se compara contra el total de la traza, no contra una cifra
    // escrita a mano: si la fórmula cambia, la prueba sigue diciendo la verdad.
    const ca = res.sheet!.derived.ac;
    expect(ca.total).toBe(16);
    // **La traza suma exactamente el total.** Con Destreza 12 y tope 0 los pasos son
    // «16 cota + 1 destreza − 1 recorte»: el recorte se enseña y además cuadra.
    expect(ca.steps.reduce((suma, paso) => suma + paso.amount, 0)).toBe(ca.total);
    expect(ca.steps.some((paso) => paso.sourceType === "item")).toBe(true);
  });

  it("lo que está en la mochila NO cambia ningún número: solo cuenta lo equipado", async () => {
    const { service, prisma } = montar();
    prisma.character.findFirst.mockResolvedValue(personaje());
    prisma.inventoryItem.findMany.mockResolvedValue([]);

    const res = await service.getSheet("p1", "c1", "ch1");

    // La consulta pide explícitamente las filas equipadas; llevar la armadura encima no viste.
    expect(prisma.inventoryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { characterId: "ch1", location: "EQUIPPED" } }),
    );
    expect(res.sheet!.derived.ac.total).toBe(11);
  });

  it("un arma equipada aparece en el cuadro de ataques con su bono y su daño", async () => {
    const { service, prisma } = montar();
    prisma.character.findFirst.mockResolvedValue(personaje());
    prisma.inventoryItem.findMany.mockResolvedValue([
      filaDeInventario("long-sword", { slot: "MAIN_HAND" }),
    ]);

    const res = await service.getSheet("p1", "c1", "ch1");

    const ataque = res.attacks.find((a) => a.name === "Espada larga");
    expect(ataque).toBeDefined();
    // Fuerza 15 (+2) y competencia +2 en un guerrero de nivel 1: +4 al ataque, 1d8+2 de daño.
    expect(ataque!.attackBonus.total).toBe(4);
    expect(ataque!.damage.expression).toBe("1d8+2");
    expect(ataque!.versatileDamage?.expression).toBe("1d10+2");
  });

  it("una fila cuyo objeto ya no existe en el catálogo avisa, pero no rompe la hoja", async () => {
    const { service, prisma } = montar();
    prisma.character.findFirst.mockResolvedValue(personaje());
    prisma.inventoryItem.findMany.mockResolvedValue([filaDeInventario("espada-que-ya-no-existe")]);

    const res = await service.getSheet("p1", "c1", "ch1");

    expect(res.sheet).not.toBeNull();
    expect(res.sheet!.warnings.some((a) => a.code === "item_unresolved")).toBe(true);
  });

  it("la bolsa viaja con la hoja, para no pedirla aparte", async () => {
    const { service, prisma } = montar();
    prisma.character.findFirst.mockResolvedValue(personaje({ gp: 12, sp: 3 }));

    const res = await service.getSheet("p1", "c1", "ch1");

    expect(res.money).toEqual({ cp: 0, sp: 3, ep: 0, gp: 12, pp: 0 });
  });
});

describe("2B/2C — tirar con un arma: la expresión la compone el servidor", () => {
  // **El rótulo que `rollAttack` escribe en la tirada de ataque**, y del que ahora depende el
  // crítico. Se saca del catálogo, no se teclea: si el nombre del arma cambia en el SRD, la
  // prueba se mueve con él en vez de quedarse verde comparando dos cadenas obsoletas.
  const RAZON_DEL_ATAQUE = `Ataque con ${findSrdItem("long-sword")!.name}`;

  function conEspada() {
    const montado = montar();
    montado.prisma.character.findFirst.mockResolvedValue(personaje());
    montado.characters.requireEditable.mockResolvedValue(personaje());
    montado.prisma.inventoryItem.findMany.mockResolvedValue([
      filaDeInventario("long-sword", { slot: "MAIN_HAND" }),
    ]);
    return montado;
  }

  it("el ataque es 1d20 + el bono del cuadro, y la ventaja va como modo, no como sintaxis", async () => {
    const { service, rolls } = conEspada();

    await service.rollAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      part: "ATTACK",
      spendInspiration: false,
      mode: "ADVANTAGE",
      versatile: false,
    });

    expect(rolls.roll).toHaveBeenCalledWith(
      "p1",
      "c1",
      expect.objectContaining({ expression: "1d20+4", mode: "ADVANTAGE", characterId: "ch1" }),
    );
  });

  it("el daño a dos manos usa el dado versátil", async () => {
    const { service, rolls } = conEspada();

    await service.rollAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      part: "DAMAGE",
      spendInspiration: false,
      mode: "NORMAL",
      versatile: true,
    });

    expect(rolls.roll).toHaveBeenCalledWith(
      "p1",
      "c1",
      expect.objectContaining({ expression: "1d10+2" }),
    );
  });

  it("un crítico duplica los DADOS y nunca el modificador", async () => {
    const { service, rolls, prisma } = conEspada();
    // El crítico ya no se declara: se cita la tirada de ataque que lo sacó (C2.5-2, cerrada el
    // 2026-09-05). El `payload` es el que `RollsService` escribe en el suceso de esa tirada.
    prisma.gameEvent.findFirst.mockResolvedValue({
      payload: { natural: "TWENTY", reason: "Ataque con Espada larga" },
    });

    await service.rollAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      part: "DAMAGE",
      spendInspiration: false,
      mode: "NORMAL",
      versatile: false,
      attackRollEventId: "ev-atk-20",
    });

    // 1d8+2 crítico es 2d8+2. Si saliera 2d8+4, el modificador se estaría duplicando también.
    expect(rolls.roll).toHaveBeenCalledWith(
      "p1",
      "c1",
      expect.objectContaining({ expression: "2d8+2" }),
      // Y la tirada que se cobra queda escrita: la base tiene un índice único sobre ella, así que
      // este mismo crítico no se puede cobrar dos veces (D-OP-15).
      { attackRollEventId: "ev-atk-20" },
    );
  });

  // Tarea 2.5.4, ficha C2.5-2 — el crítico atado al `eventId` de una tirada real.
  it("con attackRollEventId de una tirada con natural TWENTY, duplica los dados aunque el cuerpo diga critical: false", async () => {
    const { service, rolls, prisma } = conEspada();
    prisma.gameEvent.findFirst.mockResolvedValue({
      payload: { natural: "TWENTY", reason: RAZON_DEL_ATAQUE },
    });

    await service.rollAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      part: "DAMAGE",
      spendInspiration: false,
      mode: "NORMAL",
      versatile: false,
      attackRollEventId: "ev-atk-20",
    });

    expect(rolls.roll).toHaveBeenCalledWith(
      "p1",
      "c1",
      expect.objectContaining({ expression: "2d8+2" }),
      // D-OP-15: la tirada que se cobra queda escrita en el suceso del daño, y la base tiene
      // un índice único sobre ella: el segundo cobro no llega a escribirse.
      { attackRollEventId: "ev-atk-20" },
    );
    expect(prisma.gameEvent.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "ev-atk-20",
          campaignId: "c1",
          subjectType: "character",
          subjectId: "ch1",
          // Por la columna, no por dentro del `payload`: es una columna real e indexada.
          type: "ABILITY_ROLL",
        },
      }),
    );
  });

  it("con attackRollEventId de una tirada SIN natural TWENTY, no duplica aunque el cuerpo diga critical: true", async () => {
    // Es exactamente el caso que la ficha C2.5-2 cierra: el cuerpo ya no manda.
    const { service, rolls, prisma } = conEspada();
    prisma.gameEvent.findFirst.mockResolvedValue({
      payload: { natural: "NONE", reason: RAZON_DEL_ATAQUE },
    });

    await service.rollAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      part: "DAMAGE",
      spendInspiration: false,
      mode: "NORMAL",
      versatile: false,
      attackRollEventId: "ev-atk-11",
    });

    expect(rolls.roll).toHaveBeenCalledWith(
      "p1",
      "c1",
      expect.objectContaining({ expression: "1d8+2" }),
      // D-OP-15: la tirada que se cobra queda escrita en el suceso del daño, y la base tiene
      // un índice único sobre ella: el segundo cobro no llega a escribirse.
      { attackRollEventId: "ev-atk-11" },
    );
  });

  it("un 20 natural de OTRA tirada no vale como crítico de este ataque", async () => {
    // La revisión de cierre: el filtro aceptaba cualquier `ABILITY_ROLL` del personaje con un 20
    // natural, así que un 20 en una prueba de Sigilo cobraba el daño duplicado de la espada.
    const { service, rolls, prisma } = conEspada();
    prisma.gameEvent.findFirst.mockResolvedValue({
      payload: { natural: "TWENTY", reason: "Sigilo" },
    });

    await service.rollAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      part: "DAMAGE",
      spendInspiration: false,
      mode: "NORMAL",
      versatile: false,
      attackRollEventId: "ev-sigilo-20",
    });

    expect(rolls.roll).toHaveBeenCalledWith(
      "p1",
      "c1",
      expect.objectContaining({ expression: "1d8+2" }),
      // D-OP-15: la tirada que se cobra queda escrita en el suceso del daño, y la base tiene
      // un índice único sobre ella: el segundo cobro no llega a escribirse.
      { attackRollEventId: "ev-sigilo-20" },
    );
  });

  it("**sin attackRollEventId NO hay crítico**, porque ya no queda nada que declararlo", async () => {
    // Esta prueba afirmaba lo contrario hasta el 2026-09-05 —«sigue mandando el `critical` del
    // cuerpo»— y ese era el hueco: un campo que la petición declaraba y el servidor se creía.
    // Ahora pedir daño sin decir qué tirada se cobra es legítimo y **va sin duplicar**.
    const { service, rolls, prisma } = conEspada();

    await service.rollAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      part: "DAMAGE",
      spendInspiration: false,
      mode: "NORMAL",
      versatile: false,
    });

    expect(rolls.roll).toHaveBeenCalledWith(
      "p1",
      "c1",
      expect.objectContaining({ expression: "1d8+2" }),
    );
    // Y ni siquiera se pregunta a la base: sin tirada citada no hay nada que leer.
    expect(prisma.gameEvent.findFirst).not.toHaveBeenCalled();
  });

  it("un attackRollEventId que no existe en esta campaña es 400, no una duplicación silenciosa", async () => {
    const { service, prisma } = conEspada();
    prisma.gameEvent.findFirst.mockResolvedValue(null);

    await expect(
      service.rollAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
        part: "DAMAGE",
        spendInspiration: false,
        mode: "NORMAL",
        versatile: false,
        attackRollEventId: "ev-ajeno",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("el daño nunca hereda la ventaja: la ventaja es del d20", async () => {
    const { service, rolls } = conEspada();

    await service.rollAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      part: "DAMAGE",
      spendInspiration: false,
      mode: "ADVANTAGE",
      versatile: false,
    });

    expect(rolls.roll).toHaveBeenCalledWith(
      "p1",
      "c1",
      expect.objectContaining({ mode: "NORMAL" }),
    );
  });

  it("tirar por un personaje ajeno es 403: tirar en su nombre es escribir en su nombre", async () => {
    const { service, characters } = conEspada();
    // `requireEditable` es el guardián de dueño-o-DM que usan los PG y la ficha. Sin esta
    // prueba, borrar su llamada dejaba que cualquier miembro de la campaña tirara con el
    // personaje de otro **y publicara la tirada en el registro** — la suite entera seguía verde.
    // Lo encontró la revisión de 2B.
    characters.requireEditable.mockRejectedValue(
      new ForbiddenException("Solo el DM o quien lo creó puede editarlo."),
    );

    await expect(
      service.rollAttack("otro", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
        part: "ATTACK",
        spendInspiration: false,
        mode: "NORMAL",
        versatile: false,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("pedir un ataque con un arma que no está equipada es 400, no 500", async () => {
    const { service } = conEspada();

    await expect(
      service.rollAttack("p1", "c1", "ch1", "SRD:greataxe:MAIN_HAND", {
        part: "ATTACK",
        spendInspiration: false,
        mode: "NORMAL",
        versatile: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("paso 2, tarea A11 — el daño de la Furia, con su propia traza", () => {
  const BARBARO = {
    abilities: { str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
    race: { source: "SRD" as const, key: "human" },
    class: { source: "SRD" as const, key: "barbarian" },
    level: 3,
    choices: { "barbarian-skills": ["athletics", "intimidation"] },
  };
  const HOJA_BARBARO = deriveCharacter(BARBARO);

  function barbaroConHachaADosManos() {
    return {
      id: "ch1",
      campaignId: "c1",
      ownerId: "p1",
      name: "Grosk",
      race: null,
      class: null,
      level: BARBARO.level,
      bio: null,
      visibility: "PLAYERS" as const,
      createdAt: new Date(),
      str: BARBARO.abilities.str,
      dex: BARBARO.abilities.dex,
      con: BARBARO.abilities.con,
      int: BARBARO.abilities.int,
      wis: BARBARO.abilities.wis,
      cha: BARBARO.abilities.cha,
      raceKey: BARBARO.race.key,
      subraceKey: null,
      classKey: BARBARO.class.key,
      choices: BARBARO.choices,
      equippedSlots: null,
      currentHp: HOJA_BARBARO.derived.maxHp.total,
      tempHp: 0,
      version: 0,
      statblockRef: null,
      overrides: null,
      archivedAt: null,
    } as unknown as Character;
  }

  function conBarbaroEnFuria() {
    const montado = montar();
    const personaje = barbaroConHachaADosManos();
    montado.prisma.character.findFirst.mockResolvedValue(personaje);
    montado.characters.requireEditable.mockResolvedValue(personaje);
    montado.prisma.inventoryItem.findMany.mockResolvedValue([
      filaDeInventario("greataxe", { slot: "MAIN_HAND" }),
    ]);
    // La condición que deja `FURIA.effects` al usar la actividad (`CLAVE_FURIA_ACTIVA`,
    // `rules/catalog/classes.ts`), viva y sin vencer.
    montado.prisma.characterCondition.findMany.mockResolvedValue([
      { key: "raging", level: null, expiresAtClock: null, expiryEdge: null },
    ]);
    return montado;
  }

  it("con la Furia activa, el daño cuerpo a cuerpo sube +2 (nivel 3: tramo `rage-damage` desde 1) y la traza dice de dónde sale", async () => {
    const { service, rolls } = conBarbaroEnFuria();

    await service.rollAttack("p1", "c1", "ch1", "SRD:greataxe:MAIN_HAND", {
      part: "DAMAGE",
      spendInspiration: false,
      mode: "NORMAL",
      versatile: false,
    });

    // El hacha a dos manos es `1d12` y Fuerza 16 da +3: sin Furia sería `1d12+3`.
    expect(rolls.roll).toHaveBeenCalledWith(
      "p1",
      "c1",
      expect.objectContaining({ expression: "1d12+5", label: expect.stringContaining("Furia") }),
    );
  });

  it("la traza del golpe trae el paso ENTERO de la escala `rage-damage`, no un número suelto", async () => {
    const { service } = conBarbaroEnFuria();

    const golpe = await service.rollAttack("p1", "c1", "ch1", "SRD:greataxe:MAIN_HAND", {
      part: "DAMAGE",
      spendInspiration: false,
      mode: "NORMAL",
      versatile: false,
    });

    // Menor de la ronda de arreglo 1: `.toMatch(/rage-damage/)` sobre la cadena entera seguía en
    // verde aunque `sourceType` o `amount` cambiaran a cualquier cosa — mientras `sourceKey`
    // siguiera diciendo "rage-damage" en algún sitio del JSON, daba igual el resto. Aserción de
    // identidad sobre el paso completo: es exactamente lo que produce `resolverOrigen` para
    // `{ tipo: "escala", clave: "rage-damage" }` a nivel 3 (tramo `desde: 1`, valor 2).
    expect((golpe as { trace?: unknown }).trace).toEqual([
      {
        op: "base",
        amount: 2,
        sourceType: "class",
        sourceKey: "rage-damage",
        labelKey: "scale.rage-damage",
      },
    ]);
  });

  it("sin la condición activa, el mismo bárbaro con la misma hacha NO gana el bono ni trae `trace`", async () => {
    const { service, rolls, prisma } = conBarbaroEnFuria();
    prisma.characterCondition.findMany.mockResolvedValue([]);

    const golpe = await service.rollAttack("p1", "c1", "ch1", "SRD:greataxe:MAIN_HAND", {
      part: "DAMAGE",
      spendInspiration: false,
      mode: "NORMAL",
      versatile: false,
    });

    expect(rolls.roll).toHaveBeenCalledWith(
      "p1",
      "c1",
      expect.objectContaining({ expression: "1d12+3" }),
    );
    expect((golpe as { trace?: unknown }).trace).toBeUndefined();
  });

  it("una condición de Furia ya VENCIDA no suma nada — la misma regla de vencimiento que el resto del fichero", async () => {
    const { service, rolls, prisma } = conBarbaroEnFuria();
    prisma.campaign.findUniqueOrThrow.mockResolvedValue({ id: "c1", clockSeconds: 10_000 });
    prisma.characterCondition.findMany.mockResolvedValue([
      { key: "raging", level: null, expiresAtClock: 100, expiryEdge: null },
    ]);

    await service.rollAttack("p1", "c1", "ch1", "SRD:greataxe:MAIN_HAND", {
      part: "DAMAGE",
      spendInspiration: false,
      mode: "NORMAL",
      versatile: false,
    });

    expect(rolls.roll).toHaveBeenCalledWith(
      "p1",
      "c1",
      expect.objectContaining({ expression: "1d12+3" }),
    );
  });

  it("un ataque a DISTANCIA no gana el bono de Furia aunque esté activa: el SRD lo restringe a cuerpo a cuerpo con Fuerza", async () => {
    const montado = montar();
    const personaje = barbaroConHachaADosManos();
    montado.prisma.character.findFirst.mockResolvedValue(personaje);
    montado.characters.requireEditable.mockResolvedValue(personaje);
    montado.prisma.inventoryItem.findMany.mockResolvedValue([
      filaDeInventario("longbow", { slot: "MAIN_HAND" }),
    ]);
    montado.prisma.characterCondition.findMany.mockResolvedValue([
      { key: "raging", level: null, expiresAtClock: null, expiryEdge: null },
    ]);

    const golpe = await montado.service.rollAttack("p1", "c1", "ch1", "SRD:longbow:MAIN_HAND", {
      part: "DAMAGE",
      spendInspiration: false,
      mode: "NORMAL",
      versatile: false,
    });

    expect((golpe as { trace?: unknown }).trace).toBeUndefined();
  });
});

describe("2B — la hoja no enseña la identidad de un objeto que quien mira no puede ver", () => {
  /** Un anillo propio de la campaña, `DM_ONLY`, tal y como sale de Prisma. */
  const anilloSecreto = {
    id: "ci-1",
    campaignId: "c1",
    name: "Anillo del Traidor",
    kind: "OTHER",
    description: "Lo forjó quien no debía.",
    weightOz: 1,
    costCp: null,
    effects: [{ kind: "ac", amount: 1 }],
    requiresAttunement: false,
    slot: "RING_1",
    weaponCategory: null,
    weaponRange: null,
    damageDice: null,
    damageType: null,
    weaponProperties: [],
    versatileDice: null,
    rangeNormalFt: null,
    rangeLongFt: null,
    armorCategory: null,
    baseAc: null,
    dexCap: null,
    strengthRequirement: 0,
    stealthDisadvantage: false,
    visibility: "DM_ONLY",
    createdById: "dm1",
    createdAt: new Date(),
    grants: [],
  };

  function conAnilloSecreto(rolDeQuienMira: "DM" | "PLAYER") {
    const montado = montar();
    montado.prisma.character.findFirst.mockResolvedValue(personaje());
    montado.prisma.inventoryItem.findMany.mockResolvedValue([
      filaDeInventario("", { srdKey: null, campaignItemId: "ci-1", slot: "RING_1" }),
    ]);
    montado.prisma.campaignItem.findFirst.mockResolvedValue(anilloSecreto);
    montado.membership.getMembership.mockResolvedValue({ role: rolDeQuienMira });
    return montado;
  }

  it("un jugador ve el efecto en la CA, pero no el nombre ni el identificador del objeto", async () => {
    const { service } = conAnilloSecreto("PLAYER");

    const res = await service.getSheet("p1", "c1", "ch1");

    const traza = JSON.stringify(res.sheet!.derived.ac);
    // El número sí: quitarlo daría una CA distinta a cada persona que mira la MISMA hoja, y
    // entonces la hoja mentiría a alguien. Lo que se quita es la identidad.
    expect(res.sheet!.derived.ac.total).toBe(12);
    expect(traza).not.toContain("Anillo del Traidor");
    expect(traza).not.toContain("ci-1");
    expect(JSON.stringify(res)).not.toContain("Anillo del Traidor");
  });

  it("el DM sí lo ve por su nombre: es suyo", async () => {
    const { service } = conAnilloSecreto("DM");

    const res = await service.getSheet("dm1", "c1", "ch1");

    expect(JSON.stringify(res.sheet!.derived.ac)).toContain("ci-1");
    expect(res.sheet!.derived.ac.total).toBe(12);
  });
});

describe("el agotamiento llega al motor (2C.4, hueco H-2C-5)", () => {
  // Hasta 2C.4 las condiciones solo alimentaban la velocidad, así que una hoja con agotamiento 4
  // enseñaba unos PG máximos que la regla dice que ese personaje no tiene.

  it("**con agotamiento 4, la hoja enseña la mitad de PG máximos, y lo dice en la traza**", async () => {
    const { service, prisma } = montar();
    const fila = personaje();
    prisma.character.findFirst.mockResolvedValue(fila);
    prisma.characterCondition.findMany.mockResolvedValue([
      { key: "exhaustion", level: 4, expiresAtClock: null },
    ]);

    const conAgotamiento = await service.getSheet("dm1", "cmp1", "ch1");

    prisma.characterCondition.findMany.mockResolvedValue([]);
    const sano = await service.getSheet("dm1", "cmp1", "ch1");

    const maximoSano = sano.sheet!.derived.maxHp.total;
    expect(conAgotamiento.sheet!.derived.maxHp.total).toBe(Math.floor(maximoSano / 2));
    expect(conAgotamiento.hp.max).toBe(Math.floor(maximoSano / 2));
    expect(
      conAgotamiento.sheet!.derived.maxHp.steps.some((p) => p.sourceKey === "exhaustion:4"),
    ).toBe(true);
  });

  it("con agotamiento 3 no se toca nada: es una entrada de la tabla, no una escala", async () => {
    const { service, prisma } = montar();
    prisma.character.findFirst.mockResolvedValue(personaje());
    prisma.characterCondition.findMany.mockResolvedValue([
      { key: "exhaustion", level: 3, expiresAtClock: null },
    ]);
    const hoja = await service.getSheet("dm1", "cmp1", "ch1");
    expect(hoja.sheet!.derived.maxHp.steps.some((p) => p.sourceKey?.startsWith("exhaustion"))).toBe(
      false,
    );
  });

  it("**una condición vencida ya no calcula**: el agotamiento caducado no parte nada", async () => {
    const { service, prisma } = montar();
    prisma.character.findFirst.mockResolvedValue(personaje());
    prisma.campaign.findUniqueOrThrow.mockResolvedValue({ id: "cmp1", clockSeconds: 10_000 });
    prisma.characterCondition.findMany.mockResolvedValue([
      { key: "exhaustion", level: 4, expiresAtClock: 3600 },
    ]);

    const hoja = await service.getSheet("dm1", "cmp1", "ch1");

    expect(hoja.sheet!.derived.maxHp.steps.some((p) => p.sourceKey === "exhaustion:4")).toBe(false);
  });
});

describe("curar respeta el máximo de VERDAD (revisión de reglas, 2026-09-03)", () => {
  // `changeHp` es el camino principal de curación de la mesa, y derivaba «pelado»: sin las
  // anulaciones del DM y **sin el agotamiento**. Un personaje con agotamiento 4 se curaba hasta el
  // máximo entero y la hoja se lo enseñaba recortado con el aviso de «superan el máximo» — que es
  // exactamente el fallo que 2C.4 decía haber arreglado, con la mitad del sistema sin arreglar.

  it("**con agotamiento 4, curar se topa contra la mitad**, no contra el máximo entero", async () => {
    const { service, prisma } = montar();
    const fila = personaje({ currentHp: 1 });
    prisma.character.findFirst.mockResolvedValue(fila);
    const tx = montarTransaccion(prisma, fila);
    tx.characterCondition.findMany.mockResolvedValue([
      { key: "exhaustion", level: 4, expiresAtClock: null },
    ]);
    prisma.characterCondition.findMany.mockResolvedValue([
      { key: "exhaustion", level: 4, expiresAtClock: null },
    ]);

    const sano = await service.getSheet("dm1", "cmp1", "ch1");
    const maximoPartido = sano.hp.max!;

    await service.changeHp("dm1", "cmp1", "ch1", { delta: 999 });

    const escrito = tx.character.update.mock.calls.at(-1)![0].data.currentHp;
    expect(escrito).toBe(maximoPartido);
  });

  it("y una anulación del DM sobre `maxHp` también gobierna la curación, no solo la hoja", async () => {
    // El mismo camino ignoraba `modificadoresDeAnulacion`: el número que se veía y el número
    // contra el que se curaba eran distintos.
    const { service, prisma } = montar();
    const fila = personaje({ currentHp: 1, overrides: { maxHp: 7 } });
    prisma.character.findFirst.mockResolvedValue(fila);
    const tx = montarTransaccion(prisma, fila);

    await service.changeHp("dm1", "cmp1", "ch1", { delta: 999 });

    expect(tx.character.update.mock.calls.at(-1)![0].data.currentHp).toBe(7);
  });
});

/**
 * Un mock de `StatblocksService` que resuelve al statblock REAL del catálogo SRD (el que ya
 * verifica `monsters-srd.spec.ts`), para no inventar una segunda copia parcial del dato en esta
 * prueba. `resolverParaHoja` es lo que usa `construirODenegar` para derivar los PG máximos;
 * `resolver` es lo que usa la pieza C para leer `damageModifiers` sin decidir visibilidad.
 */
function statblocksDelCatalogo(ref: string) {
  const statblock = SRD_STATBLOCK_POR_REF.get(ref)!;
  return {
    resolverParaHoja: jest.fn().mockResolvedValue({ statblock }),
    resolver: jest.fn().mockResolvedValue(statblock),
  };
}

describe("tarea 2.5.1 — un damageType en changeHp reduce el daño por resistencia, con traza", () => {
  it("sin damageType, el comportamiento de hoy no cambia: ni se consulta la resistencia", async () => {
    const statblocks = statblocksDelCatalogo("SRD:wight");
    const { service, prisma, characters } = montar(undefined, statblocks);
    const fila = personaje({ currentHp: 45, statblockRef: "SRD:wight" });
    characters.requireEditable.mockResolvedValue(fila);
    const tx = montarTransaccion(prisma, fila);

    const res = await service.changeHp("dm1", "c1", "ch1", { delta: -10 });

    expect(statblocks.resolver).not.toHaveBeenCalled();
    expect(tx.character.update.mock.calls.at(-1)![0].data.currentHp).toBe(35);
    expect(res).not.toHaveProperty("damageTrace");
  });

  it("con damageType y sin statblockRef, un daño al que NO se es resistente sigue entero", async () => {
    // **Esta prueba afirmaba lo contrario hasta el 2026-09-06** —«con `damageType` pero sin
    // `statblockRef` (un jugador), tampoco se reduce nada»— y era cierta: los modificadores solo
    // se consultaban si había statblock, y un PJ nunca lo tiene. **Se corrige, no se borra**: lo
    // que sigue siendo verdad es que un daño al que el personaje no es resistente entra entero, y
    // eso es lo que mide ahora. La mitad que dejó de ser verdad es la de «tampoco», y su caso
    // nuevo está justo debajo.
    const statblocks = { resolver: jest.fn(), resolverParaHoja: jest.fn() };
    const { service, prisma, characters } = montar(undefined, statblocks);
    const fila = personaje({ currentHp: MAX_HP });
    characters.requireEditable.mockResolvedValue(fila);
    const tx = montarTransaccion(prisma, fila);

    await service.changeHp("dm1", "c1", "ch1", { delta: -10, damageType: "BLUDGEONING" });

    // El resolutor de statblocks **sigue sin llamarse**: un PJ no tiene plantilla que resolver.
    expect(statblocks.resolver).not.toHaveBeenCalled();
    expect(tx.character.update.mock.calls.at(-1)![0].data.currentHp).toBe(MAX_HP - 10);
  });

  it("un PNJ con resistencia limpia recibe la mitad, y la traza sale en la respuesta", async () => {
    // El esqueleto: vulnerable a contundente, no resistente — se usa el tumulario (resiste
    // necrótico limpio) para probar RESIST de verdad.
    const statblocks = statblocksDelCatalogo("SRD:wight");
    const { service, prisma, characters } = montar(undefined, statblocks);
    const fila = personaje({ currentHp: 45, statblockRef: "SRD:wight" });
    characters.requireEditable.mockResolvedValue(fila);
    const tx = montarTransaccion(prisma, fila);

    const res = await service.changeHp("dm1", "c1", "ch1", {
      delta: -25,
      damageType: "NECROTIC",
    });

    expect(statblocks.resolver).toHaveBeenCalledWith("c1", "SRD:wight");
    // 25 de necrótico con resistencia: 12 de verdad (redondeado hacia abajo).
    expect(tx.character.update.mock.calls.at(-1)![0].data.currentHp).toBe(45 - 12);
    expect(res).toHaveProperty("damageTrace");
    expect((res as { damageTrace: { total: number } }).damageTrace.total).toBe(12);
  });

  it("un PNJ vulnerable a ese tipo recibe el doble", async () => {
    const statblocks = statblocksDelCatalogo("SRD:skeleton");
    const { service, prisma, characters } = montar(undefined, statblocks);
    const fila = personaje({ currentHp: 13, statblockRef: "SRD:skeleton" });
    characters.requireEditable.mockResolvedValue(fila);
    const tx = montarTransaccion(prisma, fila);

    await service.changeHp("dm1", "c1", "ch1", { delta: -5, damageType: "BLUDGEONING" });

    // 5 de contundente, vulnerable: 10 de verdad, y el esqueleto solo tiene 13.
    expect(tx.character.update.mock.calls.at(-1)![0].data.currentHp).toBe(3);
  });

  it("un PNJ inmune a ese tipo no pierde ningún punto de golpe", async () => {
    const statblocks = statblocksDelCatalogo("SRD:zombie");
    const { service, prisma, characters } = montar(undefined, statblocks);
    const fila = personaje({ currentHp: 22, statblockRef: "SRD:zombie" });
    characters.requireEditable.mockResolvedValue(fila);
    const tx = montarTransaccion(prisma, fila);

    await service.changeHp("dm1", "c1", "ch1", { delta: -25, damageType: "POISON" });

    expect(tx.character.update.mock.calls.at(-1)![0].data.currentHp).toBe(22);
  });

  it("un tipo de daño sin modificador que le afecte no cambia nada", async () => {
    const statblocks = statblocksDelCatalogo("SRD:hill-giant");
    const { service, prisma, characters } = montar(undefined, statblocks);
    const fila = personaje({ currentHp: 105, statblockRef: "SRD:hill-giant" });
    characters.requireEditable.mockResolvedValue(fila);
    const tx = montarTransaccion(prisma, fila);

    await service.changeHp("dm1", "c1", "ch1", { delta: -10, damageType: "SLASHING" });

    expect(tx.character.update.mock.calls.at(-1)![0].data.currentHp).toBe(95);
  });

  it("el suceso registrado lleva el damageType, para poder responder de qué murió", async () => {
    const statblocks = statblocksDelCatalogo("SRD:wight");
    const { service, prisma, characters, events } = montar(undefined, statblocks);
    const fila = personaje({ currentHp: 45, statblockRef: "SRD:wight" });
    characters.requireEditable.mockResolvedValue(fila);
    montarTransaccion(prisma, fila);

    await service.changeHp("dm1", "c1", "ch1", { delta: -10, damageType: "NECROTIC" });

    expect(events.record).toHaveBeenCalledWith(
      "dm1",
      "c1",
      expect.objectContaining({
        payload: expect.objectContaining({ damageType: "NECROTIC" }),
      }),
      expect.anything(),
    );
  });

  // Las dos de abajo las escribió la revisión de cierre del 2026-09-04, y las dos tapan un
  // defecto que estaba vivo, no un riesgo teórico.

  it("el suceso registra el daño APLICADO y no el bruto: el registro no delata la resistencia", async () => {
    const statblocks = statblocksDelCatalogo("SRD:wight");
    const { service, prisma, characters, events } = montar(undefined, statblocks);
    const fila = personaje({ currentHp: 45, statblockRef: "SRD:wight" });
    characters.requireEditable.mockResolvedValue(fila);
    montarTransaccion(prisma, fila);

    // 25 de necrótico contra el tumulario, que resiste: se aplican 12.
    await service.changeHp("dm1", "c1", "ch1", { delta: -25, damageType: "NECROTIC" });

    const registrado = events.record.mock.calls.at(-1)![2].payload;
    // Guardaba −25 mientras `from`/`to` decían 45 → 33: un jugador que sabe restar deduce
    // que hay una resistencia, y la plantilla de la que sale puede ser `DM_ONLY`.
    expect(registrado.delta).toBe(-12);
    // Y la invariante que hace la línea coherente consigo misma, que es lo que
    // `features/sessions/linea-de-log.ts` imprime: «Pierde |delta| PG (from → to)».
    expect(registrado.from - registrado.to).toBe(-registrado.delta);
  });

  it("una curación no se etiqueta con tipo de daño ni pidiéndolo: la columna es para «de qué murió»", async () => {
    const statblocks = statblocksDelCatalogo("SRD:wight");
    const { service, prisma, characters, events } = montar(undefined, statblocks);
    const fila = personaje({ currentHp: 20, statblockRef: "SRD:wight" });
    characters.requireEditable.mockResolvedValue(fila);
    montarTransaccion(prisma, fila);

    await service.changeHp("dm1", "c1", "ch1", { delta: +6, damageType: "FIRE" });

    const registrado = events.record.mock.calls.at(-1)![2].payload;
    expect(registrado.damageType).toBeUndefined();
    // El delta positivo se registra tal cual: aquí no hay nada que reducir.
    expect(registrado.delta).toBe(6);
  });
});

describe("tarea 2.5.4 — el daño cuelga de la tirada que lo causó, con rollEventId", () => {
  it("sin rollEventId, el comportamiento de siempre no cambia: ni se consulta la base", async () => {
    const { service, prisma, characters, events } = montar();
    const fila = personaje({ currentHp: 20 });
    characters.requireEditable.mockResolvedValue(fila);
    const tx = montarTransaccion(prisma, fila);

    await service.changeHp("dm1", "c1", "ch1", { delta: -5 });

    expect(tx.gameEvent.findFirst).not.toHaveBeenCalled();
    const registrado = events.record.mock.calls.at(-1)![2].payload;
    expect(registrado.rollEventId).toBeUndefined();
  });

  it("con un rollEventId de una tirada real, queda escrito en el suceso", async () => {
    const { service, prisma, characters, events } = montar();
    const fila = personaje({ currentHp: 20 });
    characters.requireEditable.mockResolvedValue(fila);
    const tx = montarTransaccion(prisma, fila);
    tx.gameEvent.findFirst.mockResolvedValue({ id: "roll-dmg-1" });

    await service.changeHp("dm1", "c1", "ch1", { delta: -5, rollEventId: "roll-dmg-1" });

    expect(tx.gameEvent.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        // **Y que sea una tirada.** Sin el filtro por tipo, el id de un comentario o de una
        // condición aplicada pasaba y quedaba escrito como «de qué tirada salió este daño».
        where: {
          id: "roll-dmg-1",
          campaignId: "c1",
          type: { in: ["ABILITY_ROLL", "DEATH_SAVE"] },
        },
      }),
    );
    const registrado = events.record.mock.calls.at(-1)![2].payload;
    expect(registrado.rollEventId).toBe("roll-dmg-1");
  });

  it("un rollEventId que no existe en esta campaña es 400, no una causa inventada en el registro", async () => {
    const { service, prisma, characters } = montar();
    const fila = personaje({ currentHp: 20 });
    characters.requireEditable.mockResolvedValue(fila);
    const tx = montarTransaccion(prisma, fila);
    tx.gameEvent.findFirst.mockResolvedValue(null);

    await expect(
      service.changeHp("dm1", "c1", "ch1", { delta: -5, rollEventId: "ev-de-otra-campana" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("tarea 2.5.4 — la salvación de concentración se pide, no se decide (hueco M17)", () => {
  it("sin ninguna condición de concentración, no se pide nada", async () => {
    const { service, prisma, characters } = montar();
    const fila = personaje({ currentHp: 20 });
    characters.requireEditable.mockResolvedValue(fila);
    const tx = montarTransaccion(prisma, fila);
    tx.characterCondition.findMany.mockResolvedValue([]);

    const res = await service.changeHp("dm1", "c1", "ch1", { delta: -25 });

    expect(tx.rollRequest.create).not.toHaveBeenCalled();
    expect(res).not.toHaveProperty("concentrationSave");
  });

  it("concentrado y con daño real, se pide la salvación con CD 10 o la mitad del daño, lo que sea mayor", async () => {
    const { service, prisma, characters } = montar();
    // **40 PG, y el número importa.** La ficha de ejemplo es un enano nivel 1 con 13 PG máximos,
    // así que 25 de daño la dejaba en 0 — y desde el arreglo de la revisión, caer a 0 ya no pide
    // salvación (inconsciente es incapacitado, y la concentración se pierde sin tirar). Con 40 en
    // curso el golpe la deja viva y el caso que la prueba quiere medir —la CD que sale del daño—
    // es alcanzable. Es el mismo defecto que dejaba en rojo el e2e de esta tarea.
    const fila = personaje({ currentHp: 40, visibility: "PLAYERS" });
    characters.requireEditable.mockResolvedValue(fila);
    const tx = montarTransaccion(prisma, fila);
    tx.characterCondition.findMany.mockResolvedValue([
      { key: "concentrating-on-bless", expiresAtClock: null },
    ]);

    const res = await service.changeHp("dm1", "c1", "ch1", { delta: -25 });

    // 25 de daño sin resistencia: la mitad (12) ya supera el suelo de 10.
    expect(tx.rollRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          characterId: "ch1",
          key: "save.con",
          dc: 12,
          mode: "NORMAL",
        }),
      }),
    );
    expect((res as { concentrationSave: { dc: number } }).concentrationSave.dc).toBe(12);
  });

  it("con poco daño, la CD nunca baja de 10, aunque la mitad sea menor", async () => {
    const { service, prisma, characters } = montar();
    const fila = personaje({ currentHp: 20 });
    characters.requireEditable.mockResolvedValue(fila);
    const tx = montarTransaccion(prisma, fila);
    tx.characterCondition.findMany.mockResolvedValue([
      { key: "concentrating-on-bless", expiresAtClock: null },
    ]);

    await service.changeHp("dm1", "c1", "ch1", { delta: -4 });

    expect(tx.rollRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ dc: 10 }) }),
    );
  });

  it("una condición de concentración ya VENCIDA no pide nada", async () => {
    const { service, prisma, characters } = montar();
    const fila = personaje({ currentHp: 20 });
    characters.requireEditable.mockResolvedValue(fila);
    const tx = montarTransaccion(prisma, fila);
    tx.characterCondition.findMany.mockResolvedValue([
      { key: "concentrating-on-bless", expiresAtClock: 100 },
    ]);
    tx.campaign.findUniqueOrThrow.mockResolvedValue({ id: "cmp1", clockSeconds: 500 });

    await service.changeHp("dm1", "c1", "ch1", { delta: -25 });

    expect(tx.rollRequest.create).not.toHaveBeenCalled();
  });

  // **Esta prueba afirmaba justo lo contrario de la regla, y pasaba.** Decía «si los PG
  // temporales absorben TODO el golpe, no se pide nada: no hubo daño que tomar». Lo hay: el SRD
  // describe los temporales como algo que se gasta *cuando tomas daño* —«when you have temporary
  // hit points and take damage»—, y la salvación se debe *«whenever you take damage»*. Absorben
  // el golpe; no lo impiden. Lo encontró la revisión de cierre y se comprobó en la fuente.
  it("los PG temporales NO eximen de la salvación: el daño se tomó igual", async () => {
    const { service, prisma, characters } = montar();
    const fila = personaje({ currentHp: 20, tempHp: 30 });
    characters.requireEditable.mockResolvedValue(fila);
    const tx = montarTransaccion(prisma, fila);
    tx.characterCondition.findMany.mockResolvedValue([
      { key: "concentrating-on-bless", expiresAtClock: null },
    ]);

    await service.changeHp("dm1", "c1", "ch1", { delta: -30 });

    expect(tx.rollRequest.create).toHaveBeenCalledTimes(1);
    // **Y la CD sale del daño TOMADO, no del que atravesó los temporales.** 30 de daño → CD 15.
    // Con el número de antes (`efectivo`, aquí 0) no habría ni petición; con 22 absorbidos de 30
    // la CD seguiría siendo 15 y no 10. El número es impar por la mitad para que el redondeo
    // hacia abajo tenga algo que decir en otras pruebas; aquí lo que distingue es el 15.
    expect(tx.rollRequest.create.mock.calls[0][0].data.dc).toBe(15);
  });

  it("caer a 0 PG no pide salvación: quedar inconsciente ya te quita la concentración", async () => {
    const { service, prisma, characters } = montar();
    const fila = personaje({ currentHp: 8 });
    characters.requireEditable.mockResolvedValue(fila);
    const tx = montarTransaccion(prisma, fila);
    tx.characterCondition.findMany.mockResolvedValue([
      { key: "concentrating-on-bless", expiresAtClock: null },
    ]);

    // Ocho de daño con ocho PG: cae a 0 sin muerte masiva. *«You lose concentration on a spell if
    // you are incapacitated or if you die»*, e inconsciente es incapacitado — pedir la salvación
    // sería pedirle que tire por algo que la regla ya le quitó.
    await service.changeHp("dm1", "c1", "ch1", { delta: -8 });

    expect(tx.rollRequest.create).not.toHaveBeenCalled();
  });

  it("golpear a quien YA está a 0 tampoco pide nada", async () => {
    const { service, prisma, characters } = montar();
    const fila = personaje({ currentHp: 0 });
    characters.requireEditable.mockResolvedValue(fila);
    const tx = montarTransaccion(prisma, fila);
    tx.characterCondition.findMany.mockResolvedValue([
      { key: "concentrating-on-bless", expiresAtClock: null },
    ]);

    await service.changeHp("dm1", "c1", "ch1", { delta: -6 });

    expect(tx.rollRequest.create).not.toHaveBeenCalled();
  });

  it("una curación no pide ninguna salvación de concentración", async () => {
    const { service, prisma, characters } = montar();
    const fila = personaje({ currentHp: 20 });
    characters.requireEditable.mockResolvedValue(fila);
    const tx = montarTransaccion(prisma, fila);
    tx.characterCondition.findMany.mockResolvedValue([
      { key: "concentrating-on-bless", expiresAtClock: null },
    ]);

    await service.changeHp("dm1", "c1", "ch1", { delta: +5 });

    expect(tx.rollRequest.create).not.toHaveBeenCalled();
  });

  it("una muerte masiva no pide salvación: un cadáver no mantiene nada", async () => {
    const { service, prisma, characters } = montar();
    // maxHp de la ficha de ejemplo es MAX_HP; un sobrante que lo iguale o supere mata en el
    // acto. Ya en pie, con el daño entero cayendo de golpe.
    const fila = personaje({ currentHp: MAX_HP });
    characters.requireEditable.mockResolvedValue(fila);
    const tx = montarTransaccion(prisma, fila);
    tx.characterCondition.findMany.mockResolvedValue([
      { key: "concentrating-on-bless", expiresAtClock: null },
    ]);

    await service.changeHp("dm1", "c1", "ch1", { delta: -(MAX_HP * 2) });

    expect(tx.rollRequest.create).not.toHaveBeenCalled();
  });

  it("dos fuentes de daño en el mismo golpe piden DOS salvaciones, no una: nunca se deduplican", async () => {
    const { service, prisma, characters } = montar();
    const fila = personaje({ currentHp: 40 });
    characters.requireEditable.mockResolvedValue(fila);
    const tx = montarTransaccion(prisma, fila);
    tx.characterCondition.findMany.mockResolvedValue([
      { key: "concentrating-on-bless", expiresAtClock: null },
    ]);

    await service.changeHp("dm1", "c1", "ch1", { delta: -6 });
    await service.changeHp("dm1", "c1", "ch1", { delta: -6 });

    expect(tx.rollRequest.create).toHaveBeenCalledTimes(2);
  });
});

describe("2.5.2 — el modificador de iniciativa reutiliza la derivación, no una segunda fórmula", () => {
  it("es exactamente `derived.initiative`, con la misma ficha que deriva la hoja", async () => {
    const { service, prisma } = montar();
    prisma.character.findFirst.mockResolvedValue(personaje());

    const modificador = await service.getInitiativeModifier("p1", "c1", "ch1");

    expect(modificador).toBe(HOJA_EJEMPLO.derived.initiative.total);
  });

  it("con un objeto que modifique la iniciativa (una anulación del DM), el modificador cambia con él", async () => {
    const { service, prisma } = montar();
    prisma.character.findFirst.mockResolvedValue(
      personaje({ overrides: { initiative: HOJA_EJEMPLO.derived.initiative.total + 5 } }),
    );

    const modificador = await service.getInitiativeModifier("dm1", "c1", "ch1");

    expect(modificador).toBe(HOJA_EJEMPLO.derived.initiative.total + 5);
  });
});

// ============================================================================================
// Tarea 2.5.3 — el ataque, comparado en el servidor.
//
// **Lo que ninguna otra suite puede demostrar**: que la CA del objetivo se compara AQUÍ, en el
// servidor, y que ni la respuesta ni la llamada al registro dejan salir ese número — solo tres
// palabras (`HIT`/`MISS`/`CRITICAL`). `rules/attacks.spec.ts` ya prueba el bono de ataque;
// `rules/engine.spec.ts` ya prueba la CA. La costura es lo que falta.
// ============================================================================================

/** Ataca con `long-sword` (bono +4, ver la suite de 2B de arriba) contra `target1` (CA 11). */
function conAtacanteYObjetivo(rollsRespuesta: Record<string, unknown>) {
  const montado = montar();
  const { prisma, characters, rolls } = montado;

  const atacante = personaje({ id: "ch1" });
  const objetivo = personaje({ id: "target1", ownerId: "p2" });
  characters.requireEditable.mockResolvedValue(atacante);
  prisma.character.findFirst.mockImplementation(
    ({ where }: { where: { id: string; campaignId?: string } }) =>
      Promise.resolve(where.id === "target1" ? objetivo : null),
  );
  // El arma solo cuenta para quien ataca; el objetivo se queda sin equipo — CA 11 llana (10 +
  // Destreza 12 ⇒ +1). Si el mismo mock sirviera para los dos, un objeto que sí tocara la CA
  // (una armadura) contaminaría la comparación sin que la prueba lo viera.
  prisma.inventoryItem.findMany.mockImplementation(
    ({ where }: { where: { characterId: string } }) =>
      Promise.resolve(
        where.characterId === "ch1" ? [filaDeInventario("long-sword", { slot: "MAIN_HAND" })] : [],
      ),
  );
  rolls.roll.mockResolvedValue(rollsRespuesta);
  return montado;
}

describe("D-OP-11 — a quién se puede apuntar, y el 404 que no delata", () => {
  // El defecto: cada ataque es una comparación exacta `total >= CA` con el total conocido, así que
  // veinte o treinta peticiones contra un identificador cualquiera daban la CA de cualquier
  // personaje de la campaña. El atacante conoce su propio bono; ni siquiera necesitaba suerte.

  function conObjetivoEscondido(enCombate: boolean) {
    const montado = conAtacanteYObjetivo({
      revealed: true,
      eventId: "ev1",
      expression: "1d20+4",
      audience: "PUBLIC",
      rolls: [10],
      kept: [10],
      dropped: [],
      modifier: 4,
      total: 14,
      natural: "NONE",
      outcome: "NO_DC",
    });
    montado.prisma.character.findFirst.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(
        where.id === "target1"
          ? personaje({ id: "target1", ownerId: "dm1", visibility: "DM_ONLY" })
          : null,
      ),
    );
    montado.prisma.combatant.findFirst.mockResolvedValue(enCombate ? { id: "comb1" } : null);
    return montado;
  }

  it("un personaje que existe pero NO se puede ver ni tener delante es un 404", async () => {
    // **El caso difícil, no el fácil.** Un id con formato inválido daría 404 aunque no hubiera
    // ninguna comprobación; lo que prueba algo es un id **válido de un personaje real**.
    const { service } = conObjetivoEscondido(false);
    await expect(
      service.resolveAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
        targetCharacterId: "target1",
        mode: "NORMAL",
        spendInspiration: false,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("y su mensaje es EXACTAMENTE el mismo que el de un id que nadie ha creado nunca", async () => {
    // Si los cuerpos difirieran en una coma, el oráculo seguiría abierto por otra puerta.
    const { service } = conObjetivoEscondido(false);
    const mensaje = async (id: string) => {
      try {
        await service.resolveAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
          targetCharacterId: id,
          mode: "NORMAL",
          spendInspiration: false,
        });
        return "no lanzó";
      } catch (e) {
        return (e as Error).message;
      }
    };
    expect(await mensaje("target1")).toBe(await mensaje("no-existe-jamas"));
  });

  it("pero el PNJ DM_ONLY que está EN EL ENCUENTRO ACTIVO sí se puede atacar", async () => {
    // Es el criterio de cierre del spec de 2.5.3, y sigue vivo: el PNJ que el DM acaba de bajar a
    // la mesa está delante, así que se le puede apuntar aunque su ficha esté escondida.
    const { service } = conObjetivoEscondido(true);
    const r = await service.resolveAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      targetCharacterId: "target1",
      mode: "NORMAL",
      spendInspiration: false,
    });
    expect(r).toHaveProperty("verdict");
  });

  it("solo cuenta un encuentro ACTIVO de ESTA campaña", async () => {
    // Un combatiente de una pelea de hace tres sesiones no está delante de nadie.
    const { service, prisma } = conObjetivoEscondido(true);
    await service.resolveAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      targetCharacterId: "target1",
      mode: "NORMAL",
      spendInspiration: false,
    });
    expect(prisma.combatant.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          characterId: "target1",
          encounter: { status: "ACTIVE", session: { campaignId: "c1" } },
        }),
      }),
    );
  });
});

describe("D-OP-13 — el estado del OBJETIVO cambia cómo se tira contra él", () => {
  function contraUnObjetivoCon(...condiciones: string[]) {
    const montado = conAtacanteYObjetivo({
      revealed: true,
      eventId: "ev1",
      expression: "1d20+4",
      audience: "PUBLIC",
      rolls: [10],
      kept: [10],
      dropped: [],
      modifier: 4,
      total: 14,
      natural: "NONE",
      outcome: "NO_DC",
    });
    montado.prisma.characterCondition.findMany.mockImplementation(
      ({ where }: { where: { characterId: string } }) =>
        Promise.resolve(
          where.characterId === "target1"
            ? condiciones.map((key) => ({ key, level: null, expiresAtClock: null }))
            : [],
        ),
    );
    return montado;
  }

  const modoUsado = (rolls: { roll: jest.Mock }) =>
    (rolls.roll.mock.calls.at(-1)![2] as { mode: string }).mode;

  it("**atacar a un objetivo CIEGO se tira con ventaja**", async () => {
    // SRD 5.1, `blinded`: *"Attack rolls against the creature have advantage, and the creature's
    // attack rolls have disadvantage."* La segunda mitad ya estaba desde 2.5.5; esta es la
    // primera, y no podía vivir en `suggested-roll-mode.ts`, que responde «¿cómo tiro YO?».
    const { service, rolls } = contraUnObjetivoCon("blinded");
    await service.resolveAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      targetCharacterId: "target1",
      mode: "NORMAL",
      spendInspiration: false,
    });
    expect(modoUsado(rolls)).toBe("ADVANTAGE");
  });

  it("sin condiciones en el objetivo, se tira como se pidió", async () => {
    const { service, rolls } = contraUnObjetivoCon();
    await service.resolveAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      targetCharacterId: "target1",
      mode: "NORMAL",
      spendInspiration: false,
    });
    expect(modoUsado(rolls)).toBe("NORMAL");
  });

  it("atacar a un INVISIBLE se tira con desventaja", async () => {
    const { service, rolls } = contraUnObjetivoCon("invisible");
    await service.resolveAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      targetCharacterId: "target1",
      mode: "NORMAL",
      spendInspiration: false,
    });
    expect(modoUsado(rolls)).toBe("DISADVANTAGE");
  });

  it("**y lo del objetivo se anula con lo que pide quien tira**, no se acumula", async () => {
    // El caso de mesa: tiro con desventaja —estoy asustado— contra alguien cegado. Ni ventaja ni
    // desventaja: un solo d20, que es lo que dice el SRD.
    const { service, rolls } = contraUnObjetivoCon("blinded");
    await service.resolveAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      targetCharacterId: "target1",
      mode: "DISADVANTAGE",
      spendInspiration: false,
    });
    expect(modoUsado(rolls)).toBe("NORMAL");
  });

  it("una condición del objetivo YA VENCIDA no cambia nada", async () => {
    // Se filtran contra el reloj de campaña igual que hace la hoja: una condición caducada sigue
    // en su fila y no calcula nada. El reloj del montaje va a 0, así que `expiresAtClock: 0` ya
    // venció.
    const { service, rolls, prisma } = contraUnObjetivoCon();
    prisma.characterCondition.findMany.mockResolvedValue([
      { key: "blinded", level: null, expiresAtClock: 0 },
    ]);
    await service.resolveAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      targetCharacterId: "target1",
      mode: "NORMAL",
      spendInspiration: false,
    });
    expect(modoUsado(rolls)).toBe("NORMAL");
  });
});

describe("2.5.3 — el ataque, comparado en el servidor", () => {
  it("con el total por encima de la CA del objetivo, el veredicto es HIT", async () => {
    const { service, rolls } = conAtacanteYObjetivo({
      revealed: true,
      eventId: "ev1",
      expression: "1d20+4",
      audience: "PUBLIC",
      rolls: [10],
      kept: [10],
      dropped: [],
      modifier: 4,
      total: 14,
      natural: "NONE",
      outcome: "NO_DC",
    });

    const res = await service.resolveAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      targetCharacterId: "target1",
      mode: "NORMAL",
      spendInspiration: false,
    });

    expect(res.verdict).toBe("HIT");
    // Se tira como cualquier ataque: 1d20 + el bono del cuadro, con el nombre del arma.
    expect(rolls.roll).toHaveBeenCalledWith(
      "p1",
      "c1",
      expect.objectContaining({ expression: "1d20+4", characterId: "ch1", mode: "NORMAL" }),
    );
  });

  it("con el total EXACTAMENTE igual a la CA, impacta — el SRD dice «iguala o supera»", async () => {
    const { service } = conAtacanteYObjetivo({
      revealed: true,
      eventId: "ev1",
      expression: "1d20+4",
      audience: "PUBLIC",
      rolls: [7],
      kept: [7],
      dropped: [],
      modifier: 4,
      // El objetivo por defecto tiene CA 11 (`conAtacanteYObjetivo`): 7+4 = 11 en punto.
      total: 11,
      natural: "NONE",
      outcome: "NO_DC",
    });

    const res = await service.resolveAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      targetCharacterId: "target1",
      mode: "NORMAL",
      spendInspiration: false,
    });

    expect(res.verdict).toBe("HIT");
  });

  it("con el total por debajo de la CA, el veredicto es MISS", async () => {
    const { service } = conAtacanteYObjetivo({
      revealed: true,
      eventId: "ev1",
      expression: "1d20+4",
      audience: "PUBLIC",
      rolls: [2],
      kept: [2],
      dropped: [],
      modifier: 4,
      total: 6,
      natural: "NONE",
      outcome: "NO_DC",
    });

    const res = await service.resolveAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      targetCharacterId: "target1",
      mode: "NORMAL",
      spendInspiration: false,
    });

    expect(res.verdict).toBe("MISS");
  });

  it("un 20 natural es CRITICAL aunque el total no alcance la CA (SRD 5.1: impacta pase lo que pase)", async () => {
    const { service } = conAtacanteYObjetivo({
      revealed: true,
      eventId: "ev1",
      expression: "2d20kh1+4",
      audience: "PUBLIC",
      rolls: [20],
      kept: [20],
      dropped: [],
      modifier: 4,
      // Un total absurdamente bajo a propósito: si el veredicto mirase el total en vez del
      // natural, esta prueba lo delataría con CRITICAL esperado y MISS obtenido.
      total: 1,
      natural: "TWENTY",
      outcome: "NO_DC",
    });

    const res = await service.resolveAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      targetCharacterId: "target1",
      mode: "NORMAL",
      spendInspiration: false,
    });

    expect(res.verdict).toBe("CRITICAL");
  });

  it("un 1 natural es MISS aunque el total supere la CA (SRD 5.1: falla pase lo que pase)", async () => {
    const { service } = conAtacanteYObjetivo({
      revealed: true,
      eventId: "ev1",
      expression: "1d20+4",
      audience: "PUBLIC",
      rolls: [1],
      kept: [1],
      dropped: [],
      modifier: 4,
      // Un total absurdamente alto a propósito, por el mismo motivo que la de arriba.
      total: 50,
      natural: "ONE",
      outcome: "NO_DC",
    });

    const res = await service.resolveAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      targetCharacterId: "target1",
      mode: "NORMAL",
      spendInspiration: false,
    });

    expect(res.verdict).toBe("MISS");
  });

  it("una tirada a ciegas no revela el veredicto: `revealed: false` no trae `verdict`", async () => {
    const { service } = conAtacanteYObjetivo({
      revealed: false,
      eventId: "ev1",
      expression: "1d20+4",
      audience: "BLIND",
    });

    const res = await service.resolveAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      targetCharacterId: "target1",
      mode: "NORMAL",
      spendInspiration: false,
      audience: "BLIND",
    });

    expect(res.roll.revealed).toBe(false);
    expect(res).not.toHaveProperty("verdict");
  });

  it("la CA del objetivo no viaja en ningún campo de la respuesta — solo el veredicto cerrado", async () => {
    const { service } = conAtacanteYObjetivo({
      revealed: true,
      eventId: "ev1",
      expression: "1d20+4",
      audience: "PUBLIC",
      rolls: [10],
      kept: [10],
      dropped: [],
      modifier: 4,
      total: 14,
      natural: "NONE",
      outcome: "NO_DC",
    });

    const res = await service.resolveAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      targetCharacterId: "target1",
      mode: "NORMAL",
      spendInspiration: false,
    });

    // Solo dos claves: la tirada (que ya sabía esconderse a sí misma desde 2C) y el veredicto
    // cerrado. Ningún campo nuevo llamado `ac`, `targetAc`, `armorClass` o parecido.
    expect(Object.keys(res).sort()).toEqual(["roll", "verdict"]);
    expect(JSON.stringify(res)).not.toMatch(/ac["\s:]*11|armorClass|targetAc/i);
  });

  it("atacar a un objetivo de otra campaña (o inexistente) es 404, no una comparación silenciosa", async () => {
    const { service, prisma, characters } = montar();
    characters.requireEditable.mockResolvedValue(personaje());
    prisma.inventoryItem.findMany.mockResolvedValue([
      filaDeInventario("long-sword", { slot: "MAIN_HAND" }),
    ]);
    prisma.character.findFirst.mockResolvedValue(null);

    await expect(
      service.resolveAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
        targetCharacterId: "no-existe",
        mode: "NORMAL",
        spendInspiration: false,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("pedir un ataque con un arma no equipada es 400, igual que en `rollAttack`", async () => {
    const { service, characters, prisma } = montar();
    characters.requireEditable.mockResolvedValue(personaje());
    prisma.inventoryItem.findMany.mockResolvedValue([]);

    await expect(
      service.resolveAttack("p1", "c1", "ch1", "SRD:greataxe:MAIN_HAND", {
        targetCharacterId: "target1",
        mode: "NORMAL",
        spendInspiration: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("un PNJ objetivo con la plantilla oculta al atacante sigue comparando bien: la CA se calcula con un espectador que SÍ ve la plantilla, nunca con el del atacante", async () => {
    const objetivo = personaje({
      id: "target1",
      ownerId: "dm1",
      statblockRef: "SRD:goblin",
      visibility: "DM_ONLY",
    });
    const statblock = SRD_STATBLOCK_POR_REF.get("SRD:goblin")!;
    // Simula el comportamiento REAL de `StatblocksService.resolverParaHoja`: solo el DM ve la
    // plantilla. Si `resolveAttack` mirase con los ojos del atacante (un jugador), esto
    // devolvería `oculto` y la CA no se podría calcular — la prueba fallaría con un 400 en vez
    // de comparar. Ver `caDelObjetivo` / `hojaInterna`.
    const resolverParaHoja = jest.fn(
      async (_c: string, _r: string, viewer: { role: string | null }) =>
        viewer.role === "DM" ? { statblock } : { oculto: true },
    );
    const { service, prisma, characters, rolls } = montar(undefined, {
      resolverParaHoja: resolverParaHoja as unknown as jest.Mock,
      resolver: jest.fn(),
    } as unknown as { resolver: jest.Mock });
    characters.requireEditable.mockResolvedValue(personaje());
    prisma.inventoryItem.findMany.mockImplementation(
      ({ where }: { where: { characterId: string } }) =>
        Promise.resolve(
          where.characterId === "ch1"
            ? [filaDeInventario("long-sword", { slot: "MAIN_HAND" })]
            : [],
        ),
    );
    prisma.character.findFirst.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(where.id === "target1" ? objetivo : null),
    );
    // El goblin del SRD tiene CA 15: con un total de 20, impacta de sobra.
    rolls.roll.mockResolvedValue({
      revealed: true,
      eventId: "ev1",
      expression: "1d20+4",
      audience: "DM_PRIVATE",
      rolls: [16],
      kept: [16],
      dropped: [],
      modifier: 4,
      total: 20,
      natural: "NONE",
      outcome: "NO_DC",
    });

    const res = await service.resolveAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      targetCharacterId: "target1",
      mode: "NORMAL",
      spendInspiration: false,
    });

    expect(resolverParaHoja).toHaveBeenCalled();
    expect(res.verdict).toBe("HIT");
  });
});

// **Los cuatro que faltaban, y los cuatro los pidió la revisión de cierre.**
describe("2.5.3 — lo que la revisión de cierre dejó cubierto", () => {
  it("**la propuesta se escribe**, con el objetivo, el veredicto y la tirada de la que sale", async () => {
    const { service, events } = conAtacanteYObjetivo({
      revealed: true,
      eventId: "ev-tirada",
      expression: "1d20+4",
      audience: "PUBLIC",
      rolls: [10],
      kept: [10],
      dropped: [],
      modifier: 4,
      total: 14,
      natural: "NONE",
      outcome: "NO_DC",
    });

    await service.resolveAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      targetCharacterId: "target1",
      mode: "NORMAL",
      spendInspiration: false,
    });

    // Sin este suceso, «el sistema propone; el DM dispone» no existía: el veredicto solo vivía
    // en la respuesta HTTP del atacante y no había nada que confirmar ni que corregir.
    const escrito = events.record.mock.calls.at(-1)!;
    expect(escrito[2].payload).toMatchObject({
      type: "ATTACK_RESOLVED",
      attackerId: "ch1",
      verdict: "HIT",
      rollEventId: "ev-tirada",
    });
    // **Y la CA no está**, ni con ese nombre ni con ningún otro: se comprueba que el número no
    // aparece en el suceso serializado, no solo que no hay un campo llamado `ac`.
    expect(JSON.stringify(escrito[2].payload)).not.toContain("11");
  });

  it("la propuesta hereda la visibilidad del OBJETIVO, no la del atacante", async () => {
    const { service, events, prisma } = conAtacanteYObjetivo({
      revealed: true,
      eventId: "ev1",
      expression: "1d20+4",
      audience: "PUBLIC",
      rolls: [10],
      kept: [10],
      dropped: [],
      modifier: 4,
      total: 14,
      natural: "NONE",
      outcome: "NO_DC",
    });
    // Un PNJ escondido como objetivo.
    prisma.character.findFirst.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(
        where.id === "target1"
          ? personaje({ id: "target1", ownerId: "dm1", visibility: "DM_ONLY" })
          : null,
      ),
    );

    await service.resolveAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      targetCharacterId: "target1",
      mode: "NORMAL",
      spendInspiration: false,
    });

    // Anunciar a la mesa «alguien atacó a X» cuando X está escondido revelaría que X existe. El
    // atacante ya tiene su veredicto en la respuesta; el DM lo ve siempre.
    expect(events.record.mock.calls.at(-1)![2].visibility).toBe("DM_ONLY");
  });

  it("un objetivo que no se puede resolver da un 400 que NO cuenta por qué", async () => {
    const { service, prisma } = conAtacanteYObjetivo({
      revealed: true,
      eventId: "ev1",
      expression: "1d20+4",
      audience: "PUBLIC",
      rolls: [10],
      kept: [10],
      dropped: [],
      modifier: 4,
      total: 14,
      natural: "NONE",
      outcome: "NO_DC",
    });
    prisma.character.findFirst.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(
        where.id === "target1"
          ? personaje({ id: "target1", ownerId: "dm1", statblockRef: "CAMPAIGN:borrado" })
          : null,
      ),
    );
    // Sin servicio de statblocks montado, un objetivo que apunta a uno **no se puede resolver**,
    // que es exactamente el caso que produce el motivo interno.

    // **El motivo se queda en el servidor.** Los `reason` están escritos para el dueño o el DM
    // sobre su propia ficha; entregados a un atacante cualquiera le confirman que el objetivo es
    // un PNJ y le dan el id del statblock del DM.
    await expect(
      service.resolveAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
        targetCharacterId: "target1",
        mode: "NORMAL",
        spendInspiration: false,
      }),
    ).rejects.toThrow(/no se puede resolver ahora mismo/i);
    await expect(
      service.resolveAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
        targetCharacterId: "target1",
        mode: "NORMAL",
        spendInspiration: false,
      }),
    ).rejects.not.toThrow(/CAMPAIGN:borrado/);
  });

  it("un personaje PUBLIC tira a la vista de la mesa, no en privado", async () => {
    const { service, rolls, characters } = conAtacanteYObjetivo({
      revealed: true,
      eventId: "ev1",
      expression: "1d20+4",
      audience: "PUBLIC",
      rolls: [10],
      kept: [10],
      dropped: [],
      modifier: 4,
      total: 14,
      natural: "NONE",
      outcome: "NO_DC",
    });
    // `PUBLIC` es el nivel MÁS abierto de los cinco, y con el predicado viejo —`=== "PLAYERS"`—
    // caía en el `else` y su tirada se escondía como `DM_PRIVATE`. Peor: entonces el propio
    // jugador no veía su total, `revealed` era falso y **no recibía veredicto**.
    characters.requireEditable.mockResolvedValue(personaje({ id: "ch1", visibility: "PUBLIC" }));

    await service.resolveAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      targetCharacterId: "target1",
      mode: "NORMAL",
      spendInspiration: false,
    });

    expect(rolls.roll).toHaveBeenCalledWith(
      "p1",
      "c1",
      expect.objectContaining({ audience: "PUBLIC" }),
    );
  });
});
