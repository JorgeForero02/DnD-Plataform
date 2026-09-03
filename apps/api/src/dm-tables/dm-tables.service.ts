import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateDmTableInput, DmTableRoll, SetHouseTablesInput, Visibility } from "@dnd/shared";
import type { Prisma } from "@prisma/client";
import { MembershipService } from "../campaigns/membership.service";
import { canView, type Viewer } from "../common/visibility";
import { rollExpression, type Roller } from "../dice/dice";
import { GameEventsService } from "../game-events/game-events.service";
import { PrismaService } from "../prisma/prisma.service";

// Tarea 2C.6 — **las tablas del DM: una regla de la casa, dicha a la vista.**
//
// El SRD **no trae** ninguna tabla de críticos ni de pifias; lo único oficial es que un crítico
// duplica los dados y no los modificadores. Así que estas tablas entran como lo que son: una regla
// de la casa, con **interruptor por campaña, apagado por defecto**, y dejando rastro en la línea de
// tiempo cada vez que se consultan.
//
// **Y se construye como primitiva.** Tirar sobre una tabla con sus resultados y su visibilidad
// sirve igual para pifias, botín, rumores y encuentros aleatorios: una pieza, cuatro usos.

@Injectable()
export class DmTablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: GameEventsService,
  ) {}

  /** El interruptor de la casa. Solo el DM: es una regla de su mesa. */
  async setHouseTables(userId: string, campaignId: string, input: SetHouseTablesInput) {
    await this.membership.requireDM(campaignId, userId);
    const campana = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { houseTablesEnabled: input.enabled },
    });
    return { enabled: campana.houseTablesEnabled };
  }

  async create(userId: string, campaignId: string, input: CreateDmTableInput) {
    await this.membership.requireDM(campaignId, userId);
    try {
      return await this.prisma.transaction((tx) =>
        tx.dmTable.create({
          data: {
            campaignId,
            name: input.name,
            description: input.description ?? null,
            visibility: input.visibility,
            trigger: input.trigger,
            entries: { create: input.entries },
          },
          include: { entries: { orderBy: { min: "asc" } } },
        }),
      );
    } catch (error) {
      // **Como mucho una tabla de críticos y una de pifias por campaña**, y lo garantiza un índice
      // único parcial de Postgres, no un `if` de aquí: la comprobación en el servicio es una
      // carrera esperando a ocurrir en cuanto alguien tenga dos pestañas abiertas. Aquí solo se
      // traduce el choque a una frase que se pueda leer.
      if ((error as { code?: string }).code === "P2002") {
        throw new ConflictException(
          "Esta campaña ya tiene una tabla para eso. Cámbiale el disparador a la otra primero.",
        );
      }
      throw error;
    }
  }

  /**
   * Las tablas que quien mira puede ver. **Filtrado por `canView` en el servidor**: una tabla de
   * pifias `DM_ONLY` no viaja, no se esconde en el cliente — leerla entera le quitaría media gracia
   * a la mesa, que es justo para lo que existe la visibilidad por defecto.
   */
  async list(userId: string, campaignId: string) {
    const viewer = await this.viewerFor(userId, campaignId);
    const [filas, campana] = await Promise.all([
      this.prisma.dmTable.findMany({
        where: { campaignId },
        include: { entries: { orderBy: { min: "asc" } } },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } }),
    ]);
    return {
      tables: filas.filter((t) => this.puedeVer(viewer, t.visibility)),
      // **El interruptor viaja con la lista**, y esto lo pidió la pantalla: se podía escribir y no
      // leer, así que al entrar no había forma de saber en qué posición estaba. Una interfaz que
      // pinta «Apagada» sin que le conste es una interfaz que afirma un estado del servidor que no
      // conoce — y la regla del proyecto dice que si el texto y el servidor discrepan, miente el
      // texto. Va aquí y no en un endpoint aparte porque nadie necesita lo uno sin lo otro.
      //
      // **Y lo ve la mesa entera, no solo el DM**: si una campaña juega con tabla de pifias, sus
      // jugadores tienen derecho a saberlo antes de sacar un 1. Una casa que cambia una regla lo
      // hace a la vista.
      houseTablesEnabled: campana.houseTablesEnabled,
    };
  }

  /**
   * Editar una tabla. **Las filas se reemplazan enteras** dentro de la misma transacción: una
   * tabla a medio reemplazar es una tabla con huecos, y con huecos hay tiradas sin resultado.
   */
  async update(userId: string, campaignId: string, tableId: string, input: CreateDmTableInput) {
    await this.membership.requireDM(campaignId, userId);
    const tabla = await this.prisma.dmTable.findFirst({ where: { id: tableId, campaignId } });
    if (!tabla) throw new NotFoundException("Esa tabla no existe en esta campaña.");

    try {
      return await this.prisma.transaction(async (tx) => {
        await tx.dmTableEntry.deleteMany({ where: { tableId } });
        return tx.dmTable.update({
          where: { id: tableId },
          data: {
            name: input.name,
            description: input.description ?? null,
            visibility: input.visibility,
            trigger: input.trigger,
            entries: { create: input.entries },
          },
          include: { entries: { orderBy: { min: "asc" } } },
        });
      });
    } catch (error) {
      // El mismo choque que al crear: como mucho una tabla de críticos y una de pifias por
      // campaña, y lo garantiza el índice único parcial.
      if ((error as { code?: string }).code === "P2002") {
        throw new ConflictException(
          "Esta campaña ya tiene una tabla para eso. Cámbiale el disparador a la otra primero.",
        );
      }
      throw error;
    }
  }

  async remove(userId: string, campaignId: string, tableId: string) {
    await this.membership.requireDM(campaignId, userId);
    const tabla = await this.prisma.dmTable.findFirst({ where: { id: tableId, campaignId } });
    if (!tabla) throw new NotFoundException("Esa tabla no existe en esta campaña.");
    await this.prisma.dmTable.delete({ where: { id: tabla.id } });
    return { deleted: true };
  }

  /** Tirarla a mano. La puede tirar el DM; un jugador, solo si la tabla es suya de ver. */
  async roll(userId: string, campaignId: string, tableId: string): Promise<DmTableRoll> {
    const viewer = await this.viewerFor(userId, campaignId);
    const tabla = await this.prisma.dmTable.findFirst({
      where: { id: tableId, campaignId },
      include: { entries: { orderBy: { min: "asc" } } },
    });
    // **404 y no 403 si no la puede ver**: un 403 confirmaría que existe, que es exactamente lo
    // que una tabla `DM_ONLY` no quiere confirmar.
    if (!tabla || !this.puedeVer(viewer, tabla.visibility)) {
      throw new NotFoundException("Esa tabla no existe en esta campaña.");
    }
    return this.tirarSobre(userId, campaignId, tabla);
  }

  /**
   * Tirar sobre una tabla ya cargada, con su rastro. Lo usa el `roll` de arriba y **el disparo
   * automático** de un crítico o una pifia (`rolls.service.ts`).
   *
   * `tx` opcional para que el disparo automático quede **en la misma transacción** que la tirada
   * que lo provocó: una pifia registrada sin su tirada, o al revés, es una línea de tiempo que no
   * se puede leer.
   */
  async tirarSobre(
    userId: string,
    campaignId: string,
    tabla: {
      id: string;
      name: string;
      visibility: string;
      entries: { min: number; max: number; text: string }[];
    },
    opciones?: { trigger?: "CRITICAL" | "FUMBLE"; tx?: Prisma.TransactionClient; roller?: Roller },
  ): Promise<DmTableRoll> {
    // **El dado sale de la tabla**: tantas caras como su resultado más alto. Una tabla de veinte
    // filas se tira con un d20 y una de cien con un d100, sin que nadie tenga que decirlo — y como
    // el esquema exige que empiece en 1 y no deje huecos, siempre hay una fila que casa.
    const caras = Math.max(...tabla.entries.map((e) => e.max));
    const tirada = rollExpression(`1d${caras}`, opciones?.roller);
    const valor = tirada.total;
    const fila = tabla.entries.find((e) => valor >= e.min && valor <= e.max)!;

    const evento = await this.events.record(
      userId,
      campaignId,
      {
        subjectType: "campaign",
        subjectId: campaignId,
        // **La misma visibilidad que la tabla.** Una tabla de pifias que solo ve el DM no puede
        // cantar su resultado en el registro de la mesa.
        visibility: tabla.visibility as Visibility,
        payload: {
          type: "TABLE_ROLLED",
          tableName: tabla.name,
          die: caras,
          roll: valor,
          text: fila.text,
          ...(opciones?.trigger ? { trigger: opciones.trigger } : {}),
        },
      },
      opciones?.tx,
    );

    return {
      tableId: tabla.id,
      tableName: tabla.name,
      die: caras,
      roll: valor,
      text: fila.text,
      eventId: evento.id,
    };
  }

  /**
   * La tabla que dispara un crítico o una pifia, **si la casa las tiene encendidas**.
   *
   * Devuelve `null` con el interruptor apagado, que es el caso por defecto y el que hace que un
   * crítico siga duplicando dados y nada más.
   */
  async tablaDisparadaPor(
    campaignId: string,
    trigger: "CRITICAL" | "FUMBLE",
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    const campana = await client.campaign.findUnique({ where: { id: campaignId } });
    if (!campana?.houseTablesEnabled) return null;
    return client.dmTable.findFirst({
      where: { campaignId, trigger },
      include: { entries: { orderBy: { min: "asc" } } },
    });
  }

  private puedeVer(viewer: Viewer, visibility: string): boolean {
    // Una tabla no tiene creador ni concesiones nominales: o la ve tu nivel, o no. El DM la ve
    // siempre, que es lo que `canView` ya decide.
    return canView(viewer, {
      visibility: visibility as Visibility,
      createdById: "",
      grantedUserIds: [],
    });
  }

  private async viewerFor(userId: string, campaignId: string): Promise<Viewer> {
    const member = await this.membership.requireMember(campaignId, userId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return { userId, role: member.role, isAdmin: user?.isAdmin ?? false };
  }
}
