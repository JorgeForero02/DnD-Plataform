import { useState } from "react";
import { GrupoDeRadios } from "../../../ui/GrupoDeRadios";
import { HiloDeSesion } from "../hilo/HiloDeSesion";
import { type FiltroDeRegistro } from "../hilo/tipo-de-mensaje";
import type { GameEventRow } from "../log-api";
import type { NpcEnLaMesa } from "../../bestiario/api";

// Task 5 (3A.3) — **la columna del registro**, lateral en la maqueta: filtros arriba, el hilo de
// siempre debajo, y nada más — «Herramientas» es OTRA pieza (`dm/HerramientasDeNarracion.tsx`)
// que `MesaDeSesion.tsx` monta a continuación, dentro del mismo `<aside>`, no aquí.
//
// **Qué es este fichero de verdad, y qué NO es.** El registro en vivo —la lista, el aviso de
// «hay algo nuevo abajo», la caja de anotar con sus seis sellos— ya vive entero en
// `HiloDeSesion.tsx` desde la Ola 0. Lo único que faltaba de las tres columnas del prototipo era
// el filtro de arriba («Todo · Relato · Números»), así que este componente es un envoltorio fino:
// añade los radios y les pasa el valor elegido a `HiloDeSesion` por su prop `filtro`. **No hay
// una segunda lista ni un segundo compositor** — envolver de más aquí sería la misma duplicación
// que la Task 4 evitó no reescribiendo `BarraDeAcciones` dos veces.
//
// **Por qué radios y no `FilterChip`.** `docs/04-convenciones.md`: «una opción con significado
// no se esconde en un desplegable [...] van como radios, visibles a la vez, y cada una lleva la
// frase que explica qué hace». Tres opciones que deciden QUÉ SE VE del registro de la partida
// —perderse una tirada de daño no es lo mismo que perderse un titular de la narración— son
// exactamente esa clase de opción, y por eso el brief mismo señala esta regla en vez de dejarlo a
// elección visual.

const OPCIONES: Record<FiltroDeRegistro, { etiqueta: string; frase: string }> = {
  TODO: { etiqueta: "Todo", frase: "Cada suceso del registro, sin recortar." },
  RELATO: {
    etiqueta: "Relato",
    frase: "El mundo hablando: lo revelado, los hitos de la sesión, el andamiaje de la mesa.",
  },
  NUMEROS: {
    etiqueta: "Números",
    frase: "Tiradas, daño, condiciones, recursos: lo que le pasa a alguien de la mesa.",
  },
};

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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-s2">
      <GrupoDeRadios
        legend="Qué se ve"
        name="filtro-del-registro"
        opciones={OPCIONES}
        valor={filtro}
        onChange={setFiltro}
        className="shrink-0 rounded-radius-sm border border-muted bg-surface p-s2"
      />
      <HiloDeSesion
        campaignId={campaignId}
        eventos={eventos}
        esDm={esDm}
        comoUsuario={comoUsuario}
        pnjs={pnjs}
        filtro={filtro}
      />
    </div>
  );
}
