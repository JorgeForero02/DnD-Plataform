import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import {
  expresionDePgDe,
  origenDeRef,
  pgMediosDe,
  type InstantiateNpcInput,
  type Statblock,
  type Visibility,
} from "@dnd/shared";
import type { Entity, EntityVisibilityGrant, Prisma } from "@prisma/client";
import { MembershipService } from "../campaigns/membership.service";
import {
  audienciaDeSuceso,
  canView,
  comoRecursoVisible,
  loVeLaMesa,
  POR_DEBAJO_DE_LA_MESA,
  type Viewer,
} from "../common/visibility";
import { entityIdsVisibleFor, requireNpcEntity } from "../common/entity-link";
import { rollExpression, type Roller } from "../dice/dice";
import { PrismaService } from "../prisma/prisma.service";
import { DICE_ROLLER } from "../rolls/rolls.service";
import { condicionesActivas } from "../character-state/conditions/vencimiento";
import { GameEventsService } from "../game-events/game-events.service";
import { StatblocksService } from "./statblocks.service";

// Tarea 2D.4 — **bajar un statblock a la mesa**.
//
// La decisión que hace barato el alcance grande: **un PNJ en la mesa es una fila de `Character`**.
// No un modelo nuevo con su propio estado. `Character` ya trae, probado y desplegado, todo lo que
// un combatiente necesita —PG actuales y temporales, la versión optimista, las condiciones con
// vencimiento de 2C, el inventario de 2B, las salvaciones de muerte, su sitio en el registro de
// tiradas y en las peticiones—, y reimplementarlo para PNJ sería escribir por segunda vez el
// sistema que más revisión ha recibido en este proyecto.
//
// Lo único que distingue a un PNJ es **de dónde salen sus números derivados**: `statblockRef` con
// valor, y `classKey`, `raceKey` y `level` sin usar.

@Injectable()
export class NpcsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly statblocks: StatblocksService,
    private readonly gameEvents: GameEventsService,
    // Mismo patrón que el resto de la fase: inyectable solo en pruebas para fijar la semilla.
    @Optional() @Inject(DICE_ROLLER) private readonly roller?: Roller,
  ) {}

  /**
   * Instancia N combatientes desde una plantilla. Solo el DM: es su mazmorra.
   */
  async instanciar(userId: string, campaignId: string, input: InstantiateNpcInput) {
    await this.membership.requireDM(campaignId, userId);

    // Se resuelve **sin espectador**: el DM ve sus propios statblocks, y `requireDM` ya decidió
    // que quien pide es el DM. Pasar el espectador aquí sería preguntar dos veces lo mismo.
    const statblock = await this.statblocks.resolver(campaignId, input.ref);
    if (!statblock) {
      throw new BadRequestException(
        `No existe ningún statblock con la referencia «${input.ref}» en esta campaña.`,
      );
    }

    // PNJ del mundo y la mesa (Task 0, spec §3.1): «¿de qué ficha del mundo es?», validado antes
    // de crear nada — media tanda entrando enlazada y media sin enlazar sería peor que ninguna.
    if (input.entityId) await requireNpcEntity(this.prisma, campaignId, input.entityId);

    const nombreBase = input.name ?? statblock.name;
    const filas: Prisma.CharacterUncheckedCreateInput[] = [];
    for (let i = 0; i < input.count; i++) {
      // Se numera **solo cuando hay más de uno**: «Goblin» a secas si sale uno, que es lo que la
      // mesa dice. «Goblin 1» con un único goblin en el tablero es ruido.
      const nombre = input.count === 1 ? nombreBase : `${nombreBase} ${i + 1}`;
      const pg = this.puntosDeGolpe(statblock, input.hp);
      filas.push({
        campaignId,
        // **El dueño es el DM.** No es un detalle administrativo: es lo que hace que las
        // comprobaciones de «dueño o DM» que ya existen sigan valiendo tal cual para un PNJ.
        ownerId: userId,
        name: nombre,
        statblockRef: statblock.ref,
        // **Nace `DM_ONLY`.** Preparar la mazmorra no puede ser filtrarla: el DM lo sube a
        // `PLAYERS` cuando los jugadores se topan con el bicho.
        visibility: "DM_ONLY" as const,
        currentHp: pg,
        // Las seis características se copian porque el estado mutable las lee sin pasar por el
        // motor; los números derivados siguen saliendo del statblock, no de aquí.
        str: statblock.abilities.str,
        dex: statblock.abilities.dex,
        con: statblock.abilities.con,
        int: statblock.abilities.int,
        wis: statblock.abilities.wis,
        cha: statblock.abilities.cha,
        entityId: input.entityId ?? null,
      });
    }

    // Una transacción: **seis goblins entran los seis o no entra ninguno**. Media tanda en la
    // mesa es peor que ninguna, porque el DM no sabe cuántos le faltan.
    const creados = await this.prisma.transaction(async (tx) => {
      const salida: Awaited<ReturnType<typeof tx.character.create>>[] = [];
      for (const fila of filas) salida.push(await tx.character.create({ data: fila }));
      return salida;
    });

    return creados.map((c) => ({
      id: c.id,
      name: c.name,
      statblockRef: c.statblockRef,
      currentHp: c.currentHp,
      visibility: c.visibility,
      // El DM lo ve siempre: `requireDM`, unas líneas arriba, ya decidió quién pregunta.
      entityId: c.entityId,
    }));
  }

  /**
   * Los PNJ de la campaña que quien mira puede ver.
   *
   * Un jugador ve los que el DM ya le ha enseñado. Los que están preparados y no han salido
   * **no viajan**, que es la misma regla de siempre y aquí importa el doble: la lista de PNJ es,
   * literalmente, la lista de lo que el DM tiene planeado.
   */
  async list(userId: string, campaignId: string) {
    const viewer = await this.viewerFor(userId, campaignId);
    const [filas, campana] = await Promise.all([
      this.prisma.character.findMany({
        where: { campaignId, statblockRef: { not: null } },
        orderBy: { createdAt: "asc" },
        include: { conditions: { select: { key: true, level: true, expiresAtClock: true } } },
      }),
      this.prisma.campaign.findUniqueOrThrow({
        where: { id: campaignId },
        select: { clockSeconds: true },
      }),
    ]);
    // Qué plantillas puede ver quien mira, resueltas una sola vez para toda la lista en vez de
    // una consulta por PNJ.
    const refsVisibles = new Set<string>();
    for (const ref of new Set(filas.map((f) => f.statblockRef).filter((r): r is string => !!r))) {
      if (await this.statblocks.puedeVerStatblock(campaignId, ref, viewer)) refsVisibles.add(ref);
    }
    // PNJ del mundo y la mesa (spec §4): la existencia del enlace no puede filtrar que «Alguien»
    // es Garrik. Una sola consulta para toda la lista, igual que con las plantillas.
    const enlacesVisibles = await entityIdsVisibleFor(
      this.prisma,
      viewer,
      filas.map((f) => f.entityId),
    );

    return filas
      .filter((f) =>
        canView(viewer, {
          visibility: f.visibility,
          createdById: f.ownerId,
          grantedUserIds: [],
        }),
      )
      .map((f) => ({
        id: f.id,
        name: f.name,
        // **El `ref` de una plantilla que no puedes ver no viaja**: es el identificador de la
        // fila que la lista de statblocks está escondiéndote a propósito, y mandarlo aquí sería
        // deshacer ese trabajo por la puerta de al lado. Mismo criterio que `redactado()` usa
        // con los objetos ocultos de una hoja. Los del SRD sí viajan: son el libro.
        statblockRef: refsVisibles.has(f.statblockRef ?? "") ? f.statblockRef : null,
        currentHp: f.currentHp,
        tempHp: f.tempHp,
        visibility: f.visibility,
        /**
         * **De quién es** (paso 1, tarea 15). El servidor **ya** trata a un PNJ cedido por dueño
         * —`encounters.service` separa las peticiones de iniciativa por `ownerId` sin mirar
         * `statblockRef`, y `requireEditable` le dejaría cambiarle los PG y ponerle condiciones—,
         * y la pantalla era más restrictiva que él **solo porque este dato no viajaba**: no había
         * de dónde leer «es tuyo».
         *
         * No es una fuga: el `ownerId` de un PNJ que ya estás viendo no dice nada que la lista no
         * diga —`canView` ya decidió arriba que puedes verlo—, y es el mismo campo que la lista
         * de personajes publica desde 2A.
         */
        ownerId: f.ownerId,

        /**
         * Las condiciones **vivas**: una vencida sigue en la ficha, marcada, pero ya no aplica
         * (2C.4). Filtrarlas aquí es lo que impide que la caducidad dependa de que alguien haya
         * abierto la pantalla de condiciones.
         *
         * **Y no van los PG máximos, a propósito.** Derivarlos aquí sería un segundo camino que
         * discreparía del de la hoja en cuanto hubiera agotamiento —que parte el máximo por la
         * mitad—, y tener dos sitios donde se deriva lo mismo es exactamente el fallo que 2D.4
         * encontró y unificó. Quien quiera el máximo abre la ficha, que es su fuente única.
         */
        conditions: condicionesActivas(f.conditions, campana.clockSeconds).map((c) => ({
          key: c.key,
          level: c.level,
        })),

        // Spec §4: la existencia del enlace no puede filtrar que «Alguien» es Garrik.
        entityId: f.entityId && enlacesVisibles.has(f.entityId) ? f.entityId : null,
      }));
  }

  /**
   * Los PG con los que nace un PNJ.
   *
   * **El motor no tira.** Dice `2d6`; el tirador de 2C lo ejecuta, con su generador inyectable
   * para que una prueba pueda fijar la semilla. Es la regla que la fase 2 puso por escrito en su
   * especificación de alcance, y romperla aquí habría hecho el motor no comprobable.
   */
  private puntosDeGolpe(statblock: Statblock, modo: InstantiateNpcInput["hp"]): number {
    if (modo === "AVERAGE") return pgMediosDe(statblock);
    const resultado = rollExpression(expresionDePgDe(statblock), this.roller);
    // Ninguna criatura entra a la mesa con cero puntos de golpe: una tirada desastrosa la dejaría
    // inconsciente antes de que nadie la vea, que no es lo que nadie quiso al pulsar el botón.
    return Math.max(1, resultado.total);
  }

  /**
   * «Por debajo de la mesa» (E-PM-2, **enmendado por I2** en la ola de cierre del 2026-09-14):
   * `DM_ONLY`, `OWNER_DM` y `SPECIFIC_PLAYERS`, para las tres columnas por igual.
   *
   * E-PM-2 decía que la instancia y la plantilla «no admiten `SPECIFIC_PLAYERS`», pero eso es
   * la pantalla (`CHARACTER_VISIBILITIES`, `NIVELES_DE_CRIATURA`), no el servidor:
   * `createCharacterSchema.visibility` y `campaignStatblock.visibility` son `visibilitySchema`
   * entero, así que una fila SÍ puede llegar en `SPECIFIC_PLAYERS` — y antes de este arreglo se
   * quedaba invisible para siempre, porque `sePuedeRevelar` decía que sí y `reveal` no la tocaba.
   * `POR_DEBAJO_DE_LA_MESA` vive en `common/visibility.ts` para que `raiseLiveBodies`
   * (`entity-link.ts`) no pueda tener una lista distinta.
   */
  private static readonly BELOW_TABLE: Visibility[] = POR_DEBAJO_DE_LA_MESA;

  /**
   * **Revelar es una sola acción** (spec §3.2): sube la instancia a `PLAYERS`, y con ella la ficha
   * del mundo si está por debajo y la plantilla creada si está oculta. Una transacción, un botón,
   * tres columnas. Idempotente: lo que ya se ve no se toca, y si nada cambia no hay suceso.
   */
  async reveal(userId: string, campaignId: string, characterId: string) {
    await this.membership.requireDM(campaignId, userId);
    const character = await this.prisma.character.findFirst({
      where: { id: characterId, campaignId },
    });
    if (!character) throw new NotFoundException("Character not found");

    return this.prisma.transaction(async (tx) => {
      const revealed = { character: false, entity: false, template: false };
      let fila = character;
      if (!loVeLaMesa(character.visibility)) {
        // m2 (ola de cierre): `updateMany` condicional en vez de `update` a secas — dos
        // «Revelar» a la vez pasan los dos el `if` de fuera (que lee con `this.prisma`, antes de
        // la transacción), pero solo uno de los dos encuentra la fila todavía «por debajo de la
        // mesa» aquí dentro. El otro ve `count: 0` y no escribe su «entra en escena».
        const { count } = await tx.character.updateMany({
          where: { id: characterId, visibility: { in: NpcsService.BELOW_TABLE } },
          data: { visibility: "PLAYERS" },
        });
        if (count === 1) {
          fila = { ...character, visibility: "PLAYERS" as Visibility };
          revealed.character = true;
        }
      }

      let entityName: string | undefined;
      let entidadSubida: (Entity & { grants: EntityVisibilityGrant[] }) | null = null;
      if (character.entityId) {
        const entity = await tx.entity.findFirst({
          where: { id: character.entityId, campaignId },
          include: { grants: true },
        });
        if (entity) {
          entityName = entity.name;
          if (!loVeLaMesa(entity.visibility)) {
            entidadSubida = await tx.entity.update({
              where: { id: entity.id },
              data: { visibility: "PLAYERS" },
              include: { grants: true },
            });
            revealed.entity = true;
          }
        }
      }

      const origen = character.statblockRef ? origenDeRef(character.statblockRef) : null;
      if (origen?.source === "CAMPAIGN") {
        const plantilla = await tx.campaignStatblock.findFirst({
          where: { id: origen.id, campaignId },
        });
        if (plantilla && !loVeLaMesa(plantilla.visibility)) {
          await tx.campaignStatblock.update({
            where: { id: plantilla.id },
            data: { visibility: "PLAYERS" },
          });
          revealed.template = true;
        }
      }

      if (revealed.character || revealed.entity || revealed.template) {
        await this.gameEvents.record(
          userId,
          campaignId,
          {
            subjectType: "character",
            subjectId: characterId,
            visibility: "PLAYERS",
            payload: {
              type: "NPC_REVEALED",
              characterName: character.name,
              entityName,
              templateRevealed: revealed.template || undefined,
              // m6 (ola de cierre): `false` explícito, no `|| undefined` — `linea-de-log.ts`
              // necesita distinguir «esta columna ya estaba» de «no se sabe» (sucesos viejos).
              characterRevealed: revealed.character,
              entityRevealed: revealed.entity,
            },
          },
          tx,
        );
      }
      if (entidadSubida) {
        // E-PM-3: `world-builder.ts` cuenta lo revelado por las filas ENTITY_REVEALED; esta puerta
        // no puede revelar una ficha sin que el motor de reglas se entere.
        await this.gameEvents.record(
          userId,
          campaignId,
          {
            subjectType: "campaign",
            subjectId: entidadSubida.id,
            ...audienciaDeSuceso(comoRecursoVisible(entidadSubida)),
            payload: { type: "ENTITY_REVEALED", entityName: entidadSubida.name },
          },
          tx,
        );
      }

      return {
        id: fila.id,
        name: fila.name,
        visibility: fila.visibility,
        entityId: fila.entityId,
        revealed,
      };
    });
  }

  /** Ocultar baja **solo la instancia** (spec §3.2): lo que la mesa ya leyó, leído está. */
  async hide(userId: string, campaignId: string, characterId: string) {
    await this.membership.requireDM(campaignId, userId);
    const character = await this.prisma.character.findFirst({
      where: { id: characterId, campaignId },
    });
    if (!character) throw new NotFoundException("Character not found");
    // m9 (ola de cierre): antes solo se saltaba con `DM_ONLY`; una fila `OWNER_DM` —invisible
    // para la mesa igual que `DM_ONLY`— se bajaba igualmente y escribía «se oculta de la mesa»
    // sin que la mesa la hubiera visto nunca. Mismo predicado que I2, `!loVeLaMesa`: si la mesa
    // no la ve, no hay nada que ocultar DE la mesa.
    if (!loVeLaMesa(character.visibility)) {
      return { id: character.id, name: character.name, visibility: character.visibility };
    }
    return this.prisma.transaction(async (tx) => {
      const fila = await tx.character.update({
        where: { id: characterId },
        data: { visibility: "DM_ONLY" },
      });
      // E-PM-4: DM_ONLY, y existe para que el canal en vivo despierte la pantalla del jugador.
      await this.gameEvents.record(
        userId,
        campaignId,
        {
          subjectType: "character",
          subjectId: characterId,
          visibility: "DM_ONLY",
          payload: { type: "NPC_HIDDEN", characterName: character.name },
        },
        tx,
      );
      return { id: fila.id, name: fila.name, visibility: fila.visibility };
    });
  }

  private async viewerFor(userId: string, campaignId: string): Promise<Viewer> {
    const member = await this.membership.requireMember(campaignId, userId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return { userId, role: member.role, isAdmin: user?.isAdmin ?? false };
  }
}
