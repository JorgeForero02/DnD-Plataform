import { nombreCondicion } from "../../../character-sheet/vocabulario";

// **Efectos de mesa: qué ha pasado, leído de la diferencia entre dos lecturas.**
//
// Por el canal en vivo llega un aviso sin payload (`features/live/canal.ts`), y la ficha recarga
// su hoja y sus condiciones por la ruta autorizada. Así que lo que un jugador puede animar es
// **exactamente lo que ya puede ver**: se compara la lectura anterior con la nueva y de ahí sale
// «−7», «+12», «Envenenado». No se inventa un segundo camino de datos y `canView` sigue mandando.
//
// Esto es puro a propósito: recibe dos instantáneas y devuelve una lista. Ni DOM ni React.

export interface Instantanea {
  hp: number | null;
  max: number | null;
  temp: number;
  nivel?: number;
  estado?: "alive" | "dying" | "stable" | "dead";
  condiciones: { id: string; key: string; expired?: boolean }[];
}

export type Efecto =
  | { tipo: "dano"; delta: number; fuerte: boolean }
  | { tipo: "cura"; delta: number }
  | { tipo: "temporales"; delta: number }
  | { tipo: "condicion"; nombre: string; clave: string }
  | { tipo: "condicion-termina"; nombre: string }
  | { tipo: "cae" }
  | { tipo: "muerte" }
  | { tipo: "en-pie" }
  | { tipo: "nivel"; nivel: number };

/** Un golpe que se lleva un cuarto de la vida o más sacude más fuerte. No es «crítico»: el crítico vive en el registro, no en la hoja. */
const FRACCION_DE_GOLPE_FUERTE = 0.25;

function activas(condiciones: Instantanea["condiciones"]) {
  return new Map(condiciones.filter((c) => c.expired !== true).map((c) => [c.id, c]));
}

export function detectarEfectos(antes: Instantanea | null, ahora: Instantanea): Efecto[] {
  if (!antes) return [];
  const efectos: Efecto[] = [];

  const muereAhora = ahora.estado === "dead" && antes.estado !== "dead";

  if (antes.hp !== null && ahora.hp !== null && ahora.hp !== antes.hp) {
    const delta = ahora.hp - antes.hp;
    if (delta < 0) {
      const fuerte =
        ahora.max !== null && ahora.max > 0 && -delta >= ahora.max * FRACCION_DE_GOLPE_FUERTE;
      efectos.push({ tipo: "dano", delta, fuerte });
      if (ahora.hp === 0 && !muereAhora) efectos.push({ tipo: "cae" });
    } else {
      efectos.push({ tipo: "cura", delta });
      if (antes.hp === 0) efectos.push({ tipo: "en-pie" });
    }
  }
  if (muereAhora) efectos.push({ tipo: "muerte" });

  if (ahora.temp > antes.temp) efectos.push({ tipo: "temporales", delta: ahora.temp - antes.temp });

  if (ahora.nivel !== undefined && antes.nivel !== undefined && ahora.nivel > antes.nivel) {
    efectos.push({ tipo: "nivel", nivel: ahora.nivel });
  }

  const antesActivas = activas(antes.condiciones);
  const ahoraActivas = activas(ahora.condiciones);
  for (const [id, c] of ahoraActivas) {
    if (!antesActivas.has(id)) {
      efectos.push({ tipo: "condicion", nombre: nombreCondicion(c.key), clave: c.key });
    }
  }
  for (const [id, c] of antesActivas) {
    if (!ahoraActivas.has(id)) {
      efectos.push({ tipo: "condicion-termina", nombre: nombreCondicion(c.key) });
    }
  }

  return efectos;
}

export type Tono = "dano" | "cura" | "aviso" | "sistema";

/** El texto que flota sobre la tarjeta. **La forma legible se escribe aquí y en ningún otro sitio.** */
export function textoDeEfecto(e: Efecto): { texto: string; tono: Tono; rotulo: boolean } {
  switch (e.tipo) {
    case "dano":
      return { texto: `−${-e.delta}`, tono: "dano", rotulo: false };
    case "cura":
      return { texto: `+${e.delta}`, tono: "cura", rotulo: false };
    case "temporales":
      return { texto: `+${e.delta} temporales`, tono: "sistema", rotulo: false };
    case "condicion":
      return { texto: e.nombre, tono: "aviso", rotulo: true };
    case "condicion-termina":
      return { texto: `${e.nombre} termina`, tono: "sistema", rotulo: true };
    case "cae":
      return { texto: "Cae", tono: "dano", rotulo: true };
    case "muerte":
      return { texto: "Muere", tono: "dano", rotulo: true };
    case "en-pie":
      return { texto: "En pie", tono: "cura", rotulo: true };
    case "nivel":
      return { texto: `Nivel ${e.nivel}`, tono: "aviso", rotulo: true };
  }
}

/** La clase que anima la tarjeta entera. Varios efectos a la vez: gana el más llamativo. */
export function claseDeTarjeta(efectos: Efecto[]): string | null {
  const tipos = new Set(efectos.map((e) => e.tipo));
  if (tipos.has("muerte")) return "fx-tarjeta-muerte";
  if (tipos.has("cae")) return "fx-tarjeta-cae";
  if (tipos.has("en-pie")) return "fx-tarjeta-en-pie";
  if (efectos.some((e) => e.tipo === "dano" && e.fuerte)) return "fx-tarjeta-golpe-fuerte";
  if (tipos.has("dano")) return "fx-tarjeta-golpe";
  if (tipos.has("nivel")) return "fx-tarjeta-nivel";
  if (tipos.has("cura") || tipos.has("temporales")) return "fx-tarjeta-cura";
  const condicion = efectos.find((e) => e.tipo === "condicion");
  if (condicion && condicion.tipo === "condicion") return claseDeCondicion(condicion.clave);
  if (tipos.has("condicion-termina")) return "fx-tarjeta-condicion-termina";
  return null;
}

/** Lo que llega a la pantalla entera del jugador. Solo lo que duele o alivia de verdad; una condición no sacude la pantalla. */
export type EfectoDePantalla =
  "golpe" | "golpe-fuerte" | "cura" | "cae" | "muerte" | "en-pie" | "nivel";

export function efectoDePantalla(efectos: Efecto[]): EfectoDePantalla | null {
  const tipos = new Set(efectos.map((e) => e.tipo));
  if (tipos.has("muerte")) return "muerte";
  if (tipos.has("cae")) return "cae";
  if (tipos.has("en-pie")) return "en-pie";
  if (efectos.some((e) => e.tipo === "dano" && e.fuerte)) return "golpe-fuerte";
  if (tipos.has("dano")) return "golpe";
  if (tipos.has("nivel")) return "nivel";
  if (tipos.has("cura")) return "cura";
  return null;
}

/**
 * **Cada condición del SRD tiene su animación**, con las convenciones de siempre en los RPG:
 * verde para veneno, ámbar para aturdir/paralizar (rayo), púrpura para miedo/encanto (maldición),
 * azul para agarrar/apresar, gris para piedra e inconsciencia, rojo para la furia. Una condición
 * que no está aquí (las personalizadas) se queda con el pulso ámbar genérico.
 */
const CLASE_DE_CONDICION: Record<string, string> = {
  poisoned: "fx-tarjeta-cond-veneno",
  stunned: "fx-tarjeta-cond-aturdido",
  paralyzed: "fx-tarjeta-cond-paralizado",
  frightened: "fx-tarjeta-cond-asustado",
  charmed: "fx-tarjeta-cond-encantado",
  blinded: "fx-tarjeta-cond-cegado",
  deafened: "fx-tarjeta-cond-ensordecido",
  prone: "fx-tarjeta-cond-derribado",
  grappled: "fx-tarjeta-cond-agarrado",
  restrained: "fx-tarjeta-cond-agarrado",
  invisible: "fx-tarjeta-cond-invisible",
  petrified: "fx-tarjeta-cond-petrificado",
  unconscious: "fx-tarjeta-cond-inconsciente",
  incapacitated: "fx-tarjeta-cond-inconsciente",
  exhaustion: "fx-tarjeta-cond-agotado",
  raging: "fx-tarjeta-cond-furia",
};

export function claseDeCondicion(clave: string): string {
  return CLASE_DE_CONDICION[clave] ?? "fx-tarjeta-condicion";
}

/** El color del destello de cada condición; `null` si no lleva destello (solo la animación). */
const COLOR_DE_CONDICION: Record<string, string> = {
  poisoned: "var(--voz-salvia)",
  stunned: "var(--warning)",
  paralyzed: "var(--warning)",
  frightened: "var(--voz-ciruela)",
  charmed: "var(--voz-ciruela)",
  grappled: "var(--voz-indigo)",
  restrained: "var(--voz-indigo)",
  raging: "var(--danger)",
};

export function colorDeCondicion(clave: string): string | null {
  return COLOR_DE_CONDICION[clave] ?? null;
}
