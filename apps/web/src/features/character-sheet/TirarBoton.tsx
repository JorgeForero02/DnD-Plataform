import { useRef, useState } from "react";
import type { DerivedValue, RollMode, RollResult, SuggestedRollMode } from "@dnd/shared";
import { modoSugerido } from "../rolls/sugerencia";
import { DadoDibujado } from "../rolls/DadoDibujado";
import { GastarInspiracion } from "../rolls/panel/GastarInspiracion";
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
  sugerencia,
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
  /** Lo que las condiciones vivas dicen de esta tirada (2.5.5). Opcional: sin ella no hay aviso. */
  sugerencia?: SuggestedRollMode;
}) {
  const crearTirada = useCreateRoll(campaignId);
  const [abierto, setAbierto] = useState(false);
  // **El modo se pone al ABRIR el panel, no al montar el dado**, y esto lo corrigió un recorrido
  // de navegador: el dado vive en la fila desde que se pinta la hoja, así que fijar el modo en el
  // `useState` inicial lo congelaba en «Normal» —no había condiciones todavía— y ponerle una
  // después no lo movía. El aviso sí cambiaba, porque viene de props: quedaba una pantalla
  // diciendo «desventaja sugerida» con «Normal» marcado, que es exactamente el caso que la regla
  // de interfaz prohíbe —el texto explicando una regla y el control contradiciéndola—.
  //
  // Abrir el panel **es** el momento de decidir, así que es donde se preselecciona. Cambiarlo a
  // mano sigue mandando mientras el panel está abierto; cerrar y volver a abrir parte otra vez de
  // lo que el servidor cree, que es lo que se quiere: cada tirada es una decisión nueva.
  const [modo, setModo] = useState<RollMode>(() => modoSugerido(sugerencia));
  // I8: se decide al abrir el panel, como el modo, y se reinicia con él.
  const [gastarInspiracion, setGastarInspiracion] = useState(false);
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
      // `audience` es obligatorio en el tipo inferido aunque el esquema le da un valor por
      // defecto (`createRollSchema`, @dnd/shared): el `.default()` de Zod solo hace opcional el
      // campo de ENTRADA sin validar, no el tipo ya inferido. `"PUBLIC"` es explícito aquí por la
      // misma razón que en el resto del producto: la mesa ve lo que se tira, no solo el DM. Y es
      // **la audiencia**, no el nivel de visibilidad: la traducción a `PLAYERS` la hace el
      // servidor, que es donde vive la regla.
      {
        expression: expresion,
        label: etiqueta,
        characterId,
        audience: "PUBLIC",
        mode: modo,
        // El servidor gasta y tira en la misma transacción (ficha I8).
        spendInspiration: gastarInspiracion && modo !== "DISADVANTAGE",
      },
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
        onClick={() => {
          // `setModo` fuera del actualizador de `setAbierto`: un actualizador tiene que ser puro,
          // y en modo estricto React lo invoca dos veces a propósito para cazar justo esto.
          if (!abierto) setModo(modoSugerido(sugerencia));
          setAbierto((v) => !v);
        }}
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
          sugerencia={sugerencia}
          ranuraInspiracion={
            <GastarInspiracion
              campaignId={campaignId}
              characterId={characterId}
              modo={modo}
              value={gastarInspiracion}
              onChange={setGastarInspiracion}
              disabled={crearTirada.isPending}
            />
          }
        />
      )}
    </span>
  );
}
