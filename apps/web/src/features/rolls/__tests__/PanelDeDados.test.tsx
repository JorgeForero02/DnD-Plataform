import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { PanelDeDados } from "../PanelDeDados";
import * as rollsApi from "../api";
import type { FilaDeTirada, PaginaDeTiradas } from "../api";
import * as rollRequestsApi from "../../roll-requests/api";
import * as membersApi from "../../campaigns/members";
import * as clockApi from "../../game-clock/api";
import * as charactersApi from "../../characters/api";
import { useAuthStore } from "../../../store/auth.store";
import { ApiError } from "../../../lib/api";

// Tarea 2C.2 — la pantalla de dados. Se prueba **lo que puede romperse en silencio**:
//
//  · que se manda la expresión y el modo que se eligieron (y no otros, ni una expresión ya
//    montada con `kh1`, que sería el navegador aplicando una regla del juego);
//  · que una respuesta `revealed: false` dice que se tiró a ciegas y **no** deja escapar un
//    total — el agujero que 2C.1 cerró en el servidor y que aquí se podía reabrir;
//  · que un 400 se pinta legible **junto al campo** y retira el resultado anterior, para que
//    nadie cante un total que no salió de la tirada que acaba de rechazarse;
//  · que un atajo compone la expresión esperada;
//  · que el registro pinta las dos formas que llegan, la normal y la salvación de muerte;
//  · que la audiencia son tres radios con su frase y **no** un desplegable (regla vinculante).

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function nuevoQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

const CAMPANA = "camp-1";

const REGISTRO_VACIO: PaginaDeTiradas = { events: [], nextCursor: null };

function pintar(qc = nuevoQc()) {
  return render(<PanelDeDados campaignId={CAMPANA} />, { wrapper: wrapper(qc) });
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(rollsApi, "fetchRolls").mockResolvedValue(REGISTRO_VACIO);
  // `PanelDeDados` monta `TiradasPendientes` por dentro (comentario de arriba en aquel fichero:
  // «arriba del todo de la pantalla de dados»). Sin este mock, la petición real fallaba en
  // silencio y antes de la ronda de arreglo 1 no se notaba —el error se tragaba con un `return
  // null`—; desde que ese error se dice con un `role="alert"` (I-2), un `fetchRollRequests` sin
  // mockear aquí pintaba un segundo aviso que chocaba con el `findByRole("alert")` de la prueba
  // del 400. Sin peticiones es exactamente lo que esta pantalla necesita: ninguna caja.
  vi.spyOn(rollRequestsApi, "fetchRollRequests").mockResolvedValue([]);
});

describe("PanelDeDados — tirar", () => {
  it("manda la expresión y el modo que se eligieron, sin montar la ventaja en el cliente", async () => {
    const crear = vi.spyOn(rollsApi, "createRoll").mockResolvedValue({
      revealed: true,
      eventId: "ev-1",
      expression: "2d20kh1+3",
      audience: "PUBLIC",
      rolls: [12, 8],
      kept: [12],
      dropped: [8],
      modifier: 3,
      total: 15,
      natural: "NONE",
      outcome: "NO_DC",
    });

    pintar();

    // Task 10 — «Qué se tira» vive ahora bajo «Modo avanzado», plegado por defecto: se abre
    // antes de escribir en él. El camino cambia; la aserción de qué se manda, no.
    fireEvent.click(screen.getByText("Modo avanzado"));
    fireEvent.change(screen.getByLabelText("Qué se tira"), { target: { value: "1d20+3" } });
    fireEvent.click(screen.getByRole("radio", { name: "Ventaja" }));
    fireEvent.click(screen.getByRole("button", { name: "Tirar" }));

    await waitFor(() => expect(crear).toHaveBeenCalledTimes(1));
    expect(crear).toHaveBeenCalledWith(CAMPANA, {
      expression: "1d20+3",
      audience: "PUBLIC",
      mode: "ADVANTAGE",
      // Este panel no tiene personaje, así que nunca gasta inspiración (plan 08, I8).
      spendInspiration: false,
    });
  });

  it("manda el motivo, la CD y la audiencia cuando se rellenan", async () => {
    const crear = vi.spyOn(rollsApi, "createRoll").mockResolvedValue({
      revealed: false,
      eventId: "ev-2",
      expression: "1d20",
      audience: "BLIND",
    });

    pintar();

    fireEvent.change(screen.getByLabelText("Motivo (opcional)"), {
      target: { value: "Percepción" },
    });
    fireEvent.change(screen.getByLabelText("CD (opcional)"), { target: { value: "15" } });
    fireEvent.click(screen.getByRole("radio", { name: "A ciegas" }));
    fireEvent.click(screen.getByRole("button", { name: "Tirar" }));

    await waitFor(() => expect(crear).toHaveBeenCalledTimes(1));
    expect(crear).toHaveBeenCalledWith(CAMPANA, {
      expression: "1d20",
      label: "Percepción",
      dc: 15,
      audience: "BLIND",
      mode: "NORMAL",
      spendInspiration: false,
    });
  });

  it("una respuesta a ciegas pinta el aviso y NO deja escapar ningún total", async () => {
    vi.spyOn(rollsApi, "createRoll").mockResolvedValue({
      revealed: false,
      eventId: "ev-3",
      expression: "1d20",
      audience: "BLIND",
    });

    pintar();
    fireEvent.click(screen.getByRole("button", { name: "Tirar" }));

    const aviso = await screen.findByText(/tirado a ciegas/i);
    expect(aviso).toBeInTheDocument();
    expect(document.querySelector('[data-tirada="a-ciegas"]')).not.toBeNull();
    // Ni el total en grande ni el desglose: no hay nada que pintar, y ese es el punto.
    expect(document.querySelectorAll("[data-dado]")).toHaveLength(0);
    expect(screen.queryByText(/^\d+ = /)).toBeNull();
  });

  it("un 400 se pinta legible junto al campo y retira el resultado anterior", async () => {
    const crear = vi
      .spyOn(rollsApi, "createRoll")
      .mockResolvedValueOnce({
        revealed: true,
        eventId: "ev-4",
        expression: "1d20",
        audience: "PUBLIC",
        rolls: [17],
        kept: [17],
        dropped: [],
        modifier: 0,
        total: 17,
        natural: "NONE",
        outcome: "NO_DC",
      })
      .mockRejectedValueOnce(
        new ApiError("La expresión de dados no se entiende: sobra un «+».", 400),
      );

    pintar();

    fireEvent.click(screen.getByRole("button", { name: "Tirar" }));
    await screen.findByText("17 = 17 dado");

    // Task 10 — mismo motivo que arriba: se abre «Modo avanzado» antes de escribir encima.
    fireEvent.click(screen.getByText("Modo avanzado"));
    fireEvent.change(screen.getByLabelText("Qué se tira"), { target: { value: "1d20++" } });
    fireEvent.click(screen.getByRole("button", { name: "Tirar" }));

    await waitFor(() => expect(crear).toHaveBeenCalledTimes(2));

    const aviso = await screen.findByRole("alert");
    expect(aviso).toHaveTextContent("La expresión de dados no se entiende: sobra un «+».");
    // **Junto al campo**, no flotando: el aviso es la descripción del propio control.
    const campo = screen.getByLabelText("Qué se tira");
    expect(campo).toHaveAttribute("aria-invalid", "true");
    expect(campo.getAttribute("aria-describedby")).toContain(aviso.id);
    // Y el resultado anterior ya no está.
    expect(screen.queryByText("17 = 17 dado")).toBeNull();
    expect(document.querySelectorAll("[data-dado]")).toHaveLength(0);
  });

  it("Task 10 — un dado de la bandeja compone la expresión, agrupando por caras", () => {
    pintar();
    // La bandeja empieza con un d20 (el «1d20» de siempre): se abre el modo avanzado para ver
    // la expresión compuesta sin escribir nada en el campo.
    fireEvent.click(screen.getByText("Modo avanzado"));
    const campo = screen.getByLabelText("Qué se tira");
    expect(campo).toHaveValue("1d20");

    fireEvent.click(screen.getByRole("button", { name: "Añadir un d6" }));
    expect(campo).toHaveValue("1d20+1d6");

    // Un segundo d20 se agrupa con el primero, no se suma como término aparte.
    fireEvent.click(screen.getByRole("button", { name: "Añadir un d20" }));
    expect(campo).toHaveValue("2d20+1d6");
  });

  // Round 2 de revisión (anexo #8) — **el defecto de verdad, reproducido.** La primera versión
  // de esta ronda desmontaba el radiogroup de ventaja letra a letra mientras se escribía una
  // expresión que no empieza por `d20`, y la tarjeta de «Tirada nueva» se encogía 28px con cada
  // tecla — jsdom no maqueta, así que ninguna prueba de aquí lo había medido; lo midió Playwright
  // (`espacios.spec.ts`). Esta prueba no mide alto (eso sigue siendo del navegador): comprueba
  // el porqué, en el DOM — que ni el radiogroup ni el botón «Tirar» se muevan del árbol mientras
  // se escribe, montados los dos antes y después.
  it("Round 2 — escribir una expresión inválida no desmonta el radio de ventaja ni «Tirar»", () => {
    pintar();
    fireEvent.click(screen.getByText("Modo avanzado"));

    expect(screen.getByRole("group", { name: /cómo tirar/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Normal" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Tirar" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Qué se tira"), { target: { value: "4d" } });

    // El elemento que se desmontaba con el defecto: el radiogroup de ventaja (`SelectorDeVentaja`
    // dentro de `BandejaDeDados.tsx`), condicionado antes a `ofreceVentaja &&`. Ahora se queda,
    // apagado y con su motivo — ni el radiogroup ni el botón «Tirar» salen del documento.
    expect(screen.getByRole("group", { name: /cómo tirar/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Normal" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Solo con un d20 al principio de la tirada.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tirar" })).toBeInTheDocument();
  });
});

// Revisión final de la rama (2026-09-13). **«Tirar» nunca se deshabilita por bandeja vacía**
// (docs/04-convenciones.md, «el botón de guardar nunca se deshabilita: deshabilitado no recibe
// foco de teclado y tiene mal contraste»), igual que resolvió T5 «Guardar la sala»: se pulsa,
// el rechazo se explica en línea junto al campo, y no sale ninguna petición. La única razón
// de apagarlo que queda es `isPending`, como en el resto de la aplicación.
describe("PanelDeDados — Tirar con la bandeja vacía", () => {
  it("sigue habilitado, explica en línea qué falta y no manda nada", async () => {
    const crear = vi.spyOn(rollsApi, "createRoll");
    pintar();

    // La bandeja empieza con un d20; se quita para dejarla vacía.
    fireEvent.click(screen.getByRole("button", { name: "Quitar el d20 (posición 1)" }));
    const tirar = screen.getByRole("button", { name: "Tirar" });
    expect(tirar).not.toHaveAttribute("aria-disabled");

    fireEvent.click(tirar);

    // El motivo, en línea y junto al campo «Qué se tira» (que se abre solo con el error).
    const aviso = await screen.findByRole("alert");
    expect(aviso).toHaveTextContent(
      "Añade un dado a la bandeja, o escribe una expresión en Modo avanzado.",
    );
    expect(screen.getByLabelText("Qué se tira")).toHaveAttribute("aria-invalid", "true");
    await new Promise((r) => setTimeout(r, 0));
    expect(crear).not.toHaveBeenCalled();
  });
});

describe("PanelDeDados — la audiencia es una decisión visible", () => {
  it("son tres radios con su frase, no un desplegable", () => {
    pintar();

    // Ningún `<select>` en la pantalla: la regla vinculante de docs/04-convenciones.md.
    expect(screen.queryByRole("combobox")).toBeNull();

    for (const [etiqueta, frase] of [
      ["Pública", "La ve toda la mesa."],
      ["Privada del DM", "Solo quien tira y el DM."],
      ["A ciegas", "Solo el DM ve el resultado."],
    ] as const) {
      const radio = screen.getByRole("radio", { name: etiqueta });
      expect(radio).toBeInTheDocument();
      const idFrase = radio.getAttribute("aria-describedby");
      expect(idFrase).toBeTruthy();
      expect(document.getElementById(idFrase as string)).toHaveTextContent(frase);
    }
  });

  it("ningún valor de enumeración llega a la pantalla", () => {
    pintar();
    for (const crudo of ["PUBLIC", "DM_PRIVATE", "BLIND", "NORMAL", "ADVANTAGE", "DISADVANTAGE"]) {
      expect(screen.queryByText(crudo)).toBeNull();
    }
  });
});

function fila(payload: FilaDeTirada["payload"], id: string): FilaDeTirada {
  return {
    id,
    campaignId: CAMPANA,
    sessionId: null,
    actorUserId: "u-1",
    type: payload.type,
    subjectType: "character",
    subjectId: "pj-1",
    payload,
    visibility: "PLAYERS",
    createdAt: "2026-09-03T18:30:00.000Z",
  };
}

describe("RegistroDeTiradas", () => {
  it("pinta una tirada normal con su desglose y una salvación de muerte sin él", async () => {
    vi.spyOn(rollsApi, "fetchRolls").mockResolvedValue({
      nextCursor: null,
      events: [
        fila(
          {
            type: "ABILITY_ROLL",
            expression: "1d20+3",
            rolls: [14],
            kept: [14],
            dropped: [],
            modifier: 3,
            total: 17,
            dc: 15,
            natural: "NONE",
            outcome: "SUCCESS",
            reason: "Percepción",
          },
          "ev-a",
        ),
        fila(
          {
            type: "DEATH_SAVE",
            roll: 20,
            result: "CRIT_SUCCESS",
            successes: 1,
            failures: 1,
          },
          "ev-b",
        ),
      ],
    });

    pintar();

    const normal = await waitFor(() => {
      const nodo = document.querySelector('[data-tirada-tipo="ABILITY_ROLL"]');
      expect(nodo).not.toBeNull();
      return nodo as HTMLElement;
    });
    expect(normal).toHaveTextContent("17 = 14 dado +3 percepción");
    expect(normal).toHaveTextContent("Supera la CD 15.");
    expect(normal.querySelectorAll("[data-dado]")).toHaveLength(1);

    const muerte = document.querySelector('[data-tirada-tipo="DEATH_SAVE"]') as HTMLElement;
    expect(muerte).not.toBeNull();
    expect(muerte).toHaveTextContent("Salvación de muerte: sacó 20");
    expect(muerte).toHaveTextContent("vuelve en sí con 1 PG");
    // **Sin desglose, y no se le inventa uno**: una salvación de muerte no lo tiene.
    expect(muerte.querySelectorAll("[data-dado]")).toHaveLength(0);
  });

  it("dice que no hay nada cuando el registro viene vacío, en vez de dejar un hueco", async () => {
    pintar();
    expect(
      await screen.findByText("Todavía no se ha tirado nada en esta campaña."),
    ).toBeInTheDocument();
  });

  it("pide el registro de la campaña que se le pasó", async () => {
    const leer = vi.spyOn(rollsApi, "fetchRolls").mockResolvedValue(REGISTRO_VACIO);
    pintar();
    await waitFor(() => expect(leer).toHaveBeenCalledWith(CAMPANA, {}));
  });
});

describe("PanelDeDados — la rejilla del DM (anexo #16)", () => {
  it("con rol DM, el reloj, pedir y tirar están los tres", async () => {
    useAuthStore.setState({ user: { id: "u-dm", email: "dm@x.y", displayName: "DM" } as never });
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
      { userId: "u-dm", displayName: "DM", role: "DM" },
    ]);
    vi.spyOn(clockApi, "fetchClock").mockResolvedValue({ seconds: 0 } as never);
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([]);

    pintar();

    expect(await screen.findByRole("heading", { name: "El reloj" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Pedir una tirada" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Tirada nueva" })).toBeInTheDocument();
  });

  it("con rol PLAYER no hay «pedir», pero el reloj y la tirada siguen con su hueco", async () => {
    useAuthStore.setState({
      user: { id: "u-jugador", email: "j@x.y", displayName: "Jugador" } as never,
    });
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
      { userId: "u-jugador", displayName: "Jugador", role: "PLAYER" },
    ]);
    vi.spyOn(clockApi, "fetchClock").mockResolvedValue({ seconds: 0 } as never);
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([]);

    pintar();

    const tiradaNueva = await screen.findByRole("region", { name: "Tirada nueva" });
    expect(screen.queryByRole("heading", { name: "Pedir una tirada" })).not.toBeInTheDocument();
    // Sin rol DM no hay rejilla de dos columnas, pero el hueco entre el reloj y la tirada tiene
    // que seguir existiendo: antes de esta revisión el envoltorio se quedaba sin clase alguna
    // (`undefined`) y el reloj y la tarjeta de tirar quedaban pegados, sin el margen que traía
    // el `mb-s5` de antes de la rejilla. `tiradaNueva` es la propia sección con `aria-label`, así
    // que su padre directo es el envoltorio de la rejilla.
    expect(tiradaNueva.parentElement).toHaveClass("gap-s5");
  });
});
