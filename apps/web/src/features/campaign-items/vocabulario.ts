import type {
  AbilityKey,
  ArmorCategory,
  DamageType,
  EquipSlot,
  ItemEffect,
  ItemKind,
  Movement,
  ProficiencyLevel,
  SkillKey,
  WeaponCategory,
  WeaponProperty,
  WeaponRange,
} from "@dnd/shared";
import { nombreTipoDano } from "../../dominio/dano";
import {
  armorCategorySchema,
  damageTypeSchema,
  equipSlotSchema,
  itemKindSchema,
  SKILLS,
  weaponCategorySchema,
  weaponPropertySchema,
  weaponRangeSchema,
} from "@dnd/shared";

// **Las listas de opciones se derivan del esquema, no se copian a mano** (mismo principio que
// `features/rules/vocabulario.ts`): un `z.enum` de Zod expone sus valores en `.options`, así que
// una clave nueva en `item.schema.ts` aparece aquí sola, sin tocar este fichero.
export const TIPOS_DE_OBJETO = itemKindSchema.options;
export const TIPOS_DE_DANO = damageTypeSchema.options;
export const CATEGORIAS_DE_ARMA = weaponCategorySchema.options;
export const ALCANCES_DE_ARMA = weaponRangeSchema.options;
export const PROPIEDADES_DE_ARMA = weaponPropertySchema.options;
export const CATEGORIAS_DE_ARMADURA = armorCategorySchema.options;
export const RANURAS = equipSlotSchema.options;

// Carril B2 — el vocabulario de la pantalla del catálogo.
//
// **Ningún valor de enumeración llega a la pantalla** (docs/04-convenciones.md): `WEAPON`,
// `SLASHING`, `FINESSE`, `RING_1`, `DM_ONLY`… se traducen aquí, una sola vez, y todo lo demás de
// `features/campaign-items` importa de este fichero. La forma de la traducción sigue la de
// `features/rules/vocabulario.ts`: diccionarios simples más una función `traducir` que nunca
// devuelve la clave cruda en silencio — si algo no está en el diccionario, lo dice.
//
// **Si una frase de aquí describe una regla del servidor y discrepan, miente la frase**
// (docs/04-convenciones.md). Estos textos describen lo que hace `item.schema.ts` y
// `campaign-items.service.ts`; no lo definen.

export function traducir(diccionario: Record<string, string>, clave: string): string {
  return diccionario[clave] ?? `Sin traducir: ${clave}`;
}

// ---------------------------------------------------------------------------------------------
// Tipo de objeto
// ---------------------------------------------------------------------------------------------

export const NOMBRE_TIPO: Record<ItemKind, string> = {
  WEAPON: "Arma",
  ARMOR: "Armadura",
  SHIELD: "Escudo",
  CONSUMABLE: "Consumible",
  GEAR: "Impedimenta",
  OTHER: "Objeto maravilloso",
};

export const EXPLICACION_TIPO: Record<ItemKind, string> = {
  WEAPON: "Ataca y hace daño. Pide su dado y su tipo de daño.",
  ARMOR: "Se lleva puesta y da Clase de Armadura. Pide su categoría y su CA base.",
  SHIELD: "Va en la mano libre y suma a la CA. También pide una CA base.",
  CONSUMABLE: "Se gasta al usarlo: una poción, un pergamino.",
  GEAR: "Equipo sin reglas propias: una cuerda, una antorcha, un saco.",
  OTHER: "Todo lo demás — lo mágico y singular que no encaja en las otras categorías.",
};

export const nombreTipo = (k: string) => traducir(NOMBRE_TIPO, k);

// ---------------------------------------------------------------------------------------------
// Daño
// ---------------------------------------------------------------------------------------------

// Reexportado de `dominio/dano.ts` (D-OP-14, 2026-09-06): la tabla era idéntica a la de la hoja,
// carácter a carácter. El catálogo usa la **forma larga**: es una ficha, no una tabla apretada.
//
// Se importa **además de** reexportarse porque este mismo fichero la usa unas líneas más abajo, en
// `subtituloDeObjeto`: un `export ... from` no trae el nombre al ámbito del módulo.
export { nombreTipoDano } from "../../dominio/dano";

// ---------------------------------------------------------------------------------------------
// Arma
// ---------------------------------------------------------------------------------------------

export const NOMBRE_CATEGORIA_ARMA: Record<WeaponCategory, string> = {
  SIMPLE: "Simple",
  MARTIAL: "Marcial",
};

export const NOMBRE_ALCANCE_ARMA: Record<WeaponRange, string> = {
  MELEE: "Cuerpo a cuerpo",
  RANGED: "A distancia",
};

export const NOMBRE_PROPIEDAD_ARMA: Record<WeaponProperty, string> = {
  AMMUNITION: "munición",
  FINESSE: "sutil",
  HEAVY: "pesada",
  LIGHT: "ligera",
  LOADING: "recarga",
  REACH: "alcance",
  SPECIAL: "especial",
  THROWN: "arrojadiza",
  TWO_HANDED: "a dos manos",
  VERSATILE: "versátil",
};

export const EXPLICACION_PROPIEDAD_ARMA: Record<WeaponProperty, string> = {
  AMMUNITION: "Gasta munición para atacar a distancia con ella.",
  FINESSE: "Puede usar Destreza en vez de Fuerza para atacar y dañar.",
  HEAVY: "Una criatura Pequeña tiene desventaja al usarla.",
  LIGHT: "Sirve para pelear con dos armas.",
  LOADING: "Solo se puede disparar una vez por acción, ataque adicional o reacción.",
  REACH: "Suma 5 pies de alcance en cuerpo a cuerpo.",
  SPECIAL: "Tiene una regla propia que no cabe en las demás propiedades.",
  THROWN: "Se puede arrojar como ataque a distancia.",
  TWO_HANDED: "Necesita las dos manos. No deja hueco para un escudo.",
  VERSATILE: "Cambia de dado si se empuña a dos manos.",
};

export const nombreCategoriaArma = (k: string) => traducir(NOMBRE_CATEGORIA_ARMA, k);
export const nombreAlcanceArma = (k: string) => traducir(NOMBRE_ALCANCE_ARMA, k);
export const nombrePropiedadArma = (k: string) => traducir(NOMBRE_PROPIEDAD_ARMA, k);

// ---------------------------------------------------------------------------------------------
// Armadura
// ---------------------------------------------------------------------------------------------

export const NOMBRE_CATEGORIA_ARMADURA: Record<ArmorCategory, string> = {
  LIGHT: "Ligera",
  MEDIUM: "Media",
  HEAVY: "Pesada",
  SHIELD: "Escudo",
};

export const nombreCategoriaArmadura = (k: string) => traducir(NOMBRE_CATEGORIA_ARMADURA, k);

// ---------------------------------------------------------------------------------------------
// Ranura de equipo
// ---------------------------------------------------------------------------------------------

export const NOMBRE_RANURA: Record<EquipSlot, string> = {
  MAIN_HAND: "Mano principal",
  OFF_HAND: "Mano secundaria",
  ARMOR: "Armadura",
  HEAD: "Cabeza",
  NECK: "Cuello",
  CLOAK: "Capa",
  RING_1: "Anillo 1",
  RING_2: "Anillo 2",
  HANDS: "Manos",
  FEET: "Pies",
  OTHER: "Otra",
};

export const nombreRanura = (k: string) => traducir(NOMBRE_RANURA, k);

// ---------------------------------------------------------------------------------------------
// Características, habilidades y competencia — comparten vocabulario con la ficha (2A), pero
// este módulo no importa de `features/character-sheet` (fuera de la frontera del carril): son
// pocas claves cerradas y estables, así que se traducen aquí también.
// ---------------------------------------------------------------------------------------------

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

export const nombreCaracteristica = (k: string) => traducir(NOMBRE_CARACTERISTICA, k);

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

export const nombreHabilidad = (k: string) => traducir(NOMBRE_HABILIDAD, k);

/** Las 18 claves, en el orden en que las declara el esquema compartido. */
export const HABILIDADES = Object.keys(SKILLS) as SkillKey[];
/** Las 6 claves de característica. */
export const CARACTERISTICAS: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

export const NOMBRE_NIVEL_COMPETENCIA: Record<ProficiencyLevel, string> = {
  none: "Ninguna",
  half: "Media (redondeo hacia abajo)",
  proficient: "Competente",
  expertise: "Pericia (doble)",
};

export const nombreNivelCompetencia = (k: string) => traducir(NOMBRE_NIVEL_COMPETENCIA, k);

export const NOMBRE_MOVIMIENTO: Record<Movement, string> = {
  walk: "caminar",
  climb: "trepar",
  swim: "nadar",
  fly: "volar",
  burrow: "excavar",
};

export const nombreMovimiento = (k: string) => traducir(NOMBRE_MOVIMIENTO, k);

// ---------------------------------------------------------------------------------------------
// Los efectos numéricos — la lista cerrada de `itemEffectSchema`
// ---------------------------------------------------------------------------------------------

export const EFFECT_KINDS = [
  "ac",
  "abilityScore",
  "save",
  "maxHp",
  "speed",
  "skillProficiency",
  "saveProficiency",
  "weaponAttack",
  "weaponDamage",
] as const;
export type EffectKind = (typeof EFFECT_KINDS)[number];

export const NOMBRE_EFECTO: Record<EffectKind, string> = {
  ac: "Bono a la Clase de Armadura",
  abilityScore: "Sube o fija una característica",
  save: "Bono a las salvaciones",
  maxHp: "Cambia los puntos de golpe máximos",
  speed: "Cambia una velocidad",
  skillProficiency: "Competencia en una habilidad",
  saveProficiency: "Competencia en una salvación",
  weaponAttack: "Bono al ataque con este objeto",
  weaponDamage: "Bono al daño de este objeto",
};

export const EXPLICACION_EFECTO: Record<EffectKind, string> = {
  ac: "Suma (o resta) un número fijo a la CA. El anillo de protección es +1.",
  abilityScore:
    "«Sumar» añade a la puntuación que ya tenga el personaje; «fijar» la sustituye entera — el cinturón de fuerza fija Fuerza a 21, no la suma.",
  save: "Suma a las tiradas de salvación. Sin característica, se aplica a las seis — la capa de protección.",
  maxHp: "Cambia el máximo de puntos de golpe mientras se lleve el objeto.",
  speed: "Cambia una de las velocidades, en pies. Puede ser negativo: una armadura que pesa.",
  skillProficiency: "Da uno de los cuatro niveles de competencia en una habilidad concreta.",
  saveProficiency: "Da competencia en la salvación de una característica.",
  weaponAttack:
    "Suma al bono de ataque **de esta arma**, no a los demás ataques. Es la mitad de una «espada larga +1».",
  weaponDamage: "Suma al daño **de esta arma**. La otra mitad de un arma mágica.",
};

export const nombreEfecto = (k: string) => traducir(NOMBRE_EFECTO, k);

/**
 * La frase completa de un efecto ya resuelto, con sus números — «12 + DES (máx 2)», «+1 a la
 * Clase de Armadura». Es lo que enseña la ficha y la fila del efecto en el formulario.
 */
export function describirEfecto(efecto: ItemEffect): string {
  switch (efecto.kind) {
    case "ac":
      return `${efecto.amount >= 0 ? "+" : ""}${efecto.amount} a la Clase de Armadura`;
    case "abilityScore": {
      const abrev = ABREVIATURA_CARACTERISTICA[efecto.ability];
      return efecto.mode === "set"
        ? `Fija ${abrev} a ${efecto.amount}`
        : `${efecto.amount >= 0 ? "+" : ""}${efecto.amount} a ${abrev}`;
    }
    case "save": {
      const objetivo = efecto.ability
        ? `a las salvaciones de ${ABREVIATURA_CARACTERISTICA[efecto.ability]}`
        : "a todas las salvaciones";
      return `${efecto.amount >= 0 ? "+" : ""}${efecto.amount} ${objetivo}`;
    }
    case "maxHp":
      return `${efecto.amount >= 0 ? "+" : ""}${efecto.amount} a los puntos de golpe máximos`;
    case "speed":
      return `${efecto.amount >= 0 ? "+" : ""}${efecto.amount} pies a la velocidad al ${nombreMovimiento(efecto.movement)}`;
    case "skillProficiency":
      return `${nombreNivelCompetencia(efecto.level)} en ${nombreHabilidad(efecto.skill)}`;
    case "saveProficiency":
      return `Competencia en la salvación de ${nombreCaracteristica(efecto.ability)}`;
    case "weaponAttack":
      return `${efecto.amount >= 0 ? "+" : ""}${efecto.amount} al ataque con esta arma`;
    case "weaponDamage":
      return `${efecto.amount >= 0 ? "+" : ""}${efecto.amount} al daño de esta arma`;
    default:
      return `Sin traducir: ${(efecto as { kind: string }).kind}`;
  }
}

// ---------------------------------------------------------------------------------------------
// Procedencia — «catálogo» frente a «de la campaña». El endpoint que consume este carril
// (`GET /campaigns/:id/items`) solo trae objetos propios de la campaña todavía: el catálogo SRD
// (`SRD_ITEMS`, `apps/api/src/rules/catalog/`) no viaja por aquí. La marca se deja lista para el
// día en que el orquestador conecte esa fuente — ver el informe de este carril.
// ---------------------------------------------------------------------------------------------

export type ProcedenciaDeObjeto = "SRD" | "CAMPAIGN";

export const NOMBRE_PROCEDENCIA: Record<ProcedenciaDeObjeto, string> = {
  SRD: "catálogo",
  CAMPAIGN: "de la campaña",
};

// ---------------------------------------------------------------------------------------------
// El subtítulo de una fila — el resumen numérico de un vistazo, en tipografía de cifras
// («1d8 perforante, sutil», «12 + DES (máx 2)»). Manda el dato que el motor sabe usar: si el
// objeto no tiene arma, armadura ni efectos, se dice que no tiene datos numéricos en vez de
// dejar la fila muda.
// ---------------------------------------------------------------------------------------------

export interface ResumenNumericoInput {
  kind: ItemKind;
  damageDice?: string | null;
  damageType?: DamageType | null;
  weaponProperties?: WeaponProperty[] | null;
  baseAc?: number | null;
  dexCap?: number | null;
  effects: ItemEffect[];
}

export function subtituloDeObjeto(item: ResumenNumericoInput): string {
  if (item.kind === "WEAPON" && item.damageDice && item.damageType) {
    const propiedades = (item.weaponProperties ?? []).map(nombrePropiedadArma);
    return [`${item.damageDice} ${nombreTipoDano(item.damageType)}`, ...propiedades].join(", ");
  }
  if (
    (item.kind === "ARMOR" || item.kind === "SHIELD") &&
    item.baseAc !== null &&
    item.baseAc !== undefined
  ) {
    if (item.kind === "SHIELD") return `+${item.baseAc} a la Clase de Armadura`;
    if (item.dexCap === undefined || item.dexCap === null) return `${item.baseAc} + DES`;
    if (item.dexCap === 0) return `${item.baseAc} (sin DES)`;
    return `${item.baseAc} + DES (máx ${item.dexCap})`;
  }
  if (item.effects.length > 0) {
    const primero = describirEfecto(item.effects[0]);
    return item.effects.length > 1 ? `${primero} y ${item.effects.length - 1} más` : primero;
  }
  return "Sin datos numéricos";
}

// ---------------------------------------------------------------------------------------------
// Unidades — peso en kg, precio en monedas de oro. Las dos conversiones, en un solo sitio de
// este carril (features/inventory/peso.ts hace la misma cuenta para el suyo; no se importa de
// ahí porque queda fuera de la frontera del carril y porque, igual que ese fichero explica de
// la constante que no reimporta, duplicar dos números que no cambian es más barato que acoplar
// dos carriles distintos que un tercer agente reparte en paralelo).
// ---------------------------------------------------------------------------------------------

const OZ_PER_LB = 16;
const KG_PER_LB = 0.45359237;
/** 100 piezas de cobre por pieza de oro — la única moneda que enseña esta pantalla. */
const CP_PER_GP = 100;

export function ozAKg(oz: number): number {
  return (oz / OZ_PER_LB) * KG_PER_LB;
}

/** El sentido inverso, para el formulario: lo que escribe el DM en kg, a onzas enteras. */
export function kgAOz(kg: number): number {
  return Math.round((kg / KG_PER_LB) * OZ_PER_LB);
}

export function formatearPeso(oz: number): string {
  return `${ozAKg(oz).toLocaleString("es-ES", { maximumFractionDigits: 2 })} kg`;
}

export function cpAPo(cp: number): number {
  return cp / CP_PER_GP;
}

/** El sentido inverso, para el formulario: lo que escribe el DM en po, a cobres enteros. */
export function poACp(po: number): number {
  return Math.round(po * CP_PER_GP);
}

export function formatearPrecio(cp: number | null | undefined): string {
  if (cp === null || cp === undefined) return "Sin precio";
  return `${cpAPo(cp).toLocaleString("es-ES", { maximumFractionDigits: 2 })} po`;
}
