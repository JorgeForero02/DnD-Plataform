import { IconoElenco } from "../iconos";
import { PanelDeMesa } from "../PanelDeMesa";
import { FichaDeElenco } from "./FichaDeElenco";
import { useMembers } from "../../campaigns/members";
import type { Member } from "../../campaigns/members";
import { useCharacters } from "../../characters/hooks";
import { useCurrentSession } from "../hooks";
import { useCurrentEncounter } from "../../encounters/hooks";
import { useAuthStore } from "../../../store/auth.store";

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
 */
export function ColumnaElenco({
  campaignId,
  asistencia,
  esDm,
}: {
  campaignId: string;
  asistencia: { userId: string; characterId?: string }[] | null;
  esDm: boolean;
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
  const enCombate = Boolean(encuentro);
  const deQuienEsElTurno = new Set(
    encuentro && encuentro.activePosition !== null
      ? encuentro.combatants
          .filter((c) => c.position === encuentro.activePosition)
          .map((c) => c.characterId)
      : [],
  );

  return (
    <PanelDeMesa
      etiqueta="En la mesa"
      titulo="Elenco"
      icono={<IconoElenco className="h-4 w-4" />}
      // La columna scrollea por dentro: la mesa entera ya no scrollea.
      cuerpoClassName="scroll-quiet overflow-y-auto p-s3"
    >
      {!asistencia && (
        <p className="mb-s2 font-chrome text-chrome-xs text-muted">
          Nadie declaró quién vino al empezar la sesión.
        </p>
      )}
      {enMesa.length === 0 ? (
        <p className="font-chrome text-chrome-xs text-muted">
          Ningún personaje en la mesa todavía.
        </p>
      ) : mios.length > 0 && !esDm ? (
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
          <h4 className="mb-s2 font-chrome text-chrome-xs uppercase tracking-widest text-accent-text">
            {mios.length === 1 ? "Tu personaje" : "Tus personajes"}
          </h4>
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
              />
            ))}
          </ul>
          {otros.length > 0 && (
            <>
              <h4 className="mb-s2 mt-s4 font-chrome text-chrome-xs uppercase tracking-widest text-muted">
                El resto del grupo
              </h4>
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
          {/* El rótulo de la maqueta sobre la parrilla (`prototipo/.../ColumnaElenco.tsx:57-59`).
              Dice qué es esta lista cuando no hay ningún «Tu personaje» que la encabece. */}
          <h4 className="mb-s2 font-chrome text-chrome-xs uppercase tracking-widest text-accent-text">
            Grupo
          </h4>
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
              />
            ))}
          </ul>
        </>
      )}
      {ausentes.length > 0 && (
        <p className="mt-s3 border-t border-muted pt-s2 font-chrome text-chrome-xs text-muted">
          No vinieron: {ausentes.map((m) => m.displayName).join(", ")}.
        </p>
      )}
    </PanelDeMesa>
  );
}
