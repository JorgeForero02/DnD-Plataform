import { origenDe } from "./origen.mjs";

// Tarea 3A.1 (T1) — traduce una `activity` de Foundry (`system.activities.<id>`) a una
// `Actividad` de `@dnd/shared`, a `{ texto: true, tipo, motivo }` (fuera de A, o un hueco real
// del esquema — "Vuelve al esquema" del informe de T0), o a `{ rechazo: motivo }` (un dato que
// no se pudo traducir sin torcer el esquema).
//
// **Nunca evalúa una fórmula.** Cada `@` pasa por `origenDe` (o se rechaza) antes de entrar en
// el resultado — la misma frontera que `resolverOrigen` impone en el motor.

/** Tipos de Foundry que quedan fuera de A por decisión de autor (2026-09-06, no se reabre). */
const TIPOS_FUERA_DE_A = new Set([
  "summon",
  "transform",
  "enchant",
  "teleport",
  "forward",
  "cast",
  "order",
]);

const MAPA_DE_DANO = {
  acid: "ACID",
  bludgeoning: "BLUDGEONING",
  cold: "COLD",
  fire: "FIRE",
  force: "FORCE",
  lightning: "LIGHTNING",
  necrotic: "NECROTIC",
  piercing: "PIERCING",
  poison: "POISON",
  psychic: "PSYCHIC",
  radiant: "RADIANT",
  slashing: "SLASHING",
  thunder: "THUNDER",
};

const CARAS_VALIDAS = new Set([4, 6, 8, 10, 12, 20, 100]);
const CARAS_DE_ESCALADO_VALIDAS = new Set([4, 6, 8, 10, 12]);

/**
 * Un resultado «texto» lleva SIEMPRE su motivo (ola de arreglos, C5: hasta ahora `salida.mjs` y
 * `aptitudes.mjs` lo tiraban y `rechazos.md` decía «ninguno» con 14 aptitudes y varios conjuros
 * fuera). `porAutor` distingue las dos tablas del informe: `true` = tipo fuera de A por decisión
 * de autor (summon, transform…); `false` = hueco del esquema o fórmula que no cabe.
 */
function texto(tipo, motivo, porAutor = false) {
  return { texto: true, tipo, motivo, porAutor };
}

function rechazo(motivo) {
  return { rechazo: motivo };
}

/**
 * `barbarian:rage` — E-3A1-5: la Furia ya existe hecha a mano en
 * `apps/api/src/rules/catalog/classes.ts` (`RASGO_FURIA`). Su `effects` (`raging`, 60s) no sale
 * de ningún dato de Foundry (el `ActiveEffect` de `rage.yml` es un cambio numérico de daño, no
 * una condición del vocabulario de `character-state.schema.ts`): **se reproduce, no se
 * regenera**. Es el único rasgo con este trato — cualquier otro pasa por el camino genérico.
 */
const CONOCIDOS_A_MANO = {
  rage: {
    tipo: "utilidad",
    activation: { coste: "BONUS" },
    consumption: [{ recurso: "rage", cantidad: 1 }],
    duration: { valor: 1, unidad: "minuto", concentracion: false },
    effects: [{ key: "raging", durationSeconds: 60, note: "Furia activa" }],
    description:
      "Mientras dura (1 minuto): ventaja en pruebas y salvaciones de Fuerza, resistencia a daño contundente, perforante y cortante, y no puedes lanzar conjuros ni llevar armadura pesada.",
  },
};

/** Mapea el `type` de activación de Foundry a un `Coste`, o a la rama de `tiempo`. */
function activacionDe(bloqueDeActivacion, condicionEs) {
  const tipo = bloqueDeActivacion?.type ?? "";
  const base = {};
  if (condicionEs) base.condicion = condicionEs;

  if (tipo === "action") return { coste: "ACTION", ...base };
  if (tipo === "bonus") return { coste: "BONUS", ...base };
  if (tipo === "reaction") return { coste: "REACTION", ...base };
  if (tipo === "minute" || tipo === "hour") {
    const valor = Number.parseInt(bloqueDeActivacion?.value ?? "1", 10) || 1;
    return { tiempo: { valor, unidad: tipo === "minute" ? "minuto" : "hora" }, ...base };
  }
  // Regla de corte de T0 (casos-raros.json, monk:ki y fighter:action-surge): 'special' sin
  // activación propia no consume la acción del turno — la consume el rasgo que lo gasta, fuera
  // de alcance de esta tarea. Una cadena vacía cae en la misma rama.
  return { coste: "FREE", ...base };
}

/**
 * `target.target` de un consumo `itemUses`, medido sobre las tres carpetas (ola de arreglos,
 * C3): `''` (44 — los usos del PROPIO ítem), `feat:<identifier>` (7 — los usos de OTRA aptitud
 * de la misma clase: Canalizar Divinidad, Inspiración Bárdica) y `Compendium.dnd5e.classfeatures.
 * Item.<id>` (15 — un UUID de compendio: los rasgos de ki del monje y las ocho metamagias). Solo
 * las dos primeras formas identifican un recurso que el personaje puede tener de verdad; el UUID
 * no se resuelve aquí (hacerlo exigiría un índice `_id → identifier` y la promesa de que 3A.2
 * lo cablee), así que se rechaza EN VOZ ALTA — antes caía en `recursoPorDefecto` y la actividad
 * consumía un recurso con el nombre del propio rasgo («flurry-of-blows») que nadie siembra: un
 * botón que en la mesa siempre daría 409. `claveDeIdentificador` traduce el `identifier` de
 * Foundry a la clave del catálogo (I13) para los `feat:<identifier>`.
 */
function claveDeRecurso(target, recursoPorDefecto, claveDeIdentificador) {
  if (!target || typeof target !== "string") return { recurso: recursoPorDefecto };
  if (target.startsWith("feat:")) {
    const identificador = target.slice("feat:".length);
    return { recurso: claveDeIdentificador?.get(identificador) ?? identificador };
  }
  return { noResoluble: target };
}

function consumoDe(consumption, recursoPorDefecto, claveDeIdentificador) {
  const targets = consumption?.targets ?? [];
  const consumos = [];
  for (const t of targets) {
    if (t.type !== "itemUses") continue;
    const r = claveDeRecurso(t.target, recursoPorDefecto, claveDeIdentificador);
    if (r.noResoluble) return { noResoluble: r.noResoluble };
    consumos.push({ recurso: r.recurso, cantidad: Number.parseInt(t.value ?? "1", 10) || 1 });
  }
  return { consumos };
}

/** `'ft'`→`'pies'`, `'touch'`→`'toque'`… `'self'` y `''` se omiten (ver el porqué en T1). */
function rangoDe(range) {
  const unidad = range?.units;
  if (!unidad || unidad === "self") return undefined;
  if (unidad === "ft") {
    const ft = Number.parseInt(range.value, 10);
    if (!Number.isFinite(ft) || ft <= 0) return undefined;
    return { unidad: "pies", distanciaFt: ft };
  }
  if (unidad === "touch") return { unidad: "toque" };
  if (unidad === "any") return { unidad: "ilimitado" };
  if (unidad === "spec") return { unidad: "especial" };
  if (unidad === "mi") {
    const millas = Number.parseInt(range.value, 10) || 0;
    return { unidad: "pies", distanciaFt: millas * 5280 };
  }
  return undefined;
}

const MAPA_DE_UNIDAD_DE_DURACION = {
  inst: "instantanea",
  round: "asalto",
  minute: "minuto",
  hour: "hora",
  day: "dia",
  disp: "hastaQueSeDisipe",
  dstr: "hastaQueSeDisipe",
  spec: "especial",
};

function duracionDe(duration, concentracionDelItem) {
  const unidadFoundry = duration?.units;
  if (!unidadFoundry) return undefined;
  const unidad = MAPA_DE_UNIDAD_DE_DURACION[unidadFoundry];
  // `turn` (2, actividades secundarias de Parpadeo/Nube apestosa: «hasta el final del turno»),
  // `year` y `perm` (1 y 1) no tienen equivalente en `duracionSchema`: se rechazan con motivo en
  // vez de caer en `undefined` y dejar que el esquema ponga «instantánea» por defecto (C1).
  if (!unidad) {
    return {
      rechazo: `duration.units = '${unidadFoundry}' no tiene equivalente en duracionSchema.unidad.`,
    };
  }
  const concentracion =
    concentracionDelItem !== undefined ? concentracionDelItem : Boolean(duration?.concentration);
  const out = { unidad, concentracion };
  if (unidad !== "instantanea" && duration?.value !== "" && duration?.value !== undefined) {
    const valor = Number.parseInt(duration.value, 10);
    if (!Number.isFinite(valor)) {
      return {
        rechazo: `duration.value = '${duration.value}' depende de una fórmula, no de un número: duracionSchema.valor es un entero fijo. Hueco B-bis.`,
      };
    }
    out.valor = valor;
  }
  return out;
}

// Un millar en el SRD español se escribe con el millar SEPARADO por un espacio («25 000 po», no
// «25.000 po» ni «25,000 po»): `resurrección verdadera` es el único conjuro con ese formato
// (medido en la ola de arreglos, I9/re-review). La alternativa de grupos de tres dígitos separados
// por espacio (normal o los de ancho fijo/estrecho que `\s` de JS ya reconoce, U+00A0/U+202F) va
// PRIMERO en la alternancia para que gane sobre `\d[\d.,]*`, que solo casaría "000" suelto y daría
// 0 cp — el fallo que tenía esta función antes de este arreglo.
const RE_COSTE_PO = /(\d{1,3}(?:\s\d{3})+|\d[\d.,]*)\s*po\b/i;

/** Extrae "300 po" (o "25 000 po", con millar separado por espacio) del texto español; si no
 * hay, cae al `cost` (en po) de Foundry. `* 100` = cp. */
function costeCpDe(materialesTextoEs, costeEnPoDeFoundry) {
  const match = typeof materialesTextoEs === "string" ? materialesTextoEs.match(RE_COSTE_PO) : null;
  const po = match ? Number.parseInt(match[1].replace(/[.,\s]/g, ""), 10) : costeEnPoDeFoundry || 0;
  return po * 100;
}

function materialesDe(materials, materialesTextoEs) {
  if (!materials?.value) return undefined;
  return {
    texto: (materialesTextoEs ?? materials.value).slice(0, 300),
    consumido: Boolean(materials.consumed),
    costeCp: costeCpDe(materialesTextoEs, materials.cost),
  };
}

/**
 * Construye una `ExpresionDeDados` desde `damage.parts[0]` (save/attack/damage) o desde
 * `healing` (heal) — misma forma en Foundry salvo el nombre del campo contenedor. `esCantrip`
 * decide el eje de escalado ("Vuelve al esquema" no lo cubre, pero `fire-bolt` vs `fireball` ya
 * lo prueban en la tarea 0: un truco escala por nivel de personaje, el resto por espacio).
 */
function expresionDeDadosDe(parte, signo, esCantrip) {
  if (!parte) return { rechazo: "No hay expresión de dados que convertir." };

  const numero = parte.number ?? undefined;
  const denominacion = parte.denomination ?? undefined;
  const custom = parte.custom;
  const out = { signo };

  if (custom?.enabled && numero === undefined && denominacion === undefined) {
    const formula = (custom.formula ?? "").trim();
    if (/^@scale\.[a-z-]+\.[a-z-]+$/.test(formula)) {
      return {
        rechazo:
          `custom.formula = '${formula}' sustituye a la vez n y caras (una tabla de escala ` +
          `entera, no un bonus sumado) — hueco A: expresionDeDadosSchema.n no puede depender de ` +
          `un Origen.`,
      };
    }
    if (/^-?\d+$/.test(formula)) {
      out.bonus = { tipo: "fijo", valor: Number.parseInt(formula, 10) };
    } else {
      const r = origenDe(formula);
      if (r.rechazo) return { rechazo: r.rechazo };
      out.bonus = r.origen;
    }
  } else {
    if (numero !== undefined && denominacion !== undefined) {
      if (!CARAS_VALIDAS.has(denominacion)) {
        return { rechazo: `Dado d${denominacion} fuera del vocabulario cerrado de caras.` };
      }
      out.n = numero;
      out.caras = denominacion;
    }
    const bonusFormula = (parte.bonus ?? "").trim();
    if (bonusFormula !== "") {
      const r = origenDe(bonusFormula);
      if (r.rechazo) return { rechazo: r.rechazo };
      out.bonus = r.origen;
    }
  }

  if (out.n === undefined && out.bonus === undefined) {
    return { rechazo: "Una expresión de dados sin dados y sin bonus no existe." };
  }

  if (signo === -1) {
    const dano = Array.isArray(parte.types) ? parte.types[0] : undefined;
    if (dano && MAPA_DE_DANO[dano]) out.tipoDeDano = MAPA_DE_DANO[dano];
  }

  const escala = parte.scaling;
  if (escala?.mode === "whole" && typeof escala.number === "number" && escala.number > 0) {
    if (out.caras !== undefined && CARAS_DE_ESCALADO_VALIDAS.has(out.caras)) {
      out.escalado = {
        por: esCantrip ? "nivelDePersonaje" : "espacio",
        n: escala.number,
        caras: out.caras,
      };
    }
  }

  return { dados: out };
}

/**
 * El bloque de la actividad si declara `override: true`; si no, el del ítem cuando existe, y el
 * de la actividad como último recurso (aptitudes de clase: no hay bloque de ítem). Ver C1 en
 * `actividadDe`.
 */
function bloquePropioOHeredado(bloqueDeActividad, bloqueDeItem) {
  if (bloqueDeActividad?.override === true) return bloqueDeActividad;
  return bloqueDeItem ?? bloqueDeActividad;
}

/**
 * `damage.parts` con más de una parte (ola de arreglos, I1: `ice-storm` 2d8 contundente + 4d6
 * frío, `flame-strike` 4d6 radiante + 4d6 fuego, `meteor-swarm` 20d6 contundente + 20d6 fuego —
 * tres en todo el SRD) no cabe en UNA `ExpresionDeDados`: tomar la primera parte y callar era
 * la mitad del daño sin aviso. Se rechaza con motivo y el conjuro se queda en su prosa.
 */
function dadosDeDano(parts, esCantrip) {
  const lista = parts ?? [];
  if (lista.length > 1) {
    const partes = lista
      .map((p) => `${p.number ?? "?"}d${p.denomination ?? "?"} ${(p.types ?? []).join("/")}`)
      .join(" + ");
    return {
      rechazo:
        `damage.parts tiene ${lista.length} partes (${partes}): expresionDeDadosSchema es UNA ` +
        `expresión con UN tipo de daño — se rechaza entera antes que recortarla a la primera parte.`,
    };
  }
  return expresionDeDadosDe(lista[0], -1, esCantrip);
}

/**
 * `dc.calculation` de una salvación o prueba (ola de arreglos, I6). Medido: en conjuros vale
 * `spellcasting` (158) o vacío (6, con `dc.formula` fija); en aptitudes vale la abreviatura de
 * la característica que calcula la CD (`cha` 10, `wis` 5, `con` 10). `cdDeConjuro` es la CD de
 * LANZADOR ya derivada (8 + competencia + su característica de lanzamiento), y
 * `activities.service.ts` solo la deriva si la clase lanza: para un clérigo (`wis`) es la misma
 * cifra; para un monje (`wis`, Golpe Aturdidor) o un berserker (`cha`, Presencia Intimidante) no
 * hay CD de conjuro que derivar y `resolverOrigen` lanzaría en la mesa. `Origen` no tiene forma
 * «8 + competencia + modificador(X)», así que solo entra cuando la característica coincide con
 * la de lanzamiento de la clase (`ctx.spellcastingAbility`, la pone `aptitudes.mjs`); lo demás
 * se rechaza con motivo.
 */
function cdDeCalculo(calculo, ctx) {
  if (calculo === "spellcasting") return { cd: { tipo: "cdDeConjuro" } };
  if (ctx.spellcastingAbility && calculo === ctx.spellcastingAbility) {
    return { cd: { tipo: "cdDeConjuro" } };
  }
  const clase = ctx.spellcastingAbility
    ? `cuya característica de lanzamiento es '${ctx.spellcastingAbility}'`
    : "que no lanza conjuros";
  return {
    rechazo:
      `save/check.dc.calculation = '${calculo}': una CD de característica (8 + competencia + ` +
      `modificador) de una clase ${clase} — Origen no tiene esa forma y cdDeConjuro mentiría ` +
      `(o lanzaría en la mesa).`,
  };
}

/**
 * `actividadDe(activity, ctx)` — pura. `ctx` trae lo que Foundry guarda a nivel de ÍTEM (rango y
 * duración de un conjuro, materiales) y lo que ya viene traducido del SRD español (T0/T1 lo
 * separan: `srd-es.mjs` corta el texto, esta función solo lo coloca en el sitio correcto).
 *
 * `ctx`: `{ recurso, itemRange, itemDuration, itemConcentration, itemMaterials, itemLevel,
 * esCantrip, descripcionEs, condicionEs, materialesTextoEs, higherLevelsEs, claveConocida }`.
 */
export function actividadDe(activity, ctx = {}) {
  if (ctx.claveConocida && CONOCIDOS_A_MANO[ctx.claveConocida]) {
    return { ...CONOCIDOS_A_MANO[ctx.claveConocida] };
  }

  const tipoFoundry = activity?.type;
  if (TIPOS_FUERA_DE_A.has(tipoFoundry)) {
    return texto(
      tipoFoundry,
      `type: ${tipoFoundry}. Fuera de A por decisión de autor (2026-09-06): summon/transform/enchant/teleport/forward/cast/order se importan con su prosa, sin actividad.`,
      true,
    );
  }

  const TIPOS_EN_A = new Set(["attack", "save", "damage", "heal", "utility", "check"]);
  if (!TIPOS_EN_A.has(tipoFoundry)) {
    return rechazo(`Tipo de actividad de Foundry desconocido: "${tipoFoundry}".`);
  }

  // Hueco C (paladin:lay-on-hands): consumo variable, elegido en la mesa dentro de un tope —
  // consumoSchema.cantidad es un entero fijo, no "hasta N, a elección".
  if (activity.consumption?.scaling?.allowed === true) {
    return texto(
      tipoFoundry,
      `consumption.scaling.allowed = true: el consumo es variable (hasta un tope), y lo que se ` +
        `cura/gasta es la MISMA cifra elegida en la mesa — consumoSchema.cantidad es un entero ` +
        `fijo. Hueco C.`,
    );
  }

  // **`override: false` manda al ÍTEM (ola de arreglos, C1).** Foundry guarda en cada actividad
  // un bloque `activation`/`duration`/`range` con `override`: `true` = la actividad tiene su
  // propio valor; `false` = lo que hay en el bloque es un PLACEHOLDER (`type: action`,
  // `units: inst`) y el valor real vive en `system.activation`/`system.duration`/`system.range`
  // del ítem. Hasta esta ola se tomaba el bloque de la actividad en cuanto traía `type`/`units`
  // (que siempre trae), y `ctx.itemActivation` no se rellenaba nunca para conjuros: Escudo salía
  // como acción (es reacción) y 178 actividades como «instantánea + concentración» a la vez.
  // Un ítem sin bloque propio (las aptitudes de clase no tienen `system.activation`) cae al de
  // la actividad, que ahí sí es el dato real.
  const activacion = bloquePropioOHeredado(activity.activation, ctx.itemActivation);
  const condicionCruda = activacion?.condition || "";
  const activation = activacionDe(activacion, condicionCruda ? ctx.condicionEs : undefined);

  const consumo = consumoDe(activity.consumption, ctx.recurso, ctx.claveDeIdentificador);
  if (consumo.noResoluble) {
    return texto(
      tipoFoundry,
      `actividad sin recurso resoluble: consumption.targets apunta a '${consumo.noResoluble}' ` +
        `(un UUID de compendio, no los usos del propio rasgo ni un 'feat:<identifier>') — sin ` +
        `un recurso que el personaje tenga de verdad, el botón daría 409 en la mesa.`,
    );
  }
  const consumption = consumo.consumos;
  // Tarea 3A.1 (T3, encontrado sobre aptitudes de clase): un `value` NEGATIVO en Foundry
  // (`"-1"`) es una REPOSICIÓN — «cuando tiras iniciativa sin usos de Inspiración bárdica,
  // recuperas uno» (Inspiración superior) — no un gasto. `consumoSchema.cantidad` es un entero
  // POSITIVO (gastar, nunca regalar); forzar `Math.abs` mentiría sobre qué hace el botón. Mismo
  // trato que cualquier otro hueco del esquema: texto, no una actividad torcida.
  if (consumption.some((c) => c.cantidad <= 0)) {
    return texto(
      tipoFoundry,
      "consumption con cantidad <= 0: no es un gasto, es una reposición automática " +
        "(p. ej. recuperar un uso al tirar iniciativa) — consumoSchema.cantidad es positivo, " +
        "gastar es lo único que representa.",
    );
  }

  const range = rangoDe(bloquePropioOHeredado(activity.range, ctx.itemRange));

  const durationCruda = bloquePropioOHeredado(activity.duration, ctx.itemDuration);
  // La concentración vive en `properties` del ÍTEM (ver `duracionSchema`), y solo aplica cuando
  // la duración es la del ítem: una actividad secundaria con duración propia (`override: true`
  // — «Restraining Tentacles» de Tentáculos negros, instantánea) trae su propio
  // `concentration`, y heredar la del ítem daba «instantánea + concentración» (C1).
  const concentracion =
    activity.duration?.override === true
      ? Boolean(activity.duration.concentration)
      : ctx.itemConcentration;
  const duration = duracionDe(durationCruda, concentracion);
  if (duration?.rechazo) return texto(tipoFoundry, duration.rechazo);

  const materiales = materialesDe(ctx.itemMaterials, ctx.materialesTextoEs);

  const base = {
    activation,
    ...(consumption.length > 0 && { consumption }),
    ...(range && { range }),
    ...(duration && { duration }),
    ...(materiales && { materiales }),
    // Sin recorte (ola de arreglos, I9): `description` se topa en el esquema
    // (`activity.schema.ts`, subido para que quepa la prosa entera de un conjuro), y si algún
    // día no cabe, el esquema Zod lo rechaza en voz alta al escribir — nunca se corta en
    // silencio.
    ...(ctx.descripcionEs && { description: ctx.descripcionEs }),
  };

  const esCantrip = Boolean(ctx.esCantrip ?? ctx.itemLevel === 0);

  if (tipoFoundry === "utility") {
    return { tipo: "utilidad", ...base };
  }

  if (tipoFoundry === "check") {
    const abilityFoundry = activity.check?.ability;
    if (!abilityFoundry || Array.isArray(abilityFoundry)) {
      return texto(
        tipoFoundry,
        `check.ability ${Array.isArray(abilityFoundry) ? "es un array" : "vacío"}: sin una característica sola no hay 'prueba' que importar, se queda en utilidad/texto.`,
      );
    }
    const ability = abilityFoundry === "spellcasting" ? "lanzamiento" : abilityFoundry;
    const calculo = activity.check?.dc?.calculation;
    let cd;
    if (calculo) {
      const r = cdDeCalculo(calculo, ctx);
      if (r.rechazo) return texto(tipoFoundry, r.rechazo);
      cd = r.cd;
    }
    const prueba = { ability, ...(cd && { cd }) };
    return { tipo: "prueba", prueba, ...base };
  }

  if (tipoFoundry === "heal") {
    const r = expresionDeDadosDe(activity.healing, 1, esCantrip);
    if (r.rechazo) return texto(tipoFoundry, r.rechazo);
    return { tipo: "dados", dados: r.dados, ...base };
  }

  if (tipoFoundry === "damage") {
    const r = dadosDeDano(activity.damage?.parts, esCantrip);
    if (r.rechazo) return texto(tipoFoundry, r.rechazo);
    return { tipo: "dados", dados: r.dados, ...base };
  }

  if (tipoFoundry === "save") {
    let ability = activity.save?.ability;
    // `save.ability` a veces llega como un ARRAY de un solo elemento en Foundry — un artefacto
    // del exportador (medido en T2: 65 de los 66 casos son `[<una>]`, no varias características
    // a elección), no una elección real de la mesa; se desenvuelve igual que un escalar. Un
    // array con 0 o ≥2 elementos sí es una elección real (o un dato ausente) y no cabe en
    // `salvacionSchema.ability`, que es una sola — se rechaza en vez de forzar una, que mentiría
    // sobre cuál eligió la mesa.
    if (Array.isArray(ability)) {
      if (ability.length === 1) {
        ability = ability[0];
      } else {
        return texto(
          tipoFoundry,
          `save.ability es un array de ${ability.length} elemento(s) (${JSON.stringify(ability)}): salvacionSchema.ability es una sola, no hay salvación que importar sin torcerlo.`,
        );
      }
    }
    if (!ability) {
      return texto(tipoFoundry, "save.ability vacío: no hay salvación que importar.");
    }
    // `save.dc.calculation` no vacío -> cdDeConjuro: en los conjuros vale `"spellcasting"`; en
    // las aptitudes de clase (Canalizar Divinidad) Foundry pone directamente la abreviatura de
    // la característica que calcula la CD (`"wis"`) — es la misma CD de lanzador en la práctica
    // (8 + competencia + el modificador de la característica de lanzamiento de esa clase), así
    // que cualquier valor no vacío de `calculation` cae en la misma forma. Cuando llega vacío
    // pero `dc.formula` es un entero literal (contact-other-plane: CD 15 fija, no depende del
    // lanzador) es `fijo`, la misma forma que ya usa `origenDe` para cualquier otro número — no
    // una fórmula evaluable, un dato del propio conjuro.
    const calculo = activity.save?.dc?.calculation;
    const formulaCd = (activity.save?.dc?.formula ?? "").trim();
    let cd;
    if (calculo) {
      const r = cdDeCalculo(calculo, ctx);
      if (r.rechazo) return texto(tipoFoundry, r.rechazo);
      cd = r.cd;
    } else if (/^\d+$/.test(formulaCd)) {
      cd = { tipo: "fijo", valor: Number.parseInt(formulaCd, 10) };
    } else {
      return texto(
        tipoFoundry,
        "save.dc sin cálculo derivable (ni 'spellcasting' ni una fórmula entera fija): sin CD no hay salvación que importar.",
      );
    }
    const parts = activity.damage?.parts ?? [];
    let dados;
    if (parts.length > 0) {
      const r = dadosDeDano(parts, esCantrip);
      if (r.rechazo) return texto(tipoFoundry, r.rechazo);
      dados = r.dados;
    }
    // `damage.onSave` medido sobre las tres carpetas (ola de arreglos, I5): `none` 75, `half`
    // 100, `full` 1 (Feeblemind: 4d6 psíquico con o sin salvar). `salvacionSchema.siSalva` es
    // `ninguno | mitad` — «todo el daño aunque salve» no cabe, y traducirlo a `ninguno` decía
    // justo lo contrario. Sin dados no hay daño que reducir: `ninguno`, sea cual sea `onSave`.
    const onSave = activity.damage?.onSave ?? "none";
    let siSalva = "ninguno";
    if (dados && onSave === "half") siSalva = "mitad";
    else if (dados && onSave !== "none") {
      return texto(
        tipoFoundry,
        `damage.onSave = '${onSave}': el daño se aplica entero aunque la salvación se supere, y ` +
          `salvacionSchema.siSalva solo dice 'ninguno' o 'mitad' — se queda en texto, no en una ` +
          `salvación que perdonaría el daño.`,
      );
    }
    return {
      tipo: "salvacion",
      salvacion: { ability, cd, siSalva },
      ...(dados && { dados }),
      ...base,
    };
  }

  if (tipoFoundry === "attack") {
    const cuenta = Number.parseInt(activity.target?.affects?.count ?? "1", 10) || 1;
    if (cuenta > 1) {
      return texto(
        tipoFoundry,
        `target.affects.count = '${cuenta}': son ${cuenta} tiradas de ataque independientes, ` +
          `cada una con su propio impacto o fallo — ataqueSchema solo tiene un ataque.bono y un ` +
          `dados?, no sitio para varias tiradas.`,
      );
    }
    const bonoFormula = (activity.attack?.bonus ?? "").trim();
    let bono;
    if (bonoFormula === "") {
      // Foundry deja el bono en blanco y lo deriva internamente: modificador de lanzamiento +
      // competencia. Es exactamente `ataqueDeConjuro` (E-3A1-4, amendment del orquestador).
      bono = { tipo: "ataqueDeConjuro" };
    } else {
      const r = origenDe(bonoFormula);
      if (r.rechazo) return texto(tipoFoundry, r.rechazo);
      bono = r.origen;
    }
    const parts = activity.damage?.parts ?? [];
    let dados;
    if (parts.length > 0) {
      const r = dadosDeDano(parts, esCantrip);
      if (r.rechazo) return texto(tipoFoundry, r.rechazo);
      dados = r.dados;
    }
    return { tipo: "ataque", ataque: { bono }, ...(dados && { dados }), ...base };
  }

  return rechazo(`Tipo de actividad sin implementar: "${tipoFoundry}".`);
}

/**
 * Convierte una `activities` de Foundry (objeto por id) en `Actividad[]` + `fueraDeA[]` +
 * `rechazosDeItem[]`. **Todo lo que no entra lleva su motivo** (ola de arreglos, C5): antes un
 * `{ texto, tipo, motivo }` solo dejaba el `tipo` y `rechazos.md` no distinguía «summon, fuera de
 * A por decisión de autor» de «heal rechazado por un hueco del esquema». `porAutor` separa las
 * dos tablas del informe. Una sola función para conjuros, aptitudes y razas.
 */
export function convertirActividades(doc, ctxComun, clave) {
  const actividades = [];
  const fueraDeA = [];
  const rechazosDeItem = [];
  const bloque = doc.system.activities ?? {};
  for (const actividadFoundry of Object.values(bloque)) {
    const r = actividadDe(actividadFoundry, ctxComun);
    if (r.rechazo) {
      rechazosDeItem.push({
        item: clave,
        tipo: actividadFoundry.type,
        porAutor: false,
        motivo: `RECHAZO SIN DECLARAR: ${r.rechazo}`,
      });
    } else if (r.texto) {
      fueraDeA.push(r.tipo);
      rechazosDeItem.push({ item: clave, tipo: r.tipo, porAutor: r.porAutor, motivo: r.motivo });
    } else {
      actividades.push(r);
    }
  }
  return { actividades, fueraDeA, rechazosDeItem };
}

/** Las dos listas del informe a partir de `rechazosDeItem` (ver `convertirActividades`). */
export function repartirRechazos(rechazosDeItem, destino) {
  for (const r of rechazosDeItem) {
    const linea = `${r.item} (${r.tipo}): ${r.motivo}`;
    if (r.porAutor) destino.fueraDeAPorAutor.push(linea);
    else destino.huecos.push(linea);
  }
}
