// E0 — la prueba de ida y vuelta que decide D2.
//
// Markdown → documento de TipTap → Markdown, comparado **byte a byte**, sobre un corpus que
// imita lo que este producto guarda de verdad (las plantillas de `plantillas.ts` y la sintaxis
// que `resumen.ts` limpia hoy), no un ejemplo de manual.
//
// Cómo se ejecuta, desde la raíz del monorepo:
//     node scripts/e0-tiptap-roundtrip.mjs
//     node scripts/e0-tiptap-roundtrip.mjs --tabla     # solo el resumen, sin los diffs
//     node scripts/e0-tiptap-roundtrip.mjs --completo  # + tablas, imágenes y listas de tareas
//     node scripts/e0-tiptap-roundtrip.mjs --caso "Tabla"
//
// Las dependencias viven en `apps/web/node_modules` (se instalaron ahí, que es donde iría el
// editor). Por eso el import es una ruta y no un nombre de paquete: `scripts/` está en la raíz
// del monorepo y la raíz no las tiene.
import { MarkdownManager } from "../apps/web/node_modules/@tiptap/markdown/dist/index.js";
import { StarterKit } from "../apps/web/node_modules/@tiptap/starter-kit/dist/index.js";
import { TableKit } from "../apps/web/node_modules/@tiptap/extension-table/dist/index.js";
import { Image } from "../apps/web/node_modules/@tiptap/extension-image/dist/index.js";
import { TaskList, TaskItem } from "../apps/web/node_modules/@tiptap/extension-list/dist/index.js";

// --------------------------------------------------------------------------------------------
// El corpus. Cada caso es una pieza de sintaxis que este producto usa o va a usar.
// --------------------------------------------------------------------------------------------

const CASOS = [
  {
    nombre: "Plantilla NPC (la real, de plantillas.ts)",
    md: ["## Qué se ve", "", "## Qué quiere", "", "## Qué esconde", "", "## Cómo habla", ""].join(
      "\n",
    ),
  },
  {
    nombre: "Plantilla DOCUMENT (cita + regla + encabezado)",
    md: [
      "> Escribe aquí el texto tal y como los jugadores lo leerían.",
      "",
      "",
      "---",
      "",
      "## Notas del DM sobre este documento",
      "",
    ].join("\n"),
  },
  {
    nombre: "Encabezados de varios niveles",
    md: ["# El puerto de Sarnath", "", "## Al llegar", "", "### El muelle viejo", ""].join("\n"),
  },
  {
    nombre: "Lista con viñetas (guion)",
    md: ["- Un guardia dormido", "- Dos barriles de brea", "- Una puerta sin cerrar", ""].join(
      "\n",
    ),
  },
  {
    nombre: "Lista con viñetas (asterisco)",
    md: ["* Un guardia dormido", "* Dos barriles de brea", ""].join("\n"),
  },
  {
    nombre: "Lista anidada (dos niveles)",
    md: [
      "- El muelle",
      "  - La grúa rota",
      "  - El cobertizo",
      "- La lonja",
      "  - Los tenderetes",
      "",
    ].join("\n"),
  },
  {
    nombre: "Lista numerada",
    md: ["1. Hablar con Kellan", "2. Bajar al sótano", "3. No abrir el arcón", ""].join("\n"),
  },
  {
    nombre: "Cita en bloque",
    md: ["> No preguntéis por el cargamento.", "> Nadie firmó nada.", ""].join("\n"),
  },
  {
    nombre: "Cita en bloque de varios párrafos",
    md: ["> Primer párrafo de la carta.", ">", "> Segundo párrafo de la carta.", ""].join("\n"),
  },
  {
    nombre: "Negrita y cursiva",
    md: "Kellan es **el maestre** y *nunca* mira a los ojos.\n",
  },
  {
    nombre: "Negrita y cursiva con guion bajo",
    md: "Kellan es __el maestre__ y _nunca_ mira a los ojos.\n",
  },
  {
    nombre: "Enlace",
    md: "Vive en [la Torre Gris](/entities/torre-gris) desde el incendio.\n",
  },
  {
    nombre: "Código en línea",
    md: "El sello lleva grabado `Vhael-VII` en el reverso.\n",
  },
  {
    nombre: "Bloque de código con lenguaje",
    md: ["```json", '{ "ca": 15, "iniciativa": 2 }', "```", ""].join("\n"),
  },
  {
    nombre: "Bloque de código sin lenguaje",
    md: ["```", "tirada: 1d20+5", "```", ""].join("\n"),
  },
  {
    nombre: "Tabla",
    md: [
      "| Guardia | PG | CA |",
      "| --- | --- | --- |",
      "| Kellan | 22 | 15 |",
      "| Marta | 11 | 12 |",
      "",
    ].join("\n"),
  },
  {
    nombre: "Línea horizontal",
    md: ["Texto de arriba.", "", "---", "", "Texto de abajo.", ""].join("\n"),
  },
  {
    nombre: "Salto de línea duro (dos espacios)",
    md: "Primera línea de la carta.  \nSegunda línea, misma estrofa.\n",
  },
  {
    nombre: "Salto de línea duro (contrabarra)",
    md: "Primera línea de la carta.\\\nSegunda línea, misma estrofa.\n",
  },
  {
    nombre: "Acentos, eñes y signos de apertura",
    md: "¿Quién dejó la puerta abierta? ¡El niño de la señora Muñoz añadió más leña!\n",
  },
  {
    nombre: "Comillas angulares españolas",
    md: 'Kellan dijo: «no preguntéis por el cargamento» —y se fue— "sin más".\n',
  },
  {
    nombre: "Directiva de contenedor :::dm (el bloque secreto)",
    md: [
      "Lo que los jugadores leen.",
      "",
      ":::dm",
      "Kellan miente: él quemó el almacén.",
      ":::",
      "",
      "Y esto se vuelve a ver.",
      "",
    ].join("\n"),
  },
  {
    nombre: "Directiva :::dm con formato dentro",
    md: [
      ":::dm",
      "## Lo que de verdad pasó",
      "",
      "- Kellan **quemó** el almacén",
      "- El sello es falso",
      ":::",
      "",
    ].join("\n"),
  },
  {
    nombre: "Imagen",
    md: "![El sello de la Casa Vhael](/uploads/sello.png)\n",
  },
  {
    nombre: "Lista de tareas",
    md: ["- [ ] Hablar con Kellan", "- [x] Bajar al sótano", ""].join("\n"),
  },
  {
    nombre: "Tachado",
    md: "El cargamento ~~llegó~~ nunca salió del puerto.\n",
  },
  {
    nombre: "Caracteres con significado en Markdown dentro de prosa",
    md: "El precio subió un 20% (de 5 a 6 po) y el guardia usa un mote: Kellan_el_Gris.\n",
  },
  {
    nombre: "Documento completo, como lo escribiría el DM",
    md: [
      "# El cargamento que no llegó",
      "",
      "## Quién la encarga",
      "",
      "**Maestre Kellan**, desde [la Torre Gris](/entities/torre-gris). Habla despacio y *nunca*",
      "mira a los ojos.",
      "",
      "> «El cargamento salió el martes. Nadie firmó nada.»",
      "",
      "## Qué hay que hacer",
      "",
      "1. Bajar al muelle antes del alba",
      "2. Buscar el sello `Vhael-VII`",
      "   - En los barriles",
      "   - En el libro del capataz",
      "3. No abrir el arcón",
      "",
      "## Qué se gana",
      "",
      "| Recompensa | Cantidad |",
      "| --- | --- |",
      "| Oro | 150 po |",
      "| Favor | 1 |",
      "",
      "---",
      "",
      ":::dm",
      "Kellan quemó el almacén él mismo. El «cargamento» nunca existió.",
      ":::",
      "",
    ].join("\n"),
  },
];

// --------------------------------------------------------------------------------------------
// La prueba.
// --------------------------------------------------------------------------------------------

/**
 * Las palabras que el documento contiene, sin nada de sintaxis. Sirve para separar la
 * **normalización** (los mismos textos, otra puntuación de Markdown) de la **pérdida real**
 * (palabras que ya no están, o que aparecen de la nada).
 */
function palabras(md) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_~`|\-+\\[\]()!]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function diferenciaDePalabras(entrada, salida) {
  const a = palabras(entrada);
  const b = palabras(salida);
  const cuenta = (xs) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map());
  const ca = cuenta(a);
  const cb = cuenta(b);
  const perdidas = [];
  const nuevas = [];
  for (const [w, n] of ca) {
    const d = n - (cb.get(w) ?? 0);
    if (d > 0) perdidas.push(...Array(d).fill(w));
  }
  for (const [w, n] of cb) {
    const d = n - (ca.get(w) ?? 0);
    if (d > 0) nuevas.push(...Array(d).fill(w));
  }
  return { perdidas, nuevas };
}

function visible(s) {
  return s
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replace(/ +$/gm, (m) => "·".repeat(m.length));
}

function lineasDistintas(entrada, salida) {
  const a = entrada.split("\n");
  const b = salida.split("\n");
  const filas = [];
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if (a[i] !== b[i]) filas.push({ n: i + 1, entrada: a[i], salida: b[i] });
  }
  return filas;
}

// `--completo` añade las extensiones que el StarterKit **no** trae: tablas, imágenes y listas
// de tareas. Sin la bandera se mide lo que trae la caja; con ella, lo que costaría no perder.
const COMPLETO = process.argv.includes("--completo");

function nuevoManager() {
  const extensiones = COMPLETO ? [StarterKit, TableKit, Image, TaskList, TaskItem] : [StarterKit];
  return new MarkdownManager({ extensions: extensiones });
}

function ejecutar(caso) {
  const manager = nuevoManager();
  let doc;
  let salida;
  let error = null;
  try {
    doc = manager.parse(caso.md);
    salida = manager.serialize(doc);
  } catch (e) {
    error = e;
  }
  if (error) return { ...caso, error };

  // Segunda vuelta: si `salida` vuelve a entrar y sale igual, la normalización es un punto
  // fijo — se paga una vez, al primer guardado, y nunca más. Si no lo es, el documento se
  // mueve solo cada vez que se abre, y eso sí es inaceptable.
  let salida2 = null;
  try {
    salida2 = nuevoManager().serialize(nuevoManager().parse(salida));
  } catch {
    salida2 = null;
  }

  return {
    ...caso,
    doc,
    salida,
    identico: salida === caso.md,
    // El serializador nunca devuelve el salto de línea final. Es la única diferencia que
    // aparece en los 28 casos, así que se mide aparte para que no tape las de verdad.
    identicoSalvoFinal:
      salida === caso.md ||
      `${salida}
` === caso.md,
    estable: salida2 === salida,
    lineas: lineasDistintas(caso.md, salida),
    ...diferenciaDePalabras(caso.md, salida),
  };
}

const args = process.argv.slice(2);
const soloTabla = args.includes("--tabla");
const filtro = args.includes("--caso") ? args[args.indexOf("--caso") + 1] : null;

const casos = filtro
  ? CASOS.filter((c) => c.nombre.toLowerCase().includes(filtro.toLowerCase()))
  : CASOS;
const resultados = casos.map(ejecutar);

if (!soloTabla) {
  for (const r of resultados) {
    console.log(`\n${"=".repeat(90)}\n${r.nombre}\n${"=".repeat(90)}`);
    if (r.error) {
      console.log(`  REVIENTA: ${r.error.message}`);
      continue;
    }
    console.log(`ENTRADA:\n${visible(r.md)}`);
    console.log(`SALIDA:\n${visible(r.salida)}`);
    console.log(
      `identico=${r.identico}  estable=${r.estable}  palabras_perdidas=${JSON.stringify(r.perdidas)}  palabras_nuevas=${JSON.stringify(r.nuevas)}`,
    );
    if (!r.identico) {
      for (const l of r.lineas) {
        console.log(`  L${l.n}  - ${JSON.stringify(l.entrada)}`);
        console.log(`  L${l.n}  + ${JSON.stringify(l.salida)}`);
      }
    }
  }
}

console.log(`\n${"=".repeat(90)}\nRESUMEN\n${"=".repeat(90)}`);
for (const r of resultados) {
  const estado = r.error
    ? "REVIENTA"
    : r.identico
      ? "IDENTICO"
      : r.perdidas.length > 0
        ? "PERDIDA "
        : r.identicoSalvoFinal
          ? "SOLOSALTO"
          : "NORMALIZ";
  const nota = r.error
    ? r.error.message
    : `${r.lineas?.length ?? 0} lineas distintas · estable=${r.estable}` +
      (r.perdidas?.length ? ` · faltan ${JSON.stringify(r.perdidas.slice(0, 8))}` : "");
  console.log(`${estado}  ${r.nombre.padEnd(52)} ${nota}`);
}

const identicos = resultados.filter((r) => r.identicoSalvoFinal).length;
const perdidas = resultados.filter((r) => !r.error && r.perdidas.length > 0).length;
const revientan = resultados.filter((r) => r.error).length;
console.log(
  `\n${identicos}/${resultados.length} idénticos salvo el salto final · ${perdidas} con pérdida de palabras · ${revientan} revientan`,
);
