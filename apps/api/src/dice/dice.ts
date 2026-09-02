import { randomInt } from "node:crypto";

// Tarea 2A.1 — evaluador de expresiones de dados. Puro: sin HTTP, sin Prisma, sin personaje.
//
// **Por qué vive en la API y no en `packages/shared`.** Una tirada tiene que ser autoritativa
// del servidor: un evaluador en el navegador es un evaluador que el jugador puede convencer de
// que sacó un 20. La web solo necesita **enseñar** el resultado estructurado que le llega, no
// producirlo. Cuando 2C traiga la pantalla de tiradas, pedirá una tirada, no la hará.
//
// La salida **nunca es un número suelto**. Un total sin los dados que lo produjeron no se puede
// discutir en una mesa, y discutir una tirada es la mitad de la gracia: se devuelve qué se tiró,
// qué se conservó y qué se descartó, término a término.

/** Devuelve un entero entre 1 y `sides`, ambos incluidos. Inyectable para poder probar. */
export type Roller = (sides: number) => number;

/**
 * El tirador por defecto usa `crypto.randomInt`, que es uniforme por construcción.
 * `Math.random()` habría bastado estadísticamente, pero el sesgo de módulo que aparece al
 * escalarlo a mano es justo el tipo de detalle que nadie revisa y que hace que un d20 saque
 * menos veces 20 de las que debe. Aquí las cifras importan.
 */
export const defaultRoller: Roller = (sides) => randomInt(1, sides + 1);

// Límites duros. La expresión llega de una persona, y `9999d9999` no puede tumbar el proceso ni
// llenar la memoria con un array de diez millones de enteros.
export const DICE_LIMITS = {
  maxDicePerTerm: 100,
  maxSides: 1000,
  maxTerms: 10,
} as const;

export type DiceErrorCode =
  | "EXPRESION_VACIA"
  | "SINTAXIS"
  | "DEMASIADOS_TERMINOS"
  | "DEMASIADOS_DADOS"
  | "DEMASIADAS_CARAS"
  | "CONSERVAR_MAS_DE_LO_TIRADO"
  | "CONSERVAR_CERO";

/**
 * Error tipado, nunca `NaN`. Una expresión inválida es una respuesta 400 con un motivo que se
 * puede enseñar, no un total silencioso que miente.
 */
export class DiceExpressionError extends Error {
  constructor(
    readonly code: DiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DiceExpressionError";
  }
}

export interface DiceTermResult {
  /** El trozo de la expresión que produjo este término, tal cual se escribió. */
  source: string;
  /**
   * Caras del dado, o `0` en una constante. Lo añadió 2A.13: para decir si una tirada es un
   * **20 natural** hay que saber que el dado era de veinte, y la alternativa era volver a
   * analizar `source` con una segunda copia del analizador — que es como dos copias del mismo
   * dato acaban discrepando.
   */
  sides: number;
  /** `+1` o `-1`: el signo con el que entra en el total. */
  sign: 1 | -1;
  /** Todos los dados tirados, en el orden en que salieron. Vacío en una constante. */
  rolled: number[];
  /** Los que cuentan. En una constante, su valor. */
  kept: number[];
  /** Los que se descartaron por `kh`/`kl`. Nunca se pierden: se enseñan. */
  dropped: number[];
  /** Lo que aporta al total, **sin signo**. El signo va aparte para poder pintarlo. */
  value: number;
}

export interface DiceRollResult {
  /** La expresión normalizada (sin espacios, en minúsculas). */
  expression: string;
  terms: DiceTermResult[];
  total: number;
}

// NdM, con `N` opcional (`d20` es `1d20`, que es como lo escribe todo el mundo), y un
// `kh`/`kl` opcional con su número. `d` a secas o `4d` no encajan: falta el número de caras.
const TERMINO_DADOS = /^(\d*)d(\d+)(?:(kh|kl)(\d+))?$/;
const TERMINO_CONSTANTE = /^(\d+)$/;

/**
 * Analiza y evalúa una expresión de dados.
 *
 * Acepta `4d6kh3`, `2d20kh1`, `2d20kl1`, `2d6+3`, `1d100`, `d20`, `10-1d4`.
 * Rechaza cualquier otra cosa con un `DiceExpressionError`.
 */
export function rollExpression(expression: string, roller: Roller = defaultRoller): DiceRollResult {
  const normalizada = expression.replace(/\s+/g, "").toLowerCase();
  if (normalizada === "") {
    throw new DiceExpressionError("EXPRESION_VACIA", "La expresión está vacía.");
  }

  // Se parte por los signos conservándolos, para saber con qué signo entra cada término. Un
  // primer término sin signo es positivo.
  const trozos = normalizada.split(/([+-])/).filter((t) => t !== "");
  const terminos: { sign: 1 | -1; source: string }[] = [];
  let signo: 1 | -1 = 1;
  let esperandoTermino = true;

  for (const trozo of trozos) {
    if (trozo === "+" || trozo === "-") {
      if (esperandoTermino) {
        throw new DiceExpressionError("SINTAXIS", `Falta un término antes de «${trozo}».`);
      }
      signo = trozo === "-" ? -1 : 1;
      esperandoTermino = true;
      continue;
    }
    terminos.push({ sign: signo, source: trozo });
    esperandoTermino = false;
  }

  // `1d6+` termina esperando un término que no llega.
  if (esperandoTermino) {
    throw new DiceExpressionError("SINTAXIS", "La expresión termina en un signo suelto.");
  }
  if (terminos.length > DICE_LIMITS.maxTerms) {
    throw new DiceExpressionError(
      "DEMASIADOS_TERMINOS",
      `Como mucho ${DICE_LIMITS.maxTerms} términos; llegaron ${terminos.length}.`,
    );
  }

  const resultados = terminos.map(({ sign, source }) => evaluarTermino(source, sign, roller));
  const total = resultados.reduce((suma, t) => suma + t.sign * t.value, 0);

  return { expression: normalizada, terms: resultados, total };
}

function evaluarTermino(source: string, sign: 1 | -1, roller: Roller): DiceTermResult {
  const constante = TERMINO_CONSTANTE.exec(source);
  if (constante) {
    const valor = Number(constante[1]);
    return { source, sign, sides: 0, rolled: [], kept: [valor], dropped: [], value: valor };
  }

  const dados = TERMINO_DADOS.exec(source);
  if (!dados) {
    throw new DiceExpressionError(
      "SINTAXIS",
      `No entiendo «${source}». Se esperaba algo como 4d6, 2d20kh1 o un número.`,
    );
  }

  const [, cuentaCruda, carasCrudas, modo, conservarCrudo] = dados;
  // `d20` sin número es `1d20`: es como se escribe en cualquier mesa y en cualquier manual.
  const cuenta = cuentaCruda === "" ? 1 : Number(cuentaCruda);
  const caras = Number(carasCrudas);

  if (cuenta < 1) {
    throw new DiceExpressionError("SINTAXIS", "Hay que tirar al menos un dado.");
  }
  if (cuenta > DICE_LIMITS.maxDicePerTerm) {
    throw new DiceExpressionError(
      "DEMASIADOS_DADOS",
      `Como mucho ${DICE_LIMITS.maxDicePerTerm} dados por término; llegaron ${cuenta}.`,
    );
  }
  if (caras < 1) {
    throw new DiceExpressionError("SINTAXIS", "Un dado necesita al menos una cara.");
  }
  if (caras > DICE_LIMITS.maxSides) {
    throw new DiceExpressionError(
      "DEMASIADAS_CARAS",
      `Como mucho ${DICE_LIMITS.maxSides} caras; llegaron ${caras}.`,
    );
  }

  const rolled: number[] = [];
  for (let i = 0; i < cuenta; i++) rolled.push(roller(caras));

  if (!modo) {
    return {
      source,
      sign,
      sides: caras,
      rolled,
      kept: [...rolled],
      dropped: [],
      value: suma(rolled),
    };
  }

  const conservar = Number(conservarCrudo);
  if (conservar < 1) {
    throw new DiceExpressionError("CONSERVAR_CERO", "Hay que conservar al menos un dado.");
  }
  if (conservar > cuenta) {
    throw new DiceExpressionError(
      "CONSERVAR_MAS_DE_LO_TIRADO",
      `«${source}» conserva ${conservar} dados de ${cuenta} tirados.`,
    );
  }

  // Se ordena una COPIA con su posición original, y se decide sobre ella; `rolled` conserva el
  // orden en que salieron los dados, que es lo que la mesa vio caer sobre el tablero.
  const porValor = rolled.map((valor, indice) => ({ valor, indice }));
  porValor.sort((a, b) => (modo === "kh" ? b.valor - a.valor : a.valor - b.valor));
  const indicesConservados = new Set(porValor.slice(0, conservar).map((d) => d.indice));

  const kept: number[] = [];
  const dropped: number[] = [];
  rolled.forEach((valor, indice) => {
    if (indicesConservados.has(indice)) kept.push(valor);
    else dropped.push(valor);
  });

  return { source, sign, sides: caras, rolled, kept, dropped, value: suma(kept) };
}

function suma(valores: number[]): number {
  return valores.reduce((a, b) => a + b, 0);
}
