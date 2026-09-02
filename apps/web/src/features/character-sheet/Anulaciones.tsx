import { useState } from "react";
import { OVERRIDABLE_KEYS } from "@dnd/shared";
import { useClearOverride, useSetOverride } from "./hooks";
import { useMyRole } from "../campaigns/members";
import { Button } from "../../ui/Button";
import { fieldControlClass } from "../../ui/Field";
import { NOMBRE_ANULABLE } from "./vocabulario";

// Anulaciones manuales del DM sobre valores derivados.
//
// **Es la válvula de escape de «se guarda lo decidido, se calcula lo derivado».** El catálogo
// del SRD no lo cubre todo —un objeto mágico, un don, una regla de la casa, un PNJ con la CA que
// el DM decide y punto— y sin esto la única salida era mentirle a la ficha: subir una
// característica hasta que cuadrara el número. El valor anulado sale en la traza con su delta,
// así que sigue siendo explicable.
//
// **Solo el DM**, y el servidor lo impone (`character-sheet.service.ts`). Aquí no se pinta
// siquiera mientras el papel no esté resuelto: enseñar un control que va a dar 403 es peor que
// no enseñarlo, y esconderlo no es control de acceso — el control está en el servidor.

export function Anulaciones({
  campaignId,
  characterId,
  overrides,
}: {
  campaignId: string;
  characterId: string;
  overrides: Record<string, number> | null;
}) {
  const { role, isLoading } = useMyRole(campaignId);
  const fijar = useSetOverride(campaignId, characterId);
  const quitar = useClearOverride(campaignId, characterId);
  const [clave, setClave] = useState<string>(OVERRIDABLE_KEYS[0]);
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (isLoading || role !== "DM") return null;

  const puestas = Object.entries(overrides ?? {});

  const onFijar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await fijar.mutateAsync({
        target: clave,
        value: Number(valor),
        reason: motivo.trim() || undefined,
      });
      setValor("");
      setMotivo("");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <section aria-label="anulaciones del DM" className="flex flex-col gap-s2">
      <p className="font-chrome text-chrome-sm font-semibold text-text">Anulaciones del DM</p>
      <p className="font-chrome text-chrome-xs text-muted">
        Fija un valor derivado a mano cuando el catálogo no lo cubra. Queda en el registro de la
        partida con el valor anterior al lado, y se ve en la traza del valor anulado.
      </p>

      {puestas.length === 0 ? (
        <p className="font-chrome text-chrome-sm text-muted">Ninguna anulación puesta.</p>
      ) : (
        <ul className="flex flex-wrap gap-s2">
          {puestas.map(([k, v]) => (
            <li
              key={k}
              className="flex items-center gap-s2 rounded-radius-sm border border-copper px-s2 py-1 font-chrome text-chrome-xs text-copper-text"
            >
              <span>
                {NOMBRE_ANULABLE[k] ?? `Sin traducir: ${k}`}: {v}
              </span>
              <button
                type="button"
                aria-label={`Quitar la anulación de ${NOMBRE_ANULABLE[k] ?? k}`}
                onClick={() => void quitar.mutateAsync(k).catch((e) => setError(e.message))}
                className="underline"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onFijar} className="flex flex-wrap items-end gap-s2">
        <label className="font-chrome text-chrome-xs text-muted">
          Valor a anular
          <select
            aria-label="Valor a anular"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            className={fieldControlClass}
          >
            {OVERRIDABLE_KEYS.map((k) => (
              <option key={k} value={k}>
                {NOMBRE_ANULABLE[k] ?? k}
              </option>
            ))}
          </select>
        </label>
        <label className="font-chrome text-chrome-xs text-muted">
          Nuevo valor
          <input
            aria-label="Nuevo valor"
            type="number"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className={fieldControlClass}
          />
        </label>
        <label className="font-chrome text-chrome-xs text-muted">
          Motivo (opcional)
          <input
            aria-label="Motivo de la anulación"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className={fieldControlClass}
          />
        </label>
        <Button type="submit" disabled={valor === "" || fijar.isPending}>
          Anular
        </Button>
      </form>

      {error && (
        <p role="alert" className="font-chrome text-chrome-xs text-danger-text">
          {error}
        </p>
      )}
    </section>
  );
}
