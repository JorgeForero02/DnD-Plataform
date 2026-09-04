// Estrato: SUPERPUESTO — se abre encima de la mesa; al cerrarla vuelves donde
// estabas. Respeta la disposición conocida de la hoja de 5.ª (§3.5).
import { useState } from "react";
import { Dialog } from "../ui/Dialog";
import { IconFlechaDcha, IconEscudo, IconCorazon, IconRayo } from "../ui/icons";
import type { Personaje } from "../datos-de-ejemplo";

const caracteristicas = [
  { nombre: "FUE", valor: 10, mod: "+0" },
  { nombre: "DES", valor: 18, mod: "+4" },
  { nombre: "CON", valor: 14, mod: "+2" },
  { nombre: "INT", valor: 13, mod: "+1" },
  { nombre: "SAB", valor: 12, mod: "+1" },
  { nombre: "CAR", valor: 15, mod: "+2" },
];

const habilidades = [
  { nombre: "Juego de manos", valor: "+7", comp: true },
  { nombre: "Sigilo", valor: "+7", comp: true },
  { nombre: "Percepción", valor: "+4", comp: true },
  { nombre: "Engaño", valor: "+5", comp: true },
  { nombre: "Acrobacias", valor: "+4", comp: false },
  { nombre: "Perspicacia", valor: "+1", comp: false },
];

// Regla 10.1: el motor guarda la explicación de cada número.
const desgloseCA = [
  { origen: "Armadura de cuero tachonado", valor: "12" },
  { origen: "Destreza", valor: "+4" },
];

function NumeroConDesglose({
  etiqueta,
  valor,
  icono,
  desglose,
  formula,
}: {
  etiqueta: string;
  valor: string;
  icono: React.ReactNode;
  desglose: { origen: string; valor: string }[];
  formula: string;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="rounded-radius-md border border-copper/30 bg-bg p-s3">
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-s3 text-left"
      >
        <span className="text-copper-text">{icono}</span>
        <span className="flex-1">
          <span className="block font-chrome text-chrome-xs uppercase tracking-wide text-muted">
            {etiqueta}
          </span>
          <span className="font-data text-chrome-xl text-text">{valor}</span>
        </span>
        <IconFlechaDcha className={`size-4 text-muted transition-transform ${abierto ? "rotate-90" : ""}`} />
      </button>
      {abierto && (
        <div className="anim-surge mt-s2 border-t border-muted/20 pt-s2">
          <p className="mb-s2 font-data text-chrome-xs text-copper-text">{formula}</p>
          <dl className="space-y-s1 font-data text-chrome-sm">
            {desglose.map((d) => (
              <div key={d.origen} className="flex justify-between">
                <dt className="text-muted">{d.origen}</dt>
                <dd className="text-text">{d.valor}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

export function HojaDePersonaje({ p, onClose }: { p: Personaje; onClose: () => void }) {
  return (
    <Dialog
      titulo={p.nombre}
      subtitulo={`${p.raza} · ${p.clase} · nivel ${p.nivel} · jugador: ${p.jugador}`}
      onClose={onClose}
      anchura="ancha"
    >
      {/* Las seis características en cajas grandes arriba. */}
      <div className="grid grid-cols-6 gap-s2">
        {caracteristicas.map((c) => (
          <div
            key={c.nombre}
            className="rounded-radius-md border border-muted/25 bg-bg py-s2 text-center"
          >
            <div className="font-chrome text-chrome-xs uppercase tracking-wide text-muted">
              {c.nombre}
            </div>
            <div className="font-data text-chrome-lg text-text">{c.mod}</div>
            <div className="font-data text-chrome-xs text-muted">{c.valor}</div>
          </div>
        ))}
      </div>

      <div className="mt-s4 grid grid-cols-[1fr_1.1fr] gap-s5">
        {/* Habilidades a la izquierda, en columna larga. */}
        <div>
          <h4 className="mb-s2 font-title text-chrome-md text-text">Habilidades</h4>
          <ul className="space-y-s1">
            {habilidades.map((h) => (
              <li
                key={h.nombre}
                className="flex items-center justify-between border-b border-muted/15 py-s1"
              >
                <span className="flex items-center gap-s2 font-chrome text-chrome-sm text-text">
                  <span
                    className={`size-2 rounded-full ${h.comp ? "bg-copper" : "bg-muted/40"}`}
                    aria-hidden="true"
                  />
                  {h.nombre}
                </span>
                <span className="font-data text-chrome-sm text-text">{h.valor}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Combate a la derecha, con los números que enseñan de dónde salen. */}
        <div className="space-y-s3">
          <h4 className="font-title text-chrome-md text-text">Combate</h4>
          <NumeroConDesglose
            etiqueta="Clase de armadura"
            valor={String(p.ca)}
            icono={<IconEscudo className="size-6" />}
            formula={`CA ${p.ca} = 12 cuero tachonado + 4 Destreza`}
            desglose={desgloseCA}
          />
          <div className="grid grid-cols-2 gap-s3">
            <NumeroConDesglose
              etiqueta="Puntos de vida"
              valor={`${p.pv}/${p.pvMax}`}
              icono={<IconCorazon className="size-6" />}
              formula={`Máx ${p.pvMax} = 8 (dado) + 5×6 (nivel) + 6 Constitución`}
              desglose={[
                { origen: "Dado de golpe base", valor: "8" },
                { origen: "Niveles 2–6", valor: "+30" },
                { origen: "Constitución", valor: "+6" },
              ]}
            />
            <NumeroConDesglose
              etiqueta="Iniciativa"
              valor={`+${p.iniciativa}`}
              icono={<IconRayo className="size-6" />}
              formula={`Iniciativa +${p.iniciativa} = 4 Destreza`}
              desglose={[{ origen: "Destreza", valor: "+4" }]}
            />
          </div>
        </div>
      </div>
    </Dialog>
  );
}
