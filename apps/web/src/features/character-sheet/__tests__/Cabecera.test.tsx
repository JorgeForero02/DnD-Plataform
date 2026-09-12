import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { Cabecera } from "../Cabecera";
import * as characterSheetApi from "../api";
import * as members from "../../campaigns/members";
import type { ConditionRow } from "../api";
import type { Disposicion } from "../pestanas/tipos";
import { sheetResponse, wrapper } from "./fixtures/hoja.fixture";

// Tarea 3 (spec 2026-09-11) — la cabecera fija, ahora componente propio. Las dos primeras
// pruebas del bloque «reúne los cinco números…» y «no trae control de daño…» vienen de
// `HojaCalculada.test.tsx` (describe «H3 — la cabecera fija y las dos columnas», que se queda
// con las otras dos `it`s de esa suite para tareas posteriores): mismas aserciones, solo cambia
// el render, que ahora monta `Cabecera` directamente en vez de la hoja entera.
//
// Tarea 4 — el personaje, la hoja calculada y el `wrapper` de React Query + Router se movieron a
// `fixtures/hoja.fixture.tsx`, que también usa `HojaCalculada.test.tsx` y las pruebas de pestaña:
// era la misma armadura copiada tres veces.

// La única condición activa de esta suite: envenenado, sin vencer (`expired` queda `undefined`,
// que la tarjeta trata como falso). Sirve para comprobar que la cabecera pinta el chip, no la
// tarjeta completa de "Condiciones activas" (esa la sigue montando el cuerpo de la hoja).
const conditions: ConditionRow[] = [
  {
    id: "cond-poisoned",
    characterId: "ch1",
    key: "poisoned",
    level: null,
    note: null,
    appliedById: "dm1",
    createdAt: "2026-09-11T00:00:00.000Z",
  },
];

function renderCabecera({
  disposicion,
  puedeEditar = false,
}: {
  disposicion: Disposicion;
  puedeEditar?: boolean;
}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <Cabecera
      campaignId="c1"
      characterId="ch1"
      data={sheetResponse}
      puedeEditar={puedeEditar}
      disposicion={disposicion}
    />,
    { wrapper: wrapper(qc) },
  );
}

describe("Cabecera — lo que cambia el turno, siempre a la vista", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(characterSheetApi, "fetchConditions").mockResolvedValue(conditions);
    // `AvisoDeDm` cuelga de `useMyRole`; sin mockearlo se queda en `isLoading` (no pinta nada),
    // que es un estado válido pero distinto en cada corrida. Se fija a "PLAYER" para que la
    // tira no dependa de una consulta real.
    vi.spyOn(members, "useMyRole").mockReturnValue({
      role: "PLAYER",
      isLoading: false,
      isError: false,
      retry: () => {},
    });
  });

  it("reúne los cinco números, las condiciones como chips y el aviso de elección pendiente", async () => {
    renderCabecera({ disposicion: "pagina" });
    const resumen = await screen.findByRole("region", { name: "resumen de combate" });
    for (const etiqueta of ["CA", "Inic.", "Vel. (pies)", "PG", "Comp."]) {
      expect(within(resumen).getByText(etiqueta)).toBeInTheDocument();
    }
    // Los chips cuelgan de `useConditions`, una consulta propia (igual que en el resto de la
    // hoja): hay que esperar a que asiente antes de buscarlos, o la sección aún no ha pintado
    // nada donde antes había una lista de condiciones.
    expect(
      await within(resumen).findByRole("list", { name: "condiciones activas" }),
    ).toHaveTextContent("Envenenado");
    // Desviación del brief: el texto visible de la tarjeta es "Elecciones por hacer (N)", no
    // "elección pendiente" — esa frase solo vive en comentarios y descripciones de prueba. Se
    // comprueba por la región nombrada, como hace `HojaCalculada.test.tsx`.
    expect(
      within(resumen).getByRole("region", { name: "elecciones pendientes" }),
    ).toBeInTheDocument();
  });

  it("no trae control de daño: los PG son solo lectura", async () => {
    renderCabecera({ disposicion: "pagina" });
    const resumen = await screen.findByRole("region", { name: "resumen de combate" });
    expect(within(resumen).queryByRole("button", { name: /daño|curar|aplicar/i })).toBeNull();
  });

  it("en la mesa lleva el nombre y la clase; en la página no, porque ya los pinta la cabecera de la página", async () => {
    renderCabecera({ disposicion: "mesa" });
    expect(await screen.findByText("Elowen")).toBeInTheDocument();
    cleanup();
    renderCabecera({ disposicion: "pagina" });
    await screen.findByRole("region", { name: "resumen de combate" });
    expect(screen.queryByText("Elowen")).toBeNull();
  });

  // --- Las dos `it`s movidas de `HojaCalculada.test.tsx` («H3 — la cabecera fija y las dos
  // columnas», L286-316), tal cual — solo cambia el render, que ahora monta `Cabecera` sola.

  it("la cabecera reúne los cinco números que se consultan en mitad de un turno", async () => {
    renderCabecera({ disposicion: "pagina" });
    const cabecera = await screen.findByRole("region", { name: "resumen de combate" });
    const texto = cabecera.textContent ?? "";

    // **La tira compacta de la maqueta**: los rótulos van abreviados para que cinco casillas
    // quepan en una fila, y el nombre entero viaja en un `sr-only` hermano — abreviar en
    // pantalla sin decir el nombre completo en alguna parte sería cambiar densidad por
    // accesibilidad. Se comprueban los dos, o la abreviatura podría quedarse sola.
    for (const rotulo of ["CA", "Inic.", "Vel. (pies)", "PG", "Comp."]) {
      expect(texto.includes(rotulo), `«${rotulo}» tiene que estar en la cabecera`).toBe(true);
    }
    for (const largo of ["Iniciativa", "Velocidad efectiva en pies", "Competencia"]) {
      expect(texto.includes(largo), `«${largo}» tiene que anunciarse entero`).toBe(true);
    }
    // Y sus valores, no solo los rótulos: la CA (12) y la velocidad (30) se despliegan desde
    // aquí, y los PG se leen enteros.
    const dentro = within(cabecera);
    expect(dentro.getByRole("button", { name: "12" })).toBeInTheDocument();
    expect(dentro.getByRole("button", { name: "30" })).toBeInTheDocument();
    expect(texto).toContain("15 / 22");
  });

  it("los PG de la cabecera no traen el control de daño: la acción vive en su bloque", async () => {
    // Fix round 1 (revisión de la Tarea 3) — la original comprobaba esto con `puedeEditar={true}`,
    // el único caso donde el control de daño podría llegar a existir; con `false` la prueba no
    // demostraba nada. También cambia la aserción: `querySelector('input[type="number"]')`
    // adivinaba el tipo del control — se comprueba por el nombre accesible real del campo
    // (`PuntosDeGolpe.tsx`), que además sigue vacío aquí porque `Cabecera` no monta esa tarjeta.
    renderCabecera({ disposicion: "pagina", puedeEditar: true });
    const cabecera = await screen.findByRole("region", { name: "resumen de combate" });
    expect(within(cabecera).queryByLabelText("Cambio de puntos de golpe")).toBeNull();
  });

  it("el botón de subir de nivel solo aparece cuando puedeEditar es verdadero", async () => {
    renderCabecera({ disposicion: "pagina", puedeEditar: true });
    const resumen = await screen.findByRole("region", { name: "resumen de combate" });
    expect(
      await within(resumen).findByRole("button", { name: /subir a nivel/i }),
    ).toBeInTheDocument();

    cleanup();

    renderCabecera({ disposicion: "pagina", puedeEditar: false });
    await screen.findByRole("region", { name: "resumen de combate" });
    expect(screen.queryByRole("button", { name: /subir a nivel/i })).toBeNull();
  });
});
