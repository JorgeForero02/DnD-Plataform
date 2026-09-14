import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CreateEntityInput, UpdateEntityInput, type ListEntitiesQuery } from "@dnd/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import {
  audienciaDeSuceso,
  canView,
  comoRecursoVisible,
  laAudienciaCrecio,
} from "../common/visibility";
import { viewerFor } from "../common/character-viewer";
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
  /**
   * **Una concesión solo puede nombrar a un miembro de la campaña** (ficha P3 «las concesiones no se
   * validan contra los miembros», cerrada el 2026-09-10). Antes se guardaba cualquier id: quedaba
   * inerte —`canView` exige ser miembro antes de mirar concesiones— pero una fila que promete lo
   * que no hace es una mentira en la base, y el día que alguien entre en la campaña la encontraría
   * concedida sin que nadie lo decidiera. Se rechaza entera, con la misma frase para «no existe» y
   * «no es miembro»: el 400 no puede ser un oráculo de cuentas.
   */
  private async requireGrantsToMembers(
    campaignId: string,
    userIds: string[] | undefined,
    visibility: string,
  ) {
    if (!userIds?.length) return;
    // **Y solo tienen sentido con `SPECIFIC_PLAYERS`** (ficha P3 «los grants son inertes», cerrada
    // el 2026-09-10). `create` las descartaba en silencio y `update` las guardaba igual: en los dos
    // casos el DM creía haber concedido algo que la matriz no iba a mirar. Se dice, no se ignora.
    if (visibility !== "SPECIFIC_PLAYERS") {
      throw new BadRequestException(
        "Las concesiones a jugadores concretos solo valen con la visibilidad «Jugadores concretos».",
      );
    }
    const miembros = await this.prisma.campaignMember.count({
      where: { campaignId, userId: { in: userIds } },
    });
    if (miembros !== new Set(userIds).size) {
      throw new BadRequestException(
        "Solo se puede conceder una ficha a personas que ya estén en la campaña.",
      );
    }
  }

  async create(userId: string, campaignId: string, input: CreateEntityInput) {
    await this.membership.requireDM(campaignId, userId);
    const { specificPlayerIds, ...rest } = input;
    await this.requireGrantsToMembers(campaignId, specificPlayerIds, rest.visibility);
    const entity = await this.prisma.entity.create({
      data: {
        campaignId,
        type: rest.type,
        name: rest.name,
        body: rest.body === undefined ? undefined : (rest.body as object),
        tags: rest.tags,
        visibility: rest.visibility,
        createdById: userId,
        grants: specificPlayerIds?.length
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

  /**
   * Las fichas que este visor puede ver, opcionalmente filtradas por tipo y por texto.
   *
   * ## `q` busca **dentro del cuerpo**, y por eso vive aquí (ficha U3, plan 14)
   *
   * La búsqueda era del navegador y solo miraba el **nombre**: una ficha que dice «la puerta de
   * sal» en su tercer párrafo era inencontrable. Buscar en el texto es del servidor.
   *
   * ## Y el orden de los dos filtros ES la seguridad
   *
   * **Primero `canView`, después el texto.** Al revés, buscar sería un **oráculo**: un jugador
   * escribe una palabra que solo aparece en una ficha `DM_ONLY` y, aunque no reciba la ficha,
   * cualquier diferencia observable —un conteo, un orden, un tiempo— le confirma que existe. Es el
   * mismo defecto que el plan 03 cerró en el ataque, y por eso el filtro de texto se aplica sobre
   * la lista **ya recortada**.
   *
   * ## Por qué el texto se compara aquí y no en la consulta
   *
   * `body` es `Json` —lo que solo se pinta puede ser Json, dice la convención— y filtrar dentro de
   * un `Json` en Prisma pediría SQL crudo, que a su vez perdería el `include` de las concesiones
   * que `canView` necesita. Esta consulta **ya traía todas las filas de la campaña** para poder
   * aplicar `canView` en memoria, así que comparar el texto aquí **no añade ni una lectura**. El
   * día que una campaña tenga miles de fichas, lo que hay que cambiar es la consulta entera —
   * paginarla—, y entonces el texto baja con ella; adelantarlo hoy sería complicar sin medir.
   */
  async list(userId: string, campaignId: string, query: ListEntitiesQuery = {}) {
    await this.membership.requireMember(campaignId, userId);
    const viewer = await viewerFor(this.prisma, this.membership, userId, campaignId);
    const entities = await this.prisma.entity.findMany({
      where: { campaignId, ...(query.type ? { type: query.type } : {}) },
      include: { grants: true },
      orderBy: { createdAt: "desc" },
    });
    // Low #12, revisión final de `ficha/tanda-2-a-5`: `comoRecursoVisible` (`common/
    // visibility.ts`) en vez de esta misma traducción inline.
    const visibles = entities.filter((e) => canView(viewer, comoRecursoVisible(e)));

    const texto = (query.q ?? "").trim().toLocaleLowerCase("es");
    if (texto === "") return visibles;
    return visibles.filter((e) => coincideElTexto(e, texto));
  }

  async get(userId: string, campaignId: string, entityId: string) {
    await this.membership.requireMember(campaignId, userId);
    const viewer = await viewerFor(this.prisma, this.membership, userId, campaignId);
    const entity = await this.prisma.entity.findFirst({
      where: { id: entityId, campaignId },
      include: { grants: true },
    });
    if (!entity || !canView(viewer, comoRecursoVisible(entity))) {
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
    // Contra la visibilidad que va a quedar: la del cuerpo si viene, la guardada si no.
    await this.requireGrantsToMembers(
      campaignId,
      specificPlayerIds,
      rest.visibility ?? before.visibility,
    );
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

      // **Ficha I16 — reclasificar deja rastro.** Cambiar el tipo convierte un PNJ con statblock,
      // enlaces y comentarios en «Documento» de un clic, y hasta hoy **no quedaba constancia**. El
      // registro es la auditoría de esta aplicación: un cambio de naturaleza que no aparece en él
      // no se puede deshacer, porque nadie sabe que pasó.
      //
      // **Lleva los dos tipos, no solo el nuevo**: «ahora es un Documento» no dice qué se perdió;
      // «pasa de PNJ a Documento» sí.
      //
      // Hereda la visibilidad de la ficha y sus concesiones, igual que el suceso de revelar: el
      // aviso no puede ser más público que la cosa de la que habla.
      if (rest.type !== undefined && rest.type !== before.type) {
        await this.gameEvents.record(
          userId,
          campaignId,
          {
            subjectType: "campaign",
            subjectId: entity.id,
            ...audienciaDeSuceso(comoRecursoVisible(entity)),
            payload: {
              type: "ENTITY_RETYPED",
              entityName: entity.name,
              from: before.type,
              to: entity.type,
            },
          },
          tx,
        );
      }

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
          comoRecursoVisible(entity),
        );
      if (crecio) {
        // **La visibilidad del suceso hereda la de la entidad, ahora sin parche.**
        //
        // Hereda porque es lo correcto: el aviso no puede ser más público que la cosa que anuncia.
        // Hasta el 2026-09-05 aquí había una excepción — una entidad `SPECIFIC_PLAYERS` guardaba
        // su suceso como `DM_ONLY`— porque `GameEvent` no tenía concesiones nominales y una fila
        // con esa etiqueta **no la veía nadie** salvo el DM. Era un parche honesto: guardaba lo
        // que de verdad ocurría en vez de prometer una frontera que el filtro no aplicaba.
        //
        // **D-OP-12 quitó el motivo**, así que se quita el parche: el suceso se guarda con la
        // visibilidad de verdad y con **las concesiones de la entidad en este momento**. Se pasan
        // aquí y no se resuelven al leer, porque quien mire el registro dentro de un mes tiene que
        // ver quién estaba nombrado **cuando pasó**.
        await this.gameEvents.record(
          userId,
          campaignId,
          {
            subjectType: "campaign",
            subjectId: entity.id,
            ...audienciaDeSuceso(comoRecursoVisible(entity)),
            payload: { type: "ENTITY_REVEALED", entityName: entity.name },
          },
          tx,
        );

        // PNJ del mundo y la mesa (spec §3.2, E-PM-5): revelar la ficha sube **todos sus cuerpos
        // vivos** en la campaña. Solo cuando la mesa entera pasa a verla: a `SPECIFIC_PLAYERS`
        // la audiencia crece pero no es «la mesa», y un cuerpo `PLAYERS` sería más público que su ficha.
        if (entity.visibility === "PLAYERS" || entity.visibility === "PUBLIC") {
          const cuerpos = await tx.character.findMany({
            where: {
              entityId,
              campaignId,
              archivedAt: null,
              visibility: { in: ["DM_ONLY", "OWNER_DM"] },
            },
            select: { id: true, name: true, visibility: true },
          });
          if (cuerpos.length > 0) {
            await tx.character.updateMany({
              where: { id: { in: cuerpos.map((c) => c.id) } },
              data: { visibility: "PLAYERS" },
            });
            for (const cuerpo of cuerpos) {
              await this.gameEvents.record(
                userId,
                campaignId,
                {
                  subjectType: "character",
                  subjectId: cuerpo.id,
                  visibility: "PLAYERS",
                  payload: {
                    type: "NPC_REVEALED",
                    characterName: cuerpo.name,
                    entityName: entity.name,
                  },
                },
                tx,
              );
            }
          }
        }
      }

      return entity;
    });
  }

  /**
   * **La batuta** (plan 09, ficha I19): el DM pulsa y las reglas que esperaban a esta ficha se
   * disparan.
   *
   * **Ejecutar NO edita la ficha.** No cambia un campo, no la revela, no la marca: escribe un
   * suceso y nada más. Es lo que la convierte en una herramienta de **preparación** — el DM ata en
   * frío lo que pasa al abrir el cofre o al leer la inscripción, y en la mesa solo pulsa.
   *
   * **Solo el DM**, y el suceso es **`DM_ONLY` siempre**: ejecutar es un gesto de dirección. Lo que
   * la mesa ve son los EFECTOS que las reglas produzcan, cada uno con su propia visibilidad. Si el
   * suceso heredara la visibilidad de la ficha, la mesa vería «el DM ejecutó *La cripta*» y con
   * ello el nombre de una ficha que quizá no debía conocer.
   */
  async execute(userId: string, campaignId: string, entityId: string) {
    await this.membership.requireDM(campaignId, userId);
    const entity = await this.prisma.entity.findFirst({
      where: { id: entityId, campaignId },
      select: { id: true, name: true },
    });
    // 404 y no 403: el DM de otra campaña no tiene por qué enterarse de que esa ficha existe.
    if (!entity) throw new NotFoundException("Entity not found");

    return this.prisma.transaction(async (tx) => {
      await this.gameEvents.record(
        userId,
        campaignId,
        {
          // **El sujeto es la campaña, no la ficha**, y el `entityId` va en el payload: esto no es
          // algo que le pase a la ficha, es algo que hace el DM. El motor lo lee de ahí, con el
          // mismo patrón que `ENTITY_COMMENTED`.
          subjectType: "campaign",
          subjectId: campaignId,
          visibility: "DM_ONLY",
          payload: { type: "DM_EXECUTED", entityId: entity.id, entityName: entity.name },
        },
        tx,
      );
      return { executed: true, entityId: entity.id };
    });
  }

  async remove(userId: string, campaignId: string, entityId: string) {
    await this.membership.requireMember(campaignId, userId);
    await this.requireEditable(userId, campaignId, entityId);
    await this.prisma.entity.delete({ where: { id: entityId } });
    return { deleted: true };
  }
}

/**
 * ¿El nombre o el cuerpo contienen este texto? (ficha U3.)
 *
 * **Minúsculas con la configuración regional española**, no `toLowerCase()` a secas: buscar «lich»
 * tiene que encontrar «Lich», y buscar «Í» tiene que comportarse igual que en la pantalla, que usa
 * `toLocaleLowerCase("es")` desde que existe el filtro del navegador.
 *
 * El cuerpo es un `Json` con `{ format: "markdown", text }`; se lee `text` con cuidado porque una
 * fila vieja puede traer otra forma, y una búsqueda que reviente con un dato antiguo sería peor
 * que una que no encuentre nada.
 */
function coincideElTexto(
  entity: { name: string; body: unknown },
  textoEnMinusculas: string,
): boolean {
  if (entity.name.toLocaleLowerCase("es").includes(textoEnMinusculas)) return true;
  const cuerpo = entity.body;
  if (cuerpo && typeof cuerpo === "object" && "text" in cuerpo) {
    const texto = (cuerpo as { text?: unknown }).text;
    if (typeof texto === "string") {
      return texto.toLocaleLowerCase("es").includes(textoEnMinusculas);
    }
  }
  return false;
}
