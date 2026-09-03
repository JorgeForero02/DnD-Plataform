import { useState } from "react";
import type { DerivedValue, RollMode, RollResult } from "@dnd/shared";
import { Button } from "../../ui/Button";
import { ResultadoDeTirada } from "../rolls/ResultadoDeTirada";
import { SelectorDeVentaja } from "../rolls/SelectorDeVentaja";
import { useCreateRoll } from "./hooks";

// Tarea 2A.10 — "tirar desde la hoja: una habilidad o una salvación tira 1d20+mod con su
// etiqueta". `POST /campaigns/:id/rolls` (2A.13) tira de verdad en el servidor y lo deja en el
// registro de eventos; este botón solo compone la expresión y enseña el resultado que vuelve.
//
// **Ventaja y desventaja se piden por nombre, no por sintaxis.** El botón manda `mode` y es el
// servidor quien convierte el `d20` en `2d20kh1` o `2d20kl1`: es una regla del juego, y un
// cliente que mandara la expresión ya montada podría decir «con ventaja» y tirar otra cosa.
//
// **Tarea F3 — la decisión y la tirada dejan de ser el mismo gesto.** Hasta aquí había tres
// botones que tiraban al pulsarlos: no se veía cuál estaba elegido, y el resultado se enseñaba
// como `20 (8, 17)` — un total y una lista de cifras sin decir cuál se quedó ni de dónde salía
// el resto. Ahora la decisión es un selector de tres estados (`SelectorDeVentaja`) y el
// resultado se pinta entero (`ResultadoDeTirada`): los dos dados con el descartado tachado, el
// rótulo que dice cuál se queda, y el desglose de la suma.
//
// **Aquí no se genera azar.** El navegador pide una tirada; no la hace.

export function TirarBoton({
  campaignId,
  characterId,
  etiqueta,
  modificador,
  derivado,
}: {
  campaignId: string;
  characterId: string;
  etiqueta: string;
  modificador: number;
  /**
   * El valor derivado del que sale `modificador`, si quien monta este control lo tiene a mano.
   *
   * **Opcional a propósito, y es lo que separa un desglose bueno de uno correcto.** Con él, el
   * resultado dice `17 = 12 dado +3 modificador de destreza +2 bonificador de competencia`; sin
   * él, dice `17 = 12 dado +5 percepción`, que es verdad pero explica la mitad. La hoja tiene
   * ese `DerivedValue` en la mano (`sheet.derived["skill.perception"]`) y solo hace falta que lo
   * pase; ver el informe de F3.
   */
  derivado?: DerivedValue;
}) {
  const crearTirada = useCreateRoll(campaignId);
  const [modo, setModo] = useState<RollMode>("NORMAL");
  const [resultado, setResultado] = useState<RollResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const expresion = `1d20${modificador >= 0 ? "+" : ""}${modificador}`;

  const tirar = () =>
    crearTirada.mutate(
      // `visibility` es obligatorio en el tipo inferido aunque el esquema le da un valor
      // por defecto (`createRollSchema`, @dnd/shared): el `.default()` de Zod solo hace
      // opcional el campo de ENTRADA sin validar, no el tipo ya inferido que usa este
      // fichero. "PLAYERS" es explícito aquí por la misma razón que en el resto del
      // producto: la mesa ve lo que se tira, no solo el DM.
      { expression: expresion, label: etiqueta, characterId, visibility: "PLAYERS", mode: modo },
      {
        onSuccess: (r) => {
          setError(null);
          setResultado(r);
        },
        onError: (err) => {
          // **Un rechazo del servidor se explica en línea, nunca en un aviso flotante**
          // (docs/04-convenciones.md): un aviso flotante se ha ido antes de que un lector de
          // pantalla llegue a él. El resultado anterior se retira: dejarlo puesto junto a un
          // error haría creer que la tirada nueva salió eso.
          setResultado(null);
          setError((err as Error).message);
        },
      },
    );

  return (
    <span className="ml-s2 inline-flex max-w-[20rem] flex-col items-stretch gap-1 align-middle">
      <span className="flex items-center gap-s2">
        <SelectorDeVentaja
          value={modo}
          onChange={setModo}
          etiqueta={etiqueta}
          disabled={crearTirada.isPending}
        />
        <Button
          type="button"
          variant="ghost"
          className="shrink-0 px-1.5 py-0.5 text-chrome-xs"
          onClick={tirar}
          disabled={crearTirada.isPending}
          aria-label={`Tirar ${etiqueta}`}
        >
          Tirar
        </Button>
      </span>

      {error && (
        <p role="alert" className="font-chrome text-chrome-xs text-danger-text">
          {error}
        </p>
      )}

      {resultado && (
        <ResultadoDeTirada resultado={resultado} etiqueta={etiqueta} derivado={derivado} />
      )}
    </span>
  );
}
