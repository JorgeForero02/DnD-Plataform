import { CLAVE_AYUDA, damageTypeSchema } from "@dnd/shared";
import type {
  AbilityKey,
  AttackVerdict,
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

// **La tabla de tipos de daño vive en `dominio/dano.ts` desde el 2026-09-06** (D-OP-14): había
// tres copias en tres módulos y no decían lo mismo. Se reexporta aquí, y solo aquí, para no tocar
// los cuatro consumidores de esta pantalla — quien importe de este fichero sigue recibiendo la
// **forma larga**, que es la que la hoja quiere.
export { nombreTipoDano } from "../../dominio/dano";

/**
 * Los trece tipos de daño, **en el orden que los declara `@dnd/shared`** y no en una lista
 * escrita a mano: el selector de daño de `PuntosDeGolpe.tsx` los ofrece todos, y una copia
 * suelta se desincronizaría el día que el SRD gane uno.
 *
 * **Se usa el diccionario largo de esta feature, no el de `features/inventory`.** Los dos
 * existen y **no dicen lo mismo**: inventory abrevia («contund.», «perf.») y traduce
 * `LIGHTNING` como «rayo», porque cabe en una fila estrecha de una tabla. Aquí el tipo se elige
 * en un desplegable y se lee entero, así que manda el largo — «relámpago». Unificar los tres
 * diccionarios es la decisión D-OP-14 y **no se aplica aquí**: cambiar el corto rompería el
 * ancho de la tabla de inventario, que es justo lo que el corto existe para conservar.
 */
export const TIPOS_DE_DANO = damageTypeSchema.options;

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

/**
 * `weaponProficiencies` mezcla dos categorías (`"simple"`, `"martial"`) con armas concretas que
 * un rasgo racial concede sueltas — «Entrenamiento de combate enano» da el hacha de batalla, el
 * hacha de mano, el martillo ligero y el martillo de guerra sin dar toda la marcial
 * (`apps/api/src/rules/catalog/races.ts`). Las armas concretas son las que un bárbaro, un
 * druida o un monje pueden llevar sin ser competentes en todo lo marcial
 * (`apps/api/src/rules/catalog/classes.ts`) — el mismo cierre del SRD 5.1, calcado a mano por el
 * mismo motivo que el resto de este fichero.
 */
export const NOMBRE_COMPETENCIA_ARMA: Record<string, string> = {
  simple: "Armas sencillas",
  martial: "Armas marciales",
  greatclub: "Garrote grande",
  dagger: "Daga",
  dart: "Dardo",
  javelin: "Jabalina",
  mace: "Maza",
  quarterstaff: "Bastón",
  scimitar: "Cimitarra",
  sickle: "Hoz",
  sling: "Honda",
  spear: "Lanza",
  "hand-crossbow": "Ballesta de mano",
  "long-sword": "Espada larga",
  rapier: "Estoque",
  "short-sword": "Espada corta",
  "light-crossbow": "Ballesta ligera",
  battleaxe: "Hacha de batalla",
  handaxe: "Hacha de mano",
  "light-hammer": "Martillo ligero",
  warhammer: "Martillo de guerra",
};

export function nombreCompetenciaArma(clave: string): string {
  return NOMBRE_COMPETENCIA_ARMA[clave] ?? `Sin traducir: ${clave}`;
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
  // Fase 2D. «Lo dice el statblock» es un origen de verdad y no un cajón de sastre: la CA de un
  // monstruo es un número escrito en el libro, y la traza tiene que poder decir eso mismo.
  statblock: "statblock",
  challenge: "desafío",
  temporary: "temporal",
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
  // **No es una condición del SRD**: es la marca que deja la acción Ayudar (plan 08, I8). Se
  // traduce aquí porque comparte tabla —y por tanto pantalla— con las quince, y un `helped` en
  // crudo en la hoja sería un valor de enumeración llegando a la interfaz.
  [CLAVE_AYUDA]: "Te ayudan",
  // **Tampoco es una condición del SRD** (paso 2, tarea A11): es la marca que deja la Furia del
  // bárbaro al usarse (`CLAVE_FURIA_ACTIVA` en `apps/api/src/rules/catalog/classes.ts`, mismo
  // mecanismo genérico de `effects[]` que ya usa cualquier actividad). Sin esta entrada, la hoja
  // enseñaría «Sin traducir: raging» delante del jugador — exactamente el fallo que esta tabla
  // existe para no cometer.
  raging: "En furia",
};

/**
 * El prefijo con el que la mesa marca que alguien está **concentrado en un conjuro** (2.5.4).
 *
 * La concentración **no es una de las quince condiciones cerradas del SRD** —el informe de huecos
 * que las cerró lo dijo explícitamente—, así que se guarda con la clave libre que el servidor ya
 * admite para todo lo que el motor no calcula. El servidor solo mira el prefijo: lo que va detrás
 * distingue un conjuro de otro y **el nombre legible vive en `note`**, no en la clave.
 */
export const PREFIJO_CONCENTRACION = "concentrating";

export function nombreCondicion(key: string): string {
  // La concentración es de clave libre, así que no está —ni puede estar— en el mapa cerrado.
  // Sin esto salía como «Sin traducir: concentrating-bless» delante de los jugadores, que es
  // exactamente lo que la regla de enumeraciones prohíbe.
  if (key === PREFIJO_CONCENTRACION || key.startsWith(`${PREFIJO_CONCENTRACION}-`)) {
    return "Concentración";
  }
  return NOMBRE_CONDICION[key] ?? `Sin traducir: ${key}`;
}

/** ¿Esta condición es una concentración? Una sola definición, que la usan pantalla y pruebas. */
export function esConcentracion(key: string): boolean {
  return key === PREFIJO_CONCENTRACION || key.startsWith(`${PREFIJO_CONCENTRACION}-`);
}

/**
 * La clave que se guarda para «concentrado en X».
 *
 * Se normaliza a minúsculas sin acentos y con guiones porque **es un identificador, no un texto**:
 * dos DM que escriban «Bendición» y «bendicion» tienen que colisionar en la misma clave, y el
 * índice único de condición por personaje es lo que impide concentrarse dos veces en lo mismo.
 * Tope de 60 en el servidor (`character-state.schema.ts`), así que se recorta.
 */
export function claveDeConcentracion(conjuro: string): string {
  const slug = conjuro
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${PREFIJO_CONCENTRACION}-${slug}`.slice(0, 60);
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

/**
 * El nombre de una actividad concedida por el catálogo (`CharacterSheetActivity.key`), por la
 * misma razón que el resto de este fichero: la clave del servidor (`"rage"`) no llega nunca a la
 * pantalla. Hoy solo hay una entrada porque solo hay una actividad completa en el catálogo
 * (paso 2, tarea A11); una clave sin entrada aquí enseña su propia clave en vez de romper —
 * `Actividades.tsx` y una prueba pueden barrer esta tabla contra las que el catálogo declare de
 * verdad el día que haya una segunda. Sin entrada, se marca «Sin traducir» en vez de enseñar la
 * clave a secas — el mismo patrón que `nombreCondicion`, arriba.
 */
export const NOMBRE_ACTIVIDAD: Record<string, string> = {
  rage: "Furia",
};

export function nombreActividad(key: string): string {
  return NOMBRE_ACTIVIDAD[key] ?? `Sin traducir: ${key}`;
}

/**
 * **Qué significa cada reposición**, para los radios de crear un recurso (paso 1, tarea 10).
 *
 * Una opción con significado no se esconde en un desplegable (`docs/04-convenciones.md`): son
 * tres, cada una quiere decir algo distinto, y **cada una lleva la frase que explica qué hace**.
 * Se escribe aquí, junto a su nombre, para que nadie componga una segunda versión en la pantalla.
 */
export const EXPLICACION_RESET_RECURSO: Record<string, string> = {
  NONE: "Lo repone el DM cuando toque, o nadie. Para lo que se gana y se gasta una vez.",
  SHORT_REST: "Vuelve al máximo en cuanto la mesa para un rato. Lo del brujo y el monje.",
  LONG_REST: "Vuelve al máximo al dormir. Lo más común: furia, ki, invocaciones.",
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

// --- Subclases del SRD 5.1 (apps/api/src/rules/catalog/classes.ts). Encargo A8 (2026-09-07). ---
//
// **El nombre ya lo manda `GET /catalog`** (igual que raza, subraza y clase): esto es solo para
// el caso huérfano — una `subclassKey` guardada que la lista de opciones de la clase actual no
// ofrece, típicamente porque es la subclase de OTRA clase (un bárbaro con "champion", del
// guerrero). Sin esto, esa ficha enseñaría la clave cruda en vez de "Campeón".
export const NOMBRE_SUBCLASE: Record<string, string> = {
  berserker: "Senda del berserker",
  lore: "Colegio del conocimiento",
  "life-domain": "Dominio de la vida",
  "circle-of-the-land": "Círculo de la tierra",
  champion: "Campeón",
  "open-hand": "Camino de la mano abierta",
  "oath-of-devotion": "Juramento de entrega",
  hunter: "Cazador",
  thief: "Ladrón",
  "draconic-bloodline": "Linaje dracónico",
  "the-fiend": "El Infernal",
  evocation: "Escuela de evocación",
};

/**
 * La frase que acompaña a cada camino en los radios de elegirlo (`docs/04-convenciones.md`:
 * «una opción con significado no se esconde en un desplegable», con su frase al lado). Es
 * **tema, no una regla que el servidor calcule**: ningún rasgo de subclase de este catálogo tiene
 * hoy efecto numérico en el motor (`ClassFeature`, «solo el nombre»), así que describir aquí un
 * bono concreto sería la interfaz prometiendo una regla que el servidor no aplica.
 */
export const EXPLICACION_SUBCLASE: Record<string, string> = {
  berserker: "El camino de la furia sin control: pura violencia cuerpo a cuerpo.",
  lore: "El bardo erudito, tan hábil con las palabras como con los secretos ajenos.",
  "life-domain": "El clérigo sanador por excelencia, devoto de mantener con vida a los suyos.",
  "circle-of-the-land": "El druida ligado a un paisaje concreto y sus fuerzas naturales.",
  champion: "El guerrero más directo: pura potencia física, sin florituras.",
  "open-hand": "El monje que perfecciona el combate a mano desnuda por encima de cualquier arma.",
  "oath-of-devotion": "El paladín del juramento clásico: honestidad, valor y proteger al débil.",
  hunter: "El explorador especializado en enfrentarse a amenazas concretas del territorio.",
  thief: "El pícaro más ágil: experto en escalar, colarse y usar objetos a su favor.",
  "draconic-bloodline": "El hechicero con sangre de dragón corriendo por sus venas.",
  "the-fiend": "El brujo cuyo pacto es con un señor de un plano infernal.",
  evocation: "El mago especializado en conjurar destrucción a distancia.",
};

export function nombreSubclase(key: string): string {
  return nombreOSinTraducir(NOMBRE_SUBCLASE, key);
}

/** La frase de un camino, o una genérica si el catálogo trae una subclase que aún no está aquí. */
export function explicacionSubclase(key: string): string {
  return EXPLICACION_SUBCLASE[key] ?? "Un camino del SRD 5.1.";
}

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
  // Tarea 2.5.1 — la traza de daño (`apps/api/src/character-state/damage/apply-damage-modifiers.ts`).
  // **Faltaban las cuatro**, y no se notaba porque ninguna pantalla pintaba esa traza: el
  // servidor la devolvía en `changeHp` y no la leía nadie. Al pintarla, cada paso habría salido
  // como «Sin traducir: damage.raw».
  "damage.raw": "Daño de la tirada, antes de resistencias",
  "damage.modifier.immune": "Inmunidad: el daño de este tipo no le llega",
  "damage.modifier.resist": "Resistencia: la mitad, redondeando hacia abajo",
  "damage.modifier.vulnerable": "Vulnerabilidad: el doble",
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

  // **El recorte nombra la característica que recorta, y no la escribe a fuego.** Hasta el
  // 2026-09-06 aquí ponía «Tope de Destreza de X» para cualquier `ac.cap.*`, y el motor pasó ese
  // día a topar **por característica**: un tope de Constitución se habría pintado como uno de
  // Destreza, que es el texto mintiendo sobre una regla del servidor.
  m = /^ac\.cap\.([a-z0-9-]+)\.([a-z]+)$/.exec(labelKey);
  if (m && m[1] in NOMBRE_ARMADURA && m[2] in NOMBRE_CARACTERISTICA) {
    return {
      texto: `Tope de ${NOMBRE_CARACTERISTICA[m[2] as AbilityKey]} de ${NOMBRE_ARMADURA[m[1]]}`,
      conocida: true,
    };
  }

  // **Modificador temporal** (plan 13, ficha M8). El motor no devuelve prosa en español, así que
  // el motivo —«Poción de fuerza de gigante»— viaja **dentro de la clave**, detrás de `temporary:`,
  // y sale aquí tal cual. Es prosa del DM o del jugador: ni se traduce ni se busca en un catálogo,
  // porque no hay ninguno que la contenga.
  if (labelKey.startsWith("temporary:")) {
    const motivo = labelKey.slice("temporary:".length).trim();
    // Sin motivo la fila seguiría siendo legible, pero no diría nada: se nombra lo que es.
    return { texto: motivo === "" ? "Modificador temporal" : motivo, conocida: true };
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

  m = /^ac\.cap\.(SRD:[a-z0-9-]+|CAMPAIGN:[A-Za-z0-9]+)\.([a-z]+)$/.exec(labelKey);
  if (m && m[2] in NOMBRE_CARACTERISTICA) {
    return {
      texto: `Tope de ${NOMBRE_CARACTERISTICA[m[2] as AbilityKey]} de ${nombreDeRefDeObjeto(m[1])}`,
      conocida: true,
    };
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
    // Encargo A8 (2026-09-07), vuelta de arreglo 1 — menor. El mismo código cubre dos causas: no
    // se ha elegido ninguna subclase todavía, o la guardada no pertenece a esta clase (un dato
    // caduco, como `stale_choice`). **Antes esto decía «todavía no has elegido» en los dos
    // casos**, y eso es falso en el segundo: sí eligió, y la propia pantalla enseña «guardado, ya
    // no disponible» al lado. `reason` distingue las dos frases sin inventar un segundo código.
    case "subclass_not_chosen": {
      const nivel = typeof d.chosenAtLevel === "number" ? d.chosenAtLevel : "?";
      if (d.reason === "wrong_class") {
        return `La subclase guardada no pertenece a esta clase: no se aplica ninguno de sus rasgos. Elige un camino válido.`;
      }
      return `Todavía no has elegido un camino (subclase) para esta clase. Se elige al nivel ${nivel}.`;
    }
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
    case "armor_not_proficient": {
      // SRD 5.1, «Armor Proficiency»: sin competencia hay desventaja en pruebas, salvaciones y
      // ataques de Fuerza o Destreza, y no se pueden lanzar conjuros. Solo aviso: el motor no
      // impide llevarla (Tarea 15, I6).
      const nombre =
        typeof d.armorKey === "string" ? nombreDeRefDeObjeto(d.armorKey) : "esta armadura";
      return `Sin competencia con ${nombre.toLowerCase()}: desventaja en pruebas, salvaciones y ataques de Fuerza o Destreza, y no puedes lanzar conjuros mientras la lleves.`;
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

/**
 * El veredicto de un ataque resuelto contra un objetivo (tarea 13, `attackResolutionSchema`).
 * **Tres estados, no dos** — el crítico dobla los dados de daño y decirlo en la misma palabra que
 * un impacto corriente perdería esa distinción en la única pantalla que la enseña.
 */
export const NOMBRE_VEREDICTO: Record<AttackVerdict, string> = {
  HIT: "Impacta",
  MISS: "Falla",
  CRITICAL: "¡Crítico!",
};

/** Los valores derivados que el DM puede anular a mano (`OVERRIDABLE_KEYS` de `@dnd/shared`). */
export const NOMBRE_ANULABLE: Record<string, string> = {
  ac: "Clase de armadura",
  maxHp: "Puntos de golpe máximos",
  initiative: "Iniciativa",
  "speed.walk": "Velocidad al caminar",
  passivePerception: "Percepción pasiva",
};

/**
 * La misma tabla, para quien solo tiene la clave suelta y no puede repetir el `?? clave`. La usa
 * el registro de la mesa, que imprimía «El DM fija maxHp en 40» delante de los jugadores.
 */
export function nombreAnulable(target: string): string {
  return nombreOSinTraducir(NOMBRE_ANULABLE, target);
}
