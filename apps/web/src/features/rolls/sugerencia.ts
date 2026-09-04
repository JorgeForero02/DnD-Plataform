import type { SuggestedRollMode } from "@dnd/shared";
import { nombreCausaVelocidad } from "../character-sheet/vocabulario";

// Tarea 2.5.5, la mitad de pantalla (ficha M16) — **la sugerencia se lee, o no existe.**
//
// El servidor ya calculaba esto y lo devolvía en `rollSuggestions`, y **ningún componente lo
// leía**: en la mesa, un personaje envenenado seguía tirando normal porque nadie miraba la
// respuesta cruda. Es el mismo patrón que dejó `ENTITY_REVEALED` escribiéndose para nadie y la
// salvación de concentración pidiéndose para nadie, y por eso las dos fichas se quedaron abiertas
// aunque el servidor estuviera hecho.
//
// **El servidor nunca manda prosa**: manda `sourceKey` (`"poisoned"`, `"exhaustion:3"`) y aquí se
// convierte, reutilizando `nombreCausaVelocidad`, que ya sabía traducir las dos formas —una
// condición del SRD y un nivel de agotamiento— porque la traza de velocidad usa exactamente las
// mismas claves. Escribir una segunda traducción aquí era garantizar que se separaran.

/** Cómo se llama cada efecto en la mesa. **Fallo automático no es un modo**, y se dice distinto. */
const NOMBRE_EFECTO: Record<string, string> = {
  ADVANTAGE: "Ventaja",
  DISADVANTAGE: "Desventaja",
  AUTO_FAIL: "Fallo automático",
};

/**
 * La frase de aviso, o `null` si no hay nada que decir.
 *
 * Cuatro casos, y son cuatro frases distintas porque significan cosas distintas:
 *
 *  1. **Nada te afecta** → `null`. No se pinta un aviso vacío.
 *  2. **Fallo automático** → manda sobre todo lo demás: no hay tirada que hacer, así que decir
 *     «desventaja» sería suavizar la regla (SRD 5.1: *"It automatically fails Strength and
 *     Dexterity saving throws"*).
 *  3. **Ventaja y desventaja a la vez** → se anulan y se tira **un solo d20**, y eso NO es lo
 *     mismo que «nada te afecta» aunque el modo resultante sea el mismo. El SRD lo distingue con
 *     todas las letras: *"If circumstances cause a roll to have both advantage and disadvantage,
 *     you are considered to have neither of them, and you roll one d20"*. La mesa quiere saber
 *     que hubo dos cosas, no que no hubo ninguna.
 *  4. **Una sola dirección** → «Desventaja sugerida: envenenado», con **todas** las causas.
 */
export function fraseDeSugerencia(s: SuggestedRollMode | undefined): string | null {
  if (!s || s.reasons.length === 0) return null;

  const causas = (efecto: string) =>
    s.reasons
      .filter((r) => r.effect === efecto)
      .map((r) => nombreCausaVelocidad(r.sourceKey))
      .join(", ");

  if (s.autoFail) {
    return `Fallo automático: ${causas("AUTO_FAIL") || causasTodas(s)}`;
  }
  if (s.cancelled) {
    return `Ventaja y desventaja se anulan: tiras un solo d20 (${causasTodas(s)})`;
  }
  const efecto = s.mode === "ADVANTAGE" ? "ADVANTAGE" : "DISADVANTAGE";
  return `${NOMBRE_EFECTO[efecto]} sugerida: ${causas(efecto)}`;
}

function causasTodas(s: SuggestedRollMode): string {
  return s.reasons.map((r) => nombreCausaVelocidad(r.sourceKey)).join(", ");
}

/**
 * El modo con el que se abre el panel.
 *
 * **Preseleccionado, no impuesto**: es la decisión D-2.5-6 dicha en la interfaz. El SRD condiciona
 * media tabla a circunstancias que el servidor no ve —si la fuente del miedo está a la vista, si
 * el atacante te ve—, así que quien tira puede cambiarlo, y el selector de tres estados sigue
 * entero al lado del aviso.
 *
 * Con fallo automático **no se preselecciona nada**: el modo no describe lo que va a pasar, y
 * poner «desventaja» ahí sería que la pantalla contradijera al servidor, que es justo lo que la
 * regla de interfaz prohíbe.
 */
export function modoSugerido(
  s: SuggestedRollMode | undefined,
): "NORMAL" | "ADVANTAGE" | "DISADVANTAGE" {
  if (!s || s.autoFail) return "NORMAL";
  return s.mode;
}
