import { AsyncLocalStorage } from "node:async_hooks";
import { Logger } from "@nestjs/common";

// Ficha M2B-3 — **el motor de reglas se disparaba dentro de la transacción de quien lo llamaba y
// escribía fuera de ella.**
//
// El fallo, en tres partes, medido el 2026-09-03:
//
//  1. `GameEventsService.record` acepta una transacción para que el suceso y el cambio que
//     describe aterricen juntos, y **emitía el suceso en ese mismo instante** — con la
//     transacción todavía abierta. El motor de reglas escucha esa emisión y trabaja con
//     `PrismaService`, es decir **por otra conexión**: leía el mundo de ANTES del suceso y
//     escribía sus efectos FUERA de la transacción. Un cambio que se deshacía dejaba sus efectos
//     puestos.
//  2. Dos conexiones escribiendo las mismas filas en orden inverso es, además, la receta del
//     abrazo mortal de Postgres (40P01) que este proyecto ya pagó dos veces.
//  3. Y `emit` **no se esperaba**, así que el comentario que prometía «el motor evalúa dentro de
//     la petición» era falso: la evaluación quedaba suelta en la cola de microtareas.
//
// **El arreglo es un buzón por transacción.** Mientras hay una transacción abierta, `record`
// **encola** la emisión en vez de dispararla; cuando la transacción ha hecho *commit*, el buzón
// se vacía y entonces sí se emite, esperando cada emisión. Si la transacción se deshace, el buzón
// se descarta con ella y no se emite nada.
//
// El buzón viaja por `AsyncLocalStorage` y no como parámetro a propósito: `record` se llama desde
// el fondo de servicios que ya reciben la transacción, y añadir un argumento más a toda esa
// cadena es un argumento más que se olvida. Lo que **no** se deja a la memoria de nadie es abrir
// el buzón: lo abre `PrismaService.transaction`, que es la única puerta a una transacción en este
// proyecto (`apps/api/src/prisma/no-transaction-suelta.spec.ts` lo comprueba barriendo el código).

/** Una emisión aplazada. Se ejecuta cuando la transacción que la encoló ha confirmado. */
export type EmisionAplazada = () => Promise<unknown>;

const buzon = new AsyncLocalStorage<EmisionAplazada[]>();
const logger = new Logger("SucesosTrasCommit");

/**
 * Encola una emisión para después del *commit*.
 *
 * Devuelve `false` si no hay ninguna transacción abierta en este contexto: entonces no hay nada
 * que esperar y quien llama debe emitir en el momento.
 */
export function encolarTrasCommit(emision: EmisionAplazada): boolean {
  const cola = buzon.getStore();
  if (!cola) return false;
  cola.push(emision);
  return true;
}

/**
 * Ejecuta `fn` con un buzón abierto y lo vacía **solo si `fn` terminó bien**.
 *
 * **Si ya hay un buzón abierto, se reutiliza** en vez de abrir uno nuevo: en una transacción
 * anidada, vaciar el buzón del interior emitiría antes de que la de fuera confirmara, que es
 * justo el fallo que esto arregla.
 *
 * **Una emisión que falla no arrastra a las demás ni a lo que ya está confirmado.** Cuando el
 * buzón se vacía, el cambio ya está escrito: convertir un fallo del motor en un 500 sobre una
 * operación que sí funcionó sería mentirle a quien la pidió. Se registra y se sigue.
 */
export async function conBuzonDeSucesos<T>(fn: () => Promise<T>): Promise<T> {
  if (buzon.getStore()) return fn();

  const cola: EmisionAplazada[] = [];
  const resultado = await buzon.run(cola, fn);

  for (const emision of cola) {
    try {
      await emision();
    } catch (error) {
      logger.error(
        "una emisión aplazada falló después del commit",
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  return resultado;
}
