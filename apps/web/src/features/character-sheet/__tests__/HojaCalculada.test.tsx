import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { HojaCalculada } from "../HojaCalculada";
import * as characterSheetApi from "../api";
import * as members from "../../campaigns/members";
import type {
  Catalog,
  CalculatedSheet,
  CharacterRow,
  ConditionRow,
  ResourceRow,
  SheetResponse,
} from "../api";
import type { RollSuggestions, SuggestedRollMode } from "@dnd/shared";

// Tarea 2A.10 — "ninguna clave de enumeración aparece en pantalla": la hoja completa, con datos
// que a propósito incluyen claves crudas del motor (`half-elf`, `wizard`, `LONG_REST`,
// `exhaustion`, `stealth`…), no debe imprimir ninguna de ellas — todo pasa por `vocabulario.ts`.

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    // `LegalNotice` (ui/) usa `<Link>` de react-router: hace falta un Router alrededor aunque
    // este componente no navegue por sí mismo.
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

function paso(labelKey: string, amount = 1, op: "base" | "add" = "add") {
  return { op, amount, sourceType: "manual" as const, sourceKey: "x", labelKey };
}

function valor(total: number, labelKey: string) {
  return { key: labelKey, total, steps: [paso(labelKey, total, "base")] };
}

const character: CharacterRow = {
  id: "ch1",
  campaignId: "c1",
  ownerId: "u1",
  name: "Elowen",
  level: 3,
  archivedAt: null,

  color: null,
  bio: null,
  visibility: "PLAYERS",
  str: 10,
  dex: 14,
  con: 12,
  int: 16,
  wis: 10,
  cha: 18,
  raceKey: "half-elf",
  subraceKey: null,
  classKey: "wizard",
  subclassKey: null,
  choices: { "half-elf-skills": ["stealth", "perception"] },
  currentHp: 15,
  tempHp: 0,
  version: 2,
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  overrides: null,
};

const sheet: CalculatedSheet = {
  derived: {
    // La CA lleva dos pasos a propósito: uno **sin** causa editable (la armadura llega en 2B) y
    // otro que sí la tiene (el modificador de Destreza). Es lo que H5 tiene que distinguir.
    ac: {
      key: "ac",
      total: 12,
      steps: [paso("ac.unarmored", 10, "base"), paso("abilityMod.dex", 2)],
    },
    initiative: valor(2, "abilityMod.dex"),
    passivePerception: valor(10, "passive.base"),
    "abilityMod.str": valor(0, "abilityMod.str"),
    "abilityMod.dex": valor(2, "abilityMod.dex"),
    "abilityMod.con": valor(1, "abilityMod.con"),
    "abilityMod.int": valor(3, "abilityMod.int"),
    "abilityMod.wis": valor(0, "abilityMod.wis"),
    "abilityMod.cha": valor(4, "abilityMod.cha"),
    "save.str": valor(0, "abilityMod.str"),
    "save.dex": valor(2, "abilityMod.dex"),
    "save.con": valor(1, "abilityMod.con"),
    "save.int": valor(5, "abilityMod.int"),
    "save.wis": valor(2, "abilityMod.wis"),
    "save.cha": valor(4, "abilityMod.cha"),
    "skill.acrobatics": valor(2, "abilityMod.dex"),
    "skill.animal-handling": valor(0, "abilityMod.wis"),
    "skill.arcana": valor(5, "abilityMod.int"),
    "skill.athletics": valor(0, "abilityMod.str"),
    "skill.deception": valor(4, "abilityMod.cha"),
    "skill.history": valor(3, "abilityMod.int"),
    "skill.insight": valor(0, "abilityMod.wis"),
    "skill.intimidation": valor(4, "abilityMod.cha"),
    "skill.investigation": valor(3, "abilityMod.int"),
    "skill.medicine": valor(0, "abilityMod.wis"),
    "skill.nature": valor(3, "abilityMod.int"),
    "skill.perception": valor(2, "skill.perception"),
    "skill.performance": valor(4, "abilityMod.cha"),
    "skill.persuasion": valor(4, "abilityMod.cha"),
    "skill.religion": valor(3, "abilityMod.int"),
    "skill.sleight-of-hand": valor(4, "abilityMod.dex"),
    "skill.stealth": valor(4, "abilityMod.dex"),
    "skill.survival": valor(0, "abilityMod.wis"),
    "senses.darkvision": valor(60, "senses.darkvision"),
    "attack.melee": valor(2, "abilityMod.str"),
    "attack.ranged": valor(4, "abilityMod.dex"),
    "attack.spell": valor(5, "abilityMod.int"),
    spellSaveDc: valor(13, "spellSaveDc.base"),
    proficiencyBonus: valor(2, "proficiencyBonus"),
  },
  warnings: [
    { code: "unresolved_choice", key: "human-language", data: { needed: 1, picked: 0 } },
    {
      code: "ac_formula_discarded",
      key: "ac",
      data: { formula: "leather", labelKey: "armor.leather", total: 13 },
    },
  ],
  pendingChoices: [
    {
      grantId: "human-language",
      labelKey: "race.human.language",
      kind: "skillChoice",
      choose: 1,
      from: ["stealth"],
    },
  ],
  features: [
    { sourceKey: "wizard", labelKey: "class.wizard.spellcasting", name: "Lanzamiento de conjuros" },
  ],
  speeds: { walk: 30 },
  raceKey: "half-elf",
  subraceKey: undefined,
  classKey: "wizard",
  attacksPerAction: 1,
  weaponProficiencies: ["simple"],
  spellSlots: [{ spellLevel: 1, slots: 4 }],
  spellSlotResetOn: "LONG_REST",
};

const sheetResponse: SheetResponse = {
  character,
  sheet,
  attacks: [],
  money: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
  hp: { current: 15, max: 22, temp: 0, version: 2, exceedsMax: false },
  deathSaves: { successes: 0, failures: 0, status: "alive" },
};

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
    await waitFor(() => expect(screen.getByText(/descanso largo/)).toBeInTheDocument());

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
      expect(cuerpo.includes(clave), `«${clave}» no debería aparecer en pantalla`).toBe(false);
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

  it("características → salvaciones → habilidades bajan seguidas por la misma columna", async () => {
    pintarHoja();
    const caracteristicas = await screen.findByRole("region", { name: "características" });
    const salvaciones = screen.getByRole("region", { name: "salvaciones" });
    const habilidades = screen.getByRole("region", { name: "habilidades" });

    // Las tres en la MISMA columna. Si alguien parte la cadena entre dos columnas, esto se rompe.
    const columna = salvaciones.parentElement!;
    expect(columna.contains(caracteristicas)).toBe(true);
    expect(columna.contains(habilidades)).toBe(true);

    // Y en ese orden: la contigüidad es la explicación, así que el orden es parte del contrato.
    const orden = (a: Element, b: Element) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(orden(caracteristicas, salvaciones)).toBe(true);
    expect(orden(salvaciones, habilidades)).toBe(true);

    // Nada accionable entre medias: condiciones, descansos y PG viven en la otra columna.
    const condiciones = await screen.findByRole("region", { name: "condiciones" });
    expect(columna.contains(condiciones)).toBe(false);
  });

  // **El hueco del inventario dejó de ser un hueco (2B).** Esta prueba comprobaba que el
  // recuadro punteado decía «llega en la fase 2B»; ahora comprueba que lo que hay es el
  // inventario de verdad. Que la región conserve su nombre accesible no es casualidad: es el
  // sitio que la hoja llevaba reservado desde 2A.
  it("el inventario se monta dentro de la hoja, con su región nombrada", async () => {
    pintarHoja();
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

  it("la Clase de Armadura tiene su tarjeta con la fórmula en línea, y la tira solo la cifra", async () => {
    pintarHoja();
    const tarjeta = await screen.findByRole("region", { name: "clase de armadura" });

    // La fórmula de una línea —lo que la maqueta pone bajo el número— vive aquí, no en la tira.
    // La fórmula de una línea pone los nombres en minúscula («10 sin armadura +2 modificador
    // de destreza»): es una frase, no una lista de rótulos.
    expect(tarjeta.textContent).toMatch(/sin armadura/i);
    expect(tarjeta.textContent).toMatch(/modificador de destreza/i);
    expect(tarjeta.textContent).toContain("12");

    // Y la casilla de la tira NO la repite: es lo que la hace compacta.
    const cabecera = screen.getByRole("region", { name: "resumen de combate" });
    const casillaCa = within(cabecera).getByText("CA", { exact: true }).parentElement!;
    expect(casillaCa.textContent).not.toMatch(/sin armadura/i);
  });

  it("la fila de tarjetas pequeñas trae percepción pasiva, dados de golpe y salvaciones de muerte", async () => {
    pintarHoja();
    const fila = await screen.findByRole("region", { name: "valores pasivos" });

    expect(within(fila).getByText("Percepción pasiva")).toBeInTheDocument();
    await waitFor(() => expect(within(fila).getByText("Dados de golpe (d6)")).toBeInTheDocument());
    expect(within(fila).getByText("Salvaciones de muerte")).toBeInTheDocument();
  });

  it("las salvaciones de muerte se ven con el personaje vivo, no solo cuando ya es tarde", async () => {
    pintarHoja();
    const tarjeta = await screen.findByRole("region", { name: "valores pasivos" });
    // Un contador que solo existe a 0 PG no se puede consultar antes de llegar ahí.
    expect(within(tarjeta).getByText("Éxitos")).toBeInTheDocument();
    expect(within(tarjeta).getByText("Fallos")).toBeInTheDocument();
    // Y el estado no depende solo del relleno de los círculos: se dice con palabras.
    expect(within(tarjeta).getAllByText("0 de 3")).toHaveLength(2);
  });

  it("los dados de golpe salen UNA vez: en su tarjeta, no también en la lista de recursos", async () => {
    pintarHoja();
    const recursos = await screen.findByRole("region", { name: "recursos y descansos" });

    await waitFor(() =>
      expect(within(recursos).getByText("Espacios de conjuro de nivel 1")).toBeInTheDocument(),
    );
    expect(within(recursos).queryByText("Dados de golpe (d6)")).not.toBeInTheDocument();
    expect(screen.getAllByText("Dados de golpe (d6)")).toHaveLength(1);
  });

  it("«Ataques y lanzamiento» es una tabla con sus columnas y una fila por arma equipada", async () => {
    // Carril B3 — el cuadro real sale de `attacks`, no de los tres bonificadores genéricos del
    // motor: esos ya no se pintan como filas.
    vi.spyOn(characterSheetApi, "fetchSheet").mockResolvedValue({
      ...sheetResponse,
      attacks: [
        {
          key: "SRD:rapier",
          name: "Estoque",
          ref: "SRD:rapier",
          ability: "dex",
          attackBonus: valor(5, "abilityMod.dex"),
          damage: { expression: "1d8+3", dice: "1d8", modifier: 3, type: "PIERCING" },
          properties: ["FINESSE"],
          proficient: true,
        },
      ],
    });
    pintarHoja();
    const seccion = await screen.findByRole("region", { name: "ataques y lanzamiento" });
    const tabla = within(seccion).getByRole("table");

    for (const columna of ["Nombre", "Bonif.", "Daño / tipo", "Notas"]) {
      expect(within(tabla).getByRole("columnheader", { name: columna })).toBeInTheDocument();
    }
    expect(within(tabla).getByRole("rowheader", { name: "Estoque" })).toBeInTheDocument();
    expect(within(tabla).getByText("+5")).toBeInTheDocument();
    expect(within(tabla).getByText(/1d8\+3/)).toBeInTheDocument();
    expect(within(tabla).getByText("perforante")).toBeInTheDocument();
    // Y cada una se puede tirar desde su fila: es la tabla de la maqueta, con nuestro dado.
    expect(within(tabla).getByRole("button", { name: "Tirada de Estoque" })).toBeInTheDocument();
    // La CD de conjuro sigue acompañando a la tabla en vez de ser una casilla suelta más.
    expect(within(seccion).getByText(/CD de salvación de conjuro 13/)).toBeInTheDocument();
  });

  it("«Ataques y lanzamiento» sin arma equipada dice qué hacer, no deja un hueco", async () => {
    pintarHoja(); // sheetResponse trae attacks: []
    const seccion = await screen.findByRole("region", { name: "ataques y lanzamiento" });
    expect(within(seccion).queryByRole("table")).not.toBeInTheDocument();
    expect(within(seccion).getByText(/no llevas ningún arma equipada/i)).toBeInTheDocument();
    expect(within(seccion).getByRole("link", { name: /bolsa/i })).toBeInTheDocument();
  });

  it("el pie trae competencias con armas, rasgos y personalidad, y la personalidad dice qué le falta en vez de inventarlo", async () => {
    pintarHoja();
    const competencias = await screen.findByRole("region", { name: "competencias con armas" });
    expect(within(competencias).getByText("Armas sencillas")).toBeInTheDocument();

    const rasgos = screen.getByRole("region", { name: "rasgos y aptitudes" });
    expect(within(rasgos).getByText("Lanzamiento de conjuros")).toBeInTheDocument();

    const personalidad = screen.getByRole("region", { name: "personalidad" });
    expect(personalidad.textContent).toMatch(/Rasgo · Ideal · Vínculo · Defecto/);
    // Sin biografía guardada NO se finge un rasgo: se dice dónde se escribe.
    expect(personalidad.textContent).toMatch(/Sin nota de personalidad/);
  });
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
    const anulaciones = screen.getByRole("region", { name: "anulaciones del DM" });
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

    const tarjeta = await screen.findByRole("region", { name: "actividades" });
    expect(within(tarjeta).getByText("Furia")).toBeInTheDocument();
    expect(within(tarjeta).getByRole("button", { name: "Usar Furia" })).toBeInTheDocument();
  });

  it("sin ninguna actividad concedida, la tarjeta no se monta — no hay una caja vacía que enseñar", async () => {
    vi.spyOn(characterSheetApi, "fetchSheet").mockResolvedValue(sheetResponse);
    pintarHoja(true);

    await screen.findByText("Salvaciones", { exact: true });
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
