import type { Prisma, Character } from "@prisma/client";
import type { CharacterSpellState } from "@dnd/shared";
import { GameEventsService } from "../game-events/game-events.service";
import { arranqueDe, modeloDePreparacion, SRD_SPELL_POR_KEY } from "../rules/catalog";

// Tarea 3A.2 (Task 3, T10), D-CF-125 — el libro con el que nace un personaje al fijar su primera
// clase: pura (calcula qué sembrar con `arranqueDe`) + escritura directa con el `tx` que le
// pasan.
//
// **Fichero propio, y no un método de `SpellbookService` ni una función dentro de
// `spellbook.service.ts`.** `character-sheet.service.ts` la llama desde dentro de su propia
// transacción (`updateSheet`, bloque `character.classKey === null`). Si viviera en
// `spellbook.service.ts` —que SÍ importa `CharacterSheetService` para inyectarlo en
// `SpellbookService`—, `character-sheet.service.ts` importando `sembrarLibro` desde ahí crearía
// un ciclo de módulos DE VERDAD entre los dos ficheros (no solo entre los `@Module`), con el
// riesgo añadido de un `require` circular en tiempo de ejecución. Este fichero no importa
// `character-sheet.service.ts` ni `SpellbookService`: solo el catálogo y `GameEventsService`,
// que `CharactersModule` ya trae.
export async function sembrarLibro(
  tx: Prisma.TransactionClient,
  events: GameEventsService,
  userId: string,
  campaignId: string,
  character: { id: string; visibility: Character["visibility"] },
  classKey: string,
  level: number,
): Promise<number> {
  const claves = arranqueDe(classKey, level);
  if (claves.length === 0) return 0;

  const modelo = modeloDePreparacion(classKey);
  const estado: CharacterSpellState | null =
    modelo === "LIBRO" ? "EN_EL_LIBRO" : modelo === "CONOCIDOS" ? "CONOCIDO" : null;
  if (!estado) return 0;

  await tx.characterSpell.createMany({
    data: claves.map((spellKey) => ({ characterId: character.id, spellKey, estado })),
    skipDuplicates: true,
  });

  for (const spellKey of claves) {
    const spell = SRD_SPELL_POR_KEY.get(spellKey);
    await events.record(
      userId,
      campaignId,
      {
        subjectType: "character",
        subjectId: character.id,
        visibility: character.visibility,
        payload: {
          type: "SPELLBOOK_CHANGED",
          spellKey,
          name: spell?.nameEs ?? spell?.nameEn ?? spellKey,
          cambio: "SEMBRADO",
          estado,
        },
      },
      tx,
    );
  }

  return claves.length;
}
