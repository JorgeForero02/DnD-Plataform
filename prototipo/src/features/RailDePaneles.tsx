// Estrato: PERMANENTE — los accesos a los paneles superpuestos. Doble camino
// (§3.1): el objeto en pantalla Y la tecla. Nunca solo la tecla.
import { IconEscudo, IconMochila, IconMundo, IconFlechaIzq } from "../ui/icons";

function Boton({
  icono,
  etiqueta,
  tecla,
  onClick,
}: {
  icono: React.ReactNode;
  etiqueta: string;
  tecla?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-16 flex-col items-center gap-s1 rounded-radius-sm border border-muted/25 bg-bg px-s1 py-s2 text-muted transition-colors hover:border-accent hover:text-accent-text"
    >
      <span className="[&>svg]:size-5">{icono}</span>
      <span className="font-chrome text-chrome-xs leading-none">{etiqueta}</span>
      {tecla && (
        <span className="font-data text-chrome-xs text-muted/50 group-hover:text-accent-text">
          {tecla}
        </span>
      )}
    </button>
  );
}

export function RailDePaneles({
  onHoja,
  onInventario,
  onMundo,
  onReincorporar,
}: {
  onHoja: () => void;
  onInventario: () => void;
  onMundo: () => void;
  onReincorporar: () => void;
}) {
  return (
    <div className="flex items-stretch gap-s2">
      <Boton icono={<IconEscudo />} etiqueta="Hoja" tecla="N" onClick={onHoja} />
      <Boton icono={<IconMochila />} etiqueta="Bolsa" tecla="I" onClick={onInventario} />
      <Boton icono={<IconMundo />} etiqueta="Mundo" tecla="M" onClick={onMundo} />
      <Boton icono={<IconFlechaIzq />} etiqueta="Volver" onClick={onReincorporar} />
    </div>
  );
}
