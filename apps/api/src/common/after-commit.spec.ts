import { conBuzonDeSucesos, encolarTrasCommit } from "./after-commit";

// Ficha M2B-3. Aquí se prueba el buzón en solitario; que `record` lo use está en
// `../game-events/game-events.service.spec.ts`.

describe("el buzón de sucesos tras el commit", () => {
  it("sin buzón abierto, encolar dice que no y quien llama emite en el momento", () => {
    expect(encolarTrasCommit(async () => undefined)).toBe(false);
  });

  it("con buzón abierto, la emisión se aplaza hasta que la función termina", async () => {
    const orden: string[] = [];

    const resultado = await conBuzonDeSucesos(async () => {
      expect(encolarTrasCommit(async () => void orden.push("emitido"))).toBe(true);
      orden.push("dentro");
      return "valor";
    });

    expect(resultado).toBe("valor");
    expect(orden).toEqual(["dentro", "emitido"]);
  });

  it("las emisiones salen en el orden en que se encolaron", async () => {
    const salida: number[] = [];
    await conBuzonDeSucesos(async () => {
      for (const n of [1, 2, 3]) encolarTrasCommit(async () => void salida.push(n));
    });
    expect(salida).toEqual([1, 2, 3]);
  });

  it("si la función falla, el buzón se descarta y no se emite nada", async () => {
    let emitido = false;
    await expect(
      conBuzonDeSucesos(async () => {
        encolarTrasCommit(async () => void (emitido = true));
        throw new Error("rollback");
      }),
    ).rejects.toThrow("rollback");
    expect(emitido).toBe(false);
  });

  it("una emisión que falla no impide las siguientes ni tumba lo ya confirmado", async () => {
    const salida: string[] = [];
    await expect(
      conBuzonDeSucesos(async () => {
        encolarTrasCommit(async () => {
          throw new Error("regla rota");
        });
        encolarTrasCommit(async () => void salida.push("la segunda sí"));
        return "confirmado";
      }),
    ).resolves.toBe("confirmado");
    expect(salida).toEqual(["la segunda sí"]);
  });

  it("un buzón anidado se reutiliza: emite el de fuera, no el de dentro", async () => {
    // En una transacción anidada, vaciar el buzón del interior emitiría antes de que la de fuera
    // confirmara, que es exactamente el fallo que esto arregla.
    const orden: string[] = [];
    await conBuzonDeSucesos(async () => {
      await conBuzonDeSucesos(async () => {
        encolarTrasCommit(async () => void orden.push("emitido"));
      });
      orden.push("la de fuera sigue abierta");
    });
    expect(orden).toEqual(["la de fuera sigue abierta", "emitido"]);
  });
});
