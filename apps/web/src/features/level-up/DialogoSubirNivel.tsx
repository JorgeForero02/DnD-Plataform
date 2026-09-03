import { DiffNivel } from "./DiffNivel";
import { useApplyLevelUp, useLevelUpPreview, useRollHitPoints } from "./hooks";
import { Button } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";

// Tarea 2A.11 — el servidor propone un diff y el jugador lo confirma. Esta pantalla es esas dos
// frases y nada más: pide `GET .../level-up/preview`, enseña lo que responde, y solo cuando hay
// un clic manda `POST .../level-up`.

/**
 * **Por qué la tirada no es una opción de la confirmación, y por qué no son dos radios.**
 *
 * La regla de interfaz dice que una opción con significado va como radios visibles, cada una
 * con su frase. Aquí no se aplica, y el motivo no es de estilo: **no hay dos opciones que
 * confirmar**. `POST .../level-up` no acepta `roll` — el servidor lo escribe sin rodeos en
 * `apps/api/src/level-up/level-up.service.ts` (`apply`): como los PG máximos no son una
 * columna, sino algo que se recalcula desde el nivel cada vez que se lee la hoja, un número
 * tirado **no tiene dónde vivir después de aplicarse**. Confirmar aplica siempre la media fija.
 *
 * Dos radios «media / tirada» dirían que la elección cambia lo que se guarda, y sería mentira.
 * La otra regla del reseño manda sobre esa: si el texto y el servidor discrepan, el que miente
 * es el texto. Así que la tirada se ofrece como lo que de verdad es —una tirada de mesa, que
 * queda en el registro de la campaña para que nadie pueda repetirla hasta que salga un número
 * bonito— con esa consecuencia escrita al lado.
 */
const VERDAD_SOBRE_LA_TIRADA =
  "Tirar el dado deja la tirada en el registro de la campaña, pero no cambia lo que se " +
  "aplica: al confirmar, el servidor suma siempre la media fija. Los puntos de golpe máximos " +
  "no se guardan — se recalculan desde el nivel cada vez que se abre la hoja —, así que un " +
  "número tirado no tendría dónde quedarse.";

export function DialogoSubirNivel({
  campaignId,
  characterId,
  abierto,
  onClose,
}: {
  campaignId: string;
  characterId: string;
  abierto: boolean;
  onClose: () => void;
}) {
  const consulta = useLevelUpPreview(campaignId, characterId, abierto);
  const tirada = useRollHitPoints(campaignId, characterId);
  const aplicar = useApplyLevelUp(campaignId, characterId);

  // La tirada devuelve el mismo previo con `hp.method === "ROLL"`; mientras esté, es la versión
  // que se enseña. No sustituye a la consulta en la caché: es una respuesta aparte, con su
  // propio ciclo de vida, y cerrar el diálogo la olvida.
  const previo = tirada.data ?? consulta.data;

  const error = aplicar.error ?? tirada.error ?? consulta.error;

  const cerrar = () => {
    tirada.reset();
    aplicar.reset();
    onClose();
  };

  const confirmar = () => {
    aplicar.mutate(undefined, { onSuccess: cerrar });
  };

  return (
    <Dialog open={abierto} onClose={cerrar} title="Subir de nivel" size="lg">
      <div className="space-y-s4">
        {consulta.isLoading && (
          <p className="font-chrome text-chrome-sm text-muted">Pidiendo el diff al servidor…</p>
        )}

        {previo && <DiffNivel previo={previo} />}

        {error && (
          // El mensaje es el del servidor, tal cual lo devolvió (`lib/api.ts` lo extrae del
          // cuerpo): 400 si falta raza, clase o características; 403 si no eres el dueño ni el
          // DM. Inventar aquí una frase más amable escondería cuál de los dos fue.
          <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
            {(error as Error).message}
          </p>
        )}

        <section
          aria-label="tirar los puntos de golpe"
          className="rounded-radius-sm border border-muted p-s3"
        >
          <p className="font-chrome text-chrome-xs text-muted">{VERDAD_SOBRE_LA_TIRADA}</p>
          <Button
            type="button"
            variant="secondary"
            className="mt-s2"
            onClick={() => tirada.mutate()}
            disabled={!previo || tirada.isPending}
          >
            Tirar el dado de golpe
          </Button>
        </section>

        <div className="flex flex-wrap items-center gap-s2">
          <Button
            type="button"
            variant="primary"
            onClick={confirmar}
            disabled={!previo || aplicar.isPending}
          >
            Confirmar subida de nivel
          </Button>
          <Button type="button" variant="ghost" onClick={cerrar}>
            Cancelar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
