import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Visibility } from "@dnd/shared";
import { useCreateCharacter, charactersKey } from "./hooks";
import { CHARACTER_VISIBILITIES } from "./niveles";
import { Button } from "../../ui/Button";
import { Field, fieldControlClass } from "../../ui/Field";
import { VisibilityChooser } from "../entities/VisibilityChooser";
import { Dialog } from "../../ui/Dialog";
import { useCatalog, sheetKey } from "../character-sheet/hooks";
import { updateSheet } from "../character-sheet/api";
import {
  opcionesDeClase,
  opcionesDeRaza,
  opcionesDeSubraza,
} from "../character-sheet/opcionesDeCatalogo";

// H6 del reseño de interfaz — **este diálogo solo crea.**
//
// Tenía dos modos, y el de edición era el segundo camino para tocar lo que la hoja ya edita en el
// sitio: nombre, raza, clase, nivel e historia. Ese modo se ha ido entero, junto con el borrado y
// el modo de solo lectura que lo acompañaban: en la hoja se edita donde se lee
// (`pages/CharacterDetailPage.tsx`), y la visibilidad y el borrado viven ahora en
// `AjustesDePersonaje.tsx`, dentro de esa misma página.
//
// Crear sí necesita un formulario —no hay dónde editar en el sitio algo que todavía no existe—,
// y es lo único que queda aquí.
//
// **Tarea 24 (cerrar fichas, tanda 2026-09-11).** Raza y clase eran texto libre: un personaje
// nacía sin `raceKey`/`classKey` y la hoja no podía derivar nada de él hasta que alguien pasaba
// por `IdentidadEditable.tsx` a elegirlas del catálogo. Este diálogo ahora pide las mismas dos
// cosas **del mismo catálogo** (`opcionesDeCatalogo.ts`, compartido con esa pantalla) y manda
// claves, no prosa.
//
// **Por qué dos peticiones y no una.** `createCharacterSchema` (`packages/shared`) solo admite
// `name`/`race`/`class` como texto libre — no tiene `raceKey`/`subraceKey`/`classKey`, y
// dárselos habría creado una SEGUNDA forma de guardar una construcción de personaje, paralela a
// `updateCharacterSheetSchema` (el `PATCH .../sheet` que ya usa `IdentidadEditable.tsx`, con su
// regla de «cambiar de raza borra la subraza» y su límite de nivel 1–20). Esa hoja es la única
// fuente de verdad de la construcción; este diálogo se limita a crear la fila (nombre, nivel,
// visibilidad, biografía) y, si se eligió raza o clase, a hacer **el mismo PATCH que la hoja
// haría** con el `id` que la creación acaba de devolver. Dos peticiones, una detrás de otra, pero
// una sola regla de negocio.
//
// **Ronda de arreglo 1 (revisión).** Dos defectos que la primera versión no cubría:
//
//   1. **La lista se quedaba stale hasta 30 s.** `useCreateCharacter` invalida
//      `charactersKey(campaignId)` en su propio `onSuccess`, pero eso ocurre justo tras el
//      `POST` — antes de que el `PATCH` a la hoja escriba raza y clase. La fila reaparecía en la
//      lista sin «Enano · Guerrero» y no se refrescaba sola hasta que el `staleTime` de
//      `useCharacters` expirara. No se pudo reutilizar `useUpdateSheet` tal cual: toma
//      `characterId` al construir el hook, y aquí no se conoce hasta que el `POST` responde, así
//      que se repiten aquí mismo las dos escrituras que hace su `onSuccess`
//      (`character-sheet/hooks.ts:106-113`) tras la llamada directa a `updateSheet`.
//   2. **Doble creación si el `PATCH` fallaba.** `disabled={create.isPending}` solo cubría el
//      `POST`: si el `PATCH` fallaba, el diálogo se quedaba abierto, el personaje ya existía en
//      el servidor, y un segundo «Guardar» creaba un duplicado. Ahora el botón queda bloqueado
//      en cuanto el `POST` responde —haya fallado el `PATCH` o no— y, si el `PATCH` falla, el
//      diálogo se queda abierto con la frase que dice qué pasó y a dónde ir, en vez de cerrarse
//      sobre un error a medio resolver.
export function CharacterEditor({
  campaignId,
  onClose,
}: {
  campaignId: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [raceKey, setRaceKey] = useState("");
  const [subraceKey, setSubraceKey] = useState("");
  const [classKey, setClassKey] = useState("");
  const [level, setLevel] = useState("1");
  const [bio, setBio] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("PLAYERS");
  const [error, setError] = useState<string | null>(null);
  // **Distinto de `create.isPending`**: cubre las DOS peticiones (crear y, si toca, el `PATCH` a
  // la hoja), y una vez que el `POST` responde se queda `true` para siempre si el `PATCH`
  // falla — es el candado contra la doble creación. `null` = todavía no se ha creado nada.
  const [personajeCreadoId, setPersonajeCreadoId] = useState<string | null>(null);

  const create = useCreateCharacter(campaignId);
  const { data: catalogo } = useCatalog();
  const qc = useQueryClient();

  const razas = opcionesDeRaza(catalogo);
  const subrazas = opcionesDeSubraza(catalogo, raceKey || null);
  const clases = opcionesDeClase(catalogo);

  // Bloqueado en cuanto el personaje existe en el servidor: si el `PATCH` a la hoja falló, un
  // segundo «Guardar» no puede volver a crearlo. `create.isPending` cubre el primer tramo.
  const guardando = create.isPending || personajeCreadoId !== null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (personajeCreadoId) return; // bloqueado: ya se creó, con o sin raza/clase.
    setError(null);
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
      ...(trimmedBio ? { bio: trimmedBio } : {}),
    };
    let created;
    try {
      created = await create.mutateAsync(payload);
    } catch (err) {
      setError((err as Error).message);
      return;
    }
    // A partir de aquí el personaje YA EXISTE en el servidor: pase lo que pase con el `PATCH`,
    // no se puede volver a crear. Se marca antes de intentar el `PATCH`, no después, para que un
    // fallo de red a mitad no deje una ventana en la que un segundo clic duplique la fila.
    setPersonajeCreadoId(created.id);
    // Solo si se eligió algo: un personaje sin raza ni clase todavía es un estado legítimo
    // (se elige luego en la hoja), y mandar un PATCH vacío no serviría de nada.
    if (raceKey || classKey) {
      try {
        const hoja = await updateSheet(campaignId, created.id, {
          ...(raceKey ? { race: { source: "SRD", key: raceKey } } : {}),
          ...(subraceKey ? { subrace: { source: "SRD", key: subraceKey } } : {}),
          ...(classKey ? { class: { source: "SRD", key: classKey } } : {}),
        });
        // Mismas dos escrituras que hace `useUpdateSheet` en su `onSuccess`
        // (`character-sheet/hooks.ts:101-116`): sembrar la hoja para quien la abra a
        // continuación, e invalidar la lista para que la fila recién creada se refresque con su
        // raza y clase SIN esperar el `staleTime` de treinta segundos de `useCharacters`. La
        // invalidación de `useCreateCharacter` ya disparó una vez, justo tras el `POST` —antes
        // de que hubiera raza o clase que enseñar—, así que hace falta una segunda aquí.
        qc.setQueryData(sheetKey(campaignId, created.id), hoja);
        void qc.invalidateQueries({ queryKey: charactersKey(campaignId) });
      } catch (err) {
        // El personaje YA se creó: no se cierra el diálogo sobre un error a medias, y no se deja
        // reintentar creando un duplicado. Se dice qué pasó y por dónde seguir.
        setError(
          `El personaje se creó, pero no se pudo guardar su raza y clase (${(err as Error).message}). ` +
            "Puedes elegirlas desde su hoja.",
        );
        return;
      }
    }
    onClose();
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
        <div className="flex flex-wrap gap-2">
          <div className="flex-1">
            <Field label="Raza">
              <select
                id="character-race"
                value={raceKey}
                onChange={(e) => {
                  setRaceKey(e.target.value);
                  setSubraceKey("");
                }}
                className={fieldControlClass}
              >
                <option value="">Sin elegir</option>
                {razas.map((r) => (
                  <option key={r.valor} value={r.valor}>
                    {r.texto}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {subrazas.length > 0 && (
            <div className="flex-1">
              <Field label="Subraza">
                <select
                  id="character-subrace"
                  value={subraceKey}
                  onChange={(e) => setSubraceKey(e.target.value)}
                  className={fieldControlClass}
                >
                  <option value="">Ninguna</option>
                  {subrazas.map((s) => (
                    <option key={s.valor} value={s.valor}>
                      {s.texto}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}
          <div className="flex-1">
            <Field label="Clase">
              <select
                id="character-class"
                value={classKey}
                onChange={(e) => setClassKey(e.target.value)}
                className={fieldControlClass}
              >
                <option value="">Sin elegir</option>
                {clases.map((c) => (
                  <option key={c.valor} value={c.valor}>
                    {c.texto}
                  </option>
                ))}
              </select>
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
          <Button type="submit" disabled={guardando}>
            Guardar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
