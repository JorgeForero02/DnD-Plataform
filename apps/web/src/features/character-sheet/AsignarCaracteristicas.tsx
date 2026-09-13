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
//
// **Se pinta para el dueño Y para el DM** (ola de arreglos 1, I-2; spec §7 «dueño o DM»). El
// servidor exige las seis juntas a todo el mundo bajo estas tres reglas, así que las casillas de
// una en una de `Caracteristicas` no le sirven a nadie aquí: el DM tira o reparte por el jugador
// con este mismo bloque, y tras elegir con dados —el único caso en que conserva la llave
// (E-RM-13)— corrige las seis con el formulario de `CorregirLasSeis`, que las manda juntas y sin
// `attemptId`, que es exactamente lo que el servidor acepta.
//
// **Los bloques arrancan con lo guardado** (M-11): quien vuelve a la hoja con las seis ya fijadas
// ve sus números en el bloque, no seis «Sin elegir» bajo unas casillas apagadas que parecen decir
// que no guardó nada.

type ReglaFijada = Exclude<AbilitiesRule, { metodo: "LIBRE" }>;

const SIN_ELEGIR = "Sin elegir";

/** El estado local de una asignación en curso: qué llevo puesto en cada característica. */
type Asignacion = Partial<Record<AbilityKey, number>>;

/** Las seis del personaje tal y como llegan del servidor: `null` mientras no se han fijado. */
export type SeisGuardadas = Record<AbilityKey, number | null>;

function faltaAlguna(asignacion: Asignacion): boolean {
  return ORDEN_DE_CARACTERISTICAS.some((a) => asignacion[a] === undefined);
}

/** Las seis guardadas como `Record` completo, o `null` si falta alguna (a medio crear). */
function seisCompletas(character: SeisGuardadas): Record<AbilityKey, number> | null {
  if (ORDEN_DE_CARACTERISTICAS.some((a) => character[a] == null)) return null;
  return Object.fromEntries(ORDEN_DE_CARACTERISTICAS.map((a) => [a, character[a]!])) as Record<
    AbilityKey,
    number
  >;
}

export function AsignarCaracteristicas({
  campaignId,
  characterId,
  regla,
  puedeEditar,
  esDM,
  character,
}: {
  campaignId: string;
  characterId: string;
  regla: ReglaFijada;
  puedeEditar: boolean;
  /** Solo cambia una cosa: tras elegir con dados, el DM ve `CorregirLasSeis` (E-RM-13). */
  esDM: boolean;
  /** Las seis guardadas, para sembrar el bloque (M-11) y el formulario de corrección. */
  character: SeisGuardadas;
}) {
  if (regla.metodo === "MATRIZ") {
    return (
      <PorMatriz
        campaignId={campaignId}
        characterId={characterId}
        puedeEditar={puedeEditar}
        guardadas={seisCompletas(character)}
      />
    );
  }
  if (regla.metodo === "PUNTOS") {
    return (
      <PorPuntos
        campaignId={campaignId}
        characterId={characterId}
        puntos={regla.puntos}
        puedeEditar={puedeEditar}
        guardadas={seisCompletas(character)}
      />
    );
  }
  return (
    <PorDados
      campaignId={campaignId}
      characterId={characterId}
      regla={regla}
      puedeEditar={puedeEditar}
      esDM={esDM}
      guardadas={seisCompletas(character)}
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
  guardadas,
}: {
  campaignId: string;
  characterId: string;
  puedeEditar: boolean;
  guardadas: Record<AbilityKey, number> | null;
}) {
  const [asignacion, setAsignacion] = useState<Asignacion>(() => guardadas ?? {});
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
  // Un valor guardado que la matriz no ofrece —se fijó bajo otra regla, o lo corrigió el DM— se
  // enseña marcado y no seleccionable, nunca desaparece (`docs/04-convenciones.md`). Sin esta
  // opción, el `<select>` pintaría «Sin elegir» sobre un 18 que sí está guardado.
  const huerfanoDe = (ability: AbilityKey): number | null => {
    const v = asignacion[ability];
    return v !== undefined && !(MATRIZ_ESTANDAR as readonly number[]).includes(v) ? v : null;
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
              {huerfanoDe(ability) !== null && (
                <option value={huerfanoDe(ability)!} disabled>
                  {huerfanoDe(ability)} — guardado, fuera de la matriz
                </option>
              )}
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
  guardadas,
}: {
  campaignId: string;
  characterId: string;
  puntos: number;
  puedeEditar: boolean;
  guardadas: Record<AbilityKey, number> | null;
}) {
  const [valores, setValores] = useState<Record<AbilityKey, number>>(
    () =>
      guardadas ??
      (Object.fromEntries(ORDEN_DE_CARACTERISTICAS.map((a) => [a, 8])) as Record<
        AbilityKey,
        number
      >),
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
  esDM,
  guardadas,
}: {
  campaignId: string;
  characterId: string;
  regla: Extract<AbilitiesRule, { metodo: "DADOS" }>;
  puedeEditar: boolean;
  esDM: boolean;
  guardadas: Record<AbilityKey, number> | null;
}) {
  const { data } = useAbilityRolls(campaignId, characterId);
  const tirar = useRollAbilities(campaignId, characterId);
  const [error, setError] = useState<string | null>(null);
  const lista = data ?? [];
  const elegido = lista.find((a) => a.chosen);

  if (elegido) {
    return (
      <div className="flex flex-col gap-s2">
        <p className="font-chrome text-chrome-sm text-text">Fijadas con dados</p>
        {/* E-RM-13: tras elegir, solo el DM conserva la llave — y el servidor le exige las seis
            juntas, así que su puerta es este formulario y no las casillas de una en una. */}
        {esDM && (
          <CorregirLasSeis
            campaignId={campaignId}
            characterId={characterId}
            puedeEditar={puedeEditar}
            guardadas={guardadas}
          />
        )}
      </div>
    );
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
          // M-3: un segundo clic con la petición en vuelo se ignora —el botón sigue habilitado
          // (regla de la casa), pero no salen dos POST—, y un 409/400 del servidor se escribe
          // aquí igual que el error calculado en cliente.
          if (tirar.isPending) return;
          setError(null);
          tirar.mutate(undefined, { onError: (e) => setError((e as Error).message) });
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

/**
 * **El arbitraje del DM tras elegir con dados** (E-RM-13, ola de arreglos 1 I-2): seis números
 * sembrados con los guardados y un solo botón que manda las seis juntas, sin `attemptId`. Es la
 * única forma que el servidor acepta bajo esta regla — la misma que rechazaba, con 400 en cada
 * casilla, la edición de una en una que la hoja le ofrecía al DM antes de este arreglo.
 */
function CorregirLasSeis({
  campaignId,
  characterId,
  puedeEditar,
  guardadas,
}: {
  campaignId: string;
  characterId: string;
  puedeEditar: boolean;
  guardadas: Record<AbilityKey, number> | null;
}) {
  const [valores, setValores] = useState<Record<AbilityKey, number>>(
    () =>
      guardadas ??
      (Object.fromEntries(ORDEN_DE_CARACTERISTICAS.map((a) => [a, 10])) as Record<
        AbilityKey,
        number
      >),
  );
  const [error, setError] = useState<string | null>(null);
  const actualizar = useUpdateSheet(campaignId, characterId);

  const guardar = async () => {
    const fuera = ORDEN_DE_CARACTERISTICAS.find((a) => valores[a] < 1 || valores[a] > 30);
    if (fuera) {
      setError(`${NOMBRE_CARACTERISTICA[fuera]} tiene que estar entre 1 y 30.`);
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
    <div className="flex flex-col gap-s2 border-t border-muted pt-s2">
      <p className="font-chrome text-chrome-sm text-text">Corregir las seis</p>
      <p className="font-chrome text-chrome-xs text-muted">
        Bajo esta regla las seis se guardan juntas; solo el DM puede corregirlas.
      </p>
      <div className="grid grid-cols-2 gap-s2 sm:grid-cols-3">
        {ORDEN_DE_CARACTERISTICAS.map((ability) => (
          <label key={ability} className="flex flex-col gap-0.5">
            <span className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
              {NOMBRE_CARACTERISTICA[ability]}
            </span>
            <input
              type="number"
              aria-label={NOMBRE_CARACTERISTICA[ability]}
              min={1}
              max={30}
              value={valores[ability]}
              disabled={!puedeEditar}
              onChange={(e) => {
                const n = Number(e.target.value);
                setValores((v) => ({ ...v, [ability]: Number.isFinite(n) ? n : v[ability] }));
              }}
              className="w-16 font-data text-chrome-sm text-text"
            />
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="font-chrome text-chrome-xs text-danger-text">
          {error}
        </p>
      )}
      <Button type="button" disabled={!puedeEditar} onClick={() => void guardar()}>
        Guardar las seis
      </Button>
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
