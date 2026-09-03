import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import { IconoConfirmacion, IconoAviso, IconoRombo } from "../Iconos";
import { Field } from "../Field";
import { OrnamentRule } from "../Ornament";

// Tarea Q1 — la regla «los iconos se dibujan» (docs/04-convenciones.md) no tiene ninguna prueba
// que la sostenga, y por eso llevaba seis incumplimientos encima, incluido el `✓` que la propia
// regla pone como ejemplo prohibido. Esto es esa prueba.
//
// Dos redes distintas, a propósito:
//  1. El DOM renderizado, que es lo que ve el usuario.
//  2. El texto fuente de los ficheros afectados, que además atrapa un glifo reintroducido en una
//     rama que ninguna prueba llegue a montar (un `title`, un `aria-label`, una constante).
// La primera sola no basta, y la segunda sola no comprueba que el dibujo llegue a pintarse.

/** Los prohibidos por nombre. Los cinco de `ui/Badge.tsx` son la excepción declarada y no están. */
// «×» (U+00D7) entró el 2026-09-02: estaba haciendo de icono en la lista de condiciones y esta
// lista no lo llevaba, así que la prueba pasaba en verde sobre una infracción.
const GLIFOS_PROHIBIDOS = ["✓", "✔", "▲", "◆", "☾", "☀", "⚡", "⬆", "×"];

function rutaDe(relativa: string) {
  return fileURLToPath(new URL(relativa, import.meta.url));
}

/** Los ficheros que Q1 limpió. Si alguno vuelve a llevar un glifo, esto se pone rojo. */
const FICHEROS_LIMPIADOS = [
  "../Iconos.tsx",
  "../Field.tsx",
  "../Ornament.tsx",
  "../../features/invites/InvitePanel.tsx",
  "../../pages/AccountPage.tsx",
  "../../pages/LoginPage.tsx",
  "../../features/character-sheet/Condiciones.tsx",
];

describe("Iconos — la regla de que los iconos se dibujan", () => {
  it.each(FICHEROS_LIMPIADOS)("%s no contiene ningún glifo de fuente prohibido", (relativa) => {
    const fuente = readFileSync(rutaDe(relativa), "utf8");
    // Se comprueban uno a uno para que el fallo diga *cuál* volvió, no solo que algo volvió.
    for (const glifo of GLIFOS_PROHIBIDOS) {
      expect(`${relativa} contiene ${glifo}: ${fuente.includes(glifo)}`).toBe(
        `${relativa} contiene ${glifo}: false`,
      );
    }
  });

  it.each([
    ["confirmacion", <IconoConfirmacion key="c" />],
    ["aviso", <IconoAviso key="a" />],
    ["rombo", <IconoRombo key="r" />],
  ])("%s es un SVG que hereda currentColor y no anuncia nada al lector de pantalla", (id, el) => {
    const { container } = render(el);
    const svg = container.querySelector(`svg[data-icono="${id}"]`);
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute("viewBox")).toBe("0 0 24 24");
    // Ni un color propio ni un tamaño en píxeles: el icono es del color y del cuerpo del texto
    // que lo acompaña, que es lo que un glifo hacía gratis y un SVG hay que pedirle.
    expect(svg!.getAttribute("stroke")).toBe("currentColor");
    expect(svg!.getAttribute("width")).toBe("1em");
    // El significado va en el texto de al lado; anunciarlo dos veces es ruido.
    expect(svg!.getAttribute("aria-hidden")).toBe("true");
    expect(svg!.textContent).toBe("");
  });

  it("el aviso de error de Field se dibuja y sigue siendo señal, no adorno", () => {
    render(
      <Field label="Correo" error="El correo no es válido.">
        <input id="email" />
      </Field>,
    );
    const alerta = screen.getByRole("alert");
    // El papel del icono: acompaña al mensaje de error, dentro de la misma alerta, para que la
    // señal no dependa solo de que se distinga el rojo.
    expect(alerta.querySelector('svg[data-icono="aviso"]')).not.toBeNull();
    expect(alerta).toHaveTextContent("El correo no es válido.");
    expect(alerta.textContent).not.toContain("▲");
  });

  it("el filete de OrnamentRule remata con un rombo dibujado, no con un glifo", () => {
    const { container } = render(<OrnamentRule />);
    expect(container.querySelector('svg[data-icono="rombo"]')).not.toBeNull();
    expect(container.textContent).not.toContain("◆");
  });

  it("con etiqueta, el filete muestra la etiqueta y ningún icono", () => {
    const { container } = render(<OrnamentRule>Sesiones</OrnamentRule>);
    expect(container).toHaveTextContent("Sesiones");
    expect(container.querySelector('svg[data-icono="rombo"]')).toBeNull();
  });
});
