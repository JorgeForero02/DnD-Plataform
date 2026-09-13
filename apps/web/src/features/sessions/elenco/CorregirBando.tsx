import { useId } from "react";
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
 * **No son radios con su frase**, a diferencia de los de `EmpezarCombate.tsx`: allí se explica una
 * decisión que se toma una vez y con calma; aquí es una corrección rápida en la fila más estrecha
 * de la ficha. Sigue siendo «elegir entre los tres bandos, y visibles» —nada se esconde en un
 * desplegable—, pero el bando actual tiene que verse: su botón queda desactivado y lo dice en su
 * propio rótulo, no en un color aparte. Y **por palabra, nunca por color**: el único tono que se
 * admite es `--warning` para `ENEMY`.
 *
 * **`setSide` exige DM y nada más** (ronda de arreglo 1, I-menor) — a diferencia de «Daño» y
 * «Condición», que el servidor deja a DM o dueño (`requireEditable`), el bando es una decisión de
 * mesa y no admite dueño: quien llama a este componente ya lo sabe (`conMandos`/`esDm` en las dos
 * fichas que lo montan), así que aquí no hay una segunda comprobación de rol, solo la constancia
 * de que la puerta real es más estrecha.
 *
 * **`setSide` no emite ningún suceso por el canal en vivo** (ronda de arreglo 1): quien pulsa ve
 * el cambio al momento porque `useSetSide` invalida su propia consulta, pero los demás
 * navegadores de la mesa siguen viendo el bando viejo hasta el próximo sondeo de
 * `useCurrentEncounter` (10 s) — no hasta que alguien note la discrepancia y recargue.
 *
 * **El rótulo accesible dice qué hace el botón, no de quién es**: «Marcar a X como Enemigo», no
 * «Enemigo a X» — el texto visible sigue siendo solo el nombre del bando, para no ensanchar la
 * fila. Y **«Neutral» lleva su frase enganchada por `aria-describedby`**: es el único de los tres
 * que no se explica solo —el servidor lo trata como «no se ha dicho», no como «indiferente»— y
 * sin la frase el botón prometería una semántica que el servidor no tiene.
 */
export function CorregirBando({
  campaignId,
  sessionId,
  encounterId,
  combatanteId,
  bando,
  nombre,
}: {
  campaignId: string;
  sessionId: string;
  encounterId: string;
  combatanteId: string;
  bando: CombatantSide;
  nombre: string;
}) {
  const cambiarBando = useSetSide(campaignId, sessionId);
  const idBase = useId();
  const idEnviando = `${idBase}-enviando`;

  return (
    <div
      role="group"
      aria-label={`Bando de ${nombre}`}
      className="mt-s2 flex flex-wrap items-center gap-s1"
    >
      <span className="font-chrome text-chrome-xs text-muted">Bando</span>
      {BANDOS.map((b) => {
        const esElActual = b.valor === bando;
        const idExplicacion = `${idBase}-${b.valor}-explicacion`;
        // Los tres se desactivan mientras vuela la petición: cambiar dos veces a la vez
        // mandaría dos mutaciones sobre el mismo combatiente. **El motivo se dice**, con
        // `aria-describedby`, para quien no vaya a ver el estado visual del botón — y el del
        // bando actual ya lo dice su propio rótulo, «(su bando actual)».
        const describedBy = [
          cambiarBando.isPending ? idEnviando : null,
          b.valor === "NEUTRAL" ? idExplicacion : null,
        ]
          .filter((x): x is string => x !== null)
          .join(" ");
        return (
          <button
            key={b.valor}
            type="button"
            disabled={esElActual || cambiarBando.isPending}
            aria-describedby={describedBy || undefined}
            aria-label={`Marcar a ${nombre} como ${b.nombre}${esElActual ? " (su bando actual)" : ""}`}
            onClick={() =>
              cambiarBando.mutate({ encounterId, combatantId: combatanteId, side: b.valor })
            }
            className={[
              "rounded-radius-sm border px-1.5 py-0.5 font-chrome text-chrome-xs disabled:cursor-not-allowed disabled:opacity-70",
              b.valor === "ENEMY"
                ? "border-warning text-warning-text hover:bg-[color:var(--warning-tint)]"
                : "border-muted text-text hover:bg-surface",
            ].join(" ")}
          >
            {b.nombre}
            {esElActual && " (su bando actual)"}
            {b.valor === "NEUTRAL" && (
              <span id={idExplicacion} className="sr-only">
                {" "}
                {b.explicacion}
              </span>
            )}
          </button>
        );
      })}
      <span id={idEnviando} className="sr-only">
        Enviando el cambio de bando.
      </span>
      {cambiarBando.isError && (
        <span role="alert" className="w-full font-chrome text-chrome-xs text-danger-text">
          {(cambiarBando.error as Error).message}
        </span>
      )}
    </div>
  );
}

/**
 * **El bando, como ítems de `MenuDeAcciones`** (tarea 8 del pulido, C2: #1). Mismo gesto que
 * `CorregirBando` de arriba —tres bandos, el actual desactivado y diciéndolo en su propio
 * rótulo, «Neutral» con su frase enganchada— pero como datos (`AccionDeMenu[]`) en vez de una
 * fila propia: `MandosDeCombatiente` los añade al final de su menú «…» junto a «Condición»,
 * «Dar…» y «Su hoja», así la fila del elenco no lleva dos controles de menú distintos.
 *
 * **No es una segunda implementación del gesto**: usa el mismo `useSetSide` y el mismo `BANDOS`
 * que la variante de fila; solo cambia la forma en la que se enseña. `CorregirBando` (la fila)
 * se queda tal cual para quien la use así —y para no borrar su propia prueba—, y las dos
 * comparten el vocabulario de `../../../dominio/combate`.
 */
export function useAccionesDeBando(p: {
  campaignId: string;
  sessionId: string;
  encounterId: string;
  combatanteId: string;
  bando: CombatantSide;
  nombre: string;
}): AccionDeMenu[] {
  const cambiarBando = useSetSide(p.campaignId, p.sessionId);
  return BANDOS.map((b) => ({
    id: `bando-${b.valor}`,
    // **El rótulo dice qué hace el ítem, no de quién es** (misma regla que la fila): «Marcar
    // como Enemigo», no «Enemigo». El nombre de `p.nombre` ya lo dice el propio menú, en su
    // `aria-label` («Más acciones sobre {nombre}»).
    rotulo: b.valor === p.bando ? `${b.nombre} (su bando actual)` : `Marcar como ${b.nombre}`,
    disabled: b.valor === p.bando || cambiarBando.isPending,
    motivo:
      b.valor === p.bando
        ? "Ya es su bando"
        : cambiarBando.isPending
          ? "Enviando el cambio de bando"
          : undefined,
    onSelect: () =>
      cambiarBando.mutate({
        encounterId: p.encounterId,
        combatantId: p.combatanteId,
        side: b.valor,
      }),
  }));
}
