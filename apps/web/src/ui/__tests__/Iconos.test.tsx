import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import * as Iconos from "../Iconos";
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

/** Todo `.ts`/`.tsx` bajo `src/`, menos las pruebas. */
function ficherosDeFuente(dir: string): string[] {
  const salida: string[] = [];
  for (const nombre of readdirSync(dir)) {
    const completo = join(dir, nombre);
    if (statSync(completo).isDirectory()) {
      if (nombre !== "__tests__") salida.push(...ficherosDeFuente(completo));
    } else if (/\.tsx?$/.test(nombre)) {
      salida.push(completo);
    }
  }
  return salida;
}

/**
 * **La excepción declarada, y la única.** Los cinco glifos de `ui/Badge.tsx` (`○ ◐ ◈ ◆ ●`) son
 * geometría pura, se alinean con el texto y distinguen los niveles de visibilidad sin depender
 * del color. `04-convenciones.md` los nombra uno a uno.
 */
const EXCEPCION_DECLARADA = "Badge.tsx";

describe("Iconos — la regla de que los iconos se dibujan", () => {
  // **Se barre `src/` entero, y no una lista escrita a mano.** Hasta el 2026-09-03 esto
  // recorría siete ficheros «los que Q1 limpió», mientras `04-convenciones.md` prometía cazar
  // «uno reintroducido donde ninguna prueba monta el componente». De las siete casas de iconos
  // que el documento enumera, **cinco no se barrían nunca**, ni tampoco las dos nuevas de
  // `features/entities/` y `features/campaigns/`. La red existía y no era la que se anunciaba;
  // lo encontró una auditoría, no un fallo. Una lista a mano de algo que crece con cada pantalla
  // caduca sola — como ya caducó dos veces el censo de `useMyRole`.
  //
  // Los comentarios sí pueden nombrar los glifos: media docena de ficheros explican esta regla
  // citándolos, y prohibirlo obligaría a escribir la regla sin poder mostrar qué prohíbe.
  it("ningún glifo de fuente vuelve al código como icono", () => {
    const culpables: string[] = [];
    for (const fichero of ficherosDeFuente(rutaDe("../.."))) {
      if (fichero.endsWith(EXCEPCION_DECLARADA)) continue;
      readFileSync(fichero, "utf8")
        .split(/\r?\n/)
        .forEach((linea, i) => {
          // Se quita el comentario, empiece como empiece: `//`, `/*`, la continuación `*` de un
          // bloque, y **`{/*`, que es como se comenta dentro de JSX** — ese último faltaba, y el
          // único culpable que encontró el primer barrido fue precisamente un comentario de
          // `ThemeToggle.tsx` que cita los dos glifos que sustituyó.
          const codigo = linea.replace(/^\s*(\{?\/[/*]|\*).*/, "");
          for (const glifo of GLIFOS_PROHIBIDOS) {
            if (codigo.includes(glifo)) {
              culpables.push(`${fichero.split("src")[1]}:${i + 1}  ${glifo}`);
            }
          }
        });
    }
    expect(culpables).toEqual([]);
  });

  // C5, arreglo de cierre (2026-09-04): **se recorren TODOS los iconos del fichero**, y no la
  // lista de tres escrita a mano que había aquí. Con 4 iconos una lista a mano se mantenía sola;
  // con 28 no, y la prueba habría seguido en verde comprobando el 11% del fichero mientras los
  // 22 dibujos nuevos entraban sin que nadie mirase su marco. Es la misma corrección que ya se
  // hizo arriba con el barrido de glifos: una lista a mano de algo que crece caduca sola.
  const TODOS = Object.entries(Iconos).filter(([nombre]) => nombre.startsWith("Icono")) as [
    string,
    ComponentType<{ className?: string }>,
  ][];

  it("el fichero exporta los 23 conceptos de la maqueta, y ninguno se ha perdido por el camino", () => {
    // «Flechas» son dos dibujos —derecha e izquierda—, así que 23 conceptos son 24 componentes,
    // más los cuatro del chrome que ya vivían aquí antes de la maqueta, más **la campana** de la
    // bandeja de avisos (plan 12 · 12.2).
    expect(TODOS).toHaveLength(29);
  });

  it.each(TODOS)(
    "%s es un SVG que hereda currentColor y no anuncia nada al lector de pantalla",
    (_nombre, Icono) => {
      const { container } = render(<Icono />);
      const svg = container.querySelector("svg[data-icono]");
      expect(svg).not.toBeNull();
      expect(svg!.getAttribute("viewBox")).toBe("0 0 24 24");
      // Ni un color propio ni un tamaño en píxeles: el icono es del color y del cuerpo del texto
      // que lo acompaña, que es lo que un glifo hacía gratis y un SVG hay que pedirle.
      expect(svg!.getAttribute("stroke")).toBe("currentColor");
      expect(svg!.getAttribute("width")).toBe("1em");
      // El significado va en el texto de al lado; anunciarlo dos veces es ruido.
      expect(svg!.getAttribute("aria-hidden")).toBe("true");
      expect(svg!.textContent).toBe("");
      // Y todos dibujan algo: un `Marco` vacío pasaría todo lo de arriba y no se vería nada.
      expect(svg!.children.length).toBeGreaterThan(0);
    },
  );

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
