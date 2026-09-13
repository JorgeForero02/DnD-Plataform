import { useState } from "react";
import type { RollMode } from "@dnd/shared";
import { Button, Field, fieldControlClass } from "../../ui";
import { IconoDado } from "../../ui/Iconos";
import { SelectorDeVentaja } from "./SelectorDeVentaja";
import { DADOS_DE_ATAJO } from "./vocabulario";
import {
  type Bandeja,
  type Caras,
  admiteVentaja,
  conDado,
  conModificador,
  expresionDeBandeja,
  sinDado,
} from "./bandeja";

// Task 10 (C5 web: #10, #11, #14, y la bandeja de #16) — **pulsa un dado, no escribas 1d6.**
//
// La misma regla de siempre: **esto no genera azar ni compone `2d20kh1`.** Los siete botones y
// la pila solo cambian una `Bandeja` (`bandeja.ts`, probada sola); la ventaja se sigue pidiendo
// **por nombre** (`SelectorDeVentaja`, `modo`), nunca metida en la expresión.
//
// **La expresión escrita manda sobre la bandeja, pero solo mientras el modo avanzado está
// abierto y alguien ha tecleado en el campo.** Sin eso, la bandeja es la fuente. Pulsar un dado
// de la fila SIEMPRE devuelve el control a la bandeja — es lo que hace que «pulsar, ver la pila,
// quitar con un clic» funcione aunque el modo avanzado esté abierto y alguien mirase el campo
// hace un momento.
//
// **El autor quiere ver muchos dados a la vez** (4, 6, 9, 10 mezclados): la pila es
// `flex-wrap`, así que un ataque con `9d6` no se sale de la fila, se envuelve.

export function BandejaDeDados({
  valor,
  onChange,
  compacta = false,
  modo = "NORMAL",
  onModoChange = () => {},
  error,
  disabled = false,
  textoInicial,
}: {
  valor: Bandeja;
  onChange: (siguiente: { bandeja: Bandeja; expresion: string }) => void;
  /** En la mesa: los siete dados en una fila, sin el rótulo «Atajos». */
  compacta?: boolean;
  /**
   * **Ventaja, si `admiteVentaja(valor)`.** Es el mismo `RollMode` que ya vivía en el panel — la
   * bandeja solo decide CUÁNDO se ofrece el control, nunca compone la conversión. Opcional: un
   * consumidor que no ofrezca ventaja en ningún sitio no tiene que pasar nada.
   */
  modo?: RollMode;
  onModoChange?: (siguiente: RollMode) => void;
  /** El rechazo del evaluador del servidor, si lo hay. Se pinta junto al campo «Qué se tira»,
   * dentro del modo avanzado — es donde vive el campo, y es donde tiene que verse el error. */
  error?: string;
  disabled?: boolean;
  /**
   * **Una expresión que ya trae el que llama** (`PanelDeDadosDeLaMesa`, cuando `onCerrar` abre
   * el panel para un ataque concreto: `1d8+5`, no `1d20`). No hay bandeja que la represente sin
   * inventarse una composición que el caller no pidió, así que **no se intenta**: se abre el modo
   * avanzado ya con este texto puesto, para que no se pierda nada. Pulsar un dado después la
   * sustituye, como con cualquier otro texto escrito a mano — es la misma regla, no una excepción.
   */
  textoInicial?: string;
}) {
  // El texto del modo avanzado. **Se deriva de la bandeja mientras nadie ha escrito encima** —
  // no se copia a un estado propio, que es justo la clase de sincronización que se desincroniza
  // sola—; en cuanto se escribe, `editadoAMano` manda y el campo pasa a leer lo que se tecleó.
  // Con `textoInicial`, empieza ya «escrito a mano» y con el modo avanzado abierto.
  const [texto, setTexto] = useState(textoInicial ?? "");
  const [editadoAMano, setEditadoAMano] = useState(Boolean(textoInicial));
  // El `<details>` se controla a mano y no con el `open` nativo: el campo solo existe en el DOM
  // mientras está abierto (en vez de fiarse de que `details:not([open])` lo esconda), que es lo
  // que hace que una prueba que busque «Qué se tira» con el modo avanzado plegado no lo
  // encuentre — jsdom no aplica esa hoja de estilos por defecto.
  const [abierto, setAbierto] = useState(Boolean(textoInicial));
  // **Un rechazo del servidor lo abre, sin esperar a un clic.** Derivado en vez de sincronizado
  // con un efecto: si el modo avanzado estaba plegado cuando llegó el error, esconderlo ahí sería
  // la misma mentira por omisión que la regla de interfaz prohíbe — el error tiene que verse
  // junto al campo, y el campo solo existe con esto abierto.
  const mostrarModoAvanzado = abierto || Boolean(error);

  const campoTexto = editadoAMano ? texto : expresionDeBandeja(valor);

  function aplicar(siguiente: Bandeja) {
    setEditadoAMano(false);
    onChange({ bandeja: siguiente, expresion: expresionDeBandeja(siguiente) });
  }

  function alEscribir(siguiente: string) {
    setTexto(siguiente);
    setEditadoAMano(true);
    onChange({ bandeja: valor, expresion: siguiente });
  }

  return (
    <div className="flex flex-col gap-s3">
      <div>
        {!compacta && (
          <p className="mb-1 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
            Atajos
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {DADOS_DE_ATAJO.map((caras) => (
            <Button
              key={caras}
              type="button"
              variant="secondary"
              disabled={disabled}
              onClick={() => aplicar(conDado(valor, caras as Caras))}
              aria-label={`Añadir un d${caras}`}
            >
              <IconoDado caras={caras as Caras} />
              <span className="font-data">d{caras}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* **La pila. Vacía no se pinta nada** — una `<ul>` vacía con su rótulo sería una caja que
          dice «aquí no hay nada», y eso ya se ve porque no hay nada. */}
      {valor.dados.length > 0 && (
        <ul aria-label="Dados en la bandeja" className="flex flex-wrap gap-1.5">
          {valor.dados.map((caras, indice) => (
            <li key={`${caras}-${indice}`}>
              <Button
                type="button"
                variant="secondary"
                disabled={disabled}
                onClick={() => aplicar(sinDado(valor, indice))}
                aria-label={`Quitar el d${caras} (posición ${indice + 1})`}
              >
                <IconoDado caras={caras} />
                <span className="font-data">d{caras}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-s2">
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => aplicar(conModificador(valor, -1))}
          aria-label="Bajar el modificador"
        >
          −
        </Button>
        <span className="min-w-[3ch] text-center font-data text-chrome-sm text-text">
          {valor.modificador}
        </span>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => aplicar(conModificador(valor, 1))}
          aria-label="Subir el modificador"
        >
          +
        </Button>
      </div>

      {/* **Solo con exactamente un d20** (`admiteVentaja`, `bandeja.ts`): pedir ventaja sobre
          `4d6kh3` no significa nada, y `conVentaja` en el servidor la ignoraría igual. El `div`
          con `role="radiogroup"` es lo que da nombre al grupo entero; `SelectorDeVentaja` ya
          trae su propio `fieldset` con la leyenda visualmente oculta. */}
      {admiteVentaja(valor) && (
        <div role="radiogroup" aria-label="Ventaja">
          <SelectorDeVentaja
            value={modo}
            onChange={onModoChange}
            etiqueta="esta tirada"
            disabled={disabled}
          />
        </div>
      )}

      {/* **`<details>` controlado a mano, no nativo.** jsdom no implementa la acción por defecto
          de un clic en `<summary>` (solo el evento `toggle` cuando el atributo `open` cambia:
          `HTMLDetailsElement-impl.js`), así que una prueba que pulsara el rótulo y esperara que
          se abriera solo por eso se quedaría siempre plegada. Se previene el nativo y se lleva
          el estado a mano, que funciona igual en jsdom y en un navegador de verdad. */}
      <details open={mostrarModoAvanzado}>
        <summary
          onClick={(e) => {
            e.preventDefault();
            setAbierto((actual) => !actual);
          }}
          className="cursor-pointer font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted"
        >
          Modo avanzado
        </summary>
        {mostrarModoAvanzado && (
          <div className="mt-s2">
            <Field
              label="Qué se tira"
              hint="Escribe la expresión: 1d20, 2d6+3, 4d6kh3."
              error={error}
              reservaEspacio
            >
              <input
                type="text"
                value={campoTexto}
                onChange={(e) => alEscribir(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                disabled={disabled}
                className={`${fieldControlClass} font-data`}
              />
            </Field>
          </div>
        )}
      </details>
    </div>
  );
}
