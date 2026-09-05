import { useState } from "react";
import { Panel } from "../../ui/Panel";
import { ETIQUETA_DE_ORNAMENTO, fijarOrnamento, ornamentoPreferido } from "../../ui/ornamento";
import type { Ornamento } from "../../ui/ornamento";

/**
 * **El interruptor del ornamento** (ficha U7, plan 14).
 *
 * La cuadrícula cartográfica y el horizonte dibujado se pintaban **siempre**. No se mueven, así que
 * `prefers-reduced-motion` no aplica — pero sí molestan a quien lee con dificultad, y no había
 * forma de dejar la pantalla desnuda.
 *
 * **Dos radios y no una casilla**, que es la regla vinculante de `docs/04-convenciones.md`: son dos
 * opciones con significado, y cada una lleva la frase que dice qué hace. Una casilla marcada
 * «ornamento» obliga a deducir qué pasa al desmarcarla.
 *
 * **Y el ajuste es de este navegador, no de la cuenta**, y se dice: quien lo necesita lo necesita en
 * el dispositivo donde le molesta, y guardarlo en el servidor habría hecho que apagarlo en el móvil
 * se lo apagara al portátil sin pedirlo. Es la misma decisión que el tema, que ya vive ahí.
 */
export function AjusteDeOrnamento() {
  const [valor, setValor] = useState<Ornamento>(() => ornamentoPreferido());

  const elegir = (siguiente: Ornamento) => {
    setValor(siguiente);
    fijarOrnamento(siguiente);
  };

  return (
    <Panel tone="chrome">
      <h2 className="text-chrome-sm font-semibold">Ornamento</h2>
      <p className="mt-1 text-chrome-xs text-muted">
        La cuadrícula y el horizonte dibujado del fondo. No se mueven, pero se pueden quitar.
      </p>
      <fieldset className="mt-3 flex flex-col gap-2">
        <legend className="sr-only">Ornamento del fondo</legend>
        {(["activo", "apagado"] as const).map((opcion) => (
          <label key={opcion} className="flex items-start gap-2 text-chrome-sm text-text">
            <input
              type="radio"
              name="ornamento"
              value={opcion}
              checked={valor === opcion}
              onChange={() => elegir(opcion)}
              className="mt-0.5"
            />
            <span>
              {ETIQUETA_DE_ORNAMENTO[opcion]}
              <span className="block text-chrome-xs text-muted">
                {opcion === "activo"
                  ? "Como está: el fondo lleva la cuadrícula y el horizonte."
                  : "El fondo se queda liso. Nada más cambia."}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <p className="mt-2 text-chrome-xs text-muted">
        Se recuerda <strong>en este navegador</strong>, como el tema.
      </p>
    </Panel>
  );
}
