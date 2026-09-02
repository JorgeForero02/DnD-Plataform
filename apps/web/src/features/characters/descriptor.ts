import { nombreClase, nombreRaza, nombreSubraza } from "../character-sheet/vocabulario";
import type { Character } from "./api";

// **«Elfo alto · Pícaro», escrito una sola vez.**
//
// La raza y la clase viven en DOS sitios de la misma tabla, y eso es deliberado: `raceKey` /
// `subraceKey` / `classKey` son las claves del catálogo que escribe la hoja, y `race` / `class`
// son texto libre **heredado** que se conserva a propósito para no destruir los personajes que
// el autor escribió a mano antes de que existiera el catálogo (`schema.prisma`, modelo
// `Character`, lo dice ahí mismo).
//
// El esquema ya declaraba la regla —*«la hoja los muestra solo si no hay clave»*— y **dos
// pantallas no la seguían**: el subtítulo de la ficha y la fila de la lista leían únicamente el
// texto libre. Consecuencia real, encontrada el 2026-09-02: un personaje montado desde la hoja
// —que es el único camino que queda— salía **sin raza y sin clase** en la lista mientras su
// propia hoja decía «Enano · Guerrero». La pantalla contradecía al dato que tenía delante.
//
// Por eso esto es una función y no dos expresiones repetidas: eran dos copias y ya habían
// empezado a discrepar. Y por eso traduce la clave en vez de imprimirla: **ningún valor de
// enumeración llega a la pantalla**.
export function descriptorDePersonaje(
  personaje: Pick<Character, "race" | "class" | "raceKey" | "subraceKey" | "classKey">,
): string {
  // La subraza gana a la raza cuando existe, porque en la mesa nadie dice «elfo» de un elfo
  // alto: dice «elfo alto». Si solo hay raza, la raza.
  const raza = personaje.subraceKey
    ? nombreSubraza(personaje.subraceKey)
    : personaje.raceKey
      ? nombreRaza(personaje.raceKey)
      : personaje.race;
  const clase = personaje.classKey ? nombreClase(personaje.classKey) : personaje.class;
  return [raza, clase].filter(Boolean).join(" · ");
}
