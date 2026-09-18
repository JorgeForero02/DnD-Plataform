import { useState } from "react";
import { HiloDeSesion } from "../hilo/HiloDeSesion";
import { type FiltroDeRegistro } from "../hilo/tipo-de-mensaje";
import type { GameEventRow } from "../log-api";
import type { NpcEnLaMesa } from "../../bestiario/api";

// Task 5 (3A.3) — **la columna del registro**, lateral en la maqueta: el hilo de siempre, con sus
// filtros en la propia cabecera — «Herramientas» es OTRA pieza (`dm/HerramientasDeNarracion.tsx`)
// que `MesaDeSesion.tsx` monta a continuación, dentro del mismo `<aside>`, no aquí.
//
// **Qué es este fichero de verdad, y qué NO es.** El registro en vivo —la lista, el aviso de
// «hay algo nuevo abajo», la caja de anotar con sus seis sellos— ya vive entero en
// `HiloDeSesion.tsx` desde la Ola 0. Lo único que faltaba de las tres columnas del prototipo era
// el filtro («Todo · Relato · Números»), así que este componente es un envoltorio finísimo: lleva
// el ESTADO del filtro elegido y se lo pasa a `HiloDeSesion` (`filtro`/`onFiltroChange`). **No
// hay una segunda lista ni un segundo compositor** — envolver de más aquí sería la misma
// duplicación que la Task 4 evitó no reescribiendo `BarraDeAcciones` dos veces.
//
// **Fix round 1 (2026-09-18): los chips del filtro se mudaron a la cabecera de `HiloDeSesion`.**
// Vivían aquí como `GrupoDeRadios` completo —radio, etiqueta y frase visible, ~200 px de alto—, y
// la medida a 1280×720 del orquestador lo marcó como el bloque que se comía el registro. El
// ruling: siguen siendo radios (`04-convenciones.md` lo exige para una opción con significado),
// pero en forma de segmento inline dentro de la cabecera «Registro en vivo» — ver el comentario de
// `OPCIONES_DE_FILTRO` en `HiloDeSesion.tsx` para el porqué completo de esa forma. Este fichero ya
// no sabe nada de cómo se PINTAN los filtros, solo de qué filtro está elegido.

export function ColumnaDelRegistro({
  campaignId,
  eventos,
  esDm,
  comoUsuario,
  pnjs,
}: {
  campaignId: string;
  eventos: GameEventRow[];
  esDm: boolean;
  comoUsuario: string;
  pnjs?: NpcEnLaMesa[];
}) {
  const [filtro, setFiltro] = useState<FiltroDeRegistro>("TODO");

  return (
    <HiloDeSesion
      campaignId={campaignId}
      eventos={eventos}
      esDm={esDm}
      comoUsuario={comoUsuario}
      pnjs={pnjs}
      filtro={filtro}
      onFiltroChange={setFiltro}
    />
  );
}
