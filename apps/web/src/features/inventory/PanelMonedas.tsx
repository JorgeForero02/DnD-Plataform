import { useState } from "react";
import type { CoinKey, CoinPurse } from "@dnd/shared";
import { COIN_KEYS } from "@dnd/shared";
import { Button } from "../../ui/Button";
import { fieldControlClass } from "../../ui/Field";
import { IconoMoneda } from "./iconos";
import { NOMBRE_MONEDA } from "./vocabulario";

// Carril B1 — "Monedas en cuadrícula" (pantalla 20). El SRD tiene **cinco** monedas
// (cp, sp, ep, gp, pp): el prototipo solo dibuja cuatro, y aquí manda el proyecto, no la maqueta
// (regla explícita del brief).
//
// **El dinero manda deltas, nunca el total** (`changeMoneySchema`): cada celda tiene su propio
// campo de "cuánto mover" y un botón que aplica ESE delta — nunca se manda la cifra absoluta.

export function PanelMonedas({
  purse,
  onCambiar,
  aplicando,
  error,
}: {
  purse: CoinPurse;
  onCambiar: (key: CoinKey, delta: number) => void;
  /** La moneda cuyo `PATCH` está en vuelo, si hay uno. */
  aplicando: CoinKey | null;
  /** El error del servidor, ya en español tal cual llegó — y a qué moneda pertenece. */
  error?: { key: CoinKey; mensaje: string };
}) {
  const [deltas, setDeltas] = useState<Partial<Record<CoinKey, string>>>({});

  // El campo **no se limpia al pulsar**: un rechazo del servidor conserva lo tecleado (regla
  // del brief). Vuelve a estar vacío cuando `PaginaDeInventario` reordena `purse` con un valor
  // nuevo tras un `PATCH` que sí sale bien, porque entonces este componente se vuelve a montar
  // con la fila que lo contiene — ver la key de `PanelMonedas` en `PaginaDeInventario.tsx`.
  const aplicar = (key: CoinKey) => {
    const texto = deltas[key];
    const n = Number(texto);
    if (!texto || !Number.isInteger(n) || n === 0) return;
    onCambiar(key, n);
  };

  return (
    <div className="rounded-radius-sm border border-muted bg-surface p-s4">
      <h2 className="mb-s3 font-chrome text-chrome-sm font-semibold text-text">Monedas</h2>
      {/* **Dos columnas y ya, y el control apilado dentro.** Con `sm:grid-cols-3` cada celda se
          quedaba en unos 85px dentro de la columna de la hoja, y ahí no caben una casilla de 4rem
          y un botón «Aplicar» en la misma línea: el botón **se salía de su tarjeta**, medido en el
          navegador el 2026-09-06 sobre la hoja de un PNJ. La casilla pasa a ocupar el ancho y el
          botón va debajo; en cuanto hay sitio (`sm:`) vuelven a la misma línea. Es maquetación, o
          sea que **se comprueba en el navegador y no en `jsdom`**. */}
      <div className="grid grid-cols-2 gap-s3">
        {COIN_KEYS.map((key) => (
          <div
            key={key}
            className="rounded-radius-sm border border-[color:var(--copper-rule)] p-s2"
          >
            <p className="flex items-center gap-1 font-data text-chrome-lg text-text">
              <IconoMoneda className="text-copper-text" />
              {purse[key]}
            </p>
            <p className="mb-s2 font-chrome text-chrome-xs text-muted">{NOMBRE_MONEDA[key]}</p>
            <div className="flex flex-wrap items-center gap-1">
              <label className="sr-only" htmlFor={`delta-${key}`}>
                Cambio de {NOMBRE_MONEDA[key]}
              </label>
              <input
                id={`delta-${key}`}
                type="number"
                className={fieldControlClass + " w-full min-w-0 sm:w-16"}
                value={deltas[key] ?? ""}
                onChange={(e) => setDeltas((d) => ({ ...d, [key]: e.target.value }))}
                placeholder="0"
              />
              {/* **Un nombre accesible por moneda, no cinco «Aplicar» idénticos.** Con cinco
                  botones que se llaman igual, ni un lector de pantalla ni una prueba de
                  navegador pueden decir cuál es cuál — de hecho la suite de Playwright se rompió
                  con «resolved to 6 elements» en cuanto esto entró en la hoja.
                  Y **no se deshabilita mientras vuela**: un botón `disabled` sale del recorrido
                  de teclado y no puede explicar por qué no responde (regla vinculante de
                  `docs/04-convenciones.md`). Se marca ocupado y basta. */}
              <Button
                type="button"
                variant="secondary"
                aria-label={`Aplicar cambio de ${NOMBRE_MONEDA[key]}`}
                aria-busy={aplicando === key}
                className="w-full sm:w-auto"
                onClick={() => aplicar(key)}
              >
                Aplicar
              </Button>
            </div>
            {error?.key === key && (
              <p role="alert" className="mt-1 font-chrome text-chrome-xs text-danger-text">
                {error.mensaje}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
