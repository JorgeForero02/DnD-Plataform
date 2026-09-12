import type { ItemKind, ItemLocation } from "@dnd/shared";
import { FilterChip } from "../../ui/FilterChip";
import { fieldControlClass } from "../../ui/Field";
import type { FiltroDeObjetos } from "./filtrarObjetos";
import { NOMBRE_FILTRO_ZONA, NOMBRE_TIPO_OBJETO } from "./vocabulario";

// Tarea 9 (spec 2026-09-11, «la hoja a página completa») — la barra de filtros de la pestaña
// Objetos. Tres grupos de fichas y un buscador; **cada ficha alterna**: pulsar la activa la
// quita, porque «ninguna» es el estado normal y no merece una ficha propia («Todos») que
// compita con las de verdad.
//
// Las etiquetas salen de `vocabulario.ts`: ningún `WEAPON` ni `EQUIPPED` llega a la pantalla.

const ZONAS: ItemLocation[] = ["EQUIPPED", "CARRIED", "STORED"];
const TIPOS: ItemKind[] = ["WEAPON", "ARMOR", "SHIELD", "CONSUMABLE", "GEAR", "OTHER"];

export function FiltrosDeObjetos({
  filtro,
  onCambiar,
}: {
  filtro: FiltroDeObjetos;
  onCambiar: (filtro: FiltroDeObjetos) => void;
}) {
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
        {ZONAS.map((zona) => (
          <FilterChip
            key={zona}
            active={filtro.donde === zona}
            onClick={() => onCambiar({ ...filtro, donde: filtro.donde === zona ? null : zona })}
          >
            {NOMBRE_FILTRO_ZONA[zona]}
          </FilterChip>
        ))}
        <span aria-hidden="true" className="mx-s1 h-4 w-px bg-[color:var(--copper-rule)]" />
        <FilterChip
          active={filtro.sintonizados}
          onClick={() => onCambiar({ ...filtro, sintonizados: !filtro.sintonizados })}
        >
          Sintonizados
        </FilterChip>
      </div>
      <div className="flex flex-wrap items-center gap-s2">
        {TIPOS.map((tipo) => (
          <FilterChip
            key={tipo}
            active={filtro.que === tipo}
            onClick={() => onCambiar({ ...filtro, que: filtro.que === tipo ? null : tipo })}
          >
            {NOMBRE_TIPO_OBJETO[tipo]}
          </FilterChip>
        ))}
      </div>
    </div>
  );
}
