import { useState } from "react";
import { useDeclareRest, useResources, useRestoreResource, useSpendResource } from "./hooks";
import { Button } from "../../ui/Button";
import { fieldControlClass } from "../../ui/Field";
import { NOMBRE_RESET_RECURSO } from "./vocabulario";

// Tarea 2A.10 — "recursos y descansos". `CharacterResource` (2A.8) es un contador con máximo:
// inspiración, furia, ki, dados de golpe, espacios de conjuro son la misma fila. Los descansos
// son la única forma de reponerlos salvo gasto/reposición manual del dueño o el DM.

export function RecursosYDescansos({
  campaignId,
  characterId,
  puedeEditar,
}: {
  campaignId: string;
  characterId: string;
  puedeEditar: boolean;
}) {
  const { data: recursos, isLoading } = useResources(campaignId, characterId);
  const gastar = useSpendResource(campaignId, characterId);
  const reponer = useRestoreResource(campaignId, characterId);
  const descansar = useDeclareRest(campaignId, characterId);
  const [dadosAGastar, setDadosAGastar] = useState("0");

  if (isLoading) return null;

  return (
    <section aria-label="recursos y descansos" className="flex flex-col gap-s3">
      <div className="flex items-center justify-between">
        <p className="font-chrome text-chrome-sm font-semibold text-text">Recursos</p>
        {puedeEditar && (
          <div className="flex items-center gap-s2">
            <label className="font-chrome text-chrome-xs text-muted" htmlFor="dados-descanso-corto">
              Dados de golpe a gastar
            </label>
            <input
              id="dados-descanso-corto"
              type="number"
              min={0}
              className={fieldControlClass + " w-16"}
              value={dadosAGastar}
              onChange={(e) => setDadosAGastar(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                descansar.mutate({ kind: "SHORT", spendHitDice: Number(dadosAGastar) || 0 })
              }
              disabled={descansar.isPending}
            >
              Descanso corto
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => descansar.mutate({ kind: "LONG" })}
              disabled={descansar.isPending}
            >
              Descanso largo
            </Button>
          </div>
        )}
      </div>

      {!recursos || recursos.length === 0 ? (
        <p className="font-chrome text-chrome-sm text-muted">Sin recursos guardados todavía.</p>
      ) : (
        <ul className="flex flex-col gap-s2">
          {recursos.map((r) => (
            <li
              key={r.key}
              className="flex items-center justify-between gap-s2 rounded-radius-sm border border-muted/50 bg-surface px-s3 py-s2"
            >
              <div>
                <p className="font-chrome text-chrome-sm text-text">{r.label}</p>
                <p className="font-chrome text-chrome-xs text-muted">
                  {NOMBRE_RESET_RECURSO[r.resetOn]}
                </p>
              </div>
              <span className="font-data text-chrome-md text-text">
                {r.current}
                {r.max !== null ? ` / ${r.max}` : ""}
              </span>
              {puedeEditar && (
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-1.5 py-0.5 text-chrome-xs"
                    onClick={() => gastar.mutate({ key: r.key, amount: 1 })}
                    disabled={r.current <= 0 || gastar.isPending}
                    aria-label={`Gastar uno de ${r.label}`}
                  >
                    −1
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-1.5 py-0.5 text-chrome-xs"
                    onClick={() => reponer.mutate({ key: r.key, amount: 1 })}
                    disabled={(r.max !== null && r.current >= r.max) || reponer.isPending}
                    aria-label={`Reponer uno de ${r.label}`}
                  >
                    +1
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
