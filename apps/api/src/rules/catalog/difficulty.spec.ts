import { SRD_DIFFICULTY_CLASSES } from "./difficulty";

// Tarea 2C.5. **La tabla entera, a mano y en el orden del SRD**, igual que `reference.spec.ts`
// hace con las razas y las clases y por el mismo motivo: un invariante de forma («seis filas con
// una CD creciente») caza el error de copiar y pegar, pero **no el dígito mal transcrito**, que es
// el otro error de una transcripción y el único que aquí puede pasar desapercibido.
//
// Fuente: <https://5thsrd.org/rules/abilities/ability_checks/>, «Typical Difficulty Classes».

describe("la guía de CD del SRD 5.1", () => {
  it("son estas seis filas, con estos seis números", () => {
    expect(SRD_DIFFICULTY_CLASSES).toEqual([
      { key: "very-easy", dc: 5 },
      { key: "easy", dc: 10 },
      { key: "medium", dc: 15 },
      { key: "hard", dc: 20 },
      { key: "very-hard", dc: 25 },
      { key: "nearly-impossible", dc: 30 },
    ]);
  });

  it("y van en orden creciente, que es como se lee una escala", () => {
    const cds = SRD_DIFFICULTY_CLASSES.map((f) => f.dc);
    expect([...cds].sort((a, b) => a - b)).toEqual(cds);
  });
});
