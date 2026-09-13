import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AjustesDePersonaje } from "../AjustesDePersonaje";
import { ArchivoDePersonajes } from "../ArchivoDePersonajes";
import * as charactersApi from "../api";
import type { Character } from "../api";

// Plan 06, ficha M9 — **archivar existe en la web**.
//
// Lo que estas pruebas vigilan es exactamente lo que el plan pide y lo que la ficha llevaba
// abierta desde 2.5.8: el gesto se ofrece a quien puede, la confirmación **dice la consecuencia
// y que se recupera** en vez de preguntar si estás seguro, y el archivo **tiene puerta de
// salida**. Lo que no vigilan, a propósito, es la autorización: la impone el servidor
// (`characters.service.ts`, `requireEditable`), y esconder o deshabilitar un botón no es control
// de acceso — por eso el control se deshabilita con el motivo a la vista, nunca desaparece.

const personaje: Character = {
  id: "ch1",
  campaignId: "c1",
  ownerId: "owner1",
  name: "Kaelith",
  raceKey: null,
  subraceKey: null,
  classKey: null,
  level: 3,
  bio: null,
  visibility: "PLAYERS",
  createdAt: "x",
  archivedAt: null,
  color: null,
};

const MOTIVO = "Solo el dueño o el DM puede editar este personaje.";

function montarAjustes({
  puedeEditar = true,
  puedeArchivar = true,
  onArchived = () => {},
  character = personaje,
}: {
  puedeEditar?: boolean;
  puedeArchivar?: boolean;
  onArchived?: () => void;
  character?: Character;
} = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AjustesDePersonaje
        campaignId="c1"
        character={character}
        puedeEditar={puedeEditar}
        puedeArchivar={puedeArchivar}
        motivo={puedeEditar ? undefined : MOTIVO}
        onDeleted={() => {}}
        onArchived={onArchived}
      />
    </QueryClientProvider>,
  );
}

describe("Archivar — el gesto fácil, en la ficha del personaje", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("se ofrece a quien puede editar, junto a borrar", () => {
    montarAjustes();
    expect(screen.getByRole("button", { name: "Archivar" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Borrar" })).toBeInTheDocument();
  });

  it("a quien no puede editar se le deshabilita con el motivo, no se le esconde", () => {
    montarAjustes({ puedeEditar: false });
    const archivar = screen.getByRole("button", { name: "Archivar" });
    expect(archivar).toHaveAttribute("aria-disabled", "true");
    expect(archivar).toHaveAttribute("title", MOTIVO);
  });

  it("no se ofrece donde el gesto no aplica (un PNJ, o uno ya archivado)", () => {
    montarAjustes({ puedeArchivar: false });
    expect(screen.queryByRole("button", { name: "Archivar" })).not.toBeInTheDocument();
    // Borrar sigue estando: lo que desaparece es el gesto que el servidor rechazaría con 404,
    // no la pantalla entera.
    expect(screen.getByRole("button", { name: "Borrar" })).toBeInTheDocument();
  });

  it("la confirmación dice la consecuencia y que se recupera, y nunca pregunta si estás seguro", () => {
    montarAjustes();
    fireEvent.click(screen.getByRole("button", { name: "Archivar" }));

    // Dónde deja de aparecer, que no se pierde nada, y por dónde vuelve — las tres cosas.
    expect(screen.getByText(/sale de la lista de personajes/)).toBeInTheDocument();
    expect(screen.getByText(/No se pierde nada/)).toBeInTheDocument();
    expect(screen.getByText(/vuelve desde "Archivados"/)).toBeInTheDocument();
    expect(screen.queryByText(/seguro/i)).not.toBeInTheDocument();
  });

  it("confirmar llama a la mutación y avisa a quien lo monta", async () => {
    const spy = vi.spyOn(charactersApi, "archiveCharacter").mockResolvedValue(personaje);
    const onArchived = vi.fn();
    montarAjustes({ onArchived });

    fireEvent.click(screen.getByRole("button", { name: "Archivar" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, archivar" }));

    await waitFor(() => expect(spy).toHaveBeenCalledWith("c1", "ch1"));
    await waitFor(() => expect(onArchived).toHaveBeenCalledTimes(1));
  });

  it("un rechazo del servidor se lee en línea y el personaje no se da por archivado", async () => {
    vi.spyOn(charactersApi, "archiveCharacter").mockRejectedValue(new Error("Character not found"));
    const onArchived = vi.fn();
    montarAjustes({ onArchived });

    fireEvent.click(screen.getByRole("button", { name: "Archivar" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, archivar" }));

    expect(await screen.findByText("Character not found")).toBeInTheDocument();
    expect(onArchived).not.toHaveBeenCalled();
  });

  it("borrar cuesta más: nombra archivar como la salida barata y sigue avisando de lo definitivo", () => {
    montarAjustes();
    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));
    expect(screen.getByText(/No se puede deshacer/)).toBeInTheDocument();
    expect(screen.getByText(/archívalo/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sí, borrar definitivamente" })).toBeInTheDocument();
  });

  it("ordena color · visibilidad · archivar/borrar, y lo destructivo va en el pie (anexo #9)", () => {
    montarAjustes();
    const tarjeta = screen.getByRole("region", { name: "ajustes del personaje" });
    const color = within(tarjeta).getByRole("group", { name: /color/i });
    const visibilidad = within(tarjeta).getByRole("group", { name: /quién puede verlo/i });
    const archivar = within(tarjeta).getByRole("button", { name: /archivar/i });
    // El nombre accesible real de `DeleteButton` con sus props por defecto es «Borrar» a secas
    // (`label = "Borrar"`); el ancla exacta (`^…$`) evita que capture algo que no sea él —
    // «Archivar» no contiene «borrar» y viceversa, pero un nombre exacto es lo que de verdad
    // ata esta prueba al botón que borra, no a cualquier botón que lo mencione.
    const borrar = within(tarjeta).getByRole("button", { name: /^borrar$/i });
    // `compareDocumentPosition`: 4 = el argumento va DESPUÉS del receptor.
    expect(color.compareDocumentPosition(visibilidad) & 4).toBeTruthy();
    expect(visibilidad.compareDocumentPosition(archivar) & 4).toBeTruthy();
    expect(archivar.closest("footer")).not.toBeNull();
    // Sin esto, mover SOLO `DeleteButton` fuera del pie deja la prueba en verde: la mutación
    // que el brief pedía en el paso 5 no la habría cazado, porque ninguna aserción anterior
    // mira a `borrar`. Estas dos sí.
    expect(borrar.closest("footer")).not.toBeNull();
    expect(archivar.compareDocumentPosition(borrar) & 4).toBeTruthy();
  });

  it("un personaje ARCHIVADO no deja un pie vacío: sin nada que ofrecer, no hay footer", () => {
    const { container } = montarAjustes({
      character: { ...personaje, archivedAt: "2026-09-01T00:00:00.000Z" },
    });
    // Ni archivar ni borrar se ofrecen a un personaje ya archivado (ambos se apagan con
    // `estaArchivado`), y sin ningún error de archivar/borrar tampoco hay nada más que poner en
    // el pie. `TarjetaDeHoja` no debe pintar el filete ni el relleno de un `<footer>` vacío
    // debajo del aviso de «Devolver a la mesa».
    expect(container.querySelector("footer")).toBeNull();
  });
});

function montarArchivo({
  archivados = [personaje],
  puedeDevolver = () => true,
}: {
  archivados?: Character[];
  puedeDevolver?: (c: Character) => boolean;
} = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ArchivoDePersonajes
        campaignId="c1"
        archivados={archivados}
        puedeDevolver={puedeDevolver}
        motivo="Solo el dueño o el DM puede devolver este personaje."
      />
    </QueryClientProvider>,
  );
}

describe("El archivo tiene puerta de salida", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("pinta lo que devuelve `archived` y ofrece devolverlo", () => {
    montarArchivo();
    expect(screen.getByRole("region", { name: "Archivados" })).toBeInTheDocument();
    expect(screen.getByText("Kaelith")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Devolver a la mesa" })).toBeEnabled();
  });

  it("devolver llama a `unarchive` con el personaje de esa fila", async () => {
    const spy = vi.spyOn(charactersApi, "unarchiveCharacter").mockResolvedValue(personaje);
    montarArchivo({
      archivados: [personaje, { ...personaje, id: "ch2", name: "Sorrel" }],
    });

    const filas = screen.getAllByRole("button", { name: "Devolver a la mesa" });
    fireEvent.click(filas[1]);

    await waitFor(() => expect(spy).toHaveBeenCalledWith("c1", "ch2"));
  });

  it("quien no puede devolverlo lo ve deshabilitado con el motivo, no escondido", () => {
    montarArchivo({ puedeDevolver: () => false });
    const boton = screen.getByRole("button", { name: "Devolver a la mesa" });
    expect(boton).toHaveAttribute("aria-disabled", "true");
    expect(boton).toHaveAttribute("title", "Solo el dueño o el DM puede devolver este personaje.");
  });

  it("sin nada archivado no pinta una sección vacía", () => {
    montarArchivo({ archivados: [] });
    expect(screen.queryByRole("region", { name: "Archivados" })).not.toBeInTheDocument();
  });

  it("un rechazo del servidor se lee en la propia fila", async () => {
    vi.spyOn(charactersApi, "unarchiveCharacter").mockRejectedValue(new Error("Not a member"));
    montarArchivo();
    fireEvent.click(screen.getByRole("button", { name: "Devolver a la mesa" }));
    expect(await screen.findByText("Not a member")).toBeInTheDocument();
  });
});
