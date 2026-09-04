import type { DamageModifier, DamageType, TraceStep } from "@dnd/shared";

// Tarea 2.5.1 — la pieza C: reducir un daño bruto por los modificadores estructurados de un
// statblock (2.5.1 pieza B). **Pura**: sin Nest, sin Prisma, sin HTTP — misma familia y mismo
// sitio que `../speed/effective-speed.ts`, que es el precedente del proyecto para "una regla del
// SRD sobre un número, con traza".
//
// El orden **lo dicta el SRD 5.1 y no se improvisa** (edición en español, p.102, sección
// «Resistencia y vulnerabilidad al daño»):
//
//   «La resistencia y la vulnerabilidad se aplican después del resto de modificadores al daño.»
//
// Aquí eso ya está garantizado por el llamador: a esta función solo le entra el daño YA
// modificado por lo demás (el aura mágica del ejemplo del libro, si la hubiera), nunca el bruto
// de la tirada.
//
//   «Si existen varias resistencias o vulnerabilidades que afectan al mismo tipo de daño, estas
//   solo cuentan como una.» — cita textual, misma página. Por eso dos `RESIST` del mismo tipo
//   siguen siendo una sola mitad, nunca un cuarto.
//
// **CORREGIDO en la revisión de cierre (2026-09-04), y el error merece quedarse escrito.**
// Aquí ponía que «resistencia y vulnerabilidad del mismo tipo se cancelan» no aparece en el
// documento bajo licencia CC «ni en la edición inglesa ni en la española — se buscó en las dos»,
// y que por eso se aplicaba la lectura de Sage Advice. **Las dos mitades eran falsas.** La
// edición inglesa sí lo dice, con dos palabras que la traducción española pierde:
//
//   «Resistance **and then** vulnerability are applied after all other modifiers to damage.»
//   — SRD 5.1 / Basic Rules, «Damage Resistance and Vulnerability»
//
//   «La resistencia y la vulnerabilidad se aplican después de todos los modificadores al daño.»
//   — la misma frase en español, **sin el "and then"**
//
// Ese «and then» es toda la regla: no se cancelan, **se encadenan en ese orden** — primero la
// mitad, luego el doble. Con 25 de daño, resistente y vulnerable a la vez: `floor(25/2) = 12`,
// `× 2 = 24`. No 25. Con números pares coincide con lo que había; con impares no, y esa es
// exactamente la clase de defecto que solo se ve leyendo la fuente buena.
//
// La conclusión anterior era razonable **leyendo solo el PDF español**, que es el que el spec
// enlaza. Lo que no era razonable era escribir que se habían mirado las dos. Cuando las dos
// ediciones discrepan en un matiz, manda la inglesa, que es el original.
//
// Lo que el documento sigue sin decir con esas palabras es «la inmunidad manda sobre todo»; sale
// por definición y no hace falta cita: la inmunidad deja el daño de ese tipo en 0, así que no
// queda «mitad de cero» que discutir.
//
// El redondeo hacia abajo no tiene aquí su frase exacta, pero el **ejemplo del propio pasaje**
// lo fija sin ambigüedad: 25 de daño, menos 5 de un aura, «y luego se divide entre dos, así que
// la criatura sufre 10». Veinte entre dos son diez y no hay decimal que discutir, así que el
// ejemplo no distingue; lo que sí lo fija es la convención de división del mismo documento
// (p.11, modificador de característica: «divide el total por 2 (redondeado hacia abajo)»), que
// es además la que ya usa `effective-speed.ts` para «la mitad» de la velocidad.

export interface DamageModifierMatch {
  damageType: DamageType;
  effect: DamageModifier["effect"];
  note?: string;
}

export interface ApplyDamageModifiersResult {
  total: number;
  steps: TraceStep[];
  /**
   * La prosa que LIMITA la regla (*«de ataques no mágicos con armas que no sean de plata»*), solo
   * de los modificadores que de verdad se aplicaron. **El servidor nunca la interpreta**: la
   * enseña al DM junto al resultado para que la ignore o la degrade de un clic.
   */
  notes: string[];
}

/**
 * Reduce (o agrava) un daño ya bruto por los modificadores de un tipo concreto, con su traza.
 *
 * `rawDamage` es el daño **que llega a esta función**: si hay otros modificadores (un aura
 * mágica, por ejemplo), el llamador los aplica antes, porque el SRD dice que resistencia y
 * vulnerabilidad van "después del resto".
 */
export function applyDamageModifiers(
  rawDamage: number,
  damageType: DamageType,
  modifiers: DamageModifierMatch[],
): ApplyDamageModifiersResult {
  const steps: TraceStep[] = [
    {
      op: "base",
      amount: rawDamage,
      sourceType: "base",
      sourceKey: damageType.toLowerCase(),
      labelKey: "damage.raw",
    },
  ];
  const notes: string[] = [];

  const delTipo = modifiers.filter((m) => m.damageType === damageType);

  // La inmunidad manda sobre todo lo demás del mismo tipo: no hay "mitad de cero" que discutir.
  const inmune = delTipo.find((m) => m.effect === "IMMUNE");
  if (inmune) {
    if (inmune.note) notes.push(inmune.note);
    steps.push({
      op: "override",
      amount: -rawDamage,
      sourceType: "statblock",
      sourceKey: `immune:${damageType}`,
      labelKey: "damage.modifier.immune",
    });
    return { total: 0, steps, notes };
  }

  // "Solo cuentan como una": basta con SABER si hay resistencia y si hay vulnerabilidad, no
  // cuántas de cada — dos resistencias del mismo tipo no valen más que una.
  const resiste = delTipo.find((m) => m.effect === "RESIST");
  const vulnerable = delTipo.find((m) => m.effect === "VULNERABLE");

  // «Resistance **and then** vulnerability»: en ese orden, y encadenadas — no se cancelan. Las
  // dos ramas se escriben una detrás de otra sobre el mismo total precisamente para que el
  // caso de las dos a la vez no sea un caso aparte que alguien pueda volver a resolver mal.
  let total = rawDamage;

  if (resiste) {
    if (resiste.note) notes.push(resiste.note);
    const mitad = Math.floor(total / 2);
    steps.push({
      op: "cap",
      amount: mitad - total,
      sourceType: "statblock",
      sourceKey: `resist:${damageType}`,
      labelKey: "damage.modifier.resist",
    });
    total = mitad;
  }

  if (vulnerable) {
    if (vulnerable.note) notes.push(vulnerable.note);
    const doble = total * 2;
    steps.push({
      op: "add",
      amount: doble - total,
      sourceType: "statblock",
      sourceKey: `vulnerable:${damageType}`,
      labelKey: "damage.modifier.vulnerable",
    });
    total = doble;
  }

  return { total, steps, notes };
}
