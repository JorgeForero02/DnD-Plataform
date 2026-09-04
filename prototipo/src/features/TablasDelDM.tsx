// Estrato: SUPERPUESTO — solo la ve el DM. Crear/editar una tabla de rangos,
// tirarla, y verla disparar sola en un crítico o una pifia. Interruptor de la
// casa apagado por defecto (el SRD no trae tablas de críticos). Y el gesto de
// dar un objeto a un personaje sin salir de la mesa.
import { useState } from "react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { BadgeVisibilidad } from "./BadgeVisibilidad";
import { IconD20, IconMas } from "../ui/icons";
import { tablasDM, grupo, type TablaDM } from "../datos-de-ejemplo";

const disparadorEtiqueta: Record<TablaDM["disparador"], string> = {
  ninguno: "Se tira a mano",
  critico: "Sola en un crítico",
  pifia: "Sola en una pifia",
};

export function TablasDelDM({ onClose }: { onClose: () => void }) {
  const [sel, setSel] = useState<TablaDM>(tablasDM[0]);
  const [resultado, setResultado] = useState<string | null>(null);
  const [dar, setDar] = useState<string | null>(null);

  function tirar() {
    // El servidor decide; aquí solo elegimos una fila de muestra.
    const fila = sel.filas[Math.floor(Math.random() * sel.filas.length)];
    setResultado(`${sel.dado} → ${fila.rango}: ${fila.resultado}`);
  }

  return (
    <Dialog
      titulo="Tablas del DM"
      subtitulo="Reglas de la casa: botín, rumores, encuentros, críticos y pifias"
      onClose={onClose}
      anchura="ancha"
    >
      <div className="grid grid-cols-[16rem_1fr] gap-s4">
        {/* Lista de tablas */}
        <div>
          <div className="mb-s2 flex items-center justify-between">
            <h4 className="font-title text-chrome-md text-text">Tus tablas</h4>
            <Button variante="fantasma" tamano="sm" icono={<IconMas />}>Nueva</Button>
          </div>
          <ul className="space-y-s1">
            {tablasDM.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => { setSel(t); setResultado(null); }}
                  className={`w-full rounded-radius-sm border px-s3 py-s2 text-left transition-colors ${
                    sel.id === t.id ? "border-copper bg-bg" : "border-muted/25 hover:border-muted/50"
                  }`}
                >
                  <span className="block font-chrome text-chrome-sm text-text">{t.nombre}</span>
                  <span className="font-chrome text-chrome-xs text-muted">{disparadorEtiqueta[t.disparador]}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* La tabla elegida */}
        <div>
          <div className="mb-s3 flex flex-wrap items-center gap-s2">
            <h3 className="font-title text-chrome-lg text-text">{sel.nombre}</h3>
            <BadgeVisibilidad v={sel.visibilidad} />
            <Badge tono={sel.disparador === "pifia" ? "danger" : sel.disparador === "critico" ? "accent" : "muted"}>
              {disparadorEtiqueta[sel.disparador]}
            </Badge>
            {/* La regla de la casa nace apagada. */}
            <label className="ml-auto flex items-center gap-s2 font-chrome text-chrome-sm text-muted">
              <input type="checkbox" defaultChecked={sel.activa} />
              {sel.activa ? "Activa en la campaña" : "Apagada — el SRD no trae esta regla"}
            </label>
          </div>

          <table className="w-full border-collapse font-world text-world-base">
            <thead>
              <tr className="border-b border-copper/30 text-left font-chrome text-chrome-xs uppercase text-muted">
                <th className="w-16 py-s1">{sel.dado}</th>
                <th className="py-s1">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {sel.filas.map((f) => (
                <tr key={f.rango} className="border-b border-muted/15">
                  <td className="py-s1 font-data text-copper-text">{f.rango}</td>
                  <td className="py-s1 text-text">{f.resultado}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-s3 flex items-center gap-s3">
            <Button variante="accent" icono={<IconD20 />} onClick={tirar}>Tirar la tabla</Button>
            {resultado && (
              <p className="anim-surge font-world text-world-base italic text-copper-text">{resultado}</p>
            )}
          </div>

          {/* Dar un objeto a un personaje, sin salir de la mesa. */}
          <div className="mt-s5 border-t border-muted/20 pt-s3">
            <h4 className="mb-s2 font-title text-chrome-md text-text">Dar un objeto a un personaje</h4>
            <div className="flex flex-wrap gap-s1">
              {grupo.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setDar(p.nombre)}
                  className={`rounded-radius-sm border px-s3 py-s1 font-chrome text-chrome-sm transition-colors ${
                    dar === p.nombre ? "border-copper bg-copper/15 text-copper-text" : "border-muted/30 text-muted hover:text-text"
                  }`}
                >
                  {p.nombre.split(" ")[0]}
                </button>
              ))}
            </div>
            {dar && (
              <p className="anim-surge mt-s2 font-world text-world-base text-text">
                El resultado de «{sel.nombre}» irá a la bolsa de <span className="text-copper-text">{dar}</span> y saldrá en el registro.
              </p>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
