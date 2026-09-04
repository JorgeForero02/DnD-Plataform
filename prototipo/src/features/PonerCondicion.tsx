// Estrato: CONTEXTUAL — aparece cuando el DM pone una condición con duración
// desde el retrato, sin abrir la hoja de nadie. El rótulo admite dos escalas:
// asaltos (en combate) y hora del reloj (fuera).
import { useState } from "react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { FilterChip } from "../ui/FilterChip";

// Las quince del SRD, más clave libre para las de la mesa.
const condicionesSRD = [
  "cegado", "encantado", "ensordecido", "asustado", "apresado", "incapacitado",
  "invisible", "paralizado", "petrificado", "envenenado", "derribado", "apresado",
  "aturdido", "inconsciente", "agotamiento",
];

export function PonerCondicion({
  nombre,
  enCombate,
  onClose,
}: {
  nombre: string;
  enCombate: boolean;
  onClose: () => void;
}) {
  const [elegida, setElegida] = useState<string | null>(null);
  const [libre, setLibre] = useState("");
  const [duracion, setDuracion] = useState(enCombate ? "2 asaltos" : "hasta las 00:10");

  return (
    <Dialog
      titulo={`Poner condición · ${nombre}`}
      subtitulo="El sistema la aplicará sola hasta que venza; al vencer se marcará, no desaparecerá."
      onClose={onClose}
      anchura="media"
      acciones={
        <>
          <Button variante="silencio" onClick={onClose}>Cancelar</Button>
          <Button variante="danger" onClick={onClose} disabled={!elegida && !libre.trim()}>
            Aplicar la condición
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap gap-s1">
        {condicionesSRD.map((c) => (
          <FilterChip key={c} activo={elegida === c} onClick={() => { setElegida(c); setLibre(""); }}>
            {c}
          </FilterChip>
        ))}
      </div>
      <div className="mt-s4">
        <label className="mb-s1 block font-chrome text-chrome-xs uppercase tracking-wide text-muted">
          O una de la mesa
        </label>
        <input
          value={libre}
          onChange={(e) => { setLibre(e.target.value); setElegida(null); }}
          placeholder="p. ej. concentrándose en Bendición"
          className="w-full rounded-radius-sm border border-muted/30 bg-bg px-s3 py-s2 font-world text-world-base text-text placeholder:text-muted/60 focus:border-accent"
        />
      </div>
      <div className="mt-s4">
        <label className="mb-s1 block font-chrome text-chrome-xs uppercase tracking-wide text-muted">
          Duración ({enCombate ? "asaltos" : "reloj de campaña"})
        </label>
        <input
          value={duracion}
          onChange={(e) => setDuracion(e.target.value)}
          className="w-full rounded-radius-sm border border-muted/30 bg-bg px-s3 py-s2 font-data text-chrome-base text-text focus:border-accent"
        />
      </div>
    </Dialog>
  );
}
