/**
 * Cuántos dados puede traer una tirada como mucho. Es el producto de los límites del evaluador
 * (`apps/api/src/dice/dice.ts`, `DICE_LIMITS`): 10 términos × 100 dados × 2 (cada dado se relanza
 * UNA vez como mucho). Vive aquí porque el esquema de la respuesta lo necesita y `@dnd/shared` no
 * importa de la API; `dice.spec.ts` comprueba que los dos números no se separen.
 *
 * Hasta el 2026-09-17 el tope era 100 y ya lo superaba `100d6+100d6` sin relanzar: nadie parseaba
 * la salida, así que no rompía, pero el contrato mentía.
 */
export const MAX_DADOS_POR_TIRADA = 2000;
