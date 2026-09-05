import { useState } from "react";
import { Button } from "../../ui/Button";
import { fieldControlClass } from "../../ui/Field";
import { PROSA_DE_HOJA } from "./Tarjeta";
import { useGiveResource } from "./hooks";
import { useCharacters } from "../characters/hooks";
import type { Character } from "../characters/api";

/**
 * **Regalar la inspiración, que es una regla del SRD y no una cortesía nuestra** (plan 08, I8).
 *
 * SRD 5.1, sobre la inspiración: *«you can give it to another player»* — y por eso este control
 * existe solo para ella y no para la furia o el ki: de esos el SRD no dice nada parecido, y
 * ofrecerlo en todos habría inventado una regla en cinco sitios a la vez.
 *
 * **Es un solo gesto contra el servidor**, no un gasto seguido de una reposición: las dos filas se
 * mueven en la misma transacción, así que no puede quedar en los dos ni en ninguno.
 *
 * No se pinta si no la tiene: regalar lo que no se tiene es un 409, y un control que solo sabe
 * fallar se aprende a ignorar.
 */
export function RegalarInspiracion({
  campaignId,
  characterId,
  clave,
  etiqueta,
  tiene,
}: {
  campaignId: string;
  characterId: string;
  clave: string;
  /** El rótulo de la fila, tal y como lo guarda el servidor: aquí no se traduce nada. */
  etiqueta: string;
  tiene: boolean;
}) {
  const { data: personajes } = useCharacters(campaignId);
  const regalar = useGiveResource(campaignId, characterId);
  const [destino, setDestino] = useState("");

  if (!tiene) return null;

  // A quién se puede dar: cualquiera de la mesa menos uno mismo y menos los archivados —un
  // personaje que ya no juega no puede usar nada de lo que se le dé.
  const candidatos = ((personajes ?? []) as Character[]).filter(
    (p) => p.id !== characterId && !p.archivedAt,
  );
  if (candidatos.length === 0) return null;

  return (
    <div className="flex flex-col gap-s1">
      <div className="flex flex-wrap items-center gap-s2">
        <label className="font-chrome text-chrome-xs text-muted" htmlFor={`regalar-${clave}`}>
          Dar su {etiqueta.toLowerCase()} a
        </label>
        <select
          id={`regalar-${clave}`}
          className={fieldControlClass + " w-44"}
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
        >
          <option value="">Elige a quién</option>
          {candidatos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="secondary"
          disabled={destino === "" || regalar.isPending}
          onClick={() => regalar.mutate({ key: clave, toCharacterId: destino, amount: 1 })}
        >
          {regalar.isPending ? "Dándola…" : "Dársela"}
        </Button>
      </div>
      <p className={PROSA_DE_HOJA}>
        Se la queda quien la reciba y se le va a quien la da. Si esa persona ya la tenía, no se
        acumula: se tiene o no se tiene.
      </p>
      {regalar.isError && (
        <p role="alert" className={`${PROSA_DE_HOJA} text-danger-text`}>
          {(regalar.error as Error).message}
        </p>
      )}
    </div>
  );
}
