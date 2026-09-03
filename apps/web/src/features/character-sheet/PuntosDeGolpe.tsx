import { useState } from "react";
import type { DerivedValue } from "@dnd/shared";
import type { HpState } from "./api";
import { useChangeHp } from "./hooks";
import { Button } from "../../ui/Button";
import { fieldControlClass } from "../../ui/Field";
import { PROSA_DE_HOJA } from "./Tarjeta";
import { nivelDeAgotamientoDeSourceKey, traducirLabelKey } from "./vocabulario";

// Tarea 2A.10 — "PG: el caso normal es un delta (recibo 5, me curo 3), no escribir un número".
// `POST .../hp` (2A.7) aplica el delta en el servidor; los PG temporales van aparte y nunca se
// suman a los actuales, y si `currentHp > maxHp` el servidor ya manda `exceedsMax` — aquí solo
// se enseña el aviso, nunca se recalcula el recorte en el cliente.

// **Las salvaciones de muerte se han mudado a su propia tarjeta** (`TarjetasDeEstado.tsx`), que
// es donde las pone la maqueta de Figma: en la fila de tarjetas pequeñas, con sus círculos de
// éxitos y fallos, y visibles siempre en vez de sólo a 0 PG. Un contador que sólo existe cuando
// ya es tarde no se puede consultar antes.

/**
 * **Por qué los PG máximos son la mitad** (2C.4).
 *
 * Con agotamiento 4 o más, el servidor parte los PG máximos y lo deja escrito en la traza de
 * `maxHp` con un paso `cap` cuyo `sourceKey` es `exhaustion:<nivel>`
 * (`apps/api/src/character-state/common/agotamiento.ts`). Sin esta línea, la mesa veía la mitad
 * de sus PG máximos sin ninguna explicación en la pantalla — y «¿de dónde sale este número?» es
 * justo la pregunta que este proyecto existe para responder.
 *
 * El texto sale de `traducirLabelKey`, **no se escribe suelto aquí**: si el motor cambia el
 * rótulo, cambia en un sitio.
 */
function PorQueLaMitad({ maxHp }: { maxHp: DerivedValue }) {
  const paso = maxHp.steps.find((p) => nivelDeAgotamientoDeSourceKey(p.sourceKey) !== null);
  if (!paso) return null;
  const nivel = nivelDeAgotamientoDeSourceKey(paso.sourceKey);
  return (
    <p className="mt-1 font-chrome text-chrome-xs text-warning-text">
      {traducirLabelKey(paso.labelKey).texto} (nivel {nivel}).
    </p>
  );
}

export function PuntosDeGolpe({
  campaignId,
  characterId,
  hp,
  maxHp,
  puedeEditar,
}: {
  campaignId: string;
  characterId: string;
  hp: HpState;
  /**
   * Los PG máximos **derivados, con su traza**. Opcional: `hp.max` ya viene con el agotamiento
   * aplicado y la cifra se pinta igual sin esto; lo que falta sin la traza es la explicación.
   */
  maxHp?: DerivedValue;
  puedeEditar: boolean;
}) {
  const [delta, setDelta] = useState("");
  const cambiarPg = useChangeHp(campaignId, characterId);

  const aplicarDelta = (signo: 1 | -1) => {
    const n = Number(delta);
    if (!Number.isInteger(n) || n === 0) return;
    cambiarPg.mutate({ delta: signo * Math.abs(n) });
    setDelta("");
  };

  return (
    <div>
      {/* `data-hp` es el asidero de la prueba de navegador: la cifra no tiene un papel accesible
          propio —es texto dentro de un párrafo— y buscarla por su valor sería buscar un número que
          aparece en más sitios de la hoja. */}
      <p data-hp="cifras" className="font-data text-chrome-xl leading-none text-text">
        {hp.current ?? "—"} / {hp.max ?? "—"}
        {hp.temp > 0 && (
          <span className="ml-s2 font-chrome text-chrome-sm text-accent-text">
            +{hp.temp} temporales
          </span>
        )}
      </p>
      {maxHp && <PorQueLaMitad maxHp={maxHp} />}
      {hp.exceedsMax && (
        <p role="alert" className="mt-1 font-chrome text-chrome-xs text-warning-text">
          Los PG guardados superan el máximo: se muestran recortados a {hp.current}.
        </p>
      )}
      {puedeEditar && (
        <div className="mt-s3 flex flex-wrap items-center gap-s2">
          <label className="sr-only" htmlFor="delta-pg">
            Cambio de puntos de golpe
          </label>
          <input
            id="delta-pg"
            type="number"
            min={1}
            className={fieldControlClass + " w-20"}
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            placeholder="5"
          />
          <Button type="button" variant="danger" onClick={() => aplicarDelta(-1)} disabled={!delta}>
            Recibo daño
          </Button>
          <Button type="button" variant="primary" onClick={() => aplicarDelta(1)} disabled={!delta}>
            Me curo
          </Button>
        </div>
      )}
      {cambiarPg.isError && (
        <p role="alert" className={`mt-1 ${PROSA_DE_HOJA} text-danger-text`}>
          {(cambiarPg.error as Error).message}
        </p>
      )}
    </div>
  );
}
