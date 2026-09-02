import { useState } from "react";
import { useMyRole } from "../campaigns/members";
import { CHECKING_PERMISSIONS, RetryPermissions } from "../campaigns/PermissionStatus";
import { useCreateInvite } from "./hooks";
import { translateInviteError } from "./api";
import { Button } from "../../ui/Button";
import { Field, fieldControlClass } from "../../ui/Field";
import { Panel } from "../../ui/Panel";

export function InvitePanel({ campaignId }: { campaignId: string }) {
  const create = useCreateInvite(campaignId);
  const {
    role,
    isLoading: roleLoading,
    isError: roleError,
    retry: retryRole,
  } = useMyRole(campaignId);
  const isDM = role === "DM";
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Generating an invite is DM-only on the server (invites.service.ts, requireDM) — this is
  // honesty, not the enforcement: a player who forces the click still gets the server's 403,
  // this only stops the interface from offering an action it knows will fail. Disabled, not
  // hidden, and consistently so across the four spots this task touches (sessions, characters,
  // entities, invites): a hidden button leaves a player thinking the feature doesn't exist at
  // all, while a disabled one with a reason teaches the permission model. While the role is
  // still unknown (own user id not rehydrated yet, the members list in flight, or the members
  // request failed — arreglo 4 of 1.15-fix: a failed request must read exactly like "still
  // loading", never like "confirmed not the DM", so a legitimate DM isn't told they can't
  // generate invitations on their own campaign) this also disables rather than showing an
  // enabled button that would offer a doomed action, or hiding it and flickering once the real
  // role arrives.
  const roleUnresolved = roleLoading || roleError;
  const disabledReason = roleUnresolved
    ? CHECKING_PERMISSIONS
    : !isDM
      ? "Solo el DM de la campaña puede generar invitaciones."
      : undefined;

  const link = create.data ? `${window.location.origin}/join/${create.data.token}` : null;

  const onGenerate = () => {
    setCopyError(null);
    setCopied(false);
    create.mutate();
  };

  const onCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setCopyError(null);
    } catch {
      // The clipboard can be blocked by browser permissions; a "copiado" that lied would be
      // worse than no button at all, so the link stays visible and the failure is shown.
      setCopied(false);
      setCopyError("No se pudo copiar. Copia el enlace manualmente.");
    }
  };

  return (
    <Panel tone="chrome">
      <h3 className="text-chrome-sm font-semibold">Invitar jugador</h3>
      <p className="mt-1 text-chrome-xs text-muted">
        Cada enlace sirve para una sola persona: si quieres invitar a varios jugadores, genera un
        enlace nuevo para cada uno.
      </p>
      <Button
        onClick={onGenerate}
        disabled={create.isPending || !!disabledReason}
        title={disabledReason}
        className="mt-3"
      >
        Generar invitación
      </Button>
      {disabledReason && <p className="mt-1 text-chrome-xs text-muted">{disabledReason}</p>}
      {roleError && <RetryPermissions onRetry={retryRole} />}
      {create.isError && (
        <p className="mt-2 text-chrome-sm text-danger-text">
          {translateInviteError((create.error as Error).message)}
        </p>
      )}
      {link && (
        <div className="mt-3">
          {/* Server has no revocation for a link that's already out (docs/06-pendientes.md):
              generating a new one leaves the old token valid and unlisted, so the DM needs to
              know pressing this button again is not a "refresh". Fix round 1 (post-1.19b
              review): this is the only irreversible-consequence warning left in the product —
              it had gone text-muted, identical in size and colour to the purely explanatory
              paragraph below it, and read as help text instead of a warning. --danger-text
              plus the bordered-box treatment the read-only banners kept (not a new "warning"
              token — that's a separate decision the author is making right now, see the
              report) puts it back on a different visual register from ordinary prose. */}
          <p className="rounded-radius-sm border border-danger bg-bg p-2 text-chrome-xs text-danger-text">
            Generar otro enlace no anula este ni los anteriores: todos siguen siendo válidos hasta
            que alguien los use.
          </p>
          <Field label="Enlace de invitación">
            <input
              id="invite-link"
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className={`mt-2 ${fieldControlClass}`}
            />
          </Field>
          <Button type="button" variant="secondary" onClick={onCopy} className="mt-2">
            Copiar enlace
          </Button>
          {copied && <p className="mt-1 text-chrome-xs text-accent-text">Copiado.</p>}
          {copyError && <p className="mt-1 text-chrome-xs text-danger-text">{copyError}</p>}
        </div>
      )}
    </Panel>
  );
}
