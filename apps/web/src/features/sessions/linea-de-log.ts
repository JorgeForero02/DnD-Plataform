import type { GameEventPayload, SessionNoteKind } from "@dnd/shared";
import { NOMBRE_SELLO } from "./vocabulario";

// De un suceso del log a **una línea que se lee en voz alta**.
//
// Vive aquí, una sola vez, por la regla del proyecto: ningún valor de enumeración llega a la
// pantalla. Y hace falta especialmente aquí porque el log es lo único que se lee seis semanas
// después, cuando ya nadie se acuerda de qué pasó.
//
// **Una clave que no esté traducida se ve**, no se cae: `Sin traducir: <clave>`. Un log que se
// deja sucesos por el camino en silencio es peor que uno que no existe.

const REPOSO: Record<string, string> = { SHORT: "corto", LONG: "largo" };

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
        ? `Recibe la condición «${p.key}», nivel ${p.level}`
        : `Recibe la condición «${p.key}»`;
    case "CONDITION_REMOVED":
      return `Se le quita la condición «${p.key}»`;
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
      return `El DM fija ${p.target} en ${p.value}${antes}${motivo}`;
    }
    default:
      // Inalcanzable mientras la unión esté completa; si algún día se añade un tipo y se olvida
      // aquí, esto es lo que lo hace visible en vez de dejar una línea en blanco.
      return `Sin traducir: ${(p as { type: string }).type}`;
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
