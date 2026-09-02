import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/auth.store";
import {
  acceptInvite,
  savePendingInvite,
  clearPendingInvite,
  translateInviteError,
} from "../features/invites/api";
import { campaignsKey } from "../features/campaigns/hooks";
import { Button } from "../ui/Button";

type AcceptState =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "success"; campaignId: string }
  | { status: "error"; message: string };

const SCREEN_CLASS = "flex min-h-screen items-center justify-center bg-bg text-text";
const CARD_CLASS =
  "w-96 space-y-3 rounded-radius-sm border border-muted bg-surface p-6 text-center";

// /join/:token is deliberately NOT behind ProtectedRoute (App.tsx): "no session yet" is one of
// the three paths this page has to cover on its own, not a case ProtectedRoute can redirect
// away from without losing the token.
//
// This calls acceptInvite directly instead of going through useMutation (features/invites/hooks.ts
// has one, used by InvitePanel.tsx for the DM's create-invite button). A mutation fired from a
// mount effect, combined with React 18 StrictMode's double render/effect pass in dev, orphaned
// the mutation's success state here: the real POST returned 201, but the component never saw
// isSuccess flip and stayed on "Aceptando invitación…" forever. Plain state driven by the
// promise itself doesn't depend on react-query's subscription lifecycle and doesn't have the
// problem — confirmed the mutation-based version reproduced the hang against the real API
// before switching (see docs/07-historial.md).
//
// Acceptance requires an explicit click, on purpose (1.14-fix, CRITICAL): this page used to
// accept from a mount effect with no confirmation at all. A pending invite left in localStorage
// by someone who never came back (nothing cleared it — not logout(), no expiry) got auto-consumed
// by the next unrelated login on that browser, silently joining a stranger to someone else's
// campaign and burning the token before the real invitee could use it. Now, being authenticated
// on /join/:token only shows what's about to happen; nothing is accepted until the user presses
// the button. This also protects the DM who opens their own link just to check it works — they
// see the warning and can leave without joining or burning the link on their players.
export function JoinPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authToken = useAuthStore((s) => s.token);
  const attempted = useRef(false);
  const [state, setState] = useState<AcceptState>({ status: "idle" });

  useEffect(() => {
    if (!authToken) {
      // No session: remember the token where session state already lives so
      // LoginPage/RegisterPage can resume the join once the user comes back authenticated,
      // instead of making them paste the link again. This entry expires on its own
      // (features/invites/api.ts) and logout() clears it too.
      savePendingInvite(token);
    }
  }, [authToken, token]);

  useEffect(() => {
    if (state.status === "success") {
      // The player's own "Mis campañas" list (staleTime: 30s, lib/queryClient.ts) would
      // otherwise still say they're not a member for up to half a minute after they just
      // joined.
      queryClient.invalidateQueries({ queryKey: campaignsKey });
      navigate(`/campaigns/${state.campaignId}`, { replace: true });
    }
  }, [state, navigate, queryClient]);

  const onAccept = () => {
    // Guards a rapid double click the same way the guard used to protect the old mount
    // effect against StrictMode's double invocation: once an attempt has started, a second
    // click is a no-op instead of a second POST.
    if (attempted.current) return;
    attempted.current = true;
    // Consumed the moment it's used to attempt acceptance, whether that succeeds or not — a
    // failed attempt (already-used token) shouldn't keep this key around, and a successful one
    // has nothing left to resume.
    clearPendingInvite();
    setState({ status: "pending" });
    acceptInvite(token)
      .then((res) => setState({ status: "success", campaignId: res.campaignId }))
      .catch((err: unknown) =>
        setState({ status: "error", message: translateInviteError((err as Error).message) }),
      );
  };

  if (!authToken) {
    return (
      <div className={SCREEN_CLASS}>
        <div className={CARD_CLASS}>
          <p>Necesitas iniciar sesión para aceptar esta invitación.</p>
          <p className="text-chrome-sm text-muted">
            Al volver, la invitación se completará sola: no hace falta que pegues el enlace otra
            vez.
          </p>
          <div className="flex justify-center gap-4 text-chrome-sm">
            <Link to="/login" className="text-accent-text">
              Iniciar sesión
            </Link>
            <Link to="/register" className="text-accent-text">
              Crear cuenta
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className={SCREEN_CLASS}>
        <div className={CARD_CLASS}>
          <p className="text-danger-text">{state.message}</p>
          <Link to="/" className="text-accent-text">
            Volver a mis campañas
          </Link>
        </div>
      </div>
    );
  }

  if (state.status === "idle") {
    return (
      <div className={SCREEN_CLASS}>
        <div className={CARD_CLASS}>
          <p>Estás a punto de unirte a una campaña con esta invitación.</p>
          <p className="text-chrome-sm text-muted">
            Aceptar consume el enlace: dejará de funcionar para cualquier otra persona que lo use
            después.
          </p>
          <Button onClick={onAccept} className="w-full">
            Unirse a la campaña
          </Button>
          <Link to="/" className="block text-chrome-sm text-accent-text">
            Cancelar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={SCREEN_CLASS}>
      <p>Aceptando invitación…</p>
    </div>
  );
}
