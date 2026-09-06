import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PanelDeIniciativa } from "../PanelDeIniciativa";
import type { RollRequestRow } from "../api";
import * as characterSheetApi from "../../character-sheet/api";

// Tarea 9 (plan 2026-09-05-iniciativa-y-bando) — lo que se prueba aquí es **lo que puede
// romperse en silencio** en el panel grande, no lo que ya cubre `TiradasPendientes.test.tsx`:
//
//  · que no hay forma de cerrarlo sin tirar — el brief lo pide con estas palabras;
//  · que la salida NO es un `Dialog` — la segunda decisión de diseño de la tarea, «no secuestra
//    la aplicación», que hasta la ronda de arreglo 1 no tenía ninguna prueba;
//  · que un modo distinto de NORMAL se dice, porque el DM puede pedir iniciativa con ventaja;
//  · que el botón, al apagarse, dice por qué (`aria-describedby`), no solo se apaga;
//  · que el modificador que manda el servidor se enseña, y que su ausencia (`null`) no pinta
//    ningún número inventado;
//  · que la clave no se repite cuando ya la dice el rótulo — el caso real: el servidor pide
//    iniciativa con `key: "initiative"` y `label: "Iniciativa"`, las dos palabras iguales.
//
// **Ronda de arreglo 1 (C-1) — la fixture usa `key: "initiative"`, la de verdad.** La versión
// anterior usaba `save.dex` porque «es una clave con forma de característica» y por eso ninguna
// de estas diez pruebas vio que `nombreDeClave` no reconocía `initiative` en absoluto: el panel
// real, con la petición real que manda `encounters.service.ts`, decía «Sin traducir: initiative»
// en el 100% de los combates.

const CAMPANA = "camp-1";

const PETICION: RollRequestRow = {
  id: "req-1",
  campaignId: CAMPANA,
  characterId: "ch-1",
  requestedById: "dm1",
  key: "initiative",
  label: "Iniciativa",
  dc: null,
  mode: "NORMAL",
  audience: "PUBLIC",
  createdAt: "2026-01-01",
  resolvedAt: null,
  resolvedEventId: null,
  encounterId: "enc-1",
  modifier: 3,
};

function pintar(props: Partial<Parameters<typeof PanelDeIniciativa>[0]> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PanelDeIniciativa
        peticion={PETICION}
        campaignId={CAMPANA}
        nombrePersonaje="Brann"
        conInspiracion={false}
        onCambiarInspiracion={() => {}}
        onTirar={() => {}}
        tirando={false}
        {...props}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  // Sin inspiración: el control de `GastarInspiracion` no se pinta y no interfiere con las
  // aserciones de este fichero, que son sobre el panel, no sobre ese control (ya probado en
  // `TiradasPendientes.test.tsx`).
  vi.spyOn(characterSheetApi, "fetchResources").mockResolvedValue([]);
});

describe("PanelDeIniciativa", () => {
  it("dice que empieza el combate y enseña la frase del DM", () => {
    pintar();

    expect(screen.getByText(/empieza el combate/i)).toBeInTheDocument();
    expect(screen.getByText(/Iniciativa/)).toBeInTheDocument();
  });

  it("enseña el modificador ANTES de tirar, tal cual lo manda el servidor", () => {
    pintar({ peticion: { ...PETICION, modifier: 3 } });

    expect(screen.getByText("+3")).toBeInTheDocument();
  });

  it("sin modificador (hoja que no deriva) no pinta ningún número inventado", () => {
    pintar({ peticion: { ...PETICION, modifier: null } });

    expect(screen.queryByText(/^[+−]\d/)).not.toBeInTheDocument();
  });

  it("un modificador negativo lleva el signo menos tipográfico, no un guion", () => {
    pintar({ peticion: { ...PETICION, modifier: -2 } });

    expect(screen.getByText("−2")).toBeInTheDocument();
  });

  it("la clave no se repite cuando ya la dice el rótulo (initiative / Iniciativa)", () => {
    pintar();

    // «Iniciativa» aparece en el rótulo (arriba); el renglón de detalles no la vuelve a decir.
    expect(screen.getAllByText(/Iniciativa/)).toHaveLength(1);
  });

  it("con una clave que sí aporta algo nuevo, la enseña en el renglón de detalles", () => {
    pintar({
      peticion: { ...PETICION, key: "save.dex", label: "Salvación urgente", modifier: null },
    });

    expect(screen.getByText(/Salvación de Destreza/)).toBeInTheDocument();
  });

  it("no se puede cerrar sin tirar: ni un botón con nombre de salida, ni un Dialog", () => {
    pintar();

    expect(
      screen.queryByRole("button", { name: /cerrar|cancelar|salir|ahora no/i }),
    ).not.toBeInTheDocument();
    // La segunda decisión de diseño de la tarea —no secuestra la aplicación— no es «no hay un
    // botón con un nombre concreto»: es que no hay NINGÚN `Dialog` debajo, con su velo y su
    // atrapa-foco. Meter uno pasaría la prueba de arriba (su cierre puede ser un icono sin
    // nombre) y esta lo cazaría.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Y solo hay un botón en todo el panel: el de tirar. Añadir una segunda salida de cualquier
    // forma sube este número.
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("si el modo no es normal, lo dice", () => {
    pintar({ peticion: { ...PETICION, mode: "ADVANTAGE" } });

    expect(screen.getByText(/Ventaja/)).toBeInTheDocument();
  });

  it("con el modo normal no dice nada del modo", () => {
    pintar();

    expect(screen.queryByText(/Ventaja|Desventaja/)).not.toBeInTheDocument();
  });

  it("tirando, el botón se apaga y dice por qué", () => {
    pintar({ tirando: true });

    const boton = screen.getByRole("button", { name: /Tirar iniciativa/i });
    expect(boton).toHaveAttribute("aria-disabled", "true");
    const idDelMotivo = boton.getAttribute("aria-describedby");
    expect(idDelMotivo).toBeTruthy();
    expect(document.getElementById(idDelMotivo as string)).toHaveTextContent(/en camino/i);
  });

  it("pulsar «Tirar iniciativa» llama a onTirar", () => {
    const onTirar = vi.fn();
    pintar({ onTirar });

    fireEvent.click(screen.getByRole("button", { name: /Tirar iniciativa/i }));

    expect(onTirar).toHaveBeenCalledTimes(1);
  });
});
