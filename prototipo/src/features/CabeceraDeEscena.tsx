// Estrato: PERMANENTE — nunca se sustituye, no tiene botón de cerrar.
// Ocupa el sitio donde llegará el mapa: cuando llegue, esta cabecera pasará a
// ser la banda superior del tablero, no desaparecerá (§7).
import { RelojDeCampana } from "./RelojDeCampana";
import { Badge } from "../ui/Badge";
import { IconMundo, IconMas } from "../ui/icons";
import type { Personaje } from "../datos-de-ejemplo";

export function CabeceraDeEscena({
  lugar,
  ambiente,
  hora,
  dia,
  noche,
  presentes,
  esDM,
  onRevelar,
}: {
  lugar: string;
  ambiente: string;
  hora: string;
  dia: string;
  noche: boolean;
  presentes: Personaje[];
  esDM?: boolean;
  onRevelar?: () => void;
}) {
  return (
    <header
      className={`relative overflow-hidden rounded-radius-md border border-copper/30 px-s5 py-s4 transition-colors ${
        noche
          ? "bg-gradient-to-br from-bg via-surface to-bg"
          : "bg-gradient-to-br from-surface via-surface to-vellum/30"
      }`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(120% 80% at 85% -10%, color-mix(in srgb, var(--c-copper) 22%, transparent), transparent 60%)",
        }}
      />
      {/* Sitio reservado para el futuro tablero/mapa (§7). */}
      <div className="relative flex items-start justify-between gap-s5">
        <div className="min-w-0">
          <div className="mb-s1 flex items-center gap-s2 font-chrome text-chrome-xs uppercase tracking-widest text-copper-text">
            <IconMundo className="size-4" /> Escena actual
          </div>
          <h1 className="truncate font-title text-chrome-xl text-text">{lugar}</h1>
          <p className="mt-s1 max-w-[52ch] font-world text-world-base italic text-muted">
            {ambiente}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-s3">
          <RelojDeCampana hora={hora} dia={dia} noche={noche} />
          {esDM && onRevelar && (
            <button
              onClick={onRevelar}
              className="inline-flex items-center gap-s1 rounded-radius-sm border border-copper text-copper-text px-s2 py-s1 font-chrome text-chrome-xs hover:bg-copper/15"
            >
              <IconMas className="size-4" /> Revelar lugar
            </button>
          )}
        </div>
      </div>
      <div className="relative mt-s3 flex flex-wrap items-center gap-s2">
        <span className="font-chrome text-chrome-xs text-muted">Presentes:</span>
        {presentes.map((p) => (
          <Badge key={p.id} tono="muted">
            <span
              aria-hidden="true"
              className="mr-s1 inline-block size-2 rounded-full"
              style={{ backgroundColor: p.retrato }}
            />
            {p.nombre.split(" ")[0]}
          </Badge>
        ))}
      </div>
    </header>
  );
}
