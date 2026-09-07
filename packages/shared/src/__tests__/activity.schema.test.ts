import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  actividadBaseObjectSchema,
  actividadBaseSchema,
  actividadSchema,
  actividadTieneMecanicaOTexto,
  TIPOS_DE_ACTIVIDAD,
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

    // Actualizado en la vuelta de arreglo 1 de A6 (crítico «la invariante ya no dice la
    // verdad»): `actividadTieneMecanicaOTexto` ahora cuenta `tipo` como mecánica por sí solo
    // (salvo `utilidad`), porque una `ataque`, `salvacion`, `dados` o `prueba` real siempre trae
    // su propio campo obligatorio. Este `ataqueSchema` de prueba, con `tipo: "ataque"` puesto,
    // ya no se rechaza sin descripción — la prueba que sí demuestra que la invariante sigue viva
    // (con `tipo` ausente, como en `actividadBaseSchema`) está más arriba, en
    // «una actividad sin descripción NI mecánica se rechaza».
    expect(() =>
      ataqueSchema.parse({ tipo: "ataque", activation: { coste: "ACTION" } }),
    ).not.toThrow();
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

// Tarea A6 (paso 2) — las cinco actividades. Las tres primeras son las del brief, escritas y
// vistas fallar antes del esquema. Las tres siguientes son una por cada corrección de la tarea 0
// que recoge `esquema-corregido.md`, sección 3.

const base = { activation: { coste: "ACTION" as const }, description: "Una actividad cualquiera." };

describe("actividadSchema — las cinco actividades", () => {
  it("los cinco tipos, y ninguno más", () => {
    expect(TIPOS_DE_ACTIVIDAD).toEqual(["ataque", "salvacion", "dados", "utilidad", "prueba"]);
  });

  it("`dados` funde daño y curación con el signo", () => {
    const cura = actividadSchema.parse({
      tipo: "dados",
      ...base,
      dados: { n: 2, caras: 4, bonus: { tipo: "modificador", ability: "wis" }, signo: 1 },
    });
    const dano = actividadSchema.parse({
      tipo: "dados",
      ...base,
      dados: { n: 8, caras: 6, signo: -1, tipoDeDano: "FIRE" },
    });
    if (cura.tipo !== "dados" || dano.tipo !== "dados") throw new Error("tipo inesperado");
    expect(cura.dados.signo).toBe(1);
    expect(dano.dados.tipoDeDano).toBe("FIRE");
  });

  it("el bonus de una expresión es un Origen, NUNCA una cadena", () => {
    expect(() =>
      actividadSchema.parse({
        tipo: "dados",
        ...base,
        dados: { n: 1, caras: 6, bonus: "@mod + 2", signo: -1 },
      }),
    ).toThrow();
  });

  // --- Corrección 1: cero dados es un caso real (la forma de revivify) ------------------------

  it("una expresión sin dados y con solo bonus se acepta, la forma de revivify", () => {
    const revivify = actividadSchema.parse({
      tipo: "dados",
      ...base,
      dados: { bonus: { tipo: "fijo", valor: 1 }, signo: 1 },
    });
    if (revivify.tipo !== "dados") throw new Error("tipo inesperado");
    expect(revivify.dados).toEqual({ bonus: { tipo: "fijo", valor: 1 }, signo: 1 });
  });

  it("una expresión sin dados y sin bonus se rechaza: una expresión vacía no existe", () => {
    expect(() =>
      actividadSchema.parse({
        tipo: "dados",
        ...base,
        dados: { signo: 1 },
      }),
    ).toThrow();
  });

  // --- Corrección 2: `escalado` tiene dos ejes que no se pueden confundir --------------------
  // (Demostrado aquí sobre la actividad `dados` a secas: el mecanismo de escalado es el mismo
  // haya o no un `ataque`/`salvacion` alrededor. La forma LITERAL de fireball y fire-bolt —con
  // su salvación y su ataque puestos— está más abajo, en el bloque del crítico 1 de la vuelta de
  // arreglo 1.)

  it("un escalado por espacio se acepta", () => {
    const conEscalado = actividadSchema.parse({
      tipo: "dados",
      ...base,
      dados: {
        n: 8,
        caras: 6,
        signo: -1,
        tipoDeDano: "FIRE",
        escalado: { por: "espacio", n: 1, caras: 6 },
      },
    });
    if (conEscalado.tipo !== "dados") throw new Error("tipo inesperado");
    expect(conEscalado.dados.escalado).toEqual({ por: "espacio", n: 1, caras: 6 });
  });

  it("un escalado por nivel de personaje se acepta, y son ejes distintos", () => {
    const conEscalado = actividadSchema.parse({
      tipo: "dados",
      ...base,
      dados: {
        n: 1,
        caras: 10,
        signo: -1,
        tipoDeDano: "FIRE",
        escalado: { por: "nivelDePersonaje", n: 1, caras: 10 },
      },
    });
    if (conEscalado.tipo !== "dados") throw new Error("tipo inesperado");
    expect(conEscalado.dados.escalado?.por).toBe("nivelDePersonaje");
    expect(conEscalado.dados.escalado?.por).not.toBe("espacio");
  });

  // --- Corrección 3: la CD de salvación y de prueba es un Origen, no un entero ----------------

  it("una salvacion con cd: 15 a secas se rechaza: la CD es un Origen, no un entero", () => {
    expect(() =>
      actividadSchema.parse({
        tipo: "salvacion",
        ...base,
        salvacion: { ability: "dex", cd: 15, siSalva: "ninguno" },
      }),
    ).toThrow();
  });

  // --- El resto de actividades, cada una con su único campo -----------------------------------

  it("un ataque declara su bono como Origen, y nada de una CA fija", () => {
    const golpe = actividadSchema.parse({
      tipo: "ataque",
      ...base,
      ataque: { bono: { tipo: "modificador", ability: "str" } },
    });
    if (golpe.tipo !== "ataque") throw new Error("tipo inesperado");
    expect(golpe.ataque).toEqual({ bono: { tipo: "modificador", ability: "str" } });
  });

  it("una prueba declara característica y CD, igual que una salvación", () => {
    const forcejeo = actividadSchema.parse({
      tipo: "prueba",
      ...base,
      prueba: { ability: "str", cd: { tipo: "fijo", valor: 13 } },
    });
    if (forcejeo.tipo !== "prueba") throw new Error("tipo inesperado");
    expect(forcejeo.prueba).toEqual({ ability: "str", cd: { tipo: "fijo", valor: 13 } });
  });

  it("una utilidad no añade campo propio: le basta con su descripción o sus efectos", () => {
    const furia = actividadSchema.parse({
      tipo: "utilidad",
      ...base,
    });
    expect(furia.tipo).toBe("utilidad");
  });

  // --- Vuelta de arreglo 1, crítico 1: `ataque` y `salvacion` tienen dónde poner sus dados ----

  it("crítico 1 — fireball es UNA salvacion con sus dados y su escalado dentro, no dos actividades", () => {
    const fireball = actividadSchema.parse({
      tipo: "salvacion",
      ...base,
      salvacion: { ability: "dex", cd: { tipo: "cdDeConjuro" }, siSalva: "mitad" },
      dados: {
        n: 8,
        caras: 6,
        signo: -1,
        tipoDeDano: "FIRE",
        escalado: { por: "espacio", n: 1, caras: 6 },
      },
    });
    if (fireball.tipo !== "salvacion") throw new Error("tipo inesperado");
    expect(fireball.salvacion).toEqual({
      ability: "dex",
      cd: { tipo: "cdDeConjuro" },
      siSalva: "mitad",
    });
    expect(fireball.dados).toEqual({
      n: 8,
      caras: 6,
      signo: -1,
      tipoDeDano: "FIRE",
      escalado: { por: "espacio", n: 1, caras: 6 },
    });
  });

  it("crítico 1 — fire-bolt es UNA actividad ataque con sus dados y su escalado por nivel de personaje dentro", () => {
    const fireBolt = actividadSchema.parse({
      tipo: "ataque",
      ...base,
      ataque: { bono: { tipo: "lanzamiento" } },
      dados: {
        n: 1,
        caras: 10,
        signo: -1,
        tipoDeDano: "FIRE",
        escalado: { por: "nivelDePersonaje", n: 1, caras: 10 },
      },
    });
    if (fireBolt.tipo !== "ataque") throw new Error("tipo inesperado");
    expect(fireBolt.dados?.escalado).toEqual({ por: "nivelDePersonaje", n: 1, caras: 10 });
  });

  it("crítico 1 — siSalva: 'mitad' sin dados se rechaza: la mitad de qué, si no hay daño", () => {
    expect(() =>
      actividadSchema.parse({
        tipo: "salvacion",
        ...base,
        salvacion: { ability: "dex", cd: { tipo: "cdDeConjuro" }, siSalva: "mitad" },
      }),
    ).toThrow();
  });

  it("crítico 1 — siSalva: 'ninguno' sin dados se acepta: no promete reducir nada", () => {
    const veneno = actividadSchema.parse({
      tipo: "salvacion",
      ...base,
      salvacion: { ability: "con", cd: { tipo: "fijo", valor: 13 }, siSalva: "ninguno" },
    });
    if (veneno.tipo !== "salvacion") throw new Error("tipo inesperado");
    expect(veneno.salvacion.siSalva).toBe("ninguno");
    expect(veneno.dados).toBeUndefined();
  });

  it("crítico 1 — un ataque sin dados sigue siendo válido: no todo ataque tiene daño automatizado", () => {
    const golpe = actividadSchema.parse({
      tipo: "ataque",
      ...base,
      ataque: { bono: { tipo: "modificador", ability: "str" } },
    });
    if (golpe.tipo !== "ataque") throw new Error("tipo inesperado");
    expect(golpe.dados).toBeUndefined();
  });

  // --- Vuelta de arreglo 1, crítico 2: `prueba` cubre counterspell ----------------------------

  it("crítico 2 — counterspell es una prueba con ability: lanzamiento y sin CD derivable", () => {
    const counterspell = actividadSchema.parse({
      tipo: "prueba",
      ...base,
      prueba: { ability: "lanzamiento" },
    });
    if (counterspell.tipo !== "prueba") throw new Error("tipo inesperado");
    expect(counterspell.prueba).toEqual({ ability: "lanzamiento" });
    expect(counterspell.prueba.cd).toBeUndefined();
  });

  it("crítico 2 — una prueba con una característica concreta y sin CD también se acepta", () => {
    const forcejeo = actividadSchema.parse({
      tipo: "prueba",
      ...base,
      prueba: { ability: "str" },
    });
    if (forcejeo.tipo !== "prueba") throw new Error("tipo inesperado");
    expect(forcejeo.prueba.cd).toBeUndefined();
  });

  it("crítico 2 — una prueba con cd: 15 a secas se rechaza igual que en salvacion: la CD es un Origen, no un entero", () => {
    expect(() =>
      actividadSchema.parse({
        tipo: "prueba",
        ...base,
        prueba: { ability: "str", cd: 15 },
      }),
    ).toThrow();
  });

  it("crítico 2 — salvacion.ability NO acepta 'lanzamiento': una salvación siempre es contra una característica concreta", () => {
    expect(() =>
      actividadSchema.parse({
        tipo: "salvacion",
        ...base,
        salvacion: { ability: "lanzamiento", cd: { tipo: "cdDeConjuro" }, siSalva: "ninguno" },
      }),
    ).toThrow();
  });

  // --- Importante 3: la invariante ya no rechaza una mecánica real sin descripción -----------

  it("importante 3 — un ataque de arma (sin descripción, sin consumo, sin efectos) se acepta: SÍ tiene mecánica", () => {
    const cimitarraDelGoblin = actividadSchema.parse({
      activation: { coste: "ACTION" },
      tipo: "ataque",
      ataque: { bono: { tipo: "modificador", ability: "str" } },
      dados: { n: 1, caras: 6, signo: -1, tipoDeDano: "SLASHING" },
    });
    expect(cimitarraDelGoblin.tipo).toBe("ataque");
    expect(cimitarraDelGoblin.description).toBeUndefined();
  });

  it("importante 3 — una utilidad SIGUE necesitando descripción o mecánica de la base: no tiene campo propio que la sustituya", () => {
    expect(() =>
      actividadSchema.parse({
        activation: { coste: "ACTION" },
        tipo: "utilidad",
      }),
    ).toThrow();
  });

  it("un tipo fuera del vocabulario cerrado se rechaza", () => {
    expect(() =>
      actividadSchema.parse({
        tipo: "summon",
        ...base,
      }),
    ).toThrow();
  });

  // --- Mutación de aflojamiento, campo a campo: superficie sin guardián -----------------------

  it("un signo fuera de {1, -1} se rechaza", () => {
    expect(() =>
      actividadSchema.parse({
        tipo: "dados",
        ...base,
        dados: { n: 1, caras: 6, signo: 2 },
      }),
    ).toThrow();
  });

  it("un tipoDeDano fuera de los trece del SRD se rechaza", () => {
    expect(() =>
      actividadSchema.parse({
        tipo: "dados",
        ...base,
        dados: { n: 1, caras: 6, signo: -1, tipoDeDano: "HOLY" },
      }),
    ).toThrow();
  });

  it("un siSalva fuera de {ninguno, mitad} se rechaza", () => {
    expect(() =>
      actividadSchema.parse({
        tipo: "salvacion",
        ...base,
        salvacion: { ability: "dex", cd: { tipo: "fijo", valor: 15 }, siSalva: "cuarto" },
      }),
    ).toThrow();
  });

  it("una ability fuera del vocabulario cerrado se rechaza, en salvacion y en prueba", () => {
    expect(() =>
      actividadSchema.parse({
        tipo: "salvacion",
        ...base,
        salvacion: { ability: "carisma", cd: { tipo: "fijo", valor: 15 }, siSalva: "mitad" },
      }),
    ).toThrow();
    expect(() =>
      actividadSchema.parse({
        tipo: "prueba",
        ...base,
        prueba: { ability: "carisma", cd: { tipo: "fijo", valor: 15 } },
      }),
    ).toThrow();
  });

  it("el bono de un ataque que no es un Origen válido se rechaza", () => {
    expect(() =>
      actividadSchema.parse({
        tipo: "ataque",
        ...base,
        ataque: { bono: 5 },
      }),
    ).toThrow();
  });

  it("un dado fuera del vocabulario de caras (n=5, por ejemplo) se rechaza", () => {
    expect(() =>
      actividadSchema.parse({
        tipo: "dados",
        ...base,
        dados: { n: 1, caras: 5, signo: 1 },
      }),
    ).toThrow();
  });

  it("una clave sobrante en `dados`, `ataque`, `salvacion` o `prueba` revienta el parse: son .strict()", () => {
    expect(() =>
      actividadSchema.parse({
        tipo: "dados",
        ...base,
        dados: { n: 1, caras: 6, signo: 1, extra: true },
      }),
    ).toThrow();
    expect(() =>
      actividadSchema.parse({
        tipo: "ataque",
        ...base,
        ataque: { bono: { tipo: "fijo", valor: 1 }, extra: true },
      }),
    ).toThrow();
  });

  // --- Importante 1: cuatro campos sin guardián, destapados con aflojamiento real -------------
  // (La revisión los encontró aplicando `z.any()` campo a campo y viendo la suite entera en
  // verde. La salida literal de cada aflojamiento, aplicado y deshecho, está en el informe.)

  it("importante 1 — dados.n fuera de [1, 100], o de tipo equivocado, se rechaza", () => {
    expect(() =>
      actividadSchema.parse({ tipo: "dados", ...base, dados: { n: 0, caras: 6, signo: 1 } }),
    ).toThrow();
    expect(() =>
      actividadSchema.parse({ tipo: "dados", ...base, dados: { n: 500, caras: 6, signo: 1 } }),
    ).toThrow();
    expect(() =>
      actividadSchema.parse({ tipo: "dados", ...base, dados: { n: "dos", caras: 6, signo: 1 } }),
    ).toThrow();
  });

  it("importante 1 — escalado.por fuera de {espacio, nivelDePersonaje} se rechaza", () => {
    expect(() =>
      actividadSchema.parse({
        tipo: "dados",
        ...base,
        dados: {
          n: 1,
          caras: 6,
          signo: 1,
          escalado: { por: "otro", n: 1, caras: 6 },
        },
      }),
    ).toThrow();
  });

  it("importante 1 — escalado.n fuera de [1, 20] se rechaza", () => {
    expect(() =>
      actividadSchema.parse({
        tipo: "dados",
        ...base,
        dados: {
          n: 1,
          caras: 6,
          signo: 1,
          escalado: { por: "espacio", n: 0, caras: 6 },
        },
      }),
    ).toThrow();
    expect(() =>
      actividadSchema.parse({
        tipo: "dados",
        ...base,
        dados: {
          n: 1,
          caras: 6,
          signo: 1,
          escalado: { por: "espacio", n: 21, caras: 6 },
        },
      }),
    ).toThrow();
  });

  it("importante 1 — escalado.caras fuera de su vocabulario cerrado (7, por ejemplo) se rechaza", () => {
    expect(() =>
      actividadSchema.parse({
        tipo: "dados",
        ...base,
        dados: {
          n: 1,
          caras: 6,
          signo: 1,
          escalado: { por: "espacio", n: 1, caras: 7 },
        },
      }),
    ).toThrow();
  });

  it("importante 1 — escalado con una clave sobrante revienta: también es .strict()", () => {
    expect(() =>
      actividadSchema.parse({
        tipo: "dados",
        ...base,
        dados: {
          n: 1,
          caras: 6,
          signo: 1,
          escalado: { por: "espacio", n: 1, caras: 6, extra: true },
        },
      }),
    ).toThrow();
  });
});
