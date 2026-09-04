// Estrato: SUPERPUESTO — se abre encima de la mesa; al cerrarla vuelves donde
// estabas. La superficie que más usa un jugador. La traza es la protagonista.
import { useState } from "react";
import { Dialog } from "../ui/Dialog";
import { Tabs } from "../ui/Tabs";
import { SeccionCombate } from "./hoja/SeccionCombate";
import { SeccionHabilidades } from "./hoja/SeccionHabilidades";
import { SeccionEquipo } from "./hoja/SeccionEquipo";
import { SeccionProgreso } from "./hoja/SeccionProgreso";
import { IconEscudo, IconD20, IconMochila, IconRayo } from "../ui/icons";
import { hojaSirella, type Personaje, type Accion } from "../datos-de-ejemplo";

const tabs = [
  { id: "combate", etiqueta: "Combate", icono: <IconEscudo /> },
  { id: "habilidades", etiqueta: "Habilidades", icono: <IconD20 /> },
  { id: "equipo", etiqueta: "Equipo", icono: <IconMochila /> },
  { id: "progreso", etiqueta: "Progreso", icono: <IconRayo /> },
];

export function HojaDePersonaje({
  p,
  onClose,
  onTirar,
}: {
  p: Personaje;
  onClose: () => void;
  onTirar?: (a: Accion) => void;
}) {
  const [tab, setTab] = useState("combate");
  // La hoja detallada de ejemplo es la de Sirella; para otros se muestra la
  // misma anatomía (maqueta presentacional).
  const h = hojaSirella;

  return (
    <Dialog
      titulo={p.nombre}
      subtitulo={`${p.raza} · ${p.clase} · nivel ${p.nivel} · competencia +${h.competencia} · jugador: ${p.jugador}`}
      onClose={onClose}
      anchura="ancha"
    >
      <div className="mb-s4">
        <Tabs tabs={tabs} activa={tab} onChange={setTab} />
      </div>
      {tab === "combate" && <SeccionCombate h={h} p={p} />}
      {tab === "habilidades" && <SeccionHabilidades h={h} />}
      {tab === "equipo" && <SeccionEquipo h={h} onTirarAtaque={(a) => onTirar?.(a)} />}
      {tab === "progreso" && <SeccionProgreso h={h} />}
    </Dialog>
  );
}
