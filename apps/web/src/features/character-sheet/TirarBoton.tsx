import { useRef, useState } from "react";
import type { DerivedValue, RollMode, RollResult } from "@dnd/shared";
import { DadoDibujado } from "../rolls/DadoDibujado";
import { PanelDeTirada } from "../rolls/PanelDeTirada";
import { useCreateRoll } from "./hooks";

// Tarea 2A.10 — "tirar desde la hoja: una habilidad o una salvación tira 1d20+mod con su
// etiqueta". `POST /campaigns/:id/rolls` (2A.13) tira de verdad en el servidor y lo deja en el
// registro de eventos; esto solo compone la expresión y enseña el resultado que vuelve.
//
// **Ventaja y desventaja se piden por nombre, no por sintaxis.** Se manda `mode` y es el servidor
// quien convierte el `d20` en `2d20kh1` o `2d20kl1`: es una regla del juego, y un cliente que
// mandara la expresión ya montada podría decir «con ventaja» y tirar otra cosa.
//
// --- 2026-09-03: **de bloque de tres renglones a un dado** ---
//
// Esto era, en cada una de las veinticuatro filas de la hoja, tres radios con su frase y un botón
// «Tirar». La hoja no se podía leer. Ahora es lo que pone la maqueta: **un dado pequeño al final
// de la fila**, y la decisión entera —los tres estados con sus tres frases— aparece en el panel
// que se abre al pulsarlo (`features/rolls/PanelDeTirada.tsx`, donde está escrito por qué eso
// cumple la regla en vez de esquivarla).
//
// El grupo de radios sigue teniendo **su `name` único** (`useId`, en `SelectorDeVentaja`): puede
// haber dos paneles abiertos a la vez, y dos grupos con el mismo `name` serían uno solo — pedir
// ventaja en Sigilo apagaba la de Percepción sin que nada fallara. Hay una prueba para eso.
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
   * él, dice `17 = 12 dado +5 percepción`, que es verdad pero explica la mitad.
   */
  derivado?: DerivedValue;
}) {
  const crearTirada = useCreateRoll(campaignId);
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState<RollMode>("NORMAL");
  const [resultado, setResultado] = useState<RollResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dado = useRef<HTMLButtonElement>(null);

  const expresion = `1d20${modificador >= 0 ? "+" : ""}${modificador}`;

  const cerrar = () => {
    setAbierto(false);
    // El foco vuelve al dado que abrió el panel: quien llegó con el teclado tiene que quedarse
    // donde estaba, no al principio del documento.
    dado.current?.focus();
  };

  const tirar = () =>
    crearTirada.mutate(
      // `visibility` es obligatorio en el tipo inferido aunque el esquema le da un valor por
      // defecto (`createRollSchema`, @dnd/shared): el `.default()` de Zod solo hace opcional el
      // campo de ENTRADA sin validar, no el tipo ya inferido. "PLAYERS" es explícito aquí por la
      // misma razón que en el resto del producto: la mesa ve lo que se tira, no solo el DM.
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
    <span className="relative inline-flex shrink-0">
      {/* El dado es **dibujado**, no un emoji ni un glifo: regla vinculante de iconos. Y se
          dimensiona en `1em` porque vive dentro de una línea de texto. */}
      <button
        ref={dado}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={`Tirada de ${etiqueta}`}
        title={`Tirar ${etiqueta} (${expresion})`}
        className="rounded-radius-sm p-0.5 text-chrome-sm text-accent-text hover:bg-[color:var(--accent-tint)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
      >
        <DadoDibujado />
      </button>
      {abierto && (
        <PanelDeTirada
          etiqueta={etiqueta}
          expresion={expresion}
          modo={modo}
          onModo={setModo}
          onTirar={tirar}
          onCerrar={cerrar}
          pendiente={crearTirada.isPending}
          error={error}
          resultado={resultado}
          derivado={derivado}
        />
      )}
    </span>
  );
}
