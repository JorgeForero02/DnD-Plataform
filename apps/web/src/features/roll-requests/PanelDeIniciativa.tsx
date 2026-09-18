import { useId } from "react";
import { Button, Panel } from "../../ui";
import { IconoD20, IconoEspada } from "../../ui/Iconos";
import { modoDeTirada } from "../rolls/vocabulario";
import { GastarInspiracion } from "../rolls/panel/GastarInspiracion";
import type { RollRequestRow } from "./api";
import { nombreDeClave } from "./vocabulario";

// Tarea 9 (plan 2026-09-05-iniciativa-y-bando) — **lo que ve el jugador cuando el combate lo
// llama a él.**
//
// Hasta esta tarea, una petición de iniciativa se pintaba igual que cualquier otra fila de
// `TiradasPendientes`: la misma caja pequeña, la misma tipografía discreta. Pero el combate no es
// una tirada más — la mesa entera está esperando a que este jugador tire, y hoy no había forma de
// distinguir esa espera de «tirad Percepción por si acaso». Este panel es esa distinción: **lo
// único** que la separa de una petición normal es que trae `encounterId` (tarea 8,
// `RollRequestRow.encounterId`), y `TiradasPendientes` es quien decide, mirando ese campo, cuál de
// las dos pintar.
//
// **El modificador (ronda de arreglo 1) ahora sí viaja, y lo manda el servidor.** La primera
// versión de este panel no lo enseñaba: `RollRequestRow` no lo declaraba y recalcularlo aquí
// habría sido reinventar la derivación de la hoja (`apps/api/src/rules/`) por triplicado. La
// corrección no fue inventarlo en el navegador — sigue sin serlo — sino que
// `RollRequestsService.list` lo calcula con **la misma función privada que ya usa `answer()`**
// para tirar de verdad (`modificadorDeLaHoja`), así que el número que se ve antes de tirar es el
// mismo que se va a usar al tirar. Puede llegar `null` —una hoja que no deriva (personaje
// incompleto) no puede dar un modificador— y entonces este panel no enseña ningún número: nunca
// uno inventado.
const formatoModificador = (n: number): string => {
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return "+0";
};
export interface PanelDeIniciativaProps {
  /** La petición de la que salió este panel. Su `encounterId` ya no nulo es lo que la trajo aquí. */
  peticion: RollRequestRow;
  campaignId: string;
  /** El DM ve la mesa entera y puede llevar más de un personaje; sin nombre no se sabe a quién. */
  nombrePersonaje: string | null;
  conInspiracion: boolean;
  onCambiarInspiracion: (v: boolean) => void;
  onTirar: () => void;
  /** La petición ya está en vuelo: el botón se apaga y lo dice, no desaparece. */
  tirando: boolean;
  error?: string;
}

/**
 * El panel del jugador cuando el DM ha pedido iniciativa: grande, con su propio color de aviso, y
 * **sin botón de cerrar** — esa es la prueba del brief, y tiene un motivo: cerrarlo sin tirar
 * dejaría al jugador fuera del combate mientras la mesa sigue, así que la única salida es tirar.
 *
 * **Y tampoco secuestra la aplicación.** No es un `Dialog`: no hay velo, no atrapa el foco, no
 * hace nada que le impida al jugador seguir mirando su hoja mientras decide. Se va solo cuando su
 * petición deja de estar en la lista que sondea `TiradasPendientes` — al tirar, o porque el DM
 * canceló el combate y la petición desapareció sin dejar rastro — y no antes.
 */
export function PanelDeIniciativa({
  peticion,
  campaignId,
  nombrePersonaje,
  conInspiracion,
  onCambiarInspiracion,
  onTirar,
  tirando,
  error,
}: PanelDeIniciativaProps) {
  const modo = modoDeTirada(peticion.mode);
  const idMotivoApagado = `tirando-iniciativa-${peticion.id}`;
  const motivoApagado = tirando ? idMotivoApagado : undefined;
  const idTitulo = useId();

  // **Ronda de arreglo 1 (C-1) — la clave se omite cuando repite el rótulo.** El servidor pide
  // iniciativa con `key: "initiative"` y `label: "Iniciativa"` (`encounters.service.ts`): las dos
  // se traducen a la misma palabra, así que sin este descarte el panel diría «Iniciativa» en el
  // título y otra vez «Iniciativa» en el renglón de debajo, como si fueran dos datos distintos.
  const claveTraducida = nombreDeClave(peticion.key);
  const clave = claveTraducida === peticion.label ? null : claveTraducida;

  return (
    <section
      aria-labelledby={idTitulo}
      className="mb-s5"
      // Tarea 11 (2026-09-05, iniciativa-y-bando) — el ancla del e2e que mide este panel a
      // 390 px con `boundingBox`: `jsdom` no maqueta, así que sin un navegador de verdad esta
      // anchura nunca se había comprobado.
      data-testid="panel-de-iniciativa"
    >
      <Panel className="max-w-[24rem] border-warning">
        <div className="flex items-center gap-s2">
          <IconoEspada className="h-6 w-6 text-warning-text" />
          <h3
            id={idTitulo}
            className="font-title text-chrome-lg uppercase tracking-wide text-warning-text"
          >
            Empieza el combate
          </h3>
        </div>

        <p className="mt-s2 font-chrome text-chrome-sm text-text">
          {nombrePersonaje ? `${nombrePersonaje}: ` : ""}
          {peticion.label}
        </p>

        <p className="mt-0.5 font-chrome text-chrome-xs text-muted">
          {[
            clave,
            peticion.dc !== null ? `CD ${peticion.dc}` : null,
            // Ningún valor de enumeración llega a la pantalla: si el modo no es el normal, se
            // dice con la misma frase que ya traduce `features/rolls/vocabulario.ts` — la única
            // tabla de nombres de `RollMode` que tiene esta web.
            peticion.mode !== "NORMAL" ? modo.etiqueta : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {/* **El modificador, antes de tirar** (ronda de arreglo 1, I-2): lo manda el servidor,
            calculado con la misma hoja que va a usar la tirada de verdad. Sin él —hoja que no
            deriva— no se pinta ningún número, ni se intenta adivinar. */}
        {peticion.modifier != null && (
          <p className="mt-1 font-data text-chrome-sm text-text">
            {formatoModificador(peticion.modifier)}
          </p>
        )}

        <div className="mt-s3">
          <GastarInspiracion
            campaignId={campaignId}
            characterId={peticion.characterId}
            modo={peticion.mode}
            value={conInspiracion}
            onChange={onCambiarInspiracion}
            disabled={tirando}
          />
        </div>

        <div className="mt-s3">
          <Button
            type="button"
            variant="primary"
            onClick={onTirar}
            disabled={tirando}
            aria-describedby={motivoApagado}
          >
            <IconoD20 />
            Tirar iniciativa
          </Button>
          {tirando && (
            <p id={idMotivoApagado} className="mt-1 font-chrome text-chrome-xs text-muted">
              Ya está en camino: no hace falta pulsar otra vez.
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-1 font-chrome text-chrome-xs text-danger-text">
            {error}
          </p>
        )}
      </Panel>
    </section>
  );
}
