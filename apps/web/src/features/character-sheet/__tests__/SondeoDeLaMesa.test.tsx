import { act, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as sheetApi from "../api";
import { SONDEO_DE_MESA_MS, useCharacterSheet, useConditions } from "../hooks";

// **Las barras de vida de la mesa mentían.** `useCharacterSheet` y `useConditions` no sondeaban:
// el DM pulsaba −5 en su portátil, el registro de al lado lo contaba a los quince segundos y la
// barra del jugador seguía pintando los puntos de golpe de antes. La misma pantalla se
// contradecía, y lo que se mira de reojo es la barra.
//
// Se mide el comportamiento, no la constante: se adelanta el reloj y se comprueba que la consulta
// vuelve a pedir. Quitar cualquiera de los dos `refetchInterval` deja su caso en rojo.
//
// **El reloj falso se instala antes de montar**, porque el intervalo lo programa TanStack Query
// en el primer render: cambiar de reloj a mitad de la prueba deja el `setInterval` viejo colgado
// del reloj real y no se adelanta nunca.

function Sonda() {
  useCharacterSheet("c1", "p1");
  useConditions("c1", "p1");
  return null;
}

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Sonda />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(sheetApi, "fetchSheet").mockResolvedValue({} as never);
  vi.spyOn(sheetApi, "fetchConditions").mockResolvedValue([] as never);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("la mesa sondea la vida y las condiciones", () => {
  it("el intervalo es el mismo que el del registro: la barra y la línea no pueden contradecirse", () => {
    expect(SONDEO_DE_MESA_MS).toBe(15_000);
  });

  it("vuelve a pedir la hoja y las condiciones al pasar el intervalo", async () => {
    montar();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(sheetApi.fetchSheet).toHaveBeenCalledTimes(1);
    expect(sheetApi.fetchConditions).toHaveBeenCalledTimes(1);

    await act(() => vi.advanceTimersByTimeAsync(SONDEO_DE_MESA_MS + 100));
    expect(sheetApi.fetchSheet).toHaveBeenCalledTimes(2);
    expect(sheetApi.fetchConditions).toHaveBeenCalledTimes(2);

    await act(() => vi.advanceTimersByTimeAsync(SONDEO_DE_MESA_MS + 100));
    expect(sheetApi.fetchSheet).toHaveBeenCalledTimes(3);
    expect(sheetApi.fetchConditions).toHaveBeenCalledTimes(3);
  });
});
