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

// Low #11, revisión final de `ficha/tanda-2-a-5`: la regex original solo cazaba
// `private`/`protected`/`public` — un método SIN palabra clave (`  async viewerFor(` o
// `  viewerFor(`, legal en TS porque `public` es opcional y Prettier no lo añade) pasaba sin que
// esta prueba se enterara. Se ancla a principio de línea (bandera `m`) con los modificadores
// como opcionales, en vez de exigir uno: así una llamada como `const viewer = await viewerFor(`
// o `await this.viewerFor(` no matchean, porque `const`/`await`/`this.` no son ninguno de los
// modificadores admitidos y por tanto no empiezan la línea en la posición que la regex exige.
const metodoConModificador = /^\s*(?:(?:private|protected|public|static|async)\s+)*viewerFor\s*\(/m;
const funcionSuelta = /\b(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+viewerFor\s*\(/;

function esDefinicionDeViewerFor(contenido: string): boolean {
  return metodoConModificador.test(contenido) || funcionSuelta.test(contenido);
}

describe("regex de detección literal de viewerFor", () => {
  const debeCazar: Array<[string, string]> = [
    ["método private", "  private viewerFor(userId: string, campaignId: string) {"],
    ["método protected async", "  protected async viewerFor(userId: string) {"],
    ["método public", "  public viewerFor(userId: string) {"],
    ["método static", "  static viewerFor(userId: string) {"],
    ["función exportada", "export async function viewerFor(userId: string, campaignId: string) {"],
    ["función suelta sin export", "function viewerFor(userId: string) {"],
    // Caso literal de la revisión (#11): sin ninguna palabra clave delante.
    ["método async sin modificador", "  async viewerFor(userId: string, campaignId: string) {"],
    ["método sin modificador ni async", "  viewerFor(userId: string, campaignId: string) {"],
  ];

  const noDebeCazar: Array<[string, string]> = [
    [
      "llamada con const/await",
      "    const viewer = await viewerFor(this.prisma, this.membership, userId, campaignId);",
    ],
    ["llamada por this.", "    const viewer = await this.viewerFor(userId, campaignId);"],
    ["import nombrado", "  viewerFor,"],
    ["nombre distinto con el mismo prefijo", "  private viewerForCharacterOwner(userId: string) {"],
    [
      "comentario que solo lo menciona",
      "// misma clase de deuda que GameEventsService.viewerFor ya acepta",
    ],
  ];

  it.each(debeCazar)("caza: %s", (_nombre, snippet) => {
    expect(esDefinicionDeViewerFor(snippet)).toBe(true);
  });

  it.each(noDebeCazar)("no caza: %s", (_nombre, snippet) => {
    expect(esDefinicionDeViewerFor(snippet)).toBe(false);
  });
});

describe("una sola casa para viewerFor", () => {
  it("no hay un método viewerFor (con o sin modificador) ni función suelta fuera de common/, salvo en la lista blanca declarada", () => {
    const srcRoot = join(__dirname, "..");
    const apiRoot = join(__dirname, "..", "..");
    const encontrados: string[] = [];
    for (const ruta of archivosTs(srcRoot)) {
      const relativoSrc = relative(srcRoot, ruta).split("\\").join("/");
      if (relativoSrc.startsWith("common/")) continue;
      const contenido = readFileSync(ruta, "utf8");
      if (esDefinicionDeViewerFor(contenido)) {
        encontrados.push(relative(apiRoot, ruta).split("\\").join("/"));
      }
    }
    const inesperados = encontrados
      .map((f) => `apps/api/${f}`)
      .filter((f) => !PERMITIDAS_CON_COPIA_PROPIA.has(f));
    expect(inesperados).toEqual([]);
  });
});
