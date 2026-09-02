import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import { loginSchema, type LoginInput } from "@dnd/shared";
import { login } from "../lib/api";
import { useAuthStore } from "../store/auth.store";
import { peekPendingInvite } from "../features/invites/api";
import { traducirErrorDeAcceso } from "../features/auth/errores";
import { useState } from "react";
import { Button } from "../ui/Button";
import { Field, fieldControlClass } from "../ui/Field";
import { IconoConfirmacion } from "../ui/Iconos";
import { AuthLayout } from "../features/auth/AuthLayout";

export function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  // Fix round 1 (post-1.18b review), Critical 1, fix-of-the-fix: AccountPage.tsx's password
  // form logs the session out THE INSTANT the server accepts the new password (no dead token
  // lingers in localStorage), which means it can no longer keep its own success message on
  // screen — the route guard unmounts it the same render. This is where that message actually
  // gets read instead. First version carried it as react-router navigation state, which broke
  // in the real browser: ProtectedRoute's own bare <Navigate to="/login" replace/> fires a
  // SECOND, state-less history.replaceState a moment later and silently wiped it — caught only
  // by the real Playwright journey (cuenta.spec.ts), never by a unit test with jsdom's
  // MemoryRouter. auth.store.ts's `flash` field instead: not router history, so nothing
  // router-driven can overwrite it. One-shot by convention, not by a timer: cleared below the
  // moment a login actually succeeds, so it never survives into a session it wasn't about.
  const flash = useAuthStore((s) => s.flash);
  const clearFlash = useAuthStore((s) => s.clearFlash);

  const onSubmit = async (data: LoginInput) => {
    try {
      const res = await login(data);
      setAuth(res);
      clearFlash();
      // A pending invite (JoinPage.tsx, saved because there was no session yet) resumes on its
      // own instead of landing on the dashboard: the user shouldn't have to paste the link again.
      const pendingInvite = peekPendingInvite();
      navigate(pendingInvite ? `/join/${pendingInvite}` : "/");
    } catch (e) {
      // Reseño 2026-09-02 (audit A1): the server speaks English and this interface does not.
      setError(traducirErrorDeAcceso(e));
    }
  };

  return (
    <AuthLayout
      title="Entrar"
      lead="Tus campañas, tu mundo y tus secretos, donde los dejaste."
      footer={
        <>
          ¿Todavía sin cuenta?{" "}
          <Link to="/register" className="text-accent-text hover:underline">
            Crear una
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-s4">
        {flash && (
          // role="status" (not "alert"): this is good news, announced politely instead of
          // interrupting — screen-reader users get nothing at all here without it, the same
          // gap error text closes with role="alert" elsewhere in this app.
          <p role="status" className="text-chrome-sm text-accent-text">
            <IconoConfirmacion className="mr-1" />
            {flash}
          </p>
        )}
        <Field label="Correo" error={errors.email?.message}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={fieldControlClass}
            {...register("email")}
          />
        </Field>
        <Field label="Contraseña" error={errors.password?.message}>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className={fieldControlClass}
            {...register("password")}
          />
        </Field>
        {error && (
          <p role="alert" className="text-chrome-sm text-danger-text">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full">
          Entrar
        </Button>
      </form>
    </AuthLayout>
  );
}
