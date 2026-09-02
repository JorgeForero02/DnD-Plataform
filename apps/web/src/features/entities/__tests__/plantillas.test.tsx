import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { EntityEditor } from "../EntityEditor";
import { PLANTILLA_POR_TIPO, conArticulo } from "../plantillas";
import * as entitiesApi from "../api";
import * as members from "../../campaigns/members";

// Cada cosa del mundo se crea preguntando lo suyo. El formulario era el mismo para los siete
// tipos, así que un PNJ y un lugar solo se distinguían por la pestaña de la que venías.

function montar(type: Parameters<typeof EntityEditor>[0]["type"]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <EntityEditor campaignId="c1" type={type} onClose={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("el formulario de creación cambia con el tipo", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(members, "useMembers").mockReturnValue({ data: [] } as never);
  });

  it("cada tipo trae su propio andamiaje, y no el de otro", () => {
    montar("NPC");
    expect(screen.getByLabelText(/Cuerpo|Descripción|Texto/i)).toHaveValue(
      PLANTILLA_POR_TIPO.NPC.plantilla,
    );
    expect(screen.getByText(PLANTILLA_POR_TIPO.NPC.paraQue)).toBeInTheDocument();
  });

  it("el nombre propone un ejemplo real del tipo, no la palabra «Nombre»", () => {
    montar("LOCATION");
    expect(screen.getByLabelText("Nombre")).toHaveAttribute(
      "placeholder",
      PLANTILLA_POR_TIPO.LOCATION.ejemploDeNombre,
    );
  });

  it("las etiquetas sugeridas son las de ESE tipo y se ponen y se quitan de un clic", () => {
    montar("QUEST");
    const tags = screen.getByLabelText("Etiquetas (separadas por coma)");

    fireEvent.click(screen.getByRole("button", { name: "secundaria" }));
    expect(tags).toHaveValue("secundaria");

    fireEvent.click(screen.getByRole("button", { name: "secundaria" }));
    expect(tags).toHaveValue("");

    // Y no ofrece las de otro tipo: «taberna» es de los lugares.
    expect(screen.queryByRole("button", { name: "taberna" })).not.toBeInTheDocument();
  });

  it("crear sin tocar la plantilla NO guarda el andamiaje como si fuera contenido", async () => {
    // Si se guardara, el mundo se llenaría de entradas que parecen escritas y están huecas, y el
    // resumen de la fila pintaría los títulos de las secciones como si fueran la descripción.
    const espia = vi.spyOn(entitiesApi, "createEntity").mockResolvedValue({ id: "e1" } as never);
    montar("NPC");

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Kellan" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(espia).toHaveBeenCalled());
    expect(espia.mock.calls[0][1]).not.toHaveProperty("body");
  });

  it("pero si escribes algo dentro de la plantilla, se guarda entera", async () => {
    const espia = vi.spyOn(entitiesApi, "createEntity").mockResolvedValue({ id: "e1" } as never);
    montar("NPC");

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Kellan" } });
    fireEvent.change(screen.getByLabelText(/Cuerpo|Descripción|Texto/i), {
      target: { value: `${PLANTILLA_POR_TIPO.NPC.plantilla}Capitán del puerto.` },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(espia).toHaveBeenCalled());
    expect((espia.mock.calls[0][1] as { body: { text: string } }).body.text).toContain(
      "Capitán del puerto",
    );
  });
});

describe("el vocabulario por tipo", () => {
  it("concuerda el artículo en español, que es donde siempre falla", () => {
    // «Nuevo LOCATION» y «Nuevo misión» fueron fallos reales de este proyecto.
    expect(conArticulo("QUEST")).toBe("una misión");
    expect(conArticulo("LOCATION")).toBe("un lugar");
    expect(conArticulo("FACTION")).toBe("una facción");
  });

  it("ningún tipo se queda sin plantilla, ni sin ejemplo, ni sin etiquetas", () => {
    for (const [tipo, p] of Object.entries(PLANTILLA_POR_TIPO)) {
      expect(p.plantilla.trim(), tipo).not.toBe("");
      expect(p.ejemploDeNombre, tipo).not.toBe("");
      expect(p.paraQue, tipo).not.toBe("");
      expect(p.etiquetasSugeridas.length, tipo).toBeGreaterThan(2);
    }
  });

  it("las plantillas son distintas entre sí: si dos coinciden, el tipo no dice nada", () => {
    const textos = Object.values(PLANTILLA_POR_TIPO).map((p) => p.plantilla);
    expect(new Set(textos).size).toBe(textos.length);
  });
});
