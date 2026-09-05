import { useState } from "react";
import { Button } from "../../ui/Button";
import { useRules } from "../rules/hooks";
import type { RuleRow } from "../rules/api";
import { useExecuteEntity } from "./hooks";

/**
 * **La batuta** (plan 09, ficha I19): *«el DM lee el diálogo en voz alta, pulsa, y pasa lo que
 * tenía que pasar»*.
 *
 * El disparador `DM_EXECUTED` estaba en el vocabulario del motor **desde el principio** y no había
 * gesto en ninguna pantalla que lo escribiera, así que estaba retirado de la oferta. Esto es el
 * gesto — y con él, el motor deja de ser solo reactivo: el DM **ata en frío** lo que pasa al abrir
 * el cofre o al leer la inscripción, y en la mesa solo pulsa.
 *
 * ## Lo que lo hace honesto: dice cuántas reglas escuchan
 *
 * Un botón que siempre parece hacer algo enseña a desconfiar de él. Aquí se cuenta cuántas reglas
 * **armadas** tienen a esta ficha como disparador, y:
 *
 * - **con cero, se apaga y lo dice.** No es control de acceso —el servidor acepta ejecutar igual, y
 *   así debe ser: la regla puede crearse un segundo después—: es no ofrecer un gesto que no va a
 *   hacer nada.
 * - **con una o más, lo dice también**, para que el DM sepa que va a pasar algo antes de pulsar.
 *
 * Se cuenta en la pantalla y no en el servidor porque la lista de reglas **ya está pedida** en esta
 * sesión del DM (`useRules`): un endpoint nuevo para contar sería una segunda verdad sobre lo mismo.
 *
 * ## Y ejecutar no edita
 *
 * No cambia la ficha, no la revela, no la marca. Por eso está junto a «Revelar» y no dentro del
 * formulario de edición: son dos gestos de dirección, no dos formas de escribir.
 */
export function BotonEjecutar({ campaignId, entityId }: { campaignId: string; entityId: string }) {
  const { data: reglas } = useRules(campaignId);
  const ejecutar = useExecuteEntity(campaignId);
  const [hecho, setHecho] = useState(false);

  const escuchan = ((reglas ?? []) as RuleRow[]).filter(
    (r) =>
      r.status === "ARMED" && r.trigger.kind === "DM_EXECUTED" && r.trigger.entityId === entityId,
  ).length;

  const frase =
    escuchan === 0
      ? "Ninguna regla espera a esta ficha, así que ejecutar no haría nada."
      : escuchan === 1
        ? "Una regla espera a esta ficha."
        : `${escuchan} reglas esperan a esta ficha.`;

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <Button
        variant="secondary"
        disabled={escuchan === 0 || ejecutar.isPending}
        title={frase}
        onClick={() => {
          setHecho(false);
          ejecutar.mutate(entityId, { onSuccess: () => setHecho(true) });
        }}
      >
        {ejecutar.isPending ? "Ejecutando…" : "Ejecutar"}
      </Button>
      {/* La frase va escrita y no solo en el `title`: un `title` no lo lee quien navega con
          teclado ni cabe en un móvil, y esta frase es la mitad de lo que hace honesto al botón. */}
      <span className="font-chrome text-chrome-xs text-muted">{frase}</span>
      {hecho && (
        <span role="status" className="font-chrome text-chrome-xs text-accent-text">
          Ejecutada. Lo que pase sale en el registro con su propia visibilidad.
        </span>
      )}
      {ejecutar.isError && (
        <span role="alert" className="font-chrome text-chrome-xs text-danger-text">
          {(ejecutar.error as Error).message}
        </span>
      )}
    </span>
  );
}
