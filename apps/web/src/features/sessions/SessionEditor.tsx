import { useState } from "react";
import type { CreateSessionInput, UpdateSessionInput, Visibility } from "@dnd/shared";
import { DeleteButton } from "../../components/DeleteButton";
import { useCreateSession, useDeleteSession, useUpdateSession } from "./hooks";
import type { Session } from "./api";
import { Button } from "../../ui/Button";
import { Field, fieldControlClass } from "../../ui/Field";
import { VisibilityChooser } from "../entities/VisibilityChooser";
import { Dialog } from "../../ui/Dialog";

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

  const deleteSession = useDeleteSession(campaignId);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const onConfirmDelete = async () => {
    if (!session) return;
    setDeleteError(null);
    try {
      await deleteSession.mutateAsync(session.id);
      onClose();
    } catch (err) {
      setDeleteError((err as Error).message);
    }
  };

  // Session has no cascading children in schema.prisma — nothing else disappears with it.
  const deleteMessage = session
    ? `Vas a borrar la sesión "${session.title}". No se puede deshacer.`
    : "";

  // A session can arrive with a visibility this editor doesn't itself offer (a row from before
  // Task 27, a seed, or a direct write — `sessionVisibilitySchema` in `@dnd/shared` now rejects
  // SPECIFIC_PLAYERS/OWNER_DM on write, but never rewrote the ones that already existed).
  // `VisibilityChooser` still shows it, marked and disabled, so it doesn't paint blank with no
  // explanation. Once the DM picks anything else, this option disappears — there is no way back
  // to it from here, which is correct: this form still can't express SPECIFIC_PLAYERS.
  //
  // **Ronda de arreglo 2 — saving WITHOUT touching that radio must not resend it.** Before this
  // fix, `onSubmit` sent whatever `visibility` held on every save, including one that only
  // touched the title — and the server now answers with a 400 for a legacy value nobody chose.
  // A button the server rejects is a defect, so this omits `visibility` from the PATCH whenever
  // its CURRENT value isn't one of this editor's own three radios: that's true exactly when the
  // DM never picked one — picking any of the three replaces the state with a value `VISIBILITIES`
  // does include, so the check below can't mistake a deliberate choice for an untouched legacy
  // value. An absent key means "leave it as-is" (`sessions.service.ts`), the same contract
  // `notes`/`scheduledAt` already use below.
  const conservandoValorHeredado = isEdit && !VISIBILITIES.includes(visibility);

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
    // scheduledAt: updateSessionSchema (Task 6, P3.5) now accepts `null` as "clear the date",
    // distinct from createSessionSchema which does not. So an empty field only sends `null`
    // when editing a session that already had one; creating with an empty field still omits
    // the key (there is no old date to clear), and editing a session that never had a date
    // leaves the key omitted too (nothing changes).
    const clearingScheduledAt = isEdit && !scheduledAt && !!session?.scheduledAt;
    const payload = {
      title,
      ...(conservandoValorHeredado ? {} : { visibility }),
      ...(scheduledAt
        ? { scheduledAt: new Date(scheduledAt).toISOString() }
        : clearingScheduledAt
          ? { scheduledAt: null }
          : {}),
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
    <Dialog open onClose={onClose} title={isEdit ? "Editar sesión" : "Nueva sesión"}>
      <form onSubmit={onSubmit} className="space-y-3">
        {readOnly && (
          <p className="rounded-radius-sm border border-muted bg-bg p-2 text-chrome-xs text-muted">
            {readOnlyReason ?? "Solo puedes ver esta sesión."}
          </p>
        )}
        <Field label="Título">
          <input
            id="session-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={readOnly}
            className={fieldControlClass}
          />
        </Field>
        <Field label="Fecha y hora">
          <input
            id="session-scheduled-at"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            disabled={readOnly}
            className={fieldControlClass}
          />
        </Field>
        <Field label="Notas">
          <textarea
            id="session-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={readOnly}
            className={fieldControlClass}
            rows={3}
          />
        </Field>
        <VisibilityChooser
          value={visibility}
          onChange={setVisibility}
          disabled={readOnly}
          niveles={VISIBILITIES}
        />
        {error && <p className="text-chrome-sm text-danger-text">{error}</p>}
        <div className="flex items-center justify-between gap-2">
          {isEdit && (
            <DeleteButton
              message={deleteMessage}
              onConfirm={onConfirmDelete}
              pending={deleteSession.isPending}
              disabled={readOnly}
              disabledReason={readOnlyReason}
            />
          )}
          <div className="flex flex-1 justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={pending || readOnly}
              title={readOnly ? readOnlyReason : undefined}
            >
              Guardar
            </Button>
          </div>
        </div>
        {deleteError && <p className="text-chrome-sm text-danger-text">{deleteError}</p>}
      </form>
    </Dialog>
  );
}
