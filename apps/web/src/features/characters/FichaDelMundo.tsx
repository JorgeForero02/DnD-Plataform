import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../ui/Button";
import { TarjetaDeHoja } from "../character-sheet/Tarjeta";
import { useEntity } from "../entities/hooks";
import { SelectorDeFichaDelMundo } from "../entities/SelectorDeFichaDelMundo";
import { useUpdateCharacter } from "./hooks";
import type { Character } from "./api";

// PNJ del mundo y la mesa (spec §3.1) — **la hoja enlaza con la ficha del mundo**.
//
// Solo el DM elige o cambia el enlace (`entityId` solo lo manda el DM, 403 al dueño —
// `character.schema.ts`); un jugador con un cuerpo enlazado solo ve la lectura, con el enlace a
// la ficha si puede verla — **si no puede, el servidor ya la redactó a `null` antes de llegar
// aquí** (E-PM-10), así que esta pantalla no vuelve a comprobar visibilidad, solo pinta lo que
// llega.
//
// Elegir un radio del selector **es** la acción entera (mismo patrón que `AjustesDePersonaje`):
// se guarda solo, y un rechazo del servidor se explica en línea sin perder lo que ya había.
export function FichaDelMundo({
  campaignId,
  character,
  esDm,
}: {
  campaignId: string;
  character: Character;
  esDm: boolean;
}) {
  const actualizar = useUpdateCharacter(campaignId);
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entityId = character.entityId ?? null;
  // Solo se pide si hay algo que pedir: la creación de un personaje sin enlace no tiene nada
  // que resolver.
  const entidad = useEntity(campaignId, "NPC", entityId ?? undefined, entityId !== null);

  // Un jugador sin enlace no tiene nada que leer aquí: ni tarjeta, ni «Sin ficha del mundo»,
  // que sería un rótulo pensado para el DM («enlázala») sobre alguien que no puede hacerlo.
  if (!esDm && entityId === null) return null;

  const onElegir = async (next: string | null) => {
    setError(null);
    try {
      await actualizar.mutateAsync({ characterId: character.id, input: { entityId: next } });
      setEditando(false);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onQuitar = async () => {
    setError(null);
    try {
      await actualizar.mutateAsync({ characterId: character.id, input: { entityId: null } });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <TarjetaDeHoja titulo="Ficha del mundo" etiqueta="ficha del mundo">
      <div className="space-y-s3">
        {entityId ? (
          <p className="font-chrome text-chrome-sm text-text">
            Es{" "}
            <Link
              to={`/campaigns/${campaignId}/entidades/${entityId}`}
              className="font-semibold text-accent-text underline-offset-2 hover:underline"
            >
              {entidad.data?.name ?? "…"}
            </Link>
          </p>
        ) : (
          <p className="font-chrome text-chrome-sm text-muted">Sin ficha del mundo</p>
        )}

        {esDm && !editando && (
          <div className="flex flex-wrap gap-s2">
            {entityId ? (
              <>
                <Button type="button" variant="secondary" onClick={() => setEditando(true)}>
                  Cambiar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={actualizar.isPending}
                  onClick={() => void onQuitar()}
                >
                  Quitar
                </Button>
              </>
            ) : (
              <Button type="button" variant="secondary" onClick={() => setEditando(true)}>
                Enlazar
              </Button>
            )}
          </div>
        )}

        {esDm && editando && (
          <div className="space-y-s2">
            <SelectorDeFichaDelMundo
              campaignId={campaignId}
              value={entityId}
              onChange={(next) => void onElegir(next)}
            />
            <Button type="button" variant="ghost" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
          </div>
        )}

        {error && (
          <p role="alert" className="font-chrome text-chrome-xs text-danger-text">
            {error}
          </p>
        )}
      </div>
    </TarjetaDeHoja>
  );
}
