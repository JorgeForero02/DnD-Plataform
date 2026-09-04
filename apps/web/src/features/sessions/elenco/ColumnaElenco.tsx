import { IconoElenco } from "../iconos";
import { PanelDeMesa } from "../PanelDeMesa";
import { FichaDeElenco } from "./FichaDeElenco";
import { useMembers } from "../../campaigns/members";
import type { Member } from "../../campaigns/members";
import { useCharacters } from "../../characters/hooks";
import { useAuthStore } from "../../../store/auth.store";

// **Ola 0 (2026-09-04): esto sale de `MesaDeSesion.tsx` tal cual, sin retoques de forma.**
//
// La mesa pasa a ser un compositor de ~150 líneas y el elenco pasa a ser un carril con sus
// ficheros propios. Lo que hay aquí abajo es la versión que ya funcionaba —incluidas las dos
// disposiciones y la regla de que sobre el retrato de otro no van botones—, movida de sitio para
// que el carril del elenco pueda reescribir su presentación **sin tocar el compositor**.
//
// Lo que le falta, y es el encargo del carril (auditoría 2026-09-04, §1): mandos «Daño» y
// «Condición» y el ojo para abrir, **solo en la disposición del DM**; barra de vida que cambia de
// color por tramo; anillo ámbar en el turno actual y badge «Su turno»; y `PonerCondicion` como
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
                  />
                ))}
              </ul>
            </>
          )}
        </>
      ) : (
        // **La del DM**, que sí está en la situación de BG3 porque maneja a muchos: la parrilla
        // de todos con sus mandos, sin destacar a ninguno. Es también lo que ve un jugador que
        // no tiene ningún personaje en esta mesa.
        <ul className="flex flex-col gap-s2">
          {enMesa.map((p) => (
            <FichaDeElenco
              key={p.id}
              campaignId={campaignId}
              personaje={p}
              dueno={nombreDe.get(p.ownerId)}
              puedeCambiarPg={esDm || p.ownerId === miId}
            />
          ))}
        </ul>
      )}
      {ausentes.length > 0 && (
        <p className="mt-s3 border-t border-muted pt-s2 font-chrome text-chrome-xs text-muted">
          No vinieron: {ausentes.map((m) => m.displayName).join(", ")}.
        </p>
      )}
    </PanelDeMesa>
  );
}
