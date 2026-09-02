import type { RuleEffect } from "@dnd/shared";
import { applyEffect } from "./effect-applier";
import { emptyWorld } from "./world";

// Los efectos son declarativos (§2.5 del diseño): aplicar el mismo efecto dos veces sobre el
// mismo mundo tiene que dejar exactamente el mismo estado. Es la prueba de idempotencia que
// exige la tarea, repetida sobre varios efectos representativos.

describe("effect-applier — idempotencia", () => {
  it("REVEAL_ENTITY aplicado dos veces deja la misma visibilidad y no duplica la revelación", () => {
    const effect: RuleEffect = {
      kind: "REVEAL_ENTITY",
      entityId: "clentity000000000000000001",
      visibility: "PLAYERS",
    };
    const world0 = emptyWorld({ entityExists: { [effect.entityId]: true } });

    const first = applyEffect(effect, world0);
    const second = applyEffect(effect, first.world);

    expect(second.world.entityVisibility[effect.entityId]).toBe("PLAYERS");
    expect(second.world.revealedEntityIds).toEqual([effect.entityId]); // no se duplica
    expect(second.world.entityVisibility).toEqual(first.world.entityVisibility);
    expect(second.world.revealedEntityIds).toEqual(first.world.revealedEntityIds);
  });

  it("CHANGE_SET_MEMBER (ADD) aplicado dos veces no duplica el miembro", () => {
    const effect: RuleEffect = {
      kind: "CHANGE_SET_MEMBER",
      setKey: "llaves",
      action: "ADD",
      memberType: "entity",
      memberId: "clentity000000000000000002",
    };
    const world0 = emptyWorld();

    const first = applyEffect(effect, world0);
    const second = applyEffect(effect, first.world);

    expect(second.world.sets.llaves).toEqual([{ memberType: "entity", memberId: effect.memberId }]);
    expect(second.world.sets).toEqual(first.world.sets);
  });

  it("SET_FLAG aplicado dos veces con el mismo valor deja el mismo estado", () => {
    const effect: RuleEffect = { kind: "SET_FLAG", key: "puente-caido", value: true };
    const world0 = emptyWorld();

    const first = applyEffect(effect, world0);
    const second = applyEffect(effect, first.world);

    expect(second.world.flags).toEqual({ "puente-caido": true });
    expect(second.world.flags).toEqual(first.world.flags);
  });

  it("ADD_SESSION_NOTE aplicado dos veces con la misma nota no la repite", () => {
    const effect: RuleEffect = { kind: "ADD_SESSION_NOTE", note: "El barril explotó." };
    const world0 = emptyWorld();

    const first = applyEffect(effect, world0);
    const second = applyEffect(effect, first.world);

    expect(second.world.sessionNotes).toEqual(["El barril explotó."]);
  });
});

describe("effect-applier — encadenamiento (§2.1)", () => {
  it("REVEAL_ENTITY produce un suceso ENTITY_REVEALED para encadenar", () => {
    const effect: RuleEffect = {
      kind: "REVEAL_ENTITY",
      entityId: "clentity000000000000000003",
      visibility: "PLAYERS",
    };
    const { application } = applyEffect(effect, emptyWorld());
    expect(application.chainEvent).toEqual({ kind: "ENTITY_REVEALED", entityId: effect.entityId });
  });

  it("SET_FLAG produce un suceso FLAG_SET para encadenar", () => {
    const effect: RuleEffect = { kind: "SET_FLAG", key: "x", value: true };
    const { application } = applyEffect(effect, emptyWorld());
    expect(application.chainEvent).toEqual({ kind: "FLAG_SET", key: "x" });
  });

  it("RAISE_SIGNAL produce un suceso SIGNAL_RAISED para encadenar", () => {
    const effect: RuleEffect = { kind: "RAISE_SIGNAL", key: "explosion" };
    const { application } = applyEffect(effect, emptyWorld());
    expect(application.chainEvent).toEqual({ kind: "SIGNAL_RAISED", key: "explosion" });
  });

  it("HIDE_ENTITY no encadena — no está en la lista de efectos que producen suceso", () => {
    const effect: RuleEffect = {
      kind: "HIDE_ENTITY",
      entityId: "clentity000000000000000004",
      visibility: "DM_ONLY",
    };
    const { application } = applyEffect(effect, emptyWorld());
    expect(application.chainEvent).toBeUndefined();
  });

  it("guarda el antes y el después — sin eso no se puede deshacer", () => {
    const effect: RuleEffect = {
      kind: "REVEAL_ENTITY",
      entityId: "clentity000000000000000005",
      visibility: "PLAYERS",
    };
    const world0 = emptyWorld({ entityVisibility: { [effect.entityId]: "DM_ONLY" } });
    const { application } = applyEffect(effect, world0);
    expect(application.before).toBe("DM_ONLY");
    expect(application.after).toBe("PLAYERS");
  });
});
