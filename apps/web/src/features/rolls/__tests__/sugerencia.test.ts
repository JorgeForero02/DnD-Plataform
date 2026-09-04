import { describe, expect, it } from "vitest";
import type { SuggestedRollMode } from "@dnd/shared";
import { fraseDeSugerencia, modoSugerido } from "../sugerencia";

// Ficha M16 — **el servidor sugería y nadie lo leía.** Esto prueba la traducción de la sugerencia
// a la frase que ve la mesa, y sobre todo las cuatro que se confunden entre sí: nada, fallo
// automático, anulación mutua, y una sola dirección.

function s(p: Partial<SuggestedRollMode>): SuggestedRollMode {
  return { kind: "CHECK", mode: "NORMAL", cancelled: false, autoFail: false, reasons: [], ...p };
}

const ENVENENADO = {
  effect: "DISADVANTAGE" as const,
  sourceKey: "poisoned",
  labelKey: "condition.poisoned",
};
const INVISIBLE = {
  effect: "ADVANTAGE" as const,
  sourceKey: "invisible",
  labelKey: "condition.invisible",
};
const AGOTAMIENTO_3 = {
  effect: "DISADVANTAGE" as const,
  sourceKey: "exhaustion:3",
  labelKey: "condition.exhaustion",
};
const PARALIZADO = {
  effect: "AUTO_FAIL" as const,
  sourceKey: "paralyzed",
  labelKey: "condition.paralyzed",
};

describe("la frase de la sugerencia", () => {
  it("sin causas no dice nada: no se pinta un aviso vacío", () => {
    expect(fraseDeSugerencia(s({}))).toBeNull();
    expect(fraseDeSugerencia(undefined)).toBeNull();
  });

  it("una desventaja nombra la condición en castellano, nunca su clave", () => {
    const frase = fraseDeSugerencia(s({ mode: "DISADVANTAGE", reasons: [ENVENENADO] }));
    expect(frase).toBe("Desventaja sugerida: Envenenado");
    expect(frase).not.toContain("poisoned");
  });

  it("el agotamiento sale con su nivel, que es lo que distingue el 1 del 3", () => {
    expect(fraseDeSugerencia(s({ mode: "DISADVANTAGE", reasons: [AGOTAMIENTO_3] }))).toBe(
      "Desventaja sugerida: Agotamiento nivel 3",
    );
  });

  it("varias causas se nombran TODAS: quitar una de las dos cambia lo que se sabe", () => {
    expect(
      fraseDeSugerencia(s({ mode: "DISADVANTAGE", reasons: [ENVENENADO, AGOTAMIENTO_3] })),
    ).toBe("Desventaja sugerida: Envenenado, Agotamiento nivel 3");
  });

  it("ventaja y desventaja a la vez NO es lo mismo que «nada te afecta»", () => {
    // El SRD las distingue con todas las letras: *"If circumstances cause a roll to have both
    // advantage and disadvantage, you are considered to have neither of them, and you roll one
    // d20"*. Las dos dan `mode: "NORMAL"`, y son dos frases distintas — con `cancelled` no
    // separado, la mesa no podría saber que hubo dos cosas.
    const anulada = s({ mode: "NORMAL", cancelled: true, reasons: [INVISIBLE, ENVENENADO] });
    const nada = s({ mode: "NORMAL", reasons: [] });

    expect(fraseDeSugerencia(anulada)).toBe(
      "Ventaja y desventaja se anulan: tiras un solo d20 (Invisible, Envenenado)",
    );
    expect(fraseDeSugerencia(nada)).toBeNull();
    expect(fraseDeSugerencia(anulada)).not.toBe(fraseDeSugerencia(nada));
  });

  it("el fallo automático manda, y no se suaviza a «desventaja»", () => {
    // Con desventaja aún se puede sacar la CD; con fallo automático no hay tirada. El caso lleva
    // además una desventaja al lado, para que se vea que no gana la desventaja.
    const frase = fraseDeSugerencia(
      s({
        kind: "SAVE",
        ability: "dex",
        autoFail: true,
        mode: "DISADVANTAGE",
        reasons: [PARALIZADO, ENVENENADO],
      }),
    );
    expect(frase).toBe("Fallo automático: Paralizado");
    expect(frase).not.toContain("Desventaja");
  });
});

describe("el modo con el que se abre el panel", () => {
  it("arranca en el sugerido", () => {
    expect(modoSugerido(s({ mode: "DISADVANTAGE", reasons: [ENVENENADO] }))).toBe("DISADVANTAGE");
    expect(modoSugerido(s({ mode: "ADVANTAGE", reasons: [INVISIBLE] }))).toBe("ADVANTAGE");
  });

  it("sin sugerencia, normal", () => {
    expect(modoSugerido(undefined)).toBe("NORMAL");
    expect(modoSugerido(s({}))).toBe("NORMAL");
  });

  it("con fallo automático NO preselecciona el modo del servidor", () => {
    // El modo no describe lo que va a pasar —no hay tirada—, así que preseleccionar «desventaja»
    // sería que la pantalla contradijera al servidor. El aviso ya dice lo que pasa.
    expect(modoSugerido(s({ autoFail: true, mode: "DISADVANTAGE", reasons: [PARALIZADO] }))).toBe(
      "NORMAL",
    );
  });
});
