import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { MembershipService } from "../../campaigns/membership.service";
import { GameEventsService } from "../../game-events/game-events.service";
import { PrismaService } from "../../prisma/prisma.service";
import { StatblocksService } from "../../statblocks/statblocks.service";
import { ConditionsService } from "./conditions.service";

// Tarea 2A.12.

describe("ConditionsService", () => {
  let service: ConditionsService;
  const character = {
    id: "c1",
    name: "Thorin",
    ownerId: "owner1",
    visibility: "PLAYERS",
    campaignId: "cmp1",
  };
  const prisma = {
    character: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
    characterCondition: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    // 2C.4: el reloj de la campaña — la caducidad de una condición y el agotamiento que parte
    // los PG máximos se calculan contra él.
    campaign: { findUniqueOrThrow: jest.fn() },
    // Ayudar cuesta la acción de quien ayuda (ficha P1, puerta A — 2026-09-07): `help` busca al
    // combatiente del ayudante y le gasta la acción **dentro de la misma transacción**.
    combatant: { findFirst: jest.fn(), update: jest.fn() },
    transaction: jest.fn(),
  };
  const membership = { requireMember: jest.fn(), getMembership: jest.fn() };
  const events = { record: jest.fn() };
  const statblocks = { resolver: jest.fn() };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        ConditionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: GameEventsService, useValue: events },
        { provide: StatblocksService, useValue: statblocks },
      ],
    }).compile();
    service = ref.get(ConditionsService);
    jest.resetAllMocks();
    membership.requireMember.mockResolvedValue(undefined);
    prisma.character.findFirst.mockResolvedValue(character);
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    prisma.transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
    prisma.campaign.findUniqueOrThrow.mockResolvedValue({ id: "cmp1", clockSeconds: 0 });
    statblocks.resolver.mockResolvedValue(null);
    prisma.characterCondition.findMany.mockResolvedValue([]);
  });

  // ---------------------------------------------------------------------------------------
  // **Ayudar cuesta la acción de quien ayuda** — ficha P1, puerta A, cerrada el 2026-09-07.
  //
  // El agujero: `help` exige dueño-o-DM **del ayudante** y del ayudado solo que esté en la
  // campaña, y crear personajes no tiene tope. Así que **un jugador con dos personajes se daba
  // `helped` de uno al otro** indefinidamente.
  //
  // **La salida no es prohibirlo**, y eso ya estaba descartado con motivo: el SRD permite que dos
  // criaturas se ayuden, y que las lleve la misma persona no las convierte en una. Lo que el SRD
  // sí cobra es que Ayudar es una **acción**, y por tanto una por turno.
  //
  // **Y se hereda la doctrina del paso 2, no se inventa otra**: `EncountersService.gastar`
  // devuelve `excedido` y **no lanza nunca** — cuenta y avisa, no impide. Así que estas pruebas
  // miden **el aviso y el gasto**, no un 403. Se comprobó leyendo `encounters.service.ts:1277`
  // antes de escribir la aserción.
  describe("help() — Ayudar cuesta la acción", () => {
    const ayudado = { id: "c2", name: "Mira", visibility: "PLAYERS", campaignId: "cmp1" };

    beforeEach(() => {
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.character.findFirst
        .mockResolvedValueOnce({ ...character, name: "Bram" }) // el ayudante, por requireVisible
        .mockResolvedValueOnce(ayudado); // el ayudado
      prisma.characterCondition.upsert.mockResolvedValue({ key: "helped" });
    });

    it("en combate gasta la acción del ayudante", async () => {
      prisma.combatant.findFirst.mockResolvedValue({
        id: "cb1",
        actionUsed: false,
        encounterId: "enc1",
        // La sesión viaja con el encuentro: el suceso del gasto la necesita o el hilo
        // de la mesa no lo enseña nunca.
        encounter: { sessionId: "s1" },
      });
      prisma.combatant.update.mockResolvedValue({ id: "cb1", actionUsed: true });

      await service.help("owner1", "cmp1", "c1", { targetCharacterId: "c2" });

      expect(prisma.combatant.update).toHaveBeenCalledWith({
        where: { id: "cb1" },
        data: { actionUsed: true },
      });
    });

    it("**ayudar dos veces en el mismo turno lo DICE**: el segundo sale marcado como excedido", async () => {
      // La segunda vez el combatiente ya tiene la acción gastada. No se rechaza —esa es la
      // doctrina del paso 2— pero el suceso lo cuenta, que es lo que la mesa lee.
      prisma.combatant.findFirst.mockResolvedValue({
        id: "cb1",
        actionUsed: true,
        encounterId: "enc1",
        // La sesión viaja con el encuentro: el suceso del gasto la necesita o el hilo
        // de la mesa no lo enseña nunca.
        encounter: { sessionId: "s1" },
      });
      prisma.combatant.update.mockResolvedValue({ id: "cb1", actionUsed: true });

      await service.help("owner1", "cmp1", "c1", { targetCharacterId: "c2" });

      expect(events.record).toHaveBeenCalledWith(
        "owner1",
        "cmp1",
        expect.objectContaining({
          // **`sessionId` es la mitad del aviso**: sin él `GameEventsService.list` lo filtra fuera
          // y el hilo no lo enseña jamás, así que el gasto se anotaría en la columna y la mesa no
          // se enteraría — dejando a medias lo que esta ficha prometía, «cuenta y avisa».
          sessionId: "s1",
          payload: expect.objectContaining({
            type: "ACTION_SPENT",
            coste: "ACTION",
            excedido: true,
          }),
        }),
        expect.anything(),
      );
    });

    // **El supuesto declarado por el autor, 2026-09-07.** La economía vive en `Combatant`, o sea
    // solo dentro de un encuentro. Sin turnos no hay economía que cobrar, así que fuera de combate
    // `help` no gasta nada y no falla. La puerta se cierra donde importa, que es la pelea.
    it("fuera de combate no gasta nada y sigue funcionando", async () => {
      prisma.combatant.findFirst.mockResolvedValue(null);

      await service.help("owner1", "cmp1", "c1", { targetCharacterId: "c2" });

      expect(prisma.combatant.update).not.toHaveBeenCalled();
      expect(events.record).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          payload: expect.objectContaining({ type: "ACTION_SPENT" }),
        }),
        expect.anything(),
      );
    });
  });

  it("el dueño puede aplicar una condición sobre su propio personaje", async () => {
    // **La clave era `prone` y ahora es libre**, y no es un detalle de la prueba: desde el
    // 2026-09-06 un jugador no puede escribirse una condición **del SRD** sobre sí mismo, porque
    // el motor las lee para decidir tiradas. Lo que esta prueba defiende —que anotarse algo sobre
    // el propio personaje sigue funcionando— no ha cambiado.
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.characterCondition.upsert.mockResolvedValue({ key: "mojado" });

    await service.apply("owner1", "cmp1", "c1", { key: "mojado" });

    expect(prisma.characterCondition.upsert).toHaveBeenCalled();
    expect(events.record).toHaveBeenCalledWith(
      "owner1",
      "cmp1",
      expect.objectContaining({ payload: expect.objectContaining({ type: "CONDITION_APPLIED" }) }),
      prisma,
    );
  });

  it("el DM puede aplicar una condición a cualquier personaje visible", async () => {
    membership.getMembership.mockResolvedValue({ role: "DM" });
    prisma.characterCondition.upsert.mockResolvedValue({ key: "grappled" });

    await service.apply("dm1", "cmp1", "c1", { key: "grappled" });

    expect(prisma.characterCondition.upsert).toHaveBeenCalled();
  });

  // **Un jugador puede ponerse una nota; no puede concederse una mecánica** (paso 1, tarea 1).
  //
  // La autorización de arriba es correcta y no se toca: que alguien se tumbe sobre su propio
  // personaje está bien. El agujero era otro — **la clave es texto libre** y sin `durationSeconds`
  // la condición es indefinida, así que `PUT …/conditions/helped` daba **ventaja permanente y
  // renovable en todos los ataques**, saltándose los tres controles de la acción Ayudar:
  // `ayudaViva` busca esa marca **solo por clave**, sin mirar quién la puso.
  //
  // La regla NO es «las quince del SRD se prohíben»: el DM envenena a alguien por esta ruta y eso
  // tiene que seguir funcionando. Es **el DM sí, el jugador sobre sí mismo no**, y `helped`
  // **nadie**.

  it("un jugador no puede aplicarse `helped` a sí mismo", async () => {
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    await expect(service.apply("owner1", "cmp1", "c1", { key: "helped" })).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.characterCondition.upsert).not.toHaveBeenCalled();
  });

  it("el DM tampoco: la marca la pone la acción Ayudar, no una ruta genérica", async () => {
    membership.getMembership.mockResolvedValue({ role: "DM" });
    await expect(service.apply("dm1", "cmp1", "c1", { key: "helped" })).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.characterCondition.upsert).not.toHaveBeenCalled();
  });

  it("una condición del SRD no entra a mano por esta puerta si quien llama es el jugador", async () => {
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    await expect(service.apply("owner1", "cmp1", "c1", { key: "poisoned" })).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.characterCondition.upsert).not.toHaveBeenCalled();
  });

  it("pero el DM SÍ se la aplica: es como se envenena a alguien en la mesa", async () => {
    membership.getMembership.mockResolvedValue({ role: "DM" });
    prisma.characterCondition.upsert.mockResolvedValue({ key: "poisoned" });

    await service.apply("dm1", "cmp1", "c1", { key: "poisoned" });

    expect(prisma.characterCondition.upsert).toHaveBeenCalled();
  });

  // Ronda de arreglo 1 de A11, crítico 2 — `raging` se volvió clave reservada
  // (`esClaveReservada`, `@dnd/shared`) para cerrar exactamente este agujero: sin ella, un
  // jugador podía escribirse `{ key: "raging" }` sobre su propio personaje —es su ficha,
  // `requireOwnerOrDM` no lo para— y llevarse el +2 de daño de la Furia (`bonoDeFuria`,
  // `character-sheet.service.ts`) sin gastar la acción adicional ni un uso.
  it("un jugador no puede escribirse `raging` a sí mismo por la puerta genérica de condiciones", async () => {
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    await expect(service.apply("owner1", "cmp1", "c1", { key: "raging" })).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.characterCondition.upsert).not.toHaveBeenCalled();
  });

  it("el DM SÍ se la aplica por esta puerta, igual que `poisoned`: es el mismo caso, la mesa arbitrando a mano", async () => {
    membership.getMembership.mockResolvedValue({ role: "DM" });
    prisma.characterCondition.upsert.mockResolvedValue({ key: "raging" });

    await service.apply("dm1", "cmp1", "c1", { key: "raging" });

    expect(prisma.characterCondition.upsert).toHaveBeenCalled();
  });

  it("y un jugador, sin ser DM, SÍ la recibe cuando `concedidoPorActividad` lo dice: es la puerta que usa una actividad ya validada, nunca HTTP", async () => {
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.characterCondition.upsert.mockResolvedValue({ key: "raging" });

    await service.apply("owner1", "cmp1", "c1", { key: "raging" }, undefined, {
      concedidoPorActividad: true,
    });

    expect(prisma.characterCondition.upsert).toHaveBeenCalled();
  });

  // Tarea 16 (H1b) — `stable` se volvió clave reservada por la misma razón que `raging`: sin
  // esta reserva, un jugador a 0 PG podía escribirse `{ key: "stable" }` sobre sí mismo y saltarse
  // las tres tiradas de salvación de muerte que el SRD exige.
  it("un jugador no puede escribirse `stable` a sí mismo por la puerta genérica de condiciones", async () => {
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    await expect(service.apply("owner1", "cmp1", "c1", { key: "stable" })).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.characterCondition.upsert).not.toHaveBeenCalled();
  });

  it("una nota propia sin efecto mecánico sigue funcionando", async () => {
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.characterCondition.upsert.mockResolvedValue({ key: "mojado" });

    const c = await service.apply("owner1", "cmp1", "c1", {
      key: "mojado",
      note: "Me caí al río",
    });

    expect(c.key).toBe("mojado");
  });

  // **Una inmunidad que nadie consulta es prosa** (paso 1, tarea 2). El statblock del que sale un
  // PNJ ya declara a qué es inmune; hasta el 2026-09-06 nadie leía el campo, así que **se podía
  // envenenar a un esqueleto**.

  it("aplicar `poisoned` a un esqueleto se rechaza con motivo legible", async () => {
    membership.getMembership.mockResolvedValue({ role: "DM" });
    prisma.character.findFirst.mockResolvedValue({
      ...character,
      name: "Esqueleto",
      statblockRef: "SRD:skeleton",
    });
    statblocks.resolver.mockResolvedValue({ conditionImmunities: ["poisoned", "exhaustion"] });

    // **El tipo Y el motivo.** Solo con `/inmune/i` esta prueba pasaría con cualquier excepción
    // que llevara esa palabra, incluida una de otro control.
    await expect(service.apply("dm1", "cmp1", "c1", { key: "poisoned" })).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.apply("dm1", "cmp1", "c1", { key: "poisoned" })).rejects.toThrow(
      /inmune/i,
    );
    expect(prisma.characterCondition.upsert).not.toHaveBeenCalled();
  });

  it("una condición a la que no es inmune sigue entrando", async () => {
    membership.getMembership.mockResolvedValue({ role: "DM" });
    prisma.character.findFirst.mockResolvedValue({
      ...character,
      name: "Esqueleto",
      statblockRef: "SRD:skeleton",
    });
    statblocks.resolver.mockResolvedValue({ conditionImmunities: ["poisoned"] });
    prisma.characterCondition.upsert.mockResolvedValue({ key: "prone" });

    const c = await service.apply("dm1", "cmp1", "c1", { key: "prone" });

    expect(c.key).toBe("prone");
  });

  it("un personaje jugador no tiene statblock: para él la lista está vacía y nada cambia", async () => {
    membership.getMembership.mockResolvedValue({ role: "DM" });
    prisma.characterCondition.upsert.mockResolvedValue({ key: "poisoned" });

    await service.apply("dm1", "cmp1", "c1", { key: "poisoned" });

    expect(prisma.characterCondition.upsert).toHaveBeenCalled();
    // Ni siquiera se pregunta por un statblock que no existe.
    expect(statblocks.resolver).not.toHaveBeenCalled();
  });

  // **SRD 5.1, «Concentration»:** *«Casting another spell that requires concentration. You lose
  // concentration on a spell if you cast another spell that requires concentration. **You can't
  // concentrate on two spells at once.**»* El `upsert` es por clave exacta y cada conjuro genera
  // la suya, así que hasta el 2026-09-06 dos conjuros eran dos filas y **convivían** — y con dos
  // vivas `changeHp` pedía **una sola** salvación, porque `estaConcentrado` devuelve un booleano.
  // Retirando la anterior al empezar la siguiente, el segundo defecto desaparece solo.

  it("empezar una segunda concentración retira la primera", async () => {
    membership.getMembership.mockResolvedValue({ role: "DM" });
    prisma.characterCondition.findMany.mockResolvedValue([
      { id: "cc-bless", key: "concentrating:bless" },
    ]);
    prisma.characterCondition.upsert.mockResolvedValue({ key: "concentrating:hold-person" });

    await service.apply("dm1", "cmp1", "c1", { key: "concentrating:hold-person" });

    expect(prisma.characterCondition.delete).toHaveBeenCalledWith({ where: { id: "cc-bless" } });
  });

  it("y el registro dice cuál se perdió", async () => {
    membership.getMembership.mockResolvedValue({ role: "DM" });
    prisma.characterCondition.findMany.mockResolvedValue([
      { id: "cc-bless", key: "concentrating:bless" },
    ]);
    prisma.characterCondition.upsert.mockResolvedValue({ key: "concentrating:hold-person" });

    await service.apply("dm1", "cmp1", "c1", { key: "concentrating:hold-person" });

    expect(events.record).toHaveBeenCalledWith(
      "dm1",
      "cmp1",
      expect.objectContaining({
        payload: { type: "CONDITION_REMOVED", key: "concentrating:bless" },
      }),
      prisma,
    );
  });

  it("renovar LA MISMA concentración no la retira a sí misma", async () => {
    // El `upsert` ya la reemplaza; borrarla antes dejaría un suceso de pérdida que no ocurrió.
    membership.getMembership.mockResolvedValue({ role: "DM" });
    prisma.characterCondition.findMany.mockResolvedValue([]);
    prisma.characterCondition.upsert.mockResolvedValue({ key: "concentrating:bless" });

    await service.apply("dm1", "cmp1", "c1", { key: "concentrating:bless" });

    expect(prisma.characterCondition.delete).not.toHaveBeenCalled();
  });

  it("una condición que NO es de concentración no toca las concentraciones vivas", async () => {
    membership.getMembership.mockResolvedValue({ role: "DM" });
    prisma.characterCondition.upsert.mockResolvedValue({ key: "poisoned" });

    await service.apply("dm1", "cmp1", "c1", { key: "poisoned" });

    expect(prisma.characterCondition.findMany).not.toHaveBeenCalled();
    expect(prisma.characterCondition.delete).not.toHaveBeenCalled();
  });

  it("otro jugador que no es dueño ni DM no puede aplicar una condición", async () => {
    // **La clave es LIBRE a propósito, y el mensaje se afirma.** Con una del SRD esta prueba
    // seguiría verde aunque se borrara `requireOwnerOrDM`, porque la pararía el control de clave
    // reservada: sería la única prueba de propiedad de este servicio midiendo otra cosa. Es el
    // fallo que este proyecto ya se comió una vez —un 403 de otro servicio dando por buena una
    // mutación— y por eso aquí se comprueba la causa y no el número.
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    await expect(service.apply("otro-jugador", "cmp1", "c1", { key: "mojado" })).rejects.toThrow(
      /Solo el DM o el dueño/,
    );
    expect(prisma.characterCondition.upsert).not.toHaveBeenCalled();
  });

  it("quitar una condición del SRD también es del DM: poner y quitar son la misma concesión", async () => {
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.characterCondition.findUnique.mockResolvedValue({ id: "cond1", key: "poisoned" });

    await expect(service.remove("owner1", "cmp1", "c1", "poisoned")).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.characterCondition.delete).not.toHaveBeenCalled();
  });

  // Ronda de arreglo 2 — SRD 5.1, «Rage»: *"You can also end your rage on your turn as a bonus
  // action."* Las reglas de D&D son verdad absoluta en este proyecto, y `raging` se volvió clave
  // reservada en la ronda de arreglo 1 sin dejarle al jugador esta puerta — lo cazó la
  // re-revisión, no mi propio informe.
  it("el dueño SÍ puede quitarse `raging` si fue ÉL quien la puso (appliedById === userId)", async () => {
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.characterCondition.findUnique.mockResolvedValue({
      id: "cond-furia",
      key: "raging",
      appliedById: "owner1",
    });
    prisma.characterCondition.delete.mockResolvedValue({ id: "cond-furia" });

    await service.remove("owner1", "cmp1", "c1", "raging");

    expect(prisma.characterCondition.delete).toHaveBeenCalledWith({ where: { id: "cond-furia" } });
  });

  // El reverso: el mismo jugador, la MISMA clave reservada, pero puesta por el DM — el veneno
  // que le acaba de echar el DM sigue exigiendo al DM para quitarlo. `appliedById` es del DM, no
  // suyo, así que la excepción de arriba no aplica.
  it("pero NO puede quitarse un `raging`/`poisoned` que puso el DM: `appliedById` decide, no la clave", async () => {
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.characterCondition.findUnique.mockResolvedValue({
      id: "cond-veneno",
      key: "poisoned",
      appliedById: "dm1",
    });

    await expect(service.remove("owner1", "cmp1", "c1", "poisoned")).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.characterCondition.delete).not.toHaveBeenCalled();
  });

  it("pero el dueño sí se quita una nota suya", async () => {
    membership.getMembership.mockResolvedValue({ role: "PLAYER" });
    prisma.characterCondition.findUnique.mockResolvedValue({ id: "cond2", key: "mojado" });
    prisma.characterCondition.delete.mockResolvedValue({ id: "cond2" });

    await service.remove("owner1", "cmp1", "c1", "mojado");

    expect(prisma.characterCondition.delete).toHaveBeenCalledWith({ where: { id: "cond2" } });
  });

  it("el agotamiento lleva su nivel, y una condición sin nivel lo guarda como null", async () => {
    membership.getMembership.mockResolvedValue({ role: "DM" });
    prisma.characterCondition.upsert.mockResolvedValue({ key: "exhaustion", level: 3 });

    await service.apply("dm1", "cmp1", "c1", { key: "exhaustion", level: 3 });

    expect(prisma.characterCondition.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ level: 3 }) }),
    );
  });

  // D-CF-14, commit 5 (J5). SRD 5.1, tabla de agotamiento, nivel 6: «Death». Hasta esta tarea la
  // muerte por agotamiento se DERIVABA (`estadoDeMuerte`) y nunca se registraba.
  describe("el agotamiento nivel 6 registra CHARACTER_DIED", () => {
    it('llegar a nivel 6 desde uno más bajo registra el suceso con cause "exhaustion"', async () => {
      membership.getMembership.mockResolvedValue({ role: "DM" });
      // Sin condición previa (`findUnique` sin mock devuelve `undefined`): el nivel de partida es 0.
      prisma.characterCondition.upsert.mockResolvedValue({ key: "exhaustion", level: 6 });

      await service.apply("dm1", "cmp1", "c1", { key: "exhaustion", level: 6 });

      expect(events.record).toHaveBeenCalledWith(
        "dm1",
        "cmp1",
        expect.objectContaining({
          payload: expect.objectContaining({
            type: "CHARACTER_DIED",
            characterId: "c1",
            name: "Thorin",
            cause: "exhaustion",
          }),
        }),
        expect.anything(),
      );
    });

    it("un nivel por debajo de 6 no registra la muerte", async () => {
      membership.getMembership.mockResolvedValue({ role: "DM" });
      prisma.characterCondition.upsert.mockResolvedValue({ key: "exhaustion", level: 3 });

      await service.apply("dm1", "cmp1", "c1", { key: "exhaustion", level: 3 });

      const muertes = events.record.mock.calls.filter(
        (llamada) => llamada[2].payload.type === "CHARACTER_DIED",
      );
      expect(muertes).toHaveLength(0);
    });

    it("volver a aplicar nivel 6 estando YA en nivel 6 no repite el suceso", async () => {
      membership.getMembership.mockResolvedValue({ role: "DM" });
      prisma.characterCondition.findUnique.mockResolvedValue({ key: "exhaustion", level: 6 });
      prisma.characterCondition.upsert.mockResolvedValue({ key: "exhaustion", level: 6 });

      await service.apply("dm1", "cmp1", "c1", { key: "exhaustion", level: 6 });

      const muertes = events.record.mock.calls.filter(
        (llamada) => llamada[2].payload.type === "CHARACTER_DIED",
      );
      expect(muertes).toHaveLength(0);
    });
  });

  it("una clave que no es de las quince del SRD se guarda igual", async () => {
    membership.getMembership.mockResolvedValue({ role: "DM" });
    prisma.characterCondition.upsert.mockResolvedValue({ key: "concentrating-on-bless" });

    await service.apply("dm1", "cmp1", "c1", { key: "concentrating-on-bless", note: "Bendición" });

    expect(prisma.characterCondition.upsert).toHaveBeenCalled();
  });

  it("quitar una condición inexistente es 404", async () => {
    membership.getMembership.mockResolvedValue({ role: "DM" });
    prisma.characterCondition.findUnique.mockResolvedValue(null);
    await expect(service.remove("dm1", "cmp1", "c1", "prone")).rejects.toThrow();
  });

  it("quitar escribe CONDITION_REMOVED", async () => {
    membership.getMembership.mockResolvedValue({ role: "DM" });
    prisma.characterCondition.findUnique.mockResolvedValue({ id: "cond1", key: "prone" });
    prisma.characterCondition.delete.mockResolvedValue({ id: "cond1" });

    await service.remove("dm1", "cmp1", "c1", "prone");

    expect(prisma.characterCondition.delete).toHaveBeenCalledWith({ where: { id: "cond1" } });
    expect(events.record).toHaveBeenCalledWith(
      "dm1",
      "cmp1",
      expect.objectContaining({ payload: { type: "CONDITION_REMOVED", key: "prone" } }),
      prisma,
    );
  });

  // **Ficha P2-0 — con `tx`, `apply` no puede pedir una segunda conexión del pool.**
  //
  // `ActivitiesService.usar` llama a `apply` **con** el `tx` de su propia transacción. Todo lo
  // que `apply` hace antes de escribir —buscar el personaje, resolver el visor, leer las
  // inmunidades de su statblock— iba contra `this.prisma`, o sea contra una conexión distinta de
  // la que ya está ocupada: exactamente lo que el patrón `tx?` existe para evitar.
  //
  // La prueba mira **qué cliente recibió cada consulta**, no el resultado: el resultado era
  // correcto antes y después, y por eso ninguna prueba lo cazaba.
  it("con `tx`, la autorización y las inmunidades van contra ESE cliente y no contra el pool", async () => {
    membership.getMembership.mockResolvedValue({ role: "DM" });
    const pnj = { ...character, statblockRef: "SRD:goblin" };
    const tx = {
      character: { findFirst: jest.fn().mockResolvedValue(pnj) },
      user: { findUnique: jest.fn().mockResolvedValue({ isAdmin: false }) },
      campaign: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "cmp1", clockSeconds: 0 }) },
      characterCondition: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({ key: "poisoned" }),
        delete: jest.fn(),
      },
    };
    statblocks.resolver.mockResolvedValue({ conditionImmunities: [] });

    await service.apply("dm1", "cmp1", "c1", { key: "poisoned" }, tx as never);

    expect(tx.character.findFirst).toHaveBeenCalled();
    expect(tx.user.findUnique).toHaveBeenCalled();
    expect(prisma.character.findFirst).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    // Y la lectura del statblock, que es la tercera consulta de la lista, va por el mismo sitio.
    expect(statblocks.resolver).toHaveBeenCalledWith("cmp1", "SRD:goblin", undefined, tx);
  });
});

describe("condiciones con duración (2C.4)", () => {
  // La decisión D-2C-2 del autor: **vence sola, pero no se borra** — queda marcada como vencida y
  // el DM la retira o la renueva. Si desapareciera, el jugador vería cambiar sus números sin saber
  // por qué, y el DM tendría que llevar la cuenta a mano, que es volver al papel.

  let service: ConditionsService;
  const character = {
    id: "ch1",
    ownerId: "owner1",
    campaignId: "cmp1",
    visibility: "PLAYERS",
  };
  const prisma = {
    character: { findFirst: jest.fn() },
    characterCondition: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    campaign: { findUniqueOrThrow: jest.fn() },
    user: { findUnique: jest.fn() },
    transaction: jest.fn(),
  };
  const membership = { requireMember: jest.fn(), getMembership: jest.fn() };
  const events = { record: jest.fn() };

  async function montar(clockSeconds: number) {
    const ref = await Test.createTestingModule({
      providers: [
        ConditionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membership },
        { provide: GameEventsService, useValue: events },
        // Obligatorio desde el paso 1, tarea 2: aplicar una condición pregunta a qué es inmune el
        // statblock del que salió el personaje. Aquí no hay ninguno y devuelve `null`.
        { provide: StatblocksService, useValue: { resolver: jest.fn().mockResolvedValue(null) } },
      ],
    }).compile();
    service = ref.get(ConditionsService);
    jest.resetAllMocks();
    membership.requireMember.mockResolvedValue({ role: "DM" });
    membership.getMembership.mockResolvedValue({ role: "DM" });
    prisma.character.findFirst.mockResolvedValue(character);
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    prisma.campaign.findUniqueOrThrow.mockResolvedValue({ id: "cmp1", clockSeconds });
    prisma.characterCondition.upsert.mockResolvedValue({ id: "cc1" });
    prisma.transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
    return { service, prisma, events };
  }

  it("**la duración se guarda como el instante en que vence**, no como «dura una hora»", async () => {
    // Guardar la duración obligaría a guardar también «desde cuándo», y ese segundo dato puede
    // discrepar del primero. Con el instante, «¿sigue viva?» es una resta.
    const { service, prisma } = await montar(1000);
    await service.apply("dm", "cmp1", "ch1", { key: "poisoned", durationSeconds: 3600 });
    expect(prisma.characterCondition.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ expiresAtClock: 4600 }),
      }),
    );
  });

  it("sin duración queda indefinida, que es como funcionaba y sigue siendo lo correcto", async () => {
    const { service, prisma } = await montar(1000);
    await service.apply("dm", "cmp1", "ch1", { key: "poisoned" });
    expect(prisma.characterCondition.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ expiresAtClock: null }) }),
    );
  });

  it("**volver a aplicarla sin duración la deja indefinida**, no hereda la caducidad de antes", async () => {
    // Si el `null` no se escribiera en el `update`, una condición renovada se apagaría sola sin
    // que nadie lo hubiera pedido.
    const { service, prisma } = await montar(1000);
    await service.apply("dm", "cmp1", "ch1", { key: "poisoned" });
    expect(prisma.characterCondition.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ expiresAtClock: null }) }),
    );
  });

  it("listar dice cuál venció **sin borrarla**: sigue ahí, marcada", async () => {
    const { service, prisma } = await montar(7200);
    prisma.characterCondition.findMany.mockResolvedValue([
      { id: "a", key: "poisoned", expiresAtClock: 3600 },
      { id: "b", key: "prone", expiresAtClock: null },
    ]);
    const lista = await service.list("dm", "cmp1", "ch1");
    expect(lista).toHaveLength(2);
    expect(lista[0]).toMatchObject({ key: "poisoned", expired: true });
    expect(lista[1]).toMatchObject({ key: "prone", expired: false });
  });
});
