import type { GameEventPayload } from "@dnd/shared";

// **De un suceso del registro a uno de los cinco tipos de mensaje de la maqueta**
// (`prototipo/src/features/HiloDeSesion.tsx`): narración, personaje, tirada, sello y sistema.
//
// La maqueta lleva el tipo escrito a mano en sus datos de ejemplo (`MensajeHilo.tipo`). Aquí no
// hay tal campo y **no se inventa**: el tipo se deduce del `type` del suceso, que es el único
// dato real que dice qué pasó. Este fichero es esa tabla, y nada más — la frase la sigue
// escribiendo `linea-de-log.ts`, que es su dueño único.
//
// **El `switch` no tiene `default`, a propósito**, por la misma razón que el de `linea-de-log.ts`
// (ficha L1): sobre una unión discriminada eso lo hace exhaustivo, así que el día que el carril
// del motor añada un tipo de suceso **el build se pone rojo aquí** en vez de caer en silencio en
// un cajón de sastre. Un tipo nuevo sin clasificar es una decisión que alguien tiene que tomar,
// no un valor por defecto.

export type TipoDeMensaje = "sello" | "narracion" | "personaje" | "tirada" | "sistema";

/**
 * Qué forma tiene este suceso en el hilo.
 *
 * **Sello** — lo que parte el hilo en tramos y se lee de un vistazo sin leer la frase: la
 * anotación que alguien selló a mano, y los cuatro hitos que abren y cierran algo (la sesión, el
 * combate). En la maqueta el sello de ejemplo es literalmente la cabecera de una sesión
 * («Sesión 14 · El Puerto Viejo, almacén cuatro»), así que estos cuatro caen ahí por parecido de
 * función, no por analogía.
 *
 * **Narración** — el mundo hablando. Solo los sucesos de entidad: revelar, abrir, comentar y enlazar
 * una ficha son lo único del registro que cuenta algo del mundo y no de una persona.
 *
 * **Tirada** — los cuatro sucesos que traen números tirados. Se pintan incrustados, con «De dónde
 * sale».
 *
 * **Personaje** — lo que le pasa a alguien de la mesa: puntos de golpe, condiciones, recursos,
 * objetos, dinero, nivel. Llevan la voz de quien actuó, con su color.
 *
 * **Sistema** — el resto, y **ahí caen los que no encajan en ninguno de los cuatro**: las marcas,
 * los conjuntos y las señales del motor de reglas, la anulación manual del DM, el reloj y el paso
 * de turno y asalto. Son andamiaje de la partida, no la partida; van en cursiva y apagados.
 */
export function tipoDeMensaje(p: GameEventPayload): TipoDeMensaje {
  switch (p.type) {
    case "SESSION_NOTE":
    case "SESSION_STARTED":
    case "SESSION_CLOSED":
    case "ENCOUNTER_STARTED":
    case "ENCOUNTER_ENDED":
    case "ENCOUNTER_CANCELLED":
      // Cancelar es el otro extremo de empezar: un sello de la sesión, no una línea de sistema.
      return "sello";

    // Comentar una ficha (Ola 3) entra aqui y no con los de persona: es el mundo hablando,
    // igual que abrirla, revelarla o enlazarla, aunque lo escriba alguien de la mesa.
    case "ENTITY_OPENED":
    case "ENTITY_REVEALED":
    case "ENTITY_LINKED":
    case "ENTITY_COMMENTED":
    case "ENTITY_RETYPED":
      // Reclasificar (I16) es del MUNDO, no andamiaje: la ficha cambia de naturaleza y eso es un
      // hecho que la mesa puede querer leer y deshacer. Va con abrir, revelar y enlazar.
      return "narracion";

    // PNJ del mundo y la mesa (E-PM: spec §3.2) — «Garrik entra en escena» es el mundo hablando,
    // igual que revelar una ficha (E-PM-3); va con ENTITY_REVEALED.
    case "NPC_REVEALED":
      return "narracion";

    // Sentarse a la mesa es de la campana, no del mundo ni de un personaje: andamiaje. Y la
    // batuta (I19) es **direccion del DM**, no algo que la mesa vea pasar: su suceso va `DM_ONLY`,
    // asi que solo lo lee el, y lo que la mesa ve son los EFECTOS con su propia visibilidad.
    //
    // (El comentario va aqui arriba y no entre los dos `case`: entre etiquetas rompe
    // `no-fallthrough`, y ya nos mordio una vez el 2026-09-06.)
    case "MEMBER_JOINED":
    case "MEMBER_ROLE_CHANGED":
    case "DM_EXECUTED":
      return "sistema";

    // Ocultar (E-PM-4) es DM_ONLY y despierta el canal en vivo, pero no es el mundo hablando ni
    // le pasa a nadie de la mesa que lo lea: andamiaje, con MEMBER_JOINED y DM_EXECUTED.
    case "NPC_HIDDEN":
      return "sistema";

    // La iniciativa que reparte el sistema (2026-09-05) trae un número tirado, igual que las
    // demás: no deja de ser una tirada por venir forzada.
    case "ABILITY_ROLL":
    case "DEATH_SAVE":
    case "TABLE_ROLLED":
    case "ATTACK_RESOLVED":
    case "INITIATIVE_ROLLED_BY_SYSTEM":
      return "tirada";

    // D-CF-14: ajustar una pila (commit 4, M2B-8) y morir (commit 5, J5) le pasan a alguien de
    // la mesa, igual que el resto de este cubo — puntos de golpe, condiciones, objetos, dinero.
    case "HP_CHANGED":
    case "TEMP_HP_SET":
    case "REST_DECLARED":
    case "RESOURCE_SPENT":
    case "RESOURCE_RESTORED":
    case "RESOURCE_GIVEN":
    case "TEMP_MODIFIER_GRANTED":
    case "TEMP_MODIFIER_EXPIRED":
    case "LEVEL_CHANGED":
    case "XP_AWARDED": // Puerta de efectos §5 bis (D-CF-68/D-CF-69): dar XP, igual que subir de nivel.
    case "CONDITION_APPLIED":
    case "CONDITION_REMOVED":
    case "CONDITION_EXPIRED":
    case "MONEY_CHANGED":
    case "ITEM_ADDED":
    case "ITEM_MOVED":
    case "ITEM_REMOVED":
    case "ITEM_QUANTITY_CHANGED":
    case "CHARACTER_DIED":
    case "CHARACTER_ARCHIVED":
    case "CHARACTER_RESTORED":
    case "ACTION_SPENT":
      // Paso 2, tarea A2: gastar la economía del turno le pasa a alguien de la mesa, igual que
      // gastar un recurso o perder puntos de golpe.
      return "personaje";

    // 3A.2 (Task 2): usar una actividad y cambiar el libro de conjuros le pasan a alguien de la
    // mesa, igual que gastar un recurso (RESOURCE_SPENT) — el mismo cubo, por el mismo criterio.
    case "ACTIVITY_USED":
    case "SPELLBOOK_CHANGED":
      return "personaje";

    case "FLAG_SET":
    case "SET_CHANGED":
    case "SIGNAL_RAISED":
    case "MANUAL_OVERRIDE_SET":
    case "CLOCK_ADVANCED":
    case "TURN_ADVANCED":
    case "ROUND_ADVANCED":
    case "COMBATANT_SIDE_CHANGED":
    case "ACTIVE_TURN_SHIFTED":
      // Los dos últimos (paso 1, tarea 16) son el sistema contando un reajuste de la mesa, no una
      // persona hablando: el mismo cubo que pasar turno o subir de asalto.
      return "sistema";

    // Sacar del combate (E-PM, spec §3.3): el sistema contando que alguien salió del orden, con
    // COMBATANT_SIDE_CHANGED y ACTIVE_TURN_SHIFTED — no es el mundo hablando ni algo del personaje.
    case "COMBATANT_LEFT":
      return "sistema";
  }
}

/** Los tres filtros del registro lateral (Task 5, 3A.3): «Todo», y sus dos mitades. */
export type FiltroDeRegistro = "TODO" | "RELATO" | "NUMEROS";

/**
 * De los cinco cubos de `tipoDeMensaje` a las dos mitades que pide la maqueta: «Relato» y
 * «Números».
 *
 * **No se reclasifica suceso por suceso.** El encargo dice «tiradas/daño/economía/recursos =
 * Números, el resto = Relato», y esas cuatro palabras son, literalmente, la descripción que el
 * propio `tipoDeMensaje` ya da de sus cubos «tirada» (números tirados) y «personaje» (puntos de
 * golpe, condiciones, recursos, objetos, dinero, nivel — la mitad de "daño/economía/recursos"
 * vive ahí). Partir «personaje» en dos —por ejemplo, sacando `CONDITION_APPLIED` a Relato— sería
 * inventar una sexta categoría que el encargo no pide y que `tipoDeMensaje` no sostiene: esa
 * tabla ya decidió, caso por caso y con su propio comentario, qué le pasa a un personaje y qué es
 * el mundo hablando. Reclasificar aquí sería una segunda fuente de verdad para la misma pregunta.
 *
 * Así que el reparto es por CUBO, no por tipo de suceso:
 *
 *  - **Números** — `tirada` (las cuatro tiradas con número) y `personaje` (lo que le pasa a
 *    alguien: puntos de golpe, condiciones, recursos, objetos, dinero, nivel).
 *  - **Relato** — `sello` (los hitos que parten el hilo), `narracion` (el mundo revelándose) y
 *    `sistema` (el andamiaje: reloj, turnos, señales del motor). Ninguno de los tres trae una
 *    cifra que alguien quisiera filtrar buscando «cuánto pasó», y los tres son la mitad narrativa
 *    de la mesa: lo que se cuenta, no lo que se calcula.
 */
export function grupoDeMensaje(tipo: TipoDeMensaje): Exclude<FiltroDeRegistro, "TODO"> {
  switch (tipo) {
    case "tirada":
    case "personaje":
      return "NUMEROS";
    case "sello":
    case "narracion":
    case "sistema":
      return "RELATO";
  }
}

// **`colorDeVoz` se fue, y esto explica adónde** (plan 05, decisión D3, 2026-09-06).
//
// Vivía aquí una huella del `actorUserId` sobre CUATRO clases de Tailwind. Tenía dos defectos que
// no se arreglaban desde este fichero:
//
//   · **Cuatro tonos.** Con cinco personas en la mesa, dos compartían color y nadie podía
//     arreglarlo, porque no había nada que elegir.
//   · **La huella era del USUARIO.** Los dos personajes de un mismo jugador salían idénticos, que
//     es justamente lo que un color por personaje viene a distinguir.
//
// Y el elenco pintaba **cobre para todos** por su cuenta: dos cálculos para «¿de qué color es
// esta persona?». Ahora hay uno solo, en `apps/web/src/dominio/voces.ts` (`vozDePersonaje`), sobre
// ocho colores y con `Character.color` mandando cuando su jugador ha elegido.
//
// **No dejes aquí un envoltorio de compatibilidad.** Una función que reciba un `id` suelto vuelve
// a permitir colorear por el usuario sin que nadie lo note, que es el fallo que se acaba de quitar.
