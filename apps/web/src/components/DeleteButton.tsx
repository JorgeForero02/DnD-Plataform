import { useState } from "react";
import { Button } from "../ui/Button";

// Shared irreversible-action control. Started with the three editors (entity, session,
// character, task 1.16); 1.17d added two more call sites that aren't deletes at all —
// CampaignSettings.tsx's "Borrar" and MembersPanel.tsx's "Expulsar"/"Salir de la campaña" —
// via the `label`/`confirmLabel` props below. Deliberately not window.confirm: the native
// dialog is awkward to drive from jsdom and from Playwright, and this is the kind of action
// in the app where the test matters more than anywhere else (task 1.16). A plain component
// state plus two buttons is all that's needed, and it's the same shape everywhere this
// pattern appears.
//
// "disabled" mirrors exactly the same permission the caller has already worked out for
// itself (readOnly/readOnlyReason from CampaignDetailPage.tsx for the three editors;
// roleUnresolved/isDM from CampaignSettings.tsx and MembersPanel.tsx for the other two) — no
// separate permission check is computed here. Every caller is expected to keep to the same
// rule this component exists to make easy: disabled, never hidden, with the reason visible —
// if this control disappeared, the server would reject the request exactly the same way.
export function DeleteButton({
  message,
  onConfirm,
  pending,
  disabled,
  disabledReason,
  label = "Borrar",
  confirmLabel = "Sí, borrar definitivamente",
}: {
  // Full sentence explaining what disappears — including cascade effects when there are any
  // (schema.prisma's onDelete: Cascade) — shown before the irreversible click, not after.
  message: string;
  onConfirm: () => void;
  pending: boolean;
  disabled?: boolean;
  disabledReason?: string;
  // 1.17d: the campaign's members panel reuses this same confirm-in-place mechanism for
  // "Expulsar" and "Salir de la campaña" — neither of which deletes anything. Defaults keep
  // every existing caller (entity/session/character) exactly as it read before.
  label?: string;
  confirmLabel?: string;
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
      <div className="w-full rounded-radius-sm border border-danger bg-surface p-3 text-chrome-sm">
        <p className="text-danger-text">{message}</p>
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>
            No, cancelar
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={pending || disabled}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="danger"
      onClick={() => setConfirming(true)}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
    >
      {label}
    </Button>
  );
}
