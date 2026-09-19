import { useObjetivoStore } from "../objetivo.store";
import { IconoDiana } from "../../../ui/Iconos";

// Ola post-revisión de 3A.3 (I3) — **apuntar es un botón propio, no la tarjeta entera.** La
// Task 4 había puesto `role="button"` + `aria-label="Apuntar a X"` sobre el `<li>` de
// `FichaDeElenco`/`FichaDePnj`: el nombre accesible de TODA la ficha pasaba a ser «Apuntar a X»
// (PG, CA, condiciones y salvaciones dejaban de leerse como contenido) y un botón con botones
// dentro (±5, Ayudar, Daño/Curar/«…») es contenido interactivo anidado. Playwright lo encontraba
// igual, así que el verde no lo delataba.
//
// Ahora: un botón pequeño en la cabecera de la tarjeta, icono dibujado (`IconoDiana`, nunca un
// glifo de fuente) + texto `sr-only`, y `aria-pressed` porque es exactamente un conmutador —esta
// tarjeta es o no es el objetivo. Pulsarlo cuando ya apunta **deja de apuntar** (lo que
// `aria-pressed` promete). La superficie de la tarjeta conserva el gesto de ratón
// (`alPulsarLaTarjeta`), pero ya no es lo que anuncia el DOM.
export function BotonDeApuntar({ id, nombre }: { id: string; nombre: string }) {
  const objetivo = useObjetivoStore((s) => s.objetivo);
  const apuntar = useObjetivoStore((s) => s.apuntar);
  const quitar = useObjetivoStore((s) => s.quitar);
  const apuntado = objetivo?.id === id;
  return (
    <button
      type="button"
      aria-pressed={apuntado}
      aria-label={`Apuntar a ${nombre}`}
      title={apuntado ? `Dejar de apuntar a ${nombre}` : `Apuntar a ${nombre}`}
      onClick={() => (apuntado ? quitar() : apuntar(id, nombre))}
      className={[
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-radius-sm border transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        apuntado
          ? "border-danger bg-danger/15 text-danger-text"
          : "border-muted/40 text-muted hover:border-accent hover:text-accent-text",
      ].join(" ")}
    >
      <IconoDiana className="h-3.5 w-3.5" />
    </button>
  );
}
