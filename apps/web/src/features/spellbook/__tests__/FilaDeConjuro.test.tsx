import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SpellbookEntry } from "@dnd/shared";
import * as api from "../api";
import { FilaDeConjuro } from "../FilaDeConjuro";

// Tarea 6 de 3A.2 — la fila de un conjuro: nombre, nivel · escuela, chips, y su acción. El
// detalle (la prosa del SRD) solo se pide al abrir el `<details>` — nunca antes.

const PROYECTIL: SpellbookEntry = {
  key: "magic-missile",
  nameEs: "Proyectil mágico",
  nameEn: "Magic Missile",
  level: 1,
  school: "evo",
  castingTime: { coste: "ACTION" },
  range: { unidad: "pies", distanciaFt: 120 },
  concentration: false,
  ritual: false,
  estado: "PREPARADO",
  lanzable: true,
  mecanica: "dados",
  objetivos: "varios",
  escalaPorEspacio: true,
  encanta: false,
};

function montar(entrada: SpellbookEntry, extra: Partial<Parameters<typeof FilaDeConjuro>[0]> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <FilaDeConjuro campaignId="c1" characterId="ch1" entrada={entrada} {...extra} />
    </QueryClientProvider>,
  );
}

describe("FilaDeConjuro", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("pinta el nombre en español, y nivel · escuela SIN ningún valor de enumeración crudo", () => {
    montar(PROYECTIL);
    expect(screen.getByText("Proyectil mágico")).toBeInTheDocument();
    expect(screen.getByText("Nivel 1 · Evocación")).toBeInTheDocument();
    expect(screen.queryByText(/PREPARADO|^evo$/)).not.toBeInTheDocument();
  });

  it("un conjuro de concentración y ritual enseña las dos chips", () => {
    montar({ ...PROYECTIL, concentration: true, ritual: true });
    expect(screen.getByText("Concentración")).toBeInTheDocument();
    expect(screen.getByText("Ritual")).toBeInTheDocument();
  });

  it("un conjuro normal no enseña ninguna de las dos chips", () => {
    montar(PROYECTIL);
    expect(screen.queryByText("Concentración")).not.toBeInTheDocument();
    expect(screen.queryByText("Ritual")).not.toBeInTheDocument();
  });

  it("«Fuera del libro» se marca cuando la fila lo pide, y no aparece si no", () => {
    montar(PROYECTIL, { fueraDelLibro: true });
    expect(screen.getByText("Fuera del libro")).toBeInTheDocument();
  });

  it("no pide el detalle hasta que se abre, y entonces pinta su prosa (nunca HTML crudo)", async () => {
    const detalle = vi.spyOn(api, "fetchSpellDetail").mockResolvedValue({
      ...PROYECTIL,
      textEs: "Tres dardos de fuerza mágica golpean a un objetivo.",
    });
    montar(PROYECTIL);
    expect(detalle).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Proyectil mágico"));
    await waitFor(() => expect(detalle).toHaveBeenCalledWith("c1", "ch1", "magic-missile"));
    expect(
      await screen.findByText("Tres dardos de fuerza mágica golpean a un objetivo."),
    ).toBeInTheDocument();
  });

  it("con higherLevelsEs, se lee bajo «A niveles superiores»", async () => {
    vi.spyOn(api, "fetchSpellDetail").mockResolvedValue({
      ...PROYECTIL,
      textEs: "Texto base.",
      higherLevelsEs: "Un dardo más por cada espacio por encima del primero.",
    });
    montar(PROYECTIL);
    fireEvent.click(screen.getByText("Proyectil mágico"));
    expect(await screen.findByText("A niveles superiores.")).toBeInTheDocument();
    expect(
      screen.getByText("Un dardo más por cada espacio por encima del primero."),
    ).toBeInTheDocument();
  });

  it("pulsar la acción llama a onClick, y el hueco de `accionPrincipal` se pinta si se pasa", () => {
    const onClick = vi.fn();
    montar(PROYECTIL, {
      accion: { rotulo: "Quitar", onClick },
      accionPrincipal: <button type="button">Lanzar</button>,
    });
    fireEvent.click(screen.getByRole("button", { name: "Quitar" }));
    expect(onClick).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Lanzar" })).toBeInTheDocument();
  });

  it("un rechazo del servidor para esta fila se ve en línea, con role=alert", () => {
    montar(PROYECTIL, { error: "No está en la lista del mago." });
    expect(screen.getByRole("alert")).toHaveTextContent("No está en la lista del mago.");
  });
});
