import type { DerivedValue } from "@dnd/shared";
import type { SheetResponse } from "./api";
import { ValorDerivado } from "./Traza";

// Tarea 2A.10 — "velocidad efectiva con su traza, y los sentidos".
//
// **La efectiva la calcula el servidor** y llega en `GET .../sheet` como `effectiveSpeeds`. La
// primera versión de esta pantalla la recalculaba aquí, copiando `effective-speed.ts` letra por
// letra porque ningún endpoint la exponía; eran dos copias de una regla del juego, y de las que
// se separan en cuanto se toca una. Si el campo no viene (una respuesta de mutación, que no lo
// trae), se pinta la base sin traza en vez de inventar el cálculo.

const NOMBRE_MOVIMIENTO: Record<string, string> = {
  walk: "Caminar",
  climb: "Trepar",
  swim: "Nadar",
  fly: "Volar",
  burrow: "Excavar",
};

export function VelocidadYSentidos({
  speeds,
  effectiveSpeeds,
  darkvision,
}: {
  speeds: Partial<Record<"walk" | "climb" | "swim" | "fly" | "burrow", number>>;
  effectiveSpeeds?: SheetResponse["effectiveSpeeds"];
  darkvision: DerivedValue;
}) {
  return (
    <div className="grid grid-cols-2 gap-s2 sm:grid-cols-3">
      {Object.entries(speeds).map(([movimiento, feet]) => {
        const efectiva = effectiveSpeeds?.[movimiento] ?? { total: feet ?? 0, steps: [] };
        return (
          <ValorDerivado
            key={movimiento}
            etiqueta={`${NOMBRE_MOVIMIENTO[movimiento] ?? movimiento} (pies)`}
            valor={{ key: `speed.${movimiento}`, total: efectiva.total, steps: efectiva.steps }}
          />
        );
      })}
      <ValorDerivado etiqueta="Visión en la oscuridad (pies)" valor={darkvision} />
    </div>
  );
}
