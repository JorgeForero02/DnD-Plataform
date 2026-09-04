// Estrato: ninguno — pieza compartida.
// La interfaz SIEMPRE dice quién ve lo que estás mirando (regla 10.2).
import { Badge } from "../ui/Badge";
import { IconOjo, IconOjoTachado } from "../ui/icons";
import { etiquetaVisibilidad, type Visibilidad } from "../datos-de-ejemplo";

export function BadgeVisibilidad({ v }: { v: Visibilidad }) {
  const tono = v === "dm" ? "danger" : v === "publico" ? "muted" : "copper";
  const oculto = v === "dm" || v === "dueno" || v === "concretos";
  return (
    <Badge tono={tono} icono={oculto ? <IconOjoTachado /> : <IconOjo />}>
      {etiquetaVisibilidad[v]}
    </Badge>
  );
}
