import { useState } from "react";
import type { Visibility } from "@dnd/shared";
import { useCreateCharacter } from "./hooks";
import { CHARACTER_VISIBILITIES } from "./niveles";
import { Button } from "../../ui/Button";
import { Field, fieldControlClass } from "../../ui/Field";
import { VisibilityChooser } from "../entities/VisibilityChooser";
import { Dialog } from "../../ui/Dialog";

// H6 del reseño de interfaz — **este diálogo solo crea.**
//
// Tenía dos modos, y el de edición era el segundo camino para tocar lo que la hoja ya edita en el
// sitio: nombre, raza, clase, nivel e historia. Ese modo se ha ido entero, junto con el borrado y
// el modo de solo lectura que lo acompañaban: en la hoja se edita donde se lee
// (`pages/CharacterDetailPage.tsx`), y la visibilidad y el borrado viven ahora en
// `AjustesDePersonaje.tsx`, dentro de esa misma página.
//
// Crear sí necesita un formulario —no hay dónde editar en el sitio algo que todavía no existe—,
// y es lo único que queda aquí. Los cinco campos son los que `CreateCharacterInput` admite; la
// raza y la clase de este formulario son el texto libre heredado, no las claves del catálogo de
// reglas, que se eligen luego en la hoja.
export function CharacterEditor({
  campaignId,
  onClose,
}: {
  campaignId: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [race, setRace] = useState("");
  const [charClass, setCharClass] = useState("");
  const [level, setLevel] = useState("1");
  const [bio, setBio] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("PLAYERS");
  const [error, setError] = useState<string | null>(null);

  const create = useCreateCharacter(campaignId);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedRace = race.trim();
    const trimmedClass = charClass.trim();
    const trimmedBio = bio.trim();
    // Creating has no previous value to preserve, so an empty field is simply omitted (the
    // schema field is optional). The "send the empty string to clear it" rule that used to live
    // here belonged to edit mode, and edit mode is gone.
    const payload = {
      name,
      // Number(), not parseInt: an input left blank becomes Number("") === 0, which the
      // schema's min(1) rejects with a readable 400 instead of silently coercing to 1.
      level: Number(level),
      visibility,
      ...(trimmedRace ? { race: trimmedRace } : {}),
      ...(trimmedClass ? { class: trimmedClass } : {}),
      ...(trimmedBio ? { bio: trimmedBio } : {}),
    };
    try {
      await create.mutateAsync(payload);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Dialog open onClose={onClose} title="Nuevo personaje">
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Nombre">
          <input
            id="character-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            className={fieldControlClass}
            rows={3}
          />
        </Field>
        <VisibilityChooser
          value={visibility}
          onChange={setVisibility}
          niveles={CHARACTER_VISIBILITIES}
        />
        {error && <p className="text-chrome-sm text-danger-text">{error}</p>}
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={create.isPending}>
            Guardar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
