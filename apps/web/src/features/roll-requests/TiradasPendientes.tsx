import { useState } from "react";
import type { EffectApplied, EffectWarning, RollAudience, RollResult } from "@dnd/shared";
import { Button, Panel } from "../../ui";
import { ApiError } from "../../lib/api";
import { DadoDibujado } from "../rolls/DadoDibujado";
import { ResultadoDeTirada } from "../rolls/ResultadoDeTirada";
import { TiradaACiegas } from "../rolls/TiradaACiegas";
import { AUDIENCIAS_DE_TIRADA, modoDeTirada } from "../rolls/vocabulario";
import { useCharacters } from "../characters/hooks";
import type { RollRequestRow } from "./api";
import { useAnswerRollRequest, useRollRequests } from "./hooks";
import { GastarInspiracion } from "../rolls/panel/GastarInspiracion";
import { nombreDeClave } from "./vocabulario";
import { PanelDeIniciativa } from "./PanelDeIniciativa";

// Tarea 2C.5 — **lo que te han pedido.**
//
// Va **arriba del todo** de la pantalla de dados: lo que te han pedido va antes que lo que
// quieras tirar por tu cuenta. Un jugador que entra en «Dados» porque el DM acaba de decir
// «tirad percepción» tiene que encontrarse el botón, no el campo de expresión libre.
//
// **Aquí no se esconde nada.** El servidor ya decidió qué peticiones te tocan
// (`RollRequestsService.list`: el DM ve las de la campaña, un jugador solo las de sus
// personajes). Esta pantalla pinta lo que llega; no filtra por rol, porque eso sería control de
// acceso en el cliente.
//
// **Y aquí no se genera azar.** Pulsar «Tirar» manda `POST .../roll` **sin cuerpo**: qué se tira,
// con qué CD y quién lo ve ya lo dijo el DM al pedirlo, y dejar que quien responde lo cambiara
// convertiría la petición en una sugerencia.

function etiquetaDeAudiencia(audiencia: RollAudience): string {
  // Ningún valor de enumeración llega a la pantalla: la forma legible vive una sola vez, en
  // `features/rolls/vocabulario.ts`.
  return AUDIENCIAS_DE_TIRADA.find((a) => a.audiencia === audiencia)?.etiqueta ?? "";
}

function mensajeDeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "No se pudo tirar.";
}

/**
 * **La puerta de efectos** (§4.3): si la salvación respondida traía un efecto pendiente
 * (`RollRequest.pendingEffect`), el servidor ya lo aplicó al responder y esto dice qué pasó de
 * verdad — no lo que se esperaba. `delta` con el signo tipográfico «−», no un guion: es el mismo
 * carácter que usa el resto de la hoja para restar puntos de golpe. **Y con el signo REAL** (ola
 * de arreglos 1): el esquema admite `signo: 1` —una curación por salvación (§4.4)—, y pintarla
 * siempre con «−» la habría leído como daño.
 *
 * Tres frases, no una interpolación genérica: `delta === 0` con `saved` es «sin daño» y no
 * «Aplicado: −0 PG», que leería como que algo pasó cuando no pasó nada.
 */
function fraseEfectoAplicado(efecto: EffectApplied): string {
  if (efecto.saved && efecto.delta === 0) return "Salvó: sin daño";
  const cifra = `${efecto.delta > 0 ? "+" : "−"}${Math.abs(efecto.delta)} PG`;
  return efecto.saved ? `Aplicado: ${cifra} (salvó, mitad)` : `Aplicado: ${cifra} (falló)`;
}

/** Una petición ya respondida en esta sesión, con lo que salió. */
interface Respondida {
  id: string;
  etiqueta: string;
  resultado: RollResult;
  /**
   * Ronda de arreglo 1 (I-6) — de qué caja salió, para saber a cuál de las dos volver con el
   * resultado. Antes de esta marca, el resultado de **cualquier** petición aterrizaba en la caja
   * pequeña «Te han pedido tirar» — incluida la de iniciativa, que ya se había ido de
   * `PanelDeIniciativa` sin dejar rastro. El jugador tiraba en el panel grande y el número le
   * aparecía en un rótulo que ya no describía nada pendiente.
   */
  esDeEncuentro: boolean;
  /**
   * La puerta de efectos (§4.3): lo que el servidor aplicó de verdad al responder esta salvación,
   * o `undefined` si la petición no traía ningún `pendingEffect` (una prueba, una salvación sin
   * daño detrás, o cualquier tirada libre). Se guarda aquí, junto al resto de la respuesta, para
   * que sobreviva al mismo sondeo que ya limpia la petición de `pendientes`.
   */
  effectApplied?: EffectApplied;
  /**
   * Ola de arreglos 1 de la API: la tirada quedó escrita y la petición cerrada, pero el efecto
   * NO se pudo aplicar. Se pinta el `message` del servidor tal cual, junto a la tirada: el jugador
   * no debe volver a tirar, y el DM aplica el daño a mano.
   */
  effectWarning?: EffectWarning;
}

export function TiradasPendientes({ campaignId }: { campaignId: string }) {
  const [respondidas, setRespondidas] = useState<Respondida[]>([]);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const peticiones = useRollRequests(campaignId);
  const personajes = useCharacters(campaignId);
  const responder = useAnswerRollRequest(campaignId);
  // Por petición, porque cada una es una decisión distinta.
  const [inspirados, setInspirados] = useState<Record<string, boolean>>({});

  const yaRespondidas = new Set(respondidas.map((r) => r.id));
  // La lista que sondea el servidor ya viene solo con las pendientes (`includeResolved=false`),
  // pero entre que se responde y el siguiente sondeo la fila sigue en la caché: se descarta aquí
  // para que nadie vuelva a pulsar «Tirar» sobre algo que el servidor ya rechazaría.
  const pendientes = (peticiones.data ?? []).filter(
    (p) => p.resolvedAt === null && !yaRespondidas.has(p.id),
  );

  // **Lo único que distingue «te piden iniciativa» de «te piden Percepción» es `encounterId`**
  // (tarea 8, `RollRequestRow.encounterId`: nulo en todas las peticiones normales, a propósito).
  // Las que traen encuentro se pintan grandes, con `PanelDeIniciativa`; el resto sigue en la caja
  // de siempre. El panel **se pinta a partir de esta lista y desaparece solo**: en cuanto su
  // petición deja de estar en `peticiones.data` —porque se respondió, o porque el DM canceló el
  // combate y la borró sin dejar suceso— deja de estar en `deEncuentro` y el panel se va con ella.
  //
  // **`Boolean(...)` y no `!== null`.** Hay pruebas de otra pantalla (`sessions/mesa-de-sesion`)
  // que construyen la petición a mano sin declarar `encounterId` en absoluto —nace `undefined`,
  // no `null`— y ese es exactamente el caso que una comparación estricta contra `null` clasifica
  // mal: `undefined !== null` es `true`, así que esas peticiones normales habrían caído en
  // `deEncuentro` por un campo que ni siquiera estaba ahí. `Boolean` trata `null` y `undefined`
  // igual, que es lo que la regla de negocio pide: «trae un encuentro de verdad», no «no es
  // exactamente `null`».
  const deEncuentro = pendientes.filter((p) => Boolean(p.encounterId));
  const normales = pendientes.filter((p) => !p.encounterId);
  // I-6 — el resultado de una respondida vuelve a la caja de la que salió su petición, no a la
  // que quede montada. `respondidasDeEncuentro` tiene su propio sitio (ver más abajo); la caja
  // pequeña solo abre por `normales` o por `respondidasNormales`, nunca por las dos mezcladas.
  const respondidasDeEncuentro = respondidas.filter((r) => r.esDeEncuentro);
  const respondidasNormales = respondidas.filter((r) => !r.esDeEncuentro);

  // I-4 — la ausencia de panel **afirma algo**: «no hay ningún combate esperándote, no te han
  // pedido nada». Con la consulta en error eso es mentira por omisión: no se sabe si hay algo
  // esperando o no, y quedarse callado se lee exactamente igual que «no hay nada». Se dice en vez
  // de callar, y antes del `return null` de abajo, que es el que confundía las dos cosas.
  if (peticiones.isError) {
    return (
      <p role="alert" className="mb-s5 font-chrome text-chrome-sm text-danger-text">
        No se pudo comprobar si te han pedido tirar.
      </p>
    );
  }

  // **Sin nada que pintar no se pinta ninguna caja.** Una caja vacía que dice «no te han pedido
  // nada» ocupa el sitio de lo primero que se lee en esta pantalla y no informa de nada: la
  // ausencia de peticiones ya se ve porque no hay peticiones.
  if (pendientes.length === 0 && respondidas.length === 0) return null;

  function nombreDelPersonaje(peticion: RollRequestRow): string | null {
    // El DM ve las de toda la mesa y un jugador puede llevar más de un personaje: sin el nombre,
    // «Percepción» repetido cinco veces no dice a quién se le pide.
    return personajes.data?.find((p) => p.id === peticion.characterId)?.name ?? null;
  }

  function alTirar(peticion: RollRequestRow) {
    const conInspiracion = inspirados[peticion.id] === true;
    const esDeEncuentro = Boolean(peticion.encounterId);
    setErrores((actuales) => {
      const siguiente = { ...actuales };
      delete siguiente[peticion.id];
      return siguiente;
    });
    responder.mutate(
      { requestId: peticion.id, spendInspiration: conInspiracion },
      {
        onSuccess: (resultado) =>
          setRespondidas((actuales) => [
            {
              id: peticion.id,
              etiqueta: peticion.label,
              resultado,
              esDeEncuentro,
              effectApplied: resultado.effectApplied,
              effectWarning: resultado.effectWarning,
            },
            ...actuales,
          ]),
        onError: (e) =>
          setErrores((actuales) => ({ ...actuales, [peticion.id]: mensajeDeError(e) })),
      },
    );
  }

  // I-3 — `responder.isPending` es el estado de LA MUTACIÓN, no el de esta petición. Un jugador
  // con dos personajes puede recibir dos peticiones de iniciativa a la vez (dos paneles): al tirar
  // en una, `isPending` se pone en marcha para las DOS, y la que nadie pulsó también apagaría su
  // botón diciendo «Ya está en camino» sobre una tirada que no mandó nadie. `variables` es la que
  // sí distingue una petición de otra — es lo que se pasó a `mutate` para ESTA llamada.
  function tirandoEsta(requestId: string): boolean {
    return (
      responder.isPending &&
      typeof responder.variables === "object" &&
      responder.variables?.requestId === requestId
    );
  }

  return (
    <>
      {deEncuentro.map((peticion) => (
        <PanelDeIniciativa
          key={peticion.id}
          peticion={peticion}
          campaignId={campaignId}
          nombrePersonaje={nombreDelPersonaje(peticion)}
          conInspiracion={inspirados[peticion.id] === true}
          onCambiarInspiracion={(v) =>
            setInspirados((actuales) => ({ ...actuales, [peticion.id]: v }))
          }
          onTirar={() => alTirar(peticion)}
          tirando={tirandoEsta(peticion.id)}
          error={errores[peticion.id]}
        />
      ))}

      {/* I-6 — el resultado de una iniciativa ya tirada, en su propio sitio. El panel grande de
          arriba desaparece en cuanto la petición deja de estar pendiente (se pinta a partir de
          `deEncuentro`); esto es lo que queda en su lugar, y no la caja pequeña de más abajo, que
          habla de peticiones que siguen esperando. */}
      {respondidasDeEncuentro.map((r) => (
        <section aria-label="Tu iniciativa" className="mb-s5" key={r.id}>
          <Panel className="max-w-[24rem] border-warning">
            <h3 className="font-title text-chrome-lg uppercase tracking-wide text-warning-text">
              Iniciativa tirada
            </h3>
            {r.resultado.revealed ? (
              <div className="mt-s2">
                <p className="text-center font-data text-chrome-xl text-text">
                  {r.resultado.total}
                </p>
                <ResultadoDeTirada resultado={r.resultado} etiqueta={r.etiqueta} />
              </div>
            ) : (
              <div className="mt-s2">
                <TiradaACiegas etiqueta={r.etiqueta} expresion={r.resultado.expression} />
              </div>
            )}
          </Panel>
        </section>
      ))}

      {(normales.length > 0 || respondidasNormales.length > 0) && (
        <section aria-label="Tiradas que te han pedido" className="mb-s5">
          <Panel className="max-w-[40rem]">
            <h3 className="font-title text-chrome-lg leading-tight text-text">
              Te han pedido tirar
            </h3>

            <ul className="mt-s3 flex flex-col gap-s2">
              {normales.map((peticion) => {
                const quien = nombreDelPersonaje(peticion);
                const error = errores[peticion.id];
                return (
                  <li
                    key={peticion.id}
                    data-peticion={peticion.id}
                    className="rounded-radius-sm border border-muted bg-surface px-s2 py-1.5"
                  >
                    <p className="font-chrome text-chrome-sm text-text">{peticion.label}</p>
                    <p className="mt-0.5 font-chrome text-chrome-xs text-muted">
                      {[
                        quien,
                        nombreDeClave(peticion.key),
                        peticion.dc !== null ? `CD ${peticion.dc}` : null,
                        modoDeTirada(peticion.mode).etiqueta,
                        etiquetaDeAudiencia(peticion.audience),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {/* **La inspiración también sirve aquí** (I8): una petición del DM es una
                    salvación o una prueba, dos de las tres tiradas del SRD. El modo lo fijó quien
                    pidió, así que con desventaja el control se apaga solo. */}
                    <GastarInspiracion
                      campaignId={campaignId}
                      characterId={peticion.characterId}
                      modo={peticion.mode}
                      value={inspirados[peticion.id] === true}
                      onChange={(v) =>
                        setInspirados((actuales) => ({ ...actuales, [peticion.id]: v }))
                      }
                      disabled={responder.isPending}
                    />
                    <div className="mt-1">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => alTirar(peticion)}
                        aria-label={`Tirar: ${peticion.label}`}
                      >
                        <DadoDibujado />
                        Tirar
                      </Button>
                    </div>
                    {error && (
                      <p role="alert" className="mt-1 font-chrome text-chrome-xs text-danger-text">
                        {error}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>

            {respondidasNormales.map((r) => (
              <div key={r.id} className="mt-s3">
                {r.resultado.revealed ? (
                  <>
                    {/* El total en grande, igual que en la tarjeta de tirada libre: es lo que se
                        canta en la mesa. El desglose de debajo dice de dónde salió — nunca un
                        número solo. */}
                    <p className="text-center font-data text-chrome-xl text-text">
                      {r.resultado.total}
                    </p>
                    <ResultadoDeTirada resultado={r.resultado} etiqueta={r.etiqueta} />
                  </>
                ) : (
                  <TiradaACiegas etiqueta={r.etiqueta} expresion={r.resultado.expression} />
                )}
                {/* **La puerta de efectos** (§4.3): qué aplicó de verdad el servidor al
                    responder, no lo que se esperaba de la petición. Se pinta también con una
                    tirada a ciegas — el daño no es secreto aunque el resultado lo sea. */}
                {r.effectApplied && (
                  <p className="mt-1 text-center font-chrome text-chrome-xs text-muted">
                    {fraseEfectoAplicado(r.effectApplied)}
                  </p>
                )}
                {/* El efecto que NO se aplicó: la tirada vale y la petición está cerrada, así que
                    no se ofrece volver a tirar — se dice lo que pasó y quién lo arregla. */}
                {r.effectWarning && (
                  <p
                    role="alert"
                    className="mt-1 text-center font-chrome text-chrome-xs text-warning-text"
                  >
                    {r.effectWarning.message}
                  </p>
                )}
              </div>
            ))}
          </Panel>
        </section>
      )}
    </>
  );
}
