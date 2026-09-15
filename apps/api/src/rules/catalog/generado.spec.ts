// Tarea 3A.1 (T2) — pruebas del catálogo generado. E-3A1-9: se prueba la FÓRMULA, no cada
// conjuro: (a) el fichero dorado (regenerado en memoria == commiteado); (b) los invariantes que
// deben cumplir los 319; (c) cuatro conjuros contrastados a mano, literales.
//
// **319, no 320.** El plan hablaba de 320 conjuros; T0 (`docs/superpowers/specs/
// 2026-09-14-3a1-tarea-0-prueba-de-fuego.md`, E-3A1-11) midió que son **319 `type: spell`** más
// **1 `type: weapon`** (`conjured-flame-blade`, el arma que crea *Flame Blade*) que es un rechazo
// declarado, no un conjuro — «319 + 1 = 320, el número exacto del plan» está en esa sección. El
// catálogo tiene 319 conjuros; el rechazo del arma se ve en `generado/rechazos.md`.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { LABEL_KEYS } from "@dnd/shared";
import { SRD_CLASSES } from "./classes";
import { SRD_RACES } from "./races";
import {
  SRD_SPELLS,
  SRD_SPELL_POR_KEY,
  SRD_CLASS_FEATURES,
  SRD_RACE_FEATURES,
  CONCESIONES_SIN_RECURSO,
} from "./generado";

const RAIZ_REPO = join(__dirname, "..", "..", "..", "..", "..");
const CLAVES_DE_CLASE = new Set(SRD_CLASSES.map((c) => c.key));
const ESCUELAS_VALIDAS = new Set(["abj", "con", "div", "enc", "evo", "ill", "nec", "trs"]);

describe("catálogo generado — dorado", () => {
  const tieneFuentes = Boolean(
    process.env.FOUNDRY_SOURCE_DIR &&
    existsSync(process.env.FOUNDRY_SOURCE_DIR) &&
    process.env.SRD_ES_TXT &&
    existsSync(process.env.SRD_ES_TXT),
  );

  // Sin las dos fuentes externas (fuera del repo, ver constraints.md) no se puede regenerar: en
  // CI el JSON commiteado ES la verdad, y esta prueba se salta diciéndolo en vez de fallar en
  // rojo por un motivo ajeno al código.
  (tieneFuentes ? it : it.skip)(
    "spells-srd.json commiteado == lo que regenera el conversor ahora mismo",
    () => {
      execFileSync("node", ["scripts/convertir-catalogo.mjs", "--check"], {
        cwd: RAIZ_REPO,
        stdio: "pipe",
      });
    },
  );

  if (!tieneFuentes) {
    // eslint no restringe `console.warn` en este proyecto; el aviso solo tiene que verse.
    console.warn(
      "catálogo generado — dorado: SALTADA. FOUNDRY_SOURCE_DIR/SRD_ES_TXT no apuntan a las " +
        "fuentes externas (fuera del repo, solo lectura) — no se puede regenerar sin ellas. " +
        "El JSON commiteado bajo generado/ es la verdad en CI.",
    );
  }
});

describe("catálogo generado — invariantes (E-3A1-9.b)", () => {
  it("son 319 conjuros (319 type:spell; el weapon conjured-flame-blade es rechazo, T0)", () => {
    expect(SRD_SPELLS.length).toBe(319);
  });

  it("SRD_SPELL_POR_KEY indexa los mismos 319, sin duplicados de clave", () => {
    expect(SRD_SPELL_POR_KEY.size).toBe(SRD_SPELLS.length);
  });

  it("el nivel de todos está entre 0 y 9", () => {
    for (const s of SRD_SPELLS) {
      expect(s.level).toBeGreaterThanOrEqual(0);
      expect(s.level).toBeLessThanOrEqual(9);
    }
  });

  it("la escuela de todos es una de las ocho del SRD 5.1, ninguna otra", () => {
    for (const s of SRD_SPELLS) {
      expect(ESCUELAS_VALIDAS.has(s.school)).toBe(true);
    }
  });

  it("todos tienen nameEs (E-3A1-1/E-3A1-9: 0 sin traducción, meta de T2)", () => {
    for (const s of SRD_SPELLS) {
      expect(s.sinTraduccion).toBe(false);
      expect(typeof s.nameEs).toBe("string");
      expect(s.nameEs).not.toBe("");
    }
  });

  it("todos tienen al menos una actividad o texto (nunca los dos vacíos)", () => {
    for (const s of SRD_SPELLS) {
      expect(s.actividades.length > 0 || s.textEn.length > 0).toBe(true);
    }
  });

  it("concentración implica duración no instantánea", () => {
    for (const s of SRD_SPELLS) {
      if (s.concentration) {
        expect(s.duration.unidad).not.toBe("instantanea");
      }
    }
  });

  // Ola de arreglos (C1): el invariante de arriba solo miraba el nivel de conjuro; las
  // actividades traían 178 «instantánea + concentración» porque el conversor ignoraba
  // `override: false` y `ctx.itemActivation` no se rellenaba nunca.
  it("ninguna ACTIVIDAD dice concentración e instantánea a la vez (C1)", () => {
    for (const s of SRD_SPELLS) {
      for (const a of s.actividades) {
        if (a.duration.concentracion) expect(a.duration.unidad).not.toBe("instantanea");
      }
    }
  });

  // La actividad de lanzar (`override: false`) hereda `castingTime`, alcance y duración del
  // conjuro; las secundarias (`override: true`: el daño por turno de Nube asesina, los
  // tentáculos que apresan) tienen las suyas. Medido tras C1: 96 de 425 difieren en activación —
  // ninguna de ellas es la de lanzar salvo en los 7 conjuros cuyo lanzamiento es `summon` (fuera
  // de A) y solo queda la secundaria (Arma espiritual, Esfera flamígera, Sirviente invisible…).
  it("la activación de las actividades es la del conjuro salvo en las secundarias con override (C1, 96 de 425 medidas)", () => {
    const actividades = SRD_SPELLS.flatMap((s) => s.actividades.map((a) => ({ s, a })));
    expect(actividades.length).toBe(425);
    const distintas = actividades.filter(
      ({ s, a }) => JSON.stringify(a.activation) !== JSON.stringify(s.castingTime),
    );
    expect(distintas.length).toBe(96);
    const sinLaDeLanzar = SRD_SPELLS.filter(
      (s) =>
        s.actividades.length > 0 &&
        !s.actividades.some((a) => JSON.stringify(a.activation) === JSON.stringify(s.castingTime)),
    ).map((s) => s.key);
    expect(sinLaDeLanzar.sort()).toEqual([
      "arcane-sword",
      "faithful-hound",
      "flaming-sphere",
      "guardian-of-faith",
      "instant-summons",
      "magic-circle",
      "unseen-servant",
    ]);
  });

  it("Escudo es reacción con 1 asalto, Palabra de curación acción adicional, Inmovilizar persona 1 minuto con concentración (C1)", () => {
    expect(SRD_SPELL_POR_KEY.get("shield")?.actividades[0]?.activation).toMatchObject({
      coste: "REACTION",
    });
    expect(SRD_SPELL_POR_KEY.get("shield")?.actividades[0]?.duration).toEqual({
      unidad: "asalto",
      valor: 1,
      concentracion: false,
    });
    expect(SRD_SPELL_POR_KEY.get("healing-word")?.actividades[0]?.activation).toEqual({
      coste: "BONUS",
    });
    expect(SRD_SPELL_POR_KEY.get("hold-person")?.actividades[0]?.duration).toEqual({
      unidad: "minuto",
      valor: 1,
      concentracion: true,
    });
  });

  // Ola de arreglos (C4): el pie de página del PDF («Prohibida la reventa…») estaba en 81
  // conjuros, y Zona de la verdad arrastraba el capítulo de trampas.
  it("ningún textEs ni description lleva el pie de página del PDF (C4)", () => {
    const pie = /Prohibida la reventa|Documento de referencia del sistema/;
    for (const s of SRD_SPELLS) {
      expect(s.textEs ?? "").not.toMatch(pie);
      expect(s.higherLevelsEs ?? "").not.toMatch(pie);
      for (const a of s.actividades) expect(a.description ?? "").not.toMatch(pie);
    }
    const zona = SRD_SPELL_POR_KEY.get("zone-of-truth");
    expect(zona?.textEs).toMatch(/en los límites de la verdad\.$/);
    expect(zona?.textEs).not.toMatch(/Trampas|herramientas de ladrón/);
  });

  // Ola de arreglos (I9): nada se recorta — Muro prismático perdía sus tres últimas líneas.
  it("Muro prismático termina donde termina en el SRD, sin recorte (I9)", () => {
    expect(SRD_SPELL_POR_KEY.get("prismatic-wall")?.textEs).toMatch(
      /poner fin a conjuros y efectos mágicos\.$/,
    );
  });

  // Ola de arreglos (I8): «At Higher Levels» aparte y ningún `&Reference[...]` de Foundry.
  it("higherLevelsEn va aparte (74) y ningún textEn conserva &Reference[...] (I8)", () => {
    expect(SRD_SPELLS.filter((s) => s.higherLevelsEn).length).toBe(74);
    for (const s of SRD_SPELLS) {
      expect(s.textEn).not.toMatch(/At Higher Levels/);
      expect(s.textEn).not.toMatch(/[Rr]eference\[/);
    }
  });

  // Ola de arreglos (I4): «Personal»/«Lanzador» → personal, «1 asalto» → asalto, «Hasta que sea
  // disipado» → hastaQueSeDisipe, «1,5 km» → 5280 pies.
  it("alcance y duración del SRD español usan el vocabulario del esquema, no «especial» (I4)", () => {
    expect(SRD_SPELL_POR_KEY.get("shield")?.range).toEqual({ unidad: "personal" });
    expect(SRD_SPELL_POR_KEY.get("shield")?.duration).toEqual({
      unidad: "asalto",
      valor: 1,
      concentracion: false,
    });
    expect(SRD_SPELL_POR_KEY.get("arcane-lock")?.duration.unidad).toBe("hastaQueSeDisipe");
    expect(SRD_SPELL_POR_KEY.get("clairvoyance")?.range).toEqual({
      unidad: "pies",
      distanciaFt: 5280,
    });
    const especiales = SRD_SPELLS.filter((s) => s.range.unidad === "especial").map((s) => s.key);
    expect(especiales.length).toBeLessThanOrEqual(3);
  });

  // Ola de arreglos (I1/I5): lo que no cabe se rechaza con motivo, nunca se recorta a la mitad.
  it("Tormenta de hielo, Golpe de llama, Lluvia de meteoritos y Debilidad mental se quedan en texto (I1, I5)", () => {
    for (const key of ["ice-storm", "flame-strike", "meteor-swarm", "feeblemind"]) {
      const s = SRD_SPELL_POR_KEY.get(key);
      expect(s?.actividades.filter((a) => a.tipo === "salvacion")).toEqual([]);
      expect(s?.fueraDeA).toContain("save");
    }
  });

  // Ola de arreglos (I13): la clave es el nombre de 2014, no el identificador 2024 de Foundry.
  it("las claves son las de 2014: feeblemind y branding-smite, con el identificador de Foundry aparte (I13)", () => {
    expect(SRD_SPELL_POR_KEY.get("feeblemind")?.foundryIdentifier).toBe("befuddlement");
    expect(SRD_SPELL_POR_KEY.get("branding-smite")?.foundryIdentifier).toBe("shining-smite");
    expect(SRD_SPELL_POR_KEY.has("befuddlement")).toBe(false);
  });

  it("un truco (nivel 0) nunca escala 'por espacio' (escala por nivel de personaje, actividad.mjs)", () => {
    for (const s of SRD_SPELLS.filter((sp) => sp.level === 0)) {
      for (const a of s.actividades) {
        const escalado = "dados" in a ? a.dados?.escalado : undefined;
        expect(escalado?.por).not.toBe("espacio");
      }
    }
  });

  it("classes no está vacío en ninguno, y solo trae claves de SRD_CLASSES (E-3A1-3)", () => {
    for (const s of SRD_SPELLS) {
      expect(s.classes.length).toBeGreaterThan(0);
      for (const clave of s.classes) {
        expect(CLAVES_DE_CLASE.has(clave)).toBe(true);
      }
    }
  });

  it("ninguna '@' de Foundry sobrevivió a la conversión (constraints.md)", () => {
    expect(JSON.stringify(SRD_SPELLS).includes("@")).toBe(false);
  });

  it(
    "hay conjuros con más de una actividad (108 items de Foundry con >1 actividad cruda; " +
      "los que entran en A entera son menos — 47 de esas 108 son 100% summon/transform/enchant/" +
      "teleport/forward/cast/order, fuera de A por decisión de autor — cuenta exacta medida en T2)",
    () => {
      // 77 hasta la ola de arreglos; 73 desde ella: cuatro actividades secundarias quedaron en
      // texto con motivo (dos por duración `turn` sin equivalente, C1; dos por hueco: ver
      // `rechazos.md`).
      const conVarias = SRD_SPELLS.filter((s) => s.actividades.length > 1);
      expect(conVarias.length).toBe(73);
    },
  );
});

describe("catálogo generado — cuatro conjuros contrastados a mano (E-3A1-9.c)", () => {
  it("Proyectil mágico (magic-missile): dados 1d4+1 fuerza, sin salvación ni ataque", () => {
    const s = SRD_SPELL_POR_KEY.get("magic-missile");
    expect(s?.nameEs).toBe("Proyectil mágico");
    expect(s?.actividades).toEqual([
      {
        tipo: "dados",
        dados: {
          signo: -1,
          n: 1,
          caras: 4,
          bonus: { tipo: "fijo", valor: 1 },
          tipoDeDano: "FORCE",
        },
        activation: { coste: "ACTION" },
        consumption: [],
        // 120 pies desde la ola de arreglos (C1): la actividad hereda el alcance del ítem.
        range: { unidad: "pies", distanciaFt: 120 },
        duration: { unidad: "instantanea", concentracion: false },
        effects: [],
        description: s?.textEs,
      },
    ]);
  });

  it("Bola de fuego (fireball): salvación de Destreza, 8d6 fuego, escalado por espacio", () => {
    const s = SRD_SPELL_POR_KEY.get("fireball");
    expect(s?.nameEs).toBe("Bola de fuego");
    expect(s?.actividades).toEqual([
      {
        tipo: "salvacion",
        salvacion: { ability: "dex", cd: { tipo: "cdDeConjuro" }, siSalva: "mitad" },
        dados: {
          signo: -1,
          n: 8,
          caras: 6,
          tipoDeDano: "FIRE",
          escalado: { por: "espacio", n: 1, caras: 6 },
        },
        activation: { coste: "ACTION" },
        consumption: [],
        range: { unidad: "pies", distanciaFt: 150 },
        duration: { unidad: "instantanea", concentracion: false },
        effects: [],
        materiales: {
          texto: "una pelotita de guano de murciélago y azufre",
          consumido: false,
          costeCp: 0,
        },
        description: s?.textEs,
      },
    ]);
  });

  it("Curar heridas (cure-wounds): dados 1d8 + modificador de lanzamiento, escalado por espacio", () => {
    const s = SRD_SPELL_POR_KEY.get("cure-wounds");
    expect(s?.nameEs).toBe("Curar heridas");
    expect(s?.actividades).toEqual([
      {
        tipo: "dados",
        dados: {
          signo: 1,
          n: 1,
          caras: 8,
          bonus: { tipo: "lanzamiento" },
          escalado: { por: "espacio", n: 1, caras: 8 },
        },
        activation: { coste: "ACTION" },
        consumption: [],
        range: { unidad: "toque" },
        duration: { unidad: "instantanea", concentracion: false },
        effects: [],
        description: s?.textEs,
      },
    ]);
  });

  it("Escudo (shield): reacción con su condición, 1 asalto, alcance personal — se queda en utilidad", () => {
    // Hasta la ola de arreglos (C1) este caso enshrinaba `ACTION` + instantánea: el placeholder
    // de Foundry con `override: false`, no el conjuro. El SRD y el ítem dicen reacción y 1 asalto.
    const s = SRD_SPELL_POR_KEY.get("shield");
    expect(s?.nameEs).toBe("Escudo");
    expect(s?.actividades).toEqual([
      {
        tipo: "utilidad",
        activation: {
          coste: "REACTION",
          condicion:
            "que llevas a cabo cuando te impacta un ataque o eres el objetivo del conjuro proyectil mágico",
        },
        consumption: [],
        duration: { unidad: "asalto", valor: 1, concentracion: false },
        effects: [],
        description: s?.textEs,
      },
    ]);
  });
});

// -------------------------------------------------------------------------------------------
// Tarea 3A.1 (T3) — aptitudes de clase/subclase, rasgos de raza y `enriquecerClases`. Misma
// disciplina que arriba (E-3A1-9): la fórmula, no cada aptitud — salvo las cuatro contrastadas
// a mano que pide el brief.

describe("catálogo generado de aptitudes — invariantes (T3)", () => {
  it("son 234 aptitudes de clase y subclase (constraints.md, d.1 de la tarea 0)", () => {
    expect(SRD_CLASS_FEATURES.length).toBe(234);
  });

  it("12 subclases con al menos un rasgo cada una", () => {
    const subclases = new Set(SRD_CLASS_FEATURES.filter((f) => f.subclass).map((f) => f.subclass));
    expect(subclases.size).toBe(12);
  });

  // Ola de arreglos (I10): los dos ficheros de `shared-features/` sin `requirements` (Mejora de
  // Característica, Ataque Adicional) ya no entran como «fighter, nivel 1»: son `shared` y
  // `compartidaPor` dice qué clases los conceden, leído del `advancement` de `classes/*.yml`.
  // `grappler.yml` (la dote Luchador, en la raíz de `classfeatures/`) es `feat`.
  it("toda aptitud tiene class (una de SRD_CLASSES, 'shared' o 'feat') y level entre 1 y 20", () => {
    for (const f of SRD_CLASS_FEATURES) {
      expect(CLAVES_DE_CLASE.has(f.class) || f.class === "shared" || f.class === "feat").toBe(true);
      expect(f.level).toBeGreaterThanOrEqual(1);
      expect(f.level).toBeLessThanOrEqual(20);
    }
  });

  it("las compartidas dicen quién las concede: Ataque Adicional 4 clases al 5, Mejora de Característica 12 al 4 (I10)", () => {
    const compartidas = SRD_CLASS_FEATURES.filter((f) => f.class === "shared");
    expect(compartidas.map((f) => f.key).sort()).toEqual([
      "ability-score-improvement",
      "extra-attack",
    ]);
    const extra = compartidas.find((f) => f.key === "extra-attack")!;
    expect(extra.level).toBe(5);
    expect(extra.compartidaPor?.map((c) => c.class).sort()).toEqual([
      "barbarian",
      "monk",
      "paladin",
      "ranger",
    ]);
    const asi = compartidas.find((f) => f.key === "ability-score-improvement")!;
    expect(asi.level).toBe(4);
    expect(asi.compartidaPor?.length).toBe(12);
    expect(SRD_CLASS_FEATURES.filter((f) => f.class === "feat").map((f) => f.key)).toEqual([
      "grappler",
    ]);
  });

  // Ola de arreglos (I3): los cuatro nombres que no eran literalmente los del SRD.
  it("Mejora de Característica, Duelo y Combate con Armas a Dos Manos llevan el nombre del SRD (I3)", () => {
    const porClave = new Map(SRD_CLASS_FEATURES.map((f) => [`${f.class}:${f.key}`, f]));
    expect(porClave.get("shared:ability-score-improvement")?.nameEs).toBe(
      "Mejora de Característica",
    );
    expect(porClave.get("fighter:dueling")?.nameEs).toBe("Duelo");
    expect(porClave.get("fighter:great-weapon-fighting")?.nameEs).toBe(
      "Combate con Armas a Dos Manos",
    );
    for (const key of ["ability-score-improvement", "dueling", "great-weapon-fighting"]) {
      expect(SRD_CLASS_FEATURES.find((f) => f.key === key)?.textEs).toBeTruthy();
    }
  });

  // Ola de arreglos (I11): toda clase que aparezca en un `nivelDeClase` del catálogo tiene su
  // etiqueta registrada (`nivelDeClase.<clase>` en `LABEL_KEYS` y en el vocabulario de la web).
  it("toda clase usada en un nivelDeClase del catálogo está registrada en LABEL_KEYS (I11)", () => {
    const clases = new Set<string>();
    const todo = JSON.stringify([SRD_SPELLS, SRD_CLASS_FEATURES, SRD_RACE_FEATURES]);
    for (const m of todo.matchAll(/"tipo":"nivelDeClase","clase":"([a-z-]+)"/g)) clases.add(m[1]!);
    expect([...clases].sort()).toEqual(["fighter", "monk", "sorcerer"]);
    for (const clase of clases) {
      expect((LABEL_KEYS as readonly string[]).includes(`nivelDeClase.${clase}`)).toBe(true);
    }
  });

  // Ola de arreglos (I13): ninguna clave 2024 de Foundry sobrevive como `key`.
  it("las claves de aptitud son las de 2014 (ki, deflect-missiles, natural-explorer…), no las 2024 de Foundry (I13)", () => {
    const claves = new Set(SRD_CLASS_FEATURES.map((f) => f.key));
    for (const de2014 of [
      "ki",
      "deflect-missiles",
      "diamond-soul",
      "natural-explorer",
      "vanish",
      "cleansing-touch",
      "destroy-undead",
    ]) {
      expect(claves.has(de2014)).toBe(true);
    }
    for (const de2024 of [
      "monks-focus",
      "deflect-attacks",
      "disciplined-survivor",
      "deft-explorer",
      "natures-veil",
      "restoring-touch",
      "sear-undead",
    ]) {
      expect(claves.has(de2024)).toBe(false);
    }
    expect(SRD_CLASS_FEATURES.find((f) => f.key === "ki")?.foundryIdentifier).toBe("monks-focus");
  });

  // Ola de arreglos (C3): ninguna actividad del generado consume un recurso que no sea el suyo o
  // el de otra aptitud de la misma clase (`feat:<identifier>`) — los UUID de compendio se
  // rechazaron con motivo en `rechazos.md`.
  it("toda actividad de aptitud consume su propia clave o la de otra aptitud de su clase (C3)", () => {
    const clavesPorClase = new Map<string, Set<string>>();
    for (const f of SRD_CLASS_FEATURES) {
      if (!clavesPorClase.has(f.class)) clavesPorClase.set(f.class, new Set());
      clavesPorClase.get(f.class)!.add(f.key);
    }
    for (const f of SRD_CLASS_FEATURES) {
      for (const a of f.actividades) {
        for (const c of a.consumption) {
          expect(clavesPorClase.get(f.class)!.has(c.recurso)).toBe(true);
        }
      }
    }
  });

  it("ninguna sin nameEn", () => {
    for (const f of SRD_CLASS_FEATURES) {
      expect(f.nameEn.length).toBeGreaterThan(0);
    }
  });

  // **0/234 desde T3b.** T3 dejaba ~60 aptitudes sin nombre español porque `classes.ts` (2A.3)
  // no las había verificado contra el SRD una a una — eran opciones de elección (invocaciones
  // sobrenaturales del brujo, metamagia del hechicero, opciones del arquetipo Cazador del
  // explorador…). T3b midió que **59 de esas 60 SÍ tienen nombre oficial** en `srd-5.1-es.txt`
  // (`emparejamientos.json`, `aptitudesDeClase`) y solo UNA —`fighter:grappler`, un FEAT del
  // manual del jugador, no una aptitud de clase del SRD 5.1— necesita «traducción propia,
  // marcada» (`traduccionPropia: true`). El ruling del autor prohíbe dejar algo sin nombre
  // cuando hay una alternativa marcada: por eso `sinTraduccion` es 0 en TODO el catálogo.
  it("ninguna aptitud se queda sin nameEs — el ruling «traducción propia, marcada» cierra las que el SRD no nombra", () => {
    const sinTraduccion = SRD_CLASS_FEATURES.filter((f) => f.sinTraduccion);
    expect(sinTraduccion.length).toBe(0);
    for (const f of SRD_CLASS_FEATURES) {
      expect(f.nameEs).not.toBeNull();
    }
  });

  it("traduccionPropia: exactamente 1 (fighter:grappler, único FEAT sin equivalente en el SRD 5.1)", () => {
    const propias = SRD_CLASS_FEATURES.filter((f) => f.traduccionPropia);
    expect(propias.length).toBe(1);
    expect(propias[0]?.key).toBe("grappler");
    expect(propias[0]?.nameEs).toBe("Presa");
  });

  // **≥95% de las aptitudes NOMBRADAS Y de nombre oficial** traen `textEs` — la población
  // elegible excluye las de `traduccionPropia` (por definición no hay prosa oficial que buscar
  // para ellas). El número exacto (medido, no un techo inventado) es la barrera: si baja, algo
  // del corte se rompió; si sube, alguien encontró una más (documentar la que falta).
  it("≥95% de las aptitudes con nombre oficial tienen textEs (228/233, T3b)", () => {
    const conNombreOficial = SRD_CLASS_FEATURES.filter((f) => f.nameEs && !f.traduccionPropia);
    const conTextEs = conNombreOficial.filter((f) => f.textEs);
    expect(conNombreOficial.length).toBe(233);
    expect(conTextEs.length).toBe(228);
    expect(conTextEs.length / conNombreOficial.length).toBeGreaterThanOrEqual(0.95);
  });

  it("ningún textEs trae espacio doble ni el pie de página del PDF (limpiarProsaEs, T3b; C4)", () => {
    for (const f of [...SRD_CLASS_FEATURES, ...SRD_RACE_FEATURES]) {
      if (f.textEs) expect(f.textEs).not.toMatch(/ {2,}/);
      expect(f.textEs ?? "").not.toMatch(/Prohibida la reventa|Documento de referencia/);
      for (const a of f.actividades)
        expect(a.description ?? "").not.toMatch(/Prohibida la reventa/);
    }
  });

  // Ola de arreglos (I11): la `description` de una actividad de aptitud va en español cuando la
  // aptitud tiene prosa española (antes iba siempre en inglés).
  it("la description de las actividades de aptitud es la prosa española cuando la hay (I11)", () => {
    for (const f of SRD_CLASS_FEATURES) {
      if (!f.textEs || f.key === "rage") continue;
      for (const a of f.actividades) expect(a.description).toBe(f.textEs);
    }
  });

  it("ninguna aptitud tiene actividades: [] Y textEn: '' a la vez (nunca las dos vacías)", () => {
    for (const f of SRD_CLASS_FEATURES) {
      expect(f.actividades.length > 0 || f.textEn.length > 0).toBe(true);
    }
  });

  it("ninguna '@' de Foundry sobrevivió a la conversión", () => {
    expect(JSON.stringify(SRD_CLASS_FEATURES).includes("@")).toBe(false);
  });

  // Re-revisión de la ola de arreglos (2026-09-14) — `cortarAptitudesEs` (T3b, `srd-es.mjs`)
  // tomaba una frase intermedia («Campeón.», «Abierta.», «Inspiración Bárdica.») por la cabecera
  // de la SIGUIENTE aptitud y cortaba `textEs` a media frase (8 aptitudes medidas), y
  // `warlock:voice-of-the-chain-master` arrastraba la sección de capítulo «Patrones
  // sobrenaturales» por no reconocerla como límite. Las tres excepciones de
  // `SIN_PUNTUACION_FINAL_CONOCIDAS` son residuo MEDIDO, no una regresión: el propio SRD termina
  // ahí sin punto — una fórmula de CD («Ki», «Lanzamiento de Conjuros» del explorador) o el
  // título de una tabla («Ancestro Dragón» antes de «Linaje dracónico / Dragón / Tipo de daño…»)
  // — igual que la tabla de `control-weather` en un conjuro. Si esta lista creciera, es una
  // aptitud nueva cortada mal, no una a añadir sin mirar el SRD.
  const SIN_PUNTUACION_FINAL_CONOCIDAS = new Set([
    "monk:ki",
    "ranger:spellcasting",
    "sorcerer/draconic-bloodline:dragon-ancestor",
  ]);

  it('ningún textEs de aptitud termina sin puntuación (salvo residuo medido) ni contiene "Patrones sobrenaturales" de otra sección', () => {
    for (const f of SRD_CLASS_FEATURES) {
      if (!f.textEs) continue;
      expect(f.textEs).not.toMatch(/Patrones sobrenaturales/);
      const clave = `${f.subclass ? `${f.class}/${f.subclass}` : f.class}:${f.key}`;
      if (SIN_PUNTUACION_FINAL_CONOCIDAS.has(clave)) continue;
      expect(f.textEs.trim()).toMatch(/[.!?"”)]$/);
    }
  });
});

describe("enriquecerClases — ninguna ClassFeature de SRD_CLASSES se queda sin texto (T3)", () => {
  it("toda ClassFeature de toda clase y de toda subclase trae textEn no vacío", () => {
    for (const clase of SRD_CLASSES) {
      for (const f of clase.features) {
        expect(f.textEn && f.textEn.length > 0).toBeTruthy();
      }
      for (const sub of clase.subclasses) {
        for (const f of sub.features) {
          expect(f.textEn && f.textEn.length > 0).toBeTruthy();
        }
      }
    }
  });

  // Menor 6 de la revisión: cuando una ClassFeature no tiene fila generada, `textEn`/`textEs` son
  // su propio nombre con `sinTraduccion: true`. Son exactamente estas cinco, medidas — si
  // aparece una sexta, o desaparece una, se lee aquí.
  it("exactamente cinco ClassFeature de SRD_CLASSES no tienen fila generada (sinTraduccion)", () => {
    const sinFila: string[] = [];
    for (const clase of SRD_CLASSES) {
      for (const f of clase.features) if (f.sinTraduccion) sinFila.push(`${clase.key}:${f.key}`);
      for (const sub of clase.subclasses)
        for (const f of sub.features)
          if (f.sinTraduccion) sinFila.push(`${clase.key}/${sub.key}:${f.key}`);
    }
    expect(sinFila.sort()).toEqual([
      "paladin/oath-of-devotion:oath-spells",
      "paladin:aura-improvements",
      "ranger:favored-enemy-improvement",
      "ranger:favored-enemy-improvement-2",
      "ranger:natural-explorer-improvement",
    ]);
  });
});

// Ola de arreglos (C3): un `grant` construido por `enriquecerClases` solo puede consumir un
// recurso que un rasgo de su clase siembre (`sheet.activities[].usos` → `CharacterResource`),
// y solo una `ClassFeature` por aptitud de Foundry lo lleva. Antes había 60 grants con recursos
// que nadie sembraba (`monk:ki` sembraba «ki» y consumía «monks-focus»; `channel-divinity-1/2/3`
// sembraban tres filas y consumían «channel-divinity»): 409 en la mesa o 0 usos.
describe("enriquecerClases — concesiones y recursos (C3)", () => {
  function concesionesDe(clase: (typeof SRD_CLASSES)[number]) {
    return [
      ...clase.features.map((f) => ({ owner: clase.key, f })),
      ...clase.subclasses.flatMap((sub) =>
        sub.features.map((f) => ({ owner: `${clase.key}/${sub.key}`, f })),
      ),
    ].filter(({ f }) => f.grant);
  }

  it("todo recurso que consume un grant lo siembra un rasgo con usos de la misma clase", () => {
    for (const clase of SRD_CLASSES) {
      const concesiones = concesionesDe(clase);
      const sembrados = new Set(concesiones.filter(({ f }) => f.grant?.usos).map(({ f }) => f.key));
      for (const { owner, f } of concesiones) {
        for (const c of f.grant!.actividad.consumption ?? []) {
          expect({
            owner,
            key: f.key,
            recurso: c.recurso,
            existe: sembrados.has(c.recurso),
          }).toEqual({
            owner,
            key: f.key,
            recurso: c.recurso,
            existe: true,
          });
        }
      }
    }
  });

  it("una sola ClassFeature por aptitud de Foundry lleva grant: channel-divinity-1 sí, -2 y -3 no", () => {
    const cleric = SRD_CLASSES.find((c) => c.key === "cleric")!;
    const porClave = new Map(cleric.features.map((f) => [f.key, f]));
    expect(porClave.get("channel-divinity-1")?.grant).toBeDefined();
    expect(porClave.get("channel-divinity-2")?.grant).toBeUndefined();
    expect(porClave.get("channel-divinity-3")?.grant).toBeUndefined();
    // Y Preservar Vida (Dominio de la Vida) consume la fila que siembra channel-divinity-1.
    const vida = cleric.subclasses.find((s) => s.key === "life-domain")!;
    const preservar = vida.features.find((f) => f.key === "preserve-life")!;
    expect(preservar.grant).toBeUndefined(); // su curación 5×nivel es un hueco (texto)
  });

  it("las concesiones sin recurso se cuentan, no se construyen (CONCESIONES_SIN_RECURSO)", () => {
    // Palabras Cortantes y Habilidad Sin Parangón consumen Inspiración Bárdica, cuyos usos
    // (`max(1, @abilities.cha.mod)`) no caben en Origen: sin fila sembrada, sin grant.
    // Inspiración Bárdica, Sentidos Divinos y Toque Purificador consumen sus propios usos, pero
    // esos usos se rechazaron (I2) y sin fila sembrada tampoco hay grant; Canalizar Divinidad del
    // Juramento de Devoción consume la de paladín, que classes.ts no declara como rasgo base.
    expect(CONCESIONES_SIN_RECURSO.map((c) => `${c.owner}:${c.key}`).sort()).toEqual([
      "bard/lore:cutting-words",
      "bard/lore:peerless-skill",
      "bard:bardic-inspiration-d10",
      "bard:bardic-inspiration-d12",
      "bard:bardic-inspiration-d6",
      "bard:bardic-inspiration-d8",
      "paladin/oath-of-devotion:channel-divinity",
      "paladin:cleansing-touch",
      "paladin:divine-sense",
    ]);
  });

  it("un monje de nivel 5 tiene Ki con usos nivelDeClase(monk), y Tomar Aliento consume second-wind", () => {
    const monk = SRD_CLASSES.find((c) => c.key === "monk")!;
    const ki = monk.features.find((f) => f.key === "ki")!;
    expect(ki.grant?.usos?.max).toEqual({ tipo: "nivelDeClase", clase: "monk" });
    expect(ki.grant?.actividad.consumption).toEqual([{ recurso: "ki", cantidad: 1 }]);
    const fighter = SRD_CLASSES.find((c) => c.key === "fighter")!;
    const sw = fighter.features.find((f) => f.key === "second-wind")!;
    expect(sw.grant?.actividad.consumption).toEqual([{ recurso: "second-wind", cantidad: 1 }]);
    expect(sw.grant?.usos).toEqual({ max: { tipo: "fijo", valor: 1 }, resetOn: "SHORT_REST" });
  });
});

describe("cuatro aptitudes contrastadas a mano (T3, Step 4 del brief)", () => {
  it("Tomar Aliento (fighter:second-wind): dados 1d10 + nivelDeClase(fighter), usos 1 SHORT_REST", () => {
    const f = SRD_CLASSES.find((c) => c.key === "fighter")!.features.find(
      (x) => x.key === "second-wind",
    )!;
    expect(f.nameEn).toBe("Second Wind");
    expect(f.textEs).toMatch(/^Posees una pequeña reserva/);
    expect(f.actividades).toEqual([
      {
        tipo: "dados",
        dados: { signo: 1, n: 1, caras: 10, bonus: { tipo: "nivelDeClase", clase: "fighter" } },
        activation: { coste: "BONUS" },
        consumption: [{ recurso: "second-wind", cantidad: 1 }],
        duration: { unidad: "instantanea", concentracion: false },
        effects: [],
        // I11: en español, como los conjuros (antes enshrinaba `f.textEn`).
        description: f.textEs,
      },
    ]);
  });

  it("Ataque Furtivo (rogue:sneak-attack): se queda en texto — dados por escala, hueco A", () => {
    const f = SRD_CLASSES.find((c) => c.key === "rogue")!.features.find(
      (x) => x.key === "sneak-attack",
    )!;
    expect(f.actividades).toEqual([]);
    expect(f.textEn && f.textEn.length > 0).toBeTruthy();
    expect(f.textEs).toMatch(/^A partir del nivel 1, sabes cómo atacar sutilmente/);
  });

  it("Imponer las Manos (paladin:lay-on-hands): se queda en texto — consumo variable, hueco C", () => {
    const f = SRD_CLASSES.find((c) => c.key === "paladin")!.features.find(
      (x) => x.key === "lay-on-hands",
    )!;
    expect(f.actividades).toEqual([]);
    expect(f.textEn && f.textEn.length > 0).toBeTruthy();
    expect(f.textEs).toMatch(/^Tu toque bendito puede curar heridas/);
  });

  it("Acción Súbita (fighter:action-surge-1): usos escala(fighter-action-surge) SHORT_REST, utilidad, y action-surge-2 sin grant", () => {
    // classes.ts declara `action-surge-1` (nivel 2, un uso) y `action-surge-2` (nivel 17, dos
    // usos) — dos ClassFeature sintéticas para el mismo fichero de Foundry (`action-surge`,
    // requirements "Fighter 2"), que sube de tramo con el nivel; `enriquecerClases` las
    // resuelve las dos a la misma aptitud quitando el sufijo `-N` (ver `claveSinSufijoDeTramo`
    // en `generado/index.ts`).
    const f = SRD_CLASSES.find((c) => c.key === "fighter")!.features.find(
      (x) => x.key === "action-surge-1",
    )!;
    expect(f.nameEn).toBe("Action Surge");
    expect(f.actividades?.[0]?.tipo).toBe("utilidad");
    expect(f.actividades?.[0]?.activation).toEqual({ coste: "FREE" });
    expect(f.textEs).toMatch(/^A partir del nivel 2, puedes superar tus límites/);
    // Menor 2 de la revisión: el título prometía usos y no se comprobaban. Foundry los da por
    // escala (`@scale.fighter.action-surge`: 1 al nivel 2, 2 al 17) — y el grant consume la fila
    // que siembra ESTA ClassFeature (`action-surge-1`), no la clave cruda de Foundry (C3).
    expect(f.grant?.usos).toEqual({
      max: { tipo: "escala", clave: "fighter-action-surge" },
      resetOn: "SHORT_REST",
    });
    expect(f.grant?.actividad.consumption).toEqual([{ recurso: "action-surge-1", cantidad: 1 }]);
    const segunda = SRD_CLASSES.find((c) => c.key === "fighter")!.features.find(
      (x) => x.key === "action-surge-2",
    )!;
    expect(segunda.grant).toBeUndefined();
  });

  it("un bárbaro de nivel 5 tiene «Ataque adicional» con texto", () => {
    const f = SRD_CLASSES.find((c) => c.key === "barbarian")!.features.find(
      (x) => x.key === "extra-attack" && x.level === 5,
    )!;
    expect(f).toBeDefined();
    expect(f.textEn && f.textEn.length > 0).toBeTruthy();
  });
});

describe("rasgos de raza — invariantes (T3, alcance reducido — ver razas.mjs)", () => {
  it("hay rasgos generados, con nameEn y sin '@' de Foundry", () => {
    expect(SRD_RACE_FEATURES.length).toBeGreaterThan(0);
    for (const f of SRD_RACE_FEATURES) {
      expect(f.nameEn.length).toBeGreaterThan(0);
    }
    expect(JSON.stringify(SRD_RACE_FEATURES).includes("@")).toBe(false);
  });

  // T3b — mismo ruling que en las aptitudes de clase: 0 rasgos sin nameEs. Los diez colores del
  // Ataque de Aliento dracónido no tienen nombre propio en el SRD (una sola aptitud genérica con
  // una tabla color→daño) y van con «traducción propia, marcada».
  it("ninguna sin nameEs — el ruling «traducción propia, marcada» cierra los diez colores de dracónido", () => {
    for (const f of SRD_RACE_FEATURES) {
      expect(f.sinTraduccion).toBe(false);
      expect(f.nameEs).not.toBeNull();
    }
  });

  it("traduccionPropia: exactamente 10 (los diez colores del Ataque de Aliento dracónido)", () => {
    const propias = SRD_RACE_FEATURES.filter((f) => f.traduccionPropia);
    expect(propias.length).toBe(10);
    for (const f of propias) expect(f.race).toBe("dragonborn");
  });

  it("≥95% de los rasgos con nombre oficial tienen textEs (16/16, T3b)", () => {
    const conNombreOficial = SRD_RACE_FEATURES.filter((f) => f.nameEs && !f.traduccionPropia);
    const conTextEs = conNombreOficial.filter((f) => f.textEs);
    expect(conNombreOficial.length).toBe(16);
    expect(conTextEs.length).toBe(16);
  });

  it("ningún textEs trae espacio doble (limpiarProsaEs, T3b)", () => {
    for (const f of SRD_RACE_FEATURES) {
      if (f.textEs) expect(f.textEs).not.toMatch(/ {2,}/);
    }
  });
});

describe("enriquecerRazas — SRD_RACES trae los FeatureGrant con key enriquecidos (T3b)", () => {
  it("dwarf-stonecunning (Afinidad con la piedra) trae textEs, empezando como el SRD", () => {
    const enano = SRD_RACES.find((r) => r.key === "dwarf")!;
    const grant = enano.grants.find((g) => g.id === "dwarf-stonecunning")!;
    expect(grant.kind).toBe("feature");
    if (grant.kind === "feature") {
      expect(grant.nameEn).toBe("Stonecunning");
      expect(grant.textEs).toMatch(/^Cuando hagas una prueba/);
      expect(grant.sinTraduccion).toBe(false);
    }
  });

  it("un FeatureGrant sin key se devuelve sin cambios (dragonborn-ancestry, sin fila 1:1)", () => {
    const draconido = SRD_RACES.find((r) => r.key === "dragonborn")!;
    const grant = draconido.grants.find((g) => g.id === "dragonborn-ancestry")!;
    expect(grant.kind).toBe("feature");
    if (grant.kind === "feature") {
      expect(grant.name).toBe("Linaje dracónico");
      expect(grant.nameEn).toBeUndefined();
    }
  });
});
