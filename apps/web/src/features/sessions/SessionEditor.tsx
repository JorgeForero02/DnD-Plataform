import { useState } from "react";
import type { CreateSessionInput, UpdateSessionInput, Visibility } from "@dnd/shared";
import { useCreateSession, useUpdateSession } from "./hooks";
import type { Session } from "./api";

// SPECIFIC_PLAYERS and OWNER_DM are both dropped, and for the same reason: Session has no
// `createdById` distinct from the DM (sessions.service.ts passes createdById: "" to
// canView), so OWNER_DM's comparison ("" === viewer.userId) is false for every player, and
// visibility.ts returns true for any DM before ever looking at the visibility value. That
// makes OWNER_DM, SPECIFIC_PLAYERS, and DM_ONLY produce the exact same set of viewers here
// — only the DM — so offering OWNER_DM would be exactly the placebo option this editor is
// not allowed to offer: a DM picks it believing, from the name, that someone else will see
// it, and no one does. See docs/05-datos.md.
const VISIBILITIES: Visibility[] = ["PUBLIC", "PLAYERS", "DM_ONLY"];

// A <input type="datetime-local"> needs "YYYY-MM-DDTHH:mm" in local time, not the UTC ISO
// string the server sends back.
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function notesToText(notes: unknown): string {
  if (typeof notes === "string") return notes;
  if (notes === null || notes === undefined) return "";
  // Any other JSON shape (this UI never writes one, but the field is Json? on the server)
  // is shown as-is rather than silently dropped.
  return JSON.stringify(notes);
}

export function SessionEditor({
  campaignId,
  session,
  onClose,
  readOnly = false,
  readOnlyReason,
}: {
  campaignId: string;
  session?: Session;
  onClose: () => void;
  // Arreglo 1 (1.15-fix): see the same prop on EntityEditor.tsx — the row that opens this now
  // opens unconditionally, and this is what a player who can view but not manage the session
  // gets instead of an editable form.
  readOnly?: boolean;
  readOnlyReason?: string;
}) {
  const isEdit = !!session;
  const [title, setTitle] = useState(session?.title ?? "");
  const [scheduledAt, setScheduledAt] = useState(toDatetimeLocal(session?.scheduledAt ?? null));
  const [notes, setNotes] = useState(notesToText(session?.notes));
  const [visibility, setVisibility] = useState<Visibility>(session?.visibility ?? "PLAYERS");
  const [error, setError] = useState<string | null>(null);

  const create = useCreateSession(campaignId);
  const update = useUpdateSession(campaignId);
  const pending = create.isPending || update.isPending;

  // A session can arrive with a visibility this editor doesn't itself offer (curl, a seed, a
  // future client all pass the API's own schema). Without this, the <select> renders with no
  // option matching the current value, so it paints blank with no explanation. Adding it back
  // as its own option keeps the value visible and labeled for what it is; the state still
  // holds it unchanged if the DM saves without touching the field. Once the DM picks anything
  // else, this option disappears — there is no way back to it from here, which is correct:
  // this form still can't express SPECIFIC_PLAYERS.
  const visibilityOptions = VISIBILITIES.includes(visibility)
    ? VISIBILITIES
    : [...VISIBILITIES, visibility];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    setError(null);
    const trimmedNotes = notes.trim();
    // createSessionSchema.scheduledAt is z.coerce.date(): the *output* TS type is Date, but
    // the schema accepts an ISO string as *input* and coerces it server-side. Sending the
    // string (not `new Date(...)`) matches what the API actually validates; the cast below
    // just tells TS what the runtime already does.
    // In edit mode, an omitted key means "leave it as-is" on the server
    // (sessions.service.ts: `if (input.notes !== undefined) data.notes = ...`), so clearing
    // the field has to send the empty string, not omit the key — otherwise the old value
    // survives a save that looks successful. In create mode there is no old value to
    // preserve, so an empty field is still omitted (the schema field is optional).
    //
    // scheduledAt can't get the same treatment: createSessionSchema.scheduledAt is
    // `z.coerce.date().optional()` without `.nullable()`, so there is no value this form can
    // send that means "clear the date" against today's API. Left as a known limitation —
    // see docs/06-pendientes.md — rather than guessed at here.
    const payload = {
      title,
      visibility,
      ...(scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}),
      ...(isEdit ? { notes: trimmedNotes } : trimmedNotes ? { notes: trimmedNotes } : {}),
    } as unknown as CreateSessionInput;
    try {
      if (isEdit && session) {
        await update.mutateAsync({
          sessionId: session.id,
          input: payload as UpdateSessionInput,
        });
      } else {
        await create.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-y-auto bg-black/50 py-8">
      <form onSubmit={onSubmit} className="w-[28rem] space-y-3 rounded-lg bg-slate-800 p-6">
        <h2 className="text-lg font-bold">{isEdit ? "Editar sesión" : "Nueva sesión"}</h2>
        {readOnly && (
          <p className="rounded bg-slate-700/50 p-2 text-xs text-amber-400">
            {readOnlyReason ?? "Solo puedes ver esta sesión."}
          </p>
        )}
        <div>
          <label htmlFor="session-title" className="block text-sm">
            Título
          </label>
          <input
            id="session-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={readOnly}
            className="w-full rounded bg-slate-700 p-2 disabled:opacity-60"
          />
        </div>
        <div>
          <label htmlFor="session-scheduled-at" className="block text-sm">
            Fecha y hora
          </label>
          <input
            id="session-scheduled-at"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            disabled={readOnly}
            className="w-full rounded bg-slate-700 p-2 disabled:opacity-60"
          />
        </div>
        <div>
          <label htmlFor="session-notes" className="block text-sm">
            Notas
          </label>
          <textarea
            id="session-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={readOnly}
            className="w-full rounded bg-slate-700 p-2 disabled:opacity-60"
            rows={3}
          />
        </div>
        <div>
          <label htmlFor="session-visibility" className="block text-sm">
            Visibilidad
          </label>
          <select
            id="session-visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
            disabled={readOnly}
            className="w-full rounded bg-slate-700 p-2 disabled:opacity-60"
          >
            {visibilityOptions.map((v) => (
              <option key={v} value={v}>
                {v}
                {!VISIBILITIES.includes(v) ? " (valor guardado, no seleccionable aquí)" : ""}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded bg-slate-700 px-3 py-1">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending || readOnly}
            title={readOnly ? readOnlyReason : undefined}
            className="rounded bg-indigo-600 px-3 py-1 font-semibold disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
