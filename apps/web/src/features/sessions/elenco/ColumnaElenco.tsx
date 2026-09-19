import { FichaDeElenco } from "./FichaDeElenco";
import { FichaDePnj } from "./FichaDePnj";
import { useMembers } from "../../campaigns/members";
import type { Member } from "../../campaigns/members";
import { useCharacters } from "../../characters/hooks";
import { useCurrentSession } from "../hooks";
import { useCurrentEncounter } from "../../encounters/hooks";
import { useAuthStore } from "../../../store/auth.store";
import type { NpcEnLaMesa } from "../../bestiario/api";

// **Carril C2 (2026-09-04) — el elenco con mandos.** Lo que la Ola 0 movió aquí era la versión
// vieja; esto es lo que pedía la auditoría del 2026-09-04 (§1): mandos «Daño», «Condición» y el
// ojo **solo en la disposición del DM**, barra de vida por tramos sin que el color sea el único
// portador, anillo ámbar con rótulo «Su turno» cuando hay encuentro, y `PonerCondicion` como
// cajón contextual desde el retrato, sin abrir la hoja entera.

/**
 * Quién está en la mesa, con lo que hace falta saber de cada uno mientras se juega.
 *
 * La asistencia **se declara**, no se deduce: los VTT saben quién está porque hay un socket
 * abierto y aquí no lo hay. Quien no vino se nombra igualmente, apagado y al pie — que alguien
 * falte es información de la partida, no un hueco.
 *
 * **La lista sale de los personajes, no de los miembros**: lo que se mira treinta veces por
 * sesión son los puntos de golpe y las condiciones, y esos son del personaje. El nombre de quien
 * lo lleva va debajo.
 *
 * **El encuentro se pide aquí, y no llega por parámetro.** El compositor (`MesaDeSesion.tsx`) no
 * pasa ni la sesión ni el encuentro a esta columna, y no se toca: es de otro carril. Así que el
 * dato se pide con los mismos hooks que él usa —`useCurrentSession` y `useCurrentEncounter`— y
 * React Query devuelve **la misma consulta**, no una segunda: comparten clave, así que no hay ni
 * una petición más de las que ya había. Si el compositor acaba pasando el encuentro, estas dos
 * líneas se sustituyen por una prop y nada más cambia.
 *
 * **Los PNJ, en cambio, SÍ llegan por prop** (tarea 9b, 2026-09-06): a diferencia del encuentro,
 * `MesaDeSesion.tsx` ya los pedía con `useNpcs` para el orden de turnos y el diálogo de combate —
 * pedirlos otra vez aquí sería la segunda consulta que el párrafo de arriba dice que no hace
 * falta para el encuentro, solo que esta vez sí evitable porque el compositor ya tiene el dato en
 * la mano. Sin ellos, el DM no tenía manera de quitarles vida ni ponerles condiciones desde la
 * mesa: `useCharacters` los excluye a propósito (`characters.service.ts`, «quién se sienta a la
 * mesa»), así que ningún PNJ ha pisado nunca esta columna.
 */
export function ColumnaElenco({
  campaignId,
  asistencia,
  esDm,
  pnjs = [],
}: {
  campaignId: string;
  asistencia: { userId: string; characterId?: string }[] | null;
  esDm: boolean;
  /**
   * **Los PNJ de la mesa, ya filtrados por `canView` en el servidor** (`useNpcs`, misma regla
   * que `bestiario/api.ts` documenta): uno que el DM no ha revelado no llega aquí, y esta columna
   * no lo compensa ni lo relaja — si algún día llegara uno que no debería, es un fallo del
   * servidor, no algo que esconder en la pantalla.
   */
  pnjs?: NpcEnLaMesa[];
}) {
  const { data: miembros } = useMembers(campaignId);
  const { data: personajes } = useCharacters(campaignId);
  const { data: sesion } = useCurrentSession(campaignId);
  const { data: encuentro } = useCurrentEncounter(campaignId, sesion?.id);
  const miId = useAuthStore((s) => s.user?.id);

  const declarados = asistencia ? new Set(asistencia.map((a) => a.characterId)) : null;
  // Sin asistencia declarada se enseñan todos los personajes que el servidor dejó ver: es lo
  // único honesto, porque no hay dato que diga quién vino.
  const enMesa = declarados
    ? (personajes ?? []).filter((p) => declarados.has(p.id))
    : (personajes ?? []);
  const nombreDe = new Map((miembros ?? []).map((m: Member) => [m.userId, m.displayName]));
  const mios = enMesa.filter((p) => p.ownerId === miId);
  const otros = enMesa.filter((p) => p.ownerId !== miId);
  const vinieron = new Set((asistencia ?? []).map((a) => a.userId));
  const ausentes = asistencia
    ? (miembros ?? []).filter((m) => !vinieron.has(m.userId))
    : ([] as Member[]);

  // **De quién es el turno.** `activePosition` puede ser `null` a propósito: el servidor dice
  // «ahora no te toca a ti» sin delatar a quién, cuando el espectador no puede ver a ese
  // combatiente. Y varios combatientes comparten posición cuando el servidor los agrupó por
  // `statblockRef` (seis goblins son UN turno), así que esto es un conjunto, no un id.
  //
  // **`enCombate` es `true` también con el encuentro en `PREPARING`** (I-6, ronda de arreglo 1
  // sobre la tarea 9b) — declarado a propósito, no un descuido: en la sala de espera el DM
  // sigue montando la escena (`sides` ya viaja desde `EmpezarCombate.tsx`, pero nadie ha tirado
  // iniciativa todavía), y rectificar quién es enemigo de quién ANTES de que el orden se fije es
  // exactamente cuando más sirve — corregirlo ya en `ACTIVE` significa que alguien actuó ya bajo
  // el bando equivocado. Es distinto del orden de turnos (`TiraDeIniciativa.tsx`), que sí espera
  // a `ACTIVE` porque un orden de `PREPARING` sería un orden que aún no existe; el bando, en
  // cambio, ya existe desde que se creó el encuentro.
  const enCombate = Boolean(encuentro);
  // **`combateEnMarcha` SÍ distingue `PREPARING` de `ACTIVE`** (I1, ola de cierre): a diferencia
  // de `enCombate`, esto gobierna «Sacar del combate» (`AccionesDeMesa.ts`), que el servidor
  // rechaza con 409 fuera de `ACTIVE` (spec §3.3) — un encuentro `PREPARING` se cancela, no se
  // vacía.
  const combateEnMarcha = encuentro?.status === "ACTIVE";
  const deQuienEsElTurno = new Set(
    encuentro && encuentro.activePosition !== null
      ? encuentro.combatants
          .filter((c) => c.position === encuentro.activePosition)
          .map((c) => c.characterId)
      : [],
  );

  // **El combatiente de cada personaje, por `characterId`.** Un PNJ ES una fila de `Character`
  // (tarea 9b lo dice arriba) y un personaje de jugador también puede combatir con un bando
  // corregible (tarea 10): la misma lista de `encuentro.combatants` sirve para las dos fichas,
  // solo que `FichaDePnj` ya la cruzaba con `pnjs` y aquí se cruza con los personajes de la mesa.
  const combatientePorPersonaje = new Map(
    (encuentro?.combatants ?? []).map((c) => [c.characterId, c]),
  );

  // **Cuándo se enseña un PNJ en el elenco: solo mientras combate.** Fuera de combate la columna
  // es la mesa, no el bestiario entero — un PNJ que el DM tiene instanciado pero no ha metido en
  // pelea no aporta nada que se mire treinta veces por sesión, que es el criterio que ya usa el
  // resto de esta columna. `encuentro.combatants` es la lista de quién combate AHORA MISMO, y
  // cruzarla con `pnjs` (ya filtrados por `canView`) da exactamente eso: los PNJ que están en la
  // pelea, en el orden en que combaten. Un combatiente sin PNJ correspondiente es un personaje de
  // jugador (ya pintado arriba) o un PNJ que este espectador no puede ver — ninguno de los dos
  // casos añade nada aquí.
  const combatientesPnj = encuentro
    ? encuentro.combatants
        .map((c) => ({ combatant: c, pnj: pnjs.find((p) => p.id === c.characterId) }))
        .filter(
          (x): x is { combatant: (typeof encuentro.combatants)[number]; pnj: NpcEnLaMesa } =>
            x.pnj !== undefined,
        )
        .sort((a, b) => a.combatant.position - b.combatant.position)
    : [];

  const nadaEnLaMesa = enMesa.length === 0 && combatientesPnj.length === 0;

  // D-CF-149 (Task 5b de 3A.3) — **el elenco del prototipo (`.elenco`)**: una caja sin cabecera
  // —el HTML no le pone título— con los grupos como rótulos de una línea y su cuenta a la
  // derecha («El grupo 3», «En escena 2»), y las tarjetas densas de `FichaDeElenco`. La sección
  // conserva su nombre accesible «En la mesa», que es como la localizan las pruebas.
  const rotulo = (texto: string, cuantos: number, primero = false) => (
    <h4
      className={`flex items-baseline justify-between font-chrome text-chrome-sm text-muted ${primero ? "" : "mt-s2"}`}
    >
      <span>{texto}</span>
      <span className="font-data text-chrome-xs">{cuantos}</span>
    </h4>
  );

  return (
    <section
      aria-label="En la mesa"
      className="scroll-quiet flex min-h-0 min-w-0 flex-col gap-s2 overflow-y-auto rounded-radius-sm border border-muted bg-surface p-s3"
    >
      {!asistencia && (
        <p className="font-chrome text-chrome-xs text-muted">
          Nadie declaró quién vino al empezar la sesión.
        </p>
      )}
      {nadaEnLaMesa ? (
        <p className="font-chrome text-chrome-xs text-muted">
          Ningún personaje en la mesa todavía.
        </p>
      ) : enMesa.length === 0 ? null : mios.length > 0 && !esDm ? (
        // **La disposición del jugador**, y sale de una frase del autor que invierte el modelo
        // de Baldur's Gate 3: *«en BG3 es un jugador manejando varios; acá somos varios
        // manejando uno propio»*. En BG3 los retratos del grupo son MANDOS —pulsas uno y pasas
        // a controlarlo—; aquí no pueden serlo, porque el personaje de otro no es tuyo.
        //
        // Así que el tuyo va delante y con detalle, y los demás en segundo plano: se ven, se
        // leen sus PG y sus condiciones, y **sobre ellos no hay botones**. Eso último no es
        // decoración: el servidor lo garantiza de verdad (`requireEditable`), pero enseñar un
        // mando que va a dar 403 es prometer algo falso.
        <>
          {rotulo(mios.length === 1 ? "Tu personaje" : "Tus personajes", mios.length, true)}
          <ul className="flex flex-col gap-s2">
            {mios.map((p) => (
              <FichaDeElenco
                key={p.id}
                campaignId={campaignId}
                personaje={p}
                dueno={nombreDe.get(p.ownerId)}
                puedeCambiarPg
                destacado
                turnoActual={deQuienEsElTurno.has(p.id)}
                enCombate={enCombate}
                combateEnMarcha={combateEnMarcha}
              />
            ))}
          </ul>
          {otros.length > 0 && (
            <>
              {/* «En la mesa», como el prototipo llama al resto del grupo en la vista del jugador. */}
              {rotulo("En la mesa", otros.length)}
              <ul className="flex flex-col gap-s2">
                {otros.map((p) => (
                  <FichaDeElenco
                    key={p.id}
                    campaignId={campaignId}
                    personaje={p}
                    dueno={nombreDe.get(p.ownerId)}
                    puedeCambiarPg={false}
                    turnoActual={deQuienEsElTurno.has(p.id)}
                    enCombate={enCombate}
                    combateEnMarcha={combateEnMarcha}
                  />
                ))}
              </ul>
            </>
          )}
        </>
      ) : (
        // **La del DM**, que sí está en la situación de BG3 porque maneja a muchos: la parrilla
        // de todos con sus mandos, sin destacar a ninguno. Es también lo que ve un jugador que
        // no tiene ningún personaje en esta mesa — y ese jugador **no lleva mandos**, porque el
        // rol lo dice el servidor y él no es DM.
        <>
          {/* «El grupo», el rótulo del prototipo sobre la lista del DM. */}
          {rotulo("El grupo", enMesa.length, true)}
          <ul className="flex flex-col gap-s2">
            {enMesa.map((p) => (
              <FichaDeElenco
                key={p.id}
                campaignId={campaignId}
                personaje={p}
                dueno={nombreDe.get(p.ownerId)}
                conMandos={esDm}
                puedeCambiarPg={!esDm && p.ownerId === miId}
                turnoActual={deQuienEsElTurno.has(p.id)}
                enCombate={enCombate}
                combateEnMarcha={combateEnMarcha}
                bando={combatientePorPersonaje.get(p.id)?.side}
                sessionId={sesion?.id}
                encounterId={encuentro?.id}
                combatanteId={combatientePorPersonaje.get(p.id)?.id}
              />
            ))}
          </ul>
        </>
      )}
      {combatientesPnj.length > 0 && (
        // **Los PNJ en combate, aparte del grupo.** El jugador los ve para saber cómo va la
        // pelea —PG, condiciones, de qué bando— pero **sin mandos**: la regla de la mesa es que
        // sobre el personaje de otro no van botones, y un PNJ no es de nadie que esté jugando.
        // El DM sí los lleva, porque de eso trataba el encargo: hasta hoy no había manera de
        // quitarles vida ni ponerles condiciones desde aquí.
        <>
          {/* «En escena» (prototipo), antes «PNJ en combate». El mismo tono apagado que los
              otros rótulos: la sección no es «enemigos», y un PNJ aliado también cae aquí. */}
          {rotulo("En escena", combatientesPnj.length, enMesa.length === 0)}
          <ul className="flex flex-col gap-s2">
            {combatientesPnj.map(({ combatant, pnj }) => (
              <FichaDePnj
                key={pnj.id}
                campaignId={campaignId}
                pnj={pnj}
                bando={combatant.side}
                esDm={esDm}
                miId={miId}
                turnoActual={deQuienEsElTurno.has(pnj.id)}
                enCombate={enCombate}
                combateEnMarcha={combateEnMarcha}
                sessionId={sesion?.id}
                encounterId={encuentro?.id}
                combatanteId={combatant.id}
              />
            ))}
          </ul>
        </>
      )}
      {ausentes.length > 0 && (
        <p className="mt-s1 border-t border-muted/40 pt-s2 font-chrome text-chrome-xs text-muted">
          No vinieron: {ausentes.map((m) => m.displayName).join(", ")}.
        </p>
      )}
    </section>
  );
}
