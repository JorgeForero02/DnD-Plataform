import type { DmTableRoll } from "@dnd/shared";
import { COIN_KEYS } from "@dnd/shared";
import { IconoAviso } from "../../ui/Iconos";
import { DarObjeto } from "../sessions/elenco/DarObjeto";
import { fraseDeMoneda } from "../inventory/vocabulario";

/**
 * **El resultado de tirar sobre una tabla, con su botín si lo trae** (tarea B5, 2026-09-06).
 *
 * Antes de esta tarea, `tirar.data` solo pintaba el dado y el texto de la fila
 * (`PanelDeTablas.tsx`, tal cual sigue haciendo para una tabla que no entrega nada). Lo que se
 * añade aquí es la mitad que faltaba: si la fila trajo `entrega` (B1+B2, `eaa333e`), se enseña lo
 * que da **con nombre y no con clave** —el servidor ya la resolvió—, y se ofrece dárselo a alguien
 * sin salir de la mesa, reutilizando `DarObjeto` de B4 en vez de escribir un segundo gesto.
 *
 * **La unión discriminada por `ausente` obliga a tratar los dos casos**, y aquí se hace sin `as`.
 * Pero **el motivo del servidor NO se pinta tal cual** (arreglo de vuelta 1, crítico): ese motivo
 * es el `error.message` de `resolveContentRef` (`resolve-item.ts:42`), pensado para un
 * desarrollador leyendo un log —`"short-sword" no es un objeto del catálogo del SRD.`—, y lleva
 * la clave dentro. Repetirlo en la mesa habría sido exactamente la fuga que esta tarea existe
 * para cerrar, solo que por la puerta de al lado. La pantalla dice una frase propia, sin clave:
 * «Ya no está en el catálogo.» — la mitad diagnóstica se queda en el log del servidor, que es
 * donde ya vivía.
 *
 * **Por qué el botón «Dar» puede desaparecer cuando NO cabe la regla general de
 * `docs/04-convenciones.md`** («el botón de guardar nunca se deshabilita»): esa regla protege una
 * acción que siempre tiene algo válido detrás. Aquí, cuando la fila entera resultó ser una `ref`
 * caduca y no trae monedas, no hay ninguna acción detrás del botón — pulsarlo no entregaría nada
 * a nadie. La salida que el encargo prefería —«no ofrecer el gesto en vez de apagarlo»— es
 * exactamente lo que pasa cuando hay una MEZCLA de objetos vivos y caducos: los caducos se dicen
 * y no se ofrecen, y el botón sigue encendido para los que sí se pueden dar. Solo cuando no queda
 * NADA que dar —el caso de esta fila, con un único objeto y ese objeto ausente— `DarObjeto` no
 * pinta ningún botón, solo el motivo como texto (ver la cabecera de `DarObjeto.tsx`: un botón
 * apagado y ningún botón no son lo mismo para quien navega con teclado).
 *
 * **Un jugador no ve «Dar» sobre este resultado, y eso no es control de acceso**: la puerta de
 * verdad es el servidor (`requireOwnerOrDM`, ya en `inventory.service.ts`). Esconder el botón
 * aquí solo evita ofrecerle a un jugador un gesto que el servidor le va a rechazar con un 403 —
 * exactamente la misma razón por la que `PanelDeTablas` ya esconde «Editar» y «Borrar» del DM.
 */
export function ResultadoDeTabla({
  tirada,
  soyDm,
  campaignId,
}: {
  tirada: DmTableRoll;
  /** Si quien mira puede dar lo que salió. La puerta real está en el servidor. */
  soyDm: boolean;
  campaignId: string;
}) {
  const entrega = tirada.entrega;
  const objetos = entrega?.objetos ?? [];
  const monedas = entrega?.monedas;
  const clavesConMoneda = COIN_KEYS.filter((clave) => (monedas?.[clave] ?? 0) > 0);

  // Solo los objetos que de verdad se pueden dar: uno `ausente` no tiene `ref` resoluble a la que
  // aplicar `addInventoryItem`, así que no entra en la `entregaFija` de `DarObjeto`.
  const objetosDables = objetos.filter((objeto) => !objeto.ausente);
  const hayAlgoQueDar = objetosDables.length > 0 || clavesConMoneda.length > 0;

  return (
    <div
      role="status"
      className="mt-s3 rounded-radius-sm border border-copper bg-bg p-s2 font-chrome text-chrome-sm text-text"
    >
      <p>
        <span className="font-data text-copper-text">
          d{tirada.die} → {tirada.roll}
        </span>{" "}
        {tirada.text}
      </p>

      {entrega && (
        <div className="mt-s2 border-t border-muted pt-s2">
          <ul className="space-y-1">
            {objetos.map((objeto, indice) =>
              objeto.ausente ? (
                <li key={indice} className="flex items-start gap-1 text-muted">
                  <IconoAviso className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {/* **Nunca el `motivo` del servidor tal cual** (ver la cabecera): lleva la
                      clave de catálogo dentro, y eso es justo la fuga que esta tarea cierra. La
                      mesa solo necesita saber que ya no está — el porqué exacto es diagnóstico
                      de servidor, no información de juego. */}
                  <span>Este objeto ya no existe: ya no está en el catálogo.</span>
                </li>
              ) : (
                <li key={indice}>
                  {objeto.name}
                  {objeto.cantidad > 1 ? ` x${objeto.cantidad}` : ""}
                </li>
              ),
            )}
            {clavesConMoneda.map((clave) => (
              <li key={clave}>{fraseDeMoneda(clave, monedas![clave]!)}</li>
            ))}
          </ul>

          {soyDm && (
            <div className="mt-s2">
              <DarObjeto
                campaignId={campaignId}
                soyDm
                // No aplica: `soyDm` en `true` ignora este valor por completo (ver DarObjeto).
                miPersonajeId=""
                disabled={!hayAlgoQueDar}
                motivoDeshabilitado={
                  hayAlgoQueDar
                    ? undefined
                    : "No hay nada que dar: lo que traía esta tirada ya no existe."
                }
                entregaFija={{
                  objetos: objetosDables.map((objeto) => ({
                    ref: objeto.ref,
                    cantidad: objeto.cantidad,
                    nombre: objeto.name,
                  })),
                  monedas,
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
