import type { GameEventPayload } from "@dnd/shared";

// **De un suceso de tirada a la tirada incrustada de la maqueta**
// (`prototipo/src/features/TiradaIncrustada.tsx`): quién, qué prueba, contra qué dificultad, qué
// salió, y el desglose de «De dónde sale».
//
// La maqueta trae el desglose escrito a mano en sus datos. Aquí **sale entero del payload**, que
// para eso lo guarda: `ABILITY_ROLL` conserva lo que salió, lo que se conservó y lo que se
// descartó justo para poder auditarlo. Ni un número de esta pantalla se calcula en el cliente.

export interface PasoDeDesglose {
  origen: string;
  valor: string;
}

export interface DatosDeTirada {
  /** Qué se tiró, en palabras. */
  prueba: string;
  /** La dificultad, si el suceso la trae. */
  dificultad?: number;
  /** Lo que salió. */
  resultado: number;
  /** `null` cuando la tirada no iba contra nada: hay número, pero no hay veredicto. */
  veredicto: "EXITO" | "FALLO" | null;
  desglose: PasoDeDesglose[];
}

function conSigno(n: number): string {
  return n >= 0 ? `+${n}` : String(n);
}

/**
 * Los datos de la tirada incrustada, o `null` si este suceso no tiene números que enseñar.
 *
 * `ligada` es la tirada de la que cuelga un ataque (`ATTACK_RESOLVED.rollEventId`): el veredicto
 * de un ataque no trae números propios, los toma de la tirada que lo produjo. Si esa tirada no
 * está en la ventana del registro que se ha pedido —o si el espectador no puede verla— se
 * devuelve `null` y el mensaje se lee como la frase que ya escribe `linea-de-log.ts`. **No se
 * inventa un desglose que no llegó.**
 */
export function datosDeTirada(
  p: GameEventPayload,
  ligada?: GameEventPayload | null,
): DatosDeTirada | null {
  switch (p.type) {
    case "ABILITY_ROLL": {
      const desglose: PasoDeDesglose[] = [{ origen: "Expresión", valor: p.expression }];
      if (p.rolls.length > 0) desglose.push({ origen: "Dados", valor: p.rolls.join(", ") });
      if (p.dropped.length > 0) {
        desglose.push({ origen: "Se conserva", valor: p.kept.join(", ") });
        desglose.push({ origen: "Se descarta", valor: p.dropped.join(", ") });
      }
      if (p.modifier !== 0) desglose.push({ origen: "Modificador", valor: conSigno(p.modifier) });
      desglose.push({ origen: "Total", valor: String(p.total) });
      if (p.dc !== undefined) desglose.push({ origen: "Dificultad", valor: String(p.dc) });
      // `natural` y `outcome` son dos hechos distintos y el esquema los guarda aparte: un 20
      // natural que no llega a la dificultad sigue siendo un 20 natural, y en la traza se ve.
      if (p.natural === "TWENTY") desglose.push({ origen: "Dado natural", valor: "20" });
      if (p.natural === "ONE") desglose.push({ origen: "Dado natural", valor: "1" });
      return {
        prueba: p.reason ?? "Tirada",
        dificultad: p.dc,
        resultado: p.total,
        veredicto: p.outcome === "SUCCESS" ? "EXITO" : p.outcome === "FAILURE" ? "FALLO" : null,
        desglose,
      };
    }

    case "DEATH_SAVE":
      return {
        prueba: "Salvación de muerte",
        resultado: p.roll,
        // Cuatro resultados y dos tonos: un 20 natural devuelve a la vida y un 1 cuenta doble,
        // pero de cara al color solo hay «fue bien» o «fue mal». La frase entera, con el matiz,
        // la escribe `linea-de-log.ts` encima del bloque.
        veredicto: p.result === "SUCCESS" || p.result === "CRIT_SUCCESS" ? "EXITO" : "FALLO",
        desglose: [
          { origen: "Dado (d20)", valor: String(p.roll) },
          { origen: "Éxitos", valor: String(p.successes) },
          { origen: "Fracasos", valor: String(p.failures) },
        ],
      };

    case "TABLE_ROLLED":
      return {
        prueba: `Tabla «${p.tableName}»`,
        resultado: p.roll,
        // Una tabla no se supera ni se falla: sale lo que sale.
        veredicto: null,
        desglose: [
          { origen: "Dado", valor: `d${p.die}` },
          { origen: "Sale", valor: String(p.roll) },
          { origen: "Resultado", valor: p.text },
        ],
      };

    case "ATTACK_RESOLVED": {
      if (!ligada || ligada.type !== "ABILITY_ROLL") return null;
      const desglose: PasoDeDesglose[] = [{ origen: "Expresión", valor: ligada.expression }];
      if (ligada.rolls.length > 0)
        desglose.push({ origen: "Dados", valor: ligada.rolls.join(", ") });
      if (ligada.dropped.length > 0) {
        desglose.push({ origen: "Se conserva", valor: ligada.kept.join(", ") });
        desglose.push({ origen: "Se descarta", valor: ligada.dropped.join(", ") });
      }
      if (ligada.modifier !== 0) {
        desglose.push({ origen: "Modificador", valor: conSigno(ligada.modifier) });
      }
      desglose.push({ origen: "Total", valor: String(ligada.total) });
      if (ligada.natural === "TWENTY") desglose.push({ origen: "Dado natural", valor: "20" });
      if (ligada.natural === "ONE") desglose.push({ origen: "Dado natural", valor: "1" });
      return {
        prueba: p.attackName,
        // **Sin dificultad, y no es un olvido**: la dificultad de un ataque es la CA del
        // objetivo, y el esquema de `ATTACK_RESOLVED` dice con todas las letras que lo que sale
        // es la palabra —impacta, falla, crítico—, nunca el número contra el que se tiró. Aquí
        // se respeta aunque la tirada ligada lo traiga.
        resultado: ligada.total,
        veredicto: p.verdict === "MISS" ? "FALLO" : "EXITO",
        desglose,
      };
    }

    default:
      return null;
  }
}
