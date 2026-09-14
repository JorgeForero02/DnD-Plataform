import { createElement } from "react";
import type { Visibility } from "@dnd/shared";
import { sePuedeRevelar } from "../../entities/BotonRevelar";
import { useHideNpc, useRevealNpc } from "../../bestiario/hooks";
import { useRemoveCombatant } from "../../encounters/hooks";
import type { AccionDeMenu } from "../../../ui/MenuDeAcciones";
import { IconoOjo, IconoOjoTachado } from "../../../ui/Iconos";

/**
 * **Qué sube revelar una criatura** (m4, ola de cierre, 2026-09-14): una sola frase, no una por
 * pantalla. Vivía solo en la descripción de este ítem de menú; `RevelarAlgo.tsx` decía «sube la
 * ficha al nivel “Jugadores”», que es cierto para una ficha del mundo pero no para una criatura
 * —revelar una sube tres columnas (instancia, ficha enlazada y plantilla)— y su fila no lo decía
 * en ningún sitio (regla de la casa: una opción con significado lleva su frase).
 */
export const DESCRIPCION_REVELAR_CRIATURA =
  "Sube a la mesa a esta criatura, su ficha del mundo y su plantilla si estaban ocultas.";

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
  /**
   * **El encuentro está `ACTIVE`, no solo abierto** (I1, ola de cierre, 2026-09-14). `enCombate`
   * es `true` también en `PREPARING` —a propósito, lo dice `ColumnaElenco.tsx`, ahí el DM sigue
   * montando la escena—, pero «Sacar del combate» exige `ACTIVE` en el servidor (spec §3.3): con
   * `enCombate` a secas el ítem se ofrecía en `PREPARING` y el servidor respondía 409. Un botón
   * que va a dar 409 promete algo falso, la misma regla que ya vale para un 403.
   */
  combateEnMarcha: boolean;
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
            descripcion: DESCRIPCION_REVELAR_CRIATURA,
            disabled: revelar.isPending,
            motivo: revelar.isPending ? "Revelando" : undefined,
            onSelect: () => {
              // m5 (ola de cierre, 2026-09-14): cada `useMutation` conserva su propio `isError`
              // aunque otra de las tres termine bien después — un «Ocultar» rechazado se quedaba
              // pegado en pantalla tras un «Sacar del combate» que sí funcionó. Limpiar las OTRAS
              // dos antes de lanzar esta es lo que hace que `error` cuente siempre la última
              // acción, nunca una que ya no está en curso.
              ocultar.reset();
              sacar.reset();
              revelar.mutate(p.characterId);
            },
          }
        : {
            id: "ocultar",
            rotulo: "Ocultar",
            icono: createElement(IconoOjoTachado),
            descripcion: "Solo esta criatura; lo que la mesa ya leyó, leído está.",
            disabled: ocultar.isPending,
            motivo: ocultar.isPending ? "Ocultando" : undefined,
            onSelect: () => {
              revelar.reset();
              sacar.reset();
              ocultar.mutate(p.characterId);
            },
          },
    );
  }
  if (p.combateEnMarcha && p.sessionId && p.encounterId && p.combatanteId) {
    const encounterId = p.encounterId,
      combatantId = p.combatanteId;
    acciones.push({
      id: "sacar",
      rotulo: "Sacar del combate",
      descripcion: "Sale del orden de turnos; sigue en la campaña con sus PG y condiciones.",
      disabled: sacar.isPending,
      motivo: sacar.isPending ? "Sacando del combate" : undefined,
      onSelect: () => {
        revelar.reset();
        ocultar.reset();
        sacar.mutate({ encounterId, combatantId });
      },
    });
  }
  const error = [revelar, ocultar, sacar].find((m) => m.isError);
  return { acciones, error: error ? (error.error as Error).message : null };
}
