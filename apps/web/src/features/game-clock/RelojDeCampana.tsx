import { useState } from "react";
import type { TravelPace } from "@dnd/shared";
import { Button, Field, fieldControlClass, Panel } from "../../ui";
import { ApiError } from "../../lib/api";
import { useMyRole } from "../campaigns/members";
import { useCharacters } from "../characters/hooks";
import { useCreateRollRequest } from "../roll-requests/hooks";
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

function mensajeDeErrorAlPedir(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "No se pudieron pedir las salvaciones.";
}

/**
 * **La clave de la hoja que se pide, escrita una sola vez.** `save.con` es la salvación de
 * Constitución tal y como la nombra el motor (`features/roll-requests/vocabulario.ts` la compone
 * igual, a partir de `ABILITY_KEYS`); no se teclea en cada llamada para que no haya dos verdades.
 */
const SALVACION_DE_MARCHA = "save.con";

export function RelojDeCampana({
  campaignId,
  className,
}: {
  campaignId: string;
  /**
   * Sustituye el `max-w-[40rem]` de por defecto (no lo añade): quien monta el reloj en una
   * rejilla ya decide su ancho, y las dos anchuras máximas a la vez no significan nada.
   */
  className?: string;
}) {
  const reloj = useGameClock(campaignId);
  const { role } = useMyRole(campaignId);
  const avanzar = useAdvanceClock(campaignId);
  const [pace, setPace] = useState<TravelPace>("NORMAL");
  const [horas, setHoras] = useState("8");
  const [motivo, setMotivo] = useState("");
  // Ficha C2C-4 — a quién se le piden las salvaciones de marcha forzada.
  const [viajeros, setViajeros] = useState<string[]>([]);
  const [pidiendo, setPidiendo] = useState(false);
  /**
   * Lo que pasó al pedir las salvaciones, **atado al avance del reloj que las produjo**.
   *
   * Esto era un `useState` por dato más un `useEffect` que los reseteaba al cambiar de avance, y el
   * linter lo rechazó con razón: un efecto que llama a `setState` en su cuerpo es una cascada de
   * renders para algo que **se puede derivar**. Guardando el `eventId` junto al resultado, «¿esto
   * es de este viaje?» es una comparación, no una sincronización — y deja de existir el instante
   * entre dos renders en que el recuento viejo se leía bajo unas salvaciones nuevas.
   */
  const [resultadoDePedir, setResultadoDePedir] = useState<{
    eventId: string;
    pedidas?: number;
    error?: string;
    faltanViajeros?: boolean;
  } | null>(null);

  const personajes = useCharacters(campaignId);
  const pedirSalvacion = useCreateRollRequest(campaignId);

  const esDm = role === "DM";
  const ultimo = avanzar.data;
  const salvaciones = ultimo?.forcedMarchSaves ?? [];

  // Cada avance del reloj es un viaje distinto: el recuento y el error del anterior no pueden
  // quedarse colgando debajo de unas salvaciones nuevas, porque se leerían como suyos. Se resuelve
  // **comparando**, no reseteando.
  const deEsteViaje =
    resultadoDePedir && resultadoDePedir.eventId === ultimo?.eventId ? resultadoDePedir : null;
  const pedidas = deEsteViaje?.pedidas ?? null;
  const errorAlPedir = deEsteViaje?.error ?? null;
  const faltanViajeros = deEsteViaje?.faltanViajeros ?? false;

  function alternarViajero(characterId: string) {
    setViajeros((actuales) =>
      actuales.includes(characterId)
        ? actuales.filter((id) => id !== characterId)
        : [...actuales, characterId],
    );
  }

  /**
   * **Una petición por salvación y por personaje, y eso no es un detalle de implementación: es la
   * regla.**
   *
   * El SRD 5.1 («Forced March», Adventuring / Travel Pace) dice que por cada hora de viaje pasada
   * de ocho el personaje hace **una salvación de Constitución al final de esa hora**, con CD
   * **10 + 1 por cada hora pasada de ocho**, y que quien falla se lleva un nivel de agotamiento.
   * Son, por tanto, tiradas distintas con CD distinta y consecuencias que se acumulan: diez horas
   * de marcha son dos salvaciones, CD 11 y CD 12, y se puede fallar la segunda habiendo superado
   * la primera.
   *
   * Juntarlas en una sola tirada —«tira una vez contra la CD más alta»— **cambiaría la regla**:
   * reduciría a un nivel el agotamiento que la marcha puede dar, y borraría el caso de superar
   * una hora y caer en la siguiente. Por eso el bucle manda una petición por cada entrada de
   * `forcedMarchSaves` con **su** CD, y el servidor abre a su vez una por personaje
   * (`characterIds`, ver `roll-request.schema.ts`): cada uno tira con su propio modificador.
   */
  async function alPedirLasSalvaciones() {
    if (viajeros.length === 0) {
      setResultadoDePedir({ eventId: ultimo!.eventId, faltanViajeros: true });
      return;
    }
    setResultadoDePedir(null);
    setPidiendo(true);
    let creadas = 0;
    try {
      for (const salvacion of salvaciones) {
        const filas = await pedirSalvacion.mutateAsync({
          characterIds: viajeros,
          key: SALVACION_DE_MARCHA,
          // La frase dice de qué es la tirada: en la lista de pendientes del jugador van a
          // aparecer dos «Salvación de Constitución» seguidas, y sin la hora son la misma cosa
          // dos veces.
          label: `Marcha forzada, hora ${salvacion.hora}`,
          dc: salvacion.dc,
          mode: "NORMAL",
          audience: "PUBLIC",
        });
        creadas += filas.length;
      }
      setResultadoDePedir({ eventId: ultimo!.eventId, pedidas: creadas });
    } catch (error) {
      // **El rechazo del servidor, en línea y con su frase** (docs/04-convenciones.md): nunca un
      // aviso flotante, y nunca reescrito por el navegador.
      setResultadoDePedir({ eventId: ultimo!.eventId, error: mensajeDeErrorAlPedir(error) });
    } finally {
      setPidiendo(false);
    }
  }

  return (
    <Panel className={className ?? "max-w-[40rem]"}>
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
            {/* Tarea 9 (plan 2026-09-19) — «Qué pasa» sube justo debajo de la cabecera «El
                reloj», antes de «Pasa el tiempo» y «O viajáis»: describe cualquiera de los dos
                gestos de abajo y por eso va antes de los dos, no colgando debajo. */}
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

            {/* Anexo #16: «avanzar el tiempo» y «o viajáis» pasaban de apilados a compartir
                fila cuando hay sitio — la misma media pantalla que antes ocupaba solo el
                primero. */}
            <div className="mt-s3 md:grid md:grid-cols-2 md:gap-s4">
              <div>
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

              <div className="mt-s3 md:mt-0">
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
            {salvaciones.length > 0 && (
              // **Marcha forzada.** El servidor devuelve las tiradas que hay que pedir, con su CD
              // ya calculada; aquí se enseñan, y desde la ficha C2C-4 se pueden pedir de verdad.
              <div className="mt-s2">
                <p className="font-chrome text-chrome-sm text-warning-text">
                  Marcha forzada: cada personaje tira una salvación de Constitución por cada hora
                  pasada de ocho, y quien falle se lleva un nivel de agotamiento.
                </p>
                <ul className="mt-1 font-data text-chrome-xs text-muted">
                  {salvaciones.map((salvacion) => (
                    <li key={salvacion.hora}>
                      Hora {salvacion.hora}: CD {salvacion.dc}
                    </li>
                  ))}
                </ul>

                {/* **Solo el DM las pide**, porque solo el DM puede: `requireDM` en
                    `roll-requests.service.ts` daría 403 a cualquier otro, y ofrecer un botón que
                    el servidor va a rechazar es mentir (docs/04-convenciones.md). Y solo se pinta
                    cuando hay salvaciones: sin ellas no hay nada que pedir. */}
                {esDm && (
                  <div className="mt-s2 border-t border-muted pt-s2">
                    <fieldset className="min-w-0" disabled={pidiendo}>
                      <legend className="mb-1 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
                        Quiénes viajaron
                      </legend>
                      {(personajes.data ?? []).length === 0 && (
                        <p className="font-chrome text-chrome-xs text-muted">
                          Esta campaña todavía no tiene personajes a los que pedirles nada.
                        </p>
                      )}
                      {/* Las mismas casillas que `PedirTirada`: varios personajes, porque viaja
                          el grupo y no siempre entero — el explorador que se adelantó no hizo la
                          marcha de los demás. */}
                      <div className="flex flex-wrap gap-1.5">
                        {(personajes.data ?? []).map((personaje) => {
                          const marcado = viajeros.includes(personaje.id);
                          return (
                            <label
                              key={personaje.id}
                              className={[
                                "flex cursor-pointer items-baseline gap-s2 rounded-radius-sm border px-s2 py-1 transition-colors",
                                marcado
                                  ? "border-accent bg-[color:var(--accent-tint)]"
                                  : "border-muted",
                              ].join(" ")}
                            >
                              <input
                                type="checkbox"
                                checked={marcado}
                                onChange={() => alternarViajero(personaje.id)}
                                className="accent-[var(--accent)]"
                              />
                              <span className="font-chrome text-chrome-sm text-text">
                                {personaje.name}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>

                    {faltanViajeros && (
                      <p role="alert" className="mt-1 font-chrome text-chrome-xs text-danger-text">
                        Elige quién hizo la marcha.
                      </p>
                    )}

                    <div className="mt-s2">
                      {/* **El botón nunca se deshabilita** (docs/04-convenciones.md): lo que falta
                          se dice en línea. Solo mientras la petición está en vuelo cambia su
                          rótulo, para que no se pulse dos veces sin darse cuenta. */}
                      <Button type="button" variant="primary" onClick={alPedirLasSalvaciones}>
                        {pidiendo ? "Pidiendo…" : "Pedir las salvaciones"}
                      </Button>
                    </div>

                    {pedidas !== null && (
                      <p className="mt-1 font-chrome text-chrome-xs text-accent-text">
                        {pedidas === 1 ? "Pedida 1 salvación." : `Pedidas ${pedidas} salvaciones.`}
                      </p>
                    )}

                    {errorAlPedir && (
                      <p role="alert" className="mt-1 font-chrome text-chrome-xs text-danger-text">
                        {errorAlPedir}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </Panel>
  );
}
