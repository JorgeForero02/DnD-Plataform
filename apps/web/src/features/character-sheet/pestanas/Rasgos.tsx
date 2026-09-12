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
      <TarjetaDeHoja key="ficha" titulo="Ficha" etiqueta="ficha del personaje">
        {/* La misma tarjeta que pinta el `return` temprano de `HojaCalculada.tsx` (para cuando
            la hoja aún no es derivable) y **en la misma posición del árbol** dentro de ESTA
            pestaña: es lo que hace que el campo que se está tecleando sobreviva al momento en
            que la hoja pasa a ser derivable — la clave no es adorno. */}
        <FichaEditable
          campaignId={campaignId}
          characterId={characterId}
          character={character}
          puedeEditar={puedeEditar}
        />
      </TarjetaDeHoja>
      <RasgosYAptitudes features={sheet.features} />
      <Personalidad bio={character.bio} />
    </div>
  );
}
