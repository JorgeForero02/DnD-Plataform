import { ResultadoDeTirada } from "./ResultadoDeTirada";
import { useRollLog, type FiltroDeTiradas } from "./hooks";
import type { FilaDeTirada } from "./api";
import { horaDe, lineaDeLog } from "../sessions/linea-de-log";
import { ApiError } from "../../lib/api";

// Tarea 2C.2 — **el registro de tiradas: lo que la mesa repasa cuando termina la escena.**
//
// ## Lo que este componente NO hace: esconder
//
// El servidor ya filtró por `canView` (`RollsService.list` → `GameEventsService.list`, el único
// sitio donde vive la matriz de visibilidad para los sucesos). Una tirada que no se puede ver
// **no viaja**. Aquí se pinta lo que llega, entero: filtrar de nuevo en el cliente sería
// reimplementar la matriz por segunda vez, que es exactamente lo que el proyecto prohíbe, y
// además crearía la ilusión de que la seguridad depende de esta pantalla.
//
// ## Dos formas, no una
//
// El registro trae **dos** tipos de suceso y las dos se pintan:
//
//  · `ABILITY_ROLL` lleva el desglose entero —los dados, lo descartado, el modificador— y se
//    pinta con `ResultadoDeTirada`, el mismo componente que usa el panel. Reusarlo no es
//    ahorro de líneas: es que **la misma suma no puede explicarse de dos maneras distintas**,
//    porque una de las dos acabaría mintiendo.
//  · `DEATH_SAVE` **no tiene desglose y no se le inventa uno**: es un d20 pelado con cuatro
//    resultados posibles, y un 20 natural ahí no es un éxito —devuelve al personaje a 1 PG—.
//    Su frase la escribe `features/sessions/linea-de-log.ts`, que ya la tenía; escribirla otra
//    vez aquí sería una segunda tabla de vocabulario que se separaría de la primera al mes.
//
// El `switch` está acotado por el tipo `PayloadDeTirada` (ver `api.ts`): si mañana el servidor
// añade un tercer tipo de tirada, esto deja de compilar en vez de dibujar una fila en blanco.

function mensajeDeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "No se pudo leer el registro de tiradas.";
}

function FilaDeRegistro({ fila }: { fila: FilaDeTirada }) {
  const p = fila.payload;
  return (
    <li
      data-tirada-tipo={p.type}
      className="flex flex-col gap-1 border-t border-muted py-s2 first:border-t-0 sm:flex-row sm:items-start sm:gap-s3"
    >
      <span className="shrink-0 font-data text-chrome-xs text-muted">{horaDe(fila.createdAt)}</span>
      <div className="min-w-0 flex-1">
        {p.type === "ABILITY_ROLL" ? (
          <ResultadoDeTirada resultado={p} etiqueta={p.reason ?? "modificador"} />
        ) : (
          // Sin desglose, a propósito. La frase dice el dado, el resultado y cómo va la cuenta.
          <p className="font-chrome text-chrome-sm text-text">{lineaDeLog(p)}</p>
        )}
      </div>
    </li>
  );
}

export function RegistroDeTiradas({
  campaignId,
  filtro,
}: {
  campaignId: string;
  /** Acota el registro a una sesión o a un personaje. Sin él, las últimas de la campaña. */
  filtro?: FiltroDeTiradas;
}) {
  const registro = useRollLog(campaignId, filtro ?? {});

  return (
    <section aria-labelledby="registro-de-tiradas" className="mt-s5">
      <h3
        id="registro-de-tiradas"
        className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-copper-text"
      >
        Registro de tiradas
      </h3>
      <p className="mt-1 font-chrome text-chrome-xs text-muted">
        Lo que la mesa puede ver. Las tiradas que no te tocan no llegan hasta aquí.
      </p>

      {registro.isPending && (
        <p className="mt-s2 font-chrome text-chrome-sm text-muted">Leyendo el registro…</p>
      )}

      {registro.isError && (
        <p role="alert" className="mt-s2 font-chrome text-chrome-sm text-danger-text">
          {mensajeDeError(registro.error)}
        </p>
      )}

      {registro.data &&
        (registro.data.events.length === 0 ? (
          <p className="mt-s2 font-chrome text-chrome-sm text-muted">
            Todavía no se ha tirado nada en esta campaña.
          </p>
        ) : (
          <ul className="mt-s2">
            {registro.data.events.map((fila) => (
              <FilaDeRegistro key={fila.id} fila={fila} />
            ))}
          </ul>
        ))}
    </section>
  );
}
