import type { CSSProperties } from "react";
import { usePantallaStore } from "./pantalla.store";
import type { EfectoDePantalla } from "./detectarEfectos";

const COLOR_DEL_DESTELLO: Record<EfectoDePantalla, string> = {
  golpe: "var(--danger)",
  "golpe-fuerte": "var(--danger)",
  cae: "var(--danger)",
  muerte: "var(--danger)",
  cura: "var(--voz-salvia)",
  "en-pie": "var(--voz-salvia)",
  nivel: "var(--warning)",
};

/** El destello a pantalla completa. Se monta una vez en la raíz de la mesa. */
export function EfectosDePantalla() {
  const efecto = usePantallaStore((s) => s.efecto);
  if (!efecto) return null;
  return (
    <div
      key={efecto.id}
      aria-hidden="true"
      className="fx-pantalla-destello"
      style={{ "--fx-color": COLOR_DEL_DESTELLO[efecto.tipo] } as CSSProperties}
    />
  );
}
