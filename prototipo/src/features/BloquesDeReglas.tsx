// Estrato: SUPERPUESTO — solo la ve el DM. El motor de reglas: una frase de tres
// partes que se compone arrastrando piezas a tres carriles. Cada pieza tiene su
// color según su carril, y un carril rechaza la pieza que no es suya. No es un
// editor de automatizaciones de oficina: es el DM escribiendo el destino.
import { useState } from "react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { IconRayo } from "../ui/icons";
import { vocabularioReglas, reglas, type PiezaCarril } from "../datos-de-ejemplo";

const carriles: { id: PiezaCarril; titulo: string; tono: string; borde: string }[] = [
  { id: "suceso", titulo: "Cuando pase…", tono: "text-accent-text", borde: "border-accent/50" },
  { id: "condicion", titulo: "…si se cumple…", tono: "text-warning-text", borde: "border-warning/50" },
  { id: "efecto", titulo: "…haz", tono: "text-copper-text", borde: "border-copper/50" },
];

const piezaColor: Record<PiezaCarril, string> = {
  suceso: "border-accent/60 bg-accent/10 text-accent-text",
  condicion: "border-warning/60 bg-warning/10 text-warning-text",
  efecto: "border-copper/60 bg-copper/10 text-copper-text",
};

export function BloquesDeReglas({ onClose }: { onClose: () => void }) {
  const [frase, setFrase] = useState<Record<PiezaCarril, string | null>>({
    suceso: null, condicion: null, efecto: null,
  });
  const [rechazo, setRechazo] = useState<PiezaCarril | null>(null);
  const [ensayo, setEnsayo] = useState<string | null>(null);
  const [interruptor, setInterruptor] = useState(true);

  function soltar(carril: PiezaCarril, e: React.DragEvent) {
    e.preventDefault();
    const origen = e.dataTransfer.getData("carril") as PiezaCarril;
    const texto = e.dataTransfer.getData("texto");
    if (origen !== carril) {
      // Un carril rechaza la pieza que no es suya.
      setRechazo(carril);
      window.setTimeout(() => setRechazo(null), 500);
      return;
    }
    setFrase((f) => ({ ...f, [carril]: texto }));
  }

  const completa = frase.suceso && frase.condicion && frase.efecto;

  return (
    <Dialog
      titulo="Bloques de reglas"
      subtitulo="«Cuando revelen la carta del gremio, si Kellan ya está muerto, avisa a Sirella.»"
      onClose={onClose}
      anchura="ancha"
      acciones={
        <>
          <label className="mr-auto flex items-center gap-s2 font-chrome text-chrome-sm text-muted">
            <input type="checkbox" checked={interruptor} onChange={(e) => setInterruptor(e.target.checked)} />
            Motor de reglas armado en esta campaña
          </label>
          <Button variante="fantasma" disabled={!completa} onClick={() => setEnsayo("Ensayo en seco: se avisaría a Sirella. No se ha cambiado nada.")}>
            Ensayo en seco
          </Button>
          <Button variante="accent" disabled={!completa}>Armar la regla</Button>
        </>
      }
    >
      {/* Los tres carriles */}
      <div className="grid grid-cols-3 gap-s2">
        {carriles.map((c) => (
          <div
            key={c.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => soltar(c.id, e)}
            className={`min-h-24 rounded-radius-md border-2 border-dashed p-s3 transition-colors ${c.borde} ${
              rechazo === c.id ? "bg-danger/20" : "bg-bg"
            }`}
          >
            <h4 className={`mb-s2 font-title text-chrome-sm ${c.tono}`}>{c.titulo}</h4>
            {frase[c.id] ? (
              <button
                onClick={() => setFrase((f) => ({ ...f, [c.id]: null }))}
                className={`w-full rounded-radius-sm border px-s2 py-s2 text-left font-chrome text-chrome-sm ${piezaColor[c.id]}`}
              >
                {frase[c.id]}
              </button>
            ) : (
              <p className="font-chrome text-chrome-xs italic text-muted">Arrastra aquí una pieza</p>
            )}
          </div>
        ))}
      </div>

      {ensayo && (
        <p className="anim-surge mt-s3 rounded-radius-sm border border-accent/40 bg-accent/10 px-s3 py-s2 font-world text-world-base text-accent-text">
          {ensayo}
        </p>
      )}

      {/* La despensa de piezas, agrupada por carril */}
      <div className="mt-s4 space-y-s3">
        {carriles.map((c) => (
          <div key={c.id}>
            <h5 className={`mb-s1 font-chrome text-chrome-xs uppercase tracking-wide ${c.tono}`}>{c.titulo}</h5>
            <div className="flex flex-wrap gap-s1">
              {vocabularioReglas[c.id].map((p) => (
                <span
                  key={p}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("carril", c.id);
                    e.dataTransfer.setData("texto", p);
                  }}
                  className={`cursor-grab rounded-radius-sm border px-s2 py-s1 font-chrome text-chrome-xs active:cursor-grabbing ${piezaColor[c.id]}`}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Reglas existentes, con cuántas veces ha disparado cada una */}
      <div className="mt-s5 border-t border-muted/20 pt-s3">
        <h4 className="mb-s2 font-title text-chrome-md text-text">Reglas de la campaña</h4>
        <ul className="space-y-s2">
          {reglas.map((r) => (
            <li key={r.id} className="flex items-center gap-s3 rounded-radius-md border border-muted/25 bg-bg p-s3">
              <IconRayo className={`size-4 shrink-0 ${r.armada ? "text-accent-text" : "text-muted/40"}`} />
              <p className="min-w-0 flex-1 font-world text-world-base text-text">
                <span className="text-accent-text">Cuando</span> {r.cuando},{" "}
                <span className="text-warning-text">si</span> {r.si},{" "}
                <span className="text-copper-text">haz</span> {r.haz}.
              </p>
              {r.propuesta && <Badge tono="warning">propuesta, espera tu aprobación</Badge>}
              <span className="shrink-0 font-data text-chrome-xs text-muted">
                {r.disparos === 0 ? "sin disparar" : `${r.disparos} disparos`}
              </span>
              <Badge tono={r.armada ? "accent" : "muted"}>{r.armada ? "armada" : "en reposo"}</Badge>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}
