// Estrato: PERMANENTE (parte del taller del DM). Una vista de «lo que sabe la
// mesa»: qué has revelado y qué sigue oculto, de un vistazo. Es la pregunta que
// un DM se hace todo el rato. Incluye el estado del mundo: marcas y conjuntos.
import { BadgeVisibilidad } from "../BadgeVisibilidad";
import { Badge } from "../../ui/Badge";
import { IconOjo, IconOjoTachado } from "../../ui/icons";
import { mundo, estadoMundo } from "../../datos-de-ejemplo";

export function LoQueSabeLaMesa() {
  const revelado = mundo.filter((e) => e.visibilidad === "publico" || e.visibilidad === "jugadores");
  const oculto = mundo.filter((e) => e.visibilidad === "dm" || e.visibilidad === "dueno" || e.visibilidad === "concretos");

  return (
    <div className="space-y-s4">
      <div className="grid grid-cols-2 gap-s3">
        <Columna titulo="La mesa lo sabe" icono={<IconOjo className="size-4" />} tono="accent" entradas={revelado} />
        <Columna titulo="Sigue oculto" icono={<IconOjoTachado className="size-4" />} tono="copper" entradas={oculto} />
      </div>

      <div className="grid grid-cols-2 gap-s3">
        <div className="rounded-radius-md border border-muted/25 bg-bg p-s3">
          <h4 className="mb-s2 font-chrome text-chrome-xs uppercase tracking-wide text-muted">Marcas del mundo</h4>
          <ul className="space-y-s1">
            {estadoMundo.marcas.map((m) => (
              <li key={m.nombre} className="flex items-center justify-between">
                <span className="font-data text-chrome-sm text-text">{m.nombre}</span>
                <Badge tono={m.valor ? "accent" : "muted"}>{m.valor ? "sí" : "no"}</Badge>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-radius-md border border-muted/25 bg-bg p-s3">
          <h4 className="mb-s2 font-chrome text-chrome-xs uppercase tracking-wide text-muted">Conjuntos</h4>
          <ul className="space-y-s2">
            {estadoMundo.conjuntos.map((c) => (
              <li key={c.nombre}>
                <span className="block font-chrome text-chrome-sm text-text">{c.nombre}</span>
                <span className="font-world text-chrome-sm italic text-muted">{c.miembros.join(", ")}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Columna({
  titulo,
  icono,
  tono,
  entradas,
}: {
  titulo: string;
  icono: React.ReactNode;
  tono: "accent" | "copper";
  entradas: typeof mundo;
}) {
  return (
    <div className={`rounded-radius-md border p-s3 ${tono === "accent" ? "border-accent/30" : "border-copper/30"}`}>
      <h4 className={`mb-s2 flex items-center gap-s2 font-chrome text-chrome-xs uppercase tracking-wide ${tono === "accent" ? "text-accent-text" : "text-copper-text"}`}>
        {icono} {titulo}
      </h4>
      <ul className="space-y-s2">
        {entradas.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-s2">
            <span className="min-w-0">
              <span className="block truncate font-chrome text-chrome-sm text-text">{e.nombre}</span>
              <span className="font-chrome text-chrome-xs text-muted">{e.tipo}</span>
            </span>
            <BadgeVisibilidad v={e.visibilidad} />
          </li>
        ))}
      </ul>
    </div>
  );
}
