// Tarea 3A.1 (T1) — empareja conjuros de Foundry (inglés) con el SRD español por huella
// estructural (E-3A1-1): `(nivel, escuela, alcance-con-tipo, V/S/M, duración, concentración,
// ritual)`. **Con el tipo de alcance, no solo el número** — fundir "toque" y "personal" en
// `None` daba huellas falsamente iguales (T0, sección b, "corrección hecha durante la medición").

/** Huella como cadena estable, para usarla de clave de `Map`. */
export function huellaDe({
  level,
  school,
  rangeUnit,
  rangeValue,
  v,
  s,
  m,
  durationUnit,
  durationValue,
  concentration,
  ritual,
}) {
  return [
    level,
    school,
    rangeUnit ?? "",
    rangeUnit === "ft" || rangeUnit === "pies" ? (rangeValue ?? "") : "",
    v ? "V" : "",
    s ? "S" : "",
    m ? "M" : "",
    durationUnit ?? "",
    durationUnit === "instantanea" || durationUnit === "inst" ? "" : (durationValue ?? ""),
    concentration ? "C" : "",
    ritual ? "R" : "",
  ].join("|");
}

/**
 * `emparejar(spellsEn, conjurosEs, tablaAMano)` — pura. `spellsEn`/`conjurosEs` son
 * `Map<clave, huellaInput>` (la forma que consume `huellaDe`, más `nombre`); `tablaAMano` es
 * `emparejamientos.json.conjuros` (`{ identifierIngles: "Nombre español" }`).
 *
 * Devuelve `{ pares, choques, sinPareja }`:
 * - `pares`: `Map<claveIngles, nombreEspañol>` ya resueltos (por huella única o por la tabla).
 * - `choques`: huella compartida por 2+ candidatos en un lado, **sin** entrada en la tabla a
 *   mano — E-3A1-1 exige que la tabla esté completa, así que esto es lo que hace fallar al
 *   conversor si aparece.
 * - `sinPareja`: claves inglesas cuya huella no tiene ningún candidato español (huella
 *   asimétrica, no un choque — T0 documenta que al menos una es una discrepancia de datos, no
 *   de nombre).
 */
export function emparejar(spellsEn, conjurosEs, tablaAMano = {}) {
  const huellaAClavesIngles = new Map();
  for (const [clave, datos] of spellsEn) {
    const h = huellaDe(datos);
    if (!huellaAClavesIngles.has(h)) huellaAClavesIngles.set(h, []);
    huellaAClavesIngles.get(h).push(clave);
  }

  const huellaANombresEs = new Map();
  for (const [nombre, datos] of conjurosEs) {
    const h = huellaDe(datos);
    if (!huellaANombresEs.has(h)) huellaANombresEs.set(h, []);
    huellaANombresEs.get(h).push(nombre);
  }

  const pares = new Map();
  const choques = [];
  const sinPareja = [];

  for (const [claveIngles, datos] of spellsEn) {
    if (tablaAMano[claveIngles]) {
      pares.set(claveIngles, tablaAMano[claveIngles]);
      continue;
    }
    const h = huellaDe(datos);
    const candidatosIngles = huellaAClavesIngles.get(h) ?? [];
    const candidatosEs = huellaANombresEs.get(h) ?? [];

    if (candidatosEs.length === 0) {
      sinPareja.push(claveIngles);
      continue;
    }
    if (candidatosIngles.length === 1 && candidatosEs.length === 1) {
      pares.set(claveIngles, candidatosEs[0]);
      continue;
    }
    // Huella compartida en al menos un lado: un choque sin resolver, salvo que la tabla a mano
    // ya lo haya cubierto arriba.
    choques.push({ claveIngles, huella: h, candidatosIngles, candidatosEs });
  }

  return { pares, choques, sinPareja };
}
