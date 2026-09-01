import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { EntityType } from "@dnd/shared";
import { useCampaign } from "../features/campaigns/hooks";
import { useEntities } from "../features/entities/hooks";
import { EntityEditor } from "../features/entities/EntityEditor";
import type { Entity } from "../features/entities/api";
import { useSessions } from "../features/sessions/hooks";
import { useCharacters } from "../features/characters/hooks";

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
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Entity | null>(null);

  return (
    <div>
      <button
        onClick={() => setCreating(true)}
        className="mb-3 rounded bg-indigo-600 px-3 py-1 text-sm font-semibold"
      >
        Nuevo
      </button>
      {isLoading && <p className="text-slate-400">Cargando…</p>}
      {isError && <p className="text-red-400">{(error as Error).message}</p>}
      {data && data.length === 0 && <p className="text-slate-400">Sin elementos.</p>}
      <ul className="space-y-2">
        {data?.map((e) => (
          <li key={e.id}>
            <button
              onClick={() => setEditing(e)}
              className="w-full rounded bg-slate-800 p-3 text-left hover:bg-slate-700"
            >
              <span className="font-semibold">{e.name}</span>
              <span className="ml-2 text-xs text-slate-500">{e.visibility}</span>
            </button>
          </li>
        ))}
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
        />
      )}
    </div>
  );
}

function SessionsTab({ campaignId }: { campaignId: string }) {
  const { data, isLoading, isError, error } = useSessions(campaignId);
  if (isLoading) return <p className="text-slate-400">Cargando…</p>;
  if (isError) return <p className="text-red-400">{(error as Error).message}</p>;
  if (!data || data.length === 0) return <p className="text-slate-400">Sin sesiones.</p>;
  return (
    <ul className="space-y-2">
      {data.map((s) => (
        <li key={s.id} className="rounded bg-slate-800 p-3">
          <span className="font-semibold">{s.title}</span>
          <span className="ml-2 text-xs text-slate-500">{s.visibility}</span>
        </li>
      ))}
    </ul>
  );
}

function CharactersTab({ campaignId }: { campaignId: string }) {
  const { data, isLoading, isError, error } = useCharacters(campaignId);
  if (isLoading) return <p className="text-slate-400">Cargando…</p>;
  if (isError) return <p className="text-red-400">{(error as Error).message}</p>;
  if (!data || data.length === 0) return <p className="text-slate-400">Sin personajes.</p>;
  return (
    <ul className="space-y-2">
      {data.map((c) => (
        <li key={c.id} className="rounded bg-slate-800 p-3">
          <span className="font-semibold">{c.name}</span>
          <span className="ml-2 text-xs text-slate-500">Nivel {c.level}</span>
        </li>
      ))}
    </ul>
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
          <p className="text-slate-300">{campaign?.description || "Sin descripción."}</p>
        )}
        {tab.kind === "entity" && <EntityTab campaignId={id} type={tab.type} />}
        {tab.kind === "sessions" && <SessionsTab campaignId={id} />}
        {tab.kind === "characters" && <CharactersTab campaignId={id} />}
      </section>
    </div>
  );
}
