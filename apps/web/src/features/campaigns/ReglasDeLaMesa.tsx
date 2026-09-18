import { useState } from "react";
import {
  abilitiesRuleSchema,
  oroInicialSchema,
  type AbilitiesRule,
  type OroInicial,
  type PgNivelesSiguientes,
  type Progresion,
  type TableRules,
} from "@dnd/shared";
import { useUpdateCampaign } from "./hooks";
import { useCatalog } from "../character-sheet/hooks";
import {
  opcionesDeClase,
  opcionesDeRaza,
  type OpcionDeCatalogo,
} from "../character-sheet/opcionesDeCatalogo";
import {
  NOMBRE_METODO,
  NOMBRE_ORO,
  NOMBRE_PG,
  NOMBRE_PROGRESION,
  AVISO_NO_RETROACTIVO,
  AVISO_PROGRESION_INMEDIATA,
} from "./reglas";
import { Button } from "../../ui/Button";
import { Field, fieldControlClass } from "../../ui/Field";
import { GrupoDeRadios } from "../../ui/GrupoDeRadios";

/** Rangos del esquema (`tableRulesSchema`), dichos en español ANTES de mandar: `Number("")` es 0 y
 * volvía como un 400 técnico de Zod. Si el esquema cambia, cambia aquí — y el 400 sigue detrás. */
function motivoDeRango(b: TableRules): string | null {
  if (b.abilities.metodo === "PUNTOS" && (b.abilities.puntos < 15 || b.abilities.puntos > 40))
    return "Los puntos a repartir van de 15 a 40.";
  if (b.abilities.metodo === "DADOS" && (b.abilities.intentos < 1 || b.abilities.intentos > 10))
    return "Los intentos van de 1 a 10.";
  if (b.nivelInicial < 1 || b.nivelInicial > 20) return "El nivel inicial va de 1 a 20.";
  if (
    b.oroInicial.modo === "ORO_FIJO" &&
    (b.oroInicial.cantidadPo < 0 || b.oroInicial.cantidadPo > 100000)
  )
    return "El oro fijo va de 0 a 100 000 po.";
  return null;
}

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

  // Re-sembrar cuando cambien las reglas de fuera (otra campaña, o el servidor devolvió las
  // normalizadas tras guardar) **y no haya edición en curso**. `sucio` se enciende al primer cambio
  // del DM y se apaga al guardar con éxito: un refetch nunca pisa lo que está tecleando (M-14).
  // Patrón «ajustar el estado durante el render» de la documentación de React (mismo patrón que
  // `revelado` en `DesgloseDelMundo.tsx`), no un efecto: `react-hooks/set-state-in-effect` prohíbe
  // llamar a `setState` sin condición externa dentro de un efecto, con razón (un render de más).
  // Revisión final (menor #5, 2026-09-18): comparar `reglas` por IDENTIDAD no basta — el padre
  // (`CampaignSettings`) construye el objeto con `tableRulesSchema.parse(...)` en cada render
  // suyo, así que cambia de identidad aunque el valor sea el mismo. Con `sucio` recién apagado
  // (justo tras guardar) un render de más del padre en esa ventana volvía a sembrar el borrador
  // con las reglas VIEJAS de la caché (la mutación solo invalida, no `setQueryData`) hasta que
  // llegaba el refetch. Comparar por valor evita la re-siembra fantasma.
  const [sucio, setSucio] = useState(false);
  const claveDeReglas = JSON.stringify(reglas);
  const [ultimaClave, setUltimaClave] = useState(claveDeReglas);
  if (claveDeReglas !== ultimaClave) {
    setUltimaClave(claveDeReglas);
    if (!sucio) setBorrador(reglas);
  }
  const editar = (siguiente: TableRules) => {
    setSucio(true);
    setBorrador(siguiente);
  };

  const onGuardar = () => {
    setError(null);
    const motivo = motivoDeRango(borrador);
    if (motivo) {
      setError(motivo);
      return;
    }
    // **Mutación obligatoria (T5, step 4)**: mandar `reglas` (la prop de entrada) en vez de
    // `borrador` aquí rompe la prueba de Guardar — se probó a propósito y se restauró.
    update.mutate(
      { tableRules: borrador },
      { onSuccess: () => setSucio(false), onError: (e) => setError((e as Error).message) },
    );
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
        className="mt-s3 rounded-radius-sm border border-muted bg-surface p-s3"
        opciones={NOMBRE_METODO}
        valor={borrador.abilities.metodo}
        disabled={disabled}
        onChange={(metodo) =>
          editar({
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
              editar({
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
                editar({
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
                editar({
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
                editar({
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
          onChange={(e) => editar({ ...borrador, nivelInicial: Number(e.target.value) })}
        />
      </Field>

      <GrupoDeRadios
        legend="Puntos de golpe de los niveles siguientes"
        name="reglas-pg"
        className="mt-s3 rounded-radius-sm border border-muted bg-surface p-s3"
        opciones={NOMBRE_PG}
        valor={borrador.pgNivelesSiguientes}
        disabled={disabled}
        onChange={(pg) => editar({ ...borrador, pgNivelesSiguientes: pg as PgNivelesSiguientes })}
      />

      <ListaDePermitidos
        legend="Razas permitidas"
        opciones={opcionesDeRaza(catalogo)}
        valor={borrador.permitidos.razas}
        disabled={disabled}
        onChange={(razas) => editar({ ...borrador, permitidos: { ...borrador.permitidos, razas } })}
      />
      <ListaDePermitidos
        legend="Clases permitidas"
        opciones={opcionesDeClase(catalogo)}
        valor={borrador.permitidos.clases}
        disabled={disabled}
        onChange={(clases) =>
          editar({ ...borrador, permitidos: { ...borrador.permitidos, clases } })
        }
      />
      <ListaDePermitidos
        legend="Caminos permitidos"
        opciones={caminos}
        valor={borrador.permitidos.subclases}
        disabled={disabled}
        onChange={(subclases) =>
          editar({ ...borrador, permitidos: { ...borrador.permitidos, subclases } })
        }
      />

      <GrupoDeRadios
        legend="Oro inicial"
        name="reglas-oro"
        className="mt-s3 rounded-radius-sm border border-muted bg-surface p-s3"
        opciones={NOMBRE_ORO}
        valor={borrador.oroInicial.modo}
        disabled={disabled}
        onChange={(modo) =>
          editar({
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
              editar({
                ...borrador,
                oroInicial: { modo: "ORO_FIJO", cantidadPo: Number(e.target.value) },
              })
            }
          />
        </Field>
      )}

      <GrupoDeRadios
        legend="Progresión"
        name="reglas-progresion"
        className="mt-s3 rounded-radius-sm border border-muted bg-surface p-s3"
        opciones={NOMBRE_PROGRESION}
        valor={borrador.progresion}
        disabled={disabled}
        onChange={(progresion) => editar({ ...borrador, progresion: progresion as Progresion })}
        // El aviso de arriba («valen para los que se creen a partir de ahora») no alcanza a esta
        // regla, y se dice aquí, debajo de ella, en vez de dejar que se lea lo contrario.
        nota={AVISO_PROGRESION_INMEDIATA}
      />

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
