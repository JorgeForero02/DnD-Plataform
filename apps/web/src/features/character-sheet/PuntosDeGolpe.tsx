import { useState } from "react";
import type { HpState } from "./api";
import { useChangeHp } from "./hooks";
import { Button } from "../../ui/Button";
import { fieldControlClass } from "../../ui/Field";
import { CAJA_DE_VITELA, PROSA_DE_VITELA, ROTULO_DE_CASILLA } from "./Vitela";

// Tarea 2A.10 — "PG: el caso normal es un delta (recibo 5, me curo 3), no escribir un número".
// `POST .../hp` (2A.7) aplica el delta en el servidor; los PG temporales van aparte y nunca se
// suman a los actuales, y si `currentHp > maxHp` el servidor ya manda `exceedsMax` — aquí solo
// se enseña el aviso, nunca se recalcula el recorte en el cliente.

// **Las salvaciones de muerte se han mudado a su propia tarjeta** (`TarjetasDeEstado.tsx`), que
// es donde las pone la maqueta de Figma: en la fila de tarjetas pequeñas, con sus círculos de
// éxitos y fallos, y visibles siempre en vez de sólo a 0 PG. Un contador que sólo existe cuando
// ya es tarde no se puede consultar antes.

export function PuntosDeGolpe({
  campaignId,
  characterId,
  hp,
  puedeEditar,
}: {
  campaignId: string;
  characterId: string;
  hp: HpState;
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
    <div className={CAJA_DE_VITELA}>
      <p className={ROTULO_DE_CASILLA}>Puntos de golpe</p>
      <p className="mt-1 font-data text-chrome-xl leading-none text-text">
        {hp.current ?? "—"} / {hp.max ?? "—"}
        {hp.temp > 0 && (
          <span className="ml-s2 font-chrome text-chrome-sm text-accent-text">
            +{hp.temp} temporales
          </span>
        )}
      </p>
      {hp.exceedsMax && (
        <p
          role="alert"
          className="mt-1 font-world text-[length:var(--text-world-sm)] text-warning-text"
        >
          Los PG guardados superan el máximo: se muestran recortados a {hp.current}.
        </p>
      )}
      {puedeEditar && (
        <div className="mt-s3 flex items-center gap-s2">
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
        <p role="alert" className={`mt-1 ${PROSA_DE_VITELA} text-danger-text`}>
          {(cambiarPg.error as Error).message}
        </p>
      )}
    </div>
  );
}
