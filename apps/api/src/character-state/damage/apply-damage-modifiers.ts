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
// **Lo que el SRD 5.1 (CC) NO dice con estas palabras, y hay que decirlo aquí porque el spec de
// la tarea pide comprobarlo antes de implementar:** ni "la inmunidad manda sobre todo" ni
// "resistencia y vulnerabilidad del mismo tipo se cancelan" aparecen como frase en el documento
// bajo licencia CC que este proyecto cita (ni en la edición inglesa ni en la española — se buscó
// en las dos). Lo que SÍ dice, y de donde sale la primera regla por definición: la inmunidad dejaría
// el daño de ese tipo en 0 antes de que haya nada que resistir o agravar, así que no hay una
// "mitad de cero" que discutir. Para la segunda, este código aplica la interpretación oficial y
// ampliamente documentada de Sage Advice (Jeremy Crawford, diseñador jefe de reglas de 5.ª
// edición): resistencia y vulnerabilidad al MISMO tipo se anulan y el daño es el normal — y no la
// lectura literal de aplicar las dos en cadena (mitad, redondeada hacia abajo, y LUEGO doblada),
// que además no es asociativa con números impares y no puede ser la intención de una regla que
// se describe como "se aplican" en plural sin más matices.
//
// El redondeo hacia abajo tampoco tiene aquí su frase exacta ("la mitad del daño, redondeando
// hacia abajo"); el documento sí fija esa convención para dividir entre 2 en otro sitio (p.11,
// modificador de característica: «divide el total por 2 (redondeado hacia abajo)»), y es la
// misma que ya usa `effective-speed.ts` para "la mitad" de la velocidad. Se aplica igual aquí por
// consistencia del motor, no porque el pasaje de resistencia la repita.

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
      sourceType: "manual",
      sourceKey: `immune:${damageType}`,
      labelKey: "damage.modifier.immune",
    });
    return { total: 0, steps, notes };
  }

  // "Solo cuentan como una": basta con SABER si hay resistencia y si hay vulnerabilidad, no
  // cuántas de cada — dos resistencias del mismo tipo no valen más que una.
  const resiste = delTipo.find((m) => m.effect === "RESIST");
  const vulnerable = delTipo.find((m) => m.effect === "VULNERABLE");

  if (resiste && vulnerable) {
    if (resiste.note) notes.push(resiste.note);
    if (vulnerable.note) notes.push(vulnerable.note);
    steps.push({
      op: "override",
      amount: 0,
      sourceType: "manual",
      sourceKey: `cancelled:${damageType}`,
      labelKey: "damage.modifier.cancelled",
    });
    return { total: rawDamage, steps, notes };
  }

  if (resiste) {
    if (resiste.note) notes.push(resiste.note);
    const mitad = Math.floor(rawDamage / 2);
    steps.push({
      op: "cap",
      amount: mitad - rawDamage,
      sourceType: "manual",
      sourceKey: `resist:${damageType}`,
      labelKey: "damage.modifier.resist",
    });
    return { total: mitad, steps, notes };
  }

  if (vulnerable) {
    if (vulnerable.note) notes.push(vulnerable.note);
    const doble = rawDamage * 2;
    steps.push({
      op: "add",
      amount: doble - rawDamage,
      sourceType: "manual",
      sourceKey: `vulnerable:${damageType}`,
      labelKey: "damage.modifier.vulnerable",
    });
    return { total: doble, steps, notes };
  }

  return { total: rawDamage, steps, notes };
}
