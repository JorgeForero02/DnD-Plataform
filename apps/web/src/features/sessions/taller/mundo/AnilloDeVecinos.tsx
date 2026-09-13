import { EmptyState } from "../../../../ui/Collection";
import { IconoDeTipo } from "../../../entities/iconos";
import { ETIQUETA_DE_TIPO } from "../../../entities/resumen";
import type { Entity } from "../../../entities/api";
import type { Vecino } from "./arbolDelMundo";

// **El anillo de vecinos** (Task 14 bis, D-CF-64): la ficha abierta en el centro y sus vecinos
// en círculo, a posiciones FIJAS —`2π·i/n`, la primera arriba—, con la frase de cada hilo sobre
// su radio. No es la telaraña que se retira: aquí solo hay una ficha con sus hilos, así que no
// hay solape que medir, y las posiciones no dependen del identificador sino del orden por nombre.
// Sin arrastre: un anillo se lee, no se coloca.
//
// El SVG dibuja los radios y las frases (`aria-hidden`: la frase va también en el nombre
// accesible del botón); cada vecino es un `<button>` HTML encima, colocado en porcentajes, para
// que sea alcanzable con Tab y con el ratón sin inventar un botón dentro de un SVG. Pulsarlo
// elige esa ficha, y el árbol la revela.

/** Más de doce en círculo no se leen; el resto sigue entero en la lista de hilos de debajo. */
const MAXIMO_EN_EL_ANILLO = 12;
/** Radio del anillo como fracción del semilado del cuadro. */
const RADIO = 0.36;

export function AnilloDeVecinos({
  centro,
  vecinos,
  onSeleccion,
}: {
  centro: Entity;
  vecinos: Vecino[];
  onSeleccion: (id: string) => void;
}) {
  if (vecinos.length === 0) {
    return (
      <EmptyState title="Esta ficha no tiene hilos todavía">
        Tiende el primero desde «Añadir hilo», aquí debajo, y aparecerá en el anillo.
      </EmptyState>
    );
  }

  const enElAnillo = vecinos.slice(0, MAXIMO_EN_EL_ANILLO);
  const fuera = vecinos.length - enElAnillo.length;
  const puntos = enElAnillo.map((v, i) => {
    const angulo = -Math.PI / 2 + (2 * Math.PI * i) / enElAnillo.length;
    return {
      vecino: v,
      x: 50 + Math.cos(angulo) * RADIO * 100,
      y: 50 + Math.sin(angulo) * RADIO * 100,
    };
  });

  return (
    <div className="flex flex-col gap-s2">
      <div
        role="group"
        aria-label={`Vecinos de ${centro.name}`}
        className="relative mx-auto aspect-square w-full max-w-[26rem]"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          {puntos.map(({ vecino, x, y }) => (
            <g key={vecino.hiloId}>
              <line
                x1="50"
                y1="50"
                x2={x}
                y2={y}
                stroke="var(--copper)"
                strokeWidth="0.5"
                strokeOpacity="0.6"
                strokeDasharray={vecino.direccion === "entra" ? "1.5 1.5" : undefined}
              />
              <text
                x={50 + (x - 50) * 0.55}
                y={50 + (y - 50) * 0.55}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="3.2"
                fill="var(--copper-text)"
                className="font-chrome"
              >
                {vecino.rotulo}
              </text>
            </g>
          ))}
        </svg>

        {/* El centro: la ficha abierta. No es un botón, ya está elegida. */}
        <div
          className="absolute left-1/2 top-1/2 flex w-[28%] -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-full border border-copper bg-surface px-s2 py-s2 text-center"
          aria-hidden="true"
        >
          <span className="text-copper-text">
            <IconoDeTipo type={centro.type} />
          </span>
          <span className="line-clamp-2 font-title text-chrome-sm text-text">{centro.name}</span>
        </div>

        {puntos.map(({ vecino, x, y }) => (
          <button
            key={vecino.hiloId}
            type="button"
            aria-label={`${vecino.rotulo} ${vecino.name}`}
            onClick={() => onSeleccion(vecino.id)}
            style={{ left: `${x}%`, top: `${y}%` }}
            className="absolute flex w-[26%] -translate-x-1/2 -translate-y-1/2 items-center gap-s1 rounded-radius-sm border border-muted bg-surface px-s2 py-1 text-left transition-colors hover:border-copper focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span className="text-copper-text">
              <IconoDeTipo type={vecino.type} />
            </span>
            <span className="sr-only">{ETIQUETA_DE_TIPO[vecino.type]}</span>
            <span className="min-w-0 flex-1 truncate font-chrome text-chrome-xs text-text">
              {vecino.name}
            </span>
          </button>
        ))}
      </div>
      {fuera > 0 && (
        <p className="text-center font-chrome text-chrome-xs text-muted">
          En el anillo van {MAXIMO_EN_EL_ANILLO};{" "}
          {fuera === 1 ? "queda 1 hilo más" : `quedan ${fuera} hilos más`} en la lista de abajo.
        </p>
      )}
    </div>
  );
}
