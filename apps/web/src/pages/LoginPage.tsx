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
  // Fix round 1 (post-1.18b review), Critical 1: a one-shot message for the next
  // unauthenticated screen, read here. Carried as a field on auth.store.ts (`flash`) instead
  // of react-router navigation state on purpose — a first version tried navigation state and
  // it broke in the real browser: ProtectedRoute's own bare <Navigate to="/login" replace/>
  // fires a SECOND, state-less history.replaceState a moment later and silently wiped it,
  // caught only by a real Playwright journey, never by a unit test with jsdom's MemoryRouter. A
  // store field isn't router history, so nothing router-driven can overwrite it.
  //
  // Its producer, as of the final review of `ficha/tanda-2-a-5` (Medium #3): AccountPage.tsx's
  // password-change form no longer logs the session out on success (Task 20 dropped that), so
  // it isn't the source. The real one is `useAuthRehydration` (features/auth/hooks.ts) logging
  // this tab out on a 401 from /auth/me — the case is an admin resetting someone else's
  // password: it invalidates the token on every OTHER tab that user had open, and this is the
  // message they see when they land back here. One-shot by convention, not by a timer: cleared
  // below the moment a login actually succeeds, so it never survives into a session it wasn't
  // about.
  const flash = useAuthStore((s) => s.flash);
  const clearFlash = useAuthStore((s) => s.clearFlash);
  // Fix round 1 (Task 10), Critical: un `useEffect` de limpieza en el DESMONTAJE se ejecuta
  // también al MONTAR bajo `React.StrictMode` (monta → efecto → limpieza → efecto de nuevo,
  // `main.tsx` envuelve toda la app en `<React.StrictMode>`), así que el flash se borraba solo
  // con visitar /login y nunca llegaba a verse ni en desarrollo ni en Playwright. El limpiado de
  // "un solo uso, y se calla si el usuario se va sin entrar" vive ahora en `FlashJanitor`
  // (`App.tsx`), que limpia por CAMBIO DE RUTA (cuando `pathname` deja de ser `/login`) en vez de
  // por desmontaje — eso sí es idempotente bajo StrictMode, porque montar dos veces la misma
  // ruta no cambia `pathname`.

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
