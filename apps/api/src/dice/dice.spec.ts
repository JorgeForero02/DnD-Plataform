import {
  rollExpression,
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
