import { useState } from "react";
import type { Visibility } from "@dnd/shared";
import { useCreateCharacter, useUpdateCharacter } from "./hooks";
import type { Character } from "./api";

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
}: {
  campaignId: string;
  character?: Character;
  onClose: () => void;
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

  // Same reasoning and same fix as SessionEditor.tsx: a character can arrive with a
  // visibility this editor doesn't itself offer, and without this the <select> would paint
  // blank with no explanation.
  const visibilityOptions = VISIBILITIES.includes(visibility)
    ? VISIBILITIES
    : [...VISIBILITIES, visibility];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="fixed inset-0 flex items-center justify-center overflow-y-auto bg-black/50 py-8">
      <form onSubmit={onSubmit} className="w-[28rem] space-y-3 rounded-lg bg-slate-800 p-6">
        <h2 className="text-lg font-bold">{isEdit ? "Editar personaje" : "Nuevo personaje"}</h2>
        <div>
          <label htmlFor="character-name" className="block text-sm">
            Nombre
          </label>
          <input
            id="character-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded bg-slate-700 p-2"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label htmlFor="character-race" className="block text-sm">
              Raza
            </label>
            <input
              id="character-race"
              value={race}
              onChange={(e) => setRace(e.target.value)}
              className="w-full rounded bg-slate-700 p-2"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="character-class" className="block text-sm">
              Clase
            </label>
            <input
              id="character-class"
              value={charClass}
              onChange={(e) => setCharClass(e.target.value)}
              className="w-full rounded bg-slate-700 p-2"
            />
          </div>
          <div className="w-24">
            <label htmlFor="character-level" className="block text-sm">
              Nivel
            </label>
            <input
              id="character-level"
              type="number"
              min={1}
              max={20}
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full rounded bg-slate-700 p-2"
            />
          </div>
        </div>
        <div>
          <label htmlFor="character-bio" className="block text-sm">
            Biografía
          </label>
          <textarea
            id="character-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full rounded bg-slate-700 p-2"
            rows={3}
          />
        </div>
        <div>
          <label htmlFor="character-visibility" className="block text-sm">
            Visibilidad
          </label>
          <select
            id="character-visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
            className="w-full rounded bg-slate-700 p-2"
          >
            {visibilityOptions.map((v) => (
              <option key={v} value={v}>
                {v}
                {!VISIBILITIES.includes(v) ? " (valor guardado, no seleccionable aquí)" : ""}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded bg-slate-700 px-3 py-1">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-indigo-600 px-3 py-1 font-semibold disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
