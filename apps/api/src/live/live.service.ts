import { randomBytes } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { MembershipService } from "../campaigns/membership.service";
import { LiveBus } from "./live-bus";

// Plan 12 · 12.3 — **la autorización del canal y su billete.**
//
// `EventSource` **no manda cabeceras**: no hay forma de poner el `Authorization` de siempre. Y un
// token largo en la URL **acaba en los registros de los proxies** —Traefik y nginx apuntan la
// línea de petición entera—, donde vive mucho más que la sesión de quien lo usó. Así que se pide
// un **billete** por el endpoint normal (con su cabecera, como todo lo demás) y se canjea al abrir
// el canal: **de un solo uso y de vida corta**.

/** Treinta segundos: lo que hay entre pedirlo y abrir la conexión, con margen para una red lenta. */
export const VIDA_DEL_BILLETE_MS = 30_000;

interface BilleteEmitido {
  userId: string;
  campaignId: string;
  expiraEn: number;
}

@Injectable()
export class LiveService {
  /**
   * **En memoria, y a propósito.** Un billete vive treinta segundos y muere al usarse: guardarlo
   * en Postgres sería una tabla que se escribe y se borra en cada apertura de mesa. Comparte la
   * limitación del bus —un solo proceso— y por el mismo motivo: hoy hay un contenedor.
   */
  private readonly billetes = new Map<string, BilleteEmitido>();

  constructor(
    private readonly membership: MembershipService,
    private readonly bus: LiveBus,
  ) {}

  /**
   * **Quién puede escuchar una mesa, en su propio método y no dentro del controlador de SSE.**
   *
   * El día que la fase 3.C traiga un WebSocket, lo reutiliza tal cual en vez de escribir una
   * segunda copia — y una segunda copia de «quién puede» es exactamente lo que este proyecto
   * prohíbe. Ser miembro basta: por el canal no viaja nada que haya que filtrar.
   */
  async assertCanJoin(campaignId: string, userId: string): Promise<void> {
    await this.membership.requireMember(campaignId, userId);
  }

  /** Emite un billete para esa mesa. Exige ser miembro **ahora**, no cuando se canjee. */
  async emitirBillete(campaignId: string, userId: string): Promise<{ ticket: string }> {
    await this.assertCanJoin(campaignId, userId);
    this.limpiarCaducados();
    const ticket = randomBytes(24).toString("base64url");
    this.billetes.set(ticket, {
      userId,
      campaignId,
      expiraEn: Date.now() + VIDA_DEL_BILLETE_MS,
    });
    return { ticket };
  }

  /**
   * Canjea el billete. **Se borra siempre**, valga o no: un billete que se pudiera reintentar ya
   * no sería de un solo uso, y un billete caducado que siguiera en el mapa sería memoria que
   * nadie recoge.
   *
   * Un billete inventado, uno gastado y uno caducado dan **exactamente la misma respuesta**, por
   * el mismo motivo que el enlace de invitación: la diferencia contaría si existió alguna vez.
   */
  canjearBillete(ticket: string, campaignId: string): { userId: string } {
    const billete = this.billetes.get(ticket);
    this.billetes.delete(ticket);
    if (!billete || billete.expiraEn < Date.now() || billete.campaignId !== campaignId) {
      throw new UnauthorizedException("Billete no válido");
    }
    return { userId: billete.userId };
  }

  /** El bus, para quien abre el canal. Se expone aquí para que el controlador no lo conozca aparte. */
  get canal(): LiveBus {
    return this.bus;
  }

  private limpiarCaducados(): void {
    const ahora = Date.now();
    for (const [ticket, billete] of this.billetes) {
      if (billete.expiraEn < ahora) this.billetes.delete(ticket);
    }
  }
}
