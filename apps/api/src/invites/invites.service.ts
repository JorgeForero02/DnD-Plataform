import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { randomBytes } from "node:crypto";
import type { CreateInviteInput } from "@dnd/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: EventEmitter2,
    private readonly gameEvents: GameEventsService,
  ) {}

  async create(dmUserId: string, campaignId: string, input?: CreateInviteInput) {
    await this.membership.requireDM(campaignId, dmUserId);
    // **Sin `expiresInDays` no caduca**, que es como se han comportado todos los enlaces hasta hoy.
    // Cambiar el defecto en silencio habría puesto fecha de muerte a la costumbre de la mesa sin
    // que nadie lo pidiera; la pantalla propone siete días y el número lo elige el DM.
    const expiresAt =
      input?.expiresInDays === undefined
        ? null
        : new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);
    return this.prisma.invite.create({
      data: { campaignId, token: randomBytes(24).toString("hex"), expiresAt },
    });
  }

  /**
   * **Los enlaces repartidos, con la verdad completa de cada uno** (plan 11, ficha D3b).
   *
   * Hasta hoy se generaban **a ciegas**: nadie sabía cuántos había vivos ni podía matar uno que se
   * hubiera filtrado. Un listado que solo dijera «3 invitaciones» no serviría de nada, así que cada
   * fila dice **cuándo se creó, si se usó y quién la usó, si caducó y si sigue viva**.
   *
   * **El token no viaja entero.** Un listado es una pantalla que se enseña, y con el token en él
   * cualquiera que mire por encima del hombro se lleva una invitación. Va su cola, que es lo único
   * que hace falta para reconocer «este es el enlace que le pasé a Marta».
   */
  async list(dmUserId: string, campaignId: string) {
    await this.membership.requireDM(campaignId, dmUserId);
    const filas = await this.prisma.invite.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
    });
    const ahora = new Date();
    // **Quién la usó, por su nombre.** Se piden los nombres de una vez y no uno por fila: un
    // listado de veinte enlaces no puede costar veintiuna consultas.
    const ids = [...new Set(filas.map((i) => i.usedById).filter((x): x is string => x !== null))];
    const nombres = new Map(
      (
        await this.prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, displayName: true },
        })
      ).map((u) => [u.id, u.displayName]),
    );
    return filas.map((i) => ({
      id: i.id,
      createdAt: i.createdAt,
      usedAt: i.usedAt,
      /** `null` si no se ha usado; el nombre si se usó — nunca el identificador a secas. */
      usedByName: i.usedById ? (nombres.get(i.usedById) ?? "Alguien") : null,
      expiresAt: i.expiresAt,
      revokedAt: i.revokedAt,
      role: i.role,
      /** Los últimos seis del token: suficiente para reconocerlo, inútil para usarlo. */
      tokenTail: i.token.slice(-6),
      /** **Lo derivado se calcula al leer**, como el vencimiento de una condición (2C.4). */
      estado: estadoDeInvitacion(i, ahora),
    }));
  }

  /**
   * **Revocar** (ficha D3b): mata el enlace sin fingir que alguien lo usó.
   *
   * `revokedAt` y **no** `usedAt`: un enlace gastado y uno revocado son dos hechos distintos, y
   * marcar el revocado como usado habría mentido sobre quién entró en la mesa.
   *
   * Es idempotente: revocar dos veces no cambia la fecha ni falla.
   */
  async revoke(dmUserId: string, inviteId: string) {
    const invite = await this.prisma.invite.findUnique({ where: { id: inviteId } });
    // 404 antes que 403: quien no dirige esa mesa no tiene por qué enterarse de que ese enlace
    // existe. Mismo criterio que el resto del producto.
    if (!invite) throw new NotFoundException("Invite not found");
    await this.membership.requireDM(invite.campaignId, dmUserId);
    if (invite.revokedAt) return { revoked: true };
    await this.prisma.invite.update({
      where: { id: inviteId },
      data: { revokedAt: new Date() },
    });
    return { revoked: true };
  }

  async accept(token: string, userId: string) {
    const invite = await this.prisma.invite.findUnique({ where: { token } });
    // **Un enlace inventado, uno gastado, uno revocado y uno caducado dan EXACTAMENTE la misma
    // respuesta.** Si difirieran, el mensaje diría si un token existió alguna vez y en qué estado
    // acabó, que es información que no le debemos a nadie — el mismo criterio que el 404 del
    // oráculo de la CA. Por eso el `if` es uno solo y el mensaje es uno solo.
    if (!invite || estadoDeInvitacion(invite, new Date()) !== "VIVA") {
      throw new BadRequestException("Invalid or already-used invite");
    }
    // **Gastar el enlace y sentar al miembro van en UNA transacción, y quien gasta el enlace es
    // la base** (ficha P3 «aceptar una invitación no es transaccional», cerrada el 2026-09-10).
    // Hasta entonces eran tres viajes sueltos, y tres peticiones a la vez pasaban las tres la
    // comprobación de arriba: un enlace de un solo uso sentaba a tres personas. El `updateMany`
    // condicional —solo si sigue sin usar y sin revocar— es el que decide quién gana; la lectura
    // de arriba se queda como puerta barata y para que el mensaje siga siendo uno solo.
    const member = await this.prisma.transaction(async (tx) => {
      const gastado = await tx.invite.updateMany({
        where: { id: invite.id, usedAt: null, revokedAt: null },
        // **Y quién**, no solo cuándo: es lo que hace útil el listado del DM (ficha D3b).
        data: { usedAt: new Date(), usedById: userId },
      });
      if (gastado.count === 0) {
        throw new BadRequestException("Invalid or already-used invite");
      }
      return tx.campaignMember.upsert({
        where: { campaignId_userId: { campaignId: invite.campaignId, userId } },
        create: { campaignId: invite.campaignId, userId, role: invite.role },
        update: {},
      });
    });
    this.events.emit("campaign.member_joined", { campaignId: invite.campaignId, userId });

    // **Y ademas queda en la linea de tiempo.** El emisor de arriba es interno —lo escucha
    // `notifications`— y el motor de reglas no lo oye: escucha `game_event.recorded`. Sin este
    // registro, `MEMBER_JOINED` estaba en el vocabulario del editor y no se disparaba jamas.
    //
    // **`PLAYERS`, no `DM_ONLY`**: que alguien se siente a la mesa no es un secreto del DM, y la
    // pantalla de miembros ya lo ensena a todos. Esconderlo en el registro seria contar dos
    // versiones distintas del mismo hecho.
    const quien = await this.prisma.user.findUnique({ where: { id: userId } });
    await this.gameEvents.record(userId, invite.campaignId, {
      subjectType: "campaign",
      subjectId: invite.campaignId,
      visibility: "PLAYERS",
      payload: {
        type: "MEMBER_JOINED",
        ...(quien?.displayName ? { displayName: quien.displayName } : {}),
        role: member.role,
      },
    });
    return { campaignId: invite.campaignId, role: member.role };
  }
}

/**
 * El estado de un enlace, **derivado y no guardado** (plan 11, ficha D3b).
 *
 * Misma regla que el vencimiento de una condición (2C.4): guardarlo sería una segunda verdad que
 * puede discrepar de la primera, y obligaría a un barrido periódico que, si no corre, deja vivo un
 * enlace que ya debía estar muerto.
 *
 * **El orden importa**: revocado gana a caducado y caducado gana a usado, porque es el orden en que
 * un DM quiere leerlo — «lo maté yo» dice más que «se le pasó la fecha».
 */
export type EstadoDeInvitacion = "VIVA" | "USADA" | "REVOCADA" | "CADUCADA";

export function estadoDeInvitacion(
  invite: { usedAt: Date | null; expiresAt: Date | null; revokedAt: Date | null },
  ahora: Date,
): EstadoDeInvitacion {
  if (invite.revokedAt) return "REVOCADA";
  if (invite.expiresAt && invite.expiresAt <= ahora) return "CADUCADA";
  if (invite.usedAt) return "USADA";
  return "VIVA";
}
