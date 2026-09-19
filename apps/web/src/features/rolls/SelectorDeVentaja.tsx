import { useId } from "react";
import type { RollMode } from "@dnd/shared";
import { MODOS_DE_TIRADA } from "./vocabulario";

// **Ninguna clase de opacidad de Tailwind compila en este proyecto** (P1 de docs/06-pendientes.md):
// los colores se declaran como `var(--x)` sin `<alpha-value>`, así que Tailwind descarta la
// utilidad ENTERA y el elemento se queda con el `border-color` del preflight — `#e5e7eb` en
// los dos temas. Se pone el token entero, que es theme-aware.

// Tarea F3 — **ventaja y desventaja como decisión de tres estados**, no como sintaxis.
//
// El jugador no escribe `2d20kh1` jamás. Es lo que es en el juego: **una decisión, tres estados**,
// visibles a la vez y con su explicación (docs/04-convenciones.md: «una opción con significado no
// se esconde en un desplegable; van visibles a la vez, cada una con la frase que explica qué
// hace»). Mismo patrón que `features/entities/VisibilityChooser.tsx`.
//
// --- 2026-09-03: **las tres frases vuelven a estar visibles a la vez** ---
//
// Hasta hoy solo se pintaba la frase del estado elegido, y el motivo estaba escrito aquí: la hoja
// montaba este control **veinticuatro veces** —seis salvaciones y dieciocho habilidades—, y tres
// frases por fila eran setenta y dos líneas de texto repetido. Era una respuesta razonable a la
// pregunta equivocada. **El problema no era la frase: era montar la decisión veinticuatro veces.**
//
// Desde la adopción de la maqueta, este control ya no vive en la fila: vive en el panel de tirada
// (`PanelDeTirada.tsx`), que se abre al pulsar el dado y **existe una vez, cuando se va a decidir**.
// Ahí no hay nada que repetir, así que la regla se cumple entera y sin peaje: las tres opciones
// visibles a la vez, **cada una con su frase al lado**, en el momento en que se elige.
//
// Cada frase sigue siendo la **descripción** del radio (`aria-describedby`) y no parte de su
// nombre: dentro del `<label>` el lector de pantalla anunciaría «Ventaja Dos d20: se queda el
// alto» como si fuera el nombre del control, y el nombre de un control es lo que se dice de él,
// no lo que hace.

export function SelectorDeVentaja({
  value,
  onChange,
  etiqueta,
  disabled = false,
  descripcionId,
}: {
  value: RollMode;
  onChange: (siguiente: RollMode) => void;
  /** Qué se va a tirar. Da nombre al grupo: «Cómo tirar Percepción». */
  etiqueta: string;
  disabled?: boolean;
  /** Tarea 12, ítem 10.6 — id de un texto externo (el motivo de por qué está apagado, por
   * ejemplo) que describe el grupo. Va en el propio `fieldset`, no en un contenedor que lo
   * envuelva: `aria-describedby` solo cuenta en el elemento que lo lleva. */
  descripcionId?: string;
}) {
  // `useId` y no un nombre fijo: puede haber más de un panel abierto a la vez (una salvación y un
  // ataque), y dos grupos con el mismo `name` serían **un solo** grupo — elegir «Ventaja» en
  // Sigilo apagaría el de Percepción sin que nada fallara.
  const grupo = useId();

  return (
    // Revisión final del pulido (2026-09-13) — **sin `disabled` en el `fieldset`**: un fieldset
    // nativo apagado desactiva TODOS sus controles descendientes, por debajo de cualquier
    // `aria-disabled` que se ponga en el radio — el candado real tiene que estar solo en el
    // input, para que el control siga en la secuencia de tabulación.
    <fieldset className="min-w-0" aria-describedby={descripcionId}>
      <legend className="sr-only">Cómo tirar {etiqueta}</legend>
      <div className="flex flex-col gap-1">
        {MODOS_DE_TIRADA.map((m) => {
          const elegido = m.modo === value;
          const idRadio = `${grupo}-${m.modo}-radio`;
          const idFrase = `${grupo}-${m.modo}-frase`;
          return (
            // **La frase va FUERA del `<label>`, y no es un detalle de maquetación.** Dentro, el
            // texto del label pasa a formar parte del **nombre** del control: el radio se llamaría
            // «Ventaja Dos d20: se queda el alto», y el nombre de un control es lo que se dice de
            // él, no lo que hace. Aquí es su **descripción** (`aria-describedby`), que es la
            // relación que existe justamente para esto.
            <div
              key={m.modo}
              className={[
                "flex items-baseline gap-s2 rounded-radius-sm border px-s2 py-1 transition-colors",
                elegido ? "border-accent bg-[color:var(--accent-tint)]" : "border-muted",
              ].join(" ")}
            >
              <input
                id={idRadio}
                type="radio"
                name={grupo}
                value={m.modo}
                checked={elegido}
                aria-disabled={disabled || undefined}
                onChange={() => {
                  if (disabled) return;
                  onChange(m.modo);
                }}
                aria-describedby={idFrase}
                className="accent-[var(--accent)] aria-disabled:cursor-not-allowed"
              />
              <label
                htmlFor={idRadio}
                className={`shrink-0 font-chrome text-chrome-sm ${
                  disabled ? "cursor-not-allowed text-muted" : "cursor-pointer text-text"
                }`}
              >
                {m.etiqueta}
              </label>
              <span id={idFrase} className="font-chrome text-chrome-xs leading-snug text-muted">
                {m.frase}
              </span>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
