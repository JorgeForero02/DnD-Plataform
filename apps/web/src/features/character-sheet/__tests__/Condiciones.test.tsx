import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Condiciones, EFECTO_CONDICION } from "../Condiciones";
import * as characterSheetApi from "../api";
import type { ConditionRow } from "../api";
import { NOMBRE_CONDICION } from "../vocabulario";

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
  it("las quince condiciones del SRD tienen efecto escrito, y ninguna sobra", () => {
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

  it("ninguna condición insinúa un temporizador: en esta fase no hay duración", () => {
    // Se ponen y se quitan a mano. La duración por turnos nace con la iniciativa, que no existe
    // todavía, así que una línea que diga «expira» o «rondas» promete algo que la aplicación no
    // hace. Este barrido es el que impide que se cuele al copiar del manual.
    const prohibido = /ronda|turno|minuto|hora|expir|dura(?:nte|ción)|hasta el final|cuenta atrás/i;
    const culpables = Object.entries(EFECTO_CONDICION)
      .filter(([, efecto]) => prohibido.test(efecto))
      .map(([clave]) => clave);
    expect(culpables).toEqual([]);
  });
});
