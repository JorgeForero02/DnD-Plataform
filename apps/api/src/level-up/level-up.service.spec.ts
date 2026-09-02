import { BadRequestException, ForbiddenException } from "@nestjs/common";
import type { Character } from "@prisma/client";
import type { Roller } from "../dice/dice";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { PrismaService } from "../prisma/prisma.service";
import { ResourcesService } from "../character-state/resources/resources.service";
import { LevelUpService } from "./level-up.service";

// Tarea 2A.9 — Prisma simulado, mismo patrón que `character-sheet.service.spec.ts`.

/** Una fila de `Character` completa y derivable, salvo lo que sobreescriba la prueba. */
function personaje(overrides: Partial<Character> = {}): Character {
  return {
    id: "ch1",
    campaignId: "c1",
    ownerId: "p1",
    name: "Thorin",
    race: null,
    class: null,
    level: 1,
    bio: null,
    visibility: "PLAYERS",
    createdAt: new Date(),
    // `elf` no da nada a Constitución: con un con=10 el modificador es 0 y la media fija sale
    // limpia, sin sumarle un ajuste racial que la prueba tendría que calcular aparte.
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    raceKey: "elf",
    subraceKey: null,
    classKey: "fighter",
    choices: null,
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
    $transaction: jest.fn(),
  };
  const membership = {
    requireMember: jest.fn().mockResolvedValue({ role: "PLAYER" }),
    getMembership: jest.fn().mockResolvedValue({ role: "PLAYER" }),
  };
  const events = { record: jest.fn().mockResolvedValue({ id: "ev1" }) };

  const resources = { seedResourcesFor: jest.fn().mockResolvedValue(undefined) };

  const service = new LevelUpService(
    prisma as unknown as PrismaService,
    membership as unknown as MembershipService,
    events as unknown as GameEventsService,
    roller,
    resources as unknown as ResourcesService,
  );
  return { service, prisma, membership, events, resources };
}

describe("LevelUpService — 2A.9 el diff propuesto y el jugador que confirma", () => {
  describe("preview() — la media fija", () => {
    // La tabla del SRD 5.1: `dado/2 + 1`, redondeando hacia arriba. Un d10 da 6, no 5,5.
    const casos: { classKey: string; hitDie: number; media: number }[] = [
      { classKey: "wizard", hitDie: 6, media: 4 },
      { classKey: "cleric", hitDie: 8, media: 5 },
      { classKey: "fighter", hitDie: 10, media: 6 },
      { classKey: "barbarian", hitDie: 12, media: 7 },
    ];

    it.each(casos)(
      "$classKey (d$hitDie) sube $media PG de media, con Constitución en 0",
      async ({ classKey, media }) => {
        const { service, prisma } = montar();
        prisma.character.findFirst.mockResolvedValue(personaje({ classKey }));

        const preview = await service.preview("p1", "c1", "ch1", false);

        expect(preview.hp.method).toBe("AVERAGE");
        expect(preview.hp.delta).toBe(media);
        expect(preview.hp.next - preview.hp.current).toBe(media);
      },
    );

    it("no escribe nada: ni actualiza el personaje, ni abre transacción, ni registra evento", async () => {
      const { service, prisma, events } = montar();
      prisma.character.findFirst.mockResolvedValue(personaje());

      await service.preview("p1", "c1", "ch1", false);

      expect(prisma.character.update).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(events.record).not.toHaveBeenCalled();
    });

    it("llamado dos veces seguidas da exactamente el mismo diff", async () => {
      const { service, prisma } = montar();
      prisma.character.findFirst.mockResolvedValue(personaje());

      const primero = await service.preview("p1", "c1", "ch1", false);
      const segundo = await service.preview("p1", "c1", "ch1", false);

      expect(segundo).toEqual(primero);
    });

    it("con roll=true tira de verdad con el evaluador y registra la tirada, sin tocar el personaje", async () => {
      const { service, prisma, events } = montar(dadoFijo(10));
      prisma.character.findFirst.mockResolvedValue(personaje());

      const preview = await service.preview("p1", "c1", "ch1", true);

      expect(preview.hp.method).toBe("ROLL");
      expect(preview.hp.roll?.rolled).toBe(10);
      expect(preview.hp.delta).toBe(10); // 10 tirados + 0 de Constitución
      expect(prisma.character.update).not.toHaveBeenCalled();
      expect(events.record).toHaveBeenCalledTimes(1);
      const payload = events.record.mock.calls[0][2].payload;
      expect(payload.type).toBe("ABILITY_ROLL");
      expect(payload.total).toBe(10);
    });

    it("señala el cambio de banda de competencia (nivel 4 a 5: +2 a +3)", async () => {
      const { service, prisma } = montar();
      prisma.character.findFirst.mockResolvedValue(personaje({ level: 4 }));

      const preview = await service.preview("p1", "c1", "ch1", false);

      expect(preview.proficiencyBonus).toEqual({ from: 2, to: 3, changed: true });
    });

    it("anuncia las aptitudes nuevas de clase y subclase que llegan al nivel siguiente", async () => {
      const { service, prisma } = montar();
      // El bárbaro gana Ataque adicional y Movimiento rápido al nivel 5, y su única subclase
      // (Senda del berserker) no aporta nada a ese nivel.
      prisma.character.findFirst.mockResolvedValue(personaje({ classKey: "barbarian", level: 4 }));

      const preview = await service.preview("p1", "c1", "ch1", false);

      const claves = preview.newFeatures.map((f) => f.key);
      expect(claves).toContain("extra-attack");
      expect(claves).toContain("fast-movement");
    });

    it("avisa de la mejora de característica pendiente en un nivel de asiLevels, y no en otro", async () => {
      const { service, prisma } = montar();
      prisma.character.findFirst.mockResolvedValue(personaje({ classKey: "fighter", level: 3 }));
      const conAsi = await service.preview("p1", "c1", "ch1", false);
      expect(conAsi.abilityScoreImprovementPending).toBe(true); // el guerrero mejora al 4

      prisma.character.findFirst.mockResolvedValue(personaje({ classKey: "fighter", level: 4 }));
      const sinAsi = await service.preview("p1", "c1", "ch1", false);
      expect(sinAsi.abilityScoreImprovementPending).toBe(false);
    });

    it("el nivel 20 es el techo: el previo se rechaza con 400, no con un nivel 21", async () => {
      const { service, prisma } = montar();
      prisma.character.findFirst.mockResolvedValue(personaje({ level: 20 }));

      await expect(service.preview("p1", "c1", "ch1", false)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("un jugador ajeno (ni dueño ni DM) recibe 403", async () => {
      const { service, prisma, membership } = montar();
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.character.findFirst.mockResolvedValue(personaje({ ownerId: "otro" }));

      await expect(service.preview("intruso", "c1", "ch1", false)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe("apply() — lo aplica", () => {
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

    it("sube `level` y escribe LEVEL_CHANGED con el antes y el después, en la misma transacción", async () => {
      const { service, prisma, events } = montar();
      const fila = personaje({ level: 1 });
      prisma.character.findFirst.mockResolvedValue(fila);
      const tx = montarTransaccion(prisma, fila);

      const resultado = await service.apply("p1", "c1", "ch1");

      expect(resultado.level).toBe(2);
      expect(tx.character.update).toHaveBeenCalledWith({
        where: { id: "ch1" },
        data: { level: 2 },
      });
      expect(events.record).toHaveBeenCalledWith(
        "p1",
        "c1",
        expect.objectContaining({
          subjectType: "character",
          subjectId: "ch1",
          payload: { type: "LEVEL_CHANGED", from: 1, to: 2 },
        }),
        tx,
      );
    });

    it("sube el tope de recursos con el nivel, dentro de la misma transacción", async () => {
      // La mitad de una subida de nivel que se nota en la mesa: un dado de golpe más, y el
      // espacio de conjuro nuevo si la clase lo trae. Va con `tx` a propósito — si la subida
      // se deshace, la siembra se deshace con ella.
      const { service, prisma, resources } = montar();
      const fila = personaje({ level: 1, classKey: "wizard" });
      prisma.character.findFirst.mockResolvedValue(fila);
      const tx = montarTransaccion(prisma, fila);

      await service.apply("p1", "c1", "ch1");

      expect(resources.seedResourcesFor).toHaveBeenCalledWith(
        "ch1",
        expect.objectContaining({ classKey: "wizard" }),
        2,
        tx,
      );
    });

    it("no toca `currentHp`: los PG máximos se calculan, subir de nivel no cura", async () => {
      const { service, prisma } = montar();
      const fila = personaje({ level: 1, currentHp: 3 });
      prisma.character.findFirst.mockResolvedValue(fila);
      const tx = montarTransaccion(prisma, fila);

      await service.apply("p1", "c1", "ch1");

      const dataEscrita = tx.character.update.mock.calls[0][0].data;
      expect(dataEscrita).not.toHaveProperty("currentHp");
    });

    it("el nivel 20 es el techo: subir se rechaza con 400, no con un nivel 21", async () => {
      const { service, prisma } = montar();
      const fila = personaje({ level: 20 });
      prisma.character.findFirst.mockResolvedValue(fila);
      montarTransaccion(prisma, fila);

      await expect(service.apply("p1", "c1", "ch1")).rejects.toBeInstanceOf(BadRequestException);
    });

    it("un jugador ajeno (ni dueño ni DM) recibe 403 y el nivel no cambia", async () => {
      const { service, prisma, membership } = montar();
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      const fila = personaje({ ownerId: "otro" });
      prisma.character.findFirst.mockResolvedValue(fila);

      await expect(service.apply("intruso", "c1", "ch1")).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
