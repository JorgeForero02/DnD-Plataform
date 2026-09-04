import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  gameEventPayloadSchema,
  type GameEventType,
  type ListGameEventsInput,
  type RecordGameEventInput,
  type Visibility,
} from "@dnd/shared";
import type { Prisma } from "@prisma/client";
import { MembershipService } from "../campaigns/membership.service";
import { encolarTrasCommit } from "../common/after-commit";
import { canView, type Viewer } from "../common/visibility";
import { PrismaService } from "../prisma/prisma.service";

// Tarea 2A.5 — el log de partida.
//
// **Escribe cualquier servicio; lee solo quien puede.** `record` es interno: lo llaman los
// servicios que cambian algo (sesiones hoy; PG, recursos y tiradas después), y acepta una
// transacción para que el evento y el cambio que describe aterricen juntos o no aterrice
// ninguno. `list` es la única puerta de lectura y filtra por `canView`, como cualquier otro
// recurso del proyecto.

@Injectable()
export class GameEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly emitter: EventEmitter2,
  ) {}

  /**
   * Escribe un evento. **No comprueba permisos**: quien llama ya decidió que la acción se
   * permite, y es esa acción la que se está registrando. `canView` sigue siendo el dueño único
   * de quién lo **lee** después, que es la pregunta que sí es de visibilidad.
   */
  async record(
    actorUserId: string,
    campaignId: string,
    input: RecordGameEventInput,
    tx?: Prisma.TransactionClient,
    /**
     * De dónde viene la escritura. **No se guarda**: solo viaja en el suceso que se emite, para
     * que el motor de reglas sepa distinguir un hecho del mundo de su propio eco.
     */
    options?: { fromRulesEngine?: boolean },
  ) {
    // Se valida **al escribir** aunque el que llama sea código nuestro: el `payload` es un
    // `Json` en la base y esta es la única barrera que tiene. Un evento mal formado escrito hoy
    // es una línea de tiempo que no se puede pintar dentro de seis meses.
    const payload = gameEventPayloadSchema.parse(input.payload);
    const client = tx ?? this.prisma;
    // Tarea 2.5.1 — promovido a columna: `payload.damageType` solo vive en `HP_CHANGED`, pero
    // "¿de qué murió Elara?" es una pregunta que un campo dentro del `Json` no puede contestar
    // sin leer la línea de tiempo entera. La regla del proyecto es justo esta: lo que hay que
    // filtrar es una columna real.
    const damageType = payload.type === "HP_CHANGED" ? (payload.damageType ?? null) : null;
    const evento = await client.gameEvent.create({
      data: {
        campaignId,
        sessionId: input.sessionId ?? null,
        actorUserId,
        type: payload.type,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        payload,
        damageType,
        visibility: input.visibility,
      },
    });

    // **El motor de reglas escucha por aquí, y no al revés.** Llamarlo directamente crearía un
    // ciclo entre los dos módulos —el motor escribe eventos, los eventos disparan el motor— y
    // Nest solo lo resolvería con un `forwardRef`, que es esconder el ciclo en vez de quitarlo.
    // El emisor ya está en la aplicación y ya se usa para lo mismo en `notifications`.
    const emitir = () =>
      // `emitAsync` y no `emit`: **hay que esperar al motor.** Con `emit` la evaluación quedaba
      // suelta en la cola de microtareas y el comentario que prometía «evalúa dentro de la
      // petición» era falso (ficha M2B-3).
      this.emitter.emitAsync("game_event.recorded", {
        campaignId,
        actorUserId,
        type: payload.type,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        payload,
        // **Y esta bandera es lo que impide un bucle infinito.** Los efectos del motor escriben
        // eventos; si esos eventos volvieran a entrar por aquí, cada uno arrancaría una cascada
        // NUEVA a profundidad 0 y **el tope de diez saltos no lo vería**, porque el tope cuenta
        // dentro de una cascada, no entre cascadas. El motor ya encadena por dentro, así que
        // re-entrar no aporta nada y sí puede tumbar el proceso.
        fromRulesEngine: options?.fromRulesEngine === true,
      });

    // **Con una transacción abierta, la emisión se aplaza hasta el commit.** El motor trabaja por
    // otra conexión: emitir aquí le haría leer el mundo de antes del suceso y escribir sus efectos
    // fuera de la transacción, que sobrevivirían a un cambio deshecho. Sin transacción no hay nada
    // que esperar y se emite en el momento. Ver `../common/after-commit.ts` (ficha M2B-3).
    if (!encolarTrasCommit(emitir)) await emitir();

    return evento;
  }

  /**
   * Una página del log, más reciente primero.
   *
   * **El filtro por `canView` va después de la página, y eso tiene una consecuencia que hay que
   * decir en voz alta:** una página puede devolver menos elementos de los que se pidieron, o
   * ninguno, y aun así quedar log por leer. Por eso `nextCursor` sale de la **última fila
   * traída**, no de la última visible — si saliera de la visible, una página entera de eventos
   * `DM_ONLY` dejaría al jugador atascado sin poder avanzar. La alternativa (filtrar en SQL)
   * exigiría reimplementar la matriz de visibilidad en una cláusula `where`, y eso es
   * exactamente lo que `canView` existe para que nadie haga.
   */
  async list(
    userId: string,
    campaignId: string,
    query: ListGameEventsInput,
    /**
     * Filtros que **no** viajan por HTTP: los pone otro servicio del servidor, como el registro
     * de tiradas (2C.1), que es este mismo log acotado a los sucesos de tirada.
     *
     * Son **columnas reales**, nunca campos del `payload` — la regla de `docs/04-convenciones.md`:
     * un `Json` en la base no se consulta por dentro.
     */
    filtros?: { types?: GameEventType[]; subjectId?: string; subjectIds?: string[] },
  ) {
    const propio = await this.membership.requireMember(campaignId, userId);
    // **Mirar por los ojos de otro exige ser DM**, y que ese otro sea miembro de esta campaña.
    // Sin la segunda comprobación, `as` sería un oráculo: pedir por un identificador cualquiera y
    // deducir de la respuesta si pertenece a la campaña.
    if (query.as && query.as !== userId) {
      if (propio.role !== "DM")
        throw new ForbiddenException("Solo el DM puede mirar por los ojos de otro jugador.");
      const objetivo = await this.membership.getMembership(campaignId, query.as);
      if (!objetivo) throw new NotFoundException("Ese jugador no está en esta campaña.");
    }
    const viewer = await this.viewerFor(query.as ?? userId, campaignId);

    const rows = await this.prisma.gameEvent.findMany({
      where: {
        campaignId,
        ...(query.sessionId ? { sessionId: query.sessionId } : {}),
        ...(filtros?.types ? { type: { in: filtros.types } } : {}),
        ...(filtros?.subjectId ? { subjectId: filtros.subjectId } : {}),
        // Varios sujetos a la vez: «las tiradas de mis personajes». Una lista vacía es **ninguna**,
        // no todas — `{ in: [] }` no casa con nada, que es exactamente lo que se quiere decir.
        ...(filtros?.subjectIds ? { subjectId: { in: filtros.subjectIds } } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const events = rows.filter((row) => this.canSee(viewer, row.visibility, row.actorUserId));
    const hayMas = rows.length === query.limit;

    return { events, nextCursor: hayMas ? rows[rows.length - 1].id : null };
  }

  private canSee(viewer: Viewer, visibility: Visibility, actorUserId: string): boolean {
    // Un evento no tiene concesiones nominales propias en 2A: o lo ve tu nivel, o no. El actor
    // hace de creador, que es lo que da sentido a `OWNER_DM` sobre una tirada propia.
    return canView(viewer, { visibility, createdById: actorUserId, grantedUserIds: [] });
  }

  // Duplicado a sabiendas con el de los otros servicios: la deuda de extraer `viewerFor` a
  // `common/` está declarada en `docs/06-pendientes.md`, y resolverla aquí de tapadillo sería
  // meter una refactorización dentro de una tarea que no la pidió.
  private async viewerFor(userId: string, campaignId: string): Promise<Viewer> {
    const [member, user] = await Promise.all([
      this.membership.getMembership(campaignId, userId),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);
    return { userId, role: member?.role ?? null, isAdmin: user?.isAdmin ?? false };
  }

  /**
   * Lo mismo que `record`, pero marcando que la escritura **la produjo el motor de reglas**.
   *
   * Existe como método con nombre y no como un quinto argumento suelto porque el argumento se
   * olvida: un efecto nuevo del motor que llamara a `record` a secas reabriría el bucle sin que
   * nada avisara. Así, el motor tiene su propia puerta y la puerta dice para qué es.
   */
  async recordFromEngine(
    actorUserId: string,
    campaignId: string,
    input: RecordGameEventInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.record(actorUserId, campaignId, input, tx, { fromRulesEngine: true });
  }
}
