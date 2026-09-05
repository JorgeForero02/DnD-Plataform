import { useResources } from "../../character-sheet/hooks";
import type { RollMode } from "@dnd/shared";

/**
 * **«Usar inspiración», el único de los tres botones de la maqueta que el SRD respalda**
 * (plan 08, ficha I8).
 *
 * SRD 5.1: *«If you have inspiration, you can expend it when you make an attack roll, saving
 * throw, or ability check. Spending your inspiration gives you advantage on that roll.»*
 *
 * Los otros dos de la maqueta no se pintan y siguen sin pintarse: «Ventaja por flanqueo +3» es una
 * regla **opcional del DMG** que además da ventaja y no un número, y «Ayuda de Mira +1d4» es la
 * acción Ayudar, que también da **ventaja** —el +1d4 es `Bless`, otro conjuro—.
 *
 * ## Lo que este control NO hace, y por qué importa
 *
 * **No gasta nada por su cuenta.** Es una casilla: quien gasta es el servidor, en la misma
 * petición que la tirada. Un botón que gastara primero dejaría dos formas de perderlo — gastarla
 * y que la tirada falle, o tirar y que el gasto falle.
 *
 * **No aparece si no la tiene.** Una casilla que siempre está y siempre da 409 enseña a ignorarla.
 * Y **no aparece sin personaje**: la inspiración es de un personaje, no de una persona.
 */
export function GastarInspiracion({
  campaignId,
  characterId,
  modo,
  value,
  onChange,
  disabled = false,
}: {
  campaignId: string;
  /** Sin personaje no hay inspiración que gastar, y el control no se pinta. */
  characterId?: string;
  /** El modo elegido para esta tirada: con desventaja el servidor la rechaza. */
  modo: RollMode;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { data: recursos } = useResources(campaignId, characterId ?? "");
  const fila = (recursos ?? []).find((r) => r.key === "inspiration");
  if (!characterId || !fila || fila.current < 1) return null;

  // **Con desventaja se anularían** —SRD: *«you are considered to have neither of them»*— y la
  // inspiración se perdería para nada. El servidor lo rechaza; aquí se dice antes, que es lo que
  // evita el rechazo en vez de explicarlo.
  const seAnula = modo === "DISADVANTAGE";

  return (
    <div className="flex flex-col gap-s1">
      <label className="flex items-center gap-s2 font-chrome text-chrome-sm text-text">
        <input
          type="checkbox"
          checked={value && !seAnula}
          disabled={disabled || seAnula}
          onChange={(e) => onChange(e.target.checked)}
        />
        Gastar su <strong>{fila.label.toLowerCase()}</strong>: esta tirada va con ventaja
      </label>
      <p className="font-chrome text-chrome-xs text-muted">
        {seAnula
          ? "Con desventaja se anularían y la perdería sin ganar nada, así que aquí no se puede gastar."
          : "Se gasta al tirar, no antes: si la tirada no sale, la conserva."}
      </p>
    </div>
  );
}
