// Plan 12 · 12.3 — **una sola constante para el sondeo, y sesenta segundos.**
//
// Antes de esto había **diez `refetchInterval` con cuatro valores distintos** repartidos por siete
// módulos, y solo dos salían de una constante (medido el 2026-09-05, ver
// `docs/superpowers/specs/2026-09-05-nervio-en-vivo-transporte-design.md` §6.1). «Alargarlo a
// 60 s» eran once ediciones, no una — y once números sueltos que hay que cambiar a la vez son
// once oportunidades de olvidar uno. **El olvidado no da error**: da una pantalla que se refresca
// sola cuando ya no hacía falta.
//
// **Sesenta segundos porque el sondeo ya no es el camino principal**: ahora hay canal en vivo
// (`features/live/canal.ts`) y esto es la **red de seguridad**. No se quita —un canal que se cae
// en silencio con el sondeo quitado es peor que no tener canal—, pero deja de ser lo que sostiene
// la mesa, así que su coste baja a la sexta parte.

export const SONDEO_DE_RED_DE_SEGURIDAD_MS = 60_000;

/**
 * **La excepción declarada, y es una sola**: la petición de tirada del DM.
 *
 * No es un estado que cambia de vez en cuando: es **una pregunta que espera respuesta**. El DM
 * dice «tirad percepción» en voz alta y mira la pantalla; un minuto de silencio entre la frase y
 * el botón hace que alguien tire con dados de plástico, que es lo que esta herramienta existe
 * para quitar. Con el canal en vivo el sondeo casi nunca es quien la trae, pero cuando el canal
 * falla, aquí sí importa la diferencia.
 */
export const SONDEO_DE_PETICIONES_MS = 15_000;
