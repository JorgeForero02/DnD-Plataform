import { createElement } from "react";
import type { Visibility } from "@dnd/shared";
import { sePuedeRevelar } from "../../entities/BotonRevelar";
import { useHideNpc, useRevealNpc } from "../../bestiario/hooks";
import { useRemoveCombatant } from "../../encounters/hooks";
import type { AccionDeMenu } from "../../../ui/MenuDeAcciones";
import { IconoOjo, IconoOjoTachado } from "../../../ui/Iconos";

/**
 * **Revelar a la mesa / Ocultar / Sacar del combate**, como ítems del menú «…» del elenco (PNJ
 * del mundo y la mesa, spec §3.2 y §3.3). Hermano de `useAccionesDeBando`: el hook se llama
 * siempre y es la lista la que queda vacía cuando no toca. Revelar/ocultar solo con `visibility`
 * (los PNJ, E-PM-11); sacar solo con encuentro y combatiente. Todo es del DM: `esDm` decide, y la
 * puerta real sigue siendo `requireDM` en el servidor.
 */
export function useAccionesDeMesa(p: {
  campaignId: string;
  characterId: string;
  nombre: string;
  esDm: boolean;
  visibility?: Visibility | string;
  sessionId?: string;
  encounterId?: string;
  combatanteId?: string;
  enCombate: boolean;
}): { acciones: AccionDeMenu[]; error: string | null } {
  const revelar = useRevealNpc(p.campaignId);
  const ocultar = useHideNpc(p.campaignId);
  const sacar = useRemoveCombatant(p.campaignId, p.sessionId);
  if (!p.esDm) return { acciones: [], error: null };
  const acciones: AccionDeMenu[] = [];
  if (p.visibility !== undefined) {
    const oculto = sePuedeRevelar(p.visibility as Visibility);
    acciones.push(
      oculto
        ? {
            id: "revelar",
            rotulo: "Revelar a la mesa",
            icono: createElement(IconoOjo),
            descripcion:
              "Sube a la mesa a esta criatura, su ficha del mundo y su plantilla si estaban ocultas.",
            disabled: revelar.isPending,
            motivo: revelar.isPending ? "Revelando" : undefined,
            onSelect: () => revelar.mutate(p.characterId),
          }
        : {
            id: "ocultar",
            rotulo: "Ocultar",
            icono: createElement(IconoOjoTachado),
            descripcion: "Solo esta criatura; lo que la mesa ya leyó, leído está.",
            disabled: ocultar.isPending,
            motivo: ocultar.isPending ? "Ocultando" : undefined,
            onSelect: () => ocultar.mutate(p.characterId),
          },
    );
  }
  if (p.enCombate && p.sessionId && p.encounterId && p.combatanteId) {
    const encounterId = p.encounterId,
      combatantId = p.combatanteId;
    acciones.push({
      id: "sacar",
      rotulo: "Sacar del combate",
      descripcion: "Sale del orden de turnos; sigue en la campaña con sus PG y condiciones.",
      disabled: sacar.isPending,
      motivo: sacar.isPending ? "Sacando del combate" : undefined,
      onSelect: () => sacar.mutate({ encounterId, combatantId }),
    });
  }
  const error = [revelar, ocultar, sacar].find((m) => m.isError);
  return { acciones, error: error ? (error.error as Error).message : null };
}
