// Ficha U7 (plan 14) — **el ornamento se puede apagar.**
//
// La cuadrícula cartográfica y el horizonte dibujado se pintaban **siempre**. No se mueven, así que
// `prefers-reduced-motion` no aplica; pero sí molestan a quien lee con dificultad, y hasta hoy no
// había forma de dejar la pantalla desnuda para quien la prefiera así.
//
// ## Por qué es un ajuste guardado y no una media consulta del sistema
//
// No hay ninguna preferencia del sistema que signifique «menos adorno estático». `prefers-reduced-
// motion` habla de **movimiento** y esto no se mueve: usarla sería apagarle el ornamento a quien
// pidió otra cosa, y dejar sin opción a quien lo necesita de verdad. Es una decisión de la persona,
// así que se le pregunta y se recuerda.
//
// ## La misma forma que el tema, a propósito
//
// Se guarda en `localStorage` y se **estampa en `<html>`** como `data-ornamento`, igual que
// `data-theme`: así el CSS puede apagarlo sin que ningún componente tenga que leer el estado, y
// **queda listo para D-OP-24** —la capa de ambiente pixelada—, que va a necesitar exactamente este
// mismo interruptor y no debería inventarse otro.
//
// **`activo` es el valor por defecto**, y eso es deliberado: el ornamento **sí se quiere** (es la
// identidad de la mesa, dicho por el autor). Lo que faltaba era poder quitarlo, no quitarlo.

export type Ornamento = "activo" | "apagado";

/** La forma legible, una sola vez: ningún valor de enumeración llega a la pantalla. */
export const ETIQUETA_DE_ORNAMENTO: Record<Ornamento, string> = {
  activo: "Con ornamento",
  apagado: "Sin ornamento",
};

export function esOrnamento(valor: unknown): valor is Ornamento {
  return valor === "activo" || valor === "apagado";
}

const CLAVE = "dnd-ornamento";

export function ornamentoGuardado(): Ornamento | null {
  try {
    const valor = localStorage.getItem(CLAVE);
    return esOrnamento(valor) ? valor : null;
  } catch {
    // Navegación privada o almacenamiento desactivado: como si no hubiera nada guardado.
    return null;
  }
}

/** Sin elección guardada, **activo**: el ornamento es la identidad, y se quiere. */
export function ornamentoPreferido(): Ornamento {
  return ornamentoGuardado() ?? "activo";
}

export function aplicarOrnamento(valor: Ornamento): void {
  document.documentElement.setAttribute("data-ornamento", valor);
}

/**
 * Quien quiere enterarse de que el ornamento cambió.
 *
 * **Hace falta y el tema no lo necesita**, y esa asimetría tiene motivo: el tema lo resuelve el CSS
 * a partir de `data-theme`, así que nadie tiene que repintar nada. El ornamento **deja de
 * dibujarse** —no se esconde con una clase—, y eso es una decisión de React: sin aviso, apagarlo
 * cambiaba el atributo y la cuadrícula seguía en pantalla hasta la siguiente navegación. Lo cazó el
 * recorrido de navegador.
 */
const oyentes = new Set<() => void>();

export function suscribirseAlOrnamento(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export function fijarOrnamento(valor: Ornamento): void {
  try {
    localStorage.setItem(CLAVE, valor);
  } catch {
    // Se aplica igual en esta carga; lo único que se pierde es que dure.
  }
  aplicarOrnamento(valor);
  for (const oyente of oyentes) oyente();
}

/**
 * El valor actual, **leído del atributo de `<html>`** y no del almacenamiento: el atributo ya lo
 * estampó `main.tsx` antes del primer pintado, y en navegación privada es lo único que hay.
 */
export function ornamentoActual(): Ornamento {
  if (typeof document === "undefined") return "activo";
  return document.documentElement.getAttribute("data-ornamento") === "apagado"
    ? "apagado"
    : "activo";
}

/** Se llama una vez al arrancar (`main.tsx`), como `initTheme`. */
export function iniciarOrnamento(): Ornamento {
  const valor = ornamentoPreferido();
  aplicarOrnamento(valor);
  return valor;
}
