import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DarTemporales } from "../DarTemporales";
import * as api from "../../character-sheet/api";

// Plan 14, ficha C6-4 — **dar PG temporales a un PNJ.**
//
// `NpcEnLaMesa.tempHp` se pintaba y **nunca se había visto con datos**: faltaba el gesto.
//
// Y las reglas deciden la pantalla, no al revés. SRD 5.1: *«they can't be added together. If you
// have temporary hit points and receive more of them, you decide whether to keep the ones you have
// or to gain the new ones.»* De ahí salen las dos cosas que se prueban aquí: **no suma** y
// **pregunta cuál se queda**, con los dos números delante.
//
// **Anexo #20 (2026-09-13).** `hayConflicto` se evaluaba con `cuantos` ya en su valor por
// defecto, así que la pregunta estaba puesta desde el primer render en vez de aparecer al
// pulsar «Dárselos» — y «Dejar los que tenía» mandaba `tempHpEleccion: "mayor"`, que el servidor
// resuelve con `Math.max`: si los nuevos eran más, «dejar los que tenía» los cambiaba igual.
// Conservar es no mandar nada.

function hoja(temp: number) {
  return {
    character: { id: "n1", version: 3 },
    sheet: null,
    hp: { current: 10, max: 12, temp },
    attacks: [],
  } as never;
}

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DarTemporales campaignId="c1" characterId="n1" nombre="El goblin" />
    </QueryClientProvider>,
  );
}

describe("dar PG temporales a un PNJ", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("**sin temporales previos no pregunta nada**: un número y un botón", async () => {
    // Una pregunta que salta cuando no hace falta se aprende a ignorar en dos días.
    vi.spyOn(api, "fetchSheet").mockResolvedValue(hoja(0));
    const fijar = vi.spyOn(api, "setHp").mockResolvedValue(hoja(5));
    montar();

    // Se espera a que el botón se encienda: hasta que la hoja no llega no hay `version`, y fijar
    // PG es concurrencia optimista — sin ella la petición no puede salir.
    const boton = await screen.findByRole("button", { name: "Dárselos" });
    await waitFor(() => expect(boton).not.toHaveAttribute("aria-disabled"));
    // **Sin temporales previos no hay nada que preguntar**, y se comprueba ANTES de dárselos: en
    // cuanto los tenga, la siguiente vez sí preguntará — que es justo lo que la regla pide.
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    fireEvent.click(boton);
    await waitFor(() =>
      expect(fijar).toHaveBeenCalledWith(
        "c1",
        "n1",
        expect.objectContaining({ tempHp: 5, tempHpEleccion: "los-nuevos", expectedVersion: 3 }),
      ),
    );
  });

  it("con temporales previos, la pregunta NO sale sola: sale al pulsar «Dárselos» (anexo #20)", async () => {
    vi.spyOn(api, "fetchSheet").mockResolvedValue(hoja(8));
    montar();

    // **Lo medido**: antes, en cuanto el PNJ tenía temporales el `alertdialog` estaba puesto
    // desde el primer render — «Dárselos» desaparecía y parecía que la pantalla no hacía nada.
    const boton = await screen.findByRole("button", { name: "Dárselos" });
    await waitFor(() => expect(boton).not.toHaveAttribute("aria-disabled"));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    fireEvent.click(boton);

    const aviso = await screen.findByRole("alertdialog", { name: "Ya tiene PG temporales" });
    expect(aviso).toHaveTextContent("ya tiene 8 temporales");
    // La regla, escrita donde se decide: sumarlas sería inventar algo que el SRD prohíbe.
    expect(aviso).toHaveTextContent(/No se suman/);
    expect(screen.getByRole("button", { name: /Quedarse con los 5 nuevos/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dejar los 8 que tenía/ })).toBeInTheDocument();
  });

  it("**«quedarse con los nuevos» manda la decisión**, aunque sean menos, y cierra la pregunta", async () => {
    // Es la mitad de la regla que faltaba: el servidor se quedaba con el mayor por su cuenta, y hay
    // efectos que interesa cambiar por otros más pequeños porque duran más.
    vi.spyOn(api, "fetchSheet").mockResolvedValue(hoja(8));
    const fijar = vi.spyOn(api, "setHp").mockResolvedValue(hoja(5));
    montar();

    const darselos = await screen.findByRole("button", { name: "Dárselos" });
    await waitFor(() => expect(darselos).not.toHaveAttribute("aria-disabled"));
    fireEvent.click(darselos);
    fireEvent.click(await screen.findByRole("button", { name: /Quedarse con los 5 nuevos/ }));
    await waitFor(() =>
      expect(fijar).toHaveBeenCalledWith(
        "c1",
        "n1",
        expect.objectContaining({ tempHp: 5, tempHpEleccion: "los-nuevos" }),
      ),
    );
    // Al resolver la petición, la pregunta se cierra: no se queda puesta con la decisión ya tomada.
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("«Dejar los que tenía» no manda nada y cierra la pregunta (anexo #20)", async () => {
    // Conservar es NO CAMBIAR NADA (SRD 5.1: «you decide whether to keep the ones you have or to
    // gain the new ones»). Mandar `tempHpEleccion: "mayor"` —que el servidor resuelve con
    // `Math.max`— cambiaba igual el PG temporal cuando los nuevos eran más que los que tenía.
    vi.spyOn(api, "fetchSheet").mockResolvedValue(hoja(8));
    // **`mockResolvedValue`, no un espía sin retorno.** TanStack Query espera a que `onMutate`
    // resuelva antes de llamar a `mutationFn`; con un espía que no devuelve una promesa resuelta,
    // `expect(fijar).not.toHaveBeenCalled()` leído justo tras el `fireEvent.click` pasa siempre
    // —esté `mandar()` llamada o no—, porque la llamada real a `setHp` aún no ha tenido ocasión de
    // ocurrir. Esto dejó pasar un mutante que sí manda `mandar("mayor")` (revisión, ronda 1).
    const fijar = vi.spyOn(api, "setHp").mockResolvedValue(hoja(8));
    montar();

    const darselos = await screen.findByRole("button", { name: "Dárselos" });
    await waitFor(() => expect(darselos).not.toHaveAttribute("aria-disabled"));
    fireEvent.click(darselos);
    fireEvent.click(await screen.findByRole("button", { name: /Dejar los 8 que tenía/ }));

    // **La aserción va DESPUÉS de esperar a que la pregunta se cierre**, no justo tras el clic:
    // solo entonces ha tenido tiempo de correr cualquier mutación que «Dejar los que tenía»
    // pudiera haber disparado. Un `setTimeout(0)` de más asegura que un microtask pendiente de
    // React Query también ha tenido su turno.
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    await new Promise((r) => setTimeout(r, 0));
    expect(fijar).not.toHaveBeenCalled();
  });

  // Revisión final de la rama (2026-09-13). **Ni «Dárselos» ni «Quedarse con los N nuevos» se
  // apagan por un 0 o un campo vacío** (docs/04-convenciones.md: «el botón de guardar nunca se
  // deshabilita»; T5 «Guardar la sala» lo resolvió igual): se pulsan, el rechazo se explica en
  // línea y no sale ninguna petición — `tempHp: 0` o `NaN` no es ninguno de los dos montones que
  // el SRD pide elegir. Lo único que sigue apagando es la petición en curso y la hoja sin llegar.
  it("«Quedarse con los N nuevos» con 0: sigue habilitado, dice «Escribe cuántos» y no manda nada", async () => {
    vi.spyOn(api, "fetchSheet").mockResolvedValue(hoja(8));
    const fijar = vi.spyOn(api, "setHp");
    montar();

    const darselos = await screen.findByRole("button", { name: "Dárselos" });
    await waitFor(() => expect(darselos).not.toHaveAttribute("aria-disabled"));
    fireEvent.click(darselos);

    await screen.findByRole("alertdialog");
    fireEvent.change(screen.getByLabelText("PG temporales"), { target: { value: "0" } });
    const quedarse = screen.getByRole("button", { name: /Quedarse con los 0 nuevos/ });
    expect(quedarse).not.toHaveAttribute("aria-disabled");

    fireEvent.click(quedarse);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Escribe cuántos/);
    await new Promise((r) => setTimeout(r, 0));
    expect(fijar).not.toHaveBeenCalled();
  });

  // Ficha de la revisión final (2026-09-13): **`preguntando` no se reseteaba si la petición
  // fallaba** — solo `onSuccess` lo cerraba. Con `onSettled`, tanto el éxito como el fallo cierran
  // la pregunta: el siguiente «Dárselos» vuelve a preguntar en vez de arrancar con el diálogo ya
  // abierto de una petición vieja.
  it("si la petición falla, la pregunta se cierra y el error se lee; el siguiente «Dárselos» vuelve a preguntar", async () => {
    vi.spyOn(api, "fetchSheet").mockResolvedValue(hoja(5));
    const fijar = vi.spyOn(api, "setHp").mockRejectedValueOnce(new Error("Sin permiso"));
    montar();

    const darselos = await screen.findByRole("button", { name: "Dárselos" });
    await waitFor(() => expect(darselos).not.toHaveAttribute("aria-disabled"));
    fireEvent.change(screen.getByLabelText("PG temporales"), { target: { value: "8" } });
    fireEvent.click(darselos);
    fireEvent.click(await screen.findByRole("button", { name: /Quedarse con los 8 nuevos/ }));

    expect(await screen.findByText("Sin permiso")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(fijar).toHaveBeenCalledTimes(1);
  });

  it("«Dárselos» con el campo vacío: sigue habilitado, dice «Escribe cuántos» y no manda nada", async () => {
    vi.spyOn(api, "fetchSheet").mockResolvedValue(hoja(0));
    const fijar = vi.spyOn(api, "setHp");
    montar();

    const darselos = await screen.findByRole("button", { name: "Dárselos" });
    await waitFor(() => expect(darselos).not.toHaveAttribute("aria-disabled"));
    fireEvent.change(screen.getByLabelText("PG temporales"), { target: { value: "" } });
    expect(darselos).not.toHaveAttribute("aria-disabled");

    fireEvent.click(darselos);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Escribe cuántos/);
    await new Promise((r) => setTimeout(r, 0));
    expect(fijar).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
