import { useAuthStore } from "../store/auth.store";

export function DashboardPage() {
  const { user, logout } = useAuthStore();
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Mis campañas</h1>
        <button onClick={logout} className="rounded bg-slate-700 px-3 py-1">Salir</button>
      </header>
      <p className="mt-4 text-slate-400">
        Bienvenido{user ? `, ${user.displayName}` : ""}. Aquí irán tus campañas (Fase 1).
      </p>
    </div>
  );
}
