import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useLimpiarObjetivoDeLaMesa, useObjetivoStore } from "../objetivo.store";

// Ola post-revisión de 3A.3 (M2) — el chip de objetivo se limpia al terminar el combate y al
// cambiar de campaña; no se limpia por el mero hecho de no haber combate todavía.

beforeEach(() => {
  useObjetivoStore.setState({ objetivo: { id: "p-goblin", nombre: "Goblin" } });
});

describe("useLimpiarObjetivoDeLaMesa", () => {
  it("cuando el encuentro pasa de ACTIVE a ENDED, el objetivo se quita", () => {
    const { rerender } = renderHook(
      ({ estado }: { estado: string | null }) => useLimpiarObjetivoDeLaMesa("c1", estado),
      { initialProps: { estado: "ACTIVE" } },
    );
    expect(useObjetivoStore.getState().objetivo).not.toBeNull();
    rerender({ estado: "ENDED" });
    expect(useObjetivoStore.getState().objetivo).toBeNull();
  });

  it("cuando el encuentro ACTIVE desaparece (null), también", () => {
    const { rerender } = renderHook(
      ({ estado }: { estado: string | null }) => useLimpiarObjetivoDeLaMesa("c1", estado),
      { initialProps: { estado: "ACTIVE" as string | null } },
    );
    rerender({ estado: null });
    expect(useObjetivoStore.getState().objetivo).toBeNull();
  });

  it("sin combate desde el principio (null → null, PREPARING) el objetivo se conserva", () => {
    const { rerender } = renderHook(
      ({ estado }: { estado: string | null }) => useLimpiarObjetivoDeLaMesa("c1", estado),
      { initialProps: { estado: null as string | null } },
    );
    rerender({ estado: "PREPARING" });
    rerender({ estado: "ACTIVE" });
    expect(useObjetivoStore.getState().objetivo).toEqual({ id: "p-goblin", nombre: "Goblin" });
  });

  it("cambiar de campaña en la misma pestaña quita el objetivo", () => {
    const { rerender } = renderHook(
      ({ campana }: { campana: string }) => useLimpiarObjetivoDeLaMesa(campana, "ACTIVE"),
      { initialProps: { campana: "c1" } },
    );
    rerender({ campana: "c2" });
    expect(useObjetivoStore.getState().objetivo).toBeNull();
  });
});
