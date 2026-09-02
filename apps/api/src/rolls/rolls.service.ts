import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import type { CreateRollInput, RollMode, RollResult } from "@dnd/shared";
import {
  DiceExpressionError,
  rollExpression,
  type DiceRollResult,
  type Roller,
} from "../dice/dice";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { PrismaService } from "../prisma/prisma.service";

/** Token del tirador. Solo lo rellena una prueba; en producción no hay proveedor. */
export const DICE_ROLLER = "DICE_ROLLER";

// Tarea 2A.13 — el servidor tira, y la tirada queda escrita.
//
// **El azar vive aquí y en ningún otro sitio.** El cliente manda una expresión; el resultado lo
// produce el servidor y lo escribe en el log antes de devolverlo. Si el cliente tirara, una
// tirada sería una afirmación del navegador — y la mesa no tendría forma de distinguir un 20
// de un 20 escrito a mano.

@Injectable()
export class RollsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: GameEventsService,
    /**
     * Inyectable para que las pruebas puedan fijar los dados sin tocar el azar real.
     *
     * Va por **token y opcional** a propósito: `Roller` es un alias de tipo, así que Nest solo
     * ve `Function` y trataría de resolverlo como una dependencia que no existe. Sin proveedor,
     * queda `undefined` y el evaluador usa su tirador por defecto —`crypto.randomInt`—, que es
     * lo que corre en producción.
     */
    @Optional() @Inject(DICE_ROLLER) private readonly roller?: Roller,
  ) {}

  async roll(userId: string, campaignId: string, input: CreateRollInput): Promise<RollResult> {
    await this.membership.requireMember(campaignId, userId);

    const characterId = await this.comprobarPersonaje(userId, campaignId, input.characterId);
    const sessionId = await this.sesionDeLaTirada(campaignId, input.sessionId);

    let resultado: DiceRollResult;
    try {
      resultado = rollExpression(conVentaja(input.expression, input.mode), this.roller);
    } catch (error) {
      // Una expresión inválida es **400 con su motivo**, no un 500 ni un total que miente.
      if (error instanceof DiceExpressionError)
        throw new BadRequestException({ code: error.code, message: error.message });
      throw error;
    }

    const rolls = resultado.terms.flatMap((t) => t.rolled);
    const kept = resultado.terms.flatMap((t) => (t.sides > 0 ? t.kept : []));
    const dropped = resultado.terms.flatMap((t) => t.dropped);
    // El modificador es lo que no son dados: el `+3` de `1d8+3`, con su signo.
    const modifier = resultado.terms
      .filter((t) => t.sides === 0)
      .reduce((suma, t) => suma + t.sign * t.value, 0);

    const natural = clasificarNatural(resultado);
    const outcome =
      input.dc === undefined ? "NO_DC" : resultado.total >= input.dc ? "SUCCESS" : "FAILURE";

    const evento = await this.events.record(userId, campaignId, {
      sessionId,
      subjectType: characterId ? "character" : "campaign",
      subjectId: characterId ?? campaignId,
      visibility: input.visibility,
      payload: {
        type: "ABILITY_ROLL",
        expression: resultado.expression,
        rolls,
        kept,
        dropped,
        modifier,
        total: resultado.total,
        ...(input.dc === undefined ? {} : { dc: input.dc }),
        natural,
        outcome,
        ...(input.label ? { reason: input.label } : {}),
      },
    });

    return {
      eventId: evento.id,
      expression: resultado.expression,
      rolls,
      kept,
      dropped,
      modifier,
      total: resultado.total,
      ...(input.dc === undefined ? {} : { dc: input.dc }),
      natural,
      outcome,
    };
  }

  /**
   * Tirar por un personaje exige ser su dueño o el DM. **Se comprueba en el servidor**, como
   * todo lo demás: sin esto, cualquier miembro podría escribir tiradas en la hoja de otro.
   */
  private async comprobarPersonaje(
    userId: string,
    campaignId: string,
    characterId?: string,
  ): Promise<string | undefined> {
    if (!characterId) return undefined;
    const personaje = await this.prisma.character.findFirst({
      where: { id: characterId, campaignId },
    });
    if (!personaje) throw new NotFoundException("Character not found");
    const miembro = await this.membership.getMembership(campaignId, userId);
    if (personaje.ownerId !== userId && miembro?.role !== "DM")
      throw new ForbiddenException("Solo el dueño del personaje o el DM pueden tirar por él");
    return personaje.id;
  }

  /**
   * Si quien tira no dice la sesión, **se usa la que esté en curso**: es lo que quiere durante
   * una partida, y no tener ninguna abierta no es un error — la tirada queda fuera de sesión,
   * que es un estado que el log ya sabe representar (`sessionId` nulo).
   */
  private async sesionDeLaTirada(campaignId: string, sessionId?: string): Promise<string | null> {
    if (sessionId) {
      const declarada = await this.prisma.session.findFirst({
        where: { id: sessionId, campaignId },
      });
      if (!declarada) throw new NotFoundException("Session not found");
      return declarada.id;
    }
    const enCurso = await this.prisma.session.findFirst({
      where: { campaignId, status: "IN_PROGRESS" },
    });
    return enCurso?.id ?? null;
  }
}

/**
 * Un 20 natural es **el dado de veinte caras que se conserva**, no el total.
 *
 * Solo se clasifica cuando hay **exactamente un d20 con un solo dado conservado**: es el caso
 * real de la mesa —`d20`, `2d20kh1` con ventaja, `2d20kl1` con desventaja— y cualquier otra
 * cosa (`3d20`, dos términos de d20) no tiene un «natural» que cantar. Decir `NONE` ahí es más
 * honesto que elegir uno de los dos por orden de aparición.
 */
function clasificarNatural(resultado: DiceRollResult): "NONE" | "ONE" | "TWENTY" {
  const veintes = resultado.terms.filter((t) => t.sides === 20 && t.kept.length === 1);
  if (veintes.length !== 1) return "NONE";
  const dado = veintes[0].kept[0];
  if (dado === 20) return "TWENTY";
  if (dado === 1) return "ONE";
  return "NONE";
}

/**
 * Aplica ventaja o desventaja a la expresión: **el único d20 pasa a ser `2d20kh1` o `2d20kl1`**.
 *
 * Se hace aquí y no en el cliente porque es una regla del juego. Y solo toca un `1d20` (o `d20`)
 * suelto: pedir ventaja sobre `4d6kh3` —una tirada de características— o sobre `2d8` no
 * significa nada, y **inventarle un significado sería peor que ignorarlo**; la expresión se
 * devuelve tal cual y el resultado guarda la expresión que de verdad se tiró, así que la traza
 * no miente sobre lo que pasó.
 */
export function conVentaja(expression: string, mode: RollMode): string {
  if (mode === "NORMAL") return expression;
  const sufijo = mode === "ADVANTAGE" ? "kh1" : "kl1";
  // `1d20` o `d20` al principio de la expresión, sin dígito de "keep" ya puesto.
  const reemplazado = expression.replace(/^(\s*)(1?d20)(?![0-9a-zA-Z])/i, `$1 2d20${sufijo}`);
  return reemplazado === expression ? expression : reemplazado.trim();
}
