// Estrato: PERMANENTE (el sitio del DM en reposo). Un tablero de detective con
// hilos entre las fichas — la relación es lo interesante, no la lista. Nunca una
// tabla con filtros.
import { BadgeVisibilidad } from "../BadgeVisibilidad";
import { mundo, type EntradaMundo } from "../../datos-de-ejemplo";

// Posiciones fijas del corcho (en %), pensadas para que los hilos se lean.
const posiciones: Record<string, { x: number; y: number }> = {
  w1: { x: 26, y: 22 }, // El Puerto Viejo
  w2: { x: 66, y: 16 }, // Capataz Grosk
  w3: { x: 74, y: 52 }, // Gremio de Estibadores
  w4: { x: 44, y: 60 }, // El manifiesto
  w5: { x: 18, y: 72 }, // La deuda de Sirella
  w6: { x: 54, y: 86 }, // El sello de la sirena
};

const porNombre = Object.fromEntries(mundo.map((e) => [e.nombre, e]));

export function TableroTelarana({
  seleccion,
  onSeleccion,
}: {
  seleccion: string | null;
  onSeleccion: (e: EntradaMundo) => void;
}) {
  // Cada enlace es un hilo entre dos chinchetas.
  const hilos: { a: string; b: string }[] = [];
  mundo.forEach((e) => {
    e.enlaces.forEach((nombre) => {
      const otro = porNombre[nombre];
      if (otro && e.id < otro.id) hilos.push({ a: e.id, b: otro.id });
    });
  });

  return (
    <div className="relative h-full min-h-[22rem] w-full overflow-hidden rounded-radius-md border border-copper/25 bg-bg">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{ backgroundImage: "radial-gradient(circle at 30% 20%, rgba(201,125,70,0.10), transparent 55%)" }}
      />
      {/* Los hilos, en cobre (mundo). */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        {hilos.map((h, i) => {
          const a = posiciones[h.a];
          const b = posiciones[h.b];
          if (!a || !b) return null;
          return (
            <line
              key={i}
              x1={`${a.x}%`} y1={`${a.y}%`} x2={`${b.x}%`} y2={`${b.y}%`}
              stroke="var(--c-copper)" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="3 3"
            />
          );
        })}
      </svg>
      {/* Las chinchetas. */}
      {mundo.map((e) => {
        const pos = posiciones[e.id];
        if (!pos) return null;
        const sel = seleccion === e.id;
        return (
          <button
            key={e.id}
            onClick={() => onSeleccion(e)}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 w-40 rounded-radius-sm border px-s2 py-s2 text-left transition-colors ${
              sel ? "border-copper bg-surface shadow-lg" : "border-muted/30 bg-surface/90 hover:border-copper/60"
            }`}
          >
            <span aria-hidden="true" className="absolute -top-s2 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-copper" />
            <span className="block font-chrome text-chrome-xs uppercase tracking-wide text-copper-text">{e.tipo}</span>
            <span className="block truncate font-title text-chrome-sm text-text">{e.nombre}</span>
            <span className="mt-s1 block"><BadgeVisibilidad v={e.visibilidad} /></span>
          </button>
        );
      })}
    </div>
  );
}
