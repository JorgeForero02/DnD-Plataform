import { useId } from "react";
import { OVERRIDABLE_KEYS } from "@dnd/shared";
import { useEsVistaDeDm } from "./hooks";
import { NOMBRE_ANULABLE } from "./vocabulario";

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
//     solo cuando llega recortado y no vacío (`input.reason?.trim()`), y `Anulaciones.tsx`
//     etiqueta su campo «Motivo (opcional)».
//  3. **Hasta el ticket J7 (2026-09-11) el motivo no aparecía en la traza — ya no es cierto.**
//     `character.overrides` era `{clave: número}`, sin sitio donde meter una frase; desde J7 es
//     una UNIÓN sin migración, `{clave: número | {value, reason?}}`
//     (`overridesSchema`/`normalizeOverride`, `@dnd/shared`) — las filas viejas se quedan como
//     número para siempre, y una fila nueva con motivo lo lleva consigo. El motor copia ese
//     motivo al **paso** `override` de la traza (`engine.ts`), y `Traza.tsx` lo pinta como
//     «fijada a N — motivo». El motivo TAMBIÉN sigue viajando en el `GameEvent`
//     (`MANUAL_OVERRIDE_SET`), o sea en el registro de la partida — las dos cosas son ciertas a
//     la vez, no una sustituye a la otra.
//
// Regla vinculante que esto aplica (docs/04-convenciones.md): *si la interfaz explica una regla
// del servidor y discrepan, el que miente es el texto.*
//
// **Task 5 (2026-09-19) — el párrafo se sustituye por un botón.** «Vista de DM: puedes anular a
// mano N valores… desde «Anulaciones del DM»» era una frase que solo explicaba un control; el
// control ya vive más abajo, en su propia tarjeta (`Anulaciones.tsx`), así que aquí basta con
// llevar hasta él — el texto explicativo se queda, pero como `aria-describedby` del botón, no
// como el único contenido del aviso.

/**
 * Lleva el foco a la tarjeta «Anulaciones del DM» (`Anulaciones.tsx`), que no tiene su propio
 * mecanismo de apertura porque nunca se pliega. Mismo criterio que `enfocarCausa` de `Traza.tsx`:
 * se busca por el `aria-label` de su `<section>`, que es como se llama para un lector de
 * pantalla, y no por un `id` que un renombrado dejaría sin dueño.
 */
function enfocarAnulaciones() {
  const destino = document.querySelector<HTMLElement>('[aria-label="anulaciones del DM"]');
  if (!destino) return;
  destino.scrollIntoView?.({ block: "start" });
  const foco = destino.querySelector<HTMLElement>("select, input, button");
  foco?.focus();
}

export function AvisoDeDm({ campaignId }: { campaignId: string }) {
  const esVistaDeDm = useEsVistaDeDm(campaignId);
  const idDescripcion = useId();
  if (!esVistaDeDm) return null;

  const anulables = OVERRIDABLE_KEYS.map((k) => NOMBRE_ANULABLE[k] ?? k);

  return (
    <section
      aria-label="vista de DM"
      className="rounded-radius-md border border-copper px-s3 py-s2"
      data-aviso="dm"
    >
      <button
        type="button"
        onClick={enfocarAnulaciones}
        aria-describedby={idDescripcion}
        className="font-chrome text-chrome-sm leading-snug text-copper-text underline-offset-2 hover:underline"
      >
        Anulaciones del DM ({anulables.length})
      </button>
      <p id={idDescripcion} className="sr-only">
        Vista de DM: puedes anular a mano {anulables.length} valores derivados —
        {anulables.join(", ").toLowerCase()}— desde «Anulaciones del DM».
      </p>
    </section>
  );
}
