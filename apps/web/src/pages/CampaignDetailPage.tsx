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

type Tab =
  | { kind: "overview"; label: string }
  | { kind: "entity"; label: string; type: EntityType }
  | { kind: "sessions"; label: string }
  | { kind: "characters"; label: string };

const TABS: Tab[] = [
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
      <button
        onClick={() => setCreating(true)}
        className="mb-3 rounded bg-indigo-600 px-3 py-1 text-sm font-semibold"
      >
        Nuevo
      </button>
      {roleError && <p className="mb-3 text-xs text-amber-400">No se pudo comprobar tu permiso.</p>}
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
      {isLoading && <p className="text-slate-400">Cargando…</p>}
      {isError && <p className="text-red-400">{(error as Error).message}</p>}
      {data && data.length === 0 && <p className="text-slate-400">Sin elementos.</p>}
      {data && data.length > 0 && filtered && filtered.length === 0 && (
        <p className="text-slate-400">Ningún elemento coincide con el filtro.</p>
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
              <button
                onClick={() => setEditing(e)}
                title={reason}
                className="w-full rounded bg-slate-800 p-3 text-left hover:bg-slate-700"
              >
                <span className="font-semibold">{e.name}</span>
                <span className="ml-2 text-xs text-slate-500">{e.visibility}</span>
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
                        className="rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </span>
                )}
                {reason && <span className="ml-2 text-xs text-amber-400">{reason}</span>}
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
      <button
        onClick={() => setCreating(true)}
        disabled={!canManage}
        title={reason}
        className="mb-3 rounded bg-indigo-600 px-3 py-1 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        Nuevo
      </button>
      {reason && <p className="mb-3 text-xs text-slate-400">{reason}</p>}
      {roleError && <RetryPermissions onRetry={retryRole} />}
      {isLoading && <p className="text-slate-400">Cargando…</p>}
      {isError && <p className="text-red-400">{(error as Error).message}</p>}
      {data && data.length === 0 && <p className="text-slate-400">Sin sesiones.</p>}
      <ul className="space-y-2">
        {data?.map((s) => (
          <li key={s.id}>
            {/* Arreglo 1 (1.15-fix), Crítico: the row always opens — the fecha and notas a
                player can already see via canView were unreachable while the row itself was
                disabled. */}
            <button
              onClick={() => setEditing(s)}
              title={reason}
              className="w-full rounded bg-slate-800 p-3 text-left hover:bg-slate-700"
            >
              <span className="font-semibold">{s.title}</span>
              <span className="ml-2 text-xs text-slate-500">{s.visibility}</span>
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
      <button
        onClick={() => setCreating(true)}
        className="mb-3 rounded bg-indigo-600 px-3 py-1 text-sm font-semibold"
      >
        Nuevo
      </button>
      {roleError && <p className="mb-3 text-xs text-amber-400">No se pudo comprobar tu permiso.</p>}
      {roleError && <RetryPermissions onRetry={retryRole} />}
      {isLoading && <p className="text-slate-400">Cargando…</p>}
      {isError && <p className="text-red-400">{(error as Error).message}</p>}
      {data && data.length === 0 && <p className="text-slate-400">Sin personajes.</p>}
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
              <button
                onClick={() => setEditing(c)}
                title={reason}
                className="w-full rounded bg-slate-800 p-3 text-left hover:bg-slate-700"
              >
                <span className="font-semibold">{c.name}</span>
                <span className="ml-2 text-xs text-slate-500">Nivel {c.level}</span>
                {reason && <span className="ml-2 text-xs text-amber-400">{reason}</span>}
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
  const { data: campaign, isLoading } = useCampaign(id);
  const [active, setActive] = useState(0);
  const tab = TABS[active];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <Link to="/" className="text-sm text-indigo-400">
        &larr; Mis campañas
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{isLoading ? "Cargando…" : campaign?.name}</h1>
      <nav className="mt-4 flex flex-wrap gap-2 border-b border-slate-700 pb-2">
        {TABS.map((t, i) => (
          <button
            key={t.label}
            onClick={() => setActive(i)}
            className={`rounded px-3 py-1 text-sm ${i === active ? "bg-indigo-600" : "bg-slate-800 hover:bg-slate-700"}`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <section className="mt-4">
        {tab.kind === "overview" && (
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
        )}
        {/* `key={tab.type}` (1.17c): without it, switching between two entity-type tabs
            reuses the same EntityTab instance instead of remounting — the new filter/search
            state (and `creating`/`editing`) would otherwise leak from one type's list into
            another's. Confirmed with a throwaway RTL check before adding this. */}
        {tab.kind === "entity" && <EntityTab key={tab.type} campaignId={id} type={tab.type} />}
        {tab.kind === "sessions" && <SessionsTab campaignId={id} />}
        {tab.kind === "characters" && <CharactersTab campaignId={id} />}
      </section>
    </div>
  );
}
