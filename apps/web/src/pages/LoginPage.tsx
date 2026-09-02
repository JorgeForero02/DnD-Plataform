import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import { loginSchema, type LoginInput } from "@dnd/shared";
import { login } from "../lib/api";
import { useAuthStore } from "../store/auth.store";
import { peekPendingInvite } from "../features/invites/api";
import { useState } from "react";
import { Button } from "../ui/Button";
import { Field, fieldControlClass } from "../ui/Field";

export function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: LoginInput) => {
    try {
      const res = await login(data);
      setAuth(res);
      // A pending invite (JoinPage.tsx, saved because there was no session yet) resumes on its
      // own instead of landing on the dashboard: the user shouldn't have to paste the link again.
      const pendingInvite = peekPendingInvite();
      navigate(pendingInvite ? `/join/${pendingInvite}` : "/");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg text-text">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-80 space-y-4 rounded-radius-sm border border-muted bg-surface p-6"
      >
        <h1 className="text-chrome-xl font-bold">Iniciar sesión</h1>
        <Field label="Email" error={errors.email?.message}>
          <input id="email" type="email" className={fieldControlClass} {...register("email")} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <input
            id="password"
            type="password"
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
          Log in
        </Button>
        <p className="text-chrome-xs text-text">
          ¿Sin cuenta?{" "}
          <Link to="/register" className="text-accent-text">
            Regístrate
          </Link>
        </p>
      </form>
    </div>
  );
}
