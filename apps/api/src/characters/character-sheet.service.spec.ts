import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import type { Character } from "@prisma/client";
import type { Roller } from "../dice/dice";
import { deriveCharacter } from "../rules/catalog";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { PrismaService } from "../prisma/prisma.service";
import { CharactersService } from "./characters.service";
import { RollsService } from "../rolls/rolls.service";
import { ResourcesService } from "../character-state/resources/resources.service";
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

function montar(roller?: Roller) {
  const prisma = {
    character: { findFirst: jest.fn(), update: jest.fn() },
    characterCondition: { findMany: jest.fn().mockResolvedValue([]) },
    // Fase 2B: la hoja lee el equipo **equipado** para derivar. Por defecto, sin equipo — que es
    // el estado de todas las pruebas escritas antes de que el inventario existiera.
    inventoryItem: { findMany: jest.fn().mockResolvedValue([]) },
    campaignItem: { findFirst: jest.fn().mockResolvedValue(null) },
    user: { findUnique: jest.fn() },
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
      mode: "ADVANTAGE",
      versatile: false,
      critical: false,
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
      mode: "NORMAL",
      versatile: true,
      critical: false,
    });

    expect(rolls.roll).toHaveBeenCalledWith(
      "p1",
      "c1",
      expect.objectContaining({ expression: "1d10+2" }),
    );
  });

  it("un crítico duplica los DADOS y nunca el modificador", async () => {
    const { service, rolls } = conEspada();

    await service.rollAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      part: "DAMAGE",
      mode: "NORMAL",
      versatile: false,
      critical: true,
    });

    // 1d8+2 crítico es 2d8+2. Si saliera 2d8+4, el modificador se estaría duplicando también.
    expect(rolls.roll).toHaveBeenCalledWith(
      "p1",
      "c1",
      expect.objectContaining({ expression: "2d8+2" }),
    );
  });

  it("el daño nunca hereda la ventaja: la ventaja es del d20", async () => {
    const { service, rolls } = conEspada();

    await service.rollAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      part: "DAMAGE",
      mode: "ADVANTAGE",
      versatile: false,
      critical: false,
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
        mode: "NORMAL",
        versatile: false,
        critical: false,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("pedir un ataque con un arma que no está equipada es 400, no 500", async () => {
    const { service } = conEspada();

    await expect(
      service.rollAttack("p1", "c1", "ch1", "SRD:greataxe", {
        part: "ATTACK",
        mode: "NORMAL",
        versatile: false,
        critical: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
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
