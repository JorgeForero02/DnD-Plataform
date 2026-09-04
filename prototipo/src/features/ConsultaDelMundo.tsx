// Estrato: SUPERPUESTO — el códice del mundo. NO una pestaña por tipo: una sola
// entrada, con búsqueda, y las categorías como filtros dentro (§8.3).
// Se entra a LEER; se sale volviendo a donde estabas.
import { useMemo, useState } from "react";
import { Dialog } from "../ui/Dialog";
import { FilterChip } from "../ui/FilterChip";
import { TextInput } from "../ui/Field";
import { Button } from "../ui/Button";
import { BadgeVisibilidad } from "./BadgeVisibilidad";
import { IconLupa, IconMegafono, IconFlechaIzq } from "../ui/icons";
import { mundo, type EntradaMundo } from "../datos-de-ejemplo";

const tipos = ["Personaje", "Lugar", "Misión", "Facción", "Objeto", "Suceso", "Documento"] as const;

function PaginaEntidad({
  e,
  esDM,
  onVolver,
}: {
  e: EntradaMundo;
  esDM: boolean;
  onVolver: () => void;
}) {
  // §8.4: como la página de un libro. Tipografía de lectura, medida cómoda.
  return (
    <div>
      <div className="mb-s3 flex items-center justify-between">
        <button
          onClick={onVolver}
          className="inline-flex items-center gap-s1 font-chrome text-chrome-sm text-muted hover:text-text"
        >
          <IconFlechaIzq className="size-4" /> Volver al códice
        </button>
        <BadgeVisibilidad v={e.visibilidad} />
      </div>
      <div className="mb-s2 font-chrome text-chrome-xs uppercase tracking-widest text-copper-text">
        {e.tipo}
      </div>
      <h2 className="font-title text-chrome-xl text-copper-text">{e.nombre}</h2>
      <p className="capitular mt-s3 max-w-[58ch] font-world text-world-lg leading-relaxed">
        {e.cuerpo}
      </p>
      {e.enlaces.length > 0 && (
        <p className="mt-s4 max-w-[58ch] font-world text-world-base italic">
          <span className="vellum-muted">Se menciona en estas páginas: </span>
          {e.enlaces.map((l, i) => (
            <span key={l}>
              <button className="text-copper-text underline decoration-copper/40 underline-offset-2 hover:decoration-copper">
                {l}
              </button>
              {i < e.enlaces.length - 1 ? ", " : "."}
            </span>
          ))}
        </p>
      )}
      {esDM && (
        // El gesto de revelar tiene que ser rápido y evidente para el DM (10.2).
        <div className="mt-s5 border-t border-copper/30 pt-s3">
          <Button variante="accent" icono={<IconMegafono />}>
            Enseñar esto a la mesa
          </Button>
          <span className="ml-s3 font-chrome text-chrome-xs vellum-muted">
            Aparecerá en el hilo de todos los jugadores.
          </span>
        </div>
      )}
    </div>
  );
}

export function ConsultaDelMundo({
  esDM = false,
  onClose,
}: {
  esDM?: boolean;
  onClose: () => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [filtros, setFiltros] = useState<Set<string>>(new Set());
  const [abierta, setAbierta] = useState<EntradaMundo | null>(null);

  const visibles = useMemo(
    () =>
      mundo.filter((e) => {
        // Lo que un jugador no debe saber, no llega a su pantalla (10.3).
        if (!esDM && e.visibilidad === "dm") return false;
        if (filtros.size > 0 && !filtros.has(e.tipo)) return false;
        if (busqueda && !`${e.nombre} ${e.resumen}`.toLowerCase().includes(busqueda.toLowerCase()))
          return false;
        return true;
      }),
    [busqueda, filtros, esDM],
  );

  function alternar(t: string) {
    setFiltros((prev) => {
      const s = new Set(prev);
      s.has(t) ? s.delete(t) : s.add(t);
      return s;
    });
  }

  return (
    <Dialog
      titulo="El mundo"
      subtitulo="Un libro consultable, no una lista de tablas"
      onClose={onClose}
      anchura="ancha"
      pergamino
    >
      {abierta ? (
        <PaginaEntidad e={abierta} esDM={esDM} onVolver={() => setAbierta(null)} />
      ) : (
        <>
          <div className="mb-s3">
            <div className="relative">
              <IconLupa className="pointer-events-none absolute left-s2 top-1/2 size-4 -translate-y-1/2 text-vellum-muted" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar en el mundo…"
                className="w-full rounded-radius-sm border border-copper/30 bg-vellum/60 py-s2 pl-s6 pr-s3 font-world text-world-base"
                style={{ color: "var(--vellum-ink)" }}
              />
            </div>
          </div>
          <div className="mb-s4 flex flex-wrap gap-s1">
            {tipos.map((t) => (
              <FilterChip key={t} activo={filtros.has(t)} onClick={() => alternar(t)}>
                {t}
              </FilterChip>
            ))}
          </div>
          <ul className="space-y-s2">
            {visibles.map((e) => (
              <li key={e.id}>
                <button
                  onClick={() => setAbierta(e)}
                  className="flex w-full items-start gap-s3 rounded-radius-sm border border-copper/20 bg-vellum/40 p-s3 text-left transition-colors hover:border-copper/60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-s2">
                      <span className="font-chrome text-chrome-xs uppercase tracking-wide text-copper-text">
                        {e.tipo}
                      </span>
                      <BadgeVisibilidad v={e.visibilidad} />
                    </div>
                    <h4 className="font-title text-chrome-md" style={{ color: "var(--vellum-ink)" }}>
                      {e.nombre}
                    </h4>
                    <p className="font-world text-world-base vellum-muted">{e.resumen}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Dialog>
  );
}
