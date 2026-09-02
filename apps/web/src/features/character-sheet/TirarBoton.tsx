import { useState } from "react";
import { Button } from "../../ui/Button";
import { useCreateRoll } from "./hooks";

// Tarea 2A.10 — "tirar desde la hoja: una habilidad o una salvación tira 1d20+mod con su
// etiqueta". `POST /campaigns/:id/rolls` (2A.13) tira de verdad en el servidor y lo deja en el
// registro de eventos; este botón solo compone la expresión y enseña el resultado que vuelve.
//
// **Ventaja y desventaja se piden por nombre, no por sintaxis.** El botón manda `mode` y es el
// servidor quien convierte el `d20` en `2d20kh1` o `2d20kl1`: es una regla del juego, y un
// cliente que mandara la expresión ya montada podría decir «con ventaja» y tirar otra cosa.
// Sin esto, ventaja —que sale en casi todos los turnos de 5.ª edición— obligaba a salir de la
// hoja a escribir la expresión a mano.

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

  const tirar = (mode: "NORMAL" | "ADVANTAGE" | "DISADVANTAGE") =>
    crearTirada.mutate(
      // `visibility` es obligatorio en el tipo inferido aunque el esquema le da un valor
      // por defecto (`createRollSchema`, @dnd/shared): el `.default()` de Zod solo hace
      // opcional el campo de ENTRADA sin validar, no el tipo ya inferido que usa este
      // fichero. "PLAYERS" es explícito aquí por la misma razón que en el resto del
      // producto: la mesa ve lo que se tira, no solo el DM.
      { expression: expresion, label: etiqueta, characterId, visibility: "PLAYERS", mode },
      {
        onSuccess: (r) => setResultado(`${r.total} (${r.rolls.join(", ")})`),
        onError: (err) => setResultado(`Error: ${(err as Error).message}`),
      },
    );

  return (
    <span className="ml-s2 inline-flex items-center gap-s2">
      <Button
        type="button"
        variant="ghost"
        className="px-1.5 py-0.5 text-chrome-xs"
        onClick={() => tirar("NORMAL")}
        disabled={crearTirada.isPending}
        aria-label={`Tirar ${etiqueta}`}
      >
        Tirar
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="px-1.5 py-0.5 text-chrome-xs"
        onClick={() => tirar("ADVANTAGE")}
        disabled={crearTirada.isPending}
        aria-label={`Tirar ${etiqueta} con ventaja`}
        title="Con ventaja: dos d20, se queda el mejor"
      >
        Ventaja
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="px-1.5 py-0.5 text-chrome-xs"
        onClick={() => tirar("DISADVANTAGE")}
        disabled={crearTirada.isPending}
        aria-label={`Tirar ${etiqueta} con desventaja`}
        title="Con desventaja: dos d20, se queda el peor"
      >
        Desventaja
      </Button>
      {resultado && (
        <span className="font-data text-chrome-xs text-accent-text" role="status">
          {resultado}
        </span>
      )}
    </span>
  );
}
