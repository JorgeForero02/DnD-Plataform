import { AtaquesYLanzamiento } from "../AtaquesYLanzamiento";
import { CompetenciasConArmas } from "../BloquesDelPie";
import type { PropsDePestana } from "./tipos";

// Tarea 4 (spec 2026-09-11, «la hoja a página completa») — la pestaña `Ataques`: lo que se
// dispara en un turno. Ambas tarjetas vivían en `HojaCalculada.tsx`; se mueven tal cual.
export function Ataques({ campaignId, characterId, data, disposicion }: PropsDePestana) {
  const { sheet, character } = data;
  const columnas = disposicion === "pagina" ? "lg:grid-cols-2" : "";
  return (
    <div data-pestana="ataques" className={`grid items-start gap-s4 ${columnas}`}>
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
