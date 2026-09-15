// Tarea 3A.1 (T2) — el cargador del catálogo GENERADO. `spells-srd.json` no es TS (E-3A1-6:
// `tsconfig.base.json` es `commonjs` sin `resolveJsonModule`), así que aquí se lee con
// `readFileSync` + `JSON.parse` + `spellsCatalogSchema.parse` **una sola vez, al importar el
// módulo**. Un JSON inválido revienta al arrancar el proceso, a propósito: es la misma barrera
// que ya usa `GameEvent.payload`, y falla en el arranque en vez de a mitad de una petición.
//
// **`__dirname` y no una ruta relativa a `src`.** Compilado, este fichero vive en
// `dist/src/rules/catalog/generado/index.js` (rootDir "." en `tsconfig.json`, no el `src/` que
// usaría Nest CLI por defecto — ver `apps/api/Dockerfile`, que llama a
// `node apps/api/dist/src/main.js`). `nest-cli.json` copia `spells-srd.json` al lado de este
// fichero en cada build (`compilerOptions.assets`), así que `__dirname` apunta al sitio
// correcto tanto en `src/` (con `ts-node`/Jest) como en `dist/src/` (compilado) — nunca hace
// falta un `../../../..` que se rompería si alguien mueve el directorio.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  spellsCatalogSchema,
  classFeaturesCatalogSchema,
  raceFeaturesCatalogSchema,
  classScalesCatalogSchema,
  type SrdSpell,
  type SrdFeature,
  type RaceFeature,
} from "@dnd/shared";
import type {
  ClassFeature,
  FeatureGrant,
  Grant,
  ItemGrant,
  ScaleStep,
  SrdClass,
  SrdRace,
} from "../types";

const RUTA_SPELLS_JSON = join(__dirname, "spells-srd.json");

function cargarSpells(): SrdSpell[] {
  const crudo = readFileSync(RUTA_SPELLS_JSON, "utf8");
  return spellsCatalogSchema.parse(JSON.parse(crudo));
}

/** Los 319 conjuros del SRD 5.1 convertidos, validados una vez al cargar el módulo. */
export const SRD_SPELLS: readonly SrdSpell[] = cargarSpells();

/** El mismo catálogo, indexado por `key` (el nombre inglés de 2014 en minúsculas con guiones, p. ej. `"fireball"`). */
export const SRD_SPELL_POR_KEY: ReadonlyMap<string, SrdSpell> = new Map(
  SRD_SPELLS.map((s) => [s.key, s]),
);

// -------------------------------------------------------------------------------------------
// Tarea 3A.1 (T3) — aptitudes de clase/subclase, rasgos de raza y las tablas de escala,
// generados por `scripts/convertir-catalogo.mjs` desde `classfeatures/`, `subclasses/`,
// `races/` y el `advancement` de tipo `ScaleValue` de `classes/*.yml`.

const RUTA_FEATURES_JSON = join(__dirname, "class-features-srd.json");
const RUTA_RAZAS_JSON = join(__dirname, "race-features-srd.json");
const RUTA_ESCALAS_JSON = join(__dirname, "class-scales-srd.json");

function cargarFeatures(): SrdFeature[] {
  return classFeaturesCatalogSchema.parse(JSON.parse(readFileSync(RUTA_FEATURES_JSON, "utf8")));
}
function cargarRazas(): RaceFeature[] {
  return raceFeaturesCatalogSchema.parse(JSON.parse(readFileSync(RUTA_RAZAS_JSON, "utf8")));
}
function cargarEscalas(): Record<string, Record<string, ScaleStep[]>> {
  return classScalesCatalogSchema.parse(
    JSON.parse(readFileSync(RUTA_ESCALAS_JSON, "utf8")),
  ) as Record<string, Record<string, ScaleStep[]>>;
}

/** Las 234 aptitudes de clase y subclase del SRD 5.1 convertidas (T3). */
export const SRD_CLASS_FEATURES: readonly SrdFeature[] = cargarFeatures();
/** Los rasgos raciales convertidos (T3, alcance reducido — ver `scripts/convertir-catalogo/razas.mjs`). */
export const SRD_RACE_FEATURES: readonly RaceFeature[] = cargarRazas();
/** Las tablas de escala inlinadas desde el `advancement` de Foundry, por clase (T3, Step 3). */
export const SRD_CLASS_SCALES_GENERADAS: Readonly<
  Record<string, Readonly<Record<string, readonly ScaleStep[]>>>
> = cargarEscalas();

/** Clave del catálogo generado para una aptitud: `"<clase>[/<subclase>]:<key>"`. */
function claveDeAptitud(clase: string, subclase: string | undefined, key: string): string {
  return subclase ? `${clase}/${subclase}:${key}` : `${clase}:${key}`;
}

function indiceDeFeatures(features: readonly SrdFeature[]): Map<string, SrdFeature> {
  const indice = new Map<string, SrdFeature>();
  for (const f of features) indice.set(claveDeAptitud(f.class, f.subclass, f.key), f);
  return indice;
}

/**
 * Índice de respaldo, SOLO por `key` (sin dueño) — para los pocos ficheros de Foundry que no
 * tienen carpeta propia (`classfeatures/shared-features/`: la Mejora de puntuación de
 * característica genérica, y el Ataque adicional que reutilizan barbarian/monk/paladin/ranger
 * además de la copia propia de fighter). El conversor solo puede atribuir CADA fichero a UN
 * `class` primario (`aptitudes.mjs`, el "dueño primario" de un fichero sin `requirements`
 * resoluble) — así que la aptitud del bárbaro nunca tiene su PROPIA fila en el generado, pero sí
 * comparte la MISMA mecánica que la del guerrero: reusar esa fila por identificador, cuando la
 * búsqueda por dueño exacto no encuentra nada, es correcto y no inventado. Se usa en último
 * lugar, nunca antes que el índice por dueño — así un `channel-divinity` de paladín no confunde
 * su fila con la del clérigo, que sí tienen cada uno la suya propia.
 */
function indiceGlobalPorClave(features: readonly SrdFeature[]): Map<string, SrdFeature> {
  const indice = new Map<string, SrdFeature>();
  for (const f of features) indice.set(f.key, f);
  return indice;
}

/**
 * Compara dos `usos` de `ItemGrant` (la Furia, o cualquier otra aptitud que ya traiga `grant` a
 * mano) — E-3A1-5: «el cargador compara y avisa si discrepa». Aquí "avisa" es un `throw`: un
 * catálogo generado que discrepa de un `grant` verificado a mano contra el SRD es un dato roto,
 * no un aviso que se pueda ignorar y seguir sirviendo peticiones — la misma disciplina que ya
 * usa `emparejar` (huella) para los choques de conjuros sin resolver.
 */
function compararUsos(
  owner: string,
  key: string,
  aMano: NonNullable<ItemGrant["usos"]>,
  generado: NonNullable<SrdFeature["usos"]>,
): void {
  const maxDiscrepa = JSON.stringify(aMano.max) !== JSON.stringify(generado.max);
  const resetDiscrepa = aMano.resetOn !== generado.resetOn;
  if (maxDiscrepa || resetDiscrepa) {
    throw new Error(
      `enriquecerClases: ${owner}:${key} — el catálogo generado discrepa del \`grant\` a mano ` +
        `en \`usos\` (E-3A1-5, el hecho a mano manda, pero la discrepancia no se ignora en ` +
        `silencio). A mano: ${JSON.stringify(aMano)}. Generado: ${JSON.stringify(generado)}.`,
    );
  }
}

/**
 * `enriquecerClases(clases, features?)` — Tarea 3A.1 (T3, Step 2). Pura: devuelve una COPIA de
 * `clases` (nunca muta el array hecho a mano de `classes.ts`) donde cada `ClassFeature` —de la
 * clase base y de cada subclase— gana `nameEn/textEs/textEn/actividades/sinTraduccion` del
 * catálogo generado, buscando por `(clase[/subclase], key)`.
 *
 * **`grant` (E-3A1-5):** si la aptitud ya tenía uno a mano (hoy, solo la Furia), se conserva
 * intacto y solo se COMPARAN sus `usos` contra los del generado (`compararUsos`, arriba) — nunca
 * se sustituye. Si no tenía uno y la primera actividad generada entra en A, se construye un
 * `ItemGrant` nuevo (`id`/`labelKey` derivados de `clase`+`key`, `actividad` la primera de A,
 * `usos` los del generado si los trae) — **solo si cada recurso que consume lo siembra un rasgo
 * de la misma clase, y una sola vez por aptitud de Foundry** (ola de arreglos, C3: ver
 * `proveedoresDe` y `CONCESIONES_SIN_RECURSO`).
 *
 * **Sin generado (identificador sin match, ver `emparejamientos.json`, `clavesDeAptitud`):** la
 * aptitud nunca se deja sin texto — el mínimo es su propio nombre, ya verificado en `classes.ts`
 * (2A.3), marcado `sinTraduccion: true`. Nunca inventa prosa que no tiene.
 */
/**
 * `classes.ts` (2A.3) declara a veces varias `ClassFeature` sintéticas para una sola aptitud de
 * Foundry que sube de tramo con el nivel — `brutal-critical-1/2/3`, `action-surge-1/2`,
 * `indomitable-1/2/3`, `channel-divinity-1/2/3`, `expertise-1/2`, `song-of-rest-d6/d8/d10/d12`,
 * `bardic-inspiration-d6/d8/d10/d12`, `magical-secrets-1/2/3`, `metamagic-1/2/3`,
 * `mystic-arcanum-6/7/8/9`… — Foundry solo tiene UN fichero para todas. Quitar el sufijo
 * (`-N` o `-dN`) antes de buscar es correcto: es la MISMA aptitud, reaparece en la hoja al
 * subir de nivel, y compartir su texto no es un error, es lo que el SRD también hace.
 */
function claveSinSufijoDeTramo(key: string): string {
  return key.replace(/-d?\d+$/, "");
}

/**
 * Los pocos identificadores de `classes.ts` que NO coinciden con la `key` del catálogo generado
 * y que TAMPOCO son el patrón de sufijo de arriba. Desde la ola de arreglos (I13) la `key` del
 * generado es el nombre inglés de 2014 en minúsculas con guiones (`ki`, `deflect-missiles`,
 * `natural-explorer`…) y no el `system.identifier` de Foundry, que era el de la edición 2024
 * (`monks-focus`, `deflect-attacks`, `deft-explorer`): las 24 entradas se quedaron en 13, todas
 * estructurales (varias `ClassFeature` sintéticas para un solo fichero, o un nombre de fichero
 * con sufijo de clase). Se mantiene a mano aquí porque el conversor no se puede importar desde
 * `apps/api`.
 */
const ALIAS_DE_CLAVE_A_IDENTIFICADOR: Readonly<Record<string, string>> = {
  "barbarian:unarmored-defense": "unarmored-defense-barbarian",
  "cleric/life-domain:preserve-life": "channel-divinity-preserve-life",
  "cleric:destroy-undead-cr-1": "destroy-undead",
  "cleric:destroy-undead-cr-2": "destroy-undead",
  "cleric:destroy-undead-cr-3": "destroy-undead",
  "cleric:destroy-undead-cr-4": "destroy-undead",
  "cleric:destroy-undead-cr-half": "destroy-undead",
  "cleric:divine-intervention-improvement": "divine-intervention",
  "druid:wild-shape-improvement-1": "wild-shape",
  "druid:wild-shape-improvement-2": "wild-shape",
  "monk:unarmored-movement-improvement": "unarmored-movement",
  "paladin/oath-of-devotion:channel-divinity": "channel-divinity-sacred-weapon",
  "sorcerer:sorcerous-origin": "sorcerous-origins",
};

/**
 * Una concesión que `enriquecerClases` NO construyó porque la actividad consume un recurso que
 * ningún rasgo de esa clase siembra (ola de arreglos, C3). Se exporta para que la prueba del
 * catálogo lo cuente y lo lea una persona — nunca se construye un `grant` que en la mesa daría
 * «Sin usos de X» (409) o se sembraría con 0.
 */
export interface ConcesionSinRecurso {
  owner: string;
  key: string;
  recursos: string[];
}

/** Las concesiones que la última llamada a `enriquecerClases` dejó sin `grant` por falta de recurso (C3). */
export const CONCESIONES_SIN_RECURSO: ConcesionSinRecurso[] = [];

export function enriquecerClases(
  clases: readonly SrdClass[],
  features: readonly SrdFeature[] = SRD_CLASS_FEATURES,
): SrdClass[] {
  const indice = indiceDeFeatures(features);
  const indiceGlobal = indiceGlobalPorClave(features);
  CONCESIONES_SIN_RECURSO.length = 0;

  function generadoDe(feature: ClassFeature, owner: string): SrdFeature | undefined {
    const clase = owner.split("/")[0];
    const subclase = owner.split("/")[1];
    const alias = ALIAS_DE_CLAVE_A_IDENTIFICADOR[`${owner}:${feature.key}`];
    return (
      indice.get(claveDeAptitud(clase, subclase, feature.key)) ??
      (alias ? indice.get(claveDeAptitud(clase, subclase, alias)) : undefined) ??
      (alias ? indiceGlobal.get(alias) : undefined) ??
      indice.get(claveDeAptitud(clase, subclase, claveSinSufijoDeTramo(feature.key))) ??
      indiceGlobal.get(feature.key) ??
      indiceGlobal.get(claveSinSufijoDeTramo(feature.key))
    );
  }

  /**
   * **Primera pasada (C3): quién PROVEE cada recurso dentro de una clase.** El recurso que una
   * actividad consume (`consumption.recurso`, la `key` del generado: `channel-divinity`, `ki`)
   * solo existe en la mesa si un rasgo de la clase lo SIEMBRA — y `resources.service.ts` siembra
   * una fila por cada `sheet.activities[].usos`, con `key` = la `ClassFeature.key` de
   * `classes.ts`. Así que un recurso lo provee la PRIMERA `ClassFeature` (la de menor nivel:
   * `channel-divinity-1`, no `-2` ni `-3`) cuyo generado trae `usos` y consume sus propios usos
   * (o nada). El mapa devuelve, por clave del generado, la `ClassFeature.key` que siembra la fila
   * — que es a lo que hay que renombrar el `recurso` de quien lo consume.
   */
  function proveedoresDe(clase: SrdClass): Map<string, string> {
    const proveedores = new Map<string, string>();
    const candidatos: { feature: ClassFeature; owner: string }[] = [
      ...clase.features.map((feature) => ({ feature, owner: clase.key })),
      ...clase.subclasses.flatMap((sub) =>
        sub.features.map((feature) => ({ feature, owner: `${clase.key}/${sub.key}` })),
      ),
    ].sort((a, b) => a.feature.level - b.feature.level);
    for (const { feature, owner } of candidatos) {
      if (feature.grant?.usos) {
        // El grant a mano (la Furia): su recurso es su propia clave, como siembra A11.
        if (!proveedores.has(feature.key)) proveedores.set(feature.key, feature.key);
        continue;
      }
      const generado = generadoDe(feature, owner);
      if (!generado?.usos || proveedores.has(generado.key)) continue;
      const primera = generado.actividades[0];
      if (!primera) continue;
      const consumeSoloLoSuyo = (primera.consumption ?? []).every(
        (c) => c.recurso === generado.key,
      );
      if (consumeSoloLoSuyo) proveedores.set(generado.key, feature.key);
    }
    return proveedores;
  }

  function enriquecerFeature(
    feature: ClassFeature,
    owner: string,
    proveedores: Map<string, string>,
    concedidas: Set<string>,
  ): ClassFeature {
    const generado = generadoDe(feature, owner);
    if (!generado) {
      return {
        ...feature,
        nameEn: feature.name,
        textEn: feature.name,
        textEs: feature.name,
        actividades: [],
        sinTraduccion: true,
      };
    }

    const base: ClassFeature = {
      ...feature,
      nameEn: generado.nameEn,
      textEs: generado.textEs,
      textEn: generado.textEn,
      actividades: generado.actividades,
      sinTraduccion: generado.sinTraduccion,
    };

    if (feature.grant) {
      if (feature.grant.usos && generado.usos) {
        compararUsos(owner, feature.key, feature.grant.usos, generado.usos);
      }
      return base; // el grant a mano manda tal cual — nunca se sustituye (E-3A1-5).
    }

    const primeraEnA = generado.actividades[0];
    if (!primeraEnA) return base;

    // **Un solo `grant` por aptitud de Foundry (C3).** `channel-divinity-1/2/3` son tres
    // `ClassFeature` sintéticas para un fichero: la primera (menor nivel) gana el `grant` y
    // siembra el recurso; las demás solo reaparecen en la hoja con su texto.
    const claveDeConcesion = `${owner.split("/")[0]}:${generado.key}`;
    if (concedidas.has(claveDeConcesion)) return base;

    // **Cada recurso consumido tiene que existir en la mesa (C3).** Se renombra a la
    // `ClassFeature.key` que lo siembra (`channel-divinity` → `channel-divinity-1`); si ningún
    // rasgo de la clase lo provee, no hay `grant` y se cuenta — nunca un botón que dé 409.
    const consumption = (primeraEnA.consumption ?? []).map((c) => ({
      ...c,
      recurso: proveedores.get(c.recurso) ?? c.recurso,
    }));
    const sinProveedor = (primeraEnA.consumption ?? [])
      .map((c) => c.recurso)
      .filter((recurso) => !proveedores.has(recurso));
    if (sinProveedor.length > 0) {
      CONCESIONES_SIN_RECURSO.push({ owner, key: feature.key, recursos: sinProveedor });
      return base;
    }
    concedidas.add(claveDeConcesion);

    const grant: ItemGrant = {
      kind: "grant",
      id: `${owner.replace("/", "-")}-${feature.key}`,
      labelKey: `class.${owner.replace("/", ".")}.${feature.key}`,
      actividad: { ...primeraEnA, consumption },
      ...(generado.usos && { usos: generado.usos }),
    };
    return { ...base, grant };
  }

  return clases.map((clase) => {
    const scalesGeneradas = SRD_CLASS_SCALES_GENERADAS[clase.key];
    const proveedores = proveedoresDe(clase);
    const concedidas = new Set<string>();
    return {
      ...clase,
      features: clase.features.map((f) => enriquecerFeature(f, clase.key, proveedores, concedidas)),
      subclasses: clase.subclasses.map((sub) => ({
        ...sub,
        features: sub.features.map((f) =>
          enriquecerFeature(f, `${clase.key}/${sub.key}`, proveedores, concedidas),
        ),
      })),
      scales: mezclarScales(clase.key, clase.scales, scalesGeneradas),
    };
  });
}

/**
 * Funde las `scales` hechas a mano (`classes.ts`, hoy solo la Furia) con las generadas — **la
 * hecha a mano gana si discrepa**, avisando por consola (Step 3 del brief: "se avisa", no
 * "falla" — a diferencia de `compararUsos`, una tabla de escala que difiere en un tramo no deja
 * el servidor sirviendo un dato falso per se, mientras que unos `usos` de la Furia mal fundidos
 * sí regalarían o robarían usos reales; la asimetría es a propósito). Ejemplo real:
 * `barbarian-rages` hecha a mano NO incluye el nivel 20 (SRD: «Unlimited», no un tramo numérico
 * — ver el comentario grande de `RASGO_FURIA` en `classes.ts`), pero Foundry sí trae un tramo
 * `20 → 999` (su forma de representar "sin límite"): la tabla a mano gana, 999 nunca llega al
 * catálogo servido.
 */
function mezclarScales(
  classKey: string,
  aMano: Readonly<Record<string, readonly ScaleStep[]>> | undefined,
  generadas: Readonly<Record<string, readonly ScaleStep[]>> | undefined,
): Record<string, readonly ScaleStep[]> | undefined {
  if (!aMano && !generadas) return undefined;
  const fundidas: Record<string, readonly ScaleStep[]> = { ...(generadas ?? {}) };
  for (const [clave, pasos] of Object.entries(aMano ?? {})) {
    const generado = generadas?.[clave];
    if (generado && JSON.stringify(generado) !== JSON.stringify(pasos)) {
      // eslint no restringe `console.warn` en este proyecto (ver generado.spec.ts): el aviso
      // solo tiene que verse en el arranque.
      console.warn(
        `enriquecerClases: la escala "${clave}" de ${classKey} difiere entre classes.ts (a mano, gana) y el catálogo generado — ver mezclarScales en generado/index.ts.`,
      );
    }
    fundidas[clave] = pasos; // a mano gana, siempre — con o sin discrepancia detectada arriba.
  }
  return fundidas;
}

// -------------------------------------------------------------------------------------------
// Tarea 3A.1 (T3b) — `enriquecerRazas`, la misma idea que `enriquecerClases` pero para
// `SRD_RACES` (`races.ts`). Un `FeatureGrant` de raza no tiene la forma de dueño+nivel que sí
// tiene una `ClassFeature` (`requirements` de Foundry no existe para un rasgo racial): la
// búsqueda es sencillamente por `(raceKey, grant.key)`, y `grant.key` es opcional a propósito —
// los `FeatureGrant` sin `key` (los que no tienen fila 1:1 en el catálogo generado, como los tres
// de dracónido: ver `races.ts`) se devuelven tal cual, sin tocar.

/** Índice del catálogo de rasgos de raza generado, por `(race, key)`. */
function indiceDeRasgosDeRaza(features: readonly RaceFeature[]): Map<string, RaceFeature> {
  const indice = new Map<string, RaceFeature>();
  for (const f of features) indice.set(`${f.race}:${f.key}`, f);
  return indice;
}

/**
 * `enriquecerRazas(razas, rasgos?)` — Tarea 3A.1 (T3b). Pura: devuelve una COPIA de `razas`
 * donde cada `FeatureGrant` con `key` gana `nameEn/textEs/textEn/actividades/sinTraduccion/
 * traduccionPropia` del catálogo generado (`race-features-srd.json`), buscando por
 * `(raceKey, grant.key)`. Un `FeatureGrant` sin `key`, o cuya `key` no tiene fila en el
 * generado, se devuelve sin cambios — nunca se inventa un enriquecimiento a partir de su nombre.
 */
export function enriquecerRazas(
  razas: readonly SrdRace[],
  rasgos: readonly RaceFeature[] = SRD_RACE_FEATURES,
): SrdRace[] {
  const indice = indiceDeRasgosDeRaza(rasgos);

  function enriquecerGrant(grant: Grant, raceKey: string): Grant {
    if (grant.kind !== "feature" || !grant.key) return grant;
    const generado = indice.get(`${raceKey}:${grant.key}`);
    if (!generado) return grant;
    const enriquecido: FeatureGrant = {
      ...grant,
      nameEn: generado.nameEn,
      textEs: generado.textEs,
      textEn: generado.textEn,
      actividades: generado.actividades,
      sinTraduccion: generado.sinTraduccion,
      traduccionPropia: generado.traduccionPropia,
    };
    return enriquecido;
  }

  return razas.map((raza) => ({
    ...raza,
    grants: raza.grants.map((g) => enriquecerGrant(g, raza.key)),
    subraces: raza.subraces.map((sub) => ({
      ...sub,
      // T3b (razas.mjs): el conversor atribuye TODOS los rasgos —de la raza y de su subraza— a
      // la clave de la CARPETA de nivel superior (p. ej. "gnome" para el gnomo de las rocas), así
      // que la búsqueda de un rasgo de subraza también se hace por `raza.key`, no `sub.key`.
      grants: sub.grants.map((g) => enriquecerGrant(g, raza.key)),
    })),
  }));
}
