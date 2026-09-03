import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  CreateSessionInput,
  UpdateSessionInput,
  Visibility,
  type CloseSessionInput,
  type StampSessionNoteInput,
  type StartSessionInput,
} from "@dnd/shared";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { canView, Viewer } from "../common/visibility";
import { GameEventsService } from "../game-events/game-events.service";

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: GameEventsService,
  ) {}

  private async viewerFor(userId: string, campaignId: string): Promise<Viewer> {
    const [member, user] = await Promise.all([
      this.membership.getMembership(campaignId, userId),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);
    return { userId, role: member?.role ?? null, isAdmin: user?.isAdmin ?? false };
  }

  private canSee(viewer: Viewer, visibility: Visibility): boolean {
    return canView(viewer, {
      visibility,
      createdById: "",
      grantedUserIds: [],
    });
  }

  async create(userId: string, campaignId: string, input: CreateSessionInput) {
    await this.membership.requireDM(campaignId, userId);
    return this.prisma.session.create({
      data: {
        campaignId,
        title: input.title,
        scheduledAt: input.scheduledAt,
        notes: input.notes === undefined ? undefined : (input.notes as object),
        visibility: input.visibility,
      },
    });
  }

  async list(userId: string, campaignId: string) {
    await this.membership.requireMember(campaignId, userId);
    const viewer = await this.viewerFor(userId, campaignId);
    const sessions = await this.prisma.session.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
    });
    return sessions.filter((s) => this.canSee(viewer, s.visibility));
  }

  async get(userId: string, campaignId: string, sessionId: string) {
    await this.membership.requireMember(campaignId, userId);
    const viewer = await this.viewerFor(userId, campaignId);
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, campaignId },
    });
    if (!session || !this.canSee(viewer, session.visibility)) {
      throw new NotFoundException("Session not found");
    }
    return session;
  }

  async update(userId: string, campaignId: string, sessionId: string, input: UpdateSessionInput) {
    await this.membership.requireDM(campaignId, userId);
    const existing = await this.prisma.session.findFirst({ where: { id: sessionId, campaignId } });
    if (!existing) throw new NotFoundException("Session not found");
    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.scheduledAt !== undefined) data.scheduledAt = input.scheduledAt;
    if (input.notes !== undefined) data.notes = input.notes as object;
    if (input.visibility !== undefined) data.visibility = input.visibility;
    return this.prisma.session.update({ where: { id: sessionId }, data });
  }

  async remove(userId: string, campaignId: string, sessionId: string) {
    await this.membership.requireDM(campaignId, userId);
    const existing = await this.prisma.session.findFirst({ where: { id: sessionId, campaignId } });
    if (!existing) throw new NotFoundException("Session not found");
    await this.prisma.session.delete({ where: { id: sessionId } });
    return { deleted: true };
  }

  /**
   * Arranca la sesión. Solo DM (tarea 2A.5).
   *
   * **No hay botón de «guardar partida», y su ausencia es la funcionalidad**: a partir de aquí
   * cada cambio se escribe cuando ocurre, así que suspender no cuesta nada.
   *
   * Como máximo una sesión en curso por campaña, y **eso lo garantiza un índice único parcial
   * de Postgres, no este método**. Una comprobación aquí sería una carrera esperando a ocurrir
   * en cuanto el DM tenga dos pestañas abiertas; lo que hace el código es traducir el choque de
   * la base a un 409 legible.
   */
  async start(
    userId: string,
    campaignId: string,
    sessionId: string,
    input: StartSessionInput = {},
  ) {
    await this.membership.requireDM(campaignId, userId);
    const session = await this.prisma.session.findFirst({ where: { id: sessionId, campaignId } });
    if (!session) throw new NotFoundException("Session not found");
    if (session.status === "IN_PROGRESS") return session;
    if (session.status === "CLOSED")
      throw new ConflictException("Una sesión cerrada no se vuelve a abrir");

    try {
      return await this.prisma.transaction(async (tx) => {
        const started = await tx.session.update({
          where: { id: sessionId },
          data: {
            status: "IN_PROGRESS",
            startedAt: new Date(),
            // Solo se escribe si viene: empezar sin decir quién vino es legítimo, y machacar
            // con `null` una asistencia ya declarada al re-arrancar sería perder un dato.
            ...(input.attendance ? { attendance: input.attendance } : {}),
          },
        });
        // El evento y el cambio de estado, o los dos o ninguno: una sesión en curso sin su
        // línea en el log es una partida cuya historia empieza a mentir desde el minuto cero.
        await this.events.record(
          userId,
          campaignId,
          {
            sessionId,
            subjectType: "session",
            subjectId: sessionId,
            visibility: started.visibility,
            payload: { type: "SESSION_STARTED", sessionTitle: started.title },
          },
          tx,
        );
        return started;
      });
    } catch (error) {
      // P2002 = violación de restricción única. Aquí solo puede venir del índice parcial.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
        throw new ConflictException("Ya hay una sesión en curso en esta campaña");
      throw error;
    }
  }

  /** Cierra la sesión. Solo DM. Cerrar lo que no está en curso es un 409, no un silencio. */
  async close(
    userId: string,
    campaignId: string,
    sessionId: string,
    input: CloseSessionInput = { recapVisibility: "PLAYERS" },
  ) {
    await this.membership.requireDM(campaignId, userId);
    const session = await this.prisma.session.findFirst({ where: { id: sessionId, campaignId } });
    if (!session) throw new NotFoundException("Session not found");
    if (session.status !== "IN_PROGRESS")
      throw new ConflictException("Esta sesión no está en curso");

    const endedAt = new Date();
    return this.prisma.transaction(async (tx) => {
      const closed = await tx.session.update({
        where: { id: sessionId },
        data: {
          status: "CLOSED",
          endedAt,
          // El resumen va a `notes`, que ya existía y no lo usaba nadie desde una pantalla.
          ...(input.recap !== undefined ? { notes: { recap: input.recap } } : {}),
        },
      });
      await this.events.record(
        userId,
        campaignId,
        {
          sessionId,
          subjectType: "session",
          subjectId: sessionId,
          visibility: closed.visibility,
          payload: {
            type: "SESSION_CLOSED",
            sessionTitle: closed.title,
            // Ausente si se cerró sin haber arrancado nunca — que hoy no puede pasar, pero el
            // esquema no depende de que este método sea el único que escriba el evento.
            ...(closed.startedAt
              ? {
                  durationMinutes: Math.max(
                    0,
                    Math.floor((endedAt.getTime() - closed.startedAt.getTime()) / 60000),
                  ),
                }
              : {}),
          },
        },
        tx,
      );
      return closed;
    });
  }

  /**
   * **El sello rápido.** Escribe una línea en el log de la sesión en curso, de un clic.
   *
   * Lo puede pulsar **cualquier miembro**, no solo el DM, y eso es una decisión: la crítica más
   * repetida a las herramientas de crónica es que **un bloque que solo escribe el DM se queda
   * vacío**. Lo que el DM sí controla, sello a sello, es quién lo ve.
   *
   * **Exige sesión en curso.** Un sello fuera de sesión no tendría dónde colgarse, y el motivo
   * de que esta pantalla exista es justamente que hoy el combate se graba con `sessionId` nulo.
   */
  async stampNote(userId: string, campaignId: string, input: StampSessionNoteInput) {
    await this.membership.requireMember(campaignId, userId);
    const enCurso = await this.prisma.session.findFirst({
      where: { campaignId, status: "IN_PROGRESS" },
    });
    if (!enCurso) throw new ConflictException("No hay ninguna sesión en curso donde anotar esto.");

    return this.events.record(userId, campaignId, {
      sessionId: enCurso.id,
      subjectType: "session",
      subjectId: enCurso.id,
      visibility: input.visibility,
      payload: {
        type: "SESSION_NOTE",
        kind: input.kind,
        ...(input.text ? { text: input.text } : {}),
        ...(input.entityId ? { entityId: input.entityId } : {}),
      },
    });
  }

  /** La sesión en curso de la campaña, o `null`. Es lo que pinta la barra global. */
  async current(userId: string, campaignId: string) {
    await this.membership.requireMember(campaignId, userId);
    return this.prisma.session.findFirst({ where: { campaignId, status: "IN_PROGRESS" } });
  }
}
