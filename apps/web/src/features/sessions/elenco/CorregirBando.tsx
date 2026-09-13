import type { CombatantSide } from "@dnd/shared";
import { BANDOS } from "../../../dominio/combate";
import { useSetSide } from "../../encounters/hooks";
import type { AccionDeMenu } from "../../../ui/MenuDeAcciones";

/**
 * **Corregir el bando de un combatiente** (tarea 10, 2026-09-05 — «un aliado te traiciona en el
 * segundo asalto»; extraído en la ronda de arreglo 1 sobre la tarea 9b para que un PNJ combatiente
 * lo lleve también: el caso principal del bando es el enemigo, y el enemigo casi siempre es un
 * PNJ — sin esto, el mando nacía cojo).
 *
 * **Se corrige aquí, junto a «Daño» y «Condición»**, no en una pantalla propia: el prototipo
 * (`prototipo/src/features/FichaDeElenco.tsx`) ya resolvía el bando al EMPEZAR el combate, sin
 * mando para cambiarlo, así que esta es la puerta que faltaba, hermana de «Corregir» en la tira
 * de iniciativa.
 *
 * **Desde la tarea 8 del pulido (C2: #1) el bando son ítems de `MenuDeAcciones`, no una fila
 * propia.** Este fichero tuvo hasta la ronda de arreglo 3 de esa tarea un componente `CorregirBando`
 * —una fila con los tres bandos como botones, `role="group"`— que dejó de montarse cuando
 * `FichaDeElenco`/`FichaDePnj` pasaron a alimentar el menú «…» con este hook. Un componente sin
 * consumidor y sin prueba es código muerto, así que se borró: sus aserciones ya vivían en
 * `__tests__/FichaDeElenco.test.tsx` y `ColumnaElenco.test.tsx`, reescritas contra el menú (se
 * cambió el camino, no lo que demuestran).
 *
 * **Lo que la fila decía, lo sigue diciendo el menú.** El actual queda desactivado y lo dice en
 * su propio rótulo, «(su bando actual)», no en un color aparte. **Por palabra, nunca por color.**
 * **El rótulo dice qué hace el ítem, no de quién es**: «Marcar como Enemigo», no «Enemigo» — el
 * nombre ya lo dice el propio menú en su `aria-label` («Más acciones sobre {nombre}»). Y
 * **«Neutral» lleva su frase enganchada por `aria-describedby`** (`descripcion` del ítem): es el
 * único de los tres que no se explica solo —el servidor lo trata como «no se ha dicho», no como
 * «indiferente»— y sin la frase el ítem prometería una semántica que el servidor no tiene.
 *
 * **`setSide` exige DM y nada más** (ronda de arreglo 1, I-menor) — a diferencia de «Daño» y
 * «Condición», que el servidor deja a DM o dueño (`requireEditable`), el bando es una decisión de
 * mesa y no admite dueño: quien llama a este hook ya lo sabe (`conMandos`/`esDm` en las dos
 * fichas), así que aquí no hay una segunda comprobación de rol, solo la constancia de que la
 * puerta real es más estrecha.
 *
 * **`setSide` no emite ningún suceso por el canal en vivo** (ronda de arreglo 1): quien pulsa ve
 * el cambio al momento porque `useSetSide` invalida su propia consulta, pero los demás
 * navegadores de la mesa siguen viendo el bando viejo hasta el próximo sondeo de
 * `useCurrentEncounter` (10 s) — no hasta que alguien note la discrepancia y recargue.
 *
 * **El error del servidor se devuelve, no se traga** (fix round 3): la fila lo pintaba con
 * `role="alert"`, y el primer hook lo perdió por el camino. `MandosDeCombatiente` lo pinta bajo
 * la fila de mandos.
 */
export function useAccionesDeBando(p: {
  campaignId: string;
  sessionId: string;
  encounterId: string;
  combatanteId: string;
  bando: CombatantSide;
  nombre: string;
}): { acciones: AccionDeMenu[]; error: string | null } {
  const cambiarBando = useSetSide(p.campaignId, p.sessionId);
  const acciones = BANDOS.map<AccionDeMenu>((b) => ({
    id: `bando-${b.valor}`,
    rotulo: b.valor === p.bando ? `${b.nombre} (su bando actual)` : `Marcar como ${b.nombre}`,
    // Los tres se desactivan mientras vuela la petición: cambiar dos veces a la vez mandaría dos
    // mutaciones sobre el mismo combatiente. **El motivo se dice**, para quien no vaya a ver el
    // estado visual del ítem.
    disabled: b.valor === p.bando || cambiarBando.isPending,
    motivo:
      b.valor === p.bando
        ? "Ya es su bando"
        : cambiarBando.isPending
          ? "Enviando el cambio de bando"
          : undefined,
    descripcion: b.valor === "NEUTRAL" ? b.explicacion : undefined,
    onSelect: () =>
      cambiarBando.mutate({
        encounterId: p.encounterId,
        combatantId: p.combatanteId,
        side: b.valor,
      }),
  }));
  return {
    acciones,
    error: cambiarBando.isError ? (cambiarBando.error as Error).message : null,
  };
}
