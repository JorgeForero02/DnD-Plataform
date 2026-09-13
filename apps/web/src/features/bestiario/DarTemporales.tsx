import { useId, useState } from "react";
import { Button } from "../../ui/Button";
import { fieldControlClass } from "../../ui/Field";
import { useCharacterSheet, useSetHp } from "../character-sheet/hooks";

/**
 * **Dar PG temporales a un PNJ de la mesa** (ficha C6-4, plan 14).
 *
 * `NpcEnLaMesa.tempHp` se pintaba desde la auditoría del §8.5 y **nunca se había visto con datos**:
 * ninguna pantalla los concedía, así que siempre llegaba 0. Faltaba el gesto, no el código.
 *
 * ## Y las reglas, que aquí deciden la pantalla entera
 *
 * SRD 5.1: *«Healing can't restore temporary hit points, and they can't be added together. If you
 * have temporary hit points and receive more of them, you decide whether to keep the ones you have
 * or to gain the new ones.»*
 *
 * De ahí salen las dos cosas que este control hace y que un formulario normal no haría:
 *
 * - **No suma.** Si el PNJ ya tiene temporales, no se ofrece un «+N»: se **pregunta cuál se queda**,
 *   con los dos números delante. Sumarlos sería inventar una regla que el SRD prohíbe por escrito.
 * - **La elección es de quien los recibe, no del mayor.** El servidor se quedaba con el mayor por su
 *   cuenta —acierta casi siempre y **quita la decisión**—; hay efectos que interesa cambiar por
 *   otros más pequeños porque duran más. Ahora la decisión viaja.
 *
 * Sin temporales previos no hay nada que preguntar, y el control es un número y un botón: una
 * pregunta que salta cuando no hace falta se aprende a ignorar.
 */
export function DarTemporales({
  campaignId,
  characterId,
  nombre,
}: {
  campaignId: string;
  characterId: string;
  nombre: string;
}) {
  const idError = useId();
  const { data: hoja } = useCharacterSheet(campaignId, characterId);
  const fijar = useSetHp(campaignId, characterId);
  const [cuantos, setCuantos] = useState("5");
  const [error, setError] = useState<string | null>(null);
  // Anexo #20 — **la pregunta es estado explícito, no una derivación del número en el campo.**
  // Con `hayConflicto = actuales > 0 && nuevos > 0` (el valor viejo), en cuanto el PNJ tenía
  // algún temporal el `alertdialog` estaba puesto desde el primer render —`cuantos` empieza en
  // "5"— y «Dárselos» desaparecía: parecía que la pantalla no hacía nada. Ahora solo se
  // pregunta al pulsar, con temporales previos.
  const [preguntando, setPreguntando] = useState(false);

  const actuales = hoja?.hp.temp ?? 0;
  const nuevos = Number(cuantos);
  const version = hoja?.character.version;
  const hayPrevios = actuales > 0;

  // Revisión final de la rama (2026-09-13). **Un 0 o un campo vacío no apagan el botón**
  // (docs/04-convenciones.md: «el botón de guardar nunca se deshabilita»; T5 «Guardar la sala» lo
  // resolvió igual): se pulsa, se explica en línea y no sale nada — `tempHp: 0` o `NaN` no es
  // ninguno de los dos montones que el SRD pide elegir. Lo único que sigue apagando es la
  // petición en curso y la hoja sin llegar (sin `version` no hay petición posible).
  const cantidadValida = Number.isFinite(nuevos) && nuevos > 0;
  const rechazarCantidad = () => setError("Escribe cuántos PG temporales nuevos son.");

  const mandar = (eleccion: "mayor" | "los-nuevos") => {
    if (version === undefined) return;
    if (!cantidadValida) {
      rechazarCantidad();
      return;
    }
    setError(null);
    fijar.mutate(
      {
        tempHp: nuevos,
        tempHpEleccion: eleccion,
        expectedVersion: version,
        reason: `Temporales para ${nombre}`,
      },
      { onSuccess: () => setPreguntando(false), onError: (e) => setError((e as Error).message) },
    );
  };
  const alPulsarDarselos = () => {
    if (!cantidadValida) {
      rechazarCantidad();
      return;
    }
    setError(null);
    if (hayPrevios) setPreguntando(true);
    else mandar("los-nuevos");
  };

  return (
    <div className="flex flex-col gap-s1">
      <div className="flex flex-wrap items-end gap-s2">
        <label className="flex flex-col gap-0.5 font-chrome text-chrome-xs text-muted">
          PG temporales
          <input
            type="number"
            min={0}
            className={fieldControlClass + " w-20"}
            value={cuantos}
            onChange={(e) => setCuantos(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? idError : undefined}
          />
        </label>
        <Button
          type="button"
          variant="secondary"
          // **Apagado hasta que la hoja llegue**, y con su motivo: fijar PG exige la `version`
          // del personaje —es concurrencia optimista— y sin ella la petición no puede salir. Sin
          // este candado el botón se dejaba pulsar y **no hacía nada en silencio**, que es peor
          // que estar apagado; lo cazó su propia prueba.
          disabled={version === undefined || fijar.isPending}
          title={version === undefined ? "Cargando la ficha del PNJ…" : undefined}
          onClick={alPulsarDarselos}
        >
          {fijar.isPending ? "Dándolos…" : "Dárselos"}
        </Button>
      </div>

      {/* **La pregunta del SRD**, con los dos números delante. Nunca «¿seguro?»: lo que hay que
          decidir es cuál de los dos montones se queda, y eso se decide viéndolos. Solo sale al
          pulsar «Dárselos» con temporales previos — nunca sola (anexo #20). */}
      {preguntando && (
        <div
          role="alertdialog"
          aria-label="Ya tiene PG temporales"
          className="rounded-radius-sm border border-warning bg-[color:var(--warning-tint)] p-s2"
        >
          <p className="font-chrome text-chrome-xs text-text">
            {nombre} ya tiene <strong>{actuales}</strong> temporales. <strong>No se suman</strong>:
            se queda con unos o con otros.
          </p>
          <div className="mt-s2 flex flex-wrap gap-s2">
            <Button
              type="button"
              variant="secondary"
              // Mismo criterio que «Dárselos»: un 0 o un campo vacío no lo apagan — `mandar` lo
              // rechaza en línea sin mandar `tempHp: 0` ni `NaN`.
              disabled={fijar.isPending}
              onClick={() => mandar("los-nuevos")}
            >
              Quedarse con los {nuevos} nuevos
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={fijar.isPending}
              // SRD 5.1: «you decide whether to keep the ones you have or to gain the new ones» —
              // **conservar es no cambiar nada**. Mandar `tempHpEleccion: "mayor"` (que el
              // servidor resuelve con `Math.max`) cambiaba igual el PG temporal cuando los
              // nuevos eran más que los que ya tenía el PNJ (anexo #20).
              onClick={() => setPreguntando(false)}
            >
              Dejar los {actuales} que tenía
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p id={idError} role="alert" className="font-chrome text-chrome-xs text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}
