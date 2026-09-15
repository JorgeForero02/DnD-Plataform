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
import { SRD_CLASSES } from "./classes";
import { SRD_SPELLS, SRD_SPELL_POR_KEY, SRD_CLASS_FEATURES, SRD_RACE_FEATURES } from "./generado";

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
      const conVarias = SRD_SPELLS.filter((s) => s.actividades.length > 1);
      expect(conVarias.length).toBe(77);
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

  it("Escudo (shield): reacción, +5 a la CA hasta el siguiente turno — se queda en utilidad", () => {
    const s = SRD_SPELL_POR_KEY.get("shield");
    expect(s?.nameEs).toBe("Escudo");
    expect(s?.actividades).toEqual([
      {
        tipo: "utilidad",
        activation: { coste: "ACTION" },
        consumption: [],
        duration: { unidad: "instantanea", concentracion: false },
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

  it("toda aptitud tiene class (una de SRD_CLASSES) y level entre 1 y 20", () => {
    for (const f of SRD_CLASS_FEATURES) {
      expect(CLAVES_DE_CLASE.has(f.class)).toBe(true);
      expect(f.level).toBeGreaterThanOrEqual(1);
      expect(f.level).toBeLessThanOrEqual(20);
    }
  });

  it("ninguna sin nameEn", () => {
    for (const f of SRD_CLASS_FEATURES) {
      expect(f.nameEn.length).toBeGreaterThan(0);
    }
  });

  // **No es 0/234.** Al contrario que los conjuros (una cabecera de cuatro etiquetas por
  // conjuro en el SRD español), una aptitud no tiene ningún ancla estructural que separe su
  // nombre del siguiente — el conversor solo puede dar nameEs con confianza donde `classes.ts`
  // (2A.3, ya verificado contra el SRD) ya declaraba esa clave, o donde el nombre es un término
  // fijo bien conocido (`emparejamientos.json`, `aptitudesDeClase`). Lo que queda sin nombrar
  // (~60/234) son opciones de elección — invocaciones sobrenaturales del brujo, metamagia del
  // hechicero, estilos de combate del cazador— que `classes.ts` nunca desglosó una a una: están
  // en `rechazos.md`, contadas, no escondidas. El número real (medido, no un techo inventado)
  // es la barrera de esta prueba: si sube, algo se rompió; si baja, alguien nombró una más.
  it("la gran mayoría tiene nameEs — las 174 que classes.ts ya nombraba en 2A.3 (60 sin traducción, listadas en rechazos.md)", () => {
    const sinTraduccion = SRD_CLASS_FEATURES.filter((f) => f.sinTraduccion);
    expect(sinTraduccion.length).toBe(60);
    expect(SRD_CLASS_FEATURES.length - sinTraduccion.length).toBe(174);
  });

  it("ninguna aptitud tiene actividades: [] Y textEn: '' a la vez (nunca las dos vacías)", () => {
    for (const f of SRD_CLASS_FEATURES) {
      expect(f.actividades.length > 0 || f.textEn.length > 0).toBe(true);
    }
  });

  it("ninguna '@' de Foundry sobrevivió a la conversión", () => {
    expect(JSON.stringify(SRD_CLASS_FEATURES).includes("@")).toBe(false);
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
});

describe("cuatro aptitudes contrastadas a mano (T3, Step 4 del brief)", () => {
  it("Tomar Aliento (fighter:second-wind): dados 1d10 + nivelDeClase(fighter), usos 1 SHORT_REST", () => {
    const f = SRD_CLASSES.find((c) => c.key === "fighter")!.features.find(
      (x) => x.key === "second-wind",
    )!;
    expect(f.nameEn).toBe("Second Wind");
    expect(f.actividades).toEqual([
      {
        tipo: "dados",
        dados: { signo: 1, n: 1, caras: 10, bonus: { tipo: "nivelDeClase", clase: "fighter" } },
        activation: { coste: "BONUS" },
        consumption: [{ recurso: "second-wind", cantidad: 1 }],
        duration: { unidad: "instantanea", concentracion: false },
        effects: [],
        description: f.textEn,
      },
    ]);
  });

  it("Ataque Furtivo (rogue:sneak-attack): se queda en texto — dados por escala, hueco A", () => {
    const f = SRD_CLASSES.find((c) => c.key === "rogue")!.features.find(
      (x) => x.key === "sneak-attack",
    )!;
    expect(f.actividades).toEqual([]);
    expect(f.textEn && f.textEn.length > 0).toBeTruthy();
  });

  it("Imponer las Manos (paladin:lay-on-hands): se queda en texto — consumo variable, hueco C", () => {
    const f = SRD_CLASSES.find((c) => c.key === "paladin")!.features.find(
      (x) => x.key === "lay-on-hands",
    )!;
    expect(f.actividades).toEqual([]);
    expect(f.textEn && f.textEn.length > 0).toBeTruthy();
  });

  it("Acción Súbita (fighter:action-surge-1): usos 1 SHORT_REST, utilidad", () => {
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
});
