import { Injectable, NotFoundException } from "@nestjs/common";
import type { GrantTemporaryModifierInput } from "@dnd/shared";
import { MembershipService } from "../../campaigns/membership.service";
import { GameEventsService } from "../../game-events/game-events.service";
import { PrismaService } from "../../prisma/prisma.service";
import { requireOwnerOrDM, requireVisibleCharacter } from "../../common/character-viewer";
import { condicionesActivas } from "../conditions/vencimiento";

// Plan 13, ficha M8 — **«+2 a Fuerza durante una hora»**.
//
// Lo pidieron **los jugadores, por su nombre** —«subidas y bajadas de atributos temporales»— y no
// estaba escrito en ningún plan: ni en 2A, ni en 2C, ni en 2.5. Era un hueco de alcance.
//
// ## Lo que este servicio NO hace, y es lo importante
//
// **No calcula nada.** La suma vive en el motor (`rules/engine.ts`), que ya sabe qué es un `add` y
// cómo anotarlo en la traza; la conversión de fila a modificador vive en `character-sheet.service`,
// que es quien conoce el reloj. Aquí solo se conceden, se listan y se quitan.
//
// **No toca la columna del personaje.** Un modificador temporal no muta la Fuerza: se suma al
// derivarla. Si mutara, al caducar habría que restar y cualquier fallo dejaría al personaje
// cambiado para siempre.
//
// **Y no se monta sobre las condiciones**, aunque compartan la caducidad: una condición es una
// regla del SRD con nombre cerrado, y esto es un número arbitrario con un motivo escrito a mano.

@Injectable()
export class TemporaryModifiersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: GameEventsService,
  ) {}

  /**
   * Los que lleva, **cada uno diciendo si ya venció** (misma forma que las condiciones, 2C.4).
   *
   * `expired` se **deriva** y no se guarda: guardarlo sería una segunda verdad que puede discrepar,
   * y obligaría a un barrido que, si no corre, deja un +2 sumando después de su hora.
   *
   * **Y el vencido sigue en la lista**, apagado. Es la decisión D-2C-2: si desapareciera, el
   * jugador vería su Fuerza bajar sin saber por qué, que es justo la mitad del valor de la ficha.
   */
  async list(userId: string, campaignId: string, characterId: string) {
    await requireVisibleCharacter(this.prisma, this.membership, userId, campaignId, characterId);
    const [filas, campana] = await Promise.all([
      this.prisma.temporaryModifier.findMany({
        where: { characterId },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } }),
    ]);
    const vivos = new Set(
      condicionesActivas(
        filas.map((f) => ({ ...f, key: f.id })),
        campana.clockSeconds,
      ).map((f) => f.id),
    );
    return filas.map((f) => ({ ...f, expired: !vivos.has(f.id) }));
  }

  /**
   * Conceder.
   *
   * **Quién puede: el DM o el dueño del personaje**, y esto es una decisión que el plan pedía
   * escribir. El argumento es que la mayoría de estos efectos salen de algo que el jugador hace
   * —beberse una poción que ya está en su inventario— y obligar a que el DM los teclee convertiría
   * una acción de un turno en una petición.
   *
   * **Ojo: la mitad de ese argumento caducó el 2026-09-06.** Aquí ponía además que «es la misma
   * autoridad que ya gobierna gastar un recurso **o aplicarse una condición**, así que no abre
   * ninguna puerta nueva», y desde el paso 1 aplicarse una condición del SRD **ya no es del
   * dueño**. Así que esto sí es hoy la puerta más ancha que le queda a un jugador para
   * concederse una mecánica —un `+10` al ataque, sin caducidad, con el motivo que quiera— y la
   * decisión de dejarla abierta se mantiene por su OTRA mitad, la de la poción, no por la
   * comparación. Queda anotado en `docs/06-pendientes.md` con lo que se descartó.
   *
   * **La duración es del reloj de campaña**, no de pared: «una hora» son 3600 segundos de partida.
   * Se guarda el instante absoluto en que vence y no la duración, por lo mismo que las condiciones:
   * con una duración habría que saber «desde cuándo», y ese dato es otra columna que puede
   * discrepar.
   */
  async grant(
    userId: string,
    campaignId: string,
    characterId: string,
    input: GrantTemporaryModifierInput,
  ) {
    const character = await requireVisibleCharacter(
      this.prisma,
      this.membership,
      userId,
      campaignId,
      characterId,
    );
    // **Solo el DM** (ficha P1, puerta B — cerrada el 2026-09-07).
    //
    // Hasta hoy esto era `requireOwnerOrDM`, y con eso un jugador podía **darse `+10` al ataque,
    // sin caducidad y con el motivo que quisiera**, entrando en la derivación de su propia hoja.
    // La puerta se concedió con un caso de uso real —«beberse una poción que ya llevas encima no
    // debería ser una petición al DM»— y **ese caso dejó de necesitarla el 2026-09-06**: consumir
    // un objeto aplica sus efectos por su cuenta, escribiendo **directo con el `tx`**
    // (`inventory.service.ts:546`) sin pasar por aquí. Se comprobó antes de cerrarla, y hay una
    // prueba que lo sostiene (`inventory.service.spec.ts`, «beberse una poción sigue aplicando…»).
    //
    // Descartada la variante de «caducidad obligatoria para el jugador», con su motivo: un `+10`
    // que dura todo el combate sigue siendo un `+10` en el combate.
    //
    // `remove` sigue siendo dueño-o-DM **a propósito**: ahí el reparto es otro y no se cambia de
    // paso en un commit que va de conceder.
    await this.membership.requireDM(campaignId, userId);

    return this.prisma.transaction(async (tx) => {
      const campana = await tx.campaign.findUniqueOrThrow({ where: { id: campaignId } });
      const expiresAtClock =
        input.durationSeconds === undefined ? null : campana.clockSeconds + input.durationSeconds;

      const fila = await tx.temporaryModifier.create({
        data: {
          characterId,
          target: input.target,
          amount: input.amount,
          reason: input.reason,
          expiresAtClock,
          grantedById: userId,
        },
      });

      await this.events.record(
        userId,
        campaignId,
        {
          subjectType: "character",
          subjectId: characterId,
          // **La visibilidad del personaje**, no `PLAYERS` fijo: un PNJ `DM_ONLY` al que se le pone
          // un +2 no puede anunciarle a la mesa que existe. Es la fuga que ya volvió dos veces, en
          // 2.5.2 y en 2C, y por eso está escrita aquí en vez de recordada.
          visibility: character.visibility,
          payload: {
            type: "TEMP_MODIFIER_GRANTED",
            target: fila.target,
            amount: fila.amount,
            reason: fila.reason,
            ...(expiresAtClock !== null ? { expiresAtClock } : {}),
          },
        },
        tx,
      );
      return fila;
    });
  }

  /**
   * Quitarlo a mano: lo que hace el DM con un vencido que ya no quiere ver, o con uno que puso por
   * error. **No emite `TEMP_MODIFIER_EXPIRED`** — eso lo dice el reloj cuando vence solo, y usarlo
   * aquí haría que el registro contara un vencimiento que no ocurrió.
   */
  async remove(userId: string, campaignId: string, characterId: string, id: string) {
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
      "Solo el DM o el dueño puede quitar un modificador temporal.",
    );
    // Acotado por el personaje: un id suelto de otra hoja no se borra desde aquí.
    const fila = await this.prisma.temporaryModifier.findFirst({ where: { id, characterId } });
    if (!fila) throw new NotFoundException("Temporary modifier not found");
    await this.prisma.temporaryModifier.delete({ where: { id } });
    return { deleted: true };
  }
}
