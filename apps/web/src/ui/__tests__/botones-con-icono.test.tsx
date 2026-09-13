import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Tarea 7 (C3 #12, #22) — el barrido del CÓDIGO FUENTE, igual que `iconos-sin-duplicados.test.ts`.
//
// Anexo #22: «Escribir una criatura» iba sin icono; «+ Crear objeto» llevaba un `+` de fuente —el
// mismo defecto que la regla de iconos ya prohíbe para los glifos sueltos, pero nadie lo barría
// dentro de un botón. Esta prueba es ese barrido.
//
// Regla: todo `<Button>` primario de página (`variant` ausente o "primary") cuyo texto CONTIENE
// un verbo de crear/escribir/abrir lleva un `Icono*` dentro (el regex no ancla al principio del
// texto), y ningún botón empieza por «+» —ese sí anclado, porque el `+` de fuente era siempre
// el primer carácter del cuerpo—.
//
// `RAIZ` se calcula con `__dirname`, como `iconos-sin-duplicados.test.ts`, y no con
// `import.meta.url`: bajo la transformación de Vitest para este fichero ese `import.meta.url` no
// resuelve a un `file:` válido y `fileURLToPath` lanza.
//
// Y el recorrido de ficheros es un `readdirSync` recursivo a mano, no `fs.globSync`: en tiempo
// de ejecución existe desde Node 22, pero los tipos que usa `tsc` aquí son `@types/node@20`
// (fijados por `apps/api`, del que `apps/web` hereda por el hoisting de pnpm) y ese paquete no
// lo declara — `pnpm build` fallaría con `TS2305` aunque la prueba pasara en Vitest.
//
// **Límites conocidos de este barrido de texto, a propósito** (revisión de la ronda 1): no
// evalúa JSX, así que un botón cuya etiqueta viene de una variable (`{miVariable}`) no la ve —
// solo detecta el `+` cuando está escrito literalmente en el JSX— y un `variant={expresion}`
// (una condición, no la cadena literal `"secondary"`) se trata como si fuera primario, porque
// la exclusión de variantes solo reconoce el literal `variant="secondary|ghost|danger"`. Y el
// cuerpo capturado corta en el primer `</Button>` no anidado, así que un `=>` dentro de un
// atributo (un `onClick={() => …}`) no rompe el emparejamiento con la etiqueta de cierre, pero
// SÍ cuenta como texto del cuerpo si el regex de creación coincidiera dentro de esa función —no
// ocurre en el código actual, pero es la clase de falso positivo que un `<Button onClick={() =>
// crear()}>Guardar</Button>` podría producir si «crear» se escribiera con mayúscula inicial.
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

// Revisión final de la rama (2026-09-13). **El regex de la primera versión, `<Button[^>]*>`, se
// paraba en el `>` del `=>` de un `onClick={() => …}`** y por eso el «+» y el «−» de fuente de
// los botones del modificador (`BandejaDeDados.tsx`) sobrevivieron al barrido de la Tarea 7:
// tenían `onClick` con flecha delante del cuerpo. Los atributos de apertura se leen ahora
// tolerando `=>` — un `>` cuenta como cierre de la etiqueta solo si no viene de `=>`. Y el
// glifo cuenta si va seguido de un espacio O del cierre `<`: `>+</Button>` es el mismo «+» de
// fuente aunque no lleve salto de línea detrás. Un «+1» de texto sigue sin coincidir.
const BOTON_QUE_EMPIEZA_POR_MAS = /<Button(?:[^>]|=>)*>\s*[+−-](?:\s|<)/;

describe("los botones primarios de página llevan icono dibujado", () => {
  it("el barrido ve el «+» aunque el botón lleve un onClick con flecha delante", () => {
    // La pieza que faltaba, probada contra el propio regex: si vuelve a `[^>]*`, esto se pone rojo.
    expect(BOTON_QUE_EMPIEZA_POR_MAS.test("<Button onClick={() => x()}>+</Button>")).toBe(true);
    expect(BOTON_QUE_EMPIEZA_POR_MAS.test("<Button onClick={() => x()}>\n  −\n</Button>")).toBe(
      true,
    );
    expect(BOTON_QUE_EMPIEZA_POR_MAS.test("<Button onClick={() => x()}>Guardar</Button>")).toBe(
      false,
    );
  });

  it("ningún botón empieza por un «+» ni un «−» de fuente", () => {
    const culpables = ficheros.filter((f) =>
      BOTON_QUE_EMPIEZA_POR_MAS.test(readFileSync(f, "utf8")),
    );
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

  // Ronda 1 de revisión: 04-convenciones.md dice «toda entrada de navegación lleva icono», pero
  // hasta aquí esta prueba solo miraba `<Button>` — la frase no tenía con qué sostenerse. Las
  // entradas de navegación de `CampaignDetailPage.tsx` no son un array literal de objetos: son
  // el `.map()` de `TABS` que arma cada `TabItem` en su propio `if` (`const items: TabItem[] =
  // TABS.map((t) => { if (...) return { ... }; ... })`), así que un regex de "objeto entre
  // llaves" no basta — un `{id}` o un `{/* comentario */}` de JSX dentro del cuerpo cierran su
  // propia llave antes de tiempo. Por eso el cuerpo de la función se extrae contando llaves
  // (balanceo real, no regex), y luego se trocea por cada `id: "…"` — un marcador que sí es
  // único por entrada — para comprobar que el tramo hasta el siguiente `id:` lleva su `icon:`.
  it("toda entrada de navegación de CampaignDetailPage.tsx lleva icono", () => {
    const rutaCampaignDetail = join(RAIZ, "src", "pages", "CampaignDetailPage.tsx");
    const fuente = readFileSync(rutaCampaignDetail, "utf8");
    const marcador = "const items: TabItem[] = TABS.map((t) => ";
    const inicioMarcador = fuente.indexOf(marcador);
    expect(
      inicioMarcador,
      `No se encontró "${marcador}" en CampaignDetailPage.tsx`,
    ).toBeGreaterThan(-1);
    const aperturaLlave = fuente.indexOf("{", inicioMarcador + marcador.length);
    let profundidad = 1;
    let i = aperturaLlave + 1;
    for (; i < fuente.length && profundidad > 0; i++) {
      if (fuente[i] === "{") profundidad++;
      else if (fuente[i] === "}") profundidad--;
    }
    const cuerpo = fuente.slice(aperturaLlave + 1, i - 1);

    const marcasId = [...cuerpo.matchAll(/id:\s*"([a-z]+)"/g)];
    expect(marcasId.length).toBeGreaterThan(0);
    const culpables: string[] = [];
    for (let n = 0; n < marcasId.length; n++) {
      const desde = marcasId[n].index!;
      const hasta = n + 1 < marcasId.length ? marcasId[n + 1].index! : cuerpo.length;
      const bloque = cuerpo.slice(desde, hasta);
      if (!/icon:\s*</.test(bloque)) culpables.push(marcasId[n][1]);
    }
    expect(culpables).toEqual([]);
  });
});
