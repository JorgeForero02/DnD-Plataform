/**
 * Radios con su frase (`docs/04-convenciones.md`, «opciones con significado como radios con
 * explicación y no en un desplegable»): subido a `ui/` (barrido PE-1, menor 4). Vivía copiado
 * tres veces —`features/campaigns/ReglasDeLaMesa.tsx`, `features/character-sheet/Condiciones.tsx`
 * (como `SelectorDeModoDeDuracion`) y `features/sessions/dm/DarXp.tsx` (el reparto)—, las tres
 * con el mismo DOM y las mismas clases, genérico solo sobre el vocabulario legible de cada
 * feature. Aquí se junta en un único sitio; las tres importan de aquí.
 *
 * `className` deja el `<fieldset>` con las clases exactas que cada copia ya tenía (una llevaba
 * `mt-s3`, otra `p-s2` en vez de `p-s3`): así ninguna de las tres cambia de DOM al migrar.
 */
export function GrupoDeRadios<T extends string>({
  legend,
  name,
  opciones,
  valor,
  onChange,
  disabled = false,
  nota,
  className = "rounded-radius-sm border border-muted bg-surface p-s3",
}: {
  legend: string;
  name: string;
  opciones: Record<T, { etiqueta: string; frase: string; deshabilitada?: boolean }>;
  valor: T;
  onChange: (v: T) => void;
  /** Desactiva TODO el grupo (no una opción suelta). Por defecto, activo — solo lo usaba
   * `ReglasDeLaMesa`; se conserva como opcional (las otras dos copias no lo pasaban). */
  disabled?: boolean;
  /** Una línea bajo el grupo. Opcional — solo la usaba `ReglasDeLaMesa`. */
  nota?: string;
  /** Clases del `<fieldset>`. Por defecto, las que compartían dos de las tres copias. */
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend className="px-1 font-chrome text-chrome-sm text-text">{legend}</legend>
      <div className="space-y-1">
        {(
          Object.entries(opciones) as [
            T,
            { etiqueta: string; frase: string; deshabilitada?: boolean },
          ][]
        ).map(([clave, opcion]) => {
          const elegida = valor === clave;
          // Ola de arreglos de 3A.2 (web I-1): una opción suelta puede estar apagada (el
          // espacio propio agotado, que se ve pero no se elige) sin apagar el grupo entero.
          const apagada = disabled || opcion.deshabilitada === true;
          return (
            <label
              key={clave}
              className={[
                "flex cursor-pointer items-start gap-s2 rounded-radius-sm border px-s2 py-1.5 transition-colors",
                elegida
                  ? "border-accent bg-[color:var(--accent-tint)]"
                  : "border-transparent hover:bg-bg",
                apagada ? "cursor-not-allowed opacity-60" : "",
              ].join(" ")}
            >
              <input
                type="radio"
                name={name}
                checked={elegida}
                disabled={apagada}
                onChange={() => onChange(clave)}
                className="mt-1 accent-[var(--accent)]"
              />
              <span className="min-w-0">
                <span className="block font-chrome text-chrome-sm text-text">
                  {opcion.etiqueta}
                </span>
                <span className="mt-0.5 block font-chrome text-chrome-xs leading-snug text-muted">
                  {opcion.frase}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {nota && <p className="mt-s2 font-chrome text-chrome-xs text-muted">{nota}</p>}
    </fieldset>
  );
}
