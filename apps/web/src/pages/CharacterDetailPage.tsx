import { useNavigate, useParams } from "react-router-dom";
import { useCampaign } from "../features/campaigns/hooks";
import { useMyRole } from "../features/campaigns/members";
import { useCharacters, useUpdateCharacter } from "../features/characters/hooks";
import { AjustesDePersonaje } from "../features/characters/AjustesDePersonaje";
import { descriptorDePersonaje } from "../features/characters/descriptor";
import { HojaCalculada } from "../features/character-sheet/HojaCalculada";
import { TextoEditable } from "../features/character-sheet/EdicionEnSitio";
import { CHECKING_PERMISSIONS } from "../features/campaigns/PermissionStatus";
import { useAuthStore } from "../store/auth.store";
import { AppShell, AppHeader, PageHeader } from "../ui/AppShell";
import { Panel } from "../ui/Panel";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/Collection";
import { OrnamentRule } from "../ui/Ornament";

// Reseño 2026-09-02 — the character sheet, in the shape of a real 5th-edition sheet.
//
// What existed was a flat form: name, race, class, level, bio. The author's words were exact
// and fair — "no usa el formato de la 5ta edicion". Task 1.19 (HojaCincoE.tsx) drew the shape
// of the sheet empty, labelled as empty, so the layout could be judged before the engine
// existed. Task 2A.10 (HojaCalculada.tsx, features/character-sheet/) is what replaces it here:
// the engine of phase 2A is done, so this page now reads the real, calculated sheet — every
// derived number with the trace of where it comes from, the warnings, the pending choices as a
// task list, HP as a delta, resources, rests, conditions, effective speed and senses.
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
  const actualizar = useUpdateCharacter(id ?? "");
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
    { label: "Tus crónicas", to: "/" },
    // **A la campaña, no a `?seccion=characters`.** Personajes dejó de ser una pestaña en B4 —es
    // un cajón—, así que esa dirección no tenía panel que pintar: cabecera, carril, y el área de
    // contenido vacía. Lo encontró la revisión de cierre de 2.5.6, y no era una dirección
    // hipotética guardada en un marcador: la emitía **toda** hoja de personaje, aquí.
    { label: campaign?.name ?? "Campaña", to: `/campaigns/${id}` },
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

  // Del catálogo si lo hay, del texto libre heredado si no. La regla vive en `descriptor.ts`
  // porque esta misma frase se pinta también en la fila de la lista, y eran dos copias que ya
  // habían empezado a discrepar.
  const descripcion = descriptorDePersonaje(personaje);

  return (
    <AppShell header={header}>
      <PageHeader
        crumbs={[...migas, { label: "Personaje" }]}
        title={
          <TextoEditable
            etiqueta="Nombre del personaje"
            valor={personaje.name}
            disabled={!puedeEditar}
            motivoDeshabilitado={motivo}
            onGuardar={async (n) => actualizar.mutateAsync({ characterId, input: { name: n } })}
          />
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-s2">
            <span className="font-data text-chrome-sm text-copper-text">
              Nivel {personaje.level}
            </span>
            {descripcion && <span className="font-world text-chrome-base">{descripcion}</span>}
            <Badge visibility={personaje.visibility} />
          </span>
        }
        /* **Aquí estaba el primero de los dos botones de «Editar»**, y hasta H6 siguió vivo como
           «Ajustes y borrado». Ya no queda ninguno: el nombre se toca en el propio título, la
           historia en su sección, y lo que aquel diálogo tenía en exclusiva —la visibilidad y el
           borrado— vive abajo, en «Quién lo ve y qué se hace con él». Borrar sigue detrás de un
           botón con confirmación; lo irreversible no se pone a un clic de lo que se lee. */
      />

      <div className="space-y-s6">
        <HojaCalculada campaignId={id} characterId={characterId} puedeEditar={puedeEditar} />

        <section>
          <OrnamentRule className="mb-s3">Historia</OrnamentRule>
          {/* La historia es **lo que se lee**, así que va sobre vitela; y se edita ahí mismo,
              sin salir a un diálogo. El texto libre lleva guardado explícito: teclear es un
              proceso, no un gesto. */}
          <Panel tone="vellum" className="max-w-none">
            <TextoEditable
              etiqueta="Historia del personaje"
              valor={personaje.bio ?? ""}
              multilinea
              disabled={!puedeEditar}
              motivoDeshabilitado={motivo}
              placeholder="De dónde viene, qué dejó atrás y por qué se levanta cada mañana. Tres líneas valen más que tres páginas que nadie relee."
              onGuardar={async (t) => actualizar.mutateAsync({ characterId, input: { bio: t } })}
            >
              {(v) =>
                v.trim() ? (
                  <span className="whitespace-pre-wrap">{v}</span>
                ) : (
                  <span className="text-muted">
                    Sin historia todavía. De dónde viene, qué dejó atrás y por qué se levanta cada
                    mañana.
                  </span>
                )
              }
            </TextoEditable>
          </Panel>
        </section>

        <section>
          <OrnamentRule className="mb-s3">Quién lo ve y qué se hace con él</OrnamentRule>
          {/* El último trozo que se editaba por un segundo camino. La visibilidad no cabía en la
              hoja —no es un número de la ficha, es quién puede leerla— así que se queda aquí, en
              el sitio donde se lee, y no en un diálogo. */}
          <Panel className="max-w-[66ch]">
            <AjustesDePersonaje
              campaignId={id}
              character={personaje}
              puedeEditar={puedeEditar}
              motivo={motivo}
              // Mismo motivo que la miga: `?seccion=characters` ya no es una sección.
              onDeleted={() => navigate(`/campaigns/${id}`, { replace: true })}
            />
          </Panel>
        </section>
      </div>
    </AppShell>
  );
}
