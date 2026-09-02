import type { RuleCondition, RuleTrigger } from "@dnd/shared";
import { evaluateCondition } from "./condition-evaluator";
import { emptyWorld } from "./world";

const RULE_ID = "regla-1";
const NO_EVENT: RuleTrigger = { kind: "SESSION_STARTED" };

describe("condition-evaluator — las ocho condiciones del vocabulario", () => {
  it("FLAG_IS compara el valor exacto, y una marca ausente cuenta como no puesta", () => {
    const c: RuleCondition = { kind: "FLAG_IS", key: "x", value: true };
    expect(evaluateCondition(c, NO_EVENT, emptyWorld(), RULE_ID)).toBe(false);
    expect(evaluateCondition(c, NO_EVENT, emptyWorld({ flags: { x: true } }), RULE_ID)).toBe(true);
    expect(evaluateCondition(c, NO_EVENT, emptyWorld({ flags: { x: false } }), RULE_ID)).toBe(
      false,
    );
  });

  it("SET_SIZE_AT_LEAST cuenta los elementos del conjunto", () => {
    const c: RuleCondition = { kind: "SET_SIZE_AT_LEAST", setKey: "llaves", count: 3 };
    const world = emptyWorld({
      sets: {
        llaves: [
          { memberType: "entity", memberId: "a" },
          { memberType: "entity", memberId: "b" },
        ],
      },
    });
    expect(evaluateCondition(c, NO_EVENT, world, RULE_ID)).toBe(false);
    world.sets.llaves.push({ memberType: "entity", memberId: "c" });
    expect(evaluateCondition(c, NO_EVENT, world, RULE_ID)).toBe(true);
  });

  it("IS_IN_SET también acumula personas, no solo cosas", () => {
    const c: RuleCondition = {
      kind: "IS_IN_SET",
      setKey: "vieron-el-cuerpo",
      memberType: "user",
      memberId: "u1",
    };
    const world = emptyWorld({
      sets: { "vieron-el-cuerpo": [{ memberType: "user", memberId: "u1" }] },
    });
    expect(evaluateCondition(c, NO_EVENT, world, RULE_ID)).toBe(true);
    expect(evaluateCondition({ ...c, memberId: "u2" }, NO_EVENT, world, RULE_ID)).toBe(false);
  });

  it("ALL_PLAYERS_PRESENT lee directamente el mundo", () => {
    const c: RuleCondition = { kind: "ALL_PLAYERS_PRESENT" };
    expect(evaluateCondition(c, NO_EVENT, emptyWorld({ allPlayersPresent: false }), RULE_ID)).toBe(
      false,
    );
    expect(evaluateCondition(c, NO_EVENT, emptyWorld({ allPlayersPresent: true }), RULE_ID)).toBe(
      true,
    );
  });

  it("SUBJECT_HAS_TAG mira la ficha del propio suceso, no un objetivo de la regla", () => {
    const c: RuleCondition = { kind: "SUBJECT_HAS_TAG", tag: "pista" };
    const event: RuleTrigger = { kind: "ENTITY_OPENED", entityId: "e1" };
    const world = emptyWorld({ entityTags: { e1: ["pista"] } });
    expect(evaluateCondition(c, event, world, RULE_ID)).toBe(true);
    expect(evaluateCondition(c, NO_EVENT, world, RULE_ID)).toBe(false); // sin entityId en el suceso
  });

  it("REVEALED_WITH_TAG_AT_LEAST cuenta solo las fichas reveladas con esa etiqueta", () => {
    const c: RuleCondition = { kind: "REVEALED_WITH_TAG_AT_LEAST", tag: "pista", count: 2 };
    const world = emptyWorld({
      revealedEntityIds: ["e1", "e2", "e3"],
      entityTags: { e1: ["pista"], e2: ["pista"], e3: ["otra"] },
    });
    expect(evaluateCondition(c, NO_EVENT, world, RULE_ID)).toBe(true);
    expect(evaluateCondition({ ...c, count: 3 }, NO_EVENT, world, RULE_ID)).toBe(false);
  });

  it("SESSION_NUMBER_AT_LEAST exige sesión en curso: sin ella nunca se cumple", () => {
    const c: RuleCondition = { kind: "SESSION_NUMBER_AT_LEAST", count: 3 };
    expect(evaluateCondition(c, NO_EVENT, emptyWorld({ sessionNumber: null }), RULE_ID)).toBe(
      false,
    );
    expect(evaluateCondition(c, NO_EVENT, emptyWorld({ sessionNumber: 2 }), RULE_ID)).toBe(false);
    expect(evaluateCondition(c, NO_EVENT, emptyWorld({ sessionNumber: 3 }), RULE_ID)).toBe(true);
  });

  it("NEVER_FIRED es el «once» de Ink: solo se cumple si la propia regla no se ha disparado", () => {
    const c: RuleCondition = { kind: "NEVER_FIRED" };
    expect(evaluateCondition(c, NO_EVENT, emptyWorld(), RULE_ID)).toBe(true);
    expect(
      evaluateCondition(c, NO_EVENT, emptyWorld({ ruleFireCounts: { [RULE_ID]: 1 } }), RULE_ID),
    ).toBe(false);
    // Es por regla: que otra se haya disparado no afecta a esta.
    expect(
      evaluateCondition(c, NO_EVENT, emptyWorld({ ruleFireCounts: { otra: 5 } }), RULE_ID),
    ).toBe(true);
  });
});
