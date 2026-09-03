import { BadRequestException, Inject, Injectable, Optional } from "@nestjs/common";
import { expresionDePgDe, pgMediosDe, type InstantiateNpcInput, type Statblock } from "@dnd/shared";
import type { Prisma } from "@prisma/client";
import { MembershipService } from "../campaigns/membership.service";
import { canView, type Viewer } from "../common/visibility";
import { rollExpression, type Roller } from "../dice/dice";
import { PrismaService } from "../prisma/prisma.service";
import { DICE_ROLLER } from "../rolls/rolls.service";
import { condicionesActivas } from "../character-state/conditions/vencimiento";
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
        statblockRef: f.statblockRef,
        currentHp: f.currentHp,
        tempHp: f.tempHp,
        visibility: f.visibility,
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

  private async viewerFor(userId: string, campaignId: string): Promise<Viewer> {
    const member = await this.membership.requireMember(campaignId, userId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return { userId, role: member.role, isAdmin: user?.isAdmin ?? false };
  }
}
