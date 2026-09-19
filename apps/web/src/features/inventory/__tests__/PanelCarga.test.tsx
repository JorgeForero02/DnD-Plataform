import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { EncumbranceInfo } from "@dnd/shared";
import { PanelCarga } from "../PanelCarga";

// Migración 6, fix round 1 (BAJA-1) — la variante de sobrecarga (SRD 5.1, Variant: Encumbrance)
// en la pantalla de inventario. **El servidor decide el estado; el panel solo lo pinta** —ya no
// hay ninguna cuenta aquí (`InventoryService.list()`, `apps/api/src/inventory/common/
// encumbrance.ts`). Fuerza 15 ⇒ capacidad estándar 225 lb (15×15), cargado desde 75 lb
// (5×15) y muy cargado desde 150 lb (10×15) — los mismos tres números en onzas: 3600, 1200 y
// 2400 (WEIGHT_OZ_PER_LB = 16). El panel no vuelve a calcular ninguno de los tres: los recibe.
const CAPACIDAD_OZ = 3600;
const UMBRALES = { encumberedAtOz: 1200, heavilyAtOz: 2400 };

const sinCargar: EncumbranceInfo = { state: "none", ...UMBRALES };
const cargado: EncumbranceInfo = { state: "encumbered", ...UMBRALES };
const muyCargado: EncumbranceInfo = { state: "heavily", ...UMBRALES };

describe("PanelCarga — variante de sobrecarga (BAJA-1: el servidor decide, el panel pinta)", () => {
  it("con encumbrance: null, no aparece ningún umbral — variante apagada o sin Fuerza", () => {
    render(<PanelCarga totalWeightOz={2500} carryCapacityOz={CAPACIDAD_OZ} encumbrance={null} />);
    expect(screen.queryByText(/variante de sobrecarga/i)).not.toBeInTheDocument();
  });

  it("con encumbrance.state «none»: sin cargar", () => {
    render(
      <PanelCarga totalWeightOz={1000} carryCapacityOz={CAPACIDAD_OZ} encumbrance={sinCargar} />,
    );
    expect(screen.getByText(/variante de sobrecarga/i)).toBeInTheDocument();
    expect(screen.getByText(/sin cargar/i)).toBeInTheDocument();
  });

  it("con encumbrance.state «encumbered»: cargado, con el aviso de −10 pies", () => {
    render(
      <PanelCarga totalWeightOz={1300} carryCapacityOz={CAPACIDAD_OZ} encumbrance={cargado} />,
    );
    expect(screen.getByText(/cargado: la velocidad baja 10 pies/i)).toBeInTheDocument();
  });

  it("con encumbrance.state «heavily»: muy cargado, con el aviso de −20 pies y role=alert", () => {
    render(
      <PanelCarga totalWeightOz={2500} carryCapacityOz={CAPACIDAD_OZ} encumbrance={muyCargado} />,
    );
    const aviso = screen.getByText(/muy cargado: la velocidad baja 20 pies/i);
    expect(aviso).toHaveAttribute("role", "alert");
    expect(aviso).toHaveTextContent(/desventaja/i);
  });

  it("pinta los umbrales que manda el servidor, en kg — no los recalcula", () => {
    render(
      <PanelCarga totalWeightOz={1000} carryCapacityOz={CAPACIDAD_OZ} encumbrance={sinCargar} />,
    );
    // 1200 oz = 75 lb = 34.0 kg; 2400 oz = 150 lb = 68.0 kg. Task 7 — coma decimal en es-ES, no
    // el punto de `toFixed` a secas.
    expect(screen.getByText(/34,0 kg/)).toBeInTheDocument();
    expect(screen.getByText(/68,0 kg/)).toBeInTheDocument();
  });

  it("el estado manda incluso sin capacidad de carga conocida (no depende de carryCapacityOz)", () => {
    render(<PanelCarga totalWeightOz={1000} carryCapacityOz={null} encumbrance={cargado} />);
    expect(screen.getByText(/cargado: la velocidad baja 10 pies/i)).toBeInTheDocument();
  });
});
