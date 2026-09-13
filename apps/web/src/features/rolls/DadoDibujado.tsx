// Tarea F3 — el d20, **dibujado**. Tarea 7 (C3 #12, #22) — la mudanza a `ui/Iconos.tsx`.
//
// La silueta vivía aquí duplicada mientras `ui/Iconos.tsx` era de otro carril de trabajo; ese
// carril ya trajo `IconoDado`, así que este componente pasa a ser el envoltorio delgado que el
// comentario original prometía, y el import se queda igual para quien ya lo usa (`ResultadoDeTirada`,
// los botones de tirar de la hoja de personaje, `PanelDeIniciativa`…): todos quieren «el d20», no
// un dado concreto, así que fijan `caras={20}`.
//
// **`data-icono` cambia de `"dado"` a `"d20"`** al mudarse: es el mismo dato que antes, con el
// nombre que la familia de seis dados usa (`d4`…`d100`), y las pruebas que lo buscaban se
// actualizaron con ese motivo (ver el informe de la Tarea 7).
import { IconoDado } from "../../ui/Iconos";

export function DadoDibujado({ className = "" }: { className?: string }) {
  return <IconoDado caras={20} className={className} />;
}
