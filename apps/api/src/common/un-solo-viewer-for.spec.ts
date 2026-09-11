import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

// **Una sola casa para `viewerFor`.** Trece servicios tenían su propia copia (ficha 21); esta
// prueba barre `apps/api/src` y falla si aparece una nueva fuera de `common/character-viewer.ts`
// — así la próxima copia se detecta al escribirla, no al leer el código tres meses después.
//
// Lista blanca explícita: si un servicio necesita de verdad su propia versión (por ejemplo,
// porque exige ser miembro con `requireMember` en vez de mirar `getMembership`, que es una
// diferencia de comportamiento y no un capricho), se declara aquí con el motivo — nunca en
// silencio.
const PERMITIDAS_CON_COPIA_PROPIA = new Set<string>([
  // `requireMember` en vez de `getMembership`: lanza si quien pregunta no es miembro, en lugar de
  // devolver un `role: null`. Es una diferencia de comportamiento deliberada, no una copia ociosa.
  "apps/api/src/dm-tables/dm-tables.service.ts",
  "apps/api/src/statblocks/npcs.service.ts",
  "apps/api/src/statblocks/statblocks.service.ts",
]);

function archivosTs(dir: string): string[] {
  const resultado: string[] = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    const info = statSync(ruta);
    if (info.isDirectory()) {
      resultado.push(...archivosTs(ruta));
    } else if (nombre.endsWith(".ts") && !nombre.endsWith(".spec.ts")) {
      resultado.push(ruta);
    }
  }
  return resultado;
}

describe("una sola casa para viewerFor", () => {
  it("no hay un método viewerFor (private/protected, con o sin async) fuera de common/, salvo en la lista blanca declarada", () => {
    const srcRoot = join(__dirname, "..");
    const apiRoot = join(__dirname, "..", "..");
    const encontrados: string[] = [];
    for (const ruta of archivosTs(srcRoot)) {
      const relativoSrc = relative(srcRoot, ruta).split("\\").join("/");
      if (relativoSrc.startsWith("common/")) continue;
      const contenido = readFileSync(ruta, "utf8");
      // `private`/`protected`, con o sin `async`: cualquier método `viewerFor` declarado dentro
      // de una clase fuera de `common/` es la misma copia que esta prueba existe para cazar,
      // tenga o no la forma exacta con la que se escribió la primera vez.
      if (/(?:private|protected)\s+(?:async\s+)?viewerFor\(/.test(contenido)) {
        encontrados.push(relative(apiRoot, ruta).split("\\").join("/"));
      }
    }
    const inesperados = encontrados
      .map((f) => `apps/api/${f}`)
      .filter((f) => !PERMITIDAS_CON_COPIA_PROPIA.has(f));
    expect(inesperados).toEqual([]);
  });
});
