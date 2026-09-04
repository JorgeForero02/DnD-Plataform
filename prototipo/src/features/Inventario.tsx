// Estrato: SUPERPUESTO — se abre encima de la mesa; Escape para volver.
import { Dialog } from "../ui/Dialog";
import { Badge } from "../ui/Badge";
import { IconEspada, IconEscudo, IconPocion, IconLibro, IconMochila } from "../ui/icons";

type Objeto = {
  id: string;
  nombre: string;
  tipo: string;
  detalle: string;
  icono: React.ReactNode;
  equipado?: boolean;
  cantidad?: number;
};

const objetos: Objeto[] = [
  { id: "o1", nombre: "Estoque élfico", tipo: "Arma", detalle: "1d8 perforante · sutil, ligera", icono: <IconEspada className="size-5" />, equipado: true },
  { id: "o2", nombre: "Armadura de cuero tachonado", tipo: "Armadura", detalle: "CA 12 + Destreza", icono: <IconEscudo className="size-5" />, equipado: true },
  { id: "o3", nombre: "Poción de curación", tipo: "Consumible", detalle: "Recupera 2d4+2 PV", icono: <IconPocion className="size-5" />, cantidad: 2 },
  { id: "o4", nombre: "Herramientas de ladrón", tipo: "Utensilio", detalle: "Competencia +3", icono: <IconMochila className="size-5" />, equipado: true },
  { id: "o5", nombre: "Diario de la familia Vane", tipo: "Documento", detalle: "Páginas arrancadas; la letra es de tu madre", icono: <IconLibro className="size-5" />, cantidad: 1 },
];

export function Inventario({ onClose }: { onClose: () => void }) {
  return (
    <Dialog titulo="Inventario" subtitulo="Sirella Vane · 8,4 kg de 90 kg" onClose={onClose} anchura="media">
      <ul className="space-y-s2">
        {objetos.map((o) => (
          <li
            key={o.id}
            className="flex items-center gap-s3 rounded-radius-md border border-muted/20 bg-bg p-s3"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-radius-sm border border-copper/30 text-copper-text">
              {o.icono}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-s2">
                <h4 className="truncate font-chrome text-chrome-base font-medium text-text">
                  {o.nombre}
                </h4>
                {o.equipado && <Badge tono="accent">equipado</Badge>}
                {o.cantidad && o.cantidad > 1 && (
                  <span className="font-data text-chrome-xs text-muted">×{o.cantidad}</span>
                )}
              </div>
              <p className="truncate font-chrome text-chrome-sm text-muted">{o.detalle}</p>
            </div>
            <span className="shrink-0 font-chrome text-chrome-xs text-muted">{o.tipo}</span>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
