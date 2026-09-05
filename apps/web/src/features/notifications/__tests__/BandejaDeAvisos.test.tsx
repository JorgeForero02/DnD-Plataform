import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { BandejaDeAvisos } from "../BandejaDeAvisos";
import * as notificationsApi from "../api";
import type { NotificationRow, NotificationsPage } from "../api";
import { useAuthStore } from "../../../store/auth.store";

// Plan 12 · 12.2 — lo que puede romperse en silencio en la bandeja:
//
//  · que **sin avisos sin leer NO hay distintivo** (un cero con globo es ruido, y además miente);
//  · que **cada aviso lleva a su sitio**, y el enlace se compone del sujeto, no de la frase;
//  · que **«marcar todo leído»** manda una sola petición sin lista;
//  · que **abrir un aviso es leerlo**, y uno ya leído no vuelve a mandar nada;
//  · que **ninguna enumeración llega a la pantalla**.
//
// Lo que NO se mide aquí: la posición del panel y que no tape nada. `jsdom` no maqueta — eso va
// en el navegador (`apps/web/e2e/bandeja-de-avisos.spec.ts`).

function aviso(parcial: Partial<NotificationRow> = {}): NotificationRow {
  return {
    id: "n1",
    type: "COMMENT_ADDED",
    campaignId: "c1",
    payload: { entityId: "e1", entityType: "NPC", entityName: "Gundren" },
    subjectType: "entity",
    subjectId: "e1",
    createdAt: new Date().toISOString(),
    readAt: null,
    ...parcial,
  };
}

function pagina(parcial: Partial<NotificationsPage> = {}): NotificationsPage {
  return { notifications: [], nextCursor: null, unreadCount: 0, ...parcial };
}

function pintar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <BandejaDeAvisos />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  // Sin sesión la bandeja no pregunta nada: es lo que evita un 401 por carga en `/acerca-de`.
  useAuthStore.setState({ token: "t", user: { id: "u1", email: "u@b.com", displayName: "U" } });
});

describe("BandejaDeAvisos", () => {
  it("sin avisos sin leer NO pinta distintivo, y el botón se llama solo «Avisos»", async () => {
    vi.spyOn(notificationsApi, "fetchNotifications").mockResolvedValue(
      pagina({ notifications: [aviso({ readAt: new Date().toISOString() })], unreadCount: 0 }),
    );
    pintar();
    const boton = await screen.findByRole("button", { name: "Avisos" });
    expect(boton).toBeInTheDocument();
    expect(boton.textContent).toBe("");
  });

  it("con avisos sin leer, el número está en el distintivo y en el nombre accesible", async () => {
    vi.spyOn(notificationsApi, "fetchNotifications").mockResolvedValue(
      pagina({ notifications: [aviso()], unreadCount: 3 }),
    );
    pintar();
    expect(await screen.findByRole("button", { name: "Avisos (3 sin leer)" })).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("cada aviso se lee en español y lleva a su sitio", async () => {
    vi.spyOn(notificationsApi, "fetchNotifications").mockResolvedValue(
      pagina({
        notifications: [
          aviso(),
          aviso({
            id: "n2",
            type: "SESSION_SCHEDULED",
            subjectType: "session",
            subjectId: "s1",
            payload: { sessionTitle: "La noche del puerto", scheduledAt: "2026-09-20T20:00:00Z" },
          }),
        ],
        unreadCount: 2,
      }),
    );
    pintar();
    fireEvent.click(await screen.findByRole("button", { name: "Avisos (2 sin leer)" }));

    const comentario = await screen.findByRole("link", { name: /Han comentado Gundren/ });
    expect(comentario).toHaveAttribute("href", "/campaigns/c1/entidades/e1");

    const sesion = screen.getByRole("link", { name: /La noche del puerto/ });
    expect(sesion).toHaveAttribute("href", "/campaigns/c1/sesiones/s1");

    // Ningún valor de enumeración llega a la pantalla.
    expect(screen.queryByText(/COMMENT_ADDED|SESSION_SCHEDULED/)).not.toBeInTheDocument();
  });

  it("«marcar todo leído» manda una sola petición SIN lista", async () => {
    vi.spyOn(notificationsApi, "fetchNotifications").mockResolvedValue(
      pagina({ notifications: [aviso()], unreadCount: 1 }),
    );
    const marcar = vi
      .spyOn(notificationsApi, "markNotificationsRead")
      .mockResolvedValue({ updated: 1 });

    pintar();
    fireEvent.click(await screen.findByRole("button", { name: "Avisos (1 sin leer)" }));
    fireEvent.click(screen.getByRole("button", { name: "Marcar todo leído" }));

    await waitFor(() => expect(marcar).toHaveBeenCalledTimes(1));
    expect(marcar).toHaveBeenCalledWith(undefined);
  });

  it("abrir un aviso sin leer lo marca; abrir uno ya leído no manda nada", async () => {
    vi.spyOn(notificationsApi, "fetchNotifications").mockResolvedValue(
      pagina({
        notifications: [aviso(), aviso({ id: "n2", readAt: new Date().toISOString() })],
        unreadCount: 1,
      }),
    );
    const marcar = vi
      .spyOn(notificationsApi, "markNotificationsRead")
      .mockResolvedValue({ updated: 1 });

    pintar();
    fireEvent.click(await screen.findByRole("button", { name: "Avisos (1 sin leer)" }));
    const enlaces = screen.getAllByRole("link", { name: /Han comentado Gundren/ });
    fireEvent.click(enlaces[1]); // el ya leído
    expect(marcar).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole("button", { name: "Avisos (1 sin leer)" }));
    fireEvent.click(screen.getAllByRole("link", { name: /Han comentado Gundren/ })[0]);
    await waitFor(() => expect(marcar).toHaveBeenCalledWith(["n1"]));
  });

  it("no ofrece borrar: un aviso leído se apaga y el historial se queda", async () => {
    vi.spyOn(notificationsApi, "fetchNotifications").mockResolvedValue(
      pagina({ notifications: [aviso()], unreadCount: 1 }),
    );
    pintar();
    fireEvent.click(await screen.findByRole("button", { name: "Avisos (1 sin leer)" }));
    expect(
      screen.queryByRole("button", { name: /Borrar|Eliminar|Quitar/ }),
    ).not.toBeInTheDocument();
  });

  it("sin ningún aviso lo dice, en vez de dejar el panel vacío", async () => {
    vi.spyOn(notificationsApi, "fetchNotifications").mockResolvedValue(pagina());
    pintar();
    fireEvent.click(await screen.findByRole("button", { name: "Avisos" }));
    expect(screen.getByText(/No tienes avisos/)).toBeInTheDocument();
  });
});
