import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PonerCondicion } from "../PonerCondicion";

// Task 6 (2026-09-19) — «Te ayudan» y «En furia» comparten tabla con las quince del SRD
// (`NOMBRE_CONDICION`, `character-sheet/vocabulario.ts`) porque las tres pintan el mismo cajón,
// pero no son condiciones del manual: hasta hoy salían mezcladas bajo «Las quince del manual» y
// esa leyenda mentía en cuanto una de las dos estaba puesta. Ahora el grupo del manual se deriva
// de `DEL_MANUAL` y cuenta sola («Las del manual (N)»); las dos marcas de mesa entran en «De la
// mesa, no del manual», junto a Concentración.

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <PonerCondicion
        campaignId="c1"
        characterId="ch1"
        nombre="Elara"
        abierto
        enCombate={false}
        onCerrar={vi.fn()}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("PonerCondicion — la leyenda cuenta sola", () => {
  it("el grupo «Las del manual» tiene exactamente 15 radios/chips, sin «Te ayudan» ni «En furia»", () => {
    montar();
    const manual = screen.getByRole("group", { name: /^Las del manual \(15\)$/ });
    expect(within(manual).getAllByRole("button")).toHaveLength(15);
    expect(within(manual).queryByText("Te ayudan")).not.toBeInTheDocument();
    expect(within(manual).queryByText("En furia")).not.toBeInTheDocument();
  });

  it("el grupo «De la mesa, no del manual» contiene «Te ayudan», «En furia» y Concentración", () => {
    montar();
    const mesa = screen.getByRole("group", { name: "De la mesa, no del manual" });
    expect(within(mesa).getByText("Te ayudan")).toBeInTheDocument();
    expect(within(mesa).getByText("En furia")).toBeInTheDocument();
    expect(within(mesa).getByText("Concentración")).toBeInTheDocument();
  });
});
