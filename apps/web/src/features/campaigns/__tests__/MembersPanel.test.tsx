import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { MembersPanel } from "../MembersPanel";
import * as members from "../members";
import { useAuthStore } from "../../../store/auth.store";

// Plan 11, ficha D2 — **el papel de un miembro se puede cambiar.**
//
// Hasta hoy era **inmutable de por vida**: para ascender a alguien había que expulsarlo y
// reinvitarlo, y eso pierde su vínculo con sus personajes. Lo que se prueba aquí es la mitad de
// pantalla: que el selector esté **donde el DM lo ve**, que no aparezca para quien no puede, y que
// **el rechazo del servidor se lea en línea** — porque el 409 de «te quedas sin DM» es un motivo,
// no un fallo.

const YO = "u-dm";
const OTRA = "u-marta";

function listaDeMiembros() {
  return [
    { userId: YO, displayName: "La DM", role: "DM" as const },
    { userId: OTRA, displayName: "Marta", role: "PLAYER" as const },
  ];
}

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MembersPanel campaignId="c1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("el panel de miembros", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(members, "fetchMembers").mockResolvedValue(listaDeMiembros());
  });

  it("**el DM ve un selector por miembro**, con los dos papeles en español", async () => {
    useAuthStore.setState({ user: { id: YO, email: "dm@b.com", displayName: "La DM" } } as never);
    montar();
    const selectores = await screen.findAllByRole("combobox");
    expect(selectores).toHaveLength(2);
    // Ningún valor de enumeración llega a la pantalla: se ven sus rótulos.
    expect(screen.getAllByRole("option", { name: "Jugador" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("option", { name: "DM" }).length).toBeGreaterThan(0);
  });

  it("**quien no es DM no lo ve**, y eso no es control de acceso: lo impone el servidor", async () => {
    useAuthStore.setState({
      user: { id: OTRA, email: "marta@b.com", displayName: "Marta" },
    } as never);
    montar();
    await screen.findByText("Marta");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("cambiar el papel llama al servidor con el miembro y el papel nuevo", async () => {
    useAuthStore.setState({ user: { id: YO, email: "dm@b.com", displayName: "La DM" } } as never);
    const cambiar = vi
      .spyOn(members, "changeMemberRole")
      .mockResolvedValue({ userId: OTRA, from: "PLAYER", to: "DM" });
    montar();
    const suyo = (await screen.findAllByRole("combobox"))[1];
    fireEvent.change(suyo, { target: { value: "DM" } });
    await waitFor(() => expect(cambiar).toHaveBeenCalledWith("c1", OTRA, "DM"));
  });

  it("**el 409 de «te quedas sin DM» se lee en la pantalla**, no se traga", async () => {
    // Es un motivo, no un fallo: el DM tiene que poder entender que primero hay que ascender a
    // alguien. Un aviso flotante se habría ido antes de que un lector de pantalla llegara a él.
    useAuthStore.setState({ user: { id: YO, email: "dm@b.com", displayName: "La DM" } } as never);
    vi.spyOn(members, "changeMemberRole").mockRejectedValue(
      new Error("Esta mesa se quedaría sin ningún DM. Asciende a alguien antes de bajar a este."),
    );
    montar();
    const mio = (await screen.findAllByRole("combobox"))[0];
    fireEvent.change(mio, { target: { value: "PLAYER" } });
    expect(await screen.findByText(/se quedaría sin ningún DM/)).toBeInTheDocument();
  });
});
