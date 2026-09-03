import type { Prisma } from "@prisma/client";
import { encolarTrasCommit } from "../common/after-commit";
import { PrismaService } from "./prisma.service";

// Ficha M2B-3. **La puerta única a una transacción tiene que abrir el buzón**, y eso no lo puede
// comprobar el barrido de `no-transaction-suelta.spec.ts`: ese caza a quien la esquiva, no a esta
// puerta si un día se le quita el buzón. Sin base de datos: se sustituye la transacción real, que
// es lo único que aquí necesitaría una.

describe("PrismaService.transaction", () => {
  it("abre el buzón de sucesos: lo registrado dentro se emite después, no durante", async () => {
    const service = new PrismaService();
    const orden: string[] = [];
    jest.spyOn(service, "$transaction").mockImplementation((async (
      fn: (tx: Prisma.TransactionClient) => Promise<unknown>,
    ) => {
      const valor = await fn({} as Prisma.TransactionClient);
      orden.push("commit");
      return valor;
    }) as never);

    const resultado = await service.transaction(async () => {
      expect(encolarTrasCommit(async () => void orden.push("emitido"))).toBe(true);
      return "hecho";
    });

    expect(resultado).toBe("hecho");
    expect(orden).toEqual(["commit", "emitido"]);
  });
});
