import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Condiciones, EFECTO_CONDICION } from "../Condiciones";
import * as characterSheetApi from "../api";
import type { ConditionRow } from "../api";
import { NOMBRE_CONDICION } from "../vocabulario";
import { DURACIONES_DE_CONDICION } from "../duraciones";
import { CLAVE_AYUDA } from "@dnd/shared";

// Tarea F4 — «las condiciones dicen qué hacen». Lo que se prueba aquí es lo que puede romperse
// sin que nadie lo note: que el efecto se pinte, que **no se invente** para una clave que no es
// del SRD, y que **ninguna línea insinúe un temporizador** que en esta fase no existe.

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function fila(key: string, level: number | null = null): ConditionRow {
  return {
    id: `cond-${key}`,
    characterId: "ch1",
    key,
    level,
    note: null,
    appliedById: "u1",
    createdAt: "2026-09-02T00:00:00.000Z",
  };
}

function pintar(filas: ConditionRow[], puedeEditar = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.spyOn(characterSheetApi, "fetchConditions").mockResolvedValue(filas);
  render(<Condiciones campaignId="c1" characterId="ch1" puedeEditar={puedeEditar} />, {
    wrapper: wrapper(qc),
  });
}

function mockConditions(filas: ConditionRow[]) {
  vi.spyOn(characterSheetApi, "fetchConditions").mockResolvedValue(filas);
}

function renderCondiciones(
  opciones: { variante?: "tarjeta" | "chips"; puedeEditar?: boolean } = {},
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <Condiciones
      campaignId="c1"
      characterId="ch1"
      puedeEditar={opciones.puedeEditar ?? true}
      variante={opciones.variante}
    />,
    { wrapper: wrapper(qc) },
  );
}

describe("Condiciones — el efecto bajo el nombre", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("una condición activa lleva su efecto escrito debajo del nombre, en la misma entrada", async () => {
    pintar([fila("restrained")]);

    const entrada = await screen.findByRole("listitem");
    expect(entrada).toHaveTextContent("Apresado");
    expect(entrada).toHaveTextContent("Velocidad 0. No se beneficia de bonos a la velocidad.");
  });

  it("el agotamiento conserva su nivel junto al nombre, y también dice qué hace", async () => {
    pintar([fila("exhaustion", 3)]);

    const entrada = await screen.findByRole("listitem");
    expect(entrada).toHaveTextContent("Agotamiento (nivel 3)");
    expect(entrada).toHaveTextContent(EFECTO_CONDICION.exhaustion);
  });

  it("una clave que no es del SRD se pinta sin inventarle un efecto", async () => {
    pintar([fila("maldito-por-el-dm")]);

    const entrada = await screen.findByRole("listitem");
    expect(entrada).toHaveTextContent("Sin traducir: maldito-por-el-dm");
    // La entrada solo tiene el nombre y el botón de quitar: ni una frase más. El texto es
    // **solo** el nombre porque el botón de quitar es un dibujo, no un carácter — llevaba el
    // glifo «por» y esta misma aserción lo tenía horneado, así que fijaba la infracción.
    expect(entrada.textContent).toBe("Sin traducir: maldito-por-el-dm");
  });

  it("el efecto de la condición elegida se lee ANTES de aplicarla, junto al selector", async () => {
    pintar([]);

    // Cegado es la primera clave de `NOMBRE_CONDICION`, o sea la seleccionada por defecto.
    expect(await screen.findByText(EFECTO_CONDICION.blinded)).toBeInTheDocument();
  });

  it("quien no puede editar no ve el selector, pero sí los efectos de lo que tiene puesto", async () => {
    pintar([fila("poisoned")], false);

    const entrada = await screen.findByRole("listitem");
    expect(entrada).toHaveTextContent("Desventaja en tiradas de ataque y de característica.");
    expect(screen.queryByLabelText("Nueva condición")).not.toBeInTheDocument();
  });
});

describe("Condiciones — invariantes del texto", () => {
  it("toda condición con nombre tiene efecto escrito, y ninguna sobra", () => {
    // Las quince del SRD **y las marcas que no lo son** —`helped`, del plan 08—: comparten tabla y
    // comparten pantalla, así que un rótulo sin su línea dejaría al jugador con un nombre y sin
    // saber qué le hace.
    expect(Object.keys(EFECTO_CONDICION).sort()).toEqual(Object.keys(NOMBRE_CONDICION).sort());
  });

  it("ninguna línea es una frase vacía ni la entrada entera del manual", () => {
    for (const [clave, efecto] of Object.entries(EFECTO_CONDICION)) {
      expect({ clave, largo: efecto.length > 0 }).toEqual({ clave, largo: true });
      // Una línea, no un párrafo: si alguien pega la entrada del SRD, esto se pone rojo.
      expect({ clave, largo: efecto.length <= 120 }).toEqual({ clave, largo: true });
      expect({ clave, punto: efecto.endsWith(".") }).toEqual({ clave, punto: true });
    }
  });

  it("el fichero que trae texto derivado del SRD lleva su atribución, como el catálogo de la API", () => {
    // El mismo control mecánico que `apps/api/src/rules/catalog/catalog.spec.ts` ejerce sobre el
    // catálogo, aquí: la obligación de CC BY no es una intención, es una prueba que se pone roja
    // si alguien borra la cabecera al refactorizar.
    const fuente = readFileSync(join(__dirname, "..", "Condiciones.tsx"), "utf8");
    expect(fuente).toContain("System Reference Document 5.1");
    expect(fuente).toContain("Wizards of the Coast LLC");
    expect(fuente).toContain("NOTICE.md");
  });

  it("ninguna de las QUINCE del SRD insinúa un temporizador que el servidor no lleve", () => {
    // Las quince se ponen y se quitan a mano: su caducidad, cuando la tienen, la elige el DM al
    // aplicarlas (2C.4), así que una línea de efecto que diga «expira» o «rondas» promete algo que
    // no depende de la condición. Este barrido impide que se cuele al copiar del manual.
    //
    // **`helped` queda fuera a propósito, y no es una excepción de conveniencia**: su vencimiento
    // NO lo escribe nadie a mano —lo pone el servidor al ayudar, un asalto exacto (plan 08, I8)—,
    // así que su línea *tiene* que decirlo. Callarlo sería el defecto contrario: un jugador
    // creyendo que la ventaja le dura toda la escena.
    //
    // **`raging` entra por el mismo motivo** (paso 2, tarea A11): su duración de 1 minuto la pone
    // el servidor al usar la Furia (`FURIA.effects`, `classes.ts`), no el DM a mano, así que su
    // línea también tiene que decirlo.
    const conVencimientoDelServidor = new Set([CLAVE_AYUDA, "raging"]);
    const prohibido = /ronda|turno|minuto|hora|expir|dura(?:nte|ción)|hasta el final|cuenta atrás/i;
    const culpables = Object.entries(EFECTO_CONDICION)
      .filter(([clave]) => !conVencimientoDelServidor.has(clave))
      .filter(([, efecto]) => prohibido.test(efecto))
      .map(([clave]) => clave);
    expect(culpables).toEqual([]);
  });
});

// --- Tarea 2C.4 — duración, vencimiento y renovación ---
//
// Lo que se prueba aquí es el contrato con el servidor: que la duración elegida viaje **en
// segundos** y que «indefinida» **no mande el campo** (mandarlo con cualquier valor daría a la
// condición una caducidad que nadie pidió), y que una condición vencida se vea vencida en vez de
// desaparecer —que es la decisión D-2C-2— con las dos únicas acciones que tienen sentido.

function filaConVencimiento(
  key: string,
  extra: Partial<ConditionRow> & { expiresAtClock?: number | null; expired?: boolean },
): ConditionRow {
  return { ...fila(key), ...extra };
}

describe("Condiciones — cuánto dura", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("elegir «1 hora» manda 3600 segundos de juego", async () => {
    pintar([]);
    const aplicar = vi
      .spyOn(characterSheetApi, "applyCondition")
      .mockResolvedValue(fila("blinded"));

    await screen.findByLabelText("Duración");
    fireEvent.change(screen.getByLabelText("Duración"), { target: { value: "hour" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar condición" }));

    await waitFor(() => expect(aplicar).toHaveBeenCalled());
    // (campaignId, characterId, key, level, note, durationSeconds)
    expect(aplicar.mock.calls[0][5]).toBe(3600);
  });

  it("«indefinida» —el valor por defecto— no manda ninguna duración", async () => {
    pintar([]);
    const aplicar = vi
      .spyOn(characterSheetApi, "applyCondition")
      .mockResolvedValue(fila("blinded"));

    fireEvent.click(await screen.findByRole("button", { name: "Aplicar condición" }));

    await waitFor(() => expect(aplicar).toHaveBeenCalled());
    expect(aplicar.mock.calls[0][5]).toBeUndefined();
  });

  it("las diez opciones se ofrecen escritas en español, sin claves crudas", async () => {
    pintar([]);
    const selector = (await screen.findByLabelText("Duración")) as HTMLSelectElement;
    const textos = Array.from(selector.options).map((o) => o.textContent);
    expect(textos).toEqual(DURACIONES_DE_CONDICION.map((d) => d.etiqueta));
    expect(textos[0]).toMatch(/Indefinida/);
    // Ni una opción que sea la clave interna.
    expect(textos.some((t) => t === "hour" || t === "ten-days")).toBe(false);
  });
});

describe("Condiciones — la vencida se ve vencida", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("una condición vencida se marca, dice que ya no se aplica, y ofrece quitarla o renovarla", async () => {
    pintar([filaConVencimiento("poisoned", { expiresAtClock: 100, expired: true })]);

    const entrada = await screen.findByRole("listitem");
    expect(entrada).toHaveTextContent("Vencida: ya no se aplica");
    // **No se esconde**: sigue en la lista, con su nombre.
    expect(entrada).toHaveTextContent("Envenenado");
    expect(screen.getByRole("button", { name: "Quitar Envenenado" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Renovar" })).toBeInTheDocument();
    // Y el texto no promete que desaparecerá sola, porque no lo hace.
    expect(entrada.textContent).not.toMatch(/se quitar|desaparec/i);
  });

  it("renovar vuelve a aplicarla con el nivel que tenía y la duración elegida", async () => {
    pintar([filaConVencimiento("exhaustion", { level: 4, expiresAtClock: 10, expired: true })]);
    const aplicar = vi
      .spyOn(characterSheetApi, "applyCondition")
      .mockResolvedValue(fila("exhaustion", 4));

    const selector = await screen.findByLabelText("Duración al renovar Agotamiento (nivel 4)");
    fireEvent.change(selector, { target: { value: "eight-hours" } });
    fireEvent.click(screen.getByRole("button", { name: "Renovar" }));

    await waitFor(() => expect(aplicar).toHaveBeenCalled());
    expect(aplicar.mock.calls[0][2]).toBe("exhaustion");
    expect(aplicar.mock.calls[0][3]).toBe(4);
    expect(aplicar.mock.calls[0][5]).toBe(28_800);
  });

  it("una condición viva NO se pinta como vencida ni ofrece renovarla", async () => {
    vi.spyOn(characterSheetApi, "fetchClock").mockResolvedValue({ seconds: 0 });
    pintar([filaConVencimiento("restrained", { expiresAtClock: 3600, expired: false })]);

    const entrada = await screen.findByRole("listitem");
    expect(entrada.textContent).not.toMatch(/Vencida/);
    expect(screen.queryByRole("button", { name: "Renovar" })).not.toBeInTheDocument();
  });

  it("a una condición viva con caducidad se le dice lo que le queda, leyendo el reloj de la campaña", async () => {
    vi.spyOn(characterSheetApi, "fetchClock").mockResolvedValue({ seconds: 1_000 });
    pintar([filaConVencimiento("poisoned", { expiresAtClock: 1_000 + 3_600 + 120 })]);

    expect(await screen.findByText("Vence en 1 h 2 min")).toBeInTheDocument();
  });

  it("sin condiciones con caducidad no se pide el reloj: no hay nada que contar", async () => {
    const reloj = vi.spyOn(characterSheetApi, "fetchClock").mockResolvedValue({ seconds: 0 });
    pintar([fila("poisoned")]);

    await screen.findByRole("listitem");
    expect(reloj).not.toHaveBeenCalled();
  });
});

// Ficha M17 — **la concentración se puede marcar desde una pantalla, o el servidor no se entera.**
//
// 2.5.4 dejó el servidor hecho: recibir daño estando concentrado pide una salvación de
// Constitución con su CD. Y `grep -rn "concentrat" apps/web` no devolvía nada: el selector solo
// ofrecía las quince claves del SRD, así que la regla **no se disparaba jamás en una mesa real**.
// La ficha se reabrió por eso. Esto es lo que la cierra.
describe("Condiciones — la concentración (ficha M17)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("se aplica con la clave del prefijo y el conjuro tal cual en la nota", async () => {
    const espia = vi
      .spyOn(characterSheetApi, "applyCondition")
      .mockResolvedValue(fila("concentrating-bendicion"));
    pintar([]);

    fireEvent.change(await screen.findByLabelText("Nueva condición"), {
      target: { value: "concentrating" },
    });
    fireEvent.change(screen.getByLabelText("Conjuro en el que se concentra"), {
      target: { value: "Bendición" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar condición" }));

    await waitFor(() => expect(espia).toHaveBeenCalled());
    // `applyCondition(campaignId, characterId, key, level, note, durationSeconds)`.
    const [, , clave, nivel, nota] = espia.mock.calls[0];
    // **La clave es un identificador y la nota es texto.** Con acentos y mayúsculas dentro, dos
    // DM que escriban «Bendición» y «bendicion» chocarían en claves distintas y el personaje
    // acabaría concentrado dos veces en lo mismo.
    expect(clave).toBe("concentrating-bendicion");
    expect(nota).toBe("Bendición");
    expect(nivel).toBeUndefined();
  });

  it("sin conjuro escrito no se puede aplicar, y el botón dice por qué", async () => {
    const espia = vi.spyOn(characterSheetApi, "applyCondition");
    pintar([]);

    fireEvent.change(await screen.findByLabelText("Nueva condición"), {
      target: { value: "concentrating" },
    });

    const boton = screen.getByRole("button", { name: "Aplicar condición" });
    expect(boton).toHaveAttribute("aria-disabled", "true");
    expect(boton).toHaveAttribute("title", "Escribe en qué conjuro se concentra.");
    fireEvent.click(boton);
    expect(espia).not.toHaveBeenCalled();
  });

  it("en la lista dice EN QUÉ se concentra, no «Concentración» a secas", async () => {
    pintar([{ ...fila("concentrating-bendicion"), note: "Bendición" }]);

    const entrada = await screen.findByRole("listitem");
    expect(entrada).toHaveTextContent("Concentración en Bendición");
    // Y nunca la clave: es la regla de que ningún valor de enumeración llega a la pantalla.
    expect(entrada).not.toHaveTextContent("concentrating");
    expect(entrada).not.toHaveTextContent("Sin traducir");
  });

  it("dice lo que el servidor de verdad hace: pide la salvación sola", async () => {
    pintar([{ ...fila("concentrating-bendicion"), note: "Bendición" }]);

    const entrada = await screen.findByRole("listitem");
    // **Si el texto y el servidor discrepan, miente el texto.** Desde 2.5.4 `changeHp` pide esta
    // salvación por su cuenta, así que la frase lo dice en presente y no como una promesa futura.
    expect(entrada).toHaveTextContent(/salvación de Constitución/i);
    expect(entrada).toHaveTextContent(/CD 10 o la mitad del daño/i);
    // Y NO promete que se pierda el conjuro: eso es tirar el dado, y el sistema no lo decide.
    expect(entrada).not.toHaveTextContent(/pierdes el conjuro/i);
  });

  it("una concentración sin nota no se rompe: se queda con el nombre a secas", async () => {
    pintar([fila("concentrating-bendicion")]);

    const entrada = await screen.findByRole("listitem");
    expect(entrada).toHaveTextContent("Concentración");
    expect(entrada).not.toHaveTextContent("Sin traducir");
  });

  it("variante chips: solo los nombres legibles, sin botones, y nada si no hay condiciones", async () => {
    mockConditions([fila("poisoned")]);
    renderCondiciones({ variante: "chips" });
    const lista = await screen.findByRole("list", { name: "condiciones activas" });
    expect(within(lista).getByText("Envenenado")).toBeInTheDocument();
    expect(within(lista).queryByRole("button")).toBeNull();
    expect(screen.queryByText("poisoned")).toBeNull();

    mockConditions([]);
    const { container } = renderCondiciones({ variante: "chips" });
    await waitFor(() => expect(container.querySelector("ul")).toBeNull());
  });

  it("variante chips: la concentración lleva su nombre completo, nunca un chip vacío", async () => {
    mockConditions([{ ...fila("concentrating-bendicion"), note: "Bendición" }]);
    renderCondiciones({ variante: "chips" });
    const lista = await screen.findByRole("list", { name: "condiciones activas" });
    expect(within(lista).getByText("Concentración en Bendición")).toBeInTheDocument();
    // Ningún <li> se queda vacío: NOMBRE_CONDICION no conoce la clave de concentración.
    for (const li of within(lista).getAllByRole("listitem")) {
      expect(li.textContent).not.toBe("");
    }
  });

  it("variante chips: el agotamiento lleva su nivel", async () => {
    mockConditions([fila("exhaustion", 3)]);
    renderCondiciones({ variante: "chips" });
    const lista = await screen.findByRole("list", { name: "condiciones activas" });
    expect(within(lista).getByText(/nivel 3/)).toBeInTheDocument();
  });

  it("variante chips: una condición vencida no aparece — se gestiona en la tarjeta de Estado", async () => {
    mockConditions([filaConVencimiento("poisoned", { expiresAtClock: 100, expired: true })]);
    const { container } = renderCondiciones({ variante: "chips" });
    await waitFor(() => expect(container.querySelector("ul")).toBeNull());
    expect(screen.queryByText("Envenenado")).toBeNull();
  });
});
