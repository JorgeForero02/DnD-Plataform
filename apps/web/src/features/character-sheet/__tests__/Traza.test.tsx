import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { DerivedValue, TraceStep } from "@dnd/shared";
import { ValorDerivado } from "../Traza";

// Tarea 2A.10 — "la traza se despliega y dice de dónde sale el número". El ejemplo textual de
// la especificación: «CA 18 = 14 cota de malla + 2 escudo + 2 Destreza».

const ca: DerivedValue = {
  key: "ac",
  total: 18,
  steps: [
    {
      op: "base",
      amount: 16,
      sourceType: "item",
      sourceKey: "chain-mail",
      labelKey: "armor.chain-mail",
    },
    { op: "add", amount: 2, sourceType: "item", sourceKey: "shield", labelKey: "armor.shield" },
    { op: "add", amount: 2, sourceType: "ability", sourceKey: "dex", labelKey: "abilityMod.dex" },
  ],
};

describe("ValorDerivado — la traza", () => {
  it("empieza colapsada, mostrando solo el total", () => {
    render(<ValorDerivado etiqueta="CA" valor={ca} />);
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.queryByText("De cuero", { exact: false })).not.toBeInTheDocument();
  });

  it("al desplegarla, dice de dónde sale cada punto", () => {
    render(<ValorDerivado etiqueta="CA" valor={ca} />);
    fireEvent.click(screen.getByRole("button", { name: "18" }));

    expect(screen.getByText("Cota de malla")).toBeInTheDocument();
    expect(screen.getByText("Escudo")).toBeInTheDocument();
    expect(screen.getByText("Modificador de Destreza")).toBeInTheDocument();
    // Los números de cada paso, con su signo.
    expect(screen.getByText("16")).toBeInTheDocument();
    expect(screen.getAllByText("+2").length).toBe(2);
  });

  it("una labelKey que el diccionario no reconoce se marca visiblemente, no se esconde", () => {
    const desconocida: DerivedValue = {
      key: "misterio",
      total: 3,
      steps: [
        {
          op: "base",
          amount: 3,
          sourceType: "manual",
          sourceKey: "x",
          labelKey: "algo.nuevo.del.motor",
        },
      ],
    };
    render(<ValorDerivado etiqueta="Misterio" valor={desconocida} />);
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    const paso = screen.getByText("Sin traducir: algo.nuevo.del.motor");
    expect(paso).toBeInTheDocument();
    expect(paso.closest("[data-untranslated]")).not.toBeNull();
  });
});

describe("la fórmula de una línea, siempre visible", () => {
  // Es el nivel que la hoja de papel nunca pudo dar: bajo el número y en pequeño, de dónde sale.
  // Y sale de la MISMA traza que el desglose largo, así que no puede discrepar de él.

  const paso = (op: TraceStep["op"], amount: number, labelKey: string): TraceStep => ({
    op,
    amount,
    sourceType: "manual",
    sourceKey: labelKey,
    labelKey,
  });

  it("resume base y sumandos sin que haya que desplegar nada", () => {
    render(
      <ValorDerivado
        etiqueta="Clase de armadura"
        valor={{
          key: "ac",
          total: 12,
          steps: [paso("base", 10, "ac.unarmored"), paso("add", 2, "abilityMod.dex")],
        }}
      />,
    );

    // No se ha pulsado nada: la fórmula está ahí desde el principio.
    expect(screen.getByText(/10 .*\+2/)).toBeInTheDocument();
  });

  it("un paso que no mueve el total no se nombra: no explica nada", () => {
    render(
      <ValorDerivado
        etiqueta="Velocidad"
        valor={{
          key: "speed.walk",
          total: 0,
          steps: [
            paso("base", 25, "speed.base"),
            paso("override", -25, "speed.condition.zero"),
            paso("override", 0, "speed.condition.zero"),
          ],
        }}
      />,
    );

    const formula = screen.getByText(/25/);
    // Dos causas a cero: la segunda lleva 0 para que la traza siga sumando, y por eso no se cuenta.
    expect(formula.textContent).not.toMatch(/−0|\+0/);
  });

  it("con muchos pasos se resume, en vez de repetir la traza peor maquetada", () => {
    render(
      <ValorDerivado
        etiqueta="Salvación"
        valor={{
          key: "save.dex",
          total: 9,
          steps: [
            paso("base", 2, "abilityMod.dex"),
            paso("add", 3, "proficiency"),
            paso("add", 2, "override.manual"),
            paso("add", 1, "race.dwarf.con"),
            paso("add", 1, "class.rogue.skills"),
          ],
        }}
      />,
    );

    expect(screen.getByText(/y 2 más/)).toBeInTheDocument();
  });

  it("la fila de una habilidad guarda su fórmula tras la cifra, y la suelta al desplegarla", () => {
    // Una mutación lo destapó: quitar la fórmula de la variante de fila no ponía nada rojo,
    // porque todas las pruebas usaban la casilla. Media función sin cubrir.
    //
    // **Y desde la adopción de la maqueta la fila es UNA línea**: la fórmula ya no se pinta
    // debajo de cada una de las veinticuatro filas de la hoja, sino al desplegar la traza —que es
    // lo que abre la cifra. Así que la prueba comprueba las dos mitades: que no está antes, y que
    // sale al pedirla. Sin la primera, un descuido que la dejara siempre visible pasaría en verde.
    render(
      <ValorDerivado
        etiqueta="Sigilo"
        variante="linea"
        valor={{
          key: "skill.stealth",
          total: 4,
          steps: [paso("base", 2, "abilityMod.dex"), paso("add", 2, "proficiency")],
        }}
      />,
    );

    expect(screen.queryByText(/2 .*\+2/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Sigilo: \+4/ }));
    expect(screen.getByText(/2 .*\+2/)).toBeInTheDocument();
  });

  it("el chevron es un dibujo, no un glifo de fuente", () => {
    const { container } = render(
      <ValorDerivado
        etiqueta="Iniciativa"
        variante="tarjeta"
        valor={{ key: "initiative", total: 2, steps: [paso("base", 2, "abilityMod.dex")] }}
      />,
    );

    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.textContent).not.toContain("▸");
    expect(container.textContent).not.toContain("▾");
  });
});

// --- Tarea 2C.4 — el agotamiento en la traza de los PG máximos ---

describe("ValorDerivado — el paso del agotamiento", () => {
  it("el paso «exhaustion:4» sale en español, no como clave del motor", () => {
    const maxHp: DerivedValue = {
      key: "maxHp",
      total: 12,
      steps: [
        {
          op: "base",
          amount: 25,
          sourceType: "class",
          sourceKey: "fighter",
          labelKey: "maxHp.firstLevel",
        },
        {
          op: "cap",
          amount: -13,
          sourceType: "manual",
          sourceKey: "exhaustion:4",
          labelKey: "maxHp.exhaustion.half",
        },
      ],
    };
    const { container } = render(<ValorDerivado etiqueta="PG máximos" valor={maxHp} />);
    fireEvent.click(screen.getByRole("button", { name: "12" }));

    expect(
      screen.getByText("Agotamiento: los puntos de golpe máximos, a la mitad"),
    ).toBeInTheDocument();
    expect(container.textContent).not.toContain("Sin traducir");
    // Y el paso no queda marcado como desconocido, que es la red del diccionario.
    expect(container.querySelector('[data-untranslated="true"]')).toBeNull();
  });
});
