// Task 4 de 3A.3 (T22) — el gesto «clic en la tarjeta = apuntar», compartido por
// `FichaDeElenco.tsx` y `FichaDePnj.tsx` para no escribirlo dos veces.
//
// **La tarjeta lleva dentro sus propios mandos** (±5, «Ayudar», el menú «…», el enlace al nombre):
// un clic en cualquiera de ellos tiene que hacer SU cosa, no además apuntar. `closest()` sobre
// los elementos interactivos habituales del HTML es la guarda — la misma idea que ya usa
// `PanelFlotante` para distinguir «dentro del panel» de «fuera», aplicada aquí a «dentro de un
// control» frente a «en la superficie libre de la tarjeta».
// **Sin `[role='button']`, a propósito**: la propia tarjeta lleva ese rol (ver `FichaDeElenco` y
// `FichaDePnj`) para poder apuntarse con teclado, y `closest()` desde CUALQUIER hijo suyo
// encontraría siempre la tarjeta misma primero — bloqueando el gesto que este fichero existe
// para permitir. Solo cuentan los controles nativos que de verdad hacen otra cosa por su cuenta.
const SELECTOR_INTERACTIVO = "button, a, input, select, label, textarea";

/**
 * Maneja el clic (o Enter/Espacio) de la tarjeta: si el gesto viene de dentro de un mando propio,
 * no hace nada — ese mando ya se está ocupando de sí mismo. Si no, apunta.
 */
export function alPulsarLaTarjeta(e: { target: EventTarget | null }, apuntar: () => void): void {
  const nodo = e.target as HTMLElement | null;
  if (nodo?.closest(SELECTOR_INTERACTIVO)) return;
  apuntar();
}
