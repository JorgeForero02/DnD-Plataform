// Estrato: SUPERPUESTO (parte de la hoja). Anatomía conocida de 5.ª: seis
// características en cajas grandes, el combate a un lado. La traza, protagonista.
import { TrazaDesplegable } from "../Traza";
import { Temporizador } from "../Temporizador";
import { IconEscudo, IconCorazon, IconRayo, IconOjo } from "../../ui/icons";
import type { HojaCompleta, Personaje } from "../../datos-de-ejemplo";

export function SeccionCombate({ h, p }: { h: HojaCompleta; p: Personaje }) {
  return (
    <div className="space-y-s4">
      {/* Seis características en cajas grandes arriba. */}
      <div className="grid grid-cols-6 gap-s2">
        {h.caracteristicas.map((c) => (
          <div key={c.abrev} className="rounded-radius-md border border-muted/25 bg-bg py-s2 text-center">
            <div className="font-chrome text-chrome-xs uppercase tracking-wide text-muted">{c.abrev}</div>
            <div className="font-data text-chrome-lg text-text">{c.mod}</div>
            <div className="font-data text-chrome-xs text-muted">{c.valor}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-s2">
        <TrazaDesplegable etiqueta="Clase de armadura" valor={String(h.ca.valor)} traza={h.ca.traza} destacado icono={<IconEscudo className="size-6" />} />
        <TrazaDesplegable
          etiqueta="Puntos de golpe"
          valor={`${h.pg.actual}/${h.pg.max}${h.pg.temporal ? ` (+${h.pg.temporal})` : ""}`}
          traza={h.pg.traza}
          destacado
          icono={<IconCorazon className="size-6" />}
        />
        <TrazaDesplegable etiqueta="Iniciativa" valor={h.iniciativa.valor} traza={h.iniciativa.traza} destacado icono={<IconRayo className="size-6" />} />
      </div>

      {/* Salvaciones de muerte: tres y tres casillas. */}
      <div className="flex items-center gap-s4 rounded-radius-md border border-muted/25 bg-bg p-s3">
        <span className="font-chrome text-chrome-sm text-text">Salvaciones de muerte</span>
        <Casillas etiqueta="Éxitos" tono="accent" marcadas={h.salvacionesMuerte.exitos} />
        <Casillas etiqueta="Fracasos" tono="danger" marcadas={h.salvacionesMuerte.fracasos} />
      </div>

      {/* Condiciones activas con su temporizador y su efecto sobre los números. */}
      {p.estados.length > 0 && (
        <div className="rounded-radius-md border border-warning/30 bg-bg p-s3">
          <h4 className="mb-s2 font-chrome text-chrome-xs uppercase tracking-wide text-warning-text">
            Condiciones activas
          </h4>
          <div className="space-y-s2">
            {p.estados.map((e) => (
              <div key={e.nombre} className="flex items-start justify-between gap-s3">
                <Temporizador estado={e} conEfecto />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Velocidades, percepción pasiva y visión. */}
      <div className="grid grid-cols-[1.4fr_1fr] gap-s3">
        <div className="rounded-radius-md border border-muted/25 bg-bg p-s3">
          <h4 className="mb-s2 font-chrome text-chrome-xs uppercase tracking-wide text-muted">Velocidades</h4>
          <ul className="grid grid-cols-2 gap-x-s4 gap-y-s1 font-data text-chrome-sm">
            {h.velocidades.map((v) => (
              <li key={v.nombre} className="flex justify-between border-b border-muted/15 pb-s1">
                <span className="text-muted">{v.nombre}</span>
                <span className="text-text">{v.valor}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-s2">
          <TrazaDesplegable etiqueta="Percepción pasiva" valor={String(h.percepcionPasiva.valor)} traza={h.percepcionPasiva.traza} icono={<IconOjo className="size-5" />} />
          <div className="rounded-radius-md border border-muted/25 bg-bg p-s2">
            <span className="block font-chrome text-chrome-xs uppercase tracking-wide text-muted">Visión en la oscuridad</span>
            <span className="font-data text-chrome-md text-text">{h.visionOscuridad}</span>
          </div>
        </div>
      </div>

      {/* Recursos consumibles con su reposición. */}
      <div className="rounded-radius-md border border-muted/25 bg-bg p-s3">
        <h4 className="mb-s2 font-chrome text-chrome-xs uppercase tracking-wide text-muted">Recursos</h4>
        <ul className="space-y-s2">
          {h.recursos.map((r) => (
            <li key={r.nombre} className="flex items-center gap-s3">
              <div className="flex gap-s1">
                {Array.from({ length: r.max }).map((_, i) => (
                  <span
                    key={i}
                    className={`size-3 rounded-full border ${i < r.actual ? "border-accent bg-accent" : "border-muted/40"}`}
                  />
                ))}
              </div>
              <span className="flex-1 font-chrome text-chrome-sm text-text">{r.nombre}</span>
              <span className="font-chrome text-chrome-xs text-muted">reponen en {r.reposicion}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Casillas({ etiqueta, tono, marcadas }: { etiqueta: string; tono: "accent" | "danger"; marcadas: number }) {
  return (
    <span className="flex items-center gap-s2">
      <span className="font-chrome text-chrome-xs text-muted">{etiqueta}</span>
      <span className="flex gap-s1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`size-3.5 rounded-full border ${
              i < marcadas
                ? tono === "accent" ? "border-accent bg-accent" : "border-danger bg-danger"
                : "border-muted/40"
            }`}
          />
        ))}
      </span>
    </span>
  );
}
