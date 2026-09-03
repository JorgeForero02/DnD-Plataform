import { useId } from "react";
import type { RollAudience } from "@dnd/shared";
import { AUDIENCIAS_DE_TIRADA } from "./vocabulario";

// Tarea 2C.2 — **quién ve la tirada, como tres opciones visibles y explicadas.**
//
// Regla vinculante de `docs/04-convenciones.md`: *una opción con significado no se esconde en un
// desplegable; van visibles a la vez, cada una con la frase que explica qué hace*. Aquí pesa más
// que en ningún otro sitio de esta pantalla, porque equivocarse en este control **enseña a los
// jugadores algo que no debían ver** — que es literalmente el ejemplo con el que la regla está
// escrita.
//
// Es hermano de `SelectorDeVentaja` y no una instancia suya: aquel resuelve un modo de tirada
// (`RollMode`), este una audiencia (`RollAudience`), y son dos enumeraciones distintas con dos
// vocabularios distintos. Lo que sí comparten —el patrón de radio con `aria-describedby`, y el
// motivo de que la frase vaya **fuera** del `<label>`— está explicado entero allí: dentro del
// label, el texto pasa a formar parte del **nombre** del control, y el nombre de un control es
// lo que se dice de él, no lo que hace.
//
// `useId` y no un nombre fijo, por lo mismo que allí: dos grupos con el mismo `name` serían un
// solo grupo si algún día hay dos paneles de dados en pantalla.

export function SelectorDeAudiencia({
  value,
  onChange,
  disabled = false,
}: {
  value: RollAudience;
  onChange: (siguiente: RollAudience) => void;
  disabled?: boolean;
}) {
  const grupo = useId();

  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className="mb-1 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
        Quién ve el resultado
      </legend>
      <div className="flex flex-col gap-1">
        {AUDIENCIAS_DE_TIRADA.map((a) => {
          const elegido = a.audiencia === value;
          const idRadio = `${grupo}-${a.audiencia}-radio`;
          const idFrase = `${grupo}-${a.audiencia}-frase`;
          return (
            <div
              key={a.audiencia}
              data-audiencia={a.audiencia}
              className={[
                "flex items-baseline gap-s2 rounded-radius-sm border px-s2 py-1 transition-colors",
                // Clase entera, nunca `bg-accent/10`: una utilidad de opacidad sobre un token de
                // este proyecto se descarta entera y en silencio (docs/04-convenciones.md).
                elegido ? "border-accent bg-[color:var(--accent-tint)]" : "border-muted",
              ].join(" ")}
            >
              <input
                id={idRadio}
                type="radio"
                name={grupo}
                value={a.audiencia}
                checked={elegido}
                disabled={disabled}
                onChange={() => onChange(a.audiencia)}
                aria-describedby={idFrase}
                className="accent-[var(--accent)]"
              />
              <label
                htmlFor={idRadio}
                className={`shrink-0 font-chrome text-chrome-sm text-text ${
                  disabled ? "cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                {a.etiqueta}
              </label>
              <span id={idFrase} className="font-chrome text-chrome-xs leading-snug text-muted">
                {a.frase}
              </span>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
