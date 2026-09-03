import type { DerivedValue, RollResult, TraceStep } from "@dnd/shared";
import { traducirLabelKey } from "../character-sheet/vocabulario";

// Tarea F3 — **el desglose de la suma, siempre**. Nunca un número solo.
//
// Esto es lo mismo que la hoja ya hace con sus valores derivados (`formulaDeUnaLinea`, en
// `features/character-sheet/Traza.tsx`, §3 de la especificación de la hoja): un número calculado
// sin contexto se cree ciegamente aunque esté mal. Aquí se aplica al resultado de una tirada:
//
//     17 = 12 dado +3 modificador de destreza +2 bonificador de competencia
//
// **Mismo algoritmo que `formulaDeUnaLinea`, a propósito**: mismos criterios de resumen (base
// más los dos sumandos que más pesan, y «y N más» a partir de ahí), mismo signo menos tipográfico
// y mismo `traducirLabelKey`. Si dos sitios explicaran la misma suma de dos maneras distintas,
// uno de los dos acabaría mintiendo. **Está duplicado, no compartido**, porque `Traza.tsx` es de
// otro carril de trabajo hoy; ver el informe de F3 para la unificación pendiente.

/** Un dado tal como cayó, diciendo si cuenta o si lo descartó un `kh`/`kl`. */
export interface DadoDeLaTirada {
  valor: number;
  conservado: boolean;
}

/**
 * Los dados **en el orden en que salieron**, marcando cuál se descartó.
 *
 * El servidor devuelve `rolls` (todos, en orden), `kept` y `dropped` (sin orden útil), así que
 * el emparejamiento se hace consumiendo `dropped` como multiconjunto: con `rolls: [8, 8]` y
 * `dropped: [8]` hay que tachar **uno** de los dos ochos, no los dos. Cotejar por valor sin
 * consumir es el fallo obvio y silencioso de esta función.
 */
export function dadosDeLaTirada(
  resultado: Pick<RollResult, "rolls" | "dropped">,
): DadoDeLaTirada[] {
  const pendientes = [...resultado.dropped];
  return resultado.rolls.map((valor) => {
    const i = pendientes.indexOf(valor);
    if (i === -1) return { valor, conservado: true };
    pendientes.splice(i, 1);
    return { valor, conservado: false };
  });
}

/** Un sumando del total: los dados conservados, o una parte del modificador. */
export interface SumandoDeLaTirada {
  /** Ya en español y en minúscula, listo para pintar. */
  texto: string;
  cantidad: number;
  /** El punto de partida (los dados). Se escribe sin signo, como el `base` de una traza. */
  esBase: boolean;
}

/**
 * De qué se compone el total: primero los dados que se conservaron, después el modificador.
 *
 * `derivado` es opcional y es lo que convierte «+3 percepción» en «+3 modificador de destreza
 * +2 bonificador de competencia». Solo se usa **si su total coincide con el modificador que el
 * servidor sumó de verdad**: si no coinciden, la hoja del navegador y la tirada del servidor
 * están hablando de números distintos, y desglosar con el que no cuenta sería inventarse una
 * explicación. En ese caso se cae al nombre de lo que se tiraba, que es cierto siempre.
 */
export function sumandosDeLaTirada(
  resultado: Pick<RollResult, "kept" | "modifier">,
  etiqueta: string,
  derivado?: DerivedValue,
): SumandoDeLaTirada[] {
  const dados = resultado.kept.reduce((suma, d) => suma + d, 0);
  return [
    { texto: "dado", cantidad: dados, esBase: true },
    ...sumandosDelModificador(resultado.modifier, etiqueta, derivado),
  ];
}

function sumandosDelModificador(
  modificador: number,
  etiqueta: string,
  derivado?: DerivedValue,
): SumandoDeLaTirada[] {
  if (derivado && derivado.total === modificador) {
    const pasos = derivado.steps.filter((p) => p.amount !== 0).map(sumandoDePaso);
    if (pasos.length > 0) return pasos;
  }
  if (modificador === 0) return [];
  return [{ texto: etiqueta.toLowerCase(), cantidad: modificador, esBase: false }];
}

function sumandoDePaso(paso: TraceStep): SumandoDeLaTirada {
  const { texto } = traducirLabelKey(paso.labelKey);
  return { texto: texto.toLowerCase(), cantidad: paso.amount, esBase: false };
}

/**
 * La línea completa: `17 = 12 dado +3 modificador de destreza +2 bonificador de competencia`.
 *
 * **Se resume a partir de tres sumandos**, igual que la fórmula de una línea de la traza: con
 * doce sumandos esto deja de ser una línea y pasa a ser un desglose peor maquetado.
 */
export function lineaDeDesglose(total: number, partes: SumandoDeLaTirada[]): string {
  const visibles = partes.filter((p) => p.esBase || p.cantidad !== 0);
  if (visibles.length === 0) return String(total);
  const [base, ...resto] = visibles;
  const mostrados =
    resto.length > 2
      ? [...resto].sort((a, b) => Math.abs(b.cantidad) - Math.abs(a.cantidad)).slice(0, 2)
      : resto;
  const ocultos = resto.length - mostrados.length;
  const cuerpo = [base, ...mostrados].map(escribirSumando).join(" ");
  return `${total} = ${cuerpo}${ocultos > 0 ? ` y ${ocultos} más` : ""}`;
}

function escribirSumando(parte: SumandoDeLaTirada): string {
  const n = Math.abs(parte.cantidad);
  if (parte.esBase) return `${n} ${parte.texto}`;
  // Signo menos tipográfico (U+2212), no el guion del teclado: es el mismo que usa la traza.
  return `${parte.cantidad >= 0 ? "+" : "\u2212"}${n} ${parte.texto}`;
}
