import { useState } from "react";
import type { PendingChoiceDto } from "./api";
import { useUpdateSheet } from "./hooks";
import { Button } from "../../ui/Button";
import { describirEleccionPendiente, nombreOpcionDeEleccion } from "./vocabulario";
import { CAJA_DE_VITELA, RotuloDeSeccion } from "./Vitela";

// Tarea 2A.10 — "las elecciones pendientes como lista de tareas, no como error". Cada elección
// sin resolver (2A.4) se resuelve aquí mismo, en la pantalla de lectura: marcar las opciones y
// guardar hace un PATCH de la hoja con `choices[grantId]` completado. No es la ficha estructural
// (raza/clase/nivel), así que no hace falta el editor modal para esto.

function FilaEleccion({
  campaignId,
  characterId,
  choice,
  choicesActuales,
}: {
  campaignId: string;
  characterId: string;
  choice: PendingChoiceDto;
  choicesActuales: Record<string, string[]>;
}) {
  const [elegidas, setElegidas] = useState<string[]>([]);
  const actualizar = useUpdateSheet(campaignId, characterId);

  const alternar = (opcion: string) => {
    setElegidas((prev) => {
      if (prev.includes(opcion)) return prev.filter((o) => o !== opcion);
      if (prev.length >= choice.choose) return prev;
      return [...prev, opcion];
    });
  };

  const guardar = () => {
    actualizar.mutate({
      choices: { ...choicesActuales, [choice.grantId]: elegidas },
    });
  };

  const completa = elegidas.length === choice.choose;

  return (
    <li className={CAJA_DE_VITELA}>
      <p className="font-world text-world-base leading-relaxed text-text">
        {describirEleccionPendiente(choice)}
      </p>
      <fieldset className="mt-s2 flex flex-wrap gap-s2">
        <legend className="sr-only">Opciones para {describirEleccionPendiente(choice)}</legend>
        {choice.from
          .filter((opcion) => !choice.excluding?.includes(opcion))
          .map((opcion) => {
            const marcada = elegidas.includes(opcion);
            return (
              <label
                key={opcion}
                className={[
                  "cursor-pointer rounded-radius-sm border px-s2 py-0.5 font-chrome text-chrome-xs",
                  marcada
                    ? "border-accent bg-accent/15 text-accent-text"
                    : "border-muted/60 text-muted",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={marcada}
                  onChange={() => alternar(opcion)}
                />
                {nombreOpcionDeEleccion(choice.kind, opcion)}
              </label>
            );
          })}
      </fieldset>
      <div className="mt-s2 flex items-center gap-s2">
        <Button
          type="button"
          variant="primary"
          onClick={guardar}
          disabled={!completa || actualizar.isPending}
        >
          Guardar elección
        </Button>
        <span className="font-data text-chrome-xs text-muted">
          {elegidas.length}/{choice.choose}
        </span>
      </div>
      {actualizar.isError && (
        <p role="alert" className="mt-1 font-chrome text-chrome-xs text-danger-text">
          {(actualizar.error as Error).message}
        </p>
      )}
    </li>
  );
}

export function EleccionesPendientes({
  campaignId,
  characterId,
  pendingChoices,
  choicesActuales,
}: {
  campaignId: string;
  characterId: string;
  pendingChoices: PendingChoiceDto[];
  choicesActuales: Record<string, string[]>;
}) {
  if (pendingChoices.length === 0) return null;
  return (
    <section aria-label="elecciones pendientes">
      <RotuloDeSeccion>Elecciones por hacer ({pendingChoices.length})</RotuloDeSeccion>
      <ul className="flex flex-col gap-s2">
        {pendingChoices.map((choice) => (
          <FilaEleccion
            key={choice.grantId}
            campaignId={campaignId}
            characterId={characterId}
            choice={choice}
            choicesActuales={choicesActuales}
          />
        ))}
      </ul>
    </section>
  );
}
