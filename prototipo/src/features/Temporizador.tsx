// Estrato: PERMANENTE (en el retrato) / SUPERPUESTO (en la hoja).
// Las condiciones con duración: se ve cuánto les queda, y al vencer NO
// desaparecen, se marcan como vencidas (para que se vea por qué dejó de contar).
// El rótulo admite dos escalas: asaltos (en combate) y hora del reloj (fuera).
import { Badge } from "../ui/Badge";
import { IconReloj } from "../ui/icons";
import type { Estado } from "../datos-de-ejemplo";

export function Temporizador({
  estado,
  conEfecto = false,
}: {
  estado: Estado;
  conEfecto?: boolean;
}) {
  const tono = estado.vencida ? "muted" : estado.tono;
  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-s2">
        <Badge tono={tono}>
          <span className={estado.vencida ? "line-through" : ""}>{estado.nombre}</span>
        </Badge>
        {estado.vencida ? (
          <span className="font-chrome text-chrome-xs italic text-muted">vencida</span>
        ) : (
          estado.restante && (
            <span className="inline-flex items-center gap-s1 font-data text-chrome-xs text-muted">
              <IconReloj className="size-3.5" /> {estado.restante}
            </span>
          )
        )}
      </div>
      {conEfecto && estado.efecto && (
        <p className="mt-s1 font-world text-chrome-sm italic text-muted">{estado.efecto}</p>
      )}
    </div>
  );
}
