import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import type { RollMode } from "@dnd/shared";
import { Button, Field, fieldControlClass } from "../../ui";
import { IconoDado, IconoMas, IconoMenos, IconoQuitar } from "../../ui/Iconos";
import { SelectorDeVentaja } from "./SelectorDeVentaja";
import { DADOS_DE_ATAJO } from "./vocabulario";
import {
  type Bandeja,
  admiteVentaja,
  admiteVentajaEnTexto,
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
// de la fila SIEMPRE devuelve el control a la bandeja, y **plegar el modo avanzado también**: lo
// que había escrito a mano no se queda como fuente escondida — round 1 de revisión lo encontró
// mandando en silencio con el campo ya fuera de la vista.
//
// **El autor quiere ver muchos dados a la vez** (4, 6, 9, 10 mezclados): la pila es
// `flex-wrap`, así que un ataque con `9d6` no se sale de la fila, se envuelve. Y la pila **se ve
// distinta de los atajos** (anexo #10, round 1): superficie de cobre, no el contorno de los
// botones de arriba, con su rótulo propio y una «×» dibujada en cada dado — sin eso, la fila de
// pulsados y la de disponibles eran la misma silueta.

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
   * **Ventaja, si `admiteVentaja(valor)` (o, con texto escrito, `admiteVentajaEnTexto`).** Es el
   * mismo `RollMode` que ya vivía en el panel — la bandeja solo decide CUÁNDO se ofrece el
   * control, nunca compone la conversión. Opcional: un consumidor que no ofrezca ventaja en
   * ningún sitio no tiene que pasar nada.
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

  // Round 1 de revisión (IMPORTANT #1) — **de dónde sale el radio de ventaja depende de quién
  // manda.** Con el campo escrito a mano, se lee el propio texto con el mismo criterio que usa
  // el servidor (`admiteVentajaEnTexto`: un d20 al principio, ni más ni menos); con la bandeja al
  // mando, `admiteVentaja` ya garantiza que su expresión compuesta pone el d20 primero
  // (`expresionDeBandeja`). Ofrecerlo por la bandeja cuando el texto manda mentiría: alguien
  // pudo escribir `1d6+1d20` a mano, y ahí el servidor no da ventaja aunque el radio la ofrezca.
  const ofreceVentaja = editadoAMano ? admiteVentajaEnTexto(campoTexto) : admiteVentaja(valor);

  // Round 1 (extra pedido) — **si el radio desaparece, que no se quede pegado en Ventaja.** Sin
  // esto, quitar el d20 (o escribir encima de un texto que ya no empieza por él) dejaba `modo`
  // en `ADVANTAGE`/`DISADVANTAGE` sin ningún control visible que lo explicara, y la próxima
  // tirada saldría con un modo que nadie eligió a propósito para ella.
  useEffect(() => {
    if (!ofreceVentaja && modo !== "NORMAL") onModoChange("NORMAL");
  }, [ofreceVentaja, modo, onModoChange]);

  function aplicar(siguiente: Bandeja) {
    setEditadoAMano(false);
    onChange({ bandeja: siguiente, expresion: expresionDeBandeja(siguiente) });
  }

  function alEscribir(siguiente: string) {
    setTexto(siguiente);
    setEditadoAMano(true);
    onChange({ bandeja: valor, expresion: siguiente });
  }

  /**
   * Round 1 de revisión (IMPORTANT #2) — **plegar el modo avanzado también devuelve el control
   * a la bandeja.** Sin esto, escribir `4d6kh3`, plegar el `<details>` y pulsar «Tirar» mandaba
   * esa expresión escondida — el campo que la explicaba ya no estaba a la vista, y nada en
   * pantalla decía que seguía siendo la fuente.
   */
  function alPulsarResumen(e: MouseEvent) {
    e.preventDefault();
    const siguienteAbierto = !abierto;
    setAbierto(siguienteAbierto);
    if (!siguienteAbierto) {
      setEditadoAMano(false);
      onChange({ bandeja: valor, expresion: expresionDeBandeja(valor) });
    }
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
              onClick={() => aplicar(conDado(valor, caras))}
              aria-label={`Añadir un d${caras}`}
            >
              <IconoDado caras={caras} />
              <span className="font-data">d{caras}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* **La pila. Vacía no se pinta nada** — un rótulo y una lista vacíos serían una caja que
          dice «aquí no hay nada», y eso ya se ve porque no hay nada.
          Round 1 (anexo #10, IMPORTANT #3): **una superficie distinta de los atajos**, no el
          mismo contorno — cobre en vez de `border-muted`, con su propio rótulo («En la
          bandeja · N dados») y una equis dibujada (`IconoQuitar`, nunca un glifo de fuente) en
          cada dado, para que pulsado y disponible no se confundan de un vistazo. */}
      {valor.dados.length > 0 && (
        <div>
          <p
            className="mb-1 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-copper-text"
            aria-live="polite"
          >
            En la bandeja · {valor.dados.length} {valor.dados.length === 1 ? "dado" : "dados"}
          </p>
          <ul aria-label="Dados en la bandeja" className="flex flex-wrap gap-1.5">
            {valor.dados.map((caras, indice) => (
              <li key={`${caras}-${indice}`}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => aplicar(sinDado(valor, indice))}
                  aria-label={`Quitar el d${caras} (posición ${indice + 1})`}
                  className={[
                    "inline-flex items-center justify-center gap-2 rounded-radius-sm border px-3 py-1.5",
                    "font-chrome text-chrome-sm font-semibold text-copper-text transition-colors",
                    "border-copper bg-[color:var(--copper-tint)] hover:border-accent",
                    "disabled:cursor-not-allowed disabled:text-muted",
                  ].join(" ")}
                >
                  <IconoDado caras={caras} />
                  <span className="font-data">d{caras}</span>
                  <IconoQuitar className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-s2">
        <span className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
          Modificador
        </span>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => aplicar(conModificador(valor, -1))}
          aria-label="Bajar el modificador"
        >
          {/* Revisión final de la rama (2026-09-13): **dibujados, no «−» y «+» de fuente.** El
              barrido de la Tarea 7 no los vio por el `=>` del `onClick` (ya corregido en la
              prueba); el nombre accesible lo sigue dando el `aria-label`. */}
          <IconoMenos />
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
          <IconoMas />
        </Button>
      </div>

      {/* Round 2 de revisión (anexo #8) — **el radio se queda montado siempre.** La primera
          versión lo montaba y desmontaba con `ofreceVentaja`, y eso es exactamente el anexo #8
          que esta misma tarea cita en otro sitio: escribir «4d» en el modo avanzado apagaba el
          radio letra a letra y la tarjeta encogía 28px con cada tecla — el control mide y
          `pnpm verify` no lo vio porque `jsdom` no maqueta. La regla del proyecto es
          «se deshabilita, nunca se esconde, con su motivo» (`docs/04-convenciones.md`): cuando
          `4d6kh3` — o `1d6+1d20` escrito a mano, que el servidor tampoco reescribe — no admite
          ventaja, el `fieldset` se apaga y una línea reservada (`min-h-[1.125rem]`, vacía si no
          hace falta) dice por qué, en vez de que el control desaparezca y la tarjeta se mueva. */}
      {/* Tarea 12, ítem 10.6 (2026-09-19) — `role="radiogroup"` quitado del `div` que envolvía
          este `fieldset` de radios nativos (`SelectorDeVentaja`): un `radiogroup` con un `group`
          (el rol implícito de `fieldset`) anidado dentro es la estructura redundante que el
          ítem señala, y los radios ya están agrupados por compartir `name`. El `aria-describedby`
          que vivía en ese `div` pasa al propio `fieldset` (`descripcionId`): en un ancestro no
          contaba para la descripción accesible del grupo. */}
      <div>
        <SelectorDeVentaja
          value={modo}
          onChange={onModoChange}
          etiqueta="esta tirada"
          disabled={disabled || !ofreceVentaja}
          descripcionId={ofreceVentaja ? undefined : "ventaja-motivo"}
        />
        <p
          id="ventaja-motivo"
          className="mt-1 min-h-[1.125rem] font-chrome text-chrome-xs text-muted"
        >
          {ofreceVentaja ? "" : "Solo con un d20 al principio de la tirada."}
        </p>
      </div>

      {/* **`<details>` controlado a mano, no nativo.** jsdom no implementa la acción por defecto
          de un clic en `<summary>` (solo el evento `toggle` cuando el atributo `open` cambia:
          `HTMLDetailsElement-impl.js`), así que una prueba que pulsara el rótulo y esperara que
          se abriera solo por eso se quedaría siempre plegada. Se previene el nativo y se lleva
          el estado a mano, que funciona igual en jsdom y en un navegador de verdad. */}
      <details open={mostrarModoAvanzado}>
        <summary
          onClick={alPulsarResumen}
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
