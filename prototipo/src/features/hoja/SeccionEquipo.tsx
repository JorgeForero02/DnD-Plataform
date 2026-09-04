// Estrato: SUPERPUESTO (parte de la hoja). Cuadro de ataques (se tira desde
// ahí), ranuras de equipo con manos y sintonización, y la bolsa de cinco
// monedas. Equipar cambia la hoja y sale en la traza.
import { TrazaDesplegable } from "../Traza";
import { Badge } from "../../ui/Badge";
import { IconEspada, IconD20 } from "../../ui/icons";
import type { HojaCompleta, Accion } from "../../datos-de-ejemplo";

const monedaEtiqueta: Record<string, { nombre: string; tono: string }> = {
  pp: { nombre: "Platino", tono: "text-text" },
  po: { nombre: "Oro", tono: "text-warning-text" },
  pe: { nombre: "Electro", tono: "text-muted" },
  pa: { nombre: "Plata", tono: "text-muted" },
  pc: { nombre: "Cobre", tono: "text-copper-text" },
};

export function SeccionEquipo({
  h,
  onTirarAtaque,
}: {
  h: HojaCompleta;
  onTirarAtaque: (a: Accion) => void;
}) {
  return (
    <div className="space-y-s4">
      {/* Cuadro de ataques */}
      <div>
        <h4 className="mb-s2 font-title text-chrome-md text-text">Ataques</h4>
        <div className="space-y-s2">
          {h.ataques.map((a) => (
            <div key={a.nombre} className="rounded-radius-md border border-muted/25 bg-bg p-s3">
              <div className="flex items-center gap-s3">
                <IconEspada className="size-5 text-copper-text" />
                <span className="flex-1 font-chrome text-chrome-base font-medium text-text">{a.nombre}</span>
                <button
                  onClick={() =>
                    onTirarAtaque({
                      id: a.nombre,
                      nombre: a.nombre,
                      coste: "Acción",
                      tipo: "ataque",
                      detalle: `${a.bono} · ${a.dano} ${a.tipo}`,
                    })
                  }
                  className="inline-flex items-center gap-s1 rounded-radius-sm bg-accent px-s3 py-s1 font-chrome text-chrome-xs text-bg hover:brightness-110"
                >
                  <IconD20 className="size-4" /> Tirar
                </button>
              </div>
              <div className="mt-s2 flex flex-wrap items-center gap-x-s4 gap-y-s1 font-data text-chrome-sm text-muted">
                <span>ataque <span className="text-text">{a.bono}</span></span>
                <span>daño <span className="text-text">{a.dano}</span> {a.tipo}</span>
                {a.versatil && <span>versátil <span className="text-text">{a.versatil}</span></span>}
                <span>alcance <span className="text-text">{a.alcance}</span></span>
              </div>
              <div className="mt-s2">
                <TrazaDesplegable etiqueta="Bono al ataque" valor={a.bono} traza={a.traza} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ranuras de equipo + sintonización */}
      <div className="grid grid-cols-2 gap-s3">
        <div className="rounded-radius-md border border-muted/25 bg-bg p-s3">
          <h4 className="mb-s2 font-chrome text-chrome-xs uppercase tracking-wide text-muted">Ranuras</h4>
          <ul className="space-y-s1 font-chrome text-chrome-sm">
            {h.ranuras.map((r) => (
              <li key={r.ranura} className="flex justify-between border-b border-muted/15 pb-s1">
                <span className="text-muted">{r.ranura}</span>
                <span className={r.objeto ? "text-text" : "text-muted/50 italic"}>
                  {r.objeto ?? "vacía"}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-radius-md border border-muted/25 bg-bg p-s3">
          <h4 className="mb-s2 font-chrome text-chrome-xs uppercase tracking-wide text-muted">Sintonización</h4>
          <p className="mb-s2 font-data text-chrome-sm text-text">
            {h.sintonizacion.usadas} de {h.sintonizacion.tope} usadas
          </p>
          <div className="flex flex-wrap gap-s1">
            {h.sintonizacion.objetos.map((o) => (
              <Badge key={o} tono="copper">{o}</Badge>
            ))}
            {Array.from({ length: h.sintonizacion.tope - h.sintonizacion.usadas }).map((_, i) => (
              <Badge key={i} tono="muted">ranura libre</Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Bolsa de cinco monedas, sin decimales. */}
      <div className="rounded-radius-md border border-copper/30 bg-bg p-s3">
        <h4 className="mb-s2 font-chrome text-chrome-xs uppercase tracking-wide text-muted">Bolsa</h4>
        <div className="grid grid-cols-5 gap-s2">
          {(Object.keys(monedaEtiqueta) as (keyof HojaCompleta["monedas"])[]).map((k) => (
            <div key={k} className="text-center">
              <div className={`font-data text-chrome-lg ${monedaEtiqueta[k].tono}`}>{h.monedas[k]}</div>
              <div className="font-chrome text-chrome-xs text-muted">{monedaEtiqueta[k].nombre}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
