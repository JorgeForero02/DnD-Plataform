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
import { SRD_SPELLS, SRD_SPELL_POR_KEY } from "./generado";

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
