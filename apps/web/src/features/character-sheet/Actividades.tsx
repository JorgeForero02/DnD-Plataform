import type { CharacterSheetActivity } from "@dnd/shared";
import { useResources, useUsarActividad } from "./hooks";
import { Button } from "../../ui/Button";

// Paso 2, tarea A11 — **el botón de usar una actividad.**
//
// Hasta esta tarea el catálogo sabía CONCEDER una actividad completa (A9/A10: la Furia, con sus
// usos ya resueltos al nivel de este personaje) y el servidor sabía USARLA
// (`ActivitiesController.usar`, tarea A7) — y no había ninguna pantalla entre las dos. Un
// jugador no tenía manera de pulsar «Furia»: el botón más cercano, «Recursos y descansos», solo
// sabe restar una unidad de un contador — no gasta la acción adicional, ni deja el estado que
// avisa a la mesa de que el bárbaro está en furia.
//
// **Por qué esto y «Recursos y descansos» no son el mismo control.** `RecursosYDescansos.tsx`
// enseña la fila `CharacterResource` de "rage" igual que cualquier otra —porque lo es, la misma
// tabla— pero restar ahí a mano es exactamente el estado a medias que la actividad, en una sola
// petición, evita: gasta el recurso, marca la economía del turno si hay combate y aplica la
// condición, las tres o ninguna (`ActivitiesService.usar`, transacción única). Esta pantalla es
// la puerta de esa petición; la otra sigue sirviendo para ajustar el contador a mano cuando hace
// falta (el DM regalando un uso extra, por ejemplo).

export function Actividades({
  campaignId,
  characterId,
  activities,
  puedeEditar,
}: {
  campaignId: string;
  characterId: string;
  activities: CharacterSheetActivity[];
  /** Dueño o DM. Igual que el resto de controles que escriben sobre este personaje. */
  puedeEditar: boolean;
}) {
  const { data: recursos } = useResources(campaignId, characterId);
  const usar = useUsarActividad(campaignId, characterId);

  if (activities.length === 0) {
    return (
      <p className="font-chrome text-chrome-xs text-muted">
        Este personaje no tiene ninguna actividad concedida por su clase.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-s2">
      {activities.map((actividad) => {
        const recurso = recursos?.find((r) => r.key === actividad.key);
        // **Se avisa, y el botón sigue vivo** — misma doctrina que la economía del turno (A2) y
        // que `EconomiaDeAccion` (A3): el servidor de `usar()` nunca rechaza por falta de usos,
        // solo lo cuenta en `aviso` (`ActivitiesService.consumir`). Sin fila que gastar es la
        // única causa que sí merece decirse ANTES de pulsar, porque delata una ficha a medias
        // (`seedResourcesFor` no llegó a sembrarla) y no una falta de usos corriente.
        const sinFila = actividad.usos !== undefined && recurso === undefined;

        return (
          <li
            key={actividad.key}
            className="flex flex-wrap items-center gap-s3 rounded-radius-sm border border-muted/40 bg-surface px-s3 py-s2"
          >
            <span className="font-chrome text-chrome-sm text-text">{actividad.name}</span>
            {recurso && (
              <span className="font-data text-chrome-xs tabular-nums text-muted">
                {/* **Nunca el marcador crudo** (importante I3): `current` de un recurso sin tope
                    lleva `MARCADOR_DE_USOS_SIN_TOPE` (`resources.service.ts`) — un millón, para
                    que la columna `Int` tenga algo que guardar — y ese número no es una cifra del
                    SRD ni algo que un bárbaro de nivel 20 tenga que leer. Lo que de verdad importa
                    para pintar es `max`: `null` es «sin tope», con independencia de qué número
                    finito lleve `current` por dentro. */}
                {recurso.max === null
                  ? "usos ilimitados"
                  : `${recurso.current} / ${recurso.max} usos`}
              </span>
            )}
            <span className="flex-1" />
            {puedeEditar && (
              <Button
                type="button"
                variant="primary"
                disabled={usar.isPending}
                onClick={() => usar.mutate({ activityKey: actividad.key })}
              >
                Usar {actividad.name}
              </Button>
            )}
            {/* **Importante I2.** `description` existe y cumple la regla de interfaz —dice qué
                hace el servidor y qué no, sin prometer de más (`classes.ts`, `FURIA.description`)—
                pero hasta esta ronda de arreglo nadie la pintaba: el jugador podía pulsar «Usar
                Furia» sin haber leído una sola palabra de lo que hace o deja de hacer. Va ANTES
                del botón, no después, porque es la información que decide si se pulsa. */}
            {actividad.description && (
              <p className="w-full font-chrome text-chrome-xs text-muted">
                {actividad.description}
              </p>
            )}
            {sinFila && (
              <p role="alert" className="w-full font-chrome text-chrome-xs text-danger-text">
                No tiene ningún uso sembrado — hay que rehacer su ficha o avisar al DM.
              </p>
            )}
            {usar.isError && (
              <p role="alert" className="w-full font-chrome text-chrome-xs text-danger-text">
                No se ha podido usar: {(usar.error as Error).message}
              </p>
            )}
            {usar.isSuccess && usar.data.aviso && usar.variables?.activityKey === actividad.key && (
              <p className="w-full font-chrome text-chrome-xs text-warning-text">
                {usar.data.aviso}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
