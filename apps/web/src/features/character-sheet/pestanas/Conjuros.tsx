import { TarjetaDeHoja } from "../Tarjeta";
import type { PropsDePestana } from "./tipos";
import { LibroDeConjuros } from "../../spellbook/LibroDeConjuros";
import { useSpellbook } from "../../spellbook/hooks";

// Tarea 6 (spec 2026-09-11, «la hoja a página completa» + 3A.2 «elegir, lanzar y usar») — la
// pestaña `Conjuros`: solo se monta para quien lanza (`lanzaConjuros`, filtro en
// `HojaCalculada.tsx`). La tarjeta «Espacios de conjuro» vivía suelta en `HojaCalculada.tsx`,
// entre `Recursos` y `Estado`; se mueve aquí tal cual (Task 6, spec 2026-09-11), y desde 3A.2
// pinta `actual/max` real —antes solo tenía `max`, el catálogo de espacios por nivel que ya
// sabía la hoja calculada, sin lo que el personaje tenía GASTADO—.
//
// Fix round 1 (revisión de Tarea 6) — la mudanza se había dejado la guarda
// `sheet.spellSlots.length > 0` en la cuneta. `lanzaConjuros` también es verdad para un lanzador
// SOLO racial (alto elfo guerrero: `spellSlots: []`, `spellSlotResetOn: "NONE"`), y sin la
// guarda la tarjeta pintaba «Espacios de conjuro (descanso largo)» con una lista vacía — un
// texto que le lleva la contraria al servidor (regla vinculante: si el texto explica una regla
// del servidor y discrepan, miente el texto). La guarda vuelve, ahora DENTRO de esta pestaña:
// sin espacios, solo se ve el `LibroDeConjuros`.
//
// **3A.2 — el libro de conjuros, debajo.** `LibroDeConjuros` pide su propio `GET …/spellbook`
// (`useSpellbook`, misma clave de consulta que se pide aquí para pintar `actual/max`: React
// Query la comparte, así que no es una segunda petición). El «Listos para lanzar» y el
// «Disponibles» de la spec §5 viven ahí, no en este fichero — esta pestaña solo compone la
// tarjeta de espacios (que necesita `sheet.spellSlotResetOn`, un dato de la HOJA, no del libro) y
// el libro debajo.
export function Conjuros({ data, campaignId, characterId, puedeEditar }: PropsDePestana) {
  const { sheet } = data;
  const espacios = useSpellbook(campaignId, characterId);
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
            {sheet.spellSlots.map((s) => {
              const real = espacios.data?.espacios.find((e) => e.nivel === s.spellLevel);
              return (
                <li
                  key={s.spellLevel}
                  className="rounded-radius-sm border border-muted px-s2 py-1 font-data text-chrome-sm text-text"
                >
                  Nivel {s.spellLevel}: {real ? `${real.actual} / ${real.max}` : s.slots}
                </li>
              );
            })}
          </ul>
        </TarjetaDeHoja>
      )}

      <LibroDeConjuros
        campaignId={campaignId}
        characterId={characterId}
        puedeEditar={puedeEditar}
      />
    </div>
  );
}
