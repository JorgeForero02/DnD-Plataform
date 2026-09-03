import { IconoConfirmacion } from "../../ui/Iconos";

// Carril B1 — el aviso de confirmación al equipar (pantalla 20 del prototipo, revisión
// obligatoria). "Equiparte algo aquí cambia el número de la ficha delante de ti": ese aviso
// es la conexión entre el objeto y el número, y es lo que hace único al producto — que se vea.

export interface AvisoEquiparInfo {
  /** "Equipaste" o "Quitaste", según el sentido del cambio de ubicación. */
  verbo: string;
  nombreObjeto: string;
  acAntes: number;
  acDespues: number;
}

export function AvisoDeEquipar({ aviso }: { aviso: AvisoEquiparInfo }) {
  return (
    <div
      role="status"
      className="mb-s4 flex items-start gap-s2 rounded-radius-sm border border-accent bg-[color:var(--accent-tint)] px-s4 py-s3 font-chrome text-chrome-sm text-text"
    >
      <IconoConfirmacion className="mt-[0.15em] shrink-0 text-accent-text" />
      <p>
        {aviso.verbo} <strong>{aviso.nombreObjeto}</strong> · CA{" "}
        <span className="font-data font-semibold text-accent-text">{aviso.acAntes}</span>
        {" → "}
        <span className="font-data font-semibold text-accent-text">{aviso.acDespues}</span> · la
        traza ahora incluye «{aviso.nombreObjeto}»
      </p>
    </div>
  );
}
