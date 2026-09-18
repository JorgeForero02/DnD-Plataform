import { Test } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { SpellbookService } from "./spellbook.service";
import { sembrarLibro } from "./sembrar";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { CharacterSheetService } from "../characters/character-sheet.service";

// Tarea 3A.2 (Task 3, T10) — Step 1: tests rojo primero. Mismo patrón que
// `activities.service.spec.ts`: Prisma simulado con un poco de estado real (mapas en memoria),
// para poder leer lo que quedó tras `setEstado`/`sembrarLibro` sin mockear cada consulta a mano.

describe("SpellbookService", () => {
  let service: SpellbookService;

  interface FilaCharacter {
    id: string;
    campaignId: string;
    ownerId: string;
    visibility: "PUBLIC" | "PLAYERS" | "SPECIFIC_PLAYERS" | "OWNER_DM" | "DM_ONLY";
    classKey: string | null;
    level: number;
  }

  const campaignId = "camp1";
  let characters: Map<string, FilaCharacter>;
  // Clave `${characterId}:${spellKey}`.
  let spells: Map<string, "EN_EL_LIBRO" | "PREPARADO" | "CONOCIDO">;
  let resources: { characterId: string; key: string; current: number; max: number | null }[];
  let combatientesActivos: Set<string>; // characterId con un combatiente en encuentro ACTIVE

  function clave(characterId: string, spellKey: string) {
    return `${characterId}:${spellKey}`;
  }

  const characterSpellApi = {
    findMany: jest.fn(async ({ where }: any) => {
      let filas = [...spells.entries()]
        .filter(([k]) => k.startsWith(`${where.characterId}:`))
        .map(([k, estado]) => ({
          characterId: where.characterId,
          spellKey: k.slice(where.characterId.length + 1),
          estado,
        }));
      if (where.estado) {
        if (typeof where.estado === "string") {
          filas = filas.filter((f) => f.estado === where.estado);
        } else if (where.estado.in) {
          filas = filas.filter((f) => where.estado.in.includes(f.estado));
        }
      }
      return filas;
    }),
    findUnique: jest.fn(async ({ where }: any) => {
      const { characterId, spellKey } = where.characterId_spellKey;
      const estado = spells.get(clave(characterId, spellKey));
      return estado ? { characterId, spellKey, estado } : null;
    }),
    count: jest.fn(async ({ where }: any) => {
      return [...spells.entries()].filter(
        ([k, estado]) => k.startsWith(`${where.characterId}:`) && estado === where.estado,
      ).length;
    }),
    upsert: jest.fn(async ({ where, create, update }: any) => {
      const { characterId, spellKey } = where.characterId_spellKey;
      spells.set(clave(characterId, spellKey), (update ?? create).estado);
    }),
    deleteMany: jest.fn(async ({ where }: any) => {
      spells.delete(clave(where.characterId, where.spellKey));
    }),
    createMany: jest.fn(async ({ data }: any) => {
      for (const d of data) {
        const k = clave(d.characterId, d.spellKey);
        if (!spells.has(k)) spells.set(k, d.estado);
      }
      return { count: data.length };
    }),
  };

  const prisma = {
    character: {
      findFirst: jest.fn(async ({ where }: any) => {
        const fila = characters.get(where.id);
        return fila && fila.campaignId === where.campaignId ? fila : null;
      }),
    },
    user: { findUnique: jest.fn(async () => ({ id: "u", isAdmin: false })) },
    characterSpell: characterSpellApi,
    characterResource: {
      findMany: jest.fn(async ({ where }: any) =>
        resources.filter((r) => r.characterId === where.characterId),
      ),
    },
    combatant: {
      findFirst: jest.fn(async ({ where }: any) =>
        combatientesActivos.has(where.characterId) ? { id: "combatant1" } : null,
      ),
    },
    transaction: jest.fn(),
  };
  prisma.transaction.mockImplementation(async (fn: any) => fn(prisma));

  const membership = {
    requireMember: jest.fn().mockResolvedValue({ role: "PLAYER" }),
    getMembership: jest.fn(),
  };
  const events = { record: jest.fn() };
  const characterSheet = { getSheet: jest.fn() };

  const dueñoId = "player1";

  function crearCharacter(fila: FilaCharacter) {
    characters.set(fila.id, fila);
  }

  beforeEach(async () => {
    characters = new Map();
    spells = new Map();
    resources = [];
    combatientesActivos = new Set();

    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    characterSheet.getSheet.mockResolvedValue({ sheet: null });

    const ref = await Test.createTestingModule({
      providers: [
        SpellbookService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: GameEventsService, useValue: events },
        { provide: CharacterSheetService, useValue: characterSheet },
      ],
    }).compile();
    service = ref.get(SpellbookService);
    jest.clearAllMocks();
    membership.requireMember.mockResolvedValue({ role: "PLAYER" });
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.user.findUnique.mockResolvedValue({ id: "u", isAdmin: false });
  });

  // --- list --------------------------------------------------------------------------------

  describe("list", () => {
    it("mago nivel 3, INT 16: modelo LIBRO y los topes del brief", async () => {
      const id = "mago1";
      crearCharacter({
        id,
        campaignId,
        ownerId: dueñoId,
        visibility: "PLAYERS",
        classKey: "wizard",
        level: 3,
      });
      spells.set(clave(id, "magic-missile"), "PREPARADO");
      spells.set(clave(id, "shield"), "PREPARADO");
      spells.set(clave(id, "mage-armor"), "EN_EL_LIBRO");
      spells.set(clave(id, "burning-hands"), "EN_EL_LIBRO");
      spells.set(clave(id, "detect-magic"), "EN_EL_LIBRO");
      spells.set(clave(id, "sleep"), "EN_EL_LIBRO");
      spells.set(clave(id, "fire-bolt"), "CONOCIDO"); // truco
      characterSheet.getSheet.mockResolvedValue({
        sheet: { derived: { "abilityMod.int": { key: "abilityMod.int", total: 3, steps: [] } } },
      });

      const respuesta = await service.list(dueñoId, campaignId, id);

      expect(respuesta.modelo).toBe("LIBRO");
      expect(respuesta.topes.preparados).toEqual({ max: 6, actual: 2 });
      expect(respuesta.topes.trucos).toEqual({ max: 3, actual: 1 });
      expect(respuesta.topes.libro).toEqual({ max: 10, actual: 6 });
      expect(respuesta.entradas.length).toBeGreaterThan(6);
      expect(respuesta.entradas.every((e) => e.key !== undefined)).toBe(true);
      const preparado = respuesta.entradas.find((e) => e.key === "magic-missile")!;
      expect(preparado.estado).toBe("PREPARADO");
      expect(preparado.lanzable).toBe(true);
      const enLibro = respuesta.entradas.find((e) => e.key === "mage-armor")!;
      expect(enLibro.lanzable).toBe(false);
    });

    it("clérigo: modelo PREPARA_DE_LISTA, sin topes.libro; todas las entradas de la lista", async () => {
      const id = "clerigo1";
      crearCharacter({
        id,
        campaignId,
        ownerId: dueñoId,
        visibility: "PLAYERS",
        classKey: "cleric",
        level: 3,
      });
      spells.set(clave(id, "cure-wounds"), "PREPARADO");
      characterSheet.getSheet.mockResolvedValue({
        sheet: { derived: { "abilityMod.wis": { key: "abilityMod.wis", total: 3, steps: [] } } },
      });

      const respuesta = await service.list(dueñoId, campaignId, id);

      expect(respuesta.modelo).toBe("PREPARA_DE_LISTA");
      expect(respuesta.topes.libro).toBeUndefined();
      expect(
        respuesta.entradas.some((e) => e.key === "cure-wounds" && e.estado === "PREPARADO"),
      ).toBe(true);
      expect(respuesta.entradas.some((e) => e.estado === null)).toBe(true);
    });

    it("hechicero: topes.conocidos", async () => {
      const id = "hechicero1";
      crearCharacter({
        id,
        campaignId,
        ownerId: dueñoId,
        visibility: "PLAYERS",
        classKey: "sorcerer",
        level: 3,
      });
      characterSheet.getSheet.mockResolvedValue({
        sheet: { derived: { "abilityMod.cha": { key: "abilityMod.cha", total: 2, steps: [] } } },
      });

      const respuesta = await service.list(dueñoId, campaignId, id);

      expect(respuesta.modelo).toBe("CONOCIDOS");
      expect(respuesta.topes.conocidos).toBeDefined();
      expect(respuesta.topes.libro).toBeUndefined();
      expect(respuesta.topes.preparados).toBeUndefined();
    });

    it("guerrero: modelo NINGUNO, entradas vacías", async () => {
      const id = "guerrero1";
      crearCharacter({
        id,
        campaignId,
        ownerId: dueñoId,
        visibility: "PLAYERS",
        classKey: "fighter",
        level: 3,
      });

      const respuesta = await service.list(dueñoId, campaignId, id);

      expect(respuesta.modelo).toBe("NINGUNO");
      expect(respuesta.entradas).toEqual([]);
    });
  });

  // --- setEstado -----------------------------------------------------------------------------

  describe("setEstado", () => {
    it("un conjuro que no es de la clase: 400 con el nombre en español", async () => {
      const id = "mago2";
      crearCharacter({
        id,
        campaignId,
        ownerId: dueñoId,
        visibility: "PLAYERS",
        classKey: "wizard",
        level: 3,
      });
      characterSheet.getSheet.mockResolvedValue({ sheet: null });

      await expect(
        service.setEstado(dueñoId, campaignId, id, "cure-wounds", { estado: "PREPARADO" }),
      ).rejects.toMatchObject({ message: expect.stringContaining("Curar heridas") });
      await expect(
        service.setEstado(dueñoId, campaignId, id, "cure-wounds", { estado: "PREPARADO" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("un truco a PREPARADO: 400 — un truco se conoce, no se prepara", async () => {
      const id = "mago3";
      crearCharacter({
        id,
        campaignId,
        ownerId: dueñoId,
        visibility: "PLAYERS",
        classKey: "wizard",
        level: 3,
      });

      await expect(
        service.setEstado(dueñoId, campaignId, id, "fire-bolt", { estado: "PREPARADO" }),
      ).rejects.toMatchObject({ message: expect.stringContaining("se conoce, no se prepara") });
    });

    it("EN_EL_LIBRO en un clérigo: 400 — solo el mago tiene libro", async () => {
      const id = "clerigo2";
      crearCharacter({
        id,
        campaignId,
        ownerId: dueñoId,
        visibility: "PLAYERS",
        classKey: "cleric",
        level: 3,
      });

      await expect(
        service.setEstado(dueñoId, campaignId, id, "cure-wounds", { estado: "EN_EL_LIBRO" }),
      ).rejects.toMatchObject({ message: expect.stringContaining("Solo el mago tiene libro") });
    });

    it("PREPARADO con el tope lleno: se escribe igual y el suceso lleva SOBRE_EL_TOPE", async () => {
      const id = "clerigo3";
      crearCharacter({
        id,
        campaignId,
        ownerId: dueñoId,
        visibility: "PLAYERS",
        classKey: "cleric",
        level: 1,
      });
      // topeDePreparados(cleric, 1, mod=0) = max(1, 0+1) = 1.
      characterSheet.getSheet.mockResolvedValue({
        sheet: { derived: { "abilityMod.wis": { key: "abilityMod.wis", total: 0, steps: [] } } },
      });
      spells.set(clave(id, "cure-wounds"), "PREPARADO");

      await service.setEstado(dueñoId, campaignId, id, "healing-word", { estado: "PREPARADO" });

      const suceso = events.record.mock.calls.find(
        (c: any) => c[2].payload.spellKey === "healing-word",
      )![2];
      expect(suceso.payload.fueraDeRegla).toContain("SOBRE_EL_TOPE");
      expect(spells.get(clave(id, "healing-word"))).toBe("PREPARADO");
    });

    it("con un combatiente en un encuentro ACTIVE: el suceso lleva EN_COMBATE", async () => {
      const id = "clerigo4";
      crearCharacter({
        id,
        campaignId,
        ownerId: dueñoId,
        visibility: "PLAYERS",
        classKey: "cleric",
        level: 5,
      });
      characterSheet.getSheet.mockResolvedValue({
        sheet: { derived: { "abilityMod.wis": { key: "abilityMod.wis", total: 3, steps: [] } } },
      });
      combatientesActivos.add(id);

      await service.setEstado(dueñoId, campaignId, id, "cure-wounds", { estado: "PREPARADO" });

      const suceso = events.record.mock.calls[0][2];
      expect(suceso.payload.fueraDeRegla).toContain("EN_COMBATE");
    });

    it("mago: PREPARADO → null es DESPREPARADO y deja el conjuro EN_EL_LIBRO", async () => {
      const id = "mago4";
      crearCharacter({
        id,
        campaignId,
        ownerId: dueñoId,
        visibility: "PLAYERS",
        classKey: "wizard",
        level: 3,
      });
      characterSheet.getSheet.mockResolvedValue({
        sheet: { derived: { "abilityMod.int": { key: "abilityMod.int", total: 3, steps: [] } } },
      });
      spells.set(clave(id, "magic-missile"), "PREPARADO");

      await service.setEstado(dueñoId, campaignId, id, "magic-missile", { estado: null });

      expect(spells.get(clave(id, "magic-missile"))).toBe("EN_EL_LIBRO");
      const suceso = events.record.mock.calls[0][2];
      expect(suceso.payload.cambio).toBe("DESPREPARADO");
      expect(suceso.payload.estado).toBe("EN_EL_LIBRO");
    });

    it("mago: borrar del libro (EN_EL_LIBRO → null) es OLVIDADO", async () => {
      const id = "mago5";
      crearCharacter({
        id,
        campaignId,
        ownerId: dueñoId,
        visibility: "PLAYERS",
        classKey: "wizard",
        level: 3,
      });
      characterSheet.getSheet.mockResolvedValue({
        sheet: { derived: { "abilityMod.int": { key: "abilityMod.int", total: 3, steps: [] } } },
      });
      spells.set(clave(id, "magic-missile"), "EN_EL_LIBRO");

      await service.setEstado(dueñoId, campaignId, id, "magic-missile", { estado: null });

      expect(spells.has(clave(id, "magic-missile"))).toBe(false);
      const suceso = events.record.mock.calls[0][2];
      expect(suceso.payload.cambio).toBe("OLVIDADO");
      expect(suceso.payload.estado).toBeNull();
    });
  });

  // --- lanzable --------------------------------------------------------------------------------

  describe("lanzable", () => {
    it("PREPARADO es lanzable", async () => {
      spells.set(clave("c1", "magic-missile"), "PREPARADO");
      expect(await service.lanzable(prisma as any, "c1", "magic-missile")).toEqual({ ok: true });
    });
    it("EN_EL_LIBRO no lo es: NO_PREPARADO", async () => {
      spells.set(clave("c1", "shield"), "EN_EL_LIBRO");
      expect(await service.lanzable(prisma as any, "c1", "shield")).toEqual({
        ok: false,
        motivo: "NO_PREPARADO",
      });
    });
    it("sin fila: NO_ES_SUYO", async () => {
      expect(await service.lanzable(prisma as any, "c1", "fireball")).toEqual({
        ok: false,
        motivo: "NO_ES_SUYO",
      });
    });
  });

  // --- sembrarLibro (función libre, "./sembrar") ------------------------------------------------

  describe("sembrarLibro", () => {
    it("wizard nivel 3: 6 filas EN_EL_LIBRO y un SPELLBOOK_CHANGED SEMBRADO por fila", async () => {
      const id = "mago-nuevo";
      const n = await sembrarLibro(
        prisma as any,
        events as any,
        dueñoId,
        campaignId,
        { id, visibility: "PLAYERS" },
        "wizard",
        3,
      );
      expect(n).toBe(6);
      const filas = [...spells.entries()].filter(([k]) => k.startsWith(`${id}:`));
      expect(filas).toHaveLength(6);
      expect(filas.every(([, estado]) => estado === "EN_EL_LIBRO")).toBe(true);
      const sembrados = events.record.mock.calls.filter(
        (c: any) => c[2].payload.cambio === "SEMBRADO",
      );
      expect(sembrados).toHaveLength(6);
    });

    it("cleric no siembra nada (prepara de la lista entera)", async () => {
      const id = "clerigo-nuevo";
      const n = await sembrarLibro(
        prisma as any,
        events as any,
        dueñoId,
        campaignId,
        { id, visibility: "PLAYERS" },
        "cleric",
        3,
      );
      expect(n).toBe(0);
    });

    it("ranger nivel 1 no siembra nada; nivel 2 siembra 2 CONOCIDO", async () => {
      const id1 = "ranger-1";
      const n1 = await sembrarLibro(
        prisma as any,
        events as any,
        dueñoId,
        campaignId,
        { id: id1, visibility: "PLAYERS" },
        "ranger",
        1,
      );
      expect(n1).toBe(0);

      const id2 = "ranger-2";
      const n2 = await sembrarLibro(
        prisma as any,
        events as any,
        dueñoId,
        campaignId,
        { id: id2, visibility: "PLAYERS" },
        "ranger",
        2,
      );
      expect(n2).toBe(2);
      const filas = [...spells.entries()].filter(([k]) => k.startsWith(`${id2}:`));
      expect(filas.every(([, estado]) => estado === "CONOCIDO")).toBe(true);
    });
  });
});
