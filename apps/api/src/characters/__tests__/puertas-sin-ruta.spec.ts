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

  // Se busca una LLAMADA (`.nombre(`), no el nombre a secas: un comentario de un controlador que
  // explique por qué no llama a la puerta no debe enrojecer esta prueba — ya pasó en la tarea 3 y
  // se resolvió reescribiendo el comentario, que es arreglar el síntoma.
  it.each(["changeHpFromEffect", "createFromEffect"])("ningún controlador llama a %s", (nombre) => {
    const llamada = new RegExp(`\\.${nombre}\\(`);
    const culpables = ficheros.filter((f) => llamada.test(readFileSync(f, "utf8")));
    expect(culpables).toEqual([]);
  });
});
