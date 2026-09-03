import { describe, expect, it } from "vitest";
import { MAX_RULE_CHAIN_DEPTH } from "@dnd/shared";
import { avisosDelBorrador, despierta, sucesoQueEncadena, type ReglaParaAvisos } from "../avisos";

// Tarea F5 — el detector, probado como lo que es: una función pura sobre reglas.
//
// Se prueba **comportamiento**, no implementación: nadie afirma aquí que se recorrió un grafo,
// se afirma que un bucle sale avisado y que dos reglas que no se tocan no producen ruido. El
// falso positivo importa tanto como el fallo que no se detecta: un editor que avisa de todo es
// un editor que nadie lee.

const vacia = (parcial: Partial<ReglaParaAvisos>): ReglaParaAvisos => ({
  name: "sin nombre",
  trigger: null,
  conditions: [],
  effects: [],
  ...parcial,
});

describe("qué efectos reabren la cascada", () => {
  it("solo encadenan los tres que encadena el motor", () => {
    expect(sucesoQueEncadena({ kind: "SET_FLAG", key: "puerta", value: true })).toEqual({
      kind: "FLAG_SET",
      key: "puerta",
    });
    expect(sucesoQueEncadena({ kind: "RAISE_SIGNAL", key: "eco" })).toEqual({
      kind: "SIGNAL_RAISED",
      key: "eco",
    });
    expect(
      sucesoQueEncadena({ kind: "REVEAL_ENTITY", entityId: "ckficha", visibility: "PLAYERS" }),
    ).toEqual({ kind: "ENTITY_REVEALED", entityId: "ckficha" });

    // Ocultar NO encadena — `effect-applier.ts` lo dice explícitamente. Si esto cambiara y aquí
    // siguiera diciendo que sí, el aviso de bucle empezaría a mentir.
    expect(
      sucesoQueEncadena({ kind: "HIDE_ENTITY", entityId: "ckficha", visibility: "DM_ONLY" }),
    ).toBeNull();
    expect(sucesoQueEncadena({ kind: "NOTIFY", audience: "PLAYERS", message: "hola" })).toBeNull();
  });

  it("un hueco todavía sin rellenar no despierta nada", () => {
    // Dos reglas a medias, las dos con la marca en blanco, no «coinciden» entre sí: inventarse
    // un choque con un campo vacío sería avisar de un problema que no existe todavía.
    expect(despierta({ kind: "FLAG_SET", key: "" }, { kind: "FLAG_SET", key: "" })).toBe(false);
    expect(despierta({ kind: "FLAG_SET", key: "a" }, { kind: "FLAG_SET", key: "a" })).toBe(true);
    expect(despierta({ kind: "FLAG_SET", key: "a" }, { kind: "FLAG_SET", key: "b" })).toBe(false);
  });
});

describe("reversión ausente", () => {
  it("avisa de la marca que se pone y nadie quita, y ofrece crear la regla que la quita", () => {
    const borrador = vacia({
      name: "Empieza el combate",
      trigger: { kind: "SESSION_STARTED" },
      effects: [{ kind: "SET_FLAG", key: "combate", value: true }],
    });

    const avisos = avisosDelBorrador(borrador, []);
    const reversion = avisos.find((a) => a.clase === "REVERSION_AUSENTE");

    expect(reversion?.titulo).toContain("«combate»");
    expect(reversion?.arreglo?.etiqueta).toBe("Añadir reversión");
    expect(reversion?.arreglo?.accion).toEqual({
      tipo: "CREAR_REGLA_DE_REVERSION",
      key: "combate",
      nombre: "Quitar la marca «combate» al cerrarse la sesión",
    });
  });

  it("calla en cuanto existe una regla que la quita", () => {
    const borrador = vacia({
      trigger: { kind: "SESSION_STARTED" },
      effects: [{ kind: "SET_FLAG", key: "combate", value: true }],
    });
    const limpia = vacia({
      id: "ckotra",
      name: "Al cerrar, se acaba el combate",
      trigger: { kind: "SESSION_CLOSED" },
      effects: [{ kind: "SET_FLAG", key: "combate", value: false }],
    });

    expect(
      avisosDelBorrador(borrador, [limpia]).filter((a) => a.clase === "REVERSION_AUSENTE"),
    ).toHaveLength(0);
  });

  it("no avisa de una marca que la regla quita en vez de poner", () => {
    const borrador = vacia({
      trigger: { kind: "SESSION_CLOSED" },
      effects: [{ kind: "SET_FLAG", key: "combate", value: false }],
    });
    expect(avisosDelBorrador(borrador, [])).toHaveLength(0);
  });
});

describe("conflicto de prioridad", () => {
  const otra = vacia({
    id: "ckotra",
    name: "La vieja",
    trigger: { kind: "SESSION_STARTED" },
    conditions: [{ kind: "NEVER_FIRED" }],
    effects: [{ kind: "ADD_SESSION_NOTE", note: "x" }],
  });

  it("dice quién gana cuando una es más específica que la otra", () => {
    const borrador = vacia({
      trigger: { kind: "SESSION_STARTED" },
      conditions: [{ kind: "NEVER_FIRED" }, { kind: "ALL_PLAYERS_PRESENT" }],
      effects: [{ kind: "ADD_SESSION_NOTE", note: "y" }],
    });

    const aviso = avisosDelBorrador(borrador, [otra]).find(
      (a) => a.clase === "CONFLICTO_DE_PRIORIDAD",
    );
    expect(aviso?.cuerpo).toContain("Gana esta regla, con 2 condiciones");
    expect(aviso?.cuerpo).toContain("«La vieja», con 1, no se aplica");
    // Ningún valor de enumeración llega a la pantalla: el suceso va dicho en español.
    expect(aviso?.cuerpo).toContain("Empieza una sesión");
    expect(aviso?.cuerpo).not.toContain("SESSION_STARTED");
  });

  it("cuando empatan dice que no se aplica ninguna, que es lo que hace el motor", () => {
    const borrador = vacia({
      trigger: { kind: "SESSION_STARTED" },
      conditions: [{ kind: "ALL_PLAYERS_PRESENT" }],
      effects: [{ kind: "ADD_SESSION_NOTE", note: "y" }],
    });

    const aviso = avisosDelBorrador(borrador, [otra]).find(
      (a) => a.clase === "CONFLICTO_DE_PRIORIDAD",
    );
    expect(aviso?.titulo).toContain("Empate");
    expect(aviso?.cuerpo).toContain("no se aplica ninguna de las dos");
  });

  it("dos reglas con sucesos distintos no compiten", () => {
    const borrador = vacia({
      trigger: { kind: "SESSION_CLOSED" },
      effects: [{ kind: "ADD_SESSION_NOTE", note: "y" }],
    });
    expect(avisosDelBorrador(borrador, [otra])).toHaveLength(0);
  });
});

describe("bucle", () => {
  it("caza la regla que se despierta a sí misma", () => {
    const borrador = vacia({
      name: "La pescadilla",
      trigger: { kind: "FLAG_SET", key: "eco" },
      effects: [{ kind: "SET_FLAG", key: "eco", value: true }],
    });

    const bucle = avisosDelBorrador(borrador, []).find((a) => a.clase === "BUCLE");
    expect(bucle?.titulo).toBe("Esto se muerde la cola.");
    expect(bucle?.cuerpo).toContain("«La pescadilla» → «La pescadilla»");
    // Lo que dice del motor sale del motor: el tope no está escrito a mano.
    expect(bucle?.cuerpo).toContain(`${MAX_RULE_CHAIN_DEPTH} saltos`);
    expect(bucle?.arreglo?.accion).toEqual({ tipo: "AGREGAR_CONDICION", kind: "NEVER_FIRED" });
  });

  it("caza el bucle que pasa por otra regla y lo cuenta con sus nombres", () => {
    const borrador = vacia({
      name: "La primera",
      trigger: { kind: "SIGNAL_RAISED", key: "eco" },
      effects: [{ kind: "SET_FLAG", key: "puerta", value: true }],
    });
    const puente = vacia({
      id: "ckpuente",
      name: "El puente",
      trigger: { kind: "FLAG_SET", key: "puerta" },
      effects: [{ kind: "RAISE_SIGNAL", key: "eco" }],
    });

    const bucle = avisosDelBorrador(borrador, [puente]).find((a) => a.clase === "BUCLE");
    expect(bucle?.cuerpo).toContain("«La primera» → «El puente» → «La primera»");
  });

  it("una cadena que termina no es un bucle", () => {
    const borrador = vacia({
      name: "La primera",
      trigger: { kind: "SESSION_STARTED" },
      effects: [{ kind: "SET_FLAG", key: "puerta", value: true }],
    });
    const segunda = vacia({
      id: "cksegunda",
      name: "La segunda",
      trigger: { kind: "FLAG_SET", key: "puerta" },
      effects: [{ kind: "NOTIFY", audience: "PLAYERS", message: "abierta" }],
    });

    expect(avisosDelBorrador(borrador, [segunda]).filter((a) => a.clase === "BUCLE")).toHaveLength(
      0,
    );
  });

  it("ocultar una ficha no puede cerrar un bucle, porque ocultar no encadena", () => {
    const borrador = vacia({
      name: "La que oculta",
      trigger: { kind: "ENTITY_REVEALED", entityId: "ckficha0000000000000000" },
      effects: [
        { kind: "HIDE_ENTITY", entityId: "ckficha0000000000000000", visibility: "DM_ONLY" },
      ],
    });
    expect(avisosDelBorrador(borrador, []).filter((a) => a.clase === "BUCLE")).toHaveLength(0);
  });
});

describe("el silencio", () => {
  it("una regla corriente no produce ni un aviso", () => {
    const borrador = vacia({
      name: "Al empezar, la pista",
      trigger: { kind: "SESSION_STARTED" },
      conditions: [{ kind: "NEVER_FIRED" }],
      effects: [
        { kind: "REVEAL_ENTITY", entityId: "ckficha0000000000000000", visibility: "PLAYERS" },
      ],
    });
    expect(avisosDelBorrador(borrador, [])).toEqual([]);
  });
});
