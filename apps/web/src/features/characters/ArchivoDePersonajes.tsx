import { useState } from "react";
import { Button } from "../../ui/Button";
import { OrnamentRule } from "../../ui/Ornament";
import { descriptorDePersonaje } from "./descriptor";
import { useUnarchiveCharacter } from "./hooks";
import type { Character } from "./api";

// **La puerta de salida del archivo** (plan 06, ficha M9).
//
// «Un archivo sin listado es un borrado con otro nombre.» Por eso esta lista entra en el mismo
// commit que el botón de archivar y no en el siguiente: media función aquí es peor que ninguna,
// porque **parece que perdiste el personaje**.
//
// Se lee de `GET .../characters/archived`, que es **una ruta aparte** (`characters.controller.ts`)
// y no un filtro de cliente sobre la lista normal: esa lista ya excluye a los archivados en el
// servidor, así que aquí no llegaría nada que filtrar. Y los dos listados los filtra `canView`
// igual (`characters.service.ts:75`): archivar no cambia quién puede ver a un personaje.
//
// Devolver **no lleva confirmación**, y es deliberado: es el gesto que deshace, y pedir permiso
// para deshacer es cobrar dos veces por el mismo camino.

const FILA_ARCHIVADA_CLASS = "flex flex-wrap items-center gap-x-s3 gap-y-s2 px-s4 py-s3";

function FilaArchivada({
  campaignId,
  character,
  puedeDevolver,
  motivo,
}: {
  campaignId: string;
  character: Character;
  puedeDevolver: boolean;
  motivo?: string;
}) {
  const devolver = useUnarchiveCharacter(campaignId);
  const [error, setError] = useState<string | null>(null);
  const descripcion = descriptorDePersonaje(character);

  return (
    <li className={FILA_ARCHIVADA_CLASS}>
      <span className="font-chrome text-chrome-sm font-semibold text-text">{character.name}</span>
      {descripcion && <span className="font-world text-chrome-base text-muted">{descripcion}</span>}
      <span className="font-data text-chrome-xs text-copper-text">Nivel {character.level}</span>
      <span className="flex-1" />
      {error && <span className="font-chrome text-chrome-xs text-danger-text">{error}</span>}
      {/* Deshabilitado con el motivo a la vista, nunca escondido: el servidor lo rechazaría
          igual (`requireEditable`: DM o dueño), y esconderlo solo lo haría invisible, no
          imposible. */}
      <Button
        type="button"
        variant="secondary"
        disabled={!puedeDevolver || devolver.isPending}
        title={!puedeDevolver ? motivo : undefined}
        onClick={async () => {
          setError(null);
          try {
            await devolver.mutateAsync(character.id);
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        Devolver a la mesa
      </Button>
    </li>
  );
}

/**
 * Lo archivado de esta campaña, con la puerta por la que vuelve.
 *
 * No se pinta nada cuando no hay nada archivado: una sección vacía titulada «Archivados» debajo
 * de una lista vacía enseñaría dos huecos donde solo hay uno.
 */
export function ArchivoDePersonajes({
  campaignId,
  archivados,
  puedeDevolver,
  motivo,
}: {
  campaignId: string;
  archivados: Character[];
  /** Dice, por personaje, si esta persona puede devolverlo — DM o dueño, igual que el servidor. */
  puedeDevolver: (character: Character) => boolean;
  /** Por qué no, cuando no. */
  motivo?: string;
}) {
  if (archivados.length === 0) return null;

  return (
    /* `aria-label` y no `aria-labelledby` al filete: `OrnamentRule` es `role="presentation"`
       —es ornamento, y así está escrito— así que colgar de él el nombre de la región sería
       apoyar una semántica en algo que declara no tener ninguna. */
    <section className="mt-s6" aria-label="Archivados">
      <OrnamentRule className="mb-s3">Archivados</OrnamentRule>
      <p className="mb-s3 font-chrome text-chrome-sm text-muted">
        Fuera de la mesa, enteros. Su hoja, su inventario y su dinero siguen donde estaban, y
        vuelven de una pulsación.
      </p>
      <ul className="divide-y divide-muted overflow-hidden rounded-radius-sm border border-muted bg-surface">
        {archivados.map((c) => (
          <FilaArchivada
            key={c.id}
            campaignId={campaignId}
            character={c}
            puedeDevolver={puedeDevolver(c)}
            motivo={motivo}
          />
        ))}
      </ul>
    </section>
  );
}
