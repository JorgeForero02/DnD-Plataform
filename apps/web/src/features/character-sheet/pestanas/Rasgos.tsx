import { Personalidad, RasgosYAptitudes } from "../BloquesDelPie";
import { FichaEditable } from "../IdentidadEditable";
import { TarjetaDeHoja } from "../Tarjeta";
import type { PropsDePestana } from "./tipos";

// Tarea 4 (spec 2026-09-11, «la hoja a página completa») — la pestaña `Rasgos`: lo que se lee
// una vez por sesión y no se consulta en mitad de un turno. Las tres tarjetas vivían en
// `HojaCalculada.tsx`; se mueven tal cual.
export function Rasgos({
  campaignId,
  characterId,
  data,
  puedeEditar,
  disposicion,
}: PropsDePestana) {
  const { character, sheet } = data;
  const columnas = disposicion === "pagina" ? "lg:grid-cols-2" : "";
  return (
    <div data-pestana="rasgos" className={`grid items-start gap-s4 ${columnas}`}>
      {/* Anexo #7 — la columna izquierda apila Ficha y Personalidad, sin hueco bajo «Ficha»:
          antes las tres tarjetas eran hermanas de una rejilla a dos columnas y el motor de
          rejilla las repartía dos-y-una, dejando un hueco vacío bajo la más corta. Rasgos va
          sola a la derecha, tan alta como haga falta. */}
      <div className="grid gap-s4">
        <TarjetaDeHoja key="ficha" titulo="Ficha" etiqueta="ficha del personaje">
          {/* La misma tarjeta que pinta el `return` temprano de `HojaCalculada.tsx` (para cuando
              la hoja aún no es derivable), pero YA NO en la misma posición del árbol: aquella
              vive dentro del `if (!sheet)` de `HojaCalculada.tsx`, y esta pestaña solo se monta
              en la rama derivable. Desde la Tarea 4 (2026-09-11) React desmonta y vuelve a
              montar `FichaEditable` al pasar de una rama a la otra — la nota completa, y el
              coste aceptado (se pierde como mucho el indicador transitorio de «guardando…» de un
              campo que ya se guardó al perder el foco, nunca el valor), está junto a `identidad`
              en `HojaCalculada.tsx`. El `key="ficha"` de aquí solo mantiene la identidad de ESTE
              nodo frente a sus hermanos dentro de esta pestaña, no frente a la otra rama. */}
          <FichaEditable
            campaignId={campaignId}
            characterId={characterId}
            character={character}
            puedeEditar={puedeEditar}
          />
        </TarjetaDeHoja>
        <Personalidad bio={character.bio} />
      </div>
      <RasgosYAptitudes features={sheet.features} />
    </div>
  );
}
