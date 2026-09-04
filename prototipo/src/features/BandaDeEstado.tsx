// Estrato: PERMANENTE — la banda superior de la mesa. Dice en qué campaña
// estás, cuánto lleva la sesión y en qué estado está la mesa. Incluye los
// mandos de la demostración (rol, estado, tema) para poder recorrer las
// pantallas (§9), como acelerador, nunca como único camino.
import { useNavigate } from "react-router-dom";
import { IconFlechaIzq, IconReloj, IconSol, IconLuna, IconLibro } from "../ui/icons";

type Tema = "dark" | "light" | "reading";

export function BandaDeEstado({
  campana,
  rol,
  estado,
  tema,
  tiempoSesion,
  onRol,
  onEstado,
  onTema,
}: {
  campana: string;
  rol: "jugador" | "dm";
  estado: "reposo" | "sesion" | "combate";
  tema: Tema;
  tiempoSesion: string;
  onRol: (r: "jugador" | "dm") => void;
  onEstado: (e: "reposo" | "sesion" | "combate") => void;
  onTema: (t: Tema) => void;
}) {
  const navigate = useNavigate();
  const seg = "rounded-radius-sm px-s2 py-s1 font-chrome text-chrome-xs transition-colors";
  const act = "bg-accent text-bg";
  const off = "text-muted hover:text-text";

  return (
    <div className="flex flex-wrap items-center gap-s3 border-b border-muted/20 bg-surface px-s4 py-s2">
      <button
        onClick={() => navigate("/")}
        className="inline-flex items-center gap-s1 font-chrome text-chrome-sm text-muted hover:text-text"
      >
        <IconFlechaIzq className="size-4" /> Crónicas
      </button>
      <span className="h-4 w-px bg-muted/30" />
      <h1 className="font-title text-chrome-md text-text">{campana}</h1>
      {estado !== "reposo" && (
        <span className="inline-flex items-center gap-s1 font-data text-chrome-xs text-accent-text">
          <IconReloj className="size-4" /> {tiempoSesion}
        </span>
      )}

      <div className="ml-auto flex items-center gap-s3">
        {/* Rol */}
        <div className="flex items-center gap-s1 rounded-radius-sm border border-muted/25 p-[2px]">
          {(["jugador", "dm"] as const).map((r) => (
            <button key={r} onClick={() => onRol(r)} className={`${seg} ${rol === r ? act : off}`}>
              {r === "jugador" ? "Jugador" : "DM"}
            </button>
          ))}
        </div>
        {/* Estado de la mesa */}
        <div className="flex items-center gap-s1 rounded-radius-sm border border-muted/25 p-[2px]">
          {(["reposo", "sesion", "combate"] as const).map((e) => (
            <button key={e} onClick={() => onEstado(e)} className={`${seg} ${estado === e ? act : off}`}>
              {e === "reposo" ? "En reposo" : e === "sesion" ? "En sesión" : "En combate"}
            </button>
          ))}
        </div>
        {/* Tema */}
        <div className="flex items-center gap-s1 rounded-radius-sm border border-muted/25 p-[2px]">
          <button onClick={() => onTema("dark")} aria-label="Tema oscuro" className={`${seg} ${tema === "dark" ? act : off}`}>
            <IconLuna className="size-4" />
          </button>
          <button onClick={() => onTema("light")} aria-label="Tema claro" className={`${seg} ${tema === "light" ? act : off}`}>
            <IconSol className="size-4" />
          </button>
          <button onClick={() => onTema("reading")} aria-label="Modo lectura" className={`${seg} ${tema === "reading" ? act : off}`}>
            <IconLibro className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
