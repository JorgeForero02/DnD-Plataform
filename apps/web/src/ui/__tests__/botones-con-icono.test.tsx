import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Tarea 7 (C3 #12, #22) — el barrido del CÓDIGO FUENTE, igual que `iconos-sin-duplicados.test.ts`.
//
// Anexo #22: «Escribir una criatura» iba sin icono; «+ Crear objeto» llevaba un `+` de fuente —el
// mismo defecto que la regla de iconos ya prohíbe para los glifos sueltos, pero nadie lo barría
// dentro de un botón. Esta prueba es ese barrido.
//
// Regla: todo `<Button>` primario de página (`variant` ausente o "primary") cuyo texto empieza
// por un verbo de crear/escribir/abrir lleva un `Icono*` dentro, y ningún botón empieza por «+».
//
// `RAIZ` se calcula con `__dirname`, como `iconos-sin-duplicados.test.ts`, y no con
// `import.meta.url`: bajo la transformación de Vitest para este fichero ese `import.meta.url` no
// resuelve a un `file:` válido y `fileURLToPath` lanza.
//
// Y el recorrido de ficheros es un `readdirSync` recursivo a mano, no `fs.globSync`: en tiempo
// de ejecución existe desde Node 22, pero los tipos que usa `tsc` aquí son `@types/node@20`
// (fijados por `apps/api`, del que `apps/web` hereda por el hoisting de pnpm) y ese paquete no
// lo declara — `pnpm build` fallaría con `TS2305` aunque la prueba pasara en Vitest.
function ficherosTsxBajo(dir: string): string[] {
  const salida: string[] = [];
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    if (entrada.name === "__tests__") continue;
    const completo = join(dir, entrada.name);
    if (entrada.isDirectory()) {
      salida.push(...ficherosTsxBajo(completo));
    } else if (entrada.name.endsWith(".tsx")) {
      salida.push(completo);
    }
  }
  return salida;
}

const RAIZ = join(__dirname, "..", "..", "..");
const ficheros = [
  ...ficherosTsxBajo(join(RAIZ, "src", "pages")),
  ...ficherosTsxBajo(join(RAIZ, "src", "features")),
];

describe("los botones primarios de página llevan icono dibujado", () => {
  it("ningún botón empieza por un «+» de fuente", () => {
    const culpables = ficheros.filter((f) => /<Button[^>]*>\s*\+\s/.test(readFileSync(f, "utf8")));
    expect(culpables).toEqual([]);
  });

  it("todo <Button> primario con «Crear», «Escribir», «Nueva», «Nuevo» o «Añadir» lleva un <Icono", () => {
    const culpables: string[] = [];
    for (const f of ficheros) {
      const fuente = readFileSync(f, "utf8");
      for (const m of fuente.matchAll(
        /<Button(?![^>]*variant="(?:secondary|ghost|danger)")[^>]*>([\s\S]*?)<\/Button>/g,
      )) {
        const cuerpo = m[1];
        if (/\b(Crear|Escribir|Nueva|Nuevo|Añadir)\b/.test(cuerpo) && !/<Icono\w+/.test(cuerpo)) {
          culpables.push(`${f.slice(RAIZ.length)}: ${cuerpo.trim().slice(0, 40)}`);
        }
      }
    }
    expect(culpables).toEqual([]);
  });
});
