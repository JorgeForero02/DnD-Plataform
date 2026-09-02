import { useParams } from "react-router-dom";
import { AppShell, AppHeader, Breadcrumbs } from "../ui/AppShell";
import { MesaDeSesion } from "../features/sessions/MesaDeSesion";
import { useCampaign } from "../features/campaigns/hooks";

// La mesa. Ruta propia porque es una pantalla en la que se está durante horas, no un panel al
// que se asoma uno — y porque así el DM puede tenerla en una pestaña aparte mientras navega el
// mundo en otra, que es exactamente lo que hace hoy con quince pestañas y sin ayuda.

export function SesionPage() {
  const { id } = useParams<{ id: string }>();
  const { data: campaign } = useCampaign(id ?? "");

  return (
    <AppShell header={<AppHeader />}>
      <Breadcrumbs
        items={[
          { label: "Mis campañas", to: "/" },
          { label: campaign?.name ?? "Campaña", to: `/campaigns/${id}` },
          { label: "La mesa" },
        ]}
      />
      <h1 className="mb-s4 mt-s2 font-title text-chrome-lg text-text">La mesa</h1>
      {id && <MesaDeSesion campaignId={id} />}
    </AppShell>
  );
}
