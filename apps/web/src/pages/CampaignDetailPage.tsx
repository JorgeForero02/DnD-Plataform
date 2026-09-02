import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import type { EntityType } from "@dnd/shared";
import { useCampaign } from "../features/campaigns/hooks";
import { useMyRole } from "../features/campaigns/members";
import { useAuthStore } from "../store/auth.store";
import { useEntities } from "../features/entities/hooks";
import { EntityEditor } from "../features/entities/EntityEditor";
import { EntityFilterBar } from "../features/entities/EntityFilterBar";
import { filterEntities, type EntityFilterValue } from "../features/entities/filter";
import { useSessions } from "../features/sessions/hooks";
import { SessionEditor } from "../features/sessions/SessionEditor";
import type { Session } from "../features/sessions/api";
import { useCharacters } from "../features/characters/hooks";
import { CharacterEditor } from "../features/characters/CharacterEditor";
import { InvitePanel } from "../features/invites/InvitePanel";
import { CampaignSettings } from "../features/campaigns/CampaignSettings";
import { MembersPanel } from "../features/campaigns/MembersPanel";
import { CHECKING_PERMISSIONS, RetryPermissions } from "../features/campaigns/PermissionStatus";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Tabs, type TabItem } from "../ui/Tabs";
import { PanelDeReglas } from "../features/rules/PanelDeReglas";
import { AppShell, AppHeader, PageHeader } from "../ui/AppShell";
import { EmptyState } from "../ui/Collection";
import { CampaignOverview } from "../features/campaigns/CampaignOverview";
import { useAllEntities } from "../features/entities/hooks";
import { resumenDeCuerpo, TITULO_NUEVO as NUEVO_POR_TIPO } from "../features/entities/resumen";

type TabConfig =
  | { kind: "overview"; label: string; group?: string }
  | { kind: "entity"; label: string; type: EntityType; group?: string }
  | { kind: "sessions"; label: string; group?: string }
  | { kind: "characters"; label: string; group?: string }
  | { kind: "rules"; label: string; group?: string }
  | { kind: "settings"; label: string; group?: string };

// Reseño 2026-09-02 — audit B4. These ten used to sit in one flat strip, which said that
// "Documentos" and "Sesiones" were the same kind of thing. They are not: one is a filing
// cabinet, the other is what happens on Friday. Two groups, and the table comes second only
// because the world is what you build between sessions.
const TABS: TabConfig[] = [
  { kind: "overview", label: "Resumen" },
  { kind: "entity", label: "PNJ", type: "NPC", group: "El mundo" },
  { kind: "entity", label: "Lugares", type: "LOCATION", group: "El mundo" },
  { kind: "entity", label: "Misiones", type: "QUEST", group: "El mundo" },
  { kind: "entity", label: "Facciones", type: "FACTION", group: "El mundo" },
  { kind: "entity", label: "Objetos", type: "OBJECT", group: "El mundo" },
  { kind: "entity", label: "Eventos", type: "EVENT", group: "El mundo" },
  { kind: "entity", label: "Documentos", type: "DOCUMENT", group: "El mundo" },
  { kind: "sessions", label: "Sesiones", group: "La mesa" },
  { kind: "characters", label: "Personajes", group: "La mesa" },
  // 2A.17. Va en «La mesa» y no en «La campaña» porque una regla es algo que pasa durante la
  // partida, no un ajuste. El panel se calla entero si quien mira no es el DM.
  { kind: "rules", label: "Reglas", group: "La mesa" },
  { kind: "settings", label: "Ajustes", group: "La campaña" },
];

// Reseño 2026-09-02 — "Nuevo" told you nothing unless you already knew which section you were
// in, and "Sin elementos." told you nothing at all. Both say what they are about now.

const VACIO_POR_TIPO: Record<EntityType, { titulo: string; texto: string }> = {
  NPC: {
    titulo: "Ningún personaje del mundo todavía",
    texto:
      "Quien tiene un nombre vuelve a aparecer. Empieza por quien tus jugadores van a conocer primero.",
  },
  LOCATION: {
    titulo: "Ningún lugar todavía",
    texto: "Un sitio donde ocurra algo: una ciudad, una posada, una cueva con algo dentro.",
  },
  QUEST: {
    titulo: "Ninguna misión todavía",
    texto: "Lo que la mesa persigue ahora mismo, y lo que ganan o pierden si sale mal.",
  },
  FACTION: {
    titulo: "Ninguna facción todavía",
    texto:
      "Un grupo con intereses propios. Las facciones son lo que hace que el mundo se mueva solo.",
  },
  OBJECT: {
    titulo: "Ningún objeto todavía",
    texto: "Un arma, una reliquia, una llave: cosas que cambian de manos y de dueño.",
  },
  EVENT: {
    titulo: "Ningún evento todavía",
    texto: "Lo que ya pasó y explica el presente, o lo que va a pasar tanto si miran como si no.",
  },
  DOCUMENT: {
    titulo: "Ningún documento todavía",
    texto: "Cartas, mapas, notas y pistas que los jugadores puedan leer con sus propios ojos.",
  },
};

// Row buttons (entity/session/character lists) share this chrome recipe: a bordered card,
// keyed by --surface, with the border picking up --accent on hover/focus instead of a bg
// swap — the token palette has no third dark shade between --bg and --surface to fake the
// old pre-token dark-card/hover-lighter pair with.
// Reseño 2026-09-02, segunda pasada — `block` no es cosmético, es el arreglo de un defecto
// visible: cuando estas filas pasaron de <button> a <a>, heredaron `display: inline`, y un
// borde sobre un elemento en línea que ocupa varias líneas se dibuja **partido** — un trozo
// vertical suelto a la izquierda de cada fila, que es exactamente lo que el autor fotografió.
// Un <button> es `inline-block` por defecto y nunca tuvo el problema, así que el cambio de
// etiqueta lo introdujo en silencio.
const ROW_BUTTON_CLASS =
  "block w-full rounded-radius-sm border border-muted bg-surface p-3 text-left font-chrome text-chrome-sm text-text hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function EntityTab({ campaignId, type }: { campaignId: string; type: EntityType }) {
  const { data, isLoading, isError, error } = useEntities(campaignId, type);
  const {
    role,
    isLoading: roleLoading,
    isError: roleError,
    retry: retryRole,
  } = useMyRole(campaignId);
  const userId = useAuthStore((s) => s.user?.id);
  const isDM = role === "DM";
  const roleUnresolved = roleLoading || roleError;
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<EntityFilterValue>({ query: "", tags: [] });

  // Tags present in THIS tab's already-loaded list only (not the whole campaign) — entities
  // are listed per type, so that's the set that makes sense to filter by here. Deduped and
  // sorted for a stable, readable button order.
  const availableTags = useMemo(() => {
    const seen = new Set<string>();
    data?.forEach((e) => e.tags.forEach((t) => seen.add(t)));
    return Array.from(seen).sort((a, b) => a.localeCompare(b, "es"));
  }, [data]);

  // Client-side only, over a list the server already filtered by canView — see filter.ts.
  // Never a substitute for that check, only ever a further narrowing of it.
  const filtered = data ? filterEntities(data, filter) : undefined;

  return (
    <div>
      {roleError && (
        <p className="mb-3 text-chrome-xs text-danger-text">No se pudo comprobar tu permiso.</p>
      )}
      {roleError && <RetryPermissions onRetry={retryRole} />}
      {/* Creating is open to any campaign member on the server (entities.service.ts,
          requireMember), so it isn't gated here. The label says WHAT gets created: "Nuevo" on
          its own was the audit's C3, a button that only made sense if you already knew which
          tab you were on. */}
      <EntityFilterBar
        availableTags={availableTags}
        value={filter}
        onChange={setFilter}
        totalCount={data?.length ?? 0}
        visibleCount={filtered?.length ?? 0}
        action={
          <Button variant="primary" onClick={() => setCreating(true)}>
            {NUEVO_POR_TIPO[type]}
          </Button>
        }
      />
      {isLoading && <p className="text-muted">Cargando…</p>}
      {isError && <p className="text-danger-text">{(error as Error).message}</p>}
      {data && data.length === 0 && (
        <EmptyState title={VACIO_POR_TIPO[type].titulo}>{VACIO_POR_TIPO[type].texto}</EmptyState>
      )}
      {data && data.length > 0 && filtered && filtered.length === 0 && (
        <EmptyState title="Nada coincide con el filtro">
          Prueba con menos etiquetas, o borra lo que hayas escrito en la búsqueda.
        </EmptyState>
      )}
      <ul className="space-y-2">
        {filtered?.map((e) => {
          // Editing is DM-or-creator (entities.service.ts:requireEditable). While the role is
          // unresolved (still loading, or the members request failed — arreglo 4), `isDM`
          // reads false and `userId` may be stale/undefined, so canEdit would otherwise be
          // wrong for a DM or the creator during that window — roleUnresolved is checked first
          // specifically to avoid that.
          const canEdit = !roleUnresolved && (isDM || e.createdById === userId);
          const reason = roleUnresolved
            ? CHECKING_PERMISSIONS
            : canEdit
              ? undefined
              : "Solo el DM o quien lo creó puede editarlo.";
          return (
            <li key={e.id}>
              {/* Arreglo 1 (1.15-fix), Crítico: the row always opens — it's the only detail
                  view this app has (the editor is the only consumer of useEntity, and
                  LinksPanel/CommentThread only ever render inside it). What the permission
                  check controls now is whether the editor opens read-only, not whether the
                  row can be clicked at all — see EntityEditor.tsx's `readOnly` prop. */}
              {/* Reseño 2026-09-02 — audit A3. The row used to be a <button> that opened the
                  EDITOR: the only way to read an NPC was to open a form with its description
                  inside a textarea. It is a link to the reading page now, and editing is a
                  deliberate act from there. */}
              <Link
                to={`/campaigns/${campaignId}/entidades/${e.id}`}
                title={reason}
                className={ROW_BUTTON_CLASS}
              >
                <span className="block font-title text-chrome-md text-text">{e.name}</span>
                {/* Reseño 2026-09-02 — audit B1. The body text was ALREADY in this response
                    and the row threw it away, so a list of nine NPCs told you nine names and
                    nothing else. One line of who they are costs no extra request. */}
                {resumenDeCuerpo(e.body, 180) && (
                  <span className="mt-1 line-clamp-2 block font-world text-chrome-base leading-snug text-muted">
                    {resumenDeCuerpo(e.body, 180)}
                  </span>
                )}
                <span className="mt-s2 flex flex-wrap items-center gap-s2">
                  <Badge visibility={e.visibility} />
                  {/* A2 (1.17c): tags were written and never read anywhere but the editor's own
                    field. An entity with none paints nothing — no gap, no dash, no "sin
                    etiquetas" — see the brief this task followed. Deduped here (not in
                    parseTags/entity.schema.ts, which allow "lich, lich" through as
                    ["lich","lich"] — tightening what gets persisted is a different decision,
                    see docs/06-pendientes.md) so a duplicate tag doesn't paint the same badge
                    twice or emit a duplicate React key warning. */}
                  {e.tags.length > 0 &&
                    Array.from(new Set(e.tags)).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-radius-sm border border-muted/60 px-1.5 py-0.5 font-chrome text-chrome-xs text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                </span>
                {/* Task 1.18b: this used to be --muted, the exact colour and size of the tag
                    chips right above it — the reason a row can't be edited read as one more
                    piece of metadata instead of the permission notice it is. --warning-text
                    (tokens.css) gives it its own register. Fix round 1 (post-1.18b review),
                    Important 8: guarded so the placeholder shares the register the OTHER
                    "still checking" copy on this screen uses (roleError's own paragraph,
                    CHECKING_PERMISSIONS everywhere else) — a transient loading string has no
                    business in the loudest register on the row; only a REAL "you can't edit
                    this" gets it. */}
                {reason && (
                  <span
                    className={`ml-2 text-chrome-xs ${
                      reason === CHECKING_PERMISSIONS ? "text-muted" : "text-warning-text"
                    }`}
                  >
                    {reason}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      {creating && (
        <EntityEditor campaignId={campaignId} type={type} onClose={() => setCreating(false)} />
      )}
    </div>
  );
}

function SessionsTab({ campaignId }: { campaignId: string }) {
  const { data, isLoading, isError, error } = useSessions(campaignId);
  const {
    role,
    isLoading: roleLoading,
    isError: roleError,
    retry: retryRole,
  } = useMyRole(campaignId);
  const isDM = role === "DM";
  const roleUnresolved = roleLoading || roleError;
  // Creating and editing a session are both DM-only on the server (sessions.service.ts,
  // requireDM for both). Creating stays gated on the button itself (there's nothing to read
  // if you can't create it), but editing (arreglo 1, 1.15-fix) no longer gates the row —
  // only whether the editor it opens is read-only, same as EntityTab above.
  const canManage = !roleUnresolved && isDM;
  const reason = roleUnresolved
    ? CHECKING_PERMISSIONS
    : canManage
      ? undefined
      : "Solo el DM puede crear o editar sesiones.";
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Session | null>(null);

  return (
    <div>
      <Button
        variant="primary"
        onClick={() => setCreating(true)}
        disabled={!canManage}
        title={reason}
        className="mb-3"
      >
        Nueva sesión
      </Button>
      {/* Fix round 1 (post-1.18b review), Important 9: stays --muted on purpose, unlike the
          per-row reasons in EntityTab/CharactersTab below — this is a PANEL-level notice above
          the "Nuevo" button, not text sitting inline next to a tag chip it could be confused
          with. The brief's "indistinguishable from the tag chips" problem doesn't apply to a
          standalone paragraph with nothing beside it, so this one was left as-is rather than
          recoloured to match speculatively — a decision recorded here, not only in the report. */}
      {reason && <p className="mb-3 text-chrome-xs text-muted">{reason}</p>}
      {roleError && <RetryPermissions onRetry={retryRole} />}
      {isLoading && <p className="text-muted">Cargando…</p>}
      {isError && <p className="text-danger-text">{(error as Error).message}</p>}
      {data && data.length === 0 && (
        <EmptyState title="Ninguna sesión todavía">
          Apunta la próxima con su fecha y los jugadores sabrán cuándo se juega. Las notas de lo que
          pasó se escriben después, en la misma ficha.
        </EmptyState>
      )}
      <ul className="space-y-2">
        {data?.map((s) => (
          <li key={s.id}>
            {/* Arreglo 1 (1.15-fix), Crítico: the row always opens — the fecha and notas a
                player can already see via canView were unreachable while the row itself was
                disabled. */}
            <button onClick={() => setEditing(s)} title={reason} className={ROW_BUTTON_CLASS}>
              <span className="flex flex-wrap items-baseline gap-x-s3 gap-y-1">
                <span className="font-title text-chrome-md text-text">{s.title}</span>
                <span className="flex-1" />
                {/* A session with no date is a session nobody can plan around, so the row says
                    so instead of leaving the space blank and letting you wonder. */}
                <span className="font-data text-chrome-xs text-copper-text">
                  {s.scheduledAt
                    ? new Date(s.scheduledAt).toLocaleDateString("es-ES", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "sin fecha"}
                </span>
              </span>
              <span className="mt-s2 block">
                <Badge visibility={s.visibility} />
              </span>
            </button>
          </li>
        ))}
      </ul>
      {creating && <SessionEditor campaignId={campaignId} onClose={() => setCreating(false)} />}
      {editing && (
        <SessionEditor
          campaignId={campaignId}
          session={editing}
          onClose={() => setEditing(null)}
          readOnly={!canManage}
          readOnlyReason={reason}
        />
      )}
    </div>
  );
}

function CharactersTab({ campaignId }: { campaignId: string }) {
  const { data, isLoading, isError, error } = useCharacters(campaignId);
  const {
    role,
    isLoading: roleLoading,
    isError: roleError,
    retry: retryRole,
  } = useMyRole(campaignId);
  const userId = useAuthStore((s) => s.user?.id);
  const isDM = role === "DM";
  const roleUnresolved = roleLoading || roleError;
  const [creating, setCreating] = useState(false);

  return (
    <div>
      {/* Creating is open to any campaign member on the server (characters.service.ts,
          requireMember), so it isn't gated here. */}
      <Button variant="primary" onClick={() => setCreating(true)} className="mb-3">
        Nuevo personaje
      </Button>
      {roleError && (
        <p className="mb-3 text-chrome-xs text-danger-text">No se pudo comprobar tu permiso.</p>
      )}
      {roleError && <RetryPermissions onRetry={retryRole} />}
      {isLoading && <p className="text-muted">Cargando…</p>}
      {isError && <p className="text-danger-text">{(error as Error).message}</p>}
      {data && data.length === 0 && (
        <EmptyState title="Ningún personaje todavía">
          Cada jugador crea el suyo; el DM puede crearlos también. Nombre, raza, clase y nivel
          bastan para empezar.
        </EmptyState>
      )}
      <ul className="space-y-2">
        {data?.map((c) => {
          // Editing is DM-or-owner (characters.service.ts:requireEditable).
          const canEdit = !roleUnresolved && (isDM || c.ownerId === userId);
          const reason = roleUnresolved
            ? CHECKING_PERMISSIONS
            : canEdit
              ? undefined
              : "Solo el dueño o el DM puede editar este personaje.";
          return (
            <li key={c.id}>
              {/* Arreglo 1 (1.15-fix), Crítico: the row always opens — see EntityTab above. */}
              {/* Reseño 2026-09-02 — igual que las fichas del mundo: la fila lleva a la hoja
                  del personaje, no a un formulario. */}
              <Link
                to={`/campaigns/${campaignId}/personajes/${c.id}`}
                title={reason}
                className={ROW_BUTTON_CLASS}
              >
                <span className="flex flex-wrap items-baseline gap-x-s3 gap-y-1">
                  <span className="font-title text-chrome-md text-text">{c.name}</span>
                  {/* Reseño 2026-09-02 — a character row that says only a name and a level is
                      a row you have to open to recognise. Race and class are what people
                      actually call each other by at the table. */}
                  {(c.race || c.class) && (
                    <span className="font-world text-chrome-base text-muted">
                      {[c.race, c.class].filter(Boolean).join(" · ")}
                    </span>
                  )}
                  <span className="flex-1" />
                  <span className="font-data text-chrome-xs text-copper-text">Nivel {c.level}</span>
                </span>
                {/* Fix round 1 (post-1.18b review), Important 9: the identical construct one tab
                    over (EntityTab above) was fixed and this one — same shape, a muted reason
                    right after a muted "Nivel N" chip — was left behind, which is verbatim the
                    failure the brief describes: one sentence reading as two different things in
                    two tabs of the same screen. Same treatment, same guard (Important 8): muted
                    while still checking, warning once it's a real "you can't edit this". */}
                {reason && (
                  <span
                    className={`ml-2 text-chrome-xs ${
                      reason === CHECKING_PERMISSIONS ? "text-muted" : "text-warning-text"
                    }`}
                  >
                    {reason}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      {creating && <CharacterEditor campaignId={campaignId} onClose={() => setCreating(false)} />}
    </div>
  );
}

export function CampaignDetailPage() {
  const { id = "" } = useParams();
  const { data: campaign, isLoading, isError } = useCampaign(id);
  const { user, logout } = useAuthStore();
  const { data: todasLasEntidades } = useAllEntities(id);

  // Reseño 2026-09-02 — the open section lives in the URL. Two reasons, and the second is the
  // one that matters: a section becomes linkable and survives a reload, and an uncontrolled
  // Tabs silently threw that away — a real Playwright journey reloaded the page mid-test and
  // landed back on the first section without saying so, which is exactly what happens to a
  // person who refreshes while editing settings.
  const [searchParams, setSearchParams] = useSearchParams();
  const seccionActiva = searchParams.get("seccion") ?? "overview";
  const abrirSeccion = (id: string) => {
    const siguiente = new URLSearchParams(searchParams);
    if (id === "overview") siguiente.delete("seccion");
    else siguiente.set("seccion", id);
    // replace: switching section is not a place you should have to press Back through ten
    // times to leave a campaign.
    setSearchParams(siguiente, { replace: true });
  };

  // One pass over the list the sidebar badges all read from, instead of nine separate counts.
  const conteoPorTipo = useMemo(() => {
    if (!todasLasEntidades) return undefined;
    const conteo = new Map<EntityType, number>();
    for (const e of todasLasEntidades) conteo.set(e.type, (conteo.get(e.type) ?? 0) + 1);
    return conteo;
  }, [todasLasEntidades]);

  // Task 1.19b: the hand-rolled button strip becomes the Tabs primitive (WAI-ARIA tabs
  // pattern — role="tab", roving tabindex, arrow-key navigation for free). Uncontrolled: no
  // consumer outside this page ever needed to read or drive which tab is active, so the
  // `active`/`setActive` index state this replaced was pure bookkeeping Tabs now owns itself.
  // `key={type}` on each EntityTab (1.17c) still matters: without it, switching between two
  // entity-type tabs would update the same mounted EntityTab instance in place instead of
  // remounting it, and its filter/creating/editing state would leak from one type into the
  // next — Tabs renders whichever item.content is active, but the element identity inside it
  // is still ordinary React reconciliation.
  const items: TabItem[] = TABS.map((t) => {
    if (t.kind === "overview") {
      return {
        id: "overview",
        label: t.label,
        group: t.group,
        content: <CampaignOverview campaignId={id} />,
      };
    }
    if (t.kind === "rules") {
      return {
        id: "rules",
        label: t.label,
        group: t.group,
        content: <PanelDeReglas campaignId={id} />,
      };
    }
    if (t.kind === "settings") {
      return {
        id: "settings",
        label: t.label,
        group: t.group,
        content: (
          <div className="space-y-s4">
            {/* CampaignSettings fetches its own campaign (1.17d) and mounts unconditionally,
                same as MembersPanel and InvitePanel below — see the comment on
                CampaignSettings.tsx for why that (and not gating the mount on `campaign` here)
                is what keeps every consumer of useMyRole subscribing to the members query on
                the same render. */}
            <CampaignSettings campaignId={id} />
            <MembersPanel campaignId={id} />
            {/* InvitePanel gates its own "Generar invitación" button against useMyRole
                (features/campaigns/members.ts) — see the comment there. */}
            <InvitePanel campaignId={id} />
          </div>
        ),
      };
    }
    if (t.kind === "entity") {
      return {
        id: t.type,
        label: t.label,
        group: t.group,
        // The count comes from the campaign-wide entity list, which the server already
        // filtered by canView — so it is "how many of these you can see", never a hint that
        // there are more you cannot. See CampaignOverview.tsx for the same reasoning.
        badge: conteoPorTipo?.get(t.type) ?? undefined,
        content: <EntityTab key={t.type} campaignId={id} type={t.type} />,
      };
    }
    if (t.kind === "sessions") {
      return {
        id: "sessions",
        label: t.label,
        group: t.group,
        content: <SessionsTab campaignId={id} />,
      };
    }
    return {
      id: "characters",
      label: t.label,
      group: t.group,
      content: <CharactersTab campaignId={id} />,
    };
  });

  // Fix round 1 (post-1.18b review), Important 12: /campaigns/:id matches ANY segment, so a
  // stale link or a mistyped id (never a UUID this app generated) doesn't fall through to
  // App.tsx's wildcard — that route is ranked last and this one wins on specificity, React
  // Router's own rule. Before this, a failed useCampaign() left an empty <h1> and a tab strip
  // of panels that each failed on their own, one confusing paragraph at a time, with no single
  // statement of what actually happened. This is NOT the 404 route and doesn't claim to be —
  // the URL shape is valid, the specific campaign isn't (deleted, or never existed, or this
  // account isn't a member of it — canView, apps/api/src/common/visibility.ts, forbids telling
  // the three apart, same as every other 404-vs-403 decision in this app).
  if (isError) {
    return (
      <AppShell header={<AppHeader userName={user?.displayName} onLogout={logout} />}>
        <PageHeader title="Campaña no disponible" crumbs={[{ label: "Mis campañas", to: "/" }]} />
        <EmptyState title="Esta campaña no existe o no tienes acceso">
          Puede que se haya borrado, que el enlace esté mal, o que no seas miembro de ella.
          Distinguir esos tres casos diría más de lo que debe, así que no se distinguen.
        </EmptyState>
      </AppShell>
    );
  }

  return (
    <AppShell header={<AppHeader userName={user?.displayName} onLogout={logout} />}>
      <PageHeader
        title={isLoading ? "Cargando…" : (campaign?.name ?? "")}
        // Only one crumb: the campaign's own name is the <h1> directly below, and a
        // breadcrumb whose last item repeats the heading under it is noise, not orientation.
        crumbs={[{ label: "Mis campañas", to: "/" }]}
      />
      {/* layout="sidebar": the same WAI-ARIA tablist, standing up. Ten sections in a flat
          strip said everything here was the same kind of thing (audit B4); a grouped column
          says which of them is the world and which is the table. */}
      <Tabs items={items} layout="sidebar" active={seccionActiva} onChange={abrirSeccion} />
    </AppShell>
  );
}
