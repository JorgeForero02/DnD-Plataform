import { useState } from "react";
import { useAllEntities } from "../entities/hooks";
import { useMyRole } from "../campaigns/members";
import { CHECKING_PERMISSIONS } from "../campaigns/PermissionStatus";
import { useAuthStore } from "../../store/auth.store";
import { useCreateLink, useDeleteLink, useLinks } from "./hooks";
import { Button } from "../../ui/Button";
import { fieldControlClass } from "../../ui/Field";

// The task 1.15 gap this task closes: this panel used to paint "Quitar" unconditionally,
// without looking at who was looking at it. The server rule (links.service.ts:75) is DM or
// the creator of the *source* entity (`link.from.createdById`) — every link listed here has
// this panel's own entity as its `from` (LinksPanel is only ever mounted for one entity's own
// outgoing links, see EntityEditor.tsx), so `entityCreatedById` is that one value for every
// row, not per-link.
export function LinksPanel({
  campaignId,
  entityId,
  entityCreatedById,
}: {
  campaignId: string;
  entityId: string;
  entityCreatedById: string;
}) {
  const links = useLinks(entityId);
  const targets = useAllEntities(campaignId);
  const createLink = useCreateLink(entityId);
  const deleteLink = useDeleteLink(entityId);
  const [toId, setToId] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { role, isLoading: roleLoading, isError: roleError } = useMyRole(campaignId);
  const userId = useAuthStore((s) => s.user?.id);
  // Same "still don't know" treatment as everywhere else in this app (CampaignDetailPage.tsx):
  // a failed or in-flight role check disables rather than guesses.
  const roleUnresolved = roleLoading || roleError;
  const canRemoveLinks = !roleUnresolved && (role === "DM" || entityCreatedById === userId);
  const removeReason = roleUnresolved
    ? CHECKING_PERMISSIONS
    : "Solo el DM o quien creó esta entidad puede quitar enlaces.";

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
    <section className="space-y-2 rounded-radius-sm border border-muted p-3">
      <h3 className="text-chrome-sm font-semibold">Enlaces</h3>
      {links.isLoading && <p className="text-chrome-sm text-muted">Cargando enlaces…</p>}
      {links.isError && (
        <p className="text-chrome-sm text-danger-text">No se pudieron cargar los enlaces.</p>
      )}
      {links.data && links.data.length === 0 && (
        <p className="text-chrome-sm text-muted">Sin enlaces.</p>
      )}
      <ul className="space-y-1">
        {links.data?.map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-2 text-chrome-sm">
            <span>
              {l.to.name} <span className="text-muted">({l.to.type})</span>
              {l.label ? ` — ${l.label}` : ""}
            </span>
            <button
              type="button"
              onClick={() =>
                deleteLink.mutate(l.id, {
                  onError: (err) => setError((err as Error).message),
                })
              }
              disabled={!canRemoveLinks}
              title={!canRemoveLinks ? removeReason : undefined}
              className="shrink-0 text-chrome-sm text-danger-text disabled:cursor-not-allowed disabled:text-muted"
            >
              Quitar
            </button>
          </li>
        ))}
      </ul>
      {/* Arreglo 2 (1.16-fix): the reason a row's "Quitar" is disabled used to live only in
          `title`, which touch has no way to reveal and screen readers don't announce. Same
          boolean for every row (see the comment above `canRemoveLinks`), so one visible line
          for the whole panel says it, matching CampaignDetailPage.tsx's disabled-with-visible-
          explanation pattern. */}
      {!canRemoveLinks && links.data && links.data.length > 0 && (
        <p className="text-chrome-xs text-muted">{removeReason}</p>
      )}
      <form onSubmit={onAdd} className="flex flex-wrap items-center gap-2">
        <label htmlFor="link-target" className="sr-only">
          Entidad destino
        </label>
        <select
          id="link-target"
          value={toId}
          onChange={(e) => setToId(e.target.value)}
          className={fieldControlClass}
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
          className={fieldControlClass}
        />
        <Button type="submit" disabled={!toId || createLink.isPending}>
          Añadir enlace
        </Button>
      </form>
      {error && <p className="text-chrome-sm text-danger-text">{error}</p>}
    </section>
  );
}
