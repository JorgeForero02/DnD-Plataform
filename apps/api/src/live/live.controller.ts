import { Controller, Get, Param, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { IncomingMessage, ServerResponse } from "node:http";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { LiveService } from "./live.service";

// Plan 12 · 12.3 — **el canal en vivo (D-OP-22).**
//
// Dos rutas y ninguna más: se pide el billete por la puerta de siempre —con su cabecera— y se
// abre el canal canjeándolo. Por el canal viajan **avisos, no datos**.

/**
 * **El latido, cada quince segundos.** Un canal SSE ocioso lo corta un proxy: Traefik y nginx
 * cierran conexiones sin tráfico, y sin latido el navegador reconecta cada minuto **sin que nadie
 * sepa por qué** —no hay error, solo reconexiones—. Un comentario SSE (`:` y línea en blanco) no
 * llega a la aplicación: solo mantiene la tubería caliente.
 */
export const LATIDO_MS = 15_000;

/**
 * Lo que hace falta de Fastify, **descrito y no importado**: `apps/api` no declara `fastify` como
 * dependencia directa —lo trae `@nestjs/platform-fastify`—, y una importación de tipos a un
 * paquete que no está en el `package.json` es una dependencia escondida que rompe el día que la
 * plataforma cambie de versión. Con estas dos formas basta y son las de Node.
 */
interface RespuestaCruda {
  /** Le dice a Fastify que esta respuesta la escribe otro: sin esto, se queja al terminar. */
  hijack(): void;
  raw: ServerResponse;
}
interface PeticionCruda {
  raw: IncomingMessage;
}

@Controller()
export class LiveController {
  constructor(private readonly live: LiveService) {}

  /** El billete, por la ruta autenticada normal. De un solo uso y vida corta. */
  @UseGuards(JwtAuthGuard)
  @Post("campaigns/:id/live/ticket")
  ticket(@Req() req: { user: { id: string } }, @Param("id") campaignId: string) {
    return this.live.emitirBillete(campaignId, req.user.id);
  }

  /**
   * El canal. **Sin `JwtAuthGuard` a propósito**: `EventSource` no manda cabeceras, así que aquí
   * la credencial es el billete —que ya se emitió contra la sesión de verdad—.
   *
   * Se escribe sobre `reply.raw` en vez de devolver un `Observable`: hace falta control de las
   * cabeceras (`X-Accel-Buffering`, que es lo que impide que nginx **acumule** el flujo y lo
   * entregue a ráfagas) y del latido, que es un comentario y no un mensaje.
   */
  @Get("live/:campaignId")
  async abrirCanal(
    @Param("campaignId") campaignId: string,
    @Query("ticket") ticket: string,
    @Req() req: PeticionCruda,
    @Res() reply: RespuestaCruda,
  ) {
    const { userId } = this.live.canjearBillete(ticket ?? "", campaignId);
    // **Y se vuelve a comprobar quién puede escuchar**, aunque el billete ya lo comprobó al
    // emitirse: entre las dos cosas caben treinta segundos, y en treinta segundos a alguien se le
    // puede haber echado de la mesa. La autorización se comprueba en el servidor, siempre.
    await this.live.assertCanJoin(campaignId, userId);

    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // **nginx acumula por defecto**, y con eso el canal funciona perfecto en local y llega a
      // ráfagas en producción. Traefik no acumula, pero la cabecera no le molesta.
      "X-Accel-Buffering": "no",
    });
    // Un primer comentario abre la tubería: algunos proxies no consideran «respondida» una
    // conexión hasta que llega el primer byte del cuerpo.
    reply.raw.write(": abierto\n\n");

    const cancelar = this.live.canal.subscribe(campaignId, (aviso) => {
      reply.raw.write(`data: ${JSON.stringify(aviso)}\n\n`);
    });
    const latido = setInterval(() => reply.raw.write(":\n\n"), LATIDO_MS);

    // **Cerrar es la mitad del trabajo.** `EventSource` reconecta solo, y una mesa abierta seis
    // horas con las suscripciones acumuladas se come el servidor.
    const cerrar = () => {
      clearInterval(latido);
      cancelar();
    };
    req.raw.on("close", cerrar);
    reply.raw.on("close", cerrar);
  }
}
