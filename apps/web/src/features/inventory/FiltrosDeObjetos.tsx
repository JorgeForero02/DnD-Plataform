import type { ItemKind, ItemLocation } from "@dnd/shared";
import { FilterChip } from "../../ui/FilterChip";
import { fieldControlClass } from "../../ui/Field";
import type { FiltroDeObjetos } from "./filtrarObjetos";
import { NOMBRE_TIPO_OBJETO, NOMBRE_ZONA } from "./vocabulario";

// Tarea 9 (spec 2026-09-11, «la hoja a página completa») — la barra de filtros de la pestaña
// Objetos. Tres grupos de fichas y un buscador; **cada ficha alterna**: pulsar la activa la
// quita, porque «ninguna» es el estado normal y no merece una ficha propia («Todos») que
// compita con las de verdad.
//
// Las etiquetas salen de `vocabulario.ts` —**la misma forma legible que los rótulos de zona**
// (`NOMBRE_ZONA`): una forma por dominio—; ningún `WEAPON` ni `EQUIPPED` llega a la pantalla.
//
// Tarea 13, ítem 9.3 (2026-09-19) — **«Todo» vuelve, pero como chip de verdad y no como el
// «Todos» que el párrafo de arriba ya había descartado.** La diferencia es que aquella lectura
// mezclaba «ninguna ficha pulsada» con «filtro sin dueño visual»: sin una ficha activa por
// defecto, quien abre la pestaña no ve NINGÚN estado marcado, que se lee como «no hay filtro
// aplicado todavía» en vez de «se está viendo todo a propósito» — la misma distinción que
// `docs/04-convenciones.md` pide para un radio sin marcar. «Todo» es esa ficha por defecto:
// limpia zona y tipo a la vez y se enciende cuando los dos ya están limpios. `Sintonizados` no
// entra en su reinicio porque es un filtro aparte, no un tercer grupo — apagarlo con «Todo»
// sorprendería a quien lo puso a propósito. Los dos grupos que sí reinicia (zona y tipo) llevan
// ahora un `fieldset`/`legend sr-only` cada uno: visualmente no cambia nada, pero quien navega
// con lector de pantalla deja de oír nueve fichas sueltas y oye «Estado» y «Tipo».
const ZONAS: ItemLocation[] = ["EQUIPPED", "CARRIED", "STORED"];
const TIPOS: ItemKind[] = ["WEAPON", "ARMOR", "SHIELD", "CONSUMABLE", "GEAR", "OTHER"];

export function FiltrosDeObjetos({
  filtro,
  onCambiar,
}: {
  filtro: FiltroDeObjetos;
  onCambiar: (filtro: FiltroDeObjetos) => void;
}) {
  const sinFiltroDeGrupo = filtro.donde === null && filtro.que === null;

  return (
    <div className="mb-s4 flex flex-col gap-s2" data-testid="filtros-de-objetos">
      <input
        type="search"
        aria-label="Buscar objeto"
        placeholder="Buscar objeto"
        value={filtro.texto}
        onChange={(e) => onCambiar({ ...filtro, texto: e.target.value })}
        className={fieldControlClass}
      />
      <div className="flex flex-wrap items-center gap-s2">
        <FilterChip
          active={sinFiltroDeGrupo}
          onClick={() => onCambiar({ ...filtro, donde: null, que: null })}
        >
          Todo
        </FilterChip>
        <fieldset className="contents">
          <legend className="sr-only">Estado</legend>
          {ZONAS.map((zona) => (
            <FilterChip
              key={zona}
              active={filtro.donde === zona}
              onClick={() => onCambiar({ ...filtro, donde: filtro.donde === zona ? null : zona })}
            >
              {NOMBRE_ZONA[zona]}
            </FilterChip>
          ))}
        </fieldset>
        <span aria-hidden="true" className="mx-s1 h-4 w-px bg-[color:var(--copper-rule)]" />
        <FilterChip
          active={filtro.sintonizados}
          onClick={() => onCambiar({ ...filtro, sintonizados: !filtro.sintonizados })}
        >
          Sintonizados
        </FilterChip>
      </div>
      <fieldset className="flex flex-wrap items-center gap-s2">
        <legend className="sr-only">Tipo</legend>
        {TIPOS.map((tipo) => (
          <FilterChip
            key={tipo}
            active={filtro.que === tipo}
            onClick={() => onCambiar({ ...filtro, que: filtro.que === tipo ? null : tipo })}
          >
            {NOMBRE_TIPO_OBJETO[tipo]}
          </FilterChip>
        ))}
      </fieldset>
    </div>
  );
}
