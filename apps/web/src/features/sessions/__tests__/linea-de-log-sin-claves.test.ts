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

// **La unión cerrada** (ficha L1). Estos catorce tipos salían en la mesa como
// `Sin traducir: ITEM_ADDED` — no por descuido, sino porque el carril del motor los añadía y no
// podía tocar `apps/web`. Ahora el `switch` no tiene `default`, así que el que venga después
// rompe el build en vez de aparecer en el registro delante de los jugadores.
describe("los catorce tipos que el motor añadió y nadie tradujo", () => {
  it("el botín y el inventario se leen en castellano, con su zona y su ranura", () => {
    expect(lineaDeLog({ type: "MONEY_CHANGED", gp: 12, sp: -3 })).toBe(
      "Cambia el dinero: +12 oro, -3 plata",
    );
    expect(
      lineaDeLog({
        type: "ITEM_ADDED",
        item: "Espada larga",
        ref: "SRD:long-sword",
        quantity: 1,
        location: "CARRIED",
      }),
    ).toBe("Consigue Espada larga (encima)");
    expect(
      lineaDeLog({
        type: "ITEM_ADDED",
        item: "Antorcha",
        ref: "SRD:torch",
        quantity: 5,
        location: "STORED",
      }),
    ).toBe("Consigue Antorcha (5 unidades, guardado)");
    expect(
      lineaDeLog({
        type: "ITEM_MOVED",
        item: "Espada larga",
        ref: "SRD:long-sword",
        from: "CARRIED",
        to: "EQUIPPED",
        slot: "MAIN_HAND",
      }),
    ).toBe("Mueve Espada larga: encima → equipado, mano principal");
    expect(
      lineaDeLog({ type: "ITEM_REMOVED", item: "Antorcha", ref: "SRD:torch", quantity: 2 }),
    ).toBe("Suelta Antorcha (2 unidades)");
  });

  it("una ranura que no reconocemos se cita, no se inventa", () => {
    // `slot` viaja como cadena libre en el payload, no como el enum: la puerta está abierta.
    expect(
      lineaDeLog({
        type: "ITEM_MOVED",
        item: "Cinturón",
        ref: "CAMPAIGN:x",
        from: "STORED",
        to: "EQUIPPED",
        slot: "CINTURA",
      }),
    ).toBe("Mueve Cinturón: guardado → equipado, cintura");
  });

  it("el reloj se lee en unidades de mesa, no en segundos", () => {
    expect(lineaDeLog({ type: "CLOCK_ADVANCED", seconds: 6, from: 0, to: 6 })).toBe("Pasan 6 s");
    expect(lineaDeLog({ type: "CLOCK_ADVANCED", seconds: 3600, from: 0, to: 3600 })).toBe(
      "Pasan 1 h",
    );
    // 8 h de marcha: el número que de verdad escribe un día de viaje, y distingue el resto de
    // minutos de un redondeo a horas enteras.
    expect(
      lineaDeLog({
        type: "CLOCK_ADVANCED",
        seconds: 30_600,
        from: 0,
        to: 30_600,
        pace: "SLOW",
        miles: 16,
      }),
    ).toBe("Pasan 8 h 30 min, a paso lento (16 millas)");
  });

  it("una condición vencida se dice por su nombre, igual que una aplicada", () => {
    expect(lineaDeLog({ type: "CONDITION_EXPIRED", key: "poisoned", expiredAtClock: 120 })).toBe(
      "Vence la condición «Envenenado»",
    );
    expect(
      lineaDeLog({ type: "CONDITION_EXPIRED", key: "inventada", expiredAtClock: 1 }),
    ).toContain("Sin traducir: inventada");
  });

  it("la tabla de la casa dice qué la disparó, en castellano", () => {
    expect(
      lineaDeLog({
        type: "TABLE_ROLLED",
        tableName: "Pifias de la casa",
        // `die` son las CARAS, no el nombre del dado: el 20 se convierte en «d20» al escribirlo.
        die: 20,
        roll: 3,
        text: "El arma sale volando",
        trigger: "FUMBLE",
      }),
    ).toBe("Tabla «Pifias de la casa» por una pifia: saca 3 en d20 — El arma sale volando");
  });

  it("el combate se cuenta sin nombres ni números que delaten", () => {
    expect(lineaDeLog({ type: "ENCOUNTER_STARTED", encounterId: "e1" })).toBe("Empieza el combate");
    // **Sin posiciones en el payload, y eso lo decidió una revisión de cierre**: llevaba
    // `fromPosition` y `toPosition`, y con ellas un jugador podía contar del registro cuántos
    // grupos de enemigos escondidos había. El tipo ya no las admite.
    expect(lineaDeLog({ type: "TURN_ADVANCED", encounterId: "e1", round: 2 })).toBe(
      "Pasa el turno (asalto 2)",
    );
    expect(
      lineaDeLog({ type: "ROUND_ADVANCED", encounterId: "e1", from: 1, to: 2, clockSeconds: 6 }),
    ).toBe("Asalto 2");
    // Tres asaltos, no uno: el singular tiene su propia frase y un 1 no distinguiría.
    expect(lineaDeLog({ type: "ENCOUNTER_ENDED", encounterId: "e1", rounds: 3 })).toBe(
      "Termina el combate tras 3 asaltos",
    );
    expect(lineaDeLog({ type: "ENCOUNTER_ENDED", encounterId: "e1", rounds: 1 })).toBe(
      "Termina el combate en un asalto",
    );
  });

  it("el veredicto de un ataque sale como palabra, y la CA no sale de ninguna manera", () => {
    const linea = lineaDeLog({
      type: "ATTACK_RESOLVED",
      attackerId: "ch1",
      attackName: "Espada larga",
      verdict: "CRITICAL",
      rollEventId: "ev1",
    });
    expect(linea).toBe("Espada larga: impacta con un crítico");
    // No hay número contra el que se tirara, ni nombre de objetivo: la línea es corta a propósito.
    expect(linea).not.toMatch(/\d/);
  });

  it("archivar y restaurar nombran a la persona", () => {
    expect(lineaDeLog({ type: "CHARACTER_ARCHIVED", characterName: "Kaelith" })).toBe(
      "Se archiva a Kaelith",
    );
    expect(lineaDeLog({ type: "CHARACTER_RESTORED", characterName: "Kaelith" })).toBe(
      "Vuelve del archivo Kaelith",
    );
  });

  // 2026-09-05 — la iniciativa y el bando: el sistema tira por quien faltaba.
  it("la iniciativa forzada por el sistema dice que fue el sistema quien tiró", () => {
    expect(
      lineaDeLog({
        type: "INITIATIVE_ROLLED_BY_SYSTEM",
        characterName: "Kaelith",
        roll: 14,
        total: 16,
      }),
    ).toBe("El sistema tira la iniciativa por Kaelith (16)");
    expect(lineaDeLog({ type: "INITIATIVE_ROLLED_BY_SYSTEM", roll: 5, total: 5 })).toBe(
      "El sistema tira la iniciativa por alguien (5)",
    );
  });
});
