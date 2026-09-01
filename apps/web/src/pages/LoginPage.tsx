import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import { loginSchema, type LoginInput } from "@dnd/shared";
import { login } from "../lib/api";
import { useAuthStore } from "../store/auth.store";
import { peekPendingInvite } from "../features/invites/api";
import { useState } from "react";

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
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-80 space-y-4 p-6 bg-slate-800 rounded-lg"
      >
        <h1 className="text-xl font-bold">Iniciar sesión</h1>
        <div>
          <label htmlFor="email" className="block text-sm">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="w-full rounded bg-slate-700 p-2"
            {...register("email")}
          />
          {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="password" className="block text-sm">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="w-full rounded bg-slate-700 p-2"
            {...register("password")}
          />
          {errors.password && <p className="text-red-400 text-xs">{errors.password.message}</p>}
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" className="w-full rounded bg-indigo-600 p-2 font-semibold">
          Log in
        </button>
        <p className="text-xs">
          ¿Sin cuenta?{" "}
          <Link to="/register" className="text-indigo-400">
            Regístrate
          </Link>
        </p>
      </form>
    </div>
  );
}
