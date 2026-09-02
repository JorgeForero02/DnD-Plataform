import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { SpendResourceInput, UpsertResourceInput } from "@dnd/shared";
import type { Prisma } from "@prisma/client";
import { MembershipService } from "../../campaigns/membership.service";
import { GameEventsService } from "../../game-events/game-events.service";
import { PrismaService } from "../../prisma/prisma.service";
import { SRD_CLASSES } from "../../rules/catalog/classes";
import type { CharacterSheet } from "../../rules/catalog";
import { requireOwnerOrDM, requireVisibleCharacter } from "../common/viewer";

// Tarea 2A.8 — recursos consumibles, y la siembra de los que da la clase.
//
// **Inspiración, furia, ki, dados de golpe y espacios de conjuro son el mismo mecanismo**: un
// contador con máximo que un descanso repone. `packages/shared/src/character-state.schema.ts`
// ya lo dice; este servicio es la única puerta de escritura sobre `CharacterResource`.

@Injectable()
export class ResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: GameEventsService,
  ) {}

  async list(userId: string, campaignId: string, characterId: string) {
    await requireVisibleCharacter(this.prisma, this.membership, userId, campaignId, characterId);
    return this.prisma.characterResource.findMany({
      where: { characterId },
      orderBy: { key: "asc" },
    });
  }

  /**
   * Crea o ajusta un recurso. **`grantedBy` manda**: decide quién puede tocar la fila el valor
   * que YA tiene esa fila —o, si es la primera vez que se ve esa clave, el que trae esta misma
   * petición—. Un dueño no puede aflojar después, desde su propio PUT, un `DM_ONLY` que el DM
   * ya puso: por eso se mira `existing.grantedBy` primero, y solo se cae al del cuerpo cuando
   * no hay fila todavía.
   */
  async upsert(
    userId: string,
    campaignId: string,
    characterId: string,
    input: UpsertResourceInput,
  ) {
    const character = await requireVisibleCharacter(
      this.prisma,
      this.membership,
      userId,
      campaignId,
      characterId,
    );
    const isDM = await requireOwnerOrDM(this.membership, campaignId, userId, character);

    const existing = await this.prisma.characterResource.findUnique({
      where: { characterId_key: { characterId, key: input.key } },
    });
    const grantor = existing?.grantedBy ?? input.grantedBy;
    if (grantor === "DM_ONLY" && !isDM) {
      throw new ForbiddenException("Este recurso solo lo sube el DM.");
    }

    return this.prisma.characterResource.upsert({
      where: { characterId_key: { characterId, key: input.key } },
      create: {
        characterId,
        key: input.key,
        label: input.label,
        current: input.current,
        max: input.max ?? null,
        resetOn: input.resetOn,
        grantedBy: input.grantedBy,
      },
      update: {
        label: input.label,
        current: input.current,
        max: input.max ?? null,
        resetOn: input.resetOn,
        grantedBy: input.grantedBy,
      },
    });
  }

  /** Gastar es un delta negativo; reponer, uno positivo. El recorte es el mismo en los dos. */
  spend(
    userId: string,
    campaignId: string,
    characterId: string,
    key: string,
    input: SpendResourceInput,
  ) {
    return this.adjust(
      userId,
      campaignId,
      characterId,
      key,
      -input.amount,
      input.reason,
      "RESOURCE_SPENT",
    );
  }

  restore(
    userId: string,
    campaignId: string,
    characterId: string,
    key: string,
    input: SpendResourceInput,
  ) {
    return this.adjust(
      userId,
      campaignId,
      characterId,
      key,
      input.amount,
      input.reason,
      "RESOURCE_RESTORED",
    );
  }

  private async adjust(
    userId: string,
    campaignId: string,
    characterId: string,
    key: string,
    delta: number,
    reason: string | undefined,
    type: "RESOURCE_SPENT" | "RESOURCE_RESTORED",
  ) {
    const character = await requireVisibleCharacter(
      this.prisma,
      this.membership,
      userId,
      campaignId,
      characterId,
    );
    // Gastar o reponer no concede nada nuevo —solo mueve el contador—, así que no pasa por el
    // candado de `grantedBy`: ese candado protege quién puede SUBIR el máximo o crear el
    // recurso, no quién puede usarlo dentro de lo que ya tiene.
    await requireOwnerOrDM(this.membership, campaignId, userId, character);

    const resource = await this.prisma.characterResource.findUnique({
      where: { characterId_key: { characterId, key } },
    });
    if (!resource) throw new NotFoundException("Resource not found");

    // **Delta, recortado entre 0 y `max`.** Sin tope conocido (`max` nulo), solo se recorta
    // por abajo: un recurso sin máximo declarado no tiene techo que respetar.
    const tentativo = resource.current + delta;
    const tope = resource.max ?? Number.POSITIVE_INFINITY;
    const remaining = Math.min(Math.max(tentativo, 0), tope);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.characterResource.update({
        where: { id: resource.id },
        data: { current: remaining },
      });
      await this.events.record(
        userId,
        campaignId,
        {
          subjectType: "character",
          subjectId: characterId,
          visibility: character.visibility,
          payload: {
            type,
            key: resource.key,
            label: resource.label,
            amount: Math.abs(delta),
            remaining,
            reason,
          },
        },
        tx,
      );
      return updated;
    });
  }

  /**
   * Los recursos que la clase implica: dados de golpe y espacios de conjuro. Se llama al crear
   * o subir de nivel un personaje —eso vive en `characters/`, fuera de esta frontera— para que
   * ese llamador no reimplemente la tabla de espacios ni la del dado de golpe.
   *
   * **`level` aparte de `sheet`**: `CharacterSheet` (`../../rules/catalog`) no lleva el nivel
   * del personaje —lo consume ya resuelto en `spellSlots`—, y el máximo de dados de golpe SÍ es
   * el nivel en bruto. Pedirlo aparte es más honesto que adivinarlo de la hoja.
   */
  async seedResourcesFor(
    characterId: string,
    sheet: Pick<CharacterSheet, "classKey" | "spellSlots" | "spellSlotResetOn">,
    level: number,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    const clase = SRD_CLASSES.find((c) => c.key === sheet.classKey);
    // 8 de respaldo si la clave no resuelve: nunca deja al personaje sin dados de golpe.
    const hitDieSize = clase?.hitDie ?? 8;
    const hitDiceKey = `hit-dice-d${hitDieSize}`;

    await client.characterResource.upsert({
      where: { characterId_key: { characterId, key: hitDiceKey } },
      create: {
        characterId,
        key: hitDiceKey,
        label: `Dados de golpe (d${hitDieSize})`,
        current: level,
        max: level,
        // NONE, no LONG_REST: su reposición no es "a máximo" como cualquier otro consumible,
        // es "la mitad, redondeando hacia arriba, mínimo uno" — una regla que solo el
        // descanso largo sabe aplicar (`RestService`), y por eso el reseteo genérico la deja
        // en paz.
        resetOn: "NONE",
        grantedBy: "OWNER",
      },
      // Al subir de nivel el tope sube con él; lo ya gastado no se toca.
      update: { max: level },
    });

    for (const slot of sheet.spellSlots) {
      const key = `spell-slot-${slot.spellLevel}`;
      await client.characterResource.upsert({
        where: { characterId_key: { characterId, key } },
        create: {
          characterId,
          key,
          label: `Espacios de conjuro de nivel ${slot.spellLevel}`,
          current: slot.slots,
          max: slot.slots,
          // El brujo repone en descanso CORTO; el resto, en el largo. `spellSlotResetOn` ya
          // trae esa distinción resuelta desde `rules/catalog/spell-slots.ts`.
          resetOn: sheet.spellSlotResetOn,
          grantedBy: "OWNER",
        },
        update: { max: slot.slots, resetOn: sheet.spellSlotResetOn },
      });
    }
  }
}
