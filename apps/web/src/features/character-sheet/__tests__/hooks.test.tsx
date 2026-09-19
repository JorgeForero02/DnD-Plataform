import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useResolveAttack, useUsarActividad } from "../hooks";
import { currentEncounterKey } from "../../encounters/hooks";
import { actionsKey } from "../../actions/hooks";
import * as characterSheetApi from "../api";

// Ronda de arreglo 2 — importante 2. Borrar la invalidación de `encountersKey` en
// `useUsarActividad` dejaba **1219/1219 en verde**: las pruebas de integración de la ronda de
// arreglo 1 (`capa-de-combate.test.tsx`) comprueban que la tira LEE la economía del encuentro, no
// que el encuentro se RELEA después de usar una actividad — el defecto exacto que motivó el
// crítico 1 (pulsar «Usar Furia» y la mesa seguir diciendo «disponible») podía reintroducirse sin
// que nada se enterara. Esta prueba mide directamente lo que el crítico 1 pedía: que la consulta
// del encuentro activo quede invalidada tras `usar()`.

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe("useUsarActividad — invalida el encuentro activo (importante 2, ronda de arreglo 2)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("usar una actividad invalida `currentEncounterKey`, así la tira relee la economía sin esperar al sondeo", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // Sembrada, para poder observar la invalidación y no solo la ausencia de datos — mismo
    // patrón que `features/entities/__tests__/hooks.test.tsx`.
    qc.setQueryData(currentEncounterKey("c1", "s1"), { id: "enc1" });
    vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({});

    const { result } = renderHook(() => useUsarActividad("c1", "ch1"), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync({ activityKey: "rage" });
    });

    await waitFor(() =>
      expect(qc.getQueryState(currentEncounterKey("c1", "s1"))?.isInvalidated).toBe(true),
    );
  });
});

// Ola post-revisión de 3A.3 — la clave literal `["campaigns", c, "characters", ch, "actions"]`
// que `hooks.ts` escribe a mano (para no cerrar un ciclo con `features/actions/hooks.ts`) es la
// misma que declara `actionsKey`. Esta es la prueba que el comentario prometía.
describe("la lista de acciones (`GET …/actions`) se invalida tras usar y tras atacar", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("usar una actividad invalida la lista de acciones con la clave literal de actionsKey", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(actionsKey("c1", "ch1"), { characterId: "ch1" });
    vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({});
    const { result } = renderHook(() => useUsarActividad("c1", "ch1"), {
      wrapper: makeWrapper(qc),
    });
    await act(async () => {
      await result.current.mutateAsync({ activityKey: "rage" });
    });
    await waitFor(() =>
      expect(qc.getQueryState(actionsKey("c1", "ch1"))?.isInvalidated).toBe(true),
    );
  });

  // M1: `resolveAttack` gasta la acción en el servidor (D-CF-146); la franja y la barra lo
  // tienen que releer sin esperar al canal ni al sondeo.
  it("resolver un ataque invalida el encuentro y la lista de acciones", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(currentEncounterKey("c1", "s1"), { id: "enc1" });
    qc.setQueryData(actionsKey("c1", "ch1"), { characterId: "ch1" });
    vi.spyOn(characterSheetApi, "resolveAttack").mockResolvedValue({} as never);
    const { result } = renderHook(() => useResolveAttack("c1", "ch1"), {
      wrapper: makeWrapper(qc),
    });
    await act(async () => {
      await result.current.mutateAsync({
        attackKey: "dagger",
        input: {
          targetCharacterId: "ch2",
          mode: "NORMAL",
          spendInspiration: false,
          audience: "PUBLIC",
        },
      });
    });
    await waitFor(() => {
      expect(qc.getQueryState(currentEncounterKey("c1", "s1"))?.isInvalidated).toBe(true);
      expect(qc.getQueryState(actionsKey("c1", "ch1"))?.isInvalidated).toBe(true);
    });
  });
});
