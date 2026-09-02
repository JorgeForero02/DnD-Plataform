import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCampaign } from "../features/campaigns/hooks";
import { useMyRole } from "../features/campaigns/members";
import { useEntityDetail } from "../features/entities/hooks";
import { EntityEditor } from "../features/entities/EntityEditor";
import { Markdown } from "../features/entities/Markdown";
import { ETIQUETA_DE_TIPO } from "../features/entities/resumen";
import { LinksPanel } from "../features/links/LinksPanel";
import { CommentThread } from "../features/comments/CommentThread";
import { CHECKING_PERMISSIONS } from "../features/campaigns/PermissionStatus";
import { useAuthStore } from "../store/auth.store";
import { AppShell, AppHeader, PageHeader } from "../ui/AppShell";
import { Panel } from "../ui/Panel";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/Collection";
import { OrnamentRule } from "../ui/Ornament";

// Reseño 2026-09-02 — the reading view this product never had.
//
// Until now the ONLY way to see what an NPC was, was to open the editor: a modal full of form
// controls, with the description sitting in a <textarea>. That is a fine way to change
// something and a terrible way to read it at the table, which is what a DM actually does with
// this screen — mid-session, with players waiting.
//
// So the world gets its own surface here (Panel tone="vellum", the manual's voice) and editing
// becomes a deliberate act behind a button, instead of the only door in.
//
// Authorisation is unchanged and stays where it belongs: the server decided whether you may
// see this entity at all (canView), and whether you may save changes (requireEditable). This
// page only decides whether the editor opens read-only, exactly like the list row did.

export function EntityDetailPage() {
  const { id = "", entityId = "" } = useParams();
  const { data: campaign } = useCampaign(id);
  const { data: entity, isLoading, isError } = useEntityDetail(id, entityId);
  const { role, isLoading: roleLoading, isError: roleError } = useMyRole(id);
  const userId = useAuthStore((s) => s.user?.id);
  const { user, logout } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();

  const roleUnresolved = roleLoading || roleError;
  const puedeEditar =
    !roleUnresolved && entity !== undefined && (role === "DM" || entity.createdById === userId);
  const motivo = roleUnresolved
    ? CHECKING_PERMISSIONS
    : puedeEditar
      ? undefined
      : "Solo el DM o quien lo creó puede editarlo.";

  const header = <AppHeader userName={user?.displayName} onLogout={logout} />;
  // La miga de la campaña vuelve a la SECCIÓN de la que salió esta ficha, no al resumen:
  // desde una ficha, el sitio al que quieres volver es la lista donde estaba.
  const volverALaLista = entity ? `/campaigns/${id}?seccion=${entity.type}` : `/campaigns/${id}`;
  const migas = [
    { label: "Mis campañas", to: "/" },
    { label: campaign?.name ?? "Campaña", to: volverALaLista },
  ];

  if (isError) {
    return (
      <AppShell header={header}>
        <PageHeader title="Ficha no disponible" crumbs={migas} />
        <EmptyState title="Esta ficha no existe o no puedes verla">
          Igual que con las campañas, no se distingue entre "no existe" y "no tienes acceso":
          decirlo sería contar justo lo que la visibilidad esconde.
        </EmptyState>
      </AppShell>
    );
  }

  if (isLoading || !entity) {
    return (
      <AppShell header={header}>
        <PageHeader title="Cargando…" crumbs={migas} />
      </AppShell>
    );
  }

  const cuerpo = entity.body?.text?.trim();

  return (
    <AppShell header={header}>
      <PageHeader
        crumbs={[...migas, { label: ETIQUETA_DE_TIPO[entity.type] }]}
        title={entity.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-s2">
            <span className="font-chrome text-chrome-xs uppercase tracking-[0.16em] text-copper-text">
              {ETIQUETA_DE_TIPO[entity.type]}
            </span>
            <Badge visibility={entity.visibility} />
            {Array.from(new Set(entity.tags)).map((tag) => (
              <span
                key={tag}
                className="rounded-radius-sm border border-muted/60 px-1.5 py-0.5 font-chrome text-chrome-xs text-muted"
              >
                {tag}
              </span>
            ))}
          </span>
        }
        actions={
          <Button variant="secondary" onClick={() => setEditing(true)} title={motivo}>
            {puedeEditar ? "Editar" : "Ver ficha completa"}
          </Button>
        }
      />

      <div className="grid gap-s6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-s5">
          {cuerpo ? (
            <Panel tone="vellum" className="max-w-none">
              <Markdown text={cuerpo} />
            </Panel>
          ) : (
            <EmptyState
              title="Sin nada escrito todavía"
              action={
                puedeEditar ? (
                  <Button variant="primary" onClick={() => setEditing(true)}>
                    Escribir
                  </Button>
                ) : undefined
              }
            >
              Esta ficha existe pero está vacía. Un par de líneas bastan: quién es, qué quiere y qué
              sabe que los demás no.
            </EmptyState>
          )}

          <section>
            <OrnamentRule className="mb-s3">Comentarios</OrnamentRule>
            <CommentThread campaignId={id} entityId={entity.id} />
          </section>
        </div>

        <aside className="space-y-s5">
          <section>
            <OrnamentRule className="mb-s3">Relaciones</OrnamentRule>
            <LinksPanel
              campaignId={id}
              entityId={entity.id}
              entityCreatedById={entity.createdById}
            />
          </section>
        </aside>
      </div>

      {editing && (
        <EntityEditor
          campaignId={id}
          type={entity.type}
          entity={entity}
          onClose={() => setEditing(false)}
          // Deleting the thing this page is about: go back to its list rather than leave the
          // reader on a page whose subject no longer exists.
          onDeleted={() => navigate(`/campaigns/${id}?seccion=${entity.type}`, { replace: true })}
          readOnly={!puedeEditar}
          readOnlyReason={motivo}
        />
      )}
    </AppShell>
  );
}
