import { useState } from "react";
import { CHARACTER_COLORS, type CharacterColor } from "@dnd/shared";
import type { Character } from "./api";
import { useCharacters } from "./hooks";
import { useUpdateCharacter } from "./hooks";
import { NOMBRE_DE_COLOR, colorDePersonaje, vozDePersonaje } from "../../dominio/voces";

/**
 * **El color de un personaje, elegido por su jugador** (plan 05, decisión D3).
 *
 * ## Muestras, no un desplegable
 *
 * `docs/04-convenciones.md` lo pide para las opciones con significado, y aquí es literal: **el
 * significado de un color es su aspecto**. Un `<select>` con «ciruela» y «arena» obliga a elegir a
 * ciegas y a comprobar después; ocho muestras se comparan de un vistazo.
 *
 * Cada muestra lleva **su nombre escrito al lado**: el color no puede ser el único portador de la
 * información, y quien no distinga dos tonos tiene que poder elegir igual.
 *
 * ## Avisa, no prohíbe
 *
 * Si otro personaje de la mesa ya usa ese color, se dice **y se deja elegir**. Dos hermanos que
 * quieren el mismo cobre son asunto suyo; el color no distingue nada que importe —el nombre está
 * escrito al lado en el hilo y en el elenco—, así que bloquearlo sería inventarse una regla.
 *
 * ## El de por defecto se ve marcado, no elegido
 *
 * Mientras `character.color` sea `null`, la muestra que la huella daría sale señalada como «el que
 * tienes ahora», pero el personaje sigue **sin haber elegido**. Es la diferencia entre «este es tu
 * color» y «este es el que te tocó», y se pierde en cuanto se escribe el defecto en la fila.
 */
export function SelectorDeColor({
  campaignId,
  character,
  puedeEditar,
  motivo,
}: {
  campaignId: string;
  character: Character;
  puedeEditar: boolean;
  motivo?: string;
}) {
  const actualizar = useUpdateCharacter(campaignId);
  const { data: personajes } = useCharacters(campaignId);
  // Lo elegido mientras el servidor contesta; `undefined` = manda lo que dice el servidor.
  const [elegido, setElegido] = useState<CharacterColor | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const actual = elegido ?? colorDePersonaje(character);
  const haElegido = elegido !== undefined || character.color !== null;

  // Quién más usa cada color, **contando también los de por defecto**: un choque se ve igual de
  // feo lo haya elegido alguien o le haya tocado. Los archivados no cuentan — no están en la mesa.
  const quienUsa = new Map<CharacterColor, string[]>();
  for (const p of (personajes ?? []) as Character[]) {
    if (p.id === character.id || p.archivedAt) continue;
    const c = colorDePersonaje(p);
    quienUsa.set(c, [...(quienUsa.get(c) ?? []), p.name]);
  }

  const onElegir = async (color: CharacterColor) => {
    setError(null);
    setElegido(color);
    try {
      await actualizar.mutateAsync({ characterId: character.id, input: { color } });
    } catch (err) {
      // El rechazo no se traga: vuelve a lo que el servidor tiene y el motivo se lee aquí mismo.
      setElegido(undefined);
      setError((err as Error).message);
    }
  };

  const ocupado = quienUsa.get(actual) ?? [];

  return (
    <fieldset className="space-y-s2">
      <legend className="font-chrome text-chrome-sm font-semibold text-text">Su color</legend>
      <p className="font-chrome text-chrome-xs text-muted">
        Con el que se le oye en el hilo y se le ve en el elenco. Si no eliges, le toca uno fijo a
        partir de su ficha —el mismo siempre, en cualquier sesión—.
      </p>
      <ul className="flex flex-wrap gap-s2">
        {CHARACTER_COLORS.map((color) => {
          const activo = color === actual;
          const otros = quienUsa.get(color) ?? [];
          return (
            <li key={color}>
              <button
                type="button"
                aria-pressed={activo}
                disabled={!puedeEditar || actualizar.isPending}
                onClick={() => void onElegir(color)}
                className={`flex items-center gap-s2 rounded-radius-sm border px-s2 py-s1 font-chrome text-chrome-sm ${
                  activo ? "border-current" : "border-muted/40"
                } ${vozDePersonaje({ id: character.id, color })} disabled:opacity-60`}
              >
                {/* La muestra es un cuadrado de tinta, no un glifo: dibujado, y del mismo color
                    que pintaría la voz. `aria-hidden` porque el nombre va justo al lado. */}
                <span aria-hidden="true" className="h-3 w-3 rounded-[2px] bg-current" />
                {NOMBRE_DE_COLOR[color]}
                {otros.length > 0 && (
                  <span className="font-chrome text-chrome-xs text-muted">· en uso</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {!haElegido && (
        <p className="font-chrome text-chrome-xs text-muted">
          Todavía no ha elegido: <strong>{NOMBRE_DE_COLOR[actual]}</strong> es el que le tocó.
        </p>
      )}
      {ocupado.length > 0 && (
        // Aviso, no impedimento. Y nombra a quién, porque «ya está en uso» obliga a buscarlo.
        <p role="status" className="font-chrome text-chrome-xs text-warning-text">
          {ocupado.length === 1
            ? `${ocupado[0]} también va de ${NOMBRE_DE_COLOR[actual]}.`
            : `${ocupado.join(", ")} también van de ${NOMBRE_DE_COLOR[actual]}.`}{" "}
          Se puede repetir; el nombre va escrito al lado.
        </p>
      )}
      {!puedeEditar && motivo && <p className="font-chrome text-chrome-sm text-muted">{motivo}</p>}
      {error && <p className="font-chrome text-chrome-sm text-danger-text">{error}</p>}
    </fieldset>
  );
}
