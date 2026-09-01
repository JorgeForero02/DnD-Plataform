import { useState } from "react";

// Shared irreversible-action control for the three editors (entity, session, character).
// Deliberately not window.confirm: the native dialog is awkward to drive from jsdom and from
// Playwright, and this is the one action in the app where the test matters more than
// anywhere else (task 1.16). A plain component state plus two buttons is all that's needed,
// and it's the same shape everywhere this action appears.
//
// "disabled" mirrors exactly the same permission the editor itself is already gated on
// (readOnly/readOnlyReason from CampaignDetailPage.tsx): editing and deleting an entity or a
// character are both DM-or-creator/owner on the server, and editing and deleting a session are
// both DM-only, so no separate permission check is computed here — see EntityEditor.tsx,
// SessionEditor.tsx and CharacterEditor.tsx. Disabled, never hidden, with the reason visible,
// same choice as the rest of the interface: if this control disappeared, the server would
// reject the DELETE exactly the same way.
export function DeleteButton({
  message,
  onConfirm,
  pending,
  disabled,
  disabledReason,
}: {
  // Full sentence explaining what disappears — including cascade effects when there are any
  // (schema.prisma's onDelete: Cascade) — shown before the irreversible click, not after.
  message: string;
  onConfirm: () => void;
  pending: boolean;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  // Arreglo 4 (1.16-fix): `confirming` is local state and outlives a permission change. If a
  // background refetch of useMyRole fails while the confirmation dialog is open, `disabled`
  // flips to true but the dialog itself would otherwise stay open with the red button still
  // reacting only to `pending`. Derive whether the dialog shows from both — never render it
  // once `disabled` is true, no matter what `confirming` still holds — instead of syncing
  // state in an effect.
  const showingConfirm = confirming && !disabled;

  if (showingConfirm) {
    return (
      <div className="w-full rounded border border-red-900 bg-red-950/40 p-3 text-sm">
        <p className="text-red-300">{message}</p>
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded bg-slate-700 px-3 py-1"
          >
            No, cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending || disabled}
            className="rounded bg-red-700 px-3 py-1 font-semibold disabled:opacity-50"
          >
            Sí, borrar definitivamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      className="rounded border border-red-800 px-3 py-1 text-sm text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
    >
      Borrar
    </button>
  );
}
