import { useId, useState } from "react";
import { IconoD20, IconoFlechaDerecha } from "../../../ui/Iconos";
import type { DatosDeTirada } from "./tirada";

// Copiado de `prototipo/src/features/TiradaIncrustada.tsx`: la tirada **no es un cuadro aparte**,
// es un momento tipográfico dentro del propio hilo, con filetes de cobre arriba y abajo y el
// desglose desplegable. Cada número enseña de dónde sale.
//
// Lo que se le añade a la maqueta, y son dos cosas de accesibilidad, no de forma: el botón lleva
// `aria-controls` sobre el desglose, y el desglose tiene su `id`. La maqueta solo pone
// `aria-expanded`, que sin el `aria-controls` no dice *qué* se expande.

export function TiradaIncrustada({
  t,
  compacta = false,
}: {
  t: DatosDeTirada;
  /**
   * D-CF-149 (Task 5b de 3A.3) — **la forma de línea del registro de la mesa**: el resultado y
   * el veredicto en la misma línea que la frase, y «De dónde sale» como enlace pequeño que
   * despliega el desglose debajo. Nada de lo que enseña la tarjeta se pierde: cambia el tamaño.
   */
  compacta?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const id = useId();
  // Sin veredicto —una tabla de la casa, una tirada sin dificultad— el número no es ni bueno ni
  // malo: se pinta en cobre, que es el color del mundo, y no en el de acierto o el de error.
  const tono =
    t.veredicto === null
      ? "text-copper-text"
      : t.veredicto === "EXITO"
        ? "text-accent-text"
        : "text-danger-text";

  if (compacta) {
    return (
      // La frase de la línea ya dice el total («1d20+2 = 14»): aquí va el veredicto, si lo hay,
      // y el desglose a un clic. El número no se repite.
      <span className="inline">
        {t.veredicto !== null && (
          <span className={`font-chrome text-chrome-xs ${tono}`}>
            · {t.veredicto === "EXITO" ? "éxito" : "fallo"}
          </span>
        )}
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-controls={id}
          className="ml-s2 font-chrome text-chrome-xs text-muted underline-offset-2 hover:text-copper-text hover:underline"
        >
          De dónde sale
        </button>
        {abierto && (
          <dl
            id={id}
            className="anim-surge my-s1 grid grid-cols-[1fr_auto] gap-x-s3 border-l-2 border-copper/40 pl-s2 font-data text-chrome-xs"
          >
            {t.desglose.map((d) => (
              <div key={d.origen} className="col-span-2 grid grid-cols-subgrid">
                <dt className="text-muted">{d.origen}</dt>
                <dd className="text-right text-text">{d.valor}</dd>
              </div>
            ))}
          </dl>
        )}
      </span>
    );
  }

  return (
    <div className="my-s2 border-y border-copper/25 py-s3">
      <div className="flex items-center gap-s3">
        <span className={tono}>
          <IconoD20 className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-chrome text-chrome-xs uppercase tracking-wide text-muted">
            {t.prueba}
            {t.dificultad !== undefined && ` · dificultad ${t.dificultad}`}
          </p>
          <p className="flex items-baseline gap-s2">
            <span className={`font-data text-chrome-xl ${tono}`}>{t.resultado}</span>
            {t.veredicto !== null && (
              <span className={`font-title text-chrome-md ${tono}`}>
                {t.veredicto === "EXITO" ? "Éxito" : "Fallo"}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-controls={id}
          className="inline-flex shrink-0 items-center gap-s1 rounded-radius-sm border border-muted/30 px-s2 py-s1 font-chrome text-chrome-xs text-muted hover:text-text"
        >
          <IconoFlechaDerecha
            className={`h-3.5 w-3.5 transition-transform ${abierto ? "rotate-90" : ""}`}
          />
          De dónde sale
        </button>
      </div>
      {abierto && (
        <dl
          id={id}
          className="anim-surge mt-s2 grid grid-cols-[1fr_auto] gap-x-s4 gap-y-s1 border-l-2 border-copper/40 pl-s3 font-data text-chrome-sm"
        >
          {t.desglose.map((d) => (
            <div key={d.origen} className="col-span-2 grid grid-cols-subgrid">
              <dt className="text-muted">{d.origen}</dt>
              <dd className="text-right text-text">{d.valor}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
