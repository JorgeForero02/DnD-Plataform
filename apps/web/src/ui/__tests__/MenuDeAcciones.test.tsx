import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MenuDeAcciones } from "../MenuDeAcciones";

// Tarea 8 del pulido (C2: #1) — **el menú «…» de la fila del elenco.** La regla de
// `docs/04-convenciones.md` es «hasta `ACCIONES_VISIBLES` = 2 visibles, el resto en un menú
// dibujado»: este es ese menú, genérico, para que la fila del elenco (y el menú «Acciones» del
// paso 3, D-CF-50) lo consuman sin escribir cada uno el suyo.
//
// **`fireEvent`, no `userEvent`**: `@testing-library/user-event` no es una dependencia de este
// paquete (comprobado en `apps/web/package.json` antes de escribir esto) y la regla del
// encargo prohíbe añadir dependencias para una tarea de pulido. `fireEvent.keyDown` es el mismo
// camino que ya usa `ui/__tests__/Dialog.test.tsx` para Escape y Tab.
//
// **`medirSitio` es una costura de prueba, no una prop de producto** (documentada en la firma
// del componente): `jsdom` no maqueta, así que no hay manera de que el menú de verdad no tenga
// sitio debajo, y sin esta costura la rama «se abre hacia arriba» quedaría sin ejercitar en esta
// suite (se mide de verdad, con un navegador, en `e2e/teclado.spec.ts` y `e2e/espacios.spec.ts`).
describe("MenuDeAcciones", () => {
  const acciones = [
    { id: "condicion", rotulo: "Condición", onSelect: vi.fn() },
    { id: "dar", rotulo: "Dar", onSelect: vi.fn() },
    { id: "hoja", rotulo: "Su hoja", onSelect: vi.fn(), disabled: true, motivo: "Cargando" },
  ];

  it("abre con el botón «…», lista las acciones y devuelve el foco al cerrar con Escape", () => {
    render(<MenuDeAcciones etiqueta="Más acciones sobre Klarg" acciones={acciones} />);
    const boton = screen.getByRole("button", { name: "Más acciones sobre Klarg" });
    expect(boton).toHaveAttribute("aria-haspopup", "menu");
    expect(boton.querySelector("[data-icono='menu']")).not.toBeNull();

    fireEvent.click(boton);
    const menu = screen.getByRole("menu");
    expect(within(menu).getAllByRole("menuitem")).toHaveLength(3);
    expect(within(menu).getByRole("menuitem", { name: /Su hoja/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    fireEvent.keyDown(menu, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(boton).toHaveFocus();
  });

  it("las flechas mueven el foco y Enter selecciona", () => {
    render(<MenuDeAcciones etiqueta="Más" acciones={acciones} />);
    fireEvent.click(screen.getByRole("button", { name: "Más" }));
    expect(screen.getByRole("menuitem", { name: "Condición" })).toHaveFocus();

    const menu = screen.getByRole("menu");
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    fireEvent.keyDown(menu, { key: "Enter" });
    expect(acciones[1].onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("se abre hacia arriba cuando no hay sitio debajo", () => {
    render(
      <MenuDeAcciones
        etiqueta="Más"
        acciones={acciones}
        medirSitio={() => ({ abajo: 40, arriba: 400 })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Más" }));
    expect(screen.getByRole("menu")).toHaveAttribute("data-direccion", "arriba");
  });

  it("aria-describedby de un ítem apagado apunta al motivo, para quien no ve el estado visual", () => {
    render(<MenuDeAcciones etiqueta="Más" acciones={acciones} />);
    fireEvent.click(screen.getByRole("button", { name: "Más" }));
    const item = screen.getByRole("menuitem", { name: /Su hoja/ });
    const idDescripcion = item.getAttribute("aria-describedby");
    expect(idDescripcion).not.toBeNull();
    expect(document.getElementById(idDescripcion!)).toHaveTextContent("Cargando");
  });

  // Fix round 3 — **«Neutral» perdió su frase al pasar de la fila al menú**: la fila la
  // enganchaba con `aria-describedby` y el hook no. `descripcion` es independiente de `motivo`
  // (una explica la acción siempre; el otro, por qué está apagada) y si hay los dos se leen los
  // dos. Y **la frase no entra en el nombre**: el `menuitem` sigue llamándose solo por su rótulo.
  it("un ítem con `descripcion` la lleva en su descripción accesible, sin que entre en su nombre", () => {
    render(
      <MenuDeAcciones
        etiqueta="Más"
        acciones={[
          {
            id: "neutral",
            rotulo: "Marcar como Neutral",
            onSelect: vi.fn(),
            descripcion: "Sin bando declarado: el servidor no lo trata como indiferente.",
          },
          {
            id: "ambos",
            rotulo: "Apagada y explicada",
            onSelect: vi.fn(),
            disabled: true,
            motivo: "Enviando",
            descripcion: "Qué hace de verdad",
          },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Más" }));

    const neutral = screen.getByRole("menuitem", { name: "Marcar como Neutral" });
    expect(neutral).toHaveAccessibleDescription(
      "Sin bando declarado: el servidor no lo trata como indiferente.",
    );

    const ambos = screen.getByRole("menuitem", { name: "Apagada y explicada" });
    expect(ambos).toHaveAttribute("aria-disabled", "true");
    expect(ambos).toHaveAccessibleDescription("Qué hace de verdad Enviando");
  });

  it("clic fuera del menú lo cierra", () => {
    render(
      <div>
        <MenuDeAcciones etiqueta="Más" acciones={acciones} />
        <button type="button">Fuera</button>
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Más" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("button", { name: "Fuera" }));
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
