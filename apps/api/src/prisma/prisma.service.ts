import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient, type Prisma } from "@prisma/client";
import { conBuzonDeSucesos } from "../common/after-commit";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * **Cerrar la aplicación cierra sus conexiones, y esto faltaba** (2026-09-05).
   *
   * En producción da igual —hay una instancia y vive para siempre—, pero **la suite e2e monta y
   * cierra una aplicación por fichero**, y sin esto cada `app.close()` dejaba su pool abierto.
   * Con 37 ficheros contra un Postgres de `max_connections = 100`, la suite **entera** moría a
   * mitad con `FATAL: sorry, too many clients already`, que Prisma traduce a
   * «Authentication failed against database server» — un mensaje que manda a mirar las
   * credenciales, que están bien.
   *
   * Se encontró corriendo los e2e **todos juntos** después de ensamblar cinco carriles; por
   * fichero nunca se ve, y por eso llevaba tiempo ahí.
   */
  async onModuleDestroy() {
    await this.$disconnect();
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
