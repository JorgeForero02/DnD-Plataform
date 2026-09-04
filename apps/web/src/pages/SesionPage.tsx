import { useParams } from "react-router-dom";
import { MesaDeSesion } from "../features/sessions/MesaDeSesion";

// **La mesa, y es la única pantalla del producto que NO va dentro del armazón común.**
//
// Hasta la Ola 0 (2026-09-04) esta ruta montaba `AppShell` + `PageHeader`, y el resultado eran
// **dos cabeceras apiladas** —la de la aplicación con sus migas de pan, y la de la sesión—, un
// subtítulo que explicaba la pantalla a quien lleva tres horas dentro de ella, un pie legal, y
// sobre todo **el scroll de la página**: la mesa crecía hacia abajo en vez de ocupar la ventana.
//
// La auditoría del 2026-09-04 lo puso el primero de su lista, con gravedad crítica, y es de las
// dos únicas cosas de esta capa que no son cuestión de gusto:
//
//  · Una pantalla en la que se está durante horas no se lee, **se opera**. Las migas de pan
//    contestan «¿dónde estoy?», que es justamente la pregunta que quien está jugando no tiene.
//  · **Sin `h-screen` no hay scroll por panel.** Con la página scrolleando, el elenco, el hilo y
//    las herramientas del DM crecen todos a la vez y no hay forma de mirar el registro sin perder
//    de vista los puntos de golpe. Eso no se arregla con estilos: se arregla quitando el armazón.
//
// El componente de la mesa trae su propia banda superior —volver a las crónicas, la campaña, la
// sesión y el tema—, así que no se pierde ninguna salida. La atribución del SRD que vive en
// `AppShell` sigue estando en todas las demás pantallas, incluida `/acerca-de`, que es donde la
// CC BY la pide accesible.

export function SesionPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <MesaDeSesion campaignId={id} />;
}
