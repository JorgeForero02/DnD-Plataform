import { useState } from "react";
import { Button } from "../../ui/Button";
import { useCreateRoll } from "./hooks";

// Tarea 2A.10 — "tirar desde la hoja: una habilidad o una salvación tira 1d20+mod con su
// etiqueta". `POST /campaigns/:id/rolls` (2A.13) tira de verdad en el servidor y lo deja en el
// registro de eventos; este botón solo compone la expresión y enseña el resultado que vuelve.

export function TirarBoton({
  campaignId,
  characterId,
  etiqueta,
  modificador,
}: {
  campaignId: string;
  characterId: string;
  etiqueta: string;
  modificador: number;
}) {
  const crearTirada = useCreateRoll(campaignId);
  const [resultado, setResultado] = useState<string | null>(null);

  const expresion = `1d20${modificador >= 0 ? "+" : ""}${modificador}`;

  return (
    <span className="ml-s2 inline-flex items-center gap-s2">
      <Button
        type="button"
        variant="ghost"
        className="px-1.5 py-0.5 text-chrome-xs"
        onClick={() =>
          crearTirada.mutate(
            // `visibility` es obligatorio en el tipo inferido aunque el esquema le da un valor
            // por defecto (`createRollSchema`, @dnd/shared): el `.default()` de Zod solo hace
            // opcional el campo de ENTRADA sin validar, no el tipo ya inferido que usa este
            // fichero. "PLAYERS" es explícito aquí por la misma razón que en el resto del
            // producto: la mesa ve lo que se tira, no solo el DM.
            { expression: expresion, label: etiqueta, characterId, visibility: "PLAYERS" },
            {
              onSuccess: (r) => setResultado(`${r.total} (${r.rolls.join(", ")})`),
              onError: (err) => setResultado(`Error: ${(err as Error).message}`),
            },
          )
        }
        disabled={crearTirada.isPending}
        aria-label={`Tirar ${etiqueta}`}
      >
        Tirar
      </Button>
      {resultado && (
        <span className="font-data text-chrome-xs text-accent-text" role="status">
          {resultado}
        </span>
      )}
    </span>
  );
}
