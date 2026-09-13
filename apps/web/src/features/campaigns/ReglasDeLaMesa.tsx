import { useEffect, useRef, useState } from "react";
import {
  abilitiesRuleSchema,
  oroInicialSchema,
  type AbilitiesRule,
  type OroInicial,
  type PgNivelesSiguientes,
  type TableRules,
} from "@dnd/shared";
import { useUpdateCampaign } from "./hooks";
import { useCatalog } from "../character-sheet/hooks";
import {
  opcionesDeClase,
  opcionesDeRaza,
  type OpcionDeCatalogo,
} from "../character-sheet/opcionesDeCatalogo";
import { NOMBRE_METODO, NOMBRE_ORO, NOMBRE_PG, AVISO_NO_RETROACTIVO } from "./reglas";
import { Button } from "../../ui/Button";
import { Field, fieldControlClass } from "../../ui/Field";

/**
 * Task 5 (spec 2026-09-12, D-CF-53) — el bloque «Reglas de la mesa» en los ajustes de campaña.
 * Guarda entero, con `PATCH /campaigns/:id { tableRules }` (mismo endpoint que
 * `InterruptorDeSobrecarga` y `SalaDelTablero`, `CampaignSettings.tsx`).
 *
 * **Guardar explícito, no autoguardado por control**: cada radio o casilla cambia `borrador`
 * localmente; solo el botón manda el `PATCH`, igual que `SalaDelTablero`.
 */
export function ReglasDeLaMesa({
  campaignId,
  reglas,
  disabled,
  motivo,
}: {
  campaignId: string;
  reglas: TableRules;
  disabled: boolean;
  motivo?: string;
}) {
  const update = useUpdateCampaign(campaignId);
  const { data: catalogo } = useCatalog();
  const [borrador, setBorrador] = useState<TableRules>(reglas);
  const [error, setError] = useState<string | null>(null);

  // Re-sembrar si la campaña cambia de id — mismo patrón `seededId` que `CampaignSettings`: una
  // vez sembrado, un refetch con la misma campaña no pisa lo que el DM está editando.
  const seededId = useRef<string | null>(campaignId);
  useEffect(() => {
    if (seededId.current !== campaignId) {
      setBorrador(reglas);
      seededId.current = campaignId;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const onGuardar = () => {
    setError(null);
    // **Mutación obligatoria (T5, step 4)**: mandar `reglas` (la prop de entrada) en vez de
    // `borrador` aquí rompe la prueba de Guardar — se probó a propósito y se restauró.
    update.mutate({ tableRules: borrador }, { onError: (e) => setError((e as Error).message) });
  };

  const caminos: OpcionDeCatalogo[] = (catalogo?.classes ?? []).flatMap((c) =>
    c.subclasses.map((s) => ({ valor: s.key, texto: `${s.name} (${c.name})` })),
  );

  return (
    <section aria-label="Reglas de la mesa" className="mt-s5 border-t border-muted pt-s4">
      <h3 className="font-title text-chrome-md text-text">Reglas de la mesa</h3>
      <p className="mt-1 font-chrome text-chrome-xs text-muted">{AVISO_NO_RETROACTIVO}</p>
      {motivo && <p className="mt-1 font-chrome text-chrome-xs text-muted">{motivo}</p>}

      <GrupoDeRadios
        legend="Características"
        name="reglas-caracteristicas"
        opciones={NOMBRE_METODO}
        valor={borrador.abilities.metodo}
        disabled={disabled}
        onChange={(metodo) =>
          setBorrador({
            ...borrador,
            abilities: abilitiesRuleSchema.parse({ metodo }) as AbilitiesRule,
          })
        }
      />
      {borrador.abilities.metodo === "PUNTOS" && (
        <Field label="Puntos a repartir">
          <input
            type="number"
            min={15}
            max={40}
            value={borrador.abilities.puntos}
            disabled={disabled}
            className={fieldControlClass}
            onChange={(e) =>
              setBorrador({
                ...borrador,
                abilities: { metodo: "PUNTOS", puntos: Number(e.target.value) },
              })
            }
          />
        </Field>
      )}
      {borrador.abilities.metodo === "DADOS" && (
        <>
          <Field label="Expresión de dados" hint="4d6kh3 · 3d6 · 1d20…">
            <input
              value={borrador.abilities.expresion}
              disabled={disabled}
              className={fieldControlClass}
              onChange={(e) =>
                setBorrador({
                  ...borrador,
                  abilities: {
                    ...(borrador.abilities as Extract<AbilitiesRule, { metodo: "DADOS" }>),
                    expresion: e.target.value,
                  },
                })
              }
            />
          </Field>
          <Field label="Intentos">
            <input
              type="number"
              min={1}
              max={10}
              value={borrador.abilities.intentos}
              disabled={disabled}
              className={fieldControlClass}
              onChange={(e) =>
                setBorrador({
                  ...borrador,
                  abilities: {
                    ...(borrador.abilities as Extract<AbilitiesRule, { metodo: "DADOS" }>),
                    intentos: Number(e.target.value),
                  },
                })
              }
            />
          </Field>
          <label className="mt-1 flex items-center gap-2 font-chrome text-chrome-sm text-text">
            <input
              type="checkbox"
              checked={borrador.abilities.asignacionLibre}
              disabled={disabled}
              className="accent-[var(--accent)]"
              onChange={(e) =>
                setBorrador({
                  ...borrador,
                  abilities: {
                    ...(borrador.abilities as Extract<AbilitiesRule, { metodo: "DADOS" }>),
                    asignacionLibre: e.target.checked,
                  },
                })
              }
            />
            Reparten libremente los seis valores
          </label>
        </>
      )}

      <Field label="Nivel inicial">
        <input
          type="number"
          min={1}
          max={20}
          value={borrador.nivelInicial}
          disabled={disabled}
          className={fieldControlClass}
          onChange={(e) => setBorrador({ ...borrador, nivelInicial: Number(e.target.value) })}
        />
      </Field>

      <GrupoDeRadios
        legend="Puntos de golpe de los niveles siguientes"
        name="reglas-pg"
        opciones={NOMBRE_PG}
        valor={borrador.pgNivelesSiguientes}
        disabled={disabled}
        onChange={(pg) =>
          setBorrador({ ...borrador, pgNivelesSiguientes: pg as PgNivelesSiguientes })
        }
      />

      <ListaDePermitidos
        legend="Razas permitidas"
        opciones={opcionesDeRaza(catalogo)}
        valor={borrador.permitidos.razas}
        disabled={disabled}
        onChange={(razas) =>
          setBorrador({ ...borrador, permitidos: { ...borrador.permitidos, razas } })
        }
      />
      <ListaDePermitidos
        legend="Clases permitidas"
        opciones={opcionesDeClase(catalogo)}
        valor={borrador.permitidos.clases}
        disabled={disabled}
        onChange={(clases) =>
          setBorrador({ ...borrador, permitidos: { ...borrador.permitidos, clases } })
        }
      />
      <ListaDePermitidos
        legend="Caminos permitidos"
        opciones={caminos}
        valor={borrador.permitidos.subclases}
        disabled={disabled}
        onChange={(subclases) =>
          setBorrador({ ...borrador, permitidos: { ...borrador.permitidos, subclases } })
        }
      />

      <GrupoDeRadios
        legend="Oro inicial"
        name="reglas-oro"
        opciones={NOMBRE_ORO}
        valor={borrador.oroInicial.modo}
        disabled={disabled}
        onChange={(modo) =>
          setBorrador({
            ...borrador,
            oroInicial:
              modo === "ORO_FIJO"
                ? {
                    modo: "ORO_FIJO",
                    cantidadPo:
                      borrador.oroInicial.modo === "ORO_FIJO" ? borrador.oroInicial.cantidadPo : 0,
                  }
                : (oroInicialSchema.parse({ modo }) as OroInicial),
          })
        }
      />
      {borrador.oroInicial.modo === "ORO_FIJO" && (
        <Field label="Oro inicial (po)">
          <input
            type="number"
            min={0}
            max={100000}
            value={borrador.oroInicial.cantidadPo}
            disabled={disabled}
            className={fieldControlClass}
            onChange={(e) =>
              setBorrador({
                ...borrador,
                oroInicial: { modo: "ORO_FIJO", cantidadPo: Number(e.target.value) },
              })
            }
          />
        </Field>
      )}

      {error && (
        <p role="alert" className="mt-s2 font-chrome text-chrome-xs text-danger-text">
          {error}
        </p>
      )}
      <div className="mt-s2">
        <Button type="button" onClick={onGuardar}>
          Guardar las reglas
        </Button>
      </div>
    </section>
  );
}

/**
 * Radios con su frase (docs/04-convenciones.md, «opciones con significado como radios con
 * explicación y no en un desplegable»): mismo patrón que `InterruptorDeSobrecarga`, genérico
 * sobre el vocabulario legible de `reglas.ts`.
 */
function GrupoDeRadios<T extends string>({
  legend,
  name,
  opciones,
  valor,
  disabled,
  onChange,
}: {
  legend: string;
  name: string;
  opciones: Record<T, { etiqueta: string; frase: string }>;
  valor: T;
  disabled: boolean;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="mt-s3 rounded-radius-sm border border-muted bg-surface p-s3">
      <legend className="px-1 font-chrome text-chrome-sm text-text">{legend}</legend>
      <div className="space-y-1">
        {(Object.entries(opciones) as [T, { etiqueta: string; frase: string }][]).map(
          ([clave, opcion]) => {
            const elegida = valor === clave;
            return (
              <label
                key={clave}
                className={[
                  "flex cursor-pointer items-start gap-s2 rounded-radius-sm border px-s2 py-1.5 transition-colors",
                  elegida
                    ? "border-accent bg-[color:var(--accent-tint)]"
                    : "border-transparent hover:bg-bg",
                  disabled ? "cursor-not-allowed opacity-60" : "",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name={name}
                  checked={elegida}
                  disabled={disabled}
                  onChange={() => onChange(clave)}
                  className="mt-1 accent-[var(--accent)]"
                />
                <span className="min-w-0">
                  <span className="block font-chrome text-chrome-sm text-text">
                    {opcion.etiqueta}
                  </span>
                  <span className="mt-0.5 block font-chrome text-chrome-xs leading-snug text-muted">
                    {opcion.frase}
                  </span>
                </span>
              </label>
            );
          },
        )}
      </div>
    </fieldset>
  );
}

/** Casillas con el nombre legible del catálogo. Vacío = todas: se dice en una línea de ayuda. */
function ListaDePermitidos({
  legend,
  opciones,
  valor,
  disabled,
  onChange,
}: {
  legend: string;
  opciones: OpcionDeCatalogo[];
  valor: string[];
  disabled: boolean;
  onChange: (v: string[]) => void;
}) {
  return (
    <fieldset className="mt-s3 rounded-radius-sm border border-muted bg-surface p-s3">
      <legend className="px-1 font-chrome text-chrome-sm text-text">{legend}</legend>
      <p className="font-chrome text-chrome-xs text-muted">Vacío = todas permitidas.</p>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        {opciones.map((opcion) => {
          const marcada = valor.includes(opcion.valor);
          return (
            <label
              key={opcion.valor}
              className="flex items-center gap-2 font-chrome text-chrome-sm text-text"
            >
              <input
                type="checkbox"
                checked={marcada}
                disabled={disabled}
                className="accent-[var(--accent)]"
                onChange={() =>
                  onChange(
                    marcada ? valor.filter((v) => v !== opcion.valor) : [...valor, opcion.valor],
                  )
                }
              />
              {opcion.texto}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
