import { useId } from "react";
import type { RollMode } from "@dnd/shared";
import { MODOS_DE_TIRADA, modoDeTirada } from "./vocabulario";

// **Ninguna clase de opacidad de Tailwind compila en este proyecto** (P1 de docs/06-pendientes.md):
// los colores se declaran como `var(--x)` sin `<alpha-value>`, así que Tailwind descarta la
// utilidad ENTERA y el elemento se queda con el `border-color` del preflight — `#e5e7eb` en
// los dos temas. Lo que había aquí, por tanto, no era un borde tenue: era un borde gris claro
// equivocado. Se pone el token entero, que es theme-aware, o se quita la clase cuando lo que
// pedía era un relleno translúcido que ningún token puede dar todavía.

// Tarea F3 — **ventaja y desventaja como decisión de tres estados**, no como sintaxis.
//
// El jugador no escribe `2d20kh1` jamás. Antes de F3 esto eran tres botones sueltos —«Tirar»,
// «Ventaja», «Desventaja»— que además *tiraban* al pulsarlos: no había estado, no se veía cuál
// estaba elegido, y las dos frases que explican la diferencia solo existían en un `title` que
// nadie ve con el teclado. Ahora es lo que es en el juego: **una decisión, tres estados**,
// visibles a la vez y con su explicación.
//
// **Visibles a la vez, nunca en un desplegable** (docs/04-convenciones.md): cuando las opciones
// son pocas y cada una quiere decir algo distinto, un desplegable esconde justo lo que hay que
// comparar. Mismo patrón que `features/entities/VisibilityChooser.tsx`.
//
// **Por qué solo se pinta la frase del estado elegido.** La hoja monta este control veinticuatro
// veces —seis salvaciones y dieciocho habilidades—, y tres frases por fila serían setenta y dos
// líneas de texto repetido: el ornamento informa o compite, y ahí competiría. La frase cambia al
// moverse por los radios (flechas del teclado incluidas), así que se lee la de la opción que se
// está considerando; las otras dos siguen alcanzables para un lector de pantalla, porque cada
// radio lleva la suya en su `aria-describedby`.

export function SelectorDeVentaja({
  value,
  onChange,
  etiqueta,
  disabled = false,
}: {
  value: RollMode;
  onChange: (siguiente: RollMode) => void;
  /** Qué se va a tirar. Da nombre al grupo: «Cómo tirar Percepción». */
  etiqueta: string;
  disabled?: boolean;
}) {
  // `useId` y no un nombre fijo: hay un grupo de radios por fila, y dos grupos con el mismo
  // `name` serían **un solo** grupo — elegir «Ventaja» en Sigilo apagaría el de Percepción.
  const grupo = useId();

  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className="sr-only">Cómo tirar {etiqueta}</legend>
      <div className="flex flex-wrap items-center gap-x-s2 gap-y-0.5">
        {MODOS_DE_TIRADA.map((m) => {
          const elegido = m.modo === value;
          return (
            <label
              key={m.modo}
              className={[
                "inline-flex cursor-pointer items-center gap-1 rounded-radius-sm border px-1.5 py-0.5 font-chrome text-chrome-xs transition-colors",
                elegido ? "border-accent text-text" : "border-transparent text-muted",
                disabled ? "cursor-not-allowed" : "hover:bg-surface",
              ].join(" ")}
            >
              <input
                type="radio"
                name={grupo}
                value={m.modo}
                checked={elegido}
                disabled={disabled}
                onChange={() => onChange(m.modo)}
                aria-describedby={`${grupo}-${m.modo}`}
                className="accent-[var(--accent)]"
              />
              {m.etiqueta}
            </label>
          );
        })}
      </div>
      {/* Las tres frases, fuera de las etiquetas: dentro de un `<label>` pasarían a formar
          parte del **nombre** del radio («Ventaja Dos d20: se queda el alto»), y el nombre de un
          control es lo que se dice de él, no lo que hace. Aquí son su descripción. */}
      <div hidden>
        {MODOS_DE_TIRADA.map((m) => (
          <span key={m.modo} id={`${grupo}-${m.modo}`}>
            {m.frase}
          </span>
        ))}
      </div>
      <p data-frase="elegida" className="font-chrome text-chrome-xs text-muted">
        {modoDeTirada(value).frase}
      </p>
    </fieldset>
  );
}
