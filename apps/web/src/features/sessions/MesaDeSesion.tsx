import { useState } from "react";
import type { SessionNoteKind, Visibility } from "@dnd/shared";
import type { GameEventRow } from "./log-api";
import { useCurrentSession, useGameLog, useStampNote } from "./hooks";
import { ICONO_SELLO, NOMBRE_SELLO, SELLOS_EN_ORDEN } from "./vocabulario";
import { IconoPresencia } from "./iconos";
import { horaDe, lineaDeLog } from "./linea-de-log";
import { useMembers, useMyRole } from "../campaigns/members";
import { useCharacters } from "../characters/hooks";
import { useAllEntities } from "../entities/hooks";
import { Button } from "../../ui/Button";
import { fieldControlClass } from "../../ui/Field";
import { Badge } from "../../ui/Badge";
import { EmptyState } from "../../ui/Collection";

// La mesa: la pantalla que se mira mientras se juega.
//
// Tres paneles, y el reparto sale de la investigación de once VTT: **quién está** a la izquierda,
// **qué pasa** en el centro, **qué consulto** a la derecha. Shard Tabletop es el único producto
// que hace algo así y el único que cierra la sesión de verdad.
//
// La crítica que esto ataca aparece en todos los foros y no es «le falta algo»: es **el DM con
// quince pestañas abiertas**. Por eso el panel de consulta trae el mundo aquí en vez de mandarte
// a otra pantalla, y por eso «revelar» es un botón de mesa y no un formulario de configuración:
// si para enseñar un lugar hay que ir a cambiar un desplegable, en mitad de la partida no se hace.

export function MesaDeSesion({ campaignId }: { campaignId: string }) {
  const { data: sesion, isLoading } = useCurrentSession(campaignId);
  const { role } = useMyRole(campaignId);
  const esDm = role === "DM";
  // «Ver como»: el DM elige por los ojos de quién mira. El servidor sigue filtrando por canView.
  const [comoUsuario, setComoUsuario] = useState<string>("");

  const { data: log } = useGameLog(campaignId, {
    sessionId: sesion?.id,
    as: esDm && comoUsuario ? comoUsuario : undefined,
  });

  if (isLoading) {
    return <p className="font-chrome text-chrome-sm text-muted">Buscando la sesión…</p>;
  }
  if (!sesion) {
    return (
      <EmptyState title="No hay ninguna sesión en curso">
        Cuando el DM empiece una sesión desde la pestaña «Sesiones», esta pantalla se llena sola y
        aparece la barra de «en juego» en toda la campaña.
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-s4 lg:grid-cols-[16rem_minmax(0,1fr)_20rem]">
      <Elenco campaignId={campaignId} asistencia={sesion.attendance} />
      <Registro
        campaignId={campaignId}
        eventos={log?.events ?? []}
        esDm={esDm}
        comoUsuario={comoUsuario}
        onComoUsuario={setComoUsuario}
      />
      <Consulta campaignId={campaignId} esDm={esDm} />
    </div>
  );
}

/**
 * Quién está en la mesa.
 *
 * La asistencia **se declara**, no se deduce: los VTT saben quién está porque hay un socket
 * abierto y aquí no lo hay. Quien no vino se pinta igualmente, apagado — que alguien falte es
 * información de la partida, no un hueco.
 */
function Elenco({
  campaignId,
  asistencia,
}: {
  campaignId: string;
  asistencia: { userId: string; characterId?: string }[] | null;
}) {
  const { data: miembros } = useMembers(campaignId);
  const { data: personajes } = useCharacters(campaignId);
  const vinieron = new Set((asistencia ?? []).map((a) => a.userId));
  const personajeDe = new Map((asistencia ?? []).map((a) => [a.userId, a.characterId]));

  return (
    <section aria-label="En la mesa" className="flex flex-col gap-s2">
      <h2 className="font-chrome text-chrome-sm font-semibold text-text">En la mesa</h2>
      {!asistencia && (
        <p className="font-chrome text-chrome-xs text-muted">
          Nadie declaró quién vino al empezar la sesión.
        </p>
      )}
      <ul className="flex flex-col gap-1.5">
        {(miembros ?? []).map((m) => {
          const presente = !asistencia || vinieron.has(m.userId);
          const suyo = personajes?.find((p) => p.id === personajeDe.get(m.userId));
          return (
            <li
              key={m.userId}
              className={`font-chrome text-chrome-xs ${presente ? "text-text" : "text-muted"}`}
            >
              <span className="flex items-center gap-1.5">
                <IconoPresencia presente={presente} />
                {m.displayName}
              </span>
              <span className="ml-4 block text-muted">
                {suyo ? suyo.name : presente ? "sin personaje" : "no vino"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** El registro en vivo, con los sellos arriba. Es el centro de la pantalla porque es la partida. */
function Registro({
  campaignId,
  eventos,
  esDm,
  comoUsuario,
  onComoUsuario,
}: {
  campaignId: string;
  eventos: GameEventRow[];
  esDm: boolean;
  comoUsuario: string;
  onComoUsuario: (v: string) => void;
}) {
  const { data: miembros } = useMembers(campaignId);
  const sellar = useStampNote(campaignId);
  const [texto, setTexto] = useState("");
  const [soloDm, setSoloDm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const poner = async (kind: SessionNoteKind) => {
    setError(null);
    try {
      await sellar.mutateAsync({
        kind,
        text: texto.trim() || undefined,
        visibility: soloDm ? "DM_ONLY" : "PLAYERS",
      });
      setTexto("");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <section aria-label="Registro de la sesión" className="flex flex-col gap-s2">
      <div className="flex flex-wrap items-center gap-1.5">
        {SELLOS_EN_ORDEN.map((kind) => {
          const Icono = ICONO_SELLO[kind];
          return (
            <Button
              key={kind}
              type="button"
              variant="ghost"
              className="flex items-center gap-1.5 px-2 py-1 text-chrome-xs"
              disabled={sellar.isPending}
              onClick={() => void poner(kind)}
            >
              <Icono className="h-4 w-4" />
              {NOMBRE_SELLO[kind]}
            </Button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-s2">
        <input
          aria-label="Qué anotar"
          placeholder="…y en dos palabras, qué pasó"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className={`${fieldControlClass} flex-1`}
        />
        <label className="flex items-center gap-1.5 font-chrome text-chrome-xs text-muted">
          <input
            type="checkbox"
            checked={soloDm}
            onChange={(e) => setSoloDm(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          Solo el DM
        </label>
      </div>
      {error && (
        <p role="alert" className="font-chrome text-chrome-xs text-danger-text">
          {error}
        </p>
      )}

      {esDm && (
        <label className="flex items-center gap-s2 font-chrome text-chrome-xs text-muted">
          Ver el registro como
          <select
            aria-label="Ver el registro como"
            value={comoUsuario}
            onChange={(e) => onComoUsuario(e.target.value)}
            className={fieldControlClass}
          >
            <option value="">yo (DM)</option>
            {(miembros ?? [])
              .filter((m) => m.role !== "DM")
              .map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.displayName}
                </option>
              ))}
          </select>
        </label>
      )}
      {esDm && comoUsuario && (
        <p className="font-chrome text-chrome-xs text-copper-text">
          Estás viendo lo que ve ese jugador. No es una simulación: el servidor filtra igual que
          para él.
        </p>
      )}

      <ol className="flex flex-col gap-1">
        {eventos.length === 0 && (
          <li className="font-chrome text-chrome-sm text-muted">
            Todavía no ha pasado nada en esta sesión.
          </li>
        )}
        {eventos.map((e) => (
          <li key={e.id} className="flex items-baseline gap-s2 font-chrome text-chrome-sm">
            <span className="font-data text-chrome-xs text-muted">{horaDe(e.createdAt)}</span>
            <span className="min-w-0 flex-1 text-text">{lineaDeLog(e.payload)}</span>
            <Badge visibility={e.visibility} />
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * El mundo, aquí, sin cambiar de pantalla. Y el botón de revelar.
 *
 * **Revelar es un verbo de sesión, no configuración.** Es el patrón que ejecutan todos los VTT
 * («Show Players» de Foundry, arrastrar al retrato en Fantasy Grounds) y no un ajuste que se
 * cambia en un formulario. Aquí se apoya en la misma matriz de visibilidad de siempre: subir el
 * nivel de la ficha deja además su rastro en el log.
 */
function Consulta({ campaignId, esDm }: { campaignId: string; esDm: boolean }) {
  const { data: entidades } = useAllEntities(campaignId);
  const [busqueda, setBusqueda] = useState("");
  const encontradas = (entidades ?? []).filter((e) =>
    e.name.toLowerCase().includes(busqueda.trim().toLowerCase()),
  );

  return (
    <section aria-label="Consulta del mundo" className="flex flex-col gap-s2">
      <h2 className="font-chrome text-chrome-sm font-semibold text-text">Consulta</h2>
      <input
        aria-label="Buscar en el mundo"
        placeholder="Buscar en el mundo…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className={fieldControlClass}
      />
      <ul className="flex flex-col gap-1.5">
        {encontradas.slice(0, 12).map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-s2">
            <a
              href={`/campaigns/${campaignId}/entidades/${e.id}`}
              className="min-w-0 flex-1 truncate font-chrome text-chrome-sm text-accent-text hover:underline"
            >
              {e.name}
            </a>
            <Badge visibility={e.visibility as Visibility} />
          </li>
        ))}
        {busqueda && encontradas.length === 0 && (
          <li className="font-chrome text-chrome-xs text-muted">Nada con ese nombre.</li>
        )}
      </ul>
      {esDm && (
        <p className="font-chrome text-chrome-xs text-muted">
          Abre una entrada para revelarla a la mesa desde su propia pantalla.
        </p>
      )}
    </section>
  );
}
