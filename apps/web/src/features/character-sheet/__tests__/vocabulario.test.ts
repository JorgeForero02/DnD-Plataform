import { describe, expect, it } from "vitest";
import { CLAVE_MUY_CARGADO, LABEL_KEYS } from "@dnd/shared";
import {
  describirAviso,
  explicacionSubclase,
  NOMBRE_CONDICION,
  nombreCausaVelocidad,
  traducirLabelKey,
} from "../vocabulario";

// Tarea 2A.10 — "toda labelKey que el motor puede devolver tiene traducción (recórrelas y
// compruébalo)". La lista dejó de vivir aquí a mano (tarea 34, tandas 2-5): `LABEL_KEYS` es
// ahora la única fuente, en `@dnd/shared` (`packages/shared/src/label-keys.ts`), y del lado de
// `apps/api` una prueba que recorre los objetos del catálogo y las constantes de cada emisor
// (`apps/api/src/rules/label-keys-catalog.spec.ts`) comprueba por igualdad exacta que ninguna
// clave que el motor puede emitir se quede sin registrar ahí. Si el motor añade una clave nueva
// sin registrarla, esa prueba es la que se entera primero — esta prueba de aquí sigue comprobando que, de las
// registradas, ninguna se traduce en silencio a «Sin traducir».

describe("traducirLabelKey — cobertura de todas las claves que el motor puede emitir", () => {
  it.each(LABEL_KEYS)("traduce %s", (labelKey) => {
    const { conocida, texto } = traducirLabelKey(labelKey);
    expect(conocida, `«${labelKey}» debería tener traducción`).toBe(true);
    expect(texto.startsWith("Sin traducir:")).toBe(false);
  });

  it("una clave que el motor no puede emitir se marca como no traducida, nunca en silencio", () => {
    const { conocida, texto } = traducirLabelKey("race.beholder.deathRay");
    expect(conocida).toBe(false);
    expect(texto).toBe("Sin traducir: race.beholder.deathRay");
  });
});

describe("ningún aviso del servidor puede salir «Sin traducir»", () => {
  // **La lista se mantiene a mano, y por eso está aquí y no en un comentario.** Es la misma
  // clase de red que la de las cabeceras de atribución del catálogo: un `grep` de
  // `code: "…"` sobre `apps/api/src/rules/` y `apps/api/src/characters/` da estos siete.
  // Dos de ellos —los del equipo a dos manos— salieron a producción de esta misma sesión
  // pintando «Sin traducir: versatile_needs_both_hands» porque nadie los tradujo al añadirlos.
  const CODIGOS_QUE_EMITE_LA_API = [
    "ac_formula_discarded",
    "armor_not_proficient",
    "armor_stealth_disadvantage",
    "armor_strength_requirement_unmet",
    "attack_not_proficient",
    "item_unresolved",
    "two_weapon_offhand_damage",
    "versatile_needs_both_hands",
    "unresolved_choice",
    "duplicate_skill_choice",
    "stale_choice",
    // Encargo A8 (2026-09-07) — `apps/api/src/rules/catalog/resolve.ts`.
    "subclass_not_chosen",
    // MEDIA-3, fix round 1 (migración 6) — `character-sheet.service.ts` los emite en
    // `sheet.warnings` cuando la variante de sobrecarga está encendida y el peso llevado supera
    // uno de los dos umbrales. No estaban aquí: borrar su `case` en `describirAviso` seguía
    // dejando esta suite en verde.
    "encumbrance.encumbered",
    "encumbrance.heavily",
  ];

  it.each(CODIGOS_QUE_EMITE_LA_API)("«%s» tiene frase en español", (code) => {
    const frase = describirAviso({ code, key: "x", data: { name: "Espada larga", item: "SRD:x" } });
    expect(frase).not.toMatch(/Sin traducir/);
    expect(frase.length).toBeGreaterThan(10);
  });
});

// Encargo A8 (2026-09-07), vuelta de arreglo 1 — menor. `subclass_not_chosen` cubre dos causas
// distintas y **antes decían la misma frase**, que mentía en una de las dos: «todavía no has
// elegido» es falso cuando SÍ hay una subclase guardada y lo que pasa es que no es de esta clase.
describe("subclass_not_chosen dice una frase distinta según el motivo", () => {
  it("sin elegir ninguna, dice que falta elegir y a qué nivel", () => {
    const frase = describirAviso({
      code: "subclass_not_chosen",
      data: { reason: "not_chosen", chosenAtLevel: 3 },
    });
    expect(frase).toMatch(/todavía no has elegido/i);
    expect(frase).toContain("3");
  });

  it("con una guardada de otra clase, dice que no es de esta clase — nunca «no has elegido»", () => {
    const frase = describirAviso({
      code: "subclass_not_chosen",
      data: { reason: "wrong_class", chosenAtLevel: 3 },
    });
    expect(frase).not.toMatch(/todavía no has elegido/i);
    expect(frase).toMatch(/no pertenece a esta clase/i);
  });
});

// Encargo A8 (2026-09-07), vuelta de arreglo 2 — una cosa suelta que pidió la revisión.
//
// `explicacionSubclase` tiene un fallback genérico («Un camino del SRD 5.1.») para cuando el
// catálogo trae una subclase que el diccionario no cubre — y sin esta prueba, ese fallback podía
// quedarse puesto para siempre sin que nadie se enterara: el patrón ya establecido más arriba
// para `ETIQUETAS_QUE_EL_MOTOR_PUEDE_EMITIR` es exactamente este, una lista copiada a mano de
// `apps/api/src/rules/catalog/classes.ts` (la web no puede importar de `apps/api`), porque si
// alguien añade una clase nueva y se olvida de la frase, algo tiene que enterarse antes que un
// jugador viendo «Un camino del SRD 5.1.» en la pantalla.
const SUBCLASES_DEL_CATALOGO = [
  "berserker", // Bárbaro — Senda del berserker
  "lore", // Bardo — Colegio del conocimiento
  "life-domain", // Clérigo — Dominio de la vida
  "circle-of-the-land", // Druida — Círculo de la tierra
  "champion", // Guerrero — Campeón
  "open-hand", // Monje — Camino de la mano abierta
  "oath-of-devotion", // Paladín — Juramento de entrega
  "hunter", // Explorador — Cazador
  "thief", // Pícaro — Ladrón
  "draconic-bloodline", // Hechicero — Linaje dracónico
  "the-fiend", // Brujo — El Infernal
  "evocation", // Mago — Escuela de evocación
];

describe("cada subclase del catálogo tiene su propia frase, no el fallback genérico", () => {
  const FALLBACK = "Un camino del SRD 5.1.";

  it.each(SUBCLASES_DEL_CATALOGO)("«%s» no cae en el fallback", (clave) => {
    const frase = explicacionSubclase(clave);
    expect(frase).not.toBe(FALLBACK);
    expect(frase.length).toBeGreaterThan(10);
  });

  it("una clave que de verdad no está en el catálogo sí cae en el fallback", () => {
    // El fallback existe para algo: comprobar que sigue ahí para lo que de verdad no se conoce.
    expect(explicacionSubclase("esto-no-existe-en-ningun-catalogo")).toBe(FALLBACK);
  });
});

// MEDIA-3, fix round 1 (migración 6) — `nombreCausaVelocidad(CLAVE_MUY_CARGADO)` no tenía
// prueba ni aquí ni en `rolls/__tests__/sugerencia.test.ts`: si alguien borraba el `if` que la
// intercepta antes de `nombreCondicion`, la sugerencia de tirada pintaría
// «Sin traducir: heavily_encumbered» delante del jugador y ninguna suite se enteraría.
describe("nombreCausaVelocidad — la causa sintética de la sobrecarga", () => {
  it(`traduce ${CLAVE_MUY_CARGADO} sin caer en «Sin traducir»`, () => {
    expect(nombreCausaVelocidad(CLAVE_MUY_CARGADO)).toBe("Muy cargado");
  });

  it("NO se cuela en NOMBRE_CONDICION: no es algo que un DM pueda aplicar a mano", () => {
    // `CLAVES_CONOCIDAS` de `Condiciones.tsx` sale de `NOMBRE_CONDICION` (el desplegable de
    // condiciones que el DM elige y aplica); esto es derivado del peso llevado, nunca una fila
    // que se aplique o se quite a mano, así que no puede vivir en esa tabla.
    expect(Object.keys(NOMBRE_CONDICION)).not.toContain(CLAVE_MUY_CARGADO);
  });
});
