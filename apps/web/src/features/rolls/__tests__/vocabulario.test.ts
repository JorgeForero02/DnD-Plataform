import { describe, expect, it } from "vitest";
import { AUDIENCIAS_DE_TIRADA, audienciaDeTirada } from "../vocabulario";

describe("audienciaDeTirada", () => {
  it("cada audiencia tiene etiqueta, frase y resumen, y audienciaDeTirada las encuentra", () => {
    for (const a of AUDIENCIAS_DE_TIRADA) {
      expect(a.resumen.length).toBeGreaterThan(0);
      expect(audienciaDeTirada(a.audiencia)).toBe(a);
    }
  });
});
