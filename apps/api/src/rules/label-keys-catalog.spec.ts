import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { esLabelKeyRegistrada, LABEL_KEYS } from "@dnd/shared";
import { SRD_RACES } from "./catalog/races";
import { SRD_CLASSES } from "./catalog/classes";
import { SRD_ARMOR } from "./catalog/armor";
import type { Grant } from "./catalog/types";

/**
 * **Tarea 34 (tandas 2-5), fix round 1.** La primera versión de este fichero
 * (`label-keys-sweep.spec.ts`, borrado en este mismo cambio) barría solo TEXTO de
 * `apps/api/src/rules/**` buscando `labelKey: "…"` literal, y aceptaba cualquier clave que
 * empezara por `race.`/`subrace.`/`class.`/`armor.`/`ability.`/`abilityMod.` — así que una raza,
 * clase o armadura nueva pasaba sin traducción, un `labelKey` construido con plantilla
 * (`` `race.human.${ability}` ``, el de humano) no lo veía nunca un `grep` de comillas, y los
 * emisores fuera de `rules/` (`character-state/**`, `characters/character-sheet.service.ts`) no
 * se miraban en absoluto. Las tres cosas eran ciertas y la revisión las encontró.
 *
 * Este fichero reemplaza esa comprobación por dos, más estrictas:
 *
 * 1. **El catálogo se IMPORTA y se RECORRE de verdad** (`SRD_RACES`, `SRD_CLASSES`,
 *    `SRD_ARMOR`) — no su texto fuente. Leer el dato ya cargado encuentra igual una clave
 *    escrita como cadena literal o como plantilla (`race.human.${ability}` se lee como
 *    `"race.human.str"`, `"race.human.dex"`, … porque en tiempo de ejecución ya son eso). Cada
 *    clave encontrada tiene que ser un miembro EXACTO de `LABEL_KEYS` — sin comodín de prefijo.
 *
 *    Solo se exige de los grants de raza/subraza cuyo `labelKey` LLEGA a alguna parte: los de
 *    kind `"ability"`, `"hpPerLevel"` y `"abilityChoice"` entran en un `Modifier` que la traza
 *    del motor (`engine.ts`) reenvía tal cual; los de kind `"skillChoice"` entran en un
 *    `PendingChoice` cuando quedan sin resolver. Los de kind `"feature"`, `"speed"`,
 *    `"weaponProficiency"`, `"damageModifier"` y `"skill"` (llano) solo alimentan la lista de
 *    rasgos (`features`, pintada por `.name` en `BloquesDelPie.tsx`) — su `labelKey` no pasa
 *    nunca por `traducirLabelKey`, y por eso están fuera del registro a propósito, comprobado
 *    leyendo `resolve.ts` (no es una suposición).
 *
 * 2. **Un barrido de texto más amplio, sobre TODO `apps/api/src`** (no solo `rules/`), para los
 *    emisores que no son datos de catálogo: `labelKey: "…"` literal Y el último argumento
 *    literal de una llamada a `paso(op, amount, sourceType, sourceKey, labelKey)`. Sigue
 *    excluyendo `*.spec.ts`/`*.test.ts` (sus fixtures inventan claves como `"a"` o `"manual.dm"`
 *    que no son del contrato) y, con motivo declarado, dos ficheros cuya traza hoy no tiene
 *    ninguna pantalla que la consuma (ver `SIN_CONSUMIDOR_WEB_TODAVIA` abajo) — y las propias
 *    `catalog/races.ts`/`catalog/classes.ts`, que el punto 1 ya cubre con más precisión (sabe
 *    filtrar por `kind`; un barrido de texto no).
 */

// --- 1. El catálogo, recorrido de verdad ---

const KINDS_QUE_LLEGAN_A_TRADUCIRLABELKEY: ReadonlySet<Grant["kind"]> = new Set([
  "ability",
  "hpPerLevel",
  "abilityChoice",
  "skillChoice",
]);

function labelKeysDeRaza(): string[] {
  const claves: string[] = [];
  for (const raza of SRD_RACES) {
    for (const grant of raza.grants)
      if (KINDS_QUE_LLEGAN_A_TRADUCIRLABELKEY.has(grant.kind)) claves.push(grant.labelKey);
    for (const subraza of raza.subraces)
      for (const grant of subraza.grants)
        if (KINDS_QUE_LLEGAN_A_TRADUCIRLABELKEY.has(grant.kind)) claves.push(grant.labelKey);
  }
  return claves;
}

function labelKeysDeClase(): string[] {
  // Espejo exacto de `resolve.ts` (`habilidadesDeClase.labelKey`): una elección de habilidades
  // por clase, con esta misma plantilla.
  return SRD_CLASSES.map((clase) => `class.${clase.key}.skills`);
}

function labelKeysDeArmadura(): string[] {
  const claves: string[] = [];
  for (const armadura of SRD_ARMOR) {
    claves.push(`armor.${armadura.key}`);
    // Espejo de `engine.ts` (`ac.cap.${formula.key}.${suma.ability}`): solo empuja el paso de
    // recorte cuando la fórmula declara un tope de Destreza.
    if (armadura.dexCap !== undefined) claves.push(`ac.cap.${armadura.key}.dex`);
  }
  return claves;
}

describe("el catálogo, recorrido de verdad, no estrena ninguna labelKey sin registrar", () => {
  it("SRD_RACES/SRD_SUBRACES trae al menos una raza y una subraza con grants (si esto es 0, el resto de la prueba pasaría vacío sin haber comprobado nada)", () => {
    expect(SRD_RACES.length).toBeGreaterThan(0);
    expect(SRD_RACES.some((r) => r.subraces.length > 0)).toBe(true);
  });

  it("cada labelKey de raza/subraza que llega a traducirLabelKey es un miembro EXACTO de LABEL_KEYS", () => {
    const noRegistradas = labelKeysDeRaza().filter(
      (clave) => !(LABEL_KEYS as readonly string[]).includes(clave),
    );
    expect(noRegistradas).toEqual([]);
  });

  it("cada elección de habilidades de clase (una por SRD_CLASSES) es exacta en LABEL_KEYS", () => {
    const noRegistradas = labelKeysDeClase().filter(
      (clave) => !(LABEL_KEYS as readonly string[]).includes(clave),
    );
    expect(noRegistradas).toEqual([]);
  });

  it("cada armadura y su tope de Destreza (SRD_ARMOR) son exactos en LABEL_KEYS", () => {
    const noRegistradas = labelKeysDeArmadura().filter(
      (clave) => !(LABEL_KEYS as readonly string[]).includes(clave),
    );
    expect(noRegistradas).toEqual([]);
  });
});

// --- 2. El barrido de texto, ampliado a apps/api/src entero, para los emisores que no son
// datos de catálogo. ---

// `__dirname` es `apps/api/src/rules`; una sola vez arriba es `apps/api/src` — la raíz que se
// quiere barrer. Dos veces arriba se salía a `apps/api` entero y colaba `test/` y `dist/`
// (bug real, cazado corriendo esta prueba: `apps/api/test/condiciones-en-las-tiradas.e2e-spec.ts`
// apareció como si fuera código de producción).
const RAIZ_API_SRC = join(__dirname, "..");

/**
 * Ficheros cuya traza HOY no llega a ninguna pantalla — comprobado leyendo el árbol de
 * `apps/web/src`, no supuesto: no existe ninguna carpeta de "actividades" ni ningún consumidor
 * de `RollModeReason`/`SuggestedRollMode`. `activity.diceRolled` y las tres
 * `rollMode.condition.*` son claves reales que el servidor puede emitir, así que sí figuran en
 * `LABEL_KEYS`... — no, deliberadamente NO figuran, porque registrarlas sin que nada las use
 * daría una falsa sensación de cobertura. Si algún día se construye esa pantalla, entra por
 * aquí: se quita la exclusión y el barrido de abajo empieza a exigirles registro, tal como pide
 * el resto del motor.
 */
const SIN_CONSUMIDOR_WEB_TODAVIA = [
  join(RAIZ_API_SRC, "activities", "activities.service.ts"),
  join(RAIZ_API_SRC, "character-state", "roll-mode", "suggested-roll-mode.ts"),
];

/** `catalog/races.ts` y `catalog/classes.ts` ya se recorren con precisión (por `kind`) arriba;
 * un barrido de texto sobre ellos no sabe distinguir un grant "feature" de uno "ability" y
 * volvería a exigir traducción para claves que nunca la necesitan. */
const YA_CUBIERTOS_POR_EL_RECORRIDO_DEL_CATALOGO = [
  join(RAIZ_API_SRC, "rules", "catalog", "races.ts"),
  join(RAIZ_API_SRC, "rules", "catalog", "classes.ts"),
];

function ficherosFuenteDe(dir: string): string[] {
  const encontrados: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) {
      encontrados.push(...ficherosFuenteDe(ruta));
      continue;
    }
    if (!entrada.endsWith(".ts")) continue;
    if (entrada.endsWith(".spec.ts") || entrada.endsWith(".test.ts")) continue;
    if (SIN_CONSUMIDOR_WEB_TODAVIA.includes(ruta)) continue;
    if (YA_CUBIERTOS_POR_EL_RECORRIDO_DEL_CATALOGO.includes(ruta)) continue;
    encontrados.push(ruta);
  }
  return encontrados;
}

interface Hallazgo {
  clave: string;
  ruta: string;
  forma: "literal" | "plantilla";
}

function labelKeysEnTextoDe(ruta: string): Hallazgo[] {
  const texto = readFileSync(ruta, "utf8");
  const hallazgos: Hallazgo[] = [];

  // Forma 1: propiedad literal `labelKey: "…"`.
  for (const m of texto.matchAll(/labelKey:\s*"([^"]+)"/g))
    hallazgos.push({ clave: m[1], ruta, forma: "literal" });

  // Forma 2: último argumento LITERAL de `paso(op, amount, sourceType, sourceKey, labelKey)`.
  // `[\s\S]*?` en vez de `.*?` para que una llamada partida en varias líneas no se pierda.
  for (const m of texto.matchAll(
    /\bpaso\(\s*"[^"]*"\s*,[\s\S]*?,\s*"[^"]*"\s*,[\s\S]*?,\s*"([^"]+)"\s*\)/g,
  ))
    hallazgos.push({ clave: m[1], ruta, forma: "literal" });

  // Forma 3: último argumento en PLANTILLA de `paso(...)` (`` `prefijo.${var}sufijo` ``). Se
  // exige que exista al menos una `LABEL_KEYS` con ese mismo prefijo, o que el prefijo esté en
  // `LABEL_KEY_DYNAMIC_PREFIXES` — no basta con "empieza por algo parecido", tiene que haber una
  // clave de verdad registrada con ese principio.
  for (const m of texto.matchAll(
    /\bpaso\(\s*"[^"]*"\s*,[\s\S]*?,\s*"[^"]*"\s*,[\s\S]*?,\s*`([^`$]*)\$\{[^}]*\}[^`]*`\s*\)/g,
  ))
    hallazgos.push({ clave: m[1], ruta, forma: "plantilla" });

  return hallazgos;
}

describe("el barrido de texto sobre apps/api/src no encuentra ninguna clave sin registrar", () => {
  const ficheros = ficherosFuenteDe(RAIZ_API_SRC);

  it("el barrido encuentra ficheros fuente que declarar", () => {
    expect(ficheros.length).toBeGreaterThan(0);
  });

  it("todas las labelKey (literales o el prefijo de una plantilla) están registradas", () => {
    const hallazgos = ficheros.flatMap(labelKeysEnTextoDe);
    const noRegistradas = hallazgos
      .filter((h) => (h.forma === "literal" ? !esLabelKeyRegistrada(h.clave) : false))
      .map((h) => `${h.clave} (${h.ruta})`);

    // Las de plantilla se comprueban por prefijo, no por igualdad exacta con esLabelKeyRegistrada
    // (que también aceptaría un prefijo real pero no distingue "hay algo registrado con este
    // principio" de "cualquier cosa que empiece así vale").
    const plantillasSinFamiliaConocida = hallazgos
      .filter((h) => h.forma === "plantilla")
      .filter(
        (h) =>
          !(LABEL_KEYS as readonly string[]).some((k) => k.startsWith(h.clave)) &&
          !esLabelKeyRegistrada(h.clave),
      )
      .map((h) => `${h.clave}… (${h.ruta})`);

    expect([...noRegistradas, ...plantillasSinFamiliaConocida]).toEqual([]);
  });
});
