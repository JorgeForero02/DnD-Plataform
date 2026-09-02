import { useState } from "react";
import type { CreateRuleInput, RuleCondition, RuleEffect, RuleTrigger } from "@dnd/shared";
import { Button, Dialog, Field, fieldControlClass } from "../../ui";
import type { Entity } from "../entities/api";
import type { RuleRow } from "./api";
import { CajaColocada, CarrilDeCajas, PaletaDeCajas } from "./CajasDeRegla";
import {
  borradorDesde,
  condicionPorDefecto,
  disparadorPorDefecto,
  efectoPorDefecto,
  revisarBorrador,
  type BorradorDeRegla,
} from "./formularios";
import { ModoDeRegla } from "./ModoDeRegla";
import { CamposDeCondicion, CamposDeDisparador, CamposDeEfecto } from "./PiezasDeRegla";
import { CARRIL_DE_PARTE, nombreDePieza, type ParteDeRegla } from "./vocabulario";

// Tareas R1 y R4 — crear y editar una regla arrastrando cajas a carriles fijos.
//
// **Qué se tiró y por qué.** Los tres desplegables («Cuando», «Condición», «Efecto») se han
// ido. No estaban mal escritos: estaban mal planteados. Los tres se veían iguales, así que la
// pantalla no decía en ninguna parte que un suceso y una condición son cosas distintas —el
// malentendido número uno de este tipo de editores— y elegir una clase era un gesto invisible
// que no dejaba rastro en pantalla. El DM del autor lo probó y no entendió nada.
//
// **Qué se conservó.** Todo lo que ya era correcto: los campos de cada clase
// (`PiezasDeRegla.tsx`, ahora partidos en `CamposDe…`), el vocabulario en español
// (`vocabulario.ts`), el modo propuesta (`ModoDeRegla.tsx`) y la validación con el mismo
// esquema que corre en la API. Lo que cambió es cómo se elige una pieza, no qué se puede
// elegir: el vocabulario sigue siendo exactamente el cerrado de `@dnd/shared`.
//
// **La validación sigue siendo Zod desde `@dnd/shared`** (docs/04-convenciones.md), y sigue sin
// ser control de acceso: quien decide de verdad es la API.

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
  // Colocar con el teclado no mueve nada por la pantalla, así que hay que decir lo que pasó.
  const [aviso, setAviso] = useState("");

  // Remontar el diálogo con una regla distinta tiene que recargar el borrador. `key` en el sitio
  // de uso es lo que lo garantiza; aquí solo se guarda el valor inicial.
  const revision = revisarBorrador(borrador);

  function enviar() {
    setIntentado(true);
    if (!revision.entrada) return;
    onGuardar(revision.entrada);
  }

  /**
   * La única puerta por la que entra una caja al carril, la use el ratón o el teclado. Que las
   * dos rutas compartan esta función es lo que hace que probar una pruebe la otra.
   */
  function colocar(parte: ParteDeRegla, clave: string) {
    if (parte === "SUCESO") {
      const anterior = borrador.trigger;
      setBorrador({ ...borrador, trigger: disparadorPorDefecto(clave as RuleTrigger["kind"]) });
      setAviso(
        anterior
          ? `«${nombreDePieza(clave)}» sustituye a «${nombreDePieza(anterior.kind)}» en el carril «${CARRIL_DE_PARTE.SUCESO}». Un suceso por regla.`
          : `«${nombreDePieza(clave)}» colocado en el carril «${CARRIL_DE_PARTE.SUCESO}».`,
      );
      return;
    }
    if (parte === "ESTADO") {
      if (borrador.conditions.length >= MAX_CONDICIONES) return;
      setBorrador({
        ...borrador,
        conditions: [...borrador.conditions, condicionPorDefecto(clave as RuleCondition["kind"])],
      });
      setAviso(`«${nombreDePieza(clave)}» colocado en el carril «${CARRIL_DE_PARTE.ESTADO}».`);
      return;
    }
    if (borrador.effects.length >= MAX_EFECTOS) return;
    setBorrador({
      ...borrador,
      effects: [...borrador.effects, efectoPorDefecto(clave as RuleEffect["kind"])],
    });
    setAviso(`«${nombreDePieza(clave)}» colocado en el carril «${CARRIL_DE_PARTE.ACCION}».`);
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
        <p className="font-chrome text-chrome-sm leading-snug text-muted">
          Una regla es una frase de tres partes. Arrastra una caja de la paleta al carril que le
          toca, o púlsala y cae sola.{" "}
          <strong className="text-text">La ranura es la conexión</strong>: lo que está dentro de un
          carril forma parte de la regla, y lo que está fuera, no.
        </p>

        <Field label="Nombre de la regla">
          <input
            className={fieldControlClass}
            value={borrador.name}
            maxLength={160}
            onChange={(e) => setBorrador({ ...borrador, name: e.target.value })}
          />
        </Field>

        <section
          aria-label="Paleta de piezas"
          className="rounded-radius-sm border border-copper/40 p-s3"
        >
          <h3 className="font-title text-chrome-md text-text">Paleta</h3>
          <p className="mb-s3 mt-1 font-chrome text-chrome-xs leading-snug text-muted">
            Todo lo que el motor entiende, sin nada escondido. Cada pieza tiene la forma y el color
            de su carril: la forma dice dónde encaja antes de que lo intentes.
          </p>
          <PaletaDeCajas
            topes={{
              ESTADO:
                borrador.conditions.length >= MAX_CONDICIONES
                  ? "Diez condiciones es el tope que admite el servidor. Quita una para poder poner otra."
                  : undefined,
              ACCION:
                borrador.effects.length >= MAX_EFECTOS
                  ? "Diez acciones es el tope que admite el servidor. Quita una para poder poner otra."
                  : undefined,
            }}
            onColocar={colocar}
          />
        </section>

        {/* Lo que se coloca con el teclado no se ve moverse: se dice. */}
        <p aria-live="polite" className="font-chrome text-chrome-xs text-muted">
          {aviso}
        </p>

        <CarrilDeCajas
          parte="SUCESO"
          vacio={borrador.trigger === null}
          onSoltar={(clave) => colocar("SUCESO", clave)}
        >
          {borrador.trigger && (
            <CajaColocada
              parte="SUCESO"
              clave={borrador.trigger.kind}
              onQuitar={() => {
                setAviso(
                  `Carril «${CARRIL_DE_PARTE.SUCESO}» vacío otra vez. Sin suceso, la regla no se despierta.`,
                );
                setBorrador({ ...borrador, trigger: null });
              }}
            >
              <CamposDeDisparador
                value={borrador.trigger}
                entities={entities}
                onChange={(trigger) => setBorrador({ ...borrador, trigger })}
              />
            </CajaColocada>
          )}
        </CarrilDeCajas>

        <CarrilDeCajas
          parte="ESTADO"
          vacio={borrador.conditions.length === 0}
          onSoltar={(clave) => colocar("ESTADO", clave)}
        >
          {borrador.conditions.map((condicion, i) => (
            <CajaColocada
              key={`${condicion.kind}-${i}`}
              parte="ESTADO"
              clave={condicion.kind}
              onQuitar={() =>
                setBorrador({
                  ...borrador,
                  conditions: borrador.conditions.filter((_, j) => j !== i),
                })
              }
            >
              <CamposDeCondicion
                value={condicion}
                onChange={(nueva) =>
                  setBorrador({
                    ...borrador,
                    conditions: borrador.conditions.map((c, j) => (j === i ? nueva : c)),
                  })
                }
              />
            </CajaColocada>
          ))}
        </CarrilDeCajas>

        <CarrilDeCajas
          parte="ACCION"
          vacio={borrador.effects.length === 0}
          onSoltar={(clave) => colocar("ACCION", clave)}
        >
          {borrador.effects.map((efecto, i) => (
            <CajaColocada
              key={`${efecto.kind}-${i}`}
              parte="ACCION"
              clave={efecto.kind}
              onQuitar={() =>
                setBorrador({
                  ...borrador,
                  effects: borrador.effects.filter((_, j) => j !== i),
                })
              }
            >
              <CamposDeEfecto
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
            </CajaColocada>
          ))}
        </CarrilDeCajas>

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

        {intentado && revision.problemas.length > 0 && (
          <div role="alert" className="rounded-radius-sm border border-danger p-s2">
            <p className="font-chrome text-chrome-sm text-danger-text">
              La regla todavía no está completa:
            </p>
            <ul className="mt-1 list-disc pl-s5 font-chrome text-chrome-xs text-danger-text">
              {revision.problemas.map((problema) => (
                <li key={problema}>{problema}</li>
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
          {/* El botón de guardar nunca se deshabilita: deshabilitado no recibe foco de teclado. */}
          <Button type="button" disabled={guardando} onClick={enviar}>
            {guardando ? "Guardando…" : "Guardar regla"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
