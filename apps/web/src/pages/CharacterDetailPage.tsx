import { useNavigate, useParams } from "react-router-dom";
import { useCampaign } from "../features/campaigns/hooks";
import { useMyRole } from "../features/campaigns/members";
import type { Character } from "../features/characters/api";
import { useCharacters, useUpdateCharacter } from "../features/characters/hooks";
import { AjustesDePersonaje } from "../features/characters/AjustesDePersonaje";
import { descriptorDePersonaje } from "../features/characters/descriptor";
import { HojaCalculada } from "../features/character-sheet/HojaCalculada";
import { useCharacterSheet } from "../features/character-sheet/hooks";
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

  // **Y si no está en la lista, se pregunta por la hoja** (carril C6, 2026-09-04).
  //
  // La lista de personajes **excluye a los PNJ desde 2D.6** —esa lista es quién se sienta a la
  // mesa, no un listado de combate—, así que el enlace que el bestiario pone a la ficha de un PNJ
  // («En la mesa») aterrizaba aquí y esta página decía «Este personaje no existe o no puedes
  // verlo» **sobre un PNJ que el DM acababa de bajar él mismo**. Consecuencia real: el único
  // sitio donde las resistencias de 2.5.1 se pueden aplicar —un personaje con `statblockRef`, es
  // decir un PNJ— no tenía pantalla donde aplicarlas.
  //
  // `GET .../characters/:id/sheet` **sí** existe y devuelve la fila del personaje en
  // `character`, ya filtrada por `canView` en el servidor: encontrarlo ahí es exactamente la
  // misma garantía que encontrarlo en la lista. No se inventa ningún endpoint y no se relaja
  // ninguna comprobación — se lee el que ya se estaba pidiendo dos líneas más abajo.
  const hoja = useCharacterSheet(id, characterId);
  const deLaLista = personajes?.find((c) => c.id === characterId);
  const deLaHoja = hoja.data?.character;
  const personaje =
    deLaLista ??
    (deLaHoja && deLaHoja.id === characterId
      ? {
          ...deLaHoja,
          visibility: deLaHoja.visibility as Character["visibility"],
          createdAt: "",
        }
      : undefined);
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

  // La espera cubre las dos consultas: sin esto, un PNJ pintaba el «no disponible» durante el
  // instante entre que la lista responde (sin él) y la hoja llega (con él).
  if (isLoading || (!deLaLista && hoja.isLoading)) {
    return (
      <AppShell header={header}>
        <PageHeader title="Cargando…" crumbs={migas} />
      </AppShell>
    );
  }

  if ((isError && hoja.isError) || !personaje) {
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
        <HojaCalculada
          campaignId={id}
          characterId={characterId}
          puedeEditar={puedeEditar}
          disposicion="pagina"
        />

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
              /* **Archivar solo aplica a quien está en la lista de la mesa**, y esa lista es
                 justo `deLaLista`: `characters.service.ts:57` excluye de ella a los PNJ
                 (`statblockRef`) y a los ya archivados (`archivedAt`), que son exactamente los
                 dos casos en los que `archive` no haría nada útil —404 el primero, sin efecto el
                 segundo—. Cuando el personaje solo se pudo encontrar por su hoja, es uno de esos
                 dos, y el gesto no se ofrece. No es control de acceso, que lo impone el servidor
                 con `requireEditable`: es que aquí el gesto no tiene sentido. */
              puedeArchivar={deLaLista !== undefined}
              motivo={motivo}
              // Mismo motivo que la miga: `?seccion=characters` ya no es una sección.
              onDeleted={() => navigate(`/campaigns/${id}`, { replace: true })}
              // Archivado, este personaje ya no está en la lista de la mesa: quedarse en su hoja
              // sería quedarse en una página que ya no cuenta la verdad de dónde vive. Se vuelve
              // a la campaña, que es desde donde se abre el archivo.
              onArchived={() => navigate(`/campaigns/${id}`, { replace: true })}
            />
          </Panel>
        </section>
      </div>
    </AppShell>
  );
}
