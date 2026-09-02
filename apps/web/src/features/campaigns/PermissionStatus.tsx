// Shared "still checking permissions" UI for every useMyRole consumer in the app:
// CampaignDetailPage.tsx's three tabs, InvitePanel.tsx, CampaignSettings.tsx and
// MembersPanel.tsx use CHECKING_PERMISSIONS and RetryPermissions from here; LinksPanel.tsx
// and CommentThread.tsx use only CHECKING_PERMISSIONS — they don't offer a retry, a
// deliberate asymmetry from 1.15-fix documented on their own useMyRole calls, not an
// oversight here. Fix round 2 (1.17d review): this used to be duplicated in four places;
// now the literal and the button exist exactly once.
//
// Same wording and same choice everywhere it's used: disabled, not hidden — a hidden button
// reads as "this doesn't exist"; a disabled one with a reason reads as "this exists, but not
// for you right now" — and while the role/identity is still unknown (rehydration or the
// members list in flight or failed — arreglo 4 of 1.15-fix treats a failed request exactly
// like "still loading", never like "confirmed not a member") this also disables rather than
// guessing, to avoid offering an action that would fail once the real answer arrives. None of
// this is enforcement: the server (requireDM/requireEditable, apps/api/src/common) rejects
// the same request exactly the same way whether or not the button was ever disabled.
//
// CHECKING_PERMISSIONS is a plain string constant, which eslint-plugin-react-refresh's
// allowConstantExport option (eslint.config.mjs) exempts from "only export components";
// RetryPermissions is itself a component, so exporting both from one .tsx doesn't trip
// react-refresh/only-export-components either.
export const CHECKING_PERMISSIONS = "Comprobando permisos…";

// Arreglo 4 (1.15-fix): a small, reusable retry affordance for when useMyRole's `isError` is
// true — the "still don't know" state must have a way out that doesn't depend on
// refetchOnWindowFocus happening to fire.
export function RetryPermissions({ onRetry }: { onRetry: () => void }) {
  return (
    <button
      type="button"
      onClick={onRetry}
      className="ml-2 text-chrome-xs text-accent-text underline"
    >
      Reintentar
    </button>
  );
}
