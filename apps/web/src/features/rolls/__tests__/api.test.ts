import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchRolls } from "../api";

// Ficha C2C-7 — **la URL es la única parte que las pruebas de componente NO pueden ver**: allí
// `api.ts` está espiado entero, así que un `mine` que se perdiera al montar la consulta pasaría
// desapercibido con la suite en verde. Es el mismo motivo por el que existe
// `features/level-up/__tests__/api.test.ts`.

function respuestaOk(cuerpo: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(cuerpo),
    text: () => Promise.resolve(JSON.stringify(cuerpo)),
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchRolls", () => {
  it("por defecto no manda `mine`: el servidor ya lo tiene en falso", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(respuestaOk({ events: [], nextCursor: null }));
    vi.stubGlobal("fetch", fetchSpy);

    await fetchRolls("c1");

    expect(fetchSpy.mock.calls[0][0]).toBe("/api/campaigns/c1/rolls?limit=50");
  });

  it("«solo las mías» viaja como `mine=true`", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(respuestaOk({ events: [], nextCursor: null }));
    vi.stubGlobal("fetch", fetchSpy);

    await fetchRolls("c1", { mine: true });

    expect(fetchSpy.mock.calls[0][0]).toBe("/api/campaigns/c1/rolls?mine=true&limit=50");
  });

  it("y con `mine: false` **tampoco** viaja, porque `z.coerce.boolean` haría cierto ese `false`", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(respuestaOk({ events: [], nextCursor: null }));
    vi.stubGlobal("fetch", fetchSpy);

    await fetchRolls("c1", { mine: false });

    expect(String(fetchSpy.mock.calls[0][0])).not.toContain("mine");
  });
});
