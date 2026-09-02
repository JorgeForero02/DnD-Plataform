// Tarea 2A.3 — armaduras y escudos del SRD 5.1, con su fórmula de CA.
//
// **Atribución:** material del System Reference Document 5.1, © Wizards of the Coast LLC,
// CC BY 4.0. **Los nombres son los de la traducción oficial al español publicada por Wizards**
// (tabla «Armaduras» del «Documento de referencia del sistema 5.1»), no una traducción nuestra.
// Ver `NOTICE.md` de la raíz.
//
// **Solo lo que hace falta para calcular la CA.** Precio y peso son inventario, y el
// inventario es 2B; meterlos aquí ahora sería transcribir el doble de cifras que nada
// comprueba todavía.
//
// El tope de Destreza es lo que 2A.2 llama `abilityCap`, y la diferencia entre `0` y
// `undefined` no es cosmética: en armadura pesada la Destreza **se recorta a cero y el recorte
// se enseña en la traza**; en ligera no hay tope. Un `0` mal puesto da una CA silenciosamente
// baja y un `undefined` mal puesto la da silenciosamente alta.

import type { SrdArmor } from "./types";

export const SRD_ARMOR: SrdArmor[] = [
  // --- Ligera: sin tope de Destreza ---
  {
    key: "padded",
    name: "Acolchada",
    category: "LIGHT",
    baseAc: 11,
    strengthRequirement: 0,
    stealthDisadvantage: true,
  },
  {
    key: "leather",
    name: "Cuero",
    category: "LIGHT",
    baseAc: 11,
    strengthRequirement: 0,
    stealthDisadvantage: false,
  },
  {
    key: "studded-leather",
    name: "Cuero tachonado",
    category: "LIGHT",
    baseAc: 12,
    strengthRequirement: 0,
    stealthDisadvantage: false,
  },

  // --- Media: la Destreza suma como mucho +2 ---
  {
    key: "hide",
    name: "Pieles",
    category: "MEDIUM",
    baseAc: 12,
    dexCap: 2,
    strengthRequirement: 0,
    stealthDisadvantage: false,
  },
  {
    key: "chain-shirt",
    name: "Camisa de malla",
    category: "MEDIUM",
    baseAc: 13,
    dexCap: 2,
    strengthRequirement: 0,
    stealthDisadvantage: false,
  },
  {
    key: "scale-mail",
    name: "Cota de escamas",
    category: "MEDIUM",
    baseAc: 14,
    dexCap: 2,
    strengthRequirement: 0,
    stealthDisadvantage: true,
  },
  {
    key: "breastplate",
    name: "Coraza",
    category: "MEDIUM",
    baseAc: 14,
    dexCap: 2,
    strengthRequirement: 0,
    stealthDisadvantage: false,
  },
  {
    key: "half-plate",
    name: "Media armadura",
    category: "MEDIUM",
    baseAc: 15,
    dexCap: 2,
    strengthRequirement: 0,
    stealthDisadvantage: true,
  },

  // --- Pesada: la Destreza no suma nada ---
  {
    key: "ring-mail",
    name: "Cota guarnecida",
    category: "HEAVY",
    baseAc: 14,
    dexCap: 0,
    strengthRequirement: 0,
    stealthDisadvantage: true,
  },
  {
    key: "chain-mail",
    name: "Cota de malla",
    category: "HEAVY",
    baseAc: 16,
    dexCap: 0,
    strengthRequirement: 13,
    stealthDisadvantage: true,
  },
  {
    key: "splint",
    name: "Armadura de bandas",
    category: "HEAVY",
    baseAc: 17,
    dexCap: 0,
    strengthRequirement: 15,
    stealthDisadvantage: true,
  },
  {
    key: "plate",
    name: "Armadura de placas",
    category: "HEAVY",
    baseAc: 18,
    dexCap: 0,
    strengthRequirement: 15,
    stealthDisadvantage: true,
  },

  // --- Escudo: no es una fórmula, es una suma plana que va con cualquiera ---
  {
    key: "shield",
    name: "Escudo",
    category: "SHIELD",
    baseAc: 2,
    strengthRequirement: 0,
    stealthDisadvantage: false,
  },
];
