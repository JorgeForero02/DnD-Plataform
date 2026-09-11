import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  updateDisplayNameSchema,
  changePasswordSchema,
  type UpdateDisplayNameInput,
  type ChangePasswordInput,
  adminPasswordResetSchema,
  type AdminPasswordResetInput,
} from "@dnd/shared";
import * as authApi from "../features/auth/api";
import { useAuthStore } from "../store/auth.store";
import { ApiError } from "../lib/api";
import { Button } from "../ui/Button";
import { Field, fieldControlClass } from "../ui/Field";
import { Panel } from "../ui/Panel";
import { AjusteDeOrnamento } from "../features/auth/AjusteDeOrnamento";
import { AppShell, AppHeader, PageHeader } from "../ui/AppShell";
import { IconoConfirmacion } from "../ui/Iconos";

// Task 1.18b — reachable from the app chrome (DashboardPage.tsx's header, "Cuenta"). Two
// independent forms, two independent panels: a failure in one has nothing to say about the
// other, and PATCH /auth/me and PATCH /auth/password are two separate requests server-side too
// (auth.controller.ts).
// C5 (2026-09-04) — **esta pantalla estaba fuera del armazón.** La auditoría del 2026-09-04 la
// contó entre las tres huérfanas: sin cabecera, sin logotipo y sin migas, con un `←` de texto
// como única salida. Un `←` no es navegación; es lo que se pone cuando no hay ninguna. Ahora
// entra en `AppShell` como cualquier otra pantalla con sesión, y la vuelta la dan las migas,
// que dicen dónde estás además de por dónde volver. El título pasa a `font-title`: era el
// `font-bold` del sistema mientras `PageHeader` pinta en Marcellus todo título estructural, así
// que esta pantalla hablaba con una voz que no es ninguna de las cuatro.
export function AccountPage() {
  const { user, logout } = useAuthStore();
  return (
    <AppShell header={<AppHeader userName={user?.displayName} onLogout={logout} />}>
      <PageHeader
        title="Cuenta"
        subtitle="Tu nombre en la mesa, tu contraseña y cómo se ve la pantalla."
        crumbs={[{ label: "Tus crónicas", to: "/" }, { label: "Cuenta" }]}
      />
      <div className="flex max-w-sm flex-col gap-4">
        <DisplayNameForm />
        <PasswordForm />
        {/* Ficha D8 (D-CF-18): sin servicio de correo, la contraseña olvidada la reinicia un
            administrador. El bloque solo se ofrece a quien el servidor dice que lo es; la
            autorización de verdad es `AdminGuard`, y a un impostor le contestaría 403. */}
        {user?.isAdmin && <AdminPasswordResetForm />}
        {/* U7: el ornamento se puede apagar. Va aquí y no en el conmutador de tema porque no es un
            tema —no cambia ningún color— y mezclarlos habría dado un control de cuatro estados que
            no dice qué hace ninguno. */}
        <AjusteDeOrnamento />
      </div>
    </AppShell>
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
        {/* No success token (see tokens.css): --accent-text más la marca de visto y la palabra
            cargan con el "esto ha funcionado", el mismo registro que el "Copiado." del enlace de
            invitación. Q1: el visto se dibuja (ui/Iconos.tsx), ya no es un glifo de fuente.
            role="status": announced politely instead of silently — the same gap error text
            closes with role="alert" above. */}
        {saved && (
          <p role="status" className="text-chrome-sm text-accent-text">
            <IconoConfirmacion className="mr-1" />
            Nombre actualizado.
          </p>
        )}
        <Button type="submit">Guardar nombre</Button>
      </form>
    </Panel>
  );
}

function PasswordForm() {
  const setToken = useAuthStore((s) => s.setToken);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const onSubmit = async (data: ChangePasswordInput) => {
    setError(null);
    setSaved(false);
    try {
      const { token } = await authApi.changePassword(data);
      // Task 20 — the server invalidates every token issued before this change
      // (User.passwordChangedAt), but the RESPONSE now carries a fresh one, signed to work
      // immediately (auth.service.ts's explicit `iat`, one second past passwordChangedAt).
      // Fix round 1 (post-1.18b review) used to log the caller out here and send them back to
      // /login, because the old response had nothing to keep them signed in WITH — that
      // constraint is gone now, so this adopts the fresh token instead (setToken(), the
      // setAuth-shaped action for a response with no `user`) and stays on /account with an
      // inline confirmation, the same pattern DisplayNameForm already uses above.
      setToken(token);
      setSaved(true);
      reset();
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
        {saved && (
          <p role="status" className="text-chrome-sm text-accent-text">
            <IconoConfirmacion className="mr-1" />
            Contraseña actualizada.
          </p>
        )}
        <Button type="submit">Cambiar contraseña</Button>
      </form>
    </Panel>
  );
}

/**
 * Reinicio de contraseña de OTRA cuenta, solo para un administrador (ficha D8, D-CF-18). Pone una
 * temporal; la persona entra con ella y la cambia en su propia cuenta con el formulario de arriba.
 * El servidor caduca sus tokens anteriores, así que si estaba dentro, sale.
 */
function AdminPasswordResetForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdminPasswordResetInput>({ resolver: zodResolver(adminPasswordResetSchema) });
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  const onSubmit = async (data: AdminPasswordResetInput) => {
    setError(null);
    setHecho(null);
    try {
      await authApi.adminPasswordReset(data);
      setHecho(data.email);
      reset();
    } catch (e) {
      setError(translateAccountError(e));
    }
  };

  return (
    <Panel tone="chrome">
      <h2 className="text-chrome-sm font-semibold">Reiniciar la contraseña de una cuenta</h2>
      <p className="mt-1 text-chrome-xs text-muted">
        Para quien la haya olvidado. Le pones una temporal, entra con ella y la cambia aquí mismo.
        Su sesión abierta, si la tenía, se cierra.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-3">
        <Field label="Correo de la cuenta" error={errors.email?.message}>
          <input type="email" className={fieldControlClass} {...register("email")} />
        </Field>
        <Field
          label="Contraseña temporal"
          hint="Al menos 8 caracteres. Dísela en persona, no por escrito."
          error={errors.temporaryPassword?.message}
        >
          <input type="text" className={fieldControlClass} {...register("temporaryPassword")} />
        </Field>
        {error && (
          <p role="alert" className="text-chrome-sm text-danger-text">
            {error}
          </p>
        )}
        {hecho && (
          <p role="status" className="flex items-center gap-1 text-chrome-sm text-accent-text">
            <IconoConfirmacion className="h-[1em] w-[1em]" /> Temporal puesta a {hecho}.
          </p>
        )}
        <Button type="submit">Poner la temporal</Button>
      </form>
    </Panel>
  );
}
