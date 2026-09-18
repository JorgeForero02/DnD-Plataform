import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { Cabecera } from "../Cabecera";
import * as characterSheetApi from "../api";
import * as members from "../../campaigns/members";
import type { ConditionRow } from "../api";
import type { Disposicion } from "../pestanas/tipos";
import { sheetResponse, wrapper } from "./fixtures/hoja.fixture";
import { descriptorDePersonaje } from "../../characters/descriptor";

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
  data = sheetResponse,
  onAlto,
}: {
  disposicion: Disposicion;
  puedeEditar?: boolean;
  data?: typeof sheetResponse;
  onAlto?: (px: number) => void;
}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <Cabecera
      campaignId="c1"
      characterId="ch1"
      data={data}
      puedeEditar={puedeEditar}
      disposicion={disposicion}
      onAlto={onAlto}
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

  // Minor 7 (ronda de arreglo 3) — `vi.stubGlobal` no lo deshace `vi.restoreAllMocks()` (son
  // dos mecanismos de vitest distintos): sin este `afterEach`, un `ResizeObserver` falso
  // filtraría a la prueba siguiente del fichero. Se centraliza aquí —junto al `restoreAllMocks`
  // que hasta ahora solo se llamaba manualmente al final de una prueba— para que ninguna prueba
  // tenga que acordarse de limpiar a mano.
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reúne los cinco números, las condiciones como chips y el aviso de elección pendiente", async () => {
    renderCabecera({ disposicion: "pagina" });
    const resumen = await screen.findByRole("region", { name: "resumen de combate" });
    // «Vel.» y no «Vel. (pies)»: la unidad baja a la tercera línea de la casilla — motivo en
    // Cabecera.tsx (ronda 2026-09-12).
    for (const etiqueta of ["CA", "Inic.", "Vel.", "PG", "Comp."]) {
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
    //
    // **Cambiado por decisión del controlador (Tarea 10, ruling A, 2026-09-12):** el aviso lo
    // pinta `Cabecera`, pero FUERA de la banda fija —medida dentro, la tira ocupaba 412 px—.
    // Antes se exigía dentro de la región; ahora se exige que exista y que NO esté dentro.
    const elecciones = screen.getByRole("region", { name: "elecciones pendientes" });
    expect(elecciones).toBeInTheDocument();
    expect(resumen.contains(elecciones)).toBe(false);
  });

  it("no trae control de daño: los PG son solo lectura", async () => {
    renderCabecera({ disposicion: "pagina" });
    const resumen = await screen.findByRole("region", { name: "resumen de combate" });
    expect(within(resumen).queryByRole("button", { name: /daño|curar|aplicar/i })).toBeNull();
  });

  it("en la mesa lleva el nombre y la clase; en la página no, porque ya los pinta la cabecera de la página", async () => {
    // El descriptor es el mismo que pinta la página («Elfa alta · Maga» o lo que diga la
    // armadura): se calcula con la misma función, no se copia a mano, para que un cambio de
    // vocabulario no deje esta prueba mintiendo.
    const descriptor = descriptorDePersonaje(sheetResponse.character);
    expect(descriptor).not.toBe("");
    renderCabecera({ disposicion: "mesa" });
    expect(await screen.findByText("Elowen")).toBeInTheDocument();
    expect(screen.getByText(descriptor)).toBeInTheDocument();
    cleanup();
    renderCabecera({ disposicion: "pagina" });
    await screen.findByRole("region", { name: "resumen de combate" });
    expect(screen.queryByText("Elowen")).toBeNull();
    expect(screen.queryByText(descriptor)).toBeNull();
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
    for (const rotulo of ["CA", "Inic.", "Vel.", "PG", "Comp."]) {
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

  it("el botón de subir de nivel solo aparece cuando puedeEditar es verdadero, y debajo de la banda fija", async () => {
    renderCabecera({ disposicion: "pagina", puedeEditar: true });
    const resumen = await screen.findByRole("region", { name: "resumen de combate" });
    // **Cambiado por decisión del controlador (Tarea 10, ruling A, 2026-09-12):** el botón lo
    // pinta `Cabecera` debajo de la banda, no dentro de la región «resumen de combate».
    const subir = await screen.findByRole("button", { name: /subir a nivel/i });
    expect(subir).toBeInTheDocument();
    expect(resumen.contains(subir)).toBe(false);

    cleanup();

    renderCabecera({ disposicion: "pagina", puedeEditar: false });
    await screen.findByRole("region", { name: "resumen de combate" });
    expect(screen.queryByRole("button", { name: /subir a nivel/i })).toBeNull();
  });

  // HP-7 (2026-09-12) — la fila de avisos se decide ANTES de montar, con los datos que usan los
  // cuatro avisos, en vez de fiarse de `empty:hidden` y de que los cuatro devuelvan `null`. Sin
  // nada que avisar, la banda fija no tiene ningún hermano detrás dentro de la cabecera.
  it("sin advertencias, sin elecciones, sin vista de DM y sin poder editar, no hay fila de avisos en el DOM", async () => {
    renderCabecera({
      disposicion: "pagina",
      puedeEditar: false,
      data: {
        ...sheetResponse,
        sheet: { ...sheetResponse.sheet, warnings: [], pendingChoices: [] },
      },
    });
    const resumen = await screen.findByRole("region", { name: "resumen de combate" });
    await within(resumen).findByRole("list", { name: "condiciones activas" });
    expect(resumen.nextElementSibling).toBeNull();
    expect(screen.queryByRole("region", { name: "elecciones pendientes" })).toBeNull();
    expect(screen.queryByRole("region", { name: "vista de DM" })).toBeNull();
    expect(screen.queryByRole("button", { name: /subir a nivel/i })).toBeNull();
  });

  it("basta la vista de DM para que la fila de avisos exista, detrás de la banda fija", async () => {
    vi.spyOn(members, "useMyRole").mockReturnValue({
      role: "DM",
      isLoading: false,
      isError: false,
      retry: () => {},
    });
    renderCabecera({
      disposicion: "pagina",
      puedeEditar: false,
      data: {
        ...sheetResponse,
        sheet: { ...sheetResponse.sheet, warnings: [], pendingChoices: [] },
      },
    });
    const resumen = await screen.findByRole("region", { name: "resumen de combate" });
    const aviso = await screen.findByRole("region", { name: "vista de DM" });
    expect(resumen.nextElementSibling).not.toBeNull();
    expect(resumen.nextElementSibling!.contains(aviso)).toBe(true);
  });

  // Anexo #6/#17 (ronda de arreglo, 2026-09-12) — `e2e/espacios.spec.ts` midió el panel de
  // detalle de Objetos metido 60px bajo la banda: `--tira-fija-top` es el escalón de `AppShell`,
  // no el alto real de esta banda. `Cabecera` reporta ese alto con `ResizeObserver`, y esta
  // prueba es la que demuestra que el hook lo hace, sin montar toda la hoja.
  it("reporta su alto real por `onAlto`, al montar y en cada cambio de tamaño, y se desconecta al desmontar", async () => {
    const onAlto = vi.fn();
    const alDesconectar = vi.fn();
    let callback: ResizeObserverCallback | null = null;
    class FakeResizeObserver implements ResizeObserver {
      constructor(cb: ResizeObserverCallback) {
        callback = cb;
      }
      observe() {}
      unobserve() {}
      disconnect = alDesconectar;
    }
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    const medida = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({ height: 123 } as DOMRect);

    const { unmount } = renderCabecera({ disposicion: "pagina", onAlto });
    await screen.findByRole("region", { name: "resumen de combate" });

    // 1. Al montar, sin esperar a ningún resize: `jsdom` no dispara `ResizeObserver` solo, así
    //    que sin esta llamada inicial una hoja que nunca cambia de tamaño nunca reportaría nada.
    expect(onAlto).toHaveBeenCalledWith(123);

    // 2. Y en un cambio de tamaño real: el alto se vuelve a leer del propio elemento (no del
    //    `contentRect` del observador), porque el consumidor necesita la caja completa —con
    //    borde y relleno— y no solo el contenido.
    onAlto.mockClear();
    medida.mockReturnValue({ height: 200 } as DOMRect);
    callback!([], {} as ResizeObserver);
    expect(onAlto).toHaveBeenCalledWith(200);

    // 3. Minor 7 — y al desmontar, el observador se desconecta. Sin la función de limpieza del
    //    `useLayoutEffect`, cada navegación que sale de la hoja dejaría un `ResizeObserver`
    //    vivo observando un `<section>` que ya no existe.
    expect(alDesconectar).not.toHaveBeenCalled();
    unmount();
    expect(alDesconectar).toHaveBeenCalledTimes(1);
  });

  // Puerta de efectos §5 bis (E-PE-10, D-CF-68) — el marcador de PX y su aviso de nivel
  // disponible. `character.level` de la armadura es 3.
  describe("el marcador de experiencia", () => {
    it("con sheet.xp y el nivel al día, se lee «1 250 / 2 700 PX» y no hay aviso", async () => {
      renderCabecera({
        disposicion: "pagina",
        data: { ...sheetResponse, xp: { actual: 1250, siguiente: 2700, nivelPorXp: 3 } },
      });
      // `getByText` normaliza el contenido del nodo con `replace(/\s+/g, ' ')` (colapsa TODO
      // espacio en blanco, incluido el fino) pero no normaliza el texto de búsqueda — así que
      // aquí se busca con espacio normal, aunque el DOM real lleve "\u202f" (ver
      // `frasesDeXp.test.ts`, que sí lo comprueba con `toBe` exacto sobre la función).
      expect(await screen.findByText("1 250 / 2 700 PX")).toBeInTheDocument();
      expect(screen.queryByText(/el DM puede subirte/)).toBeNull();
    });

    it("con nivelPorXp por encima del nivel, se lee el aviso", async () => {
      renderCabecera({
        disposicion: "pagina",
        data: { ...sheetResponse, xp: { actual: 2700, siguiente: 6500, nivelPorXp: 4 } },
      });
      expect(
        await screen.findByText("Has alcanzado el XP del nivel 4: el DM puede subirte"),
      ).toBeInTheDocument();
    });

    it("sin sheet.xp, no se pinta nada de PX (E-PE-10)", async () => {
      renderCabecera({ disposicion: "pagina" });
      await screen.findByRole("region", { name: "resumen de combate" });
      expect(screen.queryByText(/PX/)).toBeNull();
    });
  });
});
