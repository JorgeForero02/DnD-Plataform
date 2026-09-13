import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import { registerSchema, type RegisterInput } from "@dnd/shared";
import { register as registerApi } from "../lib/api";
import { useAuthStore } from "../store/auth.store";
import { peekPendingInvite } from "../features/invites/api";
import { traducirErrorDeAcceso } from "../features/auth/errores";
import { useState } from "react";
import { Button } from "../ui/Button";
import { Field, fieldControlClass } from "../ui/Field";
import { IconoMas } from "../ui/Iconos";
import { AuthLayout } from "../features/auth/AuthLayout";

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
      // Same as LoginPage: a pending invitation resumes instead of dropping you on the
      // dashboard with no idea what happened to the link you clicked.
      const pendingInvite = peekPendingInvite();
      navigate(pendingInvite ? `/join/${pendingInvite}` : "/");
    } catch (e) {
      setError(traducirErrorDeAcceso(e));
    }
  };

  return (
    <AuthLayout
      title="Crear cuenta"
      lead="Para dirigir tu mesa o para sentarte en ella."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-accent-text hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-s4">
        <Field label="Nombre" error={errors.displayName?.message}>
          <input
            id="displayName"
            autoComplete="nickname"
            className={fieldControlClass}
            {...register("displayName")}
          />
        </Field>
        <Field label="Correo" error={errors.email?.message}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={fieldControlClass}
            {...register("email")}
          />
        </Field>
        <Field
          label="Contraseña"
          error={errors.password?.message}
          hint="Al menos 8 caracteres. No hay servicio de correo todavía, así que apúntala: hoy no se puede recuperar."
        >
          <input
            id="password"
            type="password"
            autoComplete="new-password"
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
          <IconoMas />
          Crear cuenta
        </Button>
      </form>
    </AuthLayout>
  );
}
