// Estrato: SUPERPUESTO (parte de la hoja). Las dieciocho habilidades en columna
// larga y las seis salvaciones, con los cuatro estados de competencia y traza.
import { TrazaDesplegable } from "../Traza";
import type { HojaCompleta, CompetenciaHab } from "../../datos-de-ejemplo";

const marca: Record<CompetenciaHab, { clase: string; titulo: string }> = {
  ninguna: { clase: "border-muted/40", titulo: "Sin competencia" },
  media: { clase: "border-copper/60 bg-copper/30", titulo: "Media competencia" },
  competente: { clase: "border-copper bg-copper", titulo: "Competente" },
  pericia: { clase: "border-copper bg-copper ring-2 ring-copper/40", titulo: "Pericia (duplica)" },
};

export function SeccionHabilidades({ h }: { h: HojaCompleta }) {
  return (
    <div className="grid grid-cols-[1fr_1.4fr] gap-s5">
      <div>
        <h4 className="mb-s2 font-title text-chrome-md text-text">Salvaciones</h4>
        <ul className="space-y-s1">
          {h.salvaciones.map((s) => (
            <li key={s.nombre}>
              <TrazaDesplegable etiqueta={s.nombre} valor={s.valor} traza={s.traza} icono={
                <span className={`size-3 rounded-full border ${s.competente ? "border-copper bg-copper" : "border-muted/40"}`} />
              } />
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="mb-s2 flex items-center justify-between">
          <h4 className="font-title text-chrome-md text-text">Habilidades</h4>
          <div className="flex items-center gap-s3 font-chrome text-chrome-xs text-muted">
            <Leyenda tipo="media" /> media
            <Leyenda tipo="competente" /> competente
            <Leyenda tipo="pericia" /> pericia
          </div>
        </div>
        <ul className="space-y-s1">
          {h.habilidades.map((hab) => (
            <li key={hab.nombre}>
              <TrazaDesplegable
                etiqueta={`${hab.nombre} · ${hab.caracteristica}`}
                valor={hab.valor}
                traza={hab.traza}
                icono={
                  <span
                    title={marca[hab.competencia].titulo}
                    className={`size-3 rounded-full border ${marca[hab.competencia].clase}`}
                  />
                }
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Leyenda({ tipo }: { tipo: CompetenciaHab }) {
  return <span className={`inline-block size-2.5 rounded-full border ${marca[tipo].clase}`} />;
}
