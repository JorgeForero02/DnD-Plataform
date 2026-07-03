import { useState } from "react";
import type { EntityType, Visibility } from "@dnd/shared";
import { useMembers } from "../campaigns/members";
import { useCreateEntity, useUpdateEntity } from "./hooks";
import type { Entity } from "./api";

const VISIBILITIES: Visibility[] = [
  "PUBLIC",
  "PLAYERS",
  "SPECIFIC_PLAYERS",
  "OWNER_DM",
  "DM_ONLY",
];

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
}: {
  campaignId: string;
  type: EntityType;
  entity?: Entity;
  onClose: () => void;
}) {
  const isEdit = !!entity;
  const [name, setName] = useState(entity?.name ?? "");
  const [tagsRaw, setTagsRaw] = useState((entity?.tags ?? []).join(", "));
  const [visibility, setVisibility] = useState<Visibility>(entity?.visibility ?? "DM_ONLY");
  const [specificPlayerIds, setSpecificPlayerIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const members = useMembers(campaignId);
  const create = useCreateEntity(campaignId, type);
  const update = useUpdateEntity(campaignId, type);
  const pending = create.isPending || update.isPending;

  const togglePlayer = (userId: string) =>
    setSpecificPlayerIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = {
      type,
      name,
      tags: parseTags(tagsRaw),
      visibility,
      ...(visibility === "SPECIFIC_PLAYERS" ? { specificPlayerIds } : {}),
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
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <form onSubmit={onSubmit} className="w-[28rem] space-y-3 rounded-lg bg-slate-800 p-6">
        <h2 className="text-lg font-bold">{isEdit ? "Editar" : "Nuevo"} {type}</h2>
        <div>
          <label htmlFor="name" className="block text-sm">Nombre</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full rounded bg-slate-700 p-2" />
        </div>
        <div>
          <label htmlFor="tags" className="block text-sm">Etiquetas (separadas por coma)</label>
          <input id="tags" value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)}
            className="w-full rounded bg-slate-700 p-2" />
        </div>
        <div>
          <label htmlFor="visibility" className="block text-sm">Visibilidad</label>
          <select id="visibility" value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
            className="w-full rounded bg-slate-700 p-2">
            {VISIBILITIES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        {visibility === "SPECIFIC_PLAYERS" && (
          <fieldset className="rounded border border-slate-600 p-2">
            <legend className="text-sm">Jugadores con acceso</legend>
            {members.data?.filter((m) => m.role === "PLAYER").map((m) => (
              <label key={m.userId} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={specificPlayerIds.includes(m.userId)}
                  onChange={() => togglePlayer(m.userId)} />
                {m.displayName}
              </label>
            ))}
          </fieldset>
        )}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded bg-slate-700 px-3 py-1">Cancelar</button>
          <button type="submit" disabled={pending}
            className="rounded bg-indigo-600 px-3 py-1 font-semibold disabled:opacity-50">Guardar</button>
        </div>
      </form>
    </div>
  );
}
