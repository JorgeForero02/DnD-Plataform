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
  race: null,
  class: null,
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
    render(<HojaCalculada campaignId="c1" characterId="ch1" puedeEditar={false} />, {
      wrapper: wrapper(qc),
    });

    await waitFor(() => expect(screen.getByText(/Semielfo/)).toBeInTheDocument());

    // Nombres traducidos presentes. Recursos y condiciones cuelgan de sus propias consultas
    // (`useResources`/`useConditions`), independientes de la de la hoja: cada una espera su
    // propio asentamiento en vez de asumir que ya resolvió porque la hoja lo hizo.
    expect(screen.getByText(/Mago/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Agotamiento (nivel 2)")).toBeInTheDocument());
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
    render(<HojaCalculada campaignId="c1" characterId="ch1" puedeEditar={false} />, {
      wrapper: wrapper(qc),
    });

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
  classes: [{ key: "wizard", name: "Mago", hitDie: 6 }],
  armor: [],
};

function pintarHoja(puedeEditar = false) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<HojaCalculada campaignId="c1" characterId="ch1" puedeEditar={puedeEditar} />, {
    wrapper: wrapper(qc),
  });
}

describe("H3 — la cabecera fija y las dos columnas", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(characterSheetApi, "fetchSheet").mockResolvedValue(sheetResponse);
    vi.spyOn(characterSheetApi, "fetchResources").mockResolvedValue(resources);
    vi.spyOn(characterSheetApi, "fetchConditions").mockResolvedValue(conditions);
    vi.spyOn(characterSheetApi, "fetchCatalog").mockResolvedValue(catalogo);
  });

  it("la cabecera reúne los cinco números que se consultan en mitad de un turno", async () => {
    pintarHoja();
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
    pintarHoja(true);
    const cabecera = await screen.findByRole("region", { name: "resumen de combate" });
    expect(cabecera.querySelector("input")).toBeNull();
    // El control sí existe, pero fuera de la cabecera.
    const campo = await screen.findByLabelText("Cambio de puntos de golpe");
    expect(cabecera.contains(campo)).toBe(false);
  });

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
    expect(within(seccion).getByText(/Equipa un arma en el inventario/)).toBeInTheDocument();
  });

  it("el pie trae rasgos y personalidad, y la personalidad dice qué le falta en vez de inventarlo", async () => {
    pintarHoja();
    const rasgos = await screen.findByRole("region", { name: "rasgos y aptitudes" });
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
    // **El aviso es UNA línea desde la adopción de la maqueta**, así que las otras dos
    // correcciones —«tienes que escribir el motivo» y «aparece en la traza», falsas las dos— se
    // comprueban donde ahora viven: en la tarjeta de anulaciones, que es donde alguien está a
    // punto de hacer una. Se siguen exigiendo; lo que no se puede es dejar de decirlas.
    expect(aviso.textContent).not.toMatch(/registro de la partida/);
    const anulaciones = screen.getByRole("region", { name: "anulaciones del DM" });
    expect(anulaciones.textContent).toMatch(/El motivo es opcional y no va a la traza/);
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
