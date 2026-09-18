import { Test } from "@nestjs/testing";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { Actividad, SrdSpell } from "@dnd/shared";
import {
  ActivitiesService,
  ACTIVITY_CATALOG,
  type ActividadCatalogada,
  type ActivityCatalog,
} from "./activities.service";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { CharacterSheetService } from "../characters/character-sheet.service";
import { RollRequestsService } from "../roll-requests/roll-requests.service";
import { EncountersService } from "../encounters/encounters.service";
import { ConditionsService } from "../character-state/conditions/conditions.service";
import { TemporaryModifiersService } from "../character-state/temporary-modifiers/temporary-modifiers.service";
import { SpellbookService } from "../spellbook/spellbook.service";
import { RollsService, DICE_ROLLER } from "../rolls/rolls.service";

// Tarea A7 (paso 2) — pegamento, no mecánica. Estas pruebas no comprueban una regla de D&D
// nueva: comprueban que `usar()` gasta lo que la actividad cuesta, aplica su efecto por las
// puertas que ya existen (`CharacterSheetService.changeHpFromEffect`,
// `RollRequestsService.createFromEffect`, `EncountersService.gastar`) y que ninguna de esas tres
// cosas se cuela con la mitad hecha.
//
// **`CharacterSheetService`, `RollRequestsService` y `EncountersService` van MOCKEADOS**, no
// instanciados de verdad: cada uno tiene su propia suite (`encounters.service.spec.ts`,
// `character-sheet.service.spec.ts`…) que ya prueba su propia mecánica. Aquí solo importa que
// `ActivitiesService` los llame con los argumentos correctos, en el orden correcto y —la lección
// de A2— con el `tx` de la MISMA transacción, comprobado por identidad y no por
// `expect.anything()`.
//
// Spec puerta de efectos §3 (tarea 1): desde que `usar` pasa por `changeHpFromEffect` y
// `createFromEffect`, el `tx` va PRIMERO — las dos puertas nuevas lo exigen como primer
// argumento, al revés que `changeHp`/`create`, que lo llevaban al final por ser opcional.

describe("ActivitiesService", () => {
  let service: ActivitiesService;

  // --- La base de datos de mentira, un poco de estado real para poder leer lo que quedó ------

  interface FilaCharacter {
    id: string;
    campaignId: string;
    ownerId: string;
    visibility: "PUBLIC" | "PLAYERS" | "SPECIFIC_PLAYERS" | "OWNER_DM" | "DM_ONLY";
    classKey: string | null;
    level: number;
    str: number | null;
    dex: number | null;
    con: number | null;
    int: number | null;
    wis: number | null;
    cha: number | null;
  }

  interface FilaRecurso {
    id: string;
    characterId: string;
    key: string;
    label: string;
    current: number;
    max: number | null;
  }

  interface FilaCombatiente {
    id: string;
    encounterId: string;
    characterId: string;
    activo: boolean;
    bonusUsed: boolean;
    actionUsed: boolean;
  }

  const campaignId = "camp1";
  let characters: Map<string, FilaCharacter>;
  let recursos: Map<string, FilaRecurso>;
  let combatientes: Map<string, FilaCombatiente>;
  let pgStore: Map<string, number>;
  let peticionesStore: { characterId: string; key: string; dc: number | null }[];

  // El objeto que `prisma.transaction` pasa a su callback, capturado para comprobar por
  // IDENTIDAD (no `expect.anything()`) que las puertas reciben ESE `tx` y no `prisma` a secas —
  // la lección exacta de A2, donde una prueba titulada "en la misma transacción" pasaba con
  // `this.prisma` en vez de `tx`.
  let ultimoTx: Record<string, unknown> | undefined;

  const prisma = {
    character: {
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    combatant: {
      findFirst: jest.fn(),
    },
    // T15 (3A.2) — `caso "encantar"` resuelve el `itemId` con esta puerta ANTES de abrir la
    // transacción (un objeto inválido no debe dejar el espacio ya gastado).
    inventoryItem: {
      findFirst: jest.fn(),
    },
    transaction: jest.fn(),
  };
  const membership = {
    requireMember: jest.fn(),
    requireDM: jest.fn(),
    getMembership: jest.fn(),
  };
  const events = { record: jest.fn() };
  // Task 5 (3A.2) — `sePuedeApuntar` (D-OP-11: canView o combatiente del encuentro activo) y
  // `resolverAtaqueContraCa` (la mecánica extraída de `resolveAttack`) van mockeados, igual que
  // el resto: cada uno tiene su propia suite en `character-sheet.service.spec.ts`.
  const characterSheet = {
    changeHpFromEffect: jest.fn(),
    getSheet: jest.fn(),
    sePuedeApuntar: jest.fn(),
    resolverAtaqueContraCa: jest.fn(),
  };
  const rollRequests = { createFromEffect: jest.fn() };
  const encounters = { gastar: jest.fn() };
  const conditions = { apply: jest.fn() };
  // T15 (3A.2) — `grantFromActivity` es la puerta de `caso "encantar"`, mockeada igual que el
  // resto: tiene su propia suite (`temporary-modifiers.service.spec.ts`).
  const temporaryModifiers = { grantFromActivity: jest.fn() };
  // Task 4 (3A.2) — `lanzable` decide si un conjuro se puede lanzar (`SpellbookService`), y
  // `roll` es la puerta que escribe el daño diferido en la bandeja del DM (`RollsService`). Los
  // dos van mockeados, igual que el resto: cada uno tiene su propia suite.
  const spellbook = { lanzable: jest.fn() };
  const rolls = { roll: jest.fn() };
  const roller = () => 5; // 1d8 → 5, siempre: el bono lo pone la característica, no el azar.

  // --- El catálogo de actividades de prueba (A9/A11 todavía no existen) -----------------------

  const rage: Actividad = {
    tipo: "utilidad",
    activation: { coste: "BONUS" },
    consumption: [{ recurso: "rage", cantidad: 1 }],
    duration: { unidad: "instantanea", concentracion: false },
    effects: [],
    description: "Entras en furia: ventaja en las pruebas y salvaciones de Fuerza.",
  };

  const bendicion: Actividad = {
    tipo: "utilidad",
    activation: { coste: "ACTION" },
    consumption: [{ recurso: "spell-slot-1", cantidad: 1 }],
    duration: { unidad: "minuto", valor: 1, concentracion: true },
    effects: [],
    description: "Hasta tres aliados suman 1d4 a sus ataques y salvaciones.",
  };

  const alientoDeFuego: Actividad = {
    tipo: "salvacion",
    activation: { coste: "ACTION" },
    consumption: [],
    duration: { unidad: "instantanea", concentracion: false },
    effects: [],
    description: "Un cono de fuego.",
    salvacion: { ability: "dex", cd: { tipo: "fijo", valor: 15 }, siSalva: "mitad" },
    dados: { n: 6, caras: 6, signo: -1, tipoDeDano: "FIRE" },
  };

  const curarHeridas: Actividad = {
    tipo: "dados",
    activation: { coste: "ACTION" },
    consumption: [],
    duration: { unidad: "instantanea", concentracion: false },
    effects: [],
    description: "Cura heridas al tacto.",
    dados: { n: 1, caras: 8, bonus: { tipo: "modificador", ability: "wis" }, signo: 1 },
  };

  /** I7 (vuelta de arreglo 1) — el guardián de `signo` que faltaba: solo curación tenía prueba. */
  const dardoDeFuego: Actividad = {
    tipo: "dados",
    activation: { coste: "ACTION" },
    consumption: [],
    duration: { unidad: "instantanea", concentracion: false },
    effects: [],
    description: "Un dardo de fuego.",
    dados: { n: 1, caras: 10, signo: -1, tipoDeDano: "FIRE" },
  };

  /**
   * I4 (vuelta de arreglo 1) — gasta un espacio de nivel 1 y su daño depende de
   * `{ tipo: "nivelDeEspacio" }`. Si el motor confiara en lo que declara el cliente, un
   * `nivelDeEspacio: 9` en la petición daría 9 de daño habiendo pagado un espacio de nivel 1.
   */
  const bolaDeFuego: Actividad = {
    tipo: "dados",
    activation: { coste: "ACTION" },
    consumption: [{ recurso: "spell-slot-1", cantidad: 1 }],
    duration: { unidad: "instantanea", concentracion: false },
    effects: [],
    description: "Una bola de fuego en miniatura.",
    dados: { bonus: { tipo: "nivelDeEspacio" }, signo: -1, tipoDeDano: "FIRE" },
  };

  /** Rage con un efecto de verdad, para probar que `effects[]` entra en la transacción. */
  const rageConEstado: Actividad = {
    tipo: "utilidad",
    activation: { coste: "BONUS" },
    consumption: [{ recurso: "rage", cantidad: 1 }],
    duration: { unidad: "instantanea", concentracion: false },
    effects: [{ key: "raging", note: "Furia del bárbaro" }],
    description: "Entras en furia y quedas marcado como enfurecido.",
  };

  // --- Task 4 (3A.2) — dos conjuros de prueba, para no depender del catálogo real generado ------
  //
  // `magicMissileDePrueba` copia la forma real de `magic-missile` (nivel 1, `dados` signo −1,
  // sin `target`): la actividad de prueba que ejercita «daño a otro va a la bandeja del DM»
  // (D-CF-128). `curarHeridasDeConjuro` es `cure-wounds`-shaped: nivel 1, `dados` signo 1 — sigue
  // yendo por `changeHpFromEffect`, la puerta de siempre, sin pasar por la bandeja.
  const proyectilMagicoActividad: Actividad = {
    tipo: "dados",
    activation: { coste: "ACTION" },
    consumption: [],
    duration: { unidad: "instantanea", concentracion: false },
    effects: [],
    description: "Tres dardos de fuerza centellante.",
    dados: { n: 1, caras: 4, bonus: { tipo: "fijo", valor: 1 }, signo: -1, tipoDeDano: "FORCE" },
  };
  const magicMissileDePrueba = {
    key: "magic-missile",
    level: 1,
    nameEs: "Proyectil mágico",
  } as SrdSpell;

  const curarHeridasActividadDeConjuro: Actividad = {
    tipo: "dados",
    activation: { coste: "ACTION" },
    consumption: [],
    duration: { unidad: "instantanea", concentracion: false },
    effects: [],
    description: "Cura heridas al tacto.",
    dados: { n: 1, caras: 8, bonus: { tipo: "modificador", ability: "wis" }, signo: 1 },
  };
  const cureWoundsDePrueba = { key: "cure-wounds", level: 1, nameEs: "Curar heridas" } as SrdSpell;

  const fireBoltDePrueba = { key: "fire-bolt", level: 0, nameEs: "Rayo de fuego" } as SrdSpell;
  const fireBoltActividad: Actividad = {
    tipo: "ataque",
    activation: { coste: "ACTION" },
    consumption: [],
    duration: { unidad: "instantanea", concentracion: false },
    effects: [],
    description: "Un rayo de fuego.",
    // `bono: { tipo: "fijo" }` y no `"ataqueDeConjuro"` a propósito: esta suite no deriva una hoja
    // real (`characterSheet.getSheet` está mockeado a `{ sheet: null }`), y un truco sin clase de
    // lanzamiento nunca llega a pedirle `attack.spell` al motor — usar `ataqueDeConjuro` aquí
    // solo probaría el mock, no `usar()`. Ese origen ya tiene su propia prueba en `engine.spec.ts`.
    ataque: { bono: { tipo: "fijo", valor: 5 } },
    dados: { n: 1, caras: 10, signo: -1, tipoDeDano: "FIRE" },
  };

  const sleepDePrueba = { key: "sleep", level: 1, nameEs: "Dormir" } as SrdSpell;
  const sleepActividad: Actividad = {
    tipo: "utilidad",
    activation: { coste: "ACTION" },
    consumption: [],
    duration: { unidad: "minuto", valor: 1, concentracion: false },
    effects: [],
    description: "Sume a las criaturas en un sueño mágico.",
  };

  // T15 (3A.2) — *Arma mágica*: nivel 2, `BONUS`, 1 hora de concentración (SRD 5.1 real).
  const magicWeaponDePrueba = {
    key: "magic-weapon",
    level: 2,
    nameEs: "Arma mágica",
    duration: { unidad: "hora", valor: 1, concentracion: true },
  } as SrdSpell;
  const magicWeaponActividad: Actividad = {
    tipo: "utilidad",
    activation: { coste: "BONUS" },
    consumption: [],
    duration: { unidad: "hora", valor: 1, concentracion: true },
    effects: [],
    description: "Tocas un arma no mágica. Se convierte en un arma mágica con un bonificador.",
  };

  const noEsSuyoDePrueba = { key: "no-es-suyo", level: 1, nameEs: "No es suyo" } as SrdSpell;
  const noEsSuyoActividad: Actividad = {
    tipo: "utilidad",
    activation: { coste: "ACTION" },
    consumption: [],
    duration: { unidad: "instantanea", concentracion: false },
    effects: [],
    description: "Un conjuro que este personaje nunca tuvo.",
  };

  const catalogo: ActivityCatalog = {
    find: (key: string): ActividadCatalogada | undefined =>
      (
        ({
          rage: { actividad: rage, name: "Furia", kind: "FEATURE" },
          bendicion: { actividad: bendicion, name: "Bendición", kind: "FEATURE" },
          "aliento-de-fuego": {
            actividad: alientoDeFuego,
            name: "Aliento de fuego",
            kind: "FEATURE",
          },
          "curar-heridas": { actividad: curarHeridas, name: "Curar heridas", kind: "FEATURE" },
          "dardo-de-fuego": { actividad: dardoDeFuego, name: "Dardo de fuego", kind: "FEATURE" },
          "bola-de-fuego": { actividad: bolaDeFuego, name: "Bola de fuego", kind: "FEATURE" },
          "rage-con-estado": { actividad: rageConEstado, name: "Furia", kind: "FEATURE" },
          "spell:magic-missile": {
            actividad: proyectilMagicoActividad,
            name: "Proyectil mágico",
            kind: "SPELL",
            spell: magicMissileDePrueba,
          },
          "spell:cure-wounds": {
            actividad: curarHeridasActividadDeConjuro,
            name: "Curar heridas",
            kind: "SPELL",
            spell: cureWoundsDePrueba,
          },
          "spell:fire-bolt": {
            actividad: fireBoltActividad,
            name: "Rayo de fuego",
            kind: "SPELL",
            spell: fireBoltDePrueba,
          },
          "spell:sleep": {
            actividad: sleepActividad,
            name: "Dormir",
            kind: "SPELL",
            spell: sleepDePrueba,
          },
          "spell:no-es-suyo": {
            actividad: noEsSuyoActividad,
            name: "No es suyo",
            kind: "SPELL",
            spell: noEsSuyoDePrueba,
          },
          "spell:magic-weapon": {
            actividad: magicWeaponActividad,
            name: "Arma mágica",
            kind: "SPELL",
            spell: magicWeaponDePrueba,
          },
        }) as const satisfies Record<string, ActividadCatalogada>
      )[key],
  };

  // --- Ids de la mesa de mentira ---------------------------------------------------------------

  const jugadoraId = "user-jugadora";
  const clerigoId = "user-clerigo";
  const dmId = "user-dm";

  const personajeId = "char-personaje";
  const personajeSinCombateId = "char-sin-combate";
  const clerigoPersonajeId = "char-clerigo";
  const magaId = "char-maga";
  const pnjId = "char-pnj";
  const ocultoId = "char-oculto";
  // I6/duda (a), vuelta de arreglo 1: de la propia jugadora, dueña distinta de la del clérigo —
  // la que de verdad hace falta para probar «un jugador cura al personaje de OTRO jugador».
  const magaAjenaId = "char-maga-ajena";

  function crearCharacter(fila: FilaCharacter) {
    characters.set(fila.id, fila);
  }

  function sembrarRecurso(
    characterId: string,
    key: string,
    current: number,
    /** `null` es «sin tope»: el vocabulario que el SRD escribe *Unlimited*. */
    max: number | null,
  ) {
    recursos.set(`${characterId}:${key}`, {
      id: `res-${characterId}-${key}`,
      characterId,
      key,
      label: key === "rage" ? "Furia" : key,
      current,
      max,
    });
  }

  function recurso(characterId: string, key: string) {
    return recursos.get(`${characterId}:${key}`);
  }

  function combatiente(characterId: string) {
    return [...combatientes.values()].find((c) => c.characterId === characterId);
  }

  function peticionesDe(characterId: string) {
    return peticionesStore.filter((p) => p.characterId === characterId);
  }

  function pg(characterId: string) {
    return pgStore.get(characterId) ?? 0;
  }

  beforeEach(async () => {
    characters = new Map();
    recursos = new Map();
    combatientes = new Map();
    pgStore = new Map();
    peticionesStore = [];
    ultimoTx = undefined;

    crearCharacter({
      id: personajeId,
      campaignId,
      ownerId: jugadoraId,
      visibility: "PLAYERS",
      classKey: null,
      level: 5,
      str: 16,
      dex: 12,
      con: 14,
      int: 10,
      wis: 10,
      cha: 10,
    });
    crearCharacter({
      id: personajeSinCombateId,
      campaignId,
      ownerId: jugadoraId,
      visibility: "PLAYERS",
      classKey: null,
      level: 5,
      str: 16,
      dex: 12,
      con: 14,
      int: 10,
      wis: 10,
      cha: 10,
    });
    // El clérigo es el dueño de su propio personaje Y de la maga (una mesa donde un jugador lleva
    // dos personajes): un caso de curación entre personajes del mismo dueño, además del caso de
    // dueños distintos que la puerta de efectos (tarea 1, spec §3) existe para permitir.
    crearCharacter({
      id: clerigoPersonajeId,
      campaignId,
      ownerId: clerigoId,
      visibility: "PLAYERS",
      classKey: null,
      level: 5,
      str: 10,
      dex: 10,
      con: 12,
      int: 10,
      wis: 16,
      cha: 10,
    });
    crearCharacter({
      id: magaId,
      campaignId,
      ownerId: clerigoId,
      visibility: "PLAYERS",
      classKey: null,
      level: 5,
      str: 8,
      dex: 14,
      con: 12,
      int: 16,
      wis: 10,
      cha: 10,
    });
    crearCharacter({
      id: pnjId,
      campaignId,
      ownerId: dmId,
      visibility: "PLAYERS",
      classKey: null,
      level: 8,
      str: 14,
      dex: 14,
      con: 14,
      int: 6,
      wis: 10,
      cha: 8,
    });
    crearCharacter({
      id: ocultoId,
      campaignId,
      ownerId: dmId,
      visibility: "DM_ONLY",
      classKey: null,
      level: 1,
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
    });
    // Dueña DISTINTA de la del clérigo — visible en la mesa (`PLAYERS`), pero no suya.
    crearCharacter({
      id: magaAjenaId,
      campaignId,
      ownerId: jugadoraId,
      visibility: "PLAYERS",
      classKey: null,
      level: 5,
      str: 8,
      dex: 14,
      con: 12,
      int: 16,
      wis: 10,
      cha: 10,
    });

    sembrarRecurso(personajeId, "rage", 2, 2);
    sembrarRecurso(personajeId, "spell-slot-1", 3, 3);
    sembrarRecurso(personajeId, "spell-slot-2", 2, 2);
    sembrarRecurso(clerigoPersonajeId, "spell-slot-1", 3, 3);
    sembrarRecurso(personajeSinCombateId, "rage", 2, 2);

    combatientes.set("comb-personaje", {
      id: "comb-personaje",
      encounterId: "enc1",
      characterId: personajeId,
      activo: true,
      bonusUsed: false,
      actionUsed: false,
    });

    prisma.character.findFirst.mockImplementation(
      async ({ where }: { where: { id: string; campaignId: string } }) => {
        const fila = characters.get(where.id);
        return fila && fila.campaignId === where.campaignId ? fila : null;
      },
    );
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    // T15 (3A.2) — una única espada de mentira, `"inv-espada"`, en la mochila EQUIPADA del
    // clérigo: la fila que `caso "encantar"` resuelve a partir de `itemId`.
    prisma.inventoryItem.findFirst.mockImplementation(
      async ({ where }: { where: { id: string } }) =>
        where.id === "inv-espada" ? { id: "inv-espada", characterId: clerigoPersonajeId } : null,
    );
    prisma.combatant.findFirst.mockImplementation(
      async ({ where }: { where: { characterId: string } }) => {
        const fila = [...combatientes.values()].find(
          (c) => c.characterId === where.characterId && c.activo,
        );
        return fila
          ? { id: fila.id, encounterId: fila.encounterId, encounter: { sessionId: "s1" } }
          : null;
      },
    );
    prisma.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        // **Ficha P2-6: la fila se lee BLOQUEADA, con SQL crudo**, porque `SELECT … FOR UPDATE` no
        // se puede expresar con el cliente de Prisma. Aquí el doble solo devuelve la misma fila
        // que devolvía `findUnique`: un mock no bloquea nada, y por eso la prueba de que el
        // candado actúa está en `test/usos-concurrentes.e2e-spec.ts` y no puede estar aquí.
        $queryRaw: jest.fn(async (_sql: TemplateStringsArray, characterId: string, key: string) => {
          const fila = recursos.get(`${characterId}:${key}`);
          return fila ? [fila] : [];
        }),
        characterResource: {
          update: jest.fn(
            async ({ where, data }: { where: { id: string }; data: { current: number } }) => {
              const fila = [...recursos.values()].find((r) => r.id === where.id);
              if (fila) fila.current = data.current;
              return fila;
            },
          ),
        },
      };
      ultimoTx = tx as unknown as Record<string, unknown>;
      return fn(tx);
    });

    membership.requireMember.mockResolvedValue(undefined);
    membership.requireDM.mockResolvedValue(undefined);
    membership.getMembership.mockImplementation(async (_campaignId: string, userId: string) => {
      if (userId === dmId) return { role: "DM" };
      if (userId === jugadoraId || userId === clerigoId) return { role: "PLAYER" };
      return null;
    });

    events.record.mockResolvedValue({ id: "ev1" });

    // **Puerta de efectos (tarea 1, spec §3) — el mock replica el cuerpo REAL de
    // `changeHpFromEffect`, que ya NO autoriza.** Hasta esta tarea, el mock reproducía la
    // autorización de `changeHp` (dueño-o-DM del objetivo) porque `usar()` llamaba a `changeHp` de
    // verdad y esa autorización rechazaba a un clérigo curando a otro jugador — el propio fallo
    // que esta tarea corrige. `changeHpFromEffect` confía en que `usar()` ya comprobó `canView`
    // sobre el objetivo y `requireOwnerOrDM` sobre el actor, así que el mock ya no repite ninguna
    // autorización — repetirla mentiría sobre la puerta real.
    characterSheet.changeHpFromEffect.mockImplementation(
      async (
        _tx: unknown,
        _actorUserId: string,
        _campaignId2: string,
        characterId: string,
        input: { delta: number },
      ) => {
        pgStore.set(characterId, pg(characterId) + input.delta);
        return { hp: { current: pg(characterId) } };
      },
    );
    characterSheet.getSheet.mockResolvedValue({ sheet: null });
    // Task 5 (3A.2) — por defecto, cualquier objetivo se puede apuntar y cualquier ataque de
    // conjuro impacta sin crítico; las pruebas del caso `ataque` lo sobreescriben.
    characterSheet.sePuedeApuntar.mockResolvedValue(true);
    characterSheet.resolverAtaqueContraCa.mockResolvedValue({
      roll: {
        revealed: true,
        eventId: "roll-ataque",
        expression: "1d20+5",
        audience: "PUBLIC" as const,
        rolls: [10],
        kept: [10],
        dropped: [],
        modifier: 5,
        total: 15,
        natural: "NONE" as const,
        outcome: "NO_DC" as const,
      },
      verdict: "HIT" as const,
      attackResolvedEventId: "attack-resolved-1",
    });

    // **Puerta de efectos (tarea 1, spec §3) — el mock replica el cuerpo REAL de
    // `createFromEffect`, sin `requireDM`.** Hasta esta tarea, el mock reproducía la autorización
    // de `create()` (solo el DM) porque `usar()` llamaba a `create()` de verdad; ahora llama a
    // `createFromEffect`, que no la exige — los `characterIds` ya pasaron `canView` en `usar()`.
    rollRequests.createFromEffect.mockImplementation(
      async (
        _tx: unknown,
        _actorUserId: string,
        _campaignId2: string,
        input: { characterIds: string[]; key: string; dc?: number },
      ) => {
        const creadas = input.characterIds.map((characterId) => ({
          characterId,
          key: input.key,
          dc: input.dc ?? null,
        }));
        peticionesStore.push(...creadas);
        return creadas;
      },
    );
    encounters.gastar.mockImplementation(
      async (
        _userId: string,
        _campaignId: string,
        _sessionId: string,
        _encounterId: string,
        combatantId: string,
        input: { coste: string },
      ) => {
        const fila = combatientes.get(combatantId);
        if (fila && input.coste === "BONUS") fila.bonusUsed = true;
        if (fila && input.coste === "ACTION") fila.actionUsed = true;
        return { economia: fila, excedido: false };
      },
    );
    conditions.apply.mockResolvedValue({ id: "cond1" });

    // Task 4 (3A.2) — por defecto cualquier conjuro «se puede lanzar»; las pruebas de
    // `NO_ES_SUYO`/`NO_PREPARADO` lo sobreescriben con `mockResolvedValueOnce`.
    spellbook.lanzable.mockResolvedValue({ ok: true });
    // `roll` responde con un `eventId` distinto cada vez, para que una actividad con varios
    // destinatarios deje varias tarjetas distinguibles (`rollEventIds`).
    let rollEventCounter = 0;
    rolls.roll.mockImplementation(async () => ({
      revealed: true,
      eventId: `roll-${++rollEventCounter}`,
      expression: "",
      audience: "PUBLIC" as const,
      rolls: [],
      kept: [],
      dropped: [],
      modifier: 0,
      total: 0,
      natural: "NONE" as const,
      outcome: "NO_DC" as const,
    }));

    const ref = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: GameEventsService, useValue: events },
        { provide: CharacterSheetService, useValue: characterSheet },
        { provide: RollRequestsService, useValue: rollRequests },
        { provide: EncountersService, useValue: encounters },
        { provide: ConditionsService, useValue: conditions },
        { provide: TemporaryModifiersService, useValue: temporaryModifiers },
        { provide: SpellbookService, useValue: spellbook },
        { provide: RollsService, useValue: rolls },
        { provide: ACTIVITY_CATALOG, useValue: catalogo },
        { provide: DICE_ROLLER, useValue: roller },
      ],
    }).compile();
    service = ref.get(ActivitiesService);
    jest.clearAllMocks();
    // `jest.clearAllMocks()` limpia también las implementaciones montadas arriba con
    // `mockImplementation`/`mockResolvedValue` en algunas versiones de jest — no en esta (solo
    // limpia `.mock.calls` y `.mock.results`), pero se reafirman los que SÍ hace falta leer en
    // cada prueba para no depender de ese detalle de versión.
    membership.requireMember.mockResolvedValue(undefined);
    membership.requireDM.mockResolvedValue(undefined);
    events.record.mockResolvedValue({ id: "ev1" });
    spellbook.lanzable.mockResolvedValue({ ok: true });
  });

  it("usar una actividad gasta su coste y su recurso, en la misma transacción", async () => {
    await service.usar(jugadoraId, campaignId, personajeId, "rage");

    expect(recurso(personajeId, "rage")?.current).toBe(1); // de 2
    expect(combatiente(personajeId)?.bonusUsed).toBe(true);
  });

  // **I3 (vuelta de arreglo 1).** La prueba de arriba comprueba el resultado final; esta
  // comprueba el CÓMO, con identidad y no con `expect.anything()`: el gasto del recurso, y su
  // suceso, viajan en el `tx` que abrió `usar()`, y ese suceso es de verdad un `RESOURCE_SPENT`.
  it("el gasto del recurso y su RESOURCE_SPENT viajan en el tx de usar(), no en this.prisma", async () => {
    await service.usar(jugadoraId, campaignId, personajeId, "rage");

    // `tx.characterResource.update` es del `ultimoTx` capturado, no una segunda instancia.
    const clienteDeLaTransaccion = ultimoTx as unknown as {
      characterResource: { update: jest.Mock };
    };
    expect(clienteDeLaTransaccion.characterResource.update).toHaveBeenCalledWith({
      where: { id: "res-char-personaje-rage" },
      data: { current: 1 },
    });

    // Task 4 (3A.2) — dos sucesos ahora: `RESOURCE_SPENT` y, tras él, `ACTIVITY_USED` (toda
    // actividad usada deja línea, no solo las que tienen `effects`).
    expect(events.record).toHaveBeenCalledTimes(2);
    const [, , sucesoInput, txDelSuceso] = events.record.mock.calls[0];
    expect(txDelSuceso).toBe(ultimoTx);
    expect(sucesoInput.payload.type).toBe("RESOURCE_SPENT");
    expect(sucesoInput.payload.key).toBe("rage");

    const [, , sucesoActivityUsed, txDelSegundoSuceso] = events.record.mock.calls[1];
    expect(txDelSegundoSuceso).toBe(ultimoTx);
    expect(sucesoActivityUsed.payload).toMatchObject({
      type: "ACTIVITY_USED",
      actividadKey: "rage",
      name: "Furia",
      kind: "FEATURE",
    });
  });

  it("sin usos, avisa y NO gasta la acción adicional", async () => {
    const rec = recurso(personajeId, "rage")!;
    rec.current = 0;

    const r = await service.usar(jugadoraId, campaignId, personajeId, "rage");

    expect(r.aviso).toMatch(/sin usos/i);
    expect(combatiente(personajeId)?.bonusUsed).toBe(false);
    expect(encounters.gastar).not.toHaveBeenCalled();
  });

  // **Ficha A11-usos-sin-tope — «sin tope» tiene que significar algo para quien gasta.**
  //
  // `consumir()` comparaba `recurso.current < item.cantidad` sin mirar `max` en ningún momento,
  // así que un recurso declarado *Unlimited* por el SRD (`max: null` — la Furia a partir de nivel
  // 20) se gastaba de un contador finito como cualquier otro, y se acababa. El marcador que
  // `seedResourcesFor` siembra en `current` es una cota práctica **mientras** el `null` no se
  // entienda; entenderlo es esto.
  it("con `max: null`, usar la actividad NO descuenta nada", async () => {
    const rec = recurso(personajeId, "rage")!;
    rec.max = null;
    rec.current = 1;

    const r = await service.usar(jugadoraId, campaignId, personajeId, "rage");

    expect(r.aviso).toBeUndefined();
    expect(recurso(personajeId, "rage")?.current).toBe(1);
  });

  it("y con `max: null` a cero tampoco se queda sin usos: no hay contador contra el que comparar", async () => {
    const rec = recurso(personajeId, "rage")!;
    rec.max = null;
    rec.current = 0;

    const r = await service.usar(jugadoraId, campaignId, personajeId, "rage");

    expect(r.aviso).toBeUndefined();
    expect(combatiente(personajeId)?.bonusUsed).toBe(true);
  });

  it("una actividad de salvación crea la petición de tirada con su CD", async () => {
    const r = await service.usar(dmId, campaignId, pnjId, "aliento-de-fuego", {
      objetivos: [magaId],
    });

    const [peticion] = peticionesDe(magaId);
    expect(peticion.dc).toBe(r.cd);
    expect(peticion.key).toBe("save.dex");
    expect(r.cd).toBe(15);
    // Menor: `dc` es justo el dato que esta tarea añade a `create()` — se fija explícitamente,
    // no solo se infiere de `r.cd`. `input` es el cuarto argumento de `createFromEffect`
    // (`tx`, `actorUserId`, `campaignId`, `input`).
    expect(rollRequests.createFromEffect.mock.calls[0][3]).toMatchObject({
      dc: 15,
      key: "save.dex",
    });
  });

  // Puerta de efectos §4.2 (tarea 2) — el I5 de la vuelta de arreglo 1 quedó cerrado: el daño de
  // una salvación con `dados` se tira UNA vez aquí (SRD 5.1, *Damage Rolls*: «roll the damage
  // once for all of them») y viaja en `pendingEffect` hasta que cada objetivo responda su
  // petición (`RollRequestsService.answer`). Ya no hay nada que avisar.
  it("una salvación con dados tira el daño UNA vez y lo manda como pendingEffect, sin aviso", async () => {
    const r = await service.usar(dmId, campaignId, pnjId, "aliento-de-fuego", {
      objetivos: [magaId],
    });

    expect(r.aviso).toBeUndefined();
    // `aliento-de-fuego` tira `6d6` con el tirador fijo de la suite (`roller = () => 5`):
    // 6 × 5 = 30.
    expect(rollRequests.createFromEffect.mock.calls[0][3]).toMatchObject({
      pendingEffect: {
        amount: 30,
        signo: -1,
        tipoDeDano: "FIRE",
        siSalva: "mitad",
        actividadKey: "aliento-de-fuego",
        actorCharacterId: pnjId,
      },
    });
    // La traza de la respuesta trae los pasos del dado, aunque el daño no se aplique aquí.
    expect(r.traza).toBeDefined();
    expect(r.traza!.length).toBeGreaterThan(0);
  });

  it("una actividad de dados con signo positivo CURA, por la puerta de siempre", async () => {
    const antes = pg(magaId);
    await service.usar(clerigoId, campaignId, clerigoPersonajeId, "curar-heridas", {
      objetivos: [magaId],
    });

    expect(pg(magaId)).toBeGreaterThan(antes);
  });

  // **I1 (vuelta de arreglo 1) — el orden de candados con varios objetivos.** Los dos personajes
  // pertenecen al mismo dueño (clérigo), así que la única variable que cambia aquí es el orden en
  // que el CLIENTE los mandó. `"char-clerigo" < "char-maga"` alfabéticamente: si `usar()`
  // respetara el orden del cliente, mandar `[magaId, clerigoPersonajeId]` llamaría a `changeHp`
  // primero con `magaId`. Con el orden fijo por `id`, siempre es al revés — el mismo orden pase
  // lo que pase en la petición, que es justo lo que evita el interbloqueo entre dos peticiones
  // concurrentes con los mismos objetivos en orden inverso.
  it("con varios objetivos, changeHpFromEffect se llama en un orden fijo por id — no en el orden del cliente", async () => {
    await service.usar(clerigoId, campaignId, clerigoPersonajeId, "curar-heridas", {
      objetivos: [magaId, clerigoPersonajeId], // orden invertido a propósito
    });

    // `targetCharacterId` es el cuarto argumento de `changeHpFromEffect` (`tx`, `actorUserId`,
    // `campaignId`, `targetCharacterId`, `input`).
    expect(characterSheet.changeHpFromEffect).toHaveBeenCalledTimes(2);
    expect(characterSheet.changeHpFromEffect.mock.calls[0][3]).toBe(clerigoPersonajeId);
    expect(characterSheet.changeHpFromEffect.mock.calls[1][3]).toBe(magaId);
  });

  // **I7 (vuelta de arreglo 1) — el guardián de `signo` que faltaba.** La única prueba de
  // `dados` era de curación (`signo: 1`); con `delta = total` en vez de `signo * total` esa
  // prueba seguía en verde. Esta la ata: `signo: -1` sobre el PROPIO actor tiene que DAÑAR (no
  // pasa por la bandeja del DM: D-CF-128 solo desvía el daño hacia OTRO personaje).
  it("una actividad de dados con signo negativo sobre uno mismo DAÑA, no cura (guardián de signo)", async () => {
    const antes = pg(pnjId);
    await service.usar(dmId, campaignId, pnjId, "dardo-de-fuego");

    expect(pg(pnjId)).toBeLessThan(antes);
    expect(rolls.roll).not.toHaveBeenCalled();
  });

  // Task 4 (3A.2), D-CF-128 — el daño directo de una actividad `dados` (signo −1) sobre OTRO
  // personaje ya no pasa por `changeHpFromEffect`: va a la bandeja del DM, como `pendingDamage`
  // de un `ABILITY_ROLL`. SRD 5.1, *Damage Rolls*: «roll the damage once for all of them».
  it("una actividad de dados con signo negativo sobre OTRO personaje va a la bandeja del DM, no a sus PG", async () => {
    const antes = pg(magaId);
    const r = await service.usar(dmId, campaignId, pnjId, "dardo-de-fuego", {
      objetivos: [magaId],
    });

    expect(pg(magaId)).toBe(antes);
    expect(characterSheet.changeHpFromEffect).not.toHaveBeenCalled();
    expect(rolls.roll).toHaveBeenCalledTimes(1);
    const [, , peticion, interno] = rolls.roll.mock.calls[0];
    expect(peticion.characterId).toBe(pnjId);
    expect(interno.pendingDamage).toMatchObject({
      targetCharacterId: magaId,
      damageType: "FIRE",
      reason: "Actividad: Dardo de fuego",
    });
    expect(interno.resultadoFijo).toBeDefined();
    expect(r.rollEventIds).toEqual(["roll-1"]);
  });

  it("un jugador no usa la actividad del personaje de otro (403)", async () => {
    await expect(service.usar(jugadoraId, campaignId, clerigoPersonajeId, "rage")).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("un objetivo que no se puede ver es un 404, no un 403", async () => {
    await expect(
      service.usar(jugadoraId, campaignId, personajeId, "curar-heridas", {
        objetivos: [ocultoId],
      }),
    ).rejects.toThrow(NotFoundException);
  });

  // **Puerta de efectos (tarea 1, spec §3) — el fallo que esta tarea corrige.** Hasta esta
  // tarea, esta misma prueba se llamaba «HOY, un jugador NO puede curar al personaje de OTRO
  // jugador con una actividad (403) — ficha I6/(a)» y esperaba `ForbiddenException`: `usar()`
  // llamaba a `changeHp`, que exige dueño-o-DM del OBJETIVO, así que un clérigo no podía curar a
  // la maga de otro jugador aunque `usar()` ya hubiera comprobado que la ve (`canView`) y que
  // puede usar SU actividad (`requireOwnerOrDM` sobre el actor). Con `changeHpFromEffect` —que
  // no repite esa autorización— la curación entre jugadores distintos ya funciona, que es
  // justamente lo que la spec de la puerta de efectos exige.
  it("un jugador SÍ puede curar al personaje de OTRO jugador con una actividad — puerta de efectos, tarea 1", async () => {
    const antes = pg(magaAjenaId);

    await service.usar(clerigoId, campaignId, clerigoPersonajeId, "curar-heridas", {
      objetivos: [magaAjenaId],
    });

    expect(pg(magaAjenaId)).toBeGreaterThan(antes);
  });

  it("una actividad que gasta un espacio de conjuro lo descuenta del recurso que le corresponde", async () => {
    await service.usar(jugadoraId, campaignId, personajeId, "bendicion");

    expect(recurso(personajeId, "spell-slot-1")?.current).toBe(2); // de 3
  });

  // **I4 (vuelta de arreglo 1) — el nivel del espacio es el que se PAGÓ, no el que declaró el
  // cliente.** `bola-de-fuego` gasta un espacio de nivel 1 y su daño es exactamente
  // `nivelDeEspacio`. Si el motor confiara en `opciones.nivelDeEspacio`, mandar «9» habría hecho
  // 9 de daño pagando un espacio de nivel 1.
  it("nivelDeEspacio se deriva de lo que se gastó de verdad, no de lo que declara el cliente", async () => {
    await service.usar(jugadoraId, campaignId, personajeId, "bola-de-fuego", {
      nivelDeEspacio: 9, // mentira: solo hay espacios de nivel 1 sembrados
    });

    // Un espacio de nivel 1 → 1 de daño, no 9. Sin objetivos, el destinatario es el propio actor.
    expect(pg(personajeId)).toBe(-1);
  });

  it("fuera de combate, usar una actividad con coste BONUS no revienta", async () => {
    await expect(
      service.usar(jugadoraId, campaignId, personajeSinCombateId, "rage"),
    ).resolves.not.toThrow();
    // Y no hay combatiente que marcar: no se llama a la puerta de la economía del turno.
    expect(encounters.gastar).not.toHaveBeenCalled();
  });

  // **Vuelta de arreglo 1 — `effects[]` entra en la transacción.** La primera versión de esta
  // tarea no aplicaba ningún efecto: `rage` solo quemaba el recurso. A11 necesita justo esto —
  // el bárbaro entra en furia y aparece su estado.
  it("effects[] se aplica en la misma transacción que el consumo del recurso", async () => {
    await service.usar(jugadoraId, campaignId, personajeId, "rage-con-estado");

    // **`concedidoPorActividad: true`, ronda de arreglo 1 (crítico 2).** `raging` se volvió
    // clave reservada (`esClaveReservada`, `@dnd/shared`), así que sin este cuarto argumento
    // `ConditionsService.apply` real exigiría DM — y quien está usando su propia Furia aquí es
    // la jugadora, no el DM. Se pasa `true` porque el destino es ella misma (`personajeId`, el
    // mismo id que usa la actividad): nunca viajaría así hacia un objetivo distinto.
    expect(conditions.apply).toHaveBeenCalledWith(
      jugadoraId,
      campaignId,
      personajeId,
      { key: "raging", note: "Furia del bárbaro" },
      ultimoTx,
      { concedidoPorActividad: true },
    );
  });

  // Ronda de arreglo 2 — la propia barrera de `concedidoPorActividad` no tenía prueba. Sin ella,
  // `destino.id === actor.id` se podía volver `true` a secas —la mutación de la re-revisión lo
  // demostró: 1716/1716 en verde con el acotamiento borrado— y quedar sujeto solo a que
  // `ConditionsService.apply` vuelva a comprobar `requireOwnerOrDM` sobre el destino, que es una
  // comprobación de OTRO fichero. `jugadoraId` es dueña de `personajeId` **y** de `magaAjenaId`
  // (fixture ya declarada arriba, "dueña DISTINTA de la del clérigo" — de ambos hay que leer que
  // es distinta de la del clérigo, no de la jugadora): el caso exacto que el ruling señala, un
  // usuario con dos personajes usando una actividad propia contra su OTRO personaje.
  it("effects[] hacia un objetivo que NO es quien usa la actividad viaja con `concedidoPorActividad: false`, aunque sea la MISMA jugadora", async () => {
    await service.usar(jugadoraId, campaignId, personajeId, "rage-con-estado", {
      objetivos: [magaAjenaId],
    });

    expect(conditions.apply).toHaveBeenCalledWith(
      jugadoraId,
      campaignId,
      magaAjenaId,
      { key: "raging", note: "Furia del bárbaro" },
      ultimoTx,
      { concedidoPorActividad: false },
    );
  });

  it("aplicar el efecto SÍ gasta el recurso: si el efecto fallara, la mutación se vería en el recurso, no en un booleano", async () => {
    conditions.apply.mockRejectedValueOnce(new Error("inmunidad, o cualquier otro 400 de apply"));

    await expect(
      service.usar(jugadoraId, campaignId, personajeId, "rage-con-estado"),
    ).rejects.toThrow("inmunidad");

    // Como sigue en la MISMA transacción, un fallo de `conditions.apply` revierte también el
    // consumo — la garantía completa la impone Postgres al deshacer el `tx`, y este spec no
    // simula un rollback real (ver el informe, "mutación del encargo"); lo que sí es cierto sin
    // reservas es que `usar()` propaga el fallo en vez de tragárselo.
  });

  // **La lección de A2, aplicada aquí.** `rollRequests.createFromEffect` y
  // `characterSheet.changeHpFromEffect` no solo se llaman: se llaman con el `tx` que la propia
  // transacción de `usar()` abrió, comparado por identidad. `expect.anything()` habría dejado
  // pasar `this.prisma` a secas. Con las dos puertas nuevas, `tx` es el PRIMER argumento (índice
  // 0), al revés que `create`/`changeHp`, que lo llevaban al final por ser opcional.
  it("la salvación y la curación usan el MISMO tx que abrió la transacción de usar()", async () => {
    await service.usar(dmId, campaignId, pnjId, "aliento-de-fuego", { objetivos: [magaId] });
    expect(rollRequests.createFromEffect.mock.calls[0][0]).toBe(ultimoTx);

    await service.usar(clerigoId, campaignId, clerigoPersonajeId, "curar-heridas", {
      objetivos: [magaId],
    });
    expect(characterSheet.changeHpFromEffect.mock.calls[0][0]).toBe(ultimoTx);
  });

  // Task 4 (3A.2) — lanzar un conjuro por `usar()`: espacio por nivel, T18, la bandeja del DM
  // para el daño directo a otro, y `ACTIVITY_USED` con `kind: "SPELL"`.
  describe("lanzar un conjuro (spell:<key>)", () => {
    it("magic-missile contra un objetivo: ACTIVITY_USED, sin changeHpFromEffect, daño a la bandeja del DM", async () => {
      const r = await service.usar(jugadoraId, campaignId, personajeId, "spell:magic-missile", {
        objetivos: [magaId],
      });

      expect(characterSheet.changeHpFromEffect).not.toHaveBeenCalled();
      expect(rolls.roll).toHaveBeenCalledTimes(1);
      const [, , peticion, interno] = rolls.roll.mock.calls[0];
      expect(peticion.characterId).toBe(personajeId);
      expect(interno.pendingDamage).toMatchObject({
        targetCharacterId: magaId,
        damageType: "FORCE",
        reason: "Conjuro: Proyectil mágico",
      });
      expect(r.rollEventIds).toEqual(["roll-1"]);

      // El espacio de nivel 1 se gastó (3 → 2), y el evento ACTIVITY_USED quedó escrito.
      expect(recurso(personajeId, "spell-slot-1")?.current).toBe(2);
      const eventoActividad = events.record.mock.calls.find(
        (llamada) => llamada[2].payload.type === "ACTIVITY_USED",
      )!;
      expect(eventoActividad[2].payload).toMatchObject({
        actividadKey: "spell:magic-missile",
        name: "Proyectil mágico",
        kind: "SPELL",
        spellLevel: 1,
        nivelDeEspacio: 1,
        targetCharacterIds: [magaId],
      });
    });

    it("magic-missile con nivelDeEspacio: 2 consume spell-slot-2, y ACTIVITY_USED lo refleja", async () => {
      await service.usar(jugadoraId, campaignId, personajeId, "spell:magic-missile", {
        objetivos: [magaId],
        nivelDeEspacio: 2,
      });

      expect(recurso(personajeId, "spell-slot-1")?.current).toBe(3); // intacto
      expect(recurso(personajeId, "spell-slot-2")?.current).toBe(1); // de 2
      const eventoActividad = events.record.mock.calls.find(
        (llamada) => llamada[2].payload.type === "ACTIVITY_USED",
      )!;
      expect(eventoActividad[2].payload).toMatchObject({ nivelDeEspacio: 2 });
    });

    it("cure-wounds sobre otro personaje SÍ cura por changeHpFromEffect (curación, no bandeja)", async () => {
      const antes = pg(magaId);
      await service.usar(clerigoId, campaignId, clerigoPersonajeId, "spell:cure-wounds", {
        objetivos: [magaId],
      });

      expect(pg(magaId)).toBeGreaterThan(antes);
      expect(rolls.roll).not.toHaveBeenCalled();
    });

    it("fire-bolt (truco, nivel 0) no consume ningún recurso", async () => {
      const r = await service.usar(jugadoraId, campaignId, personajeId, "spell:fire-bolt");

      expect(recurso(personajeId, "spell-slot-1")?.current).toBe(3);
      expect(recurso(personajeId, "spell-slot-2")?.current).toBe(2);
      expect(r.traza).toBeDefined();
    });

    it("un conjuro que `lanzable` dice NO_ES_SUYO es un 400", async () => {
      spellbook.lanzable.mockResolvedValueOnce({ ok: false, motivo: "NO_ES_SUYO" });

      await expect(
        service.usar(jugadoraId, campaignId, personajeId, "spell:no-es-suyo"),
      ).rejects.toThrow(BadRequestException);
    });

    it("un conjuro NO_PREPARADO se lanza igual, con fueraDeRegla", async () => {
      spellbook.lanzable.mockResolvedValueOnce({ ok: false, motivo: "NO_PREPARADO" });

      const r = await service.usar(jugadoraId, campaignId, personajeId, "spell:sleep");

      expect(r.fueraDeRegla).toEqual(["NO_PREPARADO"]);
      const eventoActividad = events.record.mock.calls.find(
        (llamada) => llamada[2].payload.type === "ACTIVITY_USED",
      )!;
      expect(eventoActividad[2].payload.fueraDeRegla).toEqual(["NO_PREPARADO"]);
    });
  });

  // Task 5 (3A.2, T19) — el caso `ataque`: `fire-bolt` contra un objetivo pide la MISMA mecánica
  // que un arma equipada (`resolverAtaqueContraCa`, extraída de `resolveAttack`), en vez de
  // quedarse solo con el bono resuelto sin comparar contra nada.
  describe("el caso `ataque` — fire-bolt contra un objetivo (Task 5, 3A.2, T19)", () => {
    it("con un objetivo, sePuedeApuntar se comprueba y resolverAtaqueContraCa se llama con el bono resuelto y la etiqueta de conjuro", async () => {
      const r = await service.usar(jugadoraId, campaignId, personajeId, "spell:fire-bolt", {
        objetivos: [pnjId],
      });

      expect(characterSheet.sePuedeApuntar).toHaveBeenCalledWith(
        jugadoraId,
        campaignId,
        expect.objectContaining({ id: pnjId }),
      );
      expect(characterSheet.resolverAtaqueContraCa).toHaveBeenCalledWith(
        jugadoraId,
        campaignId,
        expect.objectContaining({ id: personajeId }),
        expect.objectContaining({ id: pnjId }),
        expect.objectContaining({
          bono: 5, // fireBoltActividad.ataque.bono: { tipo: "fijo", valor: 5 }
          label: "Ataque de conjuro: Rayo de fuego",
          attackName: "Rayo de fuego",
        }),
      );
      expect(r.verdict).toBe("HIT");
    });

    it("con verdict HIT, tira el daño escalado a la bandeja del DM con pendingDamage.attackResolvedEventId", async () => {
      const r = await service.usar(jugadoraId, campaignId, personajeId, "spell:fire-bolt", {
        objetivos: [pnjId],
      });

      expect(rolls.roll).toHaveBeenCalledWith(
        jugadoraId,
        campaignId,
        expect.objectContaining({ expression: "1d10", characterId: personajeId }),
        {
          pendingDamage: {
            targetCharacterId: pnjId,
            damageType: "FIRE",
            reason: "Conjuro: Rayo de fuego",
            attackResolvedEventId: "attack-resolved-1",
          },
        },
      );
      expect(r.rollEventIds).toEqual(["roll-1"]);
    });

    it("con verdict CRITICAL, dobla los DADOS del daño (nunca el bono ni las caras)", async () => {
      characterSheet.resolverAtaqueContraCa.mockResolvedValueOnce({
        roll: { revealed: true, eventId: "roll-critico" },
        verdict: "CRITICAL",
        attackResolvedEventId: "attack-resolved-critico",
      });

      await service.usar(jugadoraId, campaignId, personajeId, "spell:fire-bolt", {
        objetivos: [pnjId],
      });

      expect(rolls.roll).toHaveBeenCalledWith(
        jugadoraId,
        campaignId,
        expect.objectContaining({ expression: "2d10" }),
        expect.objectContaining({
          pendingDamage: expect.objectContaining({
            attackResolvedEventId: "attack-resolved-critico",
          }),
        }),
      );
    });

    it("con verdict MISS, no tira ningún daño", async () => {
      characterSheet.resolverAtaqueContraCa.mockResolvedValueOnce({
        roll: { revealed: true, eventId: "roll-fallo" },
        verdict: "MISS",
      });

      const r = await service.usar(jugadoraId, campaignId, personajeId, "spell:fire-bolt", {
        objetivos: [pnjId],
      });

      expect(rolls.roll).not.toHaveBeenCalled();
      expect(r.verdict).toBe("MISS");
      expect(r.rollEventIds).toBeUndefined();
    });

    it("sin objetivo, solo la traza del bono — como hoy, resolverAtaqueContraCa no se llama", async () => {
      const r = await service.usar(jugadoraId, campaignId, personajeId, "spell:fire-bolt");

      expect(characterSheet.resolverAtaqueContraCa).not.toHaveBeenCalled();
      expect(rolls.roll).not.toHaveBeenCalled();
      expect(r.verdict).toBeUndefined();
      expect(r.traza).toBeDefined();
    });

    it("un ataque contra uno mismo es 400, como en resolveAttack", async () => {
      await expect(
        service.usar(jugadoraId, campaignId, personajeId, "spell:fire-bolt", {
          objetivos: [personajeId],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(characterSheet.resolverAtaqueContraCa).not.toHaveBeenCalled();
    });

    it("con más de un objetivo en una actividad `ataque`, es 400: «un ataque tiene un objetivo»", async () => {
      await expect(
        service.usar(jugadoraId, campaignId, personajeId, "spell:fire-bolt", {
          objetivos: [pnjId, magaId],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(characterSheet.sePuedeApuntar).not.toHaveBeenCalled();
    });

    it("un objetivo al que no se puede apuntar (sePuedeApuntar: false) es 404", async () => {
      characterSheet.sePuedeApuntar.mockResolvedValueOnce(false);

      await expect(
        service.usar(jugadoraId, campaignId, personajeId, "spell:fire-bolt", {
          objetivos: [ocultoId],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("sePuedeApuntar se comprueba ANTES de consumir el espacio de conjuro", async () => {
      characterSheet.sePuedeApuntar.mockResolvedValueOnce(false);

      await expect(
        service.usar(jugadoraId, campaignId, personajeId, "spell:fire-bolt", {
          objetivos: [ocultoId],
        }),
      ).rejects.toThrow(NotFoundException);

      // fire-bolt no gasta recurso, así que el mejor testigo de «no se abrió la transacción de
      // consumo» es que `events.record` (RESOURCE_SPENT/ACTIVITY_USED) nunca se llamó.
      expect(events.record).not.toHaveBeenCalled();
    });
  });

  // T15 (3A.2) — `caso "encantar"`: la maga (`personajeId`, dueña `jugadoraId`) encanta la
  // espada del clérigo (`clerigoPersonajeId`, dueño `clerigoId`, visible PLAYERS) — un
  // encantamiento entre dos personajes de dos jugadores distintos, el caso real de mesa.
  describe("el caso `encantar` — magic-weapon sobre un arma del inventario (T15, 3A.2)", () => {
    it("con nivelDeEspacio 2 (base): +1 a weaponAttack y weaponDamage, gasta spell-slot-2, concentración en quien lanza", async () => {
      await service.usar(jugadoraId, campaignId, personajeId, "spell:magic-weapon", {
        itemId: "inv-espada",
      });

      expect(recurso(personajeId, "spell-slot-2")?.current).toBe(1); // de 2

      // Dos filas: weaponAttack y weaponDamage, las dos sobre el DUEÑO DEL ARMA (el clérigo), con
      // `inventoryItemId` puesto y 3600 segundos (1 hora) de duración.
      expect(temporaryModifiers.grantFromActivity).toHaveBeenCalledWith(
        expect.anything(),
        campaignId,
        clerigoPersonajeId,
        jugadoraId,
        expect.objectContaining({
          target: "item.weaponAttack",
          amount: 1,
          reason: "Arma mágica",
          inventoryItemId: "inv-espada",
          durationSeconds: 3600,
        }),
      );
      expect(temporaryModifiers.grantFromActivity).toHaveBeenCalledWith(
        expect.anything(),
        campaignId,
        clerigoPersonajeId,
        jugadoraId,
        expect.objectContaining({ target: "item.weaponDamage", amount: 1 }),
      );

      // La concentración es de QUIEN LANZA (`personajeId`), no de quien lleva el arma.
      expect(conditions.apply).toHaveBeenCalledWith(
        jugadoraId,
        campaignId,
        personajeId,
        expect.objectContaining({ key: "concentrating-magic-weapon", durationSeconds: 3600 }),
        expect.anything(),
        { concedidoPorActividad: true },
      );
    });

    it("con nivelDeEspacio 4: el bono sube a +2 (SRD, Higher Levels)", async () => {
      sembrarRecurso(personajeId, "spell-slot-4", 1, 1);

      await service.usar(jugadoraId, campaignId, personajeId, "spell:magic-weapon", {
        itemId: "inv-espada",
        nivelDeEspacio: 4,
      });

      expect(temporaryModifiers.grantFromActivity).toHaveBeenCalledWith(
        expect.anything(),
        campaignId,
        clerigoPersonajeId,
        jugadoraId,
        expect.objectContaining({ target: "item.weaponAttack", amount: 2 }),
      );
    });

    it("sin itemId, 400 y no gasta el espacio", async () => {
      await expect(
        service.usar(jugadoraId, campaignId, personajeId, "spell:magic-weapon", {}),
      ).rejects.toThrow(BadRequestException);
      expect(recurso(personajeId, "spell-slot-2")?.current).toBe(2); // sin tocar
      expect(temporaryModifiers.grantFromActivity).not.toHaveBeenCalled();
    });

    it("un itemId que no existe, 404, y no gasta el espacio", async () => {
      await expect(
        service.usar(jugadoraId, campaignId, personajeId, "spell:magic-weapon", {
          itemId: "inv-inexistente",
        }),
      ).rejects.toThrow(NotFoundException);
      expect(recurso(personajeId, "spell-slot-2")?.current).toBe(2);
    });
  });
});
