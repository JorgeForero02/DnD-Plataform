import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { HojaCalculada } from "../HojaCalculada";
import * as characterSheetApi from "../api";
import * as members from "../../campaigns/members";
import type { Catalog, ConditionRow, ResourceRow, SheetResponse } from "../api";
import type { RollSuggestions, SuggestedRollMode } from "@dnd/shared";
import { renderHoja, sheet, sheetResponse, wrapper } from "./fixtures/hoja.fixture";

// Tarea 2A.10 — "ninguna clave de enumeración aparece en pantalla": la hoja completa, con datos
// que a propósito incluyen claves crudas del motor (`half-elf`, `wizard`, `LONG_REST`,
// `exhaustion`, `stealth`…), no debe imprimir ninguna de ellas — todo pasa por `vocabulario.ts`.
//
// Tarea 4 — el personaje, la hoja calculada y el `wrapper` de React Query + Router se movieron a
// `fixtures/hoja.fixture.tsx`, compartidos con `Cabecera.test.tsx` y las pruebas de pestaña.

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
 * vez en la lista de recursos.
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

const conditions: ConditionRow[] = [
  {
    id: "cond1",
    characterId: "ch1",
    key: "exhaustion",
    level: 2,
    note: null,
    appliedById: "dm1",
    createdAt: "x",
  },
];

describe("HojaCalculada — ninguna clave de enumeración llega a pantalla", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(characterSheetApi, "fetchSheet").mockResolvedValue(sheetResponse);
    vi.spyOn(characterSheetApi, "fetchResources").mockResolvedValue(resources);
    vi.spyOn(characterSheetApi, "fetchConditions").mockResolvedValue(conditions);
  });

  it("traduce raza, subclase, clase, reposición de recursos y condiciones", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <HojaCalculada campaignId="c1" characterId="ch1" puedeEditar={false} disposicion="pagina" />,
      {
        wrapper: wrapper(qc),
      },
    );

    // Tarea 7 — raza y clase se leen en la «Ficha» (pestaña `Rasgos`); la reposición de recursos
    // en `Recursos`. Cada tramo abre antes su pestaña; las aserciones son las de siempre.
    await abrirPestana("Rasgos");
    await waitFor(() => expect(screen.getByText(/Semielfo/)).toBeInTheDocument());

    // Nombres traducidos presentes. Recursos y condiciones cuelgan de sus propias consultas
    // (`useResources`/`useConditions`), independientes de la de la hoja: cada una espera su
    // propio asentamiento en vez de asumir que ya resolvió porque la hoja lo hizo.
    expect(screen.getByText(/Mago/)).toBeInTheDocument();
    // Desde la Tarea 3 el nombre de una condición activa aparece DOS veces: el chip de la
    // cabecera (`Cabecera.tsx`) y la tarjeta "Condiciones activas" del cuerpo. `getByText`
    // exige una sola coincidencia; se usa `getAllByText` porque lo que importa aquí es que la
    // traducción llegó a pantalla, no en cuántos sitios.
    await waitFor(() =>
      expect(screen.getAllByText("Agotamiento (nivel 2)").length).toBeGreaterThan(0),
    );
    // «descanso largo» en minúscula es el título «Espacios de conjuro (descanso largo)», que
    // desde la Tarea 6 vive en `Conjuros` (la lista de recursos dice «Descanso largo», con
    // mayúscula, y `getByText` con regex distingue).
    await abrirPestana("Conjuros");
    await waitFor(() => expect(screen.getByText(/descanso largo/)).toBeInTheDocument());

    // Tarea 7 — con una sola pestaña montada a la vez, «la pantalla» es la cabecera más la
    // pestaña abierta: la comprobación se repite en cada una para seguir cubriendo la hoja
    // entera, que es lo que cubría cuando todo estaba en una página.
    const lista = await screen.findByRole("tablist");
    const pestanas = within(lista)
      .getAllByRole("tab")
      .map((t) => t.textContent?.trim() ?? "");
    for (const pestana of pestanas) {
      await abrirPestana(pestana);
      await screen.findByRole("tabpanel");
      const cuerpo = document.body.textContent ?? "";
      // Ninguna clave cruda del motor, ni de la base de datos, llega al texto de la pantalla.
      for (const clave of [
        "half-elf",
        "wizard",
        "LONG_REST",
        "SHORT_REST",
        "exhaustion",
        "PLAYERS",
      ]) {
        expect(
          cuerpo.includes(clave),
          `«${clave}» no debería aparecer en pantalla (pestaña ${pestana})`,
        ).toBe(false);
      }
    }
  });

  it("muestra el aviso de elección pendiente como tarea, y el de fórmula de CA descartada", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <HojaCalculada campaignId="c1" characterId="ch1" puedeEditar={false} disposicion="pagina" />,
      {
        wrapper: wrapper(qc),
      },
    );

    await waitFor(() =>
      expect(screen.getByRole("region", { name: "elecciones pendientes" })).toBeInTheDocument(),
    );
    expect(screen.getByRole("region", { name: "elecciones pendientes" }).textContent).toMatch(
      /Elige 1 habilidad/,
    );
    expect(screen.getByText(/Con Cuero tendrías CA 13/)).toBeInTheDocument();
  });
});

// --- H3 · cabecera fija + dos columnas, y H5 · la traza navega hasta su causa ---------------
//
// Lo que jsdom SÍ puede demostrar aquí es la **estructura**: qué números viven en la cabecera,
// qué va en cada columna y en qué orden, y a dónde lleva el foco un paso de la traza. Lo que NO
// puede es que la cabecera se quede pegada arriba al desplazar —no hay maquetación, ni alto, ni
// `position` calculada—, y por eso eso se mide en `apps/web/e2e/hoja.spec.ts` y no aquí.

const catalogo: Catalog = {
  races: [{ key: "half-elf", name: "Semielfo", subraces: [] }],
  classes: [{ key: "wizard", name: "Mago", hitDie: 6, subclasses: [] }],
  armor: [],
};

function pintarHoja(puedeEditar = false) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // La disposición no cambia nada de lo que estas pruebas comprueban (columnas, traza,
  // inventario…) — las dos que sí dependían de ella, sobre la cabecera fija, se movieron a
  // `Cabecera.test.tsx` (Tarea 3). Se fija a "pagina", como monta `CharacterDetailPage.tsx`.
  return render(
    <HojaCalculada
      campaignId="c1"
      characterId="ch1"
      puedeEditar={puedeEditar}
      disposicion="pagina"
    />,
    { wrapper: wrapper(qc) },
  );
}

/**
 * Tarea 7 — la hoja es cabecera + `Tabs`, y `Tabs` monta SOLO la pestaña activa. Una `it` que
 * mire una tarjeta que no vive en `Números` (la abierta por defecto) abre antes su pestaña con
 * esto; las aserciones que siguen son las de siempre, sin cambiar su texto. Es `function` y no
 * `const` a propósito: se usa desde el primer `describe`, que está más arriba.
 */
async function abrirPestana(nombre: string) {
  const lista = await screen.findByRole("tablist");
  fireEvent.click(within(lista).getByRole("tab", { name: nombre }));
}

describe("H3 — la cabecera fija y las dos columnas", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(characterSheetApi, "fetchSheet").mockResolvedValue(sheetResponse);
    vi.spyOn(characterSheetApi, "fetchResources").mockResolvedValue(resources);
    vi.spyOn(characterSheetApi, "fetchConditions").mockResolvedValue(conditions);
    vi.spyOn(characterSheetApi, "fetchCatalog").mockResolvedValue(catalogo);
  });

  // Las dos `it`s de este describe que hablaban de la cabecera fija («reúne los cinco
  // números…» y «los PG de la cabecera no traen el control de daño…») se movieron a
  // `Cabecera.test.tsx` en la Tarea 3, ahora que la cabecera es su propio componente. Estas dos
  // se quedan: comprueban la estructura del CUERPO de la hoja, no la cabecera.

  it("el control de daño de los PG vive en su propia tarjeta, fuera de la cabecera", async () => {
    // Fix round 1 (revisión de la Tarea 3) — la mitad de la `it` original de H3 que decía
    // «el control sí existe, pero fuera de la cabecera» se perdió al mover la otra mitad a
    // `Cabecera.test.tsx`. Vive aquí porque el control (`PuntosDeGolpe`) sigue siendo del
    // CUERPO de la hoja, no de la cabecera — hace falta `puedeEditar` para que se pinte.
    pintarHoja(true);
    const cabecera = await screen.findByRole("region", { name: "resumen de combate" });
    // Tarea 7 — `PuntosDeGolpe` vive en la pestaña `Recursos`.
    await abrirPestana("Recursos");
    const campo = await screen.findByLabelText("Cambio de puntos de golpe");
    expect(cabecera.contains(campo)).toBe(false);
  });

  // «características → salvaciones → habilidades bajan seguidas por la misma columna» se movió a
  // `Numeros.test.tsx` (Tarea 4), ahora que las tres tarjetas son la pestaña `Numeros`. Su
  // último tramo («nada accionable entre medias») queda aquí, sin mover: es sobre el reparto de
  // HojaCalculada (`Numeros` en su pestaña, `Condiciones` en `Estado` desde la Tarea 7), no
  // sobre el contenido de la pestaña — `Numeros.tsx` no monta `Condiciones`, así que esa
  // aserción no tiene nada que comprobar allí. Fix round 1 (revisión de la Tarea 4): se había
  // perdido al mover el resto de la `it`; texto de la aserción sin cambiar.
  it("nada accionable se intercala en la columna de Números: condiciones, descansos y PG viven en la otra", async () => {
    const { container } = pintarHoja();
    await screen.findByRole("region", { name: "características" });
    // Tarea 7 — «la otra columna» ya no existe: `Condiciones` vive en la pestaña `Estado`
    // (`[data-pestana="estado"]`) y `Numeros` es otra pestaña. Solo cambia el localizador: la
    // «columna» era el padre de `[data-pestana="numeros"]` y ahora es la propia raíz de la
    // pestaña — el `tabpanel` de `Tabs` no sirve, porque React reutiliza ese mismo nodo para la
    // pestaña siguiente. La tarjeta de condiciones solo aparece al abrir `Estado`.
    const columna = container.querySelector<HTMLElement>('[data-pestana="numeros"]')!;
    expect(within(columna).queryByRole("region", { name: "condiciones" })).toBeNull();
    await abrirPestana("Estado");
    const condiciones = await screen.findByRole("region", { name: "condiciones" });
    expect(condiciones.closest('[data-pestana="estado"]')).not.toBeNull();
    expect(condiciones.closest('[data-pestana="numeros"]')).toBeNull();
    expect(columna.contains(condiciones)).toBe(false);
  });

  // **El hueco del inventario dejó de ser un hueco (2B).** Esta prueba comprobaba que el
  // recuadro punteado decía «llega en la fase 2B»; ahora comprueba que lo que hay es el
  // inventario de verdad. Que la región conserve su nombre accesible no es casualidad: es el
  // sitio que la hoja llevaba reservado desde 2A.
  it("el inventario se monta dentro de la hoja, con su región nombrada", async () => {
    pintarHoja();
    // Tarea 7 — el inventario es la pestaña `Objetos`.
    await abrirPestana("Objetos");
    const inventario = await screen.findByRole("region", { name: "inventario" });
    expect(inventario.textContent).not.toMatch(/fase 2B/);
    // Un segundo `<h1>` en la misma página deja dos títulos a quien navega con lector de
    // pantalla: el inventario titula con `<h2>` porque la hoja ya puso el suyo.
    expect(inventario.querySelector("h1")).toBeNull();
  });
});

describe("H5 — cada paso de la traza lleva a su causa editable", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(characterSheetApi, "fetchSheet").mockResolvedValue(sheetResponse);
    vi.spyOn(characterSheetApi, "fetchResources").mockResolvedValue(resources);
    vi.spyOn(characterSheetApi, "fetchConditions").mockResolvedValue(conditions);
    vi.spyOn(characterSheetApi, "fetchCatalog").mockResolvedValue(catalogo);
  });

  it("«+2 Modificador de Destreza» en la traza de la CA lleva el foco a la casilla de Destreza", async () => {
    pintarHoja(true);
    const cabecera = await screen.findByRole("region", { name: "resumen de combate" });

    // Desplegar la traza de la CA.
    const casillaCA = await screen.findByRole("button", { name: "12" });
    expect(cabecera.contains(casillaCA)).toBe(true);
    fireEvent.click(casillaCA);

    const paso = screen.getByRole("button", { name: /Modificador de Destreza/ });
    fireEvent.click(paso);

    // El foco acaba en la PUNTUACIÓN de Destreza, que es lo editable — no en el modificador,
    // que es otro número derivado.
    expect(document.activeElement).toBe(screen.getByLabelText("Destreza"));
  });

  it("un paso sin causa editable no finge ser navegable", async () => {
    pintarHoja(true);
    const casillaCA = await screen.findByRole("button", { name: "12" });
    fireEvent.click(casillaCA);

    // «Sin armadura» sale de un equipo que todavía no existe (fase 2B): es texto, no un botón.
    const sinArmadura = screen.getAllByText("Sin armadura");
    for (const nodo of sinArmadura) {
      expect(nodo.closest("button")).toBeNull();
    }
  });
});

// --- Adopción de la maqueta de Figma (2026-09-02) -------------------------------------------
//
// El autor eligió la hoja de la maqueta como referencia principal. Lo que jsdom puede demostrar
// de esa adopción es la **estructura**: qué bloques existen, qué contienen, y que ningún dato
// aparece dos veces donde antes aparecía una. Lo que NO puede —que la tira quepa en una fila,
// que la tabla no desborde, que el modificador se lea más que la puntuación— se mide en
// `apps/web/e2e/hoja.spec.ts`.

describe("La hoja de la maqueta: tira, tarjeta de CA, fila de tarjetas, tabla y pie", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(characterSheetApi, "fetchSheet").mockResolvedValue(sheetResponse);
    vi.spyOn(characterSheetApi, "fetchResources").mockResolvedValue(recursosConDados);
    vi.spyOn(characterSheetApi, "fetchConditions").mockResolvedValue(conditions);
    vi.spyOn(characterSheetApi, "fetchCatalog").mockResolvedValue(catalogo);
  });

  // La mitad «tarjeta con la fórmula» de esta `it` se movió a `Estado.test.tsx` (Tarea 5), ahora
  // que esa tarjeta es la pestaña `Estado`. Esta mitad se queda: es sobre la CABECERA (la tira de
  // `resumen de combate`), no sobre el cuerpo, así que no tiene sitio en `Estado.tsx`.
  it("la Clase de Armadura no repite su fórmula en la casilla de la tira", async () => {
    pintarHoja();
    // Tarea 7 — la tarjeta «Clase de armadura» vive en la pestaña `Estado`; se abre para que la
    // comparación siga siendo «la tira no repite lo que la tarjeta sí dice».
    await abrirPestana("Estado");
    await screen.findByRole("region", { name: "clase de armadura" });

    // La casilla de la tira NO repite la fórmula: es lo que la hace compacta.
    const cabecera = screen.getByRole("region", { name: "resumen de combate" });
    const casillaCa = within(cabecera).getByText("CA", { exact: true }).parentElement!;
    expect(casillaCa.textContent).not.toMatch(/sin armadura/i);
  });

  // «la fila de tarjetas pequeñas trae percepción pasiva, dados de golpe y salvaciones de
  // muerte» se repartió, Tarea 5, porque la fila desapareció con el traslado de sus tres
  // tarjetas: percepción pasiva ya se comprobaba en `Numeros.test.tsx` (Tarea 4, «a página:
  // características, salvaciones+pasivos…»); dados de golpe y salvaciones de muerte se movieron,
  // con las dos `it`s de abajo, a `Recursos.test.tsx`.

  // «las salvaciones de muerte se ven con el personaje vivo, no solo cuando ya es tarde» se
  // movió a `Recursos.test.tsx` (Tarea 5), ahora que `SalvacionesDeMuerte` es parte de la
  // pestaña `Recursos`.

  // «los dados de golpe salen UNA vez: en su tarjeta, no también en la lista de recursos» se
  // movió a `Recursos.test.tsx` (Tarea 5), misma razón.

  // Las dos `it`s de «Ataques y lanzamiento» (con arma equipada y sin ella) se movieron a
  // `Ataques.test.tsx` — Tarea 4, ahora que ese bloque es la pestaña `Ataques`. «El pie trae
  // competencias con armas, rasgos y personalidad…» se repartió entre las dos pestañas del pie:
  // su tercio de competencias (`CompetenciasConArmas` vive en `Ataques.tsx`) quedó en
  // `Ataques.test.tsx`, y sus dos tercios de rasgos+personalidad (`Rasgos.tsx`) en
  // `Rasgos.test.tsx` — fix round 1 corrigió este comentario, que decía que la `it` entera había
  // ido a `Rasgos.test.tsx`.
});

describe("El aviso de la vista de DM dice lo que el servidor hace, no lo que la maqueta prometía", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(characterSheetApi, "fetchSheet").mockResolvedValue(sheetResponse);
    vi.spyOn(characterSheetApi, "fetchResources").mockResolvedValue(recursosConDados);
    vi.spyOn(characterSheetApi, "fetchConditions").mockResolvedValue(conditions);
    vi.spyOn(characterSheetApi, "fetchCatalog").mockResolvedValue(catalogo);
  });

  it("al DM le dice cuáles son los cinco valores anulables y que el motivo es opcional", async () => {
    vi.spyOn(members, "useMyRole").mockReturnValue({
      role: "DM",
      isLoading: false,
      isError: false,
      retry: () => {},
    });
    pintarHoja(true);

    const aviso = await screen.findByRole("region", { name: "vista de DM" });
    // La maqueta decía «cualquier número»; son cinco, y salen de `OVERRIDABLE_KEYS`.
    expect(aviso.textContent).toMatch(/5 valores derivados/);
    expect(aviso.textContent).toMatch(/clase de armadura/);
    // **El aviso es UNA línea desde la adopción de la maqueta**, así que la otra corrección
    // —«tienes que escribir el motivo», falsa— se comprueba donde ahora vive: en la tarjeta de
    // anulaciones, que es donde alguien está a punto de hacer una. Se sigue exigiendo; lo que no
    // se puede es dejar de decirla.
    //
    // Ticket J7 (2026-09-11): «el motivo no va a la traza» dejó de ser verdad — el motor lo
    // copia al paso `override` y `Traza.tsx`/`Anulaciones.tsx` lo pintan. La prueba comprueba
    // ahora lo contrario de lo que comprobaba, que es exactamente lo que pide no dejar mentir al
    // texto.
    expect(aviso.textContent).not.toMatch(/registro de la partida/);
    // Tarea 7 — la tarjeta de anulaciones vive en la pestaña `Estado`.
    await abrirPestana("Estado");
    const anulaciones = await screen.findByRole("region", { name: "anulaciones del DM" });
    expect(anulaciones.textContent).toMatch(/el motivo es opcional/i);
    expect(anulaciones.textContent).not.toMatch(/no va a la traza/);
    expect(anulaciones.textContent).toMatch(/registro de la partida/);
  });

  it("un jugador no ve ese aviso: es lo único que distingue las dos vistas", async () => {
    vi.spyOn(members, "useMyRole").mockReturnValue({
      role: "PLAYER",
      isLoading: false,
      isError: false,
      retry: () => {},
    });
    pintarHoja(true);

    await screen.findByRole("region", { name: "resumen de combate" });
    expect(screen.queryByRole("region", { name: "vista de DM" })).not.toBeInTheDocument();
  });
});

// Ronda de arreglo 1 — importante I1. `Actividades.test.tsx` prueba el componente en aislamiento
// y eso nunca demuestra que `HojaCalculada` lo monte de verdad: medido, desmontar
// `<Actividades ... />` de `HojaCalculada.tsx` deja **1213/1213 en verde**. Esta descripción
// monta la hoja entera con una actividad concedida de verdad en `sheet.activities` y comprueba
// que la tarjeta y el botón llegan a la pantalla — no una copia aislada del componente.
describe("Actividades llega a la hoja de verdad (importante I1)", () => {
  const sheetConFuria: SheetResponse = {
    ...sheetResponse,
    sheet: {
      ...sheet,
      activities: [
        {
          tipo: "utilidad",
          activation: { coste: "BONUS" },
          consumption: [{ recurso: "rage", cantidad: 1 }],
          duration: { valor: 1, unidad: "minuto", concentracion: false },
          effects: [{ key: "raging", durationSeconds: 60 }],
          key: "rage",
          usos: { max: 3, resetOn: "LONG_REST" },
        },
      ],
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(characterSheetApi, "fetchSheet").mockResolvedValue(sheetConFuria);
    vi.spyOn(characterSheetApi, "fetchResources").mockResolvedValue([]);
    vi.spyOn(characterSheetApi, "fetchConditions").mockResolvedValue([]);
  });

  it("la tarjeta «Actividades» y su botón «Usar Furia» llegan a la pantalla montados dentro de la hoja", async () => {
    pintarHoja(true);
    // Tarea 7 — `Actividades` vive en la pestaña `Recursos`.
    await abrirPestana("Recursos");

    const tarjeta = await screen.findByRole("region", { name: "actividades" });
    expect(within(tarjeta).getByText("Furia")).toBeInTheDocument();
    expect(within(tarjeta).getByRole("button", { name: "Usar Furia" })).toBeInTheDocument();
  });

  it("sin ninguna actividad concedida, la tarjeta no se monta — no hay una caja vacía que enseñar", async () => {
    vi.spyOn(characterSheetApi, "fetchSheet").mockResolvedValue(sheetResponse);
    pintarHoja(true);

    await screen.findByText("Salvaciones", { exact: true });
    // Tarea 7 — se abre `Recursos`, que es donde SE MONTARÍA: sin abrirla la ausencia no
    // demostraría nada.
    await abrirPestana("Recursos");
    await screen.findByText("Puntos de golpe");
    expect(screen.queryByRole("region", { name: "actividades" })).not.toBeInTheDocument();
  });
});

// Fix round 1 (ALTA-2, migración 6) — «muy cargado» (SRD 5.1, Variant: Encumbrance) solo
// penaliza pruebas de Fuerza, Destreza o Constitución. Una prueba de Atletismo (Fuerza) tiene
// que enseñar la sugerencia; una de Persuasión (Carisma), NO — antes de este arreglo, las
// dieciocho habilidades compartían `rollSuggestions.check` y las dieciocho la enseñaban.
describe("Fix round 1 (ALTA-2) — la desventaja de «muy cargado» solo en pruebas de FUE/DES/CON", () => {
  const NORMAL: SuggestedRollMode = {
    kind: "CHECK",
    mode: "NORMAL",
    cancelled: false,
    autoFail: false,
    reasons: [],
  };
  const MUY_CARGADO: SuggestedRollMode = {
    kind: "CHECK",
    ability: "str",
    mode: "DISADVANTAGE",
    cancelled: false,
    autoFail: false,
    reasons: [
      {
        effect: "DISADVANTAGE",
        sourceKey: "heavily_encumbered",
        labelKey: "rollMode.condition.disadvantage",
      },
    ],
  };
  const rollSuggestions: RollSuggestions = {
    attack: NORMAL,
    // El genérico se queda en NORMAL a propósito: no sabe de qué característica es la prueba,
    // así que no puede anotar una regla que distingue por característica.
    check: NORMAL,
    checks: {
      str: MUY_CARGADO,
      dex: NORMAL,
      con: NORMAL,
      int: NORMAL,
      wis: NORMAL,
      cha: NORMAL,
    },
    saves: { str: NORMAL, dex: NORMAL, con: NORMAL, int: NORMAL, wis: NORMAL, cha: NORMAL },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(characterSheetApi, "fetchSheet").mockResolvedValue({
      ...sheetResponse,
      rollSuggestions,
    });
    vi.spyOn(characterSheetApi, "fetchResources").mockResolvedValue([]);
    vi.spyOn(characterSheetApi, "fetchConditions").mockResolvedValue([]);
  });

  it("Atletismo (Fuerza) enseña la desventaja de «muy cargado»", async () => {
    pintarHoja(false);
    fireEvent.click(await screen.findByRole("button", { name: "Tirada de Atletismo" }));
    const panel = screen.getByRole("group", { name: "Tirada de Atletismo" });
    expect(within(panel).getByRole("radio", { name: "Desventaja" })).toBeChecked();
  });

  it("Persuasión (Carisma) NO enseña ninguna sugerencia — el SRD no la nombra", async () => {
    pintarHoja(false);
    fireEvent.click(await screen.findByRole("button", { name: "Tirada de Persuasión" }));
    const panel = screen.getByRole("group", { name: "Tirada de Persuasión" });
    expect(within(panel).getByRole("radio", { name: "Normal" })).toBeChecked();
    expect(within(panel).queryByRole("status")).not.toBeInTheDocument();
  });
});

// Fix round 1 (revisión de Tarea 6) — la pestaña `Conjuros` solo se monta para quien lanza
// (`lanzaConjuros(sheet)`), y nada la probaba a este nivel: `Conjuros.test.tsx` monta el
// componente directo, nunca a través de `HojaCalculada`. La armadura por defecto (`sheet` de
// `hoja.fixture.tsx`) SÍ lanza (4 espacios de nivel 1), así que la comprobación de "no se monta"
// necesita apagar los espacios y confirmar que tampoco queda ningún truco racial de conjuro en
// sus `features` (solo trae `class.wizard.spellcasting`, que no termina en `.cantrip`/`.spell`).
describe("Fix round 1 — `Conjuros` solo se monta para quien lanza", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sin espacios de conjuro y sin truco racial, la pestaña `Conjuros` no se monta", async () => {
    // La armadura por defecto no trae ningún `labelKey` que termine en `.cantrip`/`.spell` —
    // solo `class.wizard.spellcasting` — así que apagar `spellSlots` basta para dejar de lanzar.
    expect(
      sheet.features.some((f) => f.labelKey.endsWith(".cantrip") || f.labelKey.endsWith(".spell")),
    ).toBe(false);
    vi.spyOn(characterSheetApi, "fetchSheet").mockResolvedValue({
      ...sheetResponse,
      sheet: { ...sheet, spellSlots: [] },
    });
    vi.spyOn(characterSheetApi, "fetchResources").mockResolvedValue([]);
    vi.spyOn(characterSheetApi, "fetchConditions").mockResolvedValue([]);
    pintarHoja(false);

    await screen.findByText("Salvaciones", { exact: true });
    // Tarea 7 — «no se monta» es ahora «no hay pestaña»: `Tabs` solo monta la activa, así que la
    // ausencia del `data-pestana` por sí sola no demostraría nada.
    const lista = await screen.findByRole("tablist");
    expect(within(lista).queryByRole("tab", { name: "Conjuros" })).toBeNull();
    expect(document.querySelector('[data-pestana="conjuros"]')).not.toBeInTheDocument();
  });

  it("con espacios de conjuro (armadura por defecto: 4 de nivel 1), la pestaña `Conjuros` se monta", async () => {
    vi.spyOn(characterSheetApi, "fetchSheet").mockResolvedValue(sheetResponse);
    vi.spyOn(characterSheetApi, "fetchResources").mockResolvedValue([]);
    vi.spyOn(characterSheetApi, "fetchConditions").mockResolvedValue([]);
    pintarHoja(false);

    await screen.findByText("Salvaciones", { exact: true });
    // Tarea 7 — la pestaña existe y, abierta, monta su contenido.
    await abrirPestana("Conjuros");
    expect(document.querySelector('[data-pestana="conjuros"]')).toBeInTheDocument();
  });
});

// Tarea 7 (spec 2026-09-11, «la hoja a página completa») — la hoja es una cabecera más `Tabs`:
// carril lateral en la página, tira en la mesa. `Tabs` monta SOLO el contenido de la pestaña
// activa (`ui/Tabs.tsx`, `panel`), así que «no está en esta pestaña» se comprueba con
// `queryByText(...).toBeNull()` y no con `toBeVisible()`.
describe("La hoja en pestañas", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("cada tarjeta está en su pestaña y en ninguna otra", async () => {
    // Sin Conjuros: la armadura de `hoja.fixture.tsx` SÍ trae 4 espacios de nivel 1 (Elowen es
    // maga), así que aquí se apagan para que la lista sea la de quien no lanza — la `it` de
    // abajo cubre la otra mitad.
    renderHoja({ disposicion: "pagina" }, { sheet: { ...sheet, spellSlots: [] } });
    const lista = await screen.findByRole("tablist");
    const nombres = within(lista)
      .getAllByRole("tab")
      .map((t) => t.textContent?.trim());
    expect(nombres).toEqual(["Números", "Objetos", "Ataques", "Recursos", "Estado", "Rasgos"]);
    // Números abierta por defecto: Salvaciones sí, Puntos de golpe no.
    expect(screen.getByText("Salvaciones")).toBeInTheDocument();
    expect(screen.queryByText("Puntos de golpe")).toBeNull();
    fireEvent.click(within(lista).getByRole("tab", { name: "Recursos" }));
    expect(await screen.findByText("Puntos de golpe")).toBeInTheDocument();
    expect(screen.queryByText("Salvaciones")).toBeNull();
  });

  it("Conjuros aparece para quien lanza", async () => {
    renderHoja(
      { disposicion: "pagina" },
      { sheet: { ...sheet, spellSlots: [{ spellLevel: 1, slots: 2 }] } },
    );
    expect(await screen.findByRole("tab", { name: "Conjuros" })).toBeInTheDocument();
  });

  it("?pestana=objetos abre Objetos, y una desconocida cae en Números", async () => {
    renderHoja({ disposicion: "pagina" }, {}, "/campaigns/c1/characters/ch1?pestana=objetos");
    expect(await screen.findByRole("region", { name: "inventario" })).toBeInTheDocument();
    cleanup();
    renderHoja({ disposicion: "pagina" }, {}, "/campaigns/c1/characters/ch1?pestana=loquesea");
    expect(await screen.findByText("Salvaciones")).toBeInTheDocument();
  });

  it("en la mesa las pestañas son una tira y siempre arranca en Números aunque la URL diga otra cosa", async () => {
    renderHoja({ disposicion: "mesa" }, {}, "/sessions/s1?pestana=objetos");
    await screen.findByRole("tablist");
    expect(screen.getByText("Salvaciones")).toBeInTheDocument();
  });

  it("los cinco números siguen fuera de las pestañas, en cualquiera de ellas", async () => {
    renderHoja({ disposicion: "pagina" });
    const lista = await screen.findByRole("tablist");
    for (const tab of ["Rasgos", "Estado"]) {
      fireEvent.click(within(lista).getByRole("tab", { name: tab }));
      expect(screen.getByRole("region", { name: "resumen de combate" })).toBeInTheDocument();
    }
  });
});
