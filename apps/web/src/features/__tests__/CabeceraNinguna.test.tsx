import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { PanelDeBestiario } from "../bestiario/PanelDeBestiario";
import * as bestiarioApi from "../bestiario/api";
import { PanelDeTablas } from "../dm-tables/PanelDeTablas";
import * as dmTablesApi from "../dm-tables/api";
import { ConsultaDelMundo } from "../sessions/dm/ConsultaDelMundo";
import * as entitiesApi from "../entities/api";
import { PaginaDeInventario } from "../inventory/PaginaDeInventario";
import * as inventoryApi from "../inventory/api";
import type { InventoryResponse } from "../inventory/api";
import { PedirTirada } from "../roll-requests/PedirTirada";
import * as rollRequestsApi from "../roll-requests/api";
import * as charactersApi from "../characters/api";
import * as membersApi from "../campaigns/members";

// Tarea 8 (plan 2026-09-19) — «un cajón abierto tiene exactamente un `h2`». El controlador
// dispensa del recorrido de Playwright y pide, en su lugar, una unitaria por componente: con
// `cabecera="ninguna"` ninguno de los cinco pinta su propio titular, porque ese trabajo pasa a
// ser del `Dialog` que los monta (su `title` es el único `h2` del cajón).

function pintar(qc: QueryClient, contenido: ReactElement) {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>{contenido}</QueryClientProvider>
    </MemoryRouter>,
  );
}

function nuevoQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

/**
 * Que no exista SU titular (el que hoy vive en `title`/`subtitulo` del `Dialog`) — no que no
 * exista ningún `h2`/`h3` en el árbol: `ZonaDeObjetos`, `PanelCarga`, `PanelMonedas` o una fila
 * de tabla/criatura llevan los suyos propios, y son sub-cabeceras internas ajenas a esta tarea.
 */
function sinCabeceraPropia(titulo: string) {
  expect(screen.queryByRole("heading", { name: titulo })).not.toBeInTheDocument();
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('cabecera="ninguna" — ningún titular propio', () => {
  it('PanelDeBestiario no pinta su título con cabecera="ninguna"', async () => {
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([]);
    vi.spyOn(bestiarioApi, "fetchStatblocks").mockResolvedValue({ srd: [], campaign: [] });
    vi.spyOn(bestiarioApi, "fetchNpcs").mockResolvedValue([]);

    pintar(nuevoQc(), <PanelDeBestiario campaignId="c1" cabecera="ninguna" />);
    await screen.findByLabelText("Buscar una criatura");
    sinCabeceraPropia("Bestiario");
  });

  it('PanelDeTablas no pinta su título con cabecera="ninguna"', async () => {
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([]);
    vi.spyOn(dmTablesApi, "fetchDmTables").mockResolvedValue({
      houseTablesEnabled: false,
      tables: [],
    });

    pintar(nuevoQc(), <PanelDeTablas campaignId="c1" cabecera="ninguna" />);
    await screen.findByText("No hay ninguna tabla que puedas ver en esta campaña.");
    sinCabeceraPropia("Tablas del DM");
  });

  it('ConsultaDelMundo no pinta su título con cabecera="ninguna"', async () => {
    vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([]);

    pintar(nuevoQc(), <ConsultaDelMundo campaignId="c1" esDm cabecera="ninguna" />);
    await screen.findByLabelText("Buscar en el mundo");
    sinCabeceraPropia("El mundo, sin salir");
  });

  it('PaginaDeInventario no pinta su título con cabecera="ninguna"', async () => {
    const respuesta: InventoryResponse = {
      items: [],
      purse: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      totalWeightOz: 0,
      carryCapacityOz: null,
      encumbrance: null,
    };
    vi.spyOn(inventoryApi, "fetchInventory").mockResolvedValue(respuesta);
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([]);

    pintar(nuevoQc(), <PaginaDeInventario campaignId="c1" characterId="ch1" cabecera="ninguna" />);
    await screen.findByTestId("contador-sintonia");
    sinCabeceraPropia("Inventario");
  });

  it('PedirTirada no pinta su título con cabecera="ninguna"', async () => {
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([]);
    vi.spyOn(rollRequestsApi, "fetchDifficultyClasses").mockResolvedValue([]);

    pintar(nuevoQc(), <PedirTirada campaignId="c1" cabecera="ninguna" />);
    await screen.findByText("Esta campaña todavía no tiene personajes a los que pedir nada.");
    sinCabeceraPropia("Pedir una tirada");
  });
});
