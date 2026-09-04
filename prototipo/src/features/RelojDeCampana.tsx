// Estrato: PERMANENTE — vive en la cabecera de escena.
// La hora del mundo del juego; cuando cae la noche, el tratamiento acompaña.
import { IconLuna, IconSol } from "../ui/icons";

export function RelojDeCampana({
  hora,
  dia,
  noche,
}: {
  hora: string;
  dia: string;
  noche: boolean;
}) {
  return (
    <div className="flex items-center gap-s2" title="Hora del mundo del juego">
      <span className={noche ? "text-accent-text" : "text-warning-text"}>
        {noche ? <IconLuna className="size-5" /> : <IconSol className="size-5" />}
      </span>
      <div className="leading-tight">
        <div className="font-data text-chrome-md text-text">{hora}</div>
        <div className="font-chrome text-chrome-xs text-muted">{dia}</div>
      </div>
    </div>
  );
}
