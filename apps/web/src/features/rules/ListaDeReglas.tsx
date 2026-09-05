import { useState } from "react";
import type { RuleStatus } from "@dnd/shared";
import { Button, EmptyState } from "../../ui";
import type { Entity } from "../entities/api";
import type { RuleRow } from "./api";
import { IconoArmada, IconoDesarmada, IconoEnsayo, IconoRota } from "./iconos";
import {
  describirDisparador,
  describirEfecto,
  explicacionEstadoRegla,
  nombreEstadoRegla,
  nombreModo,
} from "./vocabulario";

// Tarea 2A.17 — la lista de reglas de la campaña.
//
// Cada fila dice lo que un DM necesita antes de tocar nada: cómo se llama, si está escuchando,
// si actúa sola o pregunta, y cuántas veces ha actuado ya. El icono acompaña al texto; nunca lo
// sustituye, porque el estado no puede depender de reconocer un dibujo.

function IconoDeEstado({ status }: { status: RuleStatus }) {
  if (status === "ARMED") return <IconoArmada className="text-accent-text" />;
  if (status === "BROKEN") return <IconoRota className="text-danger-text" />;
  return <IconoDesarmada className="text-muted" />;
}

export function ListaDeReglas({
  reglas,
  entities,
  cambiandoEstado,
  onCambiarEstado,
  onEditar,
  onEnsayar,
  onBorrar,
}: {
  reglas: RuleRow[];
  entities: Entity[];
  cambiandoEstado: boolean;
  onCambiarEstado: (regla: RuleRow, status: RuleStatus) => void;
  onEditar: (regla: RuleRow) => void;
  onEnsayar: (regla: RuleRow) => void;
  onBorrar: (regla: RuleRow) => void;
}) {
  // Confirmación en pantalla, nunca `window.confirm` (patrón ya establecido en la tarea 1.16).
  const [confirmandoBorrado, setConfirmandoBorrado] = useState<string | null>(null);

  const nombrePorId = new Map(entities.map((e) => [e.id, e.name]));
  const nombreFicha = (id: string) => nombrePorId.get(id) ?? `entrada ${id.slice(-6)}`;

  if (reglas.length === 0) {
    return (
      <EmptyState title="Esta campaña no tiene reglas todavía">
        Una regla es una frase: cuando pase esto, si se cumple aquello, entonces haz esto otro.
      </EmptyState>
    );
  }

  return (
    <ul className="space-y-s3">
      {reglas.map((regla) => (
        <li
          key={regla.id}
          data-estado={regla.status}
          className="rounded-radius-sm border border-muted p-s3"
        >
          <div className="flex flex-wrap items-baseline gap-x-s3 gap-y-1">
            <h3 className="font-title text-chrome-md text-text">{regla.name}</h3>
            <span className="flex items-center gap-1 font-chrome text-chrome-xs text-text">
              <IconoDeEstado status={regla.status} />
              {nombreEstadoRegla(regla.status)}
            </span>
            <span className="font-chrome text-chrome-xs text-muted">{nombreModo(regla.mode)}</span>
            <div className="flex-1" />
            <span className="font-data text-chrome-xs text-muted">
              {/* «cuántas veces se ha disparado si el dato viene»: el servidor siempre manda
                  `fireCount`, pero si un día dejara de hacerlo no se pinta un 0 inventado. */}
              {typeof regla.fireCount === "number"
                ? `${regla.fireCount} disparo${regla.fireCount === 1 ? "" : "s"}`
                : "sin dato de disparos"}
              {regla.maxFires !== null && ` de ${regla.maxFires}`}
            </span>
            {/* **Cuándo se disparó la última vez**: llegaba del servidor y no se pintaba
                (auditoría §8.5). «12 disparos» sin fecha no distingue una regla que actuó
                anoche de una que actuó en la sesión tres. La fecha va con el formato del
                navegador de quien mira, y el `title` lleva la hora exacta. */}
            {regla.lastFiredAt && (
              <span
                className="font-chrome text-chrome-xs text-muted"
                title={new Date(regla.lastFiredAt).toLocaleString()}
              >
                · última vez el {new Date(regla.lastFiredAt).toLocaleDateString()}
              </span>
            )}
          </div>

          <p className="mt-1 font-chrome text-chrome-xs text-muted">
            {explicacionEstadoRegla(regla.status)}
          </p>

          {regla.status === "BROKEN" && regla.brokenReason && (
            <p className="mt-1 font-chrome text-chrome-xs text-danger-text">{regla.brokenReason}</p>
          )}

          {!regla.triggerReachableToday && (
            <p className="mt-1 font-chrome text-chrome-xs text-text">
              Hoy nada de la aplicación emite este suceso todavía, así que esta regla no llegará a
              dispararse sola.
            </p>
          )}

          <dl className="mt-s2 space-y-0.5 font-chrome text-chrome-sm text-text">
            <div className="flex gap-s2">
              <dt className="w-20 shrink-0 text-chrome-xs uppercase tracking-[0.14em] text-copper-text">
                Cuando
              </dt>
              <dd>{describirDisparador(regla.trigger, nombreFicha)}</dd>
            </div>
            {regla.conditions.length > 0 && (
              <div className="flex gap-s2">
                <dt className="w-20 shrink-0 text-chrome-xs uppercase tracking-[0.14em] text-copper-text">
                  Si
                </dt>
                <dd>
                  {regla.conditions.length} condición
                  {regla.conditions.length === 1 ? "" : "es"}
                </dd>
              </div>
            )}
            <div className="flex gap-s2">
              <dt className="w-20 shrink-0 text-chrome-xs uppercase tracking-[0.14em] text-copper-text">
                Entonces
              </dt>
              <dd>
                <ul>
                  {regla.effects.map((efecto, i) => (
                    <li key={i}>{describirEfecto(efecto, nombreFicha)}</li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>

          <div className="mt-s3 flex flex-wrap gap-s2">
            {regla.status === "ARMED" ? (
              <Button
                variant="secondary"
                type="button"
                disabled={cambiandoEstado}
                onClick={() => onCambiarEstado(regla, "DISARMED")}
              >
                Desarmar
              </Button>
            ) : (
              <Button
                type="button"
                disabled={cambiandoEstado}
                onClick={() => onCambiarEstado(regla, "ARMED")}
              >
                Armar
              </Button>
            )}
            <Button variant="secondary" type="button" onClick={() => onEnsayar(regla)}>
              <IconoEnsayo />
              Ensayo en seco
            </Button>
            <Button variant="secondary" type="button" onClick={() => onEditar(regla)}>
              Editar
            </Button>
            {confirmandoBorrado === regla.id ? (
              <>
                <Button
                  variant="danger"
                  type="button"
                  onClick={() => {
                    setConfirmandoBorrado(null);
                    onBorrar(regla);
                  }}
                >
                  Sí, borrar la regla
                </Button>
                <Button variant="ghost" type="button" onClick={() => setConfirmandoBorrado(null)}>
                  Cancelar
                </Button>
              </>
            ) : (
              <Button
                variant="danger"
                type="button"
                onClick={() => setConfirmandoBorrado(regla.id)}
              >
                Borrar
              </Button>
            )}
          </div>

          {confirmandoBorrado === regla.id && (
            <p className="mt-s2 font-chrome text-chrome-xs text-muted">
              Se borra la regla y con ella toda su traza. Lo que ya cambió en el mundo se queda como
              está.
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
