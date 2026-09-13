import { describe, expect, it } from "vitest";
import type { CampaignLinkRow, EntityType } from "@dnd/shared";
import type { Entity } from "../../../../entities/api";
import { arbolDelMundo, vecinosDe } from "../arbolDelMundo";

// Qué defiende este fichero: **que el desglose del mundo cuelga cada ficha de UN padre por un
// rótulo de jerarquía, que lo lateral no mueve nada, que dos padres no pierden a la hija y que
// un ciclo termina.** Es el módulo puro del árbol (Task 14 bis, D-CF-64): se ejecuta en `node`,
// sin navegador, igual que `wikilinks.ts`.

function ent(id: string, name: string, type: EntityType): Entity {
  return {
    id,
    campaignId: "c1",
    type,
    name,
    tags: [],
    visibility: "DM_ONLY",
    createdById: "u-dm",
    createdAt: "2026-09-12T00:00:00.000Z",
  };
}

/** Un hilo tal y como llega de `GET /campaigns/:id/links`. Los extremos desconocidos se rellenan. */
function hilo(fromId: string, toId: string, label: string | null): CampaignLinkRow {
  return {
    id: `${fromId}->${toId}:${label ?? ""}`,
    fromId,
    toId,
    label,
    from: { id: fromId, name: `?${fromId}`, type: "NPC" },
    to: { id: toId, name: `?${toId}`, type: "LOCATION" },
  };
}

const lugar = ent("l1", "Torre Gris", "LOCATION");
const pnj = ent("n1", "Corvin", "NPC");
const faccion = ent("f1", "Gremio", "FACTION");
const suelto = ent("n2", "Errante", "NPC");

describe("arbolDelMundo", () => {
  it("agrupa por tipo con contador y cuelga por rótulo de jerarquía", () => {
    const a = arbolDelMundo([lugar, pnj, faccion, suelto], [hilo("n1", "l1", "vive en")]);
    const lugares = a.raices.find((r) => r.type === "LOCATION")!;
    expect(lugares.total).toBe(1);
    expect(lugares.hijos[0].hijos.map((h) => [h.name, h.rotulo])).toEqual([["Corvin", "vive en"]]);
    const pnjs = a.raices.find((r) => r.type === "NPC")!;
    expect(pnjs.hijos.map((h) => h.name)).toEqual(["Errante"]); // sin padre: bajo su tipo
    // El contador cuenta las fichas del tipo, no solo las que cuelgan de la raíz: Corvin está
    // bajo la Torre y sigue siendo un PNJ.
    expect(pnjs.total).toBe(2);
  });

  it("un hilo lateral no mueve nada", () => {
    const a = arbolDelMundo([pnj, faccion], [hilo("n1", "f1", "es aliado de")]);
    expect(a.raices.find((r) => r.type === "NPC")!.hijos[0].name).toBe("Corvin");
    expect(a.raices.find((r) => r.type === "FACTION")!.hijos[0].hijos).toEqual([]);
  });

  it("el rótulo se compara sin distinguir mayúsculas ni espacios de más", () => {
    const a = arbolDelMundo([lugar, pnj], [hilo("n1", "l1", "  Vive En ")]);
    expect(a.raices.find((r) => r.type === "LOCATION")!.hijos[0].hijos[0].name).toBe("Corvin");
  });

  it("dos padres: aparece en los dos, marcada «también en»", () => {
    const a = arbolDelMundo(
      [lugar, faccion, pnj],
      [hilo("n1", "l1", "vive en"), hilo("n1", "f1", "pertenece a")],
    );
    const bajoLugar = a.raices.find((r) => r.type === "LOCATION")!.hijos[0].hijos[0];
    const bajoFaccion = a.raices.find((r) => r.type === "FACTION")!.hijos[0].hijos[0];
    expect(bajoLugar.tambienEn).toEqual(["Gremio"]);
    expect(bajoFaccion.tambienEn).toEqual(["Torre Gris"]);
    // Y con un padre no aparece en ningún otro sitio: `tambienEn` vacío.
    expect(a.raices.find((r) => r.type === "NPC")!.hijos).toEqual([]);
  });

  it("un ciclo se corta y se marca", () => {
    const a = ent("a", "A", "LOCATION");
    const b = ent("b", "B", "LOCATION");
    const arbol = arbolDelMundo(
      [a, b],
      [hilo("a", "b", "forma parte de"), hilo("b", "a", "forma parte de")],
    );
    const texto = JSON.stringify(arbol);
    expect(texto).toContain('"cicloCortado":true');
    expect(texto.length).toBeLessThan(5000); // termina
    // Ninguna de las dos es raíz de verdad (las dos tienen padre), pero el mundo no puede
    // esconderlas: una de ellas se levanta como raíz para que el ciclo entero se vea.
    const lugares = arbol.raices.find((r) => r.type === "LOCATION")!;
    expect(lugares.hijos).toHaveLength(1);
    expect(lugares.hijos[0].hijos[0].hijos[0].cicloCortado).toBe(true);
  });

  it("sinHilos lista las fichas sin ningún hilo", () => {
    expect(
      arbolDelMundo([lugar, suelto], [hilo("n2x", "l1", "vive en")]).sinHilos.map((s) => s.name),
    ).toEqual(["Errante"]);
  });

  it("un hilo hacia una ficha que no está en la lista (no visible) no cuelga nada ni rompe", () => {
    const a = arbolDelMundo([pnj], [hilo("n1", "fantasma", "vive en")]);
    expect(a.raices.find((r) => r.type === "NPC")!.hijos.map((h) => h.name)).toEqual(["Corvin"]);
    expect(a.sinHilos).toEqual([]);
  });

  it("ordena hijos y raíces por nombre, con las reglas del español", () => {
    const a = arbolDelMundo(
      [ent("z", "Zarza", "NPC"), ent("á", "Ábaco", "NPC"), ent("b", "Bruma", "NPC")],
      [],
    );
    expect(a.raices.find((r) => r.type === "NPC")!.hijos.map((h) => h.name)).toEqual([
      "Ábaco",
      "Bruma",
      "Zarza",
    ]);
  });
});

describe("vecinosDe", () => {
  it("devuelve los dos sentidos, leídos desde la ficha abierta", () => {
    const vecinos = vecinosDe(
      "l1",
      [lugar, pnj, faccion],
      [hilo("n1", "l1", "vive en"), hilo("l1", "f1", "custodia")],
    );
    expect(vecinos.map((v) => [v.name, v.rotulo, v.direccion])).toEqual([
      ["Corvin", "es el hogar de", "entra"],
      ["Gremio", "custodia", "sale"],
    ]);
    expect(vecinos.map((v) => v.type)).toEqual(["NPC", "FACTION"]);
  });

  it("sin etiqueta sigue habiendo vecino, y no se inventa la inversa de una frase libre", () => {
    const vecinos = vecinosDe("l1", [lugar, pnj], [hilo("n1", "l1", "le teme a")]);
    expect(vecinos).toHaveLength(1);
    expect(vecinos[0].rotulo).toBe("recibe un enlace de");
    expect(vecinosDe("l1", [lugar, pnj], [hilo("l1", "n1", null)])[0].rotulo).toBe("enlaza con");
  });

  it("un vecino que no está en la lista toma el nombre que trae el hilo", () => {
    const vecinos = vecinosDe("l1", [lugar], [hilo("n9", "l1", "vive en")]);
    expect(vecinos[0].name).toBe("?n9");
  });
});
