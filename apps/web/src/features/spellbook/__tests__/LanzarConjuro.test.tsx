import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Encounter, SpellbookEntry, SpellbookResponse } from "@dnd/shared";
import { LanzarConjuro } from "../LanzarConjuro";
import * as characterSheetApi from "../../character-sheet/api";
import * as sessionsApi from "../../sessions/api";
import type { Session } from "../../sessions/api";
import * as encountersApi from "../../encounters/api";
import * as charactersApi from "../../characters/api";
import * as bestiarioApi from "../../bestiario/api";
import type { NpcEnLaMesa } from "../../bestiario/api";
import * as inventoryApi from "../../inventory/api";
import { inventoryKey } from "../../inventory/hooks";
import type { InventoryRow } from "../../inventory/api";

// Tarea 7 de 3A.2 («elegir, lanzar y usar») — el botón «Lanzar» de la pestaña Conjuros. Reusa el
// mismo patrón de mocks que `TirarAtaqueBoton.test.tsx`: la sesión y el encuentro deciden si hay
// combate, y `useCombatientesDelEncuentro` sale de ahí.

const TRUCO: SpellbookEntry = {
  key: "light",
  nameEs: "Luz",
  nameEn: "Light",
  level: 0,
  school: "evo",
  castingTime: { coste: "ACTION" },
  range: { unidad: "toque" },
  concentration: false,
  ritual: false,
  estado: "CONOCIDO",
  lanzable: true,
  mecanica: "utilidad",
  objetivos: "ninguno",
  escalaPorEspacio: false,
  encanta: false,
};

// «Escudo» — nivel 1, sin objetivo (se lanza sobre uno mismo), no escala. Sirve para probar el
// selector de espacio SIN la lista de objetivos de por medio.
const ESCUDO: SpellbookEntry = {
  key: "shield",
  nameEs: "Escudo",
  nameEn: "Shield",
  level: 1,
  school: "abj",
  castingTime: { coste: "REACTION" },
  range: { unidad: "personal" },
  concentration: false,
  ritual: false,
  estado: "PREPARADO",
  lanzable: true,
  mecanica: "utilidad",
  objetivos: "ninguno",
  escalaPorEspacio: false,
  encanta: false,
};

const PROYECTIL: SpellbookEntry = {
  key: "magic-missile",
  nameEs: "Proyectil mágico",
  nameEn: "Magic Missile",
  level: 1,
  school: "evo",
  castingTime: { coste: "ACTION" },
  range: { unidad: "pies", distanciaFt: 120 },
  concentration: false,
  ritual: false,
  estado: "PREPARADO",
  lanzable: true,
  mecanica: "dados",
  objetivos: "varios",
  escalaPorEspacio: true,
  encanta: false,
};

// Ola de arreglos de 3A.2 (web I-2) — «Curar heridas»: `dados` de curación, `objetivos: "uno"`.
// En combate tiene que ofrecer «Tú mismo»: es el uso más frecuente de la mecánica.
const CURAR: SpellbookEntry = {
  key: "cure-wounds",
  nameEs: "Curar heridas",
  nameEn: "Cure Wounds",
  level: 1,
  school: "evo",
  castingTime: { coste: "ACTION" },
  range: { unidad: "toque" },
  concentration: false,
  ritual: false,
  estado: "PREPARADO",
  lanzable: true,
  mecanica: "dados",
  objetivos: "uno",
  escalaPorEspacio: true,
  encanta: false,
};

// «Rayo de fuego»: `ataque` contra UN objetivo. Atacarse a uno mismo es un 400 del servidor
// (`usar()`, caso `ataque`), así que aquí «Tú mismo» NO se ofrece — ni en combate ni fuera.
const RAYO_DE_FUEGO: SpellbookEntry = {
  key: "fire-bolt",
  nameEs: "Rayo de fuego",
  nameEn: "Fire Bolt",
  level: 0,
  school: "evo",
  castingTime: { coste: "ACTION" },
  range: { unidad: "pies", distanciaFt: 120 },
  concentration: false,
  ritual: false,
  estado: "CONOCIDO",
  lanzable: true,
  mecanica: "ataque",
  objetivos: "uno",
  escalaPorEspacio: false,
  encanta: false,
};

// T15 (3A.2) — «Arma mágica»: `objetivos: "ninguno"` (su actividad de lanzamiento es una
// `utilidad` sintética), pero `encanta: true` — el selector es un arma, no una criatura.
const ARMA_MAGICA: SpellbookEntry = {
  key: "magic-weapon",
  nameEs: "Arma mágica",
  nameEn: "Magic Weapon",
  level: 2,
  school: "trs",
  castingTime: { coste: "BONUS" },
  range: { unidad: "toque" },
  concentration: true,
  ritual: false,
  estado: "PREPARADO",
  lanzable: true,
  mecanica: "utilidad",
  objetivos: "ninguno",
  escalaPorEspacio: false,
  encanta: true,
};

function filaDeArma(id: string, nombre: string): InventoryRow {
  return {
    id,
    quantity: 1,
    location: "EQUIPPED",
    slot: "MAIN_HAND",
    attuned: false,
    storedAt: null,
    note: null,
    item: {
      ref: `SRD:${id}`,
      source: "SRD",
      name: nombre,
      kind: "WEAPON",
      weightOz: 48,
      effects: [],
      requiresAttunement: false,
      attuned: false,
      weapon: {
        category: "MARTIAL",
        range: "MELEE",
        damageDice: "1d8",
        damageType: "SLASHING",
        properties: [],
      },
    },
  };
}

const SIN_ESPACIOS: SpellbookResponse["espacios"] = [];

const SESION: Session = {
  id: "s1",
  campaignId: "c1",
  title: "La torre del libro",
  scheduledAt: null,
  notes: null,
  visibility: "PLAYERS",
  createdAt: "2026-09-02T20:00:00.000Z",
  status: "IN_PROGRESS",
  startedAt: "2026-09-02T20:00:00.000Z",
  endedAt: null,
  attendance: null,
};

const GOBLIN: NpcEnLaMesa = {
  id: "n-goblin",
  name: "Goblin",
  statblockRef: "srd-goblin",
  currentHp: 7,
  ownerId: "u-dm",
  visibility: "PLAYERS",
  conditions: [],
};

function encuentro(combatants: Encounter["combatants"]): Encounter {
  return {
    id: "enc-1",
    sessionId: "s1",
    status: "ACTIVE",
    round: 1,
    activePosition: 0,
    finalPropuesto: false,
    combatants,
  };
}

function montar(entrada: SpellbookEntry, espacios: SpellbookResponse["espacios"] = SIN_ESPACIOS) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LanzarConjuro campaignId="c1" characterId="p-maga" entrada={entrada} espacios={espacios} />
    </QueryClientProvider>,
  );
}

const ECONOMIA = {
  actionUsed: false,
  bonusUsed: false,
  reactionUsed: false,
  movementUsed: 0,
};

beforeEach(() => {
  vi.restoreAllMocks();
  // Sin combate por defecto: la mayoría de pruebas no lo necesita, y así no hay que repetir los
  // cuatro mocks en cada `it`.
  vi.spyOn(sessionsApi, "fetchCurrentSession").mockResolvedValue(null);
  vi.spyOn(encountersApi, "fetchCurrentEncounter").mockResolvedValue(null);
  vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([]);
  vi.spyOn(bestiarioApi, "fetchNpcs").mockResolvedValue([]);
  // T15 (3A.2) — `LanzarConjuro` siempre pide el inventario propio (para el selector de
  // encantar); sin este mock, cualquier prueba que no sea de encantar dispararía una petición
  // real sin servidor detrás.
  vi.spyOn(inventoryApi, "fetchInventory").mockResolvedValue({
    items: [],
    purse: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    totalWeightOz: 0,
    carryCapacityOz: null,
    encumbrance: null,
  });
});

describe("LanzarConjuro — sin objetivo y sin espacio superior", () => {
  it("un truco sin objetivos lanza con {} al pulsar, sin abrir ningún panel", async () => {
    const usar = vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({});
    montar(TRUCO);

    fireEvent.click(screen.getByRole("button", { name: "Lanzar Luz" }));

    await waitFor(() => expect(usar).toHaveBeenCalledWith("c1", "p-maga", "spell:light", {}));
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });
});

describe("LanzarConjuro — el selector de espacio, sin lista de objetivos de por medio", () => {
  it("con espacios de nivel 2 disponibles aparece el grupo de radios, y elegir «Nivel 2» manda nivelDeEspacio: 2", async () => {
    const usar = vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({});
    montar(ESCUDO, [
      { nivel: 1, actual: 3, max: 4 },
      { nivel: 2, actual: 1, max: 2 },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Lanzar Escudo" }));
    expect(await screen.findByText("¿Con qué espacio?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /^Nivel 2/ }));
    fireEvent.click(screen.getByRole("button", { name: "Lanzar" }));

    await waitFor(() =>
      expect(usar).toHaveBeenCalledWith("c1", "p-maga", "spell:shield", { nivelDeEspacio: 2 }),
    );
  });

  // Ola de arreglos (web I-1) — el nivel por defecto se derivaba UNA vez (`useState(() => …)`) y
  // se quedaba rancio: agotado el último espacio de nivel 1 (la fila no se desmonta), el grupo
  // pintaba un solo radio sin marcar y «Lanzar» mandaba `nivelDeEspacio: 1` → SIN_ESPACIO. Ahora
  // el nivel efectivo se deriva en cada render: el propio si le quedan usos, y si no, el primero
  // que sí tenga; y el propio agotado se pinta marcado como no disponible («no quedan»), la regla
  // del «valor guardado que un selector no ofrece» de 04-convenciones.
  it("I-1: sin espacios del nivel propio, «Lanzar» manda el primer nivel con usos sin tocar ningún radio", async () => {
    const usar = vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({});
    montar(ESCUDO, [
      { nivel: 1, actual: 0, max: 4 },
      { nivel: 2, actual: 1, max: 2 },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Lanzar Escudo" }));
    expect(await screen.findByText("¿Con qué espacio?")).toBeInTheDocument();
    // El propio, agotado: se ve, marcado como agotado, y no se puede elegir.
    const propio = screen.getByRole("radio", { name: /^Nivel 1 .*no quedan/ });
    expect(propio).toBeDisabled();
    expect(screen.getByRole("radio", { name: /^Nivel 2/ })).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Lanzar" }));

    await waitFor(() =>
      expect(usar).toHaveBeenCalledWith("c1", "p-maga", "spell:shield", { nivelDeEspacio: 2 }),
    );
  });

  it("I-1: si el nivel elegido se agota tras lanzar (mismo montaje), el siguiente lanzamiento usa el que queda", async () => {
    const usar = vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({});
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const conEspacios = (espacios: SpellbookResponse["espacios"]) => (
      <QueryClientProvider client={qc}>
        <LanzarConjuro campaignId="c1" characterId="p-maga" entrada={ESCUDO} espacios={espacios} />
      </QueryClientProvider>
    );
    const vista = render(
      conEspacios([
        { nivel: 1, actual: 1, max: 4 },
        { nivel: 2, actual: 1, max: 2 },
      ]),
    );

    fireEvent.click(screen.getByRole("button", { name: "Lanzar Escudo" }));
    expect(await screen.findByRole("radio", { name: /^Nivel 1/ })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Lanzar" }));
    await waitFor(() =>
      expect(usar).toHaveBeenLastCalledWith("c1", "p-maga", "spell:shield", { nivelDeEspacio: 1 }),
    );

    // El servidor gastó el último de nivel 1: la misma fila recibe los espacios nuevos.
    vista.rerender(
      conEspacios([
        { nivel: 1, actual: 0, max: 4 },
        { nivel: 2, actual: 1, max: 2 },
      ]),
    );
    fireEvent.click(screen.getByRole("button", { name: "Lanzar Escudo" }));
    expect(await screen.findByRole("radio", { name: /^Nivel 2/ })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Lanzar" }));
    await waitFor(() =>
      expect(usar).toHaveBeenLastCalledWith("c1", "p-maga", "spell:shield", { nivelDeEspacio: 2 }),
    );
  });

  it("sin ningún espacio por encima del propio, no aparece el grupo de radios", async () => {
    vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({});
    montar(ESCUDO, [{ nivel: 1, actual: 3, max: 4 }]);

    fireEvent.click(screen.getByRole("button", { name: "Lanzar Escudo" }));
    expect(screen.queryByText("¿Con qué espacio?")).not.toBeInTheDocument();
  });

  // Fix round 3 — el conversor del catálogo no captura «un dardo más por nivel» de Proyectil
  // mágico, así que su `escalaPorEspacio` real es `false` aunque el SRD sí escale. El selector
  // tiene que aparecer IGUAL (hay un espacio de nivel 2 con usos) — la condición de visibilidad
  // nunca fue `escalaPorEspacio`, solo la frase de cada opción cambia con él, y sin escalado las
  // dos opciones (la propia incluida) dicen lo mismo: «igual que a nivel N».
  it("sin escalaPorEspacio pero con espacios de nivel 2, el grupo aparece igual y las dos opciones dicen «igual que a nivel 1»", async () => {
    vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({});
    montar({ ...PROYECTIL, escalaPorEspacio: false }, [
      { nivel: 1, actual: 2, max: 4 },
      { nivel: 2, actual: 2, max: 2 },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Lanzar Proyectil mágico" }));
    expect(
      await screen.findByRole("radio", { name: "Nivel 1 igual que a nivel 1 (quedan 2)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "Nivel 2 igual que a nivel 1 (quedan 2)" }),
    ).toBeInTheDocument();
  });
});

describe("LanzarConjuro — objetivos «varios», en combate", () => {
  beforeEach(() => {
    vi.spyOn(sessionsApi, "fetchCurrentSession").mockResolvedValue(SESION);
    vi.spyOn(encountersApi, "fetchCurrentEncounter").mockResolvedValue(
      encuentro([
        {
          id: "cb-maga",
          characterId: "p-maga",
          initiative: 20,
          position: 0,
          side: "ALLY",
          derrotado: false,
          ...ECONOMIA,
        },
        {
          id: "cb-goblin",
          characterId: "n-goblin",
          initiative: 15,
          position: 1,
          side: "ENEMY",
          derrotado: false,
          ...ECONOMIA,
        },
      ]),
    );
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([]);
    vi.spyOn(bestiarioApi, "fetchNpcs").mockResolvedValue([GOBLIN]);
  });

  it("abre la lista de combatientes; marcar «Goblin» y pulsar «Lanzar sobre 1» manda objetivos: [id]", async () => {
    const usar = vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({});
    montar(PROYECTIL, [{ nivel: 1, actual: 3, max: 4 }]);

    fireEvent.click(screen.getByRole("button", { name: "Lanzar Proyectil mágico" }));
    const casilla = await screen.findByRole("checkbox", { name: "Goblin" });
    fireEvent.click(casilla);

    const enviar = screen.getByRole("button", { name: "Lanzar sobre 1" });
    fireEvent.click(enviar);

    // Con un solo espacio disponible (el propio de nivel 1, en la lista) no hay elección que
    // hacer, así que el selector no aparece y `nivelDeEspacio` no viaja — el mismo criterio que
    // ya prueba el bloque de «Escudo» de arriba.
    await waitFor(() =>
      expect(usar).toHaveBeenCalledWith("c1", "p-maga", "spell:magic-missile", {
        objetivos: ["n-goblin"],
      }),
    );
  });

  it("«Lanzar sobre N» está apagado sin ningún objetivo marcado, y dice por qué (m-2)", async () => {
    vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({});
    montar(PROYECTIL, [{ nivel: 1, actual: 3, max: 4 }]);

    fireEvent.click(screen.getByRole("button", { name: "Lanzar Proyectil mágico" }));
    const enviar = await screen.findByRole("button", { name: "Lanzar sobre 0" });
    expect(enviar).toHaveAttribute("aria-disabled", "true");
    // D-CF-121: apagado con motivo, no escondido ni mudo.
    expect(enviar).toHaveAttribute("title", "Marca al menos un objetivo");
  });

  // Ola de arreglos (web I-2) — `useCombatientesDelEncuentro` excluye al propio personaje porque
  // nació para ataques; para cualquier otra mecánica el servidor acepta al propio actor
  // (D-CF-128: la curación y el daño a uno mismo siguen directos). Una clériga tiene que poder
  // lanzarse «Curar heridas» en pleno combate — el caso más frecuente de la mecánica.
  it("I-2: en combate, una entrada `dados` (Curar heridas) ofrece «Tú mismo» además de los combatientes", async () => {
    const usar = vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({});
    montar(CURAR, [{ nivel: 1, actual: 3, max: 4 }]);

    fireEvent.click(screen.getByRole("button", { name: "Lanzar Curar heridas" }));
    expect(await screen.findByRole("option", { name: "Goblin" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: "Tú mismo" }));

    await waitFor(() =>
      expect(usar).toHaveBeenCalledWith("c1", "p-maga", "spell:cure-wounds", {
        objetivos: ["p-maga"],
      }),
    );
  });

  it("I-2: en combate, un `ataque` (Rayo de fuego) NO ofrece «Tú mismo» — el servidor lo rechaza", async () => {
    vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({});
    montar(RAYO_DE_FUEGO, SIN_ESPACIOS);

    fireEvent.click(screen.getByRole("button", { name: "Lanzar Rayo de fuego" }));
    expect(await screen.findByRole("option", { name: "Goblin" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Tú mismo" })).not.toBeInTheDocument();
  });
});

describe("LanzarConjuro — el servidor avisa sin bloquear", () => {
  it("SIN_ESPACIO: «Sin espacios de nivel 1 — no se lanzó», con role=alert", async () => {
    vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({
      fueraDeRegla: ["SIN_ESPACIO"],
    });
    montar(TRUCO);
    // Reusa el truco (sin objetivo, sin espacio) solo para disparar sin ningún panel de por
    // medio: lo que se prueba es la lectura de la respuesta, no la composición de la petición.
    fireEvent.click(screen.getByRole("button", { name: "Lanzar Luz" }));

    const aviso = await screen.findByRole("alert");
    expect(aviso).toHaveTextContent("Sin espacios de nivel 0 — no se lanzó.");
  });

  // Ola de arreglos (m-1) — con SIN_ESPACIO el servidor manda también `aviso` («Sin usos de
  // «Espacios (nivel 1)»…»), y la pantalla lo pintaba debajo de su propia frase: dos veces lo
  // mismo. Se omite el `aviso` cuando `sinEspacio` ya lo dice.
  it("m-1: con SIN_ESPACIO, el `aviso` del servidor no se repite debajo", async () => {
    vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({
      fueraDeRegla: ["SIN_ESPACIO"],
      aviso: "Sin usos de «Espacios (nivel 1)» que gastar.",
    });
    montar(TRUCO);
    fireEvent.click(screen.getByRole("button", { name: "Lanzar Luz" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sin espacios de nivel 0 — no se lanzó.",
    );
    expect(
      screen.queryByText("Sin usos de «Espacios (nivel 1)» que gastar."),
    ).not.toBeInTheDocument();
  });

  it("un aviso del servidor se enseña en línea, sin bloquear el botón", async () => {
    vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({
      aviso: "Por encima del tope: el DM decide.",
    });
    montar(TRUCO);
    fireEvent.click(screen.getByRole("button", { name: "Lanzar Luz" }));

    expect(await screen.findByText("Por encima del tope: el DM decide.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lanzar Luz" })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("un verdict HIT se enseña con el mismo vocabulario que el cuadro de ataques", async () => {
    vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({ verdict: "HIT" });
    montar(TRUCO);
    fireEvent.click(screen.getByRole("button", { name: "Lanzar Luz" }));

    expect(await screen.findByText("Impacta")).toBeInTheDocument();
  });
});

describe("LanzarConjuro — encantar (T15, 3A.2): el objetivo es un arma del inventario", () => {
  it("con un arma equipada, elegirla manda itemId (no objetivos)", async () => {
    vi.spyOn(inventoryApi, "fetchInventory").mockResolvedValue({
      items: [filaDeArma("long-sword", "Espada larga")],
      purse: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      totalWeightOz: 0,
      carryCapacityOz: null,
      encumbrance: null,
    });
    const usar = vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({});
    montar(ARMA_MAGICA);

    fireEvent.click(screen.getByRole("button", { name: "Lanzar Arma mágica" }));
    const opcion = await screen.findByRole("option", { name: "Espada larga" });
    fireEvent.click(opcion);

    await waitFor(() =>
      expect(usar).toHaveBeenCalledWith("c1", "p-maga", "spell:magic-weapon", {
        itemId: "long-sword",
      }),
    );
  });

  // Ola de arreglos (m-4) — tras encantar, el chip «+1 · Arma mágica» de la pestaña Objetos
  // tardaba hasta 60 s (el sondeo de red de seguridad) en aparecer: la mutación no invalidaba
  // el inventario. Solo cuando se mandó `itemId`.
  it("m-4: tras encantar, se invalida el inventario del personaje", async () => {
    vi.spyOn(inventoryApi, "fetchInventory").mockResolvedValue({
      items: [filaDeArma("long-sword", "Espada larga")],
      purse: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      totalWeightOz: 0,
      carryCapacityOz: null,
      encumbrance: null,
    });
    vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({});
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidar = vi.spyOn(qc, "invalidateQueries");
    render(
      <QueryClientProvider client={qc}>
        <LanzarConjuro
          campaignId="c1"
          characterId="p-maga"
          entrada={ARMA_MAGICA}
          espacios={SIN_ESPACIOS}
        />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Lanzar Arma mágica" }));
    fireEvent.click(await screen.findByRole("option", { name: "Espada larga" }));

    await waitFor(() =>
      expect(invalidar).toHaveBeenCalledWith({ queryKey: inventoryKey("c1", "p-maga") }),
    );
  });

  it("sin ningún arma equipada, la lista lo dice y no hay nada que pulsar", async () => {
    montar(ARMA_MAGICA);

    fireEvent.click(screen.getByRole("button", { name: "Lanzar Arma mágica" }));
    expect(await screen.findByText("No llevas ningún arma equipada.")).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("un objeto que no es arma (una armadura equipada) no aparece en la lista", async () => {
    vi.spyOn(inventoryApi, "fetchInventory").mockResolvedValue({
      items: [
        filaDeArma("long-sword", "Espada larga"),
        {
          id: "shield",
          quantity: 1,
          location: "EQUIPPED",
          slot: "OFF_HAND",
          attuned: false,
          storedAt: null,
          note: null,
          item: {
            ref: "SRD:shield",
            source: "SRD",
            name: "Escudo",
            kind: "SHIELD",
            weightOz: 96,
            effects: [],
            requiresAttunement: false,
            attuned: false,
            armor: {
              category: "SHIELD",
              baseAc: 2,
              strengthRequirement: 0,
              stealthDisadvantage: false,
            },
          },
        },
      ],
      purse: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      totalWeightOz: 0,
      carryCapacityOz: null,
      encumbrance: null,
    });
    montar(ARMA_MAGICA);

    fireEvent.click(screen.getByRole("button", { name: "Lanzar Arma mágica" }));
    expect(await screen.findByRole("option", { name: "Espada larga" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Escudo" })).not.toBeInTheDocument();
  });

  it("con espacio de nivel superior disponible, manda itemId Y nivelDeEspacio juntos", async () => {
    vi.spyOn(inventoryApi, "fetchInventory").mockResolvedValue({
      items: [filaDeArma("long-sword", "Espada larga")],
      purse: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      totalWeightOz: 0,
      carryCapacityOz: null,
      encumbrance: null,
    });
    const usar = vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({});
    montar(ARMA_MAGICA, [
      { nivel: 2, actual: 2, max: 2 },
      { nivel: 4, actual: 1, max: 1 },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Lanzar Arma mágica" }));
    fireEvent.click(await screen.findByRole("radio", { name: /^Nivel 4/ }));
    fireEvent.click(screen.getByRole("option", { name: "Espada larga" }));

    await waitFor(() =>
      expect(usar).toHaveBeenCalledWith("c1", "p-maga", "spell:magic-weapon", {
        itemId: "long-sword",
        nivelDeEspacio: 4,
      }),
    );
  });
});
