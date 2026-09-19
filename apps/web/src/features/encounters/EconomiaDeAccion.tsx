import { useId, useState } from "react";
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

/**
 * D-CF-149 — lo que se VE en la franja, que es una fila y no tiene sitio para «acción adicional»:
 * el prototipo escribe «adicional». La palabra entera sigue en el `title` y en lo leído.
 */
const ROTULO_CORTO: Record<Exclude<Coste, "FREE" | "MOVEMENT">, string> = {
  ACTION: "acción",
  BONUS: "adicional",
  REACTION: "reacción",
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
  /**
   * D-CF-149 (3A.3, Task 5b) — **de quién es esta economía**, delante de las marcas, como en la
   * franja del prototipo («Sylas · acción · adicional · reacción · 30/30 pies»). Con `vozClase`
   * (la clase de `vozDePersonaje`) el nombre se pinta con la voz del personaje.
   */
  nombre?: string;
  vozClase?: string;
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
  nombre,
  vozClase = "text-text",
}: EconomiaDeAccionProps) {
  const [pies, setPies] = useState("5");
  const [corrigiendo, setCorrigiendo] = useState(false);
  const idDescripcion = useId();

  const gastar = (coste: Coste, cantidad?: number) => onGastar?.({ coste, cantidad });

  const restante =
    velocidad === undefined ? undefined : Math.max(CERO_PIES, velocidad - economia.movementUsed);

  const recursos = recursosDeMas(economia, velocidad, excedido);

  const marcas = [
    { coste: "ACTION" as const, gastada: economia.actionUsed },
    { coste: "BONUS" as const, gastada: economia.bonusUsed },
    { coste: "REACTION" as const, gastada: economia.reactionUsed },
  ];

  // D-CF-149 (Task 5b de 3A.3) — **una fila, como la franja del prototipo.** Hasta aquí esto era
  // una caja aparte con tres marcas y su palabra («acción: disponible»), debajo de la tira de
  // turnos; el HTML del autor lo pone EN la misma fila que los turnos, separado por un filete, y
  // cada marca es un punto y su nombre: el punto lleno es «disponible», el hueco y tachado es
  // «gastada». **La palabra no desaparece: se lee, no se ve** —`sr-only` dentro de la misma
  // marca, más `title` para el ratón—, porque la regla de la casa es que el color no sea el único
  // portador, y aquí tampoco lo es: la forma del punto (lleno / hueco con trazo) ya distingue
  // los dos estados sin color. El texto completo sigue en el DOM de la marca —«acción: gastada»—
  // para quien lo lea con un lector de pantalla o con una prueba.
  return (
    <div
      role="status"
      aria-label="Economía del turno"
      className="flex min-w-0 shrink-0 flex-wrap items-center gap-x-s2 gap-y-s1 border-l border-muted/40 pl-s3"
    >
      {nombre && (
        <span className={`font-title text-chrome-base leading-none ${vozClase}`}>{nombre}</span>
      )}
      <span className="flex flex-wrap items-center gap-x-s2 gap-y-s1">
        {marcas.map(({ coste, gastada }) => {
          const deMas = recursos[coste];
          const estado = `${gastada ? "gastada" : "disponible"}${deMas ? " de más" : ""}`;
          return (
            <span key={coste} className="flex items-center gap-s1">
              <span
                className={deMas ? "text-warning-text" : gastada ? "text-muted" : "text-copper"}
                aria-hidden="true"
              >
                {gastada ? <IconoPuntoTachado /> : <IconoPuntoLleno />}
              </span>
              <span
                title={`${ETIQUETA_DE_COSTE[coste]}: ${estado}`}
                className={`whitespace-nowrap font-chrome text-chrome-sm ${
                  deMas ? "text-warning-text" : gastada ? "text-muted" : "text-text"
                }`}
              >
                {coste === "BONUS" && <span className="sr-only">acción </span>}
                {ROTULO_CORTO[coste]}
                <span className="sr-only">: {estado}</span>
              </span>
            </span>
          );
        })}

        <span className="flex items-center gap-s1">
          <span
            className={recursos.MOVEMENT ? "text-warning-text" : "text-muted"}
            aria-hidden="true"
          >
            <IconoMovimiento />
          </span>
          <span
            className={`whitespace-nowrap font-data text-chrome-xs ${recursos.MOVEMENT ? "text-warning-text" : "text-muted"}`}
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
            className="w-11 rounded-radius-sm border border-muted/40 bg-bg px-s1 py-px font-data text-chrome-xs text-text"
          />
          <button
            type="button"
            onClick={() => gastar("MOVEMENT", Number(pies) || 0)}
            className="rounded-radius-sm border border-muted/40 px-s2 py-px font-chrome text-chrome-xs text-muted transition-colors hover:border-copper hover:text-copper-text"
          >
            Mover
          </button>
        </span>
      </span>

      {esDm && (
        <>
          <button
            type="button"
            onClick={() => setCorrigiendo((v) => !v)}
            className="rounded-radius-sm border border-transparent px-s2 py-px font-chrome text-chrome-sm text-muted transition-colors hover:border-muted/40 hover:text-text"
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
              className="flex flex-wrap items-center gap-s2"
            >
              {marcas.map(({ coste, gastada }) => (
                <label
                  key={coste}
                  className="flex items-center gap-s1 whitespace-nowrap font-chrome text-chrome-xs text-text"
                  title={gastada ? "Ya gastada; no se deshace" : undefined}
                >
                  {/* Ola post-revisión de 3A.3 (I4) — `aria-disabled` + motivo, no `disabled`:
                      la casilla ya gastada sigue en el recorrido de teclado y dice POR QUÉ no
                      se toca (`aria-describedby`); el `onChange` la ignora. */}
                  <input
                    type="checkbox"
                    checked={gastada}
                    aria-disabled={gastada || undefined}
                    aria-describedby={gastada ? `${idDescripcion}-${coste}` : undefined}
                    onChange={() => {
                      if (gastada) return;
                      gastar(coste);
                    }}
                    aria-label={ETIQUETA_DE_COSTE[coste]}
                    className="aria-disabled:cursor-not-allowed"
                  />
                  {ETIQUETA_DE_COSTE[coste]}
                  {gastada && (
                    <span id={`${idDescripcion}-${coste}`} className="sr-only">
                      Ya gastada; no se deshace
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </>
      )}

      {gastando && (
        <span className="font-chrome text-chrome-xs text-muted">Enviando el gasto…</span>
      )}

      {excedido && (
        <p role="alert" className="basis-full font-chrome text-chrome-xs text-warning-text">
          {fraseDeExceso(recursos)}
        </p>
      )}
    </div>
  );
}
