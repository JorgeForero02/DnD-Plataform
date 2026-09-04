import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "../ThemeToggle";

// B0 (2026-09-04) — **este fichero cambia de forma porque el control cambió de forma, y el
// motivo está escrito para que no parezca un capricho.**
//
// Hasta hoy había dos temas y un botón que alternaba entre ellos, con el rótulo «Cambiar al
// tema Lectura (vitela)». Dos cosas estaban mal a la vez:
//
//   1. **El rótulo mentía.** El tema claro es gris frío (`#dfe5e9`), no vitela. Lo decía la
//      propia `tokens.css` desde 1.19 («light is the parchment reading mode») y nunca fue
//      cierto en los valores. Ahora son tres temas y cada nombre dice lo que es.
//   2. **Tres opciones con significado no caben en un alternador.** Es la regla vinculante de
//      `docs/04-convenciones.md`: cuando cada opción quiere decir algo distinto, van visibles
//      a la vez, no escondidas detrás de un botón que solo enseña la siguiente. Con dos era
//      discutible; con tres, un alternador obliga a pulsar dos veces para ver qué hay.
describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("ofrece los tres temas a la vez y marca el que está puesto", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    render(<ThemeToggle />);

    const grupo = screen.getByRole("radiogroup", { name: "Tema" });
    expect(grupo).toBeInTheDocument();

    // Los tres, visibles y con su nombre legible. Ningún valor de enumeración en pantalla:
    // no aparece «dark», ni «light», ni «reading».
    expect(screen.getByRole("radio", { name: "Oscuro" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Claro" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Lectura" })).toBeInTheDocument();

    expect(screen.getByRole("radio", { name: "Oscuro" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Lectura" })).toHaveAttribute("aria-checked", "false");
  });

  it("elegir un tema lo aplica, lo persiste y mueve la marca", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("radio", { name: "Lectura" }));

    expect(document.documentElement.getAttribute("data-theme")).toBe("reading");
    expect(localStorage.getItem("dnd-theme")).toBe("reading");
    expect(screen.getByRole("radio", { name: "Lectura" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Oscuro" })).toHaveAttribute("aria-checked", "false");

    fireEvent.click(screen.getByRole("radio", { name: "Claro" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("dnd-theme")).toBe("light");
  });

  // El tercer tema es el que esta tanda añade, así que se comprueba que se llega a él **desde
  // cada uno de los otros dos** y no solo desde el que estaba puesto en la prueba de arriba:
  // un control de tres estados falla justo en la transición que nadie prueba.
  // **Esta prueba la escribió una mutación, no una sospecha.** Se quitó `"reading"` de `esTema`
  // a propósito y las tres pruebas de arriba siguieron verdes: todas sellaban `[data-theme]` a
  // mano antes de montar, así que ninguna pasaba nunca por el camino de leer lo guardado. El
  // fallo que dejaban vivo es el que nota una persona: eliges «Lectura», recargas, y vuelves a
  // Oscuro sin explicación.
  it("un tema guardado se recupera al volver, sin `data-theme` en el html", () => {
    localStorage.setItem("dnd-theme", "reading");
    render(<ThemeToggle />);

    expect(screen.getByRole("radio", { name: "Lectura" })).toHaveAttribute("aria-checked", "true");
  });

  it("se llega a Lectura también desde el tema claro", () => {
    document.documentElement.setAttribute("data-theme", "light");
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("radio", { name: "Lectura" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("reading");
  });
});
