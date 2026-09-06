import { Button, Panel } from "../../ui";
import { IconoEspada } from "../../ui/Iconos";
import { DadoDibujado } from "../rolls/DadoDibujado";
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
// **El modificador que pide el brief no se pinta.** El brief pide enseñarlo antes de tirar, y eso
// exige que lo mande el servidor — recalcularlo en el navegador sería reinventar la derivación de
// la hoja (`apps/api/src/rules/`) por triplicado, y la primera vez que el motor cambiara una
// fórmula, esta pantalla mentiría con un número que parece de fiar. Se comprobó qué devuelve de
// verdad `GET .../roll-requests` (`features/roll-requests/api.ts`, `RollRequestRow`): trae `key`,
// `dc`, `mode` y `audience`, no un modificador. Así que aquí se enseña lo que sí llega — la
// prueba del servidor, no un número inventado — y el hueco queda anotado en el informe de esta
// tarea para quien decida si merece la pena que el servidor lo mande.
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

  return (
    <section aria-label="Empieza el combate" className="mb-s5">
      <Panel className="max-w-[24rem] border-warning">
        <div className="flex items-center gap-s2">
          <IconoEspada className="h-6 w-6 text-warning-text" />
          <h3 className="font-title text-chrome-lg uppercase tracking-wide text-warning-text">
            Empieza el combate
          </h3>
        </div>

        <p className="mt-s2 font-chrome text-chrome-sm text-text">
          {nombrePersonaje ? `${nombrePersonaje}: ` : ""}
          {peticion.label}
        </p>

        <p className="mt-0.5 font-chrome text-chrome-xs text-muted">
          {[
            nombreDeClave(peticion.key),
            peticion.dc !== null ? `CD ${peticion.dc}` : null,
            // Ningún valor de enumeración llega a la pantalla: si el modo no es el normal, se
            // dice con la misma frase que ya traduce `features/rolls/vocabulario.ts` — la única
            // tabla de nombres de `RollMode` que tiene esta web.
            peticion.mode !== "NORMAL" ? modo.etiqueta : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>

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
            <DadoDibujado />
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
