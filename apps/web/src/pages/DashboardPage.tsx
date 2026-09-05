import { useState } from "react";
import { useAuthStore } from "../store/auth.store";
import { Cronicas } from "../features/campaigns/Cronicas";
import { CreateCampaignModal } from "../features/campaigns/CreateCampaignModal";
import { Button } from "../ui/Button";
import { AppShell, AppHeader, PageHeader } from "../ui/AppShell";
import { IconoMas } from "../ui/Iconos";

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
      {/* **«Tus crónicas», no «Mis campañas».** Sale del diagnóstico del reseño: esto es un
          juego, y una campaña es una historia que se retoma, no un proyecto que se administra.
          El subtítulo dice lo que se hace aquí —elegir dónde seguir—, no lo que la aplicación
          guarda. El rótulo viejo estaba en veinte recorridos como señal de «has entrado» y en
          las migajas de cinco pantallas; se renombró en todos, porque un nombre a medias es
          peor que cualquiera de los dos enteros. */}
      <PageHeader
        title="Tus crónicas"
        subtitle="Elige dónde retomar la historia. Cada campaña recuerda dónde la dejasteis."
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            {/* El dibujo va dentro del botón, como en la maqueta. Es `aria-hidden`, así que el
                nombre accesible del botón sigue siendo exactamente «Nueva campaña». */}
            <IconoMas />
            Nueva campaña
          </Button>
        }
      />
      <Cronicas onCrear={() => setCreating(true)} />
      {creating && <CreateCampaignModal onClose={() => setCreating(false)} />}
    </AppShell>
  );
}
