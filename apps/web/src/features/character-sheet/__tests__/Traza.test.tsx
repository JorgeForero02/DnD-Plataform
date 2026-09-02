import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { DerivedValue } from "@dnd/shared";
import { ValorDerivado } from "../Traza";

// Tarea 2A.10 — "la traza se despliega y dice de dónde sale el número". El ejemplo textual de
// la especificación: «CA 18 = 14 cota de malla + 2 escudo + 2 Destreza».

const ca: DerivedValue = {
  key: "ac",
  total: 18,
  steps: [
    {
      op: "base",
      amount: 16,
      sourceType: "item",
      sourceKey: "chain-mail",
      labelKey: "armor.chain-mail",
    },
    { op: "add", amount: 2, sourceType: "item", sourceKey: "shield", labelKey: "armor.shield" },
    { op: "add", amount: 2, sourceType: "ability", sourceKey: "dex", labelKey: "abilityMod.dex" },
  ],
};

describe("ValorDerivado — la traza", () => {
  it("empieza colapsada, mostrando solo el total", () => {
    render(<ValorDerivado etiqueta="CA" valor={ca} />);
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.queryByText("De cuero", { exact: false })).not.toBeInTheDocument();
  });

  it("al desplegarla, dice de dónde sale cada punto", () => {
    render(<ValorDerivado etiqueta="CA" valor={ca} />);
    fireEvent.click(screen.getByRole("button", { name: "18" }));

    expect(screen.getByText("Cota de malla")).toBeInTheDocument();
    expect(screen.getByText("Escudo")).toBeInTheDocument();
    expect(screen.getByText("Modificador de Destreza")).toBeInTheDocument();
    // Los números de cada paso, con su signo.
    expect(screen.getByText("16")).toBeInTheDocument();
    expect(screen.getAllByText("+2").length).toBe(2);
  });

  it("una labelKey que el diccionario no reconoce se marca visiblemente, no se esconde", () => {
    const desconocida: DerivedValue = {
      key: "misterio",
      total: 3,
      steps: [
        {
          op: "base",
          amount: 3,
          sourceType: "manual",
          sourceKey: "x",
          labelKey: "algo.nuevo.del.motor",
        },
      ],
    };
    render(<ValorDerivado etiqueta="Misterio" valor={desconocida} />);
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    const paso = screen.getByText("Sin traducir: algo.nuevo.del.motor");
    expect(paso).toBeInTheDocument();
    expect(paso.closest("[data-untranslated]")).not.toBeNull();
  });
});
