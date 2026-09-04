// Estrato: SUPERPUESTO (parte de la hoja). Subida de nivel con previsualización:
// el servidor propone el cambio, se ve qué sube, y se confirma.
import { Button } from "../../ui/Button";
import { IconRayo, IconMas } from "../../ui/icons";
import type { HojaCompleta } from "../../datos-de-ejemplo";

export function SeccionProgreso({ h }: { h: HojaCompleta }) {
  if (!h.subidaNivel) {
    return (
      <p className="font-world text-world-base italic text-muted">
        No hay ninguna subida de nivel pendiente. Sigue jugando.
      </p>
    );
  }
  const s = h.subidaNivel;
  return (
    <div className="space-y-s4">
      <div className="flex items-center gap-s3 rounded-radius-md border border-accent/40 bg-accent/10 p-s3">
        <IconRayo className="size-6 text-accent-text" />
        <div>
          <p className="font-chrome text-chrome-xs uppercase tracking-wide text-accent-text">
            El servidor propone
          </p>
          <p className="font-title text-chrome-md text-text">
            Subir del nivel {s.de} al {s.a}
          </p>
        </div>
      </div>

      <ul className="space-y-s2">
        {s.cambios.map((c) => (
          <li key={c.que} className="flex items-start gap-s3 rounded-radius-md border border-muted/25 bg-bg p-s3">
            <IconMas className="mt-s1 size-4 shrink-0 text-copper-text" />
            <div>
              <p className="font-chrome text-chrome-base font-medium text-text">{c.que}</p>
              <p className="font-world text-world-base text-muted">{c.detalle}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-s3">
        <Button variante="accent" tamano="lg">Confirmar la subida</Button>
        <Button variante="silencio">Todavía no</Button>
        <span className="font-chrome text-chrome-xs text-muted">
          Nada cambia en la hoja hasta que confirmas.
        </span>
      </div>
    </div>
  );
}
