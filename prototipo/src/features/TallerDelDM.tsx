// Estrato: PERMANENTE — el sitio del DM cuando la mesa está «en reposo», igual
// que el hilo es el del jugador. Un taller de creación, no un gestor de
// contenidos: el tablero de telaraña a la izquierda, y a la derecha escribir,
// preparar y ver lo que sabe la mesa.
import { useState } from "react";
import { Tabs } from "../ui/Tabs";
import { TableroTelarana } from "./taller/TableroTelarana";
import { EscribirFicha } from "./taller/EscribirFicha";
import { PrepararSesion } from "./taller/PrepararSesion";
import { LoQueSabeLaMesa } from "./taller/LoQueSabeLaMesa";
import { IconPluma, IconReloj, IconOjo } from "../ui/icons";
import type { EntradaMundo } from "../datos-de-ejemplo";

const tabs = [
  { id: "escribir", etiqueta: "Escribir", icono: <IconPluma /> },
  { id: "preparar", etiqueta: "Preparar sesión", icono: <IconReloj /> },
  { id: "sabe", etiqueta: "Lo que sabe la mesa", icono: <IconOjo /> },
];

export function TallerDelDM() {
  const [tab, setTab] = useState("escribir");
  const [sel, setSel] = useState<EntradaMundo | null>(null);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[1.15fr_1fr] gap-s3">
      <section className="flex min-h-0 flex-col rounded-radius-md border border-muted/20 bg-surface p-s3">
        <div className="mb-s2 flex items-center gap-s3">
          <h2 className="font-title text-chrome-md text-text">El mundo, con sus hilos</h2>
          <span className="h-px flex-1 bg-copper/40" />
          <span className="font-chrome text-chrome-xs text-muted">Pulsa una ficha para editarla</span>
        </div>
        <div className="min-h-0 flex-1">
          <TableroTelarana seleccion={sel?.id ?? null} onSeleccion={setSel} />
        </div>
      </section>

      <section className="flex min-h-0 flex-col rounded-radius-md border border-muted/20 bg-surface p-s3">
        <div className="mb-s3">
          <Tabs tabs={tabs} activa={tab} onChange={setTab} />
        </div>
        <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto">
          {tab === "escribir" && <EscribirFicha base={sel} />}
          {tab === "preparar" && <PrepararSesion />}
          {tab === "sabe" && <LoQueSabeLaMesa />}
        </div>
      </section>
    </div>
  );
}
