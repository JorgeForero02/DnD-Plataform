import { describe, expect, it } from "vitest";
import { loVeLaMesa } from "./visibility.schema";

// Fix round 3 (Task 26) — `loVeLaMesa` vivía copiada en dos sitios: `apps/api/src/common/
// visibility.ts` (el original) y `apps/web/src/features/character-sheet/TirarAtaqueBoton.tsx`
// (una copia a mano, porque la web no puede importar de `apps/api`). La regla que no se negocia
// dice que la matriz de visibilidad no se reimplementa por ahí suelta — la solución no es que la
// web copie bien, es que las dos dejen de tener su propia copia y compartan la de `@dnd/shared`,
// que las dos pueden importar.
//
// `PUBLIC` y `PLAYERS` la ve la mesa entera. `SPECIFIC_PLAYERS` la ven los concedidos —que
// pueden no ser todos, o ninguno—, `OWNER_DM` la ve el creador, y `DM_ONLY` no la ve nadie salvo
// el DM: ninguno de los tres es "la mesa", así que los tres dan `false`.
describe("loVeLaMesa", () => {
  it("es true para PUBLIC y PLAYERS", () => {
    expect(loVeLaMesa("PUBLIC")).toBe(true);
    expect(loVeLaMesa("PLAYERS")).toBe(true);
  });

  it("es false para SPECIFIC_PLAYERS, OWNER_DM y DM_ONLY", () => {
    expect(loVeLaMesa("SPECIFIC_PLAYERS")).toBe(false);
    expect(loVeLaMesa("OWNER_DM")).toBe(false);
    expect(loVeLaMesa("DM_ONLY")).toBe(false);
  });
});
