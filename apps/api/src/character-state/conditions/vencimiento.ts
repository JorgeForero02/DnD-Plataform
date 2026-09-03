// Tarea 2C.4 — **una condición con fecha de caducidad**, y qué significa que caduque.
//
// **Puro**: sin Nest, sin Prisma. Entra la fila y el reloj de la campaña; sale si sigue viva.
//
// ## Vence sola, pero NO se borra (decisión del autor, D-2C-2)
//
// Comprobado en la práctica antes de decidirlo: el estándar es la caducidad automática —Foundry
// lo trae en el núcleo desde la v11, y el módulo *Times Up* que lo hacía antes se retiró por
// innecesario— **y desde la v11.3 al vencer se DESACTIVA el efecto en vez de borrarlo**.
//
// Eso es exactamente lo que se hace aquí: al pasar su hora, la condición deja de calcular —no
// frena la velocidad, no parte los PG— pero **sigue en la hoja, marcada como vencida y con la
// hora en que venció**, y es el DM quien la retira o la renueva. Si desapareciera sola, el jugador
// vería cambiar sus números sin saber por qué, y el DM tendría que llevar la cuenta a mano, que es
// volver al papel.
//
// ## Y el vencimiento se DERIVA, no se guarda
//
// No hay ningún proceso que barra la base cada minuto marcando condiciones. «¿Está vencida?» es
// una resta contra el reloj, y calcularla al leer tiene dos propiedades que un barrido no puede
// dar: **no puede quedarse a medias** —si el barrido falla o nadie lo ejecuta, la condición
// seguiría frenando a alguien— y **no hay dos verdades** que puedan discrepar. Lo único que sí se
// escribe es el suceso en la línea de tiempo, para que el jugador vea POR QUÉ dejó de estar
// envenenado.

/** Lo que hace falta de una fila de `CharacterCondition` para saber si sigue viva. */
export interface CondicionConVencimiento {
  key: string;
  level?: number | null;
  /** Segundos del reloj de la campaña en que vence. `null` = indefinida, la quita el DM. */
  expiresAtClock?: number | null;
}

/**
 * ¿Ha vencido ya?
 *
 * **El instante exacto cuenta como vencida** (`>=`): una condición que dura una hora aplicada a
 * las 12:00 termina a las 13:00, no dura un segundo más. La alternativa —seguir activa en el
 * segundo justo de su vencimiento— es la clase de detalle que nadie prueba y que en una mesa se
 * discute una vez y no se olvida.
 */
export function condicionVencida(
  condicion: CondicionConVencimiento,
  relojSegundos: number,
): boolean {
  if (condicion.expiresAtClock === null || condicion.expiresAtClock === undefined) return false;
  return relojSegundos >= condicion.expiresAtClock;
}

/**
 * Las que siguen calculando. **Es el filtro que tiene que atravesar todo lo que derive algo de
 * una condición**: la velocidad efectiva, los PG máximos y lo que venga después.
 */
export function condicionesActivas<T extends CondicionConVencimiento>(
  condiciones: T[],
  relojSegundos: number,
): T[] {
  return condiciones.filter((c) => !condicionVencida(c, relojSegundos));
}

/**
 * Las que **acaban de vencer** al avanzar el reloj de `desde` a `hasta`.
 *
 * Es lo que convierte la caducidad en algo que el jugador ve: por cada una de estas se escribe un
 * suceso en la línea de tiempo. El intervalo es abierto por la izquierda y cerrado por la derecha
 * —`desde < vence <= hasta`— para que un avance de reloj no vuelva a anunciar lo que el anterior
 * ya anunció.
 */
export function vencidasEnElTramo<T extends CondicionConVencimiento>(
  condiciones: T[],
  desde: number,
  hasta: number,
): T[] {
  return condiciones.filter(
    (c) =>
      c.expiresAtClock !== null &&
      c.expiresAtClock !== undefined &&
      c.expiresAtClock > desde &&
      c.expiresAtClock <= hasta,
  );
}
