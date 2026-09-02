import { MAX_RULE_CHAIN_DEPTH } from "@dnd/shared";
import { runEngine } from "./engine";
import type { EngineRule } from "./types";
import { emptyWorld } from "./world";

const DM = "dm-1";

function rule(
  overrides: Partial<EngineRule> & Pick<EngineRule, "id" | "trigger" | "effects">,
): EngineRule {
  return {
    version: 1,
    name: "regla de prueba",
    createdById: DM,
    mode: "AUTOMATIC",
    status: "ARMED",
    conditions: [],
    maxFires: null,
    ...overrides,
  };
}

describe("runEngine — encadenamiento y su tope (§2.1)", () => {
  it("una cadena de barriles se propaga sola: cada señal dispara al siguiente barril", () => {
    // Tres reglas, una por barril: cada una escucha la señal del anterior y lanza la suya.
    const barrilA: EngineRule = rule({
      id: "barril-a",
      trigger: { kind: "ENTITY_ATTACKED", entityId: "barril-a" },
      effects: [{ kind: "RAISE_SIGNAL", key: "explosion-a" }],
    });
    const barrilB: EngineRule = rule({
      id: "barril-b",
      trigger: { kind: "SIGNAL_RAISED", key: "explosion-a" },
      effects: [{ kind: "RAISE_SIGNAL", key: "explosion-b" }],
    });
    const barrilC: EngineRule = rule({
      id: "barril-c",
      trigger: { kind: "SIGNAL_RAISED", key: "explosion-b" },
      effects: [{ kind: "SET_FLAG", key: "todos-explotaron", value: true }],
    });

    const result = runEngine(
      [barrilA, barrilB, barrilC],
      { kind: "ENTITY_ATTACKED", entityId: "barril-a" },
      emptyWorld(),
    );

    expect(result.world.flags["todos-explotaron"]).toBe(true);
    expect(result.traces.map((t) => t.ruleId)).toEqual(["barril-a", "barril-b", "barril-c"]);
    expect(result.traces.every((t) => t.status === "APPLIED")).toBe(true);
    expect(result.traces.map((t) => t.depth)).toEqual([1, 2, 3]);
  });

  it("una cadena que se muerde la cola se corta en el salto 11 y queda escrito en la traza", () => {
    // Una única regla que, al dispararse, vuelve a lanzar la misma señal que la dispara: una
    // recursión infinita si nada la parase.
    const bucle: EngineRule = rule({
      id: "bucle",
      trigger: { kind: "SIGNAL_RAISED", key: "otra-vez" },
      effects: [{ kind: "RAISE_SIGNAL", key: "otra-vez" }],
    });

    const result = runEngine([bucle], { kind: "SIGNAL_RAISED", key: "otra-vez" }, emptyWorld());

    const stopped = result.traces.filter((t) => t.status === "STOPPED");
    expect(stopped).toHaveLength(1);
    expect(stopped[0].depth).toBe(MAX_RULE_CHAIN_DEPTH + 1);
    expect(stopped[0].reason).toMatch(/tope/i);

    // Se disparó exactamente en los saltos 1..10 — el salto 11 es el que se corta.
    const applied = result.traces.filter((t) => t.status === "APPLIED");
    expect(applied).toHaveLength(MAX_RULE_CHAIN_DEPTH);
  });
});

describe("runEngine — conflicto por especificidad empatada (§2.6)", () => {
  it("dos reglas con el mismo número de condiciones para el mismo suceso se marcan CONFLICT, y ninguna se aplica", () => {
    const reglaX: EngineRule = rule({
      id: "regla-x",
      trigger: { kind: "ENTITY_OPENED", entityId: "muro" },
      conditions: [{ kind: "FLAG_IS", key: "de-dia", value: true }],
      effects: [{ kind: "SET_FLAG", key: "efecto-x", value: true }],
    });
    const reglaY: EngineRule = rule({
      id: "regla-y",
      trigger: { kind: "ENTITY_OPENED", entityId: "muro" },
      conditions: [{ kind: "ALL_PLAYERS_PRESENT" }],
      effects: [{ kind: "SET_FLAG", key: "efecto-y", value: true }],
    });

    const world = emptyWorld({ flags: { "de-dia": true }, allPlayersPresent: true });
    const result = runEngine([reglaX, reglaY], { kind: "ENTITY_OPENED", entityId: "muro" }, world);

    expect(result.traces).toHaveLength(1);
    expect(result.traces[0].status).toBe("CONFLICT");
    expect(result.traces[0].conflictingRuleIds?.sort()).toEqual(["regla-x", "regla-y"]);
    // Ninguna se aplicó: el mundo no cambió.
    expect(result.world.flags["efecto-x"]).toBeUndefined();
    expect(result.world.flags["efecto-y"]).toBeUndefined();
  });

  it("con más condiciones gana la más específica — no hay conflicto si no hay empate", () => {
    const general: EngineRule = rule({
      id: "general",
      trigger: { kind: "ENTITY_OPENED", entityId: "muro" },
      conditions: [],
      effects: [{ kind: "SET_FLAG", key: "generico", value: true }],
    });
    const especifica: EngineRule = rule({
      id: "especifica",
      trigger: { kind: "ENTITY_OPENED", entityId: "muro" },
      conditions: [{ kind: "ALL_PLAYERS_PRESENT" }],
      effects: [{ kind: "SET_FLAG", key: "especifico", value: true }],
    });

    const result = runEngine(
      [general, especifica],
      { kind: "ENTITY_OPENED", entityId: "muro" },
      emptyWorld({ allPlayersPresent: true }),
    );

    expect(result.traces).toHaveLength(1);
    expect(result.traces[0].ruleId).toBe("especifica");
    expect(result.world.flags.especifico).toBe(true);
    expect(result.world.flags.generico).toBeUndefined();
  });
});

describe("runEngine — la traza registra la condición evaluada y con qué dato (punto 5 de la autoridad)", () => {
  it("una traza APPLIED lleva qué condiciones se miraron y el valor observado del mundo", () => {
    const r: EngineRule = rule({
      id: "con-condiciones",
      trigger: { kind: "ENTITY_OPENED", entityId: "muro" },
      conditions: [
        { kind: "SET_SIZE_AT_LEAST", setKey: "llaves", count: 2 },
        { kind: "ALL_PLAYERS_PRESENT" },
      ],
      effects: [{ kind: "SET_FLAG", key: "x", value: true }],
    });
    const world = emptyWorld({
      allPlayersPresent: true,
      sets: {
        llaves: [
          { memberType: "entity", memberId: "a" },
          { memberType: "entity", memberId: "b" },
        ],
      },
    });

    const result = runEngine([r], { kind: "ENTITY_OPENED", entityId: "muro" }, world);

    expect(result.traces[0].status).toBe("APPLIED");
    expect(result.traces[0].conditions).toEqual([
      {
        condition: { kind: "SET_SIZE_AT_LEAST", setKey: "llaves", count: 2 },
        result: true,
        observed: 2,
      },
      { condition: { kind: "ALL_PLAYERS_PRESENT" }, result: true, observed: true },
    ]);
  });
});

describe("runEngine — modo propuesta, la batuta marca y no toca (§2.8)", () => {
  it("una regla PROPOSAL no cambia el mundo: solo queda una traza PROPOSED con el antes y el después", () => {
    const propuesta: EngineRule = rule({
      id: "propone-revelar",
      mode: "PROPOSAL",
      trigger: { kind: "ENTITY_OPENED", entityId: "muro" },
      effects: [{ kind: "REVEAL_ENTITY", entityId: "camino-secreto", visibility: "PLAYERS" }],
    });

    const world0 = emptyWorld({ entityExists: { "camino-secreto": true } });
    const result = runEngine([propuesta], { kind: "ENTITY_OPENED", entityId: "muro" }, world0);

    expect(result.traces).toHaveLength(1);
    expect(result.traces[0].status).toBe("PROPOSED");
    expect(result.traces[0].effects?.[0]).toMatchObject({ before: null, after: "PLAYERS" });
    // El mundo NO cambió: la propuesta no reveló nada.
    expect(result.world.entityVisibility["camino-secreto"]).toBeUndefined();
    // Y no encadena: nada dependía de ENTITY_REVEALED porque no llegó a ocurrir.
    expect(result.traces.filter((t) => t.event.kind === "ENTITY_REVEALED")).toHaveLength(0);
  });
});

describe("runEngine — objetivo fijado al armar, nunca al disparar (regla de autoridad #1)", () => {
  it("el efecto revela exactamente la ficha que el DM fijó en la regla, no una que traiga el suceso", () => {
    const r: EngineRule = rule({
      id: "objetivo-fijo",
      trigger: { kind: "ENTITY_OPENED", entityId: "muro-agrietado" },
      effects: [{ kind: "REVEAL_ENTITY", entityId: "camino-secreto-fijo", visibility: "PLAYERS" }],
    });
    const world0 = emptyWorld({ entityExists: { "camino-secreto-fijo": true } });
    const result = runEngine([r], { kind: "ENTITY_OPENED", entityId: "muro-agrietado" }, world0);
    expect(Object.keys(result.world.entityVisibility)).toEqual(["camino-secreto-fijo"]);
  });
});

describe("runEngine — contención (punto 6 de la autoridad)", () => {
  it("con el interruptor de campaña apagado, nada dispara", () => {
    const r: EngineRule = rule({
      id: "cualquiera",
      trigger: { kind: "ENTITY_OPENED", entityId: "muro" },
      effects: [{ kind: "SET_FLAG", key: "x", value: true }],
    });
    const result = runEngine(
      [r],
      { kind: "ENTITY_OPENED", entityId: "muro" },
      emptyWorld({ rulesEnabled: false }),
    );
    expect(result.traces).toHaveLength(1);
    expect(result.traces[0].status).toBe("STOPPED");
    expect(result.world.flags.x).toBeUndefined();
  });

  it("una regla que ya agotó su maxFires no vuelve a dispararse", () => {
    const r: EngineRule = rule({
      id: "limitada",
      maxFires: 2,
      trigger: { kind: "ENTITY_OPENED", entityId: "muro" },
      effects: [{ kind: "SET_FLAG", key: "x", value: true }],
    });
    const result = runEngine(
      [r],
      { kind: "ENTITY_OPENED", entityId: "muro" },
      emptyWorld({ ruleFireCounts: { limitada: 2 } }),
    );
    expect(result.traces).toHaveLength(0);
  });

  it("un objetivo que ya no existe deja la regla BROKEN, con motivo, y no aplica nada", () => {
    const r: EngineRule = rule({
      id: "rota",
      trigger: { kind: "ENTITY_OPENED", entityId: "muro" },
      effects: [{ kind: "REVEAL_ENTITY", entityId: "ya-no-existe", visibility: "PLAYERS" }],
    });
    const result = runEngine(
      [r],
      { kind: "ENTITY_OPENED", entityId: "muro" },
      emptyWorld({ entityExists: { "ya-no-existe": false } }),
    );
    expect(result.brokenRules).toEqual([
      { ruleId: "rota", reason: expect.stringContaining("ya-no-existe") },
    ]);
    expect(result.world.entityVisibility["ya-no-existe"]).toBeUndefined();
  });

  it("SET_RULE_ARMED desarma una regla antes de que le llegue su propio suceso, en la misma cascada", () => {
    const desarmadora: EngineRule = rule({
      id: "desarmadora",
      trigger: { kind: "FLAG_SET", key: "arranque" },
      effects: [
        { kind: "SET_RULE_ARMED", ruleId: "victima", armed: false },
        { kind: "RAISE_SIGNAL", key: "siguiente-paso" },
      ],
    });
    const victima: EngineRule = rule({
      id: "victima",
      trigger: { kind: "SIGNAL_RAISED", key: "siguiente-paso" },
      effects: [{ kind: "SET_FLAG", key: "no-deberia-pasar", value: true }],
    });

    const result = runEngine(
      [desarmadora, victima],
      { kind: "FLAG_SET", key: "arranque" },
      emptyWorld(),
    );

    expect(result.world.ruleArmed.victima).toBe(false);
    // La señal encadenada llegó, pero "victima" ya estaba desarmada: no se aplicó su efecto.
    expect(result.world.flags["no-deberia-pasar"]).toBeUndefined();
    expect(result.traces.map((t) => t.ruleId)).toEqual(["desarmadora"]);
  });
});
