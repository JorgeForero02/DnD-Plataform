import { useState } from "react";
import type { ReactNode } from "react";
import type { Encounter, XpPropuesto } from "@dnd/shared";
import {
  useAdvanceTurn,
  useCancelEncounter,
  useEndEncounter,
  useForceStartEncounter,
  useGastar,
  useSetInitiative,
} from "./hooks";
import { EconomiaDeAccion } from "./EconomiaDeAccion";
import type { Character } from "../characters/api";
import type { NpcEnLaMesa } from "../bestiario/api";
import { useMembers } from "../campaigns/members";
import { useRollRequests } from "../roll-requests/hooks";
import { useCharacterSheet } from "../character-sheet/hooks";
import { NOMBRE_ESTADO_DE_COMBATE } from "../../dominio/combate";
import { useAuthStore } from "../../store/auth.store";
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
  onXpPropuesto,
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
  /**
   * Puerta de efectos §5 bis (E-PE-9) — lo que `EncountersService.end()` propone en modo XP al
   * terminar el combate. **La tira no se lo queda**: en cuanto el encuentro termina, el servidor
   * devuelve `null` en `current` y `CapaDeCombate` desmonta esta tira con todo su estado, así
   * que guardarlo aquí era pintarlo un instante y perderlo (ola de arreglos 1). Se entrega al
   * padre, que sigue montado cuando el combate ya no existe.
   */
  onXpPropuesto?: (propuesta: XpPropuesto) => void;
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

      {/* **El sistema propone; el DM decide** (ficha P2, 2026-09-07).
          Doctrina impresa de las Herramientas del DM: «Nada llega a la mesa hasta que lo
          confirmas». Y el SRD 5.1 lo respalda hasta para el monstruo — «Monsters and Death»:
          *«Most DMs have a monster die the instant it drops to 0 hit points»*, o sea costumbre del
          DM, con los villanos como excepción explícita. Un enemigo a 0 puede estar inconsciente,
          los enemigos huyen, y un combate se acaba parlamentando con el jefe en pie.
          **No se añade un botón nuevo**: el de «Terminar el combate», que ya estaba, es la
          confirmación. Dos caminos para el mismo gesto serían dos sitios donde equivocarse.
          Solo se pinta si el servidor lo propone, y a un jugador nunca se lo propone. */}
      {encuentro.finalPropuesto && (
        <p
          role="status"
          aria-label="Sin enemigos en pie"
          className="mb-s2 rounded-radius-sm border border-copper/40 bg-copper/10 px-s3 py-s1 font-chrome text-chrome-xs text-copper-text"
        >
          No queda ningún enemigo en pie. <strong>Si el combate ha terminado, ciérralo tú</strong> —
          esto no lo cierra solo.
        </p>
      )}

      <ol className="scroll-quiet flex items-center gap-s1 overflow-x-auto">
        {turnos.map(([posicion, grupo]) => {
          const actual = posicion === encuentro.activePosition;
          const nombres = grupo.map((c) => nombreDe(c.characterId)).join(" · ");
          // **`every` y no `some`**: una posición puede llevar un grupo entero —dos goblins que
          // tiraron juntos— y apagar la casilla porque uno cayó diría que cayeron los dos.
          const caido = grupo.every((c) => c.derrotado);
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
                // El gris de quien cayó. **Nunca es el único portador del significado**: debajo va
                // el rótulo «Cayó», igual que «Le toca» acompaña al color del turno.
                caido && !actual ? "opacity-50" : "",
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
              {caido && (
                <span className="font-chrome text-chrome-xs uppercase tracking-wide text-muted">
                  Cayó
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

      <MiEconomia
        campaignId={campaignId}
        sessionId={sessionId}
        encuentro={encuentro}
        personajes={personajes}
      />

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
                terminar.mutate(encuentro.id, {
                  onSuccess: (res) => {
                    setTerminando(false);
                    if (res.xpPropuesto) onXpPropuesto?.(res.xpPropuesto);
                  },
                })
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
 * Paso 2, tarea A3 — **la economía del turno propio, sobre la tira.**
 *
 * Solo se pinta si el combatiente de la mesa lleva a MI personaje: un espectador que solo
 * dirige PNJ del DM, o que no combate en este encuentro, no tiene turno propio que enseñar.
 *
 * **La economía se LEE del combatiente, nunca se guarda aparte.** Hasta la ronda de arreglo 1
 * esto llevaba su propio `useState`, sembrado en cero y actualizado solo con la respuesta de
 * `PATCH .../spend` — y `Encounter.combatants` no traía `actionUsed`/`bonusUsed`/`reactionUsed`/
 * `movementUsed` en absoluto (la tarea A2 los añadió al modelo Prisma y a `gastar()`, pero
 * `EncountersService.get()` seguía serializando solo cinco campos a mano). El resultado medido:
 * un jugador pulsaba «Usar Furia» —que gasta la acción adicional en el servidor por la puerta de
 * `ActivitiesService.usar`, tarea A11— y esta pantalla, que solo escuchaba el `PATCH` directo,
 * seguía diciendo «disponible». La revisión lo cazó con el propio e2e de A11. Ahora
 * `combatantSchema` lleva las cuatro columnas (`packages/shared/src/encounter.schema.ts`) y
 * `get()` las serializa (`encounters.service.ts`), así que esta pantalla no necesita guardar
 * nada: el sondeo de `useCurrentEncounter` ya trae el estado real, gástelo quien lo gaste.
 *
 * `excedido` sigue siendo un aviso local y efímero: no es un dato del encuentro, es «tu último
 * gasto se pasó», y se apaga solo en cuanto deja de ser mi turno o cambia el asalto.
 */
function MiEconomia({
  campaignId,
  sessionId,
  encuentro,
  personajes,
}: {
  campaignId: string;
  sessionId: string;
  encuentro: Encounter;
  personajes: Character[];
}) {
  const miId = useAuthStore((s) => s.user?.id);
  const miPersonaje = personajes.find((c) => c.ownerId === miId);
  const miCombatiente = miPersonaje
    ? encuentro.combatants.find((c) => c.characterId === miPersonaje.id)
    : undefined;

  const { data: hoja } = useCharacterSheet(campaignId, miPersonaje?.id ?? "");
  const gastar = useGastar(campaignId, sessionId);

  const [excedido, setExcedido] = useState(false);

  const esMiTurno =
    miCombatiente !== undefined && encuentro.activePosition === miCombatiente.position;

  // **Se ajusta DURANTE el render, no en un efecto** — el patrón que React recomienda para
  // «reiniciar el estado cuando algo cambia» (https://react.dev/learn/you-might-not-need-an-effect),
  // y el que exige la regla de lint de este proyecto. Solo queda por reiniciar el aviso de
  // exceso: la economía en sí ya no es estado de este componente.
  const claveDeTurno = esMiTurno ? `turno-${encuentro.round}` : "no-me-toca";
  const [claveVista, setClaveVista] = useState(claveDeTurno);
  if (claveVista !== claveDeTurno) {
    setClaveVista(claveDeTurno);
    setExcedido(false);
  }

  if (!miCombatiente) return null;

  return (
    <EconomiaDeAccion
      economia={miCombatiente}
      velocidad={hoja?.effectiveSpeeds?.walk?.total}
      excedido={excedido}
      gastando={gastar.isPending}
      onGastar={({ coste, cantidad }) => {
        gastar.mutate(
          { encounterId: encuentro.id, combatantId: miCombatiente.id, coste, cantidad },
          { onSuccess: (data) => setExcedido(data.excedido) },
        );
      }}
    />
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
  // vivo (`features/live/canal.ts`), que desde la ronda de arreglo 1 invalida también el
  // encuentro en curso — no se toca ninguno de los dos.
  //
  // **Sin objeto de opciones, a propósito.** `TiradasPendientes.tsx` pide exactamente esto mismo
  // con `useRollRequests(campaignId)`, y `{ includeResolved: false }` es el valor por defecto
  // de todas formas (`roll-requests/api.ts`): pasarlo aquí solo servía para que la clave de
  // consulta llevara un objeto distinto (`{}` frente a `{ includeResolved: false }`, que
  // `JSON.stringify` no ve iguales) y las dos pantallas sondearan la MISMA URL con DOS entradas
  // de caché capaces de divergir. La revisión lo cazó.
  //
  // **Y desde el paso 1 sí lleva un dato: el encuentro.** Filtrarlo en el cliente no bastaba —el
  // servidor recorta a cincuenta por fecha, así que las de iniciativa podían no llegar nunca— y
  // esa es la diferencia entre «nadie ha tirado» y «se cayeron de la página». La entrada de caché
  // distinta es correcta aquí: es otra URL con otros datos.
  const peticionesQuery = useRollRequests(campaignId, { encounterId: encuentro.id });
  const peticiones = peticionesQuery.data ?? [];

  const pendientes = peticiones.filter(
    (p) => p.encounterId === encuentro.id && p.key === "initiative",
  );
  const total = encuentro.combatants.length;
  const respondido = total - pendientes.length;

  const miId = useAuthStore((s) => s.user?.id);
  /**
   * **¿Combato yo en esto?** Si ninguno de mis personajes está entre los combatientes, la sala
   * de espera no es mía: soy un miembro de la campaña mirando un combate ajeno, y decirle a esa
   * persona «ya has tirado» —lo que pasaba antes de esta ronda de arreglo, porque cero
   * pendientes es indistinguible de «ya resolví las mías»— es el dato más personal de todos,
   * inventado. El DM no pasa por esta comprobación: la sala siempre es «suya» en el sentido de
   * que la dirige, tenga o no un personaje propio en la pelea.
   *
   * **Hueco conocido:** un PNJ cedido a un jugador (`quienEs` más abajo) no cuenta aquí, porque
   * `NpcEnLaMesa` no trae `ownerId` — el mismo dato que falta para nombrarlo también falta para
   * saber que ES tuyo. Ese jugador vería «no participas» aunque lleve un PNJ en la pelea.
   */
  const soyCombatiente = personajes.some(
    (c) => c.ownerId === miId && encuentro.combatants.some((cb) => cb.characterId === c.id),
  );

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

  // **El cuerpo de la pantalla, en el orden en que de verdad se decide.**
  //
  // «No participo» va primero porque no depende de que la petición de tirada haya resuelto —se
  // sabe con lo que ya hay en `encuentro`/`personajes`— y porque es la mentira más grave de las
  // posibles: a alguien que mira un combate ajeno se le decía «ya has tirado», que es el dato
  // más personal de todos, inventado. No aplica al DM: la sala es «suya» dirija o no un
  // personaje propio.
  //
  // «Comprobando…» y el aviso de error van antes que cualquier cifra: la revisión encontró que
  // `.data ?? []` colapsaba *cargando*, *falló* y *no hay ninguna pendiente* en el mismo `[]`, así
  // que el primer render —y cualquier `GET` que fallara— leía «Todos han tirado. Puedes empezar
  // cuando quieras» antes de que la respuesta llegara siquiera. Es la peor dirección posible para
  // un botón que fuerza el combate sin esperar a quien falte.
  let cuerpo: ReactNode;
  if (!esDm && !soyCombatiente) {
    cuerpo = (
      <p className="font-chrome text-chrome-xs text-muted">
        La mesa está preparando un combate. No participas en él.
      </p>
    );
  } else if (peticionesQuery.isPending) {
    cuerpo = <p className="font-chrome text-chrome-xs text-muted">Comprobando quién ha tirado…</p>;
  } else if (peticionesQuery.isError) {
    cuerpo = (
      <p role="alert" className="font-chrome text-chrome-xs text-danger-text">
        No se ha podido comprobar quién ha tirado: {(peticionesQuery.error as Error).message}
      </p>
    );
  } else if (esDm) {
    cuerpo = (
      <p className="font-chrome text-chrome-xs text-muted">
        {pendientes.length > 0
          ? `Esperando a ${textoDeEspera}.`
          : "Todos han tirado su iniciativa. Puedes empezar cuando quieras."}
      </p>
    );
  } else {
    cuerpo = (
      <p className="font-chrome text-chrome-xs text-muted">
        {pendientes.length > 0
          ? "Todavía te falta tirar tu iniciativa."
          : "Ya has tirado. Esperando a que responda el resto de la mesa."}
      </p>
    );
  }

  // **Solo el DM, y solo cuando la lista de pendientes ya resolvió.** Pintar «N de M» mientras
  // `peticionesQuery` está cargando o falló es exactamente el mismo fallo que `cuerpo` de arriba
  // evita en la frase: una cifra calculada sobre un `[]` que no es «cero pendientes», es «todavía
  // no lo sé».
  const contadorListo = esDm && !peticionesQuery.isPending && !peticionesQuery.isError;

  return (
    <section
      aria-label={NOMBRE_ESTADO_DE_COMBATE.PREPARING}
      className="rounded-radius-md border border-warning/40 bg-surface px-s3 py-s2"
    >
      <div className="mb-s2 flex flex-wrap items-center gap-s2">
        <span className="font-title text-chrome-sm uppercase tracking-widest text-warning-text">
          {NOMBRE_ESTADO_DE_COMBATE.PREPARING}
        </span>
        {contadorListo && (
          // **El texto visible es breve a propósito** («2 de 4»), pero un número suelto no es
          // una frase para quien lo escucha con un lector de pantalla — de ahí el `aria-label`
          // con el sustantivo que el texto visible se calla.
          <span
            className="font-data text-chrome-xs tabular-nums text-muted"
            aria-label={`${respondido} de ${total} combatientes han tirado su iniciativa`}
          >
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
              aria-describedby={forceStart.isPending ? "sala-espera-empezar-motivo" : undefined}
              onClick={() => forceStart.mutate(encuentro.id)}
            >
              Empezar igualmente
            </Button>
            {forceStart.isPending && (
              <span id="sala-espera-empezar-motivo" className="sr-only">
                Enviando la petición de empezar el combate sin esperar a los que faltan.
              </span>
            )}
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

      {cuerpo}

      {forceStart.isError && (
        <p role="alert" className="mt-s2 font-chrome text-chrome-xs text-danger-text">
          No se ha podido empezar el combate: {(forceStart.error as Error).message}
        </p>
      )}

      {cancelando && (
        <Dialog open onClose={() => setCancelando(false)} title="Cancelar el combate">
          {/* **La consecuencia, no un «¿seguro?».** Cancelar BORRA el combate y las peticiones de
              iniciativa de todos, tiradas o no; **lo que ya se tiró NO se borra**: las iniciativas
              que ya se resolvieron —la del DM al empezar el encuentro, y la de quien haya
              respondido— son sucesos ya escritos en el registro (`ABILITY_ROLL`,
              `rolls.service.ts`) y `cancel()` solo borra `RollRequest` y `Encounter`
              (`encounters.service.ts`), nunca sucesos. Decir lo contrario —«no queda rastro»,
              como decía la primera versión de este texto— era la misma mentira que este diálogo
              existe para no cometer: quien pulse esto tiene que leer la consecuencia de verdad,
              no una más cómoda. */}
          <p className="font-chrome text-chrome-sm text-text">
            Se borra el combate entero y las peticiones de iniciativa de todos —tiradas o no—. Las
            iniciativas que ya se tiraron siguen en el registro de la mesa: cancelar no las borra.
          </p>
          {cancelar.isError && (
            <p role="alert" className="mt-s3 font-chrome text-chrome-xs text-danger-text">
              No se ha podido cancelar el combate: {(cancelar.error as Error).message}
            </p>
          )}
          <div className="mt-s4 flex justify-end gap-s3">
            <Button type="button" variant="ghost" onClick={() => setCancelando(false)}>
              No, seguir esperando
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={cancelar.isPending}
              aria-describedby={cancelar.isPending ? "sala-espera-cancelar-motivo" : undefined}
              onClick={() =>
                cancelar.mutate(encuentro.id, { onSuccess: () => setCancelando(false) })
              }
            >
              Cancelar el combate
            </Button>
            {cancelar.isPending && (
              <span id="sala-espera-cancelar-motivo" className="sr-only">
                Enviando la cancelación del combate.
              </span>
            )}
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
