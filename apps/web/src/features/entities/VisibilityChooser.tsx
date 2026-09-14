import type { ReactNode } from "react";
import type { Visibility } from "@dnd/shared";
import { Badge } from "../../ui/Badge";
import { EXPLICACION_DE_NIVEL } from "./visibilidad";

// Reseño 2026-09-02, segunda pasada — el control de visibilidad.
//
// Era un `<select>` que pintaba **los valores del enum en crudo**: "PUBLIC", "PLAYERS",
// "SPECIFIC_PLAYERS", "OWNER_DM", "DM_ONLY", en una interfaz en español. Es el mismo fallo que
// el autor había señalado ya en la lista de enlaces, y aquí dolía más: la visibilidad es el
// rasgo que distingue a este producto de una wiki cualquiera, y estaba pidiendo al DM que
// eligiera entre cinco palabras en inglés sin decirle qué hace ninguna.
//
// Ahora son radios verticales. Práctica establecida (GOV.UK, Adam Silver, NN/g): con pocas
// opciones y **significado distinto en cada una**, un desplegable esconde justo lo que hay que
// comparar. Cinco caben en pantalla, y cada una lleva la frase que explica quién ve qué.
//
// La explicación NO es decoración: quien se equivoque aquí enseña a sus jugadores algo que no
// debía verse. Y sigue sin ser control de acceso — quien decide es `canView` en el servidor.

const TODOS: Visibility[] = ["PUBLIC", "PLAYERS", "SPECIFIC_PLAYERS", "OWNER_DM", "DM_ONLY"];

export function VisibilityChooser({
  value,
  onChange,
  disabled = false,
  niveles = TODOS,
  children,
  legend = "Quién puede verlo",
  aclaracion,
}: {
  value: Visibility;
  onChange: (next: Visibility) => void;
  disabled?: boolean;
  /**
   * Los niveles que ESTE objeto admite. Las sesiones y los personajes no ofrecen los cinco.
   * Si el valor guardado no está en la lista —porque lo puso otra versión, u otra pantalla— se
   * añade al final, marcado y no seleccionable, en vez de desaparecer en silencio: una opción
   * que no se ve es un dato que se pierde al guardar.
   */
  niveles?: Visibility[];
  /** El bloque de jugadores concretos, que solo aparece cuando hace falta. */
  children?: ReactNode;
  /**
   * **PNJ del mundo y la mesa (E-PM-14)**: la plantilla del bestiario y la instancia en la mesa
   * son dos fronteras distintas con el mismo control, y confundirlas es justo el error que la
   * spec §3.4 pide evitar. Con el valor de hoy por defecto, los consumidores que no distinguen
   * (sesiones, objetos, reglas de la mesa…) no cambian ni su rótulo ni su prueba.
   */
  legend?: string;
  /** Bajo el `legend`, cuando hace falta precisar a qué frontera afecta este control en concreto. */
  aclaracion?: string;
}) {
  const opciones = niveles.includes(value) ? niveles : [...niveles, value];
  return (
    <fieldset className="rounded-radius-sm border border-muted p-s3">
      <legend className="px-1 font-chrome text-chrome-sm text-text">{legend}</legend>
      {aclaracion && <p className="mb-s2 font-chrome text-chrome-xs text-muted">{aclaracion}</p>}
      <div className="space-y-1">
        {opciones.map((valor) => {
          const elegido = value === valor;
          const fueraDeLista = !niveles.includes(valor);
          const explicacion = fueraDeLista
            ? "Valor guardado por otra pantalla. Se conserva, pero no se puede elegir aquí."
            : EXPLICACION_DE_NIVEL[valor];
          return (
            <label
              key={valor}
              className={[
                "flex cursor-pointer items-start gap-s2 rounded-radius-sm border px-s2 py-1.5 transition-colors",
                elegido
                  ? "border-accent bg-[color:var(--accent-tint)]"
                  : "border-transparent hover:bg-surface",
                disabled ? "cursor-not-allowed opacity-70" : "",
              ].join(" ")}
            >
              <input
                type="radio"
                name="visibility"
                value={valor}
                checked={elegido}
                disabled={disabled || fueraDeLista}
                onChange={() => onChange(valor)}
                className="mt-1 accent-[var(--accent)]"
              />
              <span className="min-w-0">
                <Badge visibility={valor} />
                <span className="mt-0.5 block font-chrome text-chrome-xs leading-snug text-muted">
                  {explicacion}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {/* Revelado progresivo: la lista de jugadores solo existe cuando el nivel la necesita, y
          aparece pegada a la opción que la pide en vez de flotar como otro campo más. */}
      {value === "SPECIFIC_PLAYERS" && children && <div className="mt-s3">{children}</div>}
    </fieldset>
  );
}
