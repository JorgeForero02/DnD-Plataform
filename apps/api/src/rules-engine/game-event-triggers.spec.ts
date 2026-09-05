import { GameEventBridge } from "./game-event-bridge";
import { triggersDe, type SucesoRegistrado } from "./game-event-triggers";
import type { RulesEngineService } from "./rules-engine.service";

const suceso = (payload: SucesoRegistrado["payload"], subjectId = "ent1"): SucesoRegistrado => ({
  type: payload.type,
  subjectType: "campaign",
  subjectId,
  payload,
});

const tirada = (extra: Record<string, unknown>) =>
  suceso({
    type: "ABILITY_ROLL",
    expression: "1d20",
    rolls: [20],
    kept: [20],
    dropped: [],
    modifier: 0,
    total: 20,
    natural: "NONE",
    outcome: "NO_DC",
    ...extra,
  } as SucesoRegistrado["payload"]);

describe("traducir un suceso del log al vocabulario del motor", () => {
  it("una tirada que es 20 natural Y falla produce LOS DOS disparadores", () => {
    // El error que esta función existe para no cometer. Una regla armada sobre el 20 natural y
    // otra sobre el fallo tienen que dispararse las dos: son hechos distintos.
    const r = triggersDe(tirada({ natural: "TWENTY", outcome: "FAILURE", dc: 25 }));

    expect(r).toHaveLength(2);
    expect(r).toContainEqual({ kind: "ABILITY_ROLL", outcome: "NATURAL_TWENTY" });
    expect(r).toContainEqual({ kind: "ABILITY_ROLL", outcome: "FAILURE" });
  });

  it("un 1 natural que aun así supera la CD también produce los dos", () => {
    const r = triggersDe(tirada({ natural: "ONE", outcome: "SUCCESS", dc: 1 }));

    expect(r).toContainEqual({ kind: "ABILITY_ROLL", outcome: "NATURAL_ONE" });
    expect(r).toContainEqual({ kind: "ABILITY_ROLL", outcome: "SUCCESS" });
  });

  it("sin CD no hay ni éxito ni fallo que disparar, solo lo natural", () => {
    const r = triggersDe(tirada({ natural: "TWENTY", outcome: "NO_DC" }));

    expect(r).toEqual([{ kind: "ABILITY_ROLL", outcome: "NATURAL_TWENTY" }]);
  });

  it("una tirada del montón no dispara nada", () => {
    expect(triggersDe(tirada({}))).toEqual([]);
  });

  it("la habilidad viaja como `skill` cuando el motivo la nombra", () => {
    const r = triggersDe(tirada({ outcome: "SUCCESS", dc: 10, reason: "sigilo" }));

    expect(r).toEqual([{ kind: "ABILITY_ROLL", skill: "sigilo", outcome: "SUCCESS" }]);
  });

  it("abrir y revelar una ficha usan el sujeto del evento como entidad", () => {
    expect(triggersDe(suceso({ type: "ENTITY_OPENED", entityType: "npc" }, "e9"))).toEqual([
      { kind: "ENTITY_OPENED", entityId: "e9" },
    ]);
    expect(triggersDe(suceso({ type: "ENTITY_REVEALED" }, "e9"))).toEqual([
      { kind: "ENTITY_REVEALED", entityId: "e9" },
    ]);
  });

  it("banderas, señales y enlaces llevan su clave", () => {
    expect(triggersDe(suceso({ type: "FLAG_SET", key: "puerta", value: true }))).toEqual([
      { kind: "FLAG_SET", key: "puerta" },
    ]);
    expect(triggersDe(suceso({ type: "SIGNAL_RAISED", key: "alarma" }))).toEqual([
      { kind: "SIGNAL_RAISED", key: "alarma" },
    ]);
    expect(triggersDe(suceso({ type: "ENTITY_LINKED", fromId: "a", toId: "b" }))).toEqual([
      { kind: "ENTITY_LINKED", fromId: "a", toId: "b" },
    ]);
  });

  // **Ola 3.** Los dos que el editor ofrecia y el motor no podia cumplir. No les faltaba un
  // `case`: no existian como suceso, asi que una regla armada sobre ellos no llegaba nunca.
  it("comentar una ficha y entrar en la campana llegan al motor", () => {
    expect(
      triggersDe(suceso({ type: "ENTITY_COMMENTED", entityId: "e4", entityName: "Torre Gris" })),
    ).toEqual([{ kind: "ENTITY_COMMENTED", entityId: "e4" }]);
    expect(triggersDe(suceso({ type: "MEMBER_JOINED", displayName: "Nerith" }))).toEqual([
      { kind: "MEMBER_JOINED" },
    ]);
  });

  // La entidad del comentario sale de su `payload`, **no del sujeto**: el sujeto de ese suceso es
  // la campana, porque el comentario cuelga de una ficha y no al reves.
  it("el comentario lleva la ficha comentada, no el sujeto del suceso", () => {
    expect(
      triggersDe(suceso({ type: "ENTITY_COMMENTED", entityId: "LA-FICHA" }, "OTRO-SUJETO")),
    ).toEqual([{ kind: "ENTITY_COMMENTED", entityId: "LA-FICHA" }]);
  });

  it("un suceso que el vocabulario cerrado no cubre no inventa disparador", () => {
    expect(triggersDe(suceso({ type: "REST_DECLARED", rest: "LONG" }))).toEqual([]);
  });
});

describe("el puente entre el log y el motor", () => {
  const montar = () => {
    const engine = { evaluate: jest.fn().mockResolvedValue({}) };
    return { engine, bridge: new GameEventBridge(engine as unknown as RulesEngineService) };
  };

  it("evalúa una vez por disparador, con la campaña y el actor del suceso", async () => {
    const { engine, bridge } = montar();

    await bridge.alRegistrarse({
      ...tirada({ natural: "TWENTY", outcome: "FAILURE", dc: 25 }),
      campaignId: "c1",
      actorUserId: "u1",
      fromRulesEngine: false,
    });

    expect(engine.evaluate).toHaveBeenCalledTimes(2);
    expect(engine.evaluate).toHaveBeenCalledWith("c1", expect.anything(), "u1");
  });

  it("NO evalúa lo que escribió el propio motor — es el corte del bucle infinito", async () => {
    const { engine, bridge } = montar();

    await bridge.alRegistrarse({
      ...suceso({ type: "ENTITY_REVEALED" }),
      campaignId: "c1",
      actorUserId: "u1",
      fromRulesEngine: true,
    });

    expect(engine.evaluate).not.toHaveBeenCalled();
  });

  it("una regla que revienta no revienta la escritura que la disparó", async () => {
    const { engine, bridge } = montar();
    engine.evaluate.mockRejectedValue(new Error("regla rota"));

    await expect(
      bridge.alRegistrarse({
        ...suceso({ type: "FLAG_SET", key: "k", value: true }),
        campaignId: "c1",
        actorUserId: "u1",
        fromRulesEngine: false,
      }),
    ).resolves.toBeUndefined();
  });
});
