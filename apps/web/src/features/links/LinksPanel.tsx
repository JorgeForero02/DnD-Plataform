import { useState } from "react";
import { useAllEntities } from "../entities/hooks";
import { useCreateLink, useDeleteLink, useLinks } from "./hooks";

export function LinksPanel({ campaignId, entityId }: { campaignId: string; entityId: string }) {
  const links = useLinks(entityId);
  const targets = useAllEntities(campaignId);
  const createLink = useCreateLink(entityId);
  const deleteLink = useDeleteLink(entityId);
  const [toId, setToId] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  // An entity linking to itself doesn't mean anything, and re-picking an already-linked
  // target would hit the schema's @@unique([fromId, toId, label]) (schema.prisma:100).
  const linkedIds = new Set((links.data ?? []).map((l) => l.to.id));
  const candidates = (targets.data ?? []).filter((e) => e.id !== entityId && !linkedIds.has(e.id));

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!toId) return;
    try {
      await createLink.mutateAsync({ toId, label: label.trim() || undefined });
      setToId("");
      setLabel("");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <section className="space-y-2 rounded border border-slate-700 p-3">
      <h3 className="text-sm font-semibold">Enlaces</h3>
      {links.isLoading && <p className="text-sm text-slate-400">Cargando enlaces…</p>}
      {links.isError && <p className="text-sm text-red-400">No se pudieron cargar los enlaces.</p>}
      {links.data && links.data.length === 0 && (
        <p className="text-sm text-slate-400">Sin enlaces.</p>
      )}
      <ul className="space-y-1">
        {links.data?.map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-2 text-sm">
            <span>
              {l.to.name} <span className="text-slate-400">({l.to.type})</span>
              {l.label ? ` — ${l.label}` : ""}
            </span>
            <button
              type="button"
              onClick={() =>
                deleteLink.mutate(l.id, {
                  onError: (err) => setError((err as Error).message),
                })
              }
              className="shrink-0 text-red-400"
            >
              Quitar
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={onAdd} className="flex flex-wrap items-center gap-2">
        <label htmlFor="link-target" className="sr-only">
          Entidad destino
        </label>
        <select
          id="link-target"
          value={toId}
          onChange={(e) => setToId(e.target.value)}
          className="rounded bg-slate-700 p-1 text-sm"
        >
          <option value="">Elige un destino…</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.type})
            </option>
          ))}
        </select>
        <label htmlFor="link-label" className="sr-only">
          Etiqueta del enlace
        </label>
        <input
          id="link-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Etiqueta (opcional)"
          className="rounded bg-slate-700 p-1 text-sm"
        />
        <button
          type="submit"
          disabled={!toId || createLink.isPending}
          className="rounded bg-indigo-600 px-2 py-1 text-sm font-semibold disabled:opacity-50"
        >
          Añadir enlace
        </button>
      </form>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </section>
  );
}
