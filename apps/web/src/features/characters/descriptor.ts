import { nombreClase, nombreRaza, nombreSubraza } from "../character-sheet/vocabulario";
import type { Character } from "./api";

// **«Elfo alto · Pícaro», escrito una sola vez.**
//
// `raceKey` / `subraceKey` / `classKey` son las claves del catálogo, y son la ÚNICA verdad desde
// D-CF-27 (2026-09-11): las columnas de texto libre `race`/`class` que este fichero también leía
// se retiraron de la base sin medir su contenido (decisión del autor). Un personaje que solo
// tuviera texto libre y ninguna clave del catálogo pasa a no mostrar raza ni clase — no había
// forma de conservarlo sin la columna que lo guardaba.
//
// Por eso esto sigue siendo una función y no una expresión repetida: es el único sitio que decide
// «subraza antes que raza», y traduce la clave en vez de imprimirla porque **ningún valor de
// enumeración llega a la pantalla**.
export function descriptorDePersonaje(
  personaje: Pick<Character, "raceKey" | "subraceKey" | "classKey">,
): string {
  // La subraza gana a la raza cuando existe, porque en la mesa nadie dice «elfo» de un elfo
  // alto: dice «elfo alto». Si solo hay raza, la raza.
  const raza = personaje.subraceKey
    ? nombreSubraza(personaje.subraceKey)
    : personaje.raceKey
      ? nombreRaza(personaje.raceKey)
      : null;
  const clase = personaje.classKey ? nombreClase(personaje.classKey) : null;
  return [raza, clase].filter(Boolean).join(" · ");
}
