import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ruleTriggerSchema, type RuleTrigger } from "@dnd/shared";
import { EditorDeDisparador } from "../PiezasDeRegla";
import { DISPARADORES_SIN_MOTOR, NOMBRE_DISPARADOR } from "../vocabulario";

// Tarea 2A.17 — "el desplegable de disparadores no ofrece nada fuera del vocabulario".
//
// La comprobación se hace contra `ruleTriggerSchema` directamente, no contra una lista escrita
// en la prueba: si el desplegable se desviara del esquema —de más o de menos— esto falla.
//
// **Actualizada el 2026-09-04 (auditoría de la mesa, §8.3).** Sigue comprobando exactamente lo
// mismo —que el desplegable no inventa nada que el esquema compartido no tenga, y que no se
// queda corto por accidente—, pero el conjunto ofrecido ya no es «los doce del esquema»: son los
// doce **menos los que el motor no dispara** (`DISPARADORES_SIN_MOTOR`), que se retiraron
// de la oferta porque una regla armada sobre ellos se guarda y no se ejecuta jamás. La aserción
// se sigue derivando del esquema y no de una lista a mano, que es lo que la hacía valer.

const CLAVES_DEL_ESQUEMA = ruleTriggerSchema.options.map((o) => o.shape.kind.value).sort();
const CLAVES_OFRECIDAS = CLAVES_DEL_ESQUEMA.filter(
  (k) => !(DISPARADORES_SIN_MOTOR as readonly string[]).includes(k),
);

describe("EditorDeDisparador", () => {
  it("ofrece exactamente los sucesos del esquema que el motor sí dispara, ni uno más", () => {
    render(
      <EditorDeDisparador
        value={{ kind: "SESSION_STARTED" } as RuleTrigger}
        entities={[]}
        onChange={vi.fn()}
      />,
    );

    const desplegable = screen.getByLabelText("Cuando") as HTMLSelectElement;
    const valores = [...desplegable.options].map((o) => o.value).sort();
    expect(valores).toEqual(CLAVES_OFRECIDAS);
    // Y ninguno de los retirados se cuela como opción elegible.
    for (const retirado of DISPARADORES_SIN_MOTOR) {
      expect(valores).not.toContain(retirado);
    }
  });

  // La otra mitad de la regla vinculante de interfaz: **un valor guardado que el selector no
  // ofrece se muestra marcado y no seleccionable** (`docs/04-convenciones.md`). Una regla vieja
  // armada sobre uno de los retirados tiene que poder leerse; lo que no puede es volver a elegirse.
  // **El ejemplo era `MEMBER_JOINED` y dejo de valer en la Ola 3**, cuando ese suceso paso a
  // existir de verdad: la prueba se puso roja sola, que es exactamente lo que tenia que pasar.
  it("una regla ya guardada con un suceso retirado lo enseña marcado y deshabilitado", () => {
    // **El ejemplo cambió de `DM_EXECUTED` a `ENTITY_ATTACKED` el 2026-09-06** (plan 09): la
    // batuta ya tiene su gesto y vuelve a la paleta. `ENTITY_ATTACKED` se queda retirado **para
    // siempre** —se atacan criaturas, no fichas del mundo—, así que es el caso permanente de esta
    // regla de interfaz: un valor guardado que el selector no ofrece se enseña, no se esconde.
    render(
      <EditorDeDisparador
        value={{ kind: "ENTITY_ATTACKED", entityId: "e1" } as RuleTrigger}
        entities={[]}
        onChange={vi.fn()}
      />,
    );

    const desplegable = screen.getByLabelText("Cuando") as HTMLSelectElement;
    const opcion = [...desplegable.options].find((o) => o.value === "ENTITY_ATTACKED");
    expect(opcion).toBeDefined();
    expect(opcion?.disabled).toBe(true);
    expect(desplegable.value).toBe("ENTITY_ATTACKED");
    expect(screen.getByRole("alert").textContent).toContain("no dispara este suceso");
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
