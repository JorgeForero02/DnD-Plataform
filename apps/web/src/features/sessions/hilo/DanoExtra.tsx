import type { GameEventPayload } from "@dnd/shared";
import { Button } from "../../../ui/Button";
import { IconoAviso } from "../../../ui/Iconos";
import { useAddDamageExtra, useDamagePreview } from "../hooks";

// Task 8 de 3A.2 («elegir, lanzar y usar») — el daño extra al impactar: Ataque furtivo (pícaro)
// y Castigo divino (paladín). El jugador (dueño del atacante, o el DM en su nombre) lo marca
// sobre SU tirada de daño pendiente, antes de que el DM confirme la bandeja (D-CF-129).
//
// **Se apoya en el MISMO preview que `BandejaDeDano`** (`useDamagePreview`, deduplicado por
// React Query bajo la misma `queryKey`): el servidor responde `{ extrasDisponibles, extras }`
// al dueño del atacante —sin `resulting` ni nombre del objetivo, que siguen siendo del
// DM/dueño del objetivo— y ambos campos al DM y al dueño del objetivo. Este componente pinta lo
// que haya en cualquiera de las dos formas: los ya marcados (línea «+ Ataque furtivo 7») y los
// que todavía se pueden marcar, con el dado ya resuelto en el texto del botón.
//
// **Quién puede marcar lo decide el servidor, no esta pantalla** (ola de arreglos, web I-3):
// `extrasDisponibles` llega vacío para el dueño del OBJETIVO —que no puede marcar (403)— y solo
// trae opciones para el dueño del atacante y el DM. Así no hay que saber aquí quién mira: un
// botón que se pinta es un botón que el servidor va a aceptar.
//
// **Un botón por extra disponible, no una casilla.** El brief habla de «marcar» una casilla,
// pero una casilla sugiere un estado que se puede desmarcar — y este gesto no se puede deshacer
// (tira dados y, para Castigo divino, gasta un espacio de verdad). El mismo patrón que
// `BandejaDeDano` ya usa para «Aplicar»: un botón de un solo clic, con su propio aviso de error.
export function DanoExtra({
  campaignId,
  rollEventId,
  pendingDamage,
}: {
  campaignId: string;
  rollEventId: string;
  pendingDamage: NonNullable<Extract<GameEventPayload, { type: "ABILITY_ROLL" }>["pendingDamage"]>;
}): JSX.Element | null {
  const preview = useDamagePreview(
    campaignId,
    rollEventId,
    Boolean(pendingDamage.targetCharacterId),
  );
  const marcar = useAddDamageExtra(campaignId);

  if (!preview.data) return null;
  const extras = preview.data.extras ?? [];
  const disponibles = preview.data.extrasDisponibles ?? [];
  // Ya aplicado: nada que marcar, aunque el servidor siguiera ofreciéndolo (no debería, pero la
  // pantalla no depende de que nunca lo haga).
  const aplicado = Boolean(pendingDamage.appliedEventId);

  if (extras.length === 0 && (disponibles.length === 0 || aplicado)) return null;

  return (
    <div className="my-s1 flex flex-col gap-s1">
      {extras.map((extra) => (
        <p key={extra.key} className="font-chrome text-chrome-xs text-muted">
          {`+ ${extra.label} ${extra.amount}`}
        </p>
      ))}
      {!aplicado &&
        disponibles.map((opcion) => (
          <Button
            key={opcion.key}
            variant="secondary"
            disabled={marcar.isPending}
            onClick={() => marcar.mutate({ rollEventId, key: opcion.key })}
          >
            {`Añadir ${opcion.label}`}
          </Button>
        ))}
      {marcar.isError && (
        <p role="alert" className="font-chrome text-chrome-xs text-danger-text">
          <IconoAviso className="mr-1 inline h-3.5 w-3.5" />
          {(marcar.error as Error).message}
        </p>
      )}
    </div>
  );
}
