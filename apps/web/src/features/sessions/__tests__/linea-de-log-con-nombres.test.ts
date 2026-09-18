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
    { id: "m", name: "Marta" },
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
    // Segundo ataque, de otra atacante: para probar que `sourceCharacterId` manda sobre
    // `rollEventId` cuando los dos vienen — si el origen saliera de la tirada por error, esta
    // frase diría «Marta» y no «Klarg».
    {
      id: "ev-atk-2",
      campaignId: "c1",
      sessionId: "s1",
      actorUserId: "u-dm",
      type: "ATTACK_RESOLVED",
      payload: {
        type: "ATTACK_RESOLVED",
        attackerId: "m",
        attackName: "Daga",
        verdict: "HIT",
        rollEventId: "roll-2",
      },
      subjectType: "character",
      subjectId: "s",
      visibility: "PLAYERS",
      createdAt: "2026-09-12T20:01:00.000Z",
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
    ).toBe("Sylas pierde 7 PG (20 → 13) (cortante) ← Klarg");
  });

  it("con rollEventId, el origen sale del ataque que la tirada resolvió", () => {
    expect(
      lineaDeLog(
        { type: "HP_CHANGED", delta: -7, from: 20, to: 13, rollEventId: "roll-1" },
        { sujeto: "Sylas", nombres },
      ),
    ).toBe("Sylas pierde 7 PG (20 → 13) ← ataque de Klarg");
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
    ).toBe("Sylas recupera 5 PG (10 → 15)");
  });

  describe("de dónde viene, con las dos citas y sus caídas", () => {
    it("con los dos campos, sourceCharacterId manda — no la tirada", () => {
      expect(
        lineaDeLog(
          {
            type: "HP_CHANGED",
            delta: -7,
            from: 20,
            to: 13,
            sourceCharacterId: "k",
            rollEventId: "roll-2", // de Marta — si esto ganara, diría «Marta»
          },
          { sujeto: "Sylas", nombres },
        ),
      ).toBe("Sylas pierde 7 PG (20 → 13) ← Klarg");
    });

    it("sourceCharacterId no visible: cae al atacante de la tirada citada", () => {
      expect(
        lineaDeLog(
          {
            type: "HP_CHANGED",
            delta: -7,
            from: 20,
            to: 13,
            sourceCharacterId: "oculto",
            rollEventId: "roll-1",
          },
          { sujeto: "Sylas", nombres },
        ),
      ).toBe("Sylas pierde 7 PG (20 → 13) ← ataque de Klarg");
    });

    it("se citó un origen y ninguno de los dos se puede nombrar: «Alguien», no silencio", () => {
      expect(
        lineaDeLog(
          { type: "HP_CHANGED", delta: -7, from: 20, to: 13, sourceCharacterId: "oculto" },
          { sujeto: "Sylas", nombres },
        ),
      ).toBe("Sylas pierde 7 PG (20 → 13) ← Alguien");
    });

    // Revisión final de la rama (2026-09-13). `rollEventId` cita CUALQUIER tirada, no solo un
    // ataque: la hoja cita «2d6 de caída» desde `PuntosDeGolpe` y esa tirada no tiene ningún
    // `ATTACK_RESOLVED` detrás. Con la versión anterior, «hay rollEventId» contaba como «se
    // citó un origen» y el daño salía con «← Alguien» — un atacante inventado para una caída.
    // «Alguien» solo cuando el DM citó a alguien a mano y este espectador no lo ve.
    it("tirada citada sin ataque → sin origen", () => {
      expect(
        lineaDeLog(
          { type: "HP_CHANGED", delta: -7, from: 20, to: 13, rollEventId: "roll-caida" },
          { sujeto: "Sylas", nombres },
        ),
      ).toBe("Sylas pierde 7 PG (20 → 13)");
    });
  });

  describe("sujetoEnCabecera: la cabecera ya dijo el nombre, la frase no lo repite", () => {
    it("HP_CHANGED omite el sujeto y arranca por el verbo", () => {
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
          { sujeto: "Sylas", sujetoEnCabecera: true, nombres },
        ),
      ).toBe("pierde 7 PG (20 → 13) (cortante) ← Klarg");
    });

    it("ATTACK_RESOLVED omite al atacante y conserva a quién ataca", () => {
      expect(
        lineaDeLog(
          {
            type: "ATTACK_RESOLVED",
            attackerId: "k",
            attackName: "Cimitarra",
            verdict: "HIT",
            rollEventId: "roll-1",
          },
          { sujeto: "Sylas", sujetoEnCabecera: true, nombres },
        ),
      ).toBe("ataca a Sylas con Cimitarra: impacta");
    });
  });
});
