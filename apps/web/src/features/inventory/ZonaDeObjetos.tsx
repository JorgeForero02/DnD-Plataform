import type { ReactNode } from "react";
import type { ItemLocation } from "@dnd/shared";
import { NOMBRE_ZONA, SUBTITULO_ZONA } from "./vocabulario";
import { IconoEquipado, IconoGuardado, IconoLlevado } from "./iconos";

// Carril B1 — pantalla 20 del prototipo: "tres zonas rotuladas: Equipado, Encima, Guardado".

const ICONO_ZONA: Record<ItemLocation, (props: { className?: string }) => ReactNode> = {
  EQUIPPED: IconoEquipado,
  CARRIED: IconoLlevado,
  STORED: IconoGuardado,
};

export function ZonaDeObjetos({
  ubicacion,
  children,
  vacia,
}: {
  ubicacion: ItemLocation;
  children: ReactNode;
  /** Cuántas filas trae — para el mensaje de zona vacía, sin inventar contenido. */
  vacia: boolean;
}) {
  const Icono = ICONO_ZONA[ubicacion];
  return (
    <section className="mb-s5 rounded-radius-sm border border-muted bg-surface p-s4">
      <h2 className="mb-s3 flex items-center gap-s2 font-chrome text-chrome-sm font-semibold text-text">
        <Icono className="text-accent-text" />
        {NOMBRE_ZONA[ubicacion]}
        <span className="font-normal text-muted"> · {SUBTITULO_ZONA[ubicacion]}</span>
      </h2>
      {vacia ? (
        <p className="font-chrome text-chrome-xs text-muted">Nada aquí todavía.</p>
      ) : (
        <ul>{children}</ul>
      )}
    </section>
  );
}
