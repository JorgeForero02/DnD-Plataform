// Task 10 — **la bandeja de dados: composición pura, probada sola.**
//
// El autor quiere ver MUCHOS dados a la vez (4, 6, 9, 10 dados mezclados) y pulsarlos en vez de
// escribir `4d6+1d8+1d20-2` a mano. Esto es el estado y las cuatro operaciones que lo cambian;
// `BandejaDeDados.tsx` solo las llama y pinta el resultado — ninguna regla de composición vive
// en el componente.
//
// **Esto no valida nada** (igual que `expresion.ts`, al que sustituye en los dos paneles): quien
// decide si una expresión es válida es el evaluador del servidor (`apps/api/src/dice/dice.ts`).

/** Las siete caras que se tiran en la mesa (`vocabulario.ts`, `DADOS_DE_ATAJO`). */
export type Caras = 4 | 6 | 8 | 10 | 12 | 20 | 100;

/** Los dados que hay puestos, en el orden en que se pulsaron, y el modificador aparte. */
export interface Bandeja {
  dados: Caras[];
  modificador: number;
}

export const BANDEJA_VACIA: Bandeja = { dados: [], modificador: 0 };

/** Añade un dado a la pila. */
export function conDado(b: Bandeja, caras: Caras): Bandeja {
  return { ...b, dados: [...b.dados, caras] };
}

/** Quita el dado en esa posición de la pila — **por índice, no por valor**: dos d6 no son
 * intercambiables, y quitar por valor podría quitar el que no se pulsó. */
export function sinDado(b: Bandeja, indice: number): Bandeja {
  return { ...b, dados: b.dados.filter((_, i) => i !== indice) };
}

/** Sube o baja el modificador. */
export function conModificador(b: Bandeja, delta: number): Bandeja {
  return { ...b, modificador: b.modificador + delta };
}

/**
 * `2d6+1d20+3`, agrupando por caras en el orden en que entraron; vacía → `""` **siempre**,
 * incluso con un modificador puesto — un modificador solo no es una expresión de dados, y
 * dejarlo pasar como `"+3"` sería inventar una tirada que nadie compuso.
 *
 * Se agrupa con un `Map<Caras, number>`: `Map` conserva el orden de la **primera** inserción de
 * cada clave, que es justo «en el orden en que entraron» — un `d6` seguido de un `d20` y otro
 * `d6` da `2d6+1d20`, no `1d6+1d20+1d6`.
 *
 * **Con exactamente un d20 en la bandeja, su grupo va PRIMERO**, delante de cualquier otro dado
 * que se haya pulsado antes — no en el orden de entrada. No es estético: el servidor solo
 * convierte un `d20` en ventaja/desventaja cuando está **al principio** de la expresión
 * (`conVentaja`, `apps/api/src/rolls/rolls.service.ts:436`, `^(\s*)(1?d20)…`). Pulsar d6 y
 * luego d20 componiendo `1d6+1d20` ofrecería el radio de «Ventaja» y el servidor lo ignoraría en
 * silencio — la tirada saldría normal con quien la pidió creyendo que tenía ventaja.
 */
export function expresionDeBandeja(b: Bandeja): string {
  const cuentas = new Map<Caras, number>();
  for (const caras of b.dados) cuentas.set(caras, (cuentas.get(caras) ?? 0) + 1);
  const entradas = [...cuentas.entries()];
  if (cuentas.get(20) === 1) {
    const indice = entradas.findIndex(([caras]) => caras === 20);
    const [d20] = entradas.splice(indice, 1);
    entradas.unshift(d20);
  }
  const dados = entradas.map(([caras, n]) => `${n}d${caras}`).join("+");
  if (dados === "") return "";
  const modificador =
    b.modificador === 0 ? "" : `${b.modificador >= 0 ? "+" : "-"}${Math.abs(b.modificador)}`;
  return `${dados}${modificador}`;
}

/** Hay exactamente un d20 y nada más de d20: la ventaja se ofrece. */
export function admiteVentaja(b: Bandeja): boolean {
  return b.dados.filter((c) => c === 20).length === 1;
}

/**
 * Lo mismo que `admiteVentaja`, pero leído de un texto en vez de una bandeja — para cuando la
 * fuente es el campo escrito a mano y no la pila de dados.
 *
 * **Tiene que ser el mismo criterio que usa el servidor**, no una aproximación: `conVentaja`
 * (`apps/api/src/rolls/rolls.service.ts:436`) solo reescribe un `d20` cuando está al principio
 * de la expresión (`^(\s*)(1?d20)…`). Ofrecer el radio de «Ventaja» sobre `1d6+1d20` sería
 * mentir — el servidor lo tiraría normal y quien pidió ventaja no se enteraría.
 */
export function admiteVentajaEnTexto(texto: string): boolean {
  return /^\s*1?d20(\b|[^0-9])/.test(texto);
}
