import { Test } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { ActionsService } from "./actions.service";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { CharacterSheetService } from "../characters/character-sheet.service";
import { SpellbookService } from "../spellbook/spellbook.service";
import { InventoryService } from "../inventory/inventory.service";

// Tarea 1 del plan 3A.3 (T21) — Step 1: tests rojo primero. Mismo patrón que
// `spellbook.service.spec.ts`: `CharacterSheetService`/`SpellbookService`/`InventoryService`
// simulados por completo (son piezas ya probadas por su cuenta; esta unidad solo compone lo que
// devuelven), y Prisma simulado solo para lo que `ActionsService` toca de verdad: `character`
// (permiso), `user` (visor), `combatant` (economía del turno) y `characterResource` (usos de
// una aptitud).

describe("ActionsService", () => {
  let service: ActionsService;

  interface FilaCharacter {
    id: string;
    campaignId: string;
    ownerId: string;
    visibility: "PUBLIC" | "PLAYERS" | "SPECIFIC_PLAYERS" | "OWNER_DM" | "DM_ONLY";
  }

  const campaignId = "camp1";
  const dueñoId = "player1";
  let characters: Map<string, FilaCharacter>;
  let combatiente: {
    actionUsed: boolean;
    bonusUsed: boolean;
    reactionUsed: boolean;
    movementUsed: number;
    position: number;
    encounter: { activePosition: number };
  } | null;
  let recursos: { characterId: string; key: string; current: number; max: number | null }[];

  const prisma = {
    character: {
      findFirst: jest.fn(async ({ where }: any) => {
        const fila = characters.get(where.id);
        return fila && fila.campaignId === where.campaignId ? fila : null;
      }),
    },
    user: { findUnique: jest.fn(async () => ({ id: "u", isAdmin: false })) },
    combatant: {
      findFirst: jest.fn(async () => combatiente),
    },
    characterResource: {
      findMany: jest.fn(async ({ where }: any) =>
        recursos.filter((r) => r.characterId === where.characterId && where.key.in.includes(r.key)),
      ),
    },
  };

  const membership = {
    requireMember: jest.fn().mockResolvedValue({ role: "PLAYER" }),
    getMembership: jest.fn().mockResolvedValue({ role: "PLAYER" }),
  };

  const characterSheet = { getSheet: jest.fn() };
  const spellbook = { list: jest.fn() };
  const inventory = { list: jest.fn() };

  function crearCharacter(fila: FilaCharacter) {
    characters.set(fila.id, fila);
  }

  beforeEach(async () => {
    characters = new Map();
    combatiente = null;
    recursos = [];

    characterSheet.getSheet.mockResolvedValue({
      sheet: null,
      attacks: [],
      effectiveSpeeds: {},
    });
    spellbook.list.mockResolvedValue({
      modelo: "NINGUNO",
      entradas: [],
      topes: {},
      avisos: [],
      espacios: [],
    });
    inventory.list.mockResolvedValue({
      items: [],
      purse: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      totalWeightOz: 0,
      carryCapacityOz: null,
      encumbrance: null,
    });

    const ref = await Test.createTestingModule({
      providers: [
        ActionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: CharacterSheetService, useValue: characterSheet },
        { provide: SpellbookService, useValue: spellbook },
        { provide: InventoryService, useValue: inventory },
      ],
    }).compile();
    service = ref.get(ActionsService);
    jest.clearAllMocks();
    membership.requireMember.mockResolvedValue({ role: "PLAYER" });
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.user.findUnique.mockResolvedValue({ id: "u", isAdmin: false });
    prisma.combatant.findFirst.mockImplementation(async () => combatiente);
    prisma.characterResource.findMany.mockImplementation(async ({ where }: any) =>
      recursos.filter((r) => r.characterId === where.characterId && where.key.in.includes(r.key)),
    );
  });

  it("otro jugador (ni dueño ni DM): 403", async () => {
    crearCharacter({ id: "mago1", campaignId, ownerId: dueñoId, visibility: "PLAYERS" });
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    await expect(service.list("otroJugador", campaignId, "mago1")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("fuera de combate: economia null, esMiTurno null, y las básicas disponibles", async () => {
    crearCharacter({ id: "mago1", campaignId, ownerId: dueñoId, visibility: "PLAYERS" });
    const respuesta = await service.list(dueñoId, campaignId, "mago1");
    expect(respuesta.enCombate).toBe(false);
    expect(respuesta.esMiTurno).toBeNull();
    expect(respuesta.economia).toBeNull();
    expect(respuesta.grupos.BASICAS).toHaveLength(8);
    expect(respuesta.grupos.BASICAS.every((a) => a.disponible)).toBe(true);
    expect(respuesta.grupos.BASICAS.map((a) => a.key)).toContain("basic:dodge");
    expect(respuesta.grupos.BASICAS.find((a) => a.key === "basic:help")!.name).toBe("Ayudar");
  });

  describe("el mago en combate — magic-missile PREPARADO, sleep EN_EL_LIBRO, fire-bolt CONOCIDO", () => {
    beforeEach(() => {
      crearCharacter({ id: "mago1", campaignId, ownerId: dueñoId, visibility: "PLAYERS" });
      spellbook.list.mockResolvedValue({
        modelo: "LIBRO",
        entradas: [
          {
            key: "magic-missile",
            nameEs: "Proyectil mágico",
            nameEn: "Magic Missile",
            level: 1,
            school: "EVOCATION",
            castingTime: { unidad: "asalto" },
            range: { unidad: "pies", distanciaFt: 120 },
            concentration: false,
            ritual: false,
            estado: "PREPARADO",
            lanzable: true,
            mecanica: "dados",
            objetivos: "varios",
            escalaPorEspacio: true,
            encanta: false,
          },
          {
            key: "sleep",
            nameEs: "Sueño",
            nameEn: "Sleep",
            level: 1,
            school: "ENCHANTMENT",
            castingTime: { unidad: "asalto" },
            range: { unidad: "pies", distanciaFt: 90 },
            concentration: false,
            ritual: false,
            estado: "EN_EL_LIBRO",
            lanzable: false,
            mecanica: "utilidad",
            objetivos: "varios",
            escalaPorEspacio: false,
            encanta: false,
          },
          {
            key: "fire-bolt",
            nameEs: "Rayo de fuego",
            nameEn: "Fire Bolt",
            level: 0,
            school: "EVOCATION",
            castingTime: { unidad: "asalto" },
            range: { unidad: "pies", distanciaFt: 120 },
            concentration: false,
            ritual: false,
            estado: "CONOCIDO",
            lanzable: true,
            mecanica: "ataque",
            objetivos: "uno",
            escalaPorEspacio: false,
            encanta: false,
          },
        ],
        topes: {},
        avisos: [],
        espacios: [
          { nivel: 1, actual: 0, max: 4 },
          { nivel: 2, actual: 2, max: 2 },
        ],
      });
    });

    it("magic-missile disponible con recurso en el espacio superior (nivel 2), acción libre", async () => {
      combatiente = {
        actionUsed: false,
        bonusUsed: false,
        reactionUsed: false,
        movementUsed: 0,
        position: 0,
        encounter: { activePosition: 0 },
      };
      const respuesta = await service.list(dueñoId, campaignId, "mago1");
      expect(respuesta.enCombate).toBe(true);
      expect(respuesta.esMiTurno).toBe(true);

      const mm = respuesta.grupos.CONJUROS.find((a) => a.key === "spell:magic-missile")!;
      expect(mm.disponible).toBe(true);
      expect(mm.motivos).toEqual([]);
      expect(mm.recurso).toEqual({ tipo: "ESPACIO", actual: 2, max: 2, nivel: 2 });

      const sleep = respuesta.grupos.CONJUROS.find((a) => a.key === "spell:sleep")!;
      expect(sleep.disponible).toBe(true);
      expect(sleep.motivos).toEqual(["NO_PREPARADO"]);

      const fireBolt = respuesta.grupos.CONJUROS.find((a) => a.key === "spell:fire-bolt")!;
      expect(fireBolt.disponible).toBe(true);
      expect(fireBolt.recurso).toBeUndefined();
    });

    it("con la acción gastada: magic-missile.disponible false, motivos [ACCION_GASTADA]", async () => {
      combatiente = {
        actionUsed: true,
        bonusUsed: false,
        reactionUsed: false,
        movementUsed: 0,
        position: 0,
        encounter: { activePosition: 0 },
      };
      const respuesta = await service.list(dueñoId, campaignId, "mago1");
      const mm = respuesta.grupos.CONJUROS.find((a) => a.key === "spell:magic-missile")!;
      expect(mm.disponible).toBe(false);
      expect(mm.motivos).toEqual(["ACCION_GASTADA"]);
    });

    it("no es tu turno: magic-missile.disponible false, motivos [NO_ES_TU_TURNO]", async () => {
      combatiente = {
        actionUsed: false,
        bonusUsed: false,
        reactionUsed: false,
        movementUsed: 0,
        position: 0,
        encounter: { activePosition: 1 },
      };
      const respuesta = await service.list(dueñoId, campaignId, "mago1");
      expect(respuesta.esMiTurno).toBe(false);
      const mm = respuesta.grupos.CONJUROS.find((a) => a.key === "spell:magic-missile")!;
      expect(mm.disponible).toBe(false);
      expect(mm.motivos).toEqual(["NO_ES_TU_TURNO"]);
    });
  });

  it("un bárbaro con Furia 0/3: SIN_USOS", async () => {
    crearCharacter({ id: "barbaro1", campaignId, ownerId: dueñoId, visibility: "PLAYERS" });
    characterSheet.getSheet.mockResolvedValue({
      sheet: {
        activities: [
          {
            tipo: "utilidad",
            activation: { coste: "BONUS" },
            consumption: [{ recurso: "rage", cantidad: 1 }],
            duration: { valor: 1, unidad: "minuto", concentracion: false },
            effects: [],
            key: "rage",
            name: "Furia",
            usos: { max: 3, resetOn: "LONG_REST" },
          },
        ],
      },
      attacks: [],
      effectiveSpeeds: {},
    });
    recursos = [{ characterId: "barbaro1", key: "rage", current: 0, max: 3 }];

    const respuesta = await service.list(dueñoId, campaignId, "barbaro1");
    const furia = respuesta.grupos.APTITUDES.find((a) => a.key === "feature:rage")!;
    expect(furia.recurso).toEqual({ tipo: "USO", actual: 0, max: 3 });
    expect(furia.motivos).toEqual(["SIN_USOS"]);
    expect(furia.disponible).toBe(false);
  });

  it("una poción de curación ×2: disponible en OBJETOS; ×0 no sale", async () => {
    crearCharacter({ id: "mago1", campaignId, ownerId: dueñoId, visibility: "PLAYERS" });
    inventory.list.mockResolvedValue({
      items: [
        {
          id: "row1",
          quantity: 2,
          location: "CARRIED",
          slot: undefined,
          attuned: false,
          storedAt: null,
          note: null,
          item: { ref: "SRD:potion-of-healing", name: "Poción de curación", kind: "CONSUMABLE" },
        },
        {
          id: "row2",
          quantity: 0,
          location: "CARRIED",
          slot: undefined,
          attuned: false,
          storedAt: null,
          note: null,
          item: { ref: "SRD:oil", name: "Aceite", kind: "CONSUMABLE" },
        },
      ],
      purse: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      totalWeightOz: 0,
      carryCapacityOz: null,
      encumbrance: null,
    });

    const respuesta = await service.list(dueñoId, campaignId, "mago1");
    expect(respuesta.grupos.OBJETOS).toHaveLength(1);
    expect(respuesta.grupos.OBJETOS[0]).toMatchObject({
      key: "item:row1",
      name: "Poción de curación",
      disponible: true,
      recurso: { tipo: "CANTIDAD", actual: 2, max: null },
    });
  });
});
