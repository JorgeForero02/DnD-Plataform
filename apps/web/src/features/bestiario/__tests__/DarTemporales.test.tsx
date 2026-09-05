import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DarTemporales } from "../DarTemporales";
import * as api from "../../character-sheet/api";

// Plan 14, ficha C6-4 — **dar PG temporales a un PNJ.**
//
// `NpcEnLaMesa.tempHp` se pintaba y **nunca se había visto con datos**: faltaba el gesto.
//
// Y las reglas deciden la pantalla, no al revés. SRD 5.1: *«they can't be added together. If you
// have temporary hit points and receive more of them, you decide whether to keep the ones you have
// or to gain the new ones.»* De ahí salen las dos cosas que se prueban aquí: **no suma** y
// **pregunta cuál se queda**, con los dos números delante.

function hoja(temp: number) {
  return {
    character: { id: "n1", version: 3 },
    sheet: null,
    hp: { current: 10, max: 12, temp },
    attacks: [],
  } as never;
}

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DarTemporales campaignId="c1" characterId="n1" nombre="El goblin" />
    </QueryClientProvider>,
  );
}

describe("dar PG temporales a un PNJ", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("**sin temporales previos no pregunta nada**: un número y un botón", async () => {
    // Una pregunta que salta cuando no hace falta se aprende a ignorar en dos días.
    vi.spyOn(api, "fetchSheet").mockResolvedValue(hoja(0));
    const fijar = vi.spyOn(api, "setHp").mockResolvedValue(hoja(5));
    montar();

    // Se espera a que el botón se encienda: hasta que la hoja no llega no hay `version`, y fijar
    // PG es concurrencia optimista — sin ella la petición no puede salir.
    const boton = await screen.findByRole("button", { name: "Dárselos" });
    await waitFor(() => expect(boton).not.toHaveAttribute("aria-disabled"));
    // **Sin temporales previos no hay nada que preguntar**, y se comprueba ANTES de dárselos: en
    // cuanto los tenga, la siguiente vez sí preguntará — que es justo lo que la regla pide.
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    fireEvent.click(boton);
    await waitFor(() =>
      expect(fijar).toHaveBeenCalledWith(
        "c1",
        "n1",
        expect.objectContaining({ tempHp: 5, expectedVersion: 3 }),
      ),
    );
  });

  it("**con temporales, NO suma: pregunta cuál se queda**, con los dos números", async () => {
    vi.spyOn(api, "fetchSheet").mockResolvedValue(hoja(8));
    montar();

    const aviso = await screen.findByRole("alertdialog");
    expect(aviso).toHaveTextContent("ya tiene 8 temporales");
    // La regla, escrita donde se decide: sumarlas sería inventar algo que el SRD prohíbe.
    expect(aviso).toHaveTextContent(/No se suman/);
    expect(screen.getByRole("button", { name: /Quedarse con los 5 nuevos/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dejar los 8 que tenía/ })).toBeInTheDocument();
    // Y no se ofrece darlos a secas: eso volvería a decidir por quien los recibe.
    expect(screen.queryByRole("button", { name: "Dárselos" })).not.toBeInTheDocument();
  });

  it("**«quedarse con los nuevos» manda la decisión**, aunque sean menos", async () => {
    // Es la mitad de la regla que faltaba: el servidor se quedaba con el mayor por su cuenta, y hay
    // efectos que interesa cambiar por otros más pequeños porque duran más.
    vi.spyOn(api, "fetchSheet").mockResolvedValue(hoja(8));
    const fijar = vi.spyOn(api, "setHp").mockResolvedValue(hoja(5));
    montar();

    fireEvent.click(await screen.findByRole("button", { name: /Quedarse con los 5 nuevos/ }));
    await waitFor(() =>
      expect(fijar).toHaveBeenCalledWith(
        "c1",
        "n1",
        expect.objectContaining({ tempHp: 5, tempHpEleccion: "los-nuevos" }),
      ),
    );
  });

  it("«dejar los que tenía» manda «mayor», que es lo que los conserva", async () => {
    vi.spyOn(api, "fetchSheet").mockResolvedValue(hoja(8));
    const fijar = vi.spyOn(api, "setHp").mockResolvedValue(hoja(8));
    montar();

    fireEvent.click(await screen.findByRole("button", { name: /Dejar los 8 que tenía/ }));
    await waitFor(() =>
      expect(fijar).toHaveBeenCalledWith(
        "c1",
        "n1",
        expect.objectContaining({ tempHpEleccion: "mayor" }),
      ),
    );
  });
});
