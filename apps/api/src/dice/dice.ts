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
 * Token del tirador. `Roller` es un alias de tipo y Nest solo vería `Function`, así que se
 * inyecta por token. **Lo provee `DiceModule` (global) con `defaultRoller`**; hasta la ola de
 * arreglos 1 de la puerta de efectos no lo proveía nadie, y un `overrideProvider` en un e2e era
 * un no-op silencioso (ver `dice.module.ts`).
 */
export const DICE_ROLLER = "DICE_ROLLER";

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
  /**
   * **El término constante también tiene tope, desde 2C.2** (ficha P2 de `docs/06-pendientes.md`).
   *
   * No lo tenía: la rama que reconoce un número hacía `Number(...)` y lo devolvía sin comprobar
   * nada, así que `1d20+999999999` se aceptaba, se guardaba y se escribía en el registro de la
   * partida. No tumbaba nada —el evaluador ya estaba protegido contra `9999d9999`, que era el
   * riesgo real— pero dejaba pasar una cifra sin sentido a un registro que se lee después.
   *
   * **Mil, y el número sale de «qué cifra ya no puede ser un error de tecleo»**, no del rango de
   * la 5.ª edición: el modificador más alto que produce una hoja legítima está por debajo de 30,
   * y un objeto mágico o una regla de la casa no llegan a tres cifras. Mil deja sitio de sobra
   * para lo raro y corta lo absurdo.
   */
  maxConstant: 1000,
} as const;

export type DiceErrorCode =
  | "EXPRESION_VACIA"
  | "SINTAXIS"
  | "DEMASIADOS_TERMINOS"
  | "DEMASIADOS_DADOS"
  | "DEMASIADAS_CARAS"
  | "CONSERVAR_MAS_DE_LO_TIRADO"
  | "CONSERVAR_CERO"
  | "CONSTANTE_DEMASIADO_GRANDE"
  | "RELANZAR_FUERA_DE_RANGO";

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
  /**
   * Los que **no cuentan**, y nunca se pierden: se enseñan.
   *
   * Dos motivos distintos caen aquí, y a propósito comparten campo: un dado descartado por
   * `kh`/`kl`, y **el valor original de un dado relanzado** (2C.2). Para la pantalla son lo
   * mismo —un dado que cayó sobre la mesa y no suma—, y `dadosDeLaTirada`
   * (`apps/web/src/features/rolls/desglose.ts`) ya los tacha emparejándolos contra `rolled` como
   * multiconjunto, así que relanzar **no necesitó tocar la pantalla**.
   */
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

// NdM, con `N` opcional (`d20` es `1d20`, que es como lo escribe todo el mundo), un `r` opcional
// para relanzar y un `kh`/`kl` opcional con su número. `d` a secas o `4d` no encajan: falta el
// número de caras.
//
// **El orden es fijo: primero relanzar, después conservar** (`4d6r1kh3`, no `4d6kh3r1`). Foundry
// admite los modificadores en cualquier orden, y eso obliga a decidir aparte en qué orden se
// aplican; aquí la sintaxis dice el orden, que es el que la regla del juego pide —se relanza el
// dado, y de lo que quede se conserva lo mejor— y no hay una segunda forma de escribir lo mismo.
const TERMINO_DADOS = /^(\d*)d(\d+)(?:r(<=|>=|<|>)?(\d+))?(?:(kh|kl)(\d+))?$/;
const TERMINO_CONSTANTE = /^(\d+)$/;

/**
 * Analiza y evalúa una expresión de dados.
 *
 * Acepta `4d6kh3`, `2d20kh1`, `2d20kl1`, `2d6+3`, `1d100`, `d20`, `10-1d4`, y desde 2C.2
 * **relanzar**: `2d6r<3` (arma a dos manos), `1d20r1` (suerte del mediano), `4d6r1kh3`.
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
    if (valor > DICE_LIMITS.maxConstant) {
      throw new DiceExpressionError(
        "CONSTANTE_DEMASIADO_GRANDE",
        `Como mucho ${DICE_LIMITS.maxConstant} de modificador; llegó ${valor}.`,
      );
    }
    return { source, sign, sides: 0, rolled: [], kept: [valor], dropped: [], value: valor };
  }

  const dados = TERMINO_DADOS.exec(source);
  if (!dados) {
    throw new DiceExpressionError(
      "SINTAXIS",
      `No entiendo «${source}». Se esperaba algo como 4d6, 2d20kh1 o un número.`,
    );
  }

  const [, cuentaCruda, carasCrudas, comparador, relanzarCrudo, modo, conservarCrudo] = dados;
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

  // `rolled` conserva **todo** lo que cayó sobre la mesa, en orden, incluidos los dados que se
  // relanzaron: la mesa los vio caer. `enJuego` es lo que sigue contando después de relanzar.
  const rolled: number[] = [];
  const enJuego: number[] = [];
  const relanzados: number[] = [];

  const relanzar =
    relanzarCrudo === undefined
      ? null
      : condicionDeRelanzar(comparador, Number(relanzarCrudo), caras);

  for (let i = 0; i < cuenta; i++) {
    const primero = roller(caras);
    rolled.push(primero);
    if (relanzar && relanzar(primero)) {
      // **Se relanza UNA vez y se usa el resultado nuevo, aunque sea peor.** Es lo que dicen las
      // reglas que lo piden: el estilo de combate con arma a dos manos —«you can reroll the die
      // and must use the new roll»— y la suerte del mediano. Ninguna regla del SRD relanza en
      // cascada, así que la recursión de Foundry (`rr`) no entra: sería una sintaxis que ninguna
      // regla de este juego usa, y un bucle que habría que acotar.
      const segundo = roller(caras);
      rolled.push(segundo);
      relanzados.push(primero);
      enJuego.push(segundo);
    } else {
      enJuego.push(primero);
    }
  }

  if (!modo) {
    return {
      source,
      sign,
      sides: caras,
      rolled,
      kept: [...enJuego],
      dropped: [...relanzados],
      value: suma(enJuego),
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
  //
  // **Y se decide sobre lo que quedó en juego, no sobre `rolled`**: en `4d6r1kh3` el uno que se
  // relanzó ya no compite por quedarse. Ordenar `rolled` dejaría que un dado relanzado «ganara»
  // con su valor viejo, que es el fallo silencioso de combinar los dos modificadores.
  const porValor = enJuego.map((valor, indice) => ({ valor, indice }));
  porValor.sort((a, b) => (modo === "kh" ? b.valor - a.valor : a.valor - b.valor));
  const indicesConservados = new Set(porValor.slice(0, conservar).map((d) => d.indice));

  const kept: number[] = [];
  const dropped: number[] = [...relanzados];
  enJuego.forEach((valor, indice) => {
    if (indicesConservados.has(indice)) kept.push(valor);
    else dropped.push(valor);
  });

  return { source, sign, sides: caras, rolled, kept, dropped, value: suma(kept) };
}

/**
 * La condición de relanzar, como función.
 *
 * **Los comparadores significan lo que dicen.** `<3` es «menor que tres», así que relanza el 1 y
 * el 2 — que es justo el estilo de combate con arma a dos manos. Roll20 trata `<` como `<=` en su
 * motor de dados, y por eso su notación del mismo caso es `2d6ro<2`; **eso no se copia**: un
 * operador que no significa lo que pone es una trampa que se paga cada vez que alguien escribe
 * una expresión nueva. Aquí el mismo caso se escribe `2d6r<3` o `2d6r<=2`, y las dos dicen lo
 * mismo porque los dos operadores dicen lo que ponen.
 *
 * Sin comparador, `r1` es «relanza si sale exactamente un 1», que es la forma corta de siempre.
 */
function condicionDeRelanzar(
  comparador: string | undefined,
  valor: number,
  caras: number,
): (dado: number) => boolean {
  // **Fuera del rango del dado no es un matiz, es un error de escritura.** `1d6r8` no relanzaría
  // nunca y `1d6r>0` relanzaría siempre: las dos son expresiones que quien las escribió no quería.
  if (valor < 1 || valor > caras) {
    throw new DiceExpressionError(
      "RELANZAR_FUERA_DE_RANGO",
      `Un d${caras} no puede sacar ${valor}, así que «r${comparador ?? ""}${valor}» no relanza lo que crees.`,
    );
  }
  switch (comparador) {
    case "<":
      return (dado) => dado < valor;
    case "<=":
      return (dado) => dado <= valor;
    case ">":
      return (dado) => dado > valor;
    case ">=":
      return (dado) => dado >= valor;
    default:
      return (dado) => dado === valor;
  }
}

function suma(valores: number[]): number {
  return valores.reduce((a, b) => a + b, 0);
}

/** Un dado como cayó, con sus caras y si cuenta. Es lo que la pantalla pinta uno a uno (C5). */
export interface DieRolled {
  sides: number;
  value: number;
  kept: boolean;
}

/**
 * Los dados de todos los términos, en orden, con sus caras. `dropped` se consume como
 * multiconjunto —igual que `dadosDeLaTirada` en la web— para que `[4, 4]` con un descartado
 * tache uno y no los dos. Las constantes no son dados.
 */
export function dadosTirados(terms: DiceTermResult[]): DieRolled[] {
  return terms.flatMap((t) => {
    if (t.sides === 0) return [];
    const pendientes = [...t.dropped];
    return t.rolled.map((value) => {
      const i = pendientes.indexOf(value);
      if (i === -1) return { sides: t.sides, value, kept: true };
      pendientes.splice(i, 1);
      return { sides: t.sides, value, kept: false };
    });
  });
}
