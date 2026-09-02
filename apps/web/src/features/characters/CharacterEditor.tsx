import { useState } from "react";
import type { Visibility } from "@dnd/shared";
import { DeleteButton } from "../../components/DeleteButton";
import { useCreateCharacter, useDeleteCharacter, useUpdateCharacter } from "./hooks";
import type { Character } from "./api";
import { Button } from "../../ui/Button";
import { Field, fieldControlClass } from "../../ui/Field";
import { Dialog } from "../../ui/Dialog";

// SPECIFIC_PLAYERS is dropped on purpose, same reasoning as SessionEditor.tsx: Character has
// no grants (docs/05-datos.md), so it would be an option that silently does nothing. OWNER_DM
// is kept and is fully meaningful here — ownerId is the creator, so OWNER_DM really does mean
// "the owner and the DM", with the one caveat that the owner stops seeing their own character
// if they pick DM_ONLY instead (also documented, not fixed here per the brief).
const VISIBILITIES: Visibility[] = ["PUBLIC", "PLAYERS", "OWNER_DM", "DM_ONLY"];

export function CharacterEditor({
  campaignId,
  character,
  onClose,
  readOnly = false,
  readOnlyReason,
}: {
  campaignId: string;
  character?: Character;
  onClose: () => void;
  // Arreglo 1 (1.15-fix): see the same prop on EntityEditor.tsx — the row that opens this now
  // opens unconditionally, and this is what a player who can view but not edit the character
  // gets instead of an editable form.
  readOnly?: boolean;
  readOnlyReason?: string;
}) {
  const isEdit = !!character;
  const [name, setName] = useState(character?.name ?? "");
  const [race, setRace] = useState(character?.race ?? "");
  const [charClass, setCharClass] = useState(character?.class ?? "");
  const [level, setLevel] = useState(String(character?.level ?? 1));
  const [bio, setBio] = useState(character?.bio ?? "");
  const [visibility, setVisibility] = useState<Visibility>(character?.visibility ?? "PLAYERS");
  const [error, setError] = useState<string | null>(null);

  const create = useCreateCharacter(campaignId);
  const update = useUpdateCharacter(campaignId);
  const pending = create.isPending || update.isPending;

  const deleteCharacter = useDeleteCharacter(campaignId);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const onConfirmDelete = async () => {
    if (!character) return;
    setDeleteError(null);
    try {
      await deleteCharacter.mutateAsync(character.id);
      onClose();
    } catch (err) {
      setDeleteError((err as Error).message);
    }
  };

  // Character has no cascading children in schema.prisma — nothing else disappears with it.
  const deleteMessage = character
    ? `Vas a borrar a "${character.name}". No se puede deshacer.`
    : "";

  // Same reasoning and same fix as SessionEditor.tsx: a character can arrive with a
  // visibility this editor doesn't itself offer, and without this the <select> would paint
  // blank with no explanation.
  const visibilityOptions = VISIBILITIES.includes(visibility)
    ? VISIBILITIES
    : [...VISIBILITIES, visibility];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    setError(null);
    const trimmedRace = race.trim();
    const trimmedClass = charClass.trim();
    const trimmedBio = bio.trim();
    // In edit mode, an omitted key means "leave it as-is" on the server
    // (characters.service.ts: `if (input.race !== undefined) data.race = ...`), so clearing
    // a field has to send the empty string, not omit the key — otherwise the old value
    // survives a save that looks successful. In create mode there is no old value to
    // preserve, so an empty field is still omitted (the schema field is optional).
    const payload = {
      name,
      // Number(), not parseInt: an input left blank becomes Number("") === 0, which the
      // schema's min(1) rejects with a readable 400 instead of silently coercing to 1.
      level: Number(level),
      visibility,
      ...(isEdit ? { race: trimmedRace } : trimmedRace ? { race: trimmedRace } : {}),
      ...(isEdit ? { class: trimmedClass } : trimmedClass ? { class: trimmedClass } : {}),
      ...(isEdit ? { bio: trimmedBio } : trimmedBio ? { bio: trimmedBio } : {}),
    };
    try {
      if (isEdit && character) {
        await update.mutateAsync({ characterId: character.id, input: payload });
      } else {
        await create.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Dialog open onClose={onClose} title={isEdit ? "Editar personaje" : "Nuevo personaje"}>
      <form onSubmit={onSubmit} className="space-y-3">
        {readOnly && (
          <p className="rounded-radius-sm border border-muted bg-bg p-2 text-chrome-xs text-muted">
            {readOnlyReason ?? "Solo puedes ver este personaje."}
          </p>
        )}
        <Field label="Nombre">
          <input
            id="character-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={readOnly}
            className={fieldControlClass}
          />
        </Field>
        <div className="flex gap-2">
          <div className="flex-1">
            <Field label="Raza">
              <input
                id="character-race"
                value={race}
                onChange={(e) => setRace(e.target.value)}
                disabled={readOnly}
                className={fieldControlClass}
              />
            </Field>
          </div>
          <div className="flex-1">
            <Field label="Clase">
              <input
                id="character-class"
                value={charClass}
                onChange={(e) => setCharClass(e.target.value)}
                disabled={readOnly}
                className={fieldControlClass}
              />
            </Field>
          </div>
          <div className="w-24">
            <Field label="Nivel">
              <input
                id="character-level"
                type="number"
                min={1}
                max={20}
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                disabled={readOnly}
                className={fieldControlClass}
              />
            </Field>
          </div>
        </div>
        <Field label="Biografía">
          <textarea
            id="character-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            disabled={readOnly}
            className={fieldControlClass}
            rows={3}
          />
        </Field>
        <Field label="Visibilidad">
          <select
            id="character-visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
            disabled={readOnly}
            className={fieldControlClass}
          >
            {visibilityOptions.map((v) => (
              <option key={v} value={v}>
                {v}
                {!VISIBILITIES.includes(v) ? " (valor guardado, no seleccionable aquí)" : ""}
              </option>
            ))}
          </select>
        </Field>
        {error && <p className="text-chrome-sm text-danger-text">{error}</p>}
        <div className="flex items-center justify-between gap-2">
          {isEdit && (
            <DeleteButton
              message={deleteMessage}
              onConfirm={onConfirmDelete}
              pending={deleteCharacter.isPending}
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
    </Dialog>
  );
}
