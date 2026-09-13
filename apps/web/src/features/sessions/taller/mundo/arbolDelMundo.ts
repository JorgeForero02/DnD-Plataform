import type { CampaignLinkRow, EntityType } from "@dnd/shared";
import type { Entity } from "../../../entities/api";
import { ROTULO_PLURAL } from "../../../entities/resumen";
import {
  ROTULOS_DE_JERARQUIA,
  esRotuloDeJerarquia,
  lecturaEntrante,
  lecturaSaliente,
} from "../../../links/relaciones";

// **El mundo como árbol, y por qué un árbol y no una telaraña** (Task 14 bis, D-CF-64).
//
// El tablero telaraña (D4, retirado en este mismo commit) pintaba cada ficha en un punto y cada
// hilo como una línea entre dos puntos: con seis fichas ya se tapaban la mitad, y con dieciocho
// no se leía nada (`posiciones.ts` traía la tabla medida). Un desglose no tiene ese problema
// porque no dibuja posiciones: **cada ficha cuelga de UN padre por un rótulo de jerarquía**
// (`ROTULOS_DE_JERARQUIA`, `links/relaciones.ts`), y los demás hilos —«es aliado de», «menciona»,
// «protege a»— son laterales y se leen en la ficha, no en el árbol. Es la regla nueva de
// `docs/04-convenciones.md`: *un árbol enseña un padre; los demás hilos van en la ficha*.
//
// Lo que este módulo decide, y las pruebas defienden:
//
//  · **La dirección.** Un hilo `from → to` con rótulo de jerarquía cuelga `from` bajo `to`:
//    «Corvin vive en la Torre Gris» pone a Corvin debajo de la Torre.
//  · **Dos padres no pierden a la hija.** Corvin «vive en» la Torre y «pertenece a» el Gremio:
//    aparece bajo los dos, y cada aparición dice «también en …» con los otros padres.
//  · **Un par, un nodo.** Si Corvin «vive en» la Torre y además «se encuentra en» la Torre, cuelga
//    UNA vez, por el primer rótulo en el orden de `ROTULOS_DE_JERARQUIA` (ronda 1: dos nodos con
//    el mismo id bajo el mismo padre rompían las claves de React y el foco rotatorio).
//  · **Un ciclo termina.** A «forma parte de» B y B «forma parte de» A no tiene raíz: una de las
//    dos se levanta como raíz de su tipo, y donde el camino vuelve a pasar por una ficha que ya
//    está en él se corta y se marca (`cicloCortado`). Visitados **por camino**, no globales: un
//    rombo (dos caminos distintos a la misma ficha) no es un ciclo. **Lo que se levanta es una
//    ficha DEL ciclo, no una que cuelgue de él** (ronda 1: Aldea → Bosque ↔ Ciudad levantaba a
//    Aldea, que salía dos veces — raíz fantasma y bajo Bosque).
//  · **Un hilo con un extremo que no llegó** (el servidor filtró esa ficha por `canView`) no
//    cuelga nada. No se inventa un padre invisible.
//
// Todo puro: mismas listas, mismo árbol. Se prueba en `node`, como `wikilinks.ts`.

export interface NodoDelMundo {
  id: string;
  name: string;
  type: EntityType;
  /** El hilo por el que cuelga de su padre; `null` bajo la raíz de tipo. */
  rotulo: string | null;
  /** Nombres de los OTROS padres: aparece en cada uno, marcada «también en …». */
  tambienEn: string[];
  hijos: NodoDelMundo[];
  /** A parte de B parte de A: se corta aquí y se marca. */
  cicloCortado?: boolean;
}

export interface RaizDeTipo {
  type: EntityType;
  etiqueta: string;
  /** Cuántas fichas de este tipo hay en el mundo, cuelguen de donde cuelguen. */
  total: number;
  hijos: NodoDelMundo[];
}

export interface FichaSuelta {
  id: string;
  name: string;
  type: EntityType;
}

export interface ArbolDelMundo {
  raices: RaizDeTipo[];
  /** Las fichas que no tocan ningún hilo, ni de jerarquía ni lateral. */
  sinHilos: FichaSuelta[];
}

/** El orden de las raíces: primero lo que contiene (lugares), luego quién, luego qué pasa. */
export const ORDEN_DE_TIPO: readonly EntityType[] = [
  "LOCATION",
  "FACTION",
  "NPC",
  "QUEST",
  "EVENT",
  "OBJECT",
  "DOCUMENT",
];

function porNombre<T extends { name: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name, "es");
}

interface Padre {
  padreId: string;
  rotulo: string;
}

export function arbolDelMundo(entidades: Entity[], hilos: CampaignLinkRow[]): ArbolDelMundo {
  const porId = new Map(entidades.map((e) => [e.id, e]));

  // Quién cuelga de quién, y por qué rótulo. Solo hilos de jerarquía con los dos extremos
  // presentes y distintos: un hilo a sí misma no es un padre.
  const padresDe = new Map<string, Padre[]>();
  const hijosDe = new Map<string, { hijoId: string; rotulo: string }[]>();
  const tocadas = new Set<string>();
  // Un par (hija, padre) cuelga por UN rótulo: el primero de `ROTULOS_DE_JERARQUIA`. Determinista,
  // no «el primer hilo que llegó».
  const rotuloDelPar = new Map<string, string>();
  const prioridad = (rotulo: string) => ROTULOS_DE_JERARQUIA.indexOf(rotulo.toLowerCase());
  for (const h of hilos) {
    tocadas.add(h.fromId);
    tocadas.add(h.toId);
    if (!esRotuloDeJerarquia(h.label)) continue;
    if (h.fromId === h.toId || !porId.has(h.fromId) || !porId.has(h.toId)) continue;
    const rotulo = (h.label as string).trim();
    const par = `${h.fromId}|${h.toId}`;
    const previo = rotuloDelPar.get(par);
    if (previo === undefined || prioridad(rotulo) < prioridad(previo))
      rotuloDelPar.set(par, rotulo);
  }
  for (const [par, rotulo] of rotuloDelPar) {
    const [hijoId, padreId] = par.split("|");
    padresDe.set(hijoId, [...(padresDe.get(hijoId) ?? []), { padreId, rotulo }]);
    hijosDe.set(padreId, [...(hijosDe.get(padreId) ?? []), { hijoId, rotulo }]);
  }

  const alcanzadas = new Set<string>();

  function nodo(
    ficha: Entity,
    rotulo: string | null,
    desdePadre: string | null,
    camino: Set<string>,
  ): NodoDelMundo {
    alcanzadas.add(ficha.id);
    const tambienEn = (padresDe.get(ficha.id) ?? [])
      .filter((p) => p.padreId !== desdePadre)
      .map((p) => porId.get(p.padreId)?.name ?? "")
      .filter((n) => n !== "")
      .sort((a, b) => a.localeCompare(b, "es"));
    const base = { id: ficha.id, name: ficha.name, type: ficha.type, rotulo, tambienEn };
    if (camino.has(ficha.id)) return { ...base, hijos: [], cicloCortado: true };

    const siguiente = new Set(camino);
    siguiente.add(ficha.id);
    const hijos = (hijosDe.get(ficha.id) ?? [])
      .map((h) => ({ ficha: porId.get(h.hijoId)!, rotulo: h.rotulo }))
      .sort((a, b) => porNombre(a.ficha, b.ficha))
      .map((h) => nodo(h.ficha, h.rotulo, ficha.id, siguiente));
    return { ...base, hijos };
  }

  const raicesPorTipo = new Map<EntityType, NodoDelMundo[]>();
  const totales = new Map<EntityType, number>();
  const colgar = (ficha: Entity) => {
    raicesPorTipo.set(ficha.type, [
      ...(raicesPorTipo.get(ficha.type) ?? []),
      nodo(ficha, null, null, new Set()),
    ]);
  };

  const ordenadas = [...entidades].sort(porNombre);
  for (const ficha of ordenadas) {
    totales.set(ficha.type, (totales.get(ficha.type) ?? 0) + 1);
    if ((padresDe.get(ficha.id) ?? []).length === 0) colgar(ficha);
  }
  // Las que tienen padre pero ningún camino llega a ellas —un ciclo sin raíz— no pueden
  // desaparecer del mundo. Se levanta, de las no alcanzadas, la primera por nombre que NO tenga
  // ningún padre sin alcanzar; y si no hay ninguna así (un ciclo puro), la primera por nombre de
  // las que están DENTRO de un ciclo. Una que solo cuelgue del ciclo (Aldea → Bosque ↔ Ciudad)
  // nunca se levanta: saldría dos veces. Se repite hasta alcanzarlas todas.
  for (;;) {
    const sinAlcanzar = ordenadas.filter((f) => !alcanzadas.has(f.id));
    if (sinAlcanzar.length === 0) break;
    const pendientes = new Set(sinAlcanzar.map((f) => f.id));
    const sinPadrePendiente = sinAlcanzar.find(
      (f) => !(padresDe.get(f.id) ?? []).some((p) => pendientes.has(p.padreId)),
    );
    colgar(sinPadrePendiente ?? sinAlcanzar.find((f) => enCiclo(f.id, padresDe)) ?? sinAlcanzar[0]);
  }

  const raices: RaizDeTipo[] = ORDEN_DE_TIPO.map((type) => ({
    type,
    etiqueta: ROTULO_PLURAL[type],
    total: totales.get(type) ?? 0,
    hijos: (raicesPorTipo.get(type) ?? []).sort(porNombre),
  }));

  const sinHilos: FichaSuelta[] = ordenadas
    .filter((e) => !tocadas.has(e.id))
    .map((e) => ({ id: e.id, name: e.name, type: e.type }));

  return { raices, sinHilos };
}

/** Si desde la ficha se vuelve a ella subiendo por sus padres: está dentro de un ciclo. */
function enCiclo(id: string, padresDe: Map<string, Padre[]>): boolean {
  const vistos = new Set<string>();
  const pila = (padresDe.get(id) ?? []).map((p) => p.padreId);
  while (pila.length > 0) {
    const actual = pila.pop() as string;
    if (actual === id) return true;
    if (vistos.has(actual)) continue;
    vistos.add(actual);
    for (const p of padresDe.get(actual) ?? []) pila.push(p.padreId);
  }
  return false;
}

export interface Vecino {
  id: string;
  name: string;
  type: EntityType;
  /** El hilo en el que es sujeto la ficha abierta (la inversa declarada si el hilo entra). */
  rotulo: string;
  direccion: "sale" | "entra";
  /** El hilo del que sale este vecino: es lo que se quita o se reescribe. */
  hiloId: string;
  /** La etiqueta tal y como se guardó, para reescribirla desde el editor. */
  label: string | null;
  /** La frase original cuando el hilo entra con un rótulo libre que no se puede invertir. */
  literal?: string;
}

/**
 * Los vecinos de una ficha por TODOS sus hilos, de jerarquía o no, leídos desde ella: «la Torre
 * Gris es el hogar de Corvin», no «Corvin vive en». Es lo que pinta el anillo y lo que lista el
 * editor de hilos. El nombre del vecino sale de la lista de fichas si está, y si no —el hilo
 * trae los dos extremos con nombre— del propio hilo.
 */
export function vecinosDe(id: string, entidades: Entity[], hilos: CampaignLinkRow[]): Vecino[] {
  const porId = new Map(entidades.map((e) => [e.id, e]));
  const vecinos: Vecino[] = [];
  for (const h of hilos) {
    if (h.fromId !== id && h.toId !== id) continue;
    if (h.fromId === h.toId) continue;
    const sale = h.fromId === id;
    const otro = sale ? h.to : h.from;
    const ficha = porId.get(otro.id);
    const lectura = sale ? lecturaSaliente(h.label) : lecturaEntrante(h.label);
    vecinos.push({
      id: otro.id,
      name: ficha?.name ?? otro.name,
      type: ficha?.type ?? otro.type,
      rotulo: lectura.relacion,
      direccion: sale ? "sale" : "entra",
      hiloId: h.id,
      label: h.label,
      ...(lectura.literal ? { literal: lectura.literal } : {}),
    });
  }
  return vecinos.sort(porNombre);
}
