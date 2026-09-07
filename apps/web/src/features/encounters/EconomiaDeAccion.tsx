import { useState } from "react";
import type { Coste, EconomiaDelTurno } from "@dnd/shared";

// Paso 2, tarea A3 — **la mesa enseña lo que te queda del turno.**
//
// El servidor ya sabe contar y avisar (tarea A2, `EncountersService.gastar`): un combatiente
// gasta ACCIÓN, ADICIONAL, REACCIÓN o MOVIMIENTO por una sola puerta, y esa puerta **nunca
// rechaza** — cuenta el gasto, dice si te has pasado, y deja que la mesa decida. Hasta esta tarea
// eso no tenía ninguna pantalla: el jugador no podía ver ni gastar nada de esto.
//
// **Este componente es puramente de presentación.** No habla con el servidor: recibe la
// economía ya resuelta y, si el que lo monta le pasa `onGastar`, avisa de un clic — nunca decide
// por su cuenta si algo se puede gastar, porque esa decisión es del servidor y `excedido` es la
// suya, no una que este componente calcule con sus propias reglas.
//
// **Ningún control propio se deshabilita, ni siquiera cuando ya te has pasado.** Es la misma
// filosofía que `EncountersService.gastar`: el servidor cuenta y avisa, nunca refuse — así que
// esconder el botón cuando ya usaste tu acción sería este componente arrogándose un rechazo que
// el servidor decidió no hacer. Lo que sí hace es DECIRLO, con palabra, en una línea que un
// lector de pantalla anuncia.

const CERO_PIES = 0;

/** Los cuatro trozos de la economía del turno, en el orden del SRD (`COSTES` en `@dnd/shared`). */
const ETIQUETA_DE_COSTE: Record<Exclude<Coste, "FREE">, string> = {
  ACTION: "acción",
  BONUS: "acción adicional",
  REACTION: "reacción",
  MOVEMENT: "movimiento",
};

/** Trazo, `currentColor`, `1em`: la regla de iconos dibujados del reseño. */
function IconoAccion() {
  return (
    <svg viewBox="0 0 16 16" width="1em" height="1em" fill="none" aria-hidden="true">
      <path
        d="M8 1 3 9h4l-1 6 6-8H8l1-6Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconoAdicional() {
  return (
    <svg viewBox="0 0 16 16" width="1em" height="1em" fill="none" aria-hidden="true">
      <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconoReaccion() {
  return (
    <svg viewBox="0 0 16 16" width="1em" height="1em" fill="none" aria-hidden="true">
      <path
        d="M8 1 2.5 3.5v4c0 4 2.4 6.5 5.5 7.5 3.1-1 5.5-3.5 5.5-7.5v-4L8 1Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconoMovimiento() {
  return (
    <svg viewBox="0 0 16 16" width="1em" height="1em" fill="none" aria-hidden="true">
      <path
        d="M2 12h3l3-8 3 8h3M5 4h6"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface EconomiaDeAccionProps {
  economia: EconomiaDelTurno;
  /**
   * La velocidad de caminar, en pies, **o `undefined` si la hoja no la declara.** El servidor ya
   * trata «no lo sé» distinto de «cero» (`EncountersService.gastar`): un statblock a medio
   * construir no tiene por qué traer `walk`, y tratar ese hueco como velocidad cero convertiría
   * cualquier movimiento en un aviso falso. Esta pantalla tiene que decir la misma verdad.
   */
  velocidad?: number;
  /** Si el último gasto se pasó de lo que quedaba. Lo decide el servidor, no este componente. */
  excedido?: boolean;
  /** Se llama cuando la mesa pulsa un control de gasto. Sin él, los controles no hacen nada. */
  onGastar?: (input: { coste: Coste; cantidad?: number }) => void;
  /** Hay una petición de gasto en vuelo. Se enseña, pero **no deshabilita nada** (ver arriba). */
  gastando?: boolean;
}

/**
 * Compone la frase de exceso con los recursos que de verdad están de más, en vez de un aviso
 * genérico — así «te has pasado» siempre dice EN QUÉ, que es lo que hace la línea útil en mitad
 * de una mesa.
 */
function fraseDeExceso(economia: EconomiaDelTurno, velocidad: number | undefined): string {
  const partes: string[] = [];
  if (economia.actionUsed) partes.push(`tu ${ETIQUETA_DE_COSTE.ACTION}`);
  if (economia.bonusUsed) partes.push(`tu ${ETIQUETA_DE_COSTE.BONUS}`);
  if (economia.reactionUsed) partes.push(`tu ${ETIQUETA_DE_COSTE.REACTION}`);
  // El movimiento no es un booleano: solo cuenta como excedido si de verdad pasa la velocidad
  // conocida. Con velocidad desconocida nunca entra aquí — es la ausencia dicha con palabras.
  if (velocidad !== undefined && economia.movementUsed > velocidad) {
    partes.push(`tu ${ETIQUETA_DE_COSTE.MOVEMENT}`);
  }

  if (partes.length === 0) {
    return "Te has pasado de lo que te quedaba. El DM decide qué pasa con eso.";
  }
  const lista =
    partes.length === 1
      ? partes[0]
      : `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
  return `Ya has usado ${lista}. El DM decide qué pasa con eso — el servidor no impide nada.`;
}

export function EconomiaDeAccion({
  economia,
  velocidad,
  excedido = false,
  onGastar,
  gastando = false,
}: EconomiaDeAccionProps) {
  const [pies, setPies] = useState("5");

  const gastar = (coste: Coste, cantidad?: number) => onGastar?.({ coste, cantidad });

  const restante =
    velocidad === undefined ? undefined : Math.max(CERO_PIES, velocidad - economia.movementUsed);

  return (
    <section
      aria-label="Lo que te queda del turno"
      className="flex flex-col gap-s2 rounded-radius-sm border border-muted/40 bg-surface px-s3 py-s2"
    >
      <ul className="flex flex-wrap items-center gap-s3">
        <li className="flex items-center gap-s2">
          <span className="text-accent" aria-hidden="true">
            <IconoAccion />
          </span>
          <span className="font-chrome text-chrome-sm text-text">
            Acción: {economia.actionUsed ? "usada" : "disponible"}
          </span>
          <button
            type="button"
            onClick={() => gastar("ACTION")}
            className="rounded-radius-sm border border-accent px-s2 py-0.5 font-chrome text-chrome-xs text-accent-text hover:bg-accent/10"
          >
            Usar mi acción
          </button>
        </li>

        <li className="flex items-center gap-s2">
          <span className="text-accent" aria-hidden="true">
            <IconoAdicional />
          </span>
          <span className="font-chrome text-chrome-sm text-text">
            Acción adicional: {economia.bonusUsed ? "usada" : "disponible"}
          </span>
          <button
            type="button"
            onClick={() => gastar("BONUS")}
            className="rounded-radius-sm border border-accent px-s2 py-0.5 font-chrome text-chrome-xs text-accent-text hover:bg-accent/10"
          >
            Usar mi acción adicional
          </button>
        </li>

        <li className="flex items-center gap-s2">
          <span className="text-accent" aria-hidden="true">
            <IconoReaccion />
          </span>
          <span className="font-chrome text-chrome-sm text-text">
            Reacción: {economia.reactionUsed ? "usada" : "disponible"}
          </span>
          <button
            type="button"
            onClick={() => gastar("REACTION")}
            className="rounded-radius-sm border border-accent px-s2 py-0.5 font-chrome text-chrome-xs text-accent-text hover:bg-accent/10"
          >
            Usar mi reacción
          </button>
        </li>

        <li className="flex items-center gap-s2">
          <span className="text-accent" aria-hidden="true">
            <IconoMovimiento />
          </span>
          <span className="font-chrome text-chrome-sm text-text">Movimiento:</span>
          <span className="font-data text-chrome-sm text-text">
            {restante === undefined ? "velocidad desconocida" : `${restante} pies`}
          </span>
          <input
            type="number"
            min={1}
            value={pies}
            onChange={(e) => setPies(e.target.value)}
            aria-label="Pies de movimiento a gastar"
            className="w-16 rounded-radius-sm border border-muted bg-bg px-s1 py-0.5 font-data text-chrome-xs text-text"
          />
          <button
            type="button"
            onClick={() => gastar("MOVEMENT", Number(pies) || 0)}
            className="rounded-radius-sm border border-accent px-s2 py-0.5 font-chrome text-chrome-xs text-accent-text hover:bg-accent/10"
          >
            Mover
          </button>
        </li>
      </ul>

      {gastando && (
        <span className="font-chrome text-chrome-xs text-muted">Enviando el gasto…</span>
      )}

      {excedido && (
        <p role="alert" className="font-chrome text-chrome-xs text-warning-text">
          {fraseDeExceso(economia, velocidad)}
        </p>
      )}
    </section>
  );
}
