import { useId } from "react";
import type { RuleCondition, RuleEffect, RuleTrigger, Visibility } from "@dnd/shared";
import { Badge, Field, fieldControlClass } from "../../ui";
import { EXPLICACION_DE_NIVEL } from "../entities/visibilidad";
import type { Entity } from "../entities/api";
import {
  NIVELES_DE_VISIBILIDAD,
  RESULTADOS_DE_TIRADA,
  TIPOS_DE_MIEMBRO,
  condicionPorDefecto,
  disparadorPorDefecto,
  efectoPorDefecto,
} from "./formularios";
import {
  CONDICIONES,
  DISPARADORES,
  EFECTOS,
  NOMBRE_ACCION_CONJUNTO,
  NOMBRE_AUDIENCIA,
  NOMBRE_RESULTADO_TIRADA,
  NOMBRE_TIPO_MIEMBRO,
  nombreCondicion,
  nombreDisparador,
  nombreEfecto,
  traducir,
} from "./vocabulario";

// Tarea 2A.17 — las tres piezas de la frase CUANDO / SI / ENTONCES.
//
// **El vocabulario es cerrado y estos formularios lo respetan literalmente**: las opciones de
// los tres desplegables salen de `DISPARADORES`, `CONDICIONES` y `EFECTOS`, que a su vez salen
// de las uniones discriminadas de `@dnd/shared`. No hay forma de ofrecer aquí un valor que el
// servidor no acepte, porque la lista no está escrita aquí.
//
// **Nada de reglas del servidor reimplementadas.** Estos componentes recogen datos; quien
// decide si la regla vale es `createRuleSchema` (el mismo esquema que corre en la API) y, al
// final, la API misma.

/** Selector de ficha del mundo. La regla fija **el identificador**, no una consulta. */
function SelectorDeFicha({
  etiqueta,
  value,
  entities,
  onChange,
}: {
  etiqueta: string;
  value: string;
  entities: Entity[];
  onChange: (id: string) => void;
}) {
  const guardadaFueraDeLista = value !== "" && !entities.some((e) => e.id === value);
  return (
    <Field
      label={etiqueta}
      hint="La entrada queda fijada al armar la regla, por identificador. No cambia sola."
    >
      <select
        className={fieldControlClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Elige una entrada…</option>
        {entities.map((entidad) => (
          <option key={entidad.id} value={entidad.id}>
            {entidad.name}
          </option>
        ))}
        {/* Un valor guardado que la lista no ofrece se muestra, marcado y no seleccionable:
            nunca desaparece en silencio (docs/04-convenciones.md). */}
        {guardadaFueraDeLista && (
          <option value={value} disabled>
            Ficha guardada que ya no está en la lista ({value})
          </option>
        )}
      </select>
    </Field>
  );
}

/**
 * Los cinco niveles de visibilidad como radios con su explicación — una opción con significado
 * no se esconde en un desplegable. El `name` lleva un identificador propio para que dos efectos
 * en la misma pantalla no compartan grupo de radios.
 */
function SelectorDeVisibilidad({
  value,
  onChange,
}: {
  value: Visibility;
  onChange: (v: Visibility) => void;
}) {
  const grupo = useId();
  return (
    <fieldset className="rounded-radius-sm border border-muted/60 p-s2">
      <legend className="px-1 font-chrome text-chrome-xs text-text">Con qué visibilidad</legend>
      <div className="space-y-0.5">
        {NIVELES_DE_VISIBILIDAD.map((nivel) => (
          <label
            key={nivel}
            className={[
              "flex cursor-pointer items-start gap-s2 rounded-radius-sm border px-s2 py-1 transition-colors",
              value === nivel
                ? "border-accent bg-accent/10"
                : "border-transparent hover:bg-surface",
            ].join(" ")}
          >
            <input
              type="radio"
              name={grupo}
              value={nivel}
              checked={value === nivel}
              onChange={() => onChange(nivel)}
              className="mt-1 accent-[var(--accent)]"
            />
            <span className="min-w-0">
              <Badge visibility={nivel} />
              <span className="mt-0.5 block font-chrome text-chrome-xs leading-snug text-muted">
                {EXPLICACION_DE_NIVEL[nivel]}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// ---------------------------------------------------------------------------------------------
// CUANDO
// ---------------------------------------------------------------------------------------------

export function EditorDeDisparador({
  value,
  entities,
  onChange,
}: {
  value: RuleTrigger;
  entities: Entity[];
  onChange: (t: RuleTrigger) => void;
}) {
  return (
    <div className="space-y-s3">
      <Field label="Cuando">
        <select
          className={fieldControlClass}
          value={value.kind}
          // Cambiar de clase reconstruye el objeto: fusionar dejaría campos de la clase
          // anterior que el esquema del servidor rechaza.
          onChange={(e) => onChange(disparadorPorDefecto(e.target.value as RuleTrigger["kind"]))}
        >
          {DISPARADORES.map((kind) => (
            <option key={kind} value={kind}>
              {nombreDisparador(kind)}
            </option>
          ))}
        </select>
      </Field>

      {(value.kind === "ENTITY_OPENED" ||
        value.kind === "ENTITY_COMMENTED" ||
        value.kind === "ENTITY_REVEALED" ||
        value.kind === "DM_EXECUTED" ||
        value.kind === "ENTITY_ATTACKED") && (
        <SelectorDeFicha
          etiqueta="Qué entrada del mundo"
          value={value.entityId}
          entities={entities}
          onChange={(entityId) => onChange({ ...value, entityId })}
        />
      )}

      {(value.kind === "FLAG_SET" || value.kind === "SIGNAL_RAISED") && (
        <Field
          label={value.kind === "FLAG_SET" ? "Nombre de la marca" : "Nombre de la señal"}
          hint="Lo eliges tú: es tu vocabulario, no el del motor."
        >
          <input
            className={fieldControlClass}
            value={value.key}
            maxLength={60}
            onChange={(e) => onChange({ ...value, key: e.target.value })}
          />
        </Field>
      )}

      {value.kind === "ENTITY_LINKED" && (
        <div className="grid gap-s3 sm:grid-cols-2">
          <SelectorDeFicha
            etiqueta="Desde"
            value={value.fromId}
            entities={entities}
            onChange={(fromId) => onChange({ ...value, fromId })}
          />
          <SelectorDeFicha
            etiqueta="Hasta"
            value={value.toId}
            entities={entities}
            onChange={(toId) => onChange({ ...value, toId })}
          />
        </div>
      )}

      {value.kind === "ABILITY_ROLL" && (
        <div className="grid gap-s3 sm:grid-cols-2">
          <Field label="Habilidad (opcional)" hint="En blanco: cualquier habilidad.">
            <input
              className={fieldControlClass}
              value={value.skill ?? ""}
              maxLength={60}
              onChange={(e) =>
                onChange({ ...value, skill: e.target.value === "" ? undefined : e.target.value })
              }
            />
          </Field>
          <Field label="Con qué resultado">
            <select
              className={fieldControlClass}
              value={value.outcome}
              onChange={(e) =>
                onChange({ ...value, outcome: e.target.value as typeof value.outcome })
              }
            >
              {RESULTADOS_DE_TIRADA.map((resultado) => (
                <option key={resultado} value={resultado}>
                  {traducir(NOMBRE_RESULTADO_TIRADA, resultado)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// SI
// ---------------------------------------------------------------------------------------------

export function EditorDeCondicion({
  value,
  onChange,
}: {
  value: RuleCondition;
  onChange: (c: RuleCondition) => void;
}) {
  return (
    <div className="space-y-s2">
      <Field label="Condición">
        <select
          className={fieldControlClass}
          value={value.kind}
          onChange={(e) => onChange(condicionPorDefecto(e.target.value as RuleCondition["kind"]))}
        >
          {CONDICIONES.map((kind) => (
            <option key={kind} value={kind}>
              {nombreCondicion(kind)}
            </option>
          ))}
        </select>
      </Field>

      {value.kind === "FLAG_IS" && (
        <div className="grid gap-s2 sm:grid-cols-2">
          <Field label="Marca">
            <input
              className={fieldControlClass}
              value={value.key}
              maxLength={60}
              onChange={(e) => onChange({ ...value, key: e.target.value })}
            />
          </Field>
          <Field label="Tiene que estar">
            <select
              className={fieldControlClass}
              value={value.value ? "si" : "no"}
              onChange={(e) => onChange({ ...value, value: e.target.value === "si" })}
            >
              <option value="si">Puesta</option>
              <option value="no">Quitada</option>
            </select>
          </Field>
        </div>
      )}

      {value.kind === "SET_SIZE_AT_LEAST" && (
        <div className="grid gap-s2 sm:grid-cols-2">
          <Field label="Conjunto">
            <input
              className={fieldControlClass}
              value={value.setKey}
              maxLength={60}
              onChange={(e) => onChange({ ...value, setKey: e.target.value })}
            />
          </Field>
          <Field label="Al menos">
            <input
              type="number"
              min={1}
              max={999}
              className={fieldControlClass}
              value={value.count}
              onChange={(e) => onChange({ ...value, count: Number(e.target.value) })}
            />
          </Field>
        </div>
      )}

      {value.kind === "IS_IN_SET" && (
        <div className="grid gap-s2 sm:grid-cols-3">
          <Field label="Conjunto">
            <input
              className={fieldControlClass}
              value={value.setKey}
              maxLength={60}
              onChange={(e) => onChange({ ...value, setKey: e.target.value })}
            />
          </Field>
          <Field label="Tipo de miembro">
            <select
              className={fieldControlClass}
              value={value.memberType}
              onChange={(e) =>
                onChange({ ...value, memberType: e.target.value as typeof value.memberType })
              }
            >
              {TIPOS_DE_MIEMBRO.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {traducir(NOMBRE_TIPO_MIEMBRO, tipo)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Identificador del miembro">
            <input
              className={fieldControlClass}
              value={value.memberId}
              maxLength={60}
              onChange={(e) => onChange({ ...value, memberId: e.target.value })}
            />
          </Field>
        </div>
      )}

      {value.kind === "SUBJECT_HAS_TAG" && (
        <Field label="Etiqueta">
          <input
            className={fieldControlClass}
            value={value.tag}
            maxLength={60}
            onChange={(e) => onChange({ ...value, tag: e.target.value })}
          />
        </Field>
      )}

      {value.kind === "REVEALED_WITH_TAG_AT_LEAST" && (
        <div className="grid gap-s2 sm:grid-cols-2">
          <Field label="Etiqueta">
            <input
              className={fieldControlClass}
              value={value.tag}
              maxLength={60}
              onChange={(e) => onChange({ ...value, tag: e.target.value })}
            />
          </Field>
          <Field label="Al menos">
            <input
              type="number"
              min={1}
              max={999}
              className={fieldControlClass}
              value={value.count}
              onChange={(e) => onChange({ ...value, count: Number(e.target.value) })}
            />
          </Field>
        </div>
      )}

      {value.kind === "SESSION_NUMBER_AT_LEAST" && (
        <Field label="Número de sesión">
          <input
            type="number"
            min={1}
            max={999}
            className={fieldControlClass}
            value={value.count}
            onChange={(e) => onChange({ ...value, count: Number(e.target.value) })}
          />
        </Field>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// ENTONCES
// ---------------------------------------------------------------------------------------------

export function EditorDeEfecto({
  value,
  entities,
  reglas,
  onChange,
}: {
  value: RuleEffect;
  entities: Entity[];
  /** Las demás reglas de la campaña, para `SET_RULE_ARMED`. */
  reglas: { id: string; name: string }[];
  onChange: (e: RuleEffect) => void;
}) {
  return (
    <div className="space-y-s2">
      <Field label="Efecto">
        <select
          className={fieldControlClass}
          value={value.kind}
          onChange={(e) => onChange(efectoPorDefecto(e.target.value as RuleEffect["kind"]))}
        >
          {EFECTOS.map((kind) => (
            <option key={kind} value={kind}>
              {nombreEfecto(kind)}
            </option>
          ))}
        </select>
      </Field>

      {(value.kind === "REVEAL_ENTITY" || value.kind === "HIDE_ENTITY") && (
        <div className="space-y-s2">
          <SelectorDeFicha
            etiqueta="Qué entrada del mundo"
            value={value.entityId}
            entities={entities}
            onChange={(entityId) => onChange({ ...value, entityId })}
          />
          <SelectorDeVisibilidad
            value={value.visibility}
            onChange={(visibility) => onChange({ ...value, visibility })}
          />
        </div>
      )}

      {value.kind === "SET_FLAG" && (
        <div className="grid gap-s2 sm:grid-cols-2">
          <Field label="Marca">
            <input
              className={fieldControlClass}
              value={value.key}
              maxLength={60}
              onChange={(e) => onChange({ ...value, key: e.target.value })}
            />
          </Field>
          <Field label="Dejarla">
            <select
              className={fieldControlClass}
              value={value.value ? "si" : "no"}
              onChange={(e) => onChange({ ...value, value: e.target.value === "si" })}
            >
              <option value="si">Puesta</option>
              <option value="no">Quitada</option>
            </select>
          </Field>
        </div>
      )}

      {value.kind === "CHANGE_SET_MEMBER" && (
        <div className="grid gap-s2 sm:grid-cols-2">
          <Field label="Conjunto">
            <input
              className={fieldControlClass}
              value={value.setKey}
              maxLength={60}
              onChange={(e) => onChange({ ...value, setKey: e.target.value })}
            />
          </Field>
          <Field label="Acción">
            <select
              className={fieldControlClass}
              value={value.action}
              onChange={(e) =>
                onChange({ ...value, action: e.target.value as typeof value.action })
              }
            >
              {(["ADD", "REMOVE"] as const).map((accion) => (
                <option key={accion} value={accion}>
                  {traducir(NOMBRE_ACCION_CONJUNTO, accion)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipo de miembro">
            <select
              className={fieldControlClass}
              value={value.memberType}
              onChange={(e) =>
                onChange({ ...value, memberType: e.target.value as typeof value.memberType })
              }
            >
              {TIPOS_DE_MIEMBRO.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {traducir(NOMBRE_TIPO_MIEMBRO, tipo)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Identificador del miembro">
            <input
              className={fieldControlClass}
              value={value.memberId}
              maxLength={60}
              onChange={(e) => onChange({ ...value, memberId: e.target.value })}
            />
          </Field>
        </div>
      )}

      {value.kind === "RAISE_SIGNAL" && (
        <Field
          label="Señal"
          hint="El radio de una señal solo actúa con mapa, que es una fase posterior: hoy alcanza a quien otra regla diga explícitamente."
        >
          <input
            className={fieldControlClass}
            value={value.key}
            maxLength={60}
            onChange={(e) => onChange({ ...value, key: e.target.value })}
          />
        </Field>
      )}

      {value.kind === "NOTIFY" && (
        <div className="space-y-s2">
          <Field label="A quién">
            <select
              className={fieldControlClass}
              value={value.audience}
              onChange={(e) =>
                onChange({ ...value, audience: e.target.value as typeof value.audience })
              }
            >
              {(["PLAYERS", "DM"] as const).map((audiencia) => (
                <option key={audiencia} value={audiencia}>
                  {traducir(NOMBRE_AUDIENCIA, audiencia)}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Mensaje"
            hint="Hoy queda escrito en la traza, pero todavía no llega a la bandeja de notificaciones."
          >
            <input
              className={fieldControlClass}
              value={value.message}
              maxLength={280}
              onChange={(e) => onChange({ ...value, message: e.target.value })}
            />
          </Field>
        </div>
      )}

      {value.kind === "ADD_SESSION_NOTE" && (
        <Field label="Nota" hint="Sin sesión en curso no hay dónde anotar; no es un error.">
          <textarea
            rows={2}
            className={fieldControlClass}
            value={value.note}
            maxLength={1000}
            onChange={(e) => onChange({ ...value, note: e.target.value })}
          />
        </Field>
      )}

      {value.kind === "SET_RULE_ARMED" && (
        <div className="grid gap-s2 sm:grid-cols-2">
          <Field label="Qué regla">
            <select
              className={fieldControlClass}
              value={value.ruleId}
              onChange={(e) => onChange({ ...value, ruleId: e.target.value })}
            >
              <option value="">Elige una regla…</option>
              {reglas.map((regla) => (
                <option key={regla.id} value={regla.id}>
                  {regla.name}
                </option>
              ))}
              {value.ruleId !== "" && !reglas.some((r) => r.id === value.ruleId) && (
                <option value={value.ruleId} disabled>
                  Regla guardada que ya no está en la lista ({value.ruleId})
                </option>
              )}
            </select>
          </Field>
          <Field label="Dejarla">
            <select
              className={fieldControlClass}
              value={value.armed ? "si" : "no"}
              onChange={(e) => onChange({ ...value, armed: e.target.value === "si" })}
            >
              <option value="si">Armada</option>
              <option value="no">Desarmada</option>
            </select>
          </Field>
        </div>
      )}
    </div>
  );
}
