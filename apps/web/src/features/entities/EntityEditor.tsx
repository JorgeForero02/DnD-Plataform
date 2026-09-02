import { useState } from "react";
import type { EntityType, Visibility } from "@dnd/shared";
import { useMembers } from "../campaigns/members";
import { useComments } from "../comments/hooks";
import { DeleteButton } from "../../components/DeleteButton";
import { Markdown } from "./Markdown";
import { bodyToText } from "./body";
import { useCreateEntity, useDeleteEntity, useEntity, useUpdateEntity } from "./hooks";
import type { Entity } from "./api";
import { Button } from "../../ui/Button";
import { Field, fieldControlClass } from "../../ui/Field";
import { Dialog } from "../../ui/Dialog";

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
  onDeleted,
  readOnly = false,
  readOnlyReason,
}: {
  campaignId: string;
  type: EntityType;
  entity?: Entity;
  onClose: () => void;
  // Reseño 2026-09-02 — the editor now opens from a page dedicated to ONE entity
  // (EntityDetailPage), and deleting that entity leaves the reader standing on a page whose
  // subject no longer exists. Closing after a delete is not the same event as closing after a
  // cancel, so the caller gets to tell them apart instead of guessing.
  onDeleted?: () => void;
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
      if (onDeleted) onDeleted();
      else onClose();
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
    // Fix round 1 (post-1.19b review): the scroll handling that used to live on this wrapper
    // (max-h-[80vh] overflow-y-auto) moved into Dialog itself (ui/Dialog.tsx), so every
    // consumer gets it once instead of re-adding it — CharacterEditor and SessionEditor never
    // had it here to begin with.
    <Dialog open onClose={onClose} title={`${isEdit ? "Editar" : "Nuevo"} ${type}`}>
      <div className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-3">
          {readOnly && (
            <p className="rounded-radius-sm border border-muted bg-bg p-2 text-chrome-xs text-muted">
              {readOnlyReason ?? "Solo puedes ver esta entidad."}
            </p>
          )}
          <Field label="Nombre">
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={readOnly}
              className={fieldControlClass}
            />
          </Field>
          <Field label="Etiquetas (separadas por coma)">
            <input
              id="tags"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              disabled={readOnly}
              className={fieldControlClass}
            />
          </Field>
          <div>
            <div className="mb-1 flex items-center justify-between">
              {readOnly ? (
                // Not a <label>: there is no control here for it to point at (the textarea
                // is gone below). Still a visible, findable name for the rendered body — both
                // visually (the <p> itself) and for assistive tech (id + aria-labelledby on
                // the region below) — so a player reading a PUBLIC NPC doesn't see an
                // unlabelled block of prose between "Etiquetas" and "Visibilidad".
                <p id="body-readonly-label" className="text-chrome-sm text-text">
                  Texto
                </p>
              ) : (
                <label htmlFor="body" className="text-chrome-sm text-text">
                  Texto
                </label>
              )}
              {!readOnly && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-pressed={bodyView === "edit"}
                    onClick={() => setBodyView("edit")}
                    className="rounded-radius-sm border border-muted bg-surface px-2 py-0.5 text-chrome-xs text-text aria-pressed:border-accent aria-pressed:bg-bg aria-pressed:text-accent-text"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    aria-pressed={bodyView === "preview"}
                    onClick={() => setBodyView("preview")}
                    className="rounded-radius-sm border border-muted bg-surface px-2 py-0.5 text-chrome-xs text-text aria-pressed:border-accent aria-pressed:bg-bg aria-pressed:text-accent-text"
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
                className={fieldControlClass}
              />
            ) : (
              <Markdown text={bodyText} />
            )}
          </div>
          <Field label="Visibilidad">
            <select
              id="visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Visibility)}
              disabled={readOnly}
              className={fieldControlClass}
            >
              {VISIBILITIES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          {visibility === "SPECIFIC_PLAYERS" && (
            <fieldset className="rounded-radius-sm border border-muted p-2">
              <legend className="text-chrome-sm text-text">Jugadores con acceso</legend>
              {members.isLoading && (
                <p className="text-chrome-sm text-muted">Cargando jugadores…</p>
              )}
              {members.isError && (
                <p className="text-chrome-sm text-danger-text">
                  No se pudo cargar la lista de jugadores. Un fieldset vacío aquí no significa que
                  la campaña no tenga jugadores.
                </p>
              )}
              {members.data
                ?.filter((m) => m.role === "PLAYER")
                .map((m) => (
                  <label
                    key={m.userId}
                    className="flex items-center gap-2 text-chrome-sm text-text"
                  >
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
          {error && <p className="text-chrome-sm text-danger-text">{error}</p>}
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
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={pending || readOnly}
                title={readOnly ? readOnlyReason : undefined}
              >
                Guardar
              </Button>
            </div>
          </div>
          {deleteError && <p className="text-chrome-sm text-danger-text">{deleteError}</p>}
        </form>
        {/* Reseño 2026-09-02 — links and comments used to live in here, because this modal was
          the only screen an entity had: opening it was the only way to read one. Now that the
          reading page exists (EntityDetailPage) they belong to it, and this dialog goes back to
          doing one job — changing the fields of a record. Keeping both would also have rendered
          each panel twice on the same screen, which is how the browser suite found it. */}
      </div>
    </Dialog>
  );
}
