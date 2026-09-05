import { useState } from "react";
import type { RollAudience, RollResult } from "@dnd/shared";
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

/** Una petición ya respondida en esta sesión, con lo que salió. */
interface Respondida {
  id: string;
  etiqueta: string;
  resultado: RollResult;
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

  // **Sin peticiones no se pinta ninguna caja.** Una caja vacía que dice «no te han pedido nada»
  // ocupa el sitio de lo primero que se lee en esta pantalla y no informa de nada: la ausencia de
  // peticiones ya se ve porque no hay peticiones.
  if (pendientes.length === 0 && respondidas.length === 0) return null;

  function nombreDelPersonaje(peticion: RollRequestRow): string | null {
    // El DM ve las de toda la mesa y un jugador puede llevar más de un personaje: sin el nombre,
    // «Percepción» repetido cinco veces no dice a quién se le pide.
    return personajes.data?.find((p) => p.id === peticion.characterId)?.name ?? null;
  }

  function alTirar(peticion: RollRequestRow) {
    const conInspiracion = inspirados[peticion.id] === true;
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
            { id: peticion.id, etiqueta: peticion.label, resultado },
            ...actuales,
          ]),
        onError: (e) =>
          setErrores((actuales) => ({ ...actuales, [peticion.id]: mensajeDeError(e) })),
      },
    );
  }

  return (
    <section aria-label="Tiradas que te han pedido" className="mb-s5">
      <Panel className="max-w-[40rem]">
        <h3 className="font-title text-chrome-lg leading-tight text-text">Te han pedido tirar</h3>

        <ul className="mt-s3 flex flex-col gap-s2">
          {pendientes.map((peticion) => {
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
                  onChange={(v) => setInspirados((actuales) => ({ ...actuales, [peticion.id]: v }))}
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

        {respondidas.map((r) =>
          r.resultado.revealed ? (
            <div key={r.id} className="mt-s3">
              {/* El total en grande, igual que en la tarjeta de tirada libre: es lo que se canta
                  en la mesa. El desglose de debajo dice de dónde salió — nunca un número solo. */}
              <p className="text-center font-data text-chrome-xl text-text">{r.resultado.total}</p>
              <ResultadoDeTirada resultado={r.resultado} etiqueta={r.etiqueta} />
            </div>
          ) : (
            <div key={r.id} className="mt-s3">
              <TiradaACiegas etiqueta={r.etiqueta} expresion={r.resultado.expression} />
            </div>
          ),
        )}
      </Panel>
    </section>
  );
}
