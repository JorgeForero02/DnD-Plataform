import { useState } from "react";
import { useAuthStore } from "../store/auth.store";
import { CampaignList } from "../features/campaigns/CampaignList";
import { CreateCampaignModal } from "../features/campaigns/CreateCampaignModal";

export function DashboardPage() {
  const { user, logout } = useAuthStore();
  const [creating, setCreating] = useState(false);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Mis campañas</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">{user?.displayName}</span>
          <button
            onClick={() => setCreating(true)}
            className="rounded bg-indigo-600 px-3 py-1 font-semibold"
          >
            Nueva campaña
          </button>
          <button onClick={logout} className="rounded bg-slate-700 px-3 py-1">
            Salir
          </button>
        </div>
      </header>
      <CampaignList />
      {creating && <CreateCampaignModal onClose={() => setCreating(false)} />}
    </div>
  );
}
