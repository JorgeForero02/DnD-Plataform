import { cloneElement, useId } from "react";
import type { ReactElement } from "react";

export interface FieldControlProps {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

export interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: ReactElement<FieldControlProps>;
}

// Shared class string for the control itself (input/textarea/select) — Field only owns the
// label/error scaffolding and aria wiring around whatever control is passed in.
export const fieldControlClass =
  "w-full rounded-radius-sm border border-muted bg-surface px-2 py-1.5 font-chrome text-chrome-sm text-text " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
  "aria-[invalid=true]:border-danger disabled:cursor-not-allowed disabled:text-muted";

// Task 1.19 — Field wires label + control + error/hint for accessibility: the control gets an
// id (matching the label's htmlFor), aria-describedby pointing at the hint and/or error, and
// aria-invalid when there is an error. Revert the cloneElement wiring below and
// Field.test.tsx's aria assertions fail even though the label and error text still render.
export function Field({ label, error, hint, children }: FieldProps) {
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
        <p id={hintId} className="font-chrome text-chrome-xs text-muted">
          {hint}
        </p>
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
        // as an error now, not just a muted note with a coloured bullet.
        <p id={errorId} role="alert" className="font-chrome text-chrome-xs text-danger-text">
          <span aria-hidden="true">▲ </span>
          {error}
        </p>
      )}
    </div>
  );
}
