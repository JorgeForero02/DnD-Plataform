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
// **3A.3 (D-CF-145) — la economía deja de ser botones y pasa a ser estado que se gasta al
// actuar.** Hasta aquí el jugador tenía «Usar mi acción/adicional/reacción»: tres botones que no
// gastaban nada por sí mismos que un ataque, un conjuro o una actividad no gastara ya por su
// propia puerta (tarea A2/A11) — solo servían para adelantarse a mano a algo hecho fuera del
// sistema, invitando a desincronizarse de lo que el servidor de verdad cuenta. Ahora el jugador
// solo VE tres marcas y sus pies; si hace algo que no pasa por una puerta (habla, usa un objeto de
// la ficción), se lo dice al DM, que es quien conserva «Corregir». El campo de pies + «Mover»
// sigue siendo mando de cualquiera: el movimiento no tiene puerta propia que lo gaste.

const CERO_PIES = 0;

/** Los cuatro trozos de la economía del turno, en el orden del SRD (`COSTES` en `@dnd/shared`). */
const ETIQUETA_DE_COSTE: Record<Exclude<Coste, "FREE">, string> = {
  ACTION: "acción",
  BONUS: "acción adicional",
  REACTION: "reacción",
  MOVEMENT: "movimiento",
};

/** El orden en que se listan los tres costes booleanos: el mismo para las marcas y la frase. */
const ORDEN_DE_MARCAS: Array<Exclude<Coste, "FREE" | "MOVEMENT">> = ["ACTION", "BONUS", "REACTION"];

/** Punto lleno: disponible. Geometría dibujada, no un glifo de fuente — la regla de iconos. */
function IconoPuntoLleno() {
  return (
    <svg viewBox="0 0 16 16" width="0.6em" height="0.6em" aria-hidden="true">
      <circle cx="8" cy="8" r="6" fill="currentColor" />
    </svg>
  );
}

/**
 * Punto tachado: gastada. Un círculo hueco con un trazo diagonal — y nunca solo la forma o el
 * color: cada marca lleva siempre su palabra («gastada») al lado, para quien no ve el dibujo.
 */
function IconoPuntoTachado() {
  return (
    <svg viewBox="0 0 16 16" width="0.6em" height="0.6em" aria-hidden="true">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 13 13 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
  /** Se llama cuando la mesa pulsa un control de gasto (Mover, o una casilla de «Corregir»). */
  onGastar?: (input: { coste: Coste; cantidad?: number }) => void;
  /** Hay una petición de gasto en vuelo. Se enseña, pero **no deshabilita nada** (ver arriba). */
  gastando?: boolean;
  /**
   * Solo el DM ve «Corregir» (D-CF-145): abre las tres marcas como conmutadores para arreglar a
   * mano lo que el sistema no vio (algo resuelto fuera de una puerta). **Un jugador nunca lo ve**:
   * ya no tiene botones de gasto propios, así que tampoco tiene una puerta de trampa para
   * fabricárselos él mismo.
   */
  esDm?: boolean;
}

/**
 * Qué recursos están de verdad de más, para pintar su marca en `--warning` y para componer la
 * frase de exceso — la misma fuente para las dos, en vez de dos cálculos que puedan discrepar.
 *
 * Los tres booleanos solo cuentan como «de más» si el último gasto (`excedido`) se pasó — un
 * `actionUsed: true` normal, dentro de lo que te quedaba, no es un exceso. El movimiento es
 * distinto: es un contador, así que se compara directamente contra la velocidad conocida, y por
 * eso NO depende de `excedido` — puede haberse pasado en un gasto anterior que ya no sea «el
 * último», y sigue siendo verdad que te has pasado.
 */
function recursosDeMas(
  economia: EconomiaDelTurno,
  velocidad: number | undefined,
  excedido: boolean,
): Record<Exclude<Coste, "FREE">, boolean> {
  return {
    ACTION: excedido && economia.actionUsed,
    BONUS: excedido && economia.bonusUsed,
    REACTION: excedido && economia.reactionUsed,
    MOVEMENT: velocidad !== undefined && economia.movementUsed > velocidad,
  };
}

/**
 * Compone la frase de exceso con los recursos que de verdad están de más, en vez de un aviso
 * genérico — así «te has pasado» siempre dice EN QUÉ, que es lo que hace la línea útil en mitad
 * de una mesa.
 */
function fraseDeExceso(recursos: Record<Exclude<Coste, "FREE">, boolean>): string {
  const partes = [...ORDEN_DE_MARCAS, "MOVEMENT" as const]
    .filter((coste) => recursos[coste])
    .map((coste) => `tu ${ETIQUETA_DE_COSTE[coste]}`);

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
  esDm = false,
}: EconomiaDeAccionProps) {
  const [pies, setPies] = useState("5");
  const [corrigiendo, setCorrigiendo] = useState(false);

  const gastar = (coste: Coste, cantidad?: number) => onGastar?.({ coste, cantidad });

  const restante =
    velocidad === undefined ? undefined : Math.max(CERO_PIES, velocidad - economia.movementUsed);

  const recursos = recursosDeMas(economia, velocidad, excedido);

  const marcas = [
    { coste: "ACTION" as const, gastada: economia.actionUsed },
    { coste: "BONUS" as const, gastada: economia.bonusUsed },
    { coste: "REACTION" as const, gastada: economia.reactionUsed },
  ];

  return (
    <div
      role="status"
      aria-label="Economía del turno"
      className="flex flex-col gap-s2 rounded-radius-sm border border-muted/40 bg-surface px-s3 py-s2"
    >
      <ul className="flex flex-wrap items-center gap-s3">
        {marcas.map(({ coste, gastada }) => {
          const deMas = recursos[coste];
          return (
            <li key={coste} className="flex items-center gap-s1">
              <span className={deMas ? "text-warning-text" : "text-accent"} aria-hidden="true">
                {gastada ? <IconoPuntoTachado /> : <IconoPuntoLleno />}
              </span>
              <span
                className={`font-chrome text-chrome-sm ${deMas ? "text-warning-text" : "text-text"}`}
              >
                {ETIQUETA_DE_COSTE[coste]}: {gastada ? "gastada" : "disponible"}
                {deMas ? " de más" : ""}
              </span>
            </li>
          );
        })}

        <li className="flex items-center gap-s2">
          <span
            className={recursos.MOVEMENT ? "text-warning-text" : "text-accent"}
            aria-hidden="true"
          >
            <IconoMovimiento />
          </span>
          <span
            className={`font-data text-chrome-sm ${recursos.MOVEMENT ? "text-warning-text" : "text-text"}`}
          >
            {restante === undefined
              ? "velocidad desconocida"
              : `${restante}/${velocidad} pies${recursos.MOVEMENT ? " de más" : ""}`}
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

      {esDm && (
        <div className="flex flex-col gap-s1">
          <button
            type="button"
            onClick={() => setCorrigiendo((v) => !v)}
            className="self-start font-chrome text-chrome-xs text-muted underline-offset-2 hover:text-copper-text hover:underline"
          >
            Corregir
          </button>
          {corrigiendo && (
            // **El DM arbitra, y solo hacia adelante.** `EncountersService.gastar` solo sabe
            // MARCAR gastado (tarea A2): no hay puerta para deshacer un gasto ya escrito, así que
            // una casilla ya gastada se enseña marcada y sin interacción — inventar aquí un
            // «des-gasto» que el servidor no ofrece sería la misma mentira que prohíbe
            // `docs/04-convenciones.md` para un texto que describe una regla del servidor.
            <div
              role="group"
              aria-label="Corregir la economía a mano"
              className="flex flex-wrap items-center gap-s3"
            >
              {marcas.map(({ coste, gastada }) => (
                <label
                  key={coste}
                  className="flex items-center gap-s1 font-chrome text-chrome-xs text-text"
                >
                  <input
                    type="checkbox"
                    checked={gastada}
                    disabled={gastada}
                    onChange={() => gastar(coste)}
                    aria-label={ETIQUETA_DE_COSTE[coste]}
                  />
                  {ETIQUETA_DE_COSTE[coste]}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {gastando && (
        <span className="font-chrome text-chrome-xs text-muted">Enviando el gasto…</span>
      )}

      {excedido && (
        <p role="alert" className="font-chrome text-chrome-xs text-warning-text">
          {fraseDeExceso(recursos)}
        </p>
      )}
    </div>
  );
}
