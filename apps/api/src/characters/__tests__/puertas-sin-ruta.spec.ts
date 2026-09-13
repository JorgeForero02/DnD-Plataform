import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Spec puerta de efectos §3.1/§3.2: las dos puertas «no se exponen por HTTP». Misma forma que la
// prueba que protege `viewerFor`: se lee el árbol de controladores y se busca el nombre.
function controladores(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return controladores(p);
    return n.endsWith(".controller.ts") ? [p] : [];
  });
}

describe("las puertas de efecto no tienen ruta", () => {
  const raiz = join(__dirname, "..", "..");
  const ficheros = controladores(raiz);

  it("hay controladores que revisar", () => {
    expect(ficheros.length).toBeGreaterThan(10);
  });

  it.each(["changeHpFromEffect", "createFromEffect"])("ningún controlador llama a %s", (nombre) => {
    const culpables = ficheros.filter((f) => readFileSync(f, "utf8").includes(nombre));
    expect(culpables).toEqual([]);
  });
});
