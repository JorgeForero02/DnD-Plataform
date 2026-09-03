import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { CreateRollInput, RollResult, RollResultRevealed } from "@dnd/shared";
import type { Roller } from "../dice/dice";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { PrismaService } from "../prisma/prisma.service";
import { conVentaja, RollsService } from "./rolls.service";

// Tarea 2A.13.
//
// El tirador se inyecta, así que **estas pruebas no dependen del azar**: se le dice qué sale y
// se comprueba qué se clasifica. Probar la clasificación con dados reales sería una prueba que
// falla una vez cada veinte ejecuciones, que es peor que no tenerla.

/** Devuelve los valores dados, en orden, y luego repite el último. */
function dadosFijos(...valores: number[]): Roller {
  let i = 0;
  return () => valores[Math.min(i++, valores.length - 1)];
}

function montar(roller: Roller) {
  const prisma = {
    character: { findFirst: jest.fn() },
    session: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  const membership = { requireMember: jest.fn(), getMembership: jest.fn() };
  const events = { record: jest.fn(), list: jest.fn() };
  const service = new RollsService(
    prisma as unknown as PrismaService,
    membership as unknown as MembershipService,
    events as unknown as GameEventsService,
    roller,
  );
  const tirar = (userId: string, campaignId: string, input: CreateRollInput) =>
    service.roll(userId, campaignId, input).then(revelada);
  membership.requireMember.mockResolvedValue({ role: "PLAYER" });
  membership.getMembership.mockResolvedValue({ role: "PLAYER" });
  prisma.session.findFirst.mockResolvedValue(null);
  events.record.mockResolvedValue({ id: "e1" });
  prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
  return { service, prisma, membership, events, tirar };
}

/**
 * Estrecha el resultado a la variante **revelada**.
 *
 * Desde 2C.1 `roll` devuelve una unión discriminada: una tirada a ciegas hecha por un jugador
 * **no trae el desglose**, y el compilador no deja leer `total` sin haber mirado `revealed`. Eso
 * es deliberado —es la mitad que cerraba el agujero de la tirada ciega—, así que las pruebas que
 * miran el desglose dicen aquí que esperan verlo, en vez de castear y perder la comprobación.
 */
function revelada(r: RollResult): RollResultRevealed {
  if (!r.revealed) throw new Error("se esperaba una tirada visible para quien la hizo");
  return r;
}

describe("los cuatro resultados se clasifican bien", () => {
  it("sin CD, el resultado es NO_DC — y eso no es un fallo", () => {
    // En la mesa se tira muchas veces sin CD: daño, iniciativa, un dado a secas.
    return montar(dadosFijos(11))
      .tirar("u1", "c1", { expression: "d20", audience: "PUBLIC", mode: "NORMAL" })
      .then((r) => {
        expect(r.outcome).toBe("NO_DC");
        expect(r.natural).toBe("NONE");
        expect(r.total).toBe(11);
      });
  });

  it("con CD, alcanzarla es SUCCESS; quedarse a uno es FAILURE", async () => {
    const alcanza = await montar(dadosFijos(15)).tirar("u1", "c1", {
      expression: "d20",
      dc: 15,
      audience: "PUBLIC",
      mode: "NORMAL" as const,
    });
    const falla = await montar(dadosFijos(14)).tirar("u1", "c1", {
      expression: "d20",
      dc: 15,
      audience: "PUBLIC",
      mode: "NORMAL" as const,
    });
    expect(alcanza.outcome).toBe("SUCCESS");
    expect(falla.outcome).toBe("FAILURE");
  });

  it("**un 20 natural que no llega a la CD sigue siendo un 20 natural**", async () => {
    // Son dos hechos distintos y por eso son dos campos. Meterlos en uno obliga a perder uno.
    const r = await montar(dadosFijos(20)).tirar("u1", "c1", {
      expression: "d20-15",
      dc: 20,
      audience: "PUBLIC",
      mode: "NORMAL" as const,
    });
    expect(r.natural).toBe("TWENTY");
    expect(r.outcome).toBe("FAILURE");
    expect(r.total).toBe(5);
  });

  it("y un 1 natural que supera la CD sigue siendo un 1 natural", async () => {
    const r = await montar(dadosFijos(1)).tirar("u1", "c1", {
      expression: "d20+20",
      dc: 10,
      audience: "PUBLIC",
      mode: "NORMAL" as const,
    });
    expect(r.natural).toBe("ONE");
    expect(r.outcome).toBe("SUCCESS");
  });
});

describe("qué cuenta como natural, y qué no", () => {
  it("con ventaja, el natural es el dado que se CONSERVA, no el que se descarta", async () => {
    const r = await montar(dadosFijos(20, 3)).tirar("u1", "c1", {
      expression: "2d20kh1",
      audience: "PUBLIC",
      mode: "NORMAL" as const,
    });
    expect(r.natural).toBe("TWENTY");
    expect(r.kept).toEqual([20]);
    // Lo descartado **no se pierde**: se enseña.
    expect(r.dropped).toEqual([3]);
  });

  it("con desventaja, un 20 descartado NO es un 20 natural", async () => {
    const r = await montar(dadosFijos(20, 2)).tirar("u1", "c1", {
      expression: "2d20kl1",
      audience: "PUBLIC",
      mode: "NORMAL" as const,
    });
    expect(r.natural).toBe("NONE");
    expect(r.kept).toEqual([2]);
    expect(r.dropped).toEqual([20]);
  });

  it("un d6 no produce naturales, aunque saque un 1", async () => {
    const r = await montar(dadosFijos(1)).tirar("u1", "c1", {
      expression: "1d6",
      audience: "PUBLIC",
      mode: "NORMAL" as const,
    });
    expect(r.natural).toBe("NONE");
  });

  it("tres d20 a la vez no tienen un natural que cantar, y se dice NONE en vez de elegir uno", async () => {
    const r = await montar(dadosFijos(20, 1, 7)).tirar("u1", "c1", {
      expression: "3d20",
      audience: "PUBLIC",
      mode: "NORMAL" as const,
    });
    expect(r.natural).toBe("NONE");
  });
});

describe("lo que se devuelve y lo que se escribe", () => {
  it("separa los dados del modificador, con su signo", async () => {
    const { tirar } = montar(dadosFijos(4, 5));
    const r = await tirar("u1", "c1", {
      expression: "2d6+3",
      audience: "PUBLIC",
      mode: "NORMAL",
    });
    expect(r.rolls).toEqual([4, 5]);
    expect(r.modifier).toBe(3);
    expect(r.total).toBe(12);
  });

  it("un modificador negativo cuenta con su signo", async () => {
    const { tirar } = montar(dadosFijos(10));
    const r = await tirar("u1", "c1", {
      expression: "d20-2",
      audience: "PUBLIC",
      mode: "NORMAL",
    });
    expect(r.modifier).toBe(-2);
    expect(r.total).toBe(8);
  });

  it("escribe un GameEvent de tipo ABILITY_ROLL con el nivel que deriva de la audiencia", async () => {
    // **La audiencia entra, el nivel sale.** Quien pide la tirada dice «a ciegas»; lo que se
    // guarda es `DM_ONLY`, y esa traducción vive una sola vez (`VISIBILIDAD_POR_AUDIENCIA`).
    const { service, events } = montar(dadosFijos(12));
    await service.roll("u1", "c1", {
      expression: "d20",
      label: "Percepción",
      audience: "BLIND",
      mode: "NORMAL" as const,
    });
    expect(events.record).toHaveBeenCalledWith(
      "u1",
      "c1",
      expect.objectContaining({
        visibility: "DM_ONLY",
        payload: expect.objectContaining({ type: "ABILITY_ROLL", reason: "Percepción" }),
      }),
    );
  });

  it("una expresión inválida es 400 con su motivo, y NO se escribe nada en el log", async () => {
    const { service, events } = montar(dadosFijos(1));
    await expect(
      service.roll("u1", "c1", { expression: "4d", audience: "PUBLIC", mode: "NORMAL" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(events.record).not.toHaveBeenCalled();
  });
});

describe("la sesión de la tirada", () => {
  it("sin decirla, se usa la que esté en curso", async () => {
    const { service, prisma, events } = montar(dadosFijos(9));
    prisma.session.findFirst.mockResolvedValue({ id: "s-en-curso" });
    await service.roll("u1", "c1", { expression: "d20", audience: "PUBLIC", mode: "NORMAL" });
    expect(events.record.mock.calls[0][2]).toMatchObject({ sessionId: "s-en-curso" });
  });

  it("sin sesión abierta, la tirada queda fuera de sesión en vez de fallar", async () => {
    const { service, events } = montar(dadosFijos(9));
    await service.roll("u1", "c1", { expression: "d20", audience: "PUBLIC", mode: "NORMAL" });
    expect(events.record.mock.calls[0][2]).toMatchObject({ sessionId: null });
  });

  it("una sesión que no es de esta campaña es 404", async () => {
    const { service, prisma } = montar(dadosFijos(9));
    prisma.session.findFirst.mockResolvedValue(null);
    await expect(
      service.roll("u1", "c1", {
        expression: "d20",
        sessionId: "s-ajena",
        audience: "PUBLIC",
        mode: "NORMAL",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("tirar por un personaje se comprueba en el servidor", () => {
  it("el dueño puede", async () => {
    const { service, prisma, events } = montar(dadosFijos(9));
    prisma.character.findFirst.mockResolvedValue({ id: "ch1", ownerId: "u1" });
    await service.roll("u1", "c1", {
      expression: "d20",
      characterId: "ch1",
      audience: "PUBLIC",
      mode: "NORMAL" as const,
    });
    expect(events.record.mock.calls[0][2]).toMatchObject({
      subjectType: "character",
      subjectId: "ch1",
    });
  });

  it("el DM también, aunque no sea suyo", async () => {
    const { service, prisma, membership } = montar(dadosFijos(9));
    prisma.character.findFirst.mockResolvedValue({ id: "ch1", ownerId: "otro" });
    membership.getMembership.mockResolvedValue({ role: "DM" });
    await expect(
      service.roll("dm", "c1", {
        expression: "d20",
        characterId: "ch1",
        audience: "PUBLIC",
        mode: "NORMAL",
      }),
    ).resolves.toBeDefined();
  });

  it("otro jugador NO puede tirar por la hoja ajena", async () => {
    const { service, prisma, events } = montar(dadosFijos(9));
    prisma.character.findFirst.mockResolvedValue({ id: "ch1", ownerId: "otro" });
    await expect(
      service.roll("u1", "c1", {
        expression: "d20",
        characterId: "ch1",
        audience: "PUBLIC",
        mode: "NORMAL",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(events.record).not.toHaveBeenCalled();
  });

  it("un personaje de otra campaña es 404, no 403: no se confirma que exista", async () => {
    const { service, prisma } = montar(dadosFijos(9));
    prisma.character.findFirst.mockResolvedValue(null);
    await expect(
      service.roll("u1", "c1", {
        expression: "d20",
        characterId: "ch9",
        audience: "PUBLIC",
        mode: "NORMAL",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("quien no es miembro no llega ni a tirar", async () => {
    const { service, membership, events } = montar(dadosFijos(9));
    membership.requireMember.mockRejectedValue(new ForbiddenException());
    await expect(
      service.roll("x", "c1", { expression: "d20", audience: "PUBLIC", mode: "NORMAL" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(events.record).not.toHaveBeenCalled();
  });
});

describe("ventaja y desventaja — la regla la compone el servidor", () => {
  // El plan de 2A las dejó fuera («aquí `kh1` es solo sintaxis») cuando no había pantalla. Con
  // pantalla es insostenible: salen en casi todos los turnos, y sin esto el jugador sale de la
  // hoja a escribir `2d20kh1+3` a mano. Se compone en el servidor porque es una regla del juego:
  // un cliente que mandara la expresión ya montada podría decir «con ventaja» y tirar `3d20kh1`.

  it("ventaja convierte el d20 en 2d20kh1, y el modificador se conserva", () => {
    expect(conVentaja("d20+3", "ADVANTAGE")).toBe("2d20kh1+3");
    expect(conVentaja("1d20", "ADVANTAGE")).toBe("2d20kh1");
  });

  it("desventaja se queda el peor", () => {
    expect(conVentaja("d20+5", "DISADVANTAGE")).toBe("2d20kl1+5");
  });

  it("en modo normal la expresión no se toca", () => {
    expect(conVentaja("d20+3", "NORMAL")).toBe("d20+3");
  });

  it("pedir ventaja sobre algo que no es un d20 suelto no inventa nada", () => {
    // `4d6kh3` es una tirada de características y `2d8` es daño: «con ventaja» no significa nada
    // ahí, e inventarle un significado sería peor que ignorarlo.
    expect(conVentaja("4d6kh3", "ADVANTAGE")).toBe("4d6kh3");
    expect(conVentaja("2d8+2", "ADVANTAGE")).toBe("2d8+2");
  });

  it("la tirada guarda la expresión que DE VERDAD se tiró, no la que se pidió", async () => {
    const { tirar } = montar(dadosFijos(11, 17));

    const r = await tirar("u1", "c1", {
      expression: "d20+2",
      audience: "PUBLIC",
      mode: "ADVANTAGE",
    });

    expect(r.expression).toContain("2d20kh1");
    expect(r.total).toBe(19); // se queda el 17, no el 11
    expect(r.dropped).toContain(11);
  });
});

describe("los modos de tirada, y el agujero de la tirada a ciegas (2C.1)", () => {
  // El vocabulario se copia de Foundry, que lleva años con él: pública, privada del DM y ciega
  // del DM (https://foundryvtt.com/article/dice/). El cuarto modo de Foundry —`selfroll`, que
  // esconde el resultado **también del DM**— no entra: `canView` le devuelve `true` al DM antes
  // de mirar el nivel, así que «Propia» no es un nivel que falte, es una excepción a una regla
  // del proyecto. Está declarada como ficha C2C-1, no interpretada aquí.

  it("la audiencia se traduce a nivel de visibilidad, y nadie manda un DM_ONLY a mano", async () => {
    const publica = montar(dadosFijos(9));
    await publica.tirar("u1", "c1", { expression: "d20", audience: "PUBLIC", mode: "NORMAL" });
    expect(publica.events.record.mock.calls[0][2]).toMatchObject({ visibility: "PLAYERS" });

    const privada = montar(dadosFijos(9));
    await privada.tirar("u1", "c1", { expression: "d20", audience: "DM_PRIVATE", mode: "NORMAL" });
    expect(privada.events.record.mock.calls[0][2]).toMatchObject({ visibility: "OWNER_DM" });

    const ciega = montar(dadosFijos(9));
    await ciega.service.roll("u1", "c1", { expression: "d20", audience: "BLIND", mode: "NORMAL" });
    expect(ciega.events.record.mock.calls[0][2]).toMatchObject({ visibility: "DM_ONLY" });
  });

  it("**a ciegas, la respuesta del jugador no trae el resultado** — ni el total ni los dados", async () => {
    // Es el agujero que existía y no estaba declarado: la tirada quedaba escondida en el
    // registro y visible en el cuerpo de la petición de su propio autor.
    const { service, events } = montar(dadosFijos(20));

    const r = await service.roll("u1", "c1", {
      expression: "d20",
      audience: "BLIND",
      mode: "NORMAL",
    });

    expect(r.revealed).toBe(false);
    expect(Object.keys(r).sort()).toEqual(["audience", "eventId", "expression", "revealed"]);
    // Y la tirada **sí se escribió**: el DM la ve en el registro. Ocultar no es no tirar.
    expect(events.record).toHaveBeenCalledTimes(1);
  });

  it("el DM sí ve su propia tirada a ciegas: la esconde de la mesa, no de sí mismo", async () => {
    const { service, membership } = montar(dadosFijos(14));
    membership.requireMember.mockResolvedValue({ role: "DM" });

    const r = await service.roll("dm", "c1", {
      expression: "d20",
      audience: "BLIND",
      mode: "NORMAL",
    });

    expect(r.revealed).toBe(true);
    expect(revelada(r).total).toBe(14);
  });

  it("un administrador de la plataforma tampoco queda a ciegas, y eso lo decide canView", async () => {
    const { service, prisma } = montar(dadosFijos(7));
    prisma.user.findUnique.mockResolvedValue({ isAdmin: true });

    const r = await service.roll("admin", "c1", {
      expression: "d20",
      audience: "BLIND",
      mode: "NORMAL",
    });

    expect(r.revealed).toBe(true);
  });

  it("una tirada pública no consulta al usuario: la respuesta ya se sabe sin ir a la base", async () => {
    // No es una micro-optimización gratuita: es una consulta por cada tirada de la mesa.
    const { tirar, prisma } = montar(dadosFijos(9));
    await tirar("u1", "c1", { expression: "d20", audience: "PUBLIC", mode: "NORMAL" });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe("el registro de tiradas (2C.1)", () => {
  it("no lee la base: delega en el log de partida acotado a los tipos de tirada", async () => {
    // **No puede haber dos matrices de visibilidad.** `GameEventsService.list` es el único sitio
    // donde vive `canView` para los sucesos, así que este listado pasa por ahí o no pasa.
    const { service, events } = montar(dadosFijos(9));
    events.list.mockResolvedValue({ events: [], nextCursor: null });

    await service.list("u1", "c1", { limit: 50, sessionId: "s1", characterId: "ch1" });

    expect(events.list).toHaveBeenCalledWith(
      "u1",
      "c1",
      { limit: 50, cursor: undefined, sessionId: "s1" },
      { types: ["ABILITY_ROLL", "DEATH_SAVE"], subjectId: "ch1" },
    );
  });

  it("las salvaciones de muerte cuentan como tirada: es la que la mesa más repasa", async () => {
    const { service, events } = montar(dadosFijos(9));
    events.list.mockResolvedValue({ events: [], nextCursor: null });
    await service.list("u1", "c1", { limit: 50 });
    expect(events.list.mock.calls[0][3].types).toContain("DEATH_SAVE");
  });
});
