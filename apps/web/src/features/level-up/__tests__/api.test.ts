import { describe, expect, it, vi, afterEach } from "vitest";
import { applyLevelUp, fetchLevelUpPreview } from "../api";

// Tarea 2A.11 — la URL que se construye aquí es la única parte de esta feature que las pruebas
// de componente NO pueden ver: ahí `api.ts` está espiado entero, así que un `?roll=true` que se
// perdiera pasaría desapercibido con toda la suite en verde. Esta prueba mira el `fetch` real.

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

describe("api de la subida de nivel", () => {
  it("el previo por defecto NO manda el parámetro roll", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(respuestaOk({}));
    vi.stubGlobal("fetch", fetchSpy);

    await fetchLevelUpPreview("c1", "ch1");

    expect(fetchSpy.mock.calls[0][0]).toBe("/api/campaigns/c1/characters/ch1/level-up/preview");
  });

  it("el previo con tirada manda roll=true", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(respuestaOk({}));
    vi.stubGlobal("fetch", fetchSpy);

    await fetchLevelUpPreview("c1", "ch1", true);

    expect(fetchSpy.mock.calls[0][0]).toBe(
      "/api/campaigns/c1/characters/ch1/level-up/preview?roll=true",
    );
  });

  it("la confirmación es un POST sin roll: el servidor no lo acepta", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(respuestaOk({ id: "ch1", level: 4 }));
    vi.stubGlobal("fetch", fetchSpy);

    await applyLevelUp("c1", "ch1");

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/campaigns/c1/characters/ch1/level-up");
    expect(url).not.toContain("roll");
    expect(init.method).toBe("POST");
    // Sin cuerpo de verdad: apiFetch ya no manda Content-Type sin body, así que no hace falta
    // el rodeo `JSON.stringify({})` de antes (tarea 29).
    expect(init.body).toBeUndefined();
  });
});
