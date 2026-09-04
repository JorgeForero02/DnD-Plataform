import { useState } from "react";
import { useDeclareRest, useResources, useRestoreResource, useSpendResource } from "./hooks";
import { Button } from "../../ui/Button";
import { fieldControlClass } from "../../ui/Field";
import { NOMBRE_RESET_RECURSO } from "./vocabulario";
import { PROSA_DE_HOJA } from "./Tarjeta";
import { PREFIJO_DADOS_DE_GOLPE } from "./TarjetasDeEstado";

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
  // Tarea 2C.3 — **solo el largo se puede interrumpir**, porque solo el largo cambia de
  // comportamiento: `rest.service.ts:72` mira `interrupted` en la rama del descanso largo y
  // nunca en la del corto. Ofrecerlo junto al corto sería un control que no hace nada.
  const [interrumpido, setInterrumpido] = useState(false);

  if (isLoading) return null;

  // **Los dados de golpe salen de esta lista y viven en su tarjeta** (`TarjetasDeEstado.tsx`),
  // que es donde los pone la maqueta. Se filtran aquí en vez de duplicarse: el mismo contador en
  // dos sitios acaba con uno de los dos mintiendo, y aquí además serían dos controles de gasto
  // sobre la misma fila de la base.
  const otros = (recursos ?? []).filter((r) => !r.key.startsWith(PREFIJO_DADOS_DE_GOLPE));

  return (
    <div className="flex flex-col gap-s3">
      <div className="flex items-center justify-between">
        {puedeEditar && (
          <div className="flex flex-wrap items-center gap-s2">
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
              onClick={() => descansar.mutate({ kind: "LONG", interrupted: interrumpido })}
              disabled={descansar.isPending}
            >
              Descanso largo
            </Button>
            <label className="flex items-center gap-2 font-chrome text-chrome-xs text-muted">
              <input
                type="checkbox"
                checked={interrumpido}
                onChange={(e) => setInterrumpido(e.target.checked)}
              />
              El descanso largo se interrumpió
            </label>
          </div>
        )}
      </div>
      {puedeEditar && interrumpido && (
        <p className={PROSA_DE_HOJA}>
          {/* El texto explica la regla del servidor, y si discrepan **miente el texto**
              (docs/04-convenciones.md): `rest.service.ts:72-75` no repone nada cuando el
              descanso largo se declara interrumpido, y esta frase dice exactamente eso. La
              fuente es el SRD 5.1: «The characters must begin the rest again to gain any
              benefit from it» (<https://5thsrd.org/adventuring/resting/>). */}
          Interrumpido no da nada: ni puntos de golpe, ni recursos, ni dados de golpe, ni baja el
          agotamiento. Queda anotado en la partida para que nadie tenga que acordarse de que esa
          noche no contó.
        </p>
      )}
      {descansar.isError && (
        <p role="alert" className={`${PROSA_DE_HOJA} text-danger-text`}>
          {(descansar.error as Error).message}
        </p>
      )}

      {otros.length === 0 ? (
        <p className={PROSA_DE_HOJA}>Sin más recursos que los dados de golpe.</p>
      ) : (
        <ul className="flex flex-col gap-s2">
          {otros.map((r) => (
            <li
              key={r.key}
              className="flex items-center justify-between gap-s2 rounded-radius-sm border border-muted px-s3 py-s2"
            >
              <div>
                <p className="font-chrome text-chrome-sm leading-tight text-text">{r.label}</p>
                <p className={PROSA_DE_HOJA}>{NOMBRE_RESET_RECURSO[r.resetOn]}</p>
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
    </div>
  );
}
