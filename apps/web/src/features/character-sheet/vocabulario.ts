import type {
  AbilityKey,
  DamageType,
  ProficiencyLevel,
  SkillKey,
  TraceOp,
  TraceSourceType,
  WeaponProperty,
} from "@dnd/shared";

// Tarea 2A.10 — el vocabulario de la hoja.
//
// **Ningún valor de enumeración llega a la pantalla** (docs/04-convenciones.md). El motor de
// 2A.2/2A.3 nunca devuelve prosa: devuelve claves estables (`labelKey`, `sourceKey`, códigos de
// aviso, claves de característica/habilidad). Este fichero es el único sitio de
// `features/character-sheet` donde esas claves se convierten en español, y todo lo demás las
// importa de aquí.
//
// **Una `labelKey` sin traducción tiene que verse como tal en una prueba, no descubrirse
// mirando la pantalla**: `traducirLabelKey` nunca devuelve una cadena vacía ni la clave cruda a
// secas — marca el resultado con `conocida: false` y un texto que empieza por
// "Sin traducir:", así una prueba puede recorrer el catálogo de claves que el motor puede emitir
// (`ETIQUETAS_QUE_EL_MOTOR_PUEDE_EMITIR`, en el test) y fallar si alguna no está aquí.

export const NOMBRE_CARACTERISTICA: Record<AbilityKey, string> = {
  str: "Fuerza",
  dex: "Destreza",
  con: "Constitución",
  int: "Inteligencia",
  wis: "Sabiduría",
  cha: "Carisma",
};

export const ABREVIATURA_CARACTERISTICA: Record<AbilityKey, string> = {
  str: "FUE",
  dex: "DES",
  con: "CON",
  int: "INT",
  wis: "SAB",
  cha: "CAR",
};

// Las dieciocho del SRD 5.1 — mismas claves que `SKILLS` en `@dnd/shared`.
export const NOMBRE_HABILIDAD: Record<SkillKey, string> = {
  acrobatics: "Acrobacias",
  "animal-handling": "Trato con animales",
  arcana: "Arcanos",
  athletics: "Atletismo",
  deception: "Engaño",
  history: "Historia",
  insight: "Perspicacia",
  intimidation: "Intimidación",
  investigation: "Investigación",
  medicine: "Medicina",
  nature: "Naturaleza",
  perception: "Percepción",
  performance: "Interpretación",
  persuasion: "Persuasión",
  religion: "Religión",
  "sleight-of-hand": "Juego de manos",
  stealth: "Sigilo",
  survival: "Supervivencia",
};

export const NOMBRE_COMPETENCIA: Record<ProficiencyLevel, string> = {
  none: "Sin competencia",
  half: "Media competencia",
  proficient: "Competente",
  expertise: "Pericia",
};

// --- Carril B3 (fase 2B/2C) — el cuadro de ataques: los trece tipos de daño y las diez
// propiedades de arma del SRD 5.1 (`packages/shared/src/item.schema.ts`). Ninguno de los dos
// llega nunca crudo a la columna «Daño / tipo» ni a «Notas». ---

/** En minúscula: se pinta pegado al dado, «1d8+3 perforante», igual que la maqueta. */
export const NOMBRE_TIPO_DANO: Record<DamageType, string> = {
  BLUDGEONING: "contundente",
  PIERCING: "perforante",
  SLASHING: "cortante",
  ACID: "ácido",
  COLD: "frío",
  FIRE: "fuego",
  FORCE: "fuerza",
  LIGHTNING: "relámpago",
  NECROTIC: "necrótico",
  POISON: "veneno",
  PSYCHIC: "psíquico",
  RADIANT: "radiante",
  THUNDER: "trueno",
};

export function nombreTipoDano(tipo: DamageType): string {
  return NOMBRE_TIPO_DANO[tipo] ?? `Sin traducir: ${tipo}`;
}

export const NOMBRE_PROPIEDAD_ARMA: Record<WeaponProperty, string> = {
  AMMUNITION: "Munición",
  FINESSE: "Sutil",
  HEAVY: "Pesada",
  LIGHT: "Ligera",
  LOADING: "Recarga",
  REACH: "Alcance",
  SPECIAL: "Especial",
  THROWN: "Arrojadiza",
  TWO_HANDED: "A dos manos",
  VERSATILE: "Versátil",
};

export function nombrePropiedadArma(propiedad: WeaponProperty): string {
  return NOMBRE_PROPIEDAD_ARMA[propiedad] ?? `Sin traducir: ${propiedad}`;
}

/** La bolsa: las cinco monedas del SRD, en el orden en que se leen de mayor a menor valor. */
export const NOMBRE_MONEDA: Record<"pp" | "gp" | "ep" | "sp" | "cp", string> = {
  pp: "Platino",
  gp: "Oro",
  ep: "Electro",
  sp: "Plata",
  cp: "Cobre",
};

export const NOMBRE_OPERACION_TRAZA: Record<TraceOp, string> = {
  base: "base",
  add: "suma",
  override: "anula",
  cap: "recorta",
};

export const NOMBRE_TIPO_ORIGEN: Record<TraceSourceType, string> = {
  base: "base",
  ability: "característica",
  race: "raza",
  subrace: "subraza",
  class: "clase",
  level: "nivel",
  item: "objeto",
  proficiency: "competencia",
  manual: "manual",
};

// Las quince condiciones que el motor entiende (`SRD_CONDITIONS`, character-state.schema.ts) —
// más las claves que usa `effective-speed.ts` como `sourceKey` cuando anota la causa de una
// velocidad recortada (`exhaustion:<nivel>`), que se resuelven aparte en `nombreCausaVelocidad`.
export const NOMBRE_CONDICION: Record<string, string> = {
  blinded: "Cegado",
  charmed: "Encantado",
  deafened: "Ensordecido",
  frightened: "Asustado",
  grappled: "Agarrado",
  incapacitated: "Incapacitado",
  invisible: "Invisible",
  paralyzed: "Paralizado",
  petrified: "Petrificado",
  poisoned: "Envenenado",
  prone: "Derribado",
  restrained: "Apresado",
  stunned: "Aturdido",
  unconscious: "Inconsciente",
  exhaustion: "Agotamiento",
};

export function nombreCondicion(key: string): string {
  return NOMBRE_CONDICION[key] ?? `Sin traducir: ${key}`;
}

/** La causa que anota `effective-speed.ts` en un paso `speed.condition.*`: una condición o `exhaustion:<nivel>`. */
export function nombreCausaVelocidad(sourceKey: string): string {
  const agotamiento = /^exhaustion:(\d+)$/.exec(sourceKey);
  if (agotamiento) return `Agotamiento nivel ${agotamiento[1]}`;
  return nombreCondicion(sourceKey);
}

export const NOMBRE_RESET_RECURSO: Record<string, string> = {
  NONE: "No se repone solo",
  SHORT_REST: "Descanso corto",
  LONG_REST: "Descanso largo",
};

export const NOMBRE_CONCEDIDO_POR: Record<string, string> = {
  DM_ONLY: "Solo el DM",
  OWNER: "El dueño",
};

// --- Armaduras del SRD 5.1 (apps/api/src/rules/catalog/armor.ts). Solo nombres: la fórmula la
// calcula y la comprueba el servidor; esto es exclusivamente la forma legible de la clave. ---
export const NOMBRE_ARMADURA: Record<string, string> = {
  padded: "Acolchada",
  leather: "Cuero",
  "studded-leather": "Cuero tachonado",
  hide: "Pieles",
  "chain-shirt": "Camisa de malla",
  "scale-mail": "Cota de escamas",
  breastplate: "Coraza",
  "half-plate": "Media armadura",
  "ring-mail": "Cota guarnecida",
  "chain-mail": "Cota de malla",
  splint: "Armadura de bandas",
  plate: "Armadura de placas",
  shield: "Escudo",
};

// --- Nombres de razas, subrazas, clases y armaduras ---
//
// **Ya NO son la fuente de las opciones**: eso lo da `GET /catalog`. Y desde el 2026-09-02
// llevan los **nombres oficiales del SRD 5.1 en español**, los que publica Wizards — no una
// traducción nuestra. Cuando se adoptaron en el servidor, esta copia se quedó contradiciéndolo
// en diez claves durante un rato; lo cazó el propio agente que hizo el cambio. Si algún día
// vuelven a separarse, la de la API manda. Siguen aquí porque una
// clave guardada se pinta en sitios donde no hay catálogo cargado (una traza, un aviso, un
// personaje de otra campaña), y ahí más vale un nombre que una clave cruda. Si una clave nueva
// del servidor no está aquí, se ve «Sin traducir: <clave>» — visible y no silencioso.
export const NOMBRE_RAZA: Record<string, string> = {
  dwarf: "Enano",
  elf: "Elfo",
  halfling: "Mediano",
  human: "Humano",
  dragonborn: "Dracónido",
  gnome: "Gnomo",
  "half-elf": "Semielfo",
  "half-orc": "Semiorco",
  tiefling: "Tiefling",
};

export const NOMBRE_SUBRAZA: Record<string, string> = {
  "dwarf-hill": "Enano de las colinas",
  "elf-high": "Alto elfo",
  "halfling-lightfoot": "Piesligeros",
  "gnome-rock": "Gnomo de las rocas",
};

// --- Clases del SRD 5.1 (apps/api/src/rules/catalog/classes.ts). Mismas claves. ---
export const NOMBRE_CLASE: Record<string, string> = {
  barbarian: "Bárbaro",
  bard: "Bardo",
  cleric: "Clérigo",
  druid: "Druida",
  fighter: "Guerrero",
  monk: "Monje",
  paladin: "Paladín",
  ranger: "Explorador",
  rogue: "Pícaro",
  sorcerer: "Hechicero",
  warlock: "Brujo",
  wizard: "Mago",
};

function nombreOSinTraducir(dic: Record<string, string>, clave: string): string {
  return dic[clave] ?? `Sin traducir: ${clave}`;
}

export function nombreRaza(key: string): string {
  return nombreOSinTraducir(NOMBRE_RAZA, key);
}
export function nombreSubraza(key: string): string {
  return nombreOSinTraducir(NOMBRE_SUBRAZA, key);
}
export function nombreClase(key: string): string {
  return nombreOSinTraducir(NOMBRE_CLASE, key);
}
export function nombreArmadura(key: string): string {
  return nombreOSinTraducir(NOMBRE_ARMADURA, key);
}

/**
 * El nombre de un objeto equipado a partir de su `ref` (`SRD:chain-mail`, `CAMPAIGN:<cuid>`),
 * usado por la traza de la CA cuando el paso viene de `items.ts` (carril B3). Solo un `ref` del
 * SRD tiene nombre fijo que este fichero conozca; uno de campaña es un objeto propio de la mesa
 * y su nombre no viaja en la traza, así que la frase honesta es «objeto equipado» y no el cuid.
 */
function nombreDeRefDeObjeto(ref: string): string {
  const srd = /^SRD:([a-z0-9-]+)$/.exec(ref);
  if (srd && srd[1] in NOMBRE_ARMADURA) return NOMBRE_ARMADURA[srd[1]];
  return "objeto equipado";
}

/**
 * Contexto legible de una concesión de raza/subraza/clase, a partir de su `labelKey`
 * (`race.halfElf.asi`, `class.bard.skills`…), para componer frases como
 * «Elige 2 habilidades — Semielfo». Solo se usa para el sufijo entre paréntesis de una elección
 * pendiente; nunca sustituye a `traducirLabelKey` para la traza.
 */
function contextoDeOrigen(labelKey: string): string | undefined {
  const clase = /^class\.([a-z-]+)\.skills$/.exec(labelKey);
  if (clase) return nombreClase(clase[1]);
  if (labelKey === "race.halfElf.asi") return "Semielfo";
  if (labelKey === "race.halfElf.skills") return "Semielfo";
  return undefined;
}

export interface Traduccion {
  texto: string;
  conocida: boolean;
}

/**
 * Frases fijas del motor (2A.2) y de la velocidad efectiva (2A.12) que no dependen de ninguna
 * clave de catálogo — se conocen de memoria, no se derivan de un patrón.
 */
const ETIQUETAS_FIJAS: Record<string, string> = {
  proficiencyBonus: "Bonificador de competencia",
  "ac.unarmored": "Sin armadura",
  "maxHp.firstLevel": "Dado de golpe (nivel 1)",
  "maxHp.perLevel": "Media del dado de golpe por nivel",
  "maxHp.conPerLevel": "Constitución por nivel",
  "maxHp.minimum": "Mínimo de 1 PG por nivel",
  "passive.base": "Base de un valor pasivo",
  "senses.darkvision": "Visión en la oscuridad",
  halfProficiency: "Media competencia",
  expertise: "Pericia (duplica la competencia)",
  "spellSaveDc.base": "Base de la CD de conjuro",
  "speed.base": "Velocidad base",
  "speed.condition.zero": "Una condición deja la velocidad en 0",
  "speed.condition.half": "Una condición reduce la velocidad a la mitad",
  // **Faltaba, y se veía.** `character-sheet.service.ts` mete cada anulación del DM en la traza
  // con `labelKey: "override.manual"`, y aquí no estaba: el paso salía en pantalla como
  // «Sin traducir: override.manual». Nadie lo había visto porque la lista de claves que la
  // prueba recorre tampoco la tenía — la prueba copiaba el mismo olvido.
  "override.manual": "Anulación del DM",
  // Tarea 2C.4 — el agotamiento partiendo los PG máximos
  // (`apps/api/src/character-state/common/agotamiento.ts`). **El nivel no va en el texto**: el
  // `labelKey` es el mismo para los niveles 4, 5 y 6 —la tabla del SRD parte los PG a partir del
  // cuarto y no vuelve a partirlos—, y quien lleva el nivel es el `sourceKey`
  // (`exhaustion:<nivel>`), que se lee con `nivelDeAgotamientoDeSourceKey`. Escribir «nivel 4»
  // aquí mentiría en cuanto alguien llegara al 5.
  "maxHp.exhaustion.half": "Agotamiento: los puntos de golpe máximos, a la mitad",
};

/**
 * El nivel que lleva dentro un `sourceKey` de agotamiento (`exhaustion:4`), o `null` si el paso
 * no viene del agotamiento. Es el mismo formato que ya usa `nombreCausaVelocidad`; aquí hace
 * falta el número, no la frase, para poder decir de qué nivel se habla.
 */
export function nivelDeAgotamientoDeSourceKey(sourceKey: string): number | null {
  const m = /^exhaustion:(\d+)$/.exec(sourceKey);
  return m ? Number(m[1]) : null;
}

/**
 * Traduce una `labelKey` del motor a español. **Nunca** devuelve la clave cruda como si fuera
 * prosa: si no la reconoce, lo dice (`conocida: false`), que es justo lo que la prueba de
 * cobertura de claves necesita para fallar en vez de imprimir silenciosamente el inglés.
 */
export function traducirLabelKey(labelKey: string): Traduccion {
  if (labelKey in ETIQUETAS_FIJAS) return { texto: ETIQUETAS_FIJAS[labelKey], conocida: true };

  let m = /^ability\.([a-z]+)\.base$/.exec(labelKey);
  if (m && m[1] in NOMBRE_CARACTERISTICA) {
    return {
      texto: `Puntuación de ${NOMBRE_CARACTERISTICA[m[1] as AbilityKey]}`,
      conocida: true,
    };
  }

  m = /^abilityMod\.([a-z]+)$/.exec(labelKey);
  if (m && m[1] in NOMBRE_CARACTERISTICA) {
    return { texto: `Modificador de ${NOMBRE_CARACTERISTICA[m[1] as AbilityKey]}`, conocida: true };
  }

  if (labelKey === "skill.perception") {
    return { texto: NOMBRE_HABILIDAD.perception, conocida: true };
  }

  m = /^ac\.cap\.([a-z0-9-]+)$/.exec(labelKey);
  if (m && m[1] in NOMBRE_ARMADURA) {
    return { texto: `Tope de Destreza de ${NOMBRE_ARMADURA[m[1]]}`, conocida: true };
  }

  m = /^armor\.([a-z0-9-]+)$/.exec(labelKey);
  if (m && m[1] in NOMBRE_ARMADURA) {
    return { texto: NOMBRE_ARMADURA[m[1]], conocida: true };
  }

  // Carril B3 — el equipo equipado (fase 2B). `items.ts` mete cada armadura en la traza como
  // `item.<ref>` (`item.SRD:chain-mail`, `item.CAMPAIGN:<cuid>`), con `.strengthPenalty` cuando
  // el paso es la penalización de velocidad por no llegar a la Fuerza que pide, y el recorte de
  // Destreza que produce como `ac.cap.<ref>` — la misma forma que `ac.cap.<key>` de arriba, pero
  // con el `ref` completo del objeto en vez de la clave suelta del catálogo. Un objeto del SRD
  // tiene nombre fijo (`NOMBRE_ARMADURA`); uno de campaña es prosa libre del DM que esta traza no
  // trae consigo —solo el `ref`—, así que aquí no hay nada que traducir letra por letra: se dice
  // lo que sí se sabe.
  m = /^item\.(SRD:[a-z0-9-]+|CAMPAIGN:[A-Za-z0-9]+)(\.strengthPenalty)?$/.exec(labelKey);
  if (m) {
    const nombre = nombreDeRefDeObjeto(m[1]);
    return {
      texto: m[2] ? `Requisito de Fuerza sin cumplir (${nombre})` : nombre,
      conocida: true,
    };
  }

  m = /^ac\.cap\.(SRD:[a-z0-9-]+|CAMPAIGN:[A-Za-z0-9]+)$/.exec(labelKey);
  if (m) {
    return { texto: `Tope de Destreza de ${nombreDeRefDeObjeto(m[1])}`, conocida: true };
  }

  m = /^race\.([a-zA-Z]+)\.([a-zA-Z]+)$/.exec(labelKey);
  if (m && m[1] in RACE_LABEL_KEY_TO_KEY) {
    return { texto: nombreRaza(RACE_LABEL_KEY_TO_KEY[m[1]]), conocida: true };
  }

  m = /^subrace\.([a-zA-Z]+)\.([a-zA-Z]+)$/.exec(labelKey);
  if (m && m[1] in SUBRACE_LABEL_KEY_TO_KEY) {
    return { texto: nombreSubraza(SUBRACE_LABEL_KEY_TO_KEY[m[1]]), conocida: true };
  }

  m = /^class\.([a-z-]+)\.skills$/.exec(labelKey);
  if (m && m[1] in NOMBRE_CLASE) {
    return { texto: `Elección de habilidades de ${nombreClase(m[1])}`, conocida: true };
  }

  return { texto: `Sin traducir: ${labelKey}`, conocida: false };
}

// `race.halfElf.cha` usa el segmento en camelCase (`halfElf`), no la clave con guion
// (`half-elf`) del catálogo: este mapa es la traducción entre las dos formas de la MISMA raza.
const RACE_LABEL_KEY_TO_KEY: Record<string, string> = {
  dwarf: "dwarf",
  elf: "elf",
  halfling: "halfling",
  human: "human",
  dragonborn: "dragonborn",
  gnome: "gnome",
  halfElf: "half-elf",
  halfOrc: "half-orc",
  tiefling: "tiefling",
};

const SUBRACE_LABEL_KEY_TO_KEY: Record<string, string> = {
  dwarfHill: "dwarf-hill",
  elfHigh: "elf-high",
  halflingLightfoot: "halfling-lightfoot",
  gnomeRock: "gnome-rock",
};

/** Frase para una tarea pendiente de la lista de elecciones (nunca para la traza). */
export function describirEleccionPendiente(choice: {
  labelKey: string;
  kind: "abilityChoice" | "skillChoice";
  choose: number;
}): string {
  const contexto = contextoDeOrigen(choice.labelKey);
  const base =
    choice.kind === "abilityChoice"
      ? `Elige ${choice.choose} característica${choice.choose === 1 ? "" : "s"} para mejorar`
      : `Elige ${choice.choose} habilidad${choice.choose === 1 ? "" : "es"}`;
  return contexto ? `${base} — ${contexto}` : base;
}

/** El nombre legible de una opción ofrecida en una elección (`from`), según su tipo. */
export function nombreOpcionDeEleccion(
  kind: "abilityChoice" | "skillChoice",
  opcion: string,
): string {
  if (kind === "abilityChoice") {
    return opcion in NOMBRE_CARACTERISTICA ? NOMBRE_CARACTERISTICA[opcion as AbilityKey] : opcion;
  }
  return opcion in NOMBRE_HABILIDAD ? NOMBRE_HABILIDAD[opcion as SkillKey] : opcion;
}

/** Un aviso de derivación (`DerivationWarning`), en español, con los datos que trae consigo. */
export function describirAviso(warning: {
  code: string;
  key?: string;
  data?: Record<string, string | number>;
}): string {
  const d = warning.data ?? {};
  switch (warning.code) {
    case "unresolved_choice": {
      const needed = d.needed ?? "?";
      const picked = d.picked ?? 0;
      return `Falta completar una elección: ${picked} de ${needed} decididas.`;
    }
    case "duplicate_skill_choice": {
      const habilidad =
        typeof d.skill === "string" && d.skill in NOMBRE_HABILIDAD
          ? NOMBRE_HABILIDAD[d.skill as SkillKey]
          : String(d.skill ?? "");
      const nivelActual =
        typeof d.alreadyAt === "string" && d.alreadyAt in NOMBRE_COMPETENCIA
          ? NOMBRE_COMPETENCIA[d.alreadyAt as ProficiencyLevel]
          : String(d.alreadyAt ?? "");
      return `Elegir ${habilidad} no cambia nada: ya tienes «${nivelActual}» por otra vía.`;
    }
    case "ac_formula_discarded": {
      const nombre =
        typeof d.labelKey === "string" ? traducirLabelKey(d.labelKey).texto : String(d.formula);
      return `Con ${nombre} tendrías CA ${d.total}.`;
    }
    case "stale_choice":
      return `Hay una elección guardada («${d.grantId ?? warning.key}») que ya no corresponde a la raza o clase actual.`;
    // --- Carril B3 (fase 2B/2C) — avisos del equipo equipado (`rules/attacks.ts`, `rules/items.ts`). ---
    case "attack_not_proficient": {
      const nombre = typeof d.name === "string" ? d.name : "esta arma";
      return `Sin competencia con ${nombre}: el bonificador de ataque no la incluye.`;
    }
    case "armor_stealth_disadvantage": {
      const nombre = typeof d.item === "string" ? nombreDeRefDeObjeto(d.item) : "la armadura";
      return `Desventaja en Sigilo por llevar ${nombre.toLowerCase()}.`;
    }
    case "armor_strength_requirement_unmet": {
      const nombre = typeof d.item === "string" ? nombreDeRefDeObjeto(d.item) : "la armadura";
      return `Fuerza insuficiente para ${nombre.toLowerCase()} (hace falta ${d.required ?? "?"}, hay ${
        d.actual ?? "?"
      }): la velocidad al caminar baja 10 pies.`;
    }
    case "versatile_needs_both_hands": {
      const nombre = typeof d.name === "string" ? d.name : "esta arma";
      // SRD 5.1: un arma versátil hace su dado mayor **empuñada con las dos manos**, y con un
      // escudo o un arma en la otra mano eso no se puede. Contrastado con el SRD y con la
      // práctica de la comunidad (arcaneeye, D&D Beyond) el 2026-09-03.
      return `${nombre} solo hace su dado a dos manos con la otra mano libre: ahora la tienes ocupada.`;
    }
    case "two_weapon_offhand_damage": {
      const nombre = typeof d.name === "string" ? d.name : "el arma de la otra mano";
      // SRD 5.1, combate con dos armas: al **ataque adicional de acción adicional** no se le
      // suma el modificador al daño, **salvo que sea negativo**; y el estilo de combate
      // «Combate con dos armas» levanta esa restricción. La ficha no lo resta sola porque no
      // modela el ataque de acción adicional: la máquina ejecuta, el DM arbitra.
      return `Si ${nombre} es tu ataque adicional de combate con dos armas, su daño no suma el modificador —salvo que sea negativo, o que tengas el estilo de combate—. Aquí sí está sumado.`;
    }
    case "item_unresolved":
      return "Hay un objeto equipado que ya no existe en el catálogo. Revísalo desde el inventario.";
    default:
      return `Sin traducir: ${warning.code}`;
  }
}

/** Los valores derivados que el DM puede anular a mano (`OVERRIDABLE_KEYS` de `@dnd/shared`). */
export const NOMBRE_ANULABLE: Record<string, string> = {
  ac: "Clase de armadura",
  maxHp: "Puntos de golpe máximos",
  initiative: "Iniciativa",
  "speed.walk": "Velocidad al caminar",
  passivePerception: "Percepción pasiva",
};
