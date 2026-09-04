import { applyDamageModifiers } from "./apply-damage-modifiers";

// Tarea 2.5.1. Reglas del SRD 5.1 (ES), p.102, sección «Resistencia y vulnerabilidad al daño»:
// - «La resistencia y la vulnerabilidad se aplican después del resto de modificadores al daño.»
// - «Si existen varias resistencias o vulnerabilidades que afectan al mismo tipo de daño, estas
//   solo cuentan como una.»
// El redondeo hacia abajo no está en esa misma frase con esas palabras exactas, pero es la
// convención que el propio documento fija para dividir entre 2 (p.11, modificador de
// característica: «divide el total por 2 (redondeado hacia abajo)»), y es la que usa el resto
// del motor (`effective-speed.ts`) para "la mitad".

describe("applyDamageModifiers()", () => {
  it("sin ningún modificador que afecte a este tipo de daño, el daño no cambia", () => {
    const r = applyDamageModifiers(25, "FIRE", [{ damageType: "COLD", effect: "RESIST" }]);
    expect(r.total).toBe(25);
    expect(r.notes).toEqual([]);
  });

  it("resistencia: reduce a la mitad, redondeando hacia abajo", () => {
    const r = applyDamageModifiers(25, "BLUDGEONING", [
      { damageType: "BLUDGEONING", effect: "RESIST" },
    ]);
    expect(r.total).toBe(12);
  });

  it("vulnerabilidad: dobla el daño", () => {
    const r = applyDamageModifiers(10, "FIRE", [{ damageType: "FIRE", effect: "VULNERABLE" }]);
    expect(r.total).toBe(20);
  });

  it("inmunidad: el daño llega a 0, y manda sobre cualquier otro modificador del mismo tipo", () => {
    const r = applyDamageModifiers(25, "POISON", [
      { damageType: "POISON", effect: "IMMUNE" },
      { damageType: "POISON", effect: "VULNERABLE" },
    ]);
    expect(r.total).toBe(0);
  });

  it("dos resistencias al mismo tipo cuentan como una, no como un cuarto", () => {
    // El ejemplo del propio SRD: fuego no mágico con resistencia a fuego Y a todo lo no mágico.
    const r = applyDamageModifiers(20, "FIRE", [
      { damageType: "FIRE", effect: "RESIST" },
      { damageType: "FIRE", effect: "RESIST", note: "de fuego no mágico" },
    ]);
    expect(r.total).toBe(10);
  });

  it("resistencia y vulnerabilidad al mismo tipo se cancelan: daño normal", () => {
    const r = applyDamageModifiers(25, "NECROTIC", [
      { damageType: "NECROTIC", effect: "RESIST" },
      { damageType: "NECROTIC", effect: "VULNERABLE" },
    ]);
    expect(r.total).toBe(25);
  });

  it("la traza nombra el paso base y el modificador que se aplicó", () => {
    const r = applyDamageModifiers(25, "BLUDGEONING", [
      { damageType: "BLUDGEONING", effect: "RESIST" },
    ]);
    expect(r.steps[0]).toMatchObject({ op: "base", amount: 25 });
    expect(r.steps).toHaveLength(2);
    expect(r.steps[1].labelKey).toBe("damage.modifier.resist");
  });

  it("la nota que limita la regla viaja aparte, sin que el servidor la interprete", () => {
    const r = applyDamageModifiers(25, "BLUDGEONING", [
      {
        damageType: "BLUDGEONING",
        effect: "RESIST",
        note: "de ataques no mágicos con armas que no sean de plata",
      },
    ]);
    expect(r.notes).toEqual(["de ataques no mágicos con armas que no sean de plata"]);
    // Y el total se calcula igual que si no hubiera nota: el servidor no la evalúa, solo la pasa.
    expect(r.total).toBe(12);
  });

  it("un daño de 0 se queda en 0 con cualquier modificador", () => {
    expect(applyDamageModifiers(0, "FIRE", [{ damageType: "FIRE", effect: "RESIST" }]).total).toBe(
      0,
    );
  });
});
