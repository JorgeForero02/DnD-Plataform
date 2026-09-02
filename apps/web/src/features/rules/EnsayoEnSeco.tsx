import { useState } from "react";
import type { RuleTrigger } from "@dnd/shared";
import { Button, Dialog } from "../../ui";
import type { Entity } from "../entities/api";
import type { ResultadoDeEnsayo, RuleRow } from "./api";
import { IconoEnsayo } from "./iconos";
import { EditorDeDisparador } from "./PiezasDeRegla";
import { ResumenDeEfectos } from "./ResumenDeEfectos";
import { describirCondicion, explicacionEstadoTraza, nombreEstadoTraza } from "./vocabulario";

// Tarea 2A.17 — el ensayo en seco.
//
// Lo importante de esta pantalla es que **no se pueda confundir con un disparo real**. El
// endpoint (`POST :ruleId/dry-run`) no escribe nada — ni traza, ni disparo, ni efecto — y la
// pantalla lo dice con todas las letras, antes y después de simular. Todo lo que se pinta aquí
// viene de la respuesta del servidor: esta pantalla no evalúa ninguna condición por su cuenta.

export function EnsayoEnSeco({
  abierto,
  regla,
  entities,
  simulando,
  resultado,
  error,
  onSimular,
  onCerrar,
}: {
  abierto: boolean;
  regla: RuleRow;
  entities: Entity[];
  simulando: boolean;
  resultado?: ResultadoDeEnsayo;
  error?: string;
  onSimular: (trigger: RuleTrigger) => void;
  onCerrar: () => void;
}) {
  // Se arranca con el disparador de la propia regla: el ensayo que casi siempre se quiere es
  // «¿qué pasaría si ocurriera justo lo que esta regla espera?».
  const [trigger, setTrigger] = useState<RuleTrigger>(regla.trigger);

  const nombrePorId = new Map(entities.map((e) => [e.id, e.name]));
  const nombreFicha = (id: string) => nombrePorId.get(id) ?? `entrada ${id.slice(-6)}`;
  const nombreRegla = (id?: string) => (id === regla.id ? regla.name : (id ?? "otra regla"));

  return (
    <Dialog open={abierto} onClose={onCerrar} size="lg" title={`Ensayo en seco de «${regla.name}»`}>
      <div className="space-y-s4">
        <p className="flex items-start gap-s2 rounded-radius-sm border border-copper bg-copper/10 p-s3 font-chrome text-chrome-sm text-text">
          <IconoEnsayo className="mt-0.5 text-copper-text" />
          <span>
            <strong>Es una simulación.</strong> Dice qué pasaría si el suceso de abajo ocurriera
            ahora mismo. No cambia nada, no cuenta como disparo y no deja traza.
          </span>
        </p>

        <section className="rounded-radius-sm border border-muted/50 p-s3">
          <h3 className="mb-s2 font-title text-chrome-md text-text">Suceso que se simula</h3>
          <EditorDeDisparador value={trigger} entities={entities} onChange={setTrigger} />
        </section>

        <Button type="button" disabled={simulando} onClick={() => onSimular(trigger)}>
          {simulando ? "Simulando…" : "Simular"}
        </Button>

        {error && (
          <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
            {error}
          </p>
        )}

        {resultado && (
          <section aria-label="Resultado de la simulación" className="space-y-s3">
            <h3 className="font-title text-chrome-md text-text">Qué habría pasado</h3>

            {!resultado.triggerReachableToday && (
              <p className="rounded-radius-sm border border-warning p-s2 font-chrome text-chrome-xs text-text">
                Ojo: hoy nada de la aplicación emite este suceso todavía, así que esta regla no
                llegaría a dispararse sola. El ensayo dice qué pasaría <em>si</em> ocurriera.
              </p>
            )}

            {resultado.traces.length === 0 && (
              <p className="font-chrome text-chrome-sm text-muted">
                Ninguna regla habría hecho nada con ese suceso.
              </p>
            )}

            {resultado.traces.map((entrada, i) => (
              <article key={i} className="rounded-radius-sm border border-muted/50 p-s3">
                <header className="flex flex-wrap items-baseline gap-s2">
                  <span className="font-chrome text-chrome-sm text-text">
                    {nombreEstadoTraza(entrada.status)}
                  </span>
                  <span className="font-data text-chrome-xs text-muted">salto {entrada.depth}</span>
                  {entrada.ruleId && (
                    <span className="font-chrome text-chrome-xs text-muted">
                      regla: {nombreRegla(entrada.ruleId)}
                    </span>
                  )}
                </header>
                <p className="mt-1 font-chrome text-chrome-xs text-muted">
                  {explicacionEstadoTraza(entrada.status)}
                </p>
                {entrada.reason && (
                  <p className="mt-1 font-chrome text-chrome-xs text-muted">
                    Motivo del motor: {entrada.reason}
                  </p>
                )}

                {entrada.conditions && entrada.conditions.length > 0 && (
                  <ul className="mt-s2 space-y-0.5">
                    {entrada.conditions.map((evaluacion, j) => (
                      <li key={j} className="font-chrome text-chrome-xs text-muted">
                        {evaluacion.result ? "Se cumple" : "No se cumple"}:{" "}
                        {describirCondicion(evaluacion.condition)}
                      </li>
                    ))}
                  </ul>
                )}

                <ResumenDeEfectos
                  efectos={entrada.effects ?? []}
                  nombreFicha={nombreFicha}
                  vacio="Sin efectos que aplicar."
                />
              </article>
            ))}

            {resultado.brokenRules.length > 0 && (
              <div className="rounded-radius-sm border border-danger p-s2">
                <p className="font-chrome text-chrome-sm text-danger-text">
                  Reglas que quedarían rotas:
                </p>
                <ul className="mt-1 list-disc pl-s5 font-chrome text-chrome-xs text-danger-text">
                  {resultado.brokenRules.map((rota) => (
                    <li key={rota.ruleId}>
                      {nombreRegla(rota.ruleId)} — {rota.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <div className="flex justify-end">
          <Button variant="secondary" type="button" onClick={onCerrar}>
            Cerrar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
