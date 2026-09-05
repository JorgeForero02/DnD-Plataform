import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import {
  VISIBILIDAD_POR_AUDIENCIA,
  type CreateRollInput,
  type GameEventType,
  type ListRollsInput,
  type Role,
  type RollMode,
  type RollResult,
  type Visibility,
} from "@dnd/shared";
import {
  DiceExpressionError,
  rollExpression,
  type DiceRollResult,
  type Roller,
} from "../dice/dice";
import { MembershipService } from "../campaigns/membership.service";
import { DmTablesService } from "../dm-tables/dm-tables.service";
import { canView } from "../common/visibility";
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

/**
 * Qué cuenta como «una tirada» en el registro.
 *
 * `DEATH_SAVE` entra: es un d20 con su resultado, y es **la tirada que la mesa más quiere
 * repasar**. Va con su propia forma de `payload` —`roll` y cuatro resultados en vez de un
 * desglose— porque un 20 natural en una salvación de muerte no es un éxito, devuelve al
 * personaje a 1 PG.
 */
const TIPOS_DE_TIRADA: GameEventType[] = ["ABILITY_ROLL", "DEATH_SAVE"];

@Injectable()
export class RollsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: GameEventsService,
    private readonly tables: DmTablesService,
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

  /**
   * @param interno Lo que **solo pone el servidor** y nunca viaja en el cuerpo de una petición.
   *   Hoy es `attackRollEventId` (D-OP-15): la tirada de ataque cuyo daño se está cobrando. **No
   *   está en `createRollSchema` a propósito** — si el cliente pudiera mandarlo, podría quemar el
   *   identificador de la tirada de otro y dejarla incobrable, que es la puerta de al lado del
   *   problema que este campo cierra.
   */
  async roll(
    userId: string,
    campaignId: string,
    input: CreateRollInput,
    interno?: { attackRollEventId?: string },
  ): Promise<RollResult> {
    const propio = await this.membership.requireMember(campaignId, userId);

    const characterId = await this.comprobarPersonaje(userId, campaignId, input.characterId);
    const sessionId = await this.sesionDeLaTirada(campaignId, input.sessionId);

    // El nivel de visibilidad **se deriva** del vocabulario de mesa; nadie manda un `DM_ONLY`.
    const visibility = VISIBILIDAD_POR_AUDIENCIA[input.audience];

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

    // **La tirada y la tabla que dispara se escriben JUNTAS o no se escribe ninguna.**
    //
    // El comentario de `DmTablesService.tirarSobre` prometía esto —«una pifia registrada sin su
    // tirada, o al revés, es una línea de tiempo que no se puede leer»— y el único llamante
    // automático **no pasaba la transacción**, así que la promesa era falsa. Lo cazó una revisión;
    // ningún script podía verlo.
    //
    // `prisma.transaction` es además lo que hace que los sucesos se emitan **tras el commit**
    // (ficha M2B-3): el motor de reglas ve la tirada y su tabla ya escritas, nunca a medias.
    const { evento, deLaCasa, tabla } = await this.prisma.transaction(async (tx) => {
      const evento = await this.events.record(
        userId,
        campaignId,
        {
          sessionId,
          subjectType: characterId ? "character" : "campaign",
          subjectId: characterId ?? campaignId,
          visibility,
          ...(interno?.attackRollEventId ? { attackRollEventId: interno.attackRollEventId } : {}),
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
        },
        tx,
      );

      // **La tabla de la casa, si la casa la tiene encendida** (2C.6). Solo se pregunta cuando hay
      // un natural que cantar, así que una tirada corriente no paga ninguna consulta de más — y con
      // el interruptor apagado, que es el valor por defecto, esto devuelve `null` y **un crítico
      // sigue duplicando dados y nada más**, que es lo que dice el manual.
      const tabla =
        natural === "NONE"
          ? null
          : await this.tables.tablaDisparadaPor(
              campaignId,
              natural === "TWENTY" ? "CRITICAL" : "FUMBLE",
              tx,
            );
      const deLaCasa = tabla
        ? await this.tables.tirarSobre(userId, campaignId, tabla, {
            trigger: natural === "TWENTY" ? "CRITICAL" : "FUMBLE",
            tx,
          })
        : undefined;

      return { evento, deLaCasa, tabla };
    });

    // **Y el texto de esa tabla no vuelve a quien no puede ver la tabla.**
    //
    // Lo encontró una revisión de seguridad, y es el agujero de la tirada a ciegas otra vez, un
    // método más abajo: una tabla nace `DM_ONLY` **por defecto**, su `TABLE_ROLLED` sí se escribe
    // con esa visibilidad —así que el registro la esconde bien—, y la respuesta del `POST` la
    // cantaba entera. Un jugador que sacara un 1 natural leía la tabla de pifias del DM.
    //
    // **Se tira igual**: el DM la necesita, y el suceso queda escrito para él. Lo que se decide
    // aquí es solo si el texto viaja de vuelta, y lo decide `canView`, como todo lo demás.
    const puedeVerLaTabla =
      tabla === null ||
      (await this.puedeVerse(userId, campaignId, propio.role, tabla.visibility as Visibility));
    const deLaCasaVisible = puedeVerLaTabla ? deLaCasa : undefined;

    // **El agujero de la tirada a ciegas se cierra aquí.** Hasta 2C la respuesta devolvía el
    // resultado a quien la pedía siempre, así que una tirada que el registro escondía se leía
    // igualmente en el cuerpo de su propia petición: la tirada a ciegas no existía aunque el
    // vocabulario dijera que sí. Ahora se pregunta a `canView` —el dueño único de quién ve qué—
    // si quien acaba de tirar puede ver lo que ha tirado, y si no, la respuesta lo omite.
    if (!(await this.puedeVerse(userId, campaignId, propio.role, visibility))) {
      return {
        revealed: false,
        eventId: evento.id,
        expression: resultado.expression,
        audience: input.audience,
      };
    }

    return {
      revealed: true,
      eventId: evento.id,
      expression: resultado.expression,
      audience: input.audience,
      rolls,
      kept,
      dropped,
      modifier,
      total: resultado.total,
      ...(input.dc === undefined ? {} : { dc: input.dc }),
      natural,
      outcome,
      ...(deLaCasaVisible ? { houseTable: deLaCasaVisible } : {}),
    };
  }

  /**
   * El registro de tiradas de la campaña, filtrado por `canView` **en el servidor**.
   *
   * **No hay una segunda matriz de visibilidad.** Por dentro es el log de partida acotado a los
   * sucesos de tirada: lo sirve `GameEventsService.list`, que es el único sitio donde vive
   * `canView` para los sucesos. Una tirada `DM_ONLY` **no viaja**; no se esconde en el cliente.
   */
  async list(userId: string, campaignId: string, query: ListRollsInput) {
    // **«Solo las mías» lo resuelve el servidor** (ficha C2C-7), y por eso no es un `characterId`:
    // un jugador puede llevar varios personajes, así que «las mías» es un conjunto que el cliente
    // tendría que componer pidiendo antes su lista y mandando una consulta por cada uno.
    let subjectIds: string[] | undefined;
    if (query.mine) {
      const mios = await this.prisma.character.findMany({
        where: { campaignId, ownerId: userId },
        select: { id: true },
      });
      // Sin personajes propios, «las mías» son ninguna — y eso es una lista vacía, no la lista
      // entera. Un `undefined` aquí habría enseñado las de toda la mesa.
      subjectIds = mios.map((c) => c.id);
    }

    return this.events.list(
      userId,
      campaignId,
      { limit: query.limit, cursor: query.cursor, sessionId: query.sessionId },
      {
        types: TIPOS_DE_TIRADA,
        // **Los dos filtros se cruzan, no se pisan.** Antes escribían la misma clave del `where` y
        // el segundo ganaba en silencio: pedir «las de mi personaje A **y** solo las mías» devolvía
        // las de todos mis personajes. Un filtro que se acepta y se ignora es peor que uno que no
        // existe. Ahora `mine` acota la lista y `characterId` la acota más.
        ...(subjectIds
          ? {
              subjectIds: query.characterId
                ? subjectIds.filter((id) => id === query.characterId)
                : subjectIds,
            }
          : query.characterId
            ? { subjectId: query.characterId }
            : {}),
      },
    );
  }

  /**
   * ¿Puede quien acaba de tirar ver su propia tirada?
   *
   * **Solo se consulta el usuario cuando la respuesta puede ser «no»**, es decir cuando la
   * visibilidad excluye al autor: en el resto de los casos `canView` ya devuelve `true` con lo
   * que hay a mano, y una consulta más por cada tirada de la mesa sí se nota.
   */
  private async puedeVerse(
    userId: string,
    campaignId: string,
    role: Role | null,
    visibility: Visibility,
  ): Promise<boolean> {
    const conLoQueHayAMano = canView(
      { userId, role, isAdmin: false },
      { visibility, createdById: userId, grantedUserIds: [] },
    );
    if (conLoQueHayAMano) return true;
    // Un administrador de la plataforma sí lo ve, y eso lo decide `canView`, no este servicio.
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return canView(
      { userId, role, isAdmin: user?.isAdmin ?? false },
      { visibility, createdById: userId, grantedUserIds: [] },
    );
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
  // **Y admite que el d20 traiga su relanzado.** `1d20r1` es la suerte del mediano, y era
  // justo la combinación que se caía: el patrón exigía que el d20 no llevara nada detrás, así que
  // pedir ventaja sobre `1d20r1` **la descartaba en silencio** —ni error, ni rastro en el suceso—.
  // Lo cazó una revisión contra la fuente. El orden queda `2d20r1kh1`, que es el que la sintaxis
  // exige y el que la regla pide: se relanza el dado y de lo que quede se conserva el mejor.
  const reemplazado = expression.replace(
    /^(\s*)(1?d20)((?:r(?:<=|>=|<|>)?\d+)?)(?![0-9a-zA-Z])/i,
    `$1 2d20$3${sufijo}`,
  );
  return reemplazado === expression ? expression : reemplazado.trim();
}
