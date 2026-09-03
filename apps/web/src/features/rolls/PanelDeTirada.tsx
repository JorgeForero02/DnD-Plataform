import { useEffect, useRef } from "react";
import type { DerivedValue, RollMode, RollResult } from "@dnd/shared";
import { Button } from "../../ui/Button";
import { ResultadoDeTirada } from "./ResultadoDeTirada";
import { TiradaACiegas } from "./TiradaACiegas";
import { SelectorDeVentaja } from "./SelectorDeVentaja";

// **El panel de tirada: la decisión aparece donde se toma, una sola vez.**
//
// ## El problema que resuelve, dicho entero
//
// La regla vinculante de `docs/04-convenciones.md` dice que *una opción con significado no se
// esconde en un desplegable: van visibles a la vez, cada una con la frase que explica qué hace*.
// Ventaja / Normal / Desventaja es exactamente eso, y por eso `SelectorDeVentaja` existe.
//
// Lo que rompió la hoja no fue la regla: fue **dónde** se aplicaba. El control estaba **en cada
// fila**, y la hoja tiene seis salvaciones y dieciocho habilidades: veinticuatro grupos de tres
// radios, veinticuatro frases y veinticuatro botones «Tirar» convertían cada valor en un bloque
// de tres renglones y la hoja en una pantalla interminable. La regla salía cara porque se pagaba
// veinticuatro veces una decisión que se toma **una**.
//
// La salida no es esconder la opción —eso sí sería incumplirla— sino **moverla al momento en que
// se decide**: la fila lleva su dado, y al pulsarlo se abre este panel con el control de tres
// estados **completo, con sus tres frases visibles a la vez**, más la expresión que se va a
// mandar. La opción sigue visible y explicada cuando toca elegir; lo que desaparece es su copia
// veintitrés veces en sitios donde nadie está decidiendo nada.
//
// ## Detalles que no son decorativos
//
//  · **Se cierra con Escape** y devuelve el foco al dado que lo abrió: un panel que solo se cierra
//    con el ratón deja al teclado atrapado dentro de una fila.
//  · **El foco entra en el panel al abrirlo.** Si no, la persona que llega con el teclado pulsa
//    el dado y no se entera de que ha aparecido nada.
//  · **El resultado se queda dentro del panel**, no en la fila: la fila es la hoja, y la hoja no
//    puede crecer tres renglones cada vez que alguien tira.
//  · **Aquí no se genera azar.** El navegador pide una tirada; no la hace. Y pide ventaja **por
//    nombre** (`mode`), nunca mandando `2d20kh1`: convertir el d20 es una regla del juego y vive
//    en el servidor.

export function PanelDeTirada({
  etiqueta,
  expresion,
  modo,
  onModo,
  onTirar,
  onCerrar,
  pendiente,
  error,
  resultado,
  derivado,
}: {
  /** Qué se tira: «Percepción», «Salvación de Fuerza». */
  etiqueta: string;
  /** La expresión que se va a mandar, tal cual: `1d20+5`. */
  expresion: string;
  modo: RollMode;
  onModo: (siguiente: RollMode) => void;
  onTirar: () => void;
  onCerrar: () => void;
  pendiente: boolean;
  error: string | null;
  resultado: RollResult | null;
  derivado?: DerivedValue;
}) {
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    caja.current?.focus();
  }, []);

  return (
    <div
      ref={caja}
      tabIndex={-1}
      role="group"
      aria-label={`Tirada de ${etiqueta}`}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onCerrar();
        }
      }}
      className="absolute right-0 top-[calc(100%+0.25rem)] z-30 w-[19rem] max-w-[calc(100vw-2rem)] rounded-radius-md border border-accent bg-surface p-s3 text-left shadow-[0_18px_40px_-24px_var(--sheet-shadow)]"
    >
      <div className="mb-s2 flex items-baseline justify-between gap-s2">
        <p className="font-chrome text-chrome-sm font-semibold text-text">{etiqueta}</p>
        <span className="font-data text-chrome-xs text-muted">{expresion}</span>
      </div>

      <SelectorDeVentaja value={modo} onChange={onModo} etiqueta={etiqueta} disabled={pendiente} />

      <div className="mt-s2 flex items-center gap-s2">
        <Button
          type="button"
          variant="primary"
          onClick={onTirar}
          disabled={pendiente}
          aria-label={`Tirar ${etiqueta}`}
        >
          Tirar
        </Button>
        <Button type="button" variant="ghost" onClick={onCerrar}>
          Cerrar
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-s2 font-chrome text-chrome-xs text-danger-text">
          {error}
        </p>
      )}

      {resultado && (
        <div className="mt-s2">
          {resultado.revealed ? (
            <ResultadoDeTirada resultado={resultado} etiqueta={etiqueta} derivado={derivado} />
          ) : (
            // Una tirada a ciegas no trae desglose: el servidor no lo manda. Se dice, no se
            // deja en blanco — un panel vacío se lee como «falló» y se vuelve a pulsar.
            <TiradaACiegas etiqueta={etiqueta} expresion={resultado.expression} />
          )}
        </div>
      )}
    </div>
  );
}
