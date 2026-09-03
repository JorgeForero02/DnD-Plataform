import { useState } from "react";
import { useAuthStore } from "../store/auth.store";
import { CampaignList } from "../features/campaigns/CampaignList";
import { CreateCampaignModal } from "../features/campaigns/CreateCampaignModal";
import { Button } from "../ui/Button";
import { AppShell, AppHeader, PageHeader } from "../ui/AppShell";
import { IconoMas } from "../features/campaigns/iconosDeSeccion";

// Reseño 2026-09-02 — audit B3 and C1. This screen used to own its own ad-hoc header (title
// on the left, four unrelated controls jammed on the right, including "Salir" at the same
// visual weight as everything else) and then dropped ~700px of empty page below two bars.
// The global chrome now lives in AppHeader, where it is the same on every screen, and this
// page is left holding only what is actually its own: your campaigns.

export function DashboardPage() {
  const { user, logout } = useAuthStore();
  const [creating, setCreating] = useState(false);

  return (
    <AppShell header={<AppHeader userName={user?.displayName} onLogout={logout} />}>
      <PageHeader
        title="Mis campañas"
        subtitle="Cada campaña guarda su mundo, sus sesiones y sus personajes, con sus propios secretos."
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            {/* El dibujo va dentro del botón, como en la maqueta. Es `aria-hidden`, así que el
                nombre accesible del botón sigue siendo exactamente «Nueva campaña». */}
            <IconoMas />
            Nueva campaña
          </Button>
        }
      />
      <CampaignList onCreate={() => setCreating(true)} />
      {creating && <CreateCampaignModal onClose={() => setCreating(false)} />}
    </AppShell>
  );
}
