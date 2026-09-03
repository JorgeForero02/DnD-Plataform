import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient, type Prisma } from "@prisma/client";
import { conBuzonDeSucesos } from "../common/after-commit";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * **La única puerta a una transacción en este proyecto.** Hace lo mismo que `$transaction` y
   * además abre el buzón de sucesos: los que se registren dentro se emiten **después** del
   * *commit*, y si la transacción se deshace no se emite ninguno (ficha M2B-3, ver
   * `../common/after-commit.ts`).
   *
   * `$transaction` a secas queda prohibido fuera de este fichero, y lo comprueba
   * `no-transaction-suelta.spec.ts` barriendo el código: la garantía no puede depender de que
   * quien escriba la próxima transacción se acuerde de esto.
   */
  async transaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    },
  ): Promise<T> {
    return conBuzonDeSucesos(() => this.$transaction(fn, options));
  }
}
