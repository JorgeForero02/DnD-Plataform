import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ListaDeInvitaciones } from "../ListaDeInvitaciones";
import type { InviteRow } from "../api";
import * as api from "../api";

// Plan 11, ficha D3b — **los enlaces repartidos dejan de ser invisibles.**
//
// Hasta hoy se generaban a ciegas: nadie sabía cuántos vivían ni podía matar uno filtrado. Lo que
// estas pruebas defienden es que el listado **diga la verdad de cada uno** y que **revocar solo se
// ofrezca donde cambia algo**.

function fila(over: Partial<InviteRow>): InviteRow {
  return {
    id: "i1",
    createdAt: "2026-09-01T10:00:00.000Z",
    usedAt: null,
    usedByName: null,
    expiresAt: null,
    revokedAt: null,
    role: "PLAYER",
    tokenTail: "abc123",
    estado: "VIVA",
    ...over,
  };
}

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ListaDeInvitaciones campaignId="c1" />
    </QueryClientProvider>,
  );
}

describe("los enlaces repartidos", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("**pinta los cuatro estados**, cada uno con su palabra", async () => {
    vi.spyOn(api, "fetchInvites").mockResolvedValue([
      fila({ id: "a", estado: "VIVA" }),
      fila({ id: "b", estado: "USADA", usedByName: "Marta", usedAt: "2026-09-02T10:00:00.000Z" }),
      fila({ id: "c", estado: "REVOCADA", revokedAt: "2026-09-03T10:00:00.000Z" }),
      fila({ id: "d", estado: "CADUCADA", expiresAt: "2026-09-02T10:00:00.000Z" }),
    ]);
    montar();
    for (const palabra of ["Sin usar", "Usada", "Revocada", "Caducada"]) {
      expect(await screen.findByText(palabra)).toBeInTheDocument();
    }
    // **Quién la usó**, que es lo que `usedAt` no podía decir.
    expect(screen.getByText(/la usó Marta/)).toBeInTheDocument();
  });

  it("**el token no se enseña entero**: solo su cola", async () => {
    // Un listado se abre en una mesa con gente al lado. Con el token completo, quien mire por
    // encima del hombro se lleva una invitación.
    vi.spyOn(api, "fetchInvites").mockResolvedValue([fila({ tokenTail: "9f2c10" })]);
    const { container } = montar();
    expect(await screen.findByText("…9f2c10")).toBeInTheDocument();
    expect(container.textContent ?? "").not.toMatch(/[0-9a-f]{20,}/);
  });

  it("**revocar solo se ofrece sobre lo que aún puede usarse**", async () => {
    // Sobre una usada o una caducada sería un botón que no cambia nada. El servidor lo aceptaría
    // igual: esto es honestidad, no control de acceso.
    vi.spyOn(api, "fetchInvites").mockResolvedValue([
      fila({ id: "a", estado: "VIVA", tokenTail: "viva11" }),
      fila({ id: "b", estado: "USADA", tokenTail: "usada1" }),
      fila({ id: "c", estado: "CADUCADA", tokenTail: "cadu11" }),
    ]);
    montar();
    expect(await screen.findByRole("button", { name: /Revocar el enlace …viva11/ })).toBeVisible();
    expect(screen.queryByRole("button", { name: /usada1/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cadu11/ })).not.toBeInTheDocument();
  });

  it("revocar llama al servidor con esa invitación", async () => {
    vi.spyOn(api, "fetchInvites").mockResolvedValue([fila({ id: "i-42" })]);
    const revocar = vi.spyOn(api, "revokeInvite").mockResolvedValue({ revoked: true });
    montar();
    fireEvent.click(await screen.findByRole("button", { name: /Revocar/ }));
    await waitFor(() => expect(revocar).toHaveBeenCalledWith("i-42"));
  });

  it("**«no caduca» se dice**, no se calla", async () => {
    // `null` significa que vale hasta que alguien lo use o lo revoquen, y eso es exactamente lo
    // que un DM necesita saber para decidir si lo mata.
    vi.spyOn(api, "fetchInvites").mockResolvedValue([fila({ expiresAt: null })]);
    montar();
    expect(await screen.findByText(/no caduca/)).toBeInTheDocument();
  });

  it("sin enlaces, lo dice en vez de enseñar una lista vacía", async () => {
    vi.spyOn(api, "fetchInvites").mockResolvedValue([]);
    montar();
    expect(await screen.findByText(/Todavía no has repartido ningún enlace/)).toBeInTheDocument();
  });
});
