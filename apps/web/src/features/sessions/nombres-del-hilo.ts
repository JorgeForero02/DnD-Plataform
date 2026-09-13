import type { GameEventRow } from "./log-api";

// Tarea 11 del pulido (C4, #15). **El hilo habla de personajes, no de ids.**
//
// `HP_CHANGED.sourceCharacterId` y `ATTACK_RESOLVED.attackerId` viajan como identificador — el
// mismo patrón que ya usa el resto del registro (`ITEM_ADDED.de` es la excepción: ahí el
// servidor manda el NOMBRE ya resuelto porque quien dio el objeto puede no ser visible para
// quien lee; aquí el atacante y el origen SÍ tienen que pasar por `canView` del lector, así que
// resolverlos aquí, con la lista ya filtrada por el servidor, es lo correcto y no un atajo).
//
// **Por qué esto vive en `apps/web` y no en el servidor:** `useCharacters` y `useNpcs` ya traen,
// cada uno, la lista filtrada por `canView` para quien pregunta — mandar el nombre resuelto en
// el propio suceso sería escribir la visibilidad de OTRO personaje dentro de un payload que no es
// el suyo, y ese payload se guarda tal cual para siempre. Resolver aquí, con lo que el visor YA
// tiene delante, es gratis y no fija nada en la base.

/**
 * Lo que el hilo necesita para nombrar a alguien citado por id dentro de un suceso.
 *
 * `null` es una respuesta legítima y no un error: significa «este espectador no lo ve» —
 * `canView` no se lo mandó en `useCharacters`/`useNpcs` — y el hilo lo dice como «Alguien», nunca
 * como un id ni como una cadena vacía.
 */
export interface NombresDelHilo {
  /** El nombre de un personaje o PNJ por su id, o `null` si este espectador no lo ve. */
  personaje: (id: string) => string | null;
  /**
   * El atacante de la tirada que resolvió un ataque, buscando en la ventana de sucesos que ya se
   * tiene cargada. `HP_CHANGED.rollEventId` solo dice DE QUÉ TIRADA sale el daño; para decir DE
   * QUIÉN hace falta el `ATTACK_RESOLVED` que citó esa misma tirada, si está en la ventana y este
   * espectador puede verlo — si no está, `null`, nunca una adivinanza.
   */
  atacanteDeLaTirada: (rollEventId: string) => string | null;
}

/** Lo mínimo que hace falta para nombrar a alguien: su id y su nombre. */
export interface PersonajeNombrado {
  id: string;
  name: string;
}

export function nombresDelHilo(
  personajes: PersonajeNombrado[],
  eventos: GameEventRow[],
): NombresDelHilo {
  const nombrePorId = new Map(personajes.map((p) => [p.id, p.name]));
  const personaje = (id: string): string | null => nombrePorId.get(id) ?? null;
  const atacanteDeLaTirada = (rollEventId: string): string | null => {
    const ataque = eventos.find(
      (e) => e.payload.type === "ATTACK_RESOLVED" && e.payload.rollEventId === rollEventId,
    );
    if (!ataque || ataque.payload.type !== "ATTACK_RESOLVED") return null;
    return personaje(ataque.payload.attackerId);
  };
  return { personaje, atacanteDeLaTirada };
}
