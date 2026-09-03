import { OVERRIDABLE_KEYS } from "@dnd/shared";
import { useMyRole } from "../campaigns/members";
import { NOMBRE_ANULABLE } from "./vocabulario";
import { PROSA_DE_VITELA } from "./Vitela";

// **El aviso de la vista de DM**, tomado de la maqueta de Figma — que lo pone arriba del todo,
// antes de cualquier número, y hace bien: es la única diferencia visible entre lo que ve el DM y
// lo que ve un jugador, y sin decirlo no se nota.
//
// **Pero el texto de la maqueta no se copia, porque miente sobre lo que hace el servidor.** Dice:
// «puedes anular cualquier número, pero tienes que escribir el motivo. Ese motivo aparece en la
// traza.» Tres afirmaciones y las tres son falsas aquí:
//
//  1. **No es cualquier número.** `OVERRIDABLE_KEYS` (@dnd/shared) son cinco y sólo cinco, y el
//     servidor rechaza el resto. Por eso la lista de abajo se genera de esa constante y no se
//     escribe a mano: si mañana el servidor admite un sexto, esta frase lo dice sola.
//  2. **El motivo NO es obligatorio.** `setOverride` (`character-sheet.service.ts`) lo guarda
//     sólo `if (input.reason)`, y `Anulaciones.tsx` etiqueta su campo «Motivo (opcional)».
//  3. **El motivo no aparece en la traza.** La traza la calcula el motor a partir de
//     `character.overrides`, que es un `{clave: número}` sin sitio donde meter una frase; el
//     motivo viaja en el `GameEvent` (`MANUAL_OVERRIDE_SET`), o sea en el registro de la partida.
//     Lo que sí sale en la traza es el **paso** de la anulación con su delta.
//
// Regla vinculante que esto aplica (docs/04-convenciones.md): *si la interfaz explica una regla
// del servidor y discrepan, el que miente es el texto.*

export function AvisoDeDm({ campaignId }: { campaignId: string }) {
  const { role, isLoading } = useMyRole(campaignId);
  if (isLoading || role !== "DM") return null;

  const anulables = OVERRIDABLE_KEYS.map((k) => NOMBRE_ANULABLE[k] ?? k);

  return (
    <section
      aria-label="vista de DM"
      className="rounded-radius-sm border border-copper px-s3 py-s2"
      data-aviso="dm"
    >
      <p className="font-world text-[length:var(--text-world-sm)] leading-relaxed text-copper-text">
        Vista de DM: puedes anular a mano {anulables.length} valores derivados —
        {anulables.join(", ").toLowerCase()}— desde «Anulaciones del DM».
      </p>
      <p className={`mt-0.5 ${PROSA_DE_VITELA}`}>
        La anulación aparece en la traza del valor con su diferencia. El motivo es opcional y no va
        a la traza: queda en el registro de la partida, junto al valor anterior.
      </p>
    </section>
  );
}
