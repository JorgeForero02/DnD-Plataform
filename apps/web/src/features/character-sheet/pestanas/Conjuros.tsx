import { TarjetaDeHoja } from "../Tarjeta";
import { EmptyState } from "../../../ui/Collection";
import type { PropsDePestana } from "./tipos";

// Tarea 6 (spec 2026-09-11, «la hoja a página completa») — la pestaña `Conjuros`: solo se monta
// para quien lanza (`lanzaConjuros`, filtro en `HojaCalculada.tsx`). La tarjeta «Espacios de
// conjuro» vivía suelta en `HojaCalculada.tsx`, entre `Recursos` y `Estado`; se mueve aquí tal
// cual, sin reescribir su JSX. Una sola columna en las dos disposiciones — no hay `lg:grid-cols`
// porque el spec dice que `Conjuros` es de una columna tanto en "mesa" como en "pagina".
//
// Fix round 1 (revisión de Tarea 6) — la mudanza se había dejado la guarda
// `sheet.spellSlots.length > 0` en la cuneta. `lanzaConjuros` también es verdad para un lanzador
// SOLO racial (alto elfo guerrero: `spellSlots: []`, `spellSlotResetOn: "NONE"`), y sin la
// guarda la tarjeta pintaba «Espacios de conjuro (descanso largo)» con una lista vacía — un
// texto que le lleva la contraria al servidor (regla vinculante: si el texto explica una regla
// del servidor y discrepan, miente el texto). La guarda vuelve, ahora DENTRO de esta pestaña:
// sin espacios, solo se ve el `EmptyState`.
export function Conjuros({ data }: PropsDePestana) {
  const { sheet } = data;
  return (
    <div data-pestana="conjuros" className="flex min-w-0 flex-col gap-s4">
      {sheet.spellSlots.length > 0 && (
        <TarjetaDeHoja
          titulo={`Espacios de conjuro (${
            sheet.spellSlotResetOn === "SHORT_REST" ? "descanso corto" : "descanso largo"
          })`}
          etiqueta="espacios de conjuro"
        >
          <ul className="flex flex-wrap gap-s2">
            {sheet.spellSlots.map((s) => (
              <li
                key={s.spellLevel}
                className="rounded-radius-sm border border-muted px-s2 py-1 font-data text-chrome-sm text-text"
              >
                Nivel {s.spellLevel}: {s.slots}
              </li>
            ))}
          </ul>
        </TarjetaDeHoja>
      )}

      <EmptyState title="Los conjuros llegan con el paso 3">
        Hoy la hoja sabe cuántos espacios tienes; la lista de conjuros y su lanzamiento están
        planificados.
      </EmptyState>
    </div>
  );
}
