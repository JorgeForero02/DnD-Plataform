import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { EntityType } from "@dnd/shared";
import { useCampaign } from "../features/campaigns/hooks";
import { useMyRole } from "../features/campaigns/members";
import { useAuthStore } from "../store/auth.store";
import { useEntities } from "../features/entities/hooks";
import { EntityEditor } from "../features/entities/EntityEditor";
import { EntityFilterBar } from "../features/entities/EntityFilterBar";
import { filterEntities, type EntityFilterValue } from "../features/entities/filter";
import type { Entity } from "../features/entities/api";
import { useSessions } from "../features/sessions/hooks";
import { SessionEditor } from "../features/sessions/SessionEditor";
import type { Session } from "../features/sessions/api";
import { useCharacters } from "../features/characters/hooks";
import { CharacterEditor } from "../features/characters/CharacterEditor";
import type { Character } from "../features/characters/api";
import { InvitePanel } from "../features/invites/InvitePanel";
import { CampaignSettings } from "../features/campaigns/CampaignSettings";
import { MembersPanel } from "../features/campaigns/MembersPanel";
import { CHECKING_PERMISSIONS, RetryPermissions } from "../features/campaigns/PermissionStatus";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Tabs, type TabItem } from "../ui/Tabs";

type TabConfig =
  | { kind: "overview"; label: string }
  | { kind: "entity"; label: string; type: EntityType }
  | { kind: "sessions"; label: string }
  | { kind: "characters"; label: string };

const TABS: TabConfig[] = [
  { kind: "overview", label: "Resumen" },
  { kind: "entity", label: "NPCs", type: "NPC" },
  { kind: "entity", label: "Lugares", type: "LOCATION" },
  { kind: "entity", label: "Misiones", type: "QUEST" },
  { kind: "entity", label: "Facciones", type: "FACTION" },
  { kind: "entity", label: "Objetos", type: "OBJECT" },
  { kind: "entity", label: "Eventos", type: "EVENT" },
  { kind: "entity", label: "Documentos", type: "DOCUMENT" },
  { kind: "sessions", label: "Sesiones" },
  { kind: "characters", label: "Personajes" },
];

// Row buttons (entity/session/character lists) share this chrome recipe: a bordered card,
// keyed by --surface, with the border picking up --accent on hover/focus instead of a bg
// swap — the token palette has no third dark shade between --bg and --surface to fake the
// old pre-token dark-card/hover-lighter pair with.
const ROW_BUTTON_CLASS =
  "w-full rounded-radius-sm border border-muted bg-surface p-3 text-left font-chrome text-chrome-sm text-text hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

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
  const [editing, setEditing] = useState<Entity | null>(null);
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
      {/* Creating is open to any campaign member on the server (entities.service.ts,
          requireMember), so it isn't gated here. */}
      <Button variant="primary" onClick={() => setCreating(true)} className="mb-3">
        Nuevo
      </Button>
      {roleError && (
        <p className="mb-3 text-chrome-xs text-danger-text">No se pudo comprobar tu permiso.</p>
      )}
      {roleError && <RetryPermissions onRetry={retryRole} />}
      {data && data.length > 0 && (
        <EntityFilterBar
          availableTags={availableTags}
          value={filter}
          onChange={setFilter}
          totalCount={data.length}
          visibleCount={filtered?.length ?? 0}
        />
      )}
      {isLoading && <p className="text-muted">Cargando…</p>}
      {isError && <p className="text-danger-text">{(error as Error).message}</p>}
      {data && data.length === 0 && <p className="text-muted">Sin elementos.</p>}
      {data && data.length > 0 && filtered && filtered.length === 0 && (
        <p className="text-muted">Ningún elemento coincide con el filtro.</p>
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
              <button onClick={() => setEditing(e)} title={reason} className={ROW_BUTTON_CLASS}>
                <span className="font-semibold">{e.name}</span>
                <span className="ml-2 inline-block align-middle">
                  <Badge visibility={e.visibility} />
                </span>
                {/* A2 (1.17c): tags were written and never read anywhere but the editor's own
                    field. An entity with none paints nothing — no gap, no dash, no "sin
                    etiquetas" — see the brief this task followed. Deduped here (not in
                    parseTags/entity.schema.ts, which allow "lich, lich" through as
                    ["lich","lich"] — tightening what gets persisted is a different decision,
                    see docs/06-pendientes.md) so a duplicate tag doesn't paint the same badge
                    twice or emit a duplicate React key warning. */}
                {e.tags.length > 0 && (
                  <span className="ml-2 inline-flex flex-wrap gap-1">
                    {Array.from(new Set(e.tags)).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-radius-sm border border-muted bg-surface px-1.5 py-0.5 text-chrome-xs text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </span>
                )}
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
              </button>
            </li>
          );
        })}
      </ul>
      {creating && (
        <EntityEditor campaignId={campaignId} type={type} onClose={() => setCreating(false)} />
      )}
      {editing && (
        <EntityEditor
          campaignId={campaignId}
          type={type}
          entity={editing}
          onClose={() => setEditing(null)}
          readOnly={roleUnresolved || !(isDM || editing.createdById === userId)}
          readOnlyReason={
            roleUnresolved ? CHECKING_PERMISSIONS : "Solo el DM o quien lo creó puede editarlo."
          }
        />
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
        Nuevo
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
      {data && data.length === 0 && <p className="text-muted">Sin sesiones.</p>}
      <ul className="space-y-2">
        {data?.map((s) => (
          <li key={s.id}>
            {/* Arreglo 1 (1.15-fix), Crítico: the row always opens — the fecha and notas a
                player can already see via canView were unreachable while the row itself was
                disabled. */}
            <button onClick={() => setEditing(s)} title={reason} className={ROW_BUTTON_CLASS}>
              <span className="font-semibold">{s.title}</span>
              <span className="ml-2 inline-block align-middle">
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
  const [editing, setEditing] = useState<Character | null>(null);

  return (
    <div>
      {/* Creating is open to any campaign member on the server (characters.service.ts,
          requireMember), so it isn't gated here. */}
      <Button variant="primary" onClick={() => setCreating(true)} className="mb-3">
        Nuevo
      </Button>
      {roleError && (
        <p className="mb-3 text-chrome-xs text-danger-text">No se pudo comprobar tu permiso.</p>
      )}
      {roleError && <RetryPermissions onRetry={retryRole} />}
      {isLoading && <p className="text-muted">Cargando…</p>}
      {isError && <p className="text-danger-text">{(error as Error).message}</p>}
      {data && data.length === 0 && <p className="text-muted">Sin personajes.</p>}
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
              <button onClick={() => setEditing(c)} title={reason} className={ROW_BUTTON_CLASS}>
                <span className="font-semibold">{c.name}</span>
                <span className="ml-2 text-chrome-xs text-muted">Nivel {c.level}</span>
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
              </button>
            </li>
          );
        })}
      </ul>
      {creating && <CharacterEditor campaignId={campaignId} onClose={() => setCreating(false)} />}
      {editing && (
        <CharacterEditor
          campaignId={campaignId}
          character={editing}
          onClose={() => setEditing(null)}
          readOnly={roleUnresolved || !(isDM || editing.ownerId === userId)}
          readOnlyReason={
            roleUnresolved
              ? CHECKING_PERMISSIONS
              : "Solo el dueño o el DM puede editar este personaje."
          }
        />
      )}
    </div>
  );
}

export function CampaignDetailPage() {
  const { id = "" } = useParams();
  const { data: campaign, isLoading, isError } = useCampaign(id);

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
        content: (
          <div className="space-y-4">
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
        content: <EntityTab key={t.type} campaignId={id} type={t.type} />,
      };
    }
    if (t.kind === "sessions") {
      return { id: "sessions", label: t.label, content: <SessionsTab campaignId={id} /> };
    }
    return { id: "characters", label: t.label, content: <CharactersTab campaignId={id} /> };
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
      <div className="min-h-screen bg-bg p-8 text-text">
        <Link to="/" className="text-chrome-sm text-accent-text">
          &larr; Mis campañas
        </Link>
        <p className="mt-4 text-chrome-sm text-danger-text">
          Esta campaña no existe o no tienes acceso.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg p-8 text-text">
      <Link to="/" className="text-chrome-sm text-accent-text">
        &larr; Mis campañas
      </Link>
      <h1 className="mt-2 text-chrome-2xl font-bold">{isLoading ? "Cargando…" : campaign?.name}</h1>
      <section className="mt-4">
        <Tabs items={items} />
      </section>
    </div>
  );
}
