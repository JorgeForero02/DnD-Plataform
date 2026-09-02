import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import type { Character } from "@prisma/client";
import type { Roller } from "../dice/dice";
import { deriveCharacter } from "../rules/catalog";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { PrismaService } from "../prisma/prisma.service";
import { CharactersService } from "./characters.service";
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
    ...overrides,
  } as Character;
}

function dadoFijo(valor: number): Roller {
  return () => valor;
}

function montar(roller?: Roller) {
  const prisma = {
    character: { findFirst: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const membership = {
    requireMember: jest.fn().mockResolvedValue({ role: "PLAYER" }),
    requireDM: jest.fn().mockResolvedValue({ role: "DM" }),
    getMembership: jest.fn().mockResolvedValue({ role: "PLAYER" }),
  };
  const events = { record: jest.fn().mockResolvedValue({ id: "ev1" }) };
  const characters = { requireEditable: jest.fn() };
  prisma.user.findUnique.mockResolvedValue({ isAdmin: false });

  const service = new CharacterSheetService(
    prisma as unknown as PrismaService,
    membership as unknown as MembershipService,
    events as unknown as GameEventsService,
    characters as unknown as CharactersService,
    roller,
  );
  return { service, prisma, membership, events, characters };
}

/** Simula `prisma.$transaction`, con un `tx` que solo sabe bloquear la fila dada y actualizarla. */
function montarTransaccion(prisma: { $transaction: jest.Mock }, fila: Character) {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([fila]),
    character: {
      update: jest.fn(({ data }: { data: Partial<Character> }) => ({ ...fila, ...data })),
    },
  };
  prisma.$transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(tx));
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
      data: { currentHp: MAX_HP - 2, tempHp: 0, version: 1 },
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
