import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import {
  updateDisplayNameSchema,
  changePasswordSchema,
  type UpdateDisplayNameInput,
  type ChangePasswordInput,
} from "@dnd/shared";
import * as authApi from "../features/auth/api";
import { useAuthStore } from "../store/auth.store";
import { ApiError } from "../lib/api";
import { Button } from "../ui/Button";
import { Field, fieldControlClass } from "../ui/Field";
import { Panel } from "../ui/Panel";

// Task 1.18b — reachable from the app chrome (DashboardPage.tsx's header, "Cuenta"). Two
// independent forms, two independent panels: a failure in one has nothing to say about the
// other, and PATCH /auth/me and PATCH /auth/password are two separate requests server-side too
// (auth.controller.ts).
export function AccountPage() {
  return (
    <div className="min-h-screen bg-bg p-8 text-text">
      <Link to="/" className="text-chrome-sm text-accent-text">
        &larr; Mis campañas
      </Link>
      <h1 className="mt-2 text-chrome-2xl font-bold">Cuenta</h1>
      <div className="mt-4 flex max-w-sm flex-col gap-4">
        <DisplayNameForm />
        <PasswordForm />
      </div>
    </div>
  );
}

// Fix round 1 (post-1.18b review), Important 4: both PATCH /auth/me and PATCH /auth/password
// share AUTH_RATE_LIMIT (5/min per IP, apps/api/src/common/rate-limit.constants.ts), so both
// forms below can earn a 429 — Nest/Throttler's raw message
// ("ThrottlerException: Too Many Requests") never tells a person to wait, and doesn't even say
// what "too many" was of. Everything else server-side passes through unmapped, same as
// LoginPage/RegisterPage (docs/04-convenciones.md precedent) — inventing a translation for a
// message this screen doesn't specifically know about would risk hiding the real cause.
function translateAccountError(e: unknown): string {
  if (e instanceof ApiError && e.status === 429) {
    return "Demasiados intentos. Espera un minuto y vuelve a probar.";
  }
  return (e as Error).message;
}

// The password form's own catch also has to translate the ONE error only it can produce: a
// wrong current password. auth.service.ts's raw "Current password is incorrect" is English on
// a Spanish screen (docs/04-convenciones.md); 401 here can only mean that (a bad/expired token
// would already have been caught by useAuthRehydration before this screen ever rendered), so
// the mapping is unambiguous — unlike a generic 401, which InvitePanel.tsx etc. never remap.
function translateChangePasswordError(e: unknown): string {
  if (e instanceof ApiError && e.status === 401) {
    return "La contraseña actual no es correcta.";
  }
  return translateAccountError(e);
}

function DisplayNameForm() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateDisplayNameInput>({
    resolver: zodResolver(updateDisplayNameSchema),
    // Fix round 1 (post-1.18b review), Important 5: `defaultValues` is captured ONCE at mount.
    // Opening /account directly (a reload, a bookmark) means `user` is still null at that
    // instant — it only arrives later from rehydration (features/auth/hooks.ts) — and RHF
    // never re-initialises from a changed defaultValues. `values` (unlike defaultValues) DOES
    // re-sync the form whenever this expression's result changes, so the field fills in the
    // moment rehydration resolves instead of staying permanently blank.
    values: { displayName: user?.displayName ?? "" },
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const onSubmit = async (data: UpdateDisplayNameInput) => {
    setError(null);
    setSaved(false);
    try {
      const updated = await authApi.updateDisplayName(data);
      setUser(updated);
      setSaved(true);
    } catch (e) {
      setError(translateAccountError(e));
    }
  };

  return (
    <Panel tone="chrome">
      <h2 className="text-chrome-sm font-semibold">Nombre visible</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-3">
        <Field label="Nombre" error={errors.displayName?.message}>
          <input className={fieldControlClass} {...register("displayName")} />
        </Field>
        {error && (
          <p role="alert" className="text-chrome-sm text-danger-text">
            {error}
          </p>
        )}
        {/* No success token (see tokens.css): --accent-text plus a check glyph and the word
            carries "this worked", the same register the invite link's "Copiado." now uses.
            role="status": announced politely instead of silently — the same gap error text
            closes with role="alert" above. */}
        {saved && (
          <p role="status" className="text-chrome-sm text-accent-text">
            <span aria-hidden="true">✓ </span>
            Nombre actualizado.
          </p>
        )}
        <Button type="submit">Guardar nombre</Button>
      </form>
    </Panel>
  );
}

function PasswordForm() {
  const logout = useAuthStore((s) => s.logout);
  const setFlash = useAuthStore((s) => s.setFlash);
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: ChangePasswordInput) => {
    setError(null);
    try {
      await authApi.changePassword(data);
      // Fix round 1 (post-1.18b review), Critical 1: the server has ALREADY invalidated every
      // token issued before this change by the time this resolves (User.passwordChangedAt,
      // docs/07-historial.md 1.18a) — the previous version deferred logout() to a button click
      // and left the dead token sitting in localStorage AND in the store until then, so
      // clicking "← Mis campañas" (still rendered above this form), or the browser's back
      // button, sent a real request with a token the server had already killed: useCampaigns
      // fired, got a 401 nothing reacted to (useAuthRehydration only ever checks a 401 on
      // rehydration, when `user` is still null — it was not), and CampaignList rendered the
      // raw server error. logout() now runs THE INSTANT the request succeeds, not on a later
      // click — dnd_token is out of localStorage (and the store, and the query cache —
      // auth.store.ts's logout(), Critical 2) before this function returns.
      //
      // That also means this component can't keep the confirmation on screen any longer: the
      // moment `token` goes null, ProtectedRoute (wrapping /account, App.tsx) swaps this whole
      // tree for <Navigate to="/login"/> on the very next render — there is no safe window left
      // to show a message FROM here. Fix-of-the-fix (see auth.store.ts's `flash` field for the
      // full story): the message first travelled as react-router navigation state, which broke
      // in the REAL browser — ProtectedRoute's own bare <Navigate to="/login" replace/> fired a
      // SECOND, state-less history.replaceState a moment after this one and silently wiped it,
      // something only a real Playwright journey against a real browser caught (confirmed with
      // a throwaway debug spec: three navigations to /login, the last carrying no state) — a
      // unit test with jsdom's MemoryRouter never exercises that race at all. setFlash() writes
      // to the auth store instead: not router history, so nothing router-driven can overwrite
      // it, and LoginPage.tsx reads it directly.
      setFlash("Contraseña actualizada. Inicia sesión otra vez con tu contraseña nueva.");
      logout();
      navigate("/login", { replace: true });
    } catch (e) {
      setError(translateChangePasswordError(e));
    }
  };

  return (
    <Panel tone="chrome">
      <h2 className="text-chrome-sm font-semibold">Contraseña</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-3">
        <Field label="Contraseña actual" error={errors.currentPassword?.message}>
          <input type="password" className={fieldControlClass} {...register("currentPassword")} />
        </Field>
        {/* The rules say themselves BEFORE the server rejects anything (the brief's own words)
            — changePasswordSchema (@dnd/shared) requires 8-100 characters. */}
        <Field
          label="Contraseña nueva"
          hint="Al menos 8 caracteres."
          error={errors.newPassword?.message}
        >
          <input type="password" className={fieldControlClass} {...register("newPassword")} />
        </Field>
        {error && (
          <p role="alert" className="text-chrome-sm text-danger-text">
            {error}
          </p>
        )}
        <Button type="submit">Cambiar contraseña</Button>
      </form>
    </Panel>
  );
}
