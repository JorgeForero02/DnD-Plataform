import { PuntosDeGolpe } from "../PuntosDeGolpe";
import { RecursosYDescansos } from "../RecursosYDescansos";
import { Actividades } from "../Actividades";
import { DadosDeGolpe, SalvacionesDeMuerte } from "../TarjetasDeEstado";
import { TarjetaDeHoja } from "../Tarjeta";
import type { PropsDePestana } from "./tipos";

// Tarea 5 (spec 2026-09-11, «la hoja a página completa») — la pestaña `Recursos`: lo que se gasta
// y se repone en una mesa — PG, dados de golpe, salvaciones de muerte, recursos y descansos, y
// las actividades cuando el catálogo concede alguna. Las tarjetas vivían en `HojaCalculada.tsx`;
// se mueven tal cual, sin reescribir su JSX ni sus comentarios.
export function Recursos({
  campaignId,
  characterId,
  data,
  puedeEditar,
  disposicion,
}: PropsDePestana) {
  const { sheet, hp, deathSaves } = data;
  const columnas = disposicion === "pagina" ? "lg:grid-cols-2" : "";
  return (
    <div data-pestana="recursos" className={`grid items-start gap-s4 ${columnas}`}>
      <div className="flex min-w-0 flex-col gap-s4">
        <TarjetaDeHoja titulo="Puntos de golpe">
          <PuntosDeGolpe
            campaignId={campaignId}
            characterId={characterId}
            hp={hp}
            // La traza de los PG máximos, para poder decir por qué son la mitad cuando el
            // agotamiento los parte (2C.4). La cifra sigue saliendo de `hp.max`.
            maxHp={sheet.derived.maxHp}
            puedeEditar={puedeEditar}
          />
        </TarjetaDeHoja>

        <DadosDeGolpe campaignId={campaignId} characterId={characterId} puedeEditar={puedeEditar} />

        <SalvacionesDeMuerte
          campaignId={campaignId}
          characterId={characterId}
          deathSaves={deathSaves}
          puedeEditar={puedeEditar}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-s4">
        <TarjetaDeHoja titulo="Recursos y descansos" etiqueta="recursos y descansos">
          <RecursosYDescansos
            campaignId={campaignId}
            characterId={characterId}
            puedeEditar={puedeEditar}
          />
        </TarjetaDeHoja>

        {/* Paso 2, tarea A11 — el botón de usar una actividad (hoy, solo la Furia). Solo se
            monta cuando el catálogo concede alguna: un personaje sin clase, o de una clase
            sin actividades completas, no tiene nada que enseñar aquí. */}
        {(sheet.activities ?? []).length > 0 && (
          <TarjetaDeHoja titulo="Actividades" etiqueta="actividades">
            <Actividades
              campaignId={campaignId}
              characterId={characterId}
              activities={sheet.activities ?? []}
              puedeEditar={puedeEditar}
            />
          </TarjetaDeHoja>
        )}
      </div>
    </div>
  );
}
