import { useState } from "react";
import { CabeceraDeSeccion } from "../entities/CabeceraDeSeccion";
import { CHECKING_PERMISSIONS, RetryPermissions } from "../campaigns/PermissionStatus";
import { useMyRole } from "../campaigns/members";
import { Button } from "../../ui/Button";
import { EmptyState } from "../../ui/Collection";
import { CampaignItemEditor } from "./CampaignItemEditor";
import { FilaDeObjeto } from "./FilaDeObjeto";
import { ItemDetail } from "./ItemDetail";
import { useCampaignItems } from "./hooks";
import type { CampaignItem } from "./api";

// Carril B2 — el punto de montaje único del catálogo de objetos, calcado del molde de
// `features/rules/PanelDeReglas.tsx`: un solo componente exportado que recibe `campaignId` por
// props, para que el orquestador lo cuelgue de la navegación sin tocar nada más de este carril.
//
// **A diferencia de `PanelDeReglas`, esta pantalla no es solo del DM.** El servidor la abre a
// cualquier miembro de la campaña (`requireMember` en `campaign-items.service.ts`) y solo exige
// DM para escribir (`requireDM` al crear, el `requireEditable` de `update`/`remove`) — así que
// aquí `useMyRole` decide qué **botones** se ofrecen, nunca si la lista se ve.
//
// **Lista y ficha viven en el mismo componente**, alternadas por un estado local
// (`seleccionado`), en vez de una ruta propia: el orquestador solo tiene que montar esta pantalla
// una vez, con `campaignId`, y todo lo demás —incluida la navegación entre el catálogo y la
// ficha de un objeto— queda resuelto dentro del carril.
export function CampaignItemsCatalogPage({ campaignId }: { campaignId: string }) {
  const { role, isLoading: cargandoRol, isError: errorDeRol, retry } = useMyRole(campaignId);
  const esDM = role === "DM";

  const items = useCampaignItems(campaignId);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [editando, setEditando] = useState<"nuevo" | CampaignItem | null>(null);

  const filas = items.data ?? [];
  const objetoSeleccionado = filas.find((i) => i.id === seleccionado);

  if (items.isLoading || cargandoRol) {
    return <p className="font-chrome text-chrome-sm text-muted">Cargando el catálogo…</p>;
  }

  if (items.isError) {
    return (
      <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
        No se pudo cargar el catálogo de objetos.
      </p>
    );
  }

  // La ficha reemplaza el catálogo entera, como en la maqueta (pantalla 21): no es un modal
  // encima de la lista, es su propia pantalla dentro de este carril.
  if (objetoSeleccionado) {
    return (
      <>
        <ItemDetail
          item={objetoSeleccionado}
          onBack={() => setSeleccionado(null)}
          onEdit={() => setEditando(objetoSeleccionado)}
          puedeEditar={esDM}
        />
        {editando && editando !== "nuevo" && (
          <CampaignItemEditor
            campaignId={campaignId}
            item={editando}
            onClose={() => setEditando(null)}
            onDeleted={() => {
              setEditando(null);
              setSeleccionado(null);
            }}
          />
        )}
      </>
    );
  }

  return (
    <div>
      <CabeceraDeSeccion
        grupo="Herramientas"
        titulo="Catálogo de objetos"
        paraQue="Busca objetos propios de la campaña y consulta su dato: peso, valor, y lo que suman al motor de reglas."
        accion={
          esDM ? (
            <Button type="button" onClick={() => setEditando("nuevo")}>
              + Crear objeto
            </Button>
          ) : errorDeRol ? (
            // "Todavía no sé", no "no eres DM" — un fallo al cargar el papel no se trata como
            // un "no tienes permiso" (mismo criterio que PanelDeReglas.tsx y CampaignSettings.tsx).
            <span className="font-chrome text-chrome-xs text-muted">
              {CHECKING_PERMISSIONS}
              <RetryPermissions onRetry={retry} />
            </span>
          ) : undefined
        }
      />

      {filas.length === 0 ? (
        <EmptyState title="Todavía no hay objetos propios en esta campaña.">
          {esDM
            ? "Crea el primero con «Crear objeto»."
            : "El DM aún no ha añadido ningún objeto propio de la campaña."}
        </EmptyState>
      ) : (
        <div className="rounded-radius-sm border border-muted">
          {filas.map((item) => (
            <FilaDeObjeto
              key={item.id}
              item={item}
              // El SRD todavía no viaja por este endpoint (ver el informe del carril): hasta
              // que el orquestador conecte esa fuente, cada fila que llega aquí es CAMPAIGN.
              procedencia="CAMPAIGN"
              onSelect={() => setSeleccionado(item.id)}
            />
          ))}
        </div>
      )}

      {editando === "nuevo" && (
        <CampaignItemEditor campaignId={campaignId} onClose={() => setEditando(null)} />
      )}
    </div>
  );
}
