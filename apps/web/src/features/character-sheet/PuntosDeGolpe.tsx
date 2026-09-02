import { useState } from "react";
import type { DeathState } from "@dnd/shared";
import type { HpState } from "./api";
import { useChangeHp, useRollDeathSave } from "./hooks";
import { Button } from "../../ui/Button";
import { fieldControlClass } from "../../ui/Field";

// Tarea 2A.10 — "PG: el caso normal es un delta (recibo 5, me curo 3), no escribir un número".
// `POST .../hp` (2A.7) aplica el delta en el servidor; los PG temporales van aparte y nunca se
// suman a los actuales, y si `currentHp > maxHp` el servidor ya manda `exceedsMax` — aquí solo
// se enseña el aviso, nunca se recalcula el recorte en el cliente.

const ESTADO_MUERTE: Record<DeathState["status"], string> = {
  alive: "Con vida",
  dying: "Muriendo",
  stable: "Estabilizado a 0 PG",
  dead: "Muerto",
};

export function PuntosDeGolpe({
  campaignId,
  characterId,
  hp,
  deathSaves,
  puedeEditar,
}: {
  campaignId: string;
  characterId: string;
  hp: HpState;
  deathSaves: DeathState;
  puedeEditar: boolean;
}) {
  const [delta, setDelta] = useState("");
  const cambiarPg = useChangeHp(campaignId, characterId);
  const tirarSalvacion = useRollDeathSave(campaignId, characterId);

  const aplicarDelta = (signo: 1 | -1) => {
    const n = Number(delta);
    if (!Number.isInteger(n) || n === 0) return;
    cambiarPg.mutate({ delta: signo * Math.abs(n) });
    setDelta("");
  };

  return (
    <div className="rounded-radius-sm border border-muted/50 bg-surface p-s3">
      <p className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
        Puntos de golpe
      </p>
      <p className="mt-1 font-data text-chrome-xl leading-none text-text">
        {hp.current ?? "—"} / {hp.max ?? "—"}
        {hp.temp > 0 && (
          <span className="ml-s2 font-chrome text-chrome-sm text-accent-text">
            +{hp.temp} temporales
          </span>
        )}
      </p>
      {hp.exceedsMax && (
        <p role="alert" className="mt-1 font-chrome text-chrome-xs text-warning-text">
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
        <p role="alert" className="mt-1 font-chrome text-chrome-xs text-danger-text">
          {(cambiarPg.error as Error).message}
        </p>
      )}

      {hp.current === 0 && (
        <div className="mt-s3 border-t border-muted/40 pt-s2">
          <p className="font-chrome text-chrome-sm text-text">
            Tiradas de muerte — {ESTADO_MUERTE[deathSaves.status]}
          </p>
          <p className="mt-1 font-data text-chrome-sm text-text">
            Éxitos {deathSaves.successes}/3 · Fracasos {deathSaves.failures}/3
          </p>
          {puedeEditar && deathSaves.status === "dying" && (
            <Button
              type="button"
              variant="secondary"
              className="mt-s2"
              onClick={() => tirarSalvacion.mutate()}
              disabled={tirarSalvacion.isPending}
            >
              Tirar salvación de muerte
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
