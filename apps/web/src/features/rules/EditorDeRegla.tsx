import { useState } from "react";
import { createRuleSchema, type CreateRuleInput } from "@dnd/shared";
import { Button, Dialog, Field, fieldControlClass } from "../../ui";
import type { Entity } from "../entities/api";
import type { RuleRow } from "./api";
import {
  borradorDesde,
  condicionPorDefecto,
  efectoPorDefecto,
  type BorradorDeRegla,
} from "./formularios";
import { ModoDeRegla } from "./ModoDeRegla";
import { EditorDeCondicion, EditorDeDisparador, EditorDeEfecto } from "./PiezasDeRegla";

// Tarea 2A.17 — crear y editar una regla: CUANDO / SI / ENTONCES.
//
// **La validación es Zod desde `@dnd/shared`** (docs/04-convenciones.md): el botón de guardar
// pasa el borrador por `createRuleSchema`, el mismo esquema que corre en la API, en vez de
// inventarse aquí una lista de comprobaciones que se desincronice. Esto **no** es control de
// acceso ni sustituye a la validación del servidor: es cortesía para no mandar un 400 seguro.

/** Los topes que el propio esquema declara — se citan en pantalla, no se reimplementan. */
const MAX_CONDICIONES = 10;
const MAX_EFECTOS = 10;

export function EditorDeRegla({
  abierto,
  regla,
  entities,
  reglas,
  guardando,
  error,
  onGuardar,
  onCerrar,
}: {
  abierto: boolean;
  /** Sin regla: se crea una nueva. Con regla: se edita ésa. */
  regla?: RuleRow;
  entities: Entity[];
  reglas: RuleRow[];
  guardando: boolean;
  error?: string;
  onGuardar: (input: CreateRuleInput) => void;
  onCerrar: () => void;
}) {
  const [borrador, setBorrador] = useState<BorradorDeRegla>(() => borradorDesde(regla));
  const [intentado, setIntentado] = useState(false);

  // Remontar el diálogo con una regla distinta tiene que recargar el borrador. `key` en el sitio
  // de uso es lo que lo garantiza; aquí solo se guarda el valor inicial.
  const analisis = createRuleSchema.safeParse(borrador);
  const problemas = analisis.success
    ? []
    : analisis.error.issues.map((issue) => `${issue.path.join(".") || "regla"}: ${issue.message}`);

  function enviar() {
    setIntentado(true);
    if (!analisis.success) return;
    onGuardar(analisis.data);
  }

  const otrasReglas = reglas.filter((r) => r.id !== regla?.id);

  return (
    <Dialog
      open={abierto}
      onClose={onCerrar}
      size="lg"
      title={regla ? `Editar «${regla.name}»` : "Nueva regla"}
    >
      <div className="space-y-s4">
        <Field label="Nombre de la regla">
          <input
            className={fieldControlClass}
            value={borrador.name}
            maxLength={160}
            onChange={(e) => setBorrador({ ...borrador, name: e.target.value })}
          />
        </Field>

        <section className="rounded-radius-sm border border-copper/40 p-s3">
          <h3 className="mb-s2 font-title text-chrome-md text-text">Cuando</h3>
          <EditorDeDisparador
            value={borrador.trigger}
            entities={entities}
            onChange={(trigger) => setBorrador({ ...borrador, trigger })}
          />
        </section>

        <section className="rounded-radius-sm border border-copper/40 p-s3">
          <h3 className="mb-s2 font-title text-chrome-md text-text">Si</h3>
          <p className="mb-s2 font-chrome text-chrome-xs text-muted">
            Sin condiciones, la regla se dispara siempre que llegue su suceso. Es legítimo.
          </p>
          <div className="space-y-s3">
            {borrador.conditions.map((condicion, i) => (
              <div key={i} className="rounded-radius-sm border border-muted/50 p-s2">
                <div className="mb-s2 flex items-center justify-between">
                  <span className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
                    Condición {i + 1}
                  </span>
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() =>
                      setBorrador({
                        ...borrador,
                        conditions: borrador.conditions.filter((_, j) => j !== i),
                      })
                    }
                  >
                    Quitar
                  </Button>
                </div>
                <EditorDeCondicion
                  value={condicion}
                  onChange={(nueva) =>
                    setBorrador({
                      ...borrador,
                      conditions: borrador.conditions.map((c, j) => (j === i ? nueva : c)),
                    })
                  }
                />
              </div>
            ))}
          </div>
          <Button
            variant="secondary"
            type="button"
            className="mt-s2"
            disabled={borrador.conditions.length >= MAX_CONDICIONES}
            onClick={() =>
              setBorrador({
                ...borrador,
                conditions: [...borrador.conditions, condicionPorDefecto("FLAG_IS")],
              })
            }
          >
            Añadir condición
          </Button>
          {borrador.conditions.length >= MAX_CONDICIONES && (
            <p className="mt-1 font-chrome text-chrome-xs text-muted">
              Diez condiciones es el tope que admite el servidor.
            </p>
          )}
        </section>

        <section className="rounded-radius-sm border border-copper/40 p-s3">
          <h3 className="mb-s2 font-title text-chrome-md text-text">Entonces</h3>
          <div className="space-y-s3">
            {borrador.effects.map((efecto, i) => (
              <div key={i} className="rounded-radius-sm border border-muted/50 p-s2">
                <div className="mb-s2 flex items-center justify-between">
                  <span className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
                    Efecto {i + 1}
                  </span>
                  <Button
                    variant="ghost"
                    type="button"
                    disabled={borrador.effects.length <= 1}
                    onClick={() =>
                      setBorrador({
                        ...borrador,
                        effects: borrador.effects.filter((_, j) => j !== i),
                      })
                    }
                  >
                    Quitar
                  </Button>
                </div>
                <EditorDeEfecto
                  value={efecto}
                  entities={entities}
                  reglas={otrasReglas}
                  onChange={(nuevo) =>
                    setBorrador({
                      ...borrador,
                      effects: borrador.effects.map((e, j) => (j === i ? nuevo : e)),
                    })
                  }
                />
              </div>
            ))}
          </div>
          <Button
            variant="secondary"
            type="button"
            className="mt-s2"
            disabled={borrador.effects.length >= MAX_EFECTOS}
            onClick={() =>
              setBorrador({
                ...borrador,
                effects: [...borrador.effects, efectoPorDefecto("SET_FLAG")],
              })
            }
          >
            Añadir efecto
          </Button>
        </section>

        <ModoDeRegla
          value={borrador.mode}
          onChange={(mode) => setBorrador({ ...borrador, mode })}
        />

        <Field
          label="Tope de disparos (opcional)"
          hint="En blanco, sin tope. Existe como contención, no como regla del juego."
        >
          <input
            type="number"
            min={1}
            max={9999}
            className={fieldControlClass}
            value={borrador.maxFires ?? ""}
            onChange={(e) =>
              setBorrador({
                ...borrador,
                maxFires: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </Field>

        {intentado && problemas.length > 0 && (
          <div role="alert" className="rounded-radius-sm border border-danger p-s2">
            <p className="font-chrome text-chrome-sm text-danger-text">
              La regla todavía no está completa:
            </p>
            <ul className="mt-1 list-disc pl-s5 font-chrome text-chrome-xs text-danger-text">
              {problemas.map((problema, i) => (
                <li key={i}>{problema}</li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-s2">
          <Button variant="secondary" type="button" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="button" disabled={guardando} onClick={enviar}>
            {guardando ? "Guardando…" : "Guardar regla"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
