import type { Actividad, Activacion, MecanicaDeConjuro, SrdSpell } from "@dnd/shared";

// Tarea 3A.2 (Task 3) — el puente entre un conjuro del catálogo (`SrdSpell`, `actividades:
// Actividad[]`) y una actividad usable (`ActivitiesService.usar`, tarea A7). No añade mecánica
// nueva: decide CUÁL de las actividades que ya trae un conjuro es «la de lanzarlo» y de qué
// familia es, para que la pantalla del libro de conjuros pueda ofrecer un botón sin repetir esa
// lógica en cada sitio que la necesite (la lista del Step 3 de `spellbook.service.ts`, y más
// adelante quien resuelva `POST …/activities/spell:<key>/use`).

/**
 * La clave con la que un conjuro entra al espacio de claves de actividad
 * (`ActivitiesService.usar`, `parsearClaveDeActividad` más abajo): `"spell:fireball"` para su
 * actividad principal, `"spell:fireball@1"` para una secundaria del mismo conjuro (el `dados`
 * FREE de `hunters-mark`, que se usa aparte de su `utilidad` de lanzamiento — ver
 * `actividadDeLanzamiento`).
 */
export function claveDeConjuro(spellKey: string, indice = 0): string {
  return indice === 0 ? `spell:${spellKey}` : `spell:${spellKey}@${indice}`;
}

/**
 * El inverso de `claveDeConjuro`, y además reconoce la clave estable de un rasgo (`"second-wind"`,
 * `"rage"`): las que no llevan el prefijo `spell:` son actividades de clase, no de conjuro — el
 * mismo espacio de claves que ya usa `ActivitiesService.usar` para cualquier `actividadKey`.
 */
export function parsearClaveDeActividad(
  key: string,
): { tipo: "spell"; spellKey: string; indice: number } | { tipo: "feature"; key: string } {
  const coincide = /^spell:([^@]+)(?:@(\d+))?$/.exec(key);
  if (!coincide) return { tipo: "feature", key };
  return { tipo: "spell", spellKey: coincide[1], indice: coincide[2] ? Number(coincide[2]) : 0 };
}

/**
 * ¿Son la misma activación? Compara solo `coste`/`tiempo` — nunca `condicion`, que es el texto
 * libre de una reacción (`activacionSchema`, `activity.schema.ts`) y no forma parte de identificar
 * SI dos activaciones son la misma ocasión de la mesa.
 */
function mismaActivacion(a: Activacion, b: Activacion): boolean {
  if ("coste" in a && "coste" in b) return a.coste === b.coste;
  if ("tiempo" in a && "tiempo" in b) {
    return a.tiempo.valor === b.tiempo.valor && a.tiempo.unidad === b.tiempo.unidad;
  }
  return false;
}

/**
 * La actividad con la que se LANZA el conjuro — la primera cuya `activation` coincide con su
 * `castingTime` y, si ninguna coincide, la `[0]`. `undefined` si el conjuro no trae ninguna
 * (`magic-weapon`, importado solo con su texto — ver `catalog.schema.ts`, `fueraDeA`).
 *
 * **Por qué hace falta comparar y no coger siempre `[0]`.** `hunters-mark` (SRD 5.1) trae DOS
 * actividades: un `dados` con activación `FREE` (el daño extra que se dispara al pegar, cada
 * turno) y una `utilidad` con `BONUS` (marcar al objetivo, que es lanzar el conjuro de verdad —
 * su `castingTime` es `BONUS`). Con `[0]` a secas, «lanzar Marca del cazador» habría abierto la
 * actividad equivocada.
 */
export function actividadDeLanzamiento(spell: SrdSpell): Actividad | undefined {
  if (spell.actividades.length === 0) return undefined;
  const porCastingTime = spell.actividades.find((a) =>
    mismaActivacion(a.activation, spell.castingTime),
  );
  return porCastingTime ?? spell.actividades[0];
}

/** De qué familia es la actividad de lanzamiento — `"texto"` si el conjuro no tiene ninguna. */
export function mecanicaDe(spell: SrdSpell): MecanicaDeConjuro {
  const actividad = actividadDeLanzamiento(spell);
  return actividad ? actividad.tipo : "texto";
}

/**
 * Cuántos objetivos pide la actividad de lanzamiento. `"personal"` (sin objetivo, como `shield`)
 * y la ausencia de `target` cuentan como `"ninguno"`; sin `cantidad` es un solo objetivo; con
 * `cantidad` numérica mayor que 1, o derivada de un `Origen` (`bless`, «+2»: puede crecer de
 * sobra), es `"varios"`.
 */
export function objetivosDe(spell: SrdSpell): "ninguno" | "uno" | "varios" {
  const actividad = actividadDeLanzamiento(spell);
  const objetivo = actividad?.target;
  if (!objetivo || objetivo.tipo === "personal") return "ninguno";
  if (objetivo.cantidad === undefined) return "uno";
  if (typeof objetivo.cantidad === "number") return objetivo.cantidad <= 1 ? "uno" : "varios";
  return "varios";
}
