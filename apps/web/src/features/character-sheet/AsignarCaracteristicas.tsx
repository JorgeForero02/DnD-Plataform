import { useState } from "react";
import type { AbilitiesRule, AbilityKey, AbilityRollAttemptDto } from "@dnd/shared";
import { COSTE_POR_PUNTUACION, MATRIZ_ESTANDAR, ORDEN_DE_CARACTERISTICAS } from "@dnd/shared";
import { Button } from "../../ui/Button";
import { ResultadoDeTirada } from "../rolls/ResultadoDeTirada";
import type { DesgloseDeTirada } from "../rolls/ResultadoDeTirada";
import { useAbilityRolls, useRollAbilities, useUpdateSheet } from "./hooks";
import { NOMBRE_CARACTERISTICA } from "./vocabulario";

// Reglas de la mesa (spec 2026-09-13, D-CF-53) — **la pantalla donde se obedece la regla**, no
// donde se decide: eso ya lo fijó el DM en «Reglas de la mesa» (Task 5). Tres ramas, una por
// `regla.metodo`, y ninguna admite `LIBRE` — esa la sigue cubriendo `Caracteristicas` tal cual
// estaba (`IdentidadEditable.tsx`).
//
// **Botones que nunca se deshabilitan por un dato inválido o agotado** (`docs/04-convenciones.md`):
// falta un valor, se pasa del presupuesto, o ya no quedan intentos → el error se escribe en línea
// y no sale ninguna petición. Solo `!puedeEditar` apaga un botón, y entonces lleva su motivo.

type ReglaFijada = Exclude<AbilitiesRule, { metodo: "LIBRE" }>;

const SIN_ELEGIR = "Sin elegir";

/** El estado local de una asignación en curso: qué llevo puesto en cada característica. */
type Asignacion = Partial<Record<AbilityKey, number>>;

function faltaAlguna(asignacion: Asignacion): boolean {
  return ORDEN_DE_CARACTERISTICAS.some((a) => asignacion[a] === undefined);
}

export function AsignarCaracteristicas({
  campaignId,
  characterId,
  regla,
  puedeEditar,
}: {
  campaignId: string;
  characterId: string;
  regla: ReglaFijada;
  puedeEditar: boolean;
}) {
  if (regla.metodo === "MATRIZ") {
    return (
      <PorMatriz campaignId={campaignId} characterId={characterId} puedeEditar={puedeEditar} />
    );
  }
  if (regla.metodo === "PUNTOS") {
    return (
      <PorPuntos
        campaignId={campaignId}
        characterId={characterId}
        puntos={regla.puntos}
        puedeEditar={puedeEditar}
      />
    );
  }
  return (
    <PorDados
      campaignId={campaignId}
      characterId={characterId}
      regla={regla}
      puedeEditar={puedeEditar}
    />
  );
}

/**
 * **Matriz estándar (SRD 5.1): 15, 14, 13, 12, 10, 8, uno por característica.**
 *
 * Seis `<select>`. La regla de radios del proyecto es para opciones con SIGNIFICADO distinto
 * (`docs/04-convenciones.md`); esto es lo contrario: seis números de la misma naturaleza que se
 * van agotando a medida que se reparten, así que un desplegable —que ya sabe quitar lo que no
 * está disponible— es la forma honesta, no un atajo.
 */
function PorMatriz({
  campaignId,
  characterId,
  puedeEditar,
}: {
  campaignId: string;
  characterId: string;
  puedeEditar: boolean;
}) {
  const [asignacion, setAsignacion] = useState<Asignacion>({});
  const [error, setError] = useState<string | null>(null);
  const actualizar = useUpdateSheet(campaignId, characterId);

  const opcionesPara = (ability: AbilityKey) => {
    const usados = new Set(
      ORDEN_DE_CARACTERISTICAS.filter((a) => a !== ability)
        .map((a) => asignacion[a])
        .filter((v): v is number => v !== undefined),
    );
    return MATRIZ_ESTANDAR.filter((v) => !usados.has(v));
  };

  const fijar = async () => {
    if (faltaAlguna(asignacion)) {
      setError("Faltan valores por asignar.");
      return;
    }
    setError(null);
    try {
      await actualizar.mutateAsync({ abilities: asignacion as Record<AbilityKey, number> });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-s2">
      <div className="grid grid-cols-2 gap-s2 sm:grid-cols-3">
        {ORDEN_DE_CARACTERISTICAS.map((ability) => (
          <label key={ability} className="flex flex-col gap-0.5">
            <span className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
              {NOMBRE_CARACTERISTICA[ability]}
            </span>
            <select
              aria-label={NOMBRE_CARACTERISTICA[ability]}
              value={asignacion[ability] ?? ""}
              disabled={!puedeEditar}
              onChange={(e) =>
                setAsignacion((v) => ({
                  ...v,
                  [ability]: e.target.value === "" ? undefined : Number(e.target.value),
                }))
              }
              className="font-chrome text-chrome-sm text-text"
            >
              <option value="">{SIN_ELEGIR}</option>
              {opcionesPara(ability).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="font-chrome text-chrome-xs text-danger-text">
          {error}
        </p>
      )}
      <Button type="button" disabled={!puedeEditar} onClick={() => void fijar()}>
        Fijar características
      </Button>
    </div>
  );
}

/** Ability Score Point Cost (SRD 5.1, variante). */
function PorPuntos({
  campaignId,
  characterId,
  puntos,
  puedeEditar,
}: {
  campaignId: string;
  characterId: string;
  puntos: number;
  puedeEditar: boolean;
}) {
  const [valores, setValores] = useState<Record<AbilityKey, number>>(
    () =>
      Object.fromEntries(ORDEN_DE_CARACTERISTICAS.map((a) => [a, 8])) as Record<AbilityKey, number>,
  );
  const [error, setError] = useState<string | null>(null);
  const actualizar = useUpdateSheet(campaignId, characterId);

  const costeDe = (v: number): number =>
    v in COSTE_POR_PUNTUACION ? COSTE_POR_PUNTUACION[v as keyof typeof COSTE_POR_PUNTUACION] : 0;
  const gastados = ORDEN_DE_CARACTERISTICAS.reduce((acc, a) => acc + costeDe(valores[a]), 0);

  const fijar = async () => {
    if (gastados > puntos) {
      setError(`Te has pasado: gastas ${gastados} y hay ${puntos}.`);
      return;
    }
    setError(null);
    try {
      await actualizar.mutateAsync({ abilities: valores });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-s2">
      <div className="grid grid-cols-2 gap-s2 sm:grid-cols-3">
        {ORDEN_DE_CARACTERISTICAS.map((ability) => (
          <label key={ability} className="flex flex-col gap-0.5">
            <span className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
              {NOMBRE_CARACTERISTICA[ability]}
            </span>
            <input
              type="number"
              aria-label={NOMBRE_CARACTERISTICA[ability]}
              min={8}
              max={15}
              value={valores[ability]}
              disabled={!puedeEditar}
              onChange={(e) => {
                const n = Number(e.target.value);
                setValores((v) => ({ ...v, [ability]: Number.isFinite(n) ? n : v[ability] }));
              }}
              className="w-16 font-data text-chrome-sm text-text"
            />
            <span className="font-chrome text-chrome-xs text-muted">
              coste {costeDe(valores[ability])}
            </span>
          </label>
        ))}
      </div>
      <p className="font-chrome text-chrome-sm text-text">
        Te quedan {puntos - gastados} de {puntos} puntos
      </p>
      {error && (
        <p role="alert" className="font-chrome text-chrome-xs text-danger-text">
          {error}
        </p>
      )}
      <Button type="button" disabled={!puedeEditar} onClick={() => void fijar()}>
        Fijar características
      </Button>
    </div>
  );
}

/** Los seis dados del servidor (E-RM-*): una tirada por intento, y el jugador se queda con una. */
function PorDados({
  campaignId,
  characterId,
  regla,
  puedeEditar,
}: {
  campaignId: string;
  characterId: string;
  regla: Extract<AbilitiesRule, { metodo: "DADOS" }>;
  puedeEditar: boolean;
}) {
  const { data } = useAbilityRolls(campaignId, characterId);
  const tirar = useRollAbilities(campaignId, characterId);
  const [error, setError] = useState<string | null>(null);
  const lista = data ?? [];
  const elegido = lista.find((a) => a.chosen);

  if (elegido) {
    return <p className="font-chrome text-chrome-sm text-text">Fijadas con dados</p>;
  }

  const agotados = lista.length >= regla.intentos;

  return (
    <div className="flex flex-col gap-s3">
      <Button
        type="button"
        disabled={!puedeEditar}
        onClick={() => {
          if (agotados) {
            setError(`Ya usaste los ${regla.intentos} intentos.`);
            return;
          }
          setError(null);
          tirar.mutate();
        }}
      >
        Tirar características
      </Button>
      {error && (
        <p role="alert" className="font-chrome text-chrome-xs text-danger-text">
          {error}
        </p>
      )}
      {lista
        .slice()
        .sort((a, b) => a.attempt - b.attempt)
        .map((intento) => (
          <IntentoDeDados
            key={intento.id}
            campaignId={campaignId}
            characterId={characterId}
            intento={intento}
            asignacionLibre={regla.asignacionLibre}
            puedeEditar={puedeEditar}
          />
        ))}
    </div>
  );
}

function IntentoDeDados({
  campaignId,
  characterId,
  intento,
  asignacionLibre,
  puedeEditar,
}: {
  campaignId: string;
  characterId: string;
  intento: AbilityRollAttemptDto;
  asignacionLibre: boolean;
  puedeEditar: boolean;
}) {
  // `Asignacion` aquí guarda el ÍNDICE dentro de `intento.values`, no el valor: dos tiradas
  // pueden salir iguales (dos 14, por ejemplo), y por valor no se podrían distinguir dos casillas
  // que llevan el mismo número.
  const [asignacion, setAsignacion] = useState<Asignacion>({});
  const [error, setError] = useState<string | null>(null);
  const actualizar = useUpdateSheet(campaignId, characterId);

  const quedarme = async () => {
    let abilities: Record<AbilityKey, number>;
    if (asignacionLibre) {
      if (faltaAlguna(asignacion)) {
        setError("Faltan valores por asignar.");
        return;
      }
      abilities = Object.fromEntries(
        ORDEN_DE_CARACTERISTICAS.map((a) => [a, intento.values[asignacion[a]!]]),
      ) as Record<AbilityKey, number>;
    } else {
      abilities = Object.fromEntries(
        ORDEN_DE_CARACTERISTICAS.map((a, i) => [a, intento.values[i]]),
      ) as Record<AbilityKey, number>;
    }
    setError(null);
    try {
      await actualizar.mutateAsync({ attemptId: intento.id, abilities });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const opcionesPara = (ability: AbilityKey) => {
    const usados = new Set(
      ORDEN_DE_CARACTERISTICAS.filter((a) => a !== ability)
        .map((a) => asignacion[a])
        .filter((v): v is number => v !== undefined),
    );
    return intento.values
      .map((valor, indice) => ({ valor, indice }))
      .filter(({ indice }) => !usados.has(indice));
  };

  return (
    <div className="flex flex-col gap-s2 border-t border-muted pt-s2">
      <p className="font-chrome text-chrome-sm text-text">
        Intento {intento.attempt} de {intento.of}
      </p>
      <div className="grid grid-cols-2 gap-s2 sm:grid-cols-3">
        {intento.rolls.map((r, i) => (
          <ResultadoDeTirada
            key={i}
            resultado={r as DesgloseDeTirada}
            etiqueta={
              asignacionLibre
                ? `Valor ${i + 1}`
                : NOMBRE_CARACTERISTICA[ORDEN_DE_CARACTERISTICAS[i]]
            }
          />
        ))}
      </div>
      {asignacionLibre ? (
        <div className="grid grid-cols-2 gap-s2 sm:grid-cols-3">
          {ORDEN_DE_CARACTERISTICAS.map((ability) => (
            <label key={ability} className="flex flex-col gap-0.5">
              <span className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
                {NOMBRE_CARACTERISTICA[ability]}
              </span>
              <select
                aria-label={NOMBRE_CARACTERISTICA[ability]}
                value={asignacion[ability] ?? ""}
                disabled={!puedeEditar}
                onChange={(e) =>
                  setAsignacion((v) => ({
                    ...v,
                    [ability]: e.target.value === "" ? undefined : Number(e.target.value),
                  }))
                }
                className="font-chrome text-chrome-sm text-text"
              >
                <option value="">{SIN_ELEGIR}</option>
                {opcionesPara(ability).map(({ valor, indice }) => (
                  <option key={indice} value={indice}>
                    {valor}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : (
        // `asignacionLibre === false`: en el orden fijo FUE DES CON INT SAB CAR (E-RM-10).
        <p className="font-chrome text-chrome-sm text-text">
          {ORDEN_DE_CARACTERISTICAS.map(
            (a, i) => `${NOMBRE_CARACTERISTICA[a]} ${intento.values[i]}`,
          ).join(" · ")}
        </p>
      )}
      {error && (
        <p role="alert" className="font-chrome text-chrome-xs text-danger-text">
          {error}
        </p>
      )}
      <Button type="button" disabled={!puedeEditar} onClick={() => void quedarme()}>
        Quedarme con este
      </Button>
    </div>
  );
}
