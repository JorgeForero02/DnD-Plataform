import { BadRequestException } from "@nestjs/common";
import type {
  Actividad,
  Activacion,
  Consumo,
  DamageType,
  ExpresionDeDados,
  MecanicaDeConjuro,
  Origen,
  SrdSpell,
} from "@dnd/shared";

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
 * Cuántos objetivos pide la actividad de lanzamiento — **derivado de su `tipo`, no de
 * `target`** (ruling del orquestador, 2026-09-18, Task 4). La primera versión leía
 * `actividad.target`, pero el catálogo que genera Task 1 no trae ese campo en ninguna de sus 425
 * actividades hoy (medido): con esa lectura, `magic-missile` —que sí reparte varios dardos entre
 * varios objetivos— daba siempre `"ninguno"`. `tipo` sí distingue los tres casos reales: un
 * `ataque` apunta a una criatura; una `salvacion` o un `dados` (el daño de `magic-missile`) puede
 * alcanzar a varios; `utilidad` y `prueba` no piden un objetivo de criatura por su propia
 * mecánica, y sin actividad de lanzamiento tampoco hay nada que pedir.
 */
export function objetivosDe(spell: SrdSpell): "ninguno" | "uno" | "varios" {
  const actividad = actividadDeLanzamiento(spell);
  if (!actividad) return "ninguno";
  switch (actividad.tipo) {
    case "ataque":
      return "uno";
    case "salvacion":
    case "dados":
      return "varios";
    case "utilidad":
    case "prueba":
      return "ninguno";
  }
}

/**
 * Task 4 (3A.2) — qué `CharacterResource` paga lanzar este conjuro. Un truco (nivel 0) no gasta
 * espacio: el SRD 5.1 no lo pide. Un conjuro de nivel N gasta un espacio de nivel N, o del nivel
 * ELEGIDO si es mayor — SRD 5.1, *Casting a Spell at a Higher Level*: «When a spellcaster casts a
 * spell using a slot that is of a higher level than the spell, the spell assumes the higher level
 * for that casting». Elegir un espacio MENOR que el del conjuro no es una opción de la mesa: es
 * una petición que no se puede cumplir, y se rechaza en vez de gastar lo que no cubre el conjuro.
 */
export function consumoDeEspacio(spell: SrdSpell, nivelDeEspacio?: number): Consumo[] {
  if (spell.level === 0) return [];
  if (nivelDeEspacio !== undefined && nivelDeEspacio < spell.level) {
    throw new BadRequestException(
      `${spell.nameEs ?? spell.nameEn} es de nivel ${spell.level}: no se puede lanzar con un ` +
        `espacio de nivel ${nivelDeEspacio}.`,
    );
  }
  return [{ recurso: `spell-slot-${nivelDeEspacio ?? spell.level}`, cantidad: 1 }];
}

/** A qué nivel de personaje se gana cada tramo de un truco que escala por nivel — SRD 5.1,
 * *Cantrips*: 5.º, 11.º y 17.º nivel, el mismo umbral para cualquier truco que escale así. */
const TRAMOS_POR_NIVEL_DE_PERSONAJE = [5, 11, 17] as const;

/**
 * Task 4 (3A.2) — aplica el `escalado` de una expresión de dados y devuelve una copia YA
 * resuelta, sin ese campo — lista para tirar. Sin `escalado`, es una copia literal de lo que
 * hace falta para tirar (`n`/`caras`/`bonus`/`signo`/`tipoDeDano`).
 *
 * **Por espacio** (T18, `fireball`): un tramo de `escalado.n`d`escalado.caras` por cada nivel de
 * espacio por encima de `nivelBase` — a nivel 5 (base 3) son 2 tramos.
 *
 * **Por nivel de personaje** (los trucos que suben solos, `fire-bolt`): un tramo por cada umbral
 * de `TRAMOS_POR_NIVEL_DE_PERSONAJE` que el personaje ya alcanzó — a nivel 11 son 2 tramos (el
 * 5.º y el 11.º; el 17.º todavía no).
 *
 * Una aptitud de clase (`kind: "FEATURE"`) no tiene nivel base de conjuro: quien llama pasa
 * `nivelBase: 0` y, sin `ctx.nivelDeEspacio` (una aptitud nunca gasta un espacio), el escalado
 * por espacio da siempre 0 tramos — solo el escalado por nivel de personaje puede aplicarle algo,
 * si la aptitud lo declara.
 */
export function dadosEscalados(
  expresion: ExpresionDeDados,
  ctx: { nivelBase: number; nivelDeEspacio?: number; nivelDePersonaje: number },
): { n?: number; caras?: number; bonus?: Origen; signo: 1 | -1; tipoDeDano?: DamageType } {
  const base = {
    n: expresion.n,
    caras: expresion.caras,
    bonus: expresion.bonus,
    signo: expresion.signo,
    tipoDeDano: expresion.tipoDeDano,
  };
  if (!expresion.escalado) return base;

  const tramos =
    expresion.escalado.por === "espacio"
      ? Math.max(0, (ctx.nivelDeEspacio ?? ctx.nivelBase) - ctx.nivelBase)
      : TRAMOS_POR_NIVEL_DE_PERSONAJE.filter((umbral) => ctx.nivelDePersonaje >= umbral).length;
  if (tramos === 0) return base;

  const extra = expresion.escalado.n * tramos;
  return { ...base, n: (base.n ?? 0) + extra, caras: base.caras ?? expresion.escalado.caras };
}
