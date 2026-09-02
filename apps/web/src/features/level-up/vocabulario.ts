// Tarea 2A.11 — el vocabulario de la subida de nivel.
//
// **Ningún valor de enumeración llega a la pantalla** (docs/04-convenciones.md). El previo trae
// dos enumeraciones: el origen de una aptitud (`class` / `subclass`) y el método de los PG
// (`AVERAGE` / `ROLL`). Se traducen aquí, una sola vez, y una clave que este fichero no conozca
// se ve como «Sin traducir: <clave>» — visible y no silenciosa, igual que en
// `features/character-sheet/vocabulario.ts`.

/** El techo del SRD, el mismo `NIVEL_MAXIMO` que impone `apps/api/src/level-up/level-up.service.ts`. */
export const NIVEL_MAXIMO = 20;

export const NOMBRE_ORIGEN_APTITUD: Record<string, string> = {
  class: "Clase",
  subclass: "Subclase",
};

export const NOMBRE_METODO_PG: Record<string, string> = {
  AVERAGE: "Media fija del dado de golpe",
  ROLL: "Tirada del dado de golpe",
};

function nombreOSinTraducir(dic: Record<string, string>, clave: string): string {
  return dic[clave] ?? `Sin traducir: ${clave}`;
}

export function nombreOrigenAptitud(key: string): string {
  return nombreOSinTraducir(NOMBRE_ORIGEN_APTITUD, key);
}

export function nombreMetodoPg(key: string): string {
  return nombreOSinTraducir(NOMBRE_METODO_PG, key);
}

/** Un modificador siempre lleva signo: «+3», «−1», «+0». Nunca un número pelado. */
export function conSigno(n: number): string {
  return n < 0 ? `−${Math.abs(n)}` : `+${n}`;
}

/** «3d10», la forma en que una mesa dice sus dados de golpe. */
export function dadosDeGolpe(cantidad: number, caras: number): string {
  return `${cantidad}d${caras}`;
}

/** «2 espacios de nivel 1», concordando el plural. */
export function frasesDeEspacios(slots: { spellLevel: number; slots: number }[]): string[] {
  return slots.map(
    ({ spellLevel, slots: cantidad }) =>
      `${cantidad} espacio${cantidad === 1 ? "" : "s"} de nivel ${spellLevel}`,
  );
}
