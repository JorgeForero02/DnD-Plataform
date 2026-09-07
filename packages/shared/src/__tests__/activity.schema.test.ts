import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  actividadBaseObjectSchema,
  actividadBaseSchema,
  actividadTieneMecanicaOTexto,
} from "../activity.schema";

// Tarea A5 (paso 2). Las dos primeras son las del brief, escritas y vistas fallar antes del
// esquema. Las seis siguientes son una por cada corrección de la tarea 0 y de la vuelta de
// arreglo 1 de la revisión de calidad — ver
// `.superpowers/sdd/2026-09-06-tanda-paso2-y-botin/briefs/esquema-corregido.md`, sección 2, y el
// bloque de la vuelta 1 al final de `A5-report.md`.

describe("actividadBaseSchema", () => {
  it("una actividad declara qué cuesta y qué gasta", () => {
    const a = actividadBaseSchema.parse({
      activation: { coste: "BONUS" },
      consumption: [{ recurso: "rage", cantidad: 1 }],
      description: "Entras en furia.",
    });
    expect(a.activation).toEqual({ coste: "BONUS" });
    expect(a.consumption).toEqual([{ recurso: "rage", cantidad: 1 }]);
    expect(a.description).toBe("Entras en furia.");
  });

  it("una actividad sin descripción NI mecánica se rechaza", () => {
    expect(() => actividadBaseSchema.parse({ activation: { coste: "ACTION" } })).toThrow();
  });

  it("una actividad con consumo pero sin descripción también es válida: el consumo YA es mecánica", () => {
    const a = actividadBaseSchema.parse({
      activation: { coste: "ACTION" },
      consumption: [{ recurso: "spellSlot1", cantidad: 1 }],
    });
    expect(a.description).toBeUndefined();
    expect(a.consumption).toEqual([{ recurso: "spellSlot1", cantidad: 1 }]);
  });

  it("una activación por tiempo se acepta, y mezclar coste y tiempo se rechaza", () => {
    const ritual = actividadBaseSchema.parse({
      activation: { tiempo: { valor: 1, unidad: "minuto" } },
      description: "Un ritual de un minuto.",
    });
    expect(ritual.activation).toEqual({ tiempo: { valor: 1, unidad: "minuto" } });

    expect(() =>
      actividadBaseSchema.parse({
        activation: { coste: "ACTION", tiempo: { valor: 1, unidad: "minuto" } },
        description: "Activación ambigua.",
      }),
    ).toThrow();
  });

  it("una reacción con su condición se acepta y conserva el texto exacto", () => {
    const escudo = actividadBaseSchema.parse({
      activation: {
        coste: "REACTION",
        condicion: "cuando te golpea un ataque o te apunta un proyectil mágico",
      },
      description: "Una barrera invisible de fuerza te protege.",
    });
    expect(escudo.activation).toEqual({
      coste: "REACTION",
      condicion: "cuando te golpea un ataque o te apunta un proyectil mágico",
    });
  });

  it("una duración concentrada de un minuto se acepta, con la forma de bless", () => {
    const bless = actividadBaseSchema.parse({
      activation: { coste: "ACTION" },
      duration: { valor: 1, unidad: "minuto", concentracion: true },
      description: "Bendices hasta a tres criaturas.",
    });
    expect(bless.duration).toEqual({ valor: 1, unidad: "minuto", concentracion: true });
  });

  it("una duración ausente por defecto es instantánea y sin concentración", () => {
    const a = actividadBaseSchema.parse({
      activation: { coste: "ACTION" },
      description: "Un golpe seco.",
    });
    expect(a.duration).toEqual({ unidad: "instantanea", concentracion: false });
  });

  it("unos materiales con coste se aceptan, y un costeCp negativo se rechaza", () => {
    const revivify = actividadBaseSchema.parse({
      activation: { coste: "ACTION" },
      materiales: { texto: "Diamantes por valor de 300 po", consumido: true, costeCp: 30000 },
      description: "Devuelve la vida a un cadáver reciente.",
    });
    expect(revivify.materiales).toEqual({
      texto: "Diamantes por valor de 300 po",
      consumido: true,
      costeCp: 30000,
    });

    expect(() =>
      actividadBaseSchema.parse({
        activation: { coste: "ACTION" },
        materiales: { texto: "Algo", consumido: false, costeCp: -1 },
        description: "Inválido.",
      }),
    ).toThrow();
  });

  // --- Vuelta de arreglo 1, C1: `target.cantidad` con la forma literal de `bless` -------------

  it("C1 — el objetivo de bless (nivel de espacio MÁS dos) se acepta con su forma exacta", () => {
    const bless = actividadBaseSchema.parse({
      activation: { coste: "ACTION" },
      target: { tipo: "criatura", cantidad: { origen: { tipo: "nivelDeEspacio" }, mas: 2 } },
      description: "Bendices hasta a tres criaturas.",
    });
    expect(bless.target).toEqual({
      tipo: "criatura",
      cantidad: { origen: { tipo: "nivelDeEspacio" }, mas: 2 },
    });
  });

  it("C1 — sin el `mas`, la cantidad de bless deja de significar lo mismo y se distingue en el resultado", () => {
    // La mutación exacta que pedía la revisión: quitar el `mas` de la forma de bless. No se
    // rechaza (un origen puro sigue siendo una cantidad válida para OTRA actividad), pero el
    // resultado deja de tener el `+2` y por tanto deja de ser bless — es la prueba de que `mas`
    // aporta algo real y no es un campo decorativo.
    const sinMas = actividadBaseSchema.parse({
      activation: { coste: "ACTION" },
      target: { tipo: "criatura", cantidad: { origen: { tipo: "nivelDeEspacio" } } },
      description: "Otra actividad cualquiera, no bless.",
    });
    expect(sinMas.target).toEqual({
      tipo: "criatura",
      cantidad: { origen: { tipo: "nivelDeEspacio" }, mas: 0 },
    });
    expect(sinMas.target).not.toEqual({
      tipo: "criatura",
      cantidad: { origen: { tipo: "nivelDeEspacio" }, mas: 2 },
    });
  });

  it("C1 — un objetivo con un origen y una cantidad fija a la vez, mezclados, se rechaza", () => {
    expect(() =>
      actividadBaseSchema.parse({
        activation: { coste: "ACTION" },
        target: { tipo: "criatura", cantidad: { origen: { tipo: "fijo", valor: 1 }, extra: true } },
        description: "Objetivo con clave sobrante.",
      }),
    ).toThrow();
  });

  // --- Vuelta de arreglo 1, C2: la base se puede extender -------------------------------------

  it("C2 — actividadBaseObjectSchema se puede extender y refinar, como hará A6", () => {
    const ataqueSchema = actividadBaseObjectSchema
      .extend({ tipo: z.literal("ataque"), contraCa: z.boolean().default(true) })
      .superRefine(actividadTieneMecanicaOTexto);

    const golpe = ataqueSchema.parse({
      tipo: "ataque",
      activation: { coste: "ACTION" },
      description: "Un golpe con el hacha.",
    });
    expect(golpe.tipo).toBe("ataque");
    expect(golpe.contraCa).toBe(true);

    // La invariante extendida sigue viva: sin descripción y sin mecánica, sigue sin importar
    // nada, aunque el tipo concreto añada sus propios campos.
    expect(() => ataqueSchema.parse({ tipo: "ataque", activation: { coste: "ACTION" } })).toThrow();
  });

  it("C2 — actividadBaseObjectSchema no es un ZodEffects: tiene .extend y .merge", () => {
    expect(typeof actividadBaseObjectSchema.extend).toBe("function");
    expect(typeof actividadBaseObjectSchema.merge).toBe("function");
  });

  // --- Vuelta de arreglo 1, I3: la superficie sin prueba de la primera entrega -----------------

  it("I3 — un target con un tipo fuera del vocabulario cerrado se rechaza", () => {
    expect(() =>
      actividadBaseSchema.parse({
        activation: { coste: "ACTION" },
        target: { tipo: "area" },
        description: "Tipo de objetivo que no existe en el vocabulario.",
      }),
    ).toThrow();
  });

  it("I3 — un range con una unidad fuera del vocabulario cerrado se rechaza", () => {
    expect(() =>
      actividadBaseSchema.parse({
        activation: { coste: "ACTION" },
        range: { unidad: "millas", distanciaFt: 1 },
        description: "Unidad de alcance que no existe.",
      }),
    ).toThrow();
  });

  it("I3 — range en pies exige distanciaFt: pies sin distancia no significa nada", () => {
    expect(() =>
      actividadBaseSchema.parse({
        activation: { coste: "ACTION" },
        range: { unidad: "pies" },
        description: "Pies sin cuántos.",
      }),
    ).toThrow();
  });

  it("I3 — un consumo con cantidad cero o negativa se rechaza", () => {
    expect(() =>
      actividadBaseSchema.parse({
        activation: { coste: "ACTION" },
        consumption: [{ recurso: "rage", cantidad: 0 }],
        description: "Consumo de cero no consume nada.",
      }),
    ).toThrow();
    expect(() =>
      actividadBaseSchema.parse({
        activation: { coste: "ACTION" },
        consumption: [{ recurso: "rage", cantidad: -1 }],
        description: "Consumo negativo no existe.",
      }),
    ).toThrow();
  });

  it("I3 — un recurso vacío, o uno demasiado largo, se rechazan", () => {
    expect(() =>
      actividadBaseSchema.parse({
        activation: { coste: "ACTION" },
        consumption: [{ recurso: "", cantidad: 1 }],
        description: "Clave de recurso vacía.",
      }),
    ).toThrow();
    expect(() =>
      actividadBaseSchema.parse({
        activation: { coste: "ACTION" },
        consumption: [{ recurso: "r".repeat(61), cantidad: 1 }],
        description: "Clave de recurso demasiado larga.",
      }),
    ).toThrow();
  });

  it("I3 — un effect con una clave vacía se rechaza: reutiliza applyConditionSchema de verdad", () => {
    expect(() =>
      actividadBaseSchema.parse({
        activation: { coste: "ACTION" },
        effects: [{ key: "" }],
        description: "Condición sin clave.",
      }),
    ).toThrow();
  });

  it("I3 — unos materiales con texto vacío se rechazan", () => {
    expect(() =>
      actividadBaseSchema.parse({
        activation: { coste: "ACTION" },
        materiales: { texto: "" },
        description: "Materiales sin texto.",
      }),
    ).toThrow();
  });

  it("I3 — unos materiales sin decir `consumido` quedan en false por defecto, no en verdadero", () => {
    const a = actividadBaseSchema.parse({
      activation: { coste: "ACTION" },
      materiales: { texto: "Un poco de tiza" },
      description: "Materiales sin consumir.",
    });
    expect(a.materiales).toEqual({ texto: "Un poco de tiza", consumido: false, costeCp: 0 });
  });

  // --- Vuelta de arreglo 1, I4: effects es applyConditionSchema, no una copia -----------------

  it("I4 — un effect acepta el vocabulario exacto de applyConditionSchema (key, level, note, durationSeconds)", () => {
    const envenenado = actividadBaseSchema.parse({
      activation: { coste: "ACTION" },
      effects: [
        { key: "poisoned", note: "hasta el fin de tu siguiente turno", durationSeconds: 6 },
      ],
      description: "Envenena al objetivo.",
    });
    expect(envenenado.effects).toEqual([
      { key: "poisoned", note: "hasta el fin de tu siguiente turno", durationSeconds: 6 },
    ]);
  });

  // --- Vuelta de arreglo 1, I5: la raíz es estricta --------------------------------------------

  it("I5 — una clave que este esquema no declara (por ejemplo `uses`) revienta el parse", () => {
    expect(() =>
      actividadBaseSchema.parse({
        activation: { coste: "ACTION" },
        description: "Con una clave sobrante.",
        uses: { max: 3 },
      }),
    ).toThrow();
  });

  // --- Vuelta de arreglo 1, I6: duración y alcance que faltaban -------------------------------

  it("I6 — una duración 'hasta que se disipe' y una 'especial' se aceptan", () => {
    const hastaQueSeDisipe = actividadBaseSchema.parse({
      activation: { coste: "ACTION" },
      duration: { unidad: "hastaQueSeDisipe", concentracion: false },
      description: "Dura hasta que alguien la disipe.",
    });
    expect(hastaQueSeDisipe.duration.unidad).toBe("hastaQueSeDisipe");

    const especial = actividadBaseSchema.parse({
      activation: { coste: "ACTION" },
      duration: { unidad: "especial", concentracion: false },
      description: "Su duración se explica en el propio texto.",
    });
    expect(especial.duration.unidad).toBe("especial");
  });

  it("I6 — un range 'especial' se acepta, sin distanciaFt", () => {
    const a = actividadBaseSchema.parse({
      activation: { coste: "ACTION" },
      range: { unidad: "especial" },
      description: "Su alcance se explica en el propio texto.",
    });
    expect(a.range).toEqual({ unidad: "especial" });
  });

  // --- Vuelta de arreglo 1, M7: una descripción solo de espacios no cuenta --------------------

  it("M7 — una descripción de solo espacios no satisface la invariante", () => {
    expect(() =>
      actividadBaseSchema.parse({
        activation: { coste: "ACTION" },
        description: "   ",
      }),
    ).toThrow();
  });

  // --- Vuelta de arreglo 1, M8: target.tipo no inventa un valor por defecto -------------------

  it("M8 — un target sin tipo se acepta y NO se rellena con 'criatura'", () => {
    const a = actividadBaseSchema.parse({
      activation: { coste: "ACTION" },
      target: {},
      description: "Objetivo sin tipo declarado en la fuente.",
    });
    expect(a.target).toEqual({});
    expect(a.target?.tipo).toBeUndefined();
  });
});
