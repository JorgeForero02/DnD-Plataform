import { useState } from "react";
import type { EntityType, Visibility } from "@dnd/shared";
import { useMembers } from "../campaigns/members";
import { LinksPanel } from "../links/LinksPanel";
import { CommentThread } from "../comments/CommentThread";
import { useComments } from "../comments/hooks";
import { DeleteButton } from "../../components/DeleteButton";
import { Markdown } from "./Markdown";
import { bodyToText } from "./body";
import { useCreateEntity, useDeleteEntity, useEntity, useUpdateEntity } from "./hooks";
import type { Entity } from "./api";

const VISIBILITIES: Visibility[] = ["PUBLIC", "PLAYERS", "SPECIFIC_PLAYERS", "OWNER_DM", "DM_ONLY"];

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export function EntityEditor({
  campaignId,
  type,
  entity,
  onClose,
  readOnly = false,
  readOnlyReason,
}: {
  campaignId: string;
  type: EntityType;
  entity?: Entity;
  onClose: () => void;
  // Arreglo 1 (1.15-fix): the row that opens this editor now opens unconditionally — it's the
  // only detail view this app has, and hiding it behind edit permission left a player who
  // *can* view an entity (canView, apps/api/src/common/visibility.ts) unable to read its
  // description, tags, links or comments. `readOnly` is what the row's permission check now
  // controls instead: the form renders disabled and Guardar stays off, with `readOnlyReason`
  // shown next to it — but LinksPanel and CommentThread below are unaffected, because reading
  // and commenting were never gated on edit permission on the server to begin with
  // (comments.service.ts requires only canView; links.service.ts requires only membership).
  readOnly?: boolean;
  readOnlyReason?: string;
}) {
  const isEdit = !!entity;
  const [name, setName] = useState(entity?.name ?? "");
  const [tagsRaw, setTagsRaw] = useState((entity?.tags ?? []).join(", "));
  // A player creating with the model default (DM_ONLY) gets a 201 and an entity nobody but
  // the DM can see, including the player who just wrote it (visibility.ts:28-29). The DM is
  // unaffected: canView short-circuits true for any DM before it even looks at visibility
  // (visibility.ts:17), so OWNER_DM and DM_ONLY are indistinguishable from that side. This is
  // only the form's starting value — canView and the schema/Prisma defaults are untouched.
  const [visibility, setVisibility] = useState<Visibility>(entity?.visibility ?? "OWNER_DM");
  // Unlike specificPlayerIds, body already arrives on the list response (unlike grants,
  // which need the detail fetch), so it seeds straight from `entity` and is deliberately
  // NOT part of the `seededFor` re-seeding below: re-seeding from `detail.data` once it
  // resolves would overwrite whatever the person is mid-typing in the textarea.
  const [bodyText, setBodyText] = useState(bodyToText(entity?.body));
  const [bodyView, setBodyView] = useState<"edit" | "preview">("edit");
  const [specificPlayerIds, setSpecificPlayerIds] = useState<string[]>([]);
  // Tracks which entity's grants are already loaded into specificPlayerIds, so the seeding
  // below runs exactly once per fetched entity instead of on every render.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Only asked for when editing, and only while the picker can matter.
  const detail = useEntity(campaignId, type, entity?.id, isEdit);
  // While editing, until the entity's own grants have loaded we don't know what the current
  // selection should be. Sending specificPlayerIds in that window would wipe every grant the
  // entity already has (see docs/06-pendientes.md). Once fetched, detailReady flips to true;
  // for a brand-new entity there is nothing to preload, so it's true immediately.
  const detailReady = !isEdit || detail.isSuccess;

  // Adjusting state during render (not in an effect) for the one-time preload: React explicitly
  // supports this pattern for "reset/derive state when an input changes" and it avoids the
  // extra render an effect-based setState would cause.
  if (detail.data && seededFor !== detail.data.id) {
    setSeededFor(detail.data.id);
    setSpecificPlayerIds(detail.data.grants.map((g) => g.userId));
  }

  const members = useMembers(campaignId, { enabled: visibility === "SPECIFIC_PLAYERS" });
  const create = useCreateEntity(campaignId, type);
  const update = useUpdateEntity(campaignId, type);
  const pending = create.isPending || update.isPending;

  // Only to read a real count for the delete-confirmation text below — shares its query key
  // with CommentThread's own useComments(entityId) call, so this doesn't add a second request.
  const comments = useComments(entity?.id ?? "", { enabled: isEdit });
  const deleteEntity = useDeleteEntity(campaignId, type);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const onConfirmDelete = async () => {
    if (!entity) return;
    setDeleteError(null);
    try {
      await deleteEntity.mutateAsync(entity.id);
      onClose();
    } catch (err) {
      setDeleteError((err as Error).message);
    }
  };

  // The schema borra en cascada (schema.prisma: Entity -> EntityLink onDelete Cascade in both
  // directions, EntityVisibilityGrant onDelete Cascade, Comment onDelete Cascade) — deleting
  // this entity also deletes every link it's part of (as source or as target, which this UI
  // has no way to count: /entities/:id/links only lists this entity's own outgoing links,
  // filtered by what the viewer can see), every comment on it, and every visibility grant it
  // has. Comments and grants have real counts on hand; links don't, honestly, so the sentence
  // names them without inventing a number.
  const grantsCount = detail.data?.grants.length;
  const commentsCount = comments.data?.length;
  const deleteMessage = entity
    ? `Vas a borrar "${entity.name}". No se puede deshacer: se borrarán también todos los ` +
      `enlaces en los que aparece, salgan de ella o apunten a ella` +
      (commentsCount !== undefined
        ? `, ${commentsCount} comentario${commentsCount === 1 ? "" : "s"}`
        : ", sus comentarios") +
      (grantsCount !== undefined
        ? ` y ${grantsCount} ${grantsCount === 1 ? "concesión" : "concesiones"} de visibilidad.`
        : " y sus concesiones de visibilidad.")
    : "";

  const togglePlayer = (userId: string) =>
    setSpecificPlayerIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    setError(null);
    const payload = {
      type,
      name,
      tags: parseTags(tagsRaw),
      visibility,
      // Editing always sends the key, even empty, so an emptied textarea actually clears the
      // body on the server (entities.service.ts only writes a key that's present — trap paid
      // for in 1.13). Creating only sends it when there's something to save.
      ...(isEdit
        ? { body: { format: "markdown" as const, text: bodyText } }
        : bodyText.trim()
          ? { body: { format: "markdown" as const, text: bodyText } }
          : {}),
      ...(visibility === "SPECIFIC_PLAYERS" && detailReady ? { specificPlayerIds } : {}),
    };
    try {
      if (isEdit && entity) {
        await update.mutateAsync({ entityId: entity.id, input: payload });
      } else {
        await create.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-y-auto bg-black/50 py-8">
      <div className="w-[28rem] space-y-4">
        <form onSubmit={onSubmit} className="space-y-3 rounded-lg bg-slate-800 p-6">
          <h2 className="text-lg font-bold">
            {isEdit ? "Editar" : "Nuevo"} {type}
          </h2>
          {readOnly && (
            <p className="rounded bg-slate-700/50 p-2 text-xs text-amber-400">
              {readOnlyReason ?? "Solo puedes ver esta entidad."}
            </p>
          )}
          <div>
            <label htmlFor="name" className="block text-sm">
              Nombre
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={readOnly}
              className="w-full rounded bg-slate-700 p-2 disabled:opacity-60"
            />
          </div>
          <div>
            <label htmlFor="tags" className="block text-sm">
              Etiquetas (separadas por coma)
            </label>
            <input
              id="tags"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              disabled={readOnly}
              className="w-full rounded bg-slate-700 p-2 disabled:opacity-60"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              {readOnly ? (
                // Not a <label>: there is no control here for it to point at (the textarea
                // is gone below). Still a visible, findable name for the rendered body — both
                // visually (the <p> itself) and for assistive tech (id + aria-labelledby on
                // the region below) — so a player reading a PUBLIC NPC doesn't see an
                // unlabelled block of prose between "Etiquetas" and "Visibilidad".
                <p id="body-readonly-label" className="block text-sm">
                  Texto
                </p>
              ) : (
                <label htmlFor="body" className="block text-sm">
                  Texto
                </label>
              )}
              {!readOnly && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-pressed={bodyView === "edit"}
                    onClick={() => setBodyView("edit")}
                    className="rounded bg-slate-700 px-2 py-0.5 text-xs aria-pressed:bg-indigo-600"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    aria-pressed={bodyView === "preview"}
                    onClick={() => setBodyView("preview")}
                    className="rounded bg-slate-700 px-2 py-0.5 text-xs aria-pressed:bg-indigo-600"
                  >
                    Vista previa
                  </button>
                </div>
              )}
            </div>
            {readOnly ? (
              <div role="region" aria-labelledby="body-readonly-label">
                <Markdown text={bodyText} />
              </div>
            ) : bodyView === "edit" ? (
              <textarea
                id="body"
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={6}
                className="w-full rounded bg-slate-700 p-2"
              />
            ) : (
              <Markdown text={bodyText} />
            )}
          </div>
          <div>
            <label htmlFor="visibility" className="block text-sm">
              Visibilidad
            </label>
            <select
              id="visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Visibility)}
              disabled={readOnly}
              className="w-full rounded bg-slate-700 p-2 disabled:opacity-60"
            >
              {VISIBILITIES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          {visibility === "SPECIFIC_PLAYERS" && (
            <fieldset className="rounded border border-slate-600 p-2">
              <legend className="text-sm">Jugadores con acceso</legend>
              {members.isLoading && <p className="text-sm text-slate-400">Cargando jugadores…</p>}
              {members.isError && (
                <p className="text-sm text-red-400">
                  No se pudo cargar la lista de jugadores. Un fieldset vacío aquí no significa que
                  la campaña no tenga jugadores.
                </p>
              )}
              {members.data
                ?.filter((m) => m.role === "PLAYER")
                .map((m) => (
                  <label key={m.userId} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={specificPlayerIds.includes(m.userId)}
                      onChange={() => togglePlayer(m.userId)}
                      disabled={readOnly}
                    />
                    {m.displayName}
                  </label>
                ))}
            </fieldset>
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex items-center justify-between gap-2">
            {isEdit && (
              <DeleteButton
                message={deleteMessage}
                onConfirm={onConfirmDelete}
                pending={deleteEntity.isPending}
                disabled={readOnly}
                disabledReason={readOnlyReason}
              />
            )}
            <div className="flex flex-1 justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded bg-slate-700 px-3 py-1">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending || readOnly}
                title={readOnly ? readOnlyReason : undefined}
                className="rounded bg-indigo-600 px-3 py-1 font-semibold disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
          {deleteError && <p className="text-red-400 text-sm">{deleteError}</p>}
        </form>
        {/* Links and comments only make sense once the entity exists: a brand-new entity
          has no entityId to hang them off yet. Kept as siblings of the form, not nested
          inside it — HTML forms don't nest, and each panel owns its own submit. */}
        {isEdit && entity && (
          <>
            <LinksPanel
              campaignId={campaignId}
              entityId={entity.id}
              entityCreatedById={entity.createdById}
            />
            <CommentThread campaignId={campaignId} entityId={entity.id} />
          </>
        )}
      </div>
    </div>
  );
}
