import { readFileSync } from "node:fs";
import { join } from "node:path";

// Commit 1 del lote D-CF-14 — `RestKind` llevaba desde la migración `20260902141641` declarado
// en `schema.prisma` sin que ningún modelo lo usara como tipo de campo: un enum fantasma que
// Prisma sí genera en el cliente y que nadie puede importar con sentido. Este guardián es
// genérico a propósito, para que el próximo enum muerto se detecte solo: recorre cada
// `enum NombreDelEnum { ... }` del esquema y exige que `NombreDelEnum` aparezca como tipo de
// algún campo (con o sin `?`/`[]`) en algún `model`. Se quedó en rojo por `RestKind` la primera
// vez que corrió; se queda como red permanente contra el siguiente.

const schemaPath = join(__dirname, "..", "..", "prisma", "schema.prisma");
const schema = readFileSync(schemaPath, "utf8");

function nombresDeEnum(): string[] {
  return [...schema.matchAll(/^enum\s+(\w+)\s*\{/gm)].map((m) => m[1]);
}

function seUsaComoTipoDeCampo(enumName: string): boolean {
  // Un campo de modelo tiene forma `nombre   Tipo` (opcionalmente `Tipo?` o `Tipo[]`), al
  // principio de línea salvo indentación. No hace falta parsear el modelo entero: basta con que
  // el nombre del enum aparezca como palabra completa en posición de tipo, seguida de fin de
  // línea, `?`, `[]` o espacio (para `@default(...)` u otros atributos) — y que la línea no sea
  // la propia declaración `enum NombreDelEnum {`, que tiene la misma forma superficial
  // («palabra» + espacio + «Tipo») y por eso un enum se validaba a sí mismo sin usarse en ningún
  // modelo (RestKind pasó así la primera versión de este guardián).
  const comoTipo = new RegExp(`^\\s*(?!enum\\s)\\S+\\s+${enumName}(\\?|\\[\\])?(\\s|$)`, "m");
  return comoTipo.test(schema);
}

describe("ningún enum de schema.prisma queda sin usar", () => {
  for (const enumName of nombresDeEnum()) {
    it(`${enumName} es el tipo de algún campo`, () => {
      expect(seUsaComoTipoDeCampo(enumName)).toBe(true);
    });
  }
});
