// Carril B2 — el grupo de radios genérico para «una opción con significado no se esconde en un
// desplegable» (docs/04-convenciones.md). `VisibilityChooser` (features/entities) resuelve
// exactamente el mismo problema para los cinco niveles de visibilidad; este componente es su
// versión reutilizable, para el tipo de objeto, el tipo de efecto, la categoría de arma, el
// alcance, la categoría de armadura y las pocas listas cerradas más de este carril — todas con
// pocas opciones y cada una con un significado distinto que una lista desplegable escondería.
//
// Las listas largas y mecánicas —los 13 tipos de daño, las 18 habilidades— **no** usan este
// componente: con tantas opciones un grupo de radios pesa más que ayuda, así que esas siguen
// siendo `<select>` en el formulario. La línea se traza donde la traza `VisibilityChooser`: pocas
// opciones, cada una distinta.
export function RadioGroup<T extends string>({
  name,
  legend,
  value,
  onChange,
  options,
  disabled = false,
  compact = false,
}: {
  name: string;
  legend: string;
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string; hint?: string }[];
  disabled?: boolean;
  /** Sin la frase de cada opción — para grupos pequeños y muy técnicos (categoría de arma,
   * alcance) donde una explicación de línea completa sobraría. */
  compact?: boolean;
}) {
  return (
    <fieldset className="rounded-radius-sm border border-muted p-s2">
      <legend className="px-1 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
        {legend}
      </legend>
      <div className={compact ? "flex flex-wrap gap-1.5" : "space-y-1"}>
        {options.map((opcion) => {
          const elegido = value === opcion.value;
          return (
            <label
              key={opcion.value}
              className={[
                "flex cursor-pointer items-start gap-2 rounded-radius-sm border px-2 py-1 transition-colors",
                compact ? "text-chrome-xs" : "text-chrome-sm",
                elegido
                  ? "border-accent bg-[color:var(--accent-tint)]"
                  : "border-transparent hover:bg-surface",
                disabled ? "cursor-not-allowed opacity-70" : "",
              ].join(" ")}
            >
              <input
                type="radio"
                name={name}
                value={opcion.value}
                checked={elegido}
                disabled={disabled}
                onChange={() => onChange(opcion.value)}
                className="mt-0.5 accent-[var(--accent)]"
              />
              <span className="min-w-0">
                <span className="block font-chrome text-text">{opcion.label}</span>
                {!compact && opcion.hint && (
                  <span className="mt-0.5 block font-chrome text-chrome-xs leading-snug text-muted">
                    {opcion.hint}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
