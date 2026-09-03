import type { DerivedValue, TraceStep } from "@dnd/shared";
import { traducirLabelKey } from "./vocabulario";

// Las dos frases que resumen una traza en una línea. **Viven aparte de `Traza.tsx` a propósito**:
// aquel fichero exporta componentes, y un fichero de componentes que además exporta funciones
// sueltas rompe la recarga en caliente de React (lo avisa `react-refresh/only-export-components`).
// Además las usa medio feature — la casilla de característica, la tarjeta de CA, las tarjetas
// pequeñas y la tabla de ataques—, así que tener una casa propia deja de ser un detalle.

/**
 * **La fórmula de una línea, siempre visible.** Bajo el número y en pequeño: «10 +2 destreza».
 *
 * Es el nivel que la hoja de papel nunca pudo dar y el que hace que la mayoría **no tenga que
 * desplegar nada**. Sale de la misma traza que el desglose largo, así que no puede discrepar de
 * él — que es justo el fallo que la investigación documentó en las hojas digitales: un número
 * calculado sin contexto se cree ciegamente aunque esté mal.
 *
 * **Se resume a partir de tres pasos.** Con doce sumandos esto ya no es una línea: es la traza
 * otra vez, peor maquetada y compitiendo con ella. Se enseñan la base y los dos que más pesan.
 */
export function formulaDeUnaLinea(valor: DerivedValue): string {
  // Un paso que no mueve el total no explica nada. La excepción es `base`, que es de dónde parte.
  const pasos = valor.steps.filter((p) => p.op === "base" || p.amount !== 0);
  if (pasos.length === 0) return "";
  const nombrar = (p: TraceStep) => {
    const { texto } = traducirLabelKey(p.labelKey);
    const n = Math.abs(p.amount);
    if (p.op === "base") return `${n} ${texto.toLowerCase()}`;
    return `${p.amount >= 0 ? "+" : "−"}${n} ${texto.toLowerCase()}`;
  };
  if (pasos.length <= 3) return pasos.map(nombrar).join(" ");
  const [base, ...resto] = pasos;
  const mayores = [...resto].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, 2);
  return `${[base, ...mayores].map(nombrar).join(" ")} y ${pasos.length - 3} más`;
}

/**
 * Lo que la puntuación **guardada** no explica: los pasos que la modifican después de la base.
 *
 * La casilla de característica de la maqueta pone el modificador grande y la puntuación pequeña
 * debajo. En nuestra hoja la puntuación pequeña es la **base editable** —lo que se teclea—, y la
 * que alimenta al modificador es la derivada, que puede llevar el +2 de la raza encima. Cuando
 * las dos no coinciden hay que decirlo, o la casilla enseña un 14 con un +3 al lado y parece
 * rota. Devuelve `""` cuando no hay nada que explicar, que es el caso normal.
 */
export function resumenDeAjustes(valor: DerivedValue): string {
  const pasos = valor.steps.filter((p) => p.op !== "base" && p.amount !== 0);
  if (pasos.length === 0) return "";
  return pasos
    .map((p) => {
      const { texto } = traducirLabelKey(p.labelKey);
      return `${p.amount >= 0 ? "+" : "−"}${Math.abs(p.amount)} ${texto.toLowerCase()}`;
    })
    .join(" ");
}
