import { describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { EditorDeRegla } from "../EditorDeRegla";
import { FraseDeRegla } from "../FraseDeRegla";
import { segmentosDeFrase } from "../frase";
import type { Entity } from "../../entities/api";
import {
  CARRIL_DE_PARTE,
  CONDICIONES,
  DISPARADORES,
  DISPARADORES_SIN_MOTOR,
  EFECTOS,
  nombreDePieza,
  type ParteDeRegla,
} from "../vocabulario";

// Tarea F1 — **la frase concuerda con las cajas, o la frase miente.**
//
// La prueba que este bloque pide expresamente no es «la frase contiene la palabra X»: eso pasa
// en verde con la frase congelada, con la frase de otra regla y con la mitad de la frase. Lo
// que se comprueba aquí es una **igualdad estructural** entre dos lecturas independientes del
// mismo DOM montado:
//
//   - lo que hay en los carriles — `[data-carril] li[data-clave]`, que lo escribe `CajaColocada`;
//   - lo que hay en la frase — `[data-frase="pieza"]`, que lo escribe `FraseDeRegla`.
//
// Se comparan **parte, clave, orden y multiplicidad**. Si la frase se queda atrás, se adelanta,
// pierde una pieza, repite otra, las ordena distinto o le cambia la parte a una, las dos listas
// dejan de ser iguales. Y se recorre **el vocabulario cerrado entero**, las 28 piezas, así que
// una clase de suceso, de estado o de acción que la frase no supiera decir se cae aquí y no en
// la mesa.
//
// La otra mitad —que ninguna pieza llegue a la pantalla como enum ni como «Sin traducir»— va en
// la misma prueba a propósito: una frase que concuerda con las cajas pero dice `REVEAL_ENTITY`
// concuerda y es igual de inservible.

const ENTIDAD: Entity = {
  id: "ckentidad000000000000000",
  campaignId: "ckcampana00000000000000",
  kind: "NPC",
  name: "La puerta de sal",
  summary: null,
  body: null,
  tags: [],
  visibility: "DM_ONLY",
  createdById: "ckuser0000000000000000",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as unknown as Entity;

function montar() {
  render(
    <EditorDeRegla
      abierto
      entities={[ENTIDAD]}
      reglas={[]}
      guardando={false}
      onGuardar={vi.fn()}
      onCerrar={vi.fn()}
    />,
  );
}

/** Lo que de verdad hay colocado en los carriles, leído del DOM que pinta `CajaColocada`. */
function enLosCarriles(): string[] {
  return [...document.querySelectorAll("[data-carril] li[data-clave]")].map(
    (caja) => `${caja.getAttribute("data-parte")}:${caja.getAttribute("data-clave")}`,
  );
}

/** Lo que de verdad dice la frase, leído del DOM que pinta `FraseDeRegla`. */
function enLaFrase(): string[] {
  return [...document.querySelectorAll('[data-frase="pieza"]')].map(
    (trozo) => `${trozo.getAttribute("data-parte")}:${trozo.getAttribute("data-clave")}`,
  );
}

function textoDeLaFrase(): string {
  return document.querySelector("[data-frase-de-regla] p")?.textContent ?? "";
}

const colocar = (parte: ParteDeRegla, clave: string) =>
  fireEvent.click(
    screen.getByRole("button", {
      name: `${nombreDePieza(clave)} — poner en el carril ${CARRIL_DE_PARTE[parte]}`,
    }),
  );

// **Actualizado el 2026-09-04 (auditoría de la mesa, §8.3).** La paleta ya no ofrece los cuatro
// sucesos que el motor no dispara (`DISPARADORES_SIN_MOTOR`), así que no hay caja que colocar
// para ellos. Lo que esta prueba sigue comprobando es exactamente lo mismo: **cada pieza que la
// paleta ofrece, al colocarla, aparece en la frase y en su parte** — y el conjunto se sigue
// derivando del esquema compartido, no de una lista escrita a mano.
const DISPARADORES_QUE_SE_COLOCAN = DISPARADORES.filter(
  (c) => !(DISPARADORES_SIN_MOTOR as readonly string[]).includes(c),
);

const TODAS: [ParteDeRegla, string][] = [
  ...DISPARADORES_QUE_SE_COLOCAN.map((c) => ["SUCESO", c] as [ParteDeRegla, string]),
  ...CONDICIONES.map((c) => ["ESTADO", c] as [ParteDeRegla, string]),
  ...EFECTOS.map((c) => ["ACCION", c] as [ParteDeRegla, string]),
];

describe("la frase concuerda con las cajas", () => {
  it("las 24 piezas que la paleta ofrece: cada una, colocada, aparece en la frase y en su parte", () => {
    expect(TODAS).toHaveLength(28 - DISPARADORES_SIN_MOTOR.length);

    for (const [parte, clave] of TODAS) {
      montar();
      colocar(parte, clave);

      const esperado = [`${parte}:${clave}`];
      expect(enLosCarriles(), `${clave} no llegó al carril`).toEqual(esperado);
      expect(enLaFrase(), `${clave} no llegó a la frase`).toEqual(esperado);

      // Y lo que la frase dice de esa pieza está en español y no está vacío.
      const trozo = document.querySelector(`[data-frase="pieza"][data-clave="${clave}"]`)!;
      const dicho = (trozo.textContent ?? "").trim();
      expect(dicho.length, `${clave} sin texto en la frase`).toBeGreaterThan(3);
      expect(dicho, `${clave} llega crudo a la frase`).not.toContain(clave);
      expect(dicho, `${clave} sin traducir en la frase`).not.toContain("Sin traducir");

      cleanup();
    }
  });

  it("con varias cajas, la frase lleva las mismas, en el mismo orden y sin repetir", () => {
    montar();

    colocar("SUCESO", "FLAG_SET");
    colocar("ESTADO", "ALL_PLAYERS_PRESENT");
    colocar("ESTADO", "NEVER_FIRED");
    colocar("ACCION", "RAISE_SIGNAL");
    colocar("ACCION", "NOTIFY");

    expect(enLosCarriles()).toEqual([
      "SUCESO:FLAG_SET",
      "ESTADO:ALL_PLAYERS_PRESENT",
      "ESTADO:NEVER_FIRED",
      "ACCION:RAISE_SIGNAL",
      "ACCION:NOTIFY",
    ]);
    // La igualdad es la prueba: mismas piezas, mismas partes, mismo orden, mismas veces.
    expect(enLaFrase()).toEqual(enLosCarriles());
  });

  it("quitar una caja la quita de la frase: la frase no es una copia que se queda atrás", () => {
    montar();

    colocar("ACCION", "RAISE_SIGNAL");
    colocar("ACCION", "NOTIFY");
    expect(enLaFrase()).toEqual(["ACCION:RAISE_SIGNAL", "ACCION:NOTIFY"]);

    // El primer «Quitar» del carril Entonces es el de la primera acción.
    const carril = screen.getByRole("region", { name: `Carril ${CARRIL_DE_PARTE.ACCION}` });
    fireEvent.click(
      [...carril.querySelectorAll("button")].find((b) => b.textContent === "Quitar")!,
    );

    expect(enLosCarriles()).toEqual(["ACCION:NOTIFY"]);
    expect(enLaFrase()).toEqual(enLosCarriles());
  });

  it("sustituir el suceso sustituye también el de la frase", () => {
    montar();
    colocar("SUCESO", "SESSION_STARTED");
    expect(enLaFrase()).toEqual(["SUCESO:SESSION_STARTED"]);
    colocar("SUCESO", "SESSION_CLOSED");
    expect(enLosCarriles()).toEqual(["SUCESO:SESSION_CLOSED"]);
    expect(enLaFrase()).toEqual(enLosCarriles());
  });
});

describe("la caja que falta se dice en palabras", () => {
  it("con los carriles vacíos, la frase nombra el suceso y la acción que faltan", () => {
    montar();

    const huecos = [...document.querySelectorAll('[data-frase="hueco"]')].map((h) => [
      h.getAttribute("data-parte"),
      (h.textContent ?? "").trim(),
    ]);
    expect(huecos).toEqual([
      ["SUCESO", "— falta un suceso"],
      ["ACCION", "— falta una acción"],
    ]);
    // Se dice, no se calla: el hueco está escrito en la frase que se lee.
    expect(textoDeLaFrase()).toContain("— falta una acción");
  });

  it("el carril «Si» vacío NO se anuncia como hueco: una regla sin condiciones está completa", () => {
    // Es la parte donde la frase podría mentir sobre el servidor. `engine.ts` dispara la regla
    // en cuanto llega su suceso si no hay condiciones; pedir una sería inventarse un requisito.
    montar();
    colocar("SUCESO", "SESSION_STARTED");
    colocar("ACCION", "RAISE_SIGNAL");

    expect(document.querySelectorAll('[data-frase="hueco"]')).toHaveLength(0);
    // Y no hay conector «si» que anuncie una parte que no existe. Se mira el conector y no el
    // texto: «si» es un trozo de «una sesión», y una prueba por subcadena pasaría por engaño.
    expect(document.querySelectorAll('[data-frase="conector"][data-parte="ESTADO"]')).toHaveLength(
      0,
    );
    expect(textoDeLaFrase()).toBe("Cuando Empieza una sesión, entonces Lanzar la señal «».");
  });

  it("puesto el suceso, su hueco desaparece y queda el de la acción", () => {
    montar();
    colocar("SUCESO", "SESSION_STARTED");

    const huecos = [...document.querySelectorAll('[data-frase="hueco"]')].map((h) =>
      h.getAttribute("data-parte"),
    );
    expect(huecos).toEqual(["ACCION"]);
  });
});

describe("los conectores", () => {
  it("son las mismas palabras que rotulan los carriles, y van en negrita además de en color", () => {
    render(
      <FraseDeRegla
        regla={{
          trigger: { kind: "SESSION_STARTED" },
          conditions: [{ kind: "NEVER_FIRED" }],
          effects: [{ kind: "RAISE_SIGNAL", key: "puerta" }],
        }}
      />,
    );

    const conectores = [...document.querySelectorAll('[data-frase="conector"]')];
    expect(conectores.map((c) => c.getAttribute("data-parte"))).toEqual([
      "SUCESO",
      "ESTADO",
      "ACCION",
    ]);
    // El rótulo del carril, tal cual, y en minúscula cuando no abre la frase.
    expect(conectores.map((c) => c.textContent)).toEqual([
      CARRIL_DE_PARTE.SUCESO,
      CARRIL_DE_PARTE.ESTADO.toLocaleLowerCase("es"),
      CARRIL_DE_PARTE.ACCION.toLocaleLowerCase("es"),
    ]);

    // **El color no puede ser la única señal.** Cada conector lleva además su negrita, así que
    // quien no distinga el cobre del azul sigue viendo dónde empieza cada parte de la frase.
    for (const conector of conectores) {
      expect(conector.className, conector.textContent ?? "").toContain("font-semibold");
    }
    // Y aun así los tres colores son distintos: la señal redundante no sustituye a la del color.
    const colores = new Set(
      conectores.map((c) => [...c.classList].find((k) => k.startsWith("text-"))),
    );
    expect(colores.size).toBe(3);
  });
});

describe("la frase, en texto llano", () => {
  it("se lee seguida, con las condiciones unidas por «y» — el motor las exige todas", () => {
    // `engine.ts` evalúa las condiciones con `every`: se cumplen todas o la regla no se dispara.
    // Un «o» aquí sería una frase que miente sobre el servidor.
    render(
      <FraseDeRegla
        regla={{
          trigger: { kind: "SESSION_STARTED" },
          conditions: [{ kind: "ALL_PLAYERS_PRESENT" }, { kind: "NEVER_FIRED" }],
          effects: [{ kind: "RAISE_SIGNAL", key: "puerta" }],
        }}
      />,
    );

    expect(textoDeLaFrase()).toBe(
      "Cuando Empieza una sesión, si Están todos los jugadores presentes en la sesión en curso y " +
        "Esta regla no se ha disparado nunca, entonces Lanzar la señal «puerta».",
    );
  });

  it("nombra el objetivo del efecto, porque una regla lo fija al armarse y no al dispararse", () => {
    // Decisión de dominio cerrada (H6). Si la frase dijera «revelar la entrada del suceso»
    // estaría describiendo un motor que no es el nuestro.
    const segmentos = segmentosDeFrase(
      {
        trigger: { kind: "ENTITY_OPENED", entityId: "ckotra00000000000000000" },
        conditions: [],
        effects: [{ kind: "REVEAL_ENTITY", entityId: ENTIDAD.id, visibility: "PLAYERS" }],
      },
      (id) => (id === ENTIDAD.id ? ENTIDAD.name : "otra ficha"),
    );
    const accion = segmentos.find((s) => s.tipo === "pieza" && s.parte === "ACCION");
    expect(accion?.tipo === "pieza" ? accion.texto : "").toContain("La puerta de sal");
    expect(accion?.tipo === "pieza" ? accion.texto : "").not.toContain("otra ficha");
  });
});
