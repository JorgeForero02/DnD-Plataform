import { describe, expect, it } from "vitest";
import { lineaDeLog } from "../linea-de-log";

// **Ningún valor de enumeración llega a la pantalla** (docs/04-convenciones.md), y el registro de
// la mesa lo incumplía: imprimía `Recibe la condición «poisoned»` y `El DM fija maxHp en 40`,
// delante de jugadores que leen esa columna en castellano.
//
// Lo que aquí NO se traduce, y por qué: `FLAG_SET`, `SIGNAL_RAISED` y `SET_CHANGED` llevan claves
// **que escribe el DM** al montar sus reglas (`apps/api/src/rules-engine`, `world-state.service`).
// No son enumeraciones: no hay lista cerrada que traducir, e inventarles una traducción sería
// mentir sobre lo que el DM escribió. Se imprimen tal cual, entre comillas, a propósito.

describe("el registro no imprime claves de enumeración", () => {
  it("una condición se dice por su nombre, no por su clave del SRD", () => {
    expect(lineaDeLog({ type: "CONDITION_APPLIED", key: "poisoned" })).toBe(
      "Recibe la condición «Envenenado»",
    );
    expect(lineaDeLog({ type: "CONDITION_APPLIED", key: "exhaustion", level: 3 })).toBe(
      "Recibe la condición «Agotamiento», nivel 3",
    );
    expect(lineaDeLog({ type: "CONDITION_REMOVED", key: "restrained" })).toBe(
      "Se le quita la condición «Apresado»",
    );
  });

  it("una condición que no conocemos se ve como tal en vez de colarse en inglés", () => {
    expect(lineaDeLog({ type: "CONDITION_APPLIED", key: "inventada" })).toContain(
      "Sin traducir: inventada",
    );
  });

  it("la anulación del DM nombra el valor derivado, no su clave", () => {
    expect(
      lineaDeLog({ type: "MANUAL_OVERRIDE_SET", target: "maxHp", value: 40, previous: 38 }),
    ).toBe("El DM fija Puntos de golpe máximos en 40 (antes 38)");
    expect(lineaDeLog({ type: "MANUAL_OVERRIDE_SET", target: "speed.walk", value: 40 })).toBe(
      "El DM fija Velocidad al caminar en 40",
    );
    expect(lineaDeLog({ type: "MANUAL_OVERRIDE_SET", target: "inventado", value: 1 })).toContain(
      "Sin traducir: inventado",
    );
  });

  it("las claves que escribe el DM en sus reglas se citan tal cual: no hay nada que traducir", () => {
    expect(lineaDeLog({ type: "FLAG_SET", key: "puerta-del-faro", value: true })).toBe(
      "Marca «puerta-del-faro» puesta",
    );
    expect(
      lineaDeLog({
        type: "SET_CHANGED",
        setKey: "aliados-del-puerto",
        action: "ADDED",
        memberType: "character",
        memberId: "p1",
      }),
    ).toBe("Entra en el conjunto «aliados-del-puerto»");
    expect(lineaDeLog({ type: "SIGNAL_RAISED", key: "alarma" })).toBe("Se lanza la señal «alarma»");
  });
});
