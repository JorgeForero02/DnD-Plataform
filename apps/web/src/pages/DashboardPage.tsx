import { useState } from "react";
import { useAuthStore } from "../store/auth.store";
import { CampaignList } from "../features/campaigns/CampaignList";
import { CreateCampaignModal } from "../features/campaigns/CreateCampaignModal";
import { Button } from "../ui/Button";

export function DashboardPage() {
  const { user, logout } = useAuthStore();
  const [creating, setCreating] = useState(false);

  return (
    <div className="min-h-screen bg-bg p-8 text-text">
      {/* Fix round 1 (post-1.19b review): pr-12 reserves the top-right corner ThemeToggle
          occupies (fixed, right-2 top-2 — App.tsx). Computed, not measured: the page's own p-8
          right padding put "Salir" close enough to that corner (roughly a 10x6px band) to
          intercept a click meant for the toggle. Reserved locally, on this header, because
          this is the only converted screen the reviewer found the overlap on — every other
          screen's own top-right content sits clear of it already. Reserving it globally in the
          app chrome instead would be a defensible alternative if a future screen puts content
          up there too; left as a decision for whoever hits that, not done speculatively here. */}
      <header className="flex items-center justify-between pr-12">
        <h1 className="text-chrome-2xl font-bold">Mis campañas</h1>
        <div className="flex items-center gap-3">
          <span className="text-chrome-sm text-muted">{user?.displayName}</span>
          <Button variant="primary" onClick={() => setCreating(true)}>
            Nueva campaña
          </Button>
          <Button variant="secondary" onClick={logout}>
            Salir
          </Button>
        </div>
      </header>
      <CampaignList />
      {creating && <CreateCampaignModal onClose={() => setCreating(false)} />}
    </div>
  );
}
