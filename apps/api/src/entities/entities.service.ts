import { ForbiddenException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CreateEntityInput, UpdateEntityInput, EntityType } from "@dnd/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { canView, laAudienciaCrecio, Viewer } from "../common/visibility";
import { WorldStateService } from "../world-state/world-state.service";
import { GameEventsService } from "../game-events/game-events.service";

@Injectable()
export class EntitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: EventEmitter2,
    private readonly gameEvents: GameEventsService,
    /**
     * Opcional para no romper las unitarias que montan este servicio a mano. En la aplicación
     * real siempre está: `EntitiesModule` importa `WorldStateModule`, que lo exporta.
     */
    @Optional() private readonly worldState?: WorldStateService,
  ) {}

  private async viewerFor(userId: string, campaignId: string): Promise<Viewer> {
    const [member, user] = await Promise.all([
      this.membership.getMembership(campaignId, userId),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);
    return { userId, role: member?.role ?? null, isAdmin: user?.isAdmin ?? false };
  }

  /**
   * **El mundo lo escribe el DM. Solo el DM.**
   *
   * Esto exigía únicamente ser miembro, y estaba declarado como excepción en
   * `docs/04-convenciones.md`. Era un error, y lo señaló el propio DM al probar la aplicación
   * con un jugador dentro: **un jugador podía crear PNJ, lugares, misiones y documentos**, y con
   * ellos aparecía en su pantalla todo el andamiaje de construir mundo — que es exactamente lo
   * que estropea una partida, porque enseña la forma de lo que aún no debería saber.
   *
   * Lo que el jugador **sigue teniendo** es su voz: comentarios en las fichas que puede ver, su
   * personaje, y el registro de la partida. Escribir el mundo no es su papel.
   */
  async create(userId: string, campaignId: string, input: CreateEntityInput) {
    await this.membership.requireDM(campaignId, userId);
    const { specificPlayerIds, ...rest } = input;
    const entity = await this.prisma.entity.create({
      data: {
        campaignId,
        type: rest.type,
        name: rest.name,
        body: rest.body === undefined ? undefined : (rest.body as object),
        tags: rest.tags,
        visibility: rest.visibility,
        createdById: userId,
        grants:
          rest.visibility === "SPECIFIC_PLAYERS" && specificPlayerIds?.length
            ? { create: specificPlayerIds.map((uid) => ({ userId: uid })) }
            : undefined,
      },
      include: { grants: true },
    });
    this.events.emit("entity.created", {
      campaignId,
      entityId: entity.id,
      type: entity.type,
    });
    return entity;
  }

  async list(userId: string, campaignId: string, type?: EntityType) {
    await this.membership.requireMember(campaignId, userId);
    const viewer = await this.viewerFor(userId, campaignId);
    const entities = await this.prisma.entity.findMany({
      where: { campaignId, ...(type ? { type } : {}) },
      include: { grants: true },
      orderBy: { createdAt: "desc" },
    });
    return entities.filter((e) =>
      canView(viewer, {
        visibility: e.visibility,
        createdById: e.createdById,
        grantedUserIds: e.grants.map((g) => g.userId),
      }),
    );
  }

  async get(userId: string, campaignId: string, entityId: string) {
    await this.membership.requireMember(campaignId, userId);
    const viewer = await this.viewerFor(userId, campaignId);
    const entity = await this.prisma.entity.findFirst({
      where: { id: entityId, campaignId },
      include: { grants: true },
    });
    if (
      !entity ||
      !canView(viewer, {
        visibility: entity.visibility,
        createdById: entity.createdById,
        grantedUserIds: entity.grants.map((g) => g.userId),
      })
    ) {
      throw new NotFoundException("Entity not found");
    }

    // **Aquí es donde el motor de reglas se entera de que alguien abrió una ficha.**
    //
    // `recordEntityOpened` existía desde 2A.15 con el comentario «queda listo para que quien
    // toque `entities` lo llame», y no lo llamaba nadie: el disparador `ENTITY_OPENED` estaba
    // probado en unitarias y era **inalcanzable en producción**. Y resulta que es el ejemplo con
    // el que se definió el sistema entero —«cuando un jugador revise el detalle, se desvela el
    // camino secreto»—, así que el motor tenía muerto justo el caso que lo justificaba.
    //
    // El suceso se escribe siempre `DM_ONLY` (lo fija `recordEntityOpened`): registrar quién
    // mira qué es vigilancia si no se dice, y por eso el hueco H3 exige además que la interfaz
    // avise al jugador. Las dos mitades, o ninguna.
    //
    // **No se registra cuando quien mira es el DM o el creador de la ficha.** El suceso existe
    // para captar que **un jugador** examinó algo —«cuando un jugador revise el detalle, se
    // desvela el camino secreto»—; el DM preparando la sesión abre sus propias fichas una y otra
    // vez, y sin esta condición cada lectura suya dispararía la regla contra sí mismo y le
    // llenaría la bandeja de propuestas falsas. Lo encontró un DM en una partida de prueba:
    // «leer mis propias notas dispara reglas contra mí». La comprobación de permiso de arriba ya
    // dejó pasar solo a quien puede ver la ficha; esto solo decide si su lectura es un *suceso*.
    const esDelPropioDm = viewer.role === "DM" || entity.createdById === userId;
    if (this.worldState && !esDelPropioDm) {
      // **No se espera a que termine ni se deja caer la petición si falla**: abrir una ficha
      // tiene que funcionar aunque el registro o una regla revienten. El puente ya aísla los
      // fallos de las reglas; este `catch` aísla los del propio registro.
      await this.worldState
        .recordEntityOpened(userId, campaignId, entity.id, entity.type, entity.name)
        .catch(() => undefined);
    }

    return entity;
  }

  private async requireEditable(userId: string, campaignId: string, entityId: string) {
    const entity = await this.prisma.entity.findFirst({
      where: { id: entityId, campaignId },
    });
    if (!entity) throw new NotFoundException("Entity not found");
    const member = await this.membership.getMembership(campaignId, userId);
    if (member?.role !== "DM" && entity.createdById !== userId) {
      throw new ForbiddenException("Only the DM or the creator can modify this");
    }
    return entity;
  }

  async update(userId: string, campaignId: string, entityId: string, input: UpdateEntityInput) {
    await this.membership.requireMember(campaignId, userId);
    const before = await this.requireEditable(userId, campaignId, entityId);
    // Las concesiones de ANTES hacen falta para saber si la audiencia creció, y
    // `requireEditable` no las trae. Se piden aparte y antes de escribir nada.
    const concesionesAntes = (
      await this.prisma.entityVisibilityGrant.findMany({
        where: { entityId },
        select: { userId: true },
      })
    ).map((g) => g.userId);
    const { specificPlayerIds, ...rest } = input;
    const data: Record<string, unknown> = {};
    if (rest.type !== undefined) data.type = rest.type;
    if (rest.name !== undefined) data.name = rest.name;
    if (rest.body !== undefined) data.body = rest.body as object;
    if (rest.tags !== undefined) data.tags = rest.tags;
    if (rest.visibility !== undefined) data.visibility = rest.visibility;

    return this.prisma.transaction(async (tx) => {
      if (specificPlayerIds !== undefined) {
        await tx.entityVisibilityGrant.deleteMany({ where: { entityId } });
        if (specificPlayerIds.length) {
          await tx.entityVisibilityGrant.createMany({
            data: specificPlayerIds.map((uid) => ({ entityId, userId: uid })),
          });
        }
      }
      const entity = await tx.entity.update({
        where: { id: entityId },
        data,
        include: { grants: true },
      });

      // **Ficha P1 de `docs/06-pendientes.md`.** El único sitio que emitía `ENTITY_REVEALED` era
      // el motor de reglas (`REVEAL_ENTITY`); un DM que sube a mano la visibilidad de una ficha
      // —que es como se revela un lugar casi siempre— no dejaba ningún rastro, y la cabecera de
      // escena de la mesa (que lee estos sucesos) nunca se encendía sola.
      //
      // **«Revelar» es que haya alguien nuevo que ahora la ve y antes no**, y eso se responde
      // comparando CONJUNTOS, no índices en una lista.
      //
      // La primera versión ordenaba los cinco niveles en fila y comparaba posiciones. La
      // revisión de cierre del 2026-09-04 lo tumbó: `OWNER_DM` la ve el creador y
      // `SPECIFIC_PLAYERS` la ven los concedidos, **y ninguno de los dos contiene al otro**.
      // Pasar de `OWNER_DM` a `SPECIFIC_PLAYERS` con la lista vacía subía de índice y emitía un
      // «se reveló» cuando la ficha había pasado de verla una persona a no verla nadie. Y no
      // era solo ruido: `rules-engine/world-builder.ts` construye «qué se ha revelado» con esas
      // filas, **sin caducidad y sin deshacer**, así que la ficha quedaba marcada como revelada
      // para siempre y una regla `REVEALED_WITH_TAG_AT_LEAST` empezaba a cumplirse sola.
      //
      // `laAudienciaCrecio` vive en `common/visibility.ts`, junto a `canView`, porque es una
      // regla de audiencia y ahí es donde este proyecto guarda una sola vez quién ve qué.
      //
      // **Bajar la visibilidad no emite nada.** Ocultar algo que ya se había enseñado no es una
      // revelación, y decirlo sería mentir sobre lo que acaba de pasar.
      const crecio =
        rest.visibility !== undefined &&
        laAudienciaCrecio(
          {
            visibility: before.visibility,
            createdById: before.createdById,
            grantedUserIds: concesionesAntes,
          },
          {
            visibility: entity.visibility,
            createdById: entity.createdById,
            grantedUserIds: entity.grants.map((g) => g.userId),
          },
        );
      if (crecio) {
        // **La visibilidad del suceso, y una limitación que se declara en vez de esconderse.**
        //
        // Hereda la de la entidad, que es lo correcto: el aviso no puede ser más público que la
        // cosa que anuncia. Pero `GameEvent` **no tiene concesiones nominales propias** —
        // `GameEventsService.canSee` evalúa `canView` con `grantedUserIds: []`—, así que una
        // fila marcada `SPECIFIC_PLAYERS` no la ve **nadie** salvo el DM: ni siquiera el jugador
        // al que se le acaba de conceder. Guardarla con esa etiqueta sería prometer una
        // frontera que el filtro no aplica.
        //
        // Así que en ese caso se guarda como `DM_ONLY`, que es lo que de verdad ocurre, y queda
        // ficha para el día que los sucesos admitan concesiones. Lo encontró la revisión de
        // cierre; la versión anterior afirmaba en este mismo comentario que la frontera se
        // respetaba.
        const visibilidadDelSuceso =
          entity.visibility === "SPECIFIC_PLAYERS" ? "DM_ONLY" : entity.visibility;
        await this.gameEvents.record(
          userId,
          campaignId,
          {
            subjectType: "campaign",
            subjectId: entity.id,
            visibility: visibilidadDelSuceso,
            payload: { type: "ENTITY_REVEALED", entityName: entity.name },
          },
          tx,
        );
      }

      return entity;
    });
  }

  async remove(userId: string, campaignId: string, entityId: string) {
    await this.membership.requireMember(campaignId, userId);
    await this.requireEditable(userId, campaignId, entityId);
    await this.prisma.entity.delete({ where: { id: entityId } });
    return { deleted: true };
  }
}
