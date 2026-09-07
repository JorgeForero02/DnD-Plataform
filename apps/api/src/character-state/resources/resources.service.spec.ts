import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { MembershipService } from "../../campaigns/membership.service";
import { GameEventsService } from "../../game-events/game-events.service";
import { PrismaService } from "../../prisma/prisma.service";
import { deriveCharacter } from "../../rules/catalog";
import { ResourcesService } from "./resources.service";

// Tarea 2A.8.

describe("ResourcesService", () => {
  let service: ResourcesService;
  const character = {
    id: "c1",
    ownerId: "owner1",
    name: "Kaelith",
    visibility: "PLAYERS",
    campaignId: "cmp1",
  };
  const prisma = {
    character: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
    characterResource: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    transaction: jest.fn(),
  };
  const membership = { requireMember: jest.fn(), getMembership: jest.fn() };
  const events = { record: jest.fn() };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        ResourcesService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: GameEventsService, useValue: events },
      ],
    }).compile();
    service = ref.get(ResourcesService);
    jest.resetAllMocks();
    membership.requireMember.mockResolvedValue(undefined);
    prisma.character.findFirst.mockResolvedValue(character);
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    prisma.transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
  });

  describe("upsert()", () => {
    it("el dueño puede crear un recurso propio (grantedBy OWNER)", async () => {
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.characterResource.findUnique.mockResolvedValue(null);
      prisma.characterResource.upsert.mockResolvedValue({ key: "rage", current: 3 });

      await service.upsert("owner1", "cmp1", "c1", {
        key: "rage",
        label: "Furia",
        current: 3,
        max: 3,
        resetOn: "LONG_REST",
        grantedBy: "OWNER",
      });

      expect(prisma.characterResource.upsert).toHaveBeenCalled();
    });

    it("MUTACIÓN CLAVE: un jugador NO puede subir un recurso DM_ONLY (403)", async () => {
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      // La primera petición sobre esa clave: no hay fila todavía, así que el candado mira el
      // `grantedBy` que trae esta misma petición.
      prisma.characterResource.findUnique.mockResolvedValue(null);

      await expect(
        service.upsert("owner1", "cmp1", "c1", {
          key: "inspiration",
          label: "Inspiración",
          current: 1,
          max: 1,
          resetOn: "NONE",
          grantedBy: "DM_ONLY",
        }),
      ).rejects.toThrow();
      expect(prisma.characterResource.upsert).not.toHaveBeenCalled();
    });

    it("un jugador tampoco puede subir un DM_ONLY ya existente, aunque mande OWNER en el cuerpo", async () => {
      // El candado lo pone la fila que YA existe, no lo que pida el cuerpo: aflojarlo desde
      // el propio PUT del dueño sería el diputado confundido de manual.
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.characterResource.findUnique.mockResolvedValue({
        key: "inspiration",
        grantedBy: "DM_ONLY",
        current: 0,
        max: 1,
      });

      await expect(
        service.upsert("owner1", "cmp1", "c1", {
          key: "inspiration",
          label: "Inspiración",
          current: 1,
          max: 1,
          resetOn: "NONE",
          grantedBy: "OWNER",
        }),
      ).rejects.toThrow();
    });

    it("el DM sí puede subir un recurso DM_ONLY", async () => {
      membership.getMembership.mockResolvedValue({ role: "DM" });
      prisma.characterResource.findUnique.mockResolvedValue(null);
      prisma.characterResource.upsert.mockResolvedValue({ key: "inspiration", current: 1 });

      await service.upsert("dm1", "cmp1", "c1", {
        key: "inspiration",
        label: "Inspiración",
        current: 1,
        max: 1,
        resetOn: "NONE",
        grantedBy: "DM_ONLY",
      });

      expect(prisma.characterResource.upsert).toHaveBeenCalled();
    });

    it("quien no es DM ni dueño no puede tocar ningún recurso del personaje", async () => {
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      await expect(
        service.upsert("otro-jugador", "cmp1", "c1", {
          key: "ki",
          label: "Ki",
          current: 1,
          max: 4,
          resetOn: "SHORT_REST",
          grantedBy: "OWNER",
        }),
      ).rejects.toThrow();
    });
  });

  describe("spend() y restore()", () => {
    it("gastar recorta el delta entre 0 y el máximo, y escribe RESOURCE_SPENT", async () => {
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.characterResource.findUnique.mockResolvedValue({
        id: "r1",
        key: "ki",
        label: "Ki",
        current: 2,
        max: 4,
      });
      prisma.characterResource.update.mockResolvedValue({ id: "r1", current: 1 });

      const res = await service.spend("owner1", "cmp1", "c1", "ki", { amount: 1 });

      expect(prisma.characterResource.update).toHaveBeenCalledWith({
        where: { id: "r1" },
        data: { current: 1 },
      });
      expect(events.record).toHaveBeenCalledWith(
        "owner1",
        "cmp1",
        expect.objectContaining({
          payload: expect.objectContaining({
            type: "RESOURCE_SPENT",
            key: "ki",
            amount: 1,
            remaining: 1,
          }),
        }),
        prisma,
      );
      expect(res).toEqual({ id: "r1", current: 1 });
    });

    it("**gastar más de lo que hay se rechaza**, y ya no se recorta a 0 en silencio", async () => {
      // **Esta prueba decía lo contrario hasta el plan 08, y el cambio es deliberado.** Afirmaba
      // que gastar 99 de 1 «se queda en 0, nunca en negativo», que es cierto para el número y
      // falso para la mesa: la respuesta era un 200 idéntico al de un gasto legítimo, así que
      // nadie podía saber que el ki no estaba. La ficha I8 lo pidió para la inspiración y se
      // aplica a todos los recursos, porque un espacio de conjuro fantasma es el mismo defecto.
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.characterResource.findUnique.mockResolvedValue({
        id: "r1",
        key: "ki",
        label: "Ki",
        current: 1,
        max: 4,
      });

      await expect(
        service.spend("owner1", "cmp1", "c1", "ki", { amount: 99 }),
      ).rejects.toBeInstanceOf(ConflictException);
      // Y no se escribe nada: ni la fila ni el registro.
      expect(prisma.characterResource.update).not.toHaveBeenCalled();
      expect(events.record).not.toHaveBeenCalled();
    });

    it("gastar EXACTAMENTE lo que hay sí vale, y deja el contador en cero", async () => {
      // El borde del rechazo de arriba: `current === amount` no es «más de lo que hay».
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.characterResource.findUnique.mockResolvedValue({
        id: "r1",
        key: "ki",
        label: "Ki",
        current: 4,
        max: 4,
      });
      prisma.characterResource.update.mockResolvedValue({ id: "r1", current: 0 });

      await service.spend("owner1", "cmp1", "c1", "ki", { amount: 4 });

      expect(prisma.characterResource.update).toHaveBeenCalledWith({
        where: { id: "r1" },
        data: { current: 0 },
      });
    });

    it("reponer no pasa de max, y escribe RESOURCE_RESTORED", async () => {
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.characterResource.findUnique.mockResolvedValue({
        id: "r1",
        key: "ki",
        label: "Ki",
        current: 3,
        max: 4,
      });
      prisma.characterResource.update.mockResolvedValue({ id: "r1", current: 4 });

      await service.restore("owner1", "cmp1", "c1", "ki", { amount: 5 });

      expect(prisma.characterResource.update).toHaveBeenCalledWith({
        where: { id: "r1" },
        data: { current: 4 },
      });
      expect(events.record).toHaveBeenCalledWith(
        "owner1",
        "cmp1",
        expect.objectContaining({
          payload: expect.objectContaining({ type: "RESOURCE_RESTORED", remaining: 4 }),
        }),
        prisma,
      );
    });

    it("gastar o reponer no exige el candado de grantedBy: usar lo que ya tienes no es concederte más", async () => {
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.characterResource.findUnique.mockResolvedValue({
        id: "r1",
        key: "inspiration",
        label: "Inspiración",
        current: 1,
        max: 1,
        grantedBy: "DM_ONLY",
      });
      prisma.characterResource.update.mockResolvedValue({ id: "r1", current: 0 });

      await expect(
        service.spend("owner1", "cmp1", "c1", "inspiration", { amount: 1 }),
      ).resolves.toBeDefined();
    });

    // --- Plan 08, ficha I8 ---

    it("**gastar lo que no tienes es 409, no un 200 que parece que funcionó**", async () => {
      // Hasta hoy el recorte de abajo se lo tragaba: pedir un espacio con cero devolvía 200 y
      // `current: 0`, la misma respuesta exacta que gastarlo de verdad. Quien llamaba no podía
      // distinguir «lo has usado» de «no tenías», y en la mesa eso es un conjuro gratis.
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.characterResource.findUnique.mockResolvedValue({
        id: "r1",
        key: "inspiration",
        label: "Inspiración",
        current: 0,
        max: 1,
        grantedBy: "DM_ONLY",
      });
      await expect(
        service.spend("owner1", "cmp1", "c1", "inspiration", { amount: 1 }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.characterResource.update).not.toHaveBeenCalled();
      expect(events.record).not.toHaveBeenCalled();
    });

    it("**y REPONER un recurso DM_ONLY es 403 para el jugador**: reponer es conceder", async () => {
      // El candado vivía solo en `upsert`. Con la inspiración sembrada, un jugador se la habría
      // dado a sí mismo pulsando «+» en su propia hoja, y «la concede el DM» sería un adorno.
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.characterResource.findUnique.mockResolvedValue({
        id: "r1",
        key: "inspiration",
        label: "Inspiración",
        current: 0,
        max: 1,
        grantedBy: "DM_ONLY",
      });
      await expect(
        service.restore("owner1", "cmp1", "c1", "inspiration", { amount: 1 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.characterResource.update).not.toHaveBeenCalled();
    });

    it("el DM sí la concede, y el tope de 1 impide acumularla", async () => {
      // SRD: *«you either have inspiration or you don't»*. Dos concesiones seguidas dejan UNA.
      membership.getMembership.mockResolvedValue({ role: "DM" });
      prisma.characterResource.findUnique.mockResolvedValue({
        id: "r1",
        key: "inspiration",
        label: "Inspiración",
        current: 1,
        max: 1,
        grantedBy: "DM_ONLY",
      });
      prisma.characterResource.update.mockResolvedValue({ id: "r1", current: 1 });
      await service.restore("dm1", "cmp1", "c1", "inspiration", { amount: 1 });
      expect(prisma.characterResource.update).toHaveBeenCalledWith({
        where: { id: "r1" },
        data: { current: 1 },
      });
    });

    it("un recurso OWNER lo sigue reponiendo su dueño: el candado es solo del DM_ONLY", async () => {
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.characterResource.findUnique.mockResolvedValue({
        id: "r2",
        key: "rage",
        label: "Furia",
        current: 1,
        max: 3,
        grantedBy: "OWNER",
      });
      prisma.characterResource.update.mockResolvedValue({ id: "r2", current: 2 });
      await expect(
        service.restore("owner1", "cmp1", "c1", "rage", { amount: 1 }),
      ).resolves.toBeDefined();
    });

    it("gastar un recurso que no existe es 404", async () => {
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.characterResource.findUnique.mockResolvedValue(null);
      await expect(
        service.spend("owner1", "cmp1", "c1", "no-existe", { amount: 1 }),
      ).rejects.toThrow();
    });
  });

  describe("list()", () => {
    it("exige poder ver el personaje", async () => {
      prisma.character.findFirst.mockResolvedValue(null);
      await expect(service.list("x", "cmp1", "c1")).rejects.toThrow();
    });
  });

  describe("seedResourcesFor()", () => {
    it("siembra dados de golpe con máximo igual al nivel, y NUNCA con resetOn de descanso", async () => {
      prisma.characterResource.upsert.mockResolvedValue({});
      await service.seedResourcesFor(
        "c1",
        { classKey: "barbarian", spellSlots: [], spellSlotResetOn: "NONE", activities: [] },
        5,
      );

      expect(prisma.characterResource.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { characterId_key: { characterId: "c1", key: "hit-dice-d12" } },
          create: expect.objectContaining({ current: 5, max: 5, resetOn: "NONE" }),
        }),
      );
    });

    it("MUTACIÓN CLAVE: el brujo siembra sus espacios con reposición en descanso CORTO", async () => {
      prisma.characterResource.upsert.mockResolvedValue({});
      await service.seedResourcesFor(
        "c1",
        {
          classKey: "warlock",
          spellSlots: [{ spellLevel: 1, slots: 2 }],
          spellSlotResetOn: "SHORT_REST",
          activities: [],
        },
        3,
      );

      expect(prisma.characterResource.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { characterId_key: { characterId: "c1", key: "spell-slot-1" } },
          create: expect.objectContaining({ current: 2, max: 2, resetOn: "SHORT_REST" }),
        }),
      );
    });
  });

  describe("seedResourcesFor() — las actividades concedidas (paso 2, tarea A11)", () => {
    // **Con una hoja de verdad, no fabricada.** `deriveCharacter` es el mismo motor que
    // construye la hoja de cualquier personaje real; usarlo aquí es la diferencia entre probar
    // "si le doy a esta función un array con la forma correcta" y probar el hueco de verdad que
    // esta tarea cierra — nadie sembraba `rage` aunque `resolve.ts` (A9/A10) ya supiera decir
    // cuántos usos le tocan a ESTE bárbaro a ESTE nivel.
    function hojaDeBarbaro(level: number) {
      return deriveCharacter({
        abilities: { str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "barbarian" },
        level,
        choices: { "barbarian-skills": ["athletics", "intimidation"] },
      });
    }

    it("**la más importante de las dos tareas**: un bárbaro recién creado siembra su fila «rage», con el máximo real de su nivel y LONG_REST — sin esto, usar la Furia da «no te quedan usos» de un recurso que nunca existió", async () => {
      prisma.characterResource.upsert.mockResolvedValue({});
      const hoja = hojaDeBarbaro(3);
      // Verificado contra el catálogo antes de afirmarlo en la prueba (barbarian-rages: 1→2,
      // 3→3): un bárbaro de nivel 3 tiene 3 usos, no 2. El propio encargo citaba "max 2" para un
      // bárbaro recién creado sin decir su nivel — comprobado aquí contra `classes.ts`, no contra
      // la cita.
      expect(hoja.activities.find((a) => a.key === "rage")?.usos?.max).toBe(3);

      await service.seedResourcesFor(
        "c1",
        {
          classKey: "barbarian",
          spellSlots: [],
          spellSlotResetOn: "NONE",
          activities: hoja.activities,
        },
        3,
      );

      expect(prisma.characterResource.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { characterId_key: { characterId: "c1", key: "rage" } },
          create: expect.objectContaining({
            label: "Furia",
            current: 3,
            max: 3,
            resetOn: "LONG_REST",
            grantedBy: "OWNER",
          }),
        }),
      );
    });

    it("un mago no siembra ningún recurso «rage»: la concesión de otra clase no llega", async () => {
      prisma.characterResource.upsert.mockResolvedValue({});
      const hoja = deriveCharacter({
        abilities: { str: 8, dex: 12, con: 14, int: 16, wis: 10, cha: 10 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "wizard" },
        level: 1,
      });
      expect(hoja.activities.find((a) => a.key === "rage")).toBeUndefined();

      await service.seedResourcesFor(
        "c2",
        {
          classKey: "wizard",
          spellSlots: [],
          spellSlotResetOn: "LONG_REST",
          activities: hoja.activities,
        },
        1,
      );

      const clavesSembradas = prisma.characterResource.upsert.mock.calls.map(
        (llamada) => (llamada[0] as { create: { key: string } }).create.key,
      );
      expect(clavesSembradas).not.toContain("rage");
    });

    // **Sobre la segunda dimensión que pedía el encargo** («una concesión de subclase solo
    // llega si esa subclase está elegida»): comprobado contra el catálogo y NO es cierto que
    // haya hoy una concesión real atada a una subclase — `grep` de `grant:` en `classes.ts`
    // encuentra una sola entrada, la Furia, y es un rasgo de CLASE (nivel 1), no de subclase.
    // Escribir esa prueba habría exigido fabricar un segundo `ItemGrant` en una subclase que el
    // catálogo no tiene, exactamente lo que esta tanda pide no hacer. La dimensión gemela que sí
    // es real y ya está cubierta, sin repetirla aquí: `resolve.spec.ts`,
    // "subclassKey — un personaje tiene una subclase, no todas (A8)" prueba ese mismo filtro
    // sobre los RASGOS de subclase (con nombre, sin `ItemGrant`) contra el catálogo real —
    // `resolve.ts` aplica exactamente el mismo `if (feature.level <= build.level)` y el mismo
    // filtro de subclase elegida a `concederActividadDe` que a `features.push`, así que es la
    // MISMA guarda, no una que se quede sin ejercitar. Queda declarado, no silenciado.

    it("a nivel 20 la Furia es ilimitada: siembra con `max: null` y un marcador finito en `current`, nunca el tramo de nivel 17", async () => {
      prisma.characterResource.upsert.mockResolvedValue({});
      const hoja = hojaDeBarbaro(20);
      expect(hoja.activities.find((a) => a.key === "rage")?.usos).toEqual({
        max: null,
        resetOn: "LONG_REST",
      });

      await service.seedResourcesFor(
        "c1",
        {
          classKey: "barbarian",
          spellSlots: [],
          spellSlotResetOn: "NONE",
          activities: hoja.activities,
        },
        20,
      );

      expect(prisma.characterResource.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { characterId_key: { characterId: "c1", key: "rage" } },
          // `1_000_000` es el marcador declarado junto a `MARCADOR_DE_USOS_SIN_TOPE`: no es una
          // cifra del SRD (que dice "Unlimited", no un número), es la deuda que deja escrita el
          // comentario de `resources.service.ts` — `current` es una columna `Int`, no admite
          // ausencia como sí admite `max`.
          create: expect.objectContaining({ max: null, current: 1_000_000 }),
        }),
      );
    });

    // Importante I4 (ronda de arreglo 1). Medido: sin esta rama, un bárbaro que ya tenía la fila
    // `rage` sembrada (nivel 19, con un uso gastado) y sube a nivel 20 recibía `update: { max:
    // null }` — el `current` finito de antes se quedaba tal cual, y ningún descanso vuelve a
    // tocar una fila con `max: null` (`RestService`, ficha `A11-usos-sin-tope`). «Sin tope» se
    // habría quedado, en la práctica, en el número de usos que le quedaran al subir de nivel,
    // para siempre.
    it("al subir a nivel 20, una fila `rage` YA EXISTENTE también se sube al marcador de sin tope, no solo `max`", async () => {
      prisma.characterResource.upsert.mockResolvedValue({});
      const hoja = hojaDeBarbaro(20);

      await service.seedResourcesFor(
        "c1",
        {
          classKey: "barbarian",
          spellSlots: [],
          spellSlotResetOn: "NONE",
          activities: hoja.activities,
        },
        20,
      );

      expect(prisma.characterResource.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { characterId_key: { characterId: "c1", key: "rage" } },
          // Aserción de identidad sobre la rama `update` completa: si alguien volviera a dejarla
          // en `{ max: null }` a secas, esto lo cazaría con el `current` que faltaría.
          update: { max: null, current: 1_000_000 },
        }),
      );
    });
  });

  describe("la siembra de la inspiración (I8)", () => {
    it("**se siembra a cero, con tope 1 y DM_ONLY**, y NO desde `seedResourcesFor`", async () => {
      // Va en su propio método porque **no viene de la clase**: la da el DM, a cualquiera, y
      // `seedResourcesFor` corre al terminar la ficha —cuando ya hay clase y nivel—, así que un
      // personaje recién creado se habría quedado sin ella justo cuando el DM más quiere darla.
      // A cero para que la hoja tenga algo que enseñar: sin fila, «no la tienes» y «este
      // personaje no sabe qué es la inspiración» se verían igual. Tope 1 porque el SRD dice
      // *«you either have inspiration or you don't»* — **y por eso no hace falta un booleano en
      // `Character`**: esta tabla ya es un contador con máximo.
      await service.seedInspirationFor("c1");
      expect(prisma.characterResource.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { characterId_key: { characterId: "c1", key: "inspiration" } },
          create: expect.objectContaining({
            current: 0,
            max: 1,
            resetOn: "NONE",
            grantedBy: "DM_ONLY",
          }),
          // **Lo que ya tenga NO se toca**: subir de nivel no regala ni quita inspiración.
          update: {},
        }),
      );
    });
  });

  describe("give() — regalar, que es un gesto del SRD", () => {
    beforeEach(() => {
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.character.findFirst.mockResolvedValue(character);
    });

    it("mueve las DOS filas en una sola transacción y deja UN suceso", async () => {
      // Con un gasto y una reposición sueltos, un fallo en medio deja la inspiración en los dos
      // personajes o en ninguno, y ninguna de las dos cosas se arregla mirando la pantalla.
      prisma.character.findFirst
        .mockResolvedValueOnce(character)
        .mockResolvedValueOnce({ id: "c2", name: "Sirella", visibility: "PLAYERS" });
      prisma.characterResource.findUnique
        .mockResolvedValueOnce({
          id: "r1",
          key: "inspiration",
          label: "Inspiración",
          current: 1,
          max: 1,
          resetOn: "NONE",
          grantedBy: "DM_ONLY",
        })
        .mockResolvedValueOnce(null);
      prisma.characterResource.update.mockResolvedValue({ id: "r1", current: 0 });
      prisma.characterResource.upsert.mockResolvedValue({ id: "r2", current: 1 });

      await service.give("owner1", "cmp1", "c1", "inspiration", {
        toCharacterId: "c2",
        amount: 1,
      });

      expect(prisma.transaction).toHaveBeenCalledTimes(1);
      expect(prisma.characterResource.update).toHaveBeenCalledWith({
        where: { id: "r1" },
        data: { current: 0 },
      });
      expect(prisma.characterResource.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ current: 1 }) }),
      );
      // **Un solo suceso, y con los dos nombres**: dos líneas sueltas no dirían que fue el mismo
      // gesto ni de quién a quién.
      expect(events.record).toHaveBeenCalledTimes(1);
      expect(events.record).toHaveBeenCalledWith(
        "owner1",
        "cmp1",
        expect.objectContaining({
          payload: expect.objectContaining({
            type: "RESOURCE_GIVEN",
            fromName: character.name,
            toName: "Sirella",
            remaining: 0,
          }),
        }),
        prisma,
      );
    });

    it("regalar lo que no se tiene es 409, y no escribe nada", async () => {
      prisma.character.findFirst
        .mockResolvedValueOnce(character)
        .mockResolvedValueOnce({ id: "c2", name: "Sirella", visibility: "PLAYERS" });
      prisma.characterResource.findUnique.mockResolvedValueOnce({
        id: "r1",
        key: "inspiration",
        label: "Inspiración",
        current: 0,
        max: 1,
        resetOn: "NONE",
        grantedBy: "DM_ONLY",
      });

      await expect(
        service.give("owner1", "cmp1", "c1", "inspiration", { toCharacterId: "c2", amount: 1 }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.transaction).not.toHaveBeenCalled();
    });

    it("**el destinatario se busca acotado por la campaña**, y fuera de ella es 404", async () => {
      // Sin el `campaignId` se podría pasar inspiración a un personaje de otra mesa. Y es 404, no
      // 403: un 403 confirmaría que ese personaje existe en algún sitio.
      prisma.character.findFirst.mockResolvedValueOnce(character).mockResolvedValueOnce(null);
      await expect(
        service.give("owner1", "cmp1", "c1", "inspiration", { toCharacterId: "ajeno", amount: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.character.findFirst).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ campaignId: "cmp1" }) }),
      );
    });

    it("regalárselo a sí mismo es 400: no es un gesto, es un no-op con dos escrituras", async () => {
      await expect(
        service.give("owner1", "cmp1", "c1", "inspiration", { toCharacterId: "c1", amount: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("el tope del destinatario manda: regalarle a quien ya la tiene NO la acumula", async () => {
      // SRD: se tiene o no se tiene. Lo que sobra no se devuelve — se regaló.
      prisma.character.findFirst
        .mockResolvedValueOnce(character)
        .mockResolvedValueOnce({ id: "c2", name: "Sirella", visibility: "PLAYERS" });
      prisma.characterResource.findUnique
        .mockResolvedValueOnce({
          id: "r1",
          key: "inspiration",
          label: "Inspiración",
          current: 1,
          max: 1,
          resetOn: "NONE",
          grantedBy: "DM_ONLY",
        })
        .mockResolvedValueOnce({ id: "r2", key: "inspiration", current: 1, max: 1 });
      prisma.characterResource.update.mockResolvedValue({ id: "r1", current: 0 });
      prisma.characterResource.upsert.mockResolvedValue({ id: "r2", current: 1 });

      await service.give("owner1", "cmp1", "c1", "inspiration", {
        toCharacterId: "c2",
        amount: 1,
      });

      expect(prisma.characterResource.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { current: 1 } }),
      );
    });
  });
});
