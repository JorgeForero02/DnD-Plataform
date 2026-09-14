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

function texto(tipo, motivo) {
  return { texto: true, tipo, motivo };
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

/** `target.target: 'feat:channel-divinity'` → recurso `channel-divinity`. */
function claveDeRecurso(target, recursoPorDefecto) {
  if (target && typeof target === "string" && target.includes(":")) {
    return target.split(":").slice(1).join(":");
  }
  return recursoPorDefecto;
}

function consumoDe(consumption, recursoPorDefecto) {
  const targets = consumption?.targets ?? [];
  return targets
    .filter((t) => t.type === "itemUses")
    .map((t) => ({
      recurso: claveDeRecurso(t.target, recursoPorDefecto),
      cantidad: Number.parseInt(t.value ?? "1", 10) || 1,
    }));
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
  if (!unidad) return undefined;
  const concentracion =
    concentracionDelItem !== undefined ? concentracionDelItem : Boolean(duration?.concentration);
  const out = { unidad, concentracion };
  if (unidad !== "instantanea" && duration?.value !== "" && duration?.value !== undefined) {
    const valor = Number.parseInt(duration.value, 10);
    if (!Number.isFinite(valor)) return { rechazo: true }; // hueco B-bis: duración por fórmula
    out.valor = valor;
  }
  return out;
}

/** Extrae "300 po" del texto español; si no hay, cae al `cost` (en po) de Foundry. `* 100` = cp. */
function costeCpDe(materialesTextoEs, costeEnPoDeFoundry) {
  const match =
    typeof materialesTextoEs === "string" ? materialesTextoEs.match(/(\d[\d.,]*)\s*po\b/i) : null;
  const po = match ? Number.parseInt(match[1].replace(/[.,]/g, ""), 10) : costeEnPoDeFoundry || 0;
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

  const activacion = activity.activation?.override
    ? activity.activation
    : (ctx.itemActivation ?? activity.activation);
  const condicionCruda = activacion?.condition || ctx.itemActivation?.condition || "";
  const activation = activacionDe(activacion, condicionCruda ? ctx.condicionEs : undefined);

  const consumption = consumoDe(activity.consumption, ctx.recurso);

  const rangoCrudo = activity.range?.units ? activity.range : (ctx.itemRange ?? activity.range);
  const range = rangoDe(rangoCrudo);

  const durationCruda = activity.duration?.units
    ? activity.duration
    : (ctx.itemDuration ?? activity.duration);
  const duration = duracionDe(durationCruda, ctx.itemConcentration);
  if (duration?.rechazo) {
    return texto(
      tipoFoundry,
      `duration.value depende de una fórmula, no de un número: duracionSchema.valor es un ` +
        `entero fijo. Hueco B-bis.`,
    );
  }

  const materiales = materialesDe(ctx.itemMaterials, ctx.materialesTextoEs);

  const base = {
    activation,
    ...(consumption.length > 0 && { consumption }),
    ...(range && { range }),
    ...(duration && { duration }),
    ...(materiales && { materiales }),
    // `description` está topado a 2000 caracteres (`activity.schema.ts`); un texto de conjuro
    // más largo se recorta aquí — es una limitación conocida, no una mentira: el texto completo
    // sigue viviendo en `SrdSpell.textEs`.
    ...(ctx.descripcionEs && { description: ctx.descripcionEs.slice(0, 2000) }),
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
    const prueba = { ability, ...(calculo && { cd: { tipo: "cdDeConjuro" } }) };
    return { tipo: "prueba", prueba, ...base };
  }

  if (tipoFoundry === "heal") {
    const r = expresionDeDadosDe(activity.healing, 1, esCantrip);
    if (r.rechazo) return texto(tipoFoundry, r.rechazo);
    return { tipo: "dados", dados: r.dados, ...base };
  }

  if (tipoFoundry === "damage") {
    const r = expresionDeDadosDe(activity.damage?.parts?.[0], -1, esCantrip);
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
      cd = { tipo: "cdDeConjuro" };
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
      const r = expresionDeDadosDe(parts[0], -1, esCantrip);
      if (r.rechazo) return texto(tipoFoundry, r.rechazo);
      dados = r.dados;
    }
    const siSalva = dados ? (activity.damage?.onSave === "half" ? "mitad" : "ninguno") : "ninguno";
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
      const r = expresionDeDadosDe(parts[0], -1, esCantrip);
      if (r.rechazo) return texto(tipoFoundry, r.rechazo);
      dados = r.dados;
    }
    return { tipo: "ataque", ataque: { bono }, ...(dados && { dados }), ...base };
  }

  return rechazo(`Tipo de actividad sin implementar: "${tipoFoundry}".`);
}
