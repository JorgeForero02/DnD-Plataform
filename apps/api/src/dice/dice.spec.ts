import { z } from "zod";
import { MAX_DADOS_POR_TIRADA, dieRolledSchema, gameEventPayloadSchema } from "@dnd/shared";
import {
  rollExpression,
  dadosTirados,
  DiceExpressionError,
  DICE_LIMITS,
  defaultRoller,
  type Roller,
} from "./dice";

// Tarea 2A.1. Todo se prueba con un **tirador de guion**: una lista de valores que salen en
// orden. Sin él, probar dados es probar la suerte, y una prueba que a veces pasa no es una
// prueba.
function tirador(valores: number[]): Roller {
  let i = 0;
  return () => {
    if (i >= valores.length) throw new Error("El guion se quedó sin valores: se tiró de más.");
    return valores[i++];
  };
}

describe("rollExpression", () => {
  describe("lo que la fase 2A necesita de verdad", () => {
    it("4d6kh3 conserva los tres mejores y **enseña** el descartado", () => {
      const r = rollExpression("4d6kh3", tirador([6, 4, 3, 1]));
      expect(r.total).toBe(13);
      const [t] = r.terms;
      expect(t.rolled).toEqual([6, 4, 3, 1]);
      expect(t.kept).toEqual([6, 4, 3]);
      // El descartado no se pierde: es lo que hace que una tirada se pueda discutir en la mesa.
      expect(t.dropped).toEqual([1]);
    });

    it("2d20kh1 y 2d20kl1 sobre los MISMOS dados dan cosas distintas (ventaja y desventaja)", () => {
      const conVentaja = rollExpression("2d20kh1", tirador([20, 3]));
      const conDesventaja = rollExpression("2d20kl1", tirador([20, 3]));
      expect(conVentaja.total).toBe(20);
      expect(conDesventaja.total).toBe(3);
      // El detalle que P7 necesitará en 2C: el dado que no contó sigue estando.
      expect(conVentaja.terms[0].dropped).toEqual([3]);
      expect(conDesventaja.terms[0].dropped).toEqual([20]);
    });

    it("suma y resta términos, y cada uno lleva su signo aparte del valor", () => {
      const r = rollExpression("2d6+3-1d4", tirador([5, 2, 4]));
      expect(r.total).toBe(5 + 2 + 3 - 4);
      expect(r.terms.map((t) => t.sign)).toEqual([1, 1, -1]);
      // El valor de un término es **sin signo**: quien lo pinta decide cómo enseñar el menos.
      expect(r.terms[2].value).toBe(4);
    });

    it("una constante es un término, no un caso especial", () => {
      const r = rollExpression("7", tirador([]));
      expect(r.total).toBe(7);
      expect(r.terms[0]).toMatchObject({ rolled: [], kept: [7], dropped: [] });
    });

    it("d20 sin número es 1d20, que es como lo escribe cualquiera", () => {
      const r = rollExpression("d20", tirador([11]));
      expect(r.total).toBe(11);
      expect(r.terms[0].rolled).toEqual([11]);
    });

    it("conserva el orden en que salieron los dados, no el orden ordenado", () => {
      // Importa: `rolled` es lo que la mesa vio caer. Ordenarlo para elegir los mejores no
      // puede reescribir la historia.
      const r = rollExpression("4d6kh3", tirador([1, 6, 3, 4]));
      expect(r.terms[0].rolled).toEqual([1, 6, 3, 4]);
      expect(r.terms[0].kept).toEqual([6, 3, 4]);
      expect(r.terms[0].dropped).toEqual([1]);
    });

    it("con empates, descarta exactamente los que sobran y ni uno más", () => {
      const r = rollExpression("4d6kh3", tirador([5, 5, 5, 5]));
      expect(r.terms[0].kept).toHaveLength(3);
      expect(r.terms[0].dropped).toHaveLength(1);
      expect(r.total).toBe(15);
    });

    it("con el mismo guion, dos ejecuciones dan exactamente lo mismo", () => {
      const primera = rollExpression("4d6kh3+2", tirador([6, 4, 3, 1]));
      const segunda = rollExpression("4d6kh3+2", tirador([6, 4, 3, 1]));
      expect(segunda).toEqual(primera);
    });
  });

  describe("una expresión inválida es un error tipado, nunca un NaN", () => {
    // El motivo por el que esto se prueba una por una: un evaluador que devuelve NaN convierte
    // un error de quien escribe en un total silencioso que miente en una hoja de personaje.
    it.each([
      ["", "EXPRESION_VACIA"],
      ["d", "SINTAXIS"],
      ["4d", "SINTAXIS"],
      ["4d6kh", "SINTAXIS"],
      ["1d6+", "SINTAXIS"],
      ["+", "SINTAXIS"],
      ["2d6++3", "SINTAXIS"],
      ["hola", "SINTAXIS"],
      ["4d6kh9", "CONSERVAR_MAS_DE_LO_TIRADO"],
      ["4d6kh0", "CONSERVAR_CERO"],
      ["0d6", "SINTAXIS"],
      ["1d0", "SINTAXIS"],
    ])("«%s» se rechaza con el código %s", (expresion, codigo) => {
      expect(() => rollExpression(expresion, tirador([1, 1, 1, 1]))).toThrow(DiceExpressionError);
      try {
        rollExpression(expresion, tirador([1, 1, 1, 1]));
      } catch (e) {
        expect((e as DiceExpressionError).code).toBe(codigo);
      }
    });
  });

  describe("los límites protegen el proceso, porque la expresión la escribe una persona", () => {
    it("rechaza más dados de la cuenta antes de tirar ninguno", () => {
      const nuncaSeUsa: Roller = () => {
        throw new Error("No debería haber tirado: el límite se comprueba antes.");
      };
      expect(() => rollExpression(`${DICE_LIMITS.maxDicePerTerm + 1}d6`, nuncaSeUsa)).toThrow(
        /Como mucho 100 dados/,
      );
    });

    it("rechaza demasiadas caras", () => {
      expect(() => rollExpression(`1d${DICE_LIMITS.maxSides + 1}`, tirador([1]))).toThrow(
        /Como mucho 1000 caras/,
      );
    });

    it("rechaza demasiados términos", () => {
      const larga = Array(DICE_LIMITS.maxTerms + 1)
        .fill("1")
        .join("+");
      expect(() => rollExpression(larga, tirador([]))).toThrow(/Como mucho 10 términos/);
    });

    it("acepta justo el límite: la frontera está donde dice, no uno antes", () => {
      const enElLimite = rollExpression(
        `${DICE_LIMITS.maxDicePerTerm}d${DICE_LIMITS.maxSides}`,
        () => 1,
      );
      expect(enElLimite.total).toBe(DICE_LIMITS.maxDicePerTerm);
    });
  });

  describe("el tirador por defecto", () => {
    it("nunca sale del rango del dado", () => {
      // Mil tiradas de un d6 no demuestran que sea uniforme —eso lo garantiza randomInt— pero
      // sí que nadie saca un 0 ni un 7, que es el fallo que de verdad ocurre.
      for (let i = 0; i < 1000; i++) {
        const valor = defaultRoller(6);
        expect(valor).toBeGreaterThanOrEqual(1);
        expect(valor).toBeLessThanOrEqual(6);
        expect(Number.isInteger(valor)).toBe(true);
      }
    });

    it("un d1 siempre saca 1, sin quedarse colgado", () => {
      expect(defaultRoller(1)).toBe(1);
    });
  });

  describe("normalización", () => {
    it("ignora espacios y mayúsculas, y devuelve la expresión ya normalizada", () => {
      const r = rollExpression("  2D6 + 3 ", tirador([4, 5]));
      expect(r.expression).toBe("2d6+3");
      expect(r.total).toBe(12);
    });
  });
});

describe("relanzar un dado (2C.2)", () => {
  // **La sintaxis se copia, no se inventa.** Foundry usa `r` para «relanza una vez y quédate el
  // resultado nuevo» y `rr` para la recursiva (https://foundryvtt.com/article/dice-modifiers/);
  // Roll20 escribe el mismo caso como `2d6ro<2` **porque su motor trata `<` como `<=`**
  // (https://help.roll20.net/hc/en-us/articles/360037773133-Dice-Reference). Aquí se toma la
  // forma de Foundry y NO su trampa: `<` es «menor que».
  //
  // Y `rr` no entra: **ninguna regla del SRD relanza en cascada**. El estilo de combate con arma
  // a dos manos dice «you can reroll the die and must use the new roll» — una vez, y te quedas lo
  // que salga aunque sea peor.

  it("**relanza una vez y se queda el nuevo, aunque sea peor** — la regla del arma a dos manos", () => {
    // `2d6r<3`: el primer dado saca 2, se relanza y saca **1**, que es PEOR — y se queda.
    // El caso tiene que ser este y no un 1 que se relanza a otro 1: con dos unos, quedarse el
    // mejor y quedarse el nuevo dan lo mismo, así que la prueba llevaría el nombre de una
    // propiedad que no comprueba.
    const r = rollExpression("2d6r<3", tirador([2, 1, 5]));
    expect(r.terms[0].rolled).toEqual([2, 1, 5]);
    expect(r.terms[0].kept).toEqual([1, 5]);
    expect(r.terms[0].dropped).toEqual([2]);
    expect(r.total).toBe(6);
  });

  it("y relanzar solo ocurre UNA vez: un resultado que vuelve a cumplir la condición se queda", () => {
    // Ninguna regla del SRD relanza en cascada, así que un 1 relanzado a 1 se queda en 1.
    const r = rollExpression("1d6r<3", tirador([1, 1]));
    expect(r.terms[0].rolled).toEqual([1, 1]);
    expect(r.terms[0].kept).toEqual([1]);
    expect(r.total).toBe(1);
  });

  it("el dado relanzado **se enseña**, como el descartado: no se pierde nada de lo que cayó", () => {
    const r = rollExpression("2d6r<3", tirador([2, 6, 4]));
    // Todo lo que cayó sobre la mesa, en orden.
    expect(r.terms[0].rolled).toEqual([2, 6, 4]);
    // Lo que cuenta.
    expect(r.terms[0].kept).toEqual([6, 4]);
    // Y el 2 original queda a la vista, tachado, en el mismo sitio que un dado descartado.
    expect(r.terms[0].dropped).toEqual([2]);
    expect(r.total).toBe(10);
  });

  it("`r1` sin comparador relanza solo el uno exacto — la suerte del mediano", () => {
    const r = rollExpression("1d20r1", tirador([1, 14]));
    expect(r.terms[0].rolled).toEqual([1, 14]);
    expect(r.total).toBe(14);

    const sinSuerte = rollExpression("1d20r1", tirador([2]));
    expect(sinSuerte.terms[0].rolled).toEqual([2]);
    expect(sinSuerte.terms[0].dropped).toEqual([]);
  });

  it("**`<` es «menor que», no «menor o igual»** — y esa es la diferencia con Roll20", () => {
    // Con `r<2` solo el 1 se relanza. Si `<` significara `<=`, el 2 también, y una mesa que
    // copiara la expresión de Roll20 relanzaría de más sin enterarse.
    const r = rollExpression("2d6r<2", tirador([1, 6, 2]));
    expect(r.terms[0].rolled).toEqual([1, 6, 2]);
    expect(r.terms[0].kept).toEqual([6, 2]);
  });

  it("`<=` existe para quien lo quiera decir así, y da lo mismo que `<3`", () => {
    const conMenorIgual = rollExpression("2d6r<=2", tirador([2, 5, 4]));
    expect(conMenorIgual.terms[0].kept).toEqual([5, 4]);
  });

  it("`>` y `>=` también valen: la condición no está atada a los valores bajos", () => {
    const r = rollExpression("1d6r>4", tirador([6, 3]));
    expect(r.terms[0].kept).toEqual([3]);
  });

  it("relanzar y conservar se combinan, y **el relanzado ya no compite por quedarse**", () => {
    // `4d6r1kh3`: el 1 se relanza a 2, y de {2,3,4,5} se conservan los tres mejores.
    const r = rollExpression("4d6r1kh3", tirador([1, 2, 3, 4, 5]));
    expect(r.terms[0].rolled).toEqual([1, 2, 3, 4, 5]);
    expect(r.terms[0].kept.slice().sort()).toEqual([3, 4, 5]);
    // El 1 (relanzado) y el 2 (el peor de los que quedaron) están los dos a la vista.
    expect(r.terms[0].dropped.slice().sort()).toEqual([1, 2]);
    expect(r.total).toBe(12);
  });

  it("una condición que el dado no puede sacar es un error, no una expresión que no hace nada", () => {
    // `1d6r8` no relanzaría nunca: quien la escribió quería otra cosa.
    expect(() => rollExpression("1d6r8")).toThrow(DiceExpressionError);
    try {
      rollExpression("1d6r8");
    } catch (e) {
      expect((e as DiceExpressionError).code).toBe("RELANZAR_FUERA_DE_RANGO");
    }
  });

  it("y `r>0`, que relanzaría siempre, también se rechaza", () => {
    try {
      rollExpression("1d6r>0");
      throw new Error("debería haber fallado");
    } catch (e) {
      expect((e as DiceExpressionError).code).toBe("RELANZAR_FUERA_DE_RANGO");
    }
  });

  it("el orden es fijo: `4d6kh3r1` no se entiende, y decirlo es mejor que adivinarlo", () => {
    try {
      rollExpression("4d6kh3r1");
      throw new Error("debería haber fallado");
    } catch (e) {
      expect((e as DiceExpressionError).code).toBe("SINTAXIS");
    }
  });
});

describe("el término constante tiene tope (ficha P2)", () => {
  it("**`1d20+999999999` se rechaza**, y hasta 2C.2 se aceptaba y se guardaba", () => {
    try {
      rollExpression("1d20+999999999");
      throw new Error("debería haber fallado");
    } catch (e) {
      expect((e as DiceExpressionError).code).toBe("CONSTANTE_DEMASIADO_GRANDE");
    }
  });

  it("el tope deja sitio de sobra para cualquier modificador real", () => {
    expect(() => rollExpression(`1d20+${DICE_LIMITS.maxConstant}`)).not.toThrow();
    expect(() => rollExpression(`1d20+${DICE_LIMITS.maxConstant + 1}`)).toThrow(
      DiceExpressionError,
    );
  });

  it("también acota el término negativo, que es la misma cifra con otro signo", () => {
    try {
      rollExpression("1d20-999999999");
      throw new Error("debería haber fallado");
    } catch (e) {
      expect((e as DiceExpressionError).code).toBe("CONSTANTE_DEMASIADO_GRANDE");
    }
  });
});

describe("contrato de `dice` (2026-09-17)", () => {
  it("el tope del esquema cubre el peor caso del evaluador: términos × dados × relanzar una vez", () => {
    expect(DICE_LIMITS.maxTerms * DICE_LIMITS.maxDicePerTerm * 2).toBeLessThanOrEqual(
      MAX_DADOS_POR_TIRADA,
    );
  });

  it("100d6r1 con todo unos produce 200 dados y el esquema los acepta", () => {
    // Peor caso real: CADA tirada original y su relanzamiento salen 1, así los 100 dados
    // relanzan y `rolled` guarda las dos caras de cada uno (200 llamadas al tirador). Un guion
    // que solo cubra las primeras 100 llamadas deja a la mitad de los dados sin relanzar (su
    // primera tirada ya cae después del corte) y nunca llega a 200: no es el peor caso.
    const roller: Roller = () => 1;
    const r = rollExpression("100d6r1", roller);
    const dice = dadosTirados(r.terms);
    expect(dice).toHaveLength(200);
    expect(() => z.array(dieRolledSchema).max(MAX_DADOS_POR_TIRADA).parse(dice)).not.toThrow();

    // El contrato completo del evento tampoco miente: `rolls`/`kept`/`dropped` comparten el
    // mismo tope que `dice` (revisión final, #4) — 200 valores en cada uno debe pasar el
    // esquema del payload `ABILITY_ROLL`, no solo el de `dieRolledSchema` suelto.
    const doscientos = Array.from({ length: 200 }, () => 1);
    expect(() =>
      gameEventPayloadSchema.parse({
        type: "ABILITY_ROLL",
        expression: "100d6r1",
        rolls: doscientos,
        kept: doscientos,
        dropped: [],
        dice,
        modifier: 0,
        total: r.total,
      }),
    ).not.toThrow();
  });

  it("empate en kh: se conserva el primero en caer (sort estable), siempre el mismo", () => {
    const r = rollExpression("2d20kh1", () => 15);
    const dice = dadosTirados(r.terms);
    expect(dice.map((d) => d.kept)).toEqual([true, false]);
  });

  it("relanzar: el físico descartado es el PRIMERO en caer, no el que empareje por valor", () => {
    // `1d20r1` con el tirador sacando siempre 1: el primero se relanza (cae fuera) y el segundo,
    // aunque tenga el mismo valor, es el que cuenta. Por valor son indistinguibles — por posición
    // no: el evaluador ya sabe cuál es cuál, y `dadosTirados` solo debe repetirlo.
    const r = rollExpression("1d20r1", () => 1);
    const dice = dadosTirados(r.terms);
    expect(dice).toEqual([
      { sides: 20, value: 1, kept: false },
      { sides: 20, value: 1, kept: true },
    ]);
  });

  it("relanzar + kh combinados: cada físico se marca por su propia razón para caer", () => {
    // `4d6r1kh3`: el primer dado sale 1, relanza y vuelve a salir 1 (se queda, aunque sea peor);
    // los otros tres salen 6, 5, 4. `enJuego` queda [1, 6, 5, 4] y kh3 descarta el más bajo, que
    // es ese mismo 1 relanzado — cae por relanzar Y por kh3, pero solo se cuenta una vez tachado.
    const r = rollExpression("4d6r1kh3", tirador([1, 1, 6, 5, 4]));
    const [t] = r.terms;
    expect(t.rolled).toEqual([1, 1, 6, 5, 4]);
    // La suma y el desglose por valor no cambian con este arreglo: sigue siendo el mismo cálculo.
    expect(t.kept).toEqual([6, 5, 4]);
    expect(t.dropped).toEqual([1, 1]);
    const dice = dadosTirados(r.terms);
    expect(dice.map((d) => d.kept)).toEqual([false, false, true, true, true]);
  });
});

describe("dadosTirados", () => {
  it("empareja cada dado con sus caras y marca los descartados de kh/kl y los relanzados", () => {
    const r = rollExpression("4d6kh3+1d4", tirador([3, 5, 1, 6, 2, 4]));
    expect(dadosTirados(r.terms)).toEqual([
      { sides: 6, value: 3, kept: true },
      { sides: 6, value: 5, kept: true },
      { sides: 6, value: 1, kept: false },
      { sides: 6, value: 6, kept: true },
      { sides: 4, value: 2, kept: true },
    ]);
  });

  it("con 2d6 iguales y un descartado, tacha uno y no los dos", () => {
    const r = rollExpression("2d6kh1", tirador([4, 4]));
    expect(dadosTirados(r.terms).filter((d: { kept: boolean }) => !d.kept)).toHaveLength(1);
  });

  it("una constante no es un dado", () => {
    expect(dadosTirados(rollExpression("1d8+3", tirador([5])).terms)).toEqual([
      { sides: 8, value: 5, kept: true },
    ]);
  });
});
