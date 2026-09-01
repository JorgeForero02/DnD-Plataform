import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DeleteButton } from "../../components/DeleteButton";
import { useAuthStore } from "../../store/auth.store";
import { useRemoveMember } from "./hooks";
import { useMembers, useMyRole } from "./members";
import { CHECKING_PERMISSIONS, RetryPermissions } from "./PermissionStatus";

// Exactly what the server answers (membership.service.ts: "The DM cannot leave their own
// campaign; delete it instead"), translated for the Spanish-language interface — not a
// message this screen invented on its own.
const DM_CANNOT_LEAVE = "El DM no puede salir de su propia campaña; bórrala.";

// requireMember gates every campaign-scoped endpoint before canView is ever consulted
// (entities.service.ts, campaigns.service.ts, and friends), and canView itself returns false
// outright once viewer.role is null (apps/api/src/common/visibility.ts) — PUBLIC included.
// Losing membership is not "PLAYERS-and-below disappear", it's "everything disappears",
// because there is no such thing as a non-member viewer of a campaign yet (docs/05-datos.md:
// "mientras no exista un modo de campaña pública, PUBLIC no amplía nada frente a PLAYERS").
// Both messages below say that plainly instead of the narrower (and false) thing a first
// draft of this screen said.
const KICK_MESSAGE = (displayName: string) =>
  `${displayName} perderá el acceso a esta campaña por completo: al dejar de ser miembro, no verá nada de ella, ni siquiera lo que sea PUBLIC.`;
const LEAVE_MESSAGE =
  "Vas a salir de esta campaña. Perderás el acceso a todo su contenido, incluido lo que sea PUBLIC, y necesitarás una invitación nueva para volver a entrar.";

export function MembersPanel({ campaignId }: { campaignId: string }) {
  const navigate = useNavigate();
  const myUserId = useAuthStore((s) => s.user?.id);
  // Same enabled guard as useMyRole's own internal useMembers call (members.ts): without a
  // user id there's nothing to compare a role against yet, so there's no point racing a
  // request in before rehydration resolves. Both calls share membersKey(campaignId), so this
  // never costs an extra fetch — it only keeps this call from silently dropping a guard the
  // other one was written with on purpose.
  const {
    data: members,
    isLoading,
    isError,
    error,
  } = useMembers(campaignId, { enabled: !!myUserId });
  const {
    role,
    isLoading: roleLoading,
    isError: roleError,
    retry: retryRole,
  } = useMyRole(campaignId);
  const isDM = role === "DM";
  const roleUnresolved = roleLoading || roleError;
  const remove = useRemoveMember(campaignId);
  const [actionError, setActionError] = useState<string | null>(null);

  // useMutation exposes the arguments of whichever call is in flight as `variables` — scoping
  // "is this row's own action pending" to it (instead of the mutation's single shared
  // isPending) keeps kicking one player from also disabling every other row's confirm button
  // and "Salir de la campaña" at the same time.
  const isPendingFor = (userId: string) => remove.isPending && remove.variables === userId;

  const onKick = async (userId: string) => {
    setActionError(null);
    try {
      await remove.mutateAsync(userId);
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  const onLeave = async () => {
    if (!myUserId) return;
    setActionError(null);
    try {
      await remove.mutateAsync(myUserId);
      navigate("/");
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  return (
    <div className="rounded bg-slate-800 p-4">
      <h3 className="text-sm font-semibold">Miembros</h3>
      {roleUnresolved && <p className="mt-1 text-xs text-slate-400">{CHECKING_PERMISSIONS}</p>}
      {roleError && <RetryPermissions onRetry={retryRole} />}
      {isLoading && <p className="mt-2 text-slate-400">Cargando…</p>}
      {isError && <p className="mt-2 text-red-400">{(error as Error).message}</p>}
      <ul className="mt-2 space-y-2">
        {members?.map((m) => (
          <li
            key={m.userId}
            className="flex items-center justify-between gap-2 rounded bg-slate-900 p-2 text-sm"
          >
            <span>
              {m.displayName}{" "}
              <span className="text-xs text-slate-500">({m.role === "DM" ? "DM" : "Jugador"})</span>
            </span>
            {/* Fix round 3, MINOR E (corrects a wrong claim from fix round 2): the render
                gate stays isDM-only — a confirmed non-DM never sees a permanently disabled
                "Expulsar", same as everywhere else a role is fully resolved. But
                roleUnresolved is NOT unreachable while a row exists: useMyRole and this
                component's own useMembers share membersKey(campaignId) (members.ts), and
                TanStack Query keeps the last successful `data` when a later fetch errors —
                the query's status flips to "error" without clearing it. With retry: false
                (lib/queryClient.ts), a single failed refetch (window focus, retryRole(), or
                any other trigger) reaches exactly that state immediately: rows still
                rendered from the retained list, isDM still computed from it, but
                roleUnresolved now true. Disabling in that narrow window — instead of
                offering a click the interface itself no longer trusts its own read of who's
                DM — is what "Comprobando permisos…" above is already telling the DM is true. */}
            {m.role === "PLAYER" && isDM && (
              <DeleteButton
                label="Expulsar"
                confirmLabel="Sí, expulsar"
                message={KICK_MESSAGE(m.displayName)}
                onConfirm={() => onKick(m.userId)}
                pending={isPendingFor(m.userId)}
                disabled={roleUnresolved}
                disabledReason={roleUnresolved ? CHECKING_PERMISSIONS : undefined}
              />
            )}
          </li>
        ))}
      </ul>
      {actionError && <p className="mt-2 text-sm text-red-400">{actionError}</p>}
      <div className="mt-3">
        {roleUnresolved ? (
          // Same disabled-not-hidden treatment as "Expulsar" above, for the same reason: an
          // absent button while the role is unknown reads as "you can never do this", not as
          // "still checking" — the one thing this state must never claim either way.
          <DeleteButton
            label="Salir de la campaña"
            confirmLabel="Sí, salir"
            message={LEAVE_MESSAGE}
            onConfirm={onLeave}
            pending={false}
            disabled
            disabledReason={CHECKING_PERMISSIONS}
          />
        ) : isDM ? (
          // The DM never sees "Salir" at all — only the reason, matching exactly what the
          // server would answer if the button existed and were pressed
          // (membership.service.ts).
          <p className="text-xs text-slate-400">{DM_CANNOT_LEAVE}</p>
        ) : (
          <DeleteButton
            label="Salir de la campaña"
            confirmLabel="Sí, salir"
            message={LEAVE_MESSAGE}
            onConfirm={onLeave}
            pending={myUserId ? isPendingFor(myUserId) : false}
          />
        )}
      </div>
    </div>
  );
}
