import { BadRequestException } from "@nestjs/common";
import {
  costeDePuntos,
  esPermutacionDe,
  MATRIZ_ESTANDAR,
  ORDEN_DE_CARACTERISTICAS,
  type AbilitiesRule,
  type AbilityKey,
  type OroInicial,
  type PgNivelesSiguientes,
} from "@dnd/shared";
import {
  dadosTirados,
  rollExpression,
  type DiceRollResult,
  type DieRolled,
  type Roller,
} from "../dice/dice";
import type { SrdClass } from "./catalog/types";

// Reglas de la mesa (D-CF-53): las comprobaciones puras que `character-sheet.service.ts` y
// `ability-rolls.service.ts` llaman. Sin Prisma, para que se prueben solas.
//
// SRD 5.1, *Determine Ability Scores*: «Roll four 6-sided dice and record the total of the highest
// three dice […] you can use the following scores instead: 15, 14, 13, 12, 10, 8.» Variant
// *Customizing Ability Scores*: «you have 27 points to spend […] you can't have a score lower than 8
// or higher than 15 before applying racial increases.»
// SRD 5.1, *Beyond 1st Level*: «roll the Hit Die for your class […] or use the fixed value shown in
// your class entry, which is the average result of the die roll rounded up.»

const NOMBRE_METODO: Record<AbilitiesRule["metodo"], string> = {
  LIBRE: "libres",
  MATRIZ: "la matriz estándar",
  PUNTOS: "compra por puntos",
  DADOS: "dados",
};

export function validarCaracteristicas(
  regla: AbilitiesRule,
  seis: Record<AbilityKey, number>,
  intento?: { values: number[] },
): void {
  const valores = ORDEN_DE_CARACTERISTICAS.map((k) => seis[k]);
  switch (regla.metodo) {
    case "LIBRE":
      return;
    case "MATRIZ":
      if (!esPermutacionDe(valores, MATRIZ_ESTANDAR)) {
        throw new BadRequestException(
          `Con ${NOMBRE_METODO.MATRIZ} las seis características tienen que ser 15, 14, 13, 12, 10 y 8, cada una una vez.`,
        );
      }
      return;
    case "PUNTOS": {
      let coste: number;
      try {
        coste = costeDePuntos(valores);
      } catch {
        throw new BadRequestException(
          `Con ${NOMBRE_METODO.PUNTOS} cada característica va de 8 a 15.`,
        );
      }
      if (coste > regla.puntos) {
        throw new BadRequestException(
          `Esas características cuestan ${coste} puntos y la mesa da ${regla.puntos}.`,
        );
      }
      return;
    }
    case "DADOS": {
      if (!intento) {
        throw new BadRequestException(
          "Con dados, las características salen de un intento tirado por el servidor: manda attemptId.",
        );
      }
      const encaja = regla.asignacionLibre
        ? esPermutacionDe(valores, intento.values)
        : valores.every((v, i) => v === intento.values[i]);
      if (!encaja) {
        throw new BadRequestException(
          regla.asignacionLibre
            ? "Las seis características tienen que ser exactamente los seis valores del intento, repartidos como quieras."
            : "Con esta regla los seis valores van en el orden en que salieron: Fuerza, Destreza, Constitución, Inteligencia, Sabiduría, Carisma.",
        );
      }
      return;
    }
  }
}

export function comprobarPermitido(
  permitidos: string[],
  key: string,
  nombre: string,
  que: "raza" | "clase" | "subclase",
): void {
  if (permitidos.length === 0 || permitidos.includes(key)) return;
  throw new BadRequestException(`La ${que} «${nombre}» no está permitida en esta mesa.`);
}

export function pgDeLosNivelesSiguientes(
  hitDie: number,
  nivel: number,
  modo: PgNivelesSiguientes,
  roller?: Roller,
): { valores: number[]; tiradas: DiceRollResult[] } | null {
  if (modo === "MEDIA" || nivel <= 1) return null;
  const cuantos = nivel - 1;
  if (modo === "MAXIMO")
    return { valores: Array.from({ length: cuantos }, () => hitDie), tiradas: [] };
  const tiradas = Array.from({ length: cuantos }, () => rollExpression(`1d${hitDie}`, roller));
  return { valores: tiradas.map((t) => t.total), tiradas };
}

export function oroInicialDe(
  regla: OroInicial,
  clase: SrdClass,
  roller?: Roller,
): { gp: number; tirada?: DiceRollResult } | null {
  switch (regla.modo) {
    case "EQUIPO":
      return null;
    case "ORO_FIJO":
      return { gp: regla.cantidadPo };
    case "ORO_TABLA": {
      const tirada = rollExpression(clase.startingGold.dice, roller);
      return { gp: tirada.total * clase.startingGold.times, tirada };
    }
  }
}

/**
 * El mismo desglose que ya escribe `RollsService.roll` — se extrae aquí (D-CF-65 lo pide, Task
 * 3 y 4 lo comparten) para no tener dos formas de leer un `DiceRollResult` que puedan discrepar.
 */
export function desgloseDeTirada(resultado: DiceRollResult): {
  expression: string;
  rolls: number[];
  kept: number[];
  dropped: number[];
  dice: DieRolled[];
  modifier: number;
  total: number;
} {
  const rolls = resultado.terms.flatMap((t) => t.rolled);
  const kept = resultado.terms.flatMap((t) => (t.sides > 0 ? t.kept : []));
  const dropped = resultado.terms.flatMap((t) => t.dropped);
  const dice = dadosTirados(resultado.terms);
  const modifier = resultado.terms
    .filter((t) => t.sides === 0)
    .reduce((suma, t) => suma + t.sign * t.value, 0);
  return {
    expression: resultado.expression,
    rolls,
    kept,
    dropped,
    dice,
    modifier,
    total: resultado.total,
  };
}
