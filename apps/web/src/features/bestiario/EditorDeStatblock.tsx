import { useState } from "react";
import {
  CREATURE_SIZES,
  CREATURE_TYPES,
  damageTypeSchema,
  dadoDeGolpeDe,
  pgMediosDe,
  vdLegible,
  type CreateCampaignStatblockInput,
  type CreatureSize,
  type CreatureType,
  type DamageModifier,
  type DamageType,
  type Statblock,
  type StatblockFeature,
  type Visibility,
} from "@dnd/shared";
import { Button } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";
import { Field, fieldControlClass } from "../../ui/Field";
import { NOMBRE_CARACTERISTICA, nombreTipoDano } from "../character-sheet/vocabulario";
import { EXPLICACION_DE_NIVEL } from "../entities/visibilidad";
import { NOMBRE_TAMANO, NOMBRE_TIPO_CRIATURA } from "./vocabulario";

// Fase 2D, conectada el 2026-09-04 — **escribir una criatura propia**.
//
// `useCreateStatblock` y `useDeleteStatblock` existían desde 2D y **ningún componente los
// usaba**; `PUT .../statblocks/:id` ni siquiera tenía función en la web (auditoría de la mesa,
// §8.5). El bestiario enseñaba los quince del libro y decía «y el DM puede escribir las suyas»,
// que era falso: no había por dónde.
//
// **Lo que este formulario NO hace, y es a propósito.** El esquema compartido tiene veinte y
// pico campos —competencias por habilidad, sentidos en prosa, reacciones, acciones legendarias,
// cinco velocidades—. Aquí se escriben los que hacen que una criatura **funcione en la mesa**:
// su descriptor, sus tres números grandes, sus seis características, su valor de desafío, sus
// modificadores de daño, y sus rasgos y acciones en prosa. Lo demás se manda con el valor por
// defecto que ya declara `@dnd/shared`, que es exactamente lo que el servidor haría con un
// cuerpo que no los trajera. **No se inventa ningún valor** que el esquema no defienda.
//
// **Los PG y el dado se DERIVAN y se enseñan mientras escribes**, con las mismas funciones del
// esquema compartido (`pgMediosDe`, `dadoDeGolpeDe`): el dado sale del tamaño, no de un campo, y
// verlo cambiar al cambiar el tamaño es lo que evita la pregunta «¿de dónde sale ese d10?».

const TIPOS_DE_DANO = damageTypeSchema.options;

const NOMBRE_EFECTO_DE_DANO: Record<DamageModifier["effect"], string> = {
  RESIST: "Resiste (la mitad)",
  IMMUNE: "Es inmune (nada)",
  VULNERABLE: "Es vulnerable (el doble)",
};

/** Los valores de desafío que el SRD usa de verdad, incluidos los fraccionarios. */
const VALORES_DE_DESAFIO = [0, 0.125, 0.25, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 24, 30];

const ABILIDADES = ["str", "dex", "con", "int", "wis", "cha"] as const;

/** Un statblock vacío con los valores por defecto del esquema, listo para escribir encima. */
function borradorVacio(): CreateCampaignStatblockInput {
  return {
    name: "",
    size: "MEDIUM",
    type: "HUMANOID",
    ac: 10,
    hitDiceCount: 2,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    saveProficiencies: [],
    skillProficiencies: {},
    damageResistances: [],
    damageImmunities: [],
    damageVulnerabilities: [],
    conditionImmunities: [],
    otherSenses: [],
    speeds: { walk: 30 },
    cr: 0.25,
    traits: [],
    actions: [],
    reactions: [],
    legendaryActions: [],
    visibility: "DM_ONLY",
  };
}

/** El mismo borrador, pero partiendo de una criatura que ya existe: editar es rellenar. */
function borradorDe(s: Statblock & { visibility?: Visibility }): CreateCampaignStatblockInput {
  return {
    ...borradorVacio(),
    ...s,
    visibility: s.visibility ?? "DM_ONLY",
  };
}

/** Una lista de rasgos o de acciones: nombre y prosa, se añaden y se quitan. */
function ListaDeProsa({
  titulo,
  filas,
  onCambiar,
}: {
  titulo: string;
  filas: StatblockFeature[];
  onCambiar: (filas: StatblockFeature[]) => void;
}) {
  return (
    <fieldset className="rounded-radius-sm border border-muted p-s2">
      <legend className="px-1 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
        {titulo}
      </legend>
      <ul className="space-y-s2">
        {filas.map((f, i) => (
          <li key={i} className="space-y-1">
            <div className="flex items-center gap-s2">
              <input
                className={fieldControlClass + " flex-1"}
                aria-label={`Nombre de ${titulo.toLowerCase()} ${i + 1}`}
                value={f.name}
                maxLength={120}
                onChange={(e) =>
                  onCambiar(filas.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                }
              />
              <Button
                type="button"
                variant="ghost"
                aria-label={`Quitar ${titulo.toLowerCase()} ${i + 1}`}
                onClick={() => onCambiar(filas.filter((_, j) => j !== i))}
              >
                Quitar
              </Button>
            </div>
            <textarea
              className={fieldControlClass}
              aria-label={`Texto de ${titulo.toLowerCase()} ${i + 1}`}
              rows={2}
              value={f.desc}
              maxLength={4000}
              onChange={(e) =>
                onCambiar(filas.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)))
              }
            />
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="secondary"
        className="mt-s2"
        onClick={() => onCambiar([...filas, { name: "", desc: "" }])}
      >
        Añadir
      </Button>
    </fieldset>
  );
}

/**
 * Resistencias, inmunidades y vulnerabilidades **estructuradas**: la parte que el servidor sabe
 * aplicar sola (2.5.1). Es lo que hace que el selector de tipo de daño de la hoja sirva de algo:
 * sin un solo modificador aquí, `changeHp` no tiene nada que reducir y devuelve el daño entero.
 *
 * `note` es la prosa que **limita** la regla —*«de ataques no mágicos con armas que no sean de
 * plata»*, el caso del tumulario—. El servidor no la interpreta: la transporta hasta la traza.
 */
function ModificadoresDeDano({
  filas,
  onCambiar,
}: {
  filas: DamageModifier[];
  onCambiar: (filas: DamageModifier[]) => void;
}) {
  return (
    <fieldset className="rounded-radius-sm border border-muted p-s2">
      <legend className="px-1 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
        Resistencias, inmunidades y vulnerabilidades
      </legend>
      <ul className="space-y-s2">
        {filas.map((m, i) => (
          <li key={i} className="flex flex-wrap items-center gap-s2">
            <select
              className={fieldControlClass + " w-40"}
              aria-label={`Tipo de daño ${i + 1}`}
              value={m.damageType}
              onChange={(e) =>
                onCambiar(
                  filas.map((x, j) =>
                    j === i ? { ...x, damageType: e.target.value as DamageType } : x,
                  ),
                )
              }
            >
              {TIPOS_DE_DANO.map((t) => (
                <option key={t} value={t}>
                  {nombreTipoDano(t)}
                </option>
              ))}
            </select>
            <select
              className={fieldControlClass + " w-48"}
              aria-label={`Qué le hace el daño ${i + 1}`}
              value={m.effect}
              onChange={(e) =>
                onCambiar(
                  filas.map((x, j) =>
                    j === i ? { ...x, effect: e.target.value as DamageModifier["effect"] } : x,
                  ),
                )
              }
            >
              {(Object.keys(NOMBRE_EFECTO_DE_DANO) as DamageModifier["effect"][]).map((k) => (
                <option key={k} value={k}>
                  {NOMBRE_EFECTO_DE_DANO[k]}
                </option>
              ))}
            </select>
            <input
              className={fieldControlClass + " w-64"}
              aria-label={`Salvedad del modificador ${i + 1}`}
              placeholder="Salvedad, si la hay (opcional)"
              value={m.note ?? ""}
              maxLength={300}
              onChange={(e) =>
                onCambiar(
                  filas.map((x, j) => (j === i ? { ...x, note: e.target.value || undefined } : x)),
                )
              }
            />
            <Button
              type="button"
              variant="ghost"
              aria-label={`Quitar el modificador de daño ${i + 1}`}
              onClick={() => onCambiar(filas.filter((_, j) => j !== i))}
            >
              Quitar
            </Button>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="secondary"
        className="mt-s2"
        onClick={() => onCambiar([...filas, { damageType: "FIRE", effect: "RESIST" }])}
      >
        Añadir un modificador
      </Button>
    </fieldset>
  );
}

export function EditorDeStatblock({
  abierto,
  statblock,
  guardando,
  error,
  onGuardar,
  onCerrar,
}: {
  abierto: boolean;
  /** La criatura que se edita, o nada para escribir una nueva. */
  statblock?: Statblock & { visibility?: Visibility };
  guardando: boolean;
  error?: string;
  onGuardar: (input: CreateCampaignStatblockInput) => void;
  onCerrar: () => void;
}) {
  // El borrador se inicializa **una sola vez**: quien monta este componente lo remonta con
  // `key` al cambiar de criatura, igual que hace `PanelDeReglas` con su editor.
  const [b, setB] = useState<CreateCampaignStatblockInput>(() =>
    statblock ? borradorDe(statblock) : borradorVacio(),
  );

  const pgMedios = pgMediosDe(b);
  const dado = dadoDeGolpeDe(b);

  return (
    <Dialog
      open={abierto}
      onClose={onCerrar}
      size="xl"
      title={statblock ? `Editar ${statblock.name}` : "Escribir una criatura"}
      subtitulo="Nace solo para ti. Preparar la mazmorra no puede ser filtrarla: súbele la visibilidad cuando la mesa la conozca."
      acciones={
        <div className="flex flex-wrap items-center gap-s2">
          <Button
            type="button"
            variant="primary"
            disabled={!b.name.trim() || guardando}
            onClick={() => {
              const limpio = { ...b, name: b.name.trim() };
              // **Al editar, la visibilidad NO se manda.** El servidor no la devuelve:
              // `aStatblock()` (`statblocks.service.ts:184`) no incluye el campo, así que este
              // formulario no sabe cuál es la actual. Mandar el valor por defecto pisaría una
              // criatura que el DM ya había enseñado a la mesa y la volvería a esconder sin
              // decir nada. `updateCampaignStatblockSchema` es `.partial()`, así que omitirlo
              // la deja como está — que es lo único honesto mientras no llegue en la lectura.
              // Queda como hueco declarado en el informe del carril.
              if (statblock) delete (limpio as { visibility?: Visibility }).visibility;
              onGuardar(limpio);
            }}
          >
            {statblock ? "Guardar los cambios" : "Guardar la criatura"}
          </Button>
          <Button type="button" variant="ghost" onClick={onCerrar}>
            Cancelar
          </Button>
          {error && (
            <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
              {error}
            </p>
          )}
        </div>
      }
    >
      <div className="space-y-s3">
        <Field label="Cómo se llama">
          <input
            className={fieldControlClass}
            value={b.name}
            maxLength={120}
            onChange={(e) => setB({ ...b, name: e.target.value })}
          />
        </Field>

        <div className="grid gap-s2 sm:grid-cols-2">
          <Field label="Tamaño" hint="De aquí sale el dado de golpe, no de un campo aparte.">
            <select
              className={fieldControlClass}
              value={b.size}
              onChange={(e) => setB({ ...b, size: e.target.value as CreatureSize })}
            >
              {CREATURE_SIZES.map((k) => (
                <option key={k} value={k}>
                  {NOMBRE_TAMANO[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Qué es">
            <select
              className={fieldControlClass}
              value={b.type}
              onChange={(e) => setB({ ...b, type: e.target.value as CreatureType })}
            >
              {CREATURE_TYPES.map((k) => (
                <option key={k} value={k}>
                  {NOMBRE_TIPO_CRIATURA[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Subtipo (opcional)">
            <input
              className={fieldControlClass}
              value={b.subtype ?? ""}
              maxLength={120}
              onChange={(e) => setB({ ...b, subtype: e.target.value || undefined })}
            />
          </Field>
          <Field label="Alineamiento (opcional)">
            <input
              className={fieldControlClass}
              value={b.alignment ?? ""}
              maxLength={120}
              onChange={(e) => setB({ ...b, alignment: e.target.value || undefined })}
            />
          </Field>
        </div>

        <div className="grid gap-s2 sm:grid-cols-4">
          <Field label="Clase de Armadura">
            <input
              type="number"
              className={fieldControlClass}
              value={b.ac}
              min={0}
              max={40}
              onChange={(e) => setB({ ...b, ac: Number(e.target.value) })}
            />
          </Field>
          <Field label="Dados de golpe">
            <input
              type="number"
              className={fieldControlClass}
              value={b.hitDiceCount}
              min={1}
              max={60}
              onChange={(e) => setB({ ...b, hitDiceCount: Number(e.target.value) })}
            />
          </Field>
          <Field label="Velocidad al andar (pies)">
            <input
              type="number"
              className={fieldControlClass}
              value={b.speeds.walk ?? 0}
              min={0}
              max={1000}
              onChange={(e) =>
                setB({ ...b, speeds: { ...b.speeds, walk: Number(e.target.value) } })
              }
            />
          </Field>
          <Field label="Valor de desafío">
            <select
              className={fieldControlClass}
              value={String(b.cr)}
              onChange={(e) => setB({ ...b, cr: Number(e.target.value) })}
            >
              {VALORES_DE_DESAFIO.map((v) => (
                <option key={v} value={String(v)}>
                  {vdLegible(v)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field
          label="Por qué esa CA (opcional)"
          hint="El paréntesis del libro: «armadura natural»."
        >
          <input
            className={fieldControlClass}
            value={b.acNote ?? ""}
            maxLength={200}
            onChange={(e) => setB({ ...b, acNote: e.target.value || undefined })}
          />
        </Field>

        <fieldset className="rounded-radius-sm border border-muted p-s2">
          <legend className="px-1 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
            Características
          </legend>
          <div className="grid grid-cols-3 gap-s2 sm:grid-cols-6">
            {ABILIDADES.map((k) => (
              <label key={k} className="font-chrome text-chrome-xs text-muted">
                {NOMBRE_CARACTERISTICA[k]}
                <input
                  type="number"
                  className={fieldControlClass}
                  min={1}
                  max={30}
                  value={b.abilities[k]}
                  onChange={(e) =>
                    setB({ ...b, abilities: { ...b.abilities, [k]: Number(e.target.value) } })
                  }
                />
              </label>
            ))}
          </div>
        </fieldset>

        {/* **Los números derivados, mientras escribes.** No se guardan: se calculan con las
            mismas funciones del esquema compartido que usa el servidor, así que aquí no hay una
            segunda fórmula que pueda discrepar. */}
        <p className="font-chrome text-chrome-sm text-muted">
          Con esto, la criatura tiene{" "}
          <span className="font-data text-text">{pgMedios} puntos de golpe</span> y tira{" "}
          <span className="font-data text-text">
            {b.hitDiceCount}d{dado}
          </span>{" "}
          si prefieres tirárselos.
        </p>

        <ModificadoresDeDano
          filas={b.damageModifiers ?? []}
          onCambiar={(filas) => setB({ ...b, damageModifiers: filas })}
        />

        <ListaDeProsa
          titulo="Rasgos"
          filas={b.traits}
          onCambiar={(filas) => setB({ ...b, traits: filas })}
        />
        <ListaDeProsa
          titulo="Acciones"
          filas={b.actions}
          onCambiar={(filas) => setB({ ...b, actions: filas })}
        />

        <Field label="Idiomas (opcional)">
          <input
            className={fieldControlClass}
            value={b.languages ?? ""}
            maxLength={400}
            onChange={(e) => setB({ ...b, languages: e.target.value || undefined })}
          />
        </Field>

        {statblock ? (
          <p className="font-chrome text-chrome-sm text-muted">
            Quién la ve no se toca desde aquí: el servidor no manda ese dato al leer la criatura,
            así que este formulario no puede decir cuál es sin arriesgarse a cambiarla. Se queda
            exactamente como estaba.
          </p>
        ) : (
          <Field label="Quién la ve" hint={EXPLICACION_DE_NIVEL[b.visibility ?? "DM_ONLY"]}>
            <select
              className={fieldControlClass}
              value={b.visibility ?? "DM_ONLY"}
              onChange={(e) => setB({ ...b, visibility: e.target.value as Visibility })}
            >
              {(Object.keys(EXPLICACION_DE_NIVEL) as Visibility[]).map((v) => (
                <option key={v} value={v}>
                  {v === "DM_ONLY"
                    ? "Solo yo"
                    : v === "OWNER_DM"
                      ? "Yo y quien la creó"
                      : v === "SPECIFIC_PLAYERS"
                        ? "Solo algunos jugadores"
                        : v === "PLAYERS"
                          ? "Toda la mesa"
                          : "Toda la mesa (público)"}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
    </Dialog>
  );
}
