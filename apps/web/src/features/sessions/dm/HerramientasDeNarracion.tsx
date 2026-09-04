import { IconoBuscar } from "../iconos";

// **Ola 0 (2026-09-04): la columna del DM, con la única herramienta que hoy está cableada.**
//
// La auditoría del 2026-09-04 lo midió: de las **seis** herramientas de narración de la maqueta,
// en la mesa había **dos**, y «Revelar» era *texto de ayuda sin botón*. El encargo del carril es
// que las seis estén aquí y funcionen contra lo que YA existe en el servidor —revelar
// (`entities`), pedir tirada (`roll-requests`), avanzar el reloj (`game-clock`), sacar criatura
// (`bestiario`/`encounters`), bloques de reglas (`rules`) y tablas (`dm-tables`)—, en la rejilla
// de `prototipo/src/features/HerramientasDeNarracion.tsx:19-46`.
//
// **Aquí no se pintan las cinco que faltan.** Una rejilla de seis botones de los que uno hace algo
// es exactamente lo que `docs/04-convenciones.md` prohíbe: si el texto promete una regla que el
// servidor no cumple, **miente el texto**. Se pinta la que está cableada y se dice que faltan.

/** La frase de la maqueta, literal. No se parafrasea: es voz del producto. */
export const FRASE_DEL_DM =
  "El sistema propone; tú decides. Nada llega a la mesa hasta que lo confirmas.";

export function HerramientasDeNarracion({
  onConsultarElMundo,
}: {
  onConsultarElMundo: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-s3">
      <h2 className="flex shrink-0 items-center gap-s2 font-title text-chrome-md text-text">
        Herramientas del DM
        <span aria-hidden="true" className="h-px flex-1 bg-copper/40" />
      </h2>

      <button
        type="button"
        onClick={onConsultarElMundo}
        className="flex shrink-0 items-center gap-s2 rounded-radius-sm border border-copper bg-bg px-s3 py-s2 text-left font-chrome text-chrome-sm text-text transition-colors hover:border-accent hover:text-accent-text"
      >
        <IconoBuscar className="h-4 w-4 shrink-0 text-copper-text" />
        Consultar el mundo
      </button>

      <p className="shrink-0 font-chrome text-chrome-xs text-muted">{FRASE_DEL_DM}</p>

      <p className="shrink-0 border-t border-muted pt-s2 font-chrome text-chrome-xs text-muted">
        Pedir una tirada, avanzar el reloj, sacar una criatura, los bloques de reglas y las tablas
        entran aquí con su carril. Hoy siguen en sus pestañas.
      </p>
    </div>
  );
}
