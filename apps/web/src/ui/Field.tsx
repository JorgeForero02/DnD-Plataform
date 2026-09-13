import { cloneElement, useId } from "react";
import type { ReactElement } from "react";
import { IconoAviso } from "./Iconos";

export interface FieldControlProps {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

export interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  /**
   * Anexo #8 — cuando es `true`, la línea de pista/error se pinta siempre con `min-h-[1.125rem]`
   * (vacía si no hay nada que decir), para que el control no salte de alto al aparecer o
   * desaparecer un error de validación en vivo (p.ej. el evaluador de expresiones de dados).
   */
  reservaEspacio?: boolean;
  children: ReactElement<FieldControlProps>;
}

// Shared class string for the control itself (input/textarea/select) — Field only owns the
// label/error scaffolding and aria wiring around whatever control is passed in.
//
// Fix round 2 (post-1.19b review): the first fix for the iOS Safari zoom-on-focus risk added
// an element-selector override in tokens.css (`@media (pointer: coarse) { input, textarea,
// select { font-size: var(--text-md) } }`, specificity 0,0,1). It never took effect —
// text-chrome-sm below compiles to a CLASS selector (0,1,0), and a class beats an element
// selector regardless of source order, confirmed against the real compiled CSS. Fixed at the
// source instead of fighting the cascade: the coarse-pointer size is a Tailwind arbitrary
// variant on THIS class, same specificity as the base utility it overrides (Tailwind emits the
// variant after the base, so it wins honestly on source order, not `!important`). The
// element-selector block in tokens.css is deleted, not left as dead weight that reads as
// "handled" to the next person.
export const fieldControlClass =
  "w-full rounded-radius-sm border border-muted bg-surface px-2 py-1.5 font-chrome text-chrome-sm text-text " +
  "[@media(pointer:coarse)]:text-chrome-md " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
  "aria-[invalid=true]:border-danger disabled:cursor-not-allowed disabled:text-muted";

// Task 1.19 — Field wires label + control + error/hint for accessibility: the control gets an
// id (matching the label's htmlFor), aria-describedby pointing at the hint and/or error, and
// aria-invalid when there is an error. Revert the cloneElement wiring below and
// Field.test.tsx's aria assertions fail even though the label and error text still render.
export function Field({ label, error, hint, reservaEspacio, children }: FieldProps) {
  const generatedId = useId();
  const controlId = children.props.id ?? generatedId;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const control = cloneElement(children, {
    id: controlId,
    "aria-describedby": describedBy,
    "aria-invalid": Boolean(error),
  });

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={controlId} className="font-chrome text-chrome-sm text-text">
        {label}
      </label>
      {control}
      {hint && !error && (
        <p
          id={hintId}
          data-testid={reservaEspacio ? "field-linea" : undefined}
          className={[
            "font-chrome text-chrome-xs text-muted",
            reservaEspacio ? "min-h-[1.125rem]" : "",
          ].join(" ")}
        >
          {hint}
        </p>
      )}
      {!hint && !error && reservaEspacio && (
        // Anexo #8 — sin pista ni error, se reserva igualmente el alto de la línea para que el
        // control no salte cuando el evaluador de la expresión hace aparecer/desaparecer el
        // error mientras se escribe.
        <p data-testid="field-linea" className="font-chrome text-chrome-xs min-h-[1.125rem]" />
      )}
      {error && (
        // Fix round 1, Important 4: the first version of this put the message in --text and
        // only the glyph in --danger, on the reasoning that --danger text measured short of
        // 4.5:1 in the dark theme (true — best is 3.43:1). That was the wrong trade: this app
        // disables rather than hides and always shows the reason, so error text carries real
        // weight — making it typographically identical to a hint (the same colour, same
        // weight) throws that away. --danger-text is the fix instead: same hue/saturation as
        // --danger, lightness raised until --bg/--surface/--vellum all clear 4.5:1 in the dark
        // theme (5.15 / 4.73 / 4.60 — see tokens.css and the report). The whole message reads
        // as an error now, not just a muted note with a coloured mark.
        //
        // Q1: el aviso era un triángulo de fuente y ahora se dibuja (ui/Iconos.tsx). Sigue delante
        // del
        // texto porque la forma es la parte de la señal que no depende de distinguir el color.
        <p
          id={errorId}
          role="alert"
          data-testid={reservaEspacio ? "field-linea" : undefined}
          className={[
            "font-chrome text-chrome-xs text-danger-text",
            reservaEspacio ? "min-h-[1.125rem]" : "",
          ].join(" ")}
        >
          <IconoAviso className="mr-1" />
          {error}
        </p>
      )}
    </div>
  );
}
