import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// **Ningún fichero fuente lleva bytes de control dentro**, y esta prueba existe porque uno los
// llevaba y nadie se enteró en dos tandas.
//
// `encounters.service.ts` tenía **tres bytes NUL literales** haciendo de separador en una clave
// (`` `${initiative}\0${groupKey}` ``). El código funcionaba: los tres eran coherentes entre sí y
// ninguna prueba tenía por qué fallar. Lo que se rompió fue **la revisión**:
//
//  · git clasifica como **binario** cualquier fichero con un NUL, así que `git show` lo listaba
//    como `Bin 19708 -> 22896 bytes` y **no producía diff**.
//  · Todo lo que se escribió ahí desde 2.5.2 —el filtrado por `canView`, la renumeración densa de
//    posiciones, `current`, `end`— llegó a `main` **sin que nadie pudiera leer el cambio**, en el
//    fichero con más superficie de fuga del módulo de combate.
//  · Ni Prettier ni ESLint miran los bytes de control: los dos ven texto válido.
//
// Lo encontró una revisión de cierre, mirando los offsets a mano. Esto es lo que hace que no haga
// falta volver a mirarlos: es de la misma familia que `canales-de-color.test.ts` en la web —una
// prueba que barre el fuente buscando una forma que compila y no debería existir—.

/** Tabulador, salto de línea y retorno de carro son legítimos; el resto de C0, y el DEL, no. */
// eslint-disable-next-line no-control-regex
const BYTES_PROHIBIDOS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

const RAIZ = join(__dirname, "..");

function ficherosDeFuente(dir: string): string[] {
  const salida: string[] = [];
  for (const nombre of readdirSync(dir)) {
    const completo = join(dir, nombre);
    if (statSync(completo).isDirectory()) {
      salida.push(...ficherosDeFuente(completo));
    } else if (/\.ts$/.test(nombre)) {
      salida.push(completo);
    }
  }
  return salida;
}

describe("el fuente no lleva bytes de control", () => {
  it("ningún .ts de apps/api/src contiene un byte que vuelva binario el fichero para git", () => {
    const culpables = ficherosDeFuente(RAIZ)
      .map((f) => {
        const texto = readFileSync(f, "utf8");
        const m = BYTES_PROHIBIDOS.exec(texto);
        if (!m) return null;
        // La línea, para que el mensaje sirva de algo: buscar un carácter invisible a ojo en un
        // fichero de mil líneas es exactamente el trabajo que esta prueba viene a evitar.
        const linea = texto.slice(0, m.index).split("\n").length;
        const codigo = m[0].codePointAt(0)!.toString(16).padStart(4, "0");
        return `${f.replace(RAIZ, "src")}:${linea} → U+${codigo.toUpperCase()}`;
      })
      .filter(Boolean);

    expect(culpables).toEqual([]);
  });

  it("y la prueba distingue: un byte NUL en un texto se detecta", () => {
    // Sin esto, la prueba de arriba pasaría igual con la expresión regular rota — que es
    // justamente la clase de prueba que no distingue y que este proyecto ha cazado seis veces.
    expect(BYTES_PROHIBIDOS.test("`${a}\u0000${b}`")).toBe(true);
    // Y no se pasa de lista: tabuladores y saltos de línea son texto normal.
    expect(BYTES_PROHIBIDOS.test("hola\tmundo\r\n")).toBe(false);
  });
});
