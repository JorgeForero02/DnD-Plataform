import { useState } from "react";
import type { TravelPace } from "@dnd/shared";
import { Button, Field, fieldControlClass, Panel } from "../../ui";
import { ApiError } from "../../lib/api";
import { useMyRole } from "../campaigns/members";
import { useAdvanceClock, useGameClock } from "./hooks";
import { duracionEnPalabras, relojEnPalabras, RITMOS, SALTOS_DE_RELOJ } from "./vocabulario";

// Tarea 2C.3 en la pantalla — ficha **C2C-3**.
//
// El endpoint del reloj llevaba una tarde existiendo y **ninguna pantalla lo llamaba**: el DM solo
// podía avanzar el tiempo por API. Eso dejaba a 2C.4 sin el gesto que la enciende — una condición
// que dura una hora no vence nunca si nadie puede hacer que pase esa hora.
//
// ## Tres decisiones que no son de acabado
//
//  1. **La hora la lee cualquiera; la mueve el DM.** Qué hora es en el mundo no es información
//     privilegiada, y un jugador que viera una condición apagarse sin saber que han pasado ocho
//     horas se quedaría con el «qué» y sin el «por qué».
//  2. **Se avanza, nunca se fija.** No hay campo para escribir la hora nueva porque el servidor no
//     lo ofrece: dos avances a la vez perderían uno de los dos, y retroceder haría que algo
//     caducara dos veces.
//  3. **Viajar es avanzar el reloj**, con la tabla del SRD detrás. Por eso el ritmo va aquí y no en
//     otra pantalla: lo que una mesa dice no es «pasan seis horas», es «vamos a la ciudad».

function mensajeDeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "No se pudo avanzar el reloj.";
}

export function RelojDeCampana({ campaignId }: { campaignId: string }) {
  const reloj = useGameClock(campaignId);
  const { role } = useMyRole(campaignId);
  const avanzar = useAdvanceClock(campaignId);
  const [pace, setPace] = useState<TravelPace>("NORMAL");
  const [horas, setHoras] = useState("8");
  const [motivo, setMotivo] = useState("");

  const esDm = role === "DM";
  const ultimo = avanzar.data;

  return (
    <Panel className="max-w-[40rem]">
      <section aria-label="El reloj de la campaña">
        <h3 className="font-title text-chrome-lg leading-tight text-text">El reloj</h3>
        <p className="mt-1 font-data text-chrome-xl text-text">
          {reloj.data ? relojEnPalabras(reloj.data.seconds) : "—"}
        </p>
        <p className="mt-1 font-chrome text-chrome-xs leading-snug text-muted">
          Tiempo de juego, no el del reloj de la pared. Un asalto son seis segundos del mismo
          contador.
        </p>

        {esDm && (
          <>
            <div className="mt-s3">
              <p className="mb-1 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
                Pasa el tiempo
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SALTOS_DE_RELOJ.map((salto) => (
                  <Button
                    key={salto.segundos}
                    type="button"
                    variant="secondary"
                    disabled={avanzar.isPending}
                    onClick={() =>
                      avanzar.mutate({
                        kind: "TIME",
                        seconds: salto.segundos,
                        ...(motivo.trim() ? { reason: motivo.trim() } : {}),
                      })
                    }
                  >
                    {salto.etiqueta}
                  </Button>
                ))}
              </div>
            </div>

            <div className="mt-s3">
              <p className="mb-1 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
                O viajáis
              </p>
              {/* **Radios con su frase, no un desplegable**: el ritmo es una decisión con
                  consecuencias —el rápido cuesta −5 a la Percepción pasiva— y esconderla en un
                  selector la convierte en un ajuste. Regla vinculante de docs/04-convenciones.md. */}
              <fieldset className="space-y-1">
                <legend className="sr-only">Ritmo de viaje</legend>
                {RITMOS.map((ritmo) => (
                  <label
                    key={ritmo.pace}
                    className={[
                      "flex cursor-pointer items-start gap-s2 rounded-radius-sm border px-s2 py-1.5 transition-colors",
                      pace === ritmo.pace
                        ? "border-accent bg-[color:var(--accent-tint)]"
                        : "border-transparent hover:bg-bg",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="ritmo-de-viaje"
                      checked={pace === ritmo.pace}
                      onChange={() => setPace(ritmo.pace)}
                      className="mt-1 accent-[var(--accent)]"
                    />
                    <span className="min-w-0">
                      <span className="block font-chrome text-chrome-sm text-text">
                        {ritmo.etiqueta}
                      </span>
                      <span className="mt-0.5 block font-chrome text-chrome-xs leading-snug text-muted">
                        {ritmo.frase}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>

              <div className="mt-s2 flex items-end gap-s2">
                <div className="w-24">
                  <Field label="Horas" hint="Más de ocho es marcha forzada.">
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={horas}
                      onChange={(e) => setHoras(e.target.value)}
                      className={`${fieldControlClass} font-data`}
                    />
                  </Field>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  disabled={avanzar.isPending}
                  onClick={() =>
                    avanzar.mutate({
                      kind: "TRAVEL",
                      pace,
                      hours: Number(horas),
                      ...(motivo.trim() ? { reason: motivo.trim() } : {}),
                    })
                  }
                >
                  Viajar
                </Button>
              </div>
            </div>

            <div className="mt-s3">
              <Field label="Qué pasa (opcional)" hint="«Cae la noche», «hasta la ciudad».">
                <input
                  type="text"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  maxLength={120}
                  className={fieldControlClass}
                />
              </Field>
            </div>
          </>
        )}

        {avanzar.isError && (
          <p role="alert" className="mt-s2 font-chrome text-chrome-sm text-danger-text">
            {mensajeDeError(avanzar.error)}
          </p>
        )}

        {ultimo && (
          <div
            role="status"
            className="mt-s3 rounded-radius-sm border border-muted bg-surface px-s2 py-1.5"
          >
            <p className="font-chrome text-chrome-sm text-text">
              Pasan {duracionEnPalabras(ultimo.seconds)}
              {ultimo.miles !== undefined ? `, y recorréis ${ultimo.miles} millas` : ""}.
            </p>
            {ultimo.passivePerception !== undefined && (
              <p className="mt-0.5 font-chrome text-chrome-xs text-warning-text">
                {/* **Signo menos tipográfico**, como en el desglose de una tirada: el número llega
                    como `-5` y la etiqueta del ritmo, dos líneas más arriba, dice «−5». El mismo
                    dato escrito de dos maneras en la misma pantalla se lee como dos datos. */}
                A paso rápido: −{Math.abs(ultimo.passivePerception)} a la Percepción pasiva mientras
                viajáis.
              </p>
            )}
            {ultimo.forcedMarchSaves.length > 0 && (
              // **Marcha forzada.** El servidor devuelve las tiradas que hay que pedir, con su CD
              // ya calculada; aquí se enseñan para que el DM las pida. Encadenarlas con la petición
              // de tirada de 2C.5 es la ficha C2C-4.
              <div className="mt-s2">
                <p className="font-chrome text-chrome-sm text-warning-text">
                  Marcha forzada: cada personaje tira una salvación de Constitución por cada hora
                  pasada de ocho, y quien falle se lleva un nivel de agotamiento.
                </p>
                <ul className="mt-1 font-data text-chrome-xs text-muted">
                  {ultimo.forcedMarchSaves.map((salvacion) => (
                    <li key={salvacion.hora}>
                      Hora {salvacion.hora}: CD {salvacion.dc}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </Panel>
  );
}
