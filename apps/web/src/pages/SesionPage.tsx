import { useParams } from "react-router-dom";
import { AppShell, AppHeader, PageHeader } from "../ui/AppShell";
import { MesaDeSesion } from "../features/sessions/MesaDeSesion";
import { useCampaign } from "../features/campaigns/hooks";

// La mesa. Ruta propia porque es una pantalla en la que se está durante horas, no un panel al
// que se asoma uno — y porque así el DM puede tenerla en una pestaña aparte mientras navega el
// mundo en otra, que es exactamente lo que hace hoy con quince pestañas y sin ayuda.
//
// Cabecera de página en `PageHeader` y no un `<h1>` suelto sobre unas migas de pan: es la
// convención del reseño (título, para qué sirve la pantalla, y su filete) y aquí gana además el
// ancho — la banda de estado de la sesión viene justo debajo y las dos leen como una sola pieza.

export function SesionPage() {
  const { id } = useParams<{ id: string }>();
  const { data: campaign } = useCampaign(id ?? "");

  return (
    <AppShell header={<AppHeader />}>
      <PageHeader
        title="La mesa"
        subtitle="Lo que se mira mientras se juega: quién está, qué pasa y qué hay que consultar."
        crumbs={[
          { label: "Mis campañas", to: "/" },
          { label: campaign?.name ?? "Campaña", to: `/campaigns/${id}` },
          { label: "La mesa" },
        ]}
      />
      {id && <MesaDeSesion campaignId={id} />}
    </AppShell>
  );
}
