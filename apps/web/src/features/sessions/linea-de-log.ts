import type {
  Coste,
  CombatantSide,
  EntityType,
  GameEventPayload,
  SessionNoteKind,
} from "@dnd/shared";
import { NOMBRE_BANDO } from "../../dominio/combate";
import { nombreAnulable, nombreCondicion } from "../character-sheet/vocabulario";
import { NOMBRE_MONEDA, NOMBRE_RANURA, NOMBRE_ZONA } from "../inventory/vocabulario";
import { NOMBRE_SELLO } from "./vocabulario";
import { ETIQUETA_DE_TIPO } from "../entities/resumen";
import { NOMBRE_TIPO_DANO } from "../../dominio/dano";
import type { NombresDelHilo } from "./nombres-del-hilo";

// De un suceso del log a **una línea que se lee en voz alta**.
//
// Vive aquí, una sola vez, por la regla del proyecto: ningún valor de enumeración llega a la
// pantalla. Y hace falta especialmente aquí porque el log es lo único que se lee seis semanas
// después, cuando ya nadie se acuerda de qué pasó.
//
// **La unión está CERRADA, y esa es la pieza que faltaba** (ficha L1). Aquí había un `default`
// que devolvía `Sin traducir: <clave>` y un comentario que lo llamaba «inalcanzable mientras la
// unión esté completa» — y la unión no lo estaba: le faltaban **catorce** de los treinta y tres
// tipos, no por descuido sino porque **cada tanda del carril del motor añade tipos y ninguna
// puede tocar `apps/web`**, que es donde vive la traducción. La deuda crecía sola con la frontera
// de carriles puesta, y la propia ficha lo había recontado ya una vez (de siete a doce) sin que
// eso la parara: cuando se escribieron estas líneas eran catorce, porque 2.5.3 había añadido
// `ATTACK_RESOLVED` después del último recuento.
//
// Sin `default`, `switch` sobre una unión discriminada es exhaustivo: si el motor añade un tipo,
// **el build del gráfico se pone rojo** en este fichero y en ningún otro sitio. Ese es el aviso
// que no existía. Escribir la frase catorce es trabajo de una tarde; el que no se escriba la
// quince en silencio es lo que arregla la deuda.
//
// **Tarea 11 (C4, #15): no existe `ACTIVITY_USED` en `gameEventPayloadSchema`.** El brief de esta
// tarea pedía traducirlo con sus objetivos («Elara lanza Bola de fuego sobre Klarg y Sylas») si
// llevaba destinatarios; se buscó en `@dnd/shared` y en `apps/api/src` y no hay ningún suceso de
// «usar una actividad» — `RESOURCE_SPENT` es lo más cercano y no lleva objetivos. Se deja
// anotado, no inventado: el día que el motor escriba ese suceso, esta unión deja de compilar
// (por el punto de arriba) y ahí toca escribir su frase, con sus objetivos si los trae.
//
// **Lo que se traduce y lo que no.** Las condiciones (`CONDITION_*`) y los valores derivados que
// el DM anula (`MANUAL_OVERRIDE_SET.target`) son enumeraciones cerradas del SRD y del motor, y
// tienen su forma legible en `features/character-sheet/vocabulario.ts` — el registro la importa,
// no la reescribe. En cambio las claves de `FLAG_SET`, `SIGNAL_RAISED` y `SET_CHANGED` **las
// escribe el DM** al montar sus reglas (`apps/api/src/rules-engine`, `world-state.service.ts`):
// no hay lista cerrada que traducir, así que se citan literalmente entre comillas. Inventarles
// una traducción sería cambiar lo que el DM escribió.

const REPOSO: Record<string, string> = { SHORT: "corto", LONG: "largo" };

/** El ritmo de marcha de 2C, en la forma en que lo escribe el SRD y lo lee una mesa. */
const RITMO: Record<string, string> = { FAST: "rápido", NORMAL: "normal", SLOW: "lento" };

/** El veredicto de un ataque (2.5.3). **Nunca la CA**: sale la palabra, no el número. */
const VEREDICTO: Record<string, string> = {
  HIT: "impacta",
  MISS: "falla",
  CRITICAL: "impacta con un crítico",
};

/** Qué disparó una tabla de la casa (2C.6). */
const DISPARO_DE_TABLA: Record<string, string> = {
  CRITICAL: "por un crítico",
  FUMBLE: "por una pifia",
};

/**
 * D-CF-14, commit 5 (J5). **Las tres, y solo las tres, formas de morir que el motor conoce**
 * (`gameEventPayloadSchema`, `@dnd/shared`). Ningún valor de esta enumeración llega a la
 * pantalla sin pasar por aquí, igual que `NOMBRE_ZONA` o `VEREDICTO` arriba.
 */
const CAUSA_DE_MUERTE: Record<"death_saves" | "massive_damage" | "exhaustion", string> = {
  death_saves: "tres fallos en las salvaciones",
  massive_damage: "daño masivo",
  exhaustion: "agotamiento",
};

/** El reloj de campaña vive en segundos (D-2C-1); una mesa no lee segundos. */
function duracionLegible(segundos: number): string {
  if (segundos < 60) return `${segundos} s`;
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas < 24) return resto ? `${horas} h ${resto} min` : `${horas} h`;
  const dias = Math.floor(horas / 24);
  const horasResto = horas % 24;
  return horasResto ? `${dias} d ${horasResto} h` : `${dias} d`;
}

/** «3 po y 5 pp», nunca «gp: 3». Solo las monedas que de verdad cambiaron. */
function dineroLegible(p: {
  cp?: number;
  sp?: number;
  ep?: number;
  gp?: number;
  pp?: number;
}): string {
  const partes = (["pp", "gp", "ep", "sp", "cp"] as const)
    .filter((k) => p[k] !== undefined && p[k] !== 0)
    .map((k) => `${p[k]! > 0 ? "+" : ""}${p[k]} ${NOMBRE_MONEDA[k]}`);
  return partes.length ? partes.join(", ") : "nada";
}

/**
 * Los tres costes que se nombran con un sustantivo propio (paso 2, tarea A2). `MOVEMENT` y
 * `FREE` tienen su propia frase más abajo —el primero lleva pies, el segundo no gasta nada— así
 * que no hace falta que esta tabla sea `Record<Coste, string>` completa.
 */
const NOMBRE_COSTE: Record<Extract<Coste, "ACTION" | "BONUS" | "REACTION">, string> = {
  ACTION: "una acción",
  BONUS: "una acción adicional",
  REACTION: "una reacción",
};

const RESULTADO_MUERTE: Record<string, string> = {
  SUCCESS: "un éxito",
  FAILURE: "un fracaso",
  CRIT_SUCCESS: "un 20 natural: vuelve en sí con 1 PG",
  CRIT_FAILURE: "un 1 natural: cuenta como dos fracasos",
};

/**
 * Tarea 11 del pulido (C4, #15). Lo que `lineaDeLog` necesita para nombrar a alguien en vez de
 * citar solo el rol de un suceso. **Opcional a propósito**: sin `ctx`, la unión entera se lee
 * exactamente como antes de esta tarea — es lo que comprueba `linea-de-log-sin-claves.test.ts`,
 * que no se ha tocado.
 */
export interface ContextoDeLinea {
  /** El nombre de quien sufre este suceso, si el hilo pudo resolverlo. `null`/ausente: como hoy. */
  sujeto?: string | null;
  /**
   * Ronda de revisión (tarea 11): **el sujeto sale a la cabecera del mensaje, y la línea no lo
   * repite.** `MensajeDelHilo` pinta el nombre del personaje delante (cuando `vozDe` resolvió
   * uno real) y, debajo, esta misma frase — así que si la frase también empezara con el nombre,
   * el hilo diría «Sylas Sylas pierde 7 PG…». Con `sujetoEnCabecera: true`, `HP_CHANGED` y
   * `ATTACK_RESOLVED` omiten el nombre que YA se muestra en la cabecera y la frase arranca por el
   * verbo: «pierde 7 PG… ← Klarg», «ataca a Sylas con Cimitarra: impacta» (aquí lo que se omite es
   * el ATACANTE, que es el sujeto gramatical de esta frase en concreto — ver el comentario del
   * `case "ATTACK_RESOLVED"`, más abajo, para por qué es un sujeto distinto del de `ctx.sujeto`).
   * `false`/ausente: la frase entera, con el nombre delante, que es la que se lee fuera de la
   * mesa (la crónica) o donde no hay cabecera que lo diga ya.
   */
  sujetoEnCabecera?: boolean;
  nombres?: NombresDelHilo;
}

/**
 * Ronda de revisión (tarea 11). **De dónde vino un `HP_CHANGED` puesto a mano, con su orden de
 * preferencia y su caída.**
 *
 *  1. **`sourceCharacterId`, si se ve.** Es lo que el DM citó a mano, y manda sobre la tirada
 *     aunque las dos vengan juntas — no debería pasar (`PonerDano` no ofrece las dos a la vez;
 *     ver su comentario), pero si algún día un cliente manda las dos, la cita explícita es la
 *     que se declaró a propósito, no la que se dedujo de una tirada.
 *  2. **Si `sourceCharacterId` vino pero este espectador no lo ve** (o no vino ninguno) **y hay
 *     `rollEventId`**, el atacante de esa tirada — con el prefijo «ataque de», que es lo que
 *     distingue una cita directa de una recuperada por deducción.
 *  3. **Si el DM citó a alguien (`sourceCharacterId`) y ni él ni la tirada se pudieron nombrar**,
 *     «Alguien» y no silencio: se sabe que hubo un origen, solo que este espectador no lo ve, y
 *     callarlo sería mentir por omisión — el mismo criterio que ya usa `ATTACK_RESOLVED` con su
 *     atacante.
 *  4. **Con `rollEventId` solo, o sin ningún campo, nada.** Revisión final de la rama
 *     (2026-09-13): `rollEventId` cita CUALQUIER tirada —la hoja cita «2d6 de caída» desde
 *     `PuntosDeGolpe`— y una caída no tiene atacante. Tratar «hay tirada» como «hubo alguien»
 *     ponía «← Alguien» a un daño que no vino de nadie: un atacante inventado. La deducción por
 *     tirada nombra al atacante que encuentra o no dice nada.
 */
function origenDeGolpe(
  p: Extract<GameEventPayload, { type: "HP_CHANGED" }>,
  nombres?: NombresDelHilo,
): string {
  const directo = p.sourceCharacterId ? (nombres?.personaje(p.sourceCharacterId) ?? null) : null;
  if (directo) return ` ← ${directo}`;
  const deTirada = p.rollEventId ? (nombres?.atacanteDeLaTirada(p.rollEventId) ?? null) : null;
  if (deTirada) return ` ← ataque de ${deTirada}`;
  return p.sourceCharacterId ? " ← Alguien" : "";
}

export function lineaDeLog(p: GameEventPayload, ctx?: ContextoDeLinea): string {
  switch (p.type) {
    case "SESSION_STARTED":
      return `Empieza la sesión «${p.sessionTitle}»`;
    case "SESSION_CLOSED":
      return p.durationMinutes !== undefined
        ? `Se cierra «${p.sessionTitle}» tras ${p.durationMinutes} minutos`
        : `Se cierra «${p.sessionTitle}»`;
    case "SESSION_NOTE":
      return p.text ? `${NOMBRE_SELLO[p.kind]}: ${p.text}` : NOMBRE_SELLO[p.kind];
    case "HP_CHANGED": {
      if (p.massive) return `Daño masivo: muere en el acto (${p.from} → ${p.to})`;
      const motivo = p.reason ? ` — ${p.reason}` : "";
      // **Con sujeto resuelto, la frase nombra a quien recibe el golpe y de dónde viene** — el
      // hueco M15 pedía «¿de qué murió Elara?»; esto responde también «¿y quién se lo hizo?».
      // Sin sujeto (el suceso no es de un personaje visible, o nadie llamó con `ctx`), la frase
      // de siempre: la del `from → to`, que es la que lee la crónica fuera de la mesa.
      if (ctx?.sujeto) {
        const verbo = p.delta < 0 ? "pierde" : "recupera";
        const tipo = p.damageType ? ` (${NOMBRE_TIPO_DANO[p.damageType]})` : "";
        const critico = p.critical ? ", crítico" : "";
        const origen = origenDeGolpe(p, ctx.nombres);
        // **La cabecera ya dijo quién es**, así que la frase no repite el nombre y arranca por
        // el verbo — ver el comentario de `ContextoDeLinea.sujetoEnCabecera`.
        const sujetoDeLaFrase = ctx.sujetoEnCabecera ? "" : `${ctx.sujeto} `;
        return `${sujetoDeLaFrase}${verbo} ${Math.abs(p.delta)} PG${tipo}${critico}${origen}${motivo}`;
      }
      const verbo = p.delta < 0 ? "Pierde" : "Recupera";
      const critico = p.critical ? ", crítico" : "";
      return `${verbo} ${Math.abs(p.delta)} PG (${p.from} → ${p.to}${critico})${motivo}`;
    }
    case "TEMP_HP_SET":
      return `Puntos de golpe temporales: ${p.from} → ${p.to}`;
    case "DEATH_SAVE":
      return `Salvación de muerte: sacó ${p.roll}, ${RESULTADO_MUERTE[p.result] ?? p.result} (${p.successes} éxitos, ${p.failures} fracasos)`;
    case "REST_DECLARED":
      return `Descanso ${REPOSO[p.rest] ?? p.rest}`;
    case "RESOURCE_SPENT":
      return `Gasta ${p.amount} de ${p.label} (quedan ${p.remaining})`;
    case "RESOURCE_RESTORED":
      return `Recupera ${p.amount} de ${p.label} (quedan ${p.remaining})`;
    case "TEMP_MODIFIER_GRANTED":
      // El motivo va **dentro de la frase**: un «+2 a Fuerza» sin origen es lo que la traza y este
      // registro existen para impedir.
      return `${SIGNO(p.amount)} a ${NOMBRE_OBJETIVO_TEMPORAL[p.target] ?? p.target} — ${p.reason}${
        p.expiresAtClock === undefined ? " (hasta que se quite)" : ""
      }`;
    case "TEMP_MODIFIER_EXPIRED":
      return `Se le pasa el efecto de ${p.reason}: deja de tener ${SIGNO(p.amount)} a ${
        NOMBRE_OBJETIVO_TEMPORAL[p.target] ?? p.target
      }`;
    case "MEMBER_ROLE_CHANGED":
      // **Es un cambio de permisos**, así que la frase dice los dos papeles y no solo el nuevo:
      // «ahora es DM» no cuenta qué se perdió ni de dónde venía.
      return `${p.displayName ?? "Alguien"} pasa de ${PAPEL[p.from]} a ${PAPEL[p.to]}`;
    case "DM_EXECUTED":
      // **La batuta** (I19). Solo la lee el DM —el suceso es `DM_ONLY`—, así que la frase habla en
      // sus términos: lo que la mesa verá son los efectos, cada uno por su cuenta.
      return `Ejecuta «${p.entityName ?? "una ficha"}»: dispara las reglas que la esperaban`;
    case "RESOURCE_GIVEN":
      // **De quién a quién, en una sola frase.** El SRD permite regalar la inspiración, y con dos
      // líneas sueltas —un gasto y una reposición— la mesa no sabría que fue el mismo gesto.
      return `${p.fromName} le da ${p.amount} de ${p.label} a ${p.toName} (le quedan ${p.remaining})`;
    case "LEVEL_CHANGED":
      return `Sube de nivel: ${p.from} → ${p.to}`;
    case "ABILITY_ROLL": {
      const natural =
        p.natural === "TWENTY" ? " — ¡20 natural!" : p.natural === "ONE" ? " — 1 natural" : "";
      const contra =
        p.outcome === "SUCCESS"
          ? ` supera la CD ${p.dc}`
          : p.outcome === "FAILURE"
            ? ` no llega a la CD ${p.dc}`
            : "";
      const que = p.reason ? `${p.reason}: ` : "";
      return `${que}${p.expression} = ${p.total}${contra}${natural}`;
    }
    case "CONDITION_APPLIED":
      return p.level !== undefined
        ? `Recibe la condición «${nombreCondicion(p.key)}», nivel ${p.level}`
        : `Recibe la condición «${nombreCondicion(p.key)}»`;
    case "CONDITION_REMOVED":
      // **Con su causa, si la trae** (puerta de efectos §5.3, ola de arreglos 1): retirar por
      // descanso escribe `reason: "Descanso largo"`, y sin pintarlo la crónica no distinguía esa
      // retirada de una hecha a mano por el DM — «lo que retira lo dice la crónica». Mismo patrón
      // que `HP_CHANGED`: guion largo y el motivo tal cual.
      return `Se le quita la condición «${nombreCondicion(p.key)}»${p.reason ? ` — ${p.reason}` : ""}`;
    case "ENTITY_OPENED":
      return p.entityName ? `Abre «${p.entityName}»` : "Abre una entrada del mundo";
    case "ENTITY_REVEALED":
      return p.entityName ? `Se revela «${p.entityName}»` : "Se revela una entrada del mundo";
    case "NPC_REVEALED":
      // «Garrik entra en escena», con su ficha del mundo si también se reveló (spec §3.2).
      return p.entityName && p.entityName !== p.characterName
        ? `${p.characterName} entra en escena — es ${p.entityName}`
        : `${p.characterName} entra en escena`;
    case "NPC_HIDDEN":
      return `${p.characterName} se oculta de la mesa`;
    case "ENTITY_RETYPED": {
      // **Los dos tipos, traducidos** (I16). El payload guarda claves —`NPC`, `DOCUMENT`— porque un
      // registro guarda datos; la forma legible se compone aquí, que es donde vive el español, y
      // así ningún valor de enumeración llega a la pantalla.
      const de = ETIQUETA_DE_TIPO[p.from as EntityType] ?? p.from;
      const a = ETIQUETA_DE_TIPO[p.to as EntityType] ?? p.to;
      return p.entityName
        ? `«${p.entityName}» pasa de ${de} a ${a}`
        : `Una entrada del mundo pasa de ${de} a ${a}`;
    }
    case "ENTITY_COMMENTED":
      return p.entityName ? `Se comenta «${p.entityName}»` : "Se comenta una entrada del mundo";
    case "MEMBER_JOINED":
      return p.displayName ? `${p.displayName} se sienta a la mesa` : "Alguien se sienta a la mesa";
    case "ENTITY_LINKED":
      return p.label ? `Se enlazan dos entradas: ${p.label}` : "Se enlazan dos entradas del mundo";
    case "FLAG_SET":
      return `Marca «${p.key}» ${p.value ? "puesta" : "quitada"}`;
    case "SET_CHANGED":
      return `${p.action === "ADDED" ? "Entra en" : "Sale de"} el conjunto «${p.setKey}»`;
    case "SIGNAL_RAISED":
      return `Se lanza la señal «${p.key}»`;
    case "MANUAL_OVERRIDE_SET": {
      const antes = p.previous !== undefined ? ` (antes ${p.previous})` : "";
      const motivo = p.reason ? ` — ${p.reason}` : "";
      return `El DM fija ${nombreAnulable(p.target)} en ${p.value}${antes}${motivo}`;
    }

    // --- 2B: el botín y el inventario ---
    case "MONEY_CHANGED": {
      // `de` (B3) solo aparece cuando quien actuó no es el dueño del personaje: es el nombre
      // legible de quien lo dio, nunca un `id`.
      const deQuien = p.de ? `, de ${p.de}` : "";
      return `Cambia el dinero: ${dineroLegible(p)}${deQuien}`;
    }
    case "ITEM_ADDED": {
      // **Sin el aspa de multiplicar**, y no es un capricho: `×` (U+00D7) está en la lista de
      // glifos prohibidos de la regla «los iconos se dibujan», y la prueba de `ui/Iconos` mira
      // el TEXTO FUENTE además del DOM. Aquí no hacía de icono —era una cantidad— pero la regla
      // es por nombre, y una excepción por caso es como se pierden las reglas.
      const deQuien = p.de ? `, de ${p.de}` : "";
      return p.quantity > 1
        ? `Consigue ${p.item} (${p.quantity} unidades, ${NOMBRE_ZONA[p.location].toLowerCase()})${deQuien}`
        : `Consigue ${p.item} (${NOMBRE_ZONA[p.location].toLowerCase()})${deQuien}`;
    }
    case "ITEM_MOVED": {
      // `slot` viaja como cadena libre en el payload (`z.string().max(20)`), no como el enum
      // `EquipSlot`, así que se traduce si se reconoce y se cita tal cual si no. Inventarle una
      // traducción a una ranura desconocida sería peor que enseñarla.
      const nombreRanura = p.slot
        ? (NOMBRE_RANURA[p.slot as keyof typeof NOMBRE_RANURA] ?? p.slot)
        : null;
      const ranura = nombreRanura ? `, ${nombreRanura.toLowerCase()}` : "";
      const sintonia =
        p.attuned === true ? ", sintonizado" : p.attuned === false ? ", sin sintonizar" : "";
      return `Mueve ${p.item}: ${NOMBRE_ZONA[p.from].toLowerCase()} → ${NOMBRE_ZONA[
        p.to
      ].toLowerCase()}${ranura}${sintonia}`;
    }
    case "ITEM_REMOVED":
      return p.quantity > 1 ? `Suelta ${p.item} (${p.quantity} unidades)` : `Suelta ${p.item}`;
    // D-CF-14, commit 4 (M2B-8). El `PATCH` de cantidad, con el antes y el después: es la
    // misma regla que `HP_CHANGED`, sin la cual no se podría leer sin recalcular la historia.
    case "ITEM_QUANTITY_CHANGED":
      return `Ajusta ${p.item}: ${p.from} → ${p.to}`;

    // --- 2C: el reloj, las condiciones que vencen solas y las tablas de la casa ---
    case "CLOCK_ADVANCED": {
      const ritmo = p.pace ? `, a paso ${RITMO[p.pace] ?? p.pace}` : "";
      const millas = p.miles !== undefined ? ` (${p.miles} millas)` : "";
      return `Pasan ${duracionLegible(p.seconds)}${ritmo}${millas}`;
    }
    case "CONDITION_EXPIRED":
      return p.level !== undefined
        ? `Vence la condición «${nombreCondicion(p.key)}», nivel ${p.level}`
        : `Vence la condición «${nombreCondicion(p.key)}»`;
    case "TABLE_ROLLED": {
      const porque = p.trigger ? ` ${DISPARO_DE_TABLA[p.trigger] ?? ""}` : "";
      return `Tabla «${p.tableName}»${porque}: saca ${p.roll} en d${p.die} — ${p.text}`;
    }

    // --- 2.5.2 y 2.5.6: el combate ---
    case "ENCOUNTER_STARTED":
      return "Empieza el combate";
    case "TURN_ADVANCED":
      // **Sin nombres.** El suceso trae posiciones, no personajes, y a propósito: la ficha del
      // encuentro ya filtra por `canView` y renumera denso, así que traducir aquí una posición a
      // un nombre exigiría una lista que este espectador puede no tener entera.
      return `Pasa el turno (asalto ${p.round})`;
    case "ROUND_ADVANCED":
      return `Asalto ${p.to}`;
    case "COMBATANT_LEFT":
      // Sacar del combate (spec §3.3). Sin nombre si el personaje está oculto para la mesa
      // (E-PM-6): el payload no se filtra por espectador.
      return p.characterName ? `${p.characterName} sale del combate` : "Alguien sale del combate";
    case "COMBATANT_SIDE_CHANGED":
      // **El vocabulario en español se escribe una sola vez**, en `dominio/combate.ts`: ningún
      // valor de enumeración llega a la pantalla, ni siquiera dentro de una frase de registro.
      return `El DM corrige un bando: de ${NOMBRE_BANDO[p.from as CombatantSide] ?? p.from} a ${NOMBRE_BANDO[p.to as CombatantSide] ?? p.to}`;
    case "ENCOUNTER_CANCELLED":
      // **Se dice que se canceló, no que «no llegó a empezar»**: quien lee esto puede tener una
      // petición de iniciativa que acaba de desaparecerle de la bandeja, y esta línea es su
      // explicación.
      return "El DM cancela el combate antes de empezar";
    case "ACTIVE_TURN_SHIFTED":
      // **Sin nombres**, por lo mismo que `TURN_ADVANCED`: el suceso no los trae, y quien lee
      // puede no poder ver al combatiente del que se habla.
      return `Cambia a quién le toca (asalto ${p.round})`;
    case "ENCOUNTER_ENDED":
      return p.rounds === 1
        ? "Termina el combate en un asalto"
        : `Termina el combate tras ${p.rounds} asaltos`;

    // --- Puerta de efectos §5 bis: XP (D-CF-68/D-CF-69, 2026-09-13) ---
    case "XP_AWARDED": {
      // `amount` puede ser negativo (el DM corrige un error), así que la frase mira el signo en
      // vez de asumir «gana» — misma idea que `HP_CHANGED` con `delta`.
      const gana = p.amount >= 0;
      const cantidad = Math.abs(p.amount);
      const motivo = p.reason ? ` — ${p.reason}` : "";
      // **`amount` es el delta EFECTIVO** (ola de arreglos 1 de la API): con el total ya a 0 y un
      // premio negativo, el servidor escribe 0 — y «Gana 0 PX» leería como que pasó algo. Se dice
      // lo que pasó: nada, porque no había de dónde quitar.
      if (p.amount === 0) {
        if (ctx?.sujeto) {
          const sujetoDeLaFrase = ctx.sujetoEnCabecera ? "" : `${ctx.sujeto} `;
          return `${sujetoDeLaFrase}no cambia de PX: ya estaba a 0${motivo}`;
        }
        return `No cambia de PX: ya estaba a 0${motivo}`;
      }
      if (ctx?.sujeto) {
        const verbo = gana ? "gana" : "pierde";
        // **La cabecera ya dijo quién es**, como en `HP_CHANGED`.
        const sujetoDeLaFrase = ctx.sujetoEnCabecera ? "" : `${ctx.sujeto} `;
        return `${sujetoDeLaFrase}${verbo} ${cantidad} PX (total ${p.xpTotal})${motivo}`;
      }
      const verbo = gana ? "Gana" : "Pierde";
      return `${verbo} ${cantidad} PX (total ${p.xpTotal})${motivo}`;
    }

    // --- Paso 2, tarea A2: gastar la economía del turno ---
    case "ACTION_SPENT": {
      // **Ningún valor de enumeración llega a la pantalla.** Nunca "ACTION" ni "MOVEMENT": el
      // vocabulario en español se escribe una sola vez, aquí arriba (`NOMBRE_COSTE`).
      if (p.coste === "FREE") return "Usa una interacción libre";
      if (p.coste === "MOVEMENT") {
        return p.excedido
          ? `Se mueve ${p.cantidad} pies (se pasa de su velocidad)`
          : `Se mueve ${p.cantidad} pies`;
      }
      return p.excedido
        ? `Gasta ${NOMBRE_COSTE[p.coste]} (ya la tenía gastada)`
        : `Gasta ${NOMBRE_COSTE[p.coste]}`;
    }

    // D-CF-14, commit 5 (J5). La muerte deja de derivarse en silencio: dice quién y por qué.
    case "CHARACTER_DIED":
      return `Muere ${p.name} — ${CAUSA_DE_MUERTE[p.cause]}`;

    // --- 2.5.3: el ataque comparado en el servidor ---
    case "ATTACK_RESOLVED": {
      // **Sin CA, con o sin nombres.** El número contra el que se tiró no sale nunca, ni con
      // contexto ni sin él. El OBJETIVO sí se nombra cuando hay `ctx.sujeto` — y no es un desliz:
      // este suceso se escribe a la visibilidad del objetivo (ficha #15, resolución del
      // controlador), así que quien lo lee ya lo ve por definición; ocultar su nombre aquí no
      // protegía nada que `canView` no protegiera ya. El ATACANTE se resuelve por `attackerId`
      // contra `useCharacters`/`useNpcs`, y «Alguien» si este espectador no lo ve.
      if (!ctx?.sujeto) return `${p.attackName}: ${VEREDICTO[p.verdict] ?? p.verdict}`;
      const atacante = ctx.nombres?.personaje(p.attackerId) ?? "Alguien";
      // **`sujetoEnCabecera` omite aquí el ATACANTE, no el objetivo** — son dos sujetos
      // distintos, y el que puede repetirse en la cabecera es el que trae `ctx.sujeto`
      // (`HiloDeSesion.nombreDelSujeto` lo resuelve del `subjectId` del suceso, que en
      // `ATTACK_RESOLVED` es el OBJETIVO, no quien ataca — `character-sheet.service.ts`,
      // `resolveAttack`). Hoy este suceso se pinta como «tirada» (`tipo-de-mensaje.ts`), que no
      // lleva cabecera de personaje, así que `HiloDeSesion` nunca manda `sujetoEnCabecera: true`
      // para este tipo — la rama de abajo existe para cuando eso cambie, y la prueba unitaria la
      // ejercita ya, sin esperar a que la pantalla la use.
      return ctx.sujetoEnCabecera
        ? `ataca a ${ctx.sujeto} con ${p.attackName}: ${VEREDICTO[p.verdict] ?? p.verdict}`
        : `${atacante} ataca a ${ctx.sujeto} con ${p.attackName}: ${VEREDICTO[p.verdict] ?? p.verdict}`;
    }

    // --- 2.5.8: archivar en vez de borrar ---
    case "CHARACTER_ARCHIVED":
      return `Se archiva a ${p.characterName}`;
    case "CHARACTER_RESTORED":
      return `Vuelve del archivo ${p.characterName}`;

    // --- 2026-09-05: la iniciativa y el bando ---
    case "INITIATIVE_ROLLED_BY_SYSTEM":
      // **El sistema tiró, no el jugador.** El DM forzó el arranque sin esperar a todos, y la
      // frase tiene que dejarlo claro: quien lea el registro no puede confundirlo con una tirada
      // propia.
      return `El sistema tira la iniciativa por ${p.characterName ?? "alguien"} (${p.total})`;
  }
}

/** La hora, sin fecha: dentro de una sesión la fecha es la misma para todo. */
export function horaDe(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

/**
 * El sello con el que se marcó una anotación, o `null` si el suceso no es una anotación.
 *
 * Existe para el chip de clase que la maqueta pone **a la izquierda** de cada línea del registro:
 * de un vistazo se distingue un combate de un hallazgo sin leer la frase. Solo lo tienen los
 * sucesos que alguien selló a mano; los diecinueve tipos que escribe el motor (perder PG, una
 * tirada, una condición) no llevan chip a propósito — inventarles una categoría sería una
 * segunda tabla de vocabulario que se separaría de `NOMBRE_SELLO` a la primera.
 */
export function selloDeSuceso(p: GameEventPayload): SessionNoteKind | null {
  return p.type === "SESSION_NOTE" ? p.kind : null;
}

/**
 * Los dos papeles, en español. **Ningún valor de enumeración llega a la pantalla**, y la forma
 * legible se escribe una vez por dominio: aquí, porque es la línea del registro.
 */
const PAPEL: Record<string, string> = { DM: "DM", PLAYER: "jugador" };

/** Con su signo, siempre: «+2» y «−3» dicen cosas distintas y las dos son legítimas. */
const SIGNO = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

/**
 * A qué apunta un modificador temporal, en español. **Ningún valor de enumeración llega a la
 * pantalla**; la tabla completa vive en `features/character-sheet/ModificadoresTemporales.tsx`,
 * que es quien la ofrece, y aquí está la parte que el registro necesita nombrar.
 */
const NOMBRE_OBJETIVO_TEMPORAL: Record<string, string> = {
  "ability.str": "Fuerza",
  "ability.dex": "Destreza",
  "ability.con": "Constitución",
  "ability.int": "Inteligencia",
  "ability.wis": "Sabiduría",
  "ability.cha": "Carisma",
  ac: "la CA",
  "speed.walk": "la velocidad",
  "speed.climb": "la velocidad al trepar",
  "speed.swim": "la velocidad al nadar",
  "speed.fly": "la velocidad al volar",
  "speed.burrow": "la velocidad al excavar",
};
