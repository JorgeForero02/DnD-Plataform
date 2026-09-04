import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateCharacterInput, UpdateCharacterInput, Visibility } from "@dnd/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { canView, Viewer } from "../common/visibility";
import { GameEventsService } from "../game-events/game-events.service";

@Injectable()
export class CharactersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly gameEvents: GameEventsService,
  ) {}

  private async viewerFor(userId: string, campaignId: string): Promise<Viewer> {
    const [member, user] = await Promise.all([
      this.membership.getMembership(campaignId, userId),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);
    return { userId, role: member?.role ?? null, isAdmin: user?.isAdmin ?? false };
  }

  private canSee(viewer: Viewer, ownerId: string, visibility: Visibility): boolean {
    return canView(viewer, { visibility, createdById: ownerId, grantedUserIds: [] });
  }

  async create(userId: string, campaignId: string, input: CreateCharacterInput) {
    await this.membership.requireMember(campaignId, userId);
    return this.prisma.character.create({
      data: {
        campaignId,
        ownerId: userId,
        name: input.name,
        race: input.race,
        class: input.class,
        level: input.level,
        bio: input.bio,
        visibility: input.visibility,
      },
    });
  }

  async list(userId: string, campaignId: string) {
    await this.membership.requireMember(campaignId, userId);
    const viewer = await this.viewerFor(userId, campaignId);
    const characters = await this.prisma.character.findMany({
      // **Los PNJ instanciados no salen aquí** (2D.6). Un PNJ es una fila de `Character` —esa es
      // la decisión que hace barata toda la fase 2D— pero *esta* lista es «quién se sienta a la
      // mesa»: los personajes de los jugadores. Seis goblins mezclados con tres aventureros
      // convierten la pantalla de personajes en un listado de combate, que es exactamente el
      // problema que el hueco M13 describía de la solución de andar por casa («crear tres
      // personajes a nombre del DM»). Los PNJ tienen su sitio: la pestaña «Bestiario».
      // **Archivar sigue el mismo patrón** (2.5.8, ficha M9): un personaje archivado sale de
      // "quién se sienta a la mesa" igual que un PNJ instanciado, con un filtro más sobre la
      // misma consulta — no una tabla nueva ni un segundo listado.
      where: { campaignId, statblockRef: null, archivedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return characters.filter((c) => this.canSee(viewer, c.ownerId, c.visibility));
  }

  /**
   * Los personajes archivados de la campaña, con la misma visibilidad de siempre. Es la mitad
   * que hace útil archivar en vez de esconder: sin esta lista, "archivado" sería indistinguible
   * de "borrado" para quien mira la pantalla.
   */
  async listArchived(userId: string, campaignId: string) {
    await this.membership.requireMember(campaignId, userId);
    const viewer = await this.viewerFor(userId, campaignId);
    const characters = await this.prisma.character.findMany({
      where: { campaignId, statblockRef: null, archivedAt: { not: null } },
      orderBy: { archivedAt: "desc" },
    });
    return characters.filter((c) => this.canSee(viewer, c.ownerId, c.visibility));
  }

  async get(userId: string, campaignId: string, characterId: string) {
    await this.membership.requireMember(campaignId, userId);
    const viewer = await this.viewerFor(userId, campaignId);
    const character = await this.prisma.character.findFirst({
      where: { id: characterId, campaignId },
    });
    if (!character || !this.canSee(viewer, character.ownerId, character.visibility)) {
      throw new NotFoundException("Character not found");
    }
    return character;
  }

  /**
   * Pública a propósito: la comparte `CharacterSheetService` (2A.6/2A.7), que necesita el mismo
   * "dueño o DM" para la hoja y los PG en vez de reimplementarlo.
   */
  async requireEditable(userId: string, campaignId: string, characterId: string) {
    const character = await this.prisma.character.findFirst({
      where: { id: characterId, campaignId },
    });
    if (!character) throw new NotFoundException("Character not found");
    const member = await this.membership.getMembership(campaignId, userId);
    if (member?.role !== "DM" && character.ownerId !== userId) {
      throw new ForbiddenException("Only the DM or the owner can modify this");
    }
    return character;
  }

  async update(
    userId: string,
    campaignId: string,
    characterId: string,
    input: UpdateCharacterInput,
  ) {
    await this.membership.requireMember(campaignId, userId);
    await this.requireEditable(userId, campaignId, characterId);
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.race !== undefined) data.race = input.race;
    if (input.class !== undefined) data.class = input.class;
    if (input.level !== undefined) data.level = input.level;
    if (input.bio !== undefined) data.bio = input.bio;
    if (input.visibility !== undefined) data.visibility = input.visibility;
    return this.prisma.character.update({ where: { id: characterId }, data });
  }

  async remove(userId: string, campaignId: string, characterId: string) {
    await this.membership.requireMember(campaignId, userId);
    await this.requireEditable(userId, campaignId, characterId);
    await this.prisma.character.delete({ where: { id: characterId } });
    return { deleted: true };
  }

  /**
   * Archivar (2.5.8, ficha M9). **Es el gesto fácil ahora**: nada se borra, el personaje
   * solo sale de "Personajes" — la misma regla de `requireEditable` que ya gobierna editar,
   * sin inventar una regla nueva. Idempotente: archivar dos veces no duplica el suceso ni
   * pisa la fecha original de archivado.
   */
  async archive(userId: string, campaignId: string, characterId: string) {
    await this.membership.requireMember(campaignId, userId);
    const character = await this.requireEditable(userId, campaignId, characterId);
    // **Un PNJ no se archiva, y el 404 no es pereza.** Lo cazó la revisión de cierre: `archive`
    // no miraba `statblockRef`, pero las dos listas sí, y el Bestiario filtra por `statblockRef`
    // **sin mirar `archivedAt`**. Resultado: archivar un goblin escribía la fecha, emitía el
    // suceso, lo dejaba igual de visible en el Bestiario y **fuera de la lista de archivados**,
    // así que solo se recuperaba si alguien recordaba su cuid. Una columna puesta de la que no
    // se sale.
    //
    // Va 404 y no 400 porque «archivar» es una operación de la pantalla de personajes, y desde
    // ahí un PNJ no existe — es la misma razón por la que no sale en ese listado desde 2D.
    if (character.statblockRef) throw new NotFoundException("Character not found");
    if (character.archivedAt) return character; // ya estaba archivado: sin ruido en el log

    return this.prisma.transaction(async (tx) => {
      const archivado = await tx.character.update({
        where: { id: characterId },
        data: { archivedAt: new Date() },
      });
      await this.gameEvents.record(
        userId,
        campaignId,
        {
          subjectType: "character",
          subjectId: characterId,
          visibility: character.visibility,
          payload: { type: "CHARACTER_ARCHIVED", characterName: character.name },
        },
        tx,
      );
      return archivado;
    });
  }

  /**
   * Recuperar un personaje archivado. **Entero**: la hoja, el inventario y el dinero nunca se
   * tocaron al archivar, así que no hay nada que reconstruir — solo se limpia `archivedAt`.
   */
  async unarchive(userId: string, campaignId: string, characterId: string) {
    await this.membership.requireMember(campaignId, userId);
    const character = await this.requireEditable(userId, campaignId, characterId);
    if (!character.archivedAt) return character; // no estaba archivado: sin ruido en el log

    return this.prisma.transaction(async (tx) => {
      const recuperado = await tx.character.update({
        where: { id: characterId },
        data: { archivedAt: null },
      });
      await this.gameEvents.record(
        userId,
        campaignId,
        {
          subjectType: "character",
          subjectId: characterId,
          visibility: character.visibility,
          payload: { type: "CHARACTER_RESTORED", characterName: character.name },
        },
        tx,
      );
      return recuperado;
    });
  }
}
