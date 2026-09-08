import { useState } from "react";
import { useMyRole } from "../campaigns/members";
import { TEMPORARY_MODIFIER_TARGETS, type TemporaryModifierTarget } from "@dnd/shared";
import { Button } from "../../ui/Button";
import { fieldControlClass } from "../../ui/Field";
import { PROSA_DE_HOJA } from "./Tarjeta";
import {
  useGrantTemporaryModifier,
  useRemoveTemporaryModifier,
  useTemporaryModifiers,
} from "./hooks";

/**
 * **Modificadores temporales** (plan 13, ficha M8): «+2 a Fuerza durante una hora».
 *
 * **Lo pidieron los jugadores por su nombre** —*«subidas y bajadas de atributos temporales»*— y no
 * estaba en ningún plan. Lo que esta pantalla tiene que hacer bien es una cosa: que el número de la
 * hoja **nunca cambie sin que se pueda ver por qué**.
 *
 * ## Tres decisiones que se ven aquí
 *
 * **El vencido no desaparece, se apaga** (D-2C-2). Si se borrara solo, el jugador vería su Fuerza
 * bajar dos puntos sin nada que mirar. Se queda tachado hasta que alguien lo quite.
 *
 * **La duración es del reloj de la partida**, no del reloj de pared, y el texto lo dice: «una hora
 * de juego». Callarlo habría hecho que la mesa esperase que caducara sola con el tiempo real.
 *
 * **El motivo es obligatorio y es prosa libre.** Es lo único que la traza puede enseñar, y un `+2`
 * sin origen es exactamente lo que la traza existe para impedir.
 */
const NOMBRE_OBJETIVO: Record<TemporaryModifierTarget, string> = {
  "ability.str": "Fuerza",
  "ability.dex": "Destreza",
  "ability.con": "Constitución",
  "ability.int": "Inteligencia",
  "ability.wis": "Sabiduría",
  "ability.cha": "Carisma",
  ac: "Clase de armadura",
  "speed.walk": "Velocidad al andar",
  "speed.climb": "Velocidad al trepar",
  "speed.swim": "Velocidad al nadar",
  "speed.fly": "Velocidad al volar",
  "speed.burrow": "Velocidad al excavar",
};

/** Las duraciones que una mesa dice en voz alta. **En segundos del reloj de campaña.** */
const DURACIONES: { etiqueta: string; segundos?: number }[] = [
  { etiqueta: "1 minuto de juego", segundos: 60 },
  { etiqueta: "10 minutos de juego", segundos: 600 },
  { etiqueta: "1 hora de juego", segundos: 3600 },
  { etiqueta: "8 horas de juego", segundos: 28_800 },
  // Sin caducidad: hay efectos que duran «hasta que el DM lo diga», y fingirles una duración
  // habría sido inventarse una regla.
  { etiqueta: "Hasta que se quite", segundos: undefined },
];

export function ModificadoresTemporales({
  campaignId,
  characterId,
  puedeEditar,
}: {
  campaignId: string;
  characterId: string;
  puedeEditar: boolean;
}) {
  // **Conceder es del DM desde el 2026-09-07** (ficha P1, puerta B): el servidor responde 403 a
  // cualquier otro, y dejar el formulario puesto sería ofrecer un gesto que la API rechaza — que
  // este proyecto declara defecto en `04-convenciones.md`.
  //
  // Va por `useMyRole` y no por una prop nueva porque es el patrón que ya usan `Anulaciones` y
  // `RecursosYDescansos` para lo mismo. **`puedeEditar` sigue mandando en «Quitar»**: `remove`
  // continúa siendo dueño-o-DM en el servidor, así que son dos permisos distintos y aquí se leen
  // como dos.
  // Se llama `esDm` y no `puedeConceder` porque **ese nombre ya está cogido** más abajo, y
  // significa otra cosa: si el formulario está listo para enviarse. Dos permisos y una validez de
  // formulario en el mismo componente son tres cosas, y las tres se leen por su nombre.
  const { role } = useMyRole(campaignId);
  const esDm = role === "DM";
  const { data: filas, isLoading } = useTemporaryModifiers(campaignId, characterId);
  const conceder = useGrantTemporaryModifier(campaignId, characterId);
  const quitar = useRemoveTemporaryModifier(campaignId, characterId);
  const [objetivo, setObjetivo] = useState<TemporaryModifierTarget>("ability.str");
  const [cantidad, setCantidad] = useState("2");
  const [motivo, setMotivo] = useState("");
  const [duracion, setDuracion] = useState("3600");

  if (isLoading) return null;
  const lista = filas ?? [];

  const puedeConceder = motivo.trim() !== "" && Number(cantidad) !== 0 && !conceder.isPending;

  // **Sin `aria-label` ni título propios**: `TarjetaDeHoja` ya es la región y ya pone el
  // encabezado. Duplicarlos daba **dos regiones anidadas con el mismo nombre**, que es una
  // ambigüedad para quien navega por regiones — lo cazó el recorrido de navegador, no jsdom.
  return (
    <div className="flex flex-col gap-s2">
      {lista.length === 0 ? (
        <p className={PROSA_DE_HOJA}>Ninguno ahora mismo.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {lista.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-s2 rounded-radius-sm border border-muted px-s2 py-1"
            >
              <span className={m.expired ? "text-muted line-through" : "text-text"}>
                <span className="font-data text-chrome-sm">
                  {m.amount >= 0 ? `+${m.amount}` : `−${Math.abs(m.amount)}`}
                </span>{" "}
                <span className="font-chrome text-chrome-sm">
                  a {NOMBRE_OBJETIVO[m.target as TemporaryModifierTarget] ?? m.target}
                </span>{" "}
                <span className="font-chrome text-chrome-xs text-muted">— {m.reason}</span>
              </span>
              <span className="flex items-center gap-s2">
                {/* **Vencido se dice, no se deduce del tachado**: el color y el estilo no pueden
                    ser los únicos portadores de la información. */}
                {m.expired && (
                  <span className="font-chrome text-chrome-xs text-muted">Vencido</span>
                )}
                {!m.expired && m.expiresAtClock === null && (
                  <span className="font-chrome text-chrome-xs text-muted">Sin caducidad</span>
                )}
                {puedeEditar && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-1.5 py-0.5 text-chrome-xs"
                    disabled={quitar.isPending}
                    onClick={() => quitar.mutate(m.id)}
                    aria-label={`Quitar ${m.reason}`}
                  >
                    Quitar
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {esDm && (
        <div className="flex flex-col gap-s1">
          <div className="flex flex-wrap items-end gap-s2">
            <label className="flex flex-col gap-0.5 font-chrome text-chrome-xs text-muted">
              A qué
              <select
                className={fieldControlClass + " w-44"}
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value as TemporaryModifierTarget)}
              >
                {TEMPORARY_MODIFIER_TARGETS.map((t) => (
                  <option key={t} value={t}>
                    {NOMBRE_OBJETIVO[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-0.5 font-chrome text-chrome-xs text-muted">
              Cuánto
              <input
                type="number"
                className={fieldControlClass + " w-20"}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-0.5 font-chrome text-chrome-xs text-muted">
              Cuánto dura
              <select
                className={fieldControlClass + " w-48"}
                value={duracion}
                onChange={(e) => setDuracion(e.target.value)}
              >
                {DURACIONES.map((d) => (
                  <option key={d.etiqueta} value={d.segundos === undefined ? "" : d.segundos}>
                    {d.etiqueta}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-0.5 font-chrome text-chrome-xs text-muted">
            De dónde sale
            <input
              type="text"
              className={fieldControlClass}
              placeholder="Poción de fuerza de gigante"
              maxLength={160}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </label>
          <p className={PROSA_DE_HOJA}>
            El motivo sale en la traza, junto al número: sin él, el <strong>+2</strong> aparecería
            sin decir de dónde. Y la duración se cuenta en <strong>el reloj de la partida</strong>,
            no en el de la pared.
          </p>
          <div>
            <Button
              type="button"
              variant="secondary"
              disabled={!puedeConceder}
              onClick={() =>
                conceder.mutate({
                  target: objetivo,
                  amount: Number(cantidad),
                  reason: motivo.trim(),
                  ...(duracion === "" ? {} : { durationSeconds: Number(duracion) }),
                })
              }
            >
              {conceder.isPending ? "Poniéndolo…" : "Ponerlo"}
            </Button>
          </div>
          {conceder.isError && (
            <p role="alert" className={`${PROSA_DE_HOJA} text-danger-text`}>
              {(conceder.error as Error).message}
            </p>
          )}
          {quitar.isError && (
            <p role="alert" className={`${PROSA_DE_HOJA} text-danger-text`}>
              {(quitar.error as Error).message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
