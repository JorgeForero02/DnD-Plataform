import { describe, expect, it } from "vitest";
import { pasoDeGuia } from "../guia";
import { borradorDesde, revisarBorrador, type BorradorDeRegla } from "../formularios";

// Tarea F6 — la guía, probada por lo único que la distingue de un tour: **no guarda nada**.
//
// Cada caso monta un borrador y pide el paso. Como el paso se deriva del borrador y de nada más,
// hacer la acción lo cambia y deshacerla lo devuelve — que es exactamente la propiedad que hace
// que la burbuja se cierre sola y vuelva cuando hace falta, sin un aspa que cerrarla a destiempo.

const conPaso = (borrador: BorradorDeRegla) =>
  pasoDeGuia(borrador, revisarBorrador(borrador).problemas);

describe("la guía contextual", () => {
  it("con todo vacío pide el suceso, y nombra el carril con la palabra que lleva escrita", () => {
    const paso = conPaso(borradorDesde());
    expect(paso.id).toBe("SUCESO");
    expect(paso.texto).toContain("al carril «Cuando»");
    // Ni una clave del vocabulario cerrado llega al texto.
    expect(paso.texto).not.toContain("SESSION");
  });

  it("con el suceso puesto pasa a pedir la acción", () => {
    const borrador: BorradorDeRegla = { ...borradorDesde(), trigger: { kind: "SESSION_STARTED" } };
    const paso = conPaso(borrador);
    expect(paso.id).toBe("ACCION");
    expect(paso.texto).toContain("al carril «Entonces»");
  });

  it("quitar el suceso devuelve el paso anterior: no hay «ya lo vi» guardado en ninguna parte", () => {
    const conSuceso: BorradorDeRegla = {
      ...borradorDesde(),
      trigger: { kind: "SESSION_STARTED" },
    };
    expect(conPaso(conSuceso).id).toBe("ACCION");
    expect(conPaso({ ...conSuceso, trigger: null }).id).toBe("SUCESO");
  });

  it("con las dos cajas puestas señala el hueco que queda dentro de una, no un genérico", () => {
    const borrador: BorradorDeRegla = {
      ...borradorDesde(),
      name: "Con nombre",
      trigger: { kind: "SESSION_STARTED" },
      effects: [{ kind: "REVEAL_ENTITY", entityId: "", visibility: "PLAYERS" }],
    };
    const paso = conPaso(borrador);
    expect(paso.id).toBe("HUECO");
    expect(paso.texto).toContain("Carril «Entonces», caja «Revelar una entrada del mundo»");
  });

  it("con la regla llena pero sin nombre, pide el nombre", () => {
    const borrador: BorradorDeRegla = {
      ...borradorDesde(),
      trigger: { kind: "SESSION_STARTED" },
      effects: [{ kind: "ADD_SESSION_NOTE", note: "hola" }],
    };
    expect(conPaso(borrador).id).toBe("NOMBRE");
  });

  it("cuando ya no queda nada que hacer, lo dice y se marca completo", () => {
    const borrador: BorradorDeRegla = {
      ...borradorDesde(),
      name: "Lista",
      trigger: { kind: "SESSION_STARTED" },
      effects: [{ kind: "ADD_SESSION_NOTE", note: "hola" }],
    };
    const paso = conPaso(borrador);
    expect(paso.id).toBe("COMPLETA");
    expect(paso.completo).toBe(true);
    expect(paso.texto).toContain("Guardar regla");
  });
});
