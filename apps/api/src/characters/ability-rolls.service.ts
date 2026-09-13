import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import type { AbilityRollAttempt, Prisma } from "@prisma/client";
import { tableRulesSchema, type AbilityRollAttemptDto } from "@dnd/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { CharactersService } from "./characters.service";
import { rollExpression, type DiceRollResult, type Roller } from "../dice/dice";
import { desgloseDeTirada } from "../rules/table-rules";
import { DICE_ROLLER } from "../rolls/rolls.service";

// Reglas de la mesa (D-CF-53): las seis características se tiran EN EL SERVIDOR, con la expresión
// que el DM fijó, tantas veces como intentos dio. Cada intento queda escrito —seis `ABILITY_ROLL`
// para DM y dueño, y una fila `AbilityRollAttempt`— para que no se pueda repetir a escondidas.
//
// SRD 5.1, *Determine Ability Scores*: «Roll four 6-sided dice and record the total of the highest
// three dice on a piece of scratch paper. Do this five more times, so that you have six numbers.»
// El DM puede cambiar el dado (`4d6kh3`, `3d6`, `1d20`…): eso es la regla de la casa.
//
// **No se llama a `RollsService.roll`** (E-RM-11): abre su propia transacción y no admite una
// externa, y aquí seis tiradas sin su fila de intento serían un intento gratis si el proceso
// cayera a medias. Se hace como `level-up.service.ts`: evaluar, `events.record(…, tx)`, fila.
//
// **El desglose de cada tirada es `desgloseDeTirada` de `rules/table-rules.ts`** (D-CF-65): ya lo
// comparte la Tarea 4, y así no hay dos formas de leer un `DiceRollResult` que puedan discrepar.

@Injectable()
export class AbilityRollsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly characters: CharactersService,
    private readonly events: GameEventsService,
    @Optional() @Inject(DICE_ROLLER) private readonly roller?: Roller,
  ) {}

  private async reglaDe(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { tableRules: true },
    });
    if (!campaign) throw new NotFoundException("Campaign not found");
    return tableRulesSchema.parse(campaign.tableRules ?? {});
  }

  async roll(
    userId: string,
    campaignId: string,
    characterId: string,
  ): Promise<AbilityRollAttemptDto> {
    await this.membership.requireMember(campaignId, userId);
    await this.characters.requireEditable(userId, campaignId, characterId);
    const regla = await this.reglaDe(campaignId);
    if (regla.abilities.metodo !== "DADOS") {
      throw new BadRequestException("En esta mesa las características no se tiran con dados.");
    }
    const { expresion, intentos } = regla.abilities;

    return this.prisma.transaction(async (tx) => {
      const elegido = await tx.abilityRollAttempt.findFirst({
        where: { characterId, chosen: true },
      });
      if (elegido) {
        throw new ConflictException({
          code: "ABILITIES_FIXED",
          message: "Las características ya se fijaron con dados.",
        });
      }
      const hechos = await tx.abilityRollAttempt.count({ where: { characterId } });
      if (hechos >= intentos) {
        throw new ConflictException({
          code: "NO_MORE_ATTEMPTS",
          message: `La mesa da ${intentos} intento(s) y ya se usaron.`,
        });
      }

      const tiradas: DiceRollResult[] = [];
      const rolls: AbilityRollAttemptDto["rolls"] = [];
      for (let i = 0; i < 6; i++) {
        const resultado = rollExpression(expresion, this.roller);
        const desglose = desgloseDeTirada(resultado);
        const evento = await this.events.record(
          userId,
          campaignId,
          {
            subjectType: "character",
            subjectId: characterId,
            // DM + dueño (spec §5): nadie más tiene por qué ver cómo nació la hoja de otro.
            visibility: "OWNER_DM",
            payload: {
              type: "ABILITY_ROLL",
              ...desglose,
              natural: "NONE",
              outcome: "NO_DC",
              reason: "Característica",
            },
          },
          tx,
        );
        tiradas.push(resultado);
        rolls.push({ eventId: evento.id, ...desglose, natural: "NONE", outcome: "NO_DC" });
      }
      const values = tiradas.map((t) => t.total);
      const fila = await tx.abilityRollAttempt.create({
        data: { characterId, values, rollEventIds: rolls.map((r) => r.eventId), chosen: false },
      });
      return {
        id: fila.id,
        values,
        chosen: false,
        attempt: hechos + 1,
        of: intentos,
        createdAt: fila.createdAt.toISOString(),
        rolls,
      };
    });
  }

  async list(
    userId: string,
    campaignId: string,
    characterId: string,
  ): Promise<AbilityRollAttemptDto[]> {
    await this.membership.requireMember(campaignId, userId);
    // El dueño o el DM ven los intentos; un compañero de mesa, no — las tiradas son `OWNER_DM`.
    await this.characters.requireEditable(userId, campaignId, characterId);
    const regla = await this.reglaDe(campaignId);
    const of = regla.abilities.metodo === "DADOS" ? regla.abilities.intentos : 0;
    const filas = await this.prisma.abilityRollAttempt.findMany({
      where: { characterId },
      orderBy: { createdAt: "asc" },
    });
    // Los sucesos de las seis tiradas se releen para devolver el mismo desglose que el POST.
    const eventos = await this.prisma.gameEvent.findMany({
      where: { id: { in: filas.flatMap((f) => f.rollEventIds as string[]) } },
    });
    const porId = new Map(eventos.map((e) => [e.id, e]));
    return filas.map((f, i) => ({
      id: f.id,
      values: f.values as number[],
      chosen: f.chosen,
      attempt: i + 1,
      of,
      createdAt: f.createdAt.toISOString(),
      rolls: (f.rollEventIds as string[]).map((id) => {
        const p = porId.get(id)?.payload as Record<string, unknown>;
        return {
          eventId: id,
          expression: String(p.expression),
          rolls: p.rolls as number[],
          kept: p.kept as number[],
          dropped: p.dropped as number[],
          dice: p.dice as AbilityRollAttemptDto["rolls"][number]["dice"],
          modifier: Number(p.modifier),
          total: Number(p.total),
          natural: "NONE" as const,
          outcome: "NO_DC" as const,
        };
      }),
    }));
  }

  /** Para Task 4: la fila cruda, o 404 si no es de este personaje. */
  async requireAttempt(
    characterId: string,
    attemptId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AbilityRollAttempt> {
    const cliente = tx ?? this.prisma;
    const fila = await cliente.abilityRollAttempt.findFirst({
      where: { id: attemptId, characterId },
    });
    if (!fila) throw new NotFoundException("Ese intento no es de este personaje.");
    return fila;
  }
}
