import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, renderHook, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CharacterEditor } from "../CharacterEditor";
import * as charactersApi from "../api";
import type { Character } from "../api";
import { useCharacters } from "../hooks";
import * as characterSheetApi from "../../character-sheet/api";
import { sheetKey } from "../../character-sheet/hooks";
import * as campaignsApi from "../../campaigns/api";

// H6: este diálogo ya solo crea. Las pruebas de edición y de borrado que vivían aquí se han ido
// con el modo que probaban — lo que hacían ahora lo hace la página del personaje, que edita en el
// sitio (`pages/__tests__/CharacterDetailPage.test.tsx`).

function renderEditor(
  onClose: () => void = () => {},
  qc: QueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  return {
    qc,
    ...render(
      <QueryClientProvider client={qc}>
        <CharacterEditor campaignId="c1" onClose={onClose} />
      </QueryClientProvider>,
    ),
  };
}

const created: Character = {
  id: "ch1",
  campaignId: "c1",
  ownerId: "u1",
  name: "Tordek",
  raceKey: null,
  subraceKey: null,
  classKey: null,
  level: 5,
  bio: null,
  visibility: "PLAYERS",
  createdAt: "x",
  archivedAt: null,
  color: null,
};

const catalogo = {
  races: [
    { key: "dwarf", name: "Enano", subraces: [{ key: "dwarf-hill", name: "Enano de colina" }] },
    { key: "elf", name: "Elfo", subraces: [] },
  ],
  classes: [
    { key: "fighter", name: "Guerrero", hitDie: 10, subclasses: [] },
    { key: "wizard", name: "Mago", hitDie: 6, subclasses: [] },
  ],
  armor: [],
};

describe("CharacterEditor (crear)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(characterSheetApi, "fetchCatalog").mockResolvedValue(catalogo);
    // Reglas de la mesa (Task 6, D-CF-53) — una campaña sin reglas propias: los defaults de
    // `reglasCompletas` (LIBRE, nivel 1, sin catálogo acotado).
    vi.spyOn(campaignsApi, "fetchCampaign").mockResolvedValue({
      id: "c1",
      name: "Campaña de prueba",
      description: null,
      ownerId: "u1",
      createdAt: "x",
    });
  });

  // D-CF-65: el diálogo de creación ya no pide el nivel — lo fija la mesa (`nivelInicial`), y el
  // servidor lo ignora aunque se mande (E-RM-1).
  it("no manda level: lo fija la mesa, y lo dice en pantalla", async () => {
    const spy = vi.spyOn(charactersApi, "createCharacter").mockResolvedValue(created);
    renderEditor();

    expect(await screen.findByText("Nivel 1 — lo fija la mesa")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nivel")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Tordek" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const [, input] = spy.mock.calls[0];
    expect(input).not.toHaveProperty("level");
  });

  it("con nivelInicial 3, el diálogo dice «Nivel 3 — lo fija la mesa»", async () => {
    vi.spyOn(campaignsApi, "fetchCampaign").mockResolvedValue({
      id: "c1",
      name: "Campaña de prueba",
      description: null,
      ownerId: "u1",
      createdAt: "x",
      tableRules: {
        abilities: { metodo: "LIBRE" },
        nivelInicial: 3,
        pgNivelesSiguientes: "MEDIA",
        permitidos: { razas: [], clases: [], subclases: [] },
        oroInicial: { modo: "EQUIPO" },
      },
    });
    renderEditor();

    expect(await screen.findByText("Nivel 3 — lo fija la mesa")).toBeInTheDocument();
  });

  it("elige la visibilidad por su frase, nunca por el valor del enum", async () => {
    const spy = vi.spyOn(charactersApi, "createCharacter").mockResolvedValue(created);
    renderEditor();

    // Ni "PUBLIC" ni "DM_ONLY" pueden leerse en pantalla: la forma legible la escribe
    // features/entities/visibilidad.ts y este diálogo la importa.
    expect(screen.queryByText(/PUBLIC|DM_ONLY|OWNER_DM|PLAYERS/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Tordek" } });
    fireEvent.click(screen.getByRole("radio", { name: /Solo el DM/ }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy.mock.calls[0][1].visibility).toBe("DM_ONLY");
  });

  it("ya no ofrece ni borrar ni edición: crear es lo único que hace", () => {
    renderEditor();
    expect(screen.getByRole("heading", { name: "Nuevo personaje" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Borrar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Editar personaje" })).not.toBeInTheDocument();
  });

  it("shows the server error instead of failing silently", async () => {
    vi.spyOn(charactersApi, "createCharacter").mockRejectedValue(new Error("Not a member"));
    renderEditor();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Tordek" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Not a member")).toBeInTheDocument();
  });

  // Tarea 24 — el diálogo ofrece el catálogo, no texto libre, y guarda claves.
  it("ofrece raza y clase del catálogo, por su nombre y no por su clave", async () => {
    renderEditor();

    expect(await screen.findByRole("option", { name: "Enano" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Guerrero" })).toBeInTheDocument();
    // Ninguna clave cruda del catálogo puede leerse en pantalla.
    expect(screen.queryByText(/dwarf|fighter|wizard/)).not.toBeInTheDocument();
  });

  // Reglas de la mesa (Task 6) — `permitidos` acota el catálogo, misma semántica que la hoja.
  it("con permitidos.razas fijado, solo ofrece esas razas", async () => {
    vi.spyOn(campaignsApi, "fetchCampaign").mockResolvedValue({
      id: "c1",
      name: "Campaña de prueba",
      description: null,
      ownerId: "u1",
      createdAt: "x",
      tableRules: {
        abilities: { metodo: "LIBRE" },
        nivelInicial: 1,
        pgNivelesSiguientes: "MEDIA",
        permitidos: { razas: ["dwarf"], clases: [], subclases: [] },
        oroInicial: { modo: "EQUIPO" },
      },
    });
    renderEditor();

    expect(await screen.findByRole("option", { name: "Enano" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Elfo" })).not.toBeInTheDocument();
  });

  it("al elegir raza y clase, crea el personaje y luego manda las claves a la hoja (no race/class)", async () => {
    const createSpy = vi.spyOn(charactersApi, "createCharacter").mockResolvedValue(created);
    const patchSpy = vi.spyOn(characterSheetApi, "updateSheet").mockResolvedValue({} as never);
    renderEditor();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Tordek" } });
    await screen.findByRole("option", { name: "Enano" });
    fireEvent.change(screen.getByLabelText("Raza"), { target: { value: "dwarf" } });
    fireEvent.change(screen.getByLabelText("Subraza"), { target: { value: "dwarf-hill" } });
    fireEvent.change(screen.getByLabelText("Clase"), { target: { value: "fighter" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(patchSpy).toHaveBeenCalledTimes(1));
    // La creación no manda race/class de texto libre.
    const createInput = createSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(createInput.race).toBeUndefined();
    expect(createInput.class).toBeUndefined();
    // El PATCH a la hoja manda claves con su forma de referencia, no prosa.
    const [, characterId, sheetInput] = patchSpy.mock.calls[0];
    expect(characterId).toBe(created.id);
    expect(sheetInput).toEqual({
      race: { source: "SRD", key: "dwarf" },
      subrace: { source: "SRD", key: "dwarf-hill" },
      class: { source: "SRD", key: "fighter" },
    });
  });

  it("no manda ningún PATCH a la hoja si no se elige raza ni clase", async () => {
    vi.spyOn(charactersApi, "createCharacter").mockResolvedValue(created);
    const patchSpy = vi.spyOn(characterSheetApi, "updateSheet");
    renderEditor();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Tordek" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(charactersApi.createCharacter).toHaveBeenCalledTimes(1));
    expect(patchSpy).not.toHaveBeenCalled();
  });

  // Ronda de arreglo 1, Importante 1 — la lista no puede esperar el `staleTime` de 30 s para
  // enseñar la raza y la clase que el `PATCH` acaba de guardar.
  //
  // **Por qué un `renderHook(() => useCharacters(...))` de verdad y no solo mirar
  // `isInvalidated`.** `useCreateCharacter` YA invalida `charactersKey` en su propio `onSuccess`,
  // justo tras el `POST` — antes de que exista raza o clase que guardar. Sin un observador activo
  // de esa consulta, esa primera invalidación deja `isInvalidated` en `true` para siempre (nadie
  // la vuelve a pedir), y una prueba que solo mirara esa bandera habría pasado igual **sin** la
  // segunda invalidación que esta ficha añade — no habría distinguido el arreglo de su ausencia.
  // Con un suscriptor real (`useCharacters`), cada invalidación dispara un refetch de verdad: se
  // cuenta cuántas veces se pidió la lista, que es lo que de verdad ve la pantalla.
  it("tras el PATCH a la hoja, la lista se vuelve a pedir (no solo tras el POST) y la hoja queda sembrada", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const fetchSpy = vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([created]);
    vi.spyOn(charactersApi, "createCharacter").mockResolvedValue(created);
    const hoja = { character: { ...created, raceKey: "dwarf", classKey: "fighter" } };
    const patchSpy = vi.spyOn(characterSheetApi, "updateSheet").mockResolvedValue(hoja as never);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    // El suscriptor de verdad: sin él, `invalidateQueries` no dispara ningún refetch observable.
    renderHook(() => useCharacters("c1"), { wrapper });
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));

    renderEditor(() => {}, qc);
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Tordek" } });
    await screen.findByRole("option", { name: "Enano" });
    fireEvent.change(screen.getByLabelText("Raza"), { target: { value: "dwarf" } });
    fireEvent.change(screen.getByLabelText("Clase"), { target: { value: "fighter" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(patchSpy).toHaveBeenCalledTimes(1));
    // Tres pedidos en total: el del montaje, el que dispara el `POST` (`useCreateCharacter`) y
    // el que dispara **este** `PATCH`. Sin la invalidación de esta ficha se queda en dos para
    // siempre, y este `waitFor` agota su plazo.
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(3));
    expect(qc.getQueryData(sheetKey("c1", created.id))).toEqual(hoja);
  });

  // Ronda de arreglo 1, Importante 2 — si el PATCH falla, el personaje YA se creó: no puede
  // volver a crearse con un segundo «Guardar».
  it("si el PATCH a la hoja falla, no se crea el personaje dos veces: el botón queda bloqueado y el aviso lo explica", async () => {
    const createSpy = vi.spyOn(charactersApi, "createCharacter").mockResolvedValue(created);
    vi.spyOn(characterSheetApi, "updateSheet").mockRejectedValue(new Error("Se cayó la red"));
    renderEditor();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Tordek" } });
    await screen.findByRole("option", { name: "Enano" });
    fireEvent.change(screen.getByLabelText("Raza"), { target: { value: "dwarf" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText(/el personaje se creó/i)).toBeInTheDocument();
    expect(screen.getByText(/elegirlas desde su hoja/i)).toBeInTheDocument();

    const boton = screen.getByRole("button", { name: "Guardar" });
    expect(boton).toHaveAttribute("aria-disabled", "true");

    // El botón bloqueado no vuelve a crear: `aria-disabled` no saca el elemento del DOM, así que
    // hace falta comprobar que un segundo clic no dispara una segunda llamada.
    fireEvent.click(boton);
    expect(createSpy).toHaveBeenCalledTimes(1);
  });

  // Ronda de arreglo 1, Minor 4 — el aviso del brief: nunca `disabled` de verdad.
  it("mientras guarda, el botón lleva aria-disabled y no el atributo disabled de verdad", async () => {
    let resolverCreate: (c: Character) => void = () => {};
    vi.spyOn(charactersApi, "createCharacter").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolverCreate = resolve;
        }),
    );
    renderEditor();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Tordek" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    const boton = await screen.findByRole("button", { name: "Guardar" });
    await waitFor(() => expect(boton).toHaveAttribute("aria-disabled", "true"));
    expect(boton).not.toHaveAttribute("disabled");

    resolverCreate(created);
  });
});
