import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCampaign } from "../features/campaigns/hooks";
import { useMyRole } from "../features/campaigns/members";
import { useCharacters } from "../features/characters/hooks";
import { CharacterEditor } from "../features/characters/CharacterEditor";
import { HojaCincoE } from "../features/characters/HojaCincoE";
import { CHECKING_PERMISSIONS } from "../features/campaigns/PermissionStatus";
import { useAuthStore } from "../store/auth.store";
import { AppShell, AppHeader, PageHeader } from "../ui/AppShell";
import { Panel } from "../ui/Panel";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/Collection";
import { OrnamentRule } from "../ui/Ornament";

// Reseño 2026-09-02 — the character sheet, in the shape of a real 5th-edition sheet.
//
// What existed was a flat form: name, race, class, level, bio. The author's words were exact
// and fair — "no usa el formato de la 5ta edicion". This page puts what we DO have into the
// sheet's own reading order and draws the rest of the sheet at its real size, empty and
// labelled as empty (HojaCincoE.tsx), so the layout can be judged now and built in phase 2A.
//
// The character list is read from the campaign rather than a per-character endpoint: the API
// has no GET /characters/:id, and inventing one would be phase-2 work this task must not do.
// The list is already filtered by canView on the server, so finding the character in it means
// the server decided you may see it — the same guarantee a dedicated endpoint would give.

export function CharacterDetailPage() {
  const { id = "", characterId = "" } = useParams();
  const { data: campaign } = useCampaign(id);
  const { data: personajes, isLoading, isError } = useCharacters(id);
  const { role, isLoading: roleLoading, isError: roleError } = useMyRole(id);
  const { user, logout } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();

  const personaje = personajes?.find((c) => c.id === characterId);
  const roleUnresolved = roleLoading || roleError;
  const puedeEditar =
    !roleUnresolved && personaje !== undefined && (role === "DM" || personaje.ownerId === user?.id);
  const motivo = roleUnresolved
    ? CHECKING_PERMISSIONS
    : puedeEditar
      ? undefined
      : "Solo el dueño o el DM puede editar este personaje.";

  const header = <AppHeader userName={user?.displayName} onLogout={logout} />;
  const migas = [
    { label: "Mis campañas", to: "/" },
    { label: campaign?.name ?? "Campaña", to: `/campaigns/${id}?seccion=characters` },
  ];

  if (isLoading) {
    return (
      <AppShell header={header}>
        <PageHeader title="Cargando…" crumbs={migas} />
      </AppShell>
    );
  }

  if (isError || !personaje) {
    return (
      <AppShell header={header}>
        <PageHeader title="Personaje no disponible" crumbs={migas} />
        <EmptyState title="Este personaje no existe o no puedes verlo">
          Igual que en el resto de la aplicación, no se distingue entre las dos cosas: decirlo sería
          contar justo lo que la visibilidad esconde.
        </EmptyState>
      </AppShell>
    );
  }

  const descripcion = [personaje.race, personaje.class].filter(Boolean).join(" · ");

  return (
    <AppShell header={header}>
      <PageHeader
        crumbs={[...migas, { label: "Personaje" }]}
        title={personaje.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-s2">
            <span className="font-data text-chrome-sm text-copper-text">
              Nivel {personaje.level}
            </span>
            {descripcion && <span className="font-world text-chrome-base">{descripcion}</span>}
            <Badge visibility={personaje.visibility} />
          </span>
        }
        actions={
          <Button variant="secondary" onClick={() => setEditing(true)} title={motivo}>
            {puedeEditar ? "Editar" : "Ver ficha completa"}
          </Button>
        }
      />

      <div className="space-y-s6">
        <HojaCincoE />

        <section>
          <OrnamentRule className="mb-s3">Historia</OrnamentRule>
          {personaje.bio?.trim() ? (
            <Panel tone="vellum" className="max-w-none">
              <p className="whitespace-pre-wrap">{personaje.bio}</p>
            </Panel>
          ) : (
            <EmptyState
              title="Sin historia todavía"
              action={
                puedeEditar ? (
                  <Button variant="primary" onClick={() => setEditing(true)}>
                    Escribirla
                  </Button>
                ) : undefined
              }
            >
              De dónde viene, qué dejó atrás y por qué se levanta cada mañana. Tres líneas valen más
              que tres páginas que nadie relee.
            </EmptyState>
          )}
        </section>
      </div>

      {editing && (
        <CharacterEditor
          campaignId={id}
          character={personaje}
          onClose={() => setEditing(false)}
          onDeleted={() => navigate(`/campaigns/${id}?seccion=characters`, { replace: true })}
          readOnly={!puedeEditar}
          readOnlyReason={motivo}
        />
      )}
    </AppShell>
  );
}
