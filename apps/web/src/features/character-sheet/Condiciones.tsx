import { useState } from "react";
import { useApplyCondition, useConditions, useRemoveCondition } from "./hooks";
import { Button } from "../../ui/Button";
import { fieldControlClass } from "../../ui/Field";
import { NOMBRE_CONDICION, nombreCondicion } from "./vocabulario";

// Tarea 2A.10 — condiciones activas (2A.12). La clave es libre en el servidor; se ofrecen las
// quince del SRD como opciones conocidas y se admite cualquier otra clave escrita a mano —igual
// que hace el servidor, que tampoco cierra el conjunto.

const CLAVES_CONOCIDAS = Object.keys(NOMBRE_CONDICION);

export function Condiciones({
  campaignId,
  characterId,
  puedeEditar,
}: {
  campaignId: string;
  characterId: string;
  puedeEditar: boolean;
}) {
  const { data: condiciones, isLoading } = useConditions(campaignId, characterId);
  const aplicar = useApplyCondition(campaignId, characterId);
  const quitar = useRemoveCondition(campaignId, characterId);
  const [nueva, setNueva] = useState(CLAVES_CONOCIDAS[0]);
  const [nivel, setNivel] = useState("1");

  if (isLoading) return null;

  return (
    <section aria-label="condiciones" className="flex flex-col gap-s2">
      <p className="font-chrome text-chrome-sm font-semibold text-text">Condiciones activas</p>
      {!condiciones || condiciones.length === 0 ? (
        <p className="font-chrome text-chrome-sm text-muted">Sin condiciones activas.</p>
      ) : (
        <ul className="flex flex-wrap gap-s2">
          {condiciones.map((c) => (
            <li
              key={c.key}
              className="flex items-center gap-s2 rounded-radius-sm border border-copper px-s2 py-1 font-chrome text-chrome-xs text-copper-text"
            >
              {nombreCondicion(c.key)}
              {c.level != null && ` (nivel ${c.level})`}
              {puedeEditar && (
                <button
                  type="button"
                  onClick={() => quitar.mutate(c.key)}
                  aria-label={`Quitar ${nombreCondicion(c.key)}`}
                  className="text-muted hover:text-danger-text"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {puedeEditar && (
        <div className="flex items-center gap-s2">
          <label className="sr-only" htmlFor="nueva-condicion">
            Nueva condición
          </label>
          <select
            id="nueva-condicion"
            className={fieldControlClass + " max-w-[12rem]"}
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
          >
            {CLAVES_CONOCIDAS.map((k) => (
              <option key={k} value={k}>
                {nombreCondicion(k)}
              </option>
            ))}
          </select>
          {nueva === "exhaustion" && (
            <input
              type="number"
              min={1}
              max={6}
              className={fieldControlClass + " w-16"}
              value={nivel}
              onChange={(e) => setNivel(e.target.value)}
              aria-label="Nivel de agotamiento"
            />
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              aplicar.mutate({
                key: nueva,
                level: nueva === "exhaustion" ? Number(nivel) : undefined,
              })
            }
            disabled={aplicar.isPending}
          >
            Aplicar
          </Button>
        </div>
      )}
    </section>
  );
}
