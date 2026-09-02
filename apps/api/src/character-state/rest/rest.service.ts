import { Injectable } from "@nestjs/common";
import type { DeclareRestInput } from "@dnd/shared";
import type { Character, CharacterResource, Prisma } from "@prisma/client";
import { MembershipService } from "../../campaigns/membership.service";
import { rollExpression } from "../../dice/dice";
import { GameEventsService } from "../../game-events/game-events.service";
import { PrismaService } from "../../prisma/prisma.service";
import { abilityModifier } from "../../rules/engine";
import { maxHpDe } from "../common/max-hp";
import { requireOwnerOrDM, requireVisibleCharacter } from "../common/viewer";

// Tarea 2A.8 — descansos.
//
// **Corto y largo no son el mismo botón con distinto nombre.** El corto repone lo marcado
// `SHORT_REST` y permite gastar dados de golpe; el largo repone TODO lo consumible (lo del
// corto incluido —el descanso largo nunca deja peor a alguien que el corto—), devuelve los PG
// al máximo, recupera la MITAD de los dados de golpe (no todos, que es el error clásico) y
// baja un nivel de agotamiento.

const CLAVE_DADOS_DE_GOLPE = /^hit-dice-d(\d+)$/;

@Injectable()
export class RestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: GameEventsService,
  ) {}

  async declare(userId: string, campaignId: string, characterId: string, input: DeclareRestInput) {
    const character = await requireVisibleCharacter(
      this.prisma,
      this.membership,
      userId,
      campaignId,
      characterId,
    );
    await requireOwnerOrDM(
      this.membership,
      campaignId,
      userId,
      character,
      "Solo el DM o el dueño puede declarar un descanso.",
    );

    return this.prisma.$transaction(async (tx) => {
      const recursos = await tx.characterResource.findMany({ where: { characterId } });

      if (input.kind === "SHORT") {
        await this.reponerPorTipo(tx, recursos, "SHORT_REST");
        if (input.spendHitDice) {
          await this.gastarDadosDeGolpe(tx, character, recursos, input.spendHitDice);
        }
      } else {
        // Todo lo del corto, y además lo que solo repone el largo.
        await this.reponerPorTipo(tx, recursos, "SHORT_REST");
        await this.reponerPorTipo(tx, recursos, "LONG_REST");
        // `null` = a PG máximos, la misma convención que ya usa la columna
        // (`schema.prisma`, comentario de `Character.currentHp`): no hace falta calcular el
        // máximo real —eso pertenece a la derivación completa de la hoja, fuera de esta
        // frontera— para saber que "al máximo" es "sin materializar".
        // **Y se borran las salvaciones de muerte.** Un descanso largo devuelve los PG al
        // máximo, así que arrastrar fracasos de una caída anterior mataría a alguien por algo
        // que ya sobrevivió. Es la misma regla que aplica `changeHp` al curar desde 0, y estaba
        // igual de ausente en los dos caminos.
        await tx.character.update({
          where: { id: characterId },
          data: { currentHp: null, deathSaveSuccesses: 0, deathSaveFailures: 0 },
        });
        await this.recuperarMitadDadosDeGolpe(tx, recursos);
        await this.bajarAgotamiento(tx, characterId);
      }

      await this.events.record(
        userId,
        campaignId,
        {
          subjectType: "character",
          subjectId: characterId,
          visibility: character.visibility,
          // El esquema de `REST_DECLARED` no lleva `reason` —a diferencia de casi todo lo
          // demás en `game-event.schema.ts`—, así que no se manda: mandarlo se quedaría
          // callado (Zod recorta lo que no reconoce) y sería un campo que parece guardarse y
          // no se guarda.
          payload: { type: "REST_DECLARED", rest: input.kind },
        },
        tx,
      );

      return tx.character.findFirstOrThrow({ where: { id: characterId } });
    });
  }

  private async reponerPorTipo(
    tx: Prisma.TransactionClient,
    recursos: CharacterResource[],
    resetOn: "SHORT_REST" | "LONG_REST",
  ) {
    for (const recurso of recursos) {
      if (recurso.resetOn === resetOn && recurso.max !== null && recurso.current !== recurso.max) {
        await tx.characterResource.update({
          where: { id: recurso.id },
          data: { current: recurso.max },
        });
      }
    }
  }

  /**
   * Descanso corto: se gastan hasta `cantidadPedida` dados de golpe (nunca más de los que
   * quedan) y se cura la suma de tirarlos más el modificador de Constitución **por dado**.
   */
  private async gastarDadosDeGolpe(
    tx: Prisma.TransactionClient,
    character: Character,
    recursos: CharacterResource[],
    cantidadPedida: number,
  ) {
    const dado = recursos.find((r) => CLAVE_DADOS_DE_GOLPE.test(r.key));
    if (!dado) return; // sin dados de golpe modelados (ficha sin clase), no hay nada que gastar
    const cantidad = Math.min(cantidadPedida, dado.current);
    if (cantidad <= 0) return;

    const caras = Number(CLAVE_DADOS_DE_GOLPE.exec(dado.key)![1]);
    const modCon = abilityModifier(character.con ?? 10);

    let curado = 0;
    for (let i = 0; i < cantidad; i++) {
      curado += rollExpression(`1d${caras}`).total + modCon;
    }
    // Un modificador de Constitución negativo por varios dados podría bajar la suma de cero:
    // un dado de golpe nunca hace daño, como mucho no cura nada.
    curado = Math.max(0, curado);

    await tx.characterResource.update({
      where: { id: dado.id },
      data: { current: dado.current - cantidad },
    });

    // Si `currentHp` es `null` (ya al máximo, por convención) la curación no tiene dónde ir:
    // es exactamente lo que pasa en la mesa cuando alguien se cura de sobra.
    if (character.currentHp !== null) {
      // **Y se topa contra los PG máximos.** La primera versión sumaba sin tope, así que dos
      // dados de golpe con suerte dejaban al personaje por encima de su máximo — un número que
      // en la mesa se nota enseguida y que nada más habría corregido, porque el máximo no se
      // guarda: se calcula. El tope se aplica **al escribir una curación**, que no contradice
      // la regla de «recortar al leer, nunca al recalcular»: esa regla existe para que subir de
      // nivel o bajar la Constitución no reescriba filas por debajo, no para dejar que una
      // curación invente puntos que el personaje no tiene.
      const maximo = maxHpDe(character);
      const nuevo =
        maximo === null
          ? character.currentHp + curado
          : Math.min(maximo, character.currentHp + curado);
      await tx.character.update({
        where: { id: character.id },
        data: { currentHp: nuevo },
      });
    }
  }

  /**
   * Descanso largo: **la mitad de los dados de golpe, redondeando hacia ARRIBA, mínimo uno.**
   * "Todos" es el error clásico que esta cuenta existe para no cometer.
   */
  private async recuperarMitadDadosDeGolpe(
    tx: Prisma.TransactionClient,
    recursos: CharacterResource[],
  ) {
    for (const recurso of recursos) {
      if (!CLAVE_DADOS_DE_GOLPE.test(recurso.key) || recurso.max === null) continue;
      const recuperados = Math.max(1, Math.ceil(recurso.max / 2));
      const nuevo = Math.min(recurso.max, recurso.current + recuperados);
      if (nuevo !== recurso.current) {
        await tx.characterResource.update({ where: { id: recurso.id }, data: { current: nuevo } });
      }
    }
  }

  /** Un nivel de agotamiento menos. En el nivel 1, el descanso lo quita del todo. */
  private async bajarAgotamiento(tx: Prisma.TransactionClient, characterId: string) {
    const condicion = await tx.characterCondition.findUnique({
      where: { characterId_key: { characterId, key: "exhaustion" } },
    });
    if (!condicion || condicion.level === null) return;
    if (condicion.level <= 1) {
      await tx.characterCondition.delete({ where: { id: condicion.id } });
    } else {
      await tx.characterCondition.update({
        where: { id: condicion.id },
        data: { level: condicion.level - 1 },
      });
    }
  }
}
