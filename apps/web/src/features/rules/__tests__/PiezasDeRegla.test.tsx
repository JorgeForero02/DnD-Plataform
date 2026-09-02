import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ruleTriggerSchema, type RuleTrigger } from "@dnd/shared";
import { EditorDeDisparador } from "../PiezasDeRegla";
import { NOMBRE_DISPARADOR } from "../vocabulario";

// Tarea 2A.17 — "el desplegable de disparadores no ofrece nada fuera del vocabulario".
//
// La comprobación se hace contra `ruleTriggerSchema` directamente, no contra una lista escrita
// en la prueba: si el desplegable se desviara del esquema —de más o de menos— esto falla.

const CLAVES_DEL_ESQUEMA = ruleTriggerSchema.options.map((o) => o.shape.kind.value).sort();

describe("EditorDeDisparador", () => {
  it("ofrece exactamente los sucesos del esquema compartido, ni uno más", () => {
    render(
      <EditorDeDisparador
        value={{ kind: "SESSION_STARTED" } as RuleTrigger}
        entities={[]}
        onChange={vi.fn()}
      />,
    );

    const desplegable = screen.getByLabelText("Cuando") as HTMLSelectElement;
    const valores = [...desplegable.options].map((o) => o.value).sort();
    expect(valores).toEqual(CLAVES_DEL_ESQUEMA);
  });

  it("ninguna opción enseña el valor del enum: todas van traducidas", () => {
    render(
      <EditorDeDisparador
        value={{ kind: "SESSION_STARTED" } as RuleTrigger}
        entities={[]}
        onChange={vi.fn()}
      />,
    );

    const desplegable = screen.getByLabelText("Cuando") as HTMLSelectElement;
    for (const opcion of [...desplegable.options]) {
      expect(opcion.textContent).toBe(
        NOMBRE_DISPARADOR[opcion.value as keyof typeof NOMBRE_DISPARADOR],
      );
      expect(opcion.textContent).not.toBe(opcion.value);
      expect(opcion.textContent).not.toContain("Sin traducir");
    }
  });

  it("una ficha guardada que ya no está en la lista se muestra marcada y no seleccionable", () => {
    render(
      <EditorDeDisparador
        value={{ kind: "ENTITY_OPENED", entityId: "cborrada" }}
        entities={[]}
        onChange={vi.fn()}
      />,
    );

    const opcion = screen.getByRole("option", {
      name: /Ficha guardada que ya no está en la lista/,
    }) as HTMLOptionElement;
    expect(opcion.disabled).toBe(true);
  });
});
