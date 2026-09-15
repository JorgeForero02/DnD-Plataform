// Tarea 2A.3 — las doce clases del SRD 5.1, su progresión y su única subclase.
//
// **Atribución:** material del System Reference Document 5.1, © Wizards of the Coast LLC,
// CC BY 4.0. **Los nombres son los de la traducción oficial al español publicada por Wizards**
// («Documento de referencia del sistema 5.1»), no una traducción nuestra; la modificación que sí
// hacemos es reorganizarlos como datos estructurados. El aviso completo, con la nota de
// modificación, está en `NOTICE.md` de la raíz. Tarea C0.
//
// **Mayúsculas:** el SRD titula los rasgos en caja alta («Ataque Adicional»). Aquí se escriben
// en caja baja española («Ataque adicional») porque es la convención del proyecto y la de la
// ortografía; **las palabras son las del SRD, solo cambia la caja**.
//
// **Alcance declarado: se transcribe el NOMBRE de cada aptitud y el nivel al que llega, no su
// texto de reglas.** El plan pedía «aptitudes por nivel como texto» (§4.3); se entrega el
// nombre porque es lo que la hoja necesita enseñar («al nivel 5 ganas Ataque adicional») y
// porque traducir a mano el texto completo de doscientas aptitudes es exactamente donde una
// transcripción se llena de errores que ningún invariante puede cazar. Queda anotado como
// deuda en `docs/06-pendientes.md`.
//
// **Los niveles de mejora de característica NO están en `features`**: viven en `asiLevels`, y
// hay un invariante que comprueba que no se dupliquen. Repetir un dato es cómo empiezan a
// discrepar.

import { CLAVE_FURIA_ACTIVA, SKILLS, type Actividad, type SkillKey } from "@dnd/shared";
import type { ClassFeature, SrdClass } from "./types";
import { enriquecerClases } from "./generado";

/** El bardo elige entre **todas**. Se escribe la lista entera y no `[]` con una nota: una lista
 * vacía con un comentario que dice «en realidad son todas» es exactamente la clase de dato que
 * un invariante no puede comprobar y una pantalla acaba pintando como «elige 3 de 0». */
const TODAS_LAS_HABILIDADES = Object.keys(SKILLS) as SkillKey[];

/** Atajo para que la tabla de progresión se lea como una tabla y no como un formulario. */
function f(level: number, key: string, name: string): ClassFeature {
  return { level, key, name };
}

// --- Tarea A9 + A10 (2026-09-07) — la Furia: la única aptitud que hoy gana forma completa ---
//
// **Verificado contra el SRD 5.1 en inglés, no copiado de Foundry sin comprobar.** Fuente:
// 5thsrd.org, «The Barbarian» (mismo texto que el SRD 5.1 original de Wizards, CC BY 4.0):
//
//   «In battle, you fight with primal ferocity. On your turn, you can enter a rage as a bonus
//   action. […] Once you have raged the number of times shown for your barbarian level in the
//   Rages column of the Barbarian table, you must finish a long rest before you can rage
//   again.»
//
// Tabla del SRD (columnas «Rages» y «Rage Damage»): nivel 1 → 2 usos / +2 al daño; 3 → 3; 6 → 4;
// 9 → +3 al daño; 12 → 5; 16 → +4 al daño; 17 → 6; **20 → «Unlimited»**. Coincide exactamente con
// `classfeatures/barbarian/barbarian-features/rage.yml` de Foundry (activación `bonus`,
// `uses.recovery: [{ period: lr, type: recoverAll }]`) y con su tabla de clase
// (`classes/barbarian.yml`, `ScaleValue` `rages` y `rage-damage`) — sin discrepancia que resolver
// a favor del SRD en este caso.
//
// **«Unlimited» a nivel 20 NO entra en la TABLA de escala (vuelta de arreglo 1, crítico I1).**
// Foundry lo representa como `999` —un número grande que hace de infinito de facto—, y ese es
// exactamente el truco de `simplifyBonus` que este proyecto existe para no repetir: un número
// inventado que parece una respuesta. `Origen` (`escala`) solo sabe devolver el valor de un
// tramo, nunca "sin límite", y la tabla `barbarian-rages` de abajo se queda solo con números.
//
// Lo que SÍ representa el nivel 20 es `RASGO_FURIA.grant.usos.sinTopeDesde: 20`: desde ese
// nivel, `resolve.ts` ni siquiera evalúa la tabla de escala, y `ResolvedActivityUses.max` sale
// `null` — el mismo «sin tope» que ya usa `CharacterResource.max` en Prisma. La primera versión
// de esta tarea no tenía este campo, y la revisión lo cazó midiendo en ejecución: un bárbaro de
// nivel 20 leía el tramo de mayor `desde` (17 → 6) y su hoja decía "6 usos de Furia" — un número
// creíble, silencioso y falso, exactamente en el fichero cuyo comentario dice estar evitando eso.
// La guarda de `resolverOrigen` que lanza solo protege POR DEBAJO del primer tramo; por encima no
// hay guarda ninguna, así que "lanza en vez de mentir" no era cierto y había que comprobarlo, no
// suponerlo.
// Tarea A11 (paso 2) — lo que la Furia HACE, verificado en inglés contra 5thsrd.org, «The
// Barbarian» (mismo texto que el SRD 5.1 de Wizards, CC BY 4.0):
//
//   «you gain the following benefits while raging: […] you have advantage on Strength checks
//   and Strength saving throws. […] you have resistance to bludgeoning, piercing, and slashing
//   damage. […] you can't cast or concentrate on spells.» Y, sobre cuánto dura: «Your rage
//   lasts for 1 minute. It ends early if you are knocked unconscious or if your turn ends and
//   you haven't attacked a hostile creature since your last turn or taken damage since then.»
//   Y, sobre la armadura: «you can't do so while wearing heavy armor.»
//
// **Lo que este catálogo SÍ deja automatizado**, con las puertas que el proyecto ya tiene: la
// condición se aplica sola al usar la actividad (`effects`, más abajo — `ActivitiesService.usar`
// ya aplica `effects[]` para las cinco actividades por igual, tarea A7) y dura sus 60 segundos de
// reloj de campaña (1 minuto, SRD) sin que nadie tenga que apagarla a mano. El daño cuerpo a
// cuerpo con Fuerza sube por su propio camino (`CharacterSheetService.rollAttack`, que lee esta
// misma condición y la tabla de escala `rage-damage` ya declarada más abajo).
//
// **Lo que NO se automatiza, a propósito, y por qué**: ni «se acaba si no atacas ni recibes daño
// en un asalto» —no hay ningún enganche al final de un asalto que compruebe qué hizo cada
// combatiente, y fingirlo sería inventar un motor de combate que este encargo no construye—, ni
// la ventaja en pruebas y salvaciones de Fuerza, ni la resistencia a los tres tipos de daño, ni
// que no lanzar conjuros exija además soltar la concentración, ni que no funcione con armadura
// pesada: el vocabulario de `effects` (`applyConditionSchema`) solo sabe marcar una condición con
// su duración, no «da ventaja en X» ni «resiste Y» ni «se apaga si Z» — la nota grande de
// `activity.schema.ts` ya declara ese recorte como deliberado. Existir sin automatizarse es mejor
// que no existir: se escribe en `description`, y si la interfaz y el servidor discreparan algún
// día, manda el servidor.
//
// **`CLAVE_FURIA_ACTIVA` se reexporta desde `@dnd/shared` (ronda de arreglo 1, crítico 2) y no se
// declara aquí.** `esClaveReservada` (`character-state.schema.ts`) tiene que reconocer esta clave
// para que la puerta genérica de condiciones no deje que cualquier jugador se regale +2 al daño
// escribiendo `{ key: "raging" }` sobre su propia ficha sin gastar nada — y `shared` no puede
// importar de `apps/api`. Declararla dos veces (aquí y en `shared`) es exactamente cómo una clave
// reservada deja de estarlo el día que una de las dos copias cambia sola.
export { CLAVE_FURIA_ACTIVA };

const FURIA: Actividad = {
  tipo: "utilidad",
  activation: { coste: "BONUS" },
  // El propio uso de la Furia: consume la clave "rage" de `CharacterResource`, la misma que
  // describen sus `usos` más abajo — nunca una tabla nueva (ver `activity.schema.ts`, nota sobre
  // `uses`).
  consumption: [{ recurso: "rage", cantidad: 1 }],
  duration: { valor: 1, unidad: "minuto", concentracion: false },
  // 60 segundos de reloj de campaña = 1 minuto = 10 asaltos (`SEGUNDOS_POR_ASALTO`): el mismo
  // reloj que ya hace caducar solas las condiciones de 2C, aplicado aquí sin motor nuevo.
  effects: [{ key: CLAVE_FURIA_ACTIVA, durationSeconds: 60, note: "Furia activa" }],
  description:
    "Mientras dura (1 minuto): ventaja en pruebas y salvaciones de Fuerza, resistencia a daño " +
    "contundente, perforante y cortante, y no puedes lanzar conjuros ni llevar armadura pesada. " +
    "El servidor SÍ marca el estado y SÍ sube tu daño cuerpo a cuerpo con Fuerza (mira la traza " +
    "del golpe); el resto de esta lista, y que la Furia se corte si pasas un asalto entero sin " +
    "atacar ni recibir daño, los arbitra la mesa.",
};

const RASGO_FURIA: ClassFeature = {
  level: 1,
  key: "rage",
  name: "Furia",
  grant: {
    kind: "grant",
    id: "barbarian-rage",
    labelKey: "class.barbarian.rage",
    actividad: FURIA,
    // El número de usos sube por tramos con el nivel (tabla `barbarian-rages`, más abajo): no se
    // escribe `2` a mano, que acertaría a nivel 1 y mentiría a partir del 3. Y a partir de 20 no
    // hay tramo que valga: el SRD lo declara sin tope (ver la nota grande de arriba).
    usos: {
      max: { tipo: "escala", clave: "barbarian-rages" },
      resetOn: "LONG_REST",
      sinTopeDesde: 20,
    },
  },
};

const ASI_ESTANDAR = [4, 8, 12, 16, 19];

const HABILIDADES_BARBARO: SkillKey[] = [
  "animal-handling",
  "athletics",
  "intimidation",
  "nature",
  "perception",
  "survival",
];

/**
 * Las doce clases del SRD 5.1 **hechas a mano** (nombre, nivel, `scales` de la Furia): el dato
 * fuente que `enriquecerClases` (`./generado`, tarea 3A.1 T3) enriquece con texto, actividades y
 * `grant` sin tocar este array. Se exporta con este nombre "privado" y NO desde `index.ts` — todo
 * consumidor real (`resolve.ts`, `activities.module.ts`, la hoja) importa `SRD_CLASSES` de más
 * abajo, la versión YA enriquecida, que es la que hay que leer si se busca `textEs`/`actividades`.
 */
const SRD_CLASSES_A_MANO: SrdClass[] = [
  {
    key: "barbarian",
    name: "Bárbaro",
    hitDie: 12,
    startingGold: { dice: "2d4", times: 10 },
    saveProficiencies: ["str", "con"],
    armorProficiencies: ["light", "medium", "shield"],
    weaponProficiencies: ["simple", "martial"],
    skillChoice: { choose: 2, from: HABILIDADES_BARBARO },
    attacksPerAction: [{ fromLevel: 5, attacks: 2 }],
    asiLevels: ASI_ESTANDAR,
    features: [
      RASGO_FURIA,
      f(1, "unarmored-defense", "Defensa sin armadura"),
      f(2, "reckless-attack", "Ataque temerario"),
      f(2, "danger-sense", "Sentir el peligro"),
      f(3, "primal-path", "Senda primordial"),
      f(5, "extra-attack", "Ataque adicional"),
      f(5, "fast-movement", "Movimiento rápido"),
      f(7, "feral-instinct", "Instinto salvaje"),
      f(9, "brutal-critical-1", "Crítico brutal (1 dado)"),
      f(11, "relentless-rage", "Furia implacable"),
      f(13, "brutal-critical-2", "Crítico brutal (2 dados)"),
      f(15, "persistent-rage", "Furia persistente"),
      f(17, "brutal-critical-3", "Crítico brutal (3 dados)"),
      f(18, "indomitable-might", "Poderío indómito"),
      f(20, "primal-champion", "Campeón primordial"),
    ],
    subclasses: [
      {
        key: "berserker",
        name: "Senda del berserker",
        chosenAtLevel: 3,
        features: [
          f(3, "frenzy", "Frenesí"),
          f(6, "mindless-rage", "Furia irracional"),
          f(10, "intimidating-presence", "Presencia intimidante"),
          f(14, "retaliation", "Represalia"),
        ],
      },
    ],
    // Tarea A10. Tramos, no veinte filas — y **sin el nivel 20** (ver la nota grande de arriba,
    // sobre `RASGO_FURIA`): el SRD lo declara "Unlimited", que no es un tramo numérico.
    scales: {
      "barbarian-rages": [
        { desde: 1, valor: 2 },
        { desde: 3, valor: 3 },
        { desde: 6, valor: 4 },
        { desde: 12, valor: 5 },
        { desde: 17, valor: 6 },
      ],
      "rage-damage": [
        { desde: 1, valor: 2 },
        { desde: 9, valor: 3 },
        { desde: 16, valor: 4 },
      ],
    },
  },
  {
    key: "bard",
    name: "Bardo",
    hitDie: 8,
    startingGold: { dice: "5d4", times: 10 },
    saveProficiencies: ["dex", "cha"],
    armorProficiencies: ["light"],
    weaponProficiencies: ["simple", "hand-crossbow", "long-sword", "rapier", "short-sword"],
    skillChoice: { choose: 3, from: TODAS_LAS_HABILIDADES },
    spellcastingAbility: "cha",
    spellProgression: "FULL",
    asiLevels: ASI_ESTANDAR,
    features: [
      f(1, "spellcasting", "Lanzamiento de conjuros"),
      f(1, "bardic-inspiration-d6", "Inspiración bárdica (d6)"),
      f(2, "jack-of-all-trades", "Aprendiz de mucho"),
      f(2, "song-of-rest-d6", "Canción de descanso (d6)"),
      f(3, "bard-college", "Colegio bárdico"),
      f(3, "expertise-1", "Pericia"),
      f(5, "bardic-inspiration-d8", "Inspiración bárdica (d8)"),
      f(5, "font-of-inspiration", "Fuente de inspiración"),
      f(6, "countercharm", "Contraencantamiento"),
      f(9, "song-of-rest-d8", "Canción de descanso (d8)"),
      f(10, "bardic-inspiration-d10", "Inspiración bárdica (d10)"),
      f(10, "expertise-2", "Pericia"),
      f(10, "magical-secrets-1", "Secretos mágicos"),
      f(13, "song-of-rest-d10", "Canción de descanso (d10)"),
      f(14, "magical-secrets-2", "Secretos mágicos"),
      f(15, "bardic-inspiration-d12", "Inspiración bárdica (d12)"),
      f(17, "song-of-rest-d12", "Canción de descanso (d12)"),
      f(18, "magical-secrets-3", "Secretos mágicos"),
      f(20, "superior-inspiration", "Inspiración superior"),
    ],
    subclasses: [
      {
        key: "lore",
        name: "Colegio del conocimiento",
        chosenAtLevel: 3,
        features: [
          f(3, "bonus-proficiencies", "Competencias adicionales"),
          f(3, "cutting-words", "Palabras cortantes"),
          f(6, "additional-magical-secrets", "Secretos mágicos adicionales"),
          f(14, "peerless-skill", "Habilidad sin parangón"),
        ],
      },
    ],
  },
  {
    key: "cleric",
    name: "Clérigo",
    hitDie: 8,
    startingGold: { dice: "5d4", times: 10 },
    saveProficiencies: ["wis", "cha"],
    armorProficiencies: ["light", "medium", "shield"],
    weaponProficiencies: ["simple"],
    skillChoice: {
      choose: 2,
      from: ["history", "insight", "medicine", "persuasion", "religion"],
    },
    spellcastingAbility: "wis",
    spellProgression: "FULL",
    asiLevels: ASI_ESTANDAR,
    features: [
      f(1, "spellcasting", "Lanzamiento de conjuros"),
      f(1, "divine-domain", "Dominio divino"),
      f(2, "channel-divinity-1", "Canalizar divinidad (1/descanso)"),
      f(5, "destroy-undead-cr-half", "Destruir muertos vivientes (VD 1/2)"),
      f(6, "channel-divinity-2", "Canalizar divinidad (2/descanso)"),
      f(8, "destroy-undead-cr-1", "Destruir muertos vivientes (VD 1)"),
      f(10, "divine-intervention", "Intercesión divina"),
      f(11, "destroy-undead-cr-2", "Destruir muertos vivientes (VD 2)"),
      f(14, "destroy-undead-cr-3", "Destruir muertos vivientes (VD 3)"),
      f(17, "destroy-undead-cr-4", "Destruir muertos vivientes (VD 4)"),
      f(18, "channel-divinity-3", "Canalizar divinidad (3/descanso)"),
      f(20, "divine-intervention-improvement", "Mejora de intercesión divina"),
    ],
    subclasses: [
      {
        key: "life-domain",
        name: "Dominio de la vida",
        chosenAtLevel: 1,
        features: [
          f(1, "bonus-proficiency", "Competencia adicional"),
          f(1, "disciple-of-life", "Discípulo de la vida"),
          f(2, "preserve-life", "Canalizar divinidad: Preservar vida"),
          f(6, "blessed-healer", "Sanador bendito"),
          f(8, "divine-strike", "Golpe divino"),
          f(17, "supreme-healing", "Sanación suprema"),
        ],
      },
    ],
  },
  {
    key: "druid",
    name: "Druida",
    hitDie: 8,
    startingGold: { dice: "2d4", times: 10 },
    saveProficiencies: ["int", "wis"],
    // El SRD dice «ligera, media y escudos, **no metálicos**». Ese matiz **no es una
    // competencia**: es un tabu de la clase —un druida sabe usar una cota de escamas, pero no
    // quiere—, y modelarlo como una competencia menos haria que el motor le negara una armadura
    // que la regla si le permite llevar. Se queda como texto de la aptitud hasta que haya donde
    // ponerlo; la lista de aqui es lo que el motor entiende.
    armorProficiencies: ["light", "medium", "shield"],
    weaponProficiencies: [
      "greatclub",
      "dagger",
      "dart",
      "javelin",
      "mace",
      "quarterstaff",
      "scimitar",
      "sickle",
      "sling",
      "spear",
    ],
    skillChoice: {
      choose: 2,
      from: [
        "arcana",
        "animal-handling",
        "insight",
        "medicine",
        "nature",
        "perception",
        "religion",
        "survival",
      ],
    },
    spellcastingAbility: "wis",
    spellProgression: "FULL",
    asiLevels: ASI_ESTANDAR,
    features: [
      f(1, "druidic", "Druídico"),
      f(1, "spellcasting", "Lanzamiento de conjuros"),
      f(2, "wild-shape", "Forma salvaje"),
      f(2, "druid-circle", "Círculo druídico"),
      f(4, "wild-shape-improvement-1", "Mejora de forma salvaje"),
      f(8, "wild-shape-improvement-2", "Mejora de forma salvaje"),
      f(18, "timeless-body", "Cuerpo atemporal"),
      f(18, "beast-spells", "Conjurar como bestia"),
      f(20, "archdruid", "Archidruida"),
    ],
    subclasses: [
      {
        key: "circle-of-the-land",
        name: "Círculo de la tierra",
        chosenAtLevel: 2,
        features: [
          f(2, "bonus-cantrip", "Truco adicional"),
          f(2, "natural-recovery", "Recuperación natural"),
          f(3, "circle-spells", "Conjuros de círculo"),
          f(6, "lands-stride", "Paso de la tierra"),
          f(10, "natures-ward", "Protección de la naturaleza"),
          f(14, "natures-sanctuary", "Santuario de la naturaleza"),
        ],
      },
    ],
  },
  {
    key: "fighter",
    name: "Guerrero",
    hitDie: 10,
    startingGold: { dice: "5d4", times: 10 },
    saveProficiencies: ["str", "con"],
    armorProficiencies: ["light", "medium", "heavy", "shield"],
    weaponProficiencies: ["simple", "martial"],
    skillChoice: {
      choose: 2,
      from: [
        "acrobatics",
        "animal-handling",
        "athletics",
        "history",
        "insight",
        "intimidation",
        "perception",
        "survival",
      ],
    },
    // El guerrero es la única clase con **siete** mejoras de característica.
    attacksPerAction: [
      { fromLevel: 5, attacks: 2 },
      { fromLevel: 11, attacks: 3 },
      { fromLevel: 20, attacks: 4 },
    ],
    asiLevels: [4, 6, 8, 12, 14, 16, 19],
    features: [
      f(1, "fighting-style", "Estilo de combate"),
      f(1, "second-wind", "Tomar aliento"),
      f(2, "action-surge-1", "Acción súbita (un uso)"),
      f(3, "martial-archetype", "Arquetipo marcial"),
      f(5, "extra-attack-1", "Ataque adicional"),
      f(9, "indomitable-1", "Indómito (un uso)"),
      f(11, "extra-attack-2", "Ataque adicional (2)"),
      f(13, "indomitable-2", "Indómito (dos usos)"),
      f(17, "action-surge-2", "Acción súbita (dos usos)"),
      f(17, "indomitable-3", "Indómito (tres usos)"),
      f(20, "extra-attack-3", "Ataque adicional (3)"),
    ],
    subclasses: [
      {
        key: "champion",
        name: "Campeón",
        chosenAtLevel: 3,
        features: [
          f(3, "improved-critical", "Crítico mejorado"),
          f(7, "remarkable-athlete", "Atleta sobresaliente"),
          f(10, "additional-fighting-style", "Estilo de combate adicional"),
          f(15, "superior-critical", "Crítico superior"),
          f(18, "survivor", "Superviviente"),
        ],
      },
    ],
  },
  {
    key: "monk",
    name: "Monje",
    hitDie: 8,
    startingGold: { dice: "5d4", times: 1 },
    saveProficiencies: ["str", "dex"],
    armorProficiencies: [],
    weaponProficiencies: ["simple", "short-sword"],
    skillChoice: {
      choose: 2,
      from: ["acrobatics", "athletics", "history", "insight", "religion", "stealth"],
    },
    attacksPerAction: [{ fromLevel: 5, attacks: 2 }],
    asiLevels: ASI_ESTANDAR,
    features: [
      f(1, "unarmored-defense", "Defensa sin armadura"),
      f(1, "martial-arts", "Artes marciales"),
      f(2, "ki", "Ki"),
      f(2, "unarmored-movement", "Movimiento sin armadura"),
      f(3, "monastic-tradition", "Tradición monástica"),
      f(3, "deflect-missiles", "Desviar proyectiles"),
      f(4, "slow-fall", "Caída lenta"),
      f(5, "extra-attack", "Ataque adicional"),
      f(5, "stunning-strike", "Golpe aturdidor"),
      f(6, "ki-empowered-strikes", "Golpes potenciados con ki"),
      f(7, "evasion", "Evasión"),
      f(7, "stillness-of-mind", "Quietud mental"),
      f(9, "unarmored-movement-improvement", "Mejora de movimiento sin armadura"),
      f(10, "purity-of-body", "Pureza de cuerpo"),
      f(13, "tongue-of-the-sun-and-moon", "Lengua del sol y la luna"),
      f(14, "diamond-soul", "Alma diamantina"),
      f(15, "timeless-body", "Cuerpo atemporal"),
      f(18, "empty-body", "Cuerpo vacío"),
      f(20, "perfect-self", "Yo perfecto"),
    ],
    subclasses: [
      {
        key: "open-hand",
        name: "Camino de la mano abierta",
        chosenAtLevel: 3,
        features: [
          f(3, "open-hand-technique", "Técnica de la mano abierta"),
          f(6, "wholeness-of-body", "Plenitud de cuerpo"),
          f(11, "tranquility", "Tranquilidad"),
          f(17, "quivering-palm", "Palma estremecedora"),
        ],
      },
    ],
  },
  {
    key: "paladin",
    name: "Paladín",
    hitDie: 10,
    startingGold: { dice: "5d4", times: 10 },
    saveProficiencies: ["wis", "cha"],
    armorProficiencies: ["light", "medium", "heavy", "shield"],
    weaponProficiencies: ["simple", "martial"],
    skillChoice: {
      choose: 2,
      from: ["athletics", "insight", "intimidation", "medicine", "persuasion", "religion"],
    },
    spellcastingAbility: "cha",
    // Desde el 2, no desde el 1. Antes esto era un comentario que el código no aplicaba.
    spellcastingFromLevel: 2,
    spellProgression: "HALF",
    attacksPerAction: [{ fromLevel: 5, attacks: 2 }],
    asiLevels: ASI_ESTANDAR,
    features: [
      f(1, "divine-sense", "Sentidos divinos"),
      f(1, "lay-on-hands", "Imponer las manos"),
      f(2, "fighting-style", "Estilo de combate"),
      f(2, "spellcasting", "Lanzamiento de conjuros"),
      f(2, "divine-smite", "Castigo divino"),
      f(3, "divine-health", "Salud divina"),
      f(3, "sacred-oath", "Juramento sagrado"),
      f(5, "extra-attack", "Ataque adicional"),
      f(6, "aura-of-protection", "Aura de protección"),
      f(10, "aura-of-courage", "Aura de coraje"),
      f(11, "improved-divine-smite", "Castigo divino mejorado"),
      f(14, "cleansing-touch", "Toque purificador"),
      f(18, "aura-improvements", "Mejoras de auras"),
    ],
    subclasses: [
      {
        key: "oath-of-devotion",
        name: "Juramento de entrega",
        chosenAtLevel: 3,
        features: [
          f(3, "oath-spells", "Conjuros de juramento"),
          f(3, "channel-divinity", "Canalizar divinidad"),
          f(7, "aura-of-devotion", "Aura de entrega"),
          f(15, "purity-of-spirit", "Pureza de espíritu"),
          f(20, "holy-nimbus", "Halo sagrado"),
        ],
      },
    ],
  },
  {
    key: "ranger",
    name: "Explorador",
    hitDie: 10,
    startingGold: { dice: "5d4", times: 10 },
    saveProficiencies: ["str", "dex"],
    armorProficiencies: ["light", "medium", "shield"],
    weaponProficiencies: ["simple", "martial"],
    skillChoice: {
      choose: 3,
      from: [
        "animal-handling",
        "athletics",
        "insight",
        "investigation",
        "nature",
        "perception",
        "stealth",
        "survival",
      ],
    },
    spellcastingAbility: "wis",
    spellcastingFromLevel: 2,
    spellProgression: "HALF",
    attacksPerAction: [{ fromLevel: 5, attacks: 2 }],
    asiLevels: ASI_ESTANDAR,
    features: [
      f(1, "favored-enemy", "Enemigo predilecto"),
      f(1, "natural-explorer", "Explorador nato"),
      f(2, "fighting-style", "Estilo de combate"),
      f(2, "spellcasting", "Lanzamiento de conjuros"),
      f(3, "ranger-archetype", "Arquetipo de explorador"),
      f(3, "primeval-awareness", "Percepción primigenia"),
      f(5, "extra-attack", "Ataque adicional"),
      f(6, "favored-enemy-improvement", "Mejoras de enemigo predilecto y explorador nato"),
      f(8, "lands-stride", "Paso de la tierra"),
      f(10, "natural-explorer-improvement", "Mejora de explorador nato"),
      f(10, "hide-in-plain-sight", "Esconderse a plena vista"),
      f(14, "favored-enemy-improvement-2", "Mejora de enemigo predilecto"),
      f(14, "vanish", "Desvanecerse"),
      f(18, "feral-senses", "Sentidos salvajes"),
      f(20, "foe-slayer", "Azote de enemigos"),
    ],
    subclasses: [
      {
        key: "hunter",
        name: "Cazador",
        chosenAtLevel: 3,
        features: [
          f(3, "hunters-prey", "El cazador y la presa"),
          f(7, "defensive-tactics", "Tácticas defensivas"),
          f(11, "multiattack", "Ataque múltiple"),
          f(15, "superior-hunters-defense", "Defensa de cazador experto"),
        ],
      },
    ],
  },
  {
    key: "rogue",
    name: "Pícaro",
    hitDie: 8,
    startingGold: { dice: "4d4", times: 10 },
    saveProficiencies: ["dex", "int"],
    armorProficiencies: ["light"],
    weaponProficiencies: ["simple", "hand-crossbow", "long-sword", "rapier", "short-sword"],
    skillChoice: {
      choose: 4,
      from: [
        "acrobatics",
        "athletics",
        "deception",
        "insight",
        "intimidation",
        "investigation",
        "perception",
        "performance",
        "persuasion",
        "sleight-of-hand",
        "stealth",
      ],
    },
    // El pícaro tiene una mejora extra al nivel 10.
    asiLevels: [4, 8, 10, 12, 16, 19],
    features: [
      f(1, "expertise-1", "Pericia"),
      f(1, "sneak-attack", "Ataque furtivo"),
      f(1, "thieves-cant", "Jerga de ladrones"),
      f(2, "cunning-action", "Acción astuta"),
      f(3, "roguish-archetype", "Arquetipo de pícaro"),
      f(5, "uncanny-dodge", "Esquiva asombrosa"),
      f(6, "expertise-2", "Pericia"),
      f(7, "evasion", "Evasión"),
      f(11, "reliable-talent", "Talentos fiables"),
      f(14, "blindsense", "Sentir sin ver"),
      f(15, "slippery-mind", "Mente escurridiza"),
      f(18, "elusive", "Elusivo"),
      f(20, "stroke-of-luck", "Golpe de suerte"),
    ],
    subclasses: [
      {
        key: "thief",
        name: "Ladrón",
        chosenAtLevel: 3,
        features: [
          f(3, "fast-hands", "Manos rápidas"),
          f(3, "second-story-work", "Balconero"),
          f(9, "supreme-sneak", "Sigilo supremo"),
          f(13, "use-magic-device", "Usar objetos mágicos"),
          f(17, "thiefs-reflexes", "Reflejos de ladrón"),
        ],
      },
    ],
  },
  {
    key: "sorcerer",
    name: "Hechicero",
    hitDie: 6,
    startingGold: { dice: "3d4", times: 10 },
    saveProficiencies: ["con", "cha"],
    armorProficiencies: [],
    weaponProficiencies: ["dagger", "dart", "sling", "quarterstaff", "light-crossbow"],
    skillChoice: {
      choose: 2,
      from: ["arcana", "deception", "insight", "intimidation", "persuasion", "religion"],
    },
    spellcastingAbility: "cha",
    spellProgression: "FULL",
    asiLevels: ASI_ESTANDAR,
    features: [
      f(1, "spellcasting", "Lanzamiento de conjuros"),
      f(1, "sorcerous-origin", "Origen mágico"),
      f(2, "font-of-magic", "Fuente de magia"),
      f(3, "metamagic-1", "Metamagia"),
      f(10, "metamagic-2", "Metamagia"),
      f(17, "metamagic-3", "Metamagia"),
      f(20, "sorcerous-restoration", "Recuperación mágica"),
    ],
    subclasses: [
      {
        key: "draconic-bloodline",
        name: "Linaje dracónico",
        chosenAtLevel: 1,
        features: [
          f(1, "dragon-ancestor", "Ancestro dragón"),
          f(1, "draconic-resilience", "Resistencia dracónica"),
          f(6, "elemental-affinity", "Afinidad elemental"),
          f(14, "dragon-wings", "Alas de dragón"),
          f(18, "draconic-presence", "Presencia dracónica"),
        ],
      },
    ],
  },
  {
    key: "warlock",
    name: "Brujo",
    hitDie: 8,
    startingGold: { dice: "4d4", times: 10 },
    saveProficiencies: ["wis", "cha"],
    armorProficiencies: ["light"],
    weaponProficiencies: ["simple"],
    skillChoice: {
      choose: 2,
      from: [
        "arcana",
        "deception",
        "history",
        "intimidation",
        "investigation",
        "nature",
        "religion",
      ],
    },
    spellcastingAbility: "cha",
    spellProgression: "PACT",
    asiLevels: ASI_ESTANDAR,
    features: [
      f(1, "otherworldly-patron", "Patrón sobrenatural"),
      f(1, "pact-magic", "Magia del pacto"),
      f(2, "eldritch-invocations", "Invocaciones sobrenaturales"),
      f(3, "pact-boon", "Beneficio del pacto"),
      f(11, "mystic-arcanum-6", "Arcanum místico (nivel 6)"),
      f(13, "mystic-arcanum-7", "Arcanum místico (nivel 7)"),
      f(15, "mystic-arcanum-8", "Arcanum místico (nivel 8)"),
      f(17, "mystic-arcanum-9", "Arcanum místico (nivel 9)"),
      f(20, "eldritch-master", "Maestro sobrenatural"),
    ],
    subclasses: [
      {
        key: "the-fiend",
        name: "El Infernal",
        chosenAtLevel: 1,
        features: [
          f(1, "expanded-spell-list", "Lista de conjuros ampliada"),
          f(1, "dark-ones-blessing", "Bendición del Oscuro"),
          f(6, "dark-ones-own-luck", "La suerte del Oscuro"),
          f(10, "fiendish-resilience", "Resistencia infernal"),
          f(14, "hurl-through-hell", "Arrastrar por el infierno"),
        ],
      },
    ],
  },
  {
    key: "wizard",
    name: "Mago",
    hitDie: 6,
    startingGold: { dice: "4d4", times: 10 },
    saveProficiencies: ["int", "wis"],
    armorProficiencies: [],
    weaponProficiencies: ["dagger", "dart", "sling", "quarterstaff", "light-crossbow"],
    skillChoice: {
      choose: 2,
      from: ["arcana", "history", "insight", "investigation", "medicine", "religion"],
    },
    spellcastingAbility: "int",
    spellProgression: "FULL",
    asiLevels: ASI_ESTANDAR,
    features: [
      f(1, "spellcasting", "Lanzamiento de conjuros"),
      f(1, "arcane-recovery", "Recuperación arcana"),
      f(2, "arcane-tradition", "Tradición arcana"),
      f(18, "spell-mastery", "Maestría sobre conjuros"),
      f(20, "signature-spells", "Conjuros característicos"),
    ],
    subclasses: [
      {
        key: "evocation",
        name: "Escuela de evocación",
        chosenAtLevel: 2,
        features: [
          f(2, "evocation-savant", "Experto en evocación"),
          f(2, "sculpt-spells", "Esculpir conjuros"),
          f(6, "potent-cantrip", "Truco potente"),
          f(10, "empowered-evocation", "Evocación potenciada"),
          f(14, "overchannel", "Sobrecanalizar"),
        ],
      },
    ],
  },
];

/**
 * **Las doce clases, enriquecidas** (tarea 3A.1, T3). Se calcula UNA VEZ al importar este
 * módulo — igual que `SRD_SPELLS` en `./generado`, y por el mismo motivo: un catálogo generado
 * inválido revienta en el arranque, no a mitad de una petición. `enriquecerClases` nunca muta
 * `SRD_CLASSES_A_MANO`; esto es una copia con `nameEn/textEs/textEn/actividades/sinTraduccion`
 * añadidos por `key`, `grant` construido donde faltaba (nunca donde la Furia ya lo trae a mano)
 * y las `scales` fundidas con las del catálogo generado (`barbarian-rages` a mano gana).
 */
export const SRD_CLASSES: SrdClass[] = enriquecerClases(SRD_CLASSES_A_MANO);
