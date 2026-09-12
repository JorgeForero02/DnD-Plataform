import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import { Recursos } from "../../pestanas/Recursos";
import { renderPestana } from "../fixtures/hoja.fixture";
import type { ResourceRow } from "../../api";

// Tarea 5 (spec 2026-09-11, «la hoja a página completa») — `Recursos` es la pestaña de lo que se
// gasta y se repone en una mesa: PG, dados de golpe, salvaciones de muerte, recursos y descansos
// y actividades. Las tarjetas vivían en `HojaCalculada.tsx`; se mueven tal cual.

const resources: ResourceRow[] = [
  {
    id: "r1",
    characterId: "ch1",
    key: "spell-slot-1",
    label: "Espacios de conjuro de nivel 1",
    current: 4,
    max: 4,
    resetOn: "LONG_REST",
    grantedBy: "OWNER",
  },
];

/**
 * Los mismos recursos mas los **dados de golpe**, que es lo que siembra `resources.service.ts`
 * en cuanto la ficha tiene clase. Hacen falta para probar que salen en su tarjeta y **no** otra
 * vez en la lista de recursos. Copiado de `HojaCalculada.test.tsx` (Tarea 4): la `it` que lo
 * usaba se mudó aquí en la Tarea 5.
 */
const recursosConDados: ResourceRow[] = [
  ...resources,
  {
    id: "r2",
    characterId: "ch1",
    key: "hit-dice-d6",
    label: "Dados de golpe (d6)",
    current: 3,
    max: 3,
    resetOn: "LONG_REST",
    grantedBy: "OWNER",
  },
];

describe("Recursos — PG, dados de golpe, salvaciones de muerte, recursos y descansos", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("trae PG, dados de golpe, salvaciones de muerte, recursos y descansos, y a página en dos columnas", async () => {
    const { container } = renderPestana(
      Recursos,
      { disposicion: "pagina" },
      { resources: recursosConDados },
    );
    const raiz = container.querySelector('[data-pestana="recursos"]') as HTMLElement;
    expect(raiz.className).toContain("lg:grid-cols-2");
    // «Dados de golpe» va como expresión regular a propósito: con `recursosConDados` la tarjeta
    // muestra el rótulo real del recurso sembrado («Dados de golpe (d6)»), no el genérico — la
    // misma tarjeta que la `it` de más abajo comprueba que no se repite en la lista.
    for (const t of [
      "Puntos de golpe",
      /Dados de golpe/,
      "Salvaciones de muerte",
      "Recursos y descansos",
    ]) {
      expect(await within(raiz).findByText(t)).toBeInTheDocument();
    }
    expect(within(raiz).queryByText("Habilidades")).toBeNull();
  });

  // Movida de `HojaCalculada.test.tsx` (describe «La hoja de la maqueta…»), tal cual: solo cambia
  // dónde se busca la tarjeta — allí era `within(fila de "valores pasivos")`, que desapareció con
  // el traslado de `SalvacionesDeMuerte` a esta pestaña; su propio `data-tarjeta` la localiza
  // igual de bien.
  it("las salvaciones de muerte se ven con el personaje vivo, no solo cuando ya es tarde", async () => {
    const { container } = renderPestana(Recursos, { disposicion: "pagina" });
    const tarjeta = container.querySelector(
      '[data-tarjeta="salvaciones-de-muerte"]',
    ) as HTMLElement;
    // Un contador que solo existe a 0 PG no se puede consultar antes de llegar ahí.
    expect(within(tarjeta).getByText("Éxitos")).toBeInTheDocument();
    expect(within(tarjeta).getByText("Fallos")).toBeInTheDocument();
    // Y el estado no depende solo del relleno de los círculos: se dice con palabras.
    expect(within(tarjeta).getAllByText("0 de 3")).toHaveLength(2);
  });

  // Movida de `HojaCalculada.test.tsx` (describe «La hoja de la maqueta…»), tal cual.
  it("los dados de golpe salen UNA vez: en su tarjeta, no también en la lista de recursos", async () => {
    renderPestana(Recursos, { disposicion: "pagina" }, { resources: recursosConDados });
    const recursos = await screen.findByRole("region", { name: "recursos y descansos" });

    await waitFor(() =>
      expect(within(recursos).getByText("Espacios de conjuro de nivel 1")).toBeInTheDocument(),
    );
    expect(within(recursos).queryByText("Dados de golpe (d6)")).not.toBeInTheDocument();
    expect(screen.getAllByText("Dados de golpe (d6)")).toHaveLength(1);
  });
});
