import { useState } from "react";
import { Link } from "react-router-dom";
import type { Session } from "./api";
import { useCloseSession, useGameLog, useStartSession } from "./hooks";
import { NOMBRE_SELLO } from "./vocabulario";
import { useMembers } from "../campaigns/members";
import { useCharacters } from "../characters/hooks";
import { Button } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";
import { Field, fieldControlClass } from "../../ui/Field";
import { VisibilityChooser } from "../entities/VisibilityChooser";
import type { CloseSessionInput } from "@dnd/shared";

// Empezar y cerrar una sesión. **Los botones que faltaban.**
//
// La API distingue `PLANNED`, `IN_PROGRESS` y `CLOSED` desde 2A.5, con un índice único parcial
// que garantiza una sola en curso por campaña — y **ninguna pantalla los enseñaba**. La
// consecuencia no era estética: como nadie empezaba una sesión, todos los sucesos se escribían
// con `sessionId` nulo y el registro de la partida no se podía reconstruir.

export function ControlesDeSesion({
  campaignId,
  session,
  puedeGestionar,
}: {
  campaignId: string;
  session: Session;
  puedeGestionar: boolean;
}) {
  const [empezando, setEmpezando] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  if (session.status === "CLOSED") {
    return (
      <span className="font-chrome text-chrome-xs text-muted">
        Cerrada
        {session.endedAt ? ` el ${new Date(session.endedAt).toLocaleDateString("es-ES")}` : ""}
      </span>
    );
  }

  if (session.status === "IN_PROGRESS") {
    return (
      <span className="flex items-center gap-s2">
        <Link
          to={`/campaigns/${campaignId}/sesion`}
          className="font-chrome text-chrome-xs text-accent-text underline"
        >
          Ir a la mesa
        </Link>
        {puedeGestionar && (
          <Button
            type="button"
            variant="ghost"
            className="px-2 py-0.5 text-chrome-xs"
            onClick={() => setCerrando(true)}
          >
            Cerrar sesión
          </Button>
        )}
        {cerrando && (
          <DialogoDeCierre
            campaignId={campaignId}
            session={session}
            onClose={() => setCerrando(false)}
          />
        )}
      </span>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="px-2 py-0.5 text-chrome-xs"
        disabled={!puedeGestionar}
        title={puedeGestionar ? undefined : "Solo el DM empieza una sesión."}
        onClick={() => setEmpezando(true)}
      >
        Empezar
      </Button>
      {empezando && (
        <DialogoDeInicio
          campaignId={campaignId}
          session={session}
          onClose={() => setEmpezando(false)}
        />
      )}
    </>
  );
}

/**
 * Quién vino, y con qué personaje.
 *
 * **Se declara porque aquí no hay conexiones en vivo.** Los VTT lo saben porque tienen un socket
 * abierto; esto no lo tiene, así que quien estaba es un dato que alguien dice. Y hace falta: de
 * él cuelgan después «tu personaje no estaba en esa escena» y el reparto de lo que se ganó.
 *
 * Empezar sin declarar nada es legítimo: el botón no lo exige.
 */
export function DialogoDeInicio({
  campaignId,
  session,
  onClose,
}: {
  campaignId: string;
  session: Session;
  onClose: () => void;
}) {
  const { data: miembros } = useMembers(campaignId);
  const { data: personajes } = useCharacters(campaignId);
  const empezar = useStartSession(campaignId);
  const [vinieron, setVinieron] = useState<Record<string, string | undefined>>({});
  const [presentes, setPresentes] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const confirmar = async () => {
    setError(null);
    const attendance = Object.entries(presentes)
      .filter(([, v]) => v)
      .map(([userId]) => ({ userId, characterId: vinieron[userId] || undefined }));
    try {
      await empezar.mutateAsync({
        sessionId: session.id,
        attendance: attendance.length > 0 ? attendance : undefined,
      });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Dialog open onClose={onClose} title={`Empezar «${session.title}»`}>
      <p className="mb-s3 font-chrome text-chrome-sm text-muted">
        Marca quién ha venido. Puedes empezar sin marcar a nadie y decirlo luego.
      </p>
      <ul className="flex flex-col gap-s2">
        {(miembros ?? []).map((m) => (
          <li key={m.userId} className="flex flex-wrap items-center gap-s2">
            <label className="flex items-center gap-1.5 font-chrome text-chrome-sm text-text">
              <input
                type="checkbox"
                checked={Boolean(presentes[m.userId])}
                onChange={(e) => setPresentes((p) => ({ ...p, [m.userId]: e.target.checked }))}
                className="accent-[var(--accent)]"
              />
              {m.displayName}
            </label>
            {presentes[m.userId] && (
              <select
                aria-label={`Personaje de ${m.displayName}`}
                value={vinieron[m.userId] ?? ""}
                onChange={(e) => setVinieron((v) => ({ ...v, [m.userId]: e.target.value }))}
                className={fieldControlClass}
              >
                <option value="">sin personaje</option>
                {(personajes ?? [])
                  .filter((p) => p.ownerId === m.userId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            )}
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-s2 font-chrome text-chrome-xs text-danger-text">
          {error}
        </p>
      )}
      <div className="mt-s4 flex gap-s2">
        <Button type="button" onClick={() => void confirmar()} disabled={empezar.isPending}>
          Empezar la sesión
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </Dialog>
  );
}

/**
 * Cerrar, con la crónica **ya escrita**.
 *
 * Ningún producto de los once que se estudiaron deriva la crónica del registro: Shard vuelca
 * las notas al log de campaña y ni él las convierte en prosa. Aquí el DM no arranca del folio en
 * blanco — arranca de sus propios sellos convertidos en viñetas, y edita.
 *
 * Y por eso importa que el sello cueste un clic: **si nadie sella, esto sale vacío.**
 */
function DialogoDeCierre({
  campaignId,
  session,
  onClose,
}: {
  campaignId: string;
  session: Session;
  onClose: () => void;
}) {
  const { data: log } = useGameLog(campaignId, { sessionId: session.id });
  const cerrar = useCloseSession(campaignId);
  const [error, setError] = useState<string | null>(null);

  const vinetas = (log?.events ?? [])
    .filter((e) => e.payload.type === "SESSION_NOTE")
    .reverse()
    .map((e) => {
      const p = e.payload as {
        type: "SESSION_NOTE";
        kind: keyof typeof NOMBRE_SELLO;
        text?: string;
      };
      return `— ${NOMBRE_SELLO[p.kind]}${p.text ? `: ${p.text}` : ""}`;
    })
    .join("\n");

  const [recap, setRecap] = useState(vinetas);
  /**
   * **Quién ve la crónica, y es una decisión aparte de quién ve la sesión.**
   *
   * El esquema aceptaba `recapVisibility` desde que existe el cierre y **el servidor la tiraba a la
   * basura**: publicaba el suceso con la visibilidad de la sesión. El plan 02 arregló el servidor;
   * sin este control, el arreglo no lo usaría nadie.
   *
   * Solo tres niveles, como en el editor de sesiones: una `Session` no tiene creador ni
   * concesiones, así que `OWNER_DM` y `SPECIFIC_PLAYERS` sobre una crónica no seleccionan a nadie.
   */
  const [visibilidad, setVisibilidad] = useState<CloseSessionInput["recapVisibility"]>("PLAYERS");
  // Si el log llega después de montar el diálogo, el borrador se rellena una sola vez y no
  // vuelve a pisarse: machacar lo que el DM ya está escribiendo sería imperdonable.
  const [tocado, setTocado] = useState(false);
  if (!tocado && !recap && vinetas) setRecap(vinetas);

  const confirmar = async () => {
    setError(null);
    try {
      await cerrar.mutateAsync({
        sessionId: session.id,
        recap: recap.trim() || undefined,
        recapVisibility: visibilidad,
      });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Dialog open onClose={onClose} title={`Cerrar «${session.title}»`}>
      <Field
        label="Qué pasó"
        hint={
          vinetas
            ? "Sale de lo que fuiste anotando durante la partida. Corrígelo a tu gusto."
            : "No anotaste nada durante la sesión, así que esto empieza en blanco."
        }
      >
        <textarea
          rows={8}
          value={recap}
          onChange={(e) => {
            setTocado(true);
            setRecap(e.target.value);
          }}
          className={fieldControlClass}
        />
      </Field>
      <div className="mt-s4">
        <Field
          label="Quién puede leerla"
          hint="No es lo mismo que quién ve la sesión: una crónica puede publicarse a la mesa aunque la sesión fuera preparación tuya."
        >
          <VisibilityChooser
            value={visibilidad}
            // `VisibilityChooser.onChange` acepta cualquier `Visibility`, porque el mismo
            // componente sirve a pantallas con los cinco niveles. Esta crónica solo ofrece tres
            // `niveles` y nunca parte de un valor guardado fuera de esa lista —a diferencia de
            // `SessionEditor.tsx`, aquí no hay una crónica previa que restaurar—, así que el
            // molde solo puede llamar con uno de los tres que sí caben en `visibilidad`.
            onChange={(siguiente) => setVisibilidad(siguiente as typeof visibilidad)}
            niveles={["PUBLIC", "PLAYERS", "DM_ONLY"]}
            disabled={cerrar.isPending}
          />
        </Field>
      </div>
      {error && (
        <p role="alert" className="mt-s2 font-chrome text-chrome-xs text-danger-text">
          {error}
        </p>
      )}
      <div className="mt-s4 flex gap-s2">
        <Button type="button" onClick={() => void confirmar()} disabled={cerrar.isPending}>
          Cerrar la sesión
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Seguir jugando
        </Button>
      </div>
    </Dialog>
  );
}
