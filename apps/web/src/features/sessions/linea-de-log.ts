import type { GameEventPayload, SessionNoteKind } from "@dnd/shared";
import { nombreAnulable, nombreCondicion } from "../character-sheet/vocabulario";
import { NOMBRE_MONEDA, NOMBRE_RANURA, NOMBRE_ZONA } from "../inventory/vocabulario";
import { NOMBRE_SELLO } from "./vocabulario";

// De un suceso del log a **una línea que se lee en voz alta**.
//
// Vive aquí, una sola vez, por la regla del proyecto: ningún valor de enumeración llega a la
// pantalla. Y hace falta especialmente aquí porque el log es lo único que se lee seis semanas
// después, cuando ya nadie se acuerda de qué pasó.
//
// **La unión está CERRADA, y esa es la pieza que faltaba** (ficha L1). Aquí había un `default`
// que devolvía `Sin traducir: <clave>` y un comentario que lo llamaba «inalcanzable mientras la
// unión esté completa» — y la unión no lo estaba: le faltaban **catorce** de los treinta y tres
// tipos, no por descuido sino porque **cada tanda del carril del motor añade tipos y ninguna
// puede tocar `apps/web`**, que es donde vive la traducción. La deuda crecía sola con la frontera
// de carriles puesta, y la propia ficha lo había recontado ya una vez (de siete a doce) sin que
// eso la parara: cuando se escribieron estas líneas eran catorce, porque 2.5.3 había añadido
// `ATTACK_RESOLVED` después del último recuento.
//
// Sin `default`, `switch` sobre una unión discriminada es exhaustivo: si el motor añade un tipo,
// **el build del gráfico se pone rojo** en este fichero y en ningún otro sitio. Ese es el aviso
// que no existía. Escribir la frase catorce es trabajo de una tarde; el que no se escriba la
// quince en silencio es lo que arregla la deuda.
//
// **Lo que se traduce y lo que no.** Las condiciones (`CONDITION_*`) y los valores derivados que
// el DM anula (`MANUAL_OVERRIDE_SET.target`) son enumeraciones cerradas del SRD y del motor, y
// tienen su forma legible en `features/character-sheet/vocabulario.ts` — el registro la importa,
// no la reescribe. En cambio las claves de `FLAG_SET`, `SIGNAL_RAISED` y `SET_CHANGED` **las
// escribe el DM** al montar sus reglas (`apps/api/src/rules-engine`, `world-state.service.ts`):
// no hay lista cerrada que traducir, así que se citan literalmente entre comillas. Inventarles
// una traducción sería cambiar lo que el DM escribió.

const REPOSO: Record<string, string> = { SHORT: "corto", LONG: "largo" };

/** El ritmo de marcha de 2C, en la forma en que lo escribe el SRD y lo lee una mesa. */
const RITMO: Record<string, string> = { FAST: "rápido", NORMAL: "normal", SLOW: "lento" };

/** El veredicto de un ataque (2.5.3). **Nunca la CA**: sale la palabra, no el número. */
const VEREDICTO: Record<string, string> = {
  HIT: "impacta",
  MISS: "falla",
  CRITICAL: "impacta con un crítico",
};

/** Qué disparó una tabla de la casa (2C.6). */
const DISPARO_DE_TABLA: Record<string, string> = {
  CRITICAL: "por un crítico",
  FUMBLE: "por una pifia",
};

/** El reloj de campaña vive en segundos (D-2C-1); una mesa no lee segundos. */
function duracionLegible(segundos: number): string {
  if (segundos < 60) return `${segundos} s`;
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas < 24) return resto ? `${horas} h ${resto} min` : `${horas} h`;
  const dias = Math.floor(horas / 24);
  const horasResto = horas % 24;
  return horasResto ? `${dias} d ${horasResto} h` : `${dias} d`;
}

/** «3 po y 5 pp», nunca «gp: 3». Solo las monedas que de verdad cambiaron. */
function dineroLegible(p: {
  cp?: number;
  sp?: number;
  ep?: number;
  gp?: number;
  pp?: number;
}): string {
  const partes = (["pp", "gp", "ep", "sp", "cp"] as const)
    .filter((k) => p[k] !== undefined && p[k] !== 0)
    .map((k) => `${p[k]! > 0 ? "+" : ""}${p[k]} ${NOMBRE_MONEDA[k]}`);
  return partes.length ? partes.join(", ") : "nada";
}

const RESULTADO_MUERTE: Record<string, string> = {
  SUCCESS: "un éxito",
  FAILURE: "un fracaso",
  CRIT_SUCCESS: "un 20 natural: vuelve en sí con 1 PG",
  CRIT_FAILURE: "un 1 natural: cuenta como dos fracasos",
};

export function lineaDeLog(p: GameEventPayload): string {
  switch (p.type) {
    case "SESSION_STARTED":
      return `Empieza la sesión «${p.sessionTitle}»`;
    case "SESSION_CLOSED":
      return p.durationMinutes !== undefined
        ? `Se cierra «${p.sessionTitle}» tras ${p.durationMinutes} minutos`
        : `Se cierra «${p.sessionTitle}»`;
    case "SESSION_NOTE":
      return p.text ? `${NOMBRE_SELLO[p.kind]}: ${p.text}` : NOMBRE_SELLO[p.kind];
    case "HP_CHANGED": {
      if (p.massive) return `Daño masivo: muere en el acto (${p.from} → ${p.to})`;
      const verbo = p.delta < 0 ? "Pierde" : "Recupera";
      const critico = p.critical ? ", crítico" : "";
      const motivo = p.reason ? ` — ${p.reason}` : "";
      return `${verbo} ${Math.abs(p.delta)} PG (${p.from} → ${p.to}${critico})${motivo}`;
    }
    case "TEMP_HP_SET":
      return `Puntos de golpe temporales: ${p.from} → ${p.to}`;
    case "DEATH_SAVE":
      return `Salvación de muerte: sacó ${p.roll}, ${RESULTADO_MUERTE[p.result] ?? p.result} (${p.successes} éxitos, ${p.failures} fracasos)`;
    case "REST_DECLARED":
      return `Descanso ${REPOSO[p.rest] ?? p.rest}`;
    case "RESOURCE_SPENT":
      return `Gasta ${p.amount} de ${p.label} (quedan ${p.remaining})`;
    case "RESOURCE_RESTORED":
      return `Recupera ${p.amount} de ${p.label} (quedan ${p.remaining})`;
    case "LEVEL_CHANGED":
      return `Sube de nivel: ${p.from} → ${p.to}`;
    case "ABILITY_ROLL": {
      const natural =
        p.natural === "TWENTY" ? " — ¡20 natural!" : p.natural === "ONE" ? " — 1 natural" : "";
      const contra =
        p.outcome === "SUCCESS"
          ? ` supera la CD ${p.dc}`
          : p.outcome === "FAILURE"
            ? ` no llega a la CD ${p.dc}`
            : "";
      const que = p.reason ? `${p.reason}: ` : "";
      return `${que}${p.expression} = ${p.total}${contra}${natural}`;
    }
    case "CONDITION_APPLIED":
      return p.level !== undefined
        ? `Recibe la condición «${nombreCondicion(p.key)}», nivel ${p.level}`
        : `Recibe la condición «${nombreCondicion(p.key)}»`;
    case "CONDITION_REMOVED":
      return `Se le quita la condición «${nombreCondicion(p.key)}»`;
    case "ENTITY_OPENED":
      return p.entityName ? `Abre «${p.entityName}»` : "Abre una entrada del mundo";
    case "ENTITY_REVEALED":
      return p.entityName ? `Se revela «${p.entityName}»` : "Se revela una entrada del mundo";
    case "ENTITY_LINKED":
      return p.label ? `Se enlazan dos entradas: ${p.label}` : "Se enlazan dos entradas del mundo";
    case "FLAG_SET":
      return `Marca «${p.key}» ${p.value ? "puesta" : "quitada"}`;
    case "SET_CHANGED":
      return `${p.action === "ADDED" ? "Entra en" : "Sale de"} el conjunto «${p.setKey}»`;
    case "SIGNAL_RAISED":
      return `Se lanza la señal «${p.key}»`;
    case "MANUAL_OVERRIDE_SET": {
      const antes = p.previous !== undefined ? ` (antes ${p.previous})` : "";
      const motivo = p.reason ? ` — ${p.reason}` : "";
      return `El DM fija ${nombreAnulable(p.target)} en ${p.value}${antes}${motivo}`;
    }

    // --- 2B: el botín y el inventario ---
    case "MONEY_CHANGED":
      return `Cambia el dinero: ${dineroLegible(p)}`;
    case "ITEM_ADDED":
      // **Sin el aspa de multiplicar**, y no es un capricho: `×` (U+00D7) está en la lista de
      // glifos prohibidos de la regla «los iconos se dibujan», y la prueba de `ui/Iconos` mira
      // el TEXTO FUENTE además del DOM. Aquí no hacía de icono —era una cantidad— pero la regla
      // es por nombre, y una excepción por caso es como se pierden las reglas.
      return p.quantity > 1
        ? `Consigue ${p.item} (${p.quantity} unidades, ${NOMBRE_ZONA[p.location].toLowerCase()})`
        : `Consigue ${p.item} (${NOMBRE_ZONA[p.location].toLowerCase()})`;
    case "ITEM_MOVED": {
      // `slot` viaja como cadena libre en el payload (`z.string().max(20)`), no como el enum
      // `EquipSlot`, así que se traduce si se reconoce y se cita tal cual si no. Inventarle una
      // traducción a una ranura desconocida sería peor que enseñarla.
      const nombreRanura = p.slot
        ? (NOMBRE_RANURA[p.slot as keyof typeof NOMBRE_RANURA] ?? p.slot)
        : null;
      const ranura = nombreRanura ? `, ${nombreRanura.toLowerCase()}` : "";
      const sintonia =
        p.attuned === true ? ", sintonizado" : p.attuned === false ? ", sin sintonizar" : "";
      return `Mueve ${p.item}: ${NOMBRE_ZONA[p.from].toLowerCase()} → ${NOMBRE_ZONA[
        p.to
      ].toLowerCase()}${ranura}${sintonia}`;
    }
    case "ITEM_REMOVED":
      return p.quantity > 1 ? `Suelta ${p.item} (${p.quantity} unidades)` : `Suelta ${p.item}`;

    // --- 2C: el reloj, las condiciones que vencen solas y las tablas de la casa ---
    case "CLOCK_ADVANCED": {
      const ritmo = p.pace ? `, a paso ${RITMO[p.pace] ?? p.pace}` : "";
      const millas = p.miles !== undefined ? ` (${p.miles} millas)` : "";
      return `Pasan ${duracionLegible(p.seconds)}${ritmo}${millas}`;
    }
    case "CONDITION_EXPIRED":
      return p.level !== undefined
        ? `Vence la condición «${nombreCondicion(p.key)}», nivel ${p.level}`
        : `Vence la condición «${nombreCondicion(p.key)}»`;
    case "TABLE_ROLLED": {
      const porque = p.trigger ? ` ${DISPARO_DE_TABLA[p.trigger] ?? ""}` : "";
      return `Tabla «${p.tableName}»${porque}: saca ${p.roll} en d${p.die} — ${p.text}`;
    }

    // --- 2.5.2 y 2.5.6: el combate ---
    case "ENCOUNTER_STARTED":
      return "Empieza el combate";
    case "TURN_ADVANCED":
      // **Sin nombres.** El suceso trae posiciones, no personajes, y a propósito: la ficha del
      // encuentro ya filtra por `canView` y renumera denso, así que traducir aquí una posición a
      // un nombre exigiría una lista que este espectador puede no tener entera.
      return `Pasa el turno (asalto ${p.round})`;
    case "ROUND_ADVANCED":
      return `Asalto ${p.to}`;
    case "ENCOUNTER_ENDED":
      return p.rounds === 1
        ? "Termina el combate en un asalto"
        : `Termina el combate tras ${p.rounds} asaltos`;

    // --- 2.5.3: el ataque comparado en el servidor ---
    case "ATTACK_RESOLVED":
      // **Sin CA y sin el nombre del objetivo.** El suceso se escribe a la visibilidad del
      // objetivo justo para no anunciar que existe; la frase dice lo que pasó, no contra quién.
      return `${p.attackName}: ${VEREDICTO[p.verdict] ?? p.verdict}`;

    // --- 2.5.8: archivar en vez de borrar ---
    case "CHARACTER_ARCHIVED":
      return `Se archiva a ${p.characterName}`;
    case "CHARACTER_RESTORED":
      return `Vuelve del archivo ${p.characterName}`;
  }
}

/** La hora, sin fecha: dentro de una sesión la fecha es la misma para todo. */
export function horaDe(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

/**
 * El sello con el que se marcó una anotación, o `null` si el suceso no es una anotación.
 *
 * Existe para el chip de clase que la maqueta pone **a la izquierda** de cada línea del registro:
 * de un vistazo se distingue un combate de un hallazgo sin leer la frase. Solo lo tienen los
 * sucesos que alguien selló a mano; los diecinueve tipos que escribe el motor (perder PG, una
 * tirada, una condición) no llevan chip a propósito — inventarles una categoría sería una
 * segunda tabla de vocabulario que se separaría de `NOMBRE_SELLO` a la primera.
 */
export function selloDeSuceso(p: GameEventPayload): SessionNoteKind | null {
  return p.type === "SESSION_NOTE" ? p.kind : null;
}
