import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import * as clockApi from "../api";
import * as membersApi from "../../campaigns/members";
import { useAuthStore } from "../../../store/auth.store";
import { RelojDeCampana } from "../RelojDeCampana";
import { duracionEnPalabras, relojEnPalabras } from "../vocabulario";

// Ficha C2C-3: el endpoint del reloj existía y ninguna pantalla lo llamaba.

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RelojDeCampana campaignId="c1" />
    </QueryClientProvider>,
  );
}

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
  vi.spyOn(clockApi, "fetchClock").mockResolvedValue({ seconds: 3600 * 30 });
});

describe("el reloj en palabras", () => {
  it("cuenta días y horas, **no una fecha**: el contador no es un calendario", () => {
    expect(relojEnPalabras(0)).toBe("Día 1, 00:00");
    expect(relojEnPalabras(3600 * 30)).toBe("Día 2, 06:00");
    expect(relojEnPalabras(86_400 * 3 + 3600 * 13 + 60 * 45)).toBe("Día 4, 13:45");
  });

  it("y una duración se dice en la unidad que le va", () => {
    expect(duracionEnPalabras(3600)).toBe("1 hora");
    expect(duracionEnPalabras(3600 * 8)).toBe("8 horas");
    expect(duracionEnPalabras(86_400)).toBe("1 día");
    expect(duracionEnPalabras(600)).toBe("10 minutos");
  });
});

describe("RelojDeCampana", () => {
  it("**la hora la lee cualquiera**: qué hora es en el mundo no es información privilegiada", async () => {
    comoJugador();
    montar();
    expect(await screen.findByText("Día 2, 06:00")).toBeInTheDocument();
  });

  it("pero **solo el DM la mueve**", async () => {
    comoJugador();
    montar();
    await screen.findByText("Día 2, 06:00");
    expect(screen.queryByRole("button", { name: "1 hora" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Viajar" })).not.toBeInTheDocument();
  });

  it("el DM avanza un salto, y **se manda en segundos**", async () => {
    comoDm();
    const avanzar = vi.spyOn(clockApi, "advanceClock").mockResolvedValue({
      from: 0,
      to: 3600,
      seconds: 3600,
      eventId: "e1",
      forcedMarchSaves: [],
    });
    montar();

    fireEvent.click(await screen.findByRole("button", { name: "1 hora" }));

    await waitFor(() =>
      expect(avanzar).toHaveBeenCalledWith("c1", { kind: "TIME", seconds: 3600 }),
    );
  });

  it("viajar manda el ritmo y las horas, no una expresión de tiempo", async () => {
    comoDm();
    const avanzar = vi.spyOn(clockApi, "advanceClock").mockResolvedValue({
      from: 0,
      to: 3600 * 8,
      seconds: 3600 * 8,
      eventId: "e1",
      pace: "FAST",
      miles: 32,
      passivePerception: -5,
      forcedMarchSaves: [],
    });
    montar();

    fireEvent.click(await screen.findByRole("radio", { name: /Rápido/ }));
    fireEvent.click(screen.getByRole("button", { name: "Viajar" }));

    await waitFor(() =>
      expect(avanzar).toHaveBeenCalledWith("c1", { kind: "TRAVEL", pace: "FAST", hours: 8 }),
    );
    // Y el precio del paso rápido se enseña **en el resultado**, no solo en la etiqueta del
    // ritmo: se acota al aviso para no casar con la frase del propio selector.
    expect(await screen.findByRole("status")).toHaveTextContent(/−5 a la Percepción pasiva/);
  });

  it("**las salvaciones de marcha forzada se enseñan con su CD**, no se esconden en un aviso", async () => {
    comoDm();
    vi.spyOn(clockApi, "advanceClock").mockResolvedValue({
      from: 0,
      to: 3600 * 10,
      seconds: 3600 * 10,
      eventId: "e1",
      pace: "NORMAL",
      miles: 30,
      forcedMarchSaves: [
        { hora: 9, dc: 11 },
        { hora: 10, dc: 12 },
      ],
    });
    montar();

    fireEvent.click(await screen.findByRole("button", { name: "Viajar" }));

    expect(await screen.findByText(/Marcha forzada/)).toBeInTheDocument();
    expect(screen.getByText("Hora 9: CD 11")).toBeInTheDocument();
    expect(screen.getByText("Hora 10: CD 12")).toBeInTheDocument();
  });

  it("un rechazo del servidor se pinta en línea, no en un aviso flotante", async () => {
    comoDm();
    vi.spyOn(clockApi, "advanceClock").mockRejectedValue(new Error("El reloj no se movió."));
    montar();

    fireEvent.click(await screen.findByRole("button", { name: "1 hora" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("El reloj no se movió.");
  });
});
