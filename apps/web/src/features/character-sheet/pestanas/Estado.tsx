import { ModificadoresTemporales } from "../ModificadoresTemporales";
import { Condiciones } from "../Condiciones";
import { VelocidadYSentidos } from "../VelocidadYSentidos";
import { Anulaciones } from "../Anulaciones";
import { ValorDerivado } from "../Traza";
import { TarjetaDeHoja } from "../Tarjeta";
import type { PropsDePestana } from "./tipos";

// Tarea 5 (spec 2026-09-11, «la hoja a página completa») — la pestaña `Estado`: lo que cambia
// entre turnos y hay que vigilar — modificadores temporales, condiciones con su gestión, la CA
// con su fórmula, velocidad y sentidos, y las anulaciones del DM. Las tarjetas vivían en
// `HojaCalculada.tsx`; se mueven tal cual, sin reescribir su JSX ni sus comentarios.
export function Estado({
  campaignId,
  characterId,
  data,
  puedeEditar,
  disposicion,
}: PropsDePestana) {
  const { sheet } = data;
  const columnas = disposicion === "pagina" ? "lg:grid-cols-2" : "";
  return (
    <div data-pestana="estado" className={`grid items-start gap-s4 ${columnas}`}>
      <div className="flex min-w-0 flex-col gap-s4">
        {/* **Modificadores temporales** (plan 13, M8), junto a las condiciones y no dentro de
            ellas: comparten la caducidad, pero una condición es una regla del SRD con nombre
            cerrado y esto es un número arbitrario con un motivo escrito a mano. */}
        <TarjetaDeHoja titulo="Modificadores temporales" etiqueta="modificadores temporales">
          <ModificadoresTemporales
            campaignId={campaignId}
            characterId={characterId}
            puedeEditar={puedeEditar}
          />
        </TarjetaDeHoja>

        <TarjetaDeHoja titulo="Condiciones activas" etiqueta="condiciones">
          <Condiciones
            campaignId={campaignId}
            characterId={characterId}
            puedeEditar={puedeEditar}
          />
        </TarjetaDeHoja>
      </div>

      <div className="flex min-w-0 flex-col gap-s4">
        {/* **La Clase de Armadura, con su fórmula en línea.** La cifra sale también arriba en
            la tira, y eso está bien: son el mismo valor derivado leído del mismo sitio, así
            que no pueden discrepar. Lo que aporta esta tarjeta es la explicación a tamaño de
            lectura, que en una casilla de la tira no cabe. */}
        <TarjetaDeHoja titulo="Clase de armadura" etiqueta="clase de armadura">
          <ValorDerivado variante="tarjeta" etiqueta="Clase de armadura" valor={sheet.derived.ac} />
        </TarjetaDeHoja>

        <TarjetaDeHoja titulo="Velocidad y sentidos" etiqueta="velocidad y sentidos">
          <VelocidadYSentidos
            speeds={sheet.speeds}
            effectiveSpeeds={data.effectiveSpeeds}
            darkvision={sheet.derived["senses.darkvision"]}
          />
        </TarjetaDeHoja>

        <Anulaciones
          campaignId={campaignId}
          characterId={characterId}
          overrides={data.character.overrides}
        />
      </div>
    </div>
  );
}
