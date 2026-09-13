import { useState } from "react";
import type { AbilityKey, ItemEffect, Movement, ProficiencyLevel, SkillKey } from "@dnd/shared";
import { Button } from "../../ui/Button";
import { fieldControlClass } from "../../ui/Field";
import { IconoMas } from "../../ui/Iconos";
import { RadioGroup } from "./RadioGroup";
import {
  CARACTERISTICAS,
  describirEfecto,
  EFFECT_KINDS,
  type EffectKind,
  EXPLICACION_EFECTO,
  HABILIDADES,
  NOMBRE_CARACTERISTICA,
  NOMBRE_EFECTO,
  NOMBRE_MOVIMIENTO,
  NOMBRE_NIVEL_COMPETENCIA,
  nombreCaracteristica,
  nombreHabilidad,
} from "./vocabulario";

const MAX_EFFECTS = 12;
const MOVEMENTS: Movement[] = ["walk", "climb", "swim", "fly", "burrow"];
const PROFICIENCY_LEVELS: ProficiencyLevel[] = ["none", "half", "proficient", "expertise"];

function borradorPorDefecto(kind: EffectKind): ItemEffect {
  switch (kind) {
    case "ac":
      return { kind: "ac", amount: 1 };
    case "abilityScore":
      return { kind: "abilityScore", ability: "str", mode: "add", amount: 1 };
    case "save":
      return { kind: "save", amount: 1 };
    case "maxHp":
      return { kind: "maxHp", amount: 1 };
    case "speed":
      return { kind: "speed", movement: "walk", amount: 10 };
    case "skillProficiency":
      return { kind: "skillProficiency", skill: HABILIDADES[0], level: "proficient" };
    case "saveProficiency":
      return { kind: "saveProficiency", ability: "str" };
    // El arma mágica (M2B-1): dos efectos independientes, porque el juego los separa —hay
    // objetos que dan solo daño— y porque se aplican **al arma que los lleva**.
    case "weaponAttack":
      return { kind: "weaponAttack", amount: 1 };
    case "weaponDamage":
      return { kind: "weaponDamage", amount: 1 };
  }
}

/**
 * El formulario de un borrador de efecto — solo los campos que le corresponden a `kind`, para
 * que no se pueda inventar una combinación que `itemEffectSchema` no reconoce (docs/04-convenciones).
 */
function CamposDeEfecto({
  borrador,
  onChange,
}: {
  borrador: ItemEffect;
  onChange: (next: ItemEffect) => void;
}) {
  switch (borrador.kind) {
    // Los cuatro son una cantidad a secas. Los dos del arma mágica entraron con la auditoría de
    // mecánica de 2B y no necesitan más campos: se aplican al objeto que los lleva.
    case "ac":
    case "maxHp":
    case "weaponAttack":
    case "weaponDamage":
      return (
        <label className="flex items-center gap-2 text-chrome-sm text-text">
          Cantidad
          <input
            type="number"
            value={borrador.amount}
            onChange={(e) => onChange({ ...borrador, amount: Number(e.target.value) })}
            className={fieldControlClass + " w-24"}
          />
        </label>
      );
    case "abilityScore":
      return (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-chrome-xs text-text">
            Característica
            <select
              value={borrador.ability}
              onChange={(e) => onChange({ ...borrador, ability: e.target.value as AbilityKey })}
              className={fieldControlClass}
            >
              {CARACTERISTICAS.map((a) => (
                <option key={a} value={a}>
                  {nombreCaracteristica(a)}
                </option>
              ))}
            </select>
          </label>
          <RadioGroup
            name="ability-mode"
            legend="Modo"
            compact
            value={borrador.mode}
            onChange={(mode) => onChange({ ...borrador, mode })}
            options={[
              { value: "add", label: "Sumar" },
              { value: "set", label: "Fijar" },
            ]}
          />
          <label className="flex flex-col gap-1 text-chrome-xs text-text">
            Cantidad
            <input
              type="number"
              value={borrador.amount}
              onChange={(e) => onChange({ ...borrador, amount: Number(e.target.value) })}
              className={fieldControlClass + " w-24"}
            />
          </label>
        </div>
      );
    case "save":
      return (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-chrome-xs text-text">
            Característica (vacío = las seis)
            <select
              value={borrador.ability ?? ""}
              onChange={(e) =>
                onChange({
                  ...borrador,
                  ability: e.target.value ? (e.target.value as AbilityKey) : undefined,
                })
              }
              className={fieldControlClass}
            >
              <option value="">Todas</option>
              {CARACTERISTICAS.map((a) => (
                <option key={a} value={a}>
                  {nombreCaracteristica(a)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-chrome-xs text-text">
            Cantidad
            <input
              type="number"
              value={borrador.amount}
              onChange={(e) => onChange({ ...borrador, amount: Number(e.target.value) })}
              className={fieldControlClass + " w-24"}
            />
          </label>
        </div>
      );
    case "speed":
      return (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-chrome-xs text-text">
            Movimiento
            <select
              value={borrador.movement}
              onChange={(e) => onChange({ ...borrador, movement: e.target.value as Movement })}
              className={fieldControlClass}
            >
              {MOVEMENTS.map((m) => (
                <option key={m} value={m}>
                  {NOMBRE_MOVIMIENTO[m]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-chrome-xs text-text">
            Pies
            <input
              type="number"
              value={borrador.amount}
              onChange={(e) => onChange({ ...borrador, amount: Number(e.target.value) })}
              className={fieldControlClass + " w-24"}
            />
          </label>
        </div>
      );
    case "skillProficiency":
      return (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-chrome-xs text-text">
            Habilidad
            <select
              value={borrador.skill}
              onChange={(e) => onChange({ ...borrador, skill: e.target.value as SkillKey })}
              className={fieldControlClass}
            >
              {HABILIDADES.map((s) => (
                <option key={s} value={s}>
                  {nombreHabilidad(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-chrome-xs text-text">
            Nivel
            <select
              value={borrador.level}
              onChange={(e) => onChange({ ...borrador, level: e.target.value as ProficiencyLevel })}
              className={fieldControlClass}
            >
              {PROFICIENCY_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {NOMBRE_NIVEL_COMPETENCIA[l]}
                </option>
              ))}
            </select>
          </label>
        </div>
      );
    case "saveProficiency":
      return (
        <label className="flex flex-col gap-1 text-chrome-xs text-text">
          Característica
          <select
            value={borrador.ability}
            onChange={(e) => onChange({ ...borrador, ability: e.target.value as AbilityKey })}
            className={fieldControlClass}
          >
            {CARACTERISTICAS.map((a) => (
              <option key={a} value={a}>
                {NOMBRE_CARACTERISTICA[a]}
              </option>
            ))}
          </select>
        </label>
      );
  }
}

/**
 * Los efectos numéricos de un objeto. **Se eligen de la lista cerrada de `itemEffectSchema`**
 * (`@dnd/shared`): no hay ningún campo de texto libre que pueda inventarse un efecto que el
 * servidor no reconozca. Máximo 12, el mismo tope que impone el esquema.
 */
export function EffectsEditor({
  effects,
  onChange,
  disabled = false,
}: {
  effects: ItemEffect[];
  onChange: (next: ItemEffect[]) => void;
  disabled?: boolean;
}) {
  const [anadiendo, setAnadiendo] = useState(false);
  const [borrador, setBorrador] = useState<ItemEffect>(() => borradorPorDefecto("ac"));

  const confirmarAnadido = () => {
    onChange([...effects, borrador]);
    setAnadiendo(false);
    setBorrador(borradorPorDefecto("ac"));
  };

  const quitar = (index: number) => onChange(effects.filter((_, i) => i !== index));

  return (
    <div className="space-y-s2">
      <p className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
        Efectos numéricos (lista cerrada, lo que el motor sabe sumar)
      </p>
      {effects.length === 0 && (
        <p className="font-chrome text-chrome-sm text-muted">
          Sin efectos numéricos. Todo lo demás va en la prosa.
        </p>
      )}
      <ul className="space-y-1">
        {effects.map((efecto, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-2 rounded-radius-sm border border-muted px-2 py-1"
          >
            <span className="font-data text-chrome-sm text-text">{describirEfecto(efecto)}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => quitar(i)}
                className="font-chrome text-chrome-xs text-danger-text underline"
              >
                Quitar
              </button>
            )}
          </li>
        ))}
      </ul>
      {!disabled && !anadiendo && effects.length < MAX_EFFECTS && (
        <Button type="button" variant="secondary" onClick={() => setAnadiendo(true)}>
          Añadir efecto
        </Button>
      )}
      {!disabled && effects.length >= MAX_EFFECTS && (
        <p className="font-chrome text-chrome-xs text-muted">
          Doce efectos es el máximo que admite un objeto.
        </p>
      )}
      {anadiendo && (
        <div className="space-y-s3 rounded-radius-sm border border-accent bg-[color:var(--accent-tint)] p-s3">
          <RadioGroup
            name="effect-kind"
            legend="Qué tipo de efecto"
            value={borrador.kind as EffectKind}
            onChange={(kind) => setBorrador(borradorPorDefecto(kind))}
            options={EFFECT_KINDS.map((k) => ({
              value: k,
              label: NOMBRE_EFECTO[k],
              hint: EXPLICACION_EFECTO[k],
            }))}
          />
          <CamposDeEfecto borrador={borrador} onChange={setBorrador} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAnadiendo(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={confirmarAnadido}>
              <IconoMas />
              Añadir
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
