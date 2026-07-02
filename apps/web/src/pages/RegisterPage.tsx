import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import { registerSchema, type RegisterInput } from "@dnd/shared";
import { register as registerApi } from "../lib/api";
import { useAuthStore } from "../store/auth.store";
import { useState } from "react";

export function RegisterPage() {
  const { register, handleSubmit, formState: { errors } } =
    useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: RegisterInput) => {
    try {
      const res = await registerApi(data);
      setAuth(res);
      navigate("/");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
      <form onSubmit={handleSubmit(onSubmit)} className="w-80 space-y-4 p-6 bg-slate-800 rounded-lg">
        <h1 className="text-xl font-bold">Crear cuenta</h1>
        <div>
          <label htmlFor="displayName" className="block text-sm">Nombre</label>
          <input id="displayName" className="w-full rounded bg-slate-700 p-2" {...register("displayName")} />
          {errors.displayName && <p className="text-red-400 text-xs">{errors.displayName.message}</p>}
        </div>
        <div>
          <label htmlFor="email" className="block text-sm">Email</label>
          <input id="email" type="email" className="w-full rounded bg-slate-700 p-2" {...register("email")} />
          {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="password" className="block text-sm">Password</label>
          <input id="password" type="password" className="w-full rounded bg-slate-700 p-2" {...register("password")} />
          {errors.password && <p className="text-red-400 text-xs">{errors.password.message}</p>}
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" className="w-full rounded bg-indigo-600 p-2 font-semibold">Register</button>
        <p className="text-xs">¿Ya tienes cuenta? <Link to="/login" className="text-indigo-400">Entra</Link></p>
      </form>
    </div>
  );
}
