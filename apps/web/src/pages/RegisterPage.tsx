import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import { registerSchema, type RegisterInput } from "@dnd/shared";
import { register as registerApi } from "../lib/api";
import { useAuthStore } from "../store/auth.store";
import { peekPendingInvite } from "../features/invites/api";
import { useState } from "react";
import { Button } from "../ui/Button";
import { Field, fieldControlClass } from "../ui/Field";

export function RegisterPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: RegisterInput) => {
    try {
      const res = await registerApi(data);
      setAuth(res);
      // Same resume as LoginPage.tsx: a player who registered from a /join link lands in the
      // campaign, not the dashboard.
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
        <h1 className="text-chrome-xl font-bold">Crear cuenta</h1>
        <Field label="Nombre" error={errors.displayName?.message}>
          <input id="displayName" className={fieldControlClass} {...register("displayName")} />
        </Field>
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
          Register
        </Button>
        <p className="text-chrome-xs text-text">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-accent-text">
            Entra
          </Link>
        </p>
      </form>
    </div>
  );
}
