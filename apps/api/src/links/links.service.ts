import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateEntityLinkInput, Visibility } from "@dnd/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { canView, comoRecursoVisible, loVeLaMesa } from "../common/visibility";
import { viewerFor } from "../common/character-viewer";

/**
 * De qué lado de la flecha está el enlace **visto desde la ficha que se está leyendo**.
 * `OUTGOING` es el que esa ficha escribió («Corvin → vive en → Torre Gris», leído desde
 * Corvin); `INCOMING` es el retroenlace, el mismo registro leído desde la Torre Gris.
 * No hay dos filas en la base: hay una, leída desde sus dos extremos.
 */
export type LinkDirection = "OUTGOING" | "INCOMING";

/**
 * Con qué visibilidad se anota en el registro que dos fichas se han enlazado.
 *
 * **El enlace filtra por sí mismo**, y `create()` ya lo dice más abajo: un enlace revela que dos
 * cosas tienen que ver aunque quien lo lee no pueda abrir ninguna de las dos. Así que el suceso
 * **no puede heredar la visibilidad de una de ellas**.
 *
 * La regla es total y no necesita comparar niveles entre sí: **si las dos fichas ya las ve toda la
 * mesa, la relación no revela nada nuevo** y la línea sale para jugadores; en cualquier otro caso
 * es `DM_ONLY`. No se intenta nada más fino a propósito: la matriz de visibilidad **no es un
 * orden total** —`SPECIFIC_PLAYERS` y `OWNER_DM` no se contienen— así que «la más restrictiva de
 * las dos» no está definida, y además hoy un suceso `SPECIFIC_PLAYERS` **no llega a nadie**
 * porque `game-events.service.ts` evalúa con `grantedUserIds: []` (ficha P2, decisión D-OP-12).
 * Cuando esa columna exista, esto se puede afinar; hasta entonces, callar de más es la única
 * opción que no miente.
 */
function visibilidadDelEnlace(desde: Visibility, hasta: Visibility): Visibility {
  // Low #7, revisión final de `ficha/tanda-2-a-5`: copia inline retirada — `loVeLaMesa` vive
  // en `@dnd/shared` (Task 26) precisamente para que no haya una segunda versión de este
  // mismo predicado.
  return loVeLaMesa(desde) && loVeLaMesa(hasta) ? "PLAYERS" : "DM_ONLY";
}

// `comoRecursoVisible` — Low #12, revisión final de `ficha/tanda-2-a-5`: vivía definido aquí
// (extraído en Task 22 de `listFor`/`listForCampaign`, que lo tenían cada uno por su cuenta) y
// se movió a `../common/visibility`, junto a `canView`, porque el mismo adaptador reapareció
// inline en `campaigns.service.ts` (Task 33) y ya en `entities.service.ts`: tres copias del
// mismo predicado en vez de una.

@Injectable()
export class LinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly gameEvents: GameEventsService,
  ) {}

  async create(userId: string, fromEntityId: string, input: CreateEntityLinkInput) {
    const from = await this.prisma.entity.findUnique({ where: { id: fromEntityId } });
    if (!from) throw new NotFoundException("Source entity not found");
    // Enlazar es escribir el mundo, igual que crear una ficha: solo el DM. Y aquí importaba
    // doblemente, porque un enlace **revela que dos cosas tienen que ver** aunque el jugador no
    // pueda abrir ninguna de las dos.
    await this.membership.requireDM(from.campaignId, userId);
    if (input.toId === fromEntityId) {
      throw new BadRequestException("An entity cannot link to itself");
    }
    const to = await this.prisma.entity.findUnique({ where: { id: input.toId } });
    if (!to || to.campaignId !== from.campaignId) {
      throw new BadRequestException("Target must be an entity in the same campaign");
    }
    // **El enlace escribe su suceso, y hasta hoy no lo escribía nadie.** El motor de reglas sabe
    // evaluar `ENTITY_LINKED` desde que existe —`game-event-triggers.ts` tiene su `case`— y el
    // vocabulario del log lo tiene declarado, pero este método creaba la fila y se callaba: una
    // regla armada sobre «cuando se enlacen dos fichas» no se disparaba jamás, y enlazar era
    // invisible en el registro. Es la ficha del §8 de la auditoría del 2026-09-04.
    //
    // **Los dos van en la misma transacción**: un enlace sin su suceso es exactamente el estado
    // que se está arreglando, así que no puede volver a producirse porque falle la segunda
    // escritura.
    return this.prisma.transaction(async (tx) => {
      let enlace;
      try {
        enlace = await tx.entityLink.create({
          data: { fromId: fromEntityId, toId: input.toId, label: input.label },
        });
      } catch (error) {
        // El índice único `(fromId, toId, label)` ya rechazaba el duplicado; hasta el 2026-09-10
        // el choque salía como 500. Aquí solo se traduce a un 409 legible (ficha P3 «un enlace
        // duplicado»). Ojo: con `label` nulo Postgres no considera iguales dos NULL, así que dos
        // enlaces sin rótulo entre las mismas fichas siguen entrando — cerrarlo es un índice
        // parcial, o sea una migración, y no va colgado de este arreglo.
        if ((error as { code?: string }).code === "P2002") {
          throw new ConflictException("Ese enlace ya existe entre estas dos fichas.");
        }
        throw error;
      }

      await this.gameEvents.record(
        userId,
        from.campaignId,
        {
          subjectType: "campaign",
          subjectId: fromEntityId,
          visibility: visibilidadDelEnlace(from.visibility, to.visibility),
          payload: {
            type: "ENTITY_LINKED",
            fromId: fromEntityId,
            toId: input.toId,
            ...(input.label ? { label: input.label } : {}),
          },
        },
        tx,
      );

      return enlace;
    });
  }

  /**
   * Los enlaces de una ficha **por sus dos lados**. Hasta el bloque L esto filtraba solo por
   * `fromId`: quien abría la Torre Gris no veía que Corvin vivía en ella, y para que el enlace
   * se leyera desde los dos extremos había que crearlo dos veces y acordarse de borrar los dos.
   *
   * La respuesta sigue siendo **una lista plana**, no `{ salientes, entrantes }`: cada fila
   * lleva su `direction`. Es lo que deja intacto a quien ya la consumía (`links.e2e-spec.ts`
   * cuenta `body.length` y mapea `l.to.id`) y la pantalla agrupa sola.
   *
   * `to` significa aquí **la ficha del otro extremo**, que en un retroenlace es el `from` del
   * registro. El nombre se conserva por compatibilidad; `other` describiría mejor lo que es.
   */
  async listFor(userId: string, entityId: string) {
    const entity = await this.prisma.entity.findUnique({ where: { id: entityId } });
    if (!entity) throw new NotFoundException("Entity not found");
    await this.membership.requireMember(entity.campaignId, userId);
    const viewer = await viewerFor(this.prisma, this.membership, userId, entity.campaignId);

    const [outgoing, incoming] = await Promise.all([
      this.prisma.entityLink.findMany({
        where: { fromId: entityId },
        include: { to: { include: { grants: true } } },
      }),
      this.prisma.entityLink.findMany({
        where: { toId: entityId },
        include: { from: { include: { grants: true } } },
      }),
    ]);

    // Deliberadamente **sin** `isAdmin`: `remove` solo mira rol DM o creador del origen, y una
    // interfaz que ofrece un botón que el servidor va a rechazar miente.
    const isDM = viewer.role === "DM";
    const rows = [
      ...outgoing.map((l) => ({
        id: l.id,
        label: l.label as string | null,
        direction: "OUTGOING" as LinkDirection,
        // Quitar exige DM o el creador del **origen** (ver `remove`). En un enlace saliente el
        // origen es esta misma ficha; en uno entrante, la de enfrente.
        canRemove: isDM || entity.createdById === viewer.userId,
        other: l.to,
      })),
      ...incoming.map((l) => ({
        id: l.id,
        label: l.label as string | null,
        direction: "INCOMING" as LinkDirection,
        canRemove: isDM || l.from.createdById === viewer.userId,
        other: l.from,
      })),
    ];

    // **El retroenlace no puede revelar una ficha que quien mira no puede ver.** Es la misma
    // `canView` de siempre —el dueño único de «quién ve qué»— aplicada ahora a los dos
    // extremos: sin esto, abrir un lugar público delataría la existencia del culto `DM_ONLY`
    // que lo tiene enlazado.
    return rows
      .filter((r) => canView(viewer, comoRecursoVisible(r.other)))
      .map((r) => ({
        id: r.id,
        label: r.label,
        direction: r.direction,
        canRemove: r.canRemove,
        to: { id: r.other.id, name: r.other.name, type: r.other.type },
      }));
  }

  /**
   * Los enlaces de **toda la campaña**, en una sola llamada (Task 22, ficha «los enlaces del
   * taller se piden una vez por campaña»). Hasta hoy el tablero pedía uno por ficha —hasta 18
   * llamadas al abrir, y `refetchOnWindowFocus` las repetía— porque la única ruta que existía era
   * `GET /entities/:id/links`.
   *
   * A diferencia de `listFor`, aquí no hay una ficha «propia» desde la que mirar `direction`: cada
   * fila ya trae los dos extremos con nombre y tipo, así que `direction` no significa nada y no
   * viaja. Solo se leen los enlaces por su `fromId` —no hay `toId` sin `fromId` en el mismo
   * conjunto de fichas de la campaña, porque `create()` exige que las dos fichas sean de la misma
   * campaña— así que recorrer `from` basta para tener todos los enlaces de la campaña.
   *
   * **Misma regla de `canView` que `listFor`, sobre los dos extremos**: un enlace no puede
   * revelar una ficha que quien mira no puede ver, en ninguno de los dos lados.
   *
   * **El `where` restringe los DOS extremos a esta campaña**, no solo `from`. `create()` ya
   * exige que las dos fichas sean de la misma campaña, así que hoy nunca hay un enlace cruzado
   * — pero esa garantía vive en `create()`, no en el modelo, y una fila insertada por otra vía
   * (una migración de datos, una consola, un bug futuro en `create()`) con `from` de esta
   * campaña y `to` de otra se habría evaluado igualmente aquí, con un viewer que no es el suyo.
   * Filtrar por los dos extremos hace que ese enlace nunca aparezca en esta lista, pase lo que
   * pase en el resto del código.
   */
  async listForCampaign(userId: string, campaignId: string) {
    await this.membership.requireMember(campaignId, userId);
    const viewer = await viewerFor(this.prisma, this.membership, userId, campaignId);

    const links = await this.prisma.entityLink.findMany({
      where: { from: { campaignId }, to: { campaignId } },
      include: {
        from: { include: { grants: true } },
        to: { include: { grants: true } },
      },
    });

    return links
      .filter(
        (l) =>
          canView(viewer, comoRecursoVisible(l.from)) && canView(viewer, comoRecursoVisible(l.to)),
      )
      .map((l) => ({
        id: l.id,
        fromId: l.fromId,
        toId: l.toId,
        label: l.label as string | null,
        from: { id: l.from.id, name: l.from.name, type: l.from.type },
        to: { id: l.to.id, name: l.to.name, type: l.to.type },
      }));
  }

  async remove(userId: string, linkId: string) {
    const link = await this.prisma.entityLink.findUnique({
      where: { id: linkId },
      include: { from: true },
    });
    if (!link) throw new NotFoundException("Link not found");
    await this.membership.requireMember(link.from.campaignId, userId);
    const member = await this.membership.getMembership(link.from.campaignId, userId);
    if (member?.role !== "DM" && link.from.createdById !== userId) {
      throw new ForbiddenException("Only the DM or the creator can remove this link");
    }
    await this.prisma.entityLink.delete({ where: { id: linkId } });
    return { deleted: true };
  }
}
