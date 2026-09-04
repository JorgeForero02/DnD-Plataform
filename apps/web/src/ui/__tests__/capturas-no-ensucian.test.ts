import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// **Ficha M2B-13.** El guion de capturas escribía por defecto en `apps/web/capturas/`, que está
// seguida por git, así que cada corrida de la suite de navegador dejaba nueve binarios
// modificados que no significan nada. Y la salida fácil para limpiarlos —`git checkout` sobre un
// árbol con trabajo sin commitear— es el comando que este proyecto prohíbe.
//
// **Esto no lo puede cazar ninguna prueba de comportamiento**: el daño no está en lo que la
// aplicación hace, está en lo que la suite deja detrás. Se caza leyendo el guion, igual que
// `canales-de-color.test.ts` caza una clase que ningún recorrido monta.

const GUION = join(process.cwd(), "e2e", "capturas-comparacion.spec.ts");
const IGNORADAS = readFileSync(join(process.cwd(), "..", "..", ".gitignore"), "utf8");

describe("la suite de navegador deja el árbol limpio", () => {
  it("el destino por defecto de las capturas NO es la carpeta que sigue git", () => {
    const fuente = readFileSync(GUION, "utf8");
    const defecto = /process\.env\.SALIDA_CAPTURAS \?\? "([^"]+)"/.exec(fuente);
    expect(defecto).not.toBeNull();
    expect(defecto![1]).not.toBe("capturas");
  });

  it("y esa carpeta está en .gitignore, que es lo que lo hace verdad", () => {
    const fuente = readFileSync(GUION, "utf8");
    const defecto = /process\.env\.SALIDA_CAPTURAS \?\? "([^"]+)"/.exec(fuente)![1];
    // La ruta se escribe desde la raíz en `.gitignore`, y el guion la escribe relativa a
    // `apps/web`: comprobar solo el nombre sería comprobar media cosa.
    expect(IGNORADAS).toContain(`apps/web/${defecto}/`);
  });
});
