import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { Character, Prisma } from "@prisma/client";
import type { Roller } from "../dice/dice";
import { deriveCharacter, findSrdItem } from "../rules/catalog";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { PrismaService } from "../prisma/prisma.service";
import { CharactersService } from "./characters.service";
import { AbilityRollsService } from "./ability-rolls.service";
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
      // Tarea 16 (H1b): «estable» retirado por daño a 0 PG o por curar por encima. Por defecto
      // no borra nada, que es el estado de todas las pruebas escritas antes de que existiera.
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    // Fase 2B: la hoja lee el equipo **equipado** para derivar. Por defecto, sin equipo — que es
    // el estado de todas las pruebas escritas antes de que el inventario existiera.
    inventoryItem: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    campaignItem: { findFirst: jest.fn().mockResolvedValue(null) },
    // 2C.4: la hoja lee el reloj para saber qué condiciones siguen vivas y si el agotamiento
    // parte los PG máximos. Reloj a cero por defecto: nada ha vencido todavía.
    campaign: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "cmp1", clockSeconds: 0 }),
      // Reglas de la mesa (Tarea 4): `updateSheet` lee `tableRules` en cada llamada. `{}` por
      // defecto — LIBRE/MEDIA/EQUIPO, el comportamiento de siempre.
      findUnique: jest.fn().mockResolvedValue({ id: "c1", tableRules: {} }),
    },
    // Reglas de la mesa (Tarea 4): un intento de dados elegido bloquea volver a mandar
    // características sin `attemptId`. Sin ninguno elegido por defecto.
    // Ola de arreglos 1 (M-2): fijar un intento va bajo candado (`SELECT … FOR UPDATE` sobre la
    // fila del personaje) y marca con `updateMany({ where: { id, chosen: false } })`, que devuelve
    // `count: 1` cuando nadie se adelantó — el valor por defecto aquí.
    abilityRollAttempt: {
      findFirst: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    $queryRaw: jest.fn().mockResolvedValue([{ id: "ch1" }]),
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
    // PNJ del mundo y la mesa (Task 0): `getSheet` redacta `entityId` con esto. Sin fichas por
    // defecto, que es el estado de todas las pruebas escritas antes de que `entityId` existiera.
    entity: { findMany: jest.fn().mockResolvedValue([]) },
    transaction: jest.fn(),
  };
  // Reglas de la mesa (Tarea 4): `updateSheet` escribe en `this.prisma.transaction(...)`. Por
  // defecto el `tx` es el propio doble de Prisma — `character.update` y `abilityRollAttempt.update`
  // viven ahí, así que las pruebas que ya mockeaban `prisma.character.update` a secas siguen
  // funcionando sin tocarlas. Las pruebas que necesitan un `tx` distinto (`montarTransaccion`)
  // lo sobrescriben después.
  prisma.transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(prisma));
  // Reglas de la mesa (Tarea 4): un valor por defecto que deriva de verdad, para las pruebas
  // nuevas que llegan hasta el final de `updateSheet` sin mockear `update` a mano. Las que ya lo
  // hacían (`mockResolvedValue`/`mockImplementation` propio) lo sobrescriben igual que siempre.
  prisma.character.update.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
    ...personaje(),
    ...data,
  }));
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
  // Reglas de la mesa (Tarea 4): sin intento por defecto, `updateSheet` lo pide solo cuando la
  // regla de la mesa es DADOS y llega `attemptId`.
  const abilityRolls = { requireAttempt: jest.fn() };

  const service = new CharacterSheetService(
    prisma as unknown as PrismaService,
    membership as unknown as MembershipService,
    events as unknown as GameEventsService,
    characters as unknown as CharactersService,
    rolls as unknown as RollsService,
    abilityRolls as unknown as AbilityRollsService,
    roller,
    resources as unknown as ResourcesService,
    statblocks as unknown as StatblocksService,
  );
  return { service, prisma, membership, events, characters, resources, rolls, abilityRolls };
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
      // Tarea 16 (H1b): al estabilizar, se crea la condición reservada `stable`; al recibir daño
      // a 0 PG o curar por encima, se retira. Por defecto no hacen nada, que es el estado de
      // todas las pruebas escritas antes de que existiera.
      upsert: jest.fn().mockResolvedValue({ id: "cond-stable", key: "stable" }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    campaign: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "cmp1", clockSeconds: 0 }),
    },
    // Tarea 2.5.4: el `rollEventId` que llega en `changeHp` se comprueba contra la base antes de
    // escribirlo; por defecto "existe", que es el camino de siempre sin el campo nuevo.
    gameEvent: { findFirst: jest.fn().mockResolvedValue({ id: "ev1" }) },
    // Tarea 2.5.4: la salvación de concentración se pide creando la fila de siempre (2C.5).
    rollRequest: { create: jest.fn().mockResolvedValue({ id: "req1" }) },
    // **Ficha P2-0b**: derivar la hoja dentro de la transacción lee el equipo equipado y el visor
    // por ESTE cliente. Un `Prisma.TransactionClient` de verdad tiene los dos modelos; este doble
    // no los tenía, y por eso el hueco no se veía desde aquí.
    inventoryItem: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    user: { findUnique: jest.fn().mockResolvedValue({ isAdmin: false }) },
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

  // D-CF-66: el nivel lo fija el DM, no el dueño — ni siquiera vía PATCH de la hoja.
  it("updateSheet() rechaza al dueño no-DM que manda level (403)", async () => {
    const { service, characters, membership } = montar();
    characters.requireEditable.mockResolvedValue(personaje());
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });

    await expect(service.updateSheet("p1", "c1", "ch1", { level: 2 })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("updateSheet() permite al DM mandar level", async () => {
    const { service, characters, membership } = montar();
    characters.requireEditable.mockResolvedValue(personaje());
    membership.getMembership.mockResolvedValue({ role: "DM" });

    await expect(service.updateSheet("dm1", "c1", "ch1", { level: 2 })).resolves.toBeDefined();
  });

  it("updateSheet() sigue dejando al dueño cambiar otros campos (level es lo único que exige DM)", async () => {
    const { service, characters, membership } = montar();
    characters.requireEditable.mockResolvedValue(personaje());
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });

    await expect(
      service.updateSheet("p1", "c1", "ch1", { abilities: { str: 16 } }),
    ).resolves.toBeDefined();
  });
});

describe("updateSheet bajo las reglas de la mesa (D-CF-53, Tarea 4)", () => {
  const personajeBase = personaje();

  /** Fija `tableRules` para esta llamada y deja el personaje listo para editar. */
  function prep(
    prisma: ReturnType<typeof montar>["prisma"],
    characters: ReturnType<typeof montar>["characters"],
    tableRules: unknown,
    fila: Character = personajeBase,
  ) {
    (prisma.campaign.findUnique as jest.Mock).mockResolvedValue({ id: "c1", tableRules });
    characters.requireEditable.mockResolvedValue(fila);
  }

  it("LIBRE (por defecto) sigue admitiendo una característica a la vez", async () => {
    const { service, prisma, characters } = montar();
    prep(prisma, characters, {});

    await expect(
      service.updateSheet("pl", "c1", "ch1", { abilities: { str: 16 } }),
    ).resolves.toBeDefined();
  });

  it("MATRIZ: cinco de seis es 400 «se fijan juntas»; una permutación de la matriz pasa; una repetición es 400", async () => {
    const { service, prisma, characters } = montar();
    prep(prisma, characters, { abilities: { metodo: "MATRIZ" } });

    await expect(
      service.updateSheet("pl", "c1", "ch1", {
        abilities: { str: 15, dex: 14, con: 13, int: 12, wis: 10 },
      }),
    ).rejects.toThrow(/juntas/);
    await expect(
      service.updateSheet("pl", "c1", "ch1", {
        abilities: { str: 8, dex: 10, con: 12, int: 13, wis: 14, cha: 15 },
      }),
    ).resolves.toBeDefined();
    await expect(
      service.updateSheet("pl", "c1", "ch1", {
        abilities: { str: 15, dex: 15, con: 13, int: 12, wis: 10, cha: 8 },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("PUNTOS: 28 puntos es 400 con el coste en el mensaje", async () => {
    const { service, prisma, characters } = montar();
    prep(prisma, characters, { abilities: { metodo: "PUNTOS", puntos: 27 } });

    await expect(
      service.updateSheet("pl", "c1", "ch1", {
        abilities: { str: 15, dex: 15, con: 15, int: 9, wis: 8, cha: 8 },
      }),
    ).rejects.toThrow(/28/);
  });

  it("DADOS: con attemptId cuyos valores encajan, guarda y marca chosen; sin attemptId es 400", async () => {
    const { service, prisma, characters, abilityRolls } = montar();
    prep(prisma, characters, {
      abilities: { metodo: "DADOS", expresion: "3d6", intentos: 2, asignacionLibre: true },
    });
    abilityRolls.requireAttempt.mockResolvedValue({
      id: "a1",
      characterId: "ch1",
      values: [12, 9, 15, 10, 14, 11],
      chosen: false,
    });

    await expect(
      service.updateSheet("pl", "c1", "ch1", {
        abilities: { str: 15, dex: 14, con: 12, int: 11, wis: 10, cha: 9 },
        attemptId: "a1",
      }),
    ).resolves.toBeDefined();
    // M-2: se marca solo si sigue sin elegir (`chosen: false` en el `where`), y bajo el candado
    // de la fila del personaje, que se toma ANTES de escribir nada.
    expect(prisma.abilityRollAttempt.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "a1", chosen: false }, data: { chosen: true } }),
    );
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    const sql = (prisma.$queryRaw as jest.Mock).mock.calls[0][0] as string[];
    expect(sql.join("?")).toMatch(/FROM "Character" WHERE id = \? FOR UPDATE/);
    const ordenDeLlamadas = [
      prisma.$queryRaw.mock.invocationCallOrder[0],
      prisma.character.update.mock.invocationCallOrder[0],
      prisma.abilityRollAttempt.updateMany.mock.invocationCallOrder[0],
    ];
    expect(ordenDeLlamadas).toEqual([...ordenDeLlamadas].sort((a, b) => a - b));

    await expect(
      service.updateSheet("pl", "c1", "ch1", {
        abilities: { str: 15, dex: 14, con: 12, int: 11, wis: 10, cha: 9 },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("DADOS (M-2): si al marcar el intento otro ya lo eligió (count 0), es 409 ATTEMPT_ALREADY_CHOSEN y no se guarda", async () => {
    const { service, prisma, characters, abilityRolls } = montar();
    prep(prisma, characters, {
      abilities: { metodo: "DADOS", expresion: "3d6", intentos: 2, asignacionLibre: true },
    });
    abilityRolls.requireAttempt.mockResolvedValue({
      id: "a1",
      characterId: "ch1",
      values: [12, 9, 15, 10, 14, 11],
      chosen: false,
    });
    // Fuera de la transacción nadie había elegido; DENTRO, tras el candado, el `updateMany`
    // no encuentra la fila con `chosen: false` — la otra pestaña llegó antes.
    (prisma.abilityRollAttempt.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

    await expect(
      service.updateSheet("pl", "c1", "ch1", {
        abilities: { str: 15, dex: 14, con: 12, int: 11, wis: 10, cha: 9 },
        attemptId: "a1",
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: "ATTEMPT_ALREADY_CHOSEN" }),
    });
  });

  it("DADOS (M-2): si dentro de la transacción ya hay OTRO intento elegido, es 409 ATTEMPT_ALREADY_CHOSEN", async () => {
    const { service, prisma, characters, abilityRolls } = montar();
    prep(prisma, characters, {
      abilities: { metodo: "DADOS", expresion: "3d6", intentos: 2, asignacionLibre: true },
    });
    abilityRolls.requireAttempt.mockResolvedValue({
      id: "a1",
      characterId: "ch1",
      values: [12, 9, 15, 10, 14, 11],
      chosen: false,
    });
    // Primera lectura (antes de la transacción): ninguno elegido. Segunda (bajo candado): a2.
    (prisma.abilityRollAttempt.findFirst as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "a2", chosen: true });

    await expect(
      service.updateSheet("pl", "c1", "ch1", {
        abilities: { str: 15, dex: 14, con: 12, int: 11, wis: 10, cha: 9 },
        attemptId: "a1",
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: "ATTEMPT_ALREADY_CHOSEN" }),
    });
    expect(prisma.abilityRollAttempt.updateMany).not.toHaveBeenCalled();
  });

  it("DADOS (I-1): con un intento ya elegido, el dueño NO puede elegir OTRO mandando su attemptId — 400 «se fijaron con dados»", async () => {
    const { service, prisma, characters, membership, abilityRolls } = montar();
    prep(prisma, characters, {
      abilities: { metodo: "DADOS", expresion: "3d6", intentos: 2, asignacionLibre: true },
    });
    (prisma.abilityRollAttempt.findFirst as jest.Mock).mockResolvedValue({
      id: "a1",
      chosen: true,
    });
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    abilityRolls.requireAttempt.mockResolvedValue({
      id: "a2",
      characterId: "ch1",
      values: [18, 17, 16, 15, 14, 13],
      chosen: false,
    });

    await expect(
      service.updateSheet("pl", "c1", "ch1", {
        attemptId: "a2",
        abilities: { str: 18, dex: 17, con: 16, int: 15, wis: 14, cha: 13 },
      }),
    ).rejects.toThrow(/fijaron con dados; solo el DM puede cambiarlas/);
    expect(prisma.character.update).not.toHaveBeenCalled();
    expect(prisma.abilityRollAttempt.updateMany).not.toHaveBeenCalled();
  });

  it("DADOS (I-1): con un intento ya elegido, el DM que manda attemptId recibe 400 — el arbitraje va sin intento", async () => {
    const { service, prisma, characters, membership } = montar();
    prep(prisma, characters, {
      abilities: { metodo: "DADOS", expresion: "3d6", intentos: 2, asignacionLibre: true },
    });
    (prisma.abilityRollAttempt.findFirst as jest.Mock).mockResolvedValue({
      id: "a1",
      chosen: true,
    });
    membership.getMembership.mockResolvedValue({ role: "DM" });

    await expect(
      service.updateSheet("dm", "c1", "ch1", {
        attemptId: "a2",
        abilities: { str: 18, dex: 17, con: 16, int: 15, wis: 14, cha: 13 },
      }),
    ).rejects.toThrow(/sin attemptId/);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("DADOS: con un intento ya elegido, cambiar una característica sin attemptId es 400 «se fijaron con dados» para el dueño", async () => {
    const { service, prisma, characters, membership } = montar();
    prep(prisma, characters, {
      abilities: { metodo: "DADOS", expresion: "3d6", intentos: 1, asignacionLibre: true },
    });
    (prisma.abilityRollAttempt.findFirst as jest.Mock).mockResolvedValue({
      id: "a1",
      chosen: true,
    });
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });

    await expect(
      service.updateSheet("pl", "c1", "ch1", {
        abilities: { str: 18, dex: 14, con: 12, int: 11, wis: 10, cha: 9 },
      }),
    ).rejects.toThrow(/fijaron con dados; solo el DM puede cambiarlas/);
    // Y la raza sí se puede seguir cambiando: la fijación es de las seis, no de la hoja.
    await expect(
      service.updateSheet("pl", "c1", "ch1", { race: { source: "SRD", key: "elf" } }),
    ).resolves.toBeDefined();
  });

  it("DADOS: con un intento ya elegido, el DM SÍ puede cambiar las seis juntas sin attemptId (E-RM-13)", async () => {
    const { service, prisma, characters, membership } = montar();
    prep(prisma, characters, {
      abilities: { metodo: "DADOS", expresion: "3d6", intentos: 1, asignacionLibre: true },
    });
    (prisma.abilityRollAttempt.findFirst as jest.Mock).mockResolvedValue({
      id: "a1",
      chosen: true,
    });
    membership.getMembership.mockResolvedValue({ role: "DM" });

    await expect(
      service.updateSheet("dm", "c1", "ch1", {
        abilities: { str: 20, dex: 14, con: 12, int: 11, wis: 10, cha: 9 },
      }),
    ).resolves.toBeDefined();
    const data = (prisma.character.update as jest.Mock).mock.calls[0][0].data;
    expect(data).toMatchObject({ str: 20, dex: 14, con: 12, int: 11, wis: 10, cha: 9 });
    // Arbitraje, no una tirada más: ningún intento se toca.
    expect(prisma.abilityRollAttempt.updateMany).not.toHaveBeenCalled();
  });

  it("permitidos: una clase fuera de la lista es 400 con su nombre legible; la lista vacía deja todo", async () => {
    const { service, prisma, characters } = montar();
    prep(prisma, characters, { permitidos: { clases: ["fighter"] } });

    await expect(
      service.updateSheet("pl", "c1", "ch1", { class: { source: "SRD", key: "wizard" } }),
    ).rejects.toThrow(/Mago/);
    await expect(
      service.updateSheet("pl", "c1", "ch1", { class: { source: "SRD", key: "fighter" } }),
    ).resolves.toBeDefined();
  });

  it("al fijar la clase por primera vez con nivel 3, MAXIMO escribe hitPointsPerLevel [10,10] y ORO_TABLA suma gp y escribe MONEY_CHANGED", async () => {
    const { service, prisma, characters, events } = montar();
    const personajeSinNumeros = {
      ...personajeBase,
      str: null,
      dex: null,
      con: null,
      int: null,
      wis: null,
      cha: null,
      classKey: null,
      level: 3,
    } as unknown as Character;
    prep(
      prisma,
      characters,
      { pgNivelesSiguientes: "MAXIMO", oroInicial: { modo: "ORO_TABLA" } },
      personajeSinNumeros,
    );

    await service.updateSheet("pl", "c1", "ch1", { class: { source: "SRD", key: "fighter" } });

    const data = (prisma.character.update as jest.Mock).mock.calls[0][0].data;
    expect(data.hitPointsPerLevel).toEqual([10, 10]);
    expect(data.gp).toEqual({ increment: expect.any(Number) });
    expect(events.record).toHaveBeenCalledWith(
      "pl",
      "c1",
      expect.objectContaining({ payload: expect.objectContaining({ type: "MONEY_CHANGED" }) }),
      expect.anything(),
    );
  });

  it("cambiar de clase después NO vuelve a tirar ni a dar oro", async () => {
    const { service, prisma, characters } = montar();
    const yaTieneClase = {
      ...personajeBase,
      level: 3,
      classKey: "fighter",
      hitPointsPerLevel: [7, 3],
    } as unknown as Character;
    prep(
      prisma,
      characters,
      { pgNivelesSiguientes: "TIRADA", oroInicial: { modo: "ORO_TABLA" } },
      yaTieneClase,
    );

    await service.updateSheet("pl", "c1", "ch1", { class: { source: "SRD", key: "rogue" } });

    const data = (prisma.character.update as jest.Mock).mock.calls[0][0].data;
    expect("hitPointsPerLevel" in data).toBe(false);
    expect("gp" in data).toBe(false);
  });

  it("E-RM-16: un PNJ instanciado (statblockRef) no está sujeto a MATRIZ — una característica sola pasa", async () => {
    const { service, prisma, characters } = montar();
    const pnj = { ...personajeBase, statblockRef: "SRD:goblin" } as unknown as Character;
    prep(prisma, characters, { abilities: { metodo: "MATRIZ" } }, pnj);

    await expect(
      service.updateSheet("dm", "c1", "ch1", { abilities: { str: 16 } }),
    ).resolves.toBeDefined();
    const data = (prisma.character.update as jest.Mock).mock.calls[0][0].data;
    expect(data.str).toBe(16);
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

  // Round 1 de revisión, HIGH — `setHp` (el PATCH absoluto del DM) escribe `currentHp` sin pasar
  // por `changeHp`, así que un DM que corrige el número a mano de 0 a algo positivo dejaba la
  // condición `stable` puesta: la hoja seguía diciendo «estable» de alguien que el DM acababa de
  // levantar a mano.
  it("setHp() de 0 a un PG positivo retira la condición «stable»", async () => {
    const { service, prisma } = montar();
    const fila = personaje({ version: 0, currentHp: 0 });
    prisma.character.findFirst.mockResolvedValue(fila);
    const tx = montarTransaccion(prisma, fila);

    await service.setHp("dm1", "c1", "ch1", { expectedVersion: 0, currentHp: 10 });

    expect(tx.characterCondition.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ characterId: "ch1", key: "stable" }),
      }),
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

  // D-CF-14, commit 5 (J5). El tercer fracaso deja de ser silencioso: registra CHARACTER_DIED
  // con `cause: "death_saves"` y el `rollEventId` de la propia `DEATH_SAVE` que lo causó.
  describe("el tercer fracaso registra CHARACTER_DIED", () => {
    it("registra el suceso citando el DEATH_SAVE que acaba de escribir", async () => {
      const { service, characters, prisma, events } = montar(dadoFijo(1));
      characters.requireEditable.mockResolvedValue(personaje());
      const fila = personaje({ currentHp: 0, deathSaveFailures: 2, name: "Elara" });
      const tx = montarTransaccion(prisma, fila);
      events.record.mockResolvedValueOnce({ id: "death-save-ev" }).mockResolvedValue({ id: "ev1" });

      await service.rollDeathSave("p1", "c1", "ch1", {});

      expect(events.record).toHaveBeenCalledWith(
        "p1",
        "c1",
        expect.objectContaining({
          payload: expect.objectContaining({
            type: "CHARACTER_DIED",
            characterId: "ch1",
            cause: "death_saves",
            rollEventId: "death-save-ev",
          }),
        }),
        tx,
      );
    });

    it("un segundo fracaso (sin llegar a tres) NO registra la muerte", async () => {
      const { service, characters, prisma, events } = montar(dadoFijo(1));
      characters.requireEditable.mockResolvedValue(personaje());
      const fila = personaje({ currentHp: 0, deathSaveFailures: 0 });
      montarTransaccion(prisma, fila);

      await service.rollDeathSave("p1", "c1", "ch1", {});

      const muertes = events.record.mock.calls.filter(
        (llamada) => llamada[2].payload.type === "CHARACTER_DIED",
      );
      expect(muertes).toHaveLength(0);
    });

    it("un 20 natural que revive no registra la muerte", async () => {
      const { service, characters, prisma, events } = montar(dadoFijo(20));
      characters.requireEditable.mockResolvedValue(personaje());
      const fila = personaje({ currentHp: 0, deathSaveSuccesses: 1, deathSaveFailures: 2 });
      montarTransaccion(prisma, fila);

      await service.rollDeathSave("p1", "c1", "ch1", {});

      const muertes = events.record.mock.calls.filter(
        (llamada) => llamada[2].payload.type === "CHARACTER_DIED",
      );
      expect(muertes).toHaveLength(0);
    });
  });

  // Tarea 16 (H1b) — «estable» sobrevive a la petición: hasta aquí, estabilizarse ponía los
  // contadores a cero y un `GET` posterior no podía distinguir «está estable» de «acaba de caer a
  // 0 PG y todavía no ha tirado nada» — los dos casos tienen `successes: 0, failures: 0`. SRD 5.1,
  // «Stabilizing a Creature»: *«A stable creature doesn't make death saving throws, even though
  // it has 0 hit points»*. Se resuelve con una `CharacterCondition` reservada (`CLAVE_ESTABLE`,
  // `@dnd/shared`), no con una columna nueva: ver el comentario de esa constante.
  it("estabilizar con tres éxitos crea la condición reservada `stable`", async () => {
    const { service, characters, prisma } = montar(dadoFijo(15));
    characters.requireEditable.mockResolvedValue(personaje());
    const fila = personaje({ currentHp: 0, deathSaveSuccesses: 2 });
    const tx = montarTransaccion(prisma, fila);

    await service.rollDeathSave("p1", "c1", "ch1", {});

    expect(tx.characterCondition.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { characterId_key: { characterId: "ch1", key: "stable" } },
      }),
    );
  });

  it("un GET posterior distingue «estable» de «acaba de caer a 0 PG»: ambos tienen 0 y 0", async () => {
    const { service, prisma } = montar();
    // La condición ya existe — como si una tirada anterior la hubiera creado — y los contadores
    // están a cero, que es justo el estado que antes de esta tarea era indistinguible del de
    // alguien recién caído sin haber tirado todavía.
    prisma.characterCondition.findMany.mockResolvedValue([
      { key: "stable", level: null, expiresAtClock: null, expiryEdge: null },
    ]);
    prisma.character.findFirst.mockResolvedValue(personaje({ currentHp: 0 }));

    const res = await service.getSheet("p1", "c1", "ch1");

    expect(res.deathSaves).toEqual({ successes: 0, failures: 0, status: "stable" });
  });

  // Revisión final de `ficha/tanda-2-a-5`, High #2: SRD 5.1, «Stabilizing a Creature» —
  // *«A stable creature doesn't make death saving throws»*. `estadoDeMuerte` ya lee la
  // condición reservada `stable` para lo que MUESTRA la hoja, pero `rollDeathSave` no la
  // consultaba antes de tirar: un personaje estable podía seguir tirando y sus contadores se
  // acumulaban sobre una fila que la hoja seguía declarando estable.
  it("rollDeathSave() rechaza con 400 si el personaje ya está `stable` (SRD 5.1)", async () => {
    const { service, characters, prisma } = montar();
    characters.requireEditable.mockResolvedValue(personaje());
    const fila = personaje({ currentHp: 0, deathSaveSuccesses: 0, deathSaveFailures: 0 });
    const tx = montarTransaccion(prisma, fila);
    tx.characterCondition.findUnique.mockResolvedValue({ key: "stable" });

    await expect(service.rollDeathSave("p1", "c1", "ch1", {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tx.character.update).not.toHaveBeenCalled();
  });

  it("sin la condición, 0 y 0 a 0 PG sigue siendo «dying», no «stable»", async () => {
    const { service, prisma } = montar();
    prisma.character.findFirst.mockResolvedValue(personaje({ currentHp: 0 }));

    const res = await service.getSheet("p1", "c1", "ch1");

    expect(res.deathSaves).toEqual({ successes: 0, failures: 0, status: "dying" });
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

  // D-CF-14, commit 5 (J5). Las dos transiciones de `changeHp` que llevan a la muerte.
  describe("changeHp() registra CHARACTER_DIED en la transición", () => {
    it('el daño masivo registra la muerte con cause "massive_damage"', async () => {
      const { service, prisma, characters, events } = montar();
      characters.requireEditable.mockResolvedValue(personaje());
      const tx = montarTransaccion(prisma, personaje({ currentHp: 5, tempHp: 0, name: "Elara" }));

      await service.changeHp("p1", "c1", "ch1", { delta: -(5 + MAX_HP) });

      expect(events.record).toHaveBeenCalledWith(
        "p1",
        "c1",
        expect.objectContaining({
          payload: expect.objectContaining({
            type: "CHARACTER_DIED",
            characterId: "ch1",
            name: "Elara",
            cause: "massive_damage",
          }),
        }),
        tx,
      );
    });

    it('el remate a 0 PG que sube los fracasos a tres registra la muerte con cause "death_saves"', async () => {
      const { service, prisma, characters, events } = montar();
      characters.requireEditable.mockResolvedValue(personaje());
      const tx = montarTransaccion(
        prisma,
        personaje({ currentHp: 0, tempHp: 0, deathSaveFailures: 2, name: "Elara" }),
      );

      await service.changeHp("p1", "c1", "ch1", { delta: -3, rollEventId: "roll1" });

      expect(events.record).toHaveBeenCalledWith(
        "p1",
        "c1",
        expect.objectContaining({
          payload: expect.objectContaining({
            type: "CHARACTER_DIED",
            characterId: "ch1",
            name: "Elara",
            cause: "death_saves",
            rollEventId: "roll1",
          }),
        }),
        tx,
      );
    });

    it("un golpe a quien ya está a 0 con solo UN fracaso previo no mata (deja en dos, no en tres)", async () => {
      const { service, prisma, characters, events } = montar();
      characters.requireEditable.mockResolvedValue(personaje());
      montarTransaccion(prisma, personaje({ currentHp: 0, tempHp: 0, deathSaveFailures: 0 }));

      await service.changeHp("p1", "c1", "ch1", { delta: -3 });

      const muertes = events.record.mock.calls.filter(
        (llamada) => llamada[2].payload.type === "CHARACTER_DIED",
      );
      expect(muertes).toHaveLength(0);
    });

    it("dañar a un cadáver que YA tenía tres fracasos no repite la muerte", async () => {
      const { service, prisma, characters, events } = montar();
      characters.requireEditable.mockResolvedValue(personaje());
      montarTransaccion(prisma, personaje({ currentHp: 0, tempHp: 0, deathSaveFailures: 3 }));

      await service.changeHp("p1", "c1", "ch1", { delta: -3 });

      const muertes = events.record.mock.calls.filter(
        (llamada) => llamada[2].payload.type === "CHARACTER_DIED",
      );
      expect(muertes).toHaveLength(0);
    });
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

  // Tarea 16 (H1b). SRD 5.1, «Stabilizing a Creature»: *«The creature stops being stable, and
  // must start making death saving throws again, if it takes any damage.»* Y, simétrico, curar
  // por encima de 0 también la retira: ya no está a 0 PG, así que «estable» dejó de aplicar.
  it("recibir daño estando a 0 PG retira la condición «stable»", async () => {
    const { service, prisma, characters } = montar();
    characters.requireEditable.mockResolvedValue(personaje());
    const tx = montarTransaccion(prisma, personaje({ currentHp: 0, tempHp: 0 }));

    await service.changeHp("p1", "c1", "ch1", { delta: -3 });

    expect(tx.characterCondition.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ characterId: "ch1", key: "stable" }),
      }),
    );
  });

  it("curar por encima de 0 retira la condición «stable»", async () => {
    const { service, prisma, characters } = montar();
    characters.requireEditable.mockResolvedValue(personaje());
    const tx = montarTransaccion(prisma, personaje({ currentHp: 0, tempHp: 0 }));

    await service.changeHp("p1", "c1", "ch1", { delta: 5 });

    expect(tx.characterCondition.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ characterId: "ch1", key: "stable" }),
      }),
    );
  });

  // Round 1 de revisión, HIGH — un `stable` huérfano (dejado por `setHp` o un descanso antes de
  // este mismo arreglo) sobrevivía a la PRÓXIMA caída si el guardia solo miraba `before === 0`:
  // alguien que estaba de pie y acaba de desplomarse con este golpe heredaba la etiqueta de una
  // caída anterior. Una caída fresca (`before > 0 && after === 0`) nunca es estable.
  it("una caída fresca (de pie a 0 PG en este mismo golpe) retira cualquier `stable` huérfano", async () => {
    const { service, prisma, characters } = montar();
    characters.requireEditable.mockResolvedValue(personaje());
    const tx = montarTransaccion(prisma, personaje({ currentHp: 10, tempHp: 0 }));

    await service.changeHp("p1", "c1", "ch1", { delta: -10 });

    expect(tx.characterCondition.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ characterId: "ch1", key: "stable" }),
      }),
    );
  });
});

// **Ficha P2-0b — con `tx`, `changeHp` tampoco puede leer por la puerta de al lado.**
//
// La autorización ya iba contra el cliente que le pasan (P2-0/I2), pero derivar la hoja no:
// `construirODenegar` recibía el `tx` y solo se lo daba a `hojaOMotivo`, mientras `equipoEquipado`
// y `viewerFor` hablaban con `this.prisma` sin condición. Resultado: leer el inventario equipado y
// resolver el visor abrían conexiones nuevas con la transacción ajena todavía abierta.
//
// La prueba mira **qué cliente recibió cada consulta**. El resultado era correcto antes y después,
// que es exactamente por qué ninguna prueba lo cazaba.
describe("ficha P2-0b — con `tx`, derivar la hoja va por ESE cliente", () => {
  // **Se mide sobre un `changeHp` que se rechaza a mitad**, y no por comodidad: `construirODenegar`
  // corre ANTES de esa negativa, y así la prueba no arrastra la lectura que `buildResponse` hace al
  // final del camino feliz —que sigue yendo por el pool y tiene su propia ficha—. Lo que se afirma
  // aquí es exactamente lo que P2-0b describe y nada más.
  it("el inventario equipado y el visor se leen del `tx`, no del pool", async () => {
    const { service, prisma } = montar();
    const fila = personaje({ currentHp: 0, deathSaveFailures: 3 });
    const tx = montarTransaccion(prisma, fila) as unknown as Record<string, unknown>;
    // Lo que `autorizarEdicionConCliente` necesita del cliente que le pasan.
    tx.campaignMember = { findUnique: jest.fn().mockResolvedValue({ role: "DM" }) };
    (tx.character as { findFirst?: unknown }).findFirst = jest.fn().mockResolvedValue(fila);

    await expect(
      // Curar a un muerto: se deniega **después** de derivar la hoja.
      service.changeHp("p1", "c1", "ch1", { delta: 10 }, tx as never),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect((tx.inventoryItem as { findMany: jest.Mock }).findMany).toHaveBeenCalled();
    // Ola de arreglos 1 (Critical 1): derivar los PG ya no resuelve ningún visor —usa el
    // espectador del servidor, sin consulta—, así que lo que se afirma es lo que P2-0b quería de
    // verdad: **ninguna lectura por el pool** mientras la transacción ajena está abierta.
    expect((tx.user as { findUnique: jest.Mock }).findUnique).not.toHaveBeenCalled();
    expect(prisma.inventoryItem.findMany).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});

// **Ficha P2-8 — el tramo que P2-0b no podía cubrir: redactar la respuesta.**
//
// `buildResponse` cierra el camino feliz de `changeHp` y hablaba con `this.prisma` sin condición,
// aunque `equipoEquipado` y `viewerFor` ya sabían aceptar un cliente. Con la transacción ajena
// todavía abierta, eso es una conexión más del pool solo para escribir la respuesta.
//
// **Por eso esta prueba NO se puede fusionar con la de arriba.** Aquella se mide sobre un
// `changeHp` que se rechaza antes de llegar aquí —es lo que la hace medir `construirODenegar` y
// nada más—, así que el tramo de abajo le queda fuera por construcción. Aquí el `changeHp`
// **termina**, y entonces `prisma.inventoryItem.findMany` sin llamadas significa que las DOS
// lecturas —la de derivar y la de redactar— fueron por el `tx`.
describe("ficha P2-8 — con `tx`, redactar la respuesta también va por ESE cliente", () => {
  it("un `changeHp` que TERMINA no toca el pool ni una vez", async () => {
    const { service, prisma } = montar();
    const fila = personaje({ currentHp: MAX_HP });
    const tx = montarTransaccion(prisma, fila) as unknown as Record<string, unknown>;
    tx.campaignMember = { findUnique: jest.fn().mockResolvedValue({ role: "DM" }) };
    (tx.character as { findFirst?: unknown }).findFirst = jest.fn().mockResolvedValue(fila);

    const res = await service.changeHp("p1", "c1", "ch1", { delta: -1 }, tx as never);

    // Que de verdad llegó al final, y no se quedó a medias sin que nadie lo notara.
    expect(res.hp.current).toBe(MAX_HP - 1);
    expect((tx.inventoryItem as { findMany: jest.Mock }).findMany).toHaveBeenCalled();
    // El visor que redacta la respuesta (`buildResponse`) se resuelve por el `tx`; derivar los PG
    // ya no resuelve ninguno (ola de arreglos 1, Critical 1).
    expect((tx.user as { findUnique: jest.Mock }).findUnique).toHaveBeenCalled();
    expect(prisma.inventoryItem.findMany).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe("changeHpFromEffect (segunda puerta, spec §3.1)", () => {
  it("no autoriza: un jugador que NO es dueño ni DM cambia los PG de otro si viene con tx", async () => {
    const { service, prisma, events } = montar();
    // `currentHp: 5` en vez del `10` literal del brief: con el build de ejemplo (enano
    // guerrero nivel 1), `maxHp` cae en 14 — pedir 10 + 5 se habría topado con el máximo y la
    // prueba habría medido el `clamp`, no la autorización, que es lo que este bloque comprueba.
    const fila = personaje({ id: "b", ownerId: "otro", currentHp: 5, tempHp: 0 });
    const tx = montarTransaccion(prisma, fila);
    (tx as unknown as { campaignMember: { findUnique: jest.Mock } }).campaignMember = {
      findUnique: jest.fn().mockResolvedValue({ role: "PLAYER" }),
    };

    const r = await service.changeHpFromEffect(tx as never, "jugador-a", "c1", "b", {
      delta: 5,
      reason: "Actividad: cure-wounds",
    });

    expect(r.hp.current).toBe(10);
    // El suceso HP_CHANGED lo firma quien usó la actividad.
    expect(events.record).toHaveBeenCalledWith(
      "jugador-a",
      "c1",
      expect.objectContaining({
        payload: expect.objectContaining({ type: "HP_CHANGED", delta: 5 }),
      }),
      tx,
    );
  });

  it("changeHp con tx pasa por el MISMO cuerpo (no hay dos mecánicas)", async () => {
    const { service, prisma } = montar();
    const espia = jest.spyOn(service as never, "changeHpEnTransaccion");
    const fila = personaje({ id: "b", ownerId: "jugador-a", currentHp: 10, tempHp: 0 });
    const tx = montarTransaccion(prisma, fila);
    (tx as unknown as { campaignMember: { findUnique: jest.Mock } }).campaignMember = {
      findUnique: jest.fn().mockResolvedValue({ role: "PLAYER" }),
    };
    // `changeHp` con `tx` (a diferencia de `changeHpFromEffect`) sí llama a
    // `autorizarEdicionConCliente`, que necesita `character.findFirst` en ESE cliente.
    (tx.character as unknown as { findFirst: jest.Mock }).findFirst = jest
      .fn()
      .mockResolvedValue(fila);

    await service.changeHp("jugador-a", "c1", "b", { delta: 1, reason: "x" }, tx as never);
    await service.changeHpFromEffect(tx as never, "jugador-a", "c1", "b", {
      delta: 1,
      reason: "x",
    });

    expect(espia).toHaveBeenCalledTimes(2);
  });

  // Ola de arreglos 1 (Critical 1 de la revisión de API, 2026-09-13). El caso de mesa que los e2e
  // no veían por usar `SRD:goblin`/`SRD:wight` (los SRD resuelven para todos): un PNJ con statblock
  // de CAMPAÑA, `DM_ONLY` por defecto, cuyo daño firma un JUGADOR —el que impactó, o el que lanzó
  // la bola de fuego que el DM responde por el bicho—. `resolverParaHoja` devolvía `{ oculto }`
  // para ese espectador y la segunda puerta reventaba con un 400 después de que la tirada ya
  // estuviera escrita.
  it("un actor JUGADOR cambia los PG de un PNJ con statblock de campaña DM_ONLY: la hoja se deriva con el espectador del servidor, y el suceso lo firma el jugador", async () => {
    const statblock = SRD_STATBLOCK_POR_REF.get("SRD:wight")!;
    // El comportamiento REAL de `StatblocksService.resolverParaHoja` con un statblock `DM_ONLY`:
    // solo el DM (o quien lo creó) ve la plantilla; cualquier otro espectador recibe `oculto`.
    const resolverParaHoja = jest.fn(
      async (_campaignId: string, _ref: string, viewer: { role: string }) =>
        viewer.role === "DM" ? { statblock } : { oculto: true },
    );
    const statblocks = {
      resolverParaHoja: resolverParaHoja as unknown as jest.Mock,
      resolver: jest.fn().mockResolvedValue(statblock),
    };
    const { service, prisma, events } = montar(undefined, statblocks);
    const fila = personaje({
      id: "pnj",
      ownerId: "dm1",
      statblockRef: "CAMPAIGN:clx0000000000000000000001",
      visibility: "PLAYERS",
      currentHp: 45,
      tempHp: 0,
    });
    const tx = montarTransaccion(prisma, fila);
    // El actor es un jugador de la mesa, no el DM: es lo que `viewerFor` devolvería para él.
    (tx as unknown as { campaignMember: { findUnique: jest.Mock } }).campaignMember = {
      findUnique: jest.fn().mockResolvedValue({ role: "PLAYER" }),
    };

    const r = await service.changeHpFromEffect(tx as never, "jugador-a", "c1", "pnj", {
      delta: -10,
      damageType: "NECROTIC",
      reason: "Actividad: toque-necrotico",
    });

    // La plantilla que gobierna los NÚMEROS se leyó con un espectador del servidor (`role: "DM"`).
    // `buildResponse` la vuelve a pedir con el jugador —y recibe `oculto`— para REDACTAR lo que se
    // le devuelve: dos lecturas, dos propósitos, y solo la segunda mira quién es el actor.
    const roles = resolverParaHoja.mock.calls.map((c) => (c[2] as { role: string }).role);
    expect(roles).toContain("DM");
    expect(r.sheet).toBeNull();
    // El tumulario resiste el daño necrótico: 10 → 5, y la traza lo dice — los NÚMEROS de la
    // plantilla oculta gobiernan el cambio aunque el actor no pueda verla.
    expect(tx.character.update.mock.calls.at(-1)![0].data.currentHp).toBe(40);
    expect(r.damageTrace).toBeDefined();
    // Y el suceso lo firma quien causó el daño, el jugador: la crónica no cambia de autor.
    expect(events.record).toHaveBeenCalledWith(
      "jugador-a",
      "c1",
      expect.objectContaining({
        payload: expect.objectContaining({ type: "HP_CHANGED", from: 45, to: 40 }),
      }),
      tx,
    );
  });
});

describe("la siembra de recursos al terminar la ficha", () => {
  // Este agujero estuvo abierto desde 2A.8: `seedResourcesFor` tenía su prueba y **no lo
  // llamaba nadie**, así que ningún personaje tenía dados de golpe ni espacios de conjuro y el
  // panel de recursos salía vacío para todos. Lo encontró la revisión de la pantalla, no la
  // suite.

  it("al fijar clase y nivel, siembra con la hoja derivada y el nivel guardado", async () => {
    const { service, prisma, characters, resources, membership } = montar();
    const guardado = personaje({ classKey: "wizard", level: 3 });
    characters.requireEditable.mockResolvedValue(guardado);
    prisma.character.update.mockResolvedValue(guardado);
    // D-CF-66: el nivel lo fija el DM — quien llama aquí es el DM, no el dueño.
    membership.getMembership.mockResolvedValue({ role: "DM" });

    await service.updateSheet("dm1", "cmp1", "ch1", { level: 3 });

    expect(resources.seedResourcesFor).toHaveBeenCalledWith(
      "ch1",
      expect.objectContaining({ classKey: "wizard" }),
      3,
    );
  });

  it("una ficha a medias no siembra nada — no hay clase de la que sembrar", async () => {
    const { service, prisma, characters, resources, membership } = montar();
    const aMedias = personaje({ classKey: null, raceKey: null });
    characters.requireEditable.mockResolvedValue(aMedias);
    prisma.character.update.mockResolvedValue(aMedias);
    // D-CF-66: el nivel lo fija el DM.
    membership.getMembership.mockResolvedValue({ role: "DM" });

    await service.updateSheet("dm1", "cmp1", "ch1", { level: 2 });

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

  // Ticket J7 (2026-09-11) — el motivo del DM llega a la traza. `overrides` pasa a admitir
  // `number | { value, reason? }`; las filas legadas (un número a secas, como en casi todas las
  // pruebas de arriba) siguen derivando exactamente igual — esa es la garantía de la unión sin
  // migración, y ya la comprueba "la anulación gana sobre lo derivado..." al principio de este
  // describe con `overrides: { ac: 18 }`.
  it("ticket J7 — al fijarla con motivo, el motivo llega hasta el paso de la traza", async () => {
    const { service, prisma } = montar();
    const fila = personaje();
    prisma.character.findFirst.mockResolvedValue(fila);
    prisma.character.update.mockImplementation(({ data }: { data: { overrides: object } }) => ({
      ...fila,
      ...data,
    }));

    const r = await service.setOverride("dm1", "cmp1", "ch1", "ac", {
      value: 18,
      reason: "El DM lo dice",
    });

    const anulacion = r.sheet!.derived.ac.steps.find((p) => p.sourceType === "manual");
    expect(anulacion).toMatchObject({ reason: "El DM lo dice" });
  });

  it("ticket J7 — una fila legada con overrides como número (sin migrar) sigue derivando", async () => {
    const { service, prisma } = montar();
    // El dato tal cual lo dejó una escritura de ANTES de esta ficha: un número a secas, no
    // `{ value, reason }`. La unión no reescribe filas viejas.
    prisma.character.findFirst.mockResolvedValue(personaje({ overrides: { ac: 18 } }));

    const r = await service.getSheet("owner1", "cmp1", "ch1");

    expect(r.sheet!.derived.ac.total).toBe(18);
    const anulacion = r.sheet!.derived.ac.steps.find((p) => p.sourceType === "manual");
    expect(anulacion).toBeDefined();
    expect(anulacion!.reason).toBeUndefined();
  });

  // Ronda 2 de revisión (2026-09-11) — el caso que no se podía probar hasta ahora:
  // `passivePerception` es una de las cinco claves anulables, pero `engine.ts` la construía sin
  // pasar por `aplicar()`, así que una anulación guardada —legada o nueva— no hacía nada. Ya se
  // arregló el motor (`engine.spec.ts`); esta prueba pincha que el arreglo llega hasta la hoja
  // completa con una fila LEGADA (un número a secas, como las que ya existen en producción).
  it("ronda 2 — una fila legada con override numérico en passivePerception ahora sí deriva", async () => {
    const { service, prisma } = montar();
    prisma.character.findFirst.mockResolvedValue(
      personaje({ overrides: { passivePerception: 20 } }),
    );

    const r = await service.getSheet("owner1", "cmp1", "ch1");

    expect(r.sheet!.derived.passivePerception.total).toBe(20);
    const anulacion = r.sheet!.derived.passivePerception.steps.find(
      (p) => p.sourceType === "manual",
    );
    expect(anulacion).toBeDefined();
  });

  // Ronda 1 de revisión, hallazgo 5 — `modificadoresDeAnulacion` deja de reimplementar la forma
  // de `OverrideValue` a mano (dos `typeof` que ya podían discrepar del esquema) y pasa por
  // `overrideValueSchema.safeParse`. Efecto observable: un valor guardado que el esquema
  // rechaza —aquí, un `value` no entero— se ignora, cosa que el `typeof === "number"` de antes
  // NO hacía (un `18.5` tiene `typeof "number"` y se habría colado).
  it("ronda 1, hallazgo 5 — un valor guardado no entero se ignora, no se cuela como anulación", async () => {
    const { service, prisma } = montar();
    prisma.character.findFirst.mockResolvedValue(
      personaje({ overrides: { ac: { value: 18.5 } } as never }),
    );

    const r = await service.getSheet("owner1", "cmp1", "ch1");

    const anulacion = r.sheet!.derived.ac.steps.find((p) => p.sourceType === "manual");
    expect(anulacion).toBeUndefined();
  });

  // Ronda 1 de revisión, hallazgo 7 — la mitad de la decisión "unión sin migración" que faltaba
  // por pinchar: fijar UNA clave no debe tocar el número legado de otra.
  it("ronda 1, hallazgo 7 — fijar una clave deja el número legado de otra intacto", async () => {
    const { service, prisma } = montar();
    const fila = personaje({ overrides: { ac: 14, maxHp: 30 } });
    prisma.character.findFirst.mockResolvedValue(fila);
    prisma.character.update.mockResolvedValue(fila);

    await service.setOverride("dm1", "cmp1", "ch1", "ac", { value: 18, reason: "Anillo" });

    expect(prisma.character.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { overrides: { ac: { value: 18, reason: "Anillo" }, maxHp: 30 } },
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
    const { service, prisma, characters, membership } = montar();
    const guardado = personaje({
      classKey: "rogue",
      raceKey: "human",
      subraceKey: null,
      choices: { "class.wizard.skills": ["arcana"] },
    });
    characters.requireEditable.mockResolvedValue(guardado);
    prisma.character.update.mockResolvedValue(guardado);
    // D-CF-66: el nivel lo fija el DM.
    membership.getMembership.mockResolvedValue({ role: "DM" });

    await expect(service.updateSheet("dm1", "cmp1", "ch1", { level: 2 })).resolves.toBeDefined();
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
      // Fix round 1 (M6): el `ref` del arma, para casar el crítico del daño sin depender del
      // nombre.
      { attackRef: "SRD:long-sword" },
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
      // Fix round 1 (M6): el crítico se casa por `attackRef`, no por `reason`.
      attackRef: "SRD:long-sword",
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
      attackRef: "SRD:long-sword",
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

  // Tarea 3 de la puerta de efectos (spec §4b.4, E-PE-5) — el daño de un ataque RESUELTO sabe a
  // quién le toca. Las tres pruebas comparten la misma forma: `gameEvent.findFirst` responde
  // distinto según el `type` que pida cada consulta —`ABILITY_ROLL` (el crítico, ya existente) o
  // `ATTACK_RESOLVED` (el veredicto, nuevo)—, exactamente como haría Postgres con el `where` real.
  describe("pendingDamage — de qué ataque resuelto sale el daño", () => {
    function mockearVeredicto(prisma: { gameEvent: { findFirst: jest.Mock } }, veredicto: unknown) {
      prisma.gameEvent.findFirst.mockImplementation(({ where }: { where: { type: string } }) =>
        Promise.resolve(
          where.type === "ATTACK_RESOLVED"
            ? veredicto
            : { payload: { natural: "NONE", reason: RAZON_DEL_ATAQUE } },
        ),
      );
    }

    it("con veredicto HIT, rolls.roll lleva interno.pendingDamage con el objetivo y el tipo de daño del arma", async () => {
      const { service, rolls, prisma } = conEspada();
      mockearVeredicto(prisma, { id: "ar1", subjectId: "t1", payload: { verdict: "HIT" } });

      await service.rollAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
        part: "DAMAGE",
        spendInspiration: false,
        mode: "NORMAL",
        versatile: false,
        attackRollEventId: "ev-atk-1",
      });

      expect(rolls.roll).toHaveBeenCalledWith(
        "p1",
        "c1",
        expect.objectContaining({ expression: "1d8+2" }),
        {
          attackRollEventId: "ev-atk-1",
          pendingDamage: {
            targetCharacterId: "t1",
            attackResolvedEventId: "ar1",
            damageType: "SLASHING",
          },
        },
      );
    });

    it("con veredicto CRITICAL también lleva pendingDamage: crítico y objetivo no son excluyentes", async () => {
      const { service, rolls, prisma } = conEspada();
      mockearVeredicto(prisma, { id: "ar1", subjectId: "t1", payload: { verdict: "CRITICAL" } });

      await service.rollAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
        part: "DAMAGE",
        spendInspiration: false,
        mode: "NORMAL",
        versatile: false,
        attackRollEventId: "ev-atk-1",
      });

      expect(rolls.roll).toHaveBeenCalledWith(
        "p1",
        "c1",
        expect.anything(),
        expect.objectContaining({
          pendingDamage: expect.objectContaining({ targetCharacterId: "t1" }),
        }),
      );
    });

    it("con veredicto MISS, el daño no lleva pendingDamage: un fallo no tiene a quién tocarle", async () => {
      const { service, rolls, prisma } = conEspada();
      mockearVeredicto(prisma, { id: "ar1", subjectId: "t1", payload: { verdict: "MISS" } });

      await service.rollAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
        part: "DAMAGE",
        spendInspiration: false,
        mode: "NORMAL",
        versatile: false,
        attackRollEventId: "ev-atk-1",
      });

      expect(rolls.roll).toHaveBeenCalledWith(
        "p1",
        "c1",
        expect.objectContaining({ expression: "1d8+2" }),
        { attackRollEventId: "ev-atk-1" },
      );
    });

    it("sin ningún ATTACK_RESOLVED colgando de la tirada citada, tampoco lleva pendingDamage: un daño tirado al aire no tiene objetivo", async () => {
      const { service, rolls, prisma } = conEspada();
      mockearVeredicto(prisma, null);

      await service.rollAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
        part: "DAMAGE",
        spendInspiration: false,
        mode: "NORMAL",
        versatile: false,
        attackRollEventId: "ev-atk-1",
      });

      expect(rolls.roll).toHaveBeenCalledWith(
        "p1",
        "c1",
        expect.objectContaining({ expression: "1d8+2" }),
        { attackRollEventId: "ev-atk-1" },
      );
    });
  });

  // Fix round 1 (M6) — el nombre de mesa, sea quien sea quien tira.
  it("fix round 1 (M6) — si el DM tira por el jugador con un arma sin identificar, la etiqueta pública lleva el alias", async () => {
    const { service, rolls, prisma, membership } = conEspada();
    const filaEspada = filaDeInventario("long-sword", {
      slot: "MAIN_HAND",
      identified: false,
      unidentifiedName: "Espada de aspecto extraño",
    });
    // `equipoEquipado` la lee por `findMany` (para construir el cuadro); `nombreDeMesaParaAtaque`
    // la vuelve a buscar por `findFirst` (para el nombre de mesa) — misma fila, dos caminos.
    prisma.inventoryItem.findMany.mockResolvedValue([filaEspada]);
    prisma.inventoryItem.findFirst.mockResolvedValue(filaEspada);
    // El DM tira por el personaje del jugador (`characters.requireEditable` ya lo permite —
    // dueño o DM), y su propio visor SÍ ve el nombre real: por eso `ataque.name` (interno, no
    // el que llega a la tirada) sería "Espada larga" si no se corrigiera.
    membership.getMembership.mockResolvedValue({ role: "DM" });

    await service.rollAttack("dm1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      part: "ATTACK",
      spendInspiration: false,
      mode: "NORMAL",
      versatile: false,
    });

    expect(rolls.roll).toHaveBeenCalledWith(
      "dm1",
      "c1",
      expect.objectContaining({ label: "Ataque con Espada de aspecto extraño" }),
      { attackRef: "SRD:long-sword" },
    );
    // Nunca el nombre real, ni siquiera de refilón en algún otro campo de la llamada.
    expect(JSON.stringify(rolls.roll.mock.calls.at(-1))).not.toContain("Espada larga");
  });

  it("fix round 1 (M6) — el crítico se casa por `attackRef`, no por el nombre: sigue detectándolo aunque el nombre haya cambiado entre las dos tiradas", async () => {
    const { service, rolls, prisma } = conEspada();
    prisma.gameEvent.findFirst.mockResolvedValue({
      // El `reason` es el de una tirada de ATAQUE anterior a que el DM identificara el arma a
      // mitad de combate: ya no coincide con lo que `rollAttack` escribiría ahora («Ataque con
      // Espada larga»). Con el criterio viejo (comparar por nombre) esto rompía el crítico
      // silenciosamente; con `attackRef` no debería importarle.
      payload: { natural: "TWENTY", reason: "Ataque con Espada de aspecto extraño" },
      attackRef: "SRD:long-sword",
    });

    await service.rollAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      part: "DAMAGE",
      spendInspiration: false,
      mode: "NORMAL",
      versatile: false,
      attackRollEventId: "ev-atk-20",
    });

    // 1d8+2 crítico es 2d8+2: si el crítico no se hubiera detectado, seguiría en 1d8+2.
    expect(rolls.roll).toHaveBeenCalledWith(
      "p1",
      "c1",
      expect.objectContaining({ expression: "2d8+2" }),
      { attackRollEventId: "ev-atk-20" },
    );
  });

  it("fix round 2 (R3) — el crítico se casa por el `ref` REAL de la fila, no por el del visor: el DM tira el ataque y el JUGADOR cobra el crítico del daño de un arma sin identificar", async () => {
    const { service, rolls, prisma, membership } = conEspada();
    const filaEspada = filaDeInventario("long-sword", {
      slot: "MAIN_HAND",
      identified: false,
      unidentifiedName: "Espada de aspecto extraño",
    });
    prisma.inventoryItem.findMany.mockResolvedValue([filaEspada]);
    prisma.inventoryItem.findFirst.mockResolvedValue(filaEspada);

    // El DM tira el ATAQUE: su propio visor ve el `ref` real, y `datosDeMesaParaAtaque` lo
    // resuelve por la RANURA (no por ese `ref`), así que guarda `attackRef: "SRD:long-sword"`
    // sea quien sea quien pregunte — comprobado ya en el test de arriba.
    membership.getMembership.mockResolvedValue({ role: "DM" });
    await service.rollAttack("dm1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      part: "ATTACK",
      spendInspiration: false,
      mode: "NORMAL",
      versatile: false,
    });

    // Ahora el JUGADOR (no DM) pide el DAÑO citando esa misma tirada. Con la versión de fix
    // round 1 (`attackRef: ataque.ref` del visor de quien tira), el DM habría guardado
    // `SRD:long-sword` y el jugador compararía contra `SRD:objeto-sin-identificar` — el mismo
    // objeto, dos `ref` de visor distintos, crítico perdido. Con el `ref` real (R3), no importa.
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.gameEvent.findFirst.mockResolvedValue({
      payload: { natural: "TWENTY" },
      attackRef: "SRD:long-sword",
    });

    // Su propia `key` es la redactada: es lo que SU cuadro de ataques le enseña.
    await service.rollAttack("p1", "c1", "ch1", "SRD:objeto-sin-identificar:MAIN_HAND", {
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
      { attackRollEventId: "ev-atk-20" },
    );
  });

  it("fix round 2 (R3) — sin `attackRef` (suceso histórico, anterior a la columna), el crítico se casa por el nombre, como antes de fix round 1 (M6)", async () => {
    const { service, rolls, prisma } = conEspada();
    prisma.gameEvent.findFirst.mockResolvedValue({
      payload: { natural: "TWENTY", reason: "Ataque con Espada larga" },
      attackRef: null,
    });

    await service.rollAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      part: "DAMAGE",
      spendInspiration: false,
      mode: "NORMAL",
      versatile: false,
      attackRollEventId: "ev-viejo",
    });

    expect(rolls.roll).toHaveBeenCalledWith(
      "p1",
      "c1",
      expect.objectContaining({ expression: "2d8+2" }),
      { attackRollEventId: "ev-viejo" },
    );
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

  // Revisión final de `ficha/tanda-2-a-5`, Low #8: la audiencia por defecto del DAÑO no era la
  // del ATAQUE (`audienciaPorDefecto`, arriba) — un cliente por API que omita `audience` en
  // `part: "DAMAGE"` publicaba la línea de daño de un PNJ `DM_ONLY` a toda la mesa como
  // `"PUBLIC"` fijo. La web ya manda siempre `audience` (`TirarAtaqueBoton`), así que esto solo
  // se veía por API directa.
  it("el DAÑO de un PNJ `DM_ONLY` sin `audience` explícita no se publica como PUBLIC", async () => {
    const montado = montar();
    const pnj = personaje({ visibility: "DM_ONLY" });
    montado.prisma.character.findFirst.mockResolvedValue(pnj);
    montado.characters.requireEditable.mockResolvedValue(pnj);
    montado.prisma.inventoryItem.findMany.mockResolvedValue([
      filaDeInventario("long-sword", { slot: "MAIN_HAND" }),
    ]);
    const { service, rolls } = montado;

    await service.rollAttack("p1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      part: "DAMAGE",
      spendInspiration: false,
      mode: "NORMAL",
      versatile: false,
    });

    expect(rolls.roll).toHaveBeenCalledWith(
      "p1",
      "c1",
      expect.objectContaining({ audience: "DM_PRIVATE" }),
    );
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

  it("fix round 2 (R2) — el DUEÑO (p1) ve el efecto en la CA y su `ref`, pero nunca el nombre real: está REDACTADO, no oculto", async () => {
    // Antes de M4a/R2 esta prueba decía que el jugador dueño no veía ni «ci-1»: eso era
    // `redactado()` («Objeto oculto») para CUALQUIER visor sin `canView`. Desde M4a (fix round
    // 1) el DUEÑO de la fila ya no desaparece —ni en `list()` ni, desde R2, en la hoja—: se ve
    // por el mismo camino que un objeto sin identificar (`filaComoLaVeElViewer`), así que su
    // `ref` de CAMPAÑA (un cuid, no dice nada por sí solo) sigue en la traza y su nombre pasa a
    // ser el título genérico, nunca el real.
    const { service } = conAnilloSecreto("PLAYER");

    const res = await service.getSheet("p1", "c1", "ch1");

    const traza = JSON.stringify(res.sheet!.derived.ac);
    // El número sí: quitarlo daría una CA distinta a cada persona que mira la MISMA hoja, y
    // entonces la hoja mentiría a alguien. Lo que se quita es la identidad.
    expect(res.sheet!.derived.ac.total).toBe(12);
    expect(traza).toContain("ci-1");
    expect(traza).not.toContain("Anillo del Traidor");
    expect(JSON.stringify(res)).not.toContain("Anillo del Traidor");
  });

  it("fix round 2 (R2) — un COMPAÑERO de mesa (no el dueño) sigue sin ver ni el `ref`: sigue siendo «Objeto oculto»", async () => {
    // La excepción de M4a es SOLO del dueño: un tercero sin concesión (aquí, "p2", que no es
    // "p1") sigue recibiendo `redactado()` entero — ni nombre, ni `ref` real, ni «ci-1».
    const { service } = conAnilloSecreto("PLAYER");

    const res = await service.getSheet("p2", "c1", "ch1");

    const traza = JSON.stringify(res.sheet!.derived.ac);
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

// HP-9a (2026-09-12) — la costura que ningún otro sitio puede probar: que el `attuned` de LA FILA
// llegue al motor. SRD 5.1 §Attunement: sin sintonizar, el objeto no da sus propiedades mágicas.
describe("HP-9a — la sintonización de la fila llega al motor, y la hoja dice por qué el número no se movió", () => {
  const anilloQueRequiere = {
    id: "ci-3",
    campaignId: "c1",
    name: "Anillo de protección",
    kind: "OTHER",
    description: null,
    weightOz: 1,
    costCp: null,
    effects: [{ kind: "ac", amount: 1 }],
    requiresAttunement: true,
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
    visibility: "PLAYERS",
    createdById: "dm1",
    createdAt: new Date(),
    grants: [],
  };

  function conAnillo(attuned: boolean) {
    const montado = montar();
    montado.prisma.character.findFirst.mockResolvedValue(personaje());
    montado.prisma.inventoryItem.findMany.mockResolvedValue([
      filaDeInventario("", { srdKey: null, campaignItemId: "ci-3", slot: "RING_1", attuned }),
    ]);
    montado.prisma.campaignItem.findFirst.mockResolvedValue(anilloQueRequiere);
    montado.membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    return montado;
  }

  it("sin sintonizar: la CA se queda en 11 y sale el aviso `item_not_attuned` con el nombre del anillo", async () => {
    const { service } = conAnillo(false);

    const res = await service.getSheet("p1", "c1", "ch1");

    // Sin equipo la CA de esta ficha es 11 (10 + Destreza 12). Antes de HP-9a aquí salía 12.
    expect(res.sheet!.derived.ac.total).toBe(11);
    expect(res.sheet!.warnings).toContainEqual({
      code: "item_not_attuned",
      key: "CAMPAIGN:ci-3",
      data: { ref: "CAMPAIGN:ci-3", name: "Anillo de protección" },
    });
  });

  it("sintonizado: la CA sube a 12 y NO hay aviso", async () => {
    const { service } = conAnillo(true);

    const res = await service.getSheet("p1", "c1", "ch1");

    expect(res.sheet!.derived.ac.total).toBe(12);
    expect(res.sheet!.warnings.some((a) => a.code === "item_not_attuned")).toBe(false);
  });

  it("un objeto que requiere sintonización pero no tiene efectos no avisa: no hay nada que dejara de contar", async () => {
    const montado = conAnillo(false);
    montado.prisma.campaignItem.findFirst.mockResolvedValue({ ...anilloQueRequiere, effects: [] });

    const res = await montado.service.getSheet("p1", "c1", "ch1");

    expect(res.sheet!.warnings.some((a) => a.code === "item_not_attuned")).toBe(false);
  });
});

describe("D-CF-15 (migración 7) — un objeto sin identificar cambia de nombre para quien no es el DM", () => {
  /** El mismo anillo, pero VISIBLE (`PLAYERS`) y sin identificar: la capa que se prueba aquí es
   * ortogonal a `canView` — visible no es lo mismo que identificado. */
  const anilloSinIdentificar = {
    id: "ci-2",
    campaignId: "c1",
    name: "Anillo de protección",
    kind: "OTHER",
    description: "Un aro de plata pulida, cálido al tacto.",
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
    visibility: "PLAYERS",
    createdById: "dm1",
    createdAt: new Date(),
    grants: [],
  };

  function conAnilloSinIdentificar(
    rolDeQuienMira: "DM" | "PLAYER",
    extraFila: Record<string, unknown> = {},
  ) {
    const montado = montar();
    montado.prisma.character.findFirst.mockResolvedValue(personaje());
    montado.prisma.inventoryItem.findMany.mockResolvedValue([
      filaDeInventario("", {
        srdKey: null,
        campaignItemId: "ci-2",
        slot: "RING_1",
        identified: false,
        unidentifiedName: "Anillo de aspecto extraño",
        ...extraFila,
      }),
    ]);
    montado.prisma.campaignItem.findFirst.mockResolvedValue(anilloSinIdentificar);
    montado.membership.getMembership.mockResolvedValue({ role: rolDeQuienMira });
    return montado;
  }

  // **Un anillo (`OTHER`, sin arma) no tiene ningún camino por el que su NOMBRE llegue a la
  // hoja** — ni identificado ni sin identificar: `rules/items.ts` solo mete `item.ref` en la
  // traza de sus efectos (`labelKey: "item.<ref>"`, `sourceKey: item.ref`), nunca `item.name`
  // (línea ~175). Es la misma razón por la que el test de visibilidad de arriba («2B — la hoja
  // no enseña...») solo puede comprobar la ausencia del nombre, no su presencia: aquí se
  // demuestra que identificar tampoco cambia el número ni el `ref`, que son justo lo que
  // `conIdentificacion` promete no tocar. El camino donde el NOMBRE sí llega a la hoja —el
  // cuadro de ataques— se prueba debajo, con un arma.
  it("el efecto del anillo (el número) y su `ref` no cambian ni identificado ni sin identificar", async () => {
    const identificado = await conAnilloSinIdentificar("PLAYER", {
      identified: true,
      unidentifiedName: null,
    }).service.getSheet("p1", "c1", "ch1");
    const sinIdentificar = await conAnilloSinIdentificar("PLAYER").service.getSheet(
      "p1",
      "c1",
      "ch1",
    );

    expect(sinIdentificar.sheet!.derived.ac.total).toBe(identificado.sheet!.derived.ac.total);
    expect(JSON.stringify(sinIdentificar.sheet!.derived.ac)).toContain("ci-2");
    // Fix round 2 (R7/B9) — la respuesta ENTERA, no solo `derived.ac`: si algún campo nuevo de
    // `getSheet` empezara a colar el nombre real de un objeto sin identificar, esta prueba
    // fallaría (la de arriba, acotada a `derived.ac`, no lo habría visto).
    expect(JSON.stringify(sinIdentificar)).not.toContain("Anillo de protección");
  });

  it("el cuadro de ataques también respeta el alias: un arma sin identificar no delata su nombre real", async () => {
    const armaSinIdentificar = {
      ...anilloSinIdentificar,
      id: "ci-3",
      name: "Espada larga +1",
      kind: "WEAPON",
      slot: "MAIN_HAND",
      weaponCategory: "MARTIAL",
      weaponRange: "MELEE",
      damageDice: "1d8",
      damageType: "SLASHING",
      weaponProperties: [],
      effects: [{ kind: "weaponAttack", amount: 1 }],
    };
    const { service, prisma, membership } = montar();
    prisma.character.findFirst.mockResolvedValue(personaje());
    prisma.inventoryItem.findMany.mockResolvedValue([
      filaDeInventario("", {
        srdKey: null,
        campaignItemId: "ci-3",
        slot: "MAIN_HAND",
        identified: false,
        unidentifiedName: "Espada de aspecto extraño",
      }),
    ]);
    prisma.campaignItem.findFirst.mockResolvedValue(armaSinIdentificar);
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });

    const res = await service.getSheet("p1", "c1", "ch1");

    const json = JSON.stringify(res.attacks);
    expect(json).not.toContain("Espada larga +1");
    expect(json).toContain("Espada de aspecto extraño");
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
      { attackRef: "SRD:long-sword" },
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

  // Fix round 3 (R9) — hasta este arreglo, ninguna prueba ejercitaba `ATTACK_RESOLVED.attackName`
  // con un arma sin identificar: `rollAttack` tenía su M6/R3 (arriba), pero `resolveAttack`
  // escribe su PROPIO suceso con su PROPIA llamada a `datosDeMesaParaAtaque` — un helper
  // compartido no es lo mismo que un camino probado (mismo criterio que ya dejó R7).
  it("D-CF-15 (R9): ATTACK_RESOLVED.attackName lleva el alias de un arma sin identificar, nunca el nombre real", async () => {
    const { service, prisma, events, membership } = conAtacanteYObjetivo({
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
    const filaEspada = filaDeInventario("long-sword", {
      slot: "MAIN_HAND",
      identified: false,
      unidentifiedName: "Espada de aspecto extraño",
    });
    // `equipoEquipado` la lee por `findMany` (para el cuadro de ataques); `datosDeMesaParaAtaque`
    // la vuelve a buscar por `findFirst` (para el nombre de mesa del suceso) — misma fila, dos
    // caminos, igual que en el M6 de `rollAttack`.
    prisma.inventoryItem.findMany.mockImplementation(
      ({ where }: { where: { characterId: string } }) =>
        Promise.resolve(where.characterId === "ch1" ? [filaEspada] : []),
    );
    prisma.inventoryItem.findFirst.mockResolvedValue(filaEspada);
    // Como en el M6 de `rollAttack`: quien pide el ataque es el DM (su visor SÍ ve el `ref`/
    // nombre reales, así que `ataque.key` sigue siendo "SRD:long-sword:MAIN_HAND" — si atacara
    // el propio dueño, sin ser DM, `equipoEquipado` ya le redactaría el `ref` del arma del SRD
    // a `SRD:objeto-sin-identificar` y la clave del ataque cambiaría con él).
    membership.getMembership.mockResolvedValue({ role: "DM" });

    await service.resolveAttack("dm1", "c1", "ch1", "SRD:long-sword:MAIN_HAND", {
      targetCharacterId: "target1",
      mode: "NORMAL",
      spendInspiration: false,
    });

    const escrito = events.record.mock.calls.at(-1)!;
    expect(escrito[2].payload).toMatchObject({
      type: "ATTACK_RESOLVED",
      attackName: "Espada de aspecto extraño",
    });
    expect(JSON.stringify(escrito[2].payload)).not.toContain("Espada larga");
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
      { attackRef: "SRD:long-sword" },
    );
  });
});

describe("armorClassInTransaction — M2B-11, fix de ronda 1 (Q-3)", () => {
  it("devuelve el número cuando la hoja se puede derivar", async () => {
    const { service, prisma } = montar();
    const tx = prisma as unknown as Prisma.TransactionClient;

    const ac = await service.armorClassInTransaction("p1", personaje(), tx);

    expect(ac).toBe(HOJA_EJEMPLO.derived.ac.total);
  });

  it("null cuando no hay hoja que derivar (falta raza y clase) — no revienta", async () => {
    const { service, prisma } = montar();
    const tx = prisma as unknown as Prisma.TransactionClient;
    const sinConstruir = personaje({ raceKey: null, classKey: null, subraceKey: null });

    await expect(service.armorClassInTransaction("p1", sinConstruir, tx)).resolves.toBeNull();
  });

  it("un fallo que NO es 'falta de datos' se propaga, no se traga como null", async () => {
    const { service, prisma } = montar();
    const tx = prisma as unknown as Prisma.TransactionClient;
    // `equipoEquipado` lee el equipo con `inventoryItem.findMany` sin envolverlo en un `try`
    // propio (solo la resolución de cada fila lo está) — un fallo aquí es un error real de la
    // base, no un "PNJ sin plantilla" ni ningún otro caso legítimo de `BadRequestException`.
    prisma.inventoryItem.findMany.mockRejectedValueOnce(new Error("la base se cayó"));

    await expect(service.armorClassInTransaction("p1", personaje(), tx)).rejects.toThrow(
      "la base se cayó",
    );
  });
});

// Tarea 3 de la puerta de efectos (spec §4b.4-§4b.6) — la bandeja de daño: el daño de un ataque
// resuelto sabe a quién le toca, se enseña antes de aplicarse, y se aplica una sola vez.
describe("damagePreview — la bandeja de daño, antes de pulsar nada (spec §4b.4/§4b.5)", () => {
  const RESISTENTE_A_CORTANTE = [
    { damageType: "SLASHING" as const, effect: "RESIST" as const, note: "de ataques no mágicos" },
  ];

  /** Un fantasma de campaña —no del catálogo SRD— con sus propios `damageModifiers`. */
  function montarConFantasma(damageModifiers: unknown[] = RESISTENTE_A_CORTANTE, tempHp = 0) {
    const resolver = jest.fn().mockResolvedValue({ damageModifiers });
    const montado = montar(undefined, {
      resolver,
      resolverParaHoja: jest.fn(),
    } as unknown as { resolver: jest.Mock });
    const target = personaje({
      id: "fantasma1",
      name: "Fantasma",
      ownerId: "otro",
      statblockRef: "CAMPAIGN:fantasma",
      tempHp,
    });
    montado.prisma.character.findFirst.mockResolvedValue(target);
    return { ...montado, target };
  }

  function conPendingDamage(
    prisma: { gameEvent: { findFirst: jest.Mock } },
    overrides: Record<string, unknown> = {},
  ) {
    prisma.gameEvent.findFirst.mockResolvedValue({
      actorUserId: "p1",
      payload: {
        pendingDamage: {
          targetCharacterId: "fantasma1",
          attackResolvedEventId: "ar1",
          damageType: "SLASHING",
          amount: 11,
          ...overrides,
        },
      },
    });
  }

  it("resistencia limpia: la mitad redondeada abajo, con el modificador y el motivo del libro", async () => {
    const { service, prisma, membership } = montarConFantasma();
    conPendingDamage(prisma);
    membership.getMembership.mockResolvedValue({ role: "DM" });

    const preview = await service.damagePreview("dm1", "c1", "roll1");

    expect(preview.resulting).toEqual({
      taken: 5,
      absorbedByTemp: 0,
      modifier: "resistant",
      reason: "de ataques no mágicos",
    });
    expect(preview.target).toEqual({ id: "fantasma1", name: "Fantasma" });
    expect(preview.canApply).toBe(true);
    expect(preview.appliedEventId).toBeNull();
  });

  it("con PG temporales, absorben primero y solo el resto se toma de verdad", async () => {
    // Mutación (Step 6 del brief): cambiar `Math.min(target.tempHp, trace.total)` por
    // `trace.total` deja `absorbedByTemp` en 5 y `taken` en 0, y esta prueba se pone en rojo.
    const { service, prisma, membership } = montarConFantasma(RESISTENTE_A_CORTANTE, 3);
    conPendingDamage(prisma);
    membership.getMembership.mockResolvedValue({ role: "DM" });

    const preview = await service.damagePreview("dm1", "c1", "roll1");

    expect(preview.resulting).toEqual({
      taken: 2,
      absorbedByTemp: 3,
      modifier: "resistant",
      reason: "de ataques no mágicos",
    });
  });

  it("inmune: nada llega a los PG, y el modificador lo dice", async () => {
    const { service, prisma, membership } = montarConFantasma([
      { damageType: "SLASHING", effect: "IMMUNE" },
    ]);
    conPendingDamage(prisma);
    membership.getMembership.mockResolvedValue({ role: "DM" });

    const preview = await service.damagePreview("dm1", "c1", "roll1");

    expect(preview.resulting.taken).toBe(0);
    expect(preview.resulting.modifier).toBe("immune");
  });

  it("sin modificadores para ese tipo de daño, el modificador es null", async () => {
    const { service, prisma, membership } = montarConFantasma([]);
    conPendingDamage(prisma);
    membership.getMembership.mockResolvedValue({ role: "DM" });

    const preview = await service.damagePreview("dm1", "c1", "roll1");

    expect(preview.resulting.modifier).toBeNull();
    expect(preview.resulting.taken).toBe(11);
  });

  it("un espectador que no es dueño ni DM del objetivo recibe 404, nunca 403 (spec §4b.5)", async () => {
    // Un 403 confirmaría que la tirada tiene daño pendiente contra un objetivo real, y con él
    // viajaría si resiste o no — la misma fuga que un 403 de `resolveAttack` ya cerró en 2.5.3.
    const { service, prisma, membership } = montarConFantasma();
    conPendingDamage(prisma);
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });

    await expect(service.damagePreview("otro-jugador", "c1", "roll1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("un daño ya aplicado se enseña con canApply:false y su appliedEventId", async () => {
    const { service, prisma, membership } = montarConFantasma();
    conPendingDamage(prisma, { appliedEventId: "hp1" });
    membership.getMembership.mockResolvedValue({ role: "DM" });

    const preview = await service.damagePreview("dm1", "c1", "roll1");

    expect(preview.canApply).toBe(false);
    expect(preview.appliedEventId).toBe("hp1");
  });

  it("una tirada sin pendingDamage es 404: «esa tirada no tiene daño pendiente»", async () => {
    const { service, prisma } = montarConFantasma();
    prisma.gameEvent.findFirst.mockResolvedValue({ actorUserId: "p1", payload: {} });

    await expect(service.damagePreview("dm1", "c1", "roll1")).rejects.toMatchObject({
      status: 404,
      message: "Esa tirada no tiene daño pendiente.",
    });
  });
});

describe("applyPendingDamage — el aplicar de un clic, idempotente (spec §4b.6)", () => {
  function conPendingDamage(
    prisma: { gameEvent: { findFirst: jest.Mock } },
    overrides: Record<string, unknown> = {},
  ) {
    prisma.gameEvent.findFirst.mockImplementation(({ where }: { where: { type?: string } }) =>
      Promise.resolve(
        where.type === "ATTACK_RESOLVED"
          ? { payload: { attackName: "Mordisco" } }
          : {
              actorUserId: "p1",
              payload: {
                pendingDamage: {
                  targetCharacterId: "wight1",
                  attackResolvedEventId: "ar1",
                  damageType: "NECROTIC",
                  amount: 25,
                  ...overrides,
                },
              },
            },
      ),
    );
  }

  it("aplica el daño (reducido por resistencia) con changeHpFromEffect, y marca la tirada con el id del HP_CHANGED", async () => {
    const statblocks = statblocksDelCatalogo("SRD:wight");
    const { service, prisma, membership, events } = montar(undefined, statblocks);
    const target = personaje({
      id: "wight1",
      ownerId: "npc-owner",
      statblockRef: "SRD:wight",
      currentHp: 45,
      tempHp: 0,
    });
    prisma.character.findFirst.mockResolvedValue(target);
    conPendingDamage(prisma);
    membership.getMembership.mockResolvedValue({ role: "DM" });
    const tx = montarTransaccion(prisma, target);
    (tx as unknown as { $executeRaw: jest.Mock }).$executeRaw = jest.fn().mockResolvedValue(1);

    const res = await service.applyPendingDamage("dm1", "c1", "roll1");

    // 25 de necrótico con resistencia: 12 de verdad (redondeado hacia abajo) — misma cuenta que
    // la tarea 2.5.1 ya comprueba sobre `changeHp` directo.
    expect(tx.character.update.mock.calls.at(-1)![0].data.currentHp).toBe(45 - 12);
    // El HP_CHANGED lo firma A —quien tiró el daño—, no el DM que pulsó el botón.
    expect(events.record).toHaveBeenCalledWith(
      "p1",
      "c1",
      expect.objectContaining({
        payload: expect.objectContaining({ type: "HP_CHANGED", reason: "Ataque: Mordisco" }),
      }),
      tx,
    );
    expect(res.appliedEventId).toBe("ev1");
    expect((tx as unknown as { $executeRaw: jest.Mock }).$executeRaw).toHaveBeenCalled();
  });

  it("si el candado real (el UPDATE con jsonb_set) no marca ninguna fila, es 409", async () => {
    const statblocks = statblocksDelCatalogo("SRD:wight");
    const { service, prisma, membership } = montar(undefined, statblocks);
    const target = personaje({
      id: "wight1",
      ownerId: "npc-owner",
      statblockRef: "SRD:wight",
      currentHp: 45,
      tempHp: 0,
    });
    prisma.character.findFirst.mockResolvedValue(target);
    conPendingDamage(prisma);
    membership.getMembership.mockResolvedValue({ role: "DM" });
    const tx = montarTransaccion(prisma, target);
    (tx as unknown as { $executeRaw: jest.Mock }).$executeRaw = jest.fn().mockResolvedValue(0);

    await expect(service.applyPendingDamage("dm1", "c1", "roll1")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("un daño ya marcado con appliedEventId es 409 sin abrir la transacción (lectura barata)", async () => {
    const statblocks = statblocksDelCatalogo("SRD:wight");
    const { service, prisma, membership } = montar(undefined, statblocks);
    const target = personaje({ id: "wight1", ownerId: "npc-owner", statblockRef: "SRD:wight" });
    prisma.character.findFirst.mockResolvedValue(target);
    conPendingDamage(prisma, { appliedEventId: "hp-viejo" });
    membership.getMembership.mockResolvedValue({ role: "DM" });

    await expect(service.applyPendingDamage("dm1", "c1", "roll1")).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.transaction).not.toHaveBeenCalled();
  });

  it("el atacante, si no es dueño ni DM del objetivo, no puede aplicar: 403 (aquí SÍ se ve, spec §6)", async () => {
    const statblocks = statblocksDelCatalogo("SRD:wight");
    const { service, prisma, membership } = montar(undefined, statblocks);
    const target = personaje({ id: "wight1", ownerId: "npc-owner", statblockRef: "SRD:wight" });
    prisma.character.findFirst.mockResolvedValue(target);
    conPendingDamage(prisma);
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });

    await expect(service.applyPendingDamage("p1", "c1", "roll1")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

// Puerta de efectos §5 bis (E-PE-10, tarea 5). `getSheet` añade `xp` SOLO en modo `XP`; con
// `HITO` — el defecto — la respuesta no lo lleva, para que una campaña que ya existe no cambie.
describe("getSheet — el marcador de XP (spec §5b.4, E-PE-10)", () => {
  it("modo XP, xp: 1250 y level: 3 → xp: { actual: 1250, siguiente: 2700, nivelPorXp: 3 }", async () => {
    const { service, prisma } = montar();
    prisma.character.findFirst.mockResolvedValue(personaje({ xp: 1250, level: 3 }));
    prisma.campaign.findUnique.mockResolvedValue({ tableRules: { progresion: "XP" } });

    const res = await service.getSheet("p1", "c1", "ch1");

    expect(res.xp).toEqual({ actual: 1250, siguiente: 2700, nivelPorXp: 3 });
  });

  it("modo XP, xp: 2700 y level: 3 → nivelPorXp: 4 (la pantalla avisa: alcanzó el umbral del nivel siguiente)", async () => {
    const { service, prisma } = montar();
    prisma.character.findFirst.mockResolvedValue(personaje({ xp: 2700, level: 3 }));
    prisma.campaign.findUnique.mockResolvedValue({ tableRules: { progresion: "XP" } });

    const res = await service.getSheet("p1", "c1", "ch1");

    // `siguiente` es el umbral del nivel siguiente al GUARDADO (3), no al que da `nivelPorXp` (4):
    // el DM todavía no ha pulsado «Subir de nivel» (D-CF-66), así que coincide con `actual`.
    expect(res.xp).toEqual({ actual: 2700, siguiente: 2700, nivelPorXp: 4 });
  });

  it("modo XP, nivel 20 → siguiente: null", async () => {
    const { service, prisma } = montar();
    prisma.character.findFirst.mockResolvedValue(personaje({ xp: 355000, level: 20 }));
    prisma.campaign.findUnique.mockResolvedValue({ tableRules: { progresion: "XP" } });

    const res = await service.getSheet("p1", "c1", "ch1");

    expect(res.xp).toEqual({ actual: 355000, siguiente: null, nivelPorXp: 20 });
  });

  it("modo HITO (el defecto): la respuesta no tiene `xp`", async () => {
    const { service, prisma } = montar();
    prisma.character.findFirst.mockResolvedValue(personaje({ xp: 1250, level: 3 }));
    prisma.campaign.findUnique.mockResolvedValue({ tableRules: {} });

    const res = await service.getSheet("p1", "c1", "ch1");

    expect(res).not.toHaveProperty("xp");
  });

  it("getSheet(): el jugador no recibe el entityId de una ficha del mundo que no ve", async () => {
    const { service, prisma, membership } = montar();
    prisma.character.findFirst.mockResolvedValue(personaje({ entityId: "e1" }));
    prisma.entity.findMany.mockResolvedValue([
      { id: "e1", visibility: "DM_ONLY", createdById: "dm", grants: [] },
    ]);
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });

    const hoja = await service.getSheet("pl", "c1", "ch1");

    expect(hoja.character.entityId).toBeNull();
  });
});
