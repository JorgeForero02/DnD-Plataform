import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// **La garantía de la ficha M2B-3 no puede depender de que alguien se acuerde.**
//
// `PrismaService.transaction` abre el buzón de sucesos para que los que se registren dentro se
// emitan tras el *commit*. Una transacción abierta con `$transaction` a secas **no lo abre**, así
// que el motor de reglas volvería a leer el mundo anterior al suceso y a escribir fuera de la
// transacción — el fallo original, reintroducido sin que nada avise.
//
// Este barrido es la única red que caza eso: ninguna prueba de comportamiento puede fallar por
// una transacción que todavía no existe.

const SRC = join(__dirname, "..");
// **Solo el módulo de Prisma**: `prisma.service.ts`, que es la puerta, y su propia prueba, que
// sustituye la transacción real para comprobar que la puerta abre el buzón.
const PERMITIDO = join(SRC, "prisma");
// La aguja se compone a trozos para que ESTE fichero pueda nombrarla en sus comentarios sin
// aparecer en su propia lista de culpables.
const AGUJA = ["$", "transaction"].join("");

function ficheros(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return ficheros(ruta);
    return ruta.endsWith(".ts") ? [ruta] : [];
  });
}

describe("nadie abre una transacción por su cuenta", () => {
  it("solo el módulo de Prisma nombra la llamada cruda", () => {
    const culpables = ficheros(SRC)
      .filter((ruta) => !ruta.startsWith(PERMITIDO))
      .filter((ruta) => readFileSync(ruta, "utf8").includes(AGUJA))
      .map((ruta) => ruta.slice(SRC.length + 1));

    expect(culpables).toEqual([]);
  });
});
