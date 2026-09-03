import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { itemEffectSchema, type ItemEffect } from "@dnd/shared";
import { EffectsEditor } from "../EffectsEditor";
import { EFFECT_KINDS, NOMBRE_EFECTO, type EffectKind } from "../vocabulario";

// Carril B2 — `EffectsEditor.tsx` (313 líneas) no tenía ninguna prueba. Lo que importa no es la
// pantalla: es que **lo que emite lo acepte el esquema**. Un borrador por defecto mal formado
// hoy solo se vería como un 400 en producción, así que esta prueba monta el editor de verdad,
// añade cada uno de los siete tipos de efecto de la lista cerrada, y comprueba con
// `itemEffectSchema.parse` (importado de `@dnd/shared`, nunca copiado) que el editor nunca emite
// nada que el servidor rechazaría.

/** Envoltorio con estado — como cualquier consumidor real del editor — que además registra cada
 * valor emitido, para poder validar el efecto recién añadido sin leer estado interno. */
function Wrapper({ onEmit }: { onEmit: (effects: ItemEffect[]) => void }) {
  const [effects, setEffects] = useState<ItemEffect[]>([]);
  return (
    <EffectsEditor
      effects={effects}
      onChange={(next) => {
        setEffects(next);
        onEmit(next);
      }}
    />
  );
}

/** Abre el formulario, elige el tipo por su etiqueta traducida (no por el `value` crudo del
 * radio) y confirma — tal cual lo haría alguien delante de la pantalla. */
function anadirEfecto(kind: EffectKind) {
  fireEvent.click(screen.getByRole("button", { name: "Añadir efecto" }));
  const etiqueta = screen.getByText(NOMBRE_EFECTO[kind]).closest("label");
  if (!etiqueta) throw new Error(`No se encontró la opción de radio para "${kind}".`);
  fireEvent.click(within(etiqueta).getByRole("radio"));
  fireEvent.click(screen.getByRole("button", { name: "Añadir" }));
}

describe("EffectsEditor", () => {
  it.each(EFFECT_KINDS)(
    "el borrador por defecto de «%s» emite un ItemEffect que itemEffectSchema.parse acepta",
    (kind) => {
      const emitidos: ItemEffect[][] = [];
      render(<Wrapper onEmit={(next) => emitidos.push(next)} />);

      anadirEfecto(kind);

      expect(emitidos).toHaveLength(1);
      const efecto = emitidos[0][0];
      expect(efecto.kind).toBe(kind);
      // La comprobación real: si un borrador por defecto le faltara un campo obligatorio (la
      // mutación sugerida por el encargo), `parse` lanzaría aquí, no en un 400 de producción.
      expect(() => itemEffectSchema.parse(efecto)).not.toThrow();
      expect(itemEffectSchema.parse(efecto)).toEqual(efecto);
    },
  );

  it("añade los siete tipos uno detrás de otro y los siete pasan el esquema", () => {
    const emitidos: ItemEffect[][] = [];
    render(<Wrapper onEmit={(next) => emitidos.push(next)} />);

    for (const kind of EFFECT_KINDS) {
      anadirEfecto(kind);
    }

    const ultimaLista = emitidos[emitidos.length - 1];
    expect(ultimaLista).toHaveLength(EFFECT_KINDS.length);
    for (const efecto of ultimaLista) {
      expect(() => itemEffectSchema.parse(efecto)).not.toThrow();
    }
    expect(ultimaLista.map((e) => e.kind)).toEqual(EFFECT_KINDS);
  });
});
