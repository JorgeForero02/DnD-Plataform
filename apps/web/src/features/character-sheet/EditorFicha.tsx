import { useState } from "react";
import type { AbilityKey } from "@dnd/shared";
import type { CharacterRow } from "./api";
import { useCatalog, useUpdateSheet } from "./hooks";
import { Dialog } from "../../ui/Dialog";
import { Field, fieldControlClass } from "../../ui/Field";
import { Button } from "../../ui/Button";
import { ABREVIATURA_CARACTERISTICA, NOMBRE_CARACTERISTICA, nombreSubraza } from "./vocabulario";

// Tarea 2A.10 — el editor de la ficha estructural (características, raza, subraza, clase,
// nivel). "Leer y editar son pantallas distintas" (docs/04-convenciones.md): se abre desde la
// lectura, igual que `CharacterEditor.tsx` ya hace para nombre/bio/visibilidad.
//
// **Las opciones vienen de `GET /catalog`, no de una lista escrita aquí.** La primera versión
// las tenía transcritas a mano en `vocabulario.ts` porque no había endpoint: correcto el día que
// se escribió, y una fuente de deriva desde el siguiente — el desplegable habría ofrecido lo que
// el servidor ya no acepta, y el fallo se habría visto como un rechazo, no como un desajuste.
// Ahora el catálogo se pide una vez (`staleTime: Infinity`) y las claves del servidor mandan.

const CARACTERISTICAS = Object.keys(NOMBRE_CARACTERISTICA) as AbilityKey[];

export function EditorFicha({
  campaignId,
  characterId,
  character,
  onClose,
}: {
  campaignId: string;
  characterId: string;
  character: CharacterRow;
  onClose: () => void;
}) {
  const [abilities, setAbilities] = useState<Record<AbilityKey, string>>({
    str: String(character.str ?? 10),
    dex: String(character.dex ?? 10),
    con: String(character.con ?? 10),
    int: String(character.int ?? 10),
    wis: String(character.wis ?? 10),
    cha: String(character.cha ?? 10),
  });
  const [raceKey, setRaceKey] = useState(character.raceKey ?? "");
  const [subraceKey, setSubraceKey] = useState(character.subraceKey ?? "");
  const [classKey, setClassKey] = useState(character.classKey ?? "");
  const [level, setLevel] = useState(String(character.level ?? 1));
  const [error, setError] = useState<string | null>(null);

  const actualizar = useUpdateSheet(campaignId, characterId);
  const { data: catalogo } = useCatalog();

  const RAZAS: [string, string][] = (catalogo?.races ?? []).map((r) => [r.key, r.name]);
  const CLASES: [string, string][] = (catalogo?.classes ?? []).map((c) => [c.key, c.name]);
  const subrazasDisponibles = (catalogo?.races.find((r) => r.key === raceKey)?.subraces ?? []).map(
    (sub) => sub.key,
  );
  // Un valor guardado que el selector no ofrece se muestra marcado y no seleccionable
  // (docs/04-convenciones.md): una subraza guardada de una raza distinta a la elegida ahora.
  const subrazaHuerfana =
    character.subraceKey && !subrazasDisponibles.includes(character.subraceKey)
      ? character.subraceKey
      : null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await actualizar.mutateAsync({
        abilities: {
          str: Number(abilities.str),
          dex: Number(abilities.dex),
          con: Number(abilities.con),
          int: Number(abilities.int),
          wis: Number(abilities.wis),
          cha: Number(abilities.cha),
        },
        ...(raceKey ? { race: { source: "SRD", key: raceKey } } : {}),
        subrace: subraceKey ? { source: "SRD", key: subraceKey } : null,
        ...(classKey ? { class: { source: "SRD", key: classKey } } : {}),
        level: Number(level),
      });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Dialog open onClose={onClose} title="Editar clase, raza y características">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-3 gap-s2 sm:grid-cols-6">
          {CARACTERISTICAS.map((clave) => (
            <Field key={clave} label={ABREVIATURA_CARACTERISTICA[clave]}>
              <input
                id={`ability-${clave}`}
                type="number"
                min={1}
                max={30}
                value={abilities[clave]}
                onChange={(e) => setAbilities((prev) => ({ ...prev, [clave]: e.target.value }))}
                className={fieldControlClass}
                title={NOMBRE_CARACTERISTICA[clave]}
              />
            </Field>
          ))}
        </div>

        <div className="flex gap-s2">
          <div className="flex-1">
            <Field label="Raza">
              <select
                id="sheet-race"
                value={raceKey}
                onChange={(e) => {
                  setRaceKey(e.target.value);
                  setSubraceKey("");
                }}
                className={fieldControlClass}
              >
                <option value="">Sin elegir</option>
                {RAZAS.map(([key, nombre]) => (
                  <option key={key} value={key}>
                    {nombre}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex-1">
            <Field label="Subraza">
              <select
                id="sheet-subrace"
                value={subraceKey}
                onChange={(e) => setSubraceKey(e.target.value)}
                className={fieldControlClass}
                disabled={subrazasDisponibles.length === 0 && !subrazaHuerfana}
              >
                <option value="">Sin subraza</option>
                {subrazasDisponibles.map((key) => (
                  <option key={key} value={key}>
                    {nombreSubraza(key)}
                  </option>
                ))}
                {subrazaHuerfana && (
                  <option value={subrazaHuerfana} disabled>
                    {nombreSubraza(subrazaHuerfana)} (no corresponde a la raza actual)
                  </option>
                )}
              </select>
            </Field>
          </div>
        </div>

        <div className="flex gap-s2">
          <div className="flex-1">
            <Field label="Clase">
              <select
                id="sheet-class"
                value={classKey}
                onChange={(e) => setClassKey(e.target.value)}
                className={fieldControlClass}
              >
                <option value="">Sin elegir</option>
                {CLASES.map(([key, nombre]) => (
                  <option key={key} value={key}>
                    {nombre}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="w-24">
            <Field label="Nivel">
              <input
                id="sheet-level"
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

        {error && (
          <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={actualizar.isPending}>
            Guardar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
