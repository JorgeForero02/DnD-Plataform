import { describe, expect, it } from "vitest";
import { lineaDeLog } from "../linea-de-log";
import { nombresDelHilo } from "../nombres-del-hilo";
import type { GameEventRow } from "../log-api";

// Tarea 11 del pulido (C4, #15). **El hilo habla de personajes, no de ids** — quién recibió el
// daño, de quién viene y quién lo lanzó, con «Alguien» cuando `canView` no se lo manda a este
// espectador. `lineaDeLog(p)` de un solo argumento sigue sin tocarse:
// `linea-de-log-sin-claves.test.ts` prueba justo eso, que las frases de siempre no cambian.

const nombres = nombresDelHilo(
  [
    { id: "k", name: "Klarg" },
    { id: "s", name: "Sylas" },
  ],
  [
    {
      id: "ev-atk",
      campaignId: "c1",
      sessionId: "s1",
      actorUserId: "u-dm",
      type: "ATTACK_RESOLVED",
      payload: {
        type: "ATTACK_RESOLVED",
        attackerId: "k",
        attackName: "Cimitarra",
        verdict: "HIT",
        rollEventId: "roll-1",
      },
      subjectType: "character",
      subjectId: "s",
      visibility: "PLAYERS",
      createdAt: "2026-09-12T20:00:00.000Z",
    } as GameEventRow,
  ],
);

describe("el hilo, con nombres", () => {
  it("el daño nombra a quien lo recibe y de quién viene", () => {
    expect(
      lineaDeLog(
        {
          type: "HP_CHANGED",
          delta: -7,
          from: 20,
          to: 13,
          damageType: "SLASHING",
          sourceCharacterId: "k",
        },
        { sujeto: "Sylas", nombres },
      ),
    ).toBe("Sylas pierde 7 PG (cortante) ← Klarg");
  });

  it("con rollEventId, el origen sale del ataque que la tirada resolvió", () => {
    expect(
      lineaDeLog(
        { type: "HP_CHANGED", delta: -7, from: 20, to: 13, rollEventId: "roll-1" },
        { sujeto: "Sylas", nombres },
      ),
    ).toBe("Sylas pierde 7 PG ← ataque de Klarg");
  });

  it("el ataque nombra atacante y objetivo", () => {
    expect(
      lineaDeLog(
        {
          type: "ATTACK_RESOLVED",
          attackerId: "k",
          attackName: "Cimitarra",
          verdict: "HIT",
          rollEventId: "roll-1",
        },
        { sujeto: "Sylas", nombres },
      ),
    ).toBe("Klarg ataca a Sylas con Cimitarra: impacta");
  });

  it("sin contexto, las frases de siempre", () => {
    expect(lineaDeLog({ type: "HP_CHANGED", delta: -7, from: 20, to: 13 })).toBe(
      "Pierde 7 PG (20 → 13)",
    );
  });

  it("un atacante que no ves es «Alguien»", () => {
    expect(
      lineaDeLog(
        {
          type: "ATTACK_RESOLVED",
          attackerId: "oculto",
          attackName: "Garra",
          verdict: "MISS",
          rollEventId: "r",
        },
        { sujeto: "Sylas", nombres },
      ),
    ).toBe("Alguien ataca a Sylas con Garra: falla");
  });

  it("recuperar PG con ctx dice «recupera», no «pierde»", () => {
    expect(
      lineaDeLog({ type: "HP_CHANGED", delta: 5, from: 10, to: 15 }, { sujeto: "Sylas", nombres }),
    ).toBe("Sylas recupera 5 PG");
  });
});
