import { useState } from "react";
import { Button } from "../../ui/Button";

// **Archivar es el gesto fácil, y borrar sigue siendo el caro** (plan 06, ficha M9).
//
// El servidor sabe archivar desde 2.5.8 y **la web no lo disparaba desde ningún sitio**: el único
// `archiv` que aparecía en `apps/web/src` era la traducción de la línea del registro
// (`features/sessions/linea-de-log.ts:221`). Servidor hecho, nadie que lo use — el patrón que este
// proyecto ya ha cerrado en falso cuatro veces.
//
// **Por qué un componente aparte y no un `DeleteButton` con otro rótulo.** `DeleteButton` ya
// crecio dos props (`label`, `confirmLabel`) para servir a dos gestos que no borran, y añadirle
// un tercer eje —el tono— para que a veces no pareciera peligroso sería exactamente lo contrario
// de lo que este plan pide: **si los dos gestos cuestan lo mismo, la gente borra**. Que sean dos
// componentes es lo que impide que vuelvan a pesar igual con el siguiente retoque.
//
// Las diferencias son deliberadas y todas visibles:
//
//  · Botón `secondary`, no `danger`: no hay filete rojo porque no hay nada que temer.
//  · La confirmación **dice la consecuencia, no el riesgo**. `docs/04-convenciones.md`:
//    «un gesto que reclasifica, esconde o retira algo dice su CONSECUENCIA y deja RASTRO… y
//    ninguna es "¿estás seguro?"». Aquí la frase nombra **dónde deja de aparecer**, que **no se
//    pierde nada** y **por dónde vuelve**; el rastro lo escribe el servidor
//    (`CHARACTER_ARCHIVED`), y por eso la mutación invalida también el registro.
//  · Sí hay confirmación, y no es fricción de adorno: archivar saca al personaje de la mesa de
//    todos los demás. Un paso que se lee en dos segundos, con la salida escrita en la misma
//    frase, es lo que separa «lo escondí» de «lo perdí».
//
// La autorización la impone el servidor (`characters.service.ts`, `requireEditable`: DM o dueño).
// `disabled` refleja lo que quien monta este control ya calculó, con el motivo a la vista — nunca
// se esconde el control por permiso.
export function BotonArchivar({
  message,
  onConfirm,
  pending,
  disabled,
  disabledReason,
}: {
  /** Qué pasa al archivar: dónde deja de verse, que no se pierde nada y cómo vuelve. */
  message: string;
  onConfirm: () => void;
  pending: boolean;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  // Mismo cuidado que en `DeleteButton`: `confirming` es estado local y sobrevive a un cambio de
  // permiso por detrás. La confirmación se deriva de los dos, nunca se sincroniza en un efecto.
  const showingConfirm = confirming && !disabled;

  if (showingConfirm) {
    return (
      <div className="w-full rounded-radius-sm border border-muted bg-surface p-3 text-chrome-sm">
        <p className="text-text">{message}</p>
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
            No, dejarlo en la mesa
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onConfirm}
            disabled={pending || disabled}
          >
            Sí, archivar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => setConfirming(true)}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
    >
      Archivar
    </Button>
  );
}
