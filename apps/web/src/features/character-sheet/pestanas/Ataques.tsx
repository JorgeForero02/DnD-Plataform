import { AtaquesYLanzamiento } from "../AtaquesYLanzamiento";
import { CompetenciasConArmas } from "../BloquesDelPie";
import type { PropsDePestana } from "./tipos";

// Tarea 4 (spec 2026-09-11, «la hoja a página completa») — la pestaña `Ataques`: lo que se
// dispara en un turno. Ambas tarjetas vivían en `HojaCalculada.tsx`; se mueven tal cual.
export function Ataques({ campaignId, characterId, data, disposicion }: PropsDePestana) {
  const { sheet, character } = data;
  const columnas = disposicion === "pagina" ? "lg:grid-cols-2" : "";
  // Ronda de arreglo 3 (2026-09-12, anexo #17) — a página las dos tarjetas son una sola fila de
  // dos columnas, y cada una es la única tarjeta de la suya: sin arma equipada, «Ataques y
  // lanzamiento» es un párrafo corto y «Competencias con armas» una lista de chips, de alto
  // natural distinto. `items-stretch` (mismo arreglo que `Numeros.tsx`) las iguala a la más alta
  // de las dos sin que ninguna necesite repartirse el sobrante con una vecina — al ser cada una
  // la única tarjeta de su columna, se estira ella sola, sin el truco de `flex-1` que sí hace
  // falta en Números para Salvaciones + Percepción pasiva.
  const alineacion = disposicion === "pagina" ? "items-stretch" : "items-start";
  return (
    <div data-pestana="ataques" className={`grid ${alineacion} gap-s4 ${columnas}`}>
      <AtaquesYLanzamiento
        campaignId={campaignId}
        characterId={characterId}
        sheet={sheet}
        attacks={data.attacks ?? []}
        visibilidadDelPersonaje={character.visibility}
      />
      <CompetenciasConArmas weaponProficiencies={sheet.weaponProficiencies} />
    </div>
  );
}
