import { useState } from "react";
import type { Encounter } from "@dnd/shared";
import {
  useAdvanceTurn,
  useCancelEncounter,
  useEndEncounter,
  useForceStartEncounter,
  useSetInitiative,
} from "./hooks";
import type { Character } from "../characters/api";
import type { NpcEnLaMesa } from "../bestiario/api";
import { useMembers } from "../campaigns/members";
import { useRollRequests } from "../roll-requests/hooks";
import { NOMBRE_ESTADO_DE_COMBATE } from "../../dominio/combate";
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
  pnjs = [],
  esDm,
}: {
  campaignId: string;
  sessionId: string;
  encuentro: Encounter;
  personajes: Character[];
  /**
   * **Los PNJ de la mesa, que también combaten.** Un PNJ es una fila de `Character` (fase 2D),
   * pero `GET /characters` **no los lista** a propósito —esa lista es «quién se sienta a la
   * mesa»—, así que sin esta segunda lista un goblin en el orden de turnos se llamaba
   * **«Alguien»**, y se lo llamaba también al DM que acababa de sacarlo. Lo encontró un paseo de
   * uso sobre la campaña de demostración, no una prueba.
   *
   * Viene ya filtrada por el servidor: un PNJ que el jugador no puede ver no llega aquí, y por
   * eso sigue siendo «Alguien» para él — que es lo correcto.
   */
  pnjs?: NpcEnLaMesa[];
  esDm: boolean;
}) {
  const pasarTurno = useAdvanceTurn(campaignId, sessionId);
  const terminar = useEndEncounter(campaignId, sessionId);
  const [terminando, setTerminando] = useState(false);
  const [corrigiendo, setCorrigiendo] = useState<string | null>(null);

  const nombreDe = (characterId: string) =>
    personajes.find((c) => c.id === characterId)?.name ??
    pnjs.find((p) => p.id === characterId)?.name ??
    "Alguien";

  // **Los combatientes que comparten posición actúan a la vez** (el SRD manda una sola tirada
  // para un grupo de criaturas idénticas, y el servidor los agrupa por `statblockRef`). Se
  // agrupan aquí para que la tira enseñe TURNOS, no filas: seis goblins son un turno, no seis.
  const porPosicion = new Map<number, Encounter["combatants"]>();
  for (const c of encuentro.combatants) {
    porPosicion.set(c.position, [...(porPosicion.get(c.position) ?? []), c]);
  }
  const turnos = [...porPosicion.entries()].sort((a, b) => a[0] - b[0]);

  // **Mientras se prepara, no hay orden que pintar.** El encuentro nace `PREPARING` en cuanto
  // alguien que no es el DM combate (tarea 2): sus combatientes ya existen, con posición 0 y una
  // iniciativa de relleno hasta que respondan, así que pintar la tira de arriba sobre un
  // encuentro así habría enseñado un orden que todavía no es el orden — el SRD dice que se fija
  // una vez, y aquí ni siquiera se ha fijado. La sala de espera es lo que se ve en su lugar, y se
  // va sola en cuanto el servidor pasa el encuentro a `ACTIVE` (el siguiente sondeo, o el mismo
  // aviso del canal en vivo que ya invalida esta consulta).
  if (encuentro.status === "PREPARING") {
    return (
      <SalaDeEspera
        campaignId={campaignId}
        sessionId={sessionId}
        encuentro={encuentro}
        personajes={personajes}
        pnjs={pnjs}
        esDm={esDm}
      />
    );
  }

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
            {/* **Con la cifra**, que es lo que faltaba: sin ella salía «queda con sus asalto»,
                que en castellano no es una frase, y la rama singular/plural no servía de nada. */}
            El orden de turnos desaparece de la mesa. El encuentro no se borra: queda con sus{" "}
            {encuentro.round} {encuentro.round === 1 ? "asalto" : "asaltos"} y su rastro en el
            registro.
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
 * Tarea 8 (2026-09-05, iniciativa y bando) — **la sala de espera**: lo que se ve en vez del
 * orden de turnos mientras el encuentro está `PREPARING`. Nace con esta forma porque alguien que
 * no es el DM combate (tarea 2), y el DM no puede fingir que ya hay un orden: lo único que
 * cambia entre esto y la tira de arriba es que aquí no hay nada que pasar, solo alguien a quien
 * esperar.
 *
 * **La cuenta exacta y los nombres solo son honestos para el DM.** `RollRequestsService.list`
 * recorta lo que ve un jugador a sus propios personajes —la misma regla que ya cumple
 * `useRollRequests` en `TiradasPendientes.tsx`—, así que un jugador nunca recibe la lista
 * completa de quién falta: solo sabe si a ÉL le falta algo. Pintarle un «2 de 4» con esos datos
 * sería inventar una cifra que el servidor no le ha dado, y ese es justo el fallo que este
 * proyecto no se permite (docs/04-convenciones.md: «si el texto explica una regla del servidor y
 * discrepan, miente el texto»). Por eso el desglose fino va solo con `esDm`, y quien no lo es
 * recibe una frase sobre su propio estado, que es lo único que puede saber de verdad.
 *
 * **Confirmado por el autor en la ronda de arreglo 1 (2026-09-06): no se toca.** Ensanchar
 * `RollRequestsService.list` para que un jugador vea también las peticiones ajenas sería
 * ensanchar lo que el servidor entrega solo para pintar un contador bonito, y `canView` es el
 * dueño único de quién ve qué en este proyecto — no una regla de visibilidad más que cada
 * pantalla negocia a su conveniencia.
 */
function SalaDeEspera({
  campaignId,
  sessionId,
  encuentro,
  personajes,
  pnjs,
  esDm,
}: {
  campaignId: string;
  sessionId: string;
  encuentro: Encounter;
  personajes: Character[];
  pnjs: NpcEnLaMesa[];
  esDm: boolean;
}) {
  const forceStart = useForceStartEncounter(campaignId, sessionId);
  const cancelar = useCancelEncounter(campaignId, sessionId);
  const [cancelando, setCancelando] = useState(false);

  // **Los dos botones son cortesía, no la puerta.** `force-start` y el `DELETE` del encuentro
  // exigen DM en el servidor (`EncountersController`, tarea 4): esconderlos aquí solo evita
  // prometerle a un jugador un botón que el servidor va a rechazar, exactamente como ya comenta
  // `EmpezarCombate` para el botón de empezar.
  const miembros = useMembers(campaignId).data ?? [];
  // **Su propio sondeo de 15 s** (`SONDEO_DE_PETICIONES_MS`, `lib/sondeo.ts`) y el mismo canal en
  // vivo que ya invalida `["campaigns", campaignId, …]` — no se toca ninguno de los dos. Lo que
  // SÍ falta: la clave de esta consulta (`currentEncounterKey`, `hooks.ts`) empieza en
  // `["encounters", …]`, no en `["campaigns", …]`, así que el mismo aviso NO reabastece por sí
  // solo el contador de arriba — solo el sondeo de 10 s de `useCurrentEncounter` lo hace. Queda
  // dicho en el informe de esta tarea; no lo arregla esta ronda.
  const peticiones = useRollRequests(campaignId, { includeResolved: false }).data ?? [];

  const pendientes = peticiones.filter(
    (p) => p.encounterId === encuentro.id && p.key === "initiative",
  );
  const total = encuentro.combatants.length;
  const respondido = total - pendientes.length;

  /** El personaje detrás de la petición, y si se pudo nombrar a SU JUGADOR o solo al personaje. */
  const quienEs = (characterId: string): { nombre: string; esJugador: boolean } => {
    const personaje = personajes.find((c) => c.id === characterId);
    if (personaje) {
      // **Cruzando con los miembros de la campaña**, que la mesa ya carga (`ColumnaElenco`
      // consulta la misma clave): el combatiente solo trae `characterId`, nunca el jugador.
      const miembro = miembros.find((m) => m.userId === personaje.ownerId);
      if (miembro) return { nombre: miembro.displayName, esJugador: true };
      // Personaje sin miembro localizado (la lista aún no cargó, o su dueño ya no está en la
      // campaña): se nombra al personaje y se dice que no es lo mismo, en vez de fingir.
      return { nombre: personaje.name, esJugador: false };
    }
    // **Un PNJ cedido no sale en `personajes`** (`GET /characters` filtra `statblockRef: null`)
    // y `NpcEnLaMesa` no trae `ownerId`: no hay ningún dato del que sacar a su jugador. Se nombra
    // al PNJ y se dice lo que es, en vez de adivinar.
    const pnj = pnjs.find((p) => p.id === characterId);
    return { nombre: pnj?.name ?? "alguien", esJugador: false };
  };

  const textoDeEspera = pendientes
    .map((p) => {
      const { nombre, esJugador } = quienEs(p.characterId);
      return esJugador ? nombre : `${nombre} (no se sabe qué jugador lo lleva)`;
    })
    .join(" y ");

  return (
    <section
      aria-label={NOMBRE_ESTADO_DE_COMBATE.PREPARING}
      className="rounded-radius-md border border-warning/40 bg-surface px-s3 py-s2"
    >
      <div className="mb-s2 flex flex-wrap items-center gap-s2">
        <span className="font-title text-chrome-sm uppercase tracking-widest text-warning-text">
          {NOMBRE_ESTADO_DE_COMBATE.PREPARING}
        </span>
        {esDm && (
          <span className="font-data text-chrome-xs tabular-nums text-muted">
            {`${respondido} de ${total}`}
          </span>
        )}
        <span className="h-px flex-1 bg-warning/30" />
        {esDm && (
          <>
            <Button
              type="button"
              variant="ghost"
              className="px-2 py-0.5 text-chrome-xs"
              disabled={forceStart.isPending}
              onClick={() => forceStart.mutate(encuentro.id)}
            >
              Empezar igualmente
            </Button>
            <Button
              type="button"
              variant="danger"
              className="px-2 py-0.5 text-chrome-xs"
              onClick={() => setCancelando(true)}
            >
              Cancelar
            </Button>
          </>
        )}
      </div>

      {esDm ? (
        <p className="font-chrome text-chrome-xs text-muted">
          {pendientes.length > 0
            ? `Esperando a ${textoDeEspera}.`
            : "Todos han tirado su iniciativa. Puedes empezar cuando quieras."}
        </p>
      ) : (
        <p className="font-chrome text-chrome-xs text-muted">
          {pendientes.length > 0
            ? "Todavía te falta tirar tu iniciativa."
            : "Ya has tirado. Esperando a que responda el resto de la mesa."}
        </p>
      )}

      {forceStart.isError && (
        <p role="alert" className="mt-s2 font-chrome text-chrome-xs text-danger-text">
          No se ha podido empezar el combate: {(forceStart.error as Error).message}
        </p>
      )}
      {cancelar.isError && (
        <p role="alert" className="mt-s2 font-chrome text-chrome-xs text-danger-text">
          No se ha podido cancelar el combate: {(cancelar.error as Error).message}
        </p>
      )}

      {cancelando && (
        <Dialog open onClose={() => setCancelando(false)} title="Cancelar el combate">
          {/* **La consecuencia, no un «¿seguro?».** Cancelar BORRA el combate y las peticiones de
              iniciativa de todos, tiradas o no, y no deja rastro en el registro —a diferencia de
              terminar un combate `ACTIVE`, que sí queda con sus asaltos—: quien pulse esto tiene
              que leerlo antes, no adivinarlo tras un «sí» reflejo. */}
          <p className="font-chrome text-chrome-sm text-text">
            Se borra el combate entero y las peticiones de iniciativa de todos —tiradas o no—. No
            llegó a jugarse ni un asalto, así que tampoco queda rastro en el registro.
          </p>
          <div className="mt-s4 flex justify-end gap-s3">
            <Button type="button" variant="ghost" onClick={() => setCancelando(false)}>
              No, seguir esperando
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={cancelar.isPending}
              onClick={() =>
                cancelar.mutate(encuentro.id, { onSuccess: () => setCancelando(false) })
              }
            >
              Cancelar el combate
            </Button>
          </div>
        </Dialog>
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
