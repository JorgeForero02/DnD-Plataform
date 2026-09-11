import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  CreateSessionInput,
  UpdateSessionInput,
  Visibility,
  type CloseSessionInput,
  type StampSessionNoteInput,
  type StartSessionInput,
} from "@dnd/shared";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { canView, Viewer } from "../common/visibility";
import { GameEventsService } from "../game-events/game-events.service";

/** Lo que hace falta de una `Entity` para decidir si su nombre viaja, y para pintarlo si viaja. */
interface FichaDeApertura {
  id: string;
  name: string;
  type: string;
  visibility: Visibility;
  createdById: string;
  grants: { userId: string }[];
}

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: GameEventsService,
    private readonly emitter: EventEmitter2,
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

  /**
   * **Comprueba que la ficha de apertura es de ESTA campaña, y devuelve su id.**
   *
   * El prefijo no lo pone el cliente por el mismo motivo por el que no lo pone en los catálogos:
   * aceptar un id a ciegas sería poder apuntar la sesión a una ficha de otra campaña, y de ahí
   * salen dos cosas malas — un enlace que el DM de esta mesa no puede abrir, y **una confirmación
   * de que esa ficha existe**. Por eso es 404 y no 400: quien pregunta no debería saber que existe.
   */
  private async apertura(campaignId: string, entityId: string | null): Promise<string | null> {
    if (entityId === null) return null;
    const entity = await this.prisma.entity.findFirst({
      where: { id: entityId, campaignId },
      select: { id: true },
    });
    if (!entity) throw new NotFoundException("Entity not found");
    return entity.id;
  }

  /**
   * Da forma a una sesión para un espectador concreto: **la ficha de apertura pasa por `canView`**
   * y, si no la puede ver, **el campo desaparece entero** —ni `openingEntity` ni `openingEntityId`—.
   *
   * Dejar el id sería la fuga barata de siempre: un identificador que el jugador no puede resolver
   * pero que **confirma que la sesión abre en algo escondido**. Y devolver `null` mentiría: `null`
   * significa «no abre en ningún sitio».
   *
   * `canView` sobre una `Entity` necesita su `createdById` y sus concesiones de verdad. Aquí no
   * vale el atajo de `canSee`, que pasa `createdById: ""` y `grantedUserIds: []`: con eso una ficha
   * `OWNER_DM` o `SPECIFIC_PLAYERS` se escondería de quien sí tiene derecho a verla.
   */
  private conApertura<
    T extends {
      openingEntityId: string | null;
      recap?: string | null;
      recapVisibility?: Visibility;
    },
  >(viewer: Viewer, session: T, fichas: Map<string, FichaDeApertura>) {
    const { openingEntityId, ...todo } = session;
    const resto = this.conCronica(viewer, todo);
    // `null` es «no abre en ningún sitio» y se dice tal cual: es verdad y no esconde nada.
    if (!openingEntityId) return { ...resto, openingEntityId: null };
    const ficha = fichas.get(openingEntityId);
    const visible =
      ficha !== undefined &&
      canView(viewer, {
        visibility: ficha.visibility,
        createdById: ficha.createdById,
        grantedUserIds: ficha.grants.map((g) => g.userId),
      });
    if (!visible) return resto;
    return {
      ...resto,
      openingEntityId,
      openingEntity: { id: ficha.id, name: ficha.name, type: ficha.type },
    };
  }

  /**
   * **La crónica tiene visibilidad propia, y se filtra aquí.**
   *
   * Desde que dejó de vivir dentro de `notes` es una columna que viaja sola, así que una crónica
   * `DM_ONLY` de una sesión `PLAYERS` llegaría al jugador con la sesión si nadie la quitara. Se van
   * **las dos columnas**: la crónica y su nivel. Dejar `recapVisibility` sin la crónica diría «hay
   * una crónica y no te la enseño», que es una filtración pequeña y gratuita.
   *
   * `createdById: ""` y `grantedUserIds: []` sí valen aquí, y por el mismo motivo que en `canSee`:
   * una `Session` no tiene creador ni concesiones —lo dice `docs/05-datos.md`—, así que
   * `OWNER_DM` y `SPECIFIC_PLAYERS` sobre una crónica no seleccionan a nadie.
   */
  private conCronica<T extends { recap?: string | null; recapVisibility?: Visibility }>(
    viewer: Viewer,
    session: T,
  ) {
    if (session.recapVisibility === undefined) return session;
    if (this.canSee(viewer, session.recapVisibility)) return session;
    // Se quitan por nombre en vez de con un destructuring de dos variables que nadie usa: el lint
    // de este repositorio no admite variables muertas, ni con guion bajo delante.
    const sinCronica: Record<string, unknown> = { ...session };
    delete sinCronica.recap;
    delete sinCronica.recapVisibility;
    return sinCronica as T;
  }

  /** Lee de una vez las fichas de apertura de un puñado de sesiones — una consulta, no N. */
  private async fichasDeApertura(sessions: { openingEntityId: string | null }[]) {
    const ids = [
      ...new Set(
        sessions.map((s) => s.openingEntityId).filter((id): id is string => typeof id === "string"),
      ),
    ];
    if (ids.length === 0) return new Map<string, FichaDeApertura>();
    const fichas = await this.prisma.entity.findMany({
      where: { id: { in: ids } },
      include: { grants: true },
    });
    return new Map(fichas.map((f) => [f.id, f]));
  }

  /**
   * **Una sesion se anuncia cuando GANA fecha, no cada vez que se guarda.**
   *
   * Sin fecha no hay nada que avisar —«hay una sesion, algun dia» no le sirve a nadie para
   * organizarse—, y volver a guardar la misma fecha no es una noticia. Por eso el aviso sale al
   * crearla con fecha y al ponerle una **distinta** de la que tenia, y no en cada `update`.
   */
  private anunciarFecha(session: { id: string; campaignId: string }, actorId: string) {
    this.emitter.emit("session.scheduled", {
      campaignId: session.campaignId,
      sessionId: session.id,
      actorId,
    });
  }

  async create(userId: string, campaignId: string, input: CreateSessionInput) {
    await this.membership.requireDM(campaignId, userId);
    const session = await this.prisma.session.create({
      data: {
        campaignId,
        title: input.title,
        scheduledAt: input.scheduledAt,
        notes: input.notes === undefined ? undefined : (input.notes as object),
        visibility: input.visibility,
        openingEntityId:
          input.openingEntityId === undefined
            ? undefined
            : await this.apertura(campaignId, input.openingEntityId),
      },
    });
    if (session.scheduledAt) this.anunciarFecha(session, userId);
    return session;
  }

  async list(userId: string, campaignId: string) {
    await this.membership.requireMember(campaignId, userId);
    const viewer = await this.viewerFor(userId, campaignId);
    const sessions = await this.prisma.session.findMany({
      where: { campaignId },
      // **La lista va por cuándo se juega, no por cuándo se creó** (ficha D4, cerrada el
      // 2026-09-10): con fecha primero, de la más lejana a la más cercana —la próxima sesión
      // arriba, como el resto de listas de esta casa, que ponen lo más reciente primero—, y las
      // sin fecha detrás, esas sí por creación. Antes iba entera por `createdAt`, y la próxima
      // sesión no estaba donde la mesa la busca.
      orderBy: [{ scheduledAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    });
    const visibles = sessions.filter((s) => this.canSee(viewer, s.visibility));
    const fichas = await this.fichasDeApertura(visibles);
    return visibles.map((s) => this.conApertura(viewer, s, fichas));
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
    return this.conApertura(viewer, session, await this.fichasDeApertura([session]));
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
    // `null` es «quítalo» y llega hasta aquí; `undefined` es «no lo toques» y no entra en `data`.
    if (input.openingEntityId !== undefined)
      data.openingEntityId = await this.apertura(campaignId, input.openingEntityId);
    const session = await this.prisma.session.update({ where: { id: sessionId }, data });
    // Solo si la fecha ha CAMBIADO: volver a guardar la misma no es una noticia, y quitarla
    // tampoco se anuncia —lo que se avisa es «apunta esto en el calendario».
    if (session.scheduledAt && session.scheduledAt.getTime() !== existing.scheduledAt?.getTime()) {
      this.anunciarFecha(session, userId);
    }
    return session;
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
          // **La crónica va a su columna, no a `notes`.** Estuvo dentro de ese Json y era una
          // trampa doble: no se podía filtrar por ella —y «dónde se quedó» la filtra—, y el motor
          // de reglas escribe `notes` como array de cadenas (`ADD_SESSION_NOTE`), así que una nota
          // de una regla se llevaba la crónica por delante sin decir nada.
          ...(input.recap !== undefined ? { recap: input.recap } : {}),
          recapVisibility: input.recapVisibility,
        },
      });
      await this.events.record(
        userId,
        campaignId,
        {
          sessionId,
          subjectType: "session",
          subjectId: sessionId,
          // **La visibilidad de la crónica, no la de la sesión.** Este era el defecto: la pantalla
          // ya ofrecía elegirla, el esquema ya la aceptaba, y aquí se tiraba a la basura y se usaba
          // `closed.visibility` — así que elegir quién ve la crónica no hacía absolutamente nada.
          // Y son dos cosas distintas a propósito: una crónica puede ser más pública que la sesión
          // que la produjo, o menos.
          visibility: closed.recapVisibility,
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
