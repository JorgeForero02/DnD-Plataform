import { Button } from "../../ui";
import type { AccionDeArreglo, AvisoDeRegla, ClaseDeAviso } from "./avisos";
import { IconoBucle, IconoPrioridad, IconoReversion } from "./iconos";

// Tarea F5 — los avisos, pintados. **Marcan la regla y ofrecen el arreglo**, no solo señalan.
//
// **No son errores y no se pintan como tales.** Una regla con avisos se guarda igual: son
// observaciones sobre lo que va a pasar en la mesa, no una negativa del servidor. Por eso van en
// `--warning` —el token que avisa— y nunca en `--danger`, que en esta aplicación significa «esto
// no se puede hacer». El bloque de problemas de validación, que sí impide guardar, sigue siendo
// otro y sigue en rojo unas líneas más abajo en el editor.
//
// **El enlace hace la cosa.** «Añadir reversión» no abre un formulario ni copia un texto al
// portapapeles: crea la regla. Un aviso que solo describe el arreglo deja el trabajo entero al
// lector, que es exactamente lo que pasaba antes con los mensajes crudos de Zod.

function IconoDeClase({ clase }: { clase: ClaseDeAviso }) {
  if (clase === "REVERSION_AUSENTE") return <IconoReversion />;
  if (clase === "CONFLICTO_DE_PRIORIDAD") return <IconoPrioridad />;
  return <IconoBucle />;
}

export function AvisosDeRegla({
  avisos,
  aplicando,
  onAplicarArreglo,
}: {
  avisos: AvisoDeRegla[];
  /** Mientras el arreglo viaja al servidor: el botón no se puede pulsar dos veces. */
  aplicando?: boolean;
  onAplicarArreglo: (accion: AccionDeArreglo) => void;
}) {
  if (avisos.length === 0) return null;

  return (
    <section
      aria-label="Avisos sobre esta regla"
      className="space-y-s2 rounded-radius-sm border border-warning p-s3"
    >
      <h3 className="font-title text-chrome-md text-text">
        Esto se puede guardar, pero mira antes
      </h3>
      <ul className="space-y-s3">
        {avisos.map((aviso) => (
          <li key={aviso.id} data-aviso={aviso.clase} className="font-chrome text-chrome-sm">
            <p className="flex items-center gap-s2 text-warning-text">
              <IconoDeClase clase={aviso.clase} />
              <strong>{aviso.titulo}</strong>
            </p>
            <p className="mt-1 leading-snug text-text">{aviso.cuerpo}</p>
            {aviso.arreglo && (
              <div className="mt-s2 flex flex-wrap items-center gap-s2">
                <Button
                  variant="secondary"
                  type="button"
                  disabled={aplicando}
                  onClick={() => onAplicarArreglo(aviso.arreglo!.accion)}
                >
                  {aviso.arreglo.etiqueta}
                </Button>
                <span className="min-w-0 flex-1 font-chrome text-chrome-xs leading-snug text-muted">
                  {aviso.arreglo.consecuencia}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
