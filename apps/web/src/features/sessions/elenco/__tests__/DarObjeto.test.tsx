import type { ComponentProps } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DarObjeto } from "../DarObjeto";
import * as charactersApi from "../../../characters/api";
import type { Character } from "../../../characters/api";
import * as inventoryApi from "../../../inventory/api";
import * as campaignItemsApi from "../../../campaign-items/api";
import * as bestiarioApi from "../../../bestiario/api";

// Tarea B4 — «Dar…» sin salir de la mesa.
//
// Lo que se prueba no es el `add`/`changeMoney` del inventario —eso ya tiene su suite—: es que
// **este gesto** elige destinatario con radios (no con un desplegable), que un jugador solo se ve
// a sí mismo (higiene de interfaz, la puerta real está en el servidor), que no existe un «repartir
// entre todos», y que una `entregaFija` manda cada objeto y las monedas contra el destinatario
// elegido y no contra otro.

function personaje(id: string, name: string): Character {
  return {
    id,
    campaignId: "c1",
    ownerId: "u1",
    name,
    raceKey: null,
    subraceKey: null,
    classKey: null,
    level: 1,
    bio: null,
    visibility: "PLAYERS",
    color: null,
    createdAt: "x",
    archivedAt: null,
  };
}

const MARTA = personaje("ch-marta", "Marta");
const BRANN = personaje("ch-brann", "Brann");

// **Ficha P2-3.** Un PNJ es una fila de `Character`, pero `CharactersService.list()` filtra
// `statblockRef: null` a propósito: esa lista es «quién se sienta a la mesa». Un PNJ cedido a un
// jugador vive en la otra lista, la del bestiario, que es la que trae `ownerId`.
const ZARRA_LA_CEDIDA = {
  id: "npc-zarra",
  name: "Zarra",
  statblockRef: "SRD:commoner",
  currentHp: 4,
  visibility: "PLAYERS",
  ownerId: "u1",
};

function montar(props: Partial<ComponentProps<typeof DarObjeto>> & { soyDm: boolean }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DarObjeto campaignId="c1" miPersonajeId="ch-brann" {...props} />
    </QueryClientProvider>,
  );
}

describe("DarObjeto", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([MARTA, BRANN]);
    vi.spyOn(campaignItemsApi, "fetchSrdItems").mockResolvedValue([]);
    vi.spyOn(campaignItemsApi, "fetchCampaignItems").mockResolvedValue([]);
    vi.spyOn(bestiarioApi, "fetchNpcs").mockResolvedValue([]);
  });

  it("el DM elige destinatario entre todo el elenco", async () => {
    montar({ soyDm: true });
    fireEvent.click(await screen.findByRole("button", { name: /dar/i }));
    expect(await screen.findByRole("radio", { name: /Marta/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Brann/i })).toBeInTheDocument();
  });

  it("un jugador solo se ve a sí mismo como destinatario", async () => {
    montar({ soyDm: false });
    fireEvent.click(await screen.findByRole("button", { name: /dar/i }));
    expect(await screen.findByRole("radio", { name: /Brann/i })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /Marta/i })).not.toBeInTheDocument();
  });

  // **Ficha P2-3 — un gesto que se ofrece sin datos para completarlo.**
  //
  // El jugador al que el DM le cedió un PNJ ve el botón «Dar…» y el diálogo se abría **vacío**:
  // su `miPersonajeId` es el id del PNJ, y `fetchCharacters` no trae PNJ. No era una fuga de
  // autorización —el servidor no cambia de postura— sino una lista a la que le faltaba la mitad.
  it("un jugador que maneja un PNJ cedido se encuentra a ese PNJ en la lista", async () => {
    vi.spyOn(bestiarioApi, "fetchNpcs").mockResolvedValue([ZARRA_LA_CEDIDA]);
    montar({ soyDm: false, miPersonajeId: "npc-zarra" });
    fireEvent.click(await screen.findByRole("button", { name: /dar/i }));
    expect(await screen.findByRole("radio", { name: /Zarra/i })).toBeInTheDocument();
    // Y sigue siendo solo el suyo: un PNJ en la lista no abre la de los demás.
    expect(screen.queryByRole("radio", { name: /Brann/i })).not.toBeInTheDocument();
  });

  it("no ofrece repartir entre todos", async () => {
    montar({ soyDm: true });
    fireEvent.click(await screen.findByRole("button", { name: /dar/i }));
    await screen.findByRole("radio", { name: /Marta/i });
    // Red más ancha que un botón concreto (vuelta de arreglo 1, menor): un radio o un enlace
    // llamado «a todos» también cumplirían el reparto automático que el autor descartó, y solo
    // mirar `role: "button"` los dejaría pasar.
    expect(screen.queryByText(/a todos|repartir|partes iguales/i)).not.toBeInTheDocument();
  });

  it("el modo libre deja elegir el objeto de verdad, con el marcado real de SelectorDeObjeto (I1)", async () => {
    // Antes de este arreglo, la única prueba del modo libre miraba los radios y se paraba ahí:
    // desmontar `<SelectorDeObjeto />` (sustituirlo por `{null}`) dejaba la suite entera en
    // verde, porque nada llegaba a comprobar que el DM pudiera elegir un objeto de verdad.
    vi.spyOn(campaignItemsApi, "fetchSrdItems").mockResolvedValue([
      {
        source: "SRD",
        ref: "SRD:short-sword",
        name: "Espada corta",
        kind: "WEAPON",
        weightOz: 32,
        effects: [],
        requiresAttunement: false,
        attuned: false,
      },
    ]);
    vi.spyOn(inventoryApi, "addInventoryItem").mockResolvedValue({} as never);

    montar({ soyDm: true });
    fireEvent.click(await screen.findByRole("button", { name: /dar/i }));
    fireEvent.click(await screen.findByRole("radio", { name: /Marta/i }));

    // El marcado real de `SelectorDeObjeto`: su propio botón «Añadir objeto» abre la búsqueda,
    // el objeto es un `<button>` en una lista (no un `role="option"`), y «Añadir» confirma.
    fireEvent.click(await screen.findByRole("button", { name: /añadir objeto/i }));
    fireEvent.click(await screen.findByRole("button", { name: /espada corta/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Añadir$/ }));

    await waitFor(() =>
      expect(inventoryApi.addInventoryItem).toHaveBeenCalledWith(
        "c1",
        "ch-marta",
        expect.objectContaining({ ref: { source: "SRD", key: "short-sword" } }),
      ),
    );
  });

  it("una entrega fija manda cada objeto y las monedas contra el destinatario elegido", async () => {
    vi.spyOn(inventoryApi, "addInventoryItem").mockResolvedValue({} as never);
    vi.spyOn(inventoryApi, "changeMoney").mockResolvedValue({} as never);

    montar({
      soyDm: true,
      entregaFija: {
        objetos: [
          { ref: { source: "SRD", key: "short-sword" }, cantidad: 1, nombre: "Espada corta" },
        ],
        monedas: { gp: 15 },
      },
    });

    fireEvent.click(await screen.findByRole("button", { name: /dar/i }));
    fireEvent.click(await screen.findByRole("radio", { name: /Marta/i }));
    fireEvent.click(screen.getByRole("button", { name: /entregar/i }));

    await waitFor(() =>
      expect(inventoryApi.addInventoryItem).toHaveBeenCalledWith("c1", "ch-marta", {
        ref: { source: "SRD", key: "short-sword" },
        quantity: 1,
        location: "CARRIED",
      }),
    );
    expect(inventoryApi.changeMoney).toHaveBeenCalledWith("c1", "ch-marta", { gp: 15 });
  });

  it("deshabilitado, NO PINTA el botón y dice por qué en su lugar (arreglo de vuelta 1, I5)", async () => {
    // Cambiado desde `toBeDisabled()`: un `<button disabled>` sale del recorrido de teclado y el
    // motivo, en un `<span>` hermano sin `aria-describedby`, no se anuncia — es el daño exacto
    // que `docs/04-convenciones.md` describe para el botón de guardar. Aquí «no ofrecer el
    // gesto» y «apagarlo» no son la misma acción: no se pinta ningún botón.
    montar({ soyDm: true, disabled: true, motivoDeshabilitado: "Ya no queda nada que dar." });
    expect(screen.queryByRole("button", { name: /dar/i })).not.toBeInTheDocument();
    expect(screen.getByText("Ya no queda nada que dar.")).toBeInTheDocument();
  });

  it("ninguna clave de catálogo llega a la pantalla al enseñar una entregaFija", async () => {
    montar({
      soyDm: true,
      entregaFija: {
        objetos: [
          { ref: { source: "SRD", key: "short-sword" }, cantidad: 2, nombre: "Espada corta" },
        ],
      },
    });
    fireEvent.click(await screen.findByRole("button", { name: /dar/i }));
    expect(await screen.findByText("Espada corta x2")).toBeInTheDocument();
    expect(screen.queryByText(/short-sword/)).not.toBeInTheDocument();
  });

  // **Tarea 8 del pulido (C2: #1) — modo `controlado`.** `MandosDeCombatiente` ya no monta su
  // propio botón «Dar»: lo abre desde el ítem «Dar…» de `MenuDeAcciones`, así que `DarObjeto`
  // tiene que poder vivir sin disparador propio y obedecer a quien lo abre y lo cierra.
  describe("modo controlado (tarea 8 del pulido)", () => {
    it("con `controlado`, no pinta su propio botón «Dar»", () => {
      render(
        <QueryClientProvider
          client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
          <DarObjeto
            campaignId="c1"
            soyDm
            miPersonajeId="ch-brann"
            controlado={{ abierto: false, onCerrar: vi.fn() }}
          />
        </QueryClientProvider>,
      );
      expect(screen.queryByRole("button", { name: /dar/i })).not.toBeInTheDocument();
    });

    it("con `controlado.abierto`, el cajón se abre sin que nadie haya pulsado un botón aquí", async () => {
      const onCerrar = vi.fn();
      render(
        <QueryClientProvider
          client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
          <DarObjeto
            campaignId="c1"
            soyDm
            miPersonajeId="ch-brann"
            controlado={{ abierto: true, onCerrar }}
          />
        </QueryClientProvider>,
      );
      expect(await screen.findByRole("dialog", { name: "Dar…" })).toBeInTheDocument();
    });

    it("cerrar desde dentro llama a `controlado.onCerrar`, no a un estado propio", async () => {
      const onCerrar = vi.fn();
      render(
        <QueryClientProvider
          client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
          <DarObjeto
            campaignId="c1"
            soyDm
            miPersonajeId="ch-brann"
            controlado={{ abierto: true, onCerrar }}
          />
        </QueryClientProvider>,
      );
      const cajon = await screen.findByRole("dialog", { name: "Dar…" });
      fireEvent.click(within(cajon).getByRole("button", { name: "Cerrar (Escape)" }));
      expect(onCerrar).toHaveBeenCalledTimes(1);
    });
  });
});
