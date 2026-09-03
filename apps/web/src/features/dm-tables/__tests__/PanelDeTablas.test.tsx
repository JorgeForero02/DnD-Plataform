import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PanelDeTablas } from "../PanelDeTablas";
import * as dmTablesApi from "../api";
import type { DmTable } from "../api";
import * as membersApi from "../../campaigns/members";
import { useAuthStore } from "../../../store/auth.store";
import { ApiError } from "../../../lib/api";

// Tarea 2C.6 — pruebas de la mitad de pantalla de las tablas del DM. Mismo molde que
// `features/campaign-items/__tests__/CampaignItemsCatalogPage.test.tsx`: `api.ts` simulado con
// `vi.spyOn`, sin tocar `fetch` de verdad.

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PanelDeTablas campaignId="c1" />
    </QueryClientProvider>,
  );
}

const tablaDePifias: DmTable = {
  id: "t1",
  name: "Pifias de combate",
  description: "Lo que pasa cuando la espada se te va.",
  visibility: "DM_ONLY",
  trigger: "FUMBLE",
  entries: [
    { id: "e1", min: 1, max: 5, text: "Se te encasquilla el arma." },
    { id: "e2", min: 6, max: 10, text: "Pierdes el turno." },
  ],
};

function comoDm() {
  useAuthStore.setState({ user: { id: "dm1", email: "dm@b.com", displayName: "DM" } });
}
function comoJugador() {
  useAuthStore.setState({ user: { id: "p1", email: "p@b.com", displayName: "Alice" } });
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
    { userId: "dm1", displayName: "DM", role: "DM" },
    { userId: "p1", displayName: "Alice", role: "PLAYER" },
  ]);
  vi.spyOn(dmTablesApi, "fetchDmTables").mockResolvedValue({
    tables: [],
    houseTablesEnabled: false,
  });
});

describe("PanelDeTablas — lo que la pantalla dice que son estas tablas", () => {
  it("dice que es una regla de la casa y que el SRD no trae estas tablas", async () => {
    comoDm();
    const { container } = renderPanel();

    await screen.findByRole("heading", { name: "Tablas del DM" });
    const texto = container.textContent ?? "";
    expect(texto).toContain("El SRD no trae ninguna tabla de críticos ni de pifias");
    expect(texto).toContain("duplica los dados y no los modificadores");
    expect(texto).toContain("regla de la casa");
  });

  it("el interruptor explica que, apagado, un crítico duplica dados y nada más", async () => {
    comoDm();
    const { container } = renderPanel();

    await screen.findByRole("radio", { name: /Apagada/ });
    expect(container.textContent).toContain("sigue duplicando dados y nada más");
  });
});

describe("PanelDeTablas — quién ve qué controles", () => {
  it("un jugador no ve el interruptor de la casa ni el formulario de crear", async () => {
    comoJugador();
    vi.spyOn(dmTablesApi, "fetchDmTables").mockResolvedValue({
      tables: [tablaDePifias],
      houseTablesEnabled: false,
    });
    renderPanel();

    await screen.findByText("Pifias de combate");
    expect(screen.queryByRole("radio", { name: /Apagada/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /Encendida/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Crear tabla" })).not.toBeInTheDocument();
    // Y tampoco el borrado: lo irreversible es del DM. (El servidor lo exige igual; esto solo
    // evita ofrecer un botón que iba a dar 403.)
    expect(screen.queryByRole("button", { name: /Borrar/ })).not.toBeInTheDocument();
  });

  it("el DM sí ve el interruptor y el botón de crear", async () => {
    comoDm();
    renderPanel();

    await screen.findByRole("radio", { name: /Encendida/ });
    await screen.findByRole("button", { name: "Crear tabla" });
  });

  it("**la posición del interruptor la dice el servidor**, no se supone", async () => {
    // Hubo un rato en que el `GET` no la devolvía y la pantalla lo decía en vez de marcar una de
    // las dos por defecto. El hueco se cerró en la API: ahora llega con la lista de tablas.
    comoDm();
    vi.spyOn(dmTablesApi, "fetchDmTables").mockResolvedValue({
      tables: [],
      houseTablesEnabled: true,
    });
    renderPanel();

    const encendida = await screen.findByRole<HTMLInputElement>("radio", { name: /Encendida/ });
    const apagada = screen.getByRole<HTMLInputElement>("radio", { name: /Apagada/ });
    expect(encendida.checked).toBe(true);
    expect(apagada.checked).toBe(false);
  });
});

describe("PanelDeTablas — crear una tabla", () => {
  beforeEach(() => {
    comoDm();
  });

  async function abrirFormulario() {
    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Crear tabla" }));
    await screen.findByRole("heading", { name: "Nueva tabla" });
  }

  it("manda las filas tal como se escribieron", async () => {
    const crear = vi.spyOn(dmTablesApi, "createDmTable").mockResolvedValue(tablaDePifias);
    await abrirFormulario();

    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "Pifias de combate" },
    });
    fireEvent.change(screen.getAllByLabelText("Desde")[0], { target: { value: "1" } });
    fireEvent.change(screen.getAllByLabelText("Hasta")[0], { target: { value: "5" } });
    fireEvent.change(screen.getAllByLabelText("Resultado")[0], {
      target: { value: "Se te encasquilla el arma." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Añadir fila" }));
    fireEvent.change(screen.getAllByLabelText("Desde")[1], { target: { value: "6" } });
    fireEvent.change(screen.getAllByLabelText("Hasta")[1], { target: { value: "10" } });
    fireEvent.change(screen.getAllByLabelText("Resultado")[1], {
      target: { value: "Pierdes el turno." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar tabla" }));

    await waitFor(() => expect(crear).toHaveBeenCalled());
    expect(crear).toHaveBeenCalledWith("c1", {
      name: "Pifias de combate",
      visibility: "DM_ONLY",
      trigger: "NONE",
      entries: [
        { min: 1, max: 5, text: "Se te encasquilla el arma." },
        { min: 6, max: 10, text: "Pierdes el turno." },
      ],
    });
  });

  it("se puede quitar una fila, y la que se quita no viaja", async () => {
    const crear = vi.spyOn(dmTablesApi, "createDmTable").mockResolvedValue(tablaDePifias);
    await abrirFormulario();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Rumores" } });
    fireEvent.change(screen.getAllByLabelText("Resultado")[0], { target: { value: "Se queda" } });
    fireEvent.click(screen.getByRole("button", { name: "Añadir fila" }));
    fireEvent.change(screen.getAllByLabelText("Resultado")[1], { target: { value: "Se va" } });

    fireEvent.click(screen.getByRole("button", { name: "Quitar la fila 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar tabla" }));

    await waitFor(() => expect(crear).toHaveBeenCalled());
    const [, cuerpo] = crear.mock.calls[0];
    expect(cuerpo.entries).toEqual([{ min: 1, max: 1, text: "Se queda" }]);
  });

  it("un 400 del servidor se pinta con SU frase, no con una genérica", async () => {
    vi.spyOn(dmTablesApi, "createDmTable").mockRejectedValue(
      new ApiError("Falta el resultado 6: la tabla no puede tener huecos.", 400),
    );
    await abrirFormulario();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Con hueco" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar tabla" }));

    const aviso = await screen.findByRole("alert");
    expect(aviso).toHaveTextContent("Falta el resultado 6: la tabla no puede tener huecos.");
  });
});

describe("PanelDeTablas — la lista", () => {
  it("tirar una tabla enseña el texto del resultado", async () => {
    comoDm();
    vi.spyOn(dmTablesApi, "fetchDmTables").mockResolvedValue({
      tables: [tablaDePifias],
      houseTablesEnabled: false,
    });
    vi.spyOn(dmTablesApi, "rollDmTable").mockResolvedValue({
      tableId: "t1",
      tableName: "Pifias de combate",
      die: 10,
      roll: 7,
      text: "Pierdes el turno.",
      eventId: "ev1",
    });
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: /Tirar/ }));

    const resultado = await screen.findByRole("status");
    expect(resultado).toHaveTextContent("Pierdes el turno.");
    expect(resultado).toHaveTextContent("d10");
    expect(resultado).toHaveTextContent("7");
  });

  it("la visibilidad se pinta traducida y nunca como el valor del enum", async () => {
    comoDm();
    vi.spyOn(dmTablesApi, "fetchDmTables").mockResolvedValue({
      tables: [tablaDePifias],
      houseTablesEnabled: false,
    });
    const { container } = renderPanel();

    await screen.findByText("Pifias de combate");
    expect(screen.getByText("Solo DM")).toBeInTheDocument();

    const texto = container.textContent ?? "";
    for (const cruda of [
      "DM_ONLY",
      "PLAYERS",
      "PUBLIC",
      "OWNER_DM",
      "FUMBLE",
      "CRITICAL",
      "NONE",
    ]) {
      expect(texto).not.toContain(cruda);
    }
  });

  it("el disparador se pinta traducido y con la fila y su rango", async () => {
    comoDm();
    vi.spyOn(dmTablesApi, "fetchDmTables").mockResolvedValue({
      tables: [tablaDePifias],
      houseTablesEnabled: false,
    });
    renderPanel();

    await screen.findByText("Al sacar una pifia");
    expect(screen.getByText("1–5")).toBeInTheDocument();
    expect(screen.getByText("Se te encasquilla el arma.")).toBeInTheDocument();
  });
});
