import { useState } from "react";
import type { Encounter } from "@dnd/shared";
import { useAdvanceTurn, useEndEncounter, useSetInitiative } from "./hooks";
import type { Character } from "../characters/api";
import { Button } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";

// Tarea 2.5.6 — **el orden de turnos, como una tira sobre el elenco.**
//
// La maqueta lo tiene resuelto (`prototipo/src/features/TiraDeIniciativa.tsx`) y su comentario
// dice exactamente lo que hay que hacer: *«Estrato: PERMANENTE mientras dura el combate — una tira
// sobre los retratos. Entrar en combate es un momento (§5), no un cambio de configuración.»*
//
// Eso es lo que la distingue de una pantalla de combate: **no se navega a ella**. La mesa es la
// misma mesa, con el elenco y el registro donde estaban, y encima aparece una tira. Cuando el
// combate termina, la tira se va y no queda nada que cerrar. Es también por lo que el reseño la
// había aplazado —«si se construye ahora se construye dos veces»— y por lo que ya no hay motivo:
// la mesa nueva existe, así que la capa se apoya en ella en vez de duplicarla.
//
// El spec de 2.5.6 pide «lo mínimo que una mesa toca cien veces por sesión»: **el orden con su
// turno actual marcado, pasar turno, y por cada combatiente sus PG y sus condiciones**. Los dos
// últimos ya los pinta el elenco, que sigue debajo — repetirlos aquí sería una segunda ficha de
// personaje con su segunda regla de visibilidad. Aquí va el ORDEN.

export function TiraDeIniciativa({
  campaignId,
  sessionId,
  encuentro,
  personajes,
  esDm,
}: {
  campaignId: string;
  sessionId: string;
  encuentro: Encounter;
  personajes: Character[];
  esDm: boolean;
}) {
  const pasarTurno = useAdvanceTurn(campaignId, sessionId);
  const terminar = useEndEncounter(campaignId, sessionId);
  const [terminando, setTerminando] = useState(false);
  const [corrigiendo, setCorrigiendo] = useState<string | null>(null);

  const nombreDe = (characterId: string) =>
    personajes.find((c) => c.id === characterId)?.name ?? "Alguien";

  // **Los combatientes que comparten posición actúan a la vez** (el SRD manda una sola tirada
  // para un grupo de criaturas idénticas, y el servidor los agrupa por `statblockRef`). Se
  // agrupan aquí para que la tira enseñe TURNOS, no filas: seis goblins son un turno, no seis.
  const porPosicion = new Map<number, Encounter["combatants"]>();
  for (const c of encuentro.combatants) {
    porPosicion.set(c.position, [...(porPosicion.get(c.position) ?? []), c]);
  }
  const turnos = [...porPosicion.entries()].sort((a, b) => a[0] - b[0]);

  return (
    <section
      aria-label="Orden de turnos"
      className="rounded-radius-md border border-warning/40 bg-surface px-s3 py-s2"
    >
      <div className="mb-s2 flex flex-wrap items-center gap-s2">
        <span className="font-title text-chrome-sm uppercase tracking-widest text-warning-text">
          Orden de turnos
        </span>
        <span className="font-data text-chrome-xs text-muted">Asalto {encuentro.round}</span>
        <span className="h-px flex-1 bg-warning/30" />
        {esDm && (
          <>
            <Button
              type="button"
              variant="ghost"
              className="px-2 py-0.5 text-chrome-xs"
              disabled={pasarTurno.isPending}
              onClick={() => pasarTurno.mutate(encuentro.id)}
            >
              Pasar turno
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="px-2 py-0.5 text-chrome-xs"
              onClick={() => setTerminando(true)}
            >
              Terminar el combate
            </Button>
          </>
        )}
      </div>

      <ol className="scroll-quiet flex items-center gap-s1 overflow-x-auto">
        {turnos.map(([posicion, grupo]) => {
          const actual = posicion === encuentro.activePosition;
          const nombres = grupo.map((c) => nombreDe(c.characterId)).join(" · ");
          return (
            <li
              key={posicion}
              // **El turno actual no se distingue SOLO por el color.** Lleva su propio rótulo
              // («Le toca»), porque el color no puede ser el único portador de significado — la
              // misma regla que obliga a la barra de PG a llevar su cifra al lado.
              aria-current={actual ? "step" : undefined}
              className={[
                "flex shrink-0 flex-col items-center rounded-radius-sm border px-s3 py-s1",
                actual ? "border-warning bg-warning/15" : "border-muted/25",
              ].join(" ")}
            >
              <span
                className={[
                  "font-chrome text-chrome-sm",
                  actual ? "text-warning-text" : "text-text",
                ].join(" ")}
              >
                {nombres}
              </span>
              <span className="font-data text-chrome-xs tabular-nums text-muted">
                {grupo[0].initiative}
              </span>
              {actual && (
                <span className="font-chrome text-chrome-xs uppercase tracking-wide text-warning-text">
                  Le toca
                </span>
              )}
              {esDm && (
                <button
                  type="button"
                  onClick={() => setCorrigiendo(grupo[0].id)}
                  aria-label={`Corregir la iniciativa de ${nombres}`}
                  className="font-chrome text-chrome-xs text-muted underline-offset-2 hover:text-copper-text hover:underline"
                >
                  Corregir
                </button>
              )}
            </li>
          );
        })}
      </ol>

      {/* **Si pasar turno falla, se dice.** No tenerlo fue un hueco real y lo destapó el
          recorrido de navegador: la petición se caía y la tira se quedaba tan tranquila en el
          mismo asalto, así que parecía que el botón no hacía nada. Un botón que falla en silencio
          es peor que uno que no existe. */}
      {pasarTurno.isError && (
        <p role="alert" className="mt-s2 font-chrome text-chrome-xs text-danger-text">
          No se ha podido pasar el turno: {(pasarTurno.error as Error).message}
        </p>
      )}
      {terminar.isError && (
        <p role="alert" className="mt-s2 font-chrome text-chrome-xs text-danger-text">
          No se ha podido terminar el combate: {(terminar.error as Error).message}
        </p>
      )}

      {/* **El turno de un PNJ escondido llega como `null`, y eso se dice.** El servidor manda
          `activePosition: null` cuando el turno es de alguien que este espectador no puede ver:
          «ahora no te toca a ti» es verdad y no delata a nadie. Sin esta línea la tira se
          quedaría sin ningún turno marcado y parecería rota. */}
      {encuentro.activePosition === null && (
        <p className="mt-s2 font-chrome text-chrome-xs italic text-muted">
          Le toca a alguien que no ves.
        </p>
      )}

      {terminando && (
        <Dialog open onClose={() => setTerminando(false)} title="Terminar el combate">
          <p className="font-chrome text-chrome-sm text-text">
            El orden de turnos desaparece de la mesa. El encuentro no se borra: queda con sus{" "}
            {encuentro.round === 1 ? "asalto" : "asaltos"} y su rastro en el registro.
          </p>
          <div className="mt-s4 flex justify-end gap-s3">
            <Button type="button" variant="ghost" onClick={() => setTerminando(false)}>
              No, seguir
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={terminar.isPending}
              onClick={() =>
                terminar.mutate(encuentro.id, { onSuccess: () => setTerminando(false) })
              }
            >
              Terminar el combate
            </Button>
          </div>
        </Dialog>
      )}

      {corrigiendo && (
        <CorregirIniciativa
          campaignId={campaignId}
          sessionId={sessionId}
          encounterId={encuentro.id}
          combatantId={corrigiendo}
          actual={encuentro.combatants.find((c) => c.id === corrigiendo)?.initiative ?? 0}
          onClose={() => setCorrigiendo(null)}
        />
      )}
    </section>
  );
}

/**
 * El DM corrige un número tras la tirada. **El SRD deja los empates a su criterio**, y desde la
 * revisión de cierre de 2.5.2 el servidor **recoloca el orden** con el número nuevo — antes
 * cambiaba la columna y no cambiaba el juego, que es lo que hacía la promesa falsa.
 */
function CorregirIniciativa({
  campaignId,
  sessionId,
  encounterId,
  combatantId,
  actual,
  onClose,
}: {
  campaignId: string;
  sessionId: string;
  encounterId: string;
  combatantId: string;
  actual: number;
  onClose: () => void;
}) {
  const corregir = useSetInitiative(campaignId, sessionId);
  const [valor, setValor] = useState(String(actual));

  return (
    <Dialog open onClose={onClose} title="Corregir la iniciativa">
      <label className="flex items-center gap-s3 font-chrome text-chrome-sm text-text">
        Iniciativa
        <input
          type="number"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="w-24 rounded-radius-sm border border-muted bg-bg px-s2 py-s1 font-data text-chrome-sm text-text"
        />
      </label>
      <p className="mt-s2 font-chrome text-chrome-xs text-muted">
        El orden se recoloca con el número nuevo. Es la puerta para deshacer un empate, o para
        separar a un grupo que actuaba junto.
      </p>
      {corregir.isError && (
        <p role="alert" className="mt-s2 font-chrome text-chrome-xs text-danger-text">
          {(corregir.error as Error).message}
        </p>
      )}
      <div className="mt-s4 flex justify-end gap-s3">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={corregir.isPending || Number.isNaN(Number(valor))}
          onClick={() =>
            corregir.mutate(
              { encounterId, combatantId, initiative: Number(valor) },
              { onSuccess: onClose },
            )
          }
        >
          Guardar
        </Button>
      </div>
    </Dialog>
  );
}
