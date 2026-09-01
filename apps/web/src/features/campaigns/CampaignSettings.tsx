import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { DeleteButton } from "../../components/DeleteButton";
import { useCampaign, useDeleteCampaign, useUpdateCampaign } from "./hooks";
import { useMyRole } from "./members";
import { CHECKING_PERMISSIONS, RetryPermissions } from "./PermissionStatus";

// Fetches its own campaign (useCampaign shares the query cache and key with
// CampaignDetailPage's own call, so this is not a second network request) instead of
// receiving it as a prop that's only defined once loaded — mounting unconditionally, at the
// same time as MembersPanel and InvitePanel, removes ONE way a consumer of
// useMyRole(campaignId) could join the shared members query on a later render than its
// siblings. It doesn't remove every such way: any future useMyRole consumer that still
// mounts conditionally on some other async value would trip the same React Query
// refetchOnMount behaviour on an already-settled (or already-errored) query, independently
// of this component.
export function CampaignSettings({ campaignId }: { campaignId: string }) {
  const navigate = useNavigate();
  const { data: campaign } = useCampaign(campaignId);
  const {
    role,
    isLoading: roleLoading,
    isError: roleError,
    retry: retryRole,
  } = useMyRole(campaignId);
  const isDM = role === "DM";
  const roleUnresolved = roleLoading || roleError;
  const disabledReason = roleUnresolved
    ? CHECKING_PERMISSIONS
    : !isDM
      ? "Solo el DM puede editar la campaña."
      : undefined;
  // Same gate, worded for the action DeleteButton actually performs — "editar" would be
  // wrong on a control that deletes the campaign, not edits it.
  const deleteDisabledReason = roleUnresolved
    ? CHECKING_PERMISSIONS
    : !isDM
      ? "Solo el DM puede borrar la campaña."
      : undefined;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Seeds the form once per campaign, not on every render: campaign arrives asynchronously
  // (this component is mounted before useCampaign has data), so it can't be a plain useState
  // initializer the way EntityEditor/SessionEditor/CharacterEditor seed from a prop that's
  // already loaded by the time they mount. Guarded by campaign.id so a refetch after saving
  // (same id, new object reference) never stomps on what's already showing — the local state
  // already holds the value that was just sent.
  const seededId = useRef<string | null>(null);
  useEffect(() => {
    if (campaign && seededId.current !== campaign.id) {
      setName(campaign.name);
      setDescription(campaign.description ?? "");
      seededId.current = campaign.id;
    }
  }, [campaign]);

  const update = useUpdateCampaign(campaignId);
  const del = useDeleteCampaign();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      // Both keys always travel, never omitted — emptying the description this way sends
      // "" instead of dropping the key, which is what the brief and updateCampaignSchema
      // (packages/shared) require: omitting a key means "don't touch it".
      await update.mutateAsync({ name, description });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onConfirmDelete = async () => {
    setDeleteError(null);
    try {
      await del.mutateAsync(campaignId);
      navigate("/");
    } catch (err) {
      setDeleteError((err as Error).message);
    }
  };

  if (!campaign) {
    return (
      <div className="rounded bg-slate-800 p-4">
        <h3 className="text-sm font-semibold">Ajustes de la campaña</h3>
        <p className="mt-2 text-slate-400">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="rounded bg-slate-800 p-4">
      <h3 className="text-sm font-semibold">Ajustes de la campaña</h3>
      {/* Readable prose view of the description, independent of the disabled/enabled
          <textarea> below — an empty description must still say "Sin descripción."
          somewhere, and a disabled textarea (opacity-60, unreadable-ish for a player on most
          of this screen) isn't that place. Restored after an earlier draft of this task
          dropped it without noticing; see the fix-round note in task-4-report.md. */}
      <p className="mt-1 text-sm text-slate-300">{campaign.description || "Sin descripción."}</p>
      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        {disabledReason && (
          <p className="rounded bg-slate-700/50 p-2 text-xs text-amber-400">{disabledReason}</p>
        )}
        {roleError && <RetryPermissions onRetry={retryRole} />}
        <div>
          <label htmlFor="campaign-name" className="block text-sm">
            Nombre
          </label>
          <input
            id="campaign-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={roleUnresolved || !isDM}
            className="w-full rounded bg-slate-700 p-2 disabled:opacity-60"
          />
        </div>
        <div>
          <label htmlFor="campaign-description" className="block text-sm">
            Descripción
          </label>
          <textarea
            id="campaign-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={roleUnresolved || !isDM}
            className="w-full rounded bg-slate-700 p-2 disabled:opacity-60"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex items-start justify-between gap-2">
          <div>
            {/* The cascade this warns about is real, not decorative: schema.prisma cascades
                Entity, Session, Character, Invite and CampaignMember (and, through Entity,
                EntityLink/EntityVisibilityGrant/Comment) off Campaign with onDelete:
                Cascade. No counts here — nothing on this screen has them loaded, and the
                brief is explicit that a number not actually on hand must not be invented. */}
            <DeleteButton
              message={`Vas a borrar "${campaign.name}". Se borrarán también sus fichas, sesiones, personajes, invitaciones y miembros. No se puede deshacer.`}
              onConfirm={onConfirmDelete}
              pending={del.isPending}
              disabled={roleUnresolved || !isDM}
              disabledReason={deleteDisabledReason}
            />
            {/* Fix round 2, IMPORTANT B: DeleteButton only ever puts disabledReason in a
                title= attribute — invisible on touch, unread by a screen reader (the exact
                finding from task 1.16 that this project's "disabled, never hidden, reason
                visible on screen" rule comes from). Putting it here too, in text, is what
                actually satisfies that rule for the delete control specifically; the
                "editar" reason above the form fields doesn't cover it because it names a
                different action. */}
            {deleteDisabledReason && (
              <p className="mt-1 text-xs text-amber-400">{deleteDisabledReason}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={update.isPending || roleUnresolved || !isDM}
            className="rounded bg-indigo-600 px-3 py-1 text-sm font-semibold disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
        {deleteError && <p className="text-red-400 text-sm">{deleteError}</p>}
      </form>
    </div>
  );
}
