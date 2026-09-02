import { useState } from "react";
import { DialogoSubirNivel } from "./DialogoSubirNivel";
import { IconoAscenso } from "./IconoAscenso";
import { NIVEL_MAXIMO } from "./vocabulario";
import { Button } from "../../ui/Button";

// Tarea 2A.11 — el punto de montaje único de esta feature. La hoja lo coloca; todo lo demás de
// `features/level-up/` cuelga de aquí.

export function BotonSubirNivel({
  campaignId,
  characterId,
  level,
}: {
  campaignId: string;
  characterId: string;
  level: number;
}) {
  const [abierto, setAbierto] = useState(false);

  // **En el techo no se ofrece subir, y se dice por qué.** Un botón deshabilitado y mudo deja al
  // jugador buscando qué le falta; el servidor rechaza esto con un 400 que ya explica el motivo
  // (`level-up.service.ts`), así que la pantalla cuenta lo mismo antes de que haya que pedirlo.
  // No es control de acceso: si alguien llegara igualmente al endpoint, el servidor sigue
  // rechazándolo.
  if (level >= NIVEL_MAXIMO) {
    return (
      <p className="font-chrome text-chrome-sm text-muted">
        Nivel {NIVEL_MAXIMO}: el techo del SRD 5.1. No hay nivel {NIVEL_MAXIMO + 1} que subir.
      </p>
    );
  }

  return (
    <>
      <Button type="button" variant="primary" onClick={() => setAbierto(true)}>
        <IconoAscenso />
        Subir a nivel {level + 1}
      </Button>
      {abierto && (
        <DialogoSubirNivel
          campaignId={campaignId}
          characterId={characterId}
          abierto={abierto}
          onClose={() => setAbierto(false)}
        />
      )}
    </>
  );
}
