import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CharacterSheetActivity } from "@dnd/shared";
import * as api from "../api";
import { Actividades } from "../Actividades";

// Paso 2, tarea A11 — el botón de usar una actividad (hoy, solo la Furia).
//
// **Corrección respecto a citar una clave del catálogo sin comprobarla**: el brief de esta tarea
// citaba «un bárbaro recién creado tiene max 2» sin decir su nivel — comprobado contra
// `classes.ts` (`barbarian-rages`, desde 1 → 2, desde 3 → 3), así que aquí se prueba con un
// máximo genérico (3) para no repetir esa misma cita sin verificar en un fichero distinto.

const FURIA: CharacterSheetActivity = {
  tipo: "utilidad",
  name: "Furia",
  activation: { coste: "BONUS" },
  consumption: [{ recurso: "rage", cantidad: 1 }],
  duration: { valor: 1, unidad: "minuto", concentracion: false },
  effects: [{ key: "raging", durationSeconds: 60 }],
  key: "rage",
  usos: { max: 3, resetOn: "LONG_REST" },
  description: "Mientras dura: ventaja en Fuerza. El servidor sube tu daño cuerpo a cuerpo.",
};

function montar(activities: CharacterSheetActivity[], puedeEditar = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Actividades
        campaignId="c1"
        characterId="ch1"
        activities={activities}
        puedeEditar={puedeEditar}
      />
    </QueryClientProvider>,
  );
}

describe("Actividades", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sin actividades concedidas, lo dice en vez de enseñar una lista vacía muda", () => {
    vi.spyOn(api, "fetchResources").mockResolvedValue([]);
    montar([]);
    expect(screen.getByText(/no tiene ninguna actividad/i)).toBeInTheDocument();
  });

  it("enseña la Furia por su nombre en español, nunca la clave «rage», con sus usos", async () => {
    vi.spyOn(api, "fetchResources").mockResolvedValue([
      {
        id: "r1",
        characterId: "ch1",
        key: "rage",
        label: "Furia",
        current: 2,
        max: 3,
        resetOn: "LONG_REST",
        grantedBy: "OWNER",
      },
    ]);
    montar([FURIA]);

    await waitFor(() => expect(screen.getByText("2 / 3 usos")).toBeInTheDocument());
    // Dos apariciones de «Furia»: el rótulo y el botón. Ninguna es «rage».
    expect(screen.queryByText("rage")).not.toBeInTheDocument();
    expect(screen.getAllByText(/Furia/).length).toBeGreaterThan(0);
  });

  it("pulsar «Usar Furia» llama al servidor con la clave de la actividad, no con su nombre", async () => {
    vi.spyOn(api, "fetchResources").mockResolvedValue([
      {
        id: "r1",
        characterId: "ch1",
        key: "rage",
        label: "Furia",
        current: 2,
        max: 3,
        resetOn: "LONG_REST",
        grantedBy: "OWNER",
      },
    ]);
    const usar = vi.spyOn(api, "usarActividad").mockResolvedValue({});
    montar([FURIA]);

    fireEvent.click(await screen.findByRole("button", { name: /Usar Furia/i }));
    await waitFor(() => expect(usar).toHaveBeenCalledWith("c1", "ch1", "rage", undefined));
  });

  it("sin permiso para editar, no se ofrece el botón — pero sí se ve la actividad", async () => {
    vi.spyOn(api, "fetchResources").mockResolvedValue([]);
    montar([FURIA], false);

    expect(await screen.findByText("Furia")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Usar/i })).not.toBeInTheDocument();
  });

  it("un aviso del servidor (por ejemplo, sin usos) se enseña en línea, y el botón sigue vivo", async () => {
    vi.spyOn(api, "fetchResources").mockResolvedValue([
      {
        id: "r1",
        characterId: "ch1",
        key: "rage",
        label: "Furia",
        current: 0,
        max: 3,
        resetOn: "LONG_REST",
        grantedBy: "OWNER",
      },
    ]);
    vi.spyOn(api, "usarActividad").mockResolvedValue({ aviso: "Sin usos de «Furia» que gastar." });
    montar([FURIA]);

    const boton = await screen.findByRole("button", { name: /Usar Furia/i });
    fireEvent.click(boton);

    expect(await screen.findByText("Sin usos de «Furia» que gastar.")).toBeInTheDocument();
    // El servidor cuenta y avisa, nunca rechaza (misma doctrina que la economía del turno):
    // este control no se deshabilita por el aviso.
    expect(boton).not.toBeDisabled();
  });

  it("sin fila de recurso sembrada, avisa de la ficha a medias en vez de fingir que todo está bien", () => {
    vi.spyOn(api, "fetchResources").mockResolvedValue([]);
    montar([FURIA]);
    expect(screen.getByText(/no tiene ningún uso sembrado/i)).toBeInTheDocument();
  });

  // Importante I2 (ronda de arreglo 1): `description` existe en el catálogo y cumple la regla de
  // interfaz, pero nadie la pintaba — el jugador podía pulsar «Usar Furia» sin haber leído una
  // palabra de lo que hace. Medido: quitar este párrafo de `Actividades.tsx` deja la suite del
  // feature entera en verde salvo esta prueba.
  it("la descripción de la actividad se lee antes de pulsar el botón (importante I2)", async () => {
    vi.spyOn(api, "fetchResources").mockResolvedValue([]);
    montar([FURIA]);

    expect(
      await screen.findByText(
        "Mientras dura: ventaja en Fuerza. El servidor sube tu daño cuerpo a cuerpo.",
      ),
    ).toBeInTheDocument();
  });

  // Importante I3 (ronda de arreglo 1): `current` de un recurso sin tope lleva el marcador de
  // `resources.service.ts` (`MARCADOR_DE_USOS_SIN_TOPE`, un millón) porque la columna es un `Int`
  // que no admite ausencia — pero ese número nunca es una cifra que el SRD conozca, y antes de
  // esta ronda llegaba tal cual a la pantalla: un bárbaro de nivel 20 leía «1000000 usos».
  it("un recurso sin tope dice «ilimitados», nunca el marcador de un millón (importante I3)", async () => {
    vi.spyOn(api, "fetchResources").mockResolvedValue([
      {
        id: "r1",
        characterId: "ch1",
        key: "rage",
        label: "Furia",
        current: 1_000_000,
        max: null,
        resetOn: "LONG_REST",
        grantedBy: "OWNER",
      },
    ]);
    montar([{ ...FURIA, usos: { max: null, resetOn: "LONG_REST" } }]);

    expect(await screen.findByText("usos ilimitados")).toBeInTheDocument();
    expect(screen.queryByText(/1000000/)).not.toBeInTheDocument();
    expect(screen.queryByText(/1,000,000/)).not.toBeInTheDocument();
  });
});
