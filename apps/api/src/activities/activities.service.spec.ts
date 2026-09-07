import { Test } from "@nestjs/testing";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { Actividad } from "@dnd/shared";
import { ActivitiesService, ACTIVITY_CATALOG, type ActivityCatalog } from "./activities.service";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { CharacterSheetService } from "../characters/character-sheet.service";
import { RollRequestsService } from "../roll-requests/roll-requests.service";
import { EncountersService } from "../encounters/encounters.service";
import { ConditionsService } from "../character-state/conditions/conditions.service";
import { DICE_ROLLER } from "../rolls/rolls.service";

// Tarea A7 (paso 2) — pegamento, no mecánica. Estas pruebas no comprueban una regla de D&D
// nueva: comprueban que `usar()` gasta lo que la actividad cuesta, aplica su efecto por las
// puertas que ya existen (`CharacterSheetService.changeHp`, `RollRequestsService.create`,
// `EncountersService.gastar`) y que ninguna de esas tres cosas se cuela con la mitad hecha.
//
// **`CharacterSheetService`, `RollRequestsService` y `EncountersService` van MOCKEADOS**, no
// instanciados de verdad: cada uno tiene su propia suite (`encounters.service.spec.ts`,
// `character-sheet.service.spec.ts`…) que ya prueba su propia mecánica. Aquí solo importa que
// `ActivitiesService` los llame con los argumentos correctos, en el orden correcto y —la lección
// de A2— con el `tx` de la MISMA transacción, comprobado por identidad y no por
// `expect.anything()`.

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
    transaction: jest.fn(),
  };
  const membership = {
    requireMember: jest.fn(),
    requireDM: jest.fn(),
    getMembership: jest.fn(),
  };
  const events = { record: jest.fn() };
  const characterSheet = { changeHp: jest.fn(), getSheet: jest.fn() };
  const rollRequests = { create: jest.fn() };
  const encounters = { gastar: jest.fn() };
  const conditions = { apply: jest.fn() };
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

  const catalogo: ActivityCatalog = {
    find: (key: string) =>
      ({
        rage,
        bendicion,
        "aliento-de-fuego": alientoDeFuego,
        "curar-heridas": curarHeridas,
        "dardo-de-fuego": dardoDeFuego,
        "bola-de-fuego": bolaDeFuego,
        "rage-con-estado": rageConEstado,
      })[key],
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
    // dos personajes): así `changeHp` — que exige dueño-o-DM del OBJETIVO, y esa autorización no
    // se toca en esta tarea — autoriza legítimamente curar a un aliado sin inventar una puerta
    // nueva de "quién puede curar a quién por una actividad".
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

    // **Duda (a)/I6 (vuelta de arreglo 1) — el mock replica la autorización REAL de `changeHp`:
    // dueño-o-DM del OBJETIVO.** Sin esto, la prueba «un jugador no puede curar al personaje de
    // otro jugador» no podría demostrar el 403 que hoy sufre de verdad — estaría probando una
    // puerta más permisiva que la real.
    characterSheet.changeHp.mockImplementation(
      async (
        userId: string,
        campaignId2: string,
        characterId: string,
        input: { delta: number },
      ) => {
        const objetivo = characters.get(characterId);
        const miembro = await membership.getMembership(campaignId2, userId);
        if (objetivo && miembro?.role !== "DM" && objetivo.ownerId !== userId) {
          throw new ForbiddenException("Only the DM or the owner can modify this");
        }
        pgStore.set(characterId, pg(characterId) + input.delta);
        return { hp: { current: pg(characterId) } };
      },
    );
    characterSheet.getSheet.mockResolvedValue({ sheet: null });

    // **I6 (vuelta de arreglo 1) — el mock replica la autorización REAL de `create()`, no solo su
    // escritura.** `RollRequestsService.create` empieza por `requireDM`; si el mock se saltara
    // esa comprobación, la prueba de I6 no podría demostrar el 403 que hoy sufre un jugador que
    // usa una actividad de salvación — estaría probando un servicio más permisivo que el real.
    rollRequests.create.mockImplementation(
      async (
        userId: string,
        campaignId2: string,
        input: { characterIds: string[]; key: string; dc?: number },
      ) => {
        const miembro = await membership.getMembership(campaignId2, userId);
        if (miembro?.role !== "DM") {
          throw new ForbiddenException("DM role required");
        }
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

    expect(events.record).toHaveBeenCalledTimes(1);
    const [, , sucesoInput, txDelSuceso] = events.record.mock.calls[0];
    expect(txDelSuceso).toBe(ultimoTx);
    expect(sucesoInput.payload.type).toBe("RESOURCE_SPENT");
    expect(sucesoInput.payload.key).toBe("rage");
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
    // no solo se infiere de `r.cd`.
    expect(rollRequests.create.mock.calls[0][2]).toMatchObject({ dc: 15, key: "save.dex" });
  });

  // **I5 (vuelta de arreglo 1).** `aliento-de-fuego` trae `dados` (8d6 de fuego, `siSalva:
  // "mitad"`), y A7 no los aplica: no sabe quién salvó hasta que alguien responda la petición.
  // Callarlo sería peor que no aplicarlo — la mesa vería un cono de fuego que no quema a nadie
  // sin que nadie se lo dijera.
  it("una salvación con dados avisa de que el daño NO se aplica solo", async () => {
    const r = await service.usar(dmId, campaignId, pnjId, "aliento-de-fuego", {
      objetivos: [magaId],
    });

    expect(r.aviso).toMatch(/no aplica/i);
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
  it("con varios objetivos, changeHp se llama en un orden fijo por id — no en el orden del cliente", async () => {
    await service.usar(clerigoId, campaignId, clerigoPersonajeId, "curar-heridas", {
      objetivos: [magaId, clerigoPersonajeId], // orden invertido a propósito
    });

    expect(characterSheet.changeHp).toHaveBeenCalledTimes(2);
    expect(characterSheet.changeHp.mock.calls[0][2]).toBe(clerigoPersonajeId);
    expect(characterSheet.changeHp.mock.calls[1][2]).toBe(magaId);
  });

  // **I7 (vuelta de arreglo 1) — el guardián de `signo` que faltaba.** La única prueba de
  // `dados` era de curación (`signo: 1`); con `delta = total` en vez de `signo * total` esa
  // prueba seguía en verde. Esta la ata: `signo: -1` tiene que DAÑAR.
  it("una actividad de dados con signo negativo DAÑA, no cura (guardián de signo)", async () => {
    const antes = pg(magaId);
    await service.usar(dmId, campaignId, pnjId, "dardo-de-fuego", { objetivos: [magaId] });

    expect(pg(magaId)).toBeLessThan(antes);
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

  // **Duda (a), corregida (vuelta de arreglo 1).** La versión anterior de esta prueba se llamaba
  // «un clérigo cura a la maga» y usaba dos personajes del MISMO dueño: no medía lo que su
  // título prometía, medía «un jugador se cura con dos fichas». Esta SÍ tiene dueños distintos,
  // y el título dice lo que de verdad pasa hoy: 403.
  it("HOY, un jugador NO puede curar al personaje de OTRO jugador con una actividad (403) — ficha I6/(a)", async () => {
    await expect(
      service.usar(clerigoId, campaignId, clerigoPersonajeId, "curar-heridas", {
        objetivos: [magaAjenaId],
      }),
    ).rejects.toThrow(ForbiddenException);
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

  // **La lección de A2, aplicada aquí.** `rollRequests.create` y `characterSheet.changeHp` no
  // solo se llaman: se llaman con el `tx` que la propia transacción de `usar()` abrió, comparado
  // por identidad. `expect.anything()` habría dejado pasar `this.prisma` a secas.
  it("la salvación y la curación usan el MISMO tx que abrió la transacción de usar()", async () => {
    await service.usar(dmId, campaignId, pnjId, "aliento-de-fuego", { objetivos: [magaId] });
    expect(rollRequests.create.mock.calls[0][3]).toBe(ultimoTx);

    await service.usar(clerigoId, campaignId, clerigoPersonajeId, "curar-heridas", {
      objetivos: [magaId],
    });
    expect(characterSheet.changeHp.mock.calls[0][4]).toBe(ultimoTx);
  });
});
