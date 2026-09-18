import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BandaUnica } from "../BandaUnica";
import type { Session } from "../api";
import * as logApi from "../log-api";
import * as clockHooks from "../../game-clock/hooks";
import * as entitiesHooks from "../../entities/hooks";
import * as members from "../../campaigns/members";

// Task 3 (3A.3) — la banda única. Fusiona lo que probaban por separado `BandaDeMesa.test.tsx`
// (nunca existió como fichero propio: vivía dentro de `sesion-en-juego.test.tsx` y de
// `mesa-de-sesion.test.tsx`) y `CabeceraDeEscena` (solo tenía cobertura de e2e): título, lugar,
// reloj, «Ver como» solo DM, salir a la campaña, presentes — más lo nuevo de esta tarea, el
// conmutador «Con tablero / Sin tablero» y el diálogo de atajos, que sí llevan lógica propia.

const SESION: Session = {
  id: "s1",
  campaignId: "c1",
  title: "El puerto en llamas",
  scheduledAt: null,
  notes: null,
  visibility: "PLAYERS",
  createdAt: "2026-09-02T20:00:00.000Z",
  status: "IN_PROGRESS",
  startedAt: "2026-09-02T20:00:00.000Z",
  endedAt: null,
  attendance: [{ userId: "u-ana", characterId: "p-corvin" }],
};

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/campaigns/c1/sesion"]}>
        <Routes>
          <Route path="/campaigns/:id" element={<>{children}</>} />
          <Route path="*" element={<>{children}</>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function montar(props: Partial<Parameters<typeof BandaUnica>[0]> = {}) {
  return render(
    <BandaUnica
      campaignId="c1"
      nombreDeCampana="La mesa"
      sesion={SESION}
      esDm
      comoUsuario=""
      onComoUsuario={() => {}}
      presentes={[]}
      hayTablero={false}
      modo="tablero"
      onModo={() => {}}
      {...props}
    />,
    { wrapper },
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  vi.spyOn(logApi, "fetchGameEvents").mockResolvedValue({ nextCursor: null, events: [] });
  vi.spyOn(entitiesHooks, "useAllEntities").mockReturnValue({ data: [] } as never);
  vi.spyOn(clockHooks, "useGameClock").mockReturnValue({ data: { seconds: 0 } } as never);
  vi.spyOn(members, "useMembers").mockReturnValue({
    data: [
      { userId: "u-dm", displayName: "Ada", role: "DM" },
      { userId: "u-ana", displayName: "Ana", role: "PLAYER" },
    ],
  } as never);
});

describe("el título y el lugar", () => {
  it("con sesión, el título es el de la sesión, y sin lugar revelado no se inventa ninguno", () => {
    montar();
    const banda = screen.getByRole("banner", { name: "Estado de la mesa" });
    expect(within(banda).getByText("El puerto en llamas")).toBeInTheDocument();
    // Sin ningún ENTITY_REVEALED de tipo LOCATION, no hay enlace de lugar que enseñar.
    expect(screen.queryByRole("link", { name: "El faro" })).not.toBeInTheDocument();
  });

  it("sin sesión, el título dice que la mesa está en reposo", () => {
    montar({ sesion: null });
    const banda = screen.getByRole("banner", { name: "Estado de la mesa" });
    expect(within(banda).getByText("La mesa, en reposo")).toBeInTheDocument();
  });

  it("con un lugar revelado, aparece en cobre y enlaza a su ficha", async () => {
    vi.spyOn(entitiesHooks, "useAllEntities").mockReturnValue({
      data: [{ id: "e-faro", type: "LOCATION", name: "El faro" }],
    } as never);
    vi.spyOn(logApi, "fetchGameEvents").mockResolvedValue({
      nextCursor: null,
      events: [
        {
          id: "ev1",
          campaignId: "c1",
          type: "ENTITY_REVEALED",
          subjectType: "entity",
          subjectId: "e-faro",
          payload: { type: "ENTITY_REVEALED" },
          visibility: "PLAYERS",
          createdAt: "2026-09-02T20:05:00.000Z",
        },
      ] as never,
    });

    montar();

    const enlace = await screen.findByRole("link", { name: "El faro" });
    expect(enlace).toHaveAttribute("href", "/campaigns/c1/entidades/e-faro");
  });
});

describe("el reloj de la campaña", () => {
  it("se pinta también en reposo: la hora y el día del mundo", () => {
    vi.spyOn(clockHooks, "useGameClock").mockReturnValue({
      data: { seconds: 12 * 3600 },
    } as never);

    montar({ sesion: null });

    const banda = screen.getByRole("banner", { name: "Estado de la mesa" });
    expect(within(banda).getByText("12:00")).toBeInTheDocument();
    expect(within(banda).getByText(/Día 1, de día/)).toBeInTheDocument();
  });
});

describe("«Ver como»", () => {
  it("solo el DM lo tiene", () => {
    montar({ esDm: false });
    expect(screen.queryByLabelText("Ver el registro como")).not.toBeInTheDocument();
  });

  it("el DM sí, y ofrece a los jugadores del catálogo de miembros", () => {
    montar({ esDm: true });
    expect(screen.getByLabelText("Ver el registro como")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Ana" })).toBeInTheDocument();
  });
});

describe("salir a la campaña (anexo #18)", () => {
  it("la primera miga vuelve a la campaña, pestaña Sesiones; «Tus crónicas» va después", () => {
    montar();
    const enlaces = screen.getAllByRole("link");
    expect(enlaces[0]).toHaveAttribute("href", "/campaigns/c1?seccion=sessions");
    expect(enlaces[0]).toHaveTextContent("La mesa");
    expect(screen.getByRole("link", { name: "Tus crónicas" })).toHaveAttribute("href", "/");
  });
});

describe("los presentes", () => {
  it("sin nadie declarado, no se pinta la línea", () => {
    montar({ presentes: [] });
    expect(screen.queryByText("En la escena:")).not.toBeInTheDocument();
  });

  it("con presentes, se nombran", () => {
    montar({ presentes: ["Corvin Vhael", "Thora Piedrahonda"] });
    expect(screen.getByText("En la escena:")).toBeInTheDocument();
    expect(screen.getByText("Corvin Vhael")).toBeInTheDocument();
    expect(screen.getByText("Thora Piedrahonda")).toBeInTheDocument();
  });
});

// El conmutador SÍ lleva lógica (localStorage, estado elevado a MesaDeSesion), así que se prueba
// como tal: solo aparece con sala, y elegir una opción llama a `onModo` con el valor pulsado.
describe("el conmutador «Con tablero / Sin tablero»", () => {
  it("sin sala guardada, no existe: no hay nada entre lo que elegir", () => {
    montar({ hayTablero: false });
    expect(screen.queryByRole("radiogroup", { name: "Modo de la mesa" })).not.toBeInTheDocument();
  });

  it("con sala, se ofrece y refleja el modo puesto", () => {
    montar({ hayTablero: true, modo: "cronica" });
    const grupo = screen.getByRole("radiogroup", { name: "Modo de la mesa" });
    expect(within(grupo).getByRole("radio", { name: "Sin tablero" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(within(grupo).getByRole("radio", { name: "Con tablero" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("pulsar una opción llama a onModo con ESA opción", () => {
    const onModo = vi.fn();
    montar({ hayTablero: true, modo: "tablero", onModo });

    fireEvent.click(screen.getByRole("radio", { name: "Sin tablero" }));

    expect(onModo).toHaveBeenCalledWith("cronica");
  });
});

// El diálogo de atajos también lleva lógica propia (abrir/cerrar), así que se prueba.
describe("el diálogo de atajos", () => {
  it("se abre con «?» y lista las teclas que de verdad existen", async () => {
    montar();

    fireEvent.click(screen.getByRole("button", { name: "Atajos de teclado" }));

    const dialogo = await screen.findByRole("dialog", { name: "Atajos" });
    expect(within(dialogo).getByText("N")).toBeInTheDocument();
    expect(within(dialogo).getByText("Tu hoja")).toBeInTheDocument();
    expect(within(dialogo).getByText("I")).toBeInTheDocument();
    expect(within(dialogo).getByText("Tu bolsa")).toBeInTheDocument();
    expect(within(dialogo).getByText("M")).toBeInTheDocument();
    expect(within(dialogo).getByText("Consulta del mundo")).toBeInTheDocument();
    expect(within(dialogo).getByText("D")).toBeInTheDocument();
    expect(within(dialogo).getByText("Los dados")).toBeInTheDocument();
    expect(within(dialogo).getByText("Esc")).toBeInTheDocument();
  });

  it("Escape lo cierra, como cualquier cajón", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Atajos de teclado" }));
    const dialogo = await screen.findByRole("dialog", { name: "Atajos" });

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(dialogo).not.toBeInTheDocument());
  });
});
