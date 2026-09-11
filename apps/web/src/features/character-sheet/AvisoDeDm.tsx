import { OVERRIDABLE_KEYS } from "@dnd/shared";
import { useMyRole } from "../campaigns/members";
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

export function AvisoDeDm({ campaignId }: { campaignId: string }) {
  const { role, isLoading } = useMyRole(campaignId);
  if (isLoading || role !== "DM") return null;

  const anulables = OVERRIDABLE_KEYS.map((k) => NOMBRE_ANULABLE[k] ?? k);

  return (
    <section
      aria-label="vista de DM"
      className="rounded-radius-md border border-copper px-s3 py-s2"
      data-aviso="dm"
    >
      {/* **Una línea, como en la maqueta.** Eran dos párrafos de letra pequeña encima de todos
          los números, y ninguna de las dos frases se leía. Lo que se ha ido es la explicación
          larga de cómo funciona una anulación: ya la dice su propia tarjeta, que es donde alguien
          está a punto de hacer una — aquí solo hacía falta decir que esta vista es la del DM. */}
      <p className="font-chrome text-chrome-sm leading-snug text-copper-text">
        Vista de DM: puedes anular a mano {anulables.length} valores derivados —
        {anulables.join(", ").toLowerCase()}— desde «Anulaciones del DM».
      </p>
    </section>
  );
}
