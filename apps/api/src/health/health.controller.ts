import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * **La salud de la API, y comprueba la base** (ficha D3, 2026-09-05).
 *
 * Hasta hoy no existía: `GET /` respondía 404 y el `healthcheck` de `docker-compose.prod.yml`
 * dependía de eso, con un comentario que lo decía —*«un 404 resuelve el fetch igual que un 200; NO
 * comprueba que la base de datos siga viva»*—. O sea que la API podía estar en pie con Postgres
 * caído y el contenedor se declaraba sano.
 *
 * **Por eso esto hace un `SELECT 1` y no devuelve `{ ok: true }` a secas**: una API que contesta con
 * la base caída está mintiendo sobre su salud, y el único que se entera es el jugador.
 *
 * ## Lo que NO dice, y es la mitad del diseño
 *
 * **No lleva autenticación** —este controlador no monta `JwtAuthGuard`, que en este proyecto se pone
 * por controlador y no global— y por eso **no
 * cuenta nada**: ni versión, ni número de campañas, ni de usuarios, ni el nombre de la base. Todo
 * eso es información gratis para quien la pida, y quien la pide desde fuera no es el orquestador.
 * Lo único que sale es si está sana, y cuando no lo está, **tampoco se dice por qué**: el detalle
 * del error va a los registros del servidor, no a la respuesta.
 */
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{ status: "ok" }> {
    try {
      // `SELECT 1` y no un `count`: no hace falta tocar ninguna tabla para saber que la conexión
      // vive, y contar filas sería trabajo real en el camino de un sondeo que corre cada 15 s.
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      // 503 y no 500: «ahora mismo no puedo servir» es lo que un orquestador sabe leer para no
      // mandarle tráfico. El motivo no viaja en el cuerpo a propósito.
      throw new ServiceUnavailableException("La API no puede atender ahora mismo.");
    }
    return { status: "ok" };
  }
}
