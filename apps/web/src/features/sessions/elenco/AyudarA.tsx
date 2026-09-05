import { useState } from "react";
import { CLAVE_AYUDA } from "@dnd/shared";
import { Button } from "../../../ui/Button";
import { fieldControlClass } from "../../../ui/Field";
import { useCharacters } from "../../characters/hooks";
import type { Character } from "../../characters/api";
import { useHelp } from "../../character-sheet/hooks";
import { NOMBRE_CONDICION } from "../../character-sheet/vocabulario";

/**
 * **La acción Ayudar** (plan 08, ficha I8).
 *
 * SRD 5.1: *«you can aid a friendly creature in attacking a creature within 5 feet of you… the
 * first attack roll is made with advantage»*. Da **ventaja**, no un `+1d4`: ese +1d4 de la maqueta
 * es `Bless`, que es un conjuro, y el `+3` del otro botón es flanqueo de otra edición.
 *
 * ## Va en TU tarjeta, no en la del otro
 *
 * La regla de la mesa —del autor— es que sobre el personaje de otro jugador **no van mandos**.
 * Ayudar es una acción **tuya**: la decides tú en tu turno, y a quién ayudas es su parámetro. Por
 * eso el control vive aquí y el otro solo aparece en una lista.
 *
 * ## Y dice lo que el servidor NO comprueba
 *
 * El SRD exige además que el enemigo esté **a cinco pies de quien ayuda**. Eso son distancias, y
 * este producto no tiene tablero: **no se comprueba, y se dice**. `docs/04-convenciones.md` es
 * explícito en que si el texto explica una regla del servidor y discrepan, miente el texto — así
 * que el texto cuenta la verdad: la cercanía la juzga la mesa.
 */
export function AyudarA({
  campaignId,
  personaje,
}: {
  campaignId: string;
  /** El que ayuda: el tuyo. */
  personaje: Character;
}) {
  const { data: personajes } = useCharacters(campaignId);
  const ayudar = useHelp(campaignId, personaje.id);
  const [destino, setDestino] = useState("");

  const candidatos = ((personajes ?? []) as Character[]).filter(
    (p) => p.id !== personaje.id && !p.archivedAt,
  );
  if (candidatos.length === 0) return null;

  return (
    <div className="mt-s2 flex flex-col gap-s1">
      <div className="flex flex-wrap items-center gap-s1">
        <label className="font-chrome text-chrome-xs text-muted" htmlFor={`ayudar-${personaje.id}`}>
          Ayudar a
        </label>
        <select
          id={`ayudar-${personaje.id}`}
          className={fieldControlClass + " min-w-0 flex-1"}
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
          className="px-2 py-0.5 text-chrome-xs"
          disabled={destino === "" || ayudar.isPending}
          onClick={() => ayudar.mutate({ targetCharacterId: destino })}
        >
          {ayudar.isPending ? "Ayudando…" : "Ayudar"}
        </Button>
      </div>
      <p className="font-chrome text-chrome-xs text-muted">
        Su <strong>primer ataque</strong> va con ventaja, y solo ese. Caduca al empezar tu turno
        siguiente. <strong>La cercanía la juzgas tú</strong>: el enemigo tiene que estar a cinco
        pies de ti y eso el servidor no lo sabe.
      </p>
      {ayudar.isError && (
        <p role="alert" className="font-chrome text-chrome-xs text-danger-text">
          {(ayudar.error as Error).message}
        </p>
      )}
      {ayudar.isSuccess && (
        <p role="status" className="font-chrome text-chrome-xs text-accent-text">
          {/* El rótulo sale de la tabla única de condiciones: aquí no se traduce nada. */}
          Hecho: lo verá marcado como «{NOMBRE_CONDICION[CLAVE_AYUDA]}».
        </p>
      )}
    </div>
  );
}
